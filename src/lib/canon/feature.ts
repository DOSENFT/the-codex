/* Feature mechanics, resolved into facts a row can state.
 *
 * WHAT THIS IS FOR. Canon files a feature's numbers in a `mechanics` bag beside
 * its paragraph — Hearthfire Manifest carries eight entries, including
 * `tempHP: "Paladin level + Charisma modifier"`. That string is a formula for a
 * human. At a table Marcus needs the number, and he needs it to be HIS number,
 * not a number frozen in the corpus. (Canon also ships `atLevel7.tempHPWithCha18
 * = 11`. Reading it would make the app right until the moment he levels. This
 * module never touches it; lookup.test.ts test 4 already bans the level-7
 * snapshot fields from src/, and this file is the reason there is no temptation.)
 *
 * HOW IT DECIDES WHAT TO SAY — by the SHAPE of canon's VALUE, never by its key.
 * The bag is free-form: every feature names its fields differently, so a module
 * that recognised `tempHP` or `retaliation` would be a lookup table of one
 * character's feature list wearing a parser's clothes. That is the same mistake
 * as the Aura name-sniff pinned at options.ts:365. Instead each entry is
 * classified by what its value IS:
 *
 *     "Paladin level + Charisma modifier"       → computed  → resolvable to 12
 *     "1d10 Fire to a creature that hits you"   → dice      → 1d10 Fire
 *     "Until the Temporary Hit Points ..."      → duration  → kept verbatim
 *     "Reaction"                                → economy   → the row's cost
 *     "Bright Light 10 ft, Dim Light 10 beyond" → measure
 *     "1 Channel Divinity use"                  → prose
 *
 * The KEY is used for exactly one thing: the label, humanised. That is canon's
 * own word for the fact, which is the opposite of guessing at one.
 *
 * WHAT IT REFUSES TO DO. A value it cannot resolve is dropped whole. Nothing is
 * abbreviated, nothing is paraphrased, and there is no ellipsis — a fact the app
 * cannot state honestly is a fact the app does not state. Dropping a fact never
 * drops an option: the row still renders, from the sheet's own words.
 *
 * Table Truth slice 6. */

import type { CanonFeature } from './types'

/** The character's numbers, in the shape canon's formulas ask for. A plain data
 *  bag on purpose — this module knows nothing about `Character`, storage or
 *  React. Built by `featureContextOf` in the turn layer. */
export interface FeatureContext {
  /** e.g. "Paladin". Compared against the class canon names in "<X> level". A
   *  formula for a class this character does not have resolves to nothing. */
  className: string
  characterLevel: number
  /** Modifiers keyed by the FULL ability name, lowercased: canon writes
   *  "Charisma modifier", not "CHA modifier". */
  abilityMod: Readonly<Record<string, number>>
  /** e.g. "charisma" — what "spellcasting ability modifier" resolves through. */
  spellcastingAbility: string
}

export type FactShape = 'computed' | 'dice' | 'duration' | 'economy' | 'measure' | 'prose'

export interface FeatureFact {
  /** Canon's field name, verbatim. */
  key: string
  /** The field name humanised: `tempHP` → "temp HP". */
  label: string
  shape: FactShape
  /** What a row would say. For 'computed' and 'dice' this is the structured
   *  value plus the label; for everything else it is canon's string as written. */
  value: string
  /** Canon's value, verbatim, for the detail sheet and for diagnosing a parse. */
  raw: string
  /** THIS DIE COSTS NOTHING TO ROLL. Slice 10e, and it is here because Marcus
   *  said the opposite out loud.
   *
   *  His words, 2026-08-27: Hearthfire Manifest is "a bonus action, then it's a
   *  reaction 1d10 damage if I get hit". Canon says otherwise — the ACTIVATION
   *  is the Reaction (plus one Channel Divinity use), and after that "the
   *  creature takes 1d10 Fire damage in retaliation" every single time it hits
   *  him, for free, with no cap and nothing to decide. He has been playing a
   *  reaction he already spent, which means he has been holding back a reaction
   *  he still had. That is the app's fault: the row said "1d10 Fire retaliation"
   *  and left the price blank, and a blank price at a table reads as expensive.
   *
   *  Derived by SHAPE, never by name (see `isFreeRider`): a die that fires on a
   *  trigger of its own and names no cost has no cost. Undefined on every fact
   *  that does not meet both halves — Smoldering Smite's "1d8 Fire" is the die
   *  the Smite already paid for, states no trigger, and is left alone. */
  free?: true
}

/* ── Classification, by shape ──────────────────────────────────────────────── */

/** Matched WHOLE. A value that merely CONTAINS "reaction" is prose, and reading
 *  prose for keywords is how an app invents a rule. */
const ECONOMY_WHOLE = /^(?:free |magic |bonus )?action$|^reaction$/i

/** A die expression and the damage type that follows it. "1d10 Fire" out of
 *  "1d10 Fire damage in retaliation" — an extraction, not a summary. */
const DICE_AND_TYPE = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+([A-Z][a-z]+)/

/** A duration reads as a clause, not a value, so it is kept whole and unlabelled. */
const DURATION_LEAD = /^(?:until|for|while|lasts)\b/i

const MEASURE = /\b\d+\s*(?:ft|feet|foot|mile|miles)\b/i

/* ── Free riders ────────────────────────────────────────────────────────────
 *
 * A fact earns `free` on two conditions, both read off canon's own sentence and
 * neither of them a name:
 *
 *   1. IT HAS A TRIGGER OF ITS OWN. "to a creature that hits you with a melee
 *      attack" fires on something the WORLD does, so it is not the thing the
 *      feature's cost line already bought. Smoldering Smite's "1d8 Fire" states
 *      no trigger — it is the damage the Smite you cast is made of — and is
 *      therefore not free and not marked.
 *   2. IT NAMES NO PRICE. Every cost in 2024 is spelled out where it applies:
 *      an Action, a Bonus Action, a Reaction, a use, a slot, a point. A sentence
 *      that mentions none of them is not being coy; there is nothing to pay.
 *
 * Both halves are required. One alone is a guess; together they are a reading. */
const TRIGGER_CLAUSE =
  /\b(?:when|whenever|if|each time|any time)\b|\bthat\s+\w+s\s+you\b|\bin retaliation\b/i

const COST_PHRASE =
  /\b(?:reaction|bonus\s+action|action|expend|expends|spend|spends|use of|uses of|spell\s+slot|charge|charges)\b/i

/** Does canon state this value as something that happens to you for free?
 *
 *  Exported so a test can hold the RULE rather than the two records that happen
 *  to satisfy it today — canon's next package is allowed to add a third. */
export function isFreeRider(raw: string): boolean {
  const text = raw.trim()
  if (!text) return false
  if (!TRIGGER_CLAUSE.test(text)) return false
  return !COST_PHRASE.test(text)
}

/* ── Token resolution ──────────────────────────────────────────────────────── */

const SUM = /\s*\+\s*/
const LEVEL_TOKEN = /^(.+?)\s+levels?$/i
const MODIFIER_TOKEN = /^(.+?)\s+(?:ability\s+)?modifier$/i
const LITERAL = /^-?\d+$/

function fold(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** One term of a formula, or null when this context cannot prove it.
 *
 *  Null is the important return. "Warlock level" for a Paladin, "Sorcery Point
 *  modifier", a term canon invents next package — all of them arrive here and
 *  all of them leave as null, which drops the whole fact rather than resolving
 *  half a formula into a confident wrong number. */
function resolveTerm(term: string, ctx: FeatureContext): number | null {
  const t = term.trim()
  if (LITERAL.test(t)) return Number(t)

  const level = LEVEL_TOKEN.exec(t)
  if (level) {
    // "Paladin level" only counts for a Paladin. A single-class sheet makes
    // class level and character level the same number; a multiclass sheet would
    // not, and this is the line to revisit when one exists.
    return fold(level[1]) === fold(ctx.className) ? ctx.characterLevel : null
  }

  const mod = MODIFIER_TOKEN.exec(t)
  if (mod) {
    const name = fold(mod[1])
    const ability = name === 'spellcasting' ? fold(ctx.spellcastingAbility) : name
    const value = ctx.abilityMod[ability]
    return typeof value === 'number' ? value : null
  }

  return null
}

/** A sum of terms, or null if ANY term is unprovable. */
export function resolveFormula(raw: string, ctx: FeatureContext): number | null {
  const terms = raw.split(SUM)
  let total = 0
  for (const term of terms) {
    const value = resolveTerm(term, ctx)
    if (value === null) return null
    total += value
  }
  return total
}

/** `tempHP` → "temp HP", `cloakCost` → "cloak cost", `duration` → "duration".
 *
 *  Split before an uppercase run that follows a lowercase letter, then lower the
 *  first letter of each word EXCEPT an all-caps one: "Cost" was capitalised by
 *  camelCase and means nothing, but "HP" was capitalised by canon and means
 *  hit points. Mid-sentence a label should read like a label. */
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => (word === word.toUpperCase() ? word : word.charAt(0).toLowerCase() + word.slice(1)))
    .join(' ')
}

function classify(raw: string, ctx: FeatureContext): { shape: FactShape; value: string } {
  const text = raw.trim()

  if (ECONOMY_WHOLE.test(text)) return { shape: 'economy', value: text }

  const computed = resolveFormula(text, ctx)
  if (computed !== null) return { shape: 'computed', value: String(computed) }

  const dice = DICE_AND_TYPE.exec(text)
  if (dice) return { shape: 'dice', value: `${dice[1]} ${dice[2]}` }

  if (DURATION_LEAD.test(text)) return { shape: 'duration', value: text }
  if (MEASURE.test(text)) return { shape: 'measure', value: text }
  return { shape: 'prose', value: text }
}

/** Every mechanics entry canon carries for this feature, classified and — where
 *  the shape allows — resolved against this character.
 *
 *  Order is canon's own key order. It is the order the feature was written in,
 *  which is the closest thing to an authored order that exists. */
export function featureFacts(
  feature: CanonFeature | undefined,
  ctx: FeatureContext
): FeatureFact[] {
  const mechanics = feature?.mechanics
  if (!mechanics) return []

  const facts: FeatureFact[] = []
  for (const [key, value] of Object.entries(mechanics)) {
    // Nested objects and numbers do appear in the bag (`atLevel7` is one). Only
    // strings are formulas; anything else belongs to the detail sheet.
    if (typeof value !== 'string' || value.trim().length === 0) continue
    const { shape, value: rendered } = classify(value, ctx)
    const label = humanizeKey(key)
    // Only a DIE is asked the price question. A duration or a light radius is
    // not something a player worries about paying for, and marking one "free"
    // would be noise where the whole point is a signal.
    const free = shape === 'dice' && isFreeRider(value)
    facts.push({
      key,
      label,
      shape,
      // The label rides along with a bare number or a bare die — "12" and
      // "1d10 Fire" mean nothing alone — and is left off a clause that already
      // reads as a sentence.
      value:
        shape === 'computed' || shape === 'dice' ? `${rendered} ${label}` : rendered,
      raw: value,
      ...(free ? { free: true as const } : {}),
    })
  }
  return facts
}

/* Which shapes a one-line row states, in the order it states them.
 *
 * The numbers first, because they are what a player reaches for mid-turn; then
 * the die; then how long it lasts. `economy` is excluded because the row already
 * prints the cost, `measure` and `prose` because they are description rather
 * than a value — and the detail sheet in slice 7 shows all six. */
const ROW_SHAPES: readonly FactShape[] = ['computed', 'dice', 'duration']

/** The facts joined for a row, ' · '-separated. NOT budgeted here: the caller
 *  passes the result through `fitRowDetail`, which drops whole segments to fit
 *  and is the single place that decides how wide a row is. */
export function factsLine(facts: readonly FeatureFact[]): string {
  return ROW_SHAPES.flatMap(shape => facts.filter(f => f.shape === shape))
    // Six characters, and they are the six Marcus was missing. "1d10 Fire
    // retaliation" left the price blank; "1d10 Fire retaliation (free)" answers
    // the question he actually asked. `fitRowDetail` drops WHOLE segments, so
    // if the row cannot afford this segment it loses the retaliation entirely
    // rather than showing it with the price cut off — which is the correct
    // failure: a half-priced fact is worse than an absent one.
    .map(f => (f.free ? `${f.value} (free)` : f.value))
    .join(' · ')
}
