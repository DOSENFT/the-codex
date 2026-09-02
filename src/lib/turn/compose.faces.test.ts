/* Held Reaction slice 1 — the composer spends canon's faces.
 *
 * THE SHEET THESE CASES ARE ABOUT IS NOT `nix.ts`. The fixture carries the split
 * already done by hand — "Hearthfire Manifest" declared a Bonus Action and
 * "Flaming Cloak" declared a Reaction, two names resolving to one canon record.
 * Marcus's actual exported sheet carries ONE feature, "Hearthfire Manifest",
 * declaring no `actionType` at all, and nothing named Flaming Cloak. On that
 * sheet the app filed his Reaction as an Action and offered him one reaction in
 * total. So the fixture is the one shape that could never show the fault.
 *
 * `AS_EXPORTED` below is the fixture bent back into the shape of his export.
 * Every failing case in this file is a case that fails against slice 0's code.
 * The last two run against the untouched fixture and assert the opposite: that
 * a sheet which already split the feature gains nothing, and gains it silently. */

import { describe, expect, it } from 'vitest'

import { composeTurn } from './compose'
import { reactionRows } from './reactions'
import { NIX } from './fixtures/nix'
import type { CombatState } from '../combat-state'
import type { Character } from '../character'
import type { TurnOption } from './types'

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}

/** The fixture with the hand-split undone: one undeclared feature, exactly as
 *  his export stores it. Nothing else about the sheet is touched. */
const AS_EXPORTED: Character = {
  ...NIX,
  features: (NIX.features ?? [])
    .filter(f => f.name !== 'Flaming Cloak')
    .map(f => (f.name === 'Hearthfire Manifest' ? { ...f, actionType: undefined } : f)),
}

function allOptions(character: Character): TurnOption[] {
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

const hearth = (character: Character): TurnOption[] =>
  allOptions(character).filter(o => o.name === 'Hearthfire Manifest')

describe('his sheet — canon names two prices and the app offers both', () => {
  it('the premise: his sheet declares no economy for it', () => {
    // If this stops being true the rest of the file is measuring the fixture.
    const own = (AS_EXPORTED.features ?? []).filter(f => f.name === 'Hearthfire Manifest')
    expect(own).toHaveLength(1)
    expect(own[0].actionType).toBeUndefined()
    expect((AS_EXPORTED.features ?? []).some(f => f.name === 'Flaming Cloak')).toBe(false)
  })

  it('composes it three times: as the sheet files it, and once per face', () => {
    expect(hearth(AS_EXPORTED).map(o => o.cost.slot).sort()).toEqual([
      'action',
      'bonusAction',
      'reaction',
    ])
  })

  it('still appears where it appears today', () => {
    // The base option is KEPT. It carries the light, the leash and the sheet's
    // own words — everything canon states without a price.
    // The base option is KEPT, in the bucket the sheet filed it in, still
    // reading the sheet's own words. Nothing Marcus can see today is removed in
    // order to add the two rows he cannot.
    const base = hearth(AS_EXPORTED).find(o => o.cost.slot === 'action')
    expect(base).toBeDefined()
    expect(base?.detail).toContain('30 feet')
    expect(base?.detail).not.toContain('1d10')
  })

  it('the reaction face is the cloak, and carries the retaliation', () => {
    const cloak = hearth(AS_EXPORTED).find(o => o.cost.slot === 'reaction')
    expect(cloak?.detail).toContain('1d10 Fire')
  })

  it('the bonus-action face is the summon, and carries no die', () => {
    const summon = hearth(AS_EXPORTED).find(o => o.cost.slot === 'bonusAction')
    expect(summon?.detail).toContain('summoned or dismissed')
    expect(summon?.detail).not.toContain('1d10')
  })

  it('ids stay unique across the faces', () => {
    const ids = hearth(AS_EXPORTED).map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the reactions band gains a row, and it reads canon’s trigger', () => {
    const rows = reactionRows(
      composeTurn({ character: AS_EXPORTED, combat: FIGHTING, log: [] }),
      AS_EXPORTED,
    )
    const cloak = rows.find(r => r.name === 'Hearthfire Manifest')
    expect(cloak).toBeDefined()
    // Canon's own sentence, not a phrase the app assembled.
    expect(cloak?.when).toContain('When you are hit by a melee attack')
    expect(rows).toHaveLength(2)
  })

  it('and nothing else on the sheet was split', () => {
    // `facesOf` refuses for every record canon prices once or not at all, so
    // Hearthfire Manifest must be the ONLY name on this sheet wearing more than
    // one row. A splitter that fires on the wrong record would show up here as
    // a second name, with no assertion needing to be rewritten to catch it.
    const count = new Map<string, number>()
    for (const o of allOptions(AS_EXPORTED)) count.set(o.name, (count.get(o.name) ?? 0) + 1)
    const repeated = [...count].filter(([, n]) => n > 1).map(([name]) => name)
    expect(repeated).toEqual(['Hearthfire Manifest'])
  })
})

describe('a sheet that already split it gains nothing', () => {
  it('the fixture keeps exactly the rows it had', () => {
    // Two names, one canon record. Both faces find their buckets taken, so
    // neither is minted — and Marcus never sees the same ability twice.
    expect(hearth(NIX).map(o => o.cost.slot)).toEqual(['bonusAction'])
    expect(
      allOptions(NIX)
        .filter(o => o.name === 'Flaming Cloak')
        .map(o => o.cost.slot),
    ).toEqual(['reaction'])
  })

  it('and its reactions band is unchanged', () => {
    const rows = reactionRows(composeTurn({ character: NIX, combat: FIGHTING, log: [] }), NIX)
    expect(rows.map(r => r.name)).toEqual(['Opportunity Attack — Hearthbrand', 'Flaming Cloak'])
  })
})
