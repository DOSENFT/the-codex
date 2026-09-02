/* One catalogue entry, opened.
 *
 * Open Book slice 3. `docs/plans/grimoire/03-program-design.md`.
 *
 * ── WHAT THIS ADDS OVER `canon/bands.ts` ────────────────────────────────────
 * `bands.ts` answers "what does canon say about this thing". It is pure over
 * canon and knows nothing about a catalogue. This module answers the question
 * the Grimoire actually asks, which is "what does canon say about this thing,
 * AND where do I stand with it" — the lock, the slot he holds, the tags along
 * the top. The first half it delegates; the second half is the whole of its job.
 *
 * It is deliberately the SECOND caller of `bands.ts` and not a second assembler.
 * `canon/bands.test.ts` greps this file by name and fails if it ever imports
 * `statBlock`, `splitTactics`, `personaliseBullets` or `featureFacts` directly.
 * That test was written in slice 2, before this file existed, precisely so that
 * slice 3 could not quietly grow the drift slice 2 was run to prevent.
 *
 * ── THE LOCK IS A STRIP HE CAN READ, NOT A WALL ─────────────────────────────
 * Gate 1, and Marcus's own words: the ones his level does not reach "should be
 * locked from being prepared, and visually locked, but still provide me the
 * ability to see them and their details". So a `LockNotice` is a SENTENCE, and
 * every band is assembled for a locked entry exactly as it is for an open one.
 * Nothing here may cause a band to be withheld. There is no branch below that
 * returns early on a lock, and that absence is the feature.
 *
 * ── WHOSE WORDS ARE THESE ───────────────────────────────────────────────────
 * The lock sentence and the tag labels are the APP's words and do not pretend
 * otherwise — they are statements about his sheet, not about the rules. Every
 * word that claims to be a rule comes through `bands.ts` from `src/canon/`, and
 * `provenance` says which he is reading. */

import type { Character } from '../character'
import { canonBands, type BandFact, type CanonBands } from '../canon/bands'
import type { CatalogueEntry } from './types'

/** Why he cannot prepare it, in a sentence he can read without doing arithmetic.
 *
 *  `unlocksAt` is kept alongside the text because the row draws a chip from the
 *  number and the panel draws a strip from the sentence, and re-parsing the
 *  number back out of the sentence is how the two come to disagree. */
export interface LockNotice {
  unlocksAt: number
  text: string
}

/** The chips along the top of the sheet. `tone` is the only styling decision
 *  made here; where they sit and what they look like is the panel's business. */
export interface DetailTag {
  label: string
  tone: 'prepared' | 'always' | 'locked' | 'concentration' | 'free'
}

/** Band 1's hero line: what it costs, and — when canon said so in the same
 *  breath — when you may pay it. */
export interface HeroCost {
  word: string
  /** "immediately after hitting a creature with a Melee weapon", or null. */
  when: string | null
  /** `'time'` is canon pricing it in minutes or hours — Prayer of Healing is
   *  "10 minutes". It is NOT one of the three turn slots and must not be
   *  coloured as one; see `heroCostFor`. */
  tone: 'action' | 'bonus' | 'reaction' | 'passive' | 'time'
}

/** Band 1's 34px numeral. The one number he is looking for mid-fight. */
export interface HeroDice {
  dice: string
  note: string | null
  tone: 'damage' | 'healing' | 'ward'
}

export interface EntryDetail {
  title: string
  /** "Level 1 Evocation · Paladin · PHB 2024" — the mono sub-line. */
  subtitle: string
  tags: DetailTag[]
  /** Non-null exactly when `entry.lockedUntil` is. */
  lock: LockNotice | null
  bands: CanonBands

  /* ── THE PROMOTIONS ────────────────────────────────────────────────────────
   * Gate 3 decision 3: band 1 is a LAYOUT, not a dump, and that is the decision
   * most likely to cause a silent loss. The mockup promotes four things out of
   * the plain list — the cost to a hero line, the dice to a 34px numeral, the
   * upcast text and the book down into band 2 — and a promotion is a place a
   * fact can go missing.
   *
   * The PARSING of those four happens here, where it is testable without a
   * browser. The LAYOUT stays in the panel. And `consumed` is what makes the
   * fall-through rule structural rather than a habit: the panel's grid draws
   * every fact whose label is NOT in this list, so a label nobody has ever seen
   * before lands in the grid by construction. There is no allowlist to fall off. */
  cost: HeroCost | null
  hero: HeroDice | null
  /** Band 2's upcast box. */
  higherLevel: string | null
  /** Band 2's provenance line — "PHB 2024". */
  source: string | null
  consumed: readonly string[]
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

const ordinal = (n: number): string => ORDINALS[n] ?? `level ${n}`

/** "two levels off" reads better than "you are 2 levels away" and is the same
 *  fact. Spelled out to nine because that is as far as a lock can ever be: the
 *  catalogue's furthest entry unlocks at 20 and he cannot be below 1. */
const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

const gapWords = (gap: number): string => WORDS[gap] ?? String(gap)

/** How many slots of this level he holds right now.
 *
 *  Returns null — not 0 — when the level is absent from `spellSlots` entirely,
 *  because "you have none of these yet" and "you have spent all of yours" are
 *  different sentences and only the first is about his LEVEL. Slot Truth made
 *  the absent key the truth; this reads it as such rather than defaulting. */
function slotsAt(character: Character, level: number): { current: number; max: number } | null {
  const slot = character.spellSlots?.[level]
  return slot ? { current: slot.current, max: slot.max } : null
}

/** The lock, as a sentence.
 *
 *  Two facts, joined only when both are true: the level he needs, and — for a
 *  spell whose slot level he does not yet hold — the slots. They are separate
 *  reasons and a player who is told only one will ask about the other. */
export function lockNoticeFor(entry: CatalogueEntry, character: Character): LockNotice | null {
  if (entry.lockedUntil === null) return null

  const gap = entry.lockedUntil - character.level
  const distance =
    gap > 0
      ? `You're level ${character.level} — ${gapWords(gap)} level${gap === 1 ? '' : 's'} off`
      : `You're level ${character.level}`

  const level = entry.spellLevel
  const needsSlots = level !== null && level > 0 && slotsAt(character, level) === null
  const slotHalf = needsSlots ? `, and you don't have ${ordinal(level!)}-level slots yet` : ''

  return {
    unlocksAt: entry.lockedUntil,
    text:
      `You get this at level ${entry.lockedUntil}. ${distance}${slotHalf}. ` +
      `You can read all of it now; you just can't prepare it.`,
  }
}

/** "Level 1 Evocation · Paladin · PHB 2024". */
function subtitleFor(entry: CatalogueEntry): string {
  const spell = entry.canonSpell
  if (entry.kind === 'spell') {
    const school = spell?.school ?? ''
    const level =
      entry.spellLevel === 0
        ? [school, 'cantrip'].filter(Boolean).join(' ')
        : `Level ${entry.spellLevel ?? '?'}${school ? ` ${school}` : ''}`
    return [level, entry.origin, spell?.source].filter(Boolean).join(' · ')
  }

  // A feature's arrival level is the same number the lock uses when it is
  // locked, and canon's own `level` when it is not. Stated either way — "from
  // Paladin level 2" is the answer to "why do I have this", which is a question
  // the sheet has never answered anywhere.
  const at =
    entry.lockedUntil ?? (typeof entry.canonFeature?.level === 'number' ? entry.canonFeature.level : null)
  return [entry.origin, at !== null && at > 0 ? `from Paladin level ${at}` : ''].filter(Boolean).join(' · ')
}

/** The chips. Order is fixed for the same reason the bands are: the eye learns
 *  one shape once. Lock first, because it changes what the rest of them mean. */
function tagsFor(entry: CatalogueEntry): DetailTag[] {
  const tags: DetailTag[] = []
  if (entry.lockedUntil !== null) {
    tags.push({ label: `Level ${entry.lockedUntil}`, tone: 'locked' })
  }
  if (entry.alwaysPrepared) tags.push({ label: 'Always prepared', tone: 'always' })
  else if (entry.prepared) tags.push({ label: 'Prepared', tone: 'prepared' })

  if (entry.canonSpell?.concentration) tags.push({ label: 'Concentration', tone: 'concentration' })
  if (entry.canonSpell?.ritual) tags.push({ label: 'Ritual', tone: 'free' })
  return tags
}

/** Band 1's slot row: "1st — you have 4", "3rd — none yet".
 *
 *  THE ROW MARCUS ASKED FOR TWICE OVER. It is item 4 of his eleven answered on
 *  the surface where it is useful rather than only on the one where it was
 *  wrong: a spell whose slot level is absent from his sheet says so in the same
 *  breath as it says what it costs, instead of showing him a slot row that
 *  quietly implies he owns one.
 *
 *  Cantrips get no row at all — a cantrip costs no slot and a row reading
 *  "0th — none" is noise that has to be read to be dismissed. */
function slotFact(entry: CatalogueEntry, character: Character): BandFact | null {
  const level = entry.spellLevel
  if (entry.kind !== 'spell' || level === null || level < 1) return null

  const slots = slotsAt(character, level)
  return {
    label: 'Slot',
    value:
      slots === null
        ? `${ordinal(level)} — none yet`
        : `${ordinal(level)} — you have ${slots.current} of ${slots.max}`,
  }
}

const COST_TONE: Record<string, HeroCost['tone']> = {
  action: 'action', bonus: 'bonus', reaction: 'reaction', passive: 'passive',
}

/** The hero cost line.
 *
 *  Canon writes a spell's casting time as cost-and-occasion in one string —
 *  "Bonus Action, taken immediately after hitting a creature with a Melee
 *  weapon" — so the first comma is the seam, and both halves are kept. The
 *  occasion is the half that answers "can I do this right now", which is the
 *  question being asked at the moment this panel is open.
 *
 *  When canon has no casting time (a feature, a feat) the cost comes from the
 *  entry's own `turnCost`, which the builder derived from canon by SHAPE. And
 *  `'other'` yields NO hero line at all: canon did not price it, and a hero line
 *  is the largest type on the screen — the wrong word there is worse than no
 *  word. It stays available as an ordinary grid row either way.
 *
 *  ── THE FALL-THROUGH THAT WAS A LIE, FOUND 2026-08-29 ──────────────────────
 *  The tone started as "bonus, else reaction, else ACTION", and Prayer of
 *  Healing is priced at "10 minutes". The word printed was canon's and correct;
 *  the colour said Action, which is a claim he could act on at a table — he
 *  would go looking for it in his Action list mid-fight and it is not there.
 *  Found by measuring the parse across all 84 entries rather than by reading
 *  the branch, which is the only way a default that is usually right is ever
 *  caught. So the default is now `'time'`: a duration canon named, and not one
 *  of the three slots. `'Action'` is claimed only when canon says the word. */
function heroCostFor(entry: CatalogueEntry, facts: readonly BandFact[]): HeroCost | null {
  const castingTime = facts.find(f => f.label === 'Casting Time')?.value
  if (castingTime) {
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

  if (entry.turnCost === 'other') return null
  const word =
    entry.turnCost === 'bonus' ? 'Bonus Action'
    : entry.turnCost === 'reaction' ? 'Reaction'
    : entry.turnCost === 'passive' ? 'Always active'
    : 'Action'
  return { word, when: null, tone: COST_TONE[entry.turnCost] ?? 'action' }
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
function heroDiceFor(
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

/** Everything the detail panel paints. Pure: no hooks, no fetch, no clock. */
export function entryDetail(entry: CatalogueEntry, character: Character): EntryDetail {
  const bands = canonBands(
    {
      name: entry.name,
      spell: entry.canonSpell,
      feature: entry.canonFeature,
      feat: entry.canonFeat,
      /* Gate 3 decision 4: canon wins the WORDS, the sheet wins the STATE. His
       * own text reaches band 2 only when canon is silent, which is the whole
       * complaint that opened this phase — the app was showing him his four-word
       * Divine Smite while canon held the paragraph. */
      fallbackText: entry.sheetText ?? '',
      fallbackFacts: [{ label: 'Source', value: entry.origin }],
    },
    character,
  )

  const slot = slotFact(entry, character)
  const withSlot = slot ? { ...bands, facts: [...bands.facts, slot] } : bands
  const facts = withSlot.facts

  const cost = heroCostFor(entry, facts)
  const die = heroDiceFor(facts, withSlot)
  const higherLevel = facts.find(f => f.label === 'Higher Level')?.value ?? null
  const source = facts.find(f => f.label === 'Source')?.value ?? null

  /* Consumed only when actually USED. A spell with no `Damage` row does not
   * consume one, and — the case that matters — a hero cost line built from
   * `turnCost` rather than from a `Casting Time` row consumes nothing, so a
   * feature that happens to carry a Casting Time fact still shows it. */
  const consumed = [
    cost && facts.some(f => f.label === 'Casting Time') ? 'Casting Time' : null,
    die?.consumes ?? null,
    higherLevel !== null ? 'Higher Level' : null,
    source !== null ? 'Source' : null,
  ].filter((l): l is string => l !== null)

  return {
    title: entry.name,
    subtitle: subtitleFor(entry),
    tags: tagsFor(entry),
    lock: lockNoticeFor(entry, character),
    bands: withSlot,
    cost,
    hero: die?.hero ?? null,
    higherLevel,
    source,
    consumed,
  }
}
