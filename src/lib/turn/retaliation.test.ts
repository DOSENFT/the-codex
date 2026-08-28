/* ============================================================================
   THE ONE NUMBER THE APP CANNOT COMPUTE — Table Truth slice 10f (HEARTH-05).

   Canon: "display the total retaliation damage dealt per encounter so the DM
   can see the real numbers." Everything else on the Play tab is derived from
   the sheet and can be recomputed at any time; a d10 that came up 7 cannot.
   That makes three things worth proving, and they are the three groups below:

     1. RECOGNITION IS BY SHAPE. Nothing anywhere says "Flaming Cloak". The die
        is found because canon marked a `dice` fact `free`, and the proof of
        that is the INVERSE — Opportunity Attack's 1d8+4 is dice too, and it
        must not get a button, because it is what your Reaction BUYS rather
        than something the world hands you.

     2. THE TALLY SURVIVES AND RESETS. It lives in `CombatState` rather than in
        the log, because `LOG_DEPTH` is 25 and a long fight would silently
        shrink the DM's total. It is per ENCOUNTER, so both ends of a fight
        clear it.

     3. IT UNDOES. Like every other event in this reducer, byte for byte.

   None of these can pass against slice 10f-a's code: `retaliation.ts` did not
   exist, `CombatState` had no such field, and `reduce` refused the event as
   unknown.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { featureByName } from '../canon/lookup'
import type { CombatState } from '../combat-state'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'
import { featureContextOf } from './overlay'
import { reactionRows } from './reactions'
import { reconcile, reduce, revert, type SessionState } from './reduce'
import {
  activeRetaliation,
  addRetaliation,
  retaliationOf,
  tallyLine,
  tallyOf,
} from './retaliation'

const CTX = featureContextOf(NIX)

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
  concentrating: null,
}

const session = (over: Partial<CombatState> = {}): SessionState =>
  reconcile({ character: NIX, combat: { ...FIGHTING, ...over } })

/** Dispatch, and fail loudly rather than silently proving nothing if refused. */
function accepted(state: SessionState, amount: number, source = 'Hearthfire Manifest') {
  const applied = reduce(state, { type: 'retaliate', amount, source })
  expect(applied.refused, `refused: ${applied.refused}`).toBeUndefined()
  return applied
}

// ---------------------------------------------------------------------------
// 1. Recognition is by shape
// ---------------------------------------------------------------------------

describe('retaliationOf — a free die, found by its shape', () => {
  it('reads canon’s 1d10 Fire off the cloak, ready to roll', () => {
    expect(retaliationOf(featureByName('Flaming Cloak'), CTX)).toEqual({
      notation: '1d10',
      quantity: 1,
      dieType: 10,
      damageType: 'Fire',
      feature: featureByName('Flaming Cloak')!.name,
    })
  })

  it('is null for a feature canon has never heard of', () => {
    // The open-world rule. A miss is a missing BUTTON, never a thrown error.
    expect(retaliationOf(undefined, CTX)).toBeNull()
    expect(retaliationOf(featureByName('Sword of the Ninth Tuesday'), CTX)).toBeNull()
  })

  it('gives the button to exactly one of Nix’s reactions, and it is not the attack', () => {
    /* THE INVERSE, AND IT IS THE CLAIM THAT MATTERS. Opportunity Attack carries
       "1d8+4 Slashing" — dice, on a reaction row, on this very sheet. If the
       recogniser looked for dice it would offer to tally an ordinary swing, and
       the DM's "real numbers" would be inflated by every attack Nix made off
       his turn. It is excluded because canon states a PRICE for it (your
       Reaction) rather than a trigger of its own, which is `isFreeRider`'s
       whole job — proved here on real content rather than asserted. */
    const rows = reactionRows(composeTurn({ character: NIX, combat: null }), NIX)
    expect(rows.length).toBeGreaterThan(1)
    expect(rows.filter(r => r.retaliation).map(r => r.name)).toEqual(['Flaming Cloak'])
  })
})

describe('activeRetaliation — "the cloak is up" is three facts, not one', () => {
  const up = { ...NIX, tempHP: 12, tempHPSource: 'Flaming Cloak' }

  it('finds the die when the pool is live and names its source', () => {
    expect(activeRetaliation(up, CTX)?.notation).toBe('1d10')
  })

  it('is null with no pool, even when the label survives', () => {
    expect(activeRetaliation({ ...up, tempHP: 0 }, CTX)).toBeNull()
  })

  it('is null for an unattributed pool — a number typed by hand', () => {
    /* `HPTracker` grants temp HP with NO source when Marcus types one in, on
       purpose: naming the wrong feature is worse than naming none. So this is
       the ordinary case, and offering the cloak's die over it would be the app
       inventing a fact about where 12 points came from. */
    expect(activeRetaliation({ ...up, tempHPSource: null }, CTX)).toBeNull()
  })

  it('is null when the pool came from something that throws nothing back', () => {
    expect(activeRetaliation({ ...up, tempHPSource: 'Aid' }, CTX)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 2. The tally
// ---------------------------------------------------------------------------

describe('tallyOf — absent means zero, and junk means zero', () => {
  it('reads a state written before this build as nothing recorded', () => {
    // Definition-of-done 8: Marcus's stored `codex-combat-*` must not change
    // meaning. It has no such key, and it must read as an empty tally.
    expect(tallyOf(FIGHTING)).toEqual({ total: 0, hits: 0 })
  })

  it('refuses to render NaN at the DM', () => {
    /* Parsed straight off localStorage, where a half-written record from a
       killed tab is a real thing. "NaN damage" is not a number the DM can use
       and there is nothing left to recover the real one from. */
    const junk = { ...FIGHTING, retaliation: { total: NaN, hits: 2 } }
    expect(tallyOf(junk)).toEqual({ total: 0, hits: 2 })
  })

  it('clamps a negative and truncates a fraction', () => {
    expect(tallyOf({ ...FIGHTING, retaliation: { total: -5, hits: -1 } })).toEqual({
      total: 0,
      hits: 0,
    })
    expect(tallyOf({ ...FIGHTING, retaliation: { total: 7.9, hits: 1.5 } })).toEqual({
      total: 7,
      hits: 1,
    })
  })
})

describe('addRetaliation — accumulates, and never in place', () => {
  it('counts the damage and the hit separately', () => {
    const once = addRetaliation(FIGHTING, 7)
    expect(tallyOf(once)).toEqual({ total: 7, hits: 1 })
    expect(tallyOf(addRetaliation(once, 4))).toEqual({ total: 11, hits: 2 })
  })

  it('leaves the state it was handed untouched', () => {
    addRetaliation(FIGHTING, 7)
    expect(FIGHTING.retaliation).toBeUndefined()
  })
})

describe('tallyLine — the DM’s sentence', () => {
  it('says nothing has happened rather than saying zero', () => {
    expect(tallyLine({ total: 0, hits: 0 })).toBe('none yet')
  })

  it('counts hits as well as damage, and gets the plural right', () => {
    // The count is what tells Marcus the app MISSED one, which is the failure
    // mode of any tally a human has to remember to tap.
    expect(tallyLine({ total: 7, hits: 1 }, 'Fire')).toBe('7 Fire over 1 hit')
    expect(tallyLine({ total: 23, hits: 4 }, 'Fire')).toBe('23 Fire over 4 hits')
  })

  it('drops the damage type rather than inventing one', () => {
    expect(tallyLine({ total: 23, hits: 4 })).toBe('23 over 4 hits')
  })
})

// ---------------------------------------------------------------------------
// 3. Through the reducer
// ---------------------------------------------------------------------------

describe('reduce — recording a retaliation', () => {
  it('records the number and logs it under the feature’s name', () => {
    const applied = accepted(session(), 7)
    expect(tallyOf(applied.state.combat)).toEqual({ total: 7, hits: 1 })
    expect(applied.entry?.label).toBe('Hearthfire Manifest — 7 retaliation')
    expect(applied.entry?.round).toBe(3)
  })

  it('accumulates across a fight', () => {
    let state = session()
    for (const roll of [7, 4, 10, 2]) state = accepted(state, roll).state
    expect(tallyOf(state.combat)).toEqual({ total: 23, hits: 4 })
  })

  it('changes nothing else on the sheet', () => {
    /* It is the only event in the union that neither spends nor grants. If it
       ever starts touching the character, the whole "a ruling changes what the
       app SAYS, never what it COMPUTES" line has been crossed from the other
       side. */
    const before = session()
    expect(accepted(before, 7).state.character).toBe(before.character)
  })

  it('refuses out of combat, and keeps the state it was given', () => {
    /* "Per encounter" is meaningless with no encounter, and accepting would
       open a tally the next `startCombat` immediately wipes: the app would take
       the tap, show a total, and then lose it. */
    const resting = session({ inCombat: false })
    const applied = reduce(resting, { type: 'retaliate', amount: 7, source: 'Hearthfire Manifest' })
    expect(applied.refused).toBe('Start the encounter before recording retaliation damage.')
    expect(applied.entry).toBeNull()
    expect(applied.state).toBe(resting)
  })

  it('refuses a number that is not damage', () => {
    for (const amount of [0, -3, NaN, 0.4]) {
      const applied = reduce(session(), { type: 'retaliate', amount, source: 'x' })
      expect(applied.refused, `amount ${amount}`).toBe('A retaliation has to be at least 1 damage.')
      expect(applied.entry).toBeNull()
    }
  })
})

describe('the tally is per ENCOUNTER, at both ends', () => {
  it('is cleared when the fight ends', () => {
    const fought = accepted(session(), 7).state
    const done = reduce(fought, { type: 'endCombat' }).state
    expect(tallyOf(done.combat)).toEqual({ total: 0, hits: 0 })
  })

  it('is cleared when the next fight starts, even if the last one never ended', () => {
    /* Which is how it usually goes at a table: the DM says "roll initiative"
       and nobody taps End combat. Last fight's total sitting under the next
       fight's die is a number that is true of nothing currently happening. */
    const fought = accepted(session(), 7).state
    const next = reduce(fought, { type: 'startCombat' }).state
    expect(tallyOf(next.combat)).toEqual({ total: 0, hits: 0 })
  })
})

describe('undo — a restoration, not a subtraction', () => {
  it('puts the state back byte for byte', () => {
    const before = session()
    const applied = accepted(before, 7)
    expect(revert(applied.state, applied.entry!)).toStrictEqual(before)
  })

  it('undoing the FIRST of three leaves the other two intact', () => {
    /* The reason `restore.combat` is a whole snapshot rather than "subtract 7".
       Undo runs against the state as it stands now; a subtraction would take
       the 7 off a total that has moved on, and be right only by accident. */
    const before = session()
    const first = accepted(before, 7)
    const second = accepted(first.state, 4)
    const third = accepted(second.state, 10)
    expect(tallyOf(third.state.combat)).toEqual({ total: 21, hits: 3 })
    expect(tallyOf(revert(third.state, third.entry!).combat)).toEqual({ total: 11, hits: 2 })
  })

  it('restores an encounter’s whole tally when the fight is un-ended', () => {
    const fought = accepted(session(), 7).state
    const applied = reduce(fought, { type: 'endCombat' })
    expect(revert(applied.state, applied.entry!)).toStrictEqual(fought)
  })
})

describe('reconcile — the new field needs no branch', () => {
  it('leaves a state with no tally exactly as it found it', () => {
    /* Absence MEANS zero, so there is nothing to fix and identity must be
       preserved — callers compare with strictEqual to prove an event changed
       nothing, and a fresh object every time would turn those into
       tautologies. */
    const settled = session()
    expect(reconcile(settled)).toBe(settled)
  })
})
