// "What can I spend this Channel Divinity charge on?" — Marcus, 2026-11-12.
// Driven from his REAL files read as bytes through the app's own import door,
// so the list is the list he will see, not one a fixture was built to produce.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCharacterFile } from '../import-character'
import type { Character } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { channelDivinityOptions } from './channel-divinity'

function load(relative: string): Character {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const result = parseCharacterFile(readFileSync(path, 'utf8'))
  if (!result.ok) throw new Error(`${relative} does not import: ${result.error}`)
  return result.character
}

const LVL8 = load('../../../public/codex-nix-lvl8.json')
const LVL7 = load('../../../public/_seed.json')

const names = (c: Character) => channelDivinityOptions(c).map(o => o.name)

describe('channelDivinityOptions', () => {
  it('level 8 Nix: Divine Sense, the Hearthfire cloak and Turn Undead — once each', () => {
    const list = names(LVL8)
    expect(list).toContain('Divine Sense')
    expect(list.some(n => /^Hearthfire Manifest/.test(n))).toBe(true)
    expect(list).toContain('Turn Undead')
    expect(list.filter(n => /Hearthfire/.test(n))).toHaveLength(1)
    expect(new Set(list).size).toBe(list.length)
  })

  it('says what each costs in actions, the way the table reads it', () => {
    const byName = Object.fromEntries(channelDivinityOptions(LVL8).map(o => [o.name.split(' — ')[0], o]))
    expect(byName['Divine Sense']?.actionLabel).toBe('Bonus Action')
    expect(byName['Hearthfire Manifest']?.actionLabel).toBe('Reaction')
    expect(byName['Turn Undead']?.actionLabel).toBe('Magic action')
  })

  it('works the cloak temp HP out from level and Charisma: 8 + 3 = 11', () => {
    const cloak = channelDivinityOptions(LVL8).find(o => /Hearthfire/.test(o.name))
    expect(cloak?.summary).toMatch(/11 temporary HP/)
    expect(cloak?.summary).toMatch(/1d10/)
  })

  it('Turn Undead states its save and DC in one line', () => {
    const turn = channelDivinityOptions(LVL8).find(o => o.name === 'Turn Undead')
    expect(turn?.facts).toBe('30 feet · WIS save DC 14 · 1 minute')
    expect(turn?.summary).toMatch(/^On a failure it is Frightened and Incapacitated/)
    expect(turn?.detail).toMatch(/holy symbol/)
  })

  it('level 7 seed (before the brazier) has no Turn Undead, but still has the canon options', () => {
    // The seed carries no pool of its own, so give it the paladin block it
    // would have on the phone; the question is only what the MENU holds.
    const withPool: Character = {
      ...LVL7,
      paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
    }
    const list = names(withPool)
    expect(list).not.toContain('Turn Undead')
    expect(list).toContain('Divine Sense')
  })

  it('no Channel Divinity pool → no list', () => {
    expect(channelDivinityOptions({ ...LVL8, paladinResources: undefined, features: [] })).toEqual([])
  })

  it('non-paladin with no pool → []', () => {
    const fighter: Character = { ...NIX, class: 'Fighter', subclass: 'Champion', paladinResources: undefined, features: [] }
    expect(channelDivinityOptions(fighter)).toEqual([])
  })

  it('a paladin sheet with no features at all still gets canon, and does not throw', () => {
    const thin: Character = {
      ...LVL8,
      features: [],
      subclass: '',
      abilityScores: undefined as unknown as Character['abilityScores'],
    }
    const list = names(thin)
    expect(list).toEqual(['Divine Sense'])
  })

  it('ignores junk feature entries instead of throwing', () => {
    const junk: Character = {
      ...LVL8,
      features: [null, { name: '', level: 1, description: '' }, { level: 1 } as never] as unknown as Character['features'],
    }
    expect(() => channelDivinityOptions(junk)).not.toThrow()
  })

  it('below level 3 a paladin has no canon options', () => {
    const low: Character = { ...LVL8, level: 2, features: [] }
    expect(names(low)).toEqual([])
  })

  it('a homebrew feature that says it expends Channel Divinity is listed by its own words', () => {
    const home: Character = {
      ...LVL8,
      features: [
        ...LVL8.features,
        { name: 'Channel Divinity: Hearthsong', level: 3, description: 'As a Bonus Action, you can expend one use of your Channel Divinity to sing.' },
      ],
    }
    expect(names(home)).toContain('Hearthsong')
  })
})
