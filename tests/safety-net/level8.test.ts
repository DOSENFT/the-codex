/* Level 8 Nix — "does the file Marcus imports tonight say what his sheet says?"

   Session "Rings of the Divine Foundry" (2026-11): level 8, Lucky swapped for
   Tough, HP 102, and the consecrated brazier gave a third Channel Divinity use
   plus Turn Undead. `fixtures/nix-lvl8.json` is a byte copy of
   `public/codex-nix-lvl8.json`, the file he downloads. Driven through the same
   two doors as saved-data.test.ts: the Import button, and save-then-load. */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCharacterFile } from '../../src/lib/import-character'
import { loadCharacter, saveCharacter, type Character } from '../../src/lib/character'
import { poolsOf } from '../../src/lib/rules-2024/resources'

const FIXTURE = fileURLToPath(new URL('./fixtures/nix-lvl8.json', import.meta.url))
const PUBLIC = fileURLToPath(new URL('../../public/codex-nix-lvl8.json', import.meta.url))
const BYTES = readFileSync(FIXTURE, 'utf8')

class MemoryStorage {
  private map = new Map<string, string>()
  get length() { return this.map.size }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
  clear() { this.map.clear() }
}
beforeEach(() => {
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = new MemoryStorage()
})
afterEach(() => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage
})

function imported(): Character {
  const result = parseCharacterFile(BYTES)
  if (!result.ok) throw new Error(`level-8 file does not import: ${result.error}`)
  return result.character
}

function expectLevel8(nix: Character) {
  expect(nix.name).toBe('Nix')
  expect(nix.level).toBe(8)
  expect(nix.hitPoints).toEqual({ max: 102, current: 102 })
  expect(nix.abilityScores?.CON).toBe(16)
  expect(nix.proficiencyBonus).toBe(3)
  expect(nix.spellSaveDC).toBe(14)
  // Marcus, 2026-11-12: "I do not have 3rd lvl spells". A level-8 Paladin has
  // 4 first- and 3 second-level slots and nothing higher until level 9.
  expect(nix.spellSlots[1]?.max).toBe(4)
  expect(nix.spellSlots[2]?.max).toBe(3)
  expect(nix.spellSlots[3]).toBeUndefined()
  const feats = (nix.feats ?? []).map(f => f.name)
  expect(feats).toContain('Tough')
  expect(feats).not.toContain('Lucky')

  const pools = poolsOf(nix)
  const cd = pools.find(p => p.id === 'channel-divinity')
  const loh = pools.find(p => p.id === 'lay-on-hands')
  expect(cd).toMatchObject({ max: 3, current: 3 })
  expect(loh).toMatchObject({ max: 40, current: 40 })

  const turn = nix.features.find(f => f.name === 'Turn Undead')
  expect(turn?.resourcePoolId).toBe('channel-divinity')
  expect(turn?.level).toBeLessThanOrEqual(nix.level)
}

describe('level 8 Nix', () => {
  it('the phone download and the test copy are the same bytes', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(BYTES)
  })

  it('imports through the Import button as level 8', () => {
    expectLevel8(imported())
  })

  it('survives save and reload with the third Channel Divinity use intact', () => {
    const nix = imported()
    expect(saveCharacter(nix).ok, 'saveCharacter refused the level-8 file').toBe(true)
    const back = loadCharacter(nix.id)
    if (!back) throw new Error(`loadCharacter('${nix.id}') came back null`)
    expectLevel8(back)
  })

  it('a hand-edited file with a silly bonus falls back to the class table', () => {
    const raw = JSON.parse(BYTES)
    raw.poolBonuses = { 'channel-divinity': 99 }
    const result = parseCharacterFile(JSON.stringify(raw))
    if (!result.ok) throw new Error(result.error)
    const cd = poolsOf(result.character).find(p => p.id === 'channel-divinity')
    expect(cd?.max).toBe(2)
    expect(cd?.current).toBe(2)
  })
})
