import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { entryDetail, lockNoticeFor } from './detail'
import { buildCatalogue } from './build'
import { normalizeName } from '../canon/lookup'
import type { CatalogueEntry } from './types'
import type { Character } from '../character'

/* ===========================================================================
   ONE ENTRY, OPENED — Open Book slice 3.

   Seeded from HIS EXPORT for the reason `build.test.ts:12` gives: the claims
   here are claims about what HIS Grimoire will say, and a hand-built character
   would only test my belief about his sheet. Skipped, loudly, when the file is
   not there.

   THE CLAIM THIS FILE IS FOR: a locked entry is not a withheld entry. Every
   band, every fact and every word of tactics is assembled for something he
   cannot use for another two levels, exactly as it is for something he cast
   last night. That is Marcus's own instruction — "visually locked, but still
   provide me the ability to see them and their details" — and it is the one
   thing about this screen that is easy to get wrong in a way nobody notices,
   because the failure looks like a tidy screen.
   ========================================================================= */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

function nixOrNull(): Character | null {
  try {
    return JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    return null
  }
}

const nix = nixOrNull()
const catalogue = nix ? buildCatalogue(nix) : []

function find(name: string): CatalogueEntry {
  const key = normalizeName(name)
  const entry = catalogue.find(e => e.key === key)
  if (!entry) throw new Error(`${name} is not in the catalogue — the fixture or the builder changed`)
  return entry
}

describe.skipIf(!nix)('entryDetail — a locked entry is not a withheld entry', () => {
  /** Level 3, his at level 9. The mockup's own worked example (02b). */
  const LOCKED = 'Aura of Vitality'

  it('the locked entry exists, is locked, and is a spell — the premise, checked', () => {
    // Guards every assertion below: if canon renamed it or the builder stopped
    // locking it, the tests that follow would pass against the wrong shape.
    const entry = find(LOCKED)
    expect(entry.lockedUntil).toBe(9)
    expect(entry.spellLevel).toBe(3)
    expect(nix!.level).toBeLessThan(9)
  })

  it('all three bands are assembled in full', () => {
    const detail = entryDetail(find(LOCKED), nix!)
    expect(detail.bands.provenance).toBe('canon')
    expect(detail.bands.facts.length).toBeGreaterThan(4)
    expect(detail.bands.whatItDoes.length).toBeGreaterThan(80)
    expect(detail.bands.tactics.length).toBeGreaterThan(0)
  })

  it('band 2 is not truncated for a locked entry any more than for an open one', () => {
    const locked = entryDetail(find(LOCKED), nix!)
    const open = entryDetail(find('Searing Smite'), nix!)
    expect(locked.bands.whatItDoes).not.toMatch(/…|\.\.\.$/)
    // Not "both are long" — both are the WHOLE of what canon holds.
    expect(locked.bands.whatItDoes).toBe(find(LOCKED).canonSpell!.summary)
    expect(open.bands.whatItDoes).toBe(find('Searing Smite').canonSpell!.summary)
  })

  it('the lock is a sentence naming the level and the gap', () => {
    const detail = entryDetail(find(LOCKED), nix!)
    expect(detail.lock).not.toBeNull()
    expect(detail.lock!.unlocksAt).toBe(9)
    expect(detail.lock!.text).toContain('level 9')
    expect(detail.lock!.text).toContain(`You're level ${nix!.level}`)
    expect(detail.lock!.text).toContain("can't prepare")
  })

  it('the slot half is SUPPRESSED on his raw export, and appears once he adopts', () => {
    /* FOUND BY THIS TEST FAILING, 2026-08-29, and worth pinning rather than
     * editing away. The sentence has a second reason — "and you don't have
     * 3rd-level slots yet" — and on the sheet in his Downloads folder it does
     * not appear, because that sheet still carries the phantom 3rd-level slots
     * that are item 4 of his eleven. The lock notice is reading his sheet
     * correctly; his sheet is wrong.
     *
     * So the two are coupled, and the coupling is the right way round: the
     * Slot Truth repair is a door he presses, and pressing it makes this
     * sentence MORE complete, never less. Asserted both ways so that a
     * regression in either direction is visible here. */
    expect(entryDetail(find(LOCKED), nix!).lock!.text).not.toContain('slots yet')

    const adopted: Character = {
      ...nix!,
      spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 } },
    }
    expect(entryDetail(find(LOCKED), adopted).lock!.text).toContain("don't have 3rd-level slots yet")
  })

  it('an unlocked entry has no lock at all', () => {
    expect(entryDetail(find('Searing Smite'), nix!).lock).toBeNull()
  })
})

describe.skipIf(!nix)('entryDetail — the slot row', () => {
  it('names the ordinal and what he actually holds', () => {
    const detail = entryDetail(find('Searing Smite'), nix!)
    const slot = detail.bands.facts.find(f => f.label === 'Slot')
    expect(slot, 'a levelled spell gets a slot row').toBeDefined()
    const held = nix!.spellSlots[1]!
    expect(slot!.value).toBe(`1st — you have ${held.current} of ${held.max}`)
  })

  it("says 'none yet' rather than 0 when the level is absent from the sheet", () => {
    // THE DIFFERENCE THAT IS THE WHOLE OF ITEM 4. A level he has never been
    // granted is absent from `spellSlots`; a level he has spent dry is present
    // and reads 0. Painting both as "0" is what made the phantom 3rd-level row
    // believable in the first place.
    const noThirds: Character = {
      ...nix!,
      spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 } },
    }
    const detail = entryDetail(find('Aura of Vitality'), noThirds)
    expect(detail.bands.facts.find(f => f.label === 'Slot')!.value).toBe('3rd — none yet')

    const dry: Character = { ...noThirds, spellSlots: { ...noThirds.spellSlots, 3: { max: 2, current: 0 } } }
    expect(entryDetail(find('Aura of Vitality'), dry).bands.facts.find(f => f.label === 'Slot')!.value)
      .toBe('3rd — you have 0 of 2')
  })

  it('a cantrip gets no slot row, because it costs no slot', () => {
    /* HIS CATALOGUE CONTAINS NO CANTRIP — measured here, not assumed: a 2024
     * Paladin has no cantrip list and Changeling grants none. So this is built
     * rather than found, and the count is asserted so that the day a cantrip
     * DOES arrive (a feat, a magic item, an oath revision) this test starts
     * exercising a real row instead of only a synthetic one. */
    expect(catalogue.filter(e => e.kind === 'spell' && e.spellLevel === 0)).toHaveLength(0)
    const cantrip: CatalogueEntry = { ...find('Searing Smite'), spellLevel: 0 }
    expect(entryDetail(cantrip, nix!).bands.facts.some(f => f.label === 'Slot')).toBe(false)
  })

  it('a feature gets no slot row either', () => {
    expect(entryDetail(find('Hearthfire Manifest'), nix!).bands.facts.some(f => f.label === 'Slot')).toBe(false)
  })
})

describe.skipIf(!nix)('entryDetail — the sub-line and the tags', () => {
  it('a spell names its level, school, origin and book', () => {
    const detail = entryDetail(find('Searing Smite'), nix!)
    expect(detail.subtitle).toContain('Level 1')
    expect(detail.subtitle).toContain(find('Searing Smite').canonSpell!.school)
    expect(detail.subtitle).toContain('·')
  })

  it("a feature answers 'why do I have this' with the level it arrived at", () => {
    const detail = entryDetail(find('Hearthfire Manifest'), nix!)
    expect(detail.subtitle).toMatch(/from Paladin level \d+/)
  })

  it('a locked entry leads with its lock chip', () => {
    const tags = entryDetail(find('Aura of Vitality'), nix!).tags
    expect(tags[0]).toEqual({ label: 'Level 9', tone: 'locked' })
  })

  it('always-prepared beats prepared, because they are not the same claim', () => {
    const always = catalogue.find(e => e.alwaysPrepared)
    expect(always, 'his oath grants at least one always-prepared spell').toBeDefined()
    const labels = entryDetail(always!, nix!).tags.map(t => t.label)
    expect(labels).toContain('Always prepared')
    expect(labels).not.toContain('Prepared')
  })
})

/* ===========================================================================
   THE PROMOTIONS — Gate 3 decision 3, and the place a fact goes missing.

   Band 1 is a LAYOUT, not a dump: the cost becomes a hero line, the dice become
   a 34px numeral, the upcast and the book drop into band 2. Four facts leave the
   grid. The panel is not told which are safe to draw — it is told which were
   TAKEN (`consumed`) and draws everything else, so an unknown label lands in the
   grid by construction rather than by an allowlist somebody remembered to update.

   These tests are about the seam, not the styling: that a promotion keeps every
   character it was handed, and that `consumed` never names a row the layout did
   not actually take.
   ========================================================================= */
describe.skipIf(!nix)('entryDetail — the promotions keep what they move', () => {
  it('the casting time splits at the first comma and BOTH halves survive', () => {
    const detail = entryDetail(find('Divine Smite'), nix!)
    expect(detail.cost).not.toBeNull()
    expect(detail.cost!.word).toBe('Bonus Action')
    expect(detail.cost!.tone).toBe('bonus')
    expect(detail.cost!.when).toMatch(/^taken immediately after hitting/)

    // The invariant, not a sample of it: the two halves rejoin to canon's
    // string character for character, everywhere the seam is exercised.
    const commas = catalogue.filter(e => {
      const value = entryDetail(e, nix!).bands.facts.find(f => f.label === 'Casting Time')?.value
      return value?.includes(',') ?? false
    })
    expect(commas.length, 'the comma seam is exercised by his catalogue').toBeGreaterThan(0)
    for (const entry of commas) {
      const d = entryDetail(entry, nix!)
      const canon = d.bands.facts.find(f => f.label === 'Casting Time')!.value
      expect(`${d.cost!.word}, ${d.cost!.when}`, entry.name).toBe(canon)
    }
  })

  it('a cost canon priced in minutes is NOT coloured as an Action', () => {
    /* FOUND 2026-08-29 by measuring the parse across all 84 entries. The tone
     * fell through to 'action' for anything that said neither "bonus" nor
     * "reaction", and Prayer of Healing costs 10 minutes. The word on screen was
     * canon's and correct; the colour was a claim he could act on at a table.
     * Pinned here because it is invisible in a screenshot of any other spell. */
    const detail = entryDetail(find('Prayer of Healing'), nix!)
    expect(detail.cost!.word).toBe('10 minutes')
    expect(detail.cost!.tone).toBe('time')
  })

  it('no entry claims a turn slot canon did not name', () => {
    for (const entry of catalogue) {
      const cost = entryDetail(entry, nix!).cost
      if (!cost || cost.tone === 'passive') continue
      // A slot tone is only ever claimed off canon's own word, or off the
      // builder's `turnCost`, which named the slot itself.
      const fromCanon = new RegExp(cost.tone === 'action' ? 'action' : cost.tone, 'i').test(cost.word)
      expect(fromCanon || cost.tone === 'time', `${entry.name} — "${cost.word}" → ${cost.tone}`).toBe(true)
    }
  })

  it("canon that priced nothing gets no hero line, rather than a guessed one", () => {
    const solace = find('Aura of Solace')
    expect(solace.turnCost, 'the premise: the builder could not price it').toBe('other')
    expect(entryDetail(solace, nix!).cost).toBeNull()
    // And it loses nothing by it — the bands are assembled in full regardless.
    expect(entryDetail(solace, nix!).bands.whatItDoes.length).toBeGreaterThan(40)
  })

  it('the numeral picks damage over healing, and healing over a feature die', () => {
    expect(entryDetail(find('Divine Smite'), nix!).hero).toMatchObject({ dice: '2d8', tone: 'damage' })
    expect(entryDetail(find('Cure Wounds'), nix!).hero).toMatchObject({ dice: '2d8', tone: 'healing' })
    expect(entryDetail(find('Hearthfire Manifest'), nix!).hero).toMatchObject({ dice: '1d10', tone: 'ward' })
  })

  it('a row the numeral could not carry in full KEEPS its place in the grid', () => {
    /* Hearthfire Manifest's die is a feature fact, and `factsFromFeature` adds
     * to it — "— free: no Action, no Bonus Action, no Reaction, no use". The
     * numeral carries "1d10" and canon's words after it; it does not carry the
     * free clause. So the promotion must NOT consume the row, and does not.
     * This is the difference between a promotion and a deletion. */
    const detail = entryDetail(find('Hearthfire Manifest'), nix!)
    expect(detail.hero).not.toBeNull()
    const row = detail.bands.facts.find(f => f.value.includes('1d10'))
    expect(row, 'the die still has a grid row').toBeDefined()
    expect(row!.value.length).toBeGreaterThan(detail.hero!.dice.length)
    expect(row!.label, 'canon labelled it, so the grid can find it again').not.toBeNull()
    expect(detail.consumed).not.toContain(row!.label!)
  })

  it('a hero cost built from turnCost consumes nothing, because it took nothing', () => {
    const detail = entryDetail(find('Hearthfire Manifest'), nix!)
    expect(detail.cost!.word).toBe('Reaction')
    expect(detail.bands.facts.some(f => f.label === 'Casting Time')).toBe(false)
    expect(detail.consumed).not.toContain('Casting Time')
  })

  it('EVERY entry: `consumed` names only rows that are actually there', () => {
    /* The whole point of `consumed` is that the panel subtracts it from the
     * grid. A label in this list that is not in `facts` is harmless; a row that
     * the layout took but did not declare is drawn twice; and — the one that
     * matters — nothing may end up in neither place. Checked across all 84
     * rather than on the three entries I happened to think of. */
    for (const entry of catalogue) {
      const detail = entryDetail(entry, nix!)
      const labels = detail.bands.facts.map(f => f.label)
      for (const taken of detail.consumed) {
        expect(labels, `${entry.name} declared ${taken} consumed`).toContain(taken)
      }
      expect(new Set(detail.consumed).size, `${entry.name} consumed a label twice`).toBe(
        detail.consumed.length,
      )
      // Nothing may fall between the two: every fact is either drawn by the
      // grid or accounted for by a promotion that is non-null.
      // A `null` label is a bare detail segment; it can never be promoted, so
      // it is always drawn. The set is widened rather than the labels narrowed,
      // because narrowing them here would quietly drop those rows from the count.
      const promoted = new Set<string | null>(detail.consumed)
      const drawn = labels.filter(l => !promoted.has(l))
      expect(drawn.length + promoted.size, `${entry.name} — a promoted row appears twice`)
        .toBe(labels.length)
    }
  })

  it('the upcast box and the book are lifted, and lifted exactly', () => {
    const detail = entryDetail(find('Divine Smite'), nix!)
    expect(detail.higherLevel).toBe(detail.bands.facts.find(f => f.label === 'Higher Level')!.value)
    expect(detail.source).toBe(detail.bands.facts.find(f => f.label === 'Source')!.value)
    expect(detail.consumed).toEqual(expect.arrayContaining(['Higher Level', 'Source']))
  })

  it('an entry with no upcast says so with null, not with an empty box', () => {
    const solace = entryDetail(find('Aura of Solace'), nix!)
    expect(solace.higherLevel).toBeNull()
    expect(solace.consumed).not.toContain('Higher Level')
  })
})

describe.skipIf(!nix)('entryDetail — the open-world rule survives the second caller', () => {
  it("something canon has never heard of keeps its own words and says whose they are", () => {
    const homebrew: CatalogueEntry = {
      key: 'kettle-of-unlikely-provenance',
      name: 'Kettle of Unlikely Provenance',
      kind: 'spell',
      provenance: 'sheet',
      lockedUntil: null,
      spellLevel: 2,
      turnCost: 'action',
      origin: 'Your sheet',
      prepared: true,
      alwaysPrepared: false,
      preparable: true,
      onSheet: true,
      sheetText: 'A kettle appears. Canon has never heard of it.',
      canonSpell: null,
      canonFeature: null,
      canonFeat: null,
    }
    const detail = entryDetail(homebrew, nix!)
    expect(detail.bands.provenance).toBe('sheet')
    expect(detail.bands.whatItDoes).toBe(homebrew.sheetText)
    // It still gets band 1 — the fallback source row plus its own slot row.
    expect(detail.bands.facts.some(f => f.label === 'Source')).toBe(true)
    expect(detail.bands.facts.some(f => f.label === 'Slot')).toBe(true)
    // And band 3 stays empty rather than inventing advice.
    expect(detail.bands.tactics).toEqual([])
  })
})

describe('lockNoticeFor — the arithmetic, without a fixture', () => {
  const base = (over: Partial<CatalogueEntry>): CatalogueEntry => ({
    key: 'x', name: 'X', kind: 'spell', provenance: 'canon',
    lockedUntil: null, spellLevel: null, turnCost: 'action', origin: 'Paladin',
    prepared: false, alwaysPrepared: false, preparable: false, onSheet: false,
    sheetText: null, canonSpell: null, canonFeature: null, canonFeat: null,
    ...over,
  })
  const at = (level: number, slots: Character['spellSlots']): Character =>
    ({ level, spellSlots: slots } as Character)

  it('is null when nothing is locked', () => {
    expect(lockNoticeFor(base({}), at(7, {}))).toBeNull()
  })

  it('says "one level off" in the singular', () => {
    const notice = lockNoticeFor(base({ lockedUntil: 9 }), at(8, {}))
    expect(notice!.text).toContain('one level off')
    expect(notice!.text).not.toContain('levels off')
  })

  it('drops the slot half when he already holds slots of that level', () => {
    const notice = lockNoticeFor(
      base({ lockedUntil: 9, spellLevel: 3 }),
      at(7, { 3: { max: 2, current: 2 } }),
    )
    expect(notice!.text).not.toContain('slots yet')
  })

  it('adds the slot half when he does not', () => {
    const notice = lockNoticeFor(base({ lockedUntil: 9, spellLevel: 3 }), at(7, {}))
    expect(notice!.text).toContain("don't have 3rd-level slots yet")
  })
})
