/* ============================================================================
   LOADING A TOYBOX — the migration, which is one line and one risk.

   `seededPacks` is new. Every Toybox already in Marcus's browser was written
   before it existed, and the seeder reads it to decide whether a pack has been
   delivered. Two failures are available here and they fail in opposite
   directions:

     read absent as SEEDED   → he never gets the content, silently, forever
     fail to parse the field → an already-seeded Toybox is seeded again on
                               every single mount, appending duplicates

   The first is the one this slice actually risks, and it is the first test.
   ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadToybox, type ToyboxData } from './toybox'

/** The house pattern for storage in this suite — `covenant.test.ts` and
 *  `ai.test.ts` both stub the global rather than pulling in a DOM. */
function withStorage(entries: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => entries[k] ?? null,
    setItem: (k: string, v: string) => { entries[k] = v },
    removeItem: (k: string) => { delete entries[k] },
  })
}

afterEach(() => { vi.unstubAllGlobals() })

const KEY = 'codex-toybox-abc'

describe('seededPacks, coming off disk', () => {
  it('reads a Toybox written before the field existed as never seeded', () => {
    /* THE MIGRATION. This exact JSON — three keys, no marker — is what is in
       localStorage right now for every character in the app. */
    withStorage({ [KEY]: JSON.stringify({ combos: [], tactics: [], personaPlays: [] }) })
    expect(loadToybox('abc').seededPacks).toEqual([])
  })

  it('reads a marker that is there', () => {
    withStorage({
      [KEY]: JSON.stringify({ combos: [], tactics: [], personaPlays: [], seededPacks: ['hearth-7'] }),
    })
    expect(loadToybox('abc').seededPacks).toEqual(['hearth-7'])
  })

  it('reports no marker for a character with no Toybox at all', () => {
    withStorage({})
    expect(loadToybox('abc').seededPacks).toEqual([])
  })

  it('reports no marker rather than throwing on unparseable storage', () => {
    withStorage({ [KEY]: 'not json {{{' })
    const data: ToyboxData = loadToybox('abc')
    expect(data.seededPacks).toEqual([])
    expect(data.combos).toEqual([])
  })

  it('does not lose the entries while reading the marker', () => {
    /* Guards the guard: every assertion above would pass against a `loadToybox`
       that returned a blank Toybox no matter what it was given. */
    withStorage({
      [KEY]: JSON.stringify({
        combos: [{ id: 'mine', name: 'Mine', blocks: [], tags: [], favorite: false, createdAt: 1 }],
        tactics: [],
        personaPlays: [],
        seededPacks: ['hearth-7'],
      }),
    })
    const data = loadToybox('abc')
    expect(data.combos.map(c => c.id)).toEqual(['mine'])
    expect(data.seededPacks).toEqual(['hearth-7'])
  })
})
