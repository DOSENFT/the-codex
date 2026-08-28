import { useState } from 'react'
import { rollDice } from '../../lib/dice'
import { tallyLine, type RetaliationDie, type RetaliationTally } from '../../lib/turn/retaliation'

/* ============================================================================
   CAPTURING A NUMBER THE APP CANNOT COMPUTE — Table Truth slice 10f.

   Canon's HEARTH-05 asks for the total retaliation damage per encounter "so the
   DM can see the real numbers". Every other number on this tab is derived from
   the sheet; this one is evidence of a die that came up 7, and if it is not
   written down as it happens it is gone.

   ── THE APP ROLLS, AND MARCUS CAN CORRECT IT ────────────────────────────────
   His decision, and it is the reason this is a two-step control rather than a
   one-tap +7. Half the time the die that decides this is a real d10 on a real
   table, and the app has no way to see it. So the tap rolls, and then shows the
   result IN A TEXT FIELD:

       rolled  [ 7 ]  Fire        [ Add ]  [ Cancel ]

   Type over the 7 and Add records what the table actually rolled. It costs one
   extra tap on the turns the app's own roll stands, and it is the difference
   between a tally that is true and a tally that is merely plausible — which,
   for a number whose entire purpose is to be shown to the DM, is the whole
   value of having it.

   The field is `type="text"` with `inputMode="numeric"` rather than
   `type="number"`: it brings up the same keypad on his phone, and a number
   input reports "" for a half-typed value, which would make the Add button
   flicker off between the 1 and the 2 of a 12.

   ── TWO SURFACES, ONE IMPLEMENTATION ────────────────────────────────────────
   `offer` picks which side of Marcus's second decision this instance is:

     'button'  the standing control on the Flaming Cloak row. ALWAYS THERE,
               whether or not the cloak is up, whether or not anything has
               prompted him. This is the guarantee.
     'prompt'  the offer that appears under the HP tracker after he logs damage
               while the cloak IS up. This is the convenience, and it is the one
               that has to be able to say nothing at all — see `HPTracker`.

   Both end in the same confirm strip, because a second way to type the number
   would be a second place for it to be typed wrong.

   ── STATE IS PASSED IN, NOT READ ────────────────────────────────────────────
   No `useCombat()`, for the reason `ReactionsBand` gives: it must render under
   `renderToStaticMarkup` in the node test environment, which has no DOM and no
   provider. `onRecord` returns whether the record STUCK — the reducer refuses
   out of combat — and a refusal keeps the strip open with the number still in
   it. Swallowing a roll because the encounter had not been started is the one
   failure this control cannot have.

   ── AND A REFUSAL HAS TO SAY SO ─────────────────────────────────────────────
   Keeping the number on screen is not enough on its own: nothing else about the
   strip changes, so a refused Add looks exactly like a button that is broken.
   The app's ONE place for painting a refusal is `OptionDetailSheet`, which this
   control is not inside, so `refusal` is passed in and painted here — but only
   after THIS control's own Add came back false, because the provider's refusal
   is the last one from anywhere and would otherwise arrive already true.
   ========================================================================= */

export interface RetaliationCaptureProps {
  die: RetaliationDie
  /** Records it. Returns false if the reducer refused — see the header. */
  onRecord: (amount: number, source: string) => boolean
  /** Which affordance offers the roll before one has been made. */
  offer: 'button' | 'prompt'
  /** The running total. Shown by the standing control; the prompt has no room
   *  and no business showing it mid-damage-entry. */
  tally?: RetaliationTally
  /** Take the offer away — 'prompt' only, and required there. */
  onDismiss?: () => void
  /** The reducer's own words for why the last event was turned down. Painted
   *  only after this control's Add is the thing that was refused. */
  refusal?: string | null
  /** Injected by tests. The app rolls the die canon named. */
  roll?: (die: RetaliationDie) => number
}

const defaultRoll = (die: RetaliationDie) =>
  rollDice(die.dieType, die.quantity, 0, 'normal').total

const CHIP =
  'min-h-[40px] rounded-lg border px-3 font-mono text-[11px] uppercase tracking-wider transition-colors'

/** The confirm strip: `rolled [ 7 ] Fire  [Add] [Cancel]`.
 *
 *  SPLIT OUT SO IT CAN BE PROVED. The repo has no jsdom — component claims are
 *  made with `renderToStaticMarkup`, which renders once and cannot click. A
 *  strip that only exists after a tap would therefore be the one part of this
 *  control the unit suite could never see, and it is the part that carries the
 *  editable number. Exported, rendered directly by the test, and driven for
 *  real by the browser prover. */
export function RetaliationConfirm({
  die,
  value,
  onChange,
  onAdd,
  onCancel,
  note = null,
}: {
  die: RetaliationDie
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  onCancel: () => void
  /** Why the last Add did not stick. Absent on the ordinary path. */
  note?: string | null
}) {
  const parsed = Number.parseInt(value, 10)
  const valid = Number.isFinite(parsed) && parsed >= 1

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-gold/30 bg-void-2/60 px-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-forge-2">rolled </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={`${die.notation} ${die.damageType} retaliation damage`}
        className="w-14 rounded-lg border border-gold/40 bg-void-1 px-2 py-1.5 text-center font-mono text-sm text-gold"
      />
      <span className="text-xs text-forge-1">{die.damageType} </span>
      <button
        type="button"
        onClick={onAdd}
        disabled={!valid}
        className={`${CHIP} ml-auto border-gold/40 text-gold disabled:opacity-40`}
      >
        Add
      </button>
      <button type="button" onClick={onCancel} className={`${CHIP} border-bronze/30 text-forge-2`}>
        Cancel
      </button>
      {/* `w-full` so it takes its own line under the strip rather than
          squeezing the number — and `role="status"`, because it is an answer to
          a press that already happened, which is exactly the rule
          OptionDetailSheet states for its own refusal line. */}
      {note && (
        <p role="status" className="w-full text-xs leading-snug text-ember">
          {note}
        </p>
      )}
    </div>
  )
}

export function RetaliationCapture({
  die,
  onRecord,
  offer,
  tally,
  onDismiss,
  refusal = null,
  roll = defaultRoll,
}: RetaliationCaptureProps) {
  /* A STRING, not a number. It is what is in the field, and mid-edit that is
     legitimately "" or "1" on the way to "12". Parsing at the boundary keeps
     the one number that matters — the one handed to `onRecord` — an integer. */
  const [pending, setPending] = useState<string | null>(null)
  /* THIS control's Add was the refused one. Without it the strip would open
     already carrying whatever refusal some other control left behind. */
  const [rejected, setRejected] = useState(false)

  const parsed = Number.parseInt(pending ?? '', 10)
  const valid = Number.isFinite(parsed) && parsed >= 1

  const begin = () => {
    setRejected(false)
    setPending(String(roll(die)))
  }

  const add = () => {
    if (!valid) return
    // Only clear on success. A refusal leaves the number on screen, still
    // editable, so the fix is "start the encounter, press Add again" rather
    // than "roll it a second time and hope it comes up 7".
    if (onRecord(parsed, die.feature)) {
      setRejected(false)
      setPending(null)
      onDismiss?.()
    } else {
      setRejected(true)
    }
  }

  const cancel = () => {
    setRejected(false)
    setPending(null)
    // The standing control returns to its button; the prompt goes away entirely.
    if (offer === 'prompt') onDismiss?.()
  }

  if (pending !== null) {
    return (
      <RetaliationConfirm
        die={die}
        value={pending}
        onChange={next => {
          // Editing is an attempt to fix it; the old complaint stops applying.
          setRejected(false)
          setPending(next)
        }}
        onAdd={add}
        onCancel={cancel}
        note={rejected ? (refusal ?? 'Not recorded.') : null}
      />
    )
  }

  if (offer === 'prompt') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ember/40 bg-ember/10 px-2 py-1.5">
        <span className="min-w-0 flex-1 text-xs leading-snug text-forge-0">
          {die.feature} — roll {die.notation} retaliation?{' '}
        </span>
        <button
          type="button"
          onClick={begin}
          className={`${CHIP} border-gold/40 text-gold`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onDismiss?.()}
          className={`${CHIP} border-bronze/30 text-forge-2`}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-bronze/20 pt-2">
      <button
        type="button"
        onClick={begin}
        aria-label={`Record ${die.notation} ${die.damageType} retaliation`}
        className={`${CHIP} border-gold/40 text-gold`}
      >
        +{die.notation} retaliation
      </button>
      {/* A COUNT AS WELL AS A TOTAL. The total is what the DM asked for; the
          count is what tells Marcus the app missed one, which is the failure
          mode of any tally a human has to remember to tap. Finding AY's rule
          applies to the gap here too — the trailing space is inside the span,
          because `gap-2` puts a gap on the screen and nothing in the text. */}
      <span className="ml-auto shrink-0 font-mono text-[11px] text-forge-2">
        {tally && tally.hits > 0 ? `TOTAL ${tallyLine(tally, die.damageType)}` : 'none yet'}
      </span>
    </div>
  )
}
