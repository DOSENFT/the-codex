// ---------------------------------------------------------------------------
// The prose seam — canon's advice, with his numbers in it
// ---------------------------------------------------------------------------
//
// SHEET TRUTH slice 5. Slices 1–4 made every number the app COMPUTES agree with
// his sheet. This file is about the numbers canon TYPED. Bless's advice says
// "At level 7 with Charisma 18 that is +1d4 and +4" because the person who
// wrote it had a level 7 Paladin with Charisma 18 in mind. Marcus has Charisma
// 16. Nothing in slices 1–4 could reach that sentence: it is not a computation
// the app got wrong, it is a sentence in a book, and the book is confidently
// telling him something false about his own character every time he opens it.
//
// So canon's strings get placeholders written into them BY HAND, and this file
// fills them in. Marcus's Gate 1 answer was "replace numbers with your live
// ones" — this is the mechanism that does it.
//
// ── THE VOCABULARY IS SIX WORDS, AND THAT IS THE POINT ─────────────────────
// A template language grows. The moment it can do arithmetic, canon's prose
// becomes code, and an author's typo becomes a combat number nobody checked.
// So there are exactly six placeholders, every one of them a number the app
// already computes and already prints on the sheet elsewhere. If a sentence
// needs a seventh, that is a decision to take at a gate, not a regex to widen.
//
// ── WHAT HAPPENS WHEN THERE IS NO ANSWER ───────────────────────────────────
// The open-world rule, unchanged since phase 1: drop whole SEGMENTS, never
// characters, and never an ellipsis. A Fighter has no spell save DC, so a
// sentence about his spell save DC is not a sentence with a hole in it — it is
// a sentence that does not apply to him, and it goes. What he must never see is
// "your DC is {saveDC}", "your DC is ", or "your DC is …". Each of those three
// is the app admitting it does not know, in a way that looks like it does.
//
// A segment is a SENTENCE, found by scanning rather than by regex — see
// `segmentsOf`. The scan is exact: the segments of a string always rejoin to
// that string, character for character, so dropping one is the only way this
// file can ever change what a kept sentence says.
//
// ── WHY IT RUNS AFTER `splitTactics`, NOT BEFORE ───────────────────────────
// `tactics.ts` finds canon's headings by shape — an all-capitals run followed
// by ':' or an em dash. `{CHA}` is an all-capitals run. Personalising first
// would hand the heading detector text the author never wrote, and a splitter
// fed edited input is a splitter whose invariant no longer means anything.
// Headings are therefore found on unmodified canon, and the substitution
// happens to the bullets that come out. `detail.ts:284` is the one call site.

import type { Character } from '../character'
import { abilityModifier } from '../character'
import { castingAbilityOf } from '../rules-2024/derive'
import type { TacticsBullet } from './tactics'

/** The whole vocabulary. Deliberately six, all character-derived, all numbers
 *  the app prints elsewhere on its own authority. */
export type Placeholder =
  | 'level'
  | 'CHA'
  | 'CHAmod'
  | 'saveDC'
  | 'spellAttack'
  | 'prof'

/** `{name}` — letters only, so canon's own braces (there are none today, and a
 *  test says so) and any JSON-ish debris could never be mistaken for one. */
const PLACEHOLDER = /\{([A-Za-z]+)\}/g

/** Canon writes "+{CHAmod}" and "+{spellAttack}" — the sign belongs to the
 *  sentence, not to the number. So a negative value has no rendering here that
 *  is not a lie: "+-1" is a fault and "-1" silently contradicts the '+' the
 *  author typed. A negative modifier therefore has NO ANSWER, and the sentence
 *  around it is dropped whole like any other unresolvable one.
 *
 *  This is not hypothetical for `{CHAmod}` — a Charisma 8 Paladin exists — and
 *  it is the reason this file resolves values rather than merely formatting
 *  them. */
function unsigned(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null
  return String(value)
}

function plain(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return String(value)
}

/** One placeholder's answer for this character, or null for "I have nothing to
 *  say about that" — which costs the sentence, never the paragraph.
 *
 *  `saveDC` and `spellAttack` are gated on the character actually being a
 *  caster. Both fields are plain non-nullable numbers on `Character` (finding
 *  BD: `turn/options.ts` prints `character.spellSaveDC` directly and is pinned
 *  byte-identical to main), so a Fighter carries an 8 in `spellSaveDC` the way
 *  an empty box carries a zero. Printing that 8 into a sentence would turn a
 *  structural default into a claim. */
function answer(name: string, char: Character): string | null {
  switch (name as Placeholder) {
    case 'level':
      return plain(char.level)
    case 'CHA':
      return plain(char.abilityScores?.CHA)
    case 'CHAmod': {
      const score = char.abilityScores?.CHA
      if (score === undefined || !Number.isFinite(score)) return null
      return unsigned(abilityModifier(score))
    }
    case 'prof':
      return unsigned(char.proficiencyBonus)
    case 'saveDC':
      return castingAbilityOf(char) ? plain(char.spellSaveDC) : null
    case 'spellAttack':
      return castingAbilityOf(char) ? unsigned(char.spellAttackBonus) : null
    default:
      // The open world, at the smallest scale there is. An unknown placeholder
      // is not an error and is not printed — the app has nothing to add, so the
      // sentence goes and the rest of the advice stands.
      return null
  }
}

/** Split a string into sentences, keeping every character.
 *
 *  `segmentsOf(s).join('') === s` for every string, which is what makes
 *  "drop a segment" the ONLY edit this file is capable of making.
 *
 *  Written as a scan rather than a regex because of the decimals canon is full
 *  of. "1d4 (avg 2.5) on every attack" is one sentence; a `split(/[.!?]/)`
 *  makes it two and would one day drop "(avg 2." onto Marcus's screen. A
 *  terminator only ends a sentence when whitespace or the end of the string
 *  follows it. */
export function segmentsOf(text: string): string[] {
  const out: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (!'.!?'.includes(text[i]!)) continue
    let end = i
    while (end + 1 < text.length && '.!?'.includes(text[end + 1]!)) end++
    const next = text[end + 1]
    // "2.5" — a terminator with a word character behind it is punctuation
    // inside a sentence, not the end of one.
    if (next !== undefined && !/\s/.test(next)) { i = end; continue }
    let cut = end + 1
    while (cut < text.length && /\s/.test(text[cut]!)) cut++
    out.push(text.slice(start, cut))
    start = cut
    i = cut - 1
  }
  if (start < text.length) out.push(text.slice(start))
  return out
}

/** True when every placeholder in this text has an answer for this character. */
function resolvable(text: string, char: Character): boolean {
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (answer(match[1]!, char) === null) return false
  }
  return true
}

function fill(text: string, char: Character): string {
  return text.replace(PLACEHOLDER, (whole, name: string) => answer(name, char) ?? whole)
}

/** Substitute his numbers into one string, dropping any sentence this character
 *  has no answer for.
 *
 *  A string with no placeholders is returned unchanged — not merely equal, but
 *  the same string — so the overwhelming majority of canon, which this feature
 *  never touches, provably passes through. */
export function personalise(text: string, char: Character): string {
  if (!text.includes('{')) return text
  const kept = segmentsOf(text).filter(segment => resolvable(segment, char))
  // Every sentence went. The caller decides what to do with nothing; it must
  // not be an empty bullet with a heading over it.
  if (kept.length === 0) return ''
  return fill(kept.join(''), char).trim()
}

/** Bullets in, bullets out. Applied AFTER `splitTactics` so heading detection
 *  still runs on unmodified canon.
 *
 *  A bullet whose body empties out is DROPPED rather than rendered as a bare
 *  heading with nothing under it — an all-capitals word alone on a line is the
 *  app telling him there is advice here and then not giving it.
 *
 *  A heading is personalised too, and an unresolvable heading takes its whole
 *  bullet with it. Canon has no placeholder in a heading today; the rule is
 *  written down anyway, because the alternative is a `{CHA}` painted in bold on
 *  a Fighter's screen the first time someone writes one. */
export function personaliseBullets(
  bullets: TacticsBullet[],
  char: Character,
): TacticsBullet[] {
  const out: TacticsBullet[] = []
  for (const bullet of bullets) {
    if (bullet.lead !== null && !resolvable(bullet.lead, char)) continue
    const body = personalise(bullet.body, char)
    if (body.length === 0) continue
    const lead = bullet.lead === null ? null : fill(bullet.lead, char)
    out.push(lead === bullet.lead && body === bullet.body ? bullet : { lead, body })
  }
  return out
}
