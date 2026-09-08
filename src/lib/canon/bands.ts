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
import { resolvedDice, statBlockFor } from './format'
import { featureFacts, type FeatureFact } from './feature'
import { splitTactics, type TacticsBullet } from './tactics'
import { houseNoteFor } from './feature-notes'
import { personaliseBullets, personaliseText, type PersonaliseContext } from './personalise'
import { reachFor } from '../rules-2024/reach'
import { casterContextOf, featureContextOf } from '../turn/overlay'

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
  /** HE PRESSED SAVE ON `fallbackText`, so it wins band ② even against canon.
   *
   *  Default false, and every existing caller therefore keeps canon-wins
   *  unchanged. Only `entryDetail` ever passes true, and only when the Spell or
   *  Feature editor set `userEdited` on the record — an imported description
   *  cannot reach this, which is the whole distinction. Ignored when
   *  `fallbackText` is blank: an empty override would blank the paragraph. */
  fallbackWins?: boolean
  /** Band 1 when all three above are null, and when a canon record turns out to
   *  have no facts to state. */
  fallbackFacts: BandFact[]
}

export interface CanonBands {
  /** `'canon'` — canon's words. `'sheet'` — canon has no record at all, so his
   *  words are the only words. `'edited'` — canon HAS a record and he overrode
   *  it in the editor, which is a different thing and gets a different line. */
  provenance: 'canon' | 'sheet' | 'edited'
  /** Band 1. Labelled facts, in canon's order. NOT laid out — the panel does
   *  the layout, because where a fact goes on a grid is a fact about a screen
   *  width and this module has never seen one. */
  facts: BandFact[]
  /** Band 2. The full paragraph. Never truncated. */
  whatItDoes: string
  /** Band 3. Empty when nobody has advice, and empty is honest. */
  tactics: TacticsBullet[]
  /** WHOSE VOICE BAND ③ IS IN — Open Book slice 9b.
   *
   *  `null` whenever `tactics` is empty, `'canon'` for a spell's `tactics`, a
   *  feature's `notes` or a feat's `paladinNote`, and `'house'` for the two
   *  entries in `feature-notes.ts` that the app wrote itself.
   *
   *  IT EXISTS BECAUSE THE SUBHEAD ALREADY MADE A CLAIM. Band ③ has printed
   *  "Canon's own words, with your numbers filled in." since Table Truth. The
   *  moment app-written advice went through the same channel that line became a
   *  lie about the app's own text, told in the app's own voice — so the panel
   *  reads this field and says something different. A renderer that ignored it
   *  would be back to the lie, which is why `bands.test.ts` asserts the two
   *  cannot disagree rather than leaving it to review. */
  tacticsSource: 'canon' | 'house' | null
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

  /* OPEN BOOK SLICE 5: the prose context, built ONCE for this record.
     `{dice}` arrives already resolved because resolving it needs a
     `CasterContext`, and `personalise.ts` is not allowed to build one — see the
     layering note at :37-45 and the `dice` case in `answer`. This line is the
     only place in the app that answers `{dice}`, which is what makes band 1 and
     band 2 incapable of naming different numbers. */
  const prose: PersonaliseContext = {
    character,
    dice: spell ? resolvedDice(spell, casterContextOf(character)) : null,
  }

  /* OPEN BOOK SLICE 4: `statBlockFor`, not `statBlock`. Band 1 now does the
     arithmetic canon left as words — the cantrip tier on Damage, the modifier on
     Healing — so it stops disagreeing with the row three inches above it. Both
     screens change together because both read this line; that is the point of
     the module. `casterContextOf` is IMPORTED rather than rebuilt here, on the
     rule this file's own header states at :37-45. */
  const facts: BandFact[] = spell
    ? withSaveDC(
        statBlockFor(spell, casterContextOf(character)).map(f => ({ label: f.label, value: f.value })),
        character
      )
    : feature
      ? factsFromFeature(canonFacts)
      : feat
        ? factsFromFeat(feat)
        : input.fallbackFacts

  // A canon feature whose mechanics bag is empty still deserves a band 1 — it
  // has a cost and a source like everything else.
  const base = facts.length > 0 ? facts : input.fallbackFacts

  /* OPEN BOOK SLICE 6 — HIS REACH, WHEN IT IS NOT CANON'S.
     Sentinel's rules text says "within 5 feet of you"; his Dawn Guardian makes
     it ten. `reachFor` returns null for every ability whose distance does not
     follow the weapon, for a character wielding nothing with Reach, and for the
     plain default of 5 — so for almost everything this line adds no row at all.

     BAND 2 IS DELIBERATELY LEFT SAYING FIVE. Canon's paragraph is the book, and
     the book has not changed; this is a fact ABOUT HIM sitting next to it, with
     the item named, so the two can be read together and the ruling can be
     argued with. Making the paragraph say ten would be the app editing the
     rulebook, which is a different and much worse thing than adding a row.
     `reach.test.ts` asserts that disagreement rather than leaving it to chance. */
  const reach = reachFor(input.name, character)
  const filled = reach
    ? [...base, { label: 'Your reach', value: `${reach.feet} ft — ${reach.source}` }]
    : base

  /* SLICE 5, BAND 1. `personaliseText` and not `personalise`: a fact is one
     phrase and there is no second sentence to fall back on, so dropping here
     would silently delete a whole labelled row from the grid. The LABEL is left
     alone — canon's labels carry no tokens today and a personalised label is a
     grid column heading that changes per character, which is not a thing. */
  const personalisedFacts = filled.map(fact =>
    fact.value.includes('{') ? { ...fact, value: personaliseText(fact.value, prose) } : fact
  )

  const advice = adviceFor(input, prose)

  /* HIS SAVE BEATS CANON'S PARAGRAPH — but only a real one.
     `fallbackWins` is meaningless without text to win with, and an override
     that is blank or whitespace would replace canon's words with nothing. That
     is not what pressing Save on an empty box should mean, so it falls through
     to the ordinary precedence below instead. */
  const overridden = input.fallbackWins === true && input.fallbackText.trim().length > 0

  return {
    /* 'edited' is the third answer, and it is not a cosmetic distinction: the
       panel prints a different sentence for each, and telling him canon wrote a
       paragraph he wrote himself is the same class of lie `tacticsSource` was
       added to stop. */
    provenance: overridden ? 'edited' : spell || feature || feat ? 'canon' : 'sheet',
    facts: personalisedFacts,
    /* The sources, in order of who has the most to say. The fallback is last
       and is exactly the string a collapsed row would have cut at 80 chars.

       SLICE 5, BAND 2 — THE HALF SLICE 4 COULD NOT REACH. Slice 4 made every
       number the app COMPUTES his. This is the number canon TYPED: Sacred
       Flame's paragraph said "take 1d8 Radiant damage" three lines under a 34px
       `2d8`. `input.fallbackText` goes through it too, because a homebrew line
       he wrote himself is exactly as entitled to his numbers as canon's is. */
    whatItDoes: personaliseText(
      overridden
        ? input.fallbackText
        : spell?.summary || feature?.rawText || (feat ? textFromFeat(feat) : '') || input.fallbackText,
      prose
    ),
    /* SHEET TRUTH slice 5 — the one prose seam. `splitTactics` runs on canon
     * UNMODIFIED so its heading detection still sees the text its author wrote;
     * the substitution happens to the bullets that come out of it.
     *
     * The four sources, their precedence and the shape each one arrives in are
     * all in `adviceFor` below — it returns the text and the voice together, so
     * they cannot drift apart. */
    tactics: advice.bullets,
    tacticsSource: advice.source,
    errata: errataForFeature(input.name) as CanonErratum[],
    featureFacts: canonFacts,
  }
}

/** Band ③, and the answer to "whose words are these?" in the same breath.
 *
 *  ONE FUNCTION RATHER THAN TWO because the source and the text have to be
 *  decided by the same branch. Computing `tactics` in one expression and
 *  `tacticsSource` in another that re-tested the same conditions would be two
 *  places to edit and one of them eventually forgotten — and the failure would
 *  be the app printing "Canon's own words" over text the app wrote. That is
 *  precisely the lie `tacticsSource` was added to prevent, so it is made
 *  unrepresentable instead of merely tested for.
 *
 *  THE ORDER IS THE PRECEDENCE, AND IT IS DELIBERATE:
 *
 *    1. a spell's `tactics`      — canon
 *    2. a feature's `notes`      — canon        (slice 9a)
 *    3. a feat's `paladinNote`   — canon
 *    4. `houseNoteFor(name)`     — THE APP      (slice 9b)
 *
 *  House notes come LAST, so canon can never be overridden by this app's
 *  opinion: the day a canon package adds notes to Channel Divinity, canon wins
 *  and `feature-notes.ts` goes quiet without being edited. The alternative
 *  ordering would let a stale house note outrank the book, which is the one
 *  direction this file must never fail in.
 *
 *  Empty stays empty. A record nobody has advice for gets `[]` and `null`, and
 *  the panel draws no band at all — the same honest silence as before slice 9. */
function adviceFor(
  input: BandInput,
  prose: PersonaliseContext
): { bullets: TacticsBullet[]; source: 'canon' | 'house' | null } {
  const { spell, feature, feat } = input

  const canon: TacticsBullet[] | null = spell
    ? splitTactics(spell.tactics)
    : /* NOT PUT THROUGH `splitTactics`, unlike every other branch, and this is
         the one place the sources genuinely differ in SHAPE. A spell's
         `tactics`, a feat's `paladinNote` and a house note are single long
         strings whose author wrote headings into them in capitals; `notes` is
         already an array of separate sentences with no headings at all. Joining
         them in order to split them again could only lose the boundaries canon
         already drew, and inventing an outline is the exact thing `tactics.ts`
         forbids the splitter to do. One note, one bullet, verbatim. */
      feature?.notes?.length
      ? feature.notes.map(note => ({ lead: null, body: note }))
      : feat?.paladinNote
        ? splitTactics(feat.paladinNote)
        : null

  if (canon) {
    const bullets = personaliseBullets(canon, prose)
    return { bullets, source: bullets.length > 0 ? 'canon' : null }
  }

  /* THE RESOLVED RECORD'S NAME FIRST, AND `input.name` ONLY AS THE FALLBACK.
     Found in a browser, not in a test: on the Combat tab the Hearthfire cloak's
     row is called "Flaming Cloak", because that is what HIS SHEET calls it and
     the open-world rule says his words stand. `lookup.ts` already reconciles the
     two — `CanonChannelDivinityOption` exists for exactly this alias — so by the
     time we are here `feature` IS the Hearthfire Manifest record while
     `input.name` is still the sheet's label. Keying the house note off the label
     meant band ③ appeared in the Grimoire and vanished in Combat, on the same
     ability, which is the switching-back-and-forth this whole phase is about.
     `input.name` stays as the fallback so a purely homebrew row — no canon
     record at all — could still be given advice under its own name. */
  const house = (feature ? houseNoteFor(feature.name) : null) ?? houseNoteFor(input.name)
  if (!house) return { bullets: [], source: null }

  const bullets = personaliseBullets(splitTactics(house), prose)
  /* `null` and not `'house'` when personalising empties it out. The source
     describes the text that is actually on the screen; claiming a voice for a
     band with nothing in it would be a label with no referent. */
  return { bullets, source: bullets.length > 0 ? 'house' : null }
}
