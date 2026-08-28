import type { ReactionRow as ReactionRowModel } from '../../lib/turn/reactions'
import type { RetaliationTally } from '../../lib/turn/retaliation'
import { splitTriggerLead } from '../../lib/turn/trigger'
import { RetaliationCapture } from './RetaliationCapture'

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

   IT EXISTS NOW — slice 8b, and this is the line reading it. One rule governs
   the change, and it is the answer to "should a recorded ruling change
   anything?":

       A RULING CHANGES WHAT THE APP SAYS. IT NEVER CHANGES WHAT THE APP
       COMPUTES.

   So the clause appears here as the trigger, and NO number moves anywhere in the
   app — not the temp HP, not the retaliation die, not a save DC. Canon forbids
   the silent version in as many words (HEARTH-01: "Do not silently implement
   either version. Present the conflict to the player."), and the operative word
   is *silently*: a ruling that is attributed, reversible and visible is the
   conflict being presented, not hidden. So the row always names the source —
   "your DM's ruling" or "canon's suggested fix" — and the erratum it answers.
   An unattributed clause here would be indistinguishable from the invented
   trigger slice 6 refused to ship.

   THE CHEVRON ARRIVED WITH ITS DESTINATION — slice 7. Slice 6 left this row
   inert because the detail sheet did not exist yet and an affordance that opens
   nothing is a half-built feature running as if done. It exists now, so the tap
   is wired in the same change. `onOpen` is optional and the row without it is
   byte-for-byte the slice 6 row.

   The sheet opens on `row.option` — the option this row was BUILT from, carried
   on the model — rather than on `row.id` looked up again. Two ways to resolve
   the same tap is one way too many.
   ========================================================================= */

export interface ReactionRowProps {
  row: ReactionRowModel
  /** Opens the option detail sheet. Omitted → the row is inert, as in slice 6. */
  onOpen?: (option: ReactionRowModel['option']) => void
  /** Records a free retaliation die — Table Truth slice 10f. Omitted → the row
   *  is byte-for-byte the slice 8b row, which is how every existing caller and
   *  every existing test still gets exactly what it got before. */
  onRetaliate?: (amount: number, source: string) => boolean
  /** The encounter's running tally, for the row that offers the die. */
  tally?: RetaliationTally
  /** Why the last Add was turned down. Only the capture control paints it. */
  refusal?: string | null
}

export function ReactionRow({ row, onOpen, onRetaliate, tally, refusal }: ReactionRowProps) {
  const blocked = !row.available
  const unstated = row.when === null
  /* The label is the clause's own lead word, not a fixed "WHEN" bolted on in
     front of one. The first browser run painted «WHEN When a creature you can
     see leaves your reach» — see splitTriggerLead. */
  const trigger = unstated ? null : splitTriggerLead(row.when!)

  const ruling = row.whenSource === 'ruled' ? row.whenRuling : undefined

  const skin = `rounded-lg border border-bronze/20 border-l-2 bg-void-2/50 px-3 py-2 ${
    blocked ? 'border-l-bronze opacity-60' : unstated ? 'border-l-ember' : 'border-l-gold'
  }`

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-forge-0">
          {row.name}
          {/* Finding AY again, and the same cause: `gap-3` is a gap, not a
              space, so the DOM read «Flaming CloakReaction · 1/2 uses». The
              space goes INSIDE the name rather than between the two spans —
              a bare text node here would become a third flex item and
              `justify-between` would push it into the middle of the row.
              Trailing whitespace inside an inline box collapses visually, so
              nothing moves; only the text is now made of words. */}
          {' '}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-forge-1">
          {row.cost}
        </span>
      </div>

      <p className="mt-1 text-xs leading-snug text-forge-0">
        <span className="mr-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-forge-2">
          {trigger ? trigger.lead : 'when'}
        </span>
        {/* A REAL SPACE, not just the span's margin — found by the slice 8b
            browser prover, and it had been wrong since slice 6. The margin puts
            a gap on the screen but nothing in the text, so the DOM read
            «WHENyou take damage»: what a screen reader says aloud, and what
            Marcus gets if he copies the line at the table. The unit suite could
            not see it, because its tag-stripper INSERTED the space the DOM was
            missing — the same class of error as finding Q, from the other end.
            Finding AY. */}
        {' '}
        {trigger ? (
          trigger.rest
        ) : (
          /* Now that the band exists, this says WHERE to fix it rather than
             only that it is broken. Slice 6 could not: naming a place that did
             not exist yet would have been the half-built promise. */
          <span className="text-ember">not stated — record one in Rules flags</span>
        )}
      </p>

      {ruling && (
        /* Attribution, always, directly under the clause it explains. This is
           the difference between "the app says my cloak triggers on damage" and
           "an app invented a rule for me" — and at a table, being able to say
           *whose* ruling it is settles the argument. */
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-arcane">
          {ruling.via === 'dm' ? "your DM's ruling" : "canon's suggested fix"} · {ruling.erratumId}
        </p>
      )}

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
    </>
  )

  /* THE STANDING CONTROL — slice 10f, and Marcus's own decision about it:
     "always reachable". It is here whether or not the cloak is up, whether or
     not the HP tracker prompted him, on his turn and off it. The prompt under
     the HP tracker is the convenience; this is the guarantee, and the guarantee
     is the one that must not depend on the app having noticed anything. */
  const capture =
    row.retaliation && onRetaliate ? (
      <RetaliationCapture
        die={row.retaliation}
        tally={tally}
        refusal={refusal}
        offer="button"
        onRecord={onRetaliate}
      />
    ) : null

  /* THE CARD IS A DIV AND THE DETAIL AFFORDANCE IS A BUTTON INSIDE IT.
     Until 10f the whole card WAS the button, which is the better target when a
     row does exactly one thing. It cannot survive a second control: a button
     inside a button is invalid HTML, and browsers resolve it by dropping the
     inner one — so `+1d10 retaliation` would have painted and done nothing.
     The skin, the hover and the aria-label are unchanged; only the element the
     padding hangs off has moved outwards by one. */
  const detail = onOpen ? (
    <button
      type="button"
      onClick={() => onOpen(row.option)}
      aria-label={`${row.name} — details`}
      className="w-full text-left"
    >
      {body}
      <span className="mt-1 block text-right font-mono text-xs text-forge-2">▸</span>
    </button>
  ) : (
    body
  )

  return (
    <div className={`${skin}${onOpen ? ' transition-colors hover:border-gold/40' : ''}`}>
      {detail}
      {capture}
    </div>
  )
}
