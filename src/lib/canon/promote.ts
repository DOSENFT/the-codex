/* The four promotions out of band 1's plain list.
 *
 * Combat Open Book slice 2. `docs/plans/combat-open-book/04-slices.md`.
 *
 * ── WHY THIS IS ITS OWN FILE ────────────────────────────────────────────────
 * It was three private functions in `catalogue/detail.ts`, which is the
 * GRIMOIRE's assembler. The combat page asks the same question — what is the
 * one number, what does it cost, what does upcasting do, which book — and had
 * no way to ask it, so the combat sheet painted a flat fact list and the
 * Grimoire painted a 34px numeral. Marcus's complaint in his own words was
 * "switching back and forth"; two answers to one question is that complaint
 * with a shorter walk.
 *
 * So the parsing sits under BOTH assemblers rather than inside one of them.
 * `canon/` is the lower layer here — `catalogue/detail.ts` already imports
 * `canon/bands.ts`, never the reverse — which is why this file imports nothing
 * from `catalogue/` or `turn/` and why `HeroCost` and `HeroDice` came down with
 * it. `catalogue/detail.ts` re-exports both, so no importer above moved.
 *
 * ── THE COST LINE IS THE ONE THING THE CALLERS DISAGREE ABOUT ───────────────
 * Three of the four promotions are canon's outright. The cost is not. The
 * Grimoire wants canon's casting time, and a word derived from the entry's
 * `turnCost` when canon is silent — so it passes that word as `fallbackCost`.
 * The combat page wants its ROW's word, which is richer than canon's (it names
 * the slot level this cast will spend, which canon cannot know) — so it passes
 * `null`, takes canon's OCCASION out of the result, and merges. See
 * `turn/detail.ts:combatCost`, which records the measurement that settled it.
 *
 * Neither preference is hard-coded here, and that is deliberate: this file
 * would have to import either `catalogue/` or `turn/` to hold an opinion, and
 * it is below both.
 *
 * ── WHAT PROVES THE MOVE ────────────────────────────────────────────────────
 * `promote.snapshot.test.ts` froze all 86 entries' promotions BEFORE this file
 * existed and asserts them byte for byte after. A move produces no new
 * behaviour to look at, so nothing on the screen tells you it went wrong. */

import type { BandFact, CanonBands } from './bands'

/** Band 1's hero line: what it costs, and — when canon said so in the same
 *  breath — when you may pay it. */
export interface HeroCost {
  word: string
  /** "immediately after hitting a creature with a Melee weapon", or null. */
  when: string | null
  /** `'time'` is canon pricing it in minutes or hours — Prayer of Healing is
   *  "10 minutes". It is NOT one of the three turn slots and must not be
   *  coloured as one; see `heroCostFrom`. */
  tone: 'action' | 'bonus' | 'reaction' | 'passive' | 'time'
}

/** Band 1's 34px numeral. The one number he is looking for mid-fight. */
export interface HeroDice {
  dice: string
  note: string | null
  tone: 'damage' | 'healing' | 'ward'
}

/** Everything promoted out of the grid, plus the list of what was consumed
 *  doing it. `consumed` is what makes the fall-through rule structural rather
 *  than a habit: the panel's grid draws every fact whose label is NOT in this
 *  list, so a label nobody has ever seen before lands in the grid by
 *  construction. There is no allowlist to fall off. */
export interface Promotions {
  cost: HeroCost | null
  hero: HeroDice | null
  higherLevel: string | null
  source: string | null
  consumed: readonly string[]
}

/** The hero cost line, from canon's casting time alone.
 *
 *  Canon writes a spell's casting time as cost-and-occasion in one string —
 *  "Bonus Action, taken immediately after hitting a creature with a Melee
 *  weapon" — so the first comma is the seam, and both halves are kept. The
 *  occasion is the half that answers "can I do this right now", which is the
 *  question being asked at the moment this panel is open.
 *
 *  ── THE FALL-THROUGH THAT WAS A LIE, FOUND 2026-08-29 ──────────────────────
 *  The tone started as "bonus, else reaction, else ACTION", and Prayer of
 *  Healing is priced at "10 minutes". The word printed was canon's and correct;
 *  the colour said Action, which is a claim he could act on at a table — he
 *  would go looking for it in his Action list mid-fight and it is not there.
 *  Found by measuring the parse across all 84 entries rather than by reading
 *  the branch, which is the only way a default that is usually right is ever
 *  caught. So the default is `'time'`: a duration canon named, and not one of
 *  the three turn slots. `'Action'` is claimed only when canon says the word. */
export function heroCostFrom(facts: readonly BandFact[]): HeroCost | null {
  const castingTime = facts.find(f => f.label === 'Casting Time')?.value
  if (!castingTime) return null

  const comma = castingTime.indexOf(',')
  const word = comma === -1 ? castingTime : castingTime.slice(0, comma)
  const when = comma === -1 ? null : castingTime.slice(comma + 1).trim() || null
  const lower = word.toLowerCase()
  const tone: HeroCost['tone'] =
    lower.includes('bonus') ? 'bonus'
    : lower.includes('reaction') ? 'reaction'
    : lower.includes('action') ? 'action'
    : 'time'
  return { word: word.trim(), when, tone }
}

/** "1d6 Fire on the hit" → the numeral and the words after it.
 *  No match means no hero numeral: the value still prints as a grid row. */
const DICE = /^\s*(\d*d\d+(?:\s*[+-]\s*\d+)?)\s*(.*)$/

/** The numeral, and the grid row it is allowed to stand in for.
 *
 *  THE SECOND HALF IS NOT A DETAIL. A promotion that does not say what it
 *  consumed shows the die twice; a promotion that assumes it consumed the whole
 *  row deletes whatever else that row said. `factsFromFeature` appends to a
 *  feature's value — the working of a computed number, or "— free: no Action,
 *  no Bonus Action…" — and the numeral carries none of that. So the row is
 *  consumed ONLY when its value is exactly the string the numeral was parsed
 *  from. Anything the layout cannot carry keeps its row, by construction. */
export function heroDiceFor(
  detailFacts: readonly BandFact[],
  bands: CanonBands
): { hero: HeroDice; consumes: string | null } | null {
  // A spell states its dice as a labelled row; a feature states them inside the
  // mechanics bag, where the label is canon's field name and varies per feature.
  const damage = detailFacts.find(f => f.label === 'Damage')
  const healing = detailFacts.find(f => f.label === 'Healing')
  const featureDie = bands.featureFacts.find(f => f.shape === 'dice')

  const picked =
    damage ? { value: damage.value, tone: 'damage' as const, label: 'Damage' }
    : healing ? { value: healing.value, tone: 'healing' as const, label: 'Healing' }
    : featureDie
      ? { value: featureDie.raw, tone: 'ward' as const, label: featureDie.label }
      : null
  if (!picked) return null

  const match = DICE.exec(picked.value)
  if (!match) return null

  const row = detailFacts.find(f => f.label === picked.label)
  return {
    hero: { dice: match[1].replace(/\s+/g, ''), note: match[2].trim() || picked.label, tone: picked.tone },
    consumes: row && row.value === picked.value ? picked.label : null,
  }
}

/** Both assemblers' band 1, in one place.
 *
 *  `fallbackCost` is used ONLY when canon states no casting time. When it is
 *  used, nothing is consumed — that is the case `consumed` exists to get right:
 *  a hero line built from the caller's own knowledge rather than from a fact
 *  must not claim a fact, or a feature that happens to carry a Casting Time row
 *  would show a cost and hide the row it did not read. */
export function promoteBands(
  facts: readonly BandFact[],
  bands: CanonBands,
  fallbackCost: HeroCost | null,
): Promotions {
  const fromCanon = heroCostFrom(facts)
  const cost = fromCanon ?? fallbackCost
  const die = heroDiceFor(facts, bands)
  const higherLevel = facts.find(f => f.label === 'Higher Level')?.value ?? null
  const source = facts.find(f => f.label === 'Source')?.value ?? null

  /* Consumed only when actually USED. A spell with no `Damage` row does not
   * consume one, and — the case that matters — a hero cost line built from the
   * fallback rather than from a `Casting Time` row consumes nothing. */
  const consumed = [
    fromCanon ? 'Casting Time' : null,
    die?.consumes ?? null,
    higherLevel !== null ? 'Higher Level' : null,
    source !== null ? 'Source' : null,
  ].filter((l): l is string => l !== null)

  return { cost, hero: die?.hero ?? null, higherLevel, source, consumed }
}
