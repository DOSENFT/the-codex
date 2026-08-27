import type { TurnOption } from '../../lib/turn/types'
import { fitRowDetail } from '../../lib/turn/overlay'

/* ============================================================================
   THE ROW — Table Truth slice 5.

   One thing you could do, in exactly two lines:

       Sacred Flame                              Action · no slot
       2d8 Radiant · DC 16 DEX · 60 ft · negates

   Line 1 is WHAT and WHAT IT COSTS. Line 2 is `option.detail` — the numbers you
   need in your hand before you pick up a die. Nothing else. No prose, no
   truncation, and above all NO ELLIPSIS: `detail` is assembled by dropping
   whole segments until it fits (canon/format.ts), so a row that is short is
   short because a fact was left out on purpose, not because a string was cut in
   half. That "…" is the thing Marcus asked us to kill, and the way it dies is
   that nothing in this file is ever allowed to produce one.

   THE CHEVRON AND ITS DESTINATION ARRIVED TOGETHER — slice 7. Slice 5 left this
   row inert on purpose: a chevron promising a screen that did not exist would
   have been a control that lies, and 🔴 "never leave half-built features running
   as if done" forbids it. The sheet now exists, so the affordance is painted and
   `onOpen` is wired in the same change that built what it opens.

   `onOpen` is OPTIONAL, and that is not laziness. Without it the row renders
   exactly as it did in slice 5 — a plain div, no chevron, no tap target. A
   caller that has nowhere to send the tap therefore cannot accidentally paint
   the promise, which is the same rule slice 5 was obeying, now enforced by the
   type instead of by a comment.

   THE THIRD LINE. A row is two lines, with one stated exception: an option that
   is BLOCKED gets a third line naming the reason. D greys with a reason rather
   than hiding, and a greyed row that will not say why is worse than no row at
   all. `turn.ranked` holds only affordable options today, so this branch is
   currently exercised by the reactions band's blocked rows in slice 6 — it is
   here because the row component, not its callers, is what owes that promise.

   WHY `fitRowDetail` IS CALLED HERE AND NOT IN THE ENGINE. The first prover run
   of this slice measured the two-line promise being broken: Hearthbrand painted
   three lines (105 characters) and Javelin painted three (60). Neither had ever
   been budgeted, because `overlayCanon` returns early for weapons — a weapon's
   arithmetic is the sheet's, not canon's, so canon never touches the string and
   nothing else was fitting it. Two lines is a promise this component makes, so
   this component keeps it: `detail` arrives at whatever length its producer
   chose, and the row drops whole segments off the end until it fits. The engine
   is untouched — `TurnOption.detail` still carries the full segment list for the
   detail sheet in slice 7, which is where the dropped segments go to live.
   ========================================================================= */

export interface TurnOptionRowProps {
  option: TurnOption
  /** Opens the option detail sheet. Omitted → the row stays inert, as in
   *  slice 5, and paints no affordance. See the header. */
  onOpen?: (option: TurnOption) => void
}

export function TurnOptionRow({ option, onOpen }: TurnOptionRowProps) {
  const blocked = !option.available

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-forge-0">
          {option.name}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-forge-1">
          {option.cost.label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="mt-0.5 min-w-0 flex-1 text-xs leading-snug text-forge-0">
          {fitRowDetail(option.detail)}
        </p>
        {onOpen && <span className="shrink-0 font-mono text-xs text-forge-2">▸</span>}
      </div>
      {blocked && option.blockedReason && (
        <p className="mt-1 text-xs leading-snug text-ember">{option.blockedReason}</p>
      )}
    </>
  )

  const skin = `rounded-lg border border-bronze/20 border-l-2 bg-void-2/50 px-3 py-2 ${
    blocked ? 'border-l-bronze opacity-60' : 'border-l-gold'
  }`

  /* A BLOCKED row still opens. "Why can't I smite?" is precisely the question
     the sheet answers — its rule box is live and names the reason. Disabling
     the tap here would hide the explanation behind the thing needing it. */
  if (!onOpen) return <div className={skin}>{body}</div>

  return (
    <button
      type="button"
      onClick={() => onOpen(option)}
      aria-label={`${option.name} — details`}
      className={`${skin} w-full text-left transition-colors hover:border-gold/40`}
    >
      {body}
    </button>
  )
}
