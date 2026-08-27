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
