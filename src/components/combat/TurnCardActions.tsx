/* The half of the open card that is about a TURN rather than about a spell.
 *
 * Combat Open Book slice 1.
 *
 * `EntryDetailPanel` paints the three bands Marcus asked for — at a glance, full
 * text, how to use it — and it paints them identically on both tabs because it
 * knows nothing about either. What it cannot paint is the four things that only
 * mean anything mid-fight:
 *
 *     the rolls          buttons that roll what this actually rolls
 *     the spend          the one control that goes through the reducer
 *     the warning        what spending this would DESTROY  (canon HEARTH-04)
 *     the live rule      one levelled slot per turn, answered for THIS turn
 *
 * ── WHY THIS EXISTS IN SLICE 1 AND NOT SLICE 3 ──────────────────────────────
 * The Gate 4 plan had it in slice 3. That was wrong, and measuring the slice
 * boundary is what showed it: slice 1 unmounts the bottom sheet, and the bottom
 * sheet is THE ONLY SURFACE ON EITHER TAB THAT SPENDS THROUGH THE RULES
 * (`OptionDetailSheetLive.tsx:32-38`). Shipping slice 1 without this file would
 * leave two slices during which the Combat tab could open a beautiful card and
 * not take the action it describes — a half-built feature running as if it were
 * done, which is the one thing the guardrails name outright. So the split moved.
 *
 * ── IT IS A LIFT, NOT A REWRITE ─────────────────────────────────────────────
 * Every element below is `OptionDetailSheet.tsx:283-348` with its wrapper
 * removed. The classes, the `role="status"` on the warning and the `role="alert"`
 * on the refusal are unchanged, and they are unchanged deliberately: those two
 * attributes are the whole reason a press that gets refused is noticed at all,
 * since the button does not visibly change. Slice 8 deletes the sheet; until it
 * does, the two surfaces render the same markup because one of them is a copy of
 * the other's, and `OptionDetailSheet.test.tsx` still guards the original.
 *
 * ── NO BUTTON INSIDE A BUTTON ───────────────────────────────────────────────
 * This component contains buttons, and it is rendered inside a row. `TurnRow`
 * has solved that already: with an `extra`, a row becomes a plain `div.act.hasx`
 * with the hit target as a SIBLING button rather than a parent
 * (`TurnRow.tsx:84-95`). Nothing here may be mounted anywhere that puts it back
 * inside `.acthit` — a button inside a button is silently dropped by the browser,
 * which at a table under a six second clock is the worst failure available. */

import type { OptionDetail } from '../../lib/turn/detail'
import type { RollOffer } from '../../lib/turn/rolls'

const BAND = 'border-t border-bronze/20 px-4 py-3'
const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-wider'

function RollButton({
  offer,
  onRoll,
}: {
  offer: RollOffer
  onRoll?: (p: { notation: string; label: string }) => void
}) {
  const face = (
    <>
      <span className="font-mono text-sm font-semibold text-forge-0">{offer.notation}</span>
      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-forge-2">
        {offer.label}
      </span>
    </>
  )

  /* No roller wired means the numbers are still WORTH READING — they just are
     not pressable. Rendering nothing would lose the notation entirely, which is
     the information, not the affordance. Same rule the sheet states. */
  if (!onRoll) {
    return (
      <span className="min-w-[72px] rounded-lg border border-bronze/30 bg-void-2/50 px-3 py-2 text-center">
        {face}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onRoll({ notation: offer.notation, label: offer.label })}
      className="min-w-[72px] rounded-lg border border-bronze/30 bg-void-2/50 px-3 py-2 text-center transition-colors hover:border-gold/50"
    >
      {face}
    </button>
  )
}

export interface TurnCardActionsProps {
  detail: OptionDetail
  onRoll?: (prefill: { notation: string; label: string }) => void
  /** Absent means this card cannot spend — the control is then not drawn at
   *  all, on the same law `OptionDetail.spend` states: a Spend that cannot spend
   *  is purely a lie. */
  onSpend?: () => void
  /** The reducer's answer to a press that already happened. Shared state, not a
   *  local one, so a refusal can never outlive the card that produced it. */
  refusal?: string | null
}

export function TurnCardActions({ detail, onRoll, onSpend, refusal = null }: TurnCardActionsProps) {
  const hasRolls = detail.rolls.length > 0 || Boolean(detail.spend)
  if (!hasRolls && !detail.ruleBox) return null

  return (
    <>
      {hasRolls && (
        <div className={BAND}>
          <span className={`${LABEL} text-forge-2`}>Roll from here</span>
          {/* Canon HEARTH-04. ABOVE the button, not below it: the refusal
              underneath answers a press that already happened, and this one has
              to be read BEFORE the press that would destroy a pool. */}
          {detail.spendWarning && (
            <p
              role="status"
              className="mt-2 border-l-2 border-l-ember bg-ember/5 py-1.5 pl-2 text-xs leading-relaxed text-forge-0"
            >
              <span className={`${LABEL} text-ember`}>⚑ Replaces</span>
              {detail.spendWarning}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.rolls.map(offer => (
              <RollButton key={offer.key} offer={offer} onRoll={onRoll} />
            ))}
            {detail.spend && onSpend && (
              <button
                type="button"
                onClick={onSpend}
                className="min-w-[72px] rounded-lg border border-ember/50 bg-ember/10 px-3 py-2 text-center"
              >
                <span className="font-mono text-sm font-semibold text-ember">Spend</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-ember/70">
                  {detail.spend.label}
                </span>
              </button>
            )}
          </div>
          {refusal && (
            <p
              role="alert"
              className="mt-2 border-l-2 border-l-ember bg-ember/5 py-1.5 pl-2 text-xs leading-relaxed text-forge-0"
            >
              <span className={`${LABEL} text-ember`}>⚑ Not spent</span>
              {refusal}
            </p>
          )}
        </div>
      )}

      {detail.ruleBox && (
        <div
          className={`${BAND} border-l-2 ${
            detail.ruleBox.tone === 'blocked' ? 'border-l-ember bg-ember/5' : 'border-l-gold'
          }`}
        >
          <span className={`${LABEL} text-ember`}>
            ⚑ {detail.ruleBox.tone === 'blocked' ? 'Not this turn' : 'One slot per turn'}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-forge-0">{detail.ruleBox.text}</p>
        </div>
      )}
    </>
  )
}

export default TurnCardActions
