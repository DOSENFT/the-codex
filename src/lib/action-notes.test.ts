import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  loadActionNotes,
  noteFor,
  saveActionNotes,
  withNote,
  type ActionNotesData,
} from './action-notes'

/* ============================================================================
   THE NOTES STORE — slice 8d-3.

   THE ONE TEST THAT MATTERS IS THE FIRST ONE. Everything else here is ordinary
   care around an object; `reads the notes he has ALREADY written` is the slice.
   The bytes it seeds are the shape `TurnSummary` wrote for as long as it was
   mounted, written out by hand rather than produced by calling `saveActionNotes`
   first — a round-trip through my own writer would pass just as happily if I had
   invented a new format, and would prove nothing about his disk.
   ========================================================================== */

/** Exactly what V0.9's `saveActionNotes` left behind: key
 *  `codex-action-notes-<id>`, values under the action's NAME, tip under
 *  `customTip`, alongside a `notes` array. */
const HIS_DISK = JSON.stringify({
  'Divine Smite': {
    customTip: 'Only after a crit, and only if the fight is nearly over.',
    notes: [{ label: 'Table', text: 'Kev rules the d8s are rolled before the save.' }],
  },
  'Lay on Hands': { notes: [] },
})

/* The node test environment has no `localStorage`. This is `errata-rulings.
   test.ts`'s fake, verbatim and for the same reason — that store and this one
   are the same kind of thing, and a second hand-rolled Storage stub is a second
   place for the two to drift apart. */
function fakeStorage() {
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
beforeEach(() =>
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage(), configurable: true, writable: true,
  }))
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
})

describe('it reads the notes he has already written', () => {
  it('finds a tip stored by the surface that is no longer mounted', () => {
    localStorage.setItem('codex-action-notes-nix', HIS_DISK)
    expect(noteFor(loadActionNotes('nix'), 'Divine Smite')).toBe(
      'Only after a crit, and only if the fight is nearly over.',
    )
  })

  it('keeps the labelled notes it does not yet render', () => {
    // 8d-3 remounts the TIP only. The `notes` array must survive a load/save
    // round trip untouched, or shipping the tip quietly eats the rest.
    localStorage.setItem('codex-action-notes-nix', HIS_DISK)
    const after = withNote(loadActionNotes('nix'), 'Divine Smite', 'Anything at all.')
    expect(after['Divine Smite'].notes).toEqual([
      { label: 'Table', text: 'Kev rules the d8s are rolled before the save.' },
    ])
  })

  it('is per character — one sheet cannot read another sheet’s notes', () => {
    localStorage.setItem('codex-action-notes-nix', HIS_DISK)
    expect(noteFor(loadActionNotes('someone-else'), 'Divine Smite')).toBeUndefined()
  })

  it('survives a corrupt blob rather than taking the screen down', () => {
    localStorage.setItem('codex-action-notes-nix', '{ not json')
    expect(loadActionNotes('nix')).toEqual({})
  })
})

describe('noteFor', () => {
  it('is undefined when he has written nothing', () => {
    expect(noteFor({}, 'Divine Smite')).toBeUndefined()
    expect(noteFor({ 'Divine Smite': { notes: [] } }, 'Divine Smite')).toBeUndefined()
  })

  it('treats whitespace as nothing, so no screen paints an empty box', () => {
    const blank: ActionNotesData = { 'Divine Smite': { customTip: '   \n ', notes: [] } }
    expect(noteFor(blank, 'Divine Smite')).toBeUndefined()
  })
})

describe('withNote', () => {
  it('trims, and does not touch the other actions', () => {
    const before: ActionNotesData = { 'Lay on Hands': { customTip: 'Save 15.', notes: [] } }
    const after = withNote(before, 'Divine Smite', '  Crit only.  ')
    expect(noteFor(after, 'Divine Smite')).toBe('Crit only.')
    expect(noteFor(after, 'Lay on Hands')).toBe('Save 15.')
  })

  it('does not mutate what it was given', () => {
    const before: ActionNotesData = { 'Divine Smite': { customTip: 'Old.', notes: [] } }
    withNote(before, 'Divine Smite', 'New.')
    expect(before['Divine Smite'].customTip).toBe('Old.')
  })

  it('a blank clears the tip and keeps the labelled notes', () => {
    const before: ActionNotesData = {
      'Divine Smite': { customTip: 'Old.', notes: [{ label: 'Table', text: 'Kev.' }] },
    }
    const after = withNote(before, 'Divine Smite', '   ')
    expect(noteFor(after, 'Divine Smite')).toBeUndefined()
    expect(after['Divine Smite'].notes).toEqual([{ label: 'Table', text: 'Kev.' }])
  })
})

describe('it writes where the old surface wrote', () => {
  it('uses the same key, so a note written here is a note it would have read', () => {
    saveActionNotes('nix', withNote({}, 'Divine Smite', 'Crit only.'))
    const raw = localStorage.getItem('codex-action-notes-nix')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)['Divine Smite'].customTip).toBe('Crit only.')
  })
})
