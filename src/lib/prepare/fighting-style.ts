/* The Fighting Style a Paladin picks at level 2, recorded so the rest of the
 * app can see it.
 *
 * Open Book slice 6. Marcus, item 8: "in the combat tab, it doesnt seem to have
 * all of my available reactions available. I should have the hearthfire
 * manifest, sentinal, and interception." And in his second message: "Interception
 * is indeed a fighting style. That should be placed somewhere in app so i can
 * read details, and also in combat."
 *
 * ── WHY THERE IS ALMOST NOTHING HERE ────────────────────────────────────────
 *
 * Everything downstream already exists and already works. `turn/feats.ts` turns
 * any `CharacterFeat` whose text costs a Reaction into an `ActionOption`, and
 * `compose.ts` splices those into the reaction bucket before the canon overlay
 * runs, so the row, the ranking, the contention warning, the detail sheet and
 * the spend all follow with no new wiring. `catalogue/build.ts:66` even names
 * this file in a comment written in slice 1, because slice 1 already knew the
 * style would land on `character.feats`.
 *
 * So the reason Interception is not on his combat tab is not a missing feature.
 * It is that **nothing has ever asked him which style he took.** This module is
 * that question and its answer, and it is deliberately small: a picker that
 * needed a hundred lines here would mean the seam it plugs into was wrong.
 *
 * ── IT TAKES A CANON RECORD, NOT A NAME ─────────────────────────────────────
 *
 * `recordFightingStyle(character, style: CanonFeat)`. A name would have to be
 * looked up, the lookup would have to be able to miss, and the miss would need a
 * refusal code, a card to render it and a test to pin it — a whole failure mode
 * invented by the signature. Taking the record makes "a style canon has never
 * heard of" unrepresentable instead of handled. (Finding BG: prefer a structural
 * claim that FORBIDS a fault to a check that failed to observe it.)
 *
 * ── WHAT `effects` IS DOING, AND WHY IT IS THE POINT ────────────────────────
 *
 * `fightingStyleFeat` copies canon's `effects` array onto the sheet record.
 * That single line is why Interception reaches the combat tab, and there is a
 * measurement on his real sheet that says so — `docs/plans/grimoire/
 * measure-reactions.mjs`, run 2026-08-29:
 *
 *     featReactionOptions(nix) → 0 rows
 *
 * Zero. He has Sentinel, canon knows Sentinel, canon's Sentinel has two
 * reaction-shaped sentences, and the engine produces nothing — because
 * `effectSentencesOf` gives the SHEET's words priority and the importer that
 * built his sheet filled `effects` with three audience bullets:
 *
 *     "Polearm Master (OA when enemies enter your 10 ft reach)"
 *     "Reach weapons (Glaive, Halberd) for a massive control zone"
 *     "Fighters, Paladins, and other frontliners who want to lock enemies down"
 *
 * Those are notes about who should take the feat. None of them costs a Reaction,
 * so none is reaction-shaped, so Sentinel yields no rows and canon's real text
 * never gets a turn. That is the OTHER half of item 8, and `04-slices.md` puts
 * it outside these seven slices on purpose — it is a fix to text provenance in
 * `turn/feats.ts`, not to anything here, and it deserves its own slice and its
 * own micro-revert. It is written down here, and in `00-status.md`, so that it
 * cannot be lost between them.
 *
 * The contrast is the useful part: same file, same rule, two outcomes.
 * Interception works because this module writes real rules text. Sentinel fails
 * because his importer wrote bullets. The fault is in the words, not the engine.
 *
 * ── ONE STYLE, REPLACED NOT STACKED ─────────────────────────────────────────
 *
 * A Paladin gets one Fighting Style. Appending would let two accumulate and put
 * a reaction on his combat tab that he does not have — the app inventing an
 * ability, which is worse than the app omitting one, because an omission is
 * visible at the table and an invention is not. So recording replaces, and
 * recording the style already recorded clears it (he mis-tapped, or he is
 * re-picking).
 *
 * ── THE LEVEL GATE IS NOT HERE ──────────────────────────────────────────────
 *
 * Fighting Style unlocks at Paladin level 2 and the functions that RECORD a
 * style do not check that. They do not need to: the picker renders inside the
 * *Fighting Style* catalogue row, and that row already carries `lockedUntil`
 * computed by `build.ts` from canon's levels table. One source of lock truth,
 * computed and never read — reusing it beats a second copy of the same number
 * here.
 *
 * AMENDED, Your-Turn slice 6: `shouldAskFightingStyle` below is the one
 * function here that reads a level, and it reads it out of exactly that field
 * rather than writing "2" down a second time. The rule above still holds where
 * it matters — the number lives in canon, and this file only asks.
 *
 * ── THE SENTINEL PARAGRAPH ABOVE IS STALE, AND MEASUREMENT SAYS SO ──────────
 *
 * Written 2026-08-29, it says `featReactionOptions(nix)` yields 0 rows and that
 * his Sentinel is dead text. Re-measured on the running app 2026-08-31
 * (`docs/plans/your-turn/prove-slice6.mjs`): his Reaction band paints FOUR rows
 * and TWO of them are Sentinel, each carrying its own correct trigger. Canon's
 * text reaches the glass, and the second row stopped vanishing into the first
 * when slice 10e made the ids unique.
 *
 * The paragraph is kept rather than deleted because its reasoning about sheet-
 * text provenance is still sound, and because a finding quietly erased is a
 * finding that gets rediscovered as a bug. But do not build the "other half of
 * item 8" it describes without measuring first — as of today there is nothing
 * there to fix. */

import { FEAT_LIST } from '../../canon'
import type { CanonFeat } from '../canon/types'
import { normalizeName, featByName } from '../canon/lookup'
import { buildCatalogue } from '../catalogue/build'
import type { Character, CharacterFeat } from '../character'

/** Canon's category heading, matched by SHAPE rather than by equality.
 *
 *  ── A BUG THIS TEST CAUGHT, AND IT WAS THE WORST ONE AVAILABLE ─────────────
 *
 *  The first version of this file compared `category === 'Fighting Style'`.
 *  Measured against canon, that returns TEN of the eleven, and the one it drops
 *  is the only Paladin-exclusive choice on the list:
 *
 *      "Blessed Warrior"  category: "Fighting Style (Paladin-only alternative)"
 *
 *  Two failures, and the second is the serious one. The picker would not have
 *  offered it — bad. But `isFightingStyleFeat` asks the same question, so a
 *  Blessed Warrior already on the sheet would not have been recognised as a
 *  style either, and picking Interception would have left him holding BOTH: a
 *  reaction on his combat tab beside a spell list he no longer has. That is the
 *  app inventing an ability, which this file's header forbids in as many words.
 *
 *  So: a prefix match, anchored. "Fighting Style (Paladin-only alternative)" IS
 *  a Fighting Style — canon says so in the first two words — and a category that
 *  merely mentions fighting styles in passing still does not qualify, because
 *  the match is anchored at the start. */
const FIGHTING_STYLE_CATEGORY = /^fighting style\b/i

/** Is this canon category a Fighting Style heading? Exported so the tests can
 *  assert against canon's real strings rather than against a copy of them. */
export function isFightingStyleCategory(category: unknown): boolean {
  return typeof category === 'string' && FIGHTING_STYLE_CATEGORY.test(category.trim())
}

/** The class feature that grants the choice, by canon's own name for it.
 *
 *  ── THIS IS A NAME MATCH, AND HERE IS WHY IT IS ALLOWED ────────────────────
 *
 *  The open-world rule (`lookup.ts:11`) says recognise a shape, never a name,
 *  and every rule in this phase obeys it. This is not a rule. It is where a
 *  control is MOUNTED: the picker belongs under the one catalogue row that
 *  explains what a Fighting Style is, and canon has exactly one such row. No
 *  capability is inferred from the string — a sheet that never mentions it
 *  loses a control, not an ability.
 *
 *  The failure a name match invites is silent disappearance, so it is made
 *  loud: `fighting-style.test.ts` asserts canon's class features still contain
 *  this name, and a canon package that renames the feature goes red rather than
 *  shipping a picker nobody can reach. */
export const FIGHTING_STYLE_FEATURE = 'Fighting Style'

/** Every Fighting Style canon knows, in canon's order.
 *
 *  Filtered by CATEGORY, not by a list of names. The eleven names would be four
 *  lines shorter and would be wrong the day canon ships a twelfth. */
export function fightingStyles(): readonly CanonFeat[] {
  return FEAT_LIST.filter(f => isFightingStyleCategory(f.category))
}

/** Is this sheet record a Fighting Style rather than an ordinary feat?
 *
 *  Canon decides when canon knows the feat; otherwise the sheet's own
 *  prerequisite line does. The same two-source shape as `countsAgainstCap` in
 *  `toggle.ts`, and for the same reason: canon widens the answer, it never gates
 *  it. A homebrew style whose prerequisite says so is still a style, and Sentinel
 *  — which canon files under `general` — is still not one, so replacing a style
 *  can never take his feats away. */
export function isFightingStyleFeat(feat: CharacterFeat): boolean {
  const canon = featByName(feat.name)
  if (canon) return isFightingStyleCategory(canon.category)
  return /\bfighting style\b/i.test(feat.prerequisites ?? '')
}

/** The style he has recorded, or null. */
export function currentFightingStyle(character: Character): CharacterFeat | null {
  const feats = Array.isArray(character.feats) ? character.feats : []
  return feats.find(isFightingStyleFeat) ?? null
}

/** Canon record → the sheet's own `CharacterFeat` shape.
 *
 *  `effects` is the load-bearing line; see the header. `description` is the same
 *  sentences joined, because the sheet's description is what renders where there
 *  is no effects list to render, and a style with an empty description shows up
 *  in the Grimoire as a name and a blank. */
export function fightingStyleFeat(style: CanonFeat): CharacterFeat {
  const effects = (style.effects ?? []).map(e => e.trim()).filter(Boolean)
  const feat: CharacterFeat = {
    name: style.name,
    description: effects.join(' '),
    isHomebrew: false,
    effects,
  }
  if (typeof style.source === 'string') feat.source = style.source
  if (style.prerequisite) feat.prerequisites = style.prerequisite
  if (style.paladinNote) feat.tacticalNote = style.paladinNote
  return feat
}

/** Record this style, replacing whatever style was recorded before.
 *
 *  Pure — a character in, a new character out. The page owns the write. */
export function recordFightingStyle(character: Character, style: CanonFeat): Character {
  const feats = Array.isArray(character.feats) ? character.feats : []
  const kept = feats.filter(f => !isFightingStyleFeat(f))
  return { ...character, feats: [...kept, fightingStyleFeat(style)] }
}

/** Forget the recorded style, keeping every other feat. */
export function clearFightingStyle(character: Character): Character {
  const feats = Array.isArray(character.feats) ? character.feats : []
  return { ...character, feats: feats.filter(f => !isFightingStyleFeat(f)) }
}

/** Should this character be ASKED which Fighting Style he took?
 *
 *  ── YOUR-TURN SLICE 6, ITEM 8 ──────────────────────────────────────────────
 *
 *  Marcus: "in the combat tab, it doesnt seem to have all of my available
 *  reactions available. I should have the hearthfire manifest, sentinal, and
 *  interception." Measured on his own export, the Reaction band goes from four
 *  painted rows to five the instant a style is recorded — so nothing downstream
 *  was ever broken, and the whole of the fix is the question.
 *
 *  THREE GATES, AND ONLY THE THIRD IS ABOUT HIM:
 *
 *    1. does his class GRANT the choice — the catalogue either holds the
 *       *Fighting Style* row or it does not, and a class that never offers one
 *       must never be asked
 *    2. has he REACHED it — `lockedUntil`, the lock `build.ts` already computed
 *       for that row. READ rather than recomputed: `GrimoirePage` reads the same
 *       field for the same picker (`:660`), so the two surfaces cannot disagree
 *       about what level he is, and neither holds a second copy of "level 2"
 *    3. has he ANSWERED it — `currentFightingStyle`
 *
 *  It lives here, beside every other rule about styles, rather than inline in
 *  the component that renders the prompt: a question about the sheet is a fact
 *  about the sheet, and this way it can be asked without a DOM. */
export function shouldAskFightingStyle(character: Character): boolean {
  if (currentFightingStyle(character) !== null) return false
  const want = normalizeName(FIGHTING_STYLE_FEATURE)
  const row = buildCatalogue(character).find(
    e => e.kind === 'feature' && normalizeName(e.name) === want,
  )
  return row !== undefined && row.lockedUntil === null
}

/** Press the picker: choosing the style already chosen un-chooses it. */
export function toggleFightingStyle(character: Character, style: CanonFeat): Character {
  const current = currentFightingStyle(character)
  if (current && normalizeName(current.name) === normalizeName(style.name)) {
    return clearFightingStyle(character)
  }
  return recordFightingStyle(character, style)
}
