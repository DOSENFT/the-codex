/* The canon overlay — where a row stops being the sheet's guess and starts
 * being the book's fact.
 *
 * ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
 * `options.ts` is pinned byte-identical to the code lifted out of
 * TurnSummary.tsx, and Slice 2's characterization tests exist to keep it that
 * way. Two of the bugs it records are real and were waiting for an owner:
 *
 *   1. Any feature named "Aura…" that declares no `actionType` is filed as a
 *      passive on the strength of its NAME (options.ts:365-367). Nix cannot
 *      show the fault — all three of his auras declare `passive` anyway — but
 *      canon has three spells called "Aura of Vitality", "Aura of Life" and
 *      "Aura of Purity" that are all cast with an Action, and the moment one of
 *      those reaches the sheet as a feature it vanishes from the turn list.
 *   2. A 40-POINT pool reads "40 uses" (options.ts:140). Lay on Hands is
 *      measured in hit points, not in activations, and saying "uses" invites
 *      Marcus to spend the whole pool on one goblin.
 *
 * Fixing either in `options.ts` would break the pin. So they are fixed HERE, in
 * a layer that runs after it and owes it nothing.
 *
 * ── THE OPEN-WORLD RULE, WHICH THIS FILE MAY NOT BREAK ──────────────────────
 * A canon miss is not an error. Marcus writes homebrew; a row whose name canon
 * has never heard of keeps every word the sheet gave it, still renders, still
 * ranks, and is marked `provenance: 'sheet'`. Nothing in this module may cause
 * an option to disappear, and nothing in it may throw — a malformed canon
 * record degrades to "no match" and the sheet wins.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
 * It does not touch `summary`. That feeds rank.ts's `prose` and the rider
 * detection in compose.ts, not the row, and rewriting it would change scores.
 * It does not touch `rollNotation` either, although canon's cantrip scaling is
 * better than the sheet's frozen die — a roll is behaviour, not a display
 * string, and Slice 7's detail sheet owns the roll strip. Recorded rather than
 * smuggled in.
 *
 * Table Truth slice 5. See docs/plans/table-truth/03-program-design.md:157-179. */

import type { Character } from '../character'
import type { ActionEconomyType } from '../combat-state'
import { poolsOf, type ResourceUnit } from '../rules-2024/resources'
import { normalizeName, spellByName, featureByName, featByName } from '../canon/lookup'
import { mechanicsLine, ROW_BUDGET_CHARS, type CasterContext } from '../canon/format'
import type { FeatureContext } from '../canon/feature'
import type { CanonFeature, CanonSpell, Provenance } from '../canon/types'
import type { ActionOption } from './options'
import { facesOf, type CanonFace } from './faces'
import type { SentenceSource } from './feats'

/** How canon files a thing in the action economy — the app's three slots plus
 *  the fourth answer `ActionEconomyType` cannot express, which is "this is not
 *  something you spend a turn on at all". `options.ts` carries that fourth
 *  answer out of band, as a bucket; the overlay has to be able to disagree with
 *  the bucket, so it needs a word for it. */
export type EconomyFiling = ActionEconomyType | 'passive'

/** An `ActionOption` with canon's verdict attached.
 *
 *  A separate interface rather than three new fields on `ActionOption`, because
 *  `ActionOption` lives in the byte-identical file. Additive and optional
 *  throughout: an `OverlaidOption` is an `ActionOption` everywhere one is
 *  expected, so nothing downstream has to know this step happened. */
export interface OverlaidOption extends ActionOption {
  /** Canon's own id, when canon knew the name. Spells have ids; features do
   *  not, so a matched feature is keyed by its normalised name. */
  canonId?: string
  /** 'sheet' is not a failure. It is homebrew keeping its own words. */
  provenance: Provenance
  /** Set ONLY when canon states the answer. Undefined means "canon declined",
   *  and the sheet's own filing stands — including its name sniff. */
  canonEconomy?: EconomyFiling
  /** The separately-priced abilities canon states inside this one feature, when
   *  it states two or more. Present is rare and means `canonEconomy` was always
   *  going to be `undefined` — the two costs are exactly why it declined. The
   *  composer turns each face into its own option; nothing else reads this. */
  canonFaces?: CanonFace[]
  /** Set by `featReactionOptions` on a row built out of a FEAT, and read only by
   *  the feat branch of `apply` below. Absent on every other kind of row, which
   *  is what makes that branch structurally unable to change one. */
  wordsFrom?: SentenceSource
}

/* The joined row line (`detailOf` in compose.ts glues mechanics and effects
 * together) gets the same budget as the mechanics line alone, for the same
 * measured reason: 46 characters is the last width that cannot wrap onto a
 * third line at a 390px viewport. Segments are dropped whole to fit. Never
 * characters. Never an ellipsis — the ellipsis is the thing this phase is here
 * to kill. */
export const DETAIL_BUDGET_CHARS = ROW_BUDGET_CHARS

const SEP = ' · '

/* ── The caster's own numbers ───────────────────────────────────────────────
 *
 * Canon cannot supply these. `character-marcus.json` stores its spellSaveDC as
 * the STRING "8 + 3 + Charisma modifier", which is a formula for a human, not a
 * number for a row. Everything below comes off the sheet. */

const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
type AbilityAbbrev = (typeof ABILITY_KEYS)[number]

function isAbilityAbbrev(s: string): s is AbilityAbbrev {
  return (ABILITY_KEYS as readonly string[]).includes(s)
}

export function casterContextOf(character: Character): CasterContext {
  return {
    spellSaveDC: character.spellSaveDC,
    spellAttackBonus: character.spellAttackBonus,
    // CHARACTER level, which is what 2024 cantrip scaling keys off.
    characterLevel: character.level,
    abilityMod: spellcastingModifier(character),
  }
}

/* The full ability names, because canon's formulas use them: "Paladin level
 * plus your spellcasting ability modifier", "Charisma modifier". The sheet
 * stores abbreviations. This is the one place the two vocabularies meet. */
const ABILITY_FULL_NAME: Record<AbilityAbbrev, string> = {
  STR: 'strength',
  DEX: 'dexterity',
  CON: 'constitution',
  INT: 'intelligence',
  WIS: 'wisdom',
  CHA: 'charisma',
}

/** The character's numbers in the shape canon's feature formulas ask for.
 *
 *  Built here rather than in lib/canon/ for the same reason `casterContextOf`
 *  is: canon knows no characters, and the moment it did there would be two
 *  answers to "what is his Charisma modifier" instead of one. */
export function featureContextOf(character: Character): FeatureContext {
  const abilityMod: Record<string, number> = {}
  for (const key of ABILITY_KEYS) {
    const score = character.abilityScores?.[key]
    if (typeof score === 'number') abilityMod[ABILITY_FULL_NAME[key]] = Math.floor((score - 10) / 2)
  }

  /* The spellcasting ability is written last and wins. `spellcastingModifier`
   * prefers the same score this loop just read, so on a filled-in sheet these
   * agree; on a sheet whose ability scores were never entered it falls back to
   * arithmetic on the printed attack bonus, and the cloak still states a number
   * instead of going quiet. */
  const spellcastingAbility = (character.spellcastingAbility ?? '').toLowerCase()
  if (spellcastingAbility) abilityMod[spellcastingAbility] = spellcastingModifier(character)

  return {
    className: character.class,
    characterLevel: character.level,
    abilityMod,
    spellcastingAbility,
  }
}

/** The spellcasting ability modifier.
 *
 *  Preferred route is the declared ability against the ability scores. The
 *  fallback is arithmetic on the sheet's own displayed numbers — spell attack
 *  is proficiency plus the modifier, so the modifier is the difference — which
 *  is right even for a sheet whose ability scores were never filled in, and
 *  which can never disagree with the "+7 to hit" printed one line above it. */
function spellcastingModifier(character: Character): number {
  const declared = (character.spellcastingAbility ?? '').slice(0, 3).toUpperCase()
  if (isAbilityAbbrev(declared)) {
    const score = character.abilityScores?.[declared]
    if (typeof score === 'number') return Math.floor((score - 10) / 2)
  }
  return character.spellAttackBonus - character.proficiencyBonus
}

/* ── Canon's filing of the action economy ───────────────────────────────── */

/* castingTimeType, verbatim from spells.json: 52 'action', 13 'bonus_action',
 * 6 'long'. 'long' means a minute or more — a spell you cast between fights.
 * It is NOT mapped, on purpose: filing it as a passive would hide it from the
 * turn list, and the prime law forbids an option disappearing. The sheet's
 * filing stands and the row still renders. */
const ECONOMY_BY_CASTING_TIME_TYPE: Record<string, EconomyFiling> = {
  action: 'action',
  bonus_action: 'bonusAction',
  reaction: 'reaction',
}

/** The exact strings canon uses when it names an action cost. Matched WHOLE,
 *  after lowercasing — "Reaction" is a declaration, but a sentence that merely
 *  contains the word ("...it is extinguished, no reaction required") is prose,
 *  and reading prose for keywords is how an app invents a rule. */
const ACTION_WORDS: Record<string, EconomyFiling> = {
  action: 'action',
  'magic action': 'action',
  'bonus action': 'bonusAction',
  reaction: 'reaction',
  'no action required': 'passive',
}

/** Canon's filing for a FEATURE, read off its `mechanics` bag.
 *
 *  Three answers, and the third is the important one:
 *
 *    exactly one action named  → that is the filing
 *    none named, bag present   → 'passive'. Canon feature records name their
 *                                action when there is one; three of the four
 *                                Hearthfire features do. A complete record
 *                                that names none is saying it is not a thing
 *                                you spend a turn on. That is how Aura of
 *                                Solace stays a passive for a REASON instead
 *                                of because its name begins with "Aura".
 *    more than one named       → undefined. Hearthfire Manifest is summoned as
 *                                a Bonus Action and cloaked as a Reaction; it
 *                                is genuinely two options wearing one name.
 *                                Canon declines to pick and so does this. Slice
 *                                6 splits it into first-class entries.
 *
 *  A record with no `mechanics` bag at all also returns undefined: absence of
 *  structure is not a statement about the action economy. */
function economyFromFeature(feature: CanonFeature): EconomyFiling | undefined {
  const declarations: string[] = []
  // paladin-progression.json puts the cost in a top-level `action` field; the
  // oath file puts it inside `mechanics`. Both are read; neither is required.
  if (typeof feature.action === 'string') declarations.push(feature.action)

  const bag = feature.mechanics
  const hasBag = !!bag && typeof bag === 'object'
  if (hasBag) {
    for (const value of Object.values(bag as Record<string, unknown>)) {
      if (typeof value === 'string') declarations.push(value)
    }
  }
  if (declarations.length === 0) return undefined

  const found = new Set<EconomyFiling>()
  for (const raw of declarations) {
    const hit = ACTION_WORDS[raw.trim().toLowerCase()]
    if (hit && hit !== 'passive') found.add(hit)
  }
  if (found.size === 1) return [...found][0]
  if (found.size > 1) return undefined
  return hasBag ? 'passive' : undefined
}

/* ── Canon's lines for a SPELL ──────────────────────────────────────────── */

/** The effects half: what happens, in canon's words, stated as facts and not
 *  as a sentence. Priority order — later entries are the first dropped when the
 *  joined row will not fit. */
function effectSegments(spell: CanonSpell): string[] {
  const out: string[] = []
  if (spell.save?.effect) out.push(spell.save.effect)
  if (spell.ritual) out.push('Ritual')
  const c = spell.components
  // Only a material that COSTS something or is CONSUMED earns a place. "V, S,
  // M" is true of most of the list and tells a player at a table nothing.
  if (c?.m && c.materialText && (c.materialConsumed || c.materialCostGp > 0)) {
    out.push(`${c.materialText}${c.materialConsumed ? ', consumed' : ''}`)
  }
  return out
}

/** Fit the joined row by dropping WHOLE effect segments, lowest value last-in
 *  first-out. If the mechanics alone already fill the budget the effects line
 *  is empty — incomplete, which the detail sheet fixes, rather than truncated,
 *  which nothing fixes. */
function fitEffects(mechanics: string, segments: string[]): string {
  let kept = segments
  while (kept.length > 0) {
    const joined = [mechanics, ...kept].filter(s => s.length > 0).join(SEP)
    if (joined.length <= DETAIL_BUDGET_CHARS) break
    kept = kept.slice(0, -1)
  }
  return kept.join(SEP)
}

/* ── The row's own budget ───────────────────────────────────────────────────
 *
 * `fitEffects` above governs the half of the line canon contributes. This
 * governs THE WHOLE LINE, whatever produced it — and it exists because the
 * browser prover measured a promise being broken.
 *
 * Slice 5's first prover run found two rows wrapping their detail onto a second
 * line, which makes a three-line row: Hearthbrand at 105 characters, Javelin at
 * 60. Neither had ever passed through a budget. `overlayCanon` returns early for
 * weapons — a weapon's arithmetic is the sheet's and canon has nothing to add —
 * so the one line on this screen nobody had ever measured was the line the melee
 * character reads first.
 *
 * TWO RULES, IN THIS ORDER.
 *
 * 1. THE DERIVATION COMES OFF. "+7 to hit (STR +3 + prof +1 magic)" spends 24 of
 *    46 characters explaining where a number he can already see came from. That
 *    is a stat-block fact, and slice 7's sheet is a stat block; on the row it
 *    costs the damage die, which is not a trade any table would make. Matched by
 *    SHAPE — a parenthetical closing a to-hit segment — never by name.
 *
 * 2. THEN WHOLE SEGMENTS, FROM THE END. The same discipline as everywhere else
 *    in this phase: dropped entire, never cut, never an ellipsis. Build order
 *    puts the to-hit and the damage first, so what falls off is the tail —
 *    reach, mastery, "Standard attack".
 *
 * THE FIRST SEGMENT IS NEVER DROPPED. A row with no detail at all is a worse
 * failure than a row one character over budget, and a single segment that
 * cannot fit is a fact about that segment, not a reason to render nothing.
 *
 * NOTHING DROPPED HERE IS LOST TODAY. Every one of these rows still exists in
 * full in the Actions Reference and the action slide-up, both still on this tab
 * until slice 9 — and slice 7 gives the whole string a permanent home. A row is
 * a headline; it was never the article. */
export function fitRowDetail(detail: string, budget = DETAIL_BUDGET_CHARS): string {
  const segments = detail
    .split(SEP)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/^([+-]?\d+\s+to\s+hit)\s*\([^)]*\)$/i, '$1'))

  let kept = segments
  while (kept.length > 1 && kept.join(SEP).length > budget) kept = kept.slice(0, -1)
  return kept.join(SEP)
}

/* ── The points/uses correction ─────────────────────────────────────────── */

/** The pool this option spends, found by NAME.
 *
 *  By name and not by id because the overlay is handed a flat `ActionOption`,
 *  not the `ClassFeature` it came from, and `poolsOf` already resolves all
 *  three of the places a pool can physically live. A miss is silent and
 *  harmless: no pool means nothing to reprice. */
function unitForOption(option: ActionOption, character: Character): ResourceUnit | undefined {
  const key = normalizeName(option.name)
  const pool = poolsOf(character).find(p => normalizeName(p.name) === key)
  return pool?.unit
}

/** "15/40 uses" → "15/40 points". The counter reading only — a segment that
 *  merely contains a number is untouched, and the fraction must lead. */
function repriceCounter(line: string, unit: ResourceUnit): string {
  return line.replace(/(\d+\s*\/\s*\d+)\s+uses\b/g, `$1 ${unit}`)
}

/* ── The overlay ────────────────────────────────────────────────────────── */

/** Rewrite an option's display strings from canon, where canon has something to
 *  say. Never throws; a miss returns the option's own words with
 *  `provenance: 'sheet'`.
 *
 *  Runs AFTER `categorizeTurnOptions()` and BEFORE `build()`/`detailOf()`,
 *  which is the seam that already owns the joined row. */
export function overlayCanon(option: ActionOption, character: Character): OverlaidOption {
  try {
    return apply(option, character)
  } catch {
    // Rule 4. A canon record shaped in a way this code did not anticipate must
    // cost the player a better line, never the row itself.
    return { ...option, provenance: 'sheet' }
  }
}

function apply(option: ActionOption, character: Character): OverlaidOption {
  const base: OverlaidOption = { ...option, provenance: 'sheet' }

  // The two pinned corrections apply whether or not canon knows the name. They
  // are facts about MARCUS'S sheet — the pool he owns is measured in points —
  // and homebrew deserves the right noun as much as canon does.
  const unit = unitForOption(option, character)
  if (unit && unit !== 'uses') {
    base.effectsLine = repriceCounter(base.effectsLine, unit)
    if (base.usesRemaining) base.usesRemaining = repriceCounter(base.usesRemaining, unit)
    if (base.unaffordableReason) {
      base.unaffordableReason = base.unaffordableReason.replace(/\buses\b/g, unit)
    }
  }

  // A weapon is the sheet's own arithmetic — its to-hit already includes a
  // magic bonus and a feat canon has never heard of. Canon has nothing to add.
  if (option.type === 'weapon') return base

  // Both indexes, both ways round. The sheet's own idea of what is a "spell"
  // and what is a "feature" is not canon's: Divine Smite is a level 1 spell
  // that half the world still stores as a class feature, and an aura is a
  // feature on one sheet and a spell on the next. Matching a name is the whole
  // of the claim being made here, so it is made against everything canon knows.
  const spell = spellByName(option.name)
  const feature = featureByName(option.name)
  const preferSpell = option.type === 'spell'
  const matchedSpell = preferSpell ? spell : (feature ? undefined : spell)
  const matchedFeature = preferSpell ? (spell ? undefined : feature) : feature

  if (matchedSpell) {
    const line = mechanicsLine(matchedSpell, casterContextOf(character))
    const filing = ECONOMY_BY_CASTING_TIME_TYPE[matchedSpell.castingTimeType]
    return {
      ...base,
      canonId: matchedSpell.id,
      provenance: 'canon',
      // format.ts guarantees a non-empty line; the guard is here so that a
      // future canon package with a stranger record cannot blank a row.
      mechanicsLine: line.text || base.mechanicsLine,
      effectsLine: fitEffects(line.text, effectSegments(matchedSpell)),
      ...(filing ? { canonEconomy: filing } : {}),
    }
  }

  if (matchedFeature) {
    // Canon's feature records carry `rawText` and a free-form `mechanics` bag —
    // paragraphs, not numbers. There is nothing structural to build a row line
    // from, and inventing one from prose is exactly what format.ts refuses to
    // do. So the sheet keeps its line and canon contributes the one thing it
    // states unambiguously: how the feature is paid for. The prose reaches the
    // player in Slice 7's detail sheet, whole, where there is room for it.
    //
    // AND WHERE CANON NAMES TWO PRICES, IT CARRIES BOTH. `economyFromFeature`
    // returns `undefined` for such a record and is right to — but `undefined`
    // means the sheet's default of 'action' stands, which tells Marcus his
    // Reaction is an Action with total confidence. The faces are the answer the
    // refusal was groping at; the composer, which owns the economy, spends them.
    const filing = economyFromFeature(matchedFeature)
    const faces = facesOf(matchedFeature)
    return {
      ...base,
      canonId: `feature-${normalizeName(matchedFeature.name)}`,
      provenance: 'canon',
      ...(filing ? { canonEconomy: filing } : {}),
      ...(faces.length > 0 ? { canonFaces: faces } : {}),
    }
  }

  /* ── THE THIRD INDEX ───────────────────────────────────────────────────────
   *
   * This module has always asked canon two questions — is it a spell, is it a
   * feature — and a FEAT is neither. So a Sentinel row built entirely out of
   * canon's own sentences reached the screen marked `provenance: 'sheet'`: the
   * book's words, over a mark that says they are his. That is this phase's
   * fault in its politest costume, and it is the reason Marcus could quote a
   * rule at his DM believing he had written it.
   *
   * TWO CONDITIONS, AND THE SECOND IS THE ONE THAT MATTERS. Canon knowing a
   * feat by this name is NOT the claim; the claim is that these particular
   * words came out of the book, which only `effectSentencesOf` knows and which
   * it says in `wordsFrom`. A homebrew Sentinel that states its own reaction
   * arrives here `wordsFrom: 'sheet'` with canon holding a record of the same
   * name, and stays his. So does a hand-written FEATURE called Sentinel, which
   * carries no `wordsFrom` at all.
   *
   * LAST, after both existing branches have returned, so that no row that
   * reaches canon today can be diverted here. The only rows this can touch are
   * ones canon's spell and feature indexes both missed. */
  if (base.wordsFrom === 'canon') {
    const matchedFeat = featByName(option.name)
    if (matchedFeat) {
      return {
        ...base,
        canonId: `feat-${normalizeName(matchedFeat.name)}`,
        provenance: 'canon',
      }
    }
  }

  return base
}
