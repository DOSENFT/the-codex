import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveCharacter, onCharacterSaveFailure, normalizeCharacter, characterStamp } from './character'

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
   once and stores 30. Every one of these fails against the pre-change code,
   which took no `readAt` and wrote unconditionally.

   The two tabs are simulated by holding a character object across a write made
   by "someone else": that IS the bug. There is no timing here, no interleaving,
   nothing racy — just an in-memory copy that stopped matching disk.
   ========================================================================== */
describe('saveCharacter when another window has written since', () => {
  beforeEach(() => { setStorage(fakeStorage().api) })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else setStorage(undefined)
  })

  /** What tab two is holding: a character read at time T, unchanged since. */
  const readAtDisk = () => {
    const c = nix()
    saveCharacter(c)                       // c.updatedAt is now what disk holds
    return { held: { ...c }, at: characterStamp('test-id')! }
  }

  it('refuses a write whose stamp is behind what is on disk', () => {
    const { held, at } = readAtDisk()
    saveCharacter({ ...held, name: 'the other window wrote this' })   // tab one
    const result = saveCharacter({ ...held, name: 'the stale tab' }, at)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.stale).toBe(true)
  })

  it('leaves the other window’s write intact — nothing is overwritten', () => {
    const { store, api } = fakeStorage()
    setStorage(api)
    const c = nix()
    saveCharacter(c)
    const at = characterStamp('test-id')!
    const held = { ...c }
    saveCharacter({ ...held, name: 'the other window wrote this' })
    const onDisk = store['codex-character-test-id']

    saveCharacter({ ...held, name: 'the stale tab' }, at)
    expect(store['codex-character-test-id']).toBe(onDisk)
    expect(store['codex-character-test-id']).toContain('the other window wrote this')
  })

  it('tells the tab, in words that name the cause rather than blame the disk', () => {
    const heard: string[] = []
    const off = onCharacterSaveFailure(r => heard.push(r))
    const { held, at } = readAtDisk()
    saveCharacter({ ...held, name: 'the other window wrote this' })
    saveCharacter({ ...held, name: 'the stale tab' }, at)
    off()
    expect(heard).toHaveLength(1)
    expect(heard[0]).toMatch(/another window/i)
    expect(heard[0]).not.toMatch(/out of storage/i)   // it is not a device problem
  })

  it('allows the write when nothing has moved — the common case is untouched', () => {
    const { held, at } = readAtDisk()
    expect(saveCharacter({ ...held, name: 'same tab, next spend' }, at)).toEqual({ ok: true })
  })

  it('never refuses without a readAt — an import replaces the record on purpose', () => {
    const { held } = readAtDisk()
    saveCharacter({ ...held, name: 'the other window wrote this' })
    expect(saveCharacter({ ...held, name: 'an imported file' })).toEqual({ ok: true })
  })

  it('never refuses when there is nothing on disk to conflict with', () => {
    const fresh = normalizeCharacter({ name: 'Nix', level: 7 }, 'unseen-id')
    expect(saveCharacter(fresh, '2020-01-01T00:00:00.000Z')).toEqual({ ok: true })
  })

  it('never refuses on an unreadable stored record — a guard must not be the outage', () => {
    const { store, api } = fakeStorage()
    setStorage(api)
    store['codex-character-test-id'] = '{ not json'
    expect(saveCharacter(nix(), '2020-01-01T00:00:00.000Z')).toEqual({ ok: true })
  })

  it('characterStamp reads back what landed, not what the caller passed in', () => {
    const c = nix()
    c.updatedAt = '1999-01-01T00:00:00.000Z'
    saveCharacter(c)
    expect(characterStamp('test-id')).toBe(c.updatedAt)     // saveCharacter restamped it
    expect(characterStamp('test-id')).not.toBe('1999-01-01T00:00:00.000Z')
    expect(characterStamp('no-such-id')).toBeNull()
  })
})
