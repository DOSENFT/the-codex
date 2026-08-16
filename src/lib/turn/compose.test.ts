import { describe, it, expect } from 'vitest'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'

/* These assert invariants of the composed turn, not the fixture's contents.
   They were written so they keep meaning after Slice 4 swaps the seed body for
   real composition — at which point they stop being cheap and start being the
   safety net.

   SLICE 4: that swap has happened, and the only edit these tests needed was
   their input. Slice 1 passed `{ name: 'ignored' }` because the body ignored
   it; they now run against the real Nix fixture and every assertion below is
   unchanged. That is the point — the invariants were written to outlive the
   fixture, and they did. */

const turn = () => composeTurn({ character: NIX, combat: null })

describe('composeTurn', () => {
  it('is deterministic — same input, same output', () => {
    expect(turn()).toEqual(turn())
  })

  it('puts the bloodied line at floor(max/2) and does not flag it early', () => {
    const { vitals } = turn()
    expect(vitals.bloodiedAt).toBe(Math.floor(vitals.maxHp / 2))
    expect(vitals.bloodied).toBe(vitals.hp <= vitals.bloodiedAt)
  })

  it('never lists a contended option twice', () => {
    const t = turn()
    const faceIds = t.mutex.flatMap(g => g.faces.map(f => f.id))
    const listedIds = [...t.ranked, ...t.rest].map(o => o.id)
    for (const id of faceIds) expect(listedIds).not.toContain(id)
  })

  it('only groups options that genuinely contend for one economy slot', () => {
    for (const group of turn().mutex) {
      expect(group.faces.length).toBeGreaterThan(1)
      const slots = new Set(group.faces.map(f => f.cost.slot))
      expect(slots.size).toBe(1)
      for (const face of group.faces) expect(face.contended).toBe(true)
    }
  })

  it('ranks descending, so the list order is the score order', () => {
    const scores = turn().ranked.map(o => o.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('gives every rider its text, recognised or not', () => {
    // The open-world rule. A homebrew mastery loses its automation; it must
    // never lose its words.
    const all = [...turn().ranked, ...turn().rest]
    for (const o of all) if (o.rider) expect(o.rider.text.length).toBeGreaterThan(0)
  })

  it('gives every blocked option a reason instead of hiding it', () => {
    for (const o of [...turn().ranked, ...turn().rest]) {
      if (!o.available) expect(o.blockedReason).toBeTruthy()
    }
  })

  it('never spends a resource pool it did not declare', () => {
    const t = turn()
    const known = new Set(t.resources.map(r => r.id))
    const faces = t.mutex.flatMap(g => g.faces)
    for (const o of [...t.ranked, ...t.rest, ...faces]) {
      if (o.cost.resourcePoolId) expect(known.has(o.cost.resourcePoolId)).toBe(true)
    }
  })

  it('carries Nix, not the Vaelin placeholder', () => {
    expect(turn().actor.name).toBe('Nix')
    expect(turn().actor.subclass).toBe('Oath of the Hearth')
  })
})

// ---------------------------------------------------------------------------
// Slice 6b — an authored pool has to be VISIBLE and HONEST on the turn screen
//
// Both of these were found by driving the built app, not by reading it, and
// neither can pass against the code that shipped an hour before they were
// written: the label came from `option.usesRemaining` (undefined for a pool-
// bound feature) and affordability was read off `feature.usesCurrent` (also
// undefined). The app offered a live row, priced "Action", for a feature it
// was about to refuse — while the resource strip stayed silent because the
// mutex face it sat on was assumed to be showing the pool already.
// ---------------------------------------------------------------------------

const EMBERS = {
  id: 'hearth-embers',
  name: 'Hearth Embers',
  current: 5,
  max: 5,
  unit: 'points' as const,
  recharge: 'longRest' as const,
}

const WARD = {
  name: 'Ember Ward',
  level: 1,
  description: 'Shelter an ally in banked warmth.',
  actionType: 'action' as const,
  resourcePoolId: 'hearth-embers',
  resourceAmount: 2,
}

const hearth = (current: number) =>
  composeTurn({
    character: {
      ...NIX,
      resourcePools: [{ ...EMBERS, current }],
      features: [...NIX.features, WARD],
    },
    combat: null,
  })

const find = (t: ReturnType<typeof composeTurn>, name: string) =>
  [...t.ranked, ...t.rest, ...t.mutex.flatMap(g => g.faces)].find(o => o.name === name)

describe('a feature bound to an authored pool', () => {
  it('states the price and the pool on its own row', () => {
    // The row must carry the reading whether or not the strip does, because a
    // mutex face suppresses the strip row on the grounds that the face has it.
    expect(find(hearth(5), 'Ember Ward')!.cost.label).toBe('Action · 2 of 5 points')
  })

  it('says POINTS for Lay on Hands, which was never 40 "uses"', () => {
    expect(find(hearth(5), 'Lay on Hands')!.cost.label).toMatch(/\d+\/40 points$/)
  })

  it('is blocked, with the reason, BEFORE the tap that would be refused', () => {
    const o = find(hearth(1), 'Ember Ward')!
    expect(o.available).toBe(false)
    expect(o.blockedReason).toBe('Not enough Hearth Embers left')
  })

  it('is still live at exactly the price, and not one below it', () => {
    expect(find(hearth(2), 'Ember Ward')!.available).toBe(true)
  })
})
