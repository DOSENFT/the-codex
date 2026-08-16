import { describe, it, expect } from 'vitest'
import { composeTurn } from './compose'
import type { Character } from '../character'

/* These assert invariants of the composed turn, not the fixture's contents.
   They are written so they keep meaning after Slice 4 swaps the seed body for
   real composition — at which point they stop being cheap and start being the
   safety net. */

const anyCharacter = { name: 'ignored' } as unknown as Character
const turn = () => composeTurn({ character: anyCharacter, combat: null })

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
