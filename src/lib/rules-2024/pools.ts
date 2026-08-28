// ---------------------------------------------------------------------------
// Pool maxima — the second half of "always compute; retire stored"
// ---------------------------------------------------------------------------
//
// SHEET TRUTH slice 4. `derive.ts:121` promised these three would land here,
// "where the clamp rule they need is built". This is that rule.
//
// WHY THEY ARE NOT IN `DerivedNumbers`. A save DC is arithmetic all the way
// down, so slice 3 could delete the stored copy outright. A pool is not: its
// MAXIMUM is arithmetic on level, but its CURRENT is the only record that
// Marcus spent fifteen points at a table on Tuesday. Deleting the pool would
// delete that. So this file splits the record in half — canon owns `max`,
// Marcus owns `current` — and the seam between them is a clamp.
//
// THE CLAMP RULE: DOWN, NEVER UP. Raising the maximum leaves `current` exactly
// where it was; the bigger pool is not a refill, and levelling up mid-adventure
// must not hand back the Lay on Hands he already spent. Lowering the maximum
// pulls `current` down to meet it, because a pool cannot hold more than it is.
// Refills are `longRest()` / `shortRest()`'s job and stay there.
//
// ── THE TWO PLACES A PALADIN POOL LIVES ────────────────────────────────────
// `resources.ts:17-22` documents three storage locations. Two of them carry a
// level-scaled maximum and BOTH are repaired here:
//
//   paladinResources.layOnHands / .channelDivinity   the prototype's shape
//   features[].usesMax / .usesCurrent                the "smuggling route"
//
// Fixing only the first would have been the whole of this slice as planned,
// and it would have been invisible. Measured on the real app: Nix's sheet has
// `paladinResources: undefined` and carries Lay on Hands as a FEATURE with
// `usesMax: 40`. `paladinResources` is read by two surfaces; `usesMax` is read
// by the Grimoire, the loadout panel, print, and the AI prompts. Shipping the
// projection alone would have moved a number he cannot see while leaving the
// one he reads every session stale — a half-built feature running as if done.
//
// ── HOW A FEATURE IS MATCHED TO A CANON COLUMN, AND WHY THAT IS ALLOWED ────
// Through `poolIdFor()` in `turn/ids.ts` — the app's EXISTING answer to "which
// pool does this feature name mean". compose.ts already prices options with it
// and reduce.ts already pays with it, so a feature this file scales is, by
// construction, a feature the app already charges against that pool. This adds
// no new name-recognition; it reuses the one that was already load-bearing.
//
// The open-world rule holds unchanged. `poolIdFor` returns undefined for
// everything it does not know, and an unknown pool keeps its own numbers
// exactly as it does today. Nix's "Divine Sense 4 uses" is untouched: canon has
// no column for it, so this file has nothing to say about it. Silence means "I
// have nothing to add", never "you are wrong".

import { PROGRESSION_BY_CLASS } from '../../canon'
import type { CanonProgressionLevel } from '../canon/types'
import { poolIdFor } from '../turn/ids'
// Type-only, so no runtime edge is added to the character.ts cycle — the same
// arrangement derive.ts and resources.ts use.
import type { CharacterBase, ClassFeature, PaladinResources } from '../character'

/** Canon's per-level column that sets each pool's maximum, keyed by the app's
 *  own pool id.
 *
 *  A hand-written table, and therefore a liability unless something checks it —
 *  which is the `DERIVED_KEYS` lesson from slice 3 applied a second time.
 *  `satisfies` pins the right-hand side to columns that exist on canon's row
 *  type, so a canon package that renames `layOnHandsPool` is a COMPILE error.
 *  `pools.test.ts` pins the left-hand side by asserting `poolIdFor` can still
 *  produce each id, so a change to ids.ts is a RED TEST rather than a table
 *  that silently stops matching anything. */
const POOL_MAX_COLUMN = {
  'lay-on-hands': 'layOnHandsPool',
  'channel-divinity': 'channelDivinityUses',
} as const satisfies Record<string, keyof CanonProgressionLevel>

export type ScaledPoolId = keyof typeof POOL_MAX_COLUMN

export const SCALED_POOL_IDS = Object.keys(POOL_MAX_COLUMN) as ScaledPoolId[]

/** Canon's maximum for a pool at a level, or null when canon cannot say.
 *
 *  Null in three cases, all of them normal: canon has no table for the class,
 *  the level is off the end of the table it has, or the pool is not one canon
 *  carries a column for. Every caller treats null as "leave the stored number
 *  alone". */
export function poolMaxFor(
  poolId: string,
  className: string,
  level: number,
): number | null {
  const column = POOL_MAX_COLUMN[poolId as ScaledPoolId]
  if (!column) return null
  const row = (PROGRESSION_BY_CLASS[className] ?? []).find(r => r.level === level)
  if (!row) return null
  const value = row[column]
  return typeof value === 'number' ? value : null
}

/* ── Aura of Protection's radius ────────────────────────────────────────────
 *
 * The one number in this file canon does NOT carry as a column. Canon states it
 * twice, in prose, and both sentences are quoted here because the constants
 * below are the only copy of them the app runs on:
 *
 *   Aura of Protection (level 6), `shape`:
 *     "10-foot Emanation from you (30 feet at level 18)"
 *   Aura Expansion (level 18), `text`:
 *     "Your Aura of Protection becomes a 30-foot Emanation."
 *
 * Gate 3 established that canon is edited by hand and never scripted, so a
 * runtime regex over those sentences would be an app whose combat numbers
 * depend on someone's comma. The distances therefore stay declared here — but
 * the LEVELS do not: those are read from canon's own `classFeatures` lists,
 * which are structured data. `pools.test.ts` asserts canon's prose still
 * contains both distances, so a canon package that changes the radius is a red
 * test on the day it lands rather than a wrong aura at a table. */
export const AURA_BASE_RANGE = 10
export const AURA_EXPANDED_RANGE = 30

const AURA_FEATURE = 'Aura of Protection'
const AURA_EXPANSION_FEATURE = 'Aura Expansion'

/** The level at which canon's table first lists a named class feature, or null
 *  when no row lists it. Structural: it reads `levels[].classFeatures`. */
export function levelOfClassFeature(className: string, feature: string): number | null {
  const rows = PROGRESSION_BY_CLASS[className]
  if (!rows) return null
  for (const row of rows) {
    if (row.classFeatures?.includes(feature)) return row.level
  }
  return null
}

/** Aura radius in feet, or null when canon has no table for the class.
 *
 *  0 before the aura is gained — not `null`, because "you have no aura yet" is
 *  an answer and the field is a plain number. */
export function auraRangeFor(className: string, level: number): number | null {
  const gained = levelOfClassFeature(className, AURA_FEATURE)
  if (gained === null) return null
  if (level < gained) return 0
  const expanded = levelOfClassFeature(className, AURA_EXPANSION_FEATURE)
  return expanded !== null && level >= expanded ? AURA_EXPANDED_RANGE : AURA_BASE_RANGE
}

/** The `PaladinResources` a fresh character of this level starts with.
 *
 *  Full, because a character being created has spent nothing. This is the ONE
 *  place `current = max` is correct; everywhere else the clamp rule applies. */
export function paladinResourcesFor(level: number, className = 'Paladin'): PaladinResources {
  const loh = poolMaxFor('lay-on-hands', className, level) ?? 0
  const cd = poolMaxFor('channel-divinity', className, level) ?? 0
  return {
    layOnHands: { max: loh, current: loh },
    channelDivinity: { max: cd, current: cd },
    auraRange: auraRangeFor(className, level) ?? 0,
  }
}

/** Clamp a spent value into a pool that may have changed size. Down, never up. */
function clampCurrent(current: number, max: number): number {
  return Math.max(0, Math.min(max, current))
}

/** Repair every level-scaled maximum on a sheet, in both of the places one can
 *  live, leaving spent values where they are.
 *
 *  Pure and idempotent — `apply(apply(x))` equals `apply(x)` — which is what
 *  lets `resolveCharacter` call it on the read path and the write path without
 *  the two fighting.
 *
 *  Returns the SAME object when nothing moved, and the same `features` array
 *  when no feature moved, so a load that changes nothing does not churn React.
 *
 *  It does NOT create `paladinResources` where the field is absent. Nix has no
 *  such field and minting one would resurrect the legacy shape on a sheet that
 *  had moved past it — an app inventing a resource nobody asked for. */
export function applyPoolMaxima<T extends CharacterBase>(base: T): T {
  const { class: className, level } = base
  let changed = false

  let paladinResources = base.paladinResources
  if (paladinResources) {
    const next: PaladinResources = { ...paladinResources }
    let poolsMoved = false
    for (const key of ['layOnHands', 'channelDivinity'] as const) {
      const id: ScaledPoolId = key === 'layOnHands' ? 'lay-on-hands' : 'channel-divinity'
      const max = poolMaxFor(id, className, level)
      const pool = next[key]
      if (max === null || !pool) continue
      const current = clampCurrent(pool.current, max)
      if (max === pool.max && current === pool.current) continue
      next[key] = { max, current }
      poolsMoved = true
    }
    const aura = auraRangeFor(className, level)
    if (aura !== null && aura !== next.auraRange) {
      next.auraRange = aura
      poolsMoved = true
    }
    if (poolsMoved) {
      paladinResources = next
      changed = true
    }
  }

  const features = base.features ?? []
  let nextFeatures = features
  for (let index = 0; index < features.length; index++) {
    const feature = features[index]!
    // BOTH halves, matching `resources.ts:136`. A half-declared counter is the
    // app's own definition of UNTRACKED, and writing a maximum onto something
    // nothing is counting would turn a note into a resource.
    if (feature.usesMax === undefined || feature.usesCurrent === undefined) continue
    const id = poolIdFor(feature.name)
    if (!id) continue
    const max = poolMaxFor(id, className, level)
    if (max === null) continue
    const current = clampCurrent(feature.usesCurrent, max)
    if (max === feature.usesMax && current === feature.usesCurrent) continue
    /* Deliberately NOT gated on `feature.level <= base.level`. The maximum is a
       function of character level and of nothing else; gating it would make the
       number depend on two things instead of one, and every surface already
       hides a not-yet-gained feature (`resources.ts:130`). */
    if (nextFeatures === features) nextFeatures = [...features]
    nextFeatures[index] = { ...feature, usesMax: max, usesCurrent: current } as ClassFeature
    changed = true
  }

  if (!changed) return base
  return { ...base, paladinResources, features: nextFeatures }
}
