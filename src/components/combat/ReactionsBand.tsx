import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Character } from '../../lib/character'
import type { ComposedTurn, TurnOption } from '../../lib/turn/types'
import { reactionRows } from '../../lib/turn/reactions'
import type { ErratumRulings } from '../../lib/errata-rulings'
import { ReactionRow } from './ReactionRow'

/* ============================================================================
   YOUR REACTIONS — Table Truth slice 6.

   ── WHY IT IS ITS OWN BAND AND NOT PART OF "YOUR TURN" ──────────────────────
   A reaction is the one thing you own when it is NOT your turn. Mixed into a
   ranked turn list it is either buried (on your turn, where rank.ts correctly
   scores it −40) or it is the only thing there (off your turn, where the same
   list is headed "The moment"). Neither reading survives the round. So it gets
   a band that says the same thing all the way through combat, and `YourTurnList`
   now filters reactions OUT so no row is painted twice.

   ── WHERE THE ROWS COME FROM, AND THE BUG THAT IS NOT HERE ──────────────────
   Gate 3 specified `turn.ranked.filter(slot === 'reaction')`. Measured: on your
   own turn that array is EMPTY, because rank.ts demotes reactions and they land
   in `turn.rest`. A band built on that line would be blank for the half of
   combat Marcus is actually looking at it. `reactionRows` reads every bucket;
   `reactions.test.ts` pins the emptiness of `ranked` as its premise so the day
   rank.ts changes, the test says so instead of the screen going quiet.

   ── IT COLLAPSES, AND IT REMEMBERS ──────────────────────────────────────────
   Through the same `useCollapsible` every other section on this tab uses, into
   the same `codex-ui-${characterId}` map. No new storage key: Marcus asked for
   fewer things on screen, not for more places his preferences can be lost.
   Default OPEN — this is the surface he said was missing.

   ── STATE IS PASSED IN, NOT READ ────────────────────────────────────────────
   `turn` and `character` are props rather than a `useCombat()` call so the band
   renders identically under `renderToStaticMarkup`, which is how it is tested
   without a DOM. The caller in CombatHelper does the context read.
   ========================================================================= */

export interface ReactionsBandProps {
  turn: ComposedTurn
  character: Character
  isOpen: boolean
  onToggle: () => void
  /** Opens the option detail sheet — Table Truth slice 7. Optional, so the band
   *  renders exactly as it did in slice 6 for any caller with nowhere to send
   *  the tap. */
  onOpen?: (option: TurnOption) => void
  /** What Marcus has settled with his DM — Table Truth slice 8b. Passed in for
   *  the same reason `turn` is: the band stays renderable without a DOM. Omitted
   *  → nothing recorded, which is the slice 6 band exactly. */
  rulings?: ErratumRulings
}

export function ReactionsBand({
  turn,
  character,
  isOpen,
  onToggle,
  onOpen,
  rulings = {},
}: ReactionsBandProps) {
  const rows = reactionRows(turn, character, rulings)

  return (
    <section className="glass-card p-3" aria-label="Your reactions">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-forge-0">
          Your reactions
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-forge-2">
          {rows.length}
          {isOpen ? (
            <ChevronUp size={14} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={14} className="text-forge-2" aria-hidden />
          )}
        </span>
      </button>

      {isOpen &&
        (rows.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {rows.map(row => (
              <li key={row.id}>
                <ReactionRow row={row} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : (
          /* An empty band still renders. "You have none" is a fact worth two
             seconds off your turn; a band that vanishes leaves you wondering
             whether it vanished or you missed it. */
          <p className="mt-2 text-xs leading-snug text-forge-1">
            Nothing on this sheet costs a Reaction.
          </p>
        ))}
    </section>
  )
}
