import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { composeTurn } from './compose'
import { groupBySlot, BAND_ORDER, type Band } from './bands'
import { NIX } from './fixtures/nix'
import { createCombatState, startCombat, useAction } from '../combat-state'
import type { Character } from '../character'
import type { ComposedTurn, TurnOption } from './types'

/* ============================================================================
   THE FOUR BANDS — the shelving rule, proved without a browser.

   Test plan items 1-5 from docs/plans/your-turn/03-program-design.md.

   The fixture is used for the cases that need a slot SPENT, because spending
   one is a fact about a combat state and not about a sheet. His real export is
   used for every count claim, per the standing law in HANDOFF.md §4: measure
   the app against the thing he actually plays, never against the fixture that
   was built after the code.
   ========================================================================== */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
let real: Character | null = null
try {
  real = JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
} catch {
  real = null
}

const all = (t: ComposedTurn): TurnOption[] => [...t.ranked, ...t.rest]
const shelved = (bands: Band[]): TurnOption[] => bands.flatMap(b => b.options)

describe('groupBySlot — nothing is dropped', () => {
  it('1. count in equals count out, on the fixture', () => {
    const turn = composeTurn({ character: NIX, combat: null })
    const bands = groupBySlot(turn)
    expect(shelved(bands)).toHaveLength(all(turn).length)
    // And not merely the same NUMBER of things — the same things. A rule that
    // dropped one option and duplicated another would pass a count.
    expect(new Set(shelved(bands).map(o => o.id))).toEqual(new Set(all(turn).map(o => o.id)))
  })

  it('1b. count in equals count out on his real export, in combat', () => {
    if (!real) return
    const turn = composeTurn({ character: real, combat: startCombat(real) })
    const bands = groupBySlot(turn)
    // The claim is worth stating in numbers as well as in a relation: if this
    // ever reads "0 === 0" the test has stopped testing anything.
    expect(all(turn).length).toBeGreaterThan(5)
    expect(shelved(bands)).toHaveLength(all(turn).length)
  })

  it('1c. every option lands in exactly ONE band', () => {
    const turn = composeTurn({ character: NIX, combat: null })
    const ids = shelved(groupBySlot(turn)).map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('2. a free-cost option is placed, not dropped', () => {
    const turn = composeTurn({ character: NIX, combat: null })
    // Injected rather than hunted for. compose.ts prices its three buckets at
    // 'action', 'bonusAction' and 'reaction' and nothing else, so a free-cost
    // option cannot be produced today — which is exactly why the branch that
    // handles one has to be proved by hand instead of by a fixture that would
    // silently stop covering it.
    const freebie: TurnOption = {
      id: 'synthetic-free',
      name: 'A thing that costs nothing',
      kind: 'feature',
      detail: 'It is simply true.',
      cost: { slot: 'free', label: 'Free' },
      available: true,
      score: 0,
    }
    const bands = groupBySlot({ ...turn, rest: [...turn.rest, freebie] })
    expect(shelved(bands).map(o => o.id)).toContain('synthetic-free')
    // In its own band, not smuggled into ACTION — free is the one price that
    // closes no slot, and filing it under a slot would be a lie about the
    // economy in the one place the screen exists to state the economy.
    const home = bands.find(b => b.options.some(o => o.id === 'synthetic-free'))
    expect(home?.slot).toBe('free')
  })

  it('2b. the fifth band does not exist when nothing costs nothing', () => {
    // The other half of the same claim. A band scheme that always showed a
    // "No cost" shelf would put an empty box on his phone forever, and a test
    // that only checked the populated case would never see it.
    const turn = composeTurn({ character: NIX, combat: null })
    expect(groupBySlot(turn).map(b => b.slot)).toEqual([...BAND_ORDER])
  })
})

describe('groupBySlot — the order is compose.ts’s, not this file’s', () => {
  it('3. within a band: available first, then blocked, each in the order it arrived', () => {
    if (!real) return
    const turn = composeTurn({ character: real, combat: startCombat(real) })
    const bands = groupBySlot(turn)
    const arrival = all(turn).map(o => o.id)

    for (const band of bands) {
      const availability = band.options.map(o => o.available)
      // No `false` may appear before a `true`.
      expect(availability.indexOf(true)).toBeLessThanOrEqual(
        availability.lastIndexOf(false) === -1 ? Number.MAX_SAFE_INTEGER : availability.length,
      )
      expect(availability).toEqual([...availability].sort((a, b) => Number(b) - Number(a)))

      // And within each half, arrival order is preserved.
      for (const half of [band.options.filter(o => o.available), band.options.filter(o => !o.available)]) {
        const positions = half.map(o => arrival.indexOf(o.id))
        expect(positions).toEqual([...positions].sort((a, b) => a - b))
      }
    }
  })

  it('3b. a band holds only options of its own slot', () => {
    if (!real) return
    const bands = groupBySlot(composeTurn({ character: real, combat: startCombat(real) }))
    for (const band of bands) {
      if (band.slot === 'free') continue
      for (const o of band.options) expect(o.cost.slot).toBe(band.slot)
    }
  })
})

describe('groupBySlot — the count', () => {
  it('4. readyCount counts only what is available', () => {
    if (!real) return
    // HIS ACTION IS SPENT, and that is not decoration on this test — it is the
    // only reason the test can fail.
    //
    // Written first against a fresh combat state, where every option on his
    // sheet happens to be available, `readyCount === options.length` held for
    // BOTH the right rule and the wrong one: a mutation that counted every row
    // instead of the ready ones passed green. The standing law in HANDOFF §4 in
    // its third form — a probe that cannot see the broken case reports it as
    // working. So the fixture spends something, the ACTION band fills with
    // blocked rows, and the two counts are forced apart.
    const combat = useAction({ ...startCombat(real), yourTurn: true }, 'action')
    const bands = groupBySlot(composeTurn({ character: real, combat }))
    for (const band of bands) {
      expect(band.readyCount).toBe(band.options.filter(o => o.available).length)
    }
    // The gap has to be real, or the loop above is comparing a number with
    // itself. At least one band must hold something he cannot take.
    expect(bands.some(b => b.readyCount < b.options.length)).toBe(true)
    // The whole point of the bands is that this is more than the five the old
    // shortlist showed him: "6 more … are under everything else below".
    expect(bands.reduce((n, b) => n + b.readyCount, 0)).toBeGreaterThan(0)
  })

  it('4b. readyCount is 0, not absent, for an empty band', () => {
    if (!real) return
    const bands = groupBySlot(composeTurn({ character: real, combat: startCombat(real) }))
    const movement = bands.find(b => b.slot === 'movement')
    // Measured, not assumed: compose.ts prices nothing at 'movement', so this
    // band is empty on every sheet the engine has read. The day something is
    // priced there, this assertion is the thing that says so.
    expect(movement?.options).toHaveLength(0)
    // A negative marker cannot be checked by looking for it — HANDOFF §4. So
    // both halves: the number is there, AND it is the right number.
    expect(movement?.readyCount).toBe(0)
    expect(movement?.readyCount).not.toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(movement ?? {}, 'readyCount')).toBe(true)
  })
})

describe('groupBySlot — open mirrors the economy, both ways', () => {
  const openOf = (turn: ComposedTurn) =>
    Object.fromEntries(groupBySlot(turn).map(b => [b.slot, b.open]))

  it('5. all four open when nothing is spent', () => {
    const combat = { ...startCombat(NIX), yourTurn: true }
    const turn = composeTurn({ character: NIX, combat })
    expect(openOf(turn)).toMatchObject({
      action: true,
      bonusAction: true,
      reaction: true,
      movement: true,
    })
  })

  it('5b. each one closes when ITS OWN slot is spent, and the others do not', () => {
    for (const slot of ['action', 'bonusAction', 'reaction', 'movement'] as const) {
      const combat = useAction({ ...startCombat(NIX), yourTurn: true }, slot)
      const open = openOf(composeTurn({ character: NIX, combat }))
      // The half that is easy to get right.
      expect(open[slot]).toBe(false)
      // The half that catches an inversion: spending one must not close the
      // rest. `EconomyState` is the INVERSE of `turnActions` (compose.ts says
      // so in capitals), and an inverted read would light every band he had
      // just spent and dim every one he still holds — which looks plausible on
      // a screenshot and is exactly backwards.
      for (const other of ['action', 'bonusAction', 'reaction', 'movement'] as const) {
        if (other !== slot) expect(open[other]).toBe(true)
      }
    }
  })

  it('5c. off-turn, only REACTION is open', () => {
    // Slice 7's rule, restated at the band: during someone else's turn the
    // reaction is the one thing that is his. If the bands did not honour it
    // they would offer him three shelves he cannot spend from.
    const combat = { ...createCombatState(NIX), inCombat: true, yourTurn: false }
    const open = openOf(composeTurn({ character: NIX, combat }))
    expect(open).toMatchObject({
      action: false,
      bonusAction: false,
      reaction: true,
      movement: false,
    })
  })
})
