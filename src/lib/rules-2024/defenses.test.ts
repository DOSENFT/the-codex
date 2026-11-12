// Defenses: the pendant that made Nix immune to poison did nothing in the app,
// and his own Aura of Solace was prose. Every test asks what a HIT or a
// CONDITION does to the sheet, because that is where the wrong answer showed.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCharacterFile } from '../import-character'
import { applyDamage, toggleCondition, type Character } from '../character'
import {
  MAGIC_ITEM_PRESETS,
  MAX_MAGIC_ITEMS,
  conditionImmunitySources,
  damageAfterDefenses,
  defensesOf,
  normalizeMagicItems,
} from './defenses'

const LVL8 = readFileSync(fileURLToPath(new URL('../../../public/codex-nix-lvl8.json', import.meta.url)), 'utf8')

function nix(over: Partial<Character> = {}): Character {
  const result = parseCharacterFile(LVL8)
  if (!result.ok) throw new Error(result.error)
  return { ...result.character, ...over }
}

const PERIAPT = { id: 'p1', name: 'Periapt of Proof against Poison', equipped: true, immunities: ['Poison'], resistances: [], conditionImmunities: ['Poisoned'] }

describe('defensesOf', () => {
  it('Aura of Solace gives resistance to Fire, Cold and Psychic at level 8', () => {
    const d = defensesOf(nix())
    expect(d.damage.map(x => `${x.damageType}:${x.kind}`).sort()).toEqual(['Cold:resist', 'Fire:resist', 'Psychic:resist'])
    expect(d.damage.every(x => x.sources.includes('Aura of Solace'))).toBe(true)
  })

  it('the aura switches off while Incapacitated, and says so', () => {
    for (const c of ['Incapacitated', 'Unconscious', 'Stunned', 'Paralyzed', 'Petrified']) {
      const d = defensesOf(nix({ conditions: [c] }))
      expect(d.damage, c).toEqual([])
      expect(d.inactive[0]?.source).toBe('Aura of Solace')
    }
  })

  it('an equipped periapt makes him immune to Poison damage and the Poisoned condition', () => {
    const d = defensesOf(nix({ magicItems: [PERIAPT] as Character['magicItems'] }))
    expect(d.damage.find(x => x.damageType === 'Poison')).toEqual({
      damageType: 'Poison', kind: 'immune', sources: ['Periapt of Proof against Poison'],
    })
    expect(d.conditions).toEqual([{ condition: 'Poisoned', sources: ['Periapt of Proof against Poison'] }])
  })

  it('an item in the bag (not equipped) protects nobody', () => {
    const d = defensesOf(nix({ magicItems: [{ ...PERIAPT, equipped: false }] as Character['magicItems'] }))
    expect(d.damage.find(x => x.damageType === 'Poison')).toBeUndefined()
    expect(d.conditions).toEqual([])
  })

  it('immunity beats resistance, and two resistances still halve once', () => {
    const items = [
      { id: 'a', name: 'Ring of Fire Resistance', equipped: true, immunities: [], resistances: ['Fire'], conditionImmunities: [] },
      { id: 'b', name: 'Salamander Charm', equipped: true, immunities: ['Fire'], resistances: [], conditionImmunities: [] },
    ]
    const sheet = nix({ magicItems: items as Character['magicItems'] })
    expect(damageAfterDefenses(sheet, 21, 'Fire')).toMatchObject({ taken: 0, kind: 'immune', sources: ['Salamander Charm'] })
    const resistOnly = nix({ magicItems: [items[0]] as Character['magicItems'] })
    // Ring + Aura of Solace both resist Fire: 21 -> 10, not 5.
    expect(damageAfterDefenses(resistOnly, 21, 'Fire')).toMatchObject({ taken: 10, kind: 'resist' })
    expect(damageAfterDefenses(resistOnly, 21, 'Fire').sources.sort()).toEqual(['Aura of Solace', 'Ring of Fire Resistance'])
  })
})

describe('damageAfterDefenses', () => {
  const sheet = nix({ magicItems: [PERIAPT] as Character['magicItems'] })
  it('immune takes 0', () => expect(damageAfterDefenses(sheet, 17, 'Poison').taken).toBe(0))
  it('resistance halves, rounding down', () => expect(damageAfterDefenses(sheet, 17, 'Cold').taken).toBe(8))
  it('a type with no defense is full damage', () => expect(damageAfterDefenses(sheet, 17, 'Slashing').taken).toBe(17))
  it('no type is full damage', () => expect(damageAfterDefenses(sheet, 17, null).taken).toBe(17))
  it('garbage amounts never go negative', () => {
    expect(damageAfterDefenses(sheet, -5, 'Cold').taken).toBe(0)
    expect(damageAfterDefenses(sheet, NaN, 'Cold').taken).toBe(0)
  })
  it('resistance applies before temp HP absorbs anything', () => {
    const withTemp = { ...sheet, tempHP: 5 }
    const hit = damageAfterDefenses(withTemp, 20, 'Fire') // 20 -> 10
    const after = applyDamage(withTemp, hit.taken)
    expect(after.tempHP).toBe(0)
    expect(after.hitPoints.current).toBe(withTemp.hitPoints.current - 5)
  })
})

describe('toggleCondition with a condition immunity', () => {
  const sheet = nix({ magicItems: [PERIAPT] as Character['magicItems'] })
  it('refuses to add Poisoned', () => {
    expect(toggleCondition(sheet, 'Poisoned')).toBe(sheet)
    expect(conditionImmunitySources(sheet, 'Poisoned')).toEqual(['Periapt of Proof against Poison'])
  })
  it('still lets an already-active Poisoned be cleared', () => {
    const stuck = { ...sheet, conditions: ['Poisoned'] }
    expect(toggleCondition(stuck, 'Poisoned').conditions).toEqual([])
  })
  it('other conditions toggle as before', () => {
    expect(toggleCondition(sheet, 'Prone').conditions).toEqual(['Prone'])
  })
  it('without the periapt, Poisoned adds as before', () => {
    expect(toggleCondition(nix(), 'Poisoned').conditions).toEqual(['Poisoned'])
  })
})

describe('normalizeMagicItems — a hand-edited file is cleaned, never trusted', () => {
  it('drops unknown types, nameless items and junk entries; keeps case-insensitive matches', () => {
    const out = normalizeMagicItems([
      { name: '  Odd Charm  ', immunities: ['poison', 'Banana', 7], resistances: ['FIRE', 'poison'], conditionImmunities: ['poisoned', 'Sleepy'] },
      { name: '', immunities: ['Fire'] },
      null, 'string', 42, [],
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      name: 'Odd Charm', equipped: true, immunities: ['Poison'], resistances: ['Fire'], conditionImmunities: ['Poisoned'],
    })
  })
  it('caps the list and the name length', () => {
    const many = Array.from({ length: MAX_MAGIC_ITEMS + 10 }, (_, i) => ({ name: `Item ${i}` }))
    expect(normalizeMagicItems(many)).toHaveLength(MAX_MAGIC_ITEMS)
    expect(normalizeMagicItems([{ name: 'x'.repeat(500) }])[0]!.name).toHaveLength(80)
  })
  it('gives duplicate ids fresh ones', () => {
    const out = normalizeMagicItems([{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }])
    expect(new Set(out.map(i => i.id)).size).toBe(2)
  })
  it('a non-array is no items', () => {
    expect(normalizeMagicItems({ name: 'x' })).toEqual([])
    expect(normalizeMagicItems(undefined)).toEqual([])
  })
  it('the presets themselves pass validation unchanged', () => {
    const out = normalizeMagicItems(MAGIC_ITEM_PRESETS.map((p, i) => ({ ...p, id: `p${i}`, equipped: true })))
    expect(out.map(({ id: _id, equipped: _e, ...rest }) => rest)).toEqual(MAGIC_ITEM_PRESETS)
  })
})

describe('the import door', () => {
  it('an old sheet with no magicItems comes back without the field', () => {
    expect('magicItems' in nix()).toBe(false)
  })
  it('a file carrying a periapt imports it cleaned and working', () => {
    const raw = JSON.parse(LVL8)
    raw.magicItems = [{ name: 'Periapt of Proof against Poison', immunities: ['poison'], conditionImmunities: ['Poisoned'], equipped: 'yes' }]
    const result = parseCharacterFile(JSON.stringify(raw))
    if (!result.ok) throw new Error(result.error)
    expect(result.character.magicItems?.[0]).toMatchObject({ equipped: true, immunities: ['Poison'] })
    expect(damageAfterDefenses(result.character, 12, 'Poison').taken).toBe(0)
  })
})
