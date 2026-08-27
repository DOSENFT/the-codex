/* "How to use it" — canon's long-form advice, given a shape it can be read in.
 *
 * Every one of the 71 spell records carries a `tactics` string. They run from
 * 406 to 2,462 characters and none of them contains a newline, a bullet, or any
 * other mark of structure. Divine Smite's is 1,900 characters in one paragraph.
 *
 * Printed as-is it is a wall, and a wall at a table is the same as nothing: the
 * player scans it, gives up, and plays from memory. So it needs breaking up.
 * The whole question is whether the app is allowed to decide WHERE.
 *
 * ── THE SHAPE CANON ALREADY WROTE ───────────────────────────────────────────
 * It is. Canon's author wrote the structure in — in capitals, because there was
 * no other channel available inside a JSON string:
 *
 *   "…no exceptions. THE LOOPHOLE THAT IS ACTUALLY LEGAL: your level 2
 *    Paladin's Smite feature lets you cast Divine Smite once per Long Rest…"
 *
 * Eight of those in Divine Smite. Three in Sacred Flame. Measured across the
 * corpus: 70 of 71 records use the device, and the one that does not (Mending)
 * is four sentences long and needs no headings. So this module does not impose
 * an outline; it READS one that is already there — an all-capitals run at the
 * start of a sentence is a heading, everywhere in the corpus, without exception.
 *
 * ── THE INVARIANT, AND WHY IT IS THE ONLY REAL GUARANTEE ────────────────────
 * A splitter is a truncator that has not been caught yet. The offcut is silent:
 * a regex that fails to match the tail of a string does not throw, it just
 * quietly returns less than it was given, and the screen looks fine.
 *
 * So the promise is made checkable instead of stated. `tactics.test.ts` rejoins
 * every bullet this function produces, strips whitespace from both sides, and
 * requires the result to equal the input character for character — across all
 * 71 records. Nothing may be dropped, reordered, or invented. Whitespace is the
 * only thing this file is permitted to change, and it is permitted to change it
 * only by collapsing runs.
 *
 * Table Truth slice 7. */

export interface TacticsBullet {
  /** Canon's own heading, verbatim and still in capitals, or null for the text
   *  that comes before the first heading. Rendered bold; NOT recapitalised —
   *  the capitals are canon's emphasis and rewriting them is editing the book. */
  lead: string | null
  /** The advice under that heading. It KEEPS the ':' or '—' that separated it
   *  from the heading, rather than having it stripped and a ':' printed back:
   *  canon uses both marks and they do not mean the same thing. Keeping the
   *  original is also what makes the rejoin exact rather than approximate.
   *  Never truncated, never ellipsised. */
  body: string
}

/* A heading, by shape:
 *
 *   - it begins the string or follows a sentence-ending mark,
 *   - it is a run of CAPITALS, digits and connective punctuation,
 *   - it is followed by ':' or an em dash, which is what makes it a HEADING and
 *     not merely a shouted word mid-sentence,
 *   - and `isHeading` below requires at least one word of two letters, so a bare
 *     "2024 —" or a lone initial can never split a sentence in half.
 *
 * The lookbehind is fixed-width-safe in every engine the app ships to; it is
 * written as an alternation of literals rather than `\s` so that a match can
 * never begin in the middle of a word.
 *
 * ── WHY THE GUARD IS ONE WORD AND NOT TWO ───────────────────────────────────
 * It was two, on the reasoning that "RAW:" mid-argument would otherwise split a
 * sentence. Measured against the corpus, that guard was wrong twice over. It
 * caught nothing — every mid-sentence shout is excluded by the sentence-boundary
 * rule above, before the guard is ever consulted — and it silently swallowed ten
 * genuine single-word headings: VERDICT, POSITIONING, STACKING, RISK, WEAKNESS,
 * PRACTICAL, SCALING, TIMING, PETRIFIED, CONCENTRATION. Bless and Command have
 * four headings each and were rendering as one undifferentiated wall.
 *
 * That is this slice's own failure mode wearing a different coat: nothing was
 * deleted, so no test about losing text could ever have caught it, and the
 * screen looked fine. Only counting the output against the corpus found it. */
const HEADING = /(?:^|(?<=[.!?] ))([A-Z][A-Z0-9'’+\-/(),& ]*[A-Z0-9)])(?=\s*[:—])/g

/** At least one word of two or more letters. The guard that stops "2024 —" and
 *  a lone initial from being read as section headings. */
function isHeading(run: string): boolean {
  return /[A-Z]{2,}/.test(run)
}

export function splitTactics(text: string): TacticsBullet[] {
  const source = (text ?? '').trim()
  if (source.length === 0) return []

  const cuts: Array<{ start: number; end: number; run: string }> = []
  for (const match of source.matchAll(HEADING)) {
    const run = match[1]
    if (!isHeading(run)) continue
    const start = match.index! + match[0].length - run.length
    cuts.push({ start, end: start + run.length, run })
  }

  if (cuts.length === 0) return [{ lead: null, body: source }]

  const bullets: TacticsBullet[] = []

  // Whatever precedes the first heading is advice too, and it is the opening
  // paragraph of 40-odd records. It is kept as a lead-less bullet rather than
  // glued onto the first heading, where it would read as that heading's text.
  const preamble = source.slice(0, cuts[0].start).trim()
  if (preamble.length > 0) bullets.push({ lead: null, body: preamble })

  cuts.forEach((cut, i) => {
    const bodyEnd = i + 1 < cuts.length ? cuts[i + 1].start : source.length
    // The body starts where the heading ends, so the ':' or '—' that marked it
    // stays with the body. Nothing is deleted — that is the invariant.
    const body = source.slice(cut.end, bodyEnd).trim()
    bullets.push({ lead: cut.run, body })
  })

  return bullets
}

/** The rejoin used by the test, and by anything that needs the original back.
 *  Kept here so the invariant is defined next to the thing it constrains. */
export function rejoinTactics(bullets: readonly TacticsBullet[]): string {
  return bullets
    .map(b => (b.lead ? `${b.lead}${b.body}` : b.body))
    .join(' ')
    .trim()
}
