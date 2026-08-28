// Level-scaled pool maxima: canon owns the ceiling, Marcus owns the spend.
//
// SHEET TRUTH slice 4. The measured fault, taken off the real app before any of
// this was written: tapping "Level Up" moved the level and nothing else. Lay on
// Hands stayed at whatever it was, Channel Divinity stayed at 2 through level
// 11, the aura stayed 10 feet through level 18, and the toast said "Update your
// spells and features as needed" — telling Marcus to do by hand the work the
// app was supposed to be doing.
//
// Every test below is written from the direction that used to break: change the
// level, then ask what the SHEET says. Six of them fail against slice 3's code,
// listed in 00-status.md with the line that has to be put back to make each one
// go red.
import { describe, expect, it } from 'vitest'
import type { Character, CharacterBase, ClassFeature } from '../character'
import { computePaladinResources } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { PROGRESSION_BY_CLASS, CLASS_FEATURES } from '../../canon'
import { poolIdFor } from '../turn/ids'
import { changedNumbers, resolveCharacter, storableOf } from './derive'
import { poolsOf } from './resources'
import {
  AURA_BASE_RANGE,
  AURA_EXPANDED_RANGE,
  SCALED_POOL_IDS,
  applyPoolMaxima,
  auraRangeFor,
  poolMaxFor,
} from './pools'

/** Nix, re-levelled. Goes through `storableOf` first so the derived numbers are
 *  stripped and genuinely recomputed rather than carried over from the fixture —
 *  a test that resolved an already-resolved sheet would be testing nothing. */
function at(level: number, over: Partial<CharacterBase> = {}): Character {
  return resolveCharacter({ ...storableOf(NIX), level, ...over })
}

function feature(sheet: Character, name: string): ClassFeature {
  const found = sheet.features.find(f => f.name === name)
  if (!found) throw new Error(`fixture lost its "${name}" feature`)
  return found
}

// ---------------------------------------------------------------------------
// 1. The table this file depends on, checked in both directions
// ---------------------------------------------------------------------------

describe('the canon table POOL_MAX_COLUMN reads', () => {
  // Forward guard. Cannot fail against slice 3 — nothing it names existed then.
  // It is here because `POOL_MAX_COLUMN` is a hand-written map and slice 3's
  // finding BJ was a hand-written invariant that had quietly stopped being one.
  // `satisfies` already pins the canon side at compile time; this pins the app
  // side, so an edit to `ids.ts` that stops producing one of these ids is a red
  // test rather than a table that silently matches nothing.
  it('names only pool ids that poolIdFor can still produce', () => {
    const produced = new Set(
      ['Lay on Hands', 'Lay on Hands (Hearth)', 'Channel Divinity: Sacred Weapon']
        .map(poolIdFor)
        .filter(Boolean),
    )
    for (const id of SCALED_POOL_IDS) expect(produced).toContain(id)
  })

  it('matches canon row for row, at all twenty levels', () => {
    for (const row of PROGRESSION_BY_CLASS.Paladin!) {
      expect(poolMaxFor('lay-on-hands', 'Paladin', row.level)).toBe(row.layOnHandsPool)
      expect(poolMaxFor('channel-divinity', 'Paladin', row.level)).toBe(row.channelDivinityUses)
    }
  })

  // The aura's two distances are the only numbers in pools.ts that canon does
  // not carry as a column, so this is the tripwire on them: if a canon package
  // ever reworks the aura, this goes red the day it lands.
  it('still finds both aura distances in canon prose', () => {
    const aura = CLASS_FEATURES.find(f => f.name === 'Aura of Protection')
    const text = JSON.stringify(aura)
    expect(text).toContain(String(AURA_BASE_RANGE))
    expect(text).toContain(String(AURA_EXPANDED_RANGE))
  })

  it('reads the aura levels from canon rather than from a constant', () => {
    expect(auraRangeFor('Paladin', 5)).toBe(0)
    expect(auraRangeFor('Paladin', 6)).toBe(AURA_BASE_RANGE)
    expect(auraRangeFor('Paladin', 17)).toBe(AURA_BASE_RANGE)
    expect(auraRangeFor('Paladin', 18)).toBe(AURA_EXPANDED_RANGE)
    // Open world: no table, no answer.
    expect(auraRangeFor('Fighter', 18)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 2. The pool Marcus can actually see — his feature counter
// ---------------------------------------------------------------------------

describe('a pool stored on a feature', () => {
  /* THE ONE THIS SLICE EXISTS FOR. Nix has no `paladinResources` at all; his
     Lay on Hands is a feature with `usesMax: 40`, and that is the number the
     Grimoire, the loadout panel, print and the AI prompts all read. Against
     slice 3 this returns 40 at every level forever. */
  it('takes its maximum from canon, not from what was typed in', () => {
    expect(feature(at(7), 'Lay on Hands').usesMax).toBe(35)
    expect(feature(at(8), 'Lay on Hands').usesMax).toBe(40)
    expect(feature(at(20), 'Lay on Hands').usesMax).toBe(100)
  })

  it('does not refund what was already spent when the pool grows', () => {
    // The fixture is part-spent: 15 of 40 left. Levelling raises the ceiling;
    // it must not put points back in. A bigger pool is not a long rest.
    expect(feature(NIX, 'Lay on Hands').usesCurrent).toBe(15)
    expect(feature(at(8), 'Lay on Hands').usesCurrent).toBe(15)
    expect(feature(at(20), 'Lay on Hands').usesCurrent).toBe(15)
  })

  it('clamps what was spent down when the pool shrinks', () => {
    // Levelling DOWN is a real path — Marcus fixed a typo in the level field
    // during slice 8b. A pool cannot hold more than it is.
    const low = feature(at(2), 'Lay on Hands')
    expect(low.usesMax).toBe(10)
    expect(low.usesCurrent).toBe(10)
  })

  it('scales a Channel Divinity feature through the same table', () => {
    // "Channel Divinity: Sacred Weapon" — matched by the loose `includes` in
    // poolIdFor, which is the SAME match compose.ts already prices it with. A
    // feature the app charges against the channel-divinity pool is scaled by
    // the channel-divinity column, or the two would disagree.
    expect(feature(at(7), 'Channel Divinity: Sacred Weapon').usesMax).toBe(2)
    expect(feature(at(11), 'Channel Divinity: Sacred Weapon').usesMax).toBe(3)
    // Spent stays spent across the boundary: 1 of 2 used stays 1 of 3.
    expect(feature(at(11), 'Channel Divinity: Sacred Weapon').usesCurrent).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. What it refuses to touch — the open-world rule, in four shapes
// ---------------------------------------------------------------------------

describe('what canon has nothing to say about', () => {
  it('leaves a feature canon carries no column for exactly as it was', () => {
    // Divine Sense is a real canon feature with real uses — and no column. The
    // app must not invent a scaling rule for it just because it recognises the
    // name from somewhere.
    const divine = feature(at(20), 'Divine Sense')
    expect(divine.usesMax).toBe(4)
    expect(divine.usesCurrent).toBe(0)
  })

  it('leaves a class canon has no table for entirely alone', () => {
    const fighter = resolveCharacter({ ...storableOf(NIX), class: 'Fighter', level: 20 })
    expect(feature(fighter, 'Lay on Hands').usesMax).toBe(40)
  })

  it('leaves a half-declared counter untracked instead of completing it', () => {
    // `usesMax` with no `usesCurrent` is the app's own definition of UNTRACKED
    // (resources.ts:136). Writing a maximum onto it would promote a note into a
    // resource nothing had asked to count.
    const half: ClassFeature = { name: 'Lay on Hands', level: 1, description: '', usesMax: 99 }
    const sheet = resolveCharacter({ ...storableOf(NIX), level: 7, features: [half] })
    expect(sheet.features[0]).toEqual(half)
  })

  it('does not mint paladinResources on a sheet that has none', () => {
    // Nix moved past the legacy shape. Creating it would resurrect a field two
    // surfaces read and nothing maintains, and he would then have two Lay on
    // Hands pools disagreeing with each other.
    expect(NIX.paladinResources).toBeUndefined()
    expect(at(20).paladinResources).toBeUndefined()
  })

  it('never touches spell slots, at any level', () => {
    // Deliberate and permanent: his sheet carries slots his level does not
    // grant, which may be his DM or an item. `discrepancies()` reports them.
    expect(at(20).spellSlots).toEqual(NIX.spellSlots)
    expect(at(1).spellSlots).toEqual(NIX.spellSlots)
  })
})

// ---------------------------------------------------------------------------
// 4. The legacy shape, for the sheet on the iPad that still has it
// ---------------------------------------------------------------------------

describe('a pool stored in paladinResources', () => {
  const withLegacy = (level: number, over: Partial<Character['paladinResources'] & object> = {}) =>
    resolveCharacter({
      ...storableOf(NIX),
      level,
      paladinResources: {
        layOnHands: { max: 40, current: 12 },
        channelDivinity: { max: 2, current: 1 },
        auraRange: 10,
        ...over,
      },
    })

  it('moves the pair and the aura together', () => {
    const eleven = withLegacy(11).paladinResources!
    expect(eleven.layOnHands.max).toBe(55)
    expect(eleven.channelDivinity.max).toBe(3)
    // Spent survives both.
    expect(eleven.layOnHands.current).toBe(12)
    expect(eleven.channelDivinity.current).toBe(1)

    const eighteen = withLegacy(18).paladinResources!
    expect(eighteen.auraRange).toBe(AURA_EXPANDED_RANGE)
    expect(withLegacy(17).paladinResources!.auraRange).toBe(AURA_BASE_RANGE)
  })

  it('gives a fresh sheet a full pool, and canon-correct uses at level 1', () => {
    /* The drift this found: `level >= 11 ? 3 : 2` handed a level-1 paladin two
       uses of Channel Divinity, which they do not have the feature for until
       level 3. Canon's column says 0. `current = max` is right HERE and only
       here — a character being created has spent nothing. */
    expect(computePaladinResources(1)).toEqual({
      layOnHands: { max: 5, current: 5 },
      channelDivinity: { max: 0, current: 0 },
      auraRange: 0,
    })
    expect(computePaladinResources(11).channelDivinity).toEqual({ max: 3, current: 3 })
    expect(computePaladinResources(18).auraRange).toBe(AURA_EXPANDED_RANGE)
  })
})

// ---------------------------------------------------------------------------
// 5. Idempotence, and what the toast is allowed to claim
// ---------------------------------------------------------------------------

describe('applying the maxima twice', () => {
  it('changes nothing the second time, and returns the same object', () => {
    // `resolveCharacter` sits on both the read path and the write path. If this
    // were not idempotent the two would fight, and a sheet would drift a little
    // every time it was saved.
    const once = applyPoolMaxima(storableOf(at(9)))
    expect(applyPoolMaxima(once)).toBe(once)
  })
})

describe('changedNumbers — what the level-up toast may say', () => {
  it('names the pool that moved and stays silent about the ones that did not', () => {
    const moved = changedNumbers(at(7), at(8))
    expect(moved).toContainEqual({ label: 'Lay on Hands', from: 35, to: 40 })
    // 7 → 8 changes neither the proficiency bonus nor the prepared count. A
    // toast that listed them would be claiming credit for standing still.
    expect(moved.map(m => m.label)).not.toContain('Proficiency')
    expect(moved.map(m => m.label)).not.toContain('Prepared spells')
  })

  it('names every derived number on a boundary level', () => {
    const labels = changedNumbers(at(8), at(9)).map(m => m.label)
    expect(labels).toContain('Proficiency')
    expect(labels).toContain('Spell save DC')
    expect(labels).toContain('Spell attack')
    expect(labels).toContain('Prepared spells')
    expect(labels).toContain('Lay on Hands')
  })

  it('reports a pool through whichever site it lives in', () => {
    // Nix's is a feature; the iPad sheet's is `paladinResources`. `poolsOf`
    // projects both, so the toast cannot know the difference — which is the
    // point.
    const legacy = (level: number) =>
      resolveCharacter({
        ...storableOf(NIX),
        level,
        features: [],
        paladinResources: {
          layOnHands: { max: 0, current: 0 },
          channelDivinity: { max: 0, current: 0 },
          auraRange: 0,
        },
      })
    expect(changedNumbers(legacy(10), legacy(11))).toContainEqual({
      label: 'Channel Divinity',
      from: 2,
      to: 3,
    })
  })

  it('is a diff, so a sheet that did not move produces no claims', () => {
    expect(changedNumbers(at(7), at(7))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. The whole point, stated once as the user would state it
// ---------------------------------------------------------------------------

describe('the sheet after Level Up', () => {
  it('has no pool whose maximum disagrees with canon', () => {
    /* A STRUCTURAL claim rather than a sampled one — finding BG. This does not
       check a list of pools someone remembered to write down; it walks every
       pool the character actually has, at every level canon covers, and forbids
       the fault outright. A pool added to Nix's sheet next year is covered on
       the day it is added. */
    for (let level = 1; level <= 20; level++) {
      const sheet = at(level)
      for (const pool of poolsOf(sheet)) {
        const expected = poolMaxFor(pool.id, sheet.class, level)
        if (expected === null) continue
        expect({ level, id: pool.id, max: pool.max }).toEqual({
          level,
          id: pool.id,
          max: expected,
        })
        expect(pool.current).toBeLessThanOrEqual(pool.max)
      }
    }
  })
})
