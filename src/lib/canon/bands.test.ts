import { readFileSync, existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { canonBands, withSaveDC, type BandInput } from './bands'
import { spellByName, featureByName, featByName } from './lookup'
import { HOUSE_NOTE_NAMES } from './feature-notes'
import { CLASS_FEATURES } from '../../canon'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'

/* ===========================================================================
   THE THREE BANDS — Open Book slice 2.

   This module was extracted from `turn/detail.ts`, which has shipped and is
   proved. The extraction's whole claim is that NOTHING CHANGED, and that claim
   is made in three places, none of which subsumes the others:

     · `turn/detail.ts`'s existing suite, NOT EDITED, still green.
     · `docs/plans/grimoire/_snap/detail-BEFORE.json` — `optionDetail` dumped for
       every option on two sheets at three economy states, hashed before the move
       and after it. Identical.
     · `docs/plans/grimoire/shoot-detail.mjs` — nine detail sheets photographed
       in a real browser on both builds, PNGs hashed.

   What THIS file adds is the claim the other three cannot make: that the bands
   are correct on their own terms, and — the structural test at the bottom —
   that both callers are now unable to go around them.
   ========================================================================= */

const CHAR = NIX as Character

/** The turn layer's own call shape, so these tests exercise the same door the
 *  combat sheet goes through rather than a convenience wrapper. */
function bandsFor(name: string, fallbackText = 'the sheet said this') {
  const input: BandInput = {
    name,
    spell: spellByName(name) ?? null,
    feature: featureByName(name) ?? null,
    feat: featByName(name) ?? null,
    fallbackText,
    fallbackFacts: [{ label: 'Cost', value: 'Action' }],
  }
  return canonBands(input, CHAR)
}

describe('canonBands — a spell', () => {
  it("band 1 carries canon's own rows, in canon's order", () => {
    const bands = bandsFor('Searing Smite')
    expect(bands.provenance).toBe('canon')
    const labels = bands.facts.map(f => f.label)
    // Not an exhaustive list — the point is that these come from `statBlock`
    // rather than from the fallback, which has exactly one row called Cost.
    expect(labels).toContain('Level')
    expect(labels).toContain('Casting Time')
    expect(labels).toContain('Duration')
    expect(bands.facts.length).toBeGreaterThan(4)
  })

  it('the Save row is prefixed with HIS DC, and canon\'s effect is kept', () => {
    const bands = bandsFor('Searing Smite')
    const save = bands.facts.find(f => f.label === 'Save')
    expect(save, 'Searing Smite has a save row in canon').toBeDefined()
    expect(save!.value.startsWith(`DC ${CHAR.spellSaveDC} `)).toBe(true)
    // A prefix, not a replacement: whatever canon said after the ability name
    // is still there. This is the half a "DC 16 Constitution" rewrite would eat.
    expect(save!.value.length).toBeGreaterThan(`DC ${CHAR.spellSaveDC} Constitution`.length)
  })

  it('band 2 is the full paragraph, never truncated', () => {
    const bands = bandsFor('Searing Smite')
    const canon = spellByName('Searing Smite')!
    expect(bands.whatItDoes).toBe(canon.summary)
    expect(bands.whatItDoes).not.toMatch(/…|\.\.\.$/)
    expect(bands.whatItDoes.length).toBeGreaterThan(80)
  })

  it("band 3 keeps canon's capitals, and is personalised", () => {
    const bands = bandsFor('Searing Smite')
    expect(bands.tactics.length).toBeGreaterThan(0)
    const leads = bands.tactics.map(b => b.lead).filter(Boolean) as string[]
    expect(leads.length).toBeGreaterThan(0)
    // `splitTactics` detects headings by their capitals; a lead that came back
    // title-cased would mean the text was rewritten before it was split.
    expect(leads.some(l => l === l.toUpperCase())).toBe(true)
  })
})

describe('canonBands — a feature', () => {
  it("band 1 comes from the mechanics bag, not from the fallback", () => {
    const bands = bandsFor('Hearthfire Manifest')
    expect(bands.provenance).toBe('canon')
    expect(bands.featureFacts.length).toBeGreaterThan(0)
    expect(bands.facts.length).toBe(bands.featureFacts.length)
    expect(bands.facts.map(f => f.label)).not.toEqual(['Cost'])
  })

  it('a computed fact shows its working', () => {
    // "12 temp HP (Paladin level + Charisma modifier)" — the number AND the
    // formula, because a derived number Marcus cannot check is a number he has
    // to trust. `feature.ts` classifies; this asserts the classification
    // survives the move into a `BandFact`.
    const bands = bandsFor('Hearthfire Manifest')
    const computed = bands.featureFacts.filter(f => f.shape === 'computed' && f.raw !== f.value)
    expect(computed.length, 'Hearthfire Manifest has at least one formula').toBeGreaterThan(0)
    for (const fact of computed) {
      const painted = bands.facts.find(f => f.label === fact.label)!
      expect(painted.value).toBe(`${fact.value} (${fact.raw})`)
    }
  })

  it('a spell has no feature facts, so the turn layer rolls nothing from them', () => {
    expect(bandsFor('Searing Smite').featureFacts).toHaveLength(0)
  })

  it('band 3 is empty for a feature nobody has written advice for', () => {
    /* Empty is HONEST. The alternative is inventing advice unasked, which is the
       one thing this module refuses to fall back on.

       THE SUBJECT CHANGED IN 9b AND THE CLAIM DID NOT. This test said "canon
       files tactics on spells only" and used Hearthfire Manifest to prove it.
       Both halves of that turned out to be wrong: 9a found `CanonFeature.notes`
       on three features, and 9b gave Hearthfire Manifest a house note — so it
       went red with its four bullets printed in the diff, which is the review
       this suite is for. Faithful Steed carries neither, which is what the
       sentence above was always actually about. */
    expect(featureByName('Faithful Steed'), 'the new subject left canon').not.toBeNull()
    expect(bandsFor('Faithful Steed').tactics).toEqual([])
  })
})

describe('canonBands — a feat, added in slice 3', () => {
  /* Until slice 3 a feat got the caller's fallback for band 1 and an empty band
     3, so Sentinel and Lucky — two of the eleven things actually on his sheet —
     opened to one row saying "Feat" and no advice, while canon held a category,
     a prerequisite and a paragraph of Paladin-specific guidance. */

  it('band 1 comes from canon rather than from the fallback', () => {
    const bands = bandsFor('Sentinel')
    expect(bands.provenance).toBe('canon')
    expect(bands.facts.map(f => f.label)).not.toEqual(['Cost'])
    expect(bands.facts.length).toBeGreaterThan(0)
  })

  it("band 3 is canon's own note for a Paladin, when canon wrote one", () => {
    const withNote = ['Sentinel', 'Lucky', 'War Caster']
      .map(name => ({ name, feat: featByName(name) }))
      .filter(r => r.feat?.paladinNote)
    expect(withNote.length, 'canon writes a paladinNote on at least one feat').toBeGreaterThan(0)
    for (const { name, feat } of withNote) {
      const tactics = bandsFor(name).tactics
      expect(tactics.length, `${name} has advice`).toBeGreaterThan(0)
      // Canon's words, rejoined, are canon's words. No invention, no trimming.
      const rejoined = tactics.map(b => (b.lead ?? '') + b.body).join('')
      expect(rejoined.replace(/\s+/g, ' ').trim())
        .toBe(feat!.paladinNote!.replace(/\s+/g, ' ').trim())
    }
  })

  it('a feat canon has no note for gets an empty band 3, not an invented one', () => {
    const bare = { name: 'Nothing At All', effects: ['It does a thing.'] }
    const bands = canonBands(
      {
        name: 'Nothing At All', spell: null, feature: null, feat: bare,
        fallbackText: 'the sheet said this', fallbackFacts: [{ label: 'Cost', value: 'Action' }],
      },
      CHAR
    )
    expect(bands.tactics).toEqual([])
    expect(bands.whatItDoes).toBe('It does a thing.')
    // No category, no prerequisite — band 1 holds its place with the fallback
    // rather than collapsing. Same rule as a feature with an empty bag.
    expect(bands.facts).toEqual([{ label: 'Cost', value: 'Action' }])
  })

  it('THE TURN LAYER CANNOT REACH THIS BRANCH — it passes feat: null', () => {
    /* The slice-2 proof that the combat sheet does not move is a snapshot taken
       before slice 3 existed. This is the claim that keeps that proof valid as
       slice 3 widens the module underneath it: the branch above is unreachable
       from `turn/detail.ts`, structurally, not by sampling. */
    const source = readFileSync('src/lib/turn/detail.ts', 'utf8')
    expect(source.length, 'turn/detail.ts read as empty').toBeGreaterThan(1000)
    expect(source).toMatch(/\bfeat:\s*null\b/)
    // And there is exactly one `feat:` in it, so there is no second call site
    // quietly passing a real one.
    expect(source.match(/\bfeat:\s*/g)).toHaveLength(1)
  })
})

describe('canonBands — the open-world rule', () => {
  const HOMEBREW: BandInput = {
    name: 'Kettle of Unlikely Provenance',
    spell: null,
    feature: null,
    feat: null,
    fallbackText: 'A kettle appears. Canon has never heard of it.',
    fallbackFacts: [
      { label: 'Cost', value: '2nd slot' },
      { label: null, value: '2d6 steam' },
    ],
  }

  it('an item canon has never heard of still gets all three bands', () => {
    const bands = canonBands(HOMEBREW, CHAR)
    expect(bands.provenance).toBe('sheet')
    expect(bands.facts).toEqual(HOMEBREW.fallbackFacts)
    expect(bands.whatItDoes).toBe(HOMEBREW.fallbackText)
    expect(bands.tactics).toEqual([])
    expect(bands.errata).toEqual([])
  })

  it('a canon record with nothing in its mechanics bag falls back rather than painting nothing', () => {
    // The band holds its place. `optionDetail` has relied on this since Table
    // Truth slice 7 and the reason is in `OptionDetailSheet.tsx:29` — a band
    // that collapses lets the others slide up and the eye loses the shape.
    const bare = { name: 'Nothing At All', level: 1, rawText: 'It does a thing.' }
    const bands = canonBands(
      { ...HOMEBREW, feature: bare, fallbackFacts: [{ label: 'Cost', value: 'Action' }] },
      CHAR
    )
    expect(bands.facts).toEqual([{ label: 'Cost', value: 'Action' }])
    expect(bands.whatItDoes).toBe('It does a thing.')
    expect(bands.provenance).toBe('canon')
  })
})

describe('withSaveDC', () => {
  it('leaves a row that already names a DC alone', () => {
    const facts = [{ label: 'Save', value: 'DC 19 Dexterity — negates' }]
    expect(withSaveDC(facts, CHAR)).toEqual(facts)
  })

  it('leaves everything alone when the sheet has no DC', () => {
    const facts = [{ label: 'Save', value: 'Dexterity — negates' }]
    expect(withSaveDC(facts, { ...CHAR, spellSaveDC: 0 } as Character)).toEqual(facts)
  })

  it('touches only the Save row', () => {
    const facts = [
      { label: 'Damage', value: '2d8 Radiant' },
      { label: 'Save', value: 'Constitution — half' },
    ]
    const out = withSaveDC(facts, CHAR)
    expect(out[0]).toEqual(facts[0])
    expect(out[1].value).toBe(`DC ${CHAR.spellSaveDC} Constitution — half`)
  })
})

describe('errata reach the bands, so both screens get them', () => {
  it('a feature canon has recorded problems with carries them here', () => {
    // Before this module the Grimoire had no route to errata at all: they were
    // assembled inside `turn/detail.ts` and the combat sheet was the only
    // caller. This is the assertion that the second screen can now have them.
    const withErrata = ['Hearthfire Manifest', 'Searing Smite', 'Divine Smite']
      .map(name => ({ name, count: bandsFor(name).errata.length }))
      .filter(r => r.count > 0)
    expect(withErrata.length, 'canon records errata on at least one of these').toBeGreaterThan(0)
    for (const { name } of withErrata) {
      for (const erratum of bandsFor(name).errata) {
        expect(erratum.id).toBeTruthy()
        expect(erratum.problem).toBeTruthy()
      }
    }
  })
})

describe('neither caller reaches past this module', () => {
  /* ===========================================================================
     THE STRUCTURAL TEST, and the reason the extraction is worth a slice.

     FINDING BG: prefer a claim that FORBIDS a fault to one that failed to
     observe it. Sampling the two screens for identical output would pass on the
     day it was written and say nothing about the day someone adds a fourth band
     to one of them. This says the door is the only door.

     It greps SOURCE, not behaviour, which is the only way to make "there is no
     second route" checkable at all. `catalogue/detail.ts` does not exist until
     slice 3; it is checked the moment it does, so slice 3 cannot introduce the
     drift this slice was run to prevent.
     ========================================================================= */
  /* `statBlockFor` joined the list in Open Book slice 4, the slice that added
     it. A new function outside the guard list is the guard quietly getting
     weaker — and this one is more tempting to reach for than `statBlock` ever
     was, because it is the one that knows the character. (It is also caught by
     the `statBlock` entry as a substring; it is named anyway, so that deleting
     `statBlock` from this list some day does not silently free both.) */
  /* `personaliseText` and `resolvedDice` joined in slice 5, for the same reason
     and with a sharper edge: `resolvedDice` is the ONE answer to `{dice}`, so a
     caller that imported it would be a second place deciding what Cure Wounds
     heals for — which is the exact fault the whole feature exists to remove. */
  /* `reachFor` joined in slice 6. It is the one entry on this list whose second
     caller would not merely drift but would DISAGREE WITH HIS DM: the 10 ft is a
     table ruling that must name The Dawn Guardian on the line every time it
     applies, and a caller that computed reach itself would be free to print a
     bare 10. One place decides, one place attributes. */
  const FORBIDDEN = [
    'statBlock',
    'statBlockFor',
    'resolvedDice',
    'reachFor',
    'splitTactics',
    'personaliseBullets',
    'personaliseText',
    'featureFacts',
  ]
  const CALLERS = ['src/lib/turn/detail.ts', 'src/lib/catalogue/detail.ts']

  it('turn/detail.ts is one of the callers, and it exists', () => {
    // Guards the guard: if the path were wrong, every assertion below would
    // pass against a file that is not there.
    expect(existsSync(CALLERS[0])).toBe(true)
  })

  for (const caller of CALLERS) {
    it(`${caller} imports none of ${FORBIDDEN.join(', ')}`, () => {
      if (!existsSync(caller)) {
        // Slice 3 creates it. Not skipped silently — this line says so.
        expect(caller).toBe('src/lib/catalogue/detail.ts')
        return
      }
      const source = readFileSync(caller, 'utf8')
      const imports = source
        .split('\n')
        .filter(line => /^\s*import\b/.test(line) || /^\s*}\s*from\s*'/.test(line))
        .join('\n')

      /* THE TEST HAS TO PROVE IT READ SOMETHING BEFORE IT PROVES AN ABSENCE.
       *
       * Found the hard way, 2026-08-28. The first micro-revert of this slice
       * restored the old `detail.ts` with `git show ... > file` in PowerShell,
       * whose `>` writes UTF-16 — so `readFileSync(..., 'utf8')` got mojibake,
       * found no `statBlock` in it, and REPORTED GREEN on a file that was in
       * fact the unextracted original. A "not.toContain" assertion passes
       * perfectly against an empty string, and an empty string is exactly what
       * an unreadable or truncated file looks like from here. The revert only
       * went red once this line existed to notice.
       *
       * A structural claim that cannot tell "the symbol is absent" from "I read
       * nothing" is not a structural claim. */
      expect(imports, `${caller} yielded no import lines — read as ${source.length} chars`)
        .toMatch(/^\s*import\b/m)

      for (const symbol of FORBIDDEN) {
        expect(imports, `${caller} imports ${symbol} directly`).not.toContain(symbol)
      }
    })
  }
})

/* ===========================================================================
   BAND ③ FOR A FEATURE — Combat Open Book slice 9.

   `04-slices.md` scoped this slice as "I write tactical advice and the card
   presents it in canon's voice", and flagged it as a different KIND of act from
   the eight before it, all of which only re-arranged words that already
   existed. It turned out not to be that act — for these, anyway. Canon ships a
   `notes` array on three features and nothing has ever read it, so band ③ for
   Lay On Hands and Aura of Protection is canon's own text, not mine.

   The two abilities `04-slices.md` names that canon has NO notes for — Channel
   Divinity and Hearthfire Manifest — are still the invented half, and are still
   Marcus's to read before they ship. They are not in this file, because they
   are not in the app.
   ========================================================================= */
describe('band ③ prints the advice canon already wrote for a feature', () => {
  it('Lay On Hands: the highest-value use is on the card, in canon voice', () => {
    const bullets = bandsFor('Lay On Hands').tactics
    expect(bullets.length, 'band 3 is empty — canon\'s notes are being dropped').toBeGreaterThan(0)
    const bodies = bullets.map(b => b.body)
    // Verbatim from `paladin-progression.json`. Asserted as a substring of one
    // bullet rather than reformatted, because the claim is that nothing was
    // rewritten on the way to the screen.
    expect(bodies.some(b => b.includes('revives a creature at 0 HP'))).toBe(true)
    expect(bodies.some(b => b.includes('Does not work on Constructs or Undead'))).toBe(true)
  })

  it('Aura of Protection: the aura reaches him too, which canon had to say twice', () => {
    const bodies = bandsFor('Aura of Protection').tactics.map(b => b.body)
    expect(bodies.some(b => b.includes('You DO benefit from your own aura'))).toBe(true)
  })

  it('is canon verbatim — every bullet matches a note, none invented', () => {
    /* THE INVARIANT, not the instance. `tactics.ts` promises a splitter may
       never drop, reorder or invent; this branch does not split at all, so the
       equivalent promise is one bullet per note, in order, unchanged. If a
       later edit routes these through `splitTactics` after all, this goes red
       rather than quietly re-cutting canon's sentences. */
    for (const name of ['Lay On Hands', 'Aura of Protection', 'Radiant Strikes']) {
      const notes = featureByName(name)?.notes
      expect(notes, `${name} lost its canon notes`).toBeDefined()
      const bullets = bandsFor(name).tactics
      expect(bullets.map(b => b.body), name).toEqual([...notes!])
      expect(bullets.every(b => b.lead === null), `${name} invented a heading`).toBe(true)
    }
  })

  it('stays empty for the features nobody has notes for', () => {
    /* Empty is the honest answer and the slice must not have quietly grown a
       fallback.

       THIS TEST WENT RED ON PURPOSE IN 9b, AND THAT WAS THE POINT. As written in
       9a it also named Channel Divinity and Hearthfire Manifest, with the note:
       "the day house-written advice arrives it must arrive deliberately, and go
       red here first". It did — `vitest -t "stays empty"` failed with the three
       Channel Divinity bullets printed in the diff — and the two names moved to
       the 9b block below, where their source is asserted rather than their
       absence. Extra Attack stays here because nothing has an opinion about it,
       and the day something does this must go red again. */
    for (const name of ['Extra Attack', 'Faithful Steed', 'Weapon Mastery']) {
      expect(featureByName(name), `${name} left canon`).not.toBeNull()
      expect(bandsFor(name).tactics, `${name} grew advice from somewhere`).toEqual([])
      expect(bandsFor(name).tacticsSource, `${name} named a voice for no words`).toBeNull()
    }
  })

  it('a spell still wins over a feature of the same name', () => {
    /* Divine Smite is canon's level 1 SPELL and his sheet's class feature — the
       collision `catalogue/types.ts` names in its header. The new branch sits
       BELOW the spell branch, so it cannot capture a record that has both. */
    const bullets = bandsFor('Divine Smite').tactics
    expect(bullets.length).toBeGreaterThan(0)
    expect(bullets.some(b => b.lead !== null), 'read as notes, not as canon tactics').toBe(true)
  })
})

/* ===========================================================================
   BAND ③ IN THE APP'S OWN VOICE — Open Book slice 9b.

   `feature-notes.ts` is the only text on the card nobody in canon wrote. These
   tests own the one thing that makes that acceptable: that it is LABELLED. A
   suite that checked the words appeared and not whose they were would pass on
   the exact failure the field was added to prevent.
   ========================================================================= */
describe("band ③ says whose voice it is in", () => {
  it('gives the two note-less abilities advice, marked as the app’s own', () => {
    for (const name of HOUSE_NOTE_NAMES) {
      const bands = bandsFor(name)
      expect(bands.tactics.length, `${name} has a house note and printed nothing`).toBeGreaterThan(0)
      expect(bands.tacticsSource, `${name} passed the app’s words off as canon’s`).toBe('house')
    }
  })

  it('is exactly the two Marcus approved — a third needs a decision, not a commit', () => {
    /* The count, not the contents. `feature-notes.ts` shipped under the condition
       that anything added there gets the same approval the first two got; this is
       what makes that condition cost something. Raising the number is allowed —
       raising it silently is not. */
    expect(HOUSE_NOTE_NAMES).toHaveLength(2)
  })

  it('canon outranks the house, so a canon note added later wins on its own', () => {
    /* THE PRECEDENCE, EXERCISED RATHER THAN READ OFF THE BRANCH ORDER. A synthetic
       feature carrying the name of a house entry AND a `notes` array is exactly
       what a future canon package looks like from inside `adviceFor`. If the house
       branch ever moves above the canon one this goes red, and `feature-notes.ts`
       stops being able to make its own docstring's promise. */
    const bands = canonBands(
      {
        name: 'Channel Divinity',
        spell: null,
        feature: { level: 3, name: 'Channel Divinity', rawText: 'x', notes: ['Canon spoke up.'] },
        feat: null,
        fallbackText: 'the sheet said this',
        fallbackFacts: [],
      },
      CHAR
    )
    expect(bands.tactics.map(b => b.body)).toEqual(['Canon spoke up.'])
    expect(bands.tacticsSource).toBe('canon')
  })

  it('follows the sheet’s own name for an ability to the canon record beneath it', () => {
    /* THE BUG THE BROWSER FOUND, and the reason slice 8's rule about proving in a
       browser is not ceremony. His sheet calls the Hearthfire cloak "Flaming
       Cloak"; `lookup.ts` reconciles that alias and hands `canonBands` the
       Hearthfire Manifest record with the sheet's label still in `input.name`.
       Keyed off the label, the house note missed — band ③ was on the Grimoire
       card and absent from the Combat card for the same ability, which is the
       exact complaint this phase exists to fix. Two bands rendered where three
       should have, observed at localhost:5175 before this line existed. */
    const feature = featureByName('Flaming Cloak')
    expect(feature?.name, 'the alias stopped resolving; this test is now vacuous')
      .toBe('Hearthfire Manifest')

    const bands = canonBands(
      {
        name: 'Flaming Cloak',
        spell: null,
        feature: feature ?? null,
        feat: null,
        fallbackText: 'the sheet said this',
        fallbackFacts: [],
      },
      CHAR
    )
    expect(bands.tactics.length, 'the sheet’s name lost him the advice').toBeGreaterThan(0)
    expect(bands.tacticsSource).toBe('house')
  })

  it('a canon-noted feature is still marked canon, so the label discriminates', () => {
    /* Without this the previous tests pass against a field hard-wired to 'house'. */
    expect(bandsFor('Lay On Hands').tacticsSource).toBe('canon')
    expect(bandsFor('Sacred Flame').tacticsSource).toBe('canon')
  })

  it('house advice gets his numbers too, not canon’s placeholders', () => {
    /* `{saveDC}` is written into the Channel Divinity note. If house text skipped
       `personaliseBullets` the card would print him the brace.

       THE EXPECTED NUMBER IS READ OFF THE FIXTURE, not typed in: a hard-coded 16
       would still pass the day Nix's Charisma changes and the card went stale. */
    const dc = String(CHAR.spellSaveDC)
    expect(dc, 'the fixture has no save DC, so this proves nothing').not.toBe('undefined')
    const bodies = bandsFor('Channel Divinity').tactics.map(b => b.body)
    expect(bodies.join(' '), 'an unresolved token reached the card').not.toContain('{')
    expect(bodies.some(b => b.includes(dc)), 'his save DC never landed').toBe(true)
  })

  it('never names a voice for an empty band, and never a band with no voice', () => {
    /* THE INVARIANT THE PANEL RELIES ON. `EntryDetailPanel` only renders the
       subhead when `tactics.length > 0`, and picks its wording off
       `tacticsSource`. The two must move together on EVERY record in the corpus,
       not just the ones a test remembered to name. */
    const names = [
      ...CLASS_FEATURES.map(f => f.name),
      ...HOUSE_NOTE_NAMES,
      'Sacred Flame',
      'Divine Smite',
      'Something Canon Has Never Heard Of',
    ]
    for (const name of names) {
      const { tactics, tacticsSource } = bandsFor(name)
      expect(tactics.length > 0, `${name}: words without a voice`).toBe(tacticsSource !== null)
    }
  })
})
