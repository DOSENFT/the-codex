/* ============================================================================
   Covenant tests — the three rules, and the one thing that must not exist
   ----------------------------------------------------------------------------
   Vitest runs in the node environment here (no jsdom, no config file), so
   `localStorage` is genuinely absent unless a test puts one there. That is
   useful rather than annoying: "no storage at all" is a real iPad state, and
   the suite gets it for free.
   ========================================================================== */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  COVENANT_KEY,
  EMPTY_COVENANT,
  parseCovenant,
  loadCovenant,
  saveCovenant,
  addEntry,
  updateEntry,
  removeEntry,
  boundariesOf,
  isBlank,
  type Covenant,
} from './covenant'

/** A Map-backed localStorage, with a hatch for making writes fail on purpose. */
function stubStorage(opts: { failWrites?: string } = {}) {
  const map = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.failWrites) throw new Error(opts.failWrites)
      map.set(k, v)
    },
    removeItem: (k: string) => void map.delete(k),
  })
  return map
}

afterEach(() => vi.unstubAllGlobals())

describe('rule 1 — a line is never dropped', () => {
  it('keeps every entry that has text, however broken its neighbours are', () => {
    const c = parseCovenant({
      entries: [
        { id: 'a', kind: 'line', text: 'no harm to children' },
        null,
        'not an object',
        { id: 'b', kind: 'veil', text: 'torture' },
        { kind: 'line' }, // no text — not a boundary, a blank row
        { id: 'c', text: 'body horror' }, // no kind at all
      ],
      note: 42, // wrong type
    })
    expect(c.entries.map(e => e.text)).toEqual(['no harm to children', 'torture', 'body horror'])
    expect(c.note).toBe('') // a bad note costs the note, never the entries
  })

  it('treats an unrecognised kind as the STRICTER one', () => {
    // A value written by a future version, or corrupted. If we cannot tell
    // whether the table said "never" or "off-screen", "never" is the safe
    // direction to be wrong in.
    const c = parseCovenant({ entries: [{ id: 'x', kind: 'maybe-later', text: 'drowning' }] })
    expect(c.entries[0].kind).toBe('line')
  })

  it('gives an id to an entry that lost one, rather than skipping it', () => {
    const c = parseCovenant({ entries: [{ kind: 'veil', text: 'gore' }] })
    expect(c.entries).toHaveLength(1)
    expect(c.entries[0].id).toBeTruthy()
  })

  it('survives every shape that is not a covenant', () => {
    for (const junk of [null, undefined, 7, 'covenant', [], { entries: 'nope' }]) {
      expect(() => parseCovenant(junk)).not.toThrow()
      expect(parseCovenant(junk).entries).toEqual([])
    }
  })

  it('returns an empty covenant rather than throwing on unparseable storage', () => {
    const map = stubStorage()
    map.set(COVENANT_KEY, '{ this is not json')
    expect(loadCovenant()).toEqual(EMPTY_COVENANT)
  })
})

describe('rule 2 — a failed write is not a save', () => {
  it('reports failure when the device refuses the write', () => {
    stubStorage({ failWrites: 'QuotaExceededError' })
    const result = saveCovenant(addEntry(EMPTY_COVENANT, 'line', 'no harm to children'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Quota')
  })

  it('reports failure when there is no storage at all', () => {
    // The bug this pins: `localStorage?.setItem(...)` on a device with no
    // storage does nothing, throws nothing, and would report success — showing
    // Marcus a boundary that exists only on screen.
    expect('localStorage' in globalThis && globalThis.localStorage).toBeFalsy()
    const result = saveCovenant(addEntry(EMPTY_COVENANT, 'line', 'nothing about my mother'))
    expect(result.ok).toBe(false)
  })

  it('round-trips through storage and stamps the save', () => {
    stubStorage()
    const written = addEntry(addEntry(EMPTY_COVENANT, 'line', 'harm to kids'), 'veil', 'torture')
    const result = saveCovenant(written, () => new Date('2026-08-16T19:00:00.000Z'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.saved.updatedAt).toBe('2026-08-16T19:00:00.000Z')

    const read = loadCovenant()
    expect(read.entries.map(e => [e.kind, e.text])).toEqual([
      ['line', 'harm to kids'],
      ['veil', 'torture'],
    ])
    expect(read.updatedAt).toBe('2026-08-16T19:00:00.000Z')
  })
})

describe('rule 3 — this is not a log', () => {
  it('has no field anywhere that counts or dates the veil being raised', () => {
    stubStorage()
    const result = saveCovenant(addEntry(EMPTY_COVENANT, 'veil', 'torture'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const stored = JSON.stringify(result.saved).toLowerCase()
    // `updatedAt` is when the AGREEMENT changed. Nothing here may record when
    // anyone needed it — no count, no history, nothing to explain afterwards.
    for (const forbidden of ['raised', 'invoked', 'lastused', 'count', 'history', 'triggered']) {
      expect(stored).not.toContain(forbidden)
    }
    expect(Object.keys(result.saved).sort()).toEqual(['entries', 'note', 'updatedAt'])
  })
})

describe('editing the agreement', () => {
  let base: Covenant
  beforeEach(() => {
    base = addEntry(addEntry(EMPTY_COVENANT, 'line', 'harm to kids'), 'veil', 'torture')
  })

  it('refuses a blank boundary instead of growing an empty row', () => {
    expect(addEntry(base, 'line', '   ').entries).toHaveLength(2)
    expect(addEntry(base, 'line', '').entries).toHaveLength(2)
  })

  it('trims what it stores', () => {
    expect(addEntry(EMPTY_COVENANT, 'veil', '  slow poison \n').entries[0].text).toBe('slow poison')
  })

  it('promotes a veil to a line without disturbing the other entries', () => {
    const next = updateEntry(base, base.entries[1].id, { kind: 'line' })
    expect(boundariesOf(next, 'line').map(e => e.text)).toEqual(['harm to kids', 'torture'])
    expect(boundariesOf(next, 'veil')).toEqual([])
    expect(base.entries[1].kind).toBe('veil') // the input was not mutated
  })

  it('does NOT delete a row when its text is cleared', () => {
    // Deleting is an explicit act with its own button. A fumbled edit — a
    // select-all and a keystroke on an iPad — must not erase a line.
    const next = updateEntry(base, base.entries[0].id, { text: '' })
    expect(next.entries).toHaveLength(2)
  })

  it('deletes only on the explicit call, and only the one asked for', () => {
    const next = removeEntry(base, base.entries[0].id)
    expect(next.entries.map(e => e.text)).toEqual(['torture'])
    expect(removeEntry(base, 'no-such-id').entries).toHaveLength(2)
  })

  it('knows a blank agreement from a written one', () => {
    expect(isBlank(EMPTY_COVENANT)).toBe(true)
    expect(isBlank({ ...EMPTY_COVENANT, note: '  ' })).toBe(true)
    expect(isBlank({ ...EMPTY_COVENANT, note: 'check in with me' })).toBe(false)
    expect(isBlank(base)).toBe(false)
  })
})
