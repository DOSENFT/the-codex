/* A beat — the unit that replaces the one-liner.
 *
 * `docs/plans/roleplay-engine/03-program-design.md`.
 *
 * ── WHY THIS TYPE EXISTS ────────────────────────────────────────────────────
 * Marcus, 2026-09-07, after tapping "Ambush!" while prepping a session:
 *
 *     "Idk when I'd actually use what it suggested, and it literally is just
 *      one or two lines. Doesn't seem worth it nor as useful as we are aiming
 *      for."
 *
 * He is right, and the diagnosis is in his own sentence. A LINE is not a unit of
 * help, because a line with no situation attached is a line you have to invent a
 * situation for — which is the hard part he opened the app to get help with.
 *
 * A professional improviser does not think in lines. They think in beats: an
 * offer, aimed at somebody, with a reason, a direction to heighten toward, and a
 * button to get out on. Every field below is one of those, and `useWhen` is the
 * literal answer to the sentence above.
 *
 * ── WHY NORMALISATION IS A MODULE AND NOT AN `??` AT THE CALL SITE ──────────
 * A language model asked for eight fields returns six of them about a fifth of
 * the time, and returns `directions: ["warmer", "darker"]` instead of objects
 * about as often. Every one of those is a HOLE IN A CARD AT A TABLE. Handled
 * here, once, where it is testable without a browser — this repo has no jsdom,
 * so a hole that only appears in a rendered component is a hole no test can see. */

import type { BeatIntent, BeatRequest } from './types'

export type { BeatIntent, BeatRequest } from './types'

/** Say / Do / Ask are three different physical things he has to do with his
 *  body, which is why they are a discriminated kind and not a paragraph. */
export interface BeatMove {
  kind: 'say' | 'do' | 'ask'
  text: string
}

/** Where the scene can go after the offer lands. The thing that turns a line
 *  into a scene with a future instead of a full stop. */
export interface BeatDirection {
  label: string
  text: string
}

export interface Beat {
  id: string
  intent: BeatIntent
  /** A player's name, 'the DM', or 'the circle'. Never empty: an unaimed beat
   *  is the old behaviour wearing a new shape. */
  aim: string
  /** The chip beside the name — 'first session', 'quiet 22m'. */
  aimNote: string | null
  /** When to use it. HIS QUESTION, ANSWERED, and the reason a beat is worth
   *  reading before the moment arrives rather than during it. */
  useWhen: string
  moves: BeatMove[]
  goal: string
  followUp: string
  directions: BeatDirection[]
  /** How to hand the scene off if it lands flat. Improv's most useful and least
   *  taught skill, and the reason he is safe to take the risk at all. */
  out: string
  source: 'live' | 'bank'
}

const MAX_MOVES = 3
const MAX_DIRECTIONS = 3

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** A model that returns `{say, do, ask}` (the old shape), `moves: [...]` (the
 *  new one), or a mix of both. All three are normal and none of them may be a
 *  blank card. */
function movesFrom(raw: Record<string, unknown>): BeatMove[] {
  const out: BeatMove[] = []

  const push = (kind: BeatMove['kind'], text: string) => {
    if (text && out.length < MAX_MOVES) out.push({ kind, text })
  }

  if (Array.isArray(raw.moves)) {
    for (const m of raw.moves) {
      if (typeof m === 'string') { push('say', m.trim()); continue }
      if (m && typeof m === 'object') {
        const rec = m as Record<string, unknown>
        const kind = str(rec.kind).toLowerCase()
        push(kind === 'do' || kind === 'ask' ? kind : 'say', str(rec.text))
      }
    }
  }

  // The flat shape, kept because `impulseReaction` has always returned it and a
  // prompt change does not reach a model that is already mid-answer.
  if (out.length === 0) {
    push('do', str(raw.do))
    push('say', str(raw.say))
    push('ask', str(raw.ask))
  }

  return out
}

/** `directions` arrives as objects, as bare strings, or as one newline-joined
 *  paragraph. A bare string still carries the direction; it just lost its
 *  label, and inventing a wrong label is worse than showing none. */
function directionsFrom(raw: Record<string, unknown>): BeatDirection[] {
  const src = raw.directions ?? raw.whereItCanGo
  const list: BeatDirection[] = []

  const add = (label: string, text: string) => {
    if (text && list.length < MAX_DIRECTIONS) list.push({ label, text })
  }

  if (Array.isArray(src)) {
    for (const d of src) {
      if (typeof d === 'string') {
        // "Warmer — he admits what he carries" splits on the dash the models use.
        const m = d.match(/^\s*([^—:–-]{2,18})\s*[—:–-]\s*(.+)$/)
        if (m) add(m[1].trim(), m[2].trim())
        else add('', d.trim())
        continue
      }
      if (d && typeof d === 'object') {
        const rec = d as Record<string, unknown>
        add(str(rec.label), str(rec.text) || str(rec.direction))
      }
    }
  } else if (typeof src === 'string') {
    for (const line of src.split('\n')) {
      const t = line.replace(/^\s*[-*↗]\s*/, '').trim()
      if (t) add('', t)
    }
  }

  return list
}

/** The model's JSON, however loose, into a complete card — or null when there
 *  is not enough there to be worth showing, which hands the moment to the bank.
 *
 *  NEVER THROWS. A parse error inside this function would be a blank card at his
 *  table, which is the exact failure mode this whole feature exists to remove. */
export function normaliseBeat(raw: unknown, req: BeatRequest, id: string): Beat | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const moves = movesFrom(r)
  const goal = str(r.goal) || str(r.whatItsFor) || str(r.think)

  /* THE FLOOR. A beat without a move is not a beat, and a beat without a goal
     is the one-liner he complained about wearing six headings. Anything past
     this line is worth showing even if a band or two is thin; anything short of
     it goes to the bank, where every field is guaranteed. */
  if (moves.length === 0 || !goal) return null

  const aimName = req.aimAt?.name ?? str(r.aim) ?? ''

  return {
    id,
    intent: req.intent,
    aim: aimName || 'the circle',
    aimNote: req.aimAt?.isNew ? 'first session' : null,
    useWhen: str(r.useWhen) || str(r.when) ||
      'When the scene has a gap in it and nobody has stepped into it yet.',
    moves,
    goal,
    followUp: str(r.followUp) || str(r.ifTheyBite) ||
      'Take whatever they give you completely seriously, repeat one detail of it back, and ask one more question about that detail.',
    directions: directionsFrom(r),
    out: str(r.out) || str(r.ifItLandsFlat) ||
      'Answer your own offer out loud, make it small and a little funny, and pass the moment to the person beside you. Nobody notices a miss that you close yourself.',
    source: 'live',
  }
}
