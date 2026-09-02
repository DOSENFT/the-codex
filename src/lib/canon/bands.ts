/* The three bands, once, for both screens that draw them.
 *
 * Open Book slice 2. `docs/plans/grimoire/04-slices.md`.
 *
 *     1  at a glance    canon's numbers, labelled
 *     2  what it does   canon's whole paragraph, never a slice(0, n)
 *     3  how to use it  canon's long-form advice, personalised
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The combat detail sheet has drawn these three since Table Truth slice 7. The
 * Grimoire is about to draw the same three for all 84 entries. Two screens
 * assembling the same bands from the same corpus by two different routes is two
 * answers to "what does Hearthfire Manifest say", and the second one to be
 * written is always the one that drifts. So the assembly moves here first, in a
 * slice of its own that changes nothing, and BOTH callers are then forbidden by
 * a test from reaching past it.
 *
 * ── WHAT IS NOT HERE, AND WHY ───────────────────────────────────────────────
 * Resolution is not here. Deciding WHICH canon record an option or an entry
 * means is the caller's job, because the two callers genuinely differ: the turn
 * layer resolves from a `TurnOption`'s name and kind, the catalogue has already
 * resolved during `buildCatalogue`. Handing both a `BandInput` with the record
 * already chosen keeps that difference where it belongs and keeps this module
 * pure over canon.
 *
 * Nor is anything that costs a turn: the rule box, the spend button, the roll
 * offers and the temp-HP warning all stay in `turn/detail.ts`. They are about a
 * turn in progress, and the Grimoire has no turn.
 *
 * ── THE OPEN-WORLD RULE, HELD HERE TOO ──────────────────────────────────────
 * All three canon slots may be null. That is homebrew, and it renders from the
 * caller's fallbacks in its own words, marked `provenance: 'sheet'` so the
 * player knows whose words he is reading. Tactics is the one band with no
 * fallback: advice is the only thing here that would have to be INVENTED, and
 * an empty band 3 is honest where a manufactured one is not.
 *
 * ── THE LAYERING SEAM, STATED RATHER THAN HIDDEN ────────────────────────────
 * `overlay.ts:117-121` records a deliberate rule: the character→canon context
 * builders live in the turn layer because "canon knows no characters, and the
 * moment it did there would be two answers to what is his Charisma modifier".
 * This module takes a `Character` and therefore bends that rule — but it bends
 * it in the direction the rule was protecting: it IMPORTS those builders rather
 * than growing its own, so there is still exactly one answer. Writing a second
 * `featureContextOf` here is the thing that paragraph forbids, and this file
 * does not do it. */

import type { Character } from '../character'
import type { CanonErratum, CanonFeat, CanonFeature, CanonSpell } from './types'
import { errataForFeature } from './lookup'
import { statBlock } from './format'
import { featureFacts, type FeatureFact } from './feature'
import { splitTactics, type TacticsBullet } from './tactics'
import { personaliseBullets } from './personalise'
import { featureContextOf } from '../turn/overlay'

export interface BandFact {
  /** null for a fact the source stated without naming — a bare detail segment. */
  label: string | null
  value: string
}

/** What a caller hands in. All three canon slots may be null: that is a
 *  homebrew item, and the fallbacks are what it renders from. */
export interface BandInput {
  name: string
  spell: CanonSpell | null
  feature: CanonFeature | null
  feat: CanonFeat | null
  /** Band 2 when all three above are null. */
  fallbackText: string
  /** Band 1 when all three above are null, and when a canon record turns out to
   *  have no facts to state. */
  fallbackFacts: BandFact[]
}

export interface CanonBands {
  provenance: 'canon' | 'sheet'
  /** Band 1. Labelled facts, in canon's order. NOT laid out — the panel does
   *  the layout, because where a fact goes on a grid is a fact about a screen
   *  width and this module has never seen one. */
  facts: BandFact[]
  /** Band 2. The full paragraph. Never truncated. */
  whatItDoes: string
  /** Band 3. Empty when canon has no advice, and empty is honest. */
  tactics: TacticsBullet[]
  /** Canon's recorded problems with this feature. Both screens show them. */
  errata: CanonErratum[]
  /** The classified feature facts, raw. Empty for a spell.
   *
   *  Exposed because `turn/detail.ts` rolls dice off these, and if it had to
   *  call `featureFacts` itself to get them the structural test below would
   *  have nothing left to forbid. */
  featureFacts: readonly FeatureFact[]
}

/** Join the caster's save DC onto canon's Save row.
 *
 *  Moved here from `turn/detail.ts` unchanged. `statBlock` is pure over the
 *  spell and has no character, so it can only say WHICH save — "Dexterity —
 *  negates". The number is the half you say out loud to a DM.
 *
 *  IT STILL DOES NOT LIVE IN `format.ts`, for the reason that file's caller
 *  gave: a pure formatter that takes a character stops being one, and every one
 *  of its other callers would then need a character to pass.
 *
 *  It is a PREFIX, not a replacement: canon's effect ("negates", "half on a
 *  success") is the other half of the ruling and is never dropped.
 *
 *  Exported for `turn/detail.ts`'s existing tests, which name it. */
export function withSaveDC(facts: BandFact[], character: Character): BandFact[] {
  const dc = character.spellSaveDC
  if (!dc) return facts
  return facts.map(fact =>
    fact.label === 'Save' && !/\bDC\b/.test(fact.value)
      ? { ...fact, value: `DC ${dc} ${fact.value}` }
      : fact
  )
}

/** Band 1 for a feature. Canon's mechanics bag, classified.
 *
 *  A 'computed' fact shows its working — "12 temp HP (Paladin level +
 *  Charisma modifier)" — because the number is derived and Marcus is entitled
 *  to check it against his own sheet rather than trust it. */
function factsFromFeature(facts: readonly FeatureFact[]): BandFact[] {
  return facts.map(fact => ({
    label: fact.label,
    value:
      fact.shape === 'computed' && fact.raw !== fact.value
        ? `${fact.value} (${fact.raw})`
        : // The row has 46 characters and says "(free)"; a detail panel has the
          // whole width and says which costs are the ones not being charged,
          // because "free" is the word Marcus would have to take on trust and
          // this is the sentence that makes it checkable. Canon's own string is
          // kept in front of it, unedited.
          fact.free
          ? `${fact.raw} — free: no Action, no Bonus Action, no Reaction, no use`
          : fact.value,
  }))
}

/** Band 2 for a feat. Canon writes each effect as one self-contained sentence,
 *  so the join is the paragraph — there is no separate prose field to prefer. */
function textFromFeat(feat: CanonFeat): string {
  return (feat.effects ?? []).join(' ')
}

/** Band 1 for a feat. Added in Open Book slice 3.
 *
 *  Until slice 3 a feat fell through to `input.fallbackFacts` and its band 1 was
 *  whatever the caller happened to have — for the Grimoire, one row saying
 *  "Feat". Canon holds more than that and was simply not being asked: a feat has
 *  a category, usually a prerequisite, sometimes an ability score bump.
 *
 *  THE COMBAT SHEET CANNOT MOVE BECAUSE OF THIS. `turn/detail.ts` passes
 *  `feat: null` unconditionally — the turn layer resolves spells and features
 *  only — so this branch is unreachable from that caller. That is asserted in
 *  `bands.test.ts` rather than left as a claim in a comment. */
function factsFromFeat(feat: CanonFeat): BandFact[] {
  const facts: BandFact[] = []
  if (feat.category) facts.push({ label: 'Category', value: feat.category })
  if (feat.prerequisite) facts.push({ label: 'Prerequisite', value: feat.prerequisite })
  if (feat.abilityScoreIncrease) {
    facts.push({ label: 'Ability Score', value: feat.abilityScoreIncrease })
  }
  // Only when true. "Repeatable: No" is a row he has to read to learn nothing.
  if (feat.repeatable) facts.push({ label: 'Repeatable', value: 'Yes' })
  return facts
}

/** The three bands, assembled once. Pure: no hooks, no fetch, no clock. */
export function canonBands(input: BandInput, character: Character): CanonBands {
  const { spell, feature, feat } = input

  // Computed once: band 1 prints these, and the turn layer rolls dice among them.
  const canonFacts = feature ? featureFacts(feature, featureContextOf(character)) : []

  const facts: BandFact[] = spell
    ? withSaveDC(
        statBlock(spell).map(f => ({ label: f.label, value: f.value })),
        character
      )
    : feature
      ? factsFromFeature(canonFacts)
      : feat
        ? factsFromFeat(feat)
        : input.fallbackFacts

  // A canon feature whose mechanics bag is empty still deserves a band 1 — it
  // has a cost and a source like everything else.
  const filled = facts.length > 0 ? facts : input.fallbackFacts

  return {
    provenance: spell || feature || feat ? 'canon' : 'sheet',
    facts: filled,
    // The sources, in order of who has the most to say. The fallback is last
    // and is exactly the string a collapsed row would have cut at 80 chars.
    whatItDoes: spell?.summary || feature?.rawText || (feat ? textFromFeat(feat) : '') || input.fallbackText,
    /* SHEET TRUTH slice 5 — the one prose seam. `splitTactics` runs on canon
     * UNMODIFIED so its heading detection still sees the text its author wrote;
     * the substitution happens to the bullets that come out of it.
     *
     * A FEAT'S ADVICE IS `paladinNote`, added in Open Book slice 3. Canon's own
     * type comment calls it "canon's advice for a Paladin — guidance, never
     * rendered as rules", which is band 3's definition word for word. It was
     * being dropped only because the turn layer never passes a feat. Still no
     * fallback and still no invention: a feat canon has no note for gets an
     * empty band 3, the same as a feature. */
    tactics: spell
      ? personaliseBullets(splitTactics(spell.tactics), character)
      : feat?.paladinNote
        ? personaliseBullets(splitTactics(feat.paladinNote), character)
        : [],
    errata: errataForFeature(input.name) as CanonErratum[],
    featureFacts: canonFacts,
  }
}
