import type { Character } from '../character'
// A leaf module with no imports of its own, so reaching back into lib/turn for
// it creates no cycle. Ids are the one thing resources and turn-composition
// must agree on to the letter — see the header of ids.ts.
import { featurePoolId, poolIdFor, slug } from '../turn/ids'

/* ============================================================================
   resources.ts — every countable thing on the sheet, under one model
   ----------------------------------------------------------------------------
   Nix has four pools and the prototype could express two of them. Lay on Hands
   and Channel Divinity lived in a fixed three-field `PaladinResources` shape
   derived from level; anything Oath of the Hearth grants had to be smuggled in
   as a "feature with uses", which is why his sheet reads "40 uses" for what is
   plainly 40 POINTS. Homebrew was an edge case in a data model built for one
   subclass out of the book.

   This file makes the pool the primitive, and reads all three of the places a
   pool can physically live:

     paladinResources.layOnHands / .channelDivinity   the prototype's shape
     features[].usesMax / .usesCurrent                the smuggling route
     resourcePools[]                                  NEW — what Marcus authors

   ── WHAT IT REFUSES TO DO ────────────────────────────────────────────────────
   It does not migrate. `paladinResources` is KEPT — it is live in saved data
   on Marcus's iPad, it is derived from level by code that still runs, and the
   prime law says a working thing is improved, never removed. This is a
   PROJECTION with a write-back, so the old field keeps working forever and
   Marcus sees one uniform surface over the top of it.

   It also does not decide legality or affordability *policy*. `spendable()`
   answers "are there enough", and that is arithmetic. Whether the option
   should have been offered at all is compose.ts's problem, and whether the
   spend can be undone is reduce.ts's.
   ========================================================================== */

export type ResourceUnit = 'points' | 'uses' | 'dice'
export type ResourceRecharge = 'shortRest' | 'longRest' | 'dawn' | 'never' | 'manual'

export interface ResourcePool {
  id: string
  name: string
  current: number
  max: number
  unit: ResourceUnit
  recharge: ResourceRecharge
  /** Optional by design. Homebrew may simply set max by hand — the app must
   *  never require a formula it cannot evaluate for content it has never met. */
  derivedFrom?: { formula: string }
  note?: string
}

/** Where the pool physically lives, so a write can find its way home. */
export type PoolOrigin =
  | { kind: 'paladin'; key: 'layOnHands' | 'channelDivinity' }
  | { kind: 'feature'; index: number }
  | { kind: 'custom'; index: number }

export interface ResolvedPool extends ResourcePool {
  origin: PoolOrigin
  /** True when the whole pool (name, max, unit, recharge) may be edited.
   *  A feature's counter is edited on the feature, and the paladin pair is
   *  derived from level — for those, only `current` is Marcus's to set here,
   *  and the editor says so rather than silently discarding his typing. */
  editable: boolean
  homebrew?: boolean
}

export const UNITS: ResourceUnit[] = ['points', 'uses', 'dice']
export const RECHARGES: ResourceRecharge[] = ['shortRest', 'longRest', 'dawn', 'never']

export const RECHARGE_LABEL: Record<ResourceRecharge, string> = {
  shortRest: 'short rest',
  longRest: 'long rest',
  dawn: 'dawn',
  never: 'never',
  manual: 'manually',
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Every pool the character has, in the order the surfaces should show them.
 *
 *  Precedence is paladin → feature → custom, and it is deliberate: the pair in
 *  `paladinResources` is the one the rest of the prototype still writes to, so
 *  if a same-named feature also exists the paladin copy has to be the one the
 *  reducer spends from or the two would drift. `resourcesOf()` in compose.ts
 *  has always ordered them this way; this is that rule, promoted to the one
 *  place both readers can share. */
export function poolsOf(character: Character): ResolvedPool[] {
  const out: ResolvedPool[] = []
  const seen = new Set<string>()
  const push = (pool: ResolvedPool) => {
    if (seen.has(pool.id)) return
    seen.add(pool.id)
    out.push(pool)
  }

  const paladin = character.paladinResources
  if (paladin?.layOnHands) {
    push({
      id: 'lay-on-hands',
      name: 'Lay on Hands',
      current: paladin.layOnHands.current,
      max: paladin.layOnHands.max,
      unit: 'points',
      recharge: 'longRest',
      origin: { kind: 'paladin', key: 'layOnHands' },
      editable: false,
    })
  }
  if (paladin?.channelDivinity) {
    push({
      id: 'channel-divinity',
      name: 'Channel Divinity',
      current: paladin.channelDivinity.current,
      max: paladin.channelDivinity.max,
      unit: 'uses',
      recharge: 'shortRest',
      origin: { kind: 'paladin', key: 'channelDivinity' },
      editable: false,
    })
  }

  const features = character.features ?? []
  for (let index = 0; index < features.length; index++) {
    const feature = features[index]!
    if (feature.level > character.level) continue
    // BOTH halves. This is the app's own definition of a tracked counter
    // (GrimoirePage's `uses`, LoadoutPanel:168) and treating a half-declared one as
    // empty is the bug Slice 6 found: a usable homebrew ability displayed as
    // "0 / 2" and refused to fire. Half-declared means UNTRACKED, so it is not
    // a pool at all and nothing may charge it.
    if (feature.usesMax === undefined || feature.usesCurrent === undefined) continue
    const id = poolIdFor(feature.name) ?? slug(feature.name)
    push({
      id,
      name: feature.name,
      current: feature.usesCurrent,
      max: feature.usesMax,
      // Lay on Hands is the one pool measured in POINTS, and Nix's is stored
      // as a feature with usesMax 40 — which is why his sheet has always read
      // "40 uses" for what is plainly 40 points. Pinned in Slice 2; corrected
      // here because this projection is new and owes that string nothing.
      unit: id === 'lay-on-hands' ? 'points' : 'uses',
      recharge:
        feature.usesPerRest === 'short'
          ? 'shortRest'
          : feature.usesPerRest === 'long'
            ? 'longRest'
            : 'manual',
      origin: { kind: 'feature', index },
      editable: false,
      ...(feature.source?.toLowerCase().includes('homebrew') ? { homebrew: true } : {}),
    })
  }

  const custom = character.resourcePools ?? []
  for (let index = 0; index < custom.length; index++) {
    const pool = custom[index]!
    push({ ...pool, origin: { kind: 'custom', index }, editable: true, homebrew: true })
  }

  return out
}

export function findPool(character: Character, poolId: string): ResolvedPool | null {
  return poolsOf(character).find(pool => pool.id === poolId) ?? null
}

/** Enough left to pay `amount`? Arithmetic, not policy. */
export function spendable(pool: ResolvedPool | null, amount: number): boolean {
  return pool !== null && pool.current >= amount
}

// ---------------------------------------------------------------------------
// Writing — one function, because every writer must clamp identically
// ---------------------------------------------------------------------------

/** Set a pool's current value, clamped to `[0, max]`, wherever it lives.
 *
 *  Returns the character UNCHANGED when the pool is gone or the value already
 *  matches. Both matter: Undo restores a pool by id, and by then Marcus may
 *  have deleted it — that must be a quiet no-op, not a crash at the table.
 *
 *  The clamp is against the pool's CURRENT max, including on restore. If he
 *  lowered the max between the spend and the undo, handing back the old number
 *  would be handing back a pool larger than the one he now owns. */
export function setPoolCurrent(character: Character, poolId: string, value: number): Character {
  const pool = findPool(character, poolId)
  if (!pool) return character
  const next = Math.max(0, Math.min(pool.max, Math.round(value)))
  if (next === pool.current) return character

  const origin = pool.origin
  if (origin.kind === 'paladin') {
    const paladin = character.paladinResources
    if (!paladin) return character
    return {
      ...character,
      paladinResources: {
        ...paladin,
        [origin.key]: { ...paladin[origin.key], current: next },
      },
    }
  }
  if (origin.kind === 'feature') {
    const features = [...(character.features ?? [])]
    const feature = features[origin.index]
    if (!feature) return character
    features[origin.index] = { ...feature, usesCurrent: next }
    return { ...character, features }
  }
  const pools = [...(character.resourcePools ?? [])]
  const existing = pools[origin.index]
  if (!existing) return character
  pools[origin.index] = { ...existing, current: next }
  return { ...character, resourcePools: pools }
}

/** Add (or replace, by id) a Marcus-authored pool. */
export function upsertPool(character: Character, pool: ResourcePool): Character {
  const pools = [...(character.resourcePools ?? [])]
  const at = pools.findIndex(p => p.id === pool.id)
  const clamped: ResourcePool = {
    ...pool,
    max: Math.max(0, Math.round(pool.max)),
    current: Math.max(0, Math.min(Math.max(0, Math.round(pool.max)), Math.round(pool.current))),
  }
  if (at >= 0) pools[at] = clamped
  else pools.push(clamped)
  return { ...character, resourcePools: pools }
}

/** Remove a Marcus-authored pool. Pools that live on a feature or in
 *  `paladinResources` are NOT deletable from here — deleting the projection
 *  would leave the real field behind and the pool would simply reappear. */
export function removePool(character: Character, poolId: string): Character {
  const pools = character.resourcePools ?? []
  const next = pools.filter(p => p.id !== poolId)
  if (next.length === pools.length) return character
  return { ...character, resourcePools: next }
}

/** A free id for a new pool, unique against everything the character already
 *  has — including feature counters, which share the id namespace. */
export function freePoolId(character: Character, name: string): string {
  const taken = new Set(poolsOf(character).map(p => p.id))
  const base = slug(name) || 'pool'
  if (!taken.has(base)) return base
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${taken.size + 1}`
}

/** Refill Marcus-authored pools for a rest.
 *
 *  ONLY the authored ones. The paladin pair and feature counters are recharged
 *  by `longRest()` / `shortRest()` in character.ts, which have owned that job
 *  since the prototype and get it subtly right — 2024 Channel Divinity comes
 *  back ONE use on a short rest, not all of them. Duplicating that here would
 *  be a second writer racing the first, which is the whole bug class this
 *  slice exists to close. */
export function rechargePools(character: Character, rest: 'short' | 'long' | 'dawn'): Character {
  const pools = character.resourcePools ?? []
  if (pools.length === 0) return character
  const refills: Record<'short' | 'long' | 'dawn', ResourceRecharge[]> = {
    short: ['shortRest'],
    // A long rest is a rest and it contains a dawn.
    long: ['shortRest', 'longRest', 'dawn'],
    dawn: ['dawn'],
  }
  const kinds = refills[rest]
  let changed = false
  const next = pools.map(pool => {
    if (!kinds.includes(pool.recharge) || pool.current === pool.max) return pool
    changed = true
    return { ...pool, current: pool.max }
  })
  return changed ? { ...character, resourcePools: next } : character
}

/** The pool a feature spends, if it declares one.
 *
 *  Two routes, and the order matters. An explicit `resourcePoolId` is Marcus
 *  binding a feature to a pool he authored — that is a statement of intent and
 *  it wins. Otherwise the feature's own counter is its pool, which is how
 *  every feature in the prototype has always worked. */
export function poolIdForFeature(feature: {
  name: string
  usesMax?: number
  resourcePoolId?: string
}): string | undefined {
  if (feature.resourcePoolId) return feature.resourcePoolId
  return featurePoolId(feature.name, feature.usesMax)
}
