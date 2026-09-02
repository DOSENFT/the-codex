import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { slotAdoption } from './adopt'
import { discrepancies } from './vitals'
import type { Character } from '../character'
import { NIX } from '../turn/fixtures/nix'

/* ===========================================================================
   ADOPTING THE SLOT RULE — the level-3 slots Marcus does not have.

   His sheet says he holds two 3rd-level slots at Paladin 7. The half-caster
   table grants none until 9. Both facts were already true and already on
   screen; what did not exist was any way for him to settle it, so the flag
   reopened every load and the empty row kept its space.

   THE FIXTURE IS HIS ACTUAL EXPORT, not a hand-built character. A hand-built
   one would be me writing down what I believe his sheet says, and then testing
   my belief — the seed used by the browser probes (`nix-seed.mjs`) is level 8
   with no 3rd-level slots at all, so it cannot reproduce this at any level of
   care. Read from disk, and skipped rather than silently passed if absent.
   ========================================================================= */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

function nixOrNull(): Character | null {
  try {
    return JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    return null
  }
}

/** A sheet for the cases that are about the rule rather than about him. Built
 *  from the shared `NIX` fixture the way `vitals.test.ts` builds its `CLEAN`,
 *  so these tests and the reporter's tests disagree about nothing except the
 *  one field each case is bending. */
function paladinAt(level: number, slots: Character['spellSlots']): Character {
  return { ...NIX, class: 'Paladin', level, spellSlots: slots }
}

describe('slotAdoption — his sheet', () => {
  const nix = nixOrNull()

  it.skipIf(!nix)('offers to drop the 3rd-level slots he cannot have at level 7', () => {
    const adoption = slotAdoption(nix!)
    expect(adoption, 'his export no longer disagrees — has the fixture changed?').not.toBeNull()
    expect(adoption!.from).toBe('1st ×4 · 2nd ×3 · 3rd ×2')
    expect(adoption!.to).toBe('1st ×4 · 2nd ×3')
    expect(Object.keys(adoption!.next.spellSlots)).toEqual(['1', '2'])
  })

  it.skipIf(!nix)('keeps the 2nd-level slot he has already spent, rather than refilling it', () => {
    // His export carries 2nd at 2 of 3. The table agrees on the max, so nothing
    // about that level is in dispute and nothing about it may move.
    expect(nix!.spellSlots[2]).toEqual({ max: 3, current: 2 })
    const next = slotAdoption(nix!)!.next
    expect(next.spellSlots[2], 'adopting a rule handed him back a spent slot').toEqual({
      max: 3,
      current: 2,
    })
  })

  it.skipIf(!nix)('settles the flag — the report stops naming slots once adopted', () => {
    expect(discrepancies(nix!).map(f => f.id)).toContain('spell-slots')
    const next = slotAdoption(nix!)!.next
    expect(discrepancies(next).map(f => f.id)).not.toContain('spell-slots')
  })

  it.skipIf(!nix)('changes nothing else about him', () => {
    const next = slotAdoption(nix!)!.next
    expect({ ...next, spellSlots: null }).toEqual({ ...nix!, spellSlots: null })
  })
})

describe('slotAdoption — the rule', () => {
  it('clamps a current that the new max cannot hold', () => {
    // Four 1st-level slots all unspent, at a level the table grants three.
    const c = paladinAt(3, { 1: { max: 4, current: 4 } })
    const next = slotAdoption(c)!.next
    expect(next.spellSlots[1]).toEqual({ max: 3, current: 3 })
  })

  it('never raises a current, even when the table is more generous', () => {
    // Level 7 grants 4 first-level slots; he is holding two of a stored two.
    const c = paladinAt(7, { 1: { max: 2, current: 1 }, 2: { max: 3, current: 3 } })
    const next = slotAdoption(c)!.next
    expect(next.spellSlots[1], 'the app invented a rest he did not take').toEqual({
      max: 4,
      current: 1,
    })
  })

  it('adds a level the sheet is missing entirely', () => {
    const c = paladinAt(9, { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } })
    const next = slotAdoption(c)!.next
    expect(next.spellSlots[3]).toEqual({ max: 2, current: 2 })
  })

  it('is silent when the sheet already matches', () => {
    const c = paladinAt(7, { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } })
    expect(slotAdoption(c)).toBeNull()
  })

  it('is silent for a class it has no table for', () => {
    // Warlock is absent from SLOT_TABLE on purpose: Pact Magic is a different
    // resource, and offering to overwrite it would be a manufactured answer.
    const c: Character = { ...NIX, class: 'Warlock', level: 5, spellSlots: { 3: { max: 2, current: 2 } } }
    expect(slotAdoption(c)).toBeNull()
  })

  it('is silent for a level off the end of the table', () => {
    const c = paladinAt(30, { 1: { max: 4, current: 4 } })
    expect(slotAdoption(c)).toBeNull()
  })

  it('leaves the character it was given untouched', () => {
    const c = paladinAt(7, { 1: { max: 4, current: 4 }, 3: { max: 2, current: 2 } })
    const before = JSON.stringify(c.spellSlots)
    slotAdoption(c)
    expect(JSON.stringify(c.spellSlots), 'slotAdoption mutated its argument').toBe(before)
  })
})

describe('the reporter did not grow a correction', () => {
  /* The law in `vitals.ts` is that it reports and never corrects, and the
     temptation this change creates is to hang the fix on the `Discrepancy` so
     the UI has less to do. Then any caller could apply it on his behalf, on
     load, and the law would be gone without anyone deciding to remove it.
     Finding BG: a structural claim that forbids the fault beats a sample that
     failed to observe it. */
  it('Discrepancy carries no way to change a character', () => {
    const c = paladinAt(7, { 1: { max: 4, current: 4 }, 3: { max: 2, current: 2 } })
    const flag = discrepancies(c).find(f => f.id === 'spell-slots')!
    expect(Object.keys(flag).sort()).toEqual(['id', 'rule', 'sheet', 'title', 'why'])
    for (const value of Object.values(flag)) expect(typeof value).toBe('string')
  })

  it('vitals.ts defines no function that returns a Character', () => {
    const src = readFileSync(new URL('./vitals.ts', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
    expect(src.match(/function\s+\w+\s*\([^)]*\)\s*:\s*Character\b/g) ?? []).toEqual([])
  })
})
