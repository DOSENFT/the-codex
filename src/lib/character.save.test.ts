import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveCharacter, onCharacterSaveFailure, normalizeCharacter } from './character'

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
