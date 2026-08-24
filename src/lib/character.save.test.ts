import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  saveCharacter, onCharacterSaveFailure, normalizeCharacter, characterStamp,
  loadCharacter, deleteCharacter, type Character,
} from './character'

/* ============================================================================
   A FAILED WRITE IS NOT A SAVE — for characters, not just the covenant.

   These pin the defect measured on 2026-08-23 under TABLE-READY D-5: with
   storage full, `saveCharacter` threw `QuotaExceededError` straight through
   every spend and nothing anywhere told Marcus the write had not happened.

   Every one of these fails against the pre-change code — the first three
   because the call throws instead of returning, the last because there was no
   subscription to fail.
   ========================================================================== */

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

const nix = () => normalizeCharacter({ name: 'Nix', level: 7 }, 'test-id')

describe('saveCharacter on a device that will not store', () => {
  beforeEach(() => { setStorage(fakeStorage().api) })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else setStorage(undefined)
  })

  it('reports ok when the bytes land', () => {
    expect(saveCharacter(nix())).toEqual({ ok: true })
  })

  it('does not throw when the quota is full — a spend must not unwind the tree', () => {
    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-character-')) {
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e
      }
    }).api)
    expect(() => saveCharacter(nix())).not.toThrow()
  })

  it('says the write did not happen, in words a player can act on', () => {
    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-character-')) {
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e
      }
    }).api)
    const result = saveCharacter(nix())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/out of storage/i)
      expect(result.reason).toMatch(/export/i)          // tells him what to do next
      expect(result.reason).not.toMatch(/QuotaExceeded/) // not a stack trace
    }
  })

  it('leaves the previous save on disk — the character is never eaten', () => {
    const { store, api } = fakeStorage()
    setStorage(api)
    const first = nix()
    saveCharacter(first)
    const onDisk = store['codex-character-test-id']
    expect(onDisk).toContain('Nix')

    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-character-')) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e }
    }).api)
    saveCharacter({ ...first, name: 'Overwritten' })
    setStorage(api)
    expect(store['codex-character-test-id']).toBe(onDisk)
  })

  it('announces the failure to a subscriber, so no call site can forget to look', () => {
    const heard: string[] = []
    const off = onCharacterSaveFailure(r => heard.push(r))
    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-character-')) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e }
    }).api)
    saveCharacter(nix())
    off()
    expect(heard).toHaveLength(1)
    expect(heard[0]).toMatch(/not saved|out of storage/i)
  })

  it('a listener that throws cannot turn a storage problem into a crash', () => {
    const off = onCharacterSaveFailure(() => { throw new Error('bad listener') })
    setStorage(fakeStorage(k => {
      if (k.startsWith('codex-character-')) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e }
    }).api)
    expect(() => saveCharacter(nix())).not.toThrow()
    off()
  })

  it('a device with no storage at all is a failed write, not a silent success', () => {
    setStorage(undefined as unknown as Storage)
    const result = saveCharacter(nix())
    expect(result.ok).toBe(false)
  })
})

/* ============================================================================
   REFUSE-AND-RECONCILE — the second tab cannot eat the first tab's spend.

   Pins the defect measured under TABLE-READY D-4: two tabs, pool at 35, tab one
   spends twice and stores 25, tab two — stale since before that write — spends
   once and stores 30. Last-write-wins is silent data loss.

   AMENDMENT A-19 rewrote this block. The first version threaded a `readAt`
   string in from `useCharacter`, and independent verification found that only
   three of its eight tests could tell the fixed code from the broken code —
   the other five went red merely because a helper they imported did not exist
   yet, which is a compile error wearing the costume of a regression test. It
   also found the design itself wrong: three components write straight to
   `saveCharacter` without passing through the hook, so the hook's record went
   stale inside a SINGLE tab and refused good spends.

   So: "what this tab has seen" now lives at the write, and the other window is
   simulated the only way that is now honest — by writing to the store
   DIRECTLY, behind `saveCharacter`'s back. That is exactly what another tab
   looks like from in here. Every test below is red against `e4a8035`, and the
   last four are red against `c2aa5bb` as well.
   ========================================================================== */
describe('saveCharacter when another window has written since', () => {
  let store: Store
  beforeEach(() => { const f = fakeStorage(); store = f.store; setStorage(f.api) })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else setStorage(undefined)
  })

  /* Each test gets its own id. `seenOnDisk` is module state that outlives one
     test — as it must, being a tab-lifetime record — so sharing an id across
     tests would make them order-dependent. */
  let n = 0
  const fresh = () => normalizeCharacter({ name: 'Nix', level: 7 }, `d4-${++n}`)
  const key = (c: Character) => 'codex-character-' + c.id

  /** The other window: a write this tab cannot see happen. */
  const otherWindowWrites = (c: Character, name: string) => {
    store[key(c)] = JSON.stringify({ ...c, name, updatedAt: '2099-01-01T00:00:00.000Z' })
  }

  it('refuses a write when disk moved under this tab', () => {
    const c = fresh()
    saveCharacter(c)
    otherWindowWrites(c, 'the other window wrote this')
    const result = saveCharacter({ ...c, name: 'the stale tab' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.stale).toBe(true)
  })

  it('leaves the other window’s write intact — nothing is overwritten', () => {
    const c = fresh()
    saveCharacter(c)
    otherWindowWrites(c, 'the other window wrote this')
    const onDisk = store[key(c)]
    saveCharacter({ ...c, name: 'the stale tab' })
    expect(store[key(c)]).toBe(onDisk)
    expect(store[key(c)]).toContain('the other window wrote this')
  })

  it('tells the tab, in words that name the cause rather than blame the disk', () => {
    const heard: string[] = []
    const off = onCharacterSaveFailure(r => heard.push(r))
    const c = fresh()
    saveCharacter(c)
    otherWindowWrites(c, 'the other window wrote this')
    saveCharacter({ ...c, name: 'the stale tab' })
    off()
    expect(heard).toHaveLength(1)
    expect(heard[0]).toMatch(/another window/i)
    expect(heard[0]).not.toMatch(/out of storage/i)   // it is not a device problem
  })

  it('allows the write when nothing has moved — the common case is untouched', () => {
    const c = fresh()
    saveCharacter(c)
    expect(saveCharacter({ ...c, name: 'same tab, next spend' })).toEqual({ ok: true })
  })

  it('never refuses a record this tab has never seen', () => {
    const c = fresh()
    store[key(c)] = JSON.stringify({ ...c, updatedAt: '2099-01-01T00:00:00.000Z' })
    expect(saveCharacter(c)).toEqual({ ok: true })
  })

  it('never refuses on an unreadable stored record — a guard must not be the outage', () => {
    const c = fresh()
    saveCharacter(c)
    store[key(c)] = '{ not json'
    expect(saveCharacter({ ...c, name: 'next spend' })).toEqual({ ok: true })
  })

  it('replacing: true overwrites a moved record, for a caller that means to', () => {
    const c = fresh()
    saveCharacter(c)
    otherWindowWrites(c, 'the other window wrote this')
    expect(saveCharacter({ ...c, name: 'deliberate replace' }, { replacing: true })).toEqual({ ok: true })
    expect(store[key(c)]).toContain('deliberate replace')
  })

  /* ---- the four A-19 regression guards --------------------------------- */

  it('a SECOND WRITER IN THIS TAB does not make the next save look foreign', () => {
    /* The shape of CampaignEditor and EngageCard: some component calls
       saveCharacter itself, then the ordinary spend path saves. Against
       `e4a8035` the spend here was refused and Marcus was told another window
       had changed his file — in a tab that was the only tab open. It cost him
       a Lay on Hands charge every time he opened Settings. */
    const c = fresh()
    saveCharacter(c)
    saveCharacter({ ...c, campaignName: 'auto-created on mount' } as Character)
    const spend = saveCharacter({ ...c, name: 'the spend right after' })
    expect(spend).toEqual({ ok: true })
    expect(store[key(c)]).toContain('the spend right after')
  })

  it('raises no false alarm when this tab is the only writer', () => {
    const heard: string[] = []
    const off = onCharacterSaveFailure(r => heard.push(r))
    const c = fresh()
    saveCharacter(c)
    saveCharacter({ ...c, campaignName: 'auto-created on mount' } as Character)
    saveCharacter({ ...c, name: 'the spend right after' })
    off()
    expect(heard).toEqual([])
  })

  it('reloading after a refusal makes the retry work — the notice tells the truth', () => {
    const c = fresh()
    saveCharacter(c)
    otherWindowWrites(c, 'the other window wrote this')
    expect(saveCharacter({ ...c, name: 'refused' }).ok).toBe(false)
    const reloaded = loadCharacter(c.id)!          // what the notice asks him to do
    expect(saveCharacter({ ...reloaded, name: 'do it again here' })).toEqual({ ok: true })
    expect(store[key(c)]).toContain('do it again here')
  })

  it('deleting a character forgets it, so re-using the id is not refused on a ghost', () => {
    const c = fresh()
    saveCharacter(c)
    deleteCharacter(c.id)
    store[key(c)] = JSON.stringify({ ...c, updatedAt: '2099-01-01T00:00:00.000Z' })
    expect(saveCharacter({ ...c, name: 'a new sheet on the same id' })).toEqual({ ok: true })
  })

  it('characterStamp reads back what landed, not what the caller passed in', () => {
    const c = fresh()
    c.updatedAt = '1999-01-01T00:00:00.000Z'
    saveCharacter(c)
    expect(characterStamp(c.id)).toBe(c.updatedAt)     // saveCharacter restamped it
    expect(characterStamp(c.id)).not.toBe('1999-01-01T00:00:00.000Z')
    expect(characterStamp('no-such-id')).toBeNull()
  })
})
