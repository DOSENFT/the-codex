/* requestBeat — live first, bank always.
 *
 * ── THE CONTRACT ────────────────────────────────────────────────────────────
 * THIS FUNCTION NEVER REJECTS. Not on a network error, not on a 503, not on a
 * model that answers with an apology, not on JSON that parses into nothing
 * useful. It resolves with a Beat every single time.
 *
 * That is not a nice-to-have. It is Marcus's literal answer when asked how the
 * AI should behave — *"Keep it live, but make it never fail visibly"* — and it
 * is the difference between an app he reaches for during a scene and an app he
 * reaches for after one. At a table, a spinner that resolves into a red error
 * box is worse than no button at all, because he already stopped the
 * conversation to look at it.
 *
 * `engine.test.ts` enforces this by throwing everything it can at `ask`. If
 * anyone ever adds a `throw` below, that suite goes red, which is the only
 * reason this comment is allowed to make a promise. */

import { SYSTEM_PROMPTS } from '../prompts'
import { normaliseBeat, type Beat } from './beat'
import { bankedToBeat, pickBanked } from './bank'
import { quietLabel } from './table'
import { INTENT_LABEL, type BeatRequest } from './types'

export type { BeatRequest } from './types'

/** Whatever actually talks to the model. Injected rather than imported so the
 *  test can be a plain function and never touch `fetch`, `useAI` or a clock. */
export type AskFn = (systemPrompt: string, userMessage: string) => Promise<unknown>

let counter = 0
const nextId = () => `beat-${++counter}`

function fallback(req: BeatRequest, avoidId?: string): Beat {
  const banked = pickBanked(req.intent, req.nth ?? 0, avoidId)
  const note = req.aimAt
    ? (req.aimAt.isNew ? 'first session' : quietLabel(req.aimAt, Date.now()))
    : null
  return bankedToBeat(banked, req.intent, req.aimAt?.name ?? null, note, nextId())
}

/** The user half of the request. Short on purpose: everything that matters is
 *  in the system prompt, and a long user message is where models start
 *  answering the message instead of following the format. */
function userMessage(req: BeatRequest): string {
  if (req.custom?.trim()) return req.custom.trim()
  const who = req.aimAt ? ` aimed at ${req.aimAt.name}` : ''
  return `Give me one beat${who}.`
}

export async function requestBeat(req: BeatRequest, ask: AskFn): Promise<Beat> {
  let raw: unknown
  try {
    /* The intent goes over as ENGLISH, not as the union member. `pull-in` is a
       key in this codebase; "Pull someone in" is an instruction to a director.
       Models follow the second one and quietly ignore the first. */
    raw = await ask(
      SYSTEM_PROMPTS.improvBeat({ ...req, intent: INTENT_LABEL[req.intent] }),
      userMessage(req),
    )
  } catch {
    /* Deliberately bare. By the time control reaches here `lib/ai.ts` has
       already retried a transient status twice and, if configured, tried the
       fallback provider — so this is not a blip, it is a genuine outage. There
       is nothing left to distinguish between and nothing useful to log at a
       table. The bank answers instead. */
    return fallback(req)
  }

  const beat = normaliseBeat(raw, req, nextId())
  /* A model that returned SOMETHING but not enough to fill a card is the
     failure the screenshots did not show and the one that would have been
     hardest to notice: a card with three empty headings reads as a bug in the
     app rather than a bad minute at Google. It goes to the bank too. */
  return beat ?? fallback(req)
}
