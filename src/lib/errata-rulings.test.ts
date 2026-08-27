/* Slice 8. The ruling store.
 *
 * `errata-rulings.ts` is new, so every test here is red against the code that
 * existed before it — there is no version of this module that passes them.
 * That is the cheap kind of "can fail". The expensive kind is below: each test
 * pins a behaviour the module's own header COMMITS TO in prose, and prose is
 * exactly what a later edit will contradict without noticing. The two that
 * matter most are the two the header calls out by name — dropping the entry on
 * `unasked`, and carrying `dmWording` across a switch to `canon`. Both are
 * one-character changes away from being wrong, and neither shows up on screen
 * until Marcus has lost a ruling his DM gave him weeks earlier.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  errataKey,
  rulingFor,
  loadRulings,
  saveRulings,
  setRuling,
  unansweredCount,
  type ErratumRulings,
} from './errata-rulings'

type Store = Record<string, string>

function fakeStorage(onSet?: (k: string) => void) {
  const store: Store = {}
  return {
    store,
    api: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { onSet?.(k); store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      key: (i: number) => Object.keys(store)[i] ?? null,
      clear: () => { for (const k of Object.keys(store)) delete store[k] },
      get length() { return Object.keys(store).length },
    } as unknown as Storage,
  }
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const setStorage = (s: Storage | undefined) =>
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true, writable: true })

const AT = new Date('2026-08-27T12:00:00.000Z')
const LATER = new Date('2026-09-04T18:30:00.000Z')

describe('rulingFor — the default is the honest one', () => {
  it('reports an erratum nobody has raised as unasked, not as settled', () => {
    /* The whole design rests on this. "No entry" must never read as "fine" —
       an unanswered rules problem is still live at the table. */
    expect(rulingFor({}, 'HEARTH-03')).toEqual({ status: 'unasked' })
  })

  it('returns the stored ruling when there is one', () => {
    const rulings: ErratumRulings = { 'HEARTH-03': { status: 'canon', decidedAt: AT.toISOString() } }
    expect(rulingFor(rulings, 'HEARTH-03').status).toBe('canon')
  })
})

describe('setRuling', () => {
  it('records canon’s fix with the date it was decided', () => {
    const next = setRuling({}, 'HEARTH-04', 'canon', undefined, AT)
    expect(next['HEARTH-04']).toEqual({ status: 'canon', decidedAt: AT.toISOString() })
  })

  it('keeps the DM’s actual words, because the words ARE the ruling', () => {
    const next = setRuling({}, 'HEARTH-03', 'dm', 'Cloak triggers once per round, my call.', AT)
    expect(next['HEARTH-03'].status).toBe('dm')
    expect(next['HEARTH-03'].dmWording).toBe('Cloak triggers once per round, my call.')
  })

  it('is pure — the map handed in is not mutated', () => {
    /* React state. A mutation here shows up as a control that does not repaint
       until something else happens to re-render, which reads as a dead button. */
    const before: ErratumRulings = {}
    const after = setRuling(before, 'HEARTH-05', 'canon', undefined, AT)
    expect(before).toEqual({})
    expect(after).not.toBe(before)
  })

  it('DROPS the entry when it goes back to unasked, rather than storing a tombstone', () => {
    /* Named behaviour 1 in the header. `rulingFor` already answers `unasked`
       for a missing id, so the read is identical either way — but a stored
       `{status:'unasked'}` per erratum per character is twelve rows of nothing,
       and `unansweredCount` would still have to treat it as unanswered. If
       someone "simplifies" this to an assignment, this test is what catches it. */
    const withOne = setRuling({}, 'HEARTH-06', 'canon', undefined, AT)
    const cleared = setRuling(withOne, 'HEARTH-06', 'unasked', undefined, LATER)
    expect('HEARTH-06' in cleared).toBe(false)
    expect(rulingFor(cleared, 'HEARTH-06')).toEqual({ status: 'unasked' })
  })

  it('leaves every OTHER ruling alone when one is cleared', () => {
    const two = setRuling(setRuling({}, 'A', 'canon', undefined, AT), 'B', 'dm', 'B words', AT)
    const cleared = setRuling(two, 'A', 'unasked', undefined, LATER)
    expect(cleared['B'].dmWording).toBe('B words')
  })

  it('CARRIES the DM’s wording when the status moves to canon', () => {
    /* Named behaviour 2. Marcus switching to canon's printed fix does not mean
       his DM never said anything; if he switches back a week later, retyping
       the ruling from memory is exactly the small loss that makes a feature not
       worth using. Nothing paints it while the status is `canon` — it is simply
       still there. */
    const ruled = setRuling({}, 'HEARTH-07', 'dm', 'Aura still works while stunned.', AT)
    const switched = setRuling(ruled, 'HEARTH-07', 'canon', undefined, LATER)
    expect(switched['HEARTH-07'].status).toBe('canon')
    expect(switched['HEARTH-07'].dmWording).toBe('Aura still works while stunned.')
  })

  it('lets a new wording REPLACE the carried one — carrying is a fallback, not a lock', () => {
    const first = setRuling({}, 'HEARTH-07', 'dm', 'first ruling', AT)
    const second = setRuling(first, 'HEARTH-07', 'dm', 'DM changed their mind', LATER)
    expect(second['HEARTH-07'].dmWording).toBe('DM changed their mind')
  })

  it('does not store an empty string as if it were a ruling', () => {
    /* An empty textarea is not a DM saying nothing; it is Marcus not having
       typed yet. Storing `""` would paint an empty quote block under a heading
       that promises his DM's words. */
    const next = setRuling({}, 'HEARTH-08', 'dm', '', AT)
    expect(next['HEARTH-08'].dmWording).toBeUndefined()
  })

  it('restamps the date on every change, so "ruled on" tracks the latest answer', () => {
    const first = setRuling({}, 'HEARTH-05', 'canon', undefined, AT)
    const second = setRuling(first, 'HEARTH-05', 'dm', 'we house-ruled it', LATER)
    expect(first['HEARTH-05'].decidedAt).toBe(AT.toISOString())
    expect(second['HEARTH-05'].decidedAt).toBe(LATER.toISOString())
  })
})

describe('unansweredCount — the caption is a to-do list, not a count of flags', () => {
  it('counts the ids with no answer, including ids never stored at all', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, AT)
    expect(unansweredCount(rulings, ['HEARTH-03', 'HEARTH-04', 'HEARTH-05'])).toBe(2)
  })

  it('counts a DM ruling as answered', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'dm', 'we ignore it', AT)
    expect(unansweredCount(rulings, ['HEARTH-03'])).toBe(0)
  })

  it('ignores rulings for errata not in the list — the live six, not all twelve', () => {
    /* The band shows the live errata; its caption must count the live ones. A
       ruling recorded on a level-15 erratum must not make the level-8 list look
       more answered than it is. */
    const rulings = setRuling({}, 'HEARTH-12', 'canon', undefined, AT)
    expect(unansweredCount(rulings, ['HEARTH-03', 'HEARTH-04'])).toBe(2)
  })

  it('is zero for an empty list, not a crash', () => {
    expect(unansweredCount({}, [])).toBe(0)
  })
})

describe('the disk', () => {
  beforeEach(() => { setStorage(fakeStorage().api) })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else setStorage(undefined)
  })

  it('keys one map per character', () => {
    expect(errataKey('nix-id')).toBe('codex-errata-nix-id')
  })

  it('round-trips a ruling', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'dm', 'once per round', AT)
    saveRulings('nix-id', rulings)
    expect(loadRulings('nix-id')).toEqual(rulings)
  })

  it('does not leak one character’s rulings into another’s', () => {
    saveRulings('nix-id', setRuling({}, 'HEARTH-03', 'canon', undefined, AT))
    expect(loadRulings('someone-else')).toEqual({})
  })

  it('reads an untouched character as no rulings recorded', () => {
    expect(loadRulings('never-saved')).toEqual({})
  })

  it('survives unparseable stored bytes — a corrupt key must not take the tab down', () => {
    localStorage.setItem(errataKey('nix-id'), '{ not json')
    expect(() => loadRulings('nix-id')).not.toThrow()
    expect(loadRulings('nix-id')).toEqual({})
  })

  it('survives stored bytes of the wrong SHAPE, which JSON.parse accepts happily', () => {
    /* `JSON.parse('[]')` and `JSON.parse('"x"')` both succeed. A try/catch
       alone does not cover this, and an array would sail through
       `Object.entries` producing rulings keyed "0", "1". */
    localStorage.setItem(errataKey('nix-id'), '[{"status":"canon"}]')
    expect(loadRulings('nix-id')).toEqual({})
    localStorage.setItem(errataKey('nix-id'), '"canon"')
    expect(loadRulings('nix-id')).toEqual({})
    localStorage.setItem(errataKey('nix-id'), 'null')
    expect(loadRulings('nix-id')).toEqual({})
  })

  it('DISCARDS an unrecognised status rather than coercing it to one that means something', () => {
    /* Coercing an unknown string to `canon` would invent a ruling Marcus never
       made; to `dm` would invent one with no wording behind it. Dropping it
       reads as "not asked", which is the one answer that is never wrong. */
    localStorage.setItem(errataKey('nix-id'), JSON.stringify({
      'HEARTH-03': { status: 'agreed' },
      'HEARTH-04': { status: 'canon' },
    }))
    const loaded = loadRulings('nix-id')
    expect('HEARTH-03' in loaded).toBe(false)
    expect(loaded['HEARTH-04'].status).toBe('canon')
  })

  it('keeps the good rulings when one entry is junk — one bad row is not twelve', () => {
    localStorage.setItem(errataKey('nix-id'), JSON.stringify({
      'HEARTH-03': 'not an object',
      'HEARTH-04': null,
      'HEARTH-05': { status: 'dm', dmWording: 'kept' },
    }))
    const loaded = loadRulings('nix-id')
    expect(Object.keys(loaded)).toEqual(['HEARTH-05'])
    expect(loaded['HEARTH-05'].dmWording).toBe('kept')
  })

  it('drops fields of the wrong type instead of putting a number where words go', () => {
    localStorage.setItem(errataKey('nix-id'), JSON.stringify({
      'HEARTH-03': { status: 'dm', dmWording: 42, decidedAt: { when: 'yesterday' } },
    }))
    expect(loadRulings('nix-id')).toEqual({ 'HEARTH-03': { status: 'dm' } })
  })

  it('does not throw on a device with no storage at all', () => {
    setStorage(undefined as unknown as Storage)
    expect(() => loadRulings('nix-id')).not.toThrow()
    expect(loadRulings('nix-id')).toEqual({})
    expect(() => saveRulings('nix-id', {})).not.toThrow()
  })

  it('does not throw when the quota is full — a ruling is not worth the combat screen', () => {
    /* The `saveOrAnnounce` contract, inherited: the write fails, the alarm is
       raised through the character-save subscription, and the tree stays up.
       Slice 5's storage-safety rule with a different key on it. */
    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-errata-')) {
        const e = new Error('full'); e.name = 'QuotaExceededError'; throw e
      }
    }).api)
    expect(() => saveRulings('nix-id', setRuling({}, 'HEARTH-03', 'canon', undefined, AT))).not.toThrow()
  })

  it('writes ONLY its own key — the errata store never touches the character file', () => {
    const written: string[] = []
    const f = fakeStorage(k => written.push(k))
    setStorage(f.api)
    saveRulings('nix-id', setRuling({}, 'HEARTH-03', 'canon', undefined, AT))
    expect(written).toEqual(['codex-errata-nix-id'])
  })
})
