import type { ReactNode } from 'react'
import type { Band, BandSlot } from '../../lib/turn/bands'
import type { TurnOption } from '../../lib/turn/types'
import { Act } from './TurnRow'

/* ============================================================================
   THE FOUR BANDS, AS PAINTED — item 5.
   ----------------------------------------------------------------------------
   "It should be a very apparent and masterful organization visually."

   What makes it apparent is that each band answers the same three things in the
   same place, every time:

     · WHAT KIND of thing this is        — the label, and it is always there
     · WHETHER HE STILL HAS IT           — the pip, lit from turn.economy
     · HOW MANY HE COULD ACTUALLY TAKE   — the count, and it is a numeral, so it
                                           is --d-tally at 8.55:1 and never dim

   The header is the collapse control. That is deliberate: a separate chevron
   button beside a heading is two 48px targets where one would do, and on a
   390px phone the difference is a whole row of options.

   NO RULES LOGIC HERE EITHER. This file receives `Band[]` from `groupBySlot`
   and renders it. Every `if` below is about markup — is it open, is it empty —
   and none of them is about what Marcus may do.
   ========================================================================== */

export interface TurnBandsProps {
  bands: Band[]
  /** Which bands are expanded. A band missing from this map renders OPEN —
   *  the default has to be "you can see your options", because the failure of
   *  the screen this replaces was that things he owned were behind a fold. */
  open: Record<string, boolean>
  onToggle?: (slot: BandSlot) => void
  /** Pressing a row OPENS it. It does not spend it — the sheet does that, after
   *  he has read what he is about to spend. Slice 5 renamed this from `onTake`
   *  for that reason: the old name described the old behaviour and would have
   *  been a lie in every call site below. */
  onOpen?: (option: TurnOption) => void
  /** Something to hang under ONE row, decided per option by the caller.
   *  Returning null — which is what it returns for all but one or two options
   *  on any sheet — leaves the row exactly as it was. This is how item 7's
   *  retaliation reaches the option it belongs to instead of a band of its
   *  own; `TurnBands` never learns what a retaliation is. */
  rowExtra?: (option: TurnOption) => ReactNode
  /** Something to hang at the END of ONE band, decided per slot by the caller.
   *
   *  Slice 6 uses it for the one thing a band can be missing that no row can
   *  say: a reaction he owns and the app has never been told about. A row can
   *  only describe an option that EXISTS, so the absence of Interception is
   *  invisible in `bands` by construction — the note is the only place that
   *  gap can be spoken. Like `rowExtra`, it is an opaque `ReactNode` and this
   *  file never learns what a Fighting Style is. */
  bandNote?: (slot: BandSlot) => ReactNode
  /** The contention sentence for this band, or null. Slice R3.
   *
   *  Same contract as `bandNote` and for the same reason: this file must not
   *  learn what contention IS. It learns only that a caller may have one more
   *  sentence to put at the foot of a band, which is a layout fact.
   *
   *  It is a SEPARATE prop from `bandNote` rather than a second thing squeezed
   *  through that one, because the two are about opposite halves of the screen.
   *  `bandNote` speaks about an option that is MISSING — a reaction he owns and
   *  the app has never been told about. This speaks about the options that are
   *  PRESENT, and how few of them he may actually take. Merging them would make
   *  a caller choose between the two on any band that had both. */
  contention?: (slot: BandSlot) => ReactNode
  /** Something to hang in the band's HEADER, decided per slot by the caller.
   *  Slice R6.
   *
   *  The fourth opaque node on this component and the first one that is NOT at
   *  the foot of a band, which is the whole reason it is a new prop rather than
   *  a fifth thing squeezed through `bandNote`. `bandNote` and `contention` both
   *  live inside the collapse, and a fact that has to survive folding the band
   *  away cannot go in either. "You are one swing into two" is exactly such a
   *  fact: a collapsed Action band reads `ACTION · 1 ready · open`, which is
   *  what it would read if the app had ignored the tap.
   *
   *  TEXT ONLY, and this is a contract the type cannot express. The header IS
   *  the collapse control — a `<button>` — so a node containing a control would
   *  be a button inside a button, which browsers resolve by dropping the inner
   *  one: it paints perfectly and does nothing when pressed. That fault has been
   *  found and fixed in this repo once already (`ReactionRow.tsx:192`), and the
   *  only real defence against it here would be for this file to learn what it
   *  is rendering — which is the one thing it must not do. */
  headNote?: (slot: BandSlot) => ReactNode
}

export function TurnBands({
  bands,
  open,
  onToggle,
  onOpen,
  rowExtra,
  bandNote,
  contention,
  headNote,
}: TurnBandsProps) {
  return (
    <section className="bands">
      {bands.map(band => {
        const isOpen = open[band.slot] !== false
        return (
          <section
            key={band.slot}
            className={`band${band.open ? ' live' : ''}${isOpen ? ' shown' : ''}`}
          >
            <BandHead
              band={band}
              isOpen={isOpen}
              onToggle={onToggle}
              note={headNote?.(band.slot)}
            />
            {/* AFTER the rows and INSIDE the collapse, both deliberate. After,
                because it is about what is missing and the rows are what he
                has; inside, because a note that survived collapsing the band
                would be the one thing on this screen he could not put away. */}
            {isOpen &&
              (band.options.length > 0 ? (
                <div className="brows">
                  {band.options.map(o => (
                    <Act key={o.id} o={o} onOpen={onOpen} extra={rowExtra?.(o)} />
                  ))}
                </div>
              ) : (
                /* AN EMPTY BAND SAYS SO IN WORDS.
                   The MOVEMENT band is empty on every sheet this engine has
                   read — the model has no speed and no movement-priced option —
                   and an empty box with a heading and nothing under it reads as
                   a bug. It reads as a bug because it would BE one if the cause
                   were a dropped option, and the player has no way to tell the
                   two apart. So the band says which of the two it is. */
                <div className="bempty">
                  {band.open
                    ? `Nothing on your sheet costs your ${band.label.toLowerCase()}.`
                    : `Your ${band.label.toLowerCase()} is spent.`}
                </div>
              ))}
            {/* THE CONTENTION SENTENCE SITS BETWEEN THE ROWS AND THE NOTE, and
                the order is an argument, not a habit. It is about the rows
                directly above it — "these five are one decision" is unreadable
                if something else has been said in between — whereas `bandNote`
                is about what is absent from the band entirely, which is the
                furthest thing from the rows and therefore last.

                Inside the collapse, like everything else in a band. A sentence
                that survived folding the band away would be a claim about rows
                he can no longer see. */}
            {isOpen && contention?.(band.slot)}
            {isOpen && bandNote?.(band.slot)}
          </section>
        )
      })}
    </section>
  )
}

function BandHead({
  band,
  isOpen,
  onToggle,
  note,
}: {
  band: Band
  isOpen: boolean
  onToggle?: (slot: BandSlot) => void
  note?: ReactNode
}) {
  const body = (
    <>
      <span className="dot" />
      <span className="blbl">{band.label}</span>
      {/* THE COUNT IS ALWAYS PRINTED, INCLUDING ZERO.
          "0 ready" is a fact he can act on — it is the sentence "you have
          nothing here" — and a count that disappeared when it hit zero would
          leave the band looking identical to a band whose rows are merely
          collapsed. */}
      <span className="bn">{band.readyCount} ready</span>
      {/* TWO COUNTS, SIDE BY SIDE — slice R6. "3 ready" says how many things he
          could take; the note says how much of one of them he has already
          taken. They are the same kind of statement, so they sit together, and
          the state word and the caret stay at the end where they have always
          been. Nothing renders here on any band whose caller has nothing to
          say, which on Nix's sheet is three of the four. */}
      {note}
      <span className="bstate">{band.open ? 'open' : 'spent'}</span>
      {/* A caret, not a glyph font: it has to survive on a phone with no
          network and it has to be legible at 12px. */}
      <span className="bcar" aria-hidden="true">
        {isOpen ? '−' : '+'}
      </span>
    </>
  )
  if (!onToggle) return <div className="bhead">{body}</div>
  return (
    <button
      type="button"
      className="bhead"
      aria-expanded={isOpen}
      onClick={() => onToggle(band.slot)}
    >
      {body}
    </button>
  )
}

export default TurnBands
