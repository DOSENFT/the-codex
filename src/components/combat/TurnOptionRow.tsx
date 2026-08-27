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

   WHY THIS IS NOT A BUTTON YET. The design has this row opening the option
   detail sheet on tap, with a chevron as the affordance. That sheet is slice 7.
   Painting a chevron now would be a control that promises a screen which does
   not exist — 🔴 "never leave half-built features running as if done" — so
   slice 5 renders the row inert and slice 7 adds the affordance and the
   destination together, in one change. `TurnOptionRow` gains an `onOpen` prop
   then, not now.

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
}

export function TurnOptionRow({ option }: TurnOptionRowProps) {
  const blocked = !option.available

  return (
    <div
      className={`rounded-lg border border-bronze/20 border-l-2 bg-void-2/50 px-3 py-2 ${
        blocked ? 'border-l-bronze opacity-60' : 'border-l-gold'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-forge-0">
          {option.name}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-forge-1">
          {option.cost.label}
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-snug text-forge-0">{fitRowDetail(option.detail)}</p>
      {blocked && option.blockedReason && (
        <p className="mt-1 text-xs leading-snug text-ember">{option.blockedReason}</p>
      )}
    </div>
  )
}
