// ---------------------------------------------------------------------------
// The bug Marcus reported, written as a test
// ---------------------------------------------------------------------------
//
//   "in combat my spell definitions, and probably a lot of other things, are
//    claiming that my charisma is 18, when in fact it's 16. The prep tab, which
//    was connected it seemed, seems to not be at all connected with the combat
//    module directly. What I change in the prep screen must directly effect and
//    be used app wide"
//
// SHEET TRUTH slice 2. There was no test anywhere in the suite that took a
// character through the real edit path and asked whether the derived numbers
// had followed. The bug was not a mistake in a formula, it was a missing edge
// between two of them.
//
// MEASURED, not asserted. Slice 2's change was reverted — `saveCharacter` made
// to write `incoming` unresolved, with slice 1 left intact — and this file run
// against it. Result: **5 of 7 fail, 2 pass.** That is the honest number, and
// the two passers are labelled as what they are:
//
//   • "survives the round trip through storage" passes because slice 1 already
//     made `loadCharacter` resolve. It is a slice-1 regression guard, not a
//     slice-2 test. It is kept because it pins the property Marcus actually
//     cares about — that the number is right after a reload — at the one seam
//     where both slices could regress it.
//   • "leaves everything it has no rule for exactly alone" cannot fail against
//     the old code by construction: it asserts an ABSENCE of change. It guards
//     the new code against overreach — resolveCharacter touching AC, HP or
//     spell slots — and that risk did not exist before slice 2 created it.
//
// The other five fail with the wrong number, not with a missing field. A first
// draft of this file also contained a sixth "test" that read `d.label` on a
// type whose field is `title`; it passed against the reverted build and was
// therefore testing nothing. The revert is what caught it.
//
// These drive the WRITE path — `saveCharacter` / `loadCharacter` — because that
// is where the app's writes actually converge. AMENDMENT A-19 in
// `useCharacter.ts` is the record of what happens when you assume the hook is
// the only writer: it is not, and it never was.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveCharacter, loadCharacter, type Character } from '../character'
import { tableVitals, discrepancies } from './vitals'
import { NIX } from '../turn/fixtures/nix'

/* Nix as he actually is: level 7, Charisma 16 — but carrying the stored pair
 * from when he was Charisma 18. This is not a contrived state. It is exactly
 * what `CharacterPage.handleScoreConfirm` leaves on disk today, because it
 * writes `abilityScores` and nothing else. */
function nixAfterAnEditToCharisma(): Character {
  return {
    ...NIX,
    id: 'propagation-nix',
    level: 7,
    proficiencyBonus: 3,
    spellSaveDC: 15,
    spellAttackBonus: 7,
    abilityScores: { ...NIX.abilityScores, CHA: 16 },
  }
}

/* Same fake storage `character.save.test.ts` uses — this suite runs in the node
 * environment, where there is no localStorage to clear. */
function fakeStorage(): Storage {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    get length() { return Object.keys(store).length },
  } as unknown as Storage
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage(), configurable: true, writable: true,
  })
})

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
})

describe('an edit in Prep reaches combat', () => {
  it('survives the round trip through storage', () => {
    // SLICE-1 GUARD, not a slice-2 test — see the header. Slice 1 already made
    // `loadCharacter` resolve, so this passes with slice 2 reverted. It stays
    // because it is the property stated in plain language: after a reload, the
    // number on screen is the one the rules give.
    const saved = saveCharacter(nixAfterAnEditToCharisma())
    expect(saved.ok).toBe(true)

    const reloaded = loadCharacter('propagation-nix')
    expect(reloaded).not.toBeNull()
    expect(reloaded!.spellSaveDC).toBe(14)
    expect(reloaded!.spellAttackBonus).toBe(6)
  })

  it('is already correct in the value handed back, before any reload', () => {
    // The one-render window. `useCharacter` sets React state from this, so if
    // it were stale here every combat surface would paint the old number until
    // the next reload — which is the symptom he described.
    const outcome = saveCharacter(nixAfterAnEditToCharisma())
    if (!outcome.ok) throw new Error('expected the write to land')
    expect(outcome.character.spellSaveDC).toBe(14)
    expect(outcome.character.spellAttackBonus).toBe(6)
  })

  it('reaches the combat vitals band', () => {
    // `tableVitals` is what VitalsBand renders. This is the number in the
    // largest, brightest type on the Play tab.
    const outcome = saveCharacter(nixAfterAnEditToCharisma())
    if (!outcome.ok) throw new Error('expected the write to land')
    const vitals = tableVitals(outcome.character)
    expect(vitals.saveDC).toBe(14)
    expect(vitals.spellAttack).toBe(6)
    expect(vitals.proficiency).toBe(3)
  })

  it('stops the app disagreeing with itself on screen', () => {
    // The app already NOTICED — it printed "your sheet and the 2024 rules
    // disagree on 2 things" directly under the wrong number, in smaller type.
    // Those two are now unreachable: there is no second copy to disagree with.
    //
    // CORRECTED. This read `d.label` until it was checked against a reverted
    // build. `Discrepancy` has no `label` — the field is `title` — so the map
    // produced `[undefined, undefined]` and both assertions passed no matter
    // what the code did. It was a test that could not fail, which is the one
    // thing the standing rule forbids. It now reads `d.id`, a typed union, so
    // a future rename is a compile error rather than a silent re-pass.
    const outcome = saveCharacter(nixAfterAnEditToCharisma())
    if (!outcome.ok) throw new Error('expected the write to land')
    const ids = discrepancies(outcome.character).map(d => d.id)
    expect(ids).not.toContain('save-dc')
    expect(ids).not.toContain('spell-attack')
    expect(ids).not.toContain('proficiency')
  })

  it('follows a SECOND edit, not just the first', () => {
    // A fix that resolves once on the way in would pass every test above and
    // still be broken in use.
    const first = saveCharacter(nixAfterAnEditToCharisma())
    if (!first.ok) throw new Error('expected the write to land')

    const bumped = { ...first.character, abilityScores: { ...first.character.abilityScores, CHA: 20 } }
    const second = saveCharacter(bumped)
    if (!second.ok) throw new Error('expected the second write to land')
    expect(second.character.spellSaveDC).toBe(16)
    expect(second.character.spellAttackBonus).toBe(8)

    expect(loadCharacter('propagation-nix')!.spellSaveDC).toBe(16)
  })

  it('follows a level change the same way', () => {
    const c = { ...nixAfterAnEditToCharisma(), level: 9 }
    const outcome = saveCharacter(c)
    if (!outcome.ok) throw new Error('expected the write to land')
    expect(outcome.character.proficiencyBonus).toBe(4)
    expect(outcome.character.spellSaveDC).toBe(15)
    expect(outcome.character.spellAttackBonus).toBe(7)
  })

  it('leaves everything it has no rule for exactly alone', () => {
    // OVERREACH GUARD — cannot fail against the old code, by construction, and
    // is not claimed to. The other half of the promise: AC, HP and spell slots
    // are his. Slice 2 is the change that made it possible to break them.
    const before = nixAfterAnEditToCharisma()
    const outcome = saveCharacter(before)
    if (!outcome.ok) throw new Error('expected the write to land')
    expect(outcome.character.armorClass).toBe(before.armorClass)
    expect(outcome.character.hitPoints).toEqual(before.hitPoints)
    expect(outcome.character.spellSlots).toEqual(before.spellSlots)
  })
})
