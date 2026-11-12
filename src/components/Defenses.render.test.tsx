// What the screens SAY about defenses, rendered the way VitalsControls.test
// renders HPTracker (static markup, no jsdom). 2026-11-12.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../lib/turn/fixtures/nix'
import type { Character } from '../lib/character'
import { HPTracker } from './HPTracker'
import { MagicItems, protectionsOf } from './MagicItems'

const noop = () => {}
const PERIAPT = {
  id: 'p1', name: 'Periapt of Proof against Poison', equipped: true,
  immunities: ['Poison'], resistances: [], conditionImmunities: ['Poisoned'],
} as const

const withItems = (items: unknown[]): Character => ({ ...NIX, magicItems: items as Character['magicItems'] })
const tracker = (c: Character) => renderToStaticMarkup(<HPTracker character={c} onCharacterUpdate={noop} />)
const items = (c: Character) => renderToStaticMarkup(<MagicItems character={c} onCharacterUpdate={noop} />)

describe('HPTracker defenses line', () => {
  it('names the periapt immunity and the condition it stops', () => {
    const html = tracker(withItems([PERIAPT]))
    expect(html).toContain('Defenses')
    expect(html).toContain('Immune: Poison')
    expect(html).toContain('Can&#x27;t be Poisoned')
  })

  it('an item in the pack adds nothing', () => {
    const html = tracker(withItems([{ ...PERIAPT, equipped: false }]))
    expect(html).not.toContain('Immune: Poison')
  })

  it('says the aura is off while Incapacitated', () => {
    const sheet: Character = {
      ...NIX,
      level: 8,
      conditions: ['Unconscious'],
      features: [...NIX.features.filter(f => f.name !== 'Aura of Solace'), { name: 'Aura of Solace', level: 7, description: 'x' }],
    }
    expect(tracker(sheet)).toContain('Aura of Solace is off while you')
  })
})

describe('MagicItems', () => {
  it('empty: tells him what this list is for', () => {
    const html = items({ ...NIX, magicItems: [] })
    expect(html).toContain('Wearing something magical?')
    expect(html).toContain('Add magic item')
  })

  it('lists a worn item with its protections in plain words', () => {
    const html = items(withItems([PERIAPT]))
    expect(html).toContain('Periapt of Proof against Poison')
    expect(html).toContain('Worn')
    expect(html).toContain('Immune: Poison')
  })

  it('protectionsOf reads like a sentence a player would say', () => {
    expect(protectionsOf({ ...PERIAPT, immunities: ['Poison'], conditionImmunities: ['Poisoned'], resistances: ['Fire'] })).toEqual([
      'Immune: Poison', 'Half damage: Fire', "Can't be Poisoned",
    ])
  })

  it('a corrupt item list renders without throwing', () => {
    expect(() => items(withItems([null, 5, { name: '' }, { name: 'Ok', immunities: 'Poison' }]))).not.toThrow()
  })
})
