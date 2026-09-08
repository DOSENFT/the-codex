import { describe, it, expect } from 'vitest'
import { entryDetail } from './detail'
import { buildCatalogue } from './build'
import { canonBands } from '../canon/bands'
import { parseCharacterFile } from '../import-character'
import type { Character, Spell } from '../character'
import { NIX } from '../turn/fixtures/nix'

/* ===========================================================================
   THE SAVE BUTTON THAT WROTE TO DISK AND CHANGED NOTHING ON SCREEN.

   Marcus, twice: "I go to make my edits, save it, and it doesn't save at all."
   It always saved. `updateSpell` -> `saveCharacter` -> `localStorage` worked
   perfectly the whole time. What broke was the READER: since bb2eb2e the
   Grimoire renders canon, and canon repainted his words on the next render.

   That rendering rule was itself a fix — the app used to show his four-word
   imported "Divine Smite" while canon held the paragraph. So the ruling stands
   and this is an amendment to it, not a revert: canon still beats an
   IMPORTER's stub, and no longer beats a paragraph a human pressed Save on.
   `userEdited` is the only thing that can tell those two apart.

   EVERY TEST BELOW DISTINGUISHES THE TWO CASES. A test that only checked "his
   text appears" would pass just as well against a straight revert, which would
   put the Divine Smite regression back.
   ========================================================================= */

/** A canon spell as it sits on his sheet, with his own words in `description`.
 *  Divine Smite on purpose: it is the exact record the canon-wins rule was
 *  written to protect. */
function sheetSpell(over: Partial<Spell> = {}): Spell {
  return {
    name: 'Divine Smite',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: 'Self',
    components: 'V',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    description: 'Big glowy sword hit.',
    prepared: true,
    ...over,
  }
}

function withSpell(spell: Spell): Character {
  return { ...NIX, spells: [spell] }
}

/** The catalogue entry for a name, built the way the app builds it. */
function entryFor(char: Character, name: string) {
  const entry = buildCatalogue(char).find(e => e.name === name)
  expect(entry, `${name} fell out of the catalogue entirely`).toBeDefined()
  return entry!
}

describe('an edit he saved beats canon; an import still does not', () => {
  it('shows canon’s words when the sheet text was merely imported', () => {
    /* THE GUARD ON THE FIX. No `userEdited`, so this is an importer's stub and
       the bb2eb2e ruling holds untouched. If this ever goes red, the Divine
       Smite regression is back. */
    const char = withSpell(sheetSpell())
    const detail = entryDetail(entryFor(char, 'Divine Smite'), char)

    expect(detail.bands.whatItDoes).not.toContain('Big glowy sword hit')
    expect(detail.bands.provenance).toBe('canon')
  })

  it('shows HIS words for the same spell once he has pressed Save', () => {
    /* THE ASSERTION THAT FAILS AGAINST THE OLD CODE. Same record, same canon,
       one flag different. */
    const char = withSpell(sheetSpell({ userEdited: true }))
    const detail = entryDetail(entryFor(char, 'Divine Smite'), char)

    expect(detail.bands.whatItDoes).toContain('Big glowy sword hit')
    expect(detail.bands.provenance).toBe('edited')
  })

  it('says the words are his, and does not credit canon for them', () => {
    /* Provenance is not decoration. `EntryDetailPanel` prints a different
       sentence per value, and telling him canon wrote his paragraph is the
       same class of lie `tacticsSource` exists to prevent. */
    const char = withSpell(sheetSpell({ userEdited: true }))
    expect(entryDetail(entryFor(char, 'Divine Smite'), char).bands.provenance).not.toBe('canon')
  })

  it('keeps canon when he saved an EMPTY description', () => {
    /* Pressing Save on a blank box must not blank the paragraph. An override
       with nothing in it is not an override. */
    const char = withSpell(sheetSpell({ userEdited: true, description: '   ' }))
    const detail = entryDetail(entryFor(char, 'Divine Smite'), char)

    expect(detail.bands.whatItDoes.trim().length).toBeGreaterThan(0)
    expect(detail.bands.provenance).toBe('canon')
  })

  it('leaves every spell he did not edit alone', () => {
    /* One edited record must not flip the whole catalogue's provenance. */
    const char = withSpell(sheetSpell({ userEdited: true }))
    const other = entryDetail(entryFor(char, 'Cure Wounds'), char)
    expect(other.bands.provenance).toBe('canon')
  })
})

describe('canonBands.fallbackWins', () => {
  const base = {
    name: 'Divine Smite',
    spell: null,
    feature: null,
    feat: null,
    fallbackFacts: [],
  }

  it('defaults to canon-wins, so no existing caller changes behaviour', () => {
    /* `fallbackWins` is optional. Every call site that predates it omits it,
       and this is the test that says omitting it is safe. */
    const bands = canonBands({ ...base, fallbackText: 'mine' }, NIX)
    expect(bands.provenance).toBe('sheet') // no canon record passed in at all
    expect(bands.whatItDoes).toContain('mine')
  })

  it('ignores the flag when the override is whitespace', () => {
    const bands = canonBands({ ...base, fallbackText: '  ', fallbackWins: true }, NIX)
    expect(bands.provenance).not.toBe('edited')
  })

  it('still personalises his own words', () => {
    /* His sentence is as entitled to his numbers as canon's is — the override
       must not route around `personaliseText`. */
    const bands = canonBands(
      { ...base, fallbackText: 'Save DC is {saveDC}.', fallbackWins: true },
      NIX,
    )
    expect(bands.whatItDoes).toContain(String(NIX.spellSaveDC))
    expect(bands.whatItDoes).not.toContain('{saveDC}')
  })
})

describe('the flag survives the trip through storage', () => {
  it('round-trips through parseCharacterFile', () => {
    /* Written to localStorage as JSON and read back through the normaliser on
       every load. A flag that did not survive that would work until he closed
       the tab, which is indistinguishable from the bug it fixes. */
    const char = withSpell(sheetSpell({ userEdited: true }))
    const back = parseCharacterFile(JSON.stringify(char))
    expect(back.ok, 'the fixture stopped parsing; this test is now vacuous').toBe(true)
    if (!back.ok) return
    expect(back.character.spells[0]!.userEdited).toBe(true)
  })

  it('does not let a hand-made file claim the override with a truthy string', () => {
    /* The flag outranks canon, so it must be a real boolean and not merely
       truthy. `"yes"` is what a hand-edited JSON file looks like. */
    const char = withSpell(sheetSpell())
    const raw = JSON.parse(JSON.stringify(char))
    raw.spells[0].userEdited = 'yes'
    const back = parseCharacterFile(JSON.stringify(raw))
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back.character.spells[0]!.userEdited).toBe(false)
  })
})
