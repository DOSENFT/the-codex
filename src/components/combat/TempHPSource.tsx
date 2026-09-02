/* ============================================================================
   "WHAT GRANTED THIS?" — Held Reaction slice 4.

   ── THE ROAD THIS IS ON ─────────────────────────────────────────────────────
   Slice 3 opened the engine road: take the cloak from its reaction row and the
   composer sizes the pool, the reducer writes the source, and the retaliation
   arms. Proved, and not the road Marcus walks. He rolls physical dice and types
   his own numbers — Temp HP, 10, Apply — and down that road the app has an
   amount and no source. `activeRetaliation` needs a source; `tempHPSource` is
   the whole of how it knows the cloak is up.

   ── ASK, NEVER INFER. HIS RULING, FOR THE ONE-CANDIDATE CASE ────────────────
   Nix has exactly one feature canon says grants temporary hit points. It would
   be very easy, and it would look clever, to fill it in for him. Marcus was
   asked at Gate 2 and said no: ask anyway. One candidate is still a guess when
   the app is the one making it — the 10 he typed may have come from a potion,
   an ally's Inspiring Leader, or a DM ruling the app has never heard of, and
   there is no shape in a bare integer that says which. `temp-hp.ts` has said
   from its first line that naming the wrong feature is worse than naming none.

   ── "DON'T KNOW" IS THE DEFAULT, AND IT IS A REAL ANSWER ────────────────────
   Not a placeholder, not an empty state, not a nag. It is selected when the
   control appears and it is a legitimate thing to leave selected — because it
   is TRUE most of the time, and because a required question at the table is a
   question that gets answered wrongly to make it go away. Answering it wrongly
   here would arm a 1d10 he does not have, and a retaliation offered on a hit he
   cannot retaliate against is exactly the class of fault this whole phase is
   about: the app substituting its own guess for a fact, in a way the reader
   cannot tell apart from the real thing.

   ── AND IT DISAPPEARS WHEN IT HAS NOTHING TO ASK ────────────────────────────
   `sources` empty renders nothing at all, and the temp entry behaves exactly as
   it did before this slice. The list comes from `tempHPGrantors`, so a character
   canon knows nothing about is never asked a question with no answers in it.

   ── STATE IS PASSED IN ──────────────────────────────────────────────────────
   Same rule as `RetaliationCapture` and `ReactionsBand`: no context, no hooks
   on shared state, so it renders under `renderToStaticMarkup` in the node test
   environment, which has no DOM and no provider.
   ========================================================================= */

export interface TempHPSourceProps {
  /** From `tempHPGrantors`. Empty means the question is not worth asking. */
  sources: string[]
  /** The chosen source, or null for "Don't know" — which is the default. */
  value: string | null
  onChange: (source: string | null) => void
}

const CHIP =
  'min-h-[40px] rounded-lg border px-3 font-mono text-[11px] uppercase tracking-wider transition-colors'

const CHOSEN = 'border-gold/60 bg-gold/15 text-gold'
const UNCHOSEN = 'border-bronze/30 bg-void-2/60 text-forge-2 hover:text-forge-0'

/** The label for "the app does not know", written as the player would say it.
 *
 *  A single string constant because the browser prover reads it off the painted
 *  screen and the unit suite asserts on it; two spellings of the same answer
 *  would be two answers. */
export const DONT_KNOW = "Don't know"

export function TempHPSource({ sources, value, onChange }: TempHPSourceProps) {
  if (sources.length === 0) return null

  return (
    <div
      role="group"
      aria-label="What granted these temporary hit points?"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-bronze/25 bg-void-2/40 px-2 py-2"
    >
      {/* The question is asked in words, not implied by a dropdown's silence.
          `shrink-0` and its own trailing space inside the span — finding AY:
          `gap-2` puts a gap on the screen and nothing in the text. */}
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-forge-2">
        granted by{' '}
      </span>

      {/* FIRST, not last. It is the default and it is the honest answer, so it
          sits where the thumb already is rather than at the end of a list he
          has to read past. */}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`${CHIP} ${value === null ? CHOSEN : UNCHOSEN}`}
      >
        {DONT_KNOW}
      </button>

      {sources.map(source => (
        <button
          key={source}
          type="button"
          onClick={() => onChange(source)}
          aria-pressed={value === source}
          className={`${CHIP} normal-case tracking-normal ${
            value === source ? CHOSEN : UNCHOSEN
          }`}
        >
          {source}
        </button>
      ))}
    </div>
  )
}
