import type { ReactionRow as ReactionRowModel } from '../../lib/turn/reactions'
import { splitTriggerLead } from '../../lib/turn/trigger'

/* ============================================================================
   ONE REACTION — Table Truth slice 6.

   Marcus's ask, verbatim: the combat tab doesn't show "my reactions (like hearth
   fire manifest and what it does or when i can use it)". Two questions. So the
   row is two questions:

       Flaming Cloak                      Reaction · 1/2 uses
       WHEN  not stated — agree a trigger with your DM
       12 temp HP · 1d10 Fire retaliation
       ⚑ Canon lists 4 errata on Hearthfire Manifest

   WHEN COMES FIRST, ABOVE WHAT IT DOES. Off your turn a reaction is the whole of
   what you own, and the only thing that matters in that window is whether this
   moment is the moment. A row that leads with damage makes you read the damage
   to find out you cannot use it.

   THE UNSTATED CASE IS RENDERED, NOT HIDDEN. Canon's own errata pass found that
   the cloak is written "As a Reaction" with no trigger at all, and 2024 requires
   one. The app could invent a default and look complete. It does not: an invented
   trigger is a rule Marcus never agreed to, arriving at a table as though the
   book said it. The row says nobody stated one and names how many errata canon
   holds on the feature. Recording HIS chosen trigger is slice 8, and when it
   exists this line reads it instead.

   NO CHEVRON, NO TAP. Same reason as TurnOptionRow: the detail sheet is slice 7,
   and an affordance that opens nothing is a half-built feature running as if
   done. The row is inert and readable.
   ========================================================================= */

export interface ReactionRowProps {
  row: ReactionRowModel
}

export function ReactionRow({ row }: ReactionRowProps) {
  const blocked = !row.available
  const unstated = row.when === null
  /* The label is the clause's own lead word, not a fixed "WHEN" bolted on in
     front of one. The first browser run painted «WHEN When a creature you can
     see leaves your reach» — see splitTriggerLead. */
  const trigger = unstated ? null : splitTriggerLead(row.when!)

  return (
    <div
      className={`rounded-lg border border-bronze/20 border-l-2 bg-void-2/50 px-3 py-2 ${
        blocked ? 'border-l-bronze opacity-60' : unstated ? 'border-l-ember' : 'border-l-gold'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-forge-0">
          {row.name}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-forge-1">
          {row.cost}
        </span>
      </div>

      <p className="mt-1 text-xs leading-snug text-forge-0">
        <span className="mr-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-forge-2">
          {trigger ? trigger.lead : 'when'}
        </span>
        {trigger ? (
          trigger.rest
        ) : (
          <span className="text-ember">not stated — agree a trigger with your DM</span>
        )}
      </p>

      {row.body.length > 0 && (
        <p className="mt-0.5 text-xs leading-snug text-forge-1">{row.body}</p>
      )}

      {row.errataIds.length > 0 && (
        /* A count and a name, and nothing that looks like a door. The three
           readings of each erratum are slice 8; promising them here with a "tap
           for more" would be the half-built feature the guardrails forbid. */
        <p className="mt-1 text-[11px] leading-snug text-ember">
          ⚑ Canon lists {row.errataIds.length} errat{row.errataIds.length === 1 ? 'um' : 'a'} on
          this feature
        </p>
      )}

      {blocked && row.blockedReason && (
        <p className="mt-1 text-xs leading-snug text-ember">{row.blockedReason}</p>
      )}
    </div>
  )
}
