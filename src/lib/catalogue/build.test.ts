import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { buildCatalogue, catalogueSpells } from './build'
import { normalizeName } from '../canon/lookup'
import { CLASS_FEATURES } from '../../canon'
import { NIX } from '../turn/fixtures/nix'
import type { Character, CharacterFeat, Spell } from '../character'

/* ===========================================================================
   THE CATALOGUE — everything Nix can do.

   Open Book slice 1. `docs/plans/grimoire/04-slices.md`.

   THE FIXTURE IS HIS ACTUAL EXPORT, not a hand-built character, for the reason
   `rules-2024/adopt.test.ts:16` gives: a hand-built one is me writing down what
   I believe his sheet says and then testing my belief. The metric this phase
   is measured by — 11 things on screen becoming 84 — is a claim about HIS
   sheet, so it is checked against his sheet. Skipped rather than silently
   passed when the file is absent.
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

/** A spell canon has never heard of. The whole open-world rule needs exactly
 *  one of these to have anything to prove. */
const HOMEBREW: Spell = {
  name: 'Kettle of Unlikely Provenance',
  level: 2,
  school: 'Conjuration',
  castingTime: 'Action',
  range: 'Touch',
  components: 'V, S',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  description: 'A kettle appears. Canon has never heard of it.',
  prepared: true,
}

function withHomebrew(character: Character): Character {
  return { ...character, spells: [...character.spells, HOMEBREW] }
}

describe('buildCatalogue — his real sheet', () => {
  it.skipIf(!nix)('the catalogue is 84 for Nix, itemised 53 / 9 / 16 / 4 / 2', () => {
    const entries = buildCatalogue(nix!)

    const spells = entries.filter(e => e.kind === 'spell')
    const onList = spells.filter(e => e.canonSpell?.onPaladinList)
    const offList = spells.filter(e => e.canonSpell && !e.canonSpell.onPaladinList)
    const classFeatures = entries.filter(e => e.kind === 'feature' && e.origin === 'Paladin')
    const oathFeatures = entries.filter(
      e => e.kind === 'feature' && e.origin === 'Oath of the Hearth',
    )
    const feats = entries.filter(e => e.kind === 'feat')

    expect(onList).toHaveLength(53)
    expect(offList).toHaveLength(9)
    expect(classFeatures).toHaveLength(16)
    expect(oathFeatures).toHaveLength(4)
    expect(feats).toHaveLength(2)
    expect(entries).toHaveLength(84)
  })

  it.skipIf(!nix)('38 of them are locked — 30 spells, 6 class features, 2 oath features', () => {
    const entries = buildCatalogue(nix!)
    const locked = entries.filter(e => e.lockedUntil !== null)

    // The itemised split, because the total alone would survive two errors
    // that cancelled. `01-product.md` first published this as 27 spells + 3
    // off-list; measured, it is 24 + 6. The 30 and the 38 were right.
    expect(locked.filter(e => e.kind === 'spell')).toHaveLength(30)
    expect(locked.filter(e => e.kind === 'feature' && e.origin === 'Paladin')).toHaveLength(6)
    expect(
      locked.filter(e => e.kind === 'feature' && e.origin === 'Oath of the Hearth'),
    ).toHaveLength(2)
    expect(locked).toHaveLength(38)

    // A lock is computed from the rule, never read off canon's frozen boolean.
    for (const entry of locked) expect(entry.lockedUntil!).toBeGreaterThan(nix!.level)
  })

  it.skipIf(!nix)('Divine Smite appears exactly once, as canon\'s spell', () => {
    // THE DUPLICATE THIS DESIGN NEARLY SHIPPED. Canon files Divine Smite as a
    // level 1 spell; his sheet files it as a class feature. Deduping on
    // name-plus-kind would put it in the catalogue twice — once with canon's
    // paragraph and once with his thin wording.
    const hits = buildCatalogue(nix!).filter(e => e.key === normalizeName('Divine Smite'))
    expect(hits).toHaveLength(1)
    expect(hits[0].kind).toBe('spell')
    expect(hits[0].canonSpell).not.toBeNull()
    expect(hits[0].canonFeature).toBeNull()
    expect(hits[0].provenance).toBe('canon')
  })

  it.skipIf(!nix)('his prepared spells are marked prepared, read off the sheet', () => {
    const entries = buildCatalogue(nix!)
    const preparedOnSheet = nix!.spells.filter(s => s.prepared).map(s => normalizeName(s.name))
    expect(preparedOnSheet.length).toBeGreaterThan(0)

    for (const key of preparedOnSheet) {
      const entry = entries.find(e => e.key === key)
      expect(entry, `${key} vanished from the catalogue`).toBeDefined()
      expect(entry!.prepared, `${key} is prepared on his sheet`).toBe(true)
    }

    // And something he has NOT prepared is not quietly marked prepared.
    const cureWounds = entries.find(e => e.key === normalizeName('Cure Wounds'))
    expect(cureWounds?.prepared).toBe(false)
  })

  it.skipIf(!nix)('Aura of Vitality is locked until 9 and still carries canon\'s full text', () => {
    // A lock dims; it never hides. This is Gate 1's rule 1 in one assertion.
    const entry = buildCatalogue(nix!).find(e => e.key === normalizeName('Aura of Vitality'))
    expect(entry).toBeDefined()
    expect(entry!.lockedUntil).toBe(9)
    expect(entry!.preparable).toBe(false)
    expect(entry!.prepared).toBe(false)
    expect(entry!.canonSpell!.summary.length).toBeGreaterThan(100)
    expect(entry!.canonSpell!.tactics.length).toBeGreaterThan(100)
  })

  it.skipIf(!nix)('nothing on any sheet is missing from the catalogue', () => {
    /* The open-world rule, counted. `lookup.ts:14` — nothing may ever cause an
     * option to disappear.
     *
     * MEASURED WEAKNESS, worth writing down: against HIS sheet alone this test
     * cannot fail. Canon has a record for all eleven of his items, so deleting
     * the second pass entirely leaves it green (verified by micro-revert,
     * 2026-08-28). A test that fails to observe a fault is not a test that
     * forbids it — finding BG. So it runs against the homebrewed sheet too,
     * where the second pass is the only thing keeping the item alive. */
    for (const sheet of [nix!, withHomebrew(nix!)]) {
      const keys = new Set(buildCatalogue(sheet).map(e => e.key))
      const onSheet = [
        ...sheet.spells.map(s => s.name),
        ...sheet.features.map(f => f.name),
        ...(sheet.feats ?? []).map(f => f.name),
      ]
      const missing = onSheet.filter(name => !keys.has(normalizeName(name)))
      expect(missing).toEqual([])
    }
  })

  it.skipIf(!nix)('a homebrew spell on the sheet survives, in its own words', () => {
    const entries = buildCatalogue(withHomebrew(nix!))

    expect(entries).toHaveLength(85)
    const entry = entries.find(e => e.key === normalizeName(HOMEBREW.name))
    expect(entry).toBeDefined()
    expect(entry!.provenance).toBe('sheet')
    expect(entry!.sheetText).toBe(HOMEBREW.description)
    expect(entry!.canonSpell).toBeNull()
  })

  it.skipIf(!nix)('no entry carries two canon records', () => {
    for (const entry of buildCatalogue(nix!)) {
      const filled = [entry.canonSpell, entry.canonFeature, entry.canonFeat].filter(Boolean)
      expect(filled.length, `${entry.name} carries ${filled.length} canon records`).toBeLessThan(2)
    }
  })

  it.skipIf(!nix)('every key is unique', () => {
    const entries = buildCatalogue(nix!)
    expect(new Set(entries.map(e => e.key)).size).toBe(entries.length)
  })
})

describe('turn cost — the measurement Gate 3 deferred', () => {
  /* Gate 3 decision 2: `'other'` is the honest bucket, but Turn cost is the
   * DEFAULT grouping mode, and a default whose biggest group is "Other" is a
   * bad default. The threshold was written down before the number was known:
   * more than ~15 of the 84 in 'other' and slice 4 defaults to Source instead.
   * Asserted rather than logged so that a canon package which quietly stops
   * pricing things turns this red. */
  it.skipIf(!nix)('the buckets are measured, and Other is the smallest', () => {
    const entries = buildCatalogue(nix!)
    const count = (c: string) => entries.filter(e => e.turnCost === c).length
    const buckets = {
      action: count('action'),
      bonus: count('bonus'),
      reaction: count('reaction'),
      passive: count('passive'),
      other: count('other'),
    }
    expect(buckets).toEqual(MEASURED_BUCKETS)

    /* THE ANSWER, measured: 20 of the 84 are 'other' — over the ~15 threshold
     * Gate 3 set in advance. Read the list and the reason is not a weak
     * parser: Spellcasting, Weapon Mastery, Fighting Style, Extra Attack and
     * the four auras have no turn cost because they are not things he DOES on
     * a turn, they are things he IS. So slice 4's default grouping mode is
     * **Source**, not Turn cost, exactly as the pre-committed rule said. */
    expect(buckets.other).toBeGreaterThan(15)
  })
})

/** Measured 2026-08-28 against his export, not predicted. */
const MEASURED_BUCKETS = { action: 46, bonus: 16, reaction: 2, passive: 0, other: 20 }

describe('catalogueSpells — the Blessed Warrior menu', () => {
  it.skipIf(!nix)('the nine Blessed Warrior cantrips are absent — he has no Blessed Warrior', () => {
    expect(catalogueSpells(nix!)).toHaveLength(62)
    const cantrips = catalogueSpells(nix!).filter(s => s.level === 0)
    expect(cantrips).toHaveLength(0)
  })

  it.skipIf(!nix)('…and present the moment the sheet records Blessed Warrior', () => {
    // THE POINT OF THIS PAIR: same function, different sheet. It proves the
    // builder reads the Fighting Style rather than hard-coding nine spell
    // names — which is the only reason the exclusion above is a rule and not
    // a hardcoded list that will rot.
    const style: CharacterFeat = {
      name: 'Blessed Warrior',
      description: 'You learn two Cleric cantrips of your choice.',
      isHomebrew: false,
      effects: [],
    }
    const sheet: Character = { ...nix!, feats: [...(nix!.feats ?? []), style] }
    expect(catalogueSpells(sheet)).toHaveLength(71)
    expect(catalogueSpells(sheet).filter(s => s.level === 0)).toHaveLength(9)
  })
})

/* ===========================================================================
   `onSheet` — THE FLAG THAT DRAWS THE PENCILS. Combat Open Book slice 8.

   The flag has exactly one consumer: the Edit and Delete buttons in
   `GrimoirePage.tsx:635-650`. They call `handleEditSpell(ownSpell)` and
   `handleEditFeature(ownFeature)`, both of which look the row up in
   `character.spells` / `character.features`. So the flag's real meaning is
   "an editor can reach this record", and a feat — which lives in
   `character.feats` — cannot be reached by either.

   Until this slice the feat loop said `onSheet: true`, and every feat row in
   the Grimoire carried a pencil and a bin that painted perfectly and did
   nothing when pressed. Both tests below fail against that code.

   RUN UNCONDITIONALLY, unlike most of this file: they are built on the
   in-repo `NIX` fixture rather than on his export, because a claim about a
   button he can see must not go quiet on a machine that has no Downloads
   folder.
   ========================================================================= */
describe('onSheet is a claim about what the editors can reach', () => {
  const SENTINEL: CharacterFeat = {
    name: 'Sentinel',
    description: 'Creatures provoke an opportunity attack even if they Disengage.',
    isHomebrew: false,
    effects: [],
  }
  const withFeat: Character = { ...NIX, feats: [SENTINEL] }

  it('is false on a feat, because neither editor knows where feats live', () => {
    const feat = buildCatalogue(withFeat).find(e => e.key === normalizeName('Sentinel'))
    expect(feat, 'the feat left the catalogue entirely').toBeDefined()
    expect(feat!.kind).toBe('feat')
    // The row still carries his words — this slice removes two dead buttons,
    // not the feat's description.
    expect(feat!.sheetText).toBe(SENTINEL.description)
    expect(feat!.onSheet).toBe(false)
  })

  it('is never true for a record `handleEditSpell`/`handleEditFeature` cannot find', () => {
    /* THE INVARIANT, RATHER THAN THE INSTANCE. The test above pins the feat
       that is wrong today; this one forbids the next `onSheet: true` written
       beside a collection the two handlers do not read. */
    const reachable = new Set([
      ...withFeat.spells.map(s => normalizeName(s.name)),
      ...withFeat.features.map(f => normalizeName(f.name)),
    ])
    const orphans = buildCatalogue(withFeat)
      .filter(e => e.onSheet && !reachable.has(e.key))
      .map(e => `${e.kind} · ${e.name}`)
      .sort()
    expect(orphans).toEqual([])
  })
})

/* ===========================================================================
   THE SECOND DOOR — `sheetIndex`, found while browser-proving slice 8.

   Fixing the feat loop in `buildCatalogue` (`build.ts:312`) is not the whole
   fix, because `sheetIndex` ALSO writes `onSheet: true` for every feat
   (`build.ts:197`), and the spell and feature loops read that index by NAME
   (`build.ts:239`, `build.ts:271`). So a feat whose name canon also files as a
   class feature hands `onSheet: true` to the FEATURE row — a row `build.ts:312`
   never touches — and the two dead pencils come straight back on a different
   record.

   This is the case `04-slices.md` predicted in one line: "will bite the moment
   you pick a Fighting Style". `prepare/fighting-style.ts:208` records the
   chosen style on `character.feats`, so the collision is not hypothetical; it
   is one tap away the day he picks one.
   ========================================================================= */
describe('a feat cannot lend `onSheet` to a canon row of the same name', () => {
  /* Chosen from canon rather than typed, and chosen to be a name his sheet does
     NOT already carry — if it did, `sheetIndex`'s feature loop would claim the
     key first and the feat loop would `continue`, so the test would pass
     without ever reaching the code it is about. */
  const onHisSheet = new Set(NIX.features.map(f => normalizeName(f.name)))
  const collide = CLASS_FEATURES.map(f => f.name).find(n => !onHisSheet.has(normalizeName(n)))

  it('has a canon feature name to collide with, or this test proves nothing', () => {
    expect(collide, 'every canon class feature is already on his sheet').toBeDefined()
  })

  it('leaves the canon feature row unreachable by the editors', () => {
    const character: Character = {
      ...NIX,
      feats: [{ name: collide!, description: 'Recorded as a feat.', isHomebrew: false, effects: [] }],
    }
    const row = buildCatalogue(character).find(e => e.key === normalizeName(collide!))
    expect(row, 'the collided name left the catalogue entirely').toBeDefined()
    // `handleEditFeature` would look this up in `character.features` and find
    // nothing, exactly as `handleEditSpell` did for a feat.
    expect(row!.onSheet).toBe(false)
  })
})
