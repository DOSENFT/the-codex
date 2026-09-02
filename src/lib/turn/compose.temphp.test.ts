// Slice 10d — the grant, from canon's formula to a taken turn and back.
//
// THE BUG THIS FILE EXISTS TO PREVENT. Hearthfire Manifest composes as TWO
// options that share one canon feature: a free Bonus Action that summons the
// flame, and a Reaction, "Flaming Cloak", that spends a Channel Divinity use.
// Only the second grants the temporary hit points. Attach the grant by NAME, or
// to both faces, and the app hands out the pool twice — summon, then cloak, and
// Nix is standing in 24 temp HP the rules never gave him. Both sides are pinned
// below, because this is a bug that would ship looking like a feature.
//
// None of these can pass against slice 10c's code: `TurnOption.grantsTempHP`,
// `TakenOption.grantsTempHP` and `Restore.tempHP` did not exist.
import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { reduce, revert, takenFrom, type SessionState } from './reduce'
import { NIX } from './fixtures/nix'
import { featureByName } from '../canon/lookup'
import { featureContextOf } from './overlay'
import { activeRetaliation } from './retaliation'
import type { Character } from '../character'
import type { CombatState } from '../combat-state'
import type { TurnOption } from './types'

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}

/** ranked + rest + every mutex FACE.
 *
 *  `ComposedTurn.ranked` EXCLUDES everything in a contention bracket, and the
 *  cloak's sibling lives in one. Reading `.ranked` alone has already turned a
 *  real violation into a green test once in this project; it does not get to do
 *  it twice. */
function allOptions(character = NIX): TurnOption[] {
  const turn = composeTurn({ character, combat: FIGHTING, log: [] })
  const seen = new Set<string>()
  const out: TurnOption[] = []
  for (const o of [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]) {
    if (seen.has(o.id)) continue
    seen.add(o.id)
    out.push(o)
  }
  return out
}

const byName = (name: string, character = NIX): TurnOption => {
  const found = allOptions(character).find(o => o.name === name)
  if (!found) throw new Error(`no composed option named ${name}`)
  return found
}

// ---------------------------------------------------------------------------
// The number itself
// ---------------------------------------------------------------------------

describe('the grant is COMPUTED, never read off a table', () => {
  it('resolves canon’s formula against this character', () => {
    // Canon states "Paladin level + Charisma modifier". The fixture is a level 8
    // Paladin with Charisma 18, so the pool is 12 — a number that appears
    // nowhere in canon and nowhere in the app.
    expect(NIX.level).toBe(8)
    expect(byName('Flaming Cloak').grantsTempHP).toBe(12)
  })

  it('agrees with canon’s own worked example at level 7', () => {
    // Canon carries `atLevel7: { tempHPWithCha18: 11 }` BESIDE the mechanics bag
    // as a worked cross-check on the formula it states in prose. Marcus's real
    // Nix is a level 7 Paladin with Charisma 18. If the composer's arithmetic
    // and canon's worked example ever disagree, one of them is wrong, and this
    // is where it surfaces rather than at the table.
    const at7 = { ...NIX, level: 7 }
    const stated = (featureByName('Hearthfire Manifest') as
      | { atLevel7?: { tempHPWithCha18?: number } }
      | undefined)?.atLevel7?.tempHPWithCha18
    expect(stated).toBe(11)
    expect(byName('Flaming Cloak', at7).grantsTempHP).toBe(stated)
  })

  it('scales with the character rather than being pinned to one sheet', () => {
    expect(byName('Flaming Cloak', { ...NIX, level: 20 }).grantsTempHP).toBe(24)
  })
})

// ---------------------------------------------------------------------------
// Which option carries it
// ---------------------------------------------------------------------------

describe('only the option that PAYS for the grant carries it', () => {
  it('the costed Reaction grants', () => {
    const cloak = byName('Flaming Cloak')
    expect(cloak.cost.slot).toBe('reaction')
    expect(cloak.cost.resourcePoolId).toBeDefined()
    expect(cloak.grantsTempHP).toBe(12)
  })

  it('the free Bonus Action face of the SAME canon feature grants nothing', () => {
    const summon = byName('Hearthfire Manifest')
    expect(summon.canonId).toBe(byName('Flaming Cloak').canonId)
    expect(summon.cost.resourcePoolId).toBeUndefined()
    expect(summon.grantsTempHP).toBeUndefined()
  })

  it('nothing else on the whole turn grants temp HP', () => {
    const granting = allOptions().filter(o => o.grantsTempHP !== undefined)
    expect(granting.map(o => o.name)).toEqual(['Flaming Cloak'])
  })
})

// ---------------------------------------------------------------------------
// Taking it
// ---------------------------------------------------------------------------

const session = (over: Partial<SessionState> = {}): SessionState => ({
  character: over.character ?? NIX,
  combat: over.combat ?? FIGHTING,
})

describe('taking the cloak grants the pool', () => {
  it('applies the number and records what granted it', () => {
    // Before slice 10d this was the measured behaviour: the reducer spent the
    // Channel Divinity use and tempHP stayed at 0. The app showed Marcus "12
    // temp HP" and made him type it into a different screen by hand.
    const before = session()
    expect(before.character.tempHP).toBe(0)

    const applied = reduce(
      before,
      { type: 'takeOption', option: takenFrom(byName('Flaming Cloak')) },
      [],
    )
    expect(applied.refused).toBeUndefined()
    expect(applied.state.character.tempHP).toBe(12)
    expect(applied.state.character.tempHPSource).toBe('Flaming Cloak')
  })

  it('still spends what it always spent', () => {
    const applied = reduce(
      session(),
      { type: 'takeOption', option: takenFrom(byName('Flaming Cloak')) },
      [],
    )
    expect(applied.state.combat.turnActions.reaction).toBe(true)
  })

  it('taking something that grants nothing leaves the pool alone', () => {
    const cloaked = { ...NIX, tempHP: 11, tempHPSource: 'Flaming Cloak' }
    const applied = reduce(
      session({ character: cloaked }),
      { type: 'takeOption', option: takenFrom(byName('Hearthfire Manifest', cloaked)) },
      [],
    )
    expect(applied.state.character.tempHP).toBe(11)
    expect(applied.state.character.tempHPSource).toBe('Flaming Cloak')
  })
})

// ---------------------------------------------------------------------------
// Held Reaction slice 3 — the sheet BEFORE anyone split it by hand
// ---------------------------------------------------------------------------
//
// Everything above this line runs against `nix.ts`, where Hearthfire Manifest
// has already been cut into two features by hand, and the Reaction half
// declares `usesPerRest`/`usesMax` — which is what derived the resource pool
// that slice 10d's gate keyed off. Marcus's REAL export is not that sheet. It
// carries ONE undeclared feature with no uses and `resourcePools: []`, so no row
// derived a pool, so the gate refused every option he owns, so `tempHPSource`
// was never set and `activeRetaliation` had never once returned anything.
//
// Slice 1's law, restated where it bites: A FIXTURE THAT MODELS THE SHEET AFTER
// THE REPAIR CANNOT SHOW THE FAULT. So the fixture below models it before.
//
// The feature record is copied verbatim out of
// `codex-nix-lvl7 (2) (1).json` — no `actionType`, no uses, one paragraph of his
// own prose that restates the WHOLE feature, both faces of it, in five
// sentences. That last property is why the row is chosen by canon's sentence
// split and not by reading the row's words: his words say everything on every
// row, so his words cannot tell the rows apart.
const HIS_HEARTHFIRE = {
  name: 'Hearthfire Manifest',
  level: 3,
  description:
    'A manifestation (floating ember, dancing flame, or spirit) sheds bright light 10ft, dim light 10ft more. Range 30ft or extinguished. Summon/dismiss as Bonus Action. As a Reaction, expend one Channel Divinity use to transform it into a flaming cloak: gain Temporary HP equal to Paladin level + spellcasting ability modifier. While active, creatures hitting you with melee attacks take 1d10 Fire damage. Lasts until temp HP is depleted.',
}

/** Level 7, Charisma 16 — his real numbers, so the pool is 7 + 3 = 10. A number
 *  that is neither the fixture's 12 nor canon's worked example of 11, which is
 *  what makes it evidence that the formula ran against HIM. */
const HIS_SHAPE: Character = {
  ...NIX,
  level: 7,
  abilityScores: { ...NIX.abilityScores, CHA: 16 },
  resourcePools: [],
  features: [
    ...(NIX.features ?? []).filter(f => !/hearthfire|flaming cloak/i.test(f.name)),
    HIS_HEARTHFIRE,
  ],
} as Character

const hearthRows = (): TurnOption[] =>
  allOptions(HIS_SHAPE).filter(o => o.name === 'Hearthfire Manifest')

describe('slice 3 — the grant reaches a sheet nobody split by hand', () => {
  it('the fixture is genuinely the un-split shape, or it proves nothing', () => {
    const sheet = (HIS_SHAPE.features ?? []).filter(f => /hearthfire|flaming/i.test(f.name))
    expect(sheet).toHaveLength(1)
    expect(sheet[0].actionType).toBeUndefined()
    expect(sheet[0].usesMax).toBeUndefined()
    expect(HIS_SHAPE.resourcePools).toEqual([])
  })

  it('composes three rows for the one feature, and NO row derives a pool', () => {
    // The premise of the old gate, measured rather than assumed. Every one of
    // these had `grantsTempHP === undefined` before this slice.
    const rows = hearthRows()
    expect(rows.map(r => r.cost.slot).sort()).toEqual(['action', 'bonusAction', 'reaction'])
    expect(rows.every(r => r.cost.resourcePoolId === undefined)).toBe(true)
  })

  it('the Reaction row grants 10, with an empty pool list', () => {
    const cloak = hearthRows().find(r => r.cost.slot === 'reaction')
    expect(cloak?.grantsTempHP).toBe(10)
  })

  it('the free Bonus Action face still grants nothing', () => {
    const summon = hearthRows().find(r => r.cost.slot === 'bonusAction')
    expect(summon?.grantsTempHP).toBeUndefined()
  })

  it('the base row does not grant, though HIS words on it say it does', () => {
    // This row exists only because `featureActionType` defaulted an undeclared
    // feature to 'action'. The phase's law is that a default is not an answer,
    // and a guess does not get to hand out hit points. His own description on
    // this row contains "gain Temporary HP equal to …" — so a rule that read the
    // ROW's words would grant here, and Marcus would be standing in 20.
    const base = hearthRows().find(r => r.cost.slot === 'action')
    expect(base).toBeDefined()
    expect(HIS_HEARTHFIRE.description).toMatch(/gain Temporary HP/i)
    expect(base?.grantsTempHP).toBeUndefined()
  })

  it('exactly one option on the whole turn grants', () => {
    const granting = allOptions(HIS_SHAPE).filter(o => o.grantsTempHP !== undefined)
    expect(granting).toHaveLength(1)
    expect(granting[0].cost.slot).toBe('reaction')
  })

  it('taking it ARMS THE RETALIATION — item 7, end to end', () => {
    // The headline. Before this slice `activeRetaliation` returned null on his
    // sheet no matter what he did, because nothing could ever set `tempHPSource`
    // — which is why the retaliation prompt had never received data.
    const ctx = featureContextOf(HIS_SHAPE)
    expect(activeRetaliation(HIS_SHAPE, ctx)).toBeNull()

    const cloak = hearthRows().find(r => r.cost.slot === 'reaction')!
    const applied = reduce(
      { character: HIS_SHAPE, combat: FIGHTING },
      { type: 'takeOption', option: takenFrom(cloak) },
      [],
    )
    expect(applied.refused).toBeUndefined()
    expect(applied.state.character.tempHP).toBe(10)

    const armed = activeRetaliation(applied.state.character, ctx)
    expect(armed).not.toBeNull()
    expect(armed?.notation).toBe('1d10')
    expect(armed?.damageType).toBe('Fire')
  })

  it('and undo disarms it again', () => {
    const ctx = featureContextOf(HIS_SHAPE)
    const cloak = hearthRows().find(r => r.cost.slot === 'reaction')!
    const applied = reduce(
      { character: HIS_SHAPE, combat: FIGHTING },
      { type: 'takeOption', option: takenFrom(cloak) },
      [],
    )
    const reverted = revert(applied.state, applied.entry!)
    expect(activeRetaliation(reverted.character, ctx)).toBeNull()
  })
})

describe('undo un-grants it', () => {
  it('round-trips back to exactly where it started', () => {
    const before = session()
    const applied = reduce(
      before,
      { type: 'takeOption', option: takenFrom(byName('Flaming Cloak')) },
      [],
    )
    expect(applied.entry).not.toBeNull()
    const reverted = revert(applied.state, applied.entry!)
    expect(reverted.character.tempHP).toBe(before.character.tempHP)
    expect(reverted.character.tempHPSource ?? null).toBeNull()
  })

  it('puts back the OTHER pool the grant replaced, label and all', () => {
    // Undo has to restore an absolute prior value, not zero. If Heroism's 5 was
    // standing when the cloak went up, undoing the cloak owes him Heroism's 5.
    const heroic = { ...NIX, tempHP: 5, tempHPSource: 'Heroism' }
    const applied = reduce(
      session({ character: heroic }),
      { type: 'takeOption', option: takenFrom(byName('Flaming Cloak', heroic)) },
      [],
    )
    expect(applied.state.character.tempHP).toBe(12)
    const reverted = revert(applied.state, applied.entry!)
    expect(reverted.character.tempHP).toBe(5)
    expect(reverted.character.tempHPSource).toBe('Heroism')
  })
})
