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

/** The whole vocabulary. Six were character-derived; the seventh is not, and
 *  that is stated rather than smuggled — see `PersonaliseContext` below. */
export type Placeholder =
  | 'level'
  | 'CHA'
  | 'CHAmod'
  | 'saveDC'
  | 'spellAttack'
  | 'prof'
  /** SIX BECAME SEVEN AT A GATE — Combat Open Book, Gate 3, 2026-09-08.
   *
   *  The paragraph above says a seventh "is a decision to take at a gate, not a
   *  regex to widen". This is that gate, and the widening is deliberate and
   *  minimal. `{dice}` is this spell's damage or healing, scaled for his level
   *  with the ability modifier resolved — the ONLY token whose answer is not a
   *  fact about the character alone.
   *
   *  It exists because slice 4 fixed band 1's numerals and left band 2's
   *  paragraph saying `1d8`, so the card began contradicting itself inside one
   *  card. The alternative considered and rejected at Gate 3: leave band 2 alone
   *  and let band 1 carry the truth. Rejected because band 2 is the band he
   *  reads, and "the numbers aren't mine" is the whole complaint. */
  | 'dice'

/** `{name}` or `{name|canon's own words}` — Combat Open Book slice 5.
 *
 *  The half after the pipe is what canon's author wrote before the token
 *  existed, kept verbatim for the character the token has no answer for. It is
 *  how band 2 can be personalised WITHOUT being droppable: a Fighter reading
 *  Cure Wounds sees the sentence the book has always had.
 *
 *  `[^{}]*` on the fallback, so a nested brace does not parse — a fallback is
 *  literal text and never a second template. That is not a style rule: the
 *  substitution runs once, so a `{` surviving inside a fallback would reach his
 *  screen, and `{` on the screen mid-fight is the exact failure this file's
 *  header spends four paragraphs forbidding. */
const PLACEHOLDER = /\{([A-Za-z]+)(?:\|([^{}]*))?\}/g

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

/** Everything a substitution can know. `character` is the whole of it for the
 *  six original tokens; `dice` is the seventh, resolved by the caller.
 *
 *  Optional so that `personalise` and `personaliseBullets` keep their exact
 *  signatures and every existing caller and test is untouched — `{dice}` in a
 *  string with no dice in scope simply has no answer, which is the behaviour
 *  this file has always had for a token it cannot fill. */
export interface PersonaliseContext {
  character: Character
  /** `resolvedDice(spell, casterContextOf(char))`, or null/absent when no spell
   *  is in scope. See the `dice` case in `answer` for why it arrives resolved. */
  dice?: string | null
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
function answer(name: string, ctx: PersonaliseContext): string | null {
  const char = ctx.character
  switch (name as Placeholder) {
    case 'dice':
      /* RESOLVED BY THE CALLER, HANDED IN AS A STRING. `{dice}` needs a
         `CasterContext` and a `CanonSpell`, and building one here would mean
         this file — which is `canon/` — reaching into `turn/overlay.ts` for
         `casterContextOf`. `bands.ts:37-45` already records ONE deliberate
         exception to that layering rule and explains why a second is exactly
         what the rule forbids: two builders is two answers to "what is his
         Charisma modifier". So the caller, which has already built the context
         for band 1, calls `resolvedDice` once and passes the answer down.
         GATE 3 WROTE THIS AS `spell?: CanonSpell` ON THE CONTEXT; the shape
         changed and the behaviour did not — recorded in 00-status.md. */
      return ctx.dice ?? null
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

/** True when every placeholder in this text can be rendered without a hole.
 *
 *  A FALLBACK COUNTS AS AN ANSWER, and that is the one rule slice 5 adds to the
 *  dropping path. `{CHAmod|your Charisma modifier}` on a Fighter's screen is not
 *  the app admitting it does not know — it is the book's own sentence, which is
 *  what he would have read anyway. Dropping still fires, and fires only where it
 *  always meant to: a token with no answer AND no words to fall back on. */
function resolvable(text: string, ctx: PersonaliseContext): boolean {
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (answer(match[1]!, ctx) === null && match[2] === undefined) return false
  }
  return true
}

/** The substitution itself. Runs ONCE over the string: a fallback is literal
 *  text and is never re-scanned, which is why `PLACEHOLDER` forbids a brace
 *  inside one.
 *
 *  THE LAST RESORT IS THE EMPTY STRING, NEVER `whole`. Returning the raw
 *  `{token}` would put a brace on his screen, and that is the one outcome both
 *  public functions exist to prevent. `personalise` filters unanswerable
 *  sentences out before it ever reaches this, so the empty case is only
 *  `personaliseText`'s documented case 3. */
function fill(text: string, ctx: PersonaliseContext): string {
  return text.replace(
    PLACEHOLDER,
    (_whole, name: string, fallback: string | undefined) =>
      answer(name, ctx) ?? fallback ?? ''
  )
}

/** Normalise the two shapes a caller may hand in. Every pre-slice-5 caller
 *  passes a bare `Character` and keeps working unchanged. */
function contextOf(input: Character | PersonaliseContext): PersonaliseContext {
  return 'character' in input ? input : { character: input }
}

/** Substitute his numbers into one string, dropping any sentence this character
 *  has no answer for.
 *
 *  A string with no placeholders is returned unchanged — not merely equal, but
 *  the same string — so the overwhelming majority of canon, which this feature
 *  never touches, provably passes through. */
export function personalise(text: string, char: Character | PersonaliseContext): string {
  if (!text.includes('{')) return text
  const ctx = contextOf(char)
  const kept = segmentsOf(text).filter(segment => resolvable(segment, ctx))
  // Every sentence went. The caller decides what to do with nothing; it must
  // not be an empty bullet with a heading over it.
  if (kept.length === 0) return ''
  return fill(kept.join(''), ctx).trim()
}

/** BANDS 1 AND 2 — THE NON-DROPPING TWIN — Combat Open Book slice 5.
 *
 *  ── WHY THERE ARE TWO FUNCTIONS AND NOT ONE FLAG ───────────────────────────
 *  The asymmetry is the whole point, so it is two named functions rather than a
 *  boolean nobody reads at the call site:
 *
 *    band 3, `personaliseBullets`  ADVICE.      A tip with a hole in it is worse
 *                                              than no tip. Drop the sentence.
 *    bands 1-2, `personaliseText`  RULES TEXT.  A sentence removed from band 2
 *                                              is a rule Marcus no longer has.
 *                                              Never drop. Fall back to canon.
 *
 *  ── WHAT IT DOES WHEN IT CANNOT ANSWER ─────────────────────────────────────
 *  1. Token has an answer            → his number.
 *  2. No answer, fallback written     → canon's own words, verbatim.
 *  3. No answer, no fallback written  → the token renders as nothing, AND THE
 *                                       SENTENCE STILL STANDS.
 *
 *  NO SENTENCE IS EVER DROPPED HERE. That is the entire difference from
 *  `personalise`, and it is not a preference: `segmentsOf` is not run at all, so
 *  there is no code path in this function capable of removing text.
 *
 *  Case 3 is a DATA ERROR, not a rendering mode — it is the one hole this file's
 *  header forbids, and it is reachable only if an author writes a bare `{prof}`
 *  into a spell summary. `personalise.corpus.test.ts` asserts that no string in
 *  canon carries a fallback-less token, so on shipped data case 3 cannot fire.
 *  It is written as "lose a phrase" rather than "lose a rule" because band 2 is
 *  the rules text: the sentence Marcus keeps is worth more than the tidiness of
 *  the one he loses.
 *
 *  ── GATE 3 SAID "THE SENTENCE IS KEPT VERBATIM" FOR CASE 3 ─────────────────
 *  Kept verbatim and containing no brace are not both possible — the sentence
 *  either shows the token or shows a hole. Resolved here in favour of no brace,
 *  because test 13 (no `{` or `}` survives into any rendered band) is the
 *  assertion with a screen behind it. Recorded in 00-status.md rather than left
 *  for a reader to find in a diff. */
export function personaliseText(text: string, ctx: PersonaliseContext): string {
  if (!text.includes('{')) return text
  return fill(text, ctx).replace(/ {2,}/g, ' ').trim()
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
  char: Character | PersonaliseContext,
): TacticsBullet[] {
  const ctx = contextOf(char)
  const out: TacticsBullet[] = []
  for (const bullet of bullets) {
    if (bullet.lead !== null && !resolvable(bullet.lead, ctx)) continue
    const body = personalise(bullet.body, ctx)
    if (body.length === 0) continue
    const lead = bullet.lead === null ? null : fill(bullet.lead, ctx)
    out.push(lead === bullet.lead && body === bullet.body ? bullet : { lead, body })
  }
  return out
}
