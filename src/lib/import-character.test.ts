import { describe, it, expect } from 'vitest'
import { parseCharacterFile, formatList } from './import-character'

/**
 * The import path had no test at all until 2026-08-17, which is how it shipped
 * broken: every browser proof in this repo seeds a character straight into
 * localStorage and walks past the door a new device actually comes in through.
 *
 * The fixtures below are SYNTHETIC on purpose. Marcus's real exports carry his
 * persona and 1,800 words of backstory — personal data that does not belong in
 * a repo — so these reproduce the *shapes* that broke, not his character.
 */

/** The shape of a failed export. Two of these are sitting in his Downloads. */
const EMPTY = '{}'

/** An old export: valid, and missing four things the app reads without a guard. */
const THIN = JSON.stringify({
  name: 'Testwright',
  class: 'Paladin',
  subclass: 'Oath of the Hearth',
  level: 7,
  hitPoints: { max: 67, current: 67 },
  armorClass: 18,
})

/** A current export, with the fields the thin one lacks. */
const FULL = JSON.stringify({
  ...JSON.parse(THIN),
  abilityScores: { STR: 18, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  weapons: [{ id: 'w1', name: 'Longsword' }],
  equipment: [{ id: 'e1', name: 'Shield' }],
  spells: [{ id: 's1', name: 'Bless', level: 1 }],
  spellSlots: { '1': { max: 4, current: 4 } },
})

describe('parseCharacterFile — what it refuses', () => {
  it('names an empty file as a failed export rather than an invalid one', () => {
    const r = parseCharacterFile(EMPTY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/export/i)
  })

  it('refuses a blank file', () => {
    expect(parseCharacterFile('   ').ok).toBe(false)
  })

  it('refuses something that is not JSON, and says where to get one', () => {
    const r = parseCharacterFile('this is my character, a paladin')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Settings/)
  })

  it('refuses JSON that is not an object', () => {
    expect(parseCharacterFile('[1,2,3]').ok).toBe(false)
    expect(parseCharacterFile('"Nix"').ok).toBe(false)
    expect(parseCharacterFile('null').ok).toBe(false)
  })

  it('refuses a nameless character, because the roster could not tell it apart', () => {
    expect(parseCharacterFile(JSON.stringify({ class: 'Paladin', level: 7 })).ok).toBe(false)
  })
})

describe('parseCharacterFile — what it accepts', () => {
  it('accepts a thin old export instead of rejecting it', () => {
    // This is the file Marcus had to dig out of an email. Refusing it would be
    // the wrong answer: an old character is still his character.
    expect(parseCharacterFile(THIN).ok).toBe(true)
  })

  it('fills the fields that white-screened the app, so boot cannot crash on them', () => {
    const r = parseCharacterFile(THIN)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Each of these is read without a guard somewhere during boot. `undefined`
    // here is a blank screen above every error boundary.
    expect(r.character.abilityScores).toBeDefined()
    expect(r.character.abilityScores.DEX).toEqual(expect.any(Number))
    expect(Array.isArray(r.character.feats)).toBe(true)
    expect(Array.isArray(r.character.weapons)).toBe(true)
    expect(Array.isArray(r.character.customHooks)).toBe(true)
    expect(Array.isArray(r.character.resourcePools)).toBe(true)
    expect(Array.isArray(r.character.customConditions)).toBe(true)
  })

  it('gives a character with no id one, so it can be stored and found again', () => {
    const r = parseCharacterFile(THIN)
    if (!r.ok) throw new Error('expected ok')
    expect(r.character.id).toBeTruthy()
  })

  it('takes "species" as "race", because 2024 renamed it', () => {
    const r = parseCharacterFile(JSON.stringify({ name: 'Testwright', species: 'Aasimar' }))
    if (!r.ok) throw new Error('expected ok')
    expect(r.character.race).toBe('Aasimar')
  })

  it('does not overwrite a real field with a default', () => {
    const r = parseCharacterFile(FULL)
    if (!r.ok) throw new Error('expected ok')
    expect(r.character.abilityScores.STR).toBe(18)
    expect(r.character.level).toBe(7)
    expect(r.character.hitPoints).toEqual({ max: 67, current: 67 })
    expect(r.character.spells).toHaveLength(1)
    expect(r.character.armorClass).toBe(18)
  })

  it('does not drop a field it does not know about', () => {
    const r = parseCharacterFile(JSON.stringify({ name: 'Testwright', homebrewNotes: 'a long tale' }))
    if (!r.ok) throw new Error('expected ok')
    expect((r.character as { homebrewNotes?: string }).homebrewNotes).toBe('a long tale')
  })
})

describe('parseCharacterFile — what it warns about', () => {
  it('names every thin field, so a defaulted character is never a surprise', () => {
    const r = parseCharacterFile(THIN)
    if (!r.ok) throw new Error('expected ok')
    expect(r.warnings).toEqual(['ability scores', 'weapons', 'equipment', 'spells'])
  })

  it('stays quiet when the export is complete', () => {
    const r = parseCharacterFile(FULL)
    if (!r.ok) throw new Error('expected ok')
    expect(r.warnings).toEqual([])
  })

  it('treats an empty array as missing, since a character with no weapons has none either way', () => {
    const r = parseCharacterFile(JSON.stringify({ ...JSON.parse(FULL), weapons: [] }))
    if (!r.ok) throw new Error('expected ok')
    expect(r.warnings).toEqual(['weapons'])
  })
})

describe('formatList', () => {
  it('reads as a sentence', () => {
    expect(formatList(['weapons'])).toBe('weapons')
    expect(formatList(['weapons', 'spells'])).toBe('weapons and spells')
    expect(formatList(['a', 'b', 'c'])).toBe('a, b and c')
    expect(formatList([])).toBe('')
  })
})
