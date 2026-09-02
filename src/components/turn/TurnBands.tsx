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
}

export function TurnBands({ bands, open, onToggle, onOpen, rowExtra, bandNote }: TurnBandsProps) {
  return (
    <section className="bands">
      {bands.map(band => {
        const isOpen = open[band.slot] !== false
        return (
          <section
            key={band.slot}
            className={`band${band.open ? ' live' : ''}${isOpen ? ' shown' : ''}`}
          >
            <BandHead band={band} isOpen={isOpen} onToggle={onToggle} />
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
}: {
  band: Band
  isOpen: boolean
  onToggle?: (slot: BandSlot) => void
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
