import { readFileSync, existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { canonBands, withSaveDC, type BandInput } from './bands'
import { spellByName, featureByName, featByName } from './lookup'
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

  it('band 3 is empty for a feature — canon files tactics on spells only', () => {
    // Empty is HONEST. The alternative is inventing advice, which is the one
    // thing this module refuses to fall back on.
    expect(bandsFor('Hearthfire Manifest').tactics).toEqual([])
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
  const FORBIDDEN = ['statBlock', 'splitTactics', 'personaliseBullets', 'featureFacts']
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
