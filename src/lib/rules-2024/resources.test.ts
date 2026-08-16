// One pool model over three storage sites.
//
// The thing under test is not really `poolsOf` — it is the claim that the
// screen, the composer and the reducer can no longer disagree about what a
// pool is, because there is now only one of them. So these tests are written
// from the two directions that used to drift apart: "what does the sheet SAY I
// have" and "what happens when something SPENDS it".
//
// None of these can pass against Slice 6's code: `resources.ts` did not exist,
// `character.resourcePools` was not a field, and the only pools the app could
// express were `paladinResources` and a feature counter.
import { describe, expect, it } from 'vitest'
import type { Character, ClassFeature } from '../character'
import { longRest, shortRest } from '../character'
import { NIX } from '../turn/fixtures/nix'
import {
  findPool,
  freePoolId,
  poolIdForFeature,
  poolsOf,
  rechargePools,
  removePool,
  setPoolCurrent,
  spendable,
  upsertPool,
  type ResourcePool,
} from './resources'

const EMBERS: ResourcePool = {
  id: 'hearth-embers',
  name: 'Hearth Embers',
  current: 3,
  max: 5,
  unit: 'points',
  recharge: 'longRest',
  note: 'Banked warmth. Spend to shelter an ally.',
}

/** Nix with an authored pool, which is the shape Slice 6b exists to support. */
function withEmbers(over: Partial<ResourcePool> = {}): Character {
  return { ...NIX, resourcePools: [{ ...EMBERS, ...over }] }
}

// ---------------------------------------------------------------------------
// 1. Reading — the three sites, and the precedence between them
// ---------------------------------------------------------------------------

describe('poolsOf — every countable thing, from wherever it lives', () => {
  it('finds an authored pool that no feature and no class grants', () => {
    const pool = findPool(withEmbers(), 'hearth-embers')
    expect(pool).toMatchObject({ name: 'Hearth Embers', current: 3, max: 5, unit: 'points' })
    // Editable is the editor's whole permission model: only an authored pool
    // may have its name, max, unit and recharge changed here. The other two
    // sites are owned by the class table and the feature editor respectively,
    // and letting this screen write them would mean two writers again.
    expect(pool!.editable).toBe(true)
    expect(pool!.origin).toEqual({ kind: 'custom', index: 0 })
  })

  it('keeps paladinResources winning over a same-named feature', () => {
    // The precedence that used to be duplicated in resolvePool AND resourcesOf.
    // Nix carries "Lay on Hands" as a FEATURE with usesMax 40; give him the
    // bespoke field too and the bespoke field must be the one that answers, or
    // the app charges one 40-point pool and displays the other.
    const both: Character = {
      ...NIX,
      paladinResources: {
        layOnHands: { current: 12, max: 40 },
        channelDivinity: { current: 1, max: 2 },
        auraRange: 10,
      },
    }
    const pool = findPool(both, 'lay-on-hands')
    expect(pool!.current).toBe(12)
    expect(pool!.origin.kind).toBe('paladin')
    expect(poolsOf(both).filter(p => p.id === 'lay-on-hands')).toHaveLength(1)
  })

  it('calls Lay on Hands POINTS even when it is stored as a feature counter', () => {
    // The Slice 2 pinned bug: Nix's sheet has always read "40 uses" for what is
    // plainly 40 points, because a feature counter has only one unit.
    expect(findPool(NIX, 'lay-on-hands')).toMatchObject({ unit: 'points', max: 40 })
  })

  it('does not count a half-declared counter as a pool at all', () => {
    // The app's own rule (GrimoireCard:132, LoadoutPanel:168): tracked means
    // BOTH halves present. A max with no current is UNLIMITED, not empty — and
    // the bug this replaced rendered it as "0 / 2" and refused to fire it.
    const half: ClassFeature = { name: 'Ember Ward', level: 1, description: '...', usesMax: 2 }
    const character: Character = { ...NIX, features: [half] }
    expect(findPool(character, 'ember-ward')).toBeNull()
    expect(poolsOf(character)).toHaveLength(0)
  })

  it('hides a feature from a level Marcus has not reached', () => {
    const future: ClassFeature = {
      name: 'Hearth Eternal',
      level: 20,
      description: '...',
      usesMax: 1,
      usesCurrent: 1,
    }
    expect(findPool({ ...NIX, features: [future] }, 'hearth-eternal')).toBeNull()
  })

  it('lets the first pool win a duplicated id rather than showing it twice', () => {
    const twice = withEmbers()
    twice.resourcePools = [
      { ...EMBERS, current: 3 },
      { ...EMBERS, current: 99 },
    ]
    const found = poolsOf(twice).filter(p => p.id === 'hearth-embers')
    expect(found).toHaveLength(1)
    expect(found[0]!.current).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 2. Writing — one clamp, three destinations
// ---------------------------------------------------------------------------

describe('setPoolCurrent — the only writer, so the clamp cannot differ by site', () => {
  it('writes an authored pool back to resourcePools', () => {
    const after = setPoolCurrent(withEmbers(), 'hearth-embers', 1)
    expect(after.resourcePools![0]!.current).toBe(1)
    // Nothing else moved. A write to one pool must not rewrite the sheet.
    expect(after.features).toBe(NIX.features)
  })

  it('writes a feature-backed pool back to the feature', () => {
    const after = setPoolCurrent(NIX, 'lay-on-hands', 7)
    const feature = after.features.find(f => f.name === 'Lay on Hands')!
    expect(feature.usesCurrent).toBe(7)
    expect(after.resourcePools ?? []).toEqual([])
  })

  it('clamps above max and below zero at every site', () => {
    expect(setPoolCurrent(withEmbers(), 'hearth-embers', 99).resourcePools![0]!.current).toBe(5)
    expect(setPoolCurrent(withEmbers(), 'hearth-embers', -4).resourcePools![0]!.current).toBe(0)
    const overFeature = setPoolCurrent(NIX, 'lay-on-hands', 500)
    expect(overFeature.features.find(f => f.name === 'Lay on Hands')!.usesCurrent).toBe(40)
  })

  it('is a QUIET no-op for a pool that no longer exists', () => {
    // Marcus can delete a homebrew pool between spending it and undoing the
    // spend. Undo must not crash mid-encounter over a resource he threw away.
    const before = withEmbers()
    expect(setPoolCurrent(before, 'a-pool-he-deleted', 4)).toBe(before)
  })

  it('returns the same object when the value already matches', () => {
    // Identity, not deep equality: `reduce` decides whether an event is worth
    // logging by asking `nextCharacter !== character`. If a no-op write minted
    // a new object, every free option would offer an Undo that undoes nothing.
    const before = withEmbers()
    expect(setPoolCurrent(before, 'hearth-embers', 3)).toBe(before)
  })

  it('clamps a RESTORE against the max the pool has NOW', () => {
    // He spent 4 of 5, then edited the pool down to a 2-point pool, then hit
    // Undo. Handing back 4 would hand back a pool bigger than the one he owns.
    const shrunk = withEmbers({ current: 0, max: 2 })
    expect(setPoolCurrent(shrunk, 'hearth-embers', 4).resourcePools![0]!.current).toBe(2)
  })
})

describe('spendable — arithmetic, and only arithmetic', () => {
  it('answers for a pool that exists and refuses a null one', () => {
    const pool = findPool(withEmbers(), 'hearth-embers')
    expect(spendable(pool, 3)).toBe(true)
    expect(spendable(pool, 4)).toBe(false)
    expect(spendable(null, 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. Authoring
// ---------------------------------------------------------------------------

describe('upsert / remove / freePoolId — what the editor needs', () => {
  it('adds a pool, then replaces it by id rather than duplicating it', () => {
    const added = upsertPool(NIX, EMBERS)
    expect(added.resourcePools).toHaveLength(1)
    const edited = upsertPool(added, { ...EMBERS, name: 'Hearth Coals', max: 8 })
    expect(edited.resourcePools).toHaveLength(1)
    expect(edited.resourcePools![0]).toMatchObject({ name: 'Hearth Coals', max: 8 })
  })

  it('clamps current to max on the way in, so an edit cannot mint points', () => {
    // Lowering the max in the editor while current sits above it.
    const out = upsertPool(NIX, { ...EMBERS, current: 5, max: 2 })
    expect(out.resourcePools![0]!.current).toBe(2)
  })

  it('removes an authored pool and leaves an unknown id alone', () => {
    const before = withEmbers()
    expect(removePool(before, 'hearth-embers').resourcePools).toEqual([])
    expect(removePool(before, 'not-a-pool')).toBe(before)
  })

  it('refuses to collide with an id a FEATURE already owns', () => {
    // The subtle one. Feature counters and authored pools share an id
    // namespace, so a new pool called "Divine Sense" must not silently become
    // an alias for the feature counter of the same name.
    expect(freePoolId(NIX, 'Divine Sense')).toBe('divine-sense-2')
    expect(freePoolId(NIX, 'Hearth Embers')).toBe('hearth-embers')
    expect(freePoolId(withEmbers(), 'Hearth Embers')).toBe('hearth-embers-2')
  })

  it('still yields an id for a name that slugs to nothing', () => {
    expect(freePoolId(NIX, '???')).toBe('pool')
  })
})

// ---------------------------------------------------------------------------
// 4. Resting
// ---------------------------------------------------------------------------

describe('rechargePools — exactly one writer per pool', () => {
  it('refills a short-rest pool on a short rest and leaves a long-rest one spent', () => {
    const character: Character = {
      ...NIX,
      resourcePools: [
        { ...EMBERS, current: 0, recharge: 'longRest' },
        { ...EMBERS, id: 'kindling', name: 'Kindling', current: 0, max: 2, recharge: 'shortRest' },
      ],
    }
    const after = rechargePools(character, 'short')
    expect(after.resourcePools![0]!.current).toBe(0)
    expect(after.resourcePools![1]!.current).toBe(2)
  })

  it('treats a long rest as containing a short rest and a dawn', () => {
    const character: Character = {
      ...NIX,
      resourcePools: [
        { ...EMBERS, current: 0, recharge: 'shortRest' },
        { ...EMBERS, id: 'dawnlight', name: 'Dawnlight', current: 0, max: 1, recharge: 'dawn' },
      ],
    }
    const after = rechargePools(character, 'long')
    expect(after.resourcePools!.map(p => p.current)).toEqual([5, 1])
  })

  it('never refills a `never` pool', () => {
    const once = withEmbers({ current: 0, recharge: 'never' })
    expect(rechargePools(once, 'long')).toBe(once)
  })

  it('does NOT touch the paladin pair or feature counters', () => {
    // Those are recharged by longRest()/shortRest() in character.ts. Two
    // writers on one field is the bug class this whole slice exists to close,
    // and 2024's Channel Divinity — +1 use on a short rest, not all of them —
    // is exactly the subtlety a duplicate writer would flatten.
    const spent: Character = {
      ...NIX,
      paladinResources: {
        layOnHands: { current: 0, max: 40 },
        channelDivinity: { current: 0, max: 2 },
        auraRange: 10,
      },
      resourcePools: [{ ...EMBERS, current: 0 }],
    }
    const after = rechargePools(spent, 'long')
    expect(after.paladinResources).toBe(spent.paladinResources)
    expect(after.features).toBe(spent.features)
    expect(after.resourcePools![0]!.current).toBe(5)
  })
})

describe('the rests themselves now refill authored pools', () => {
  it('long rest fills a long-rest pool AND still restores everything it always did', () => {
    const spent: Character = {
      ...NIX,
      hitPoints: { max: 76, current: 4 },
      conditions: ['Prone'],
      resourcePools: [{ ...EMBERS, current: 0 }],
    }
    const after = longRest(spent)
    expect(after.resourcePools![0]!.current).toBe(5)
    // Not one thing the prototype's long rest did may have been lost.
    expect(after.hitPoints.current).toBe(76)
    expect(after.conditions).toEqual([])
    expect(after.features.find(f => f.name === 'Divine Sense')!.usesCurrent).toBe(4)
  })

  it('short rest gives Channel Divinity ONE use back, not all of them', () => {
    // The 2024 rule, and the reason rechargePools stays out of the paladin pair.
    const spent: Character = {
      ...NIX,
      paladinResources: {
        layOnHands: { current: 0, max: 40 },
        channelDivinity: { current: 0, max: 3 },
        auraRange: 10,
      },
      resourcePools: [
        { ...EMBERS, current: 0, recharge: 'shortRest' },
        { ...EMBERS, id: 'slowburn', name: 'Slow Burn', current: 0, max: 4, recharge: 'longRest' },
      ],
    }
    const after = shortRest(spent)
    expect(after.paladinResources!.channelDivinity.current).toBe(1)
    expect(after.paladinResources!.layOnHands.current).toBe(0)
    expect(after.resourcePools![0]!.current).toBe(5)
    expect(after.resourcePools![1]!.current).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. The binding that gives an authored pool a consumer
// ---------------------------------------------------------------------------

describe('poolIdForFeature — an explicit binding beats the name', () => {
  it('prefers an authored pool over the feature own counter', () => {
    // Without this, a pool Marcus creates has nothing in the app able to spend
    // it, and 6b's proof — "spend it from the turn screen" — cannot be met.
    expect(
      poolIdForFeature({ name: 'Flaming Cloak', usesMax: 2, resourcePoolId: 'hearth-embers' }),
    ).toBe('hearth-embers')
  })

  it('falls back to the feature own counter, which is how every feature worked before', () => {
    expect(poolIdForFeature({ name: 'Flaming Cloak', usesMax: 2 })).toBe('flaming-cloak')
  })

  it('returns nothing for an uncounted, unbound feature', () => {
    expect(poolIdForFeature({ name: 'Aura of Protection' })).toBeUndefined()
  })
})
