import type { Character } from '../../lib/character'
import { HPTracker } from '../HPTracker'

/* ============================================================================
   HIS BODY, INSIDE THE ONE CARD — items 10 and part of 11.
   ----------------------------------------------------------------------------
   Marcus, item 10:

     "there is a 'Hit Points' module that also has conditions drop down feature.
      Cool features. But id like to see that all neatly and masterfully rolled
      into the one 'your turn' module. … Right now, the app displays my hit
      points in like 3 different locations. So really, the only thing we need to
      roll would be the color changing aspect of the hit point tracker, the
      damage, heal, and temp health buttons, and the conditions drop down."

   He named the parts to move and, by omission, the part not to: the READOUT. He
   has one already, in the card, with the bloodied mark on it. So this brings the
   CONTROLS across and leaves the number where it is.

   AN ADAPTER, NOT A REWRITE, and that is a rule rather than a preference.
   `HPTracker` is the only thing in this app that writes hit points to his stored
   sheet, and it carries four behaviours that are easy to forget and expensive to
   get wrong:

     · HEARTH-04's temp-HP REPLACEMENT warning — temp HP does not stack, and
       taking the new pool can lose him the bigger one
     · the temp-HP SOURCE question (phase 4) — the app asks where temp HP came
       from instead of guessing, because guessing is how it would silently edit
       his sheet
     · death saves, with the stabilised and dead states
     · the retaliation prompt, which fires on damage entry ONLY while the cloak
       is up — the asymmetry table-truth slice 10f argued for at length

   Reimplementing any of that here would put a second writer on `codex-character-
   <id>`, and `vitals.ts` REPORTS AND NEVER CORRECTS precisely so that nothing
   quietly rewrites what he typed. One writer. This file adds no state, no
   effect, and no storage access of its own — it is a mount and nothing else.
   ========================================================================== */

export interface VitalsControlsProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  /** Passed straight through to the tracker. Item 7 — the Hearthfire Manifest
   *  retaliation — is wired in slice 5; this slice only makes sure the seam
   *  survives the move, rather than discovering in slice 5 that it did not. */
  onRetaliate?: (amount: number, source: string) => boolean
  refusal?: string | null
}

export function VitalsControls({
  character,
  onCharacterUpdate,
  onRetaliate,
  refusal,
}: VitalsControlsProps) {
  return (
    <div className="vctl">
      <HPTracker
        variant="bare"
        character={character}
        onCharacterUpdate={onCharacterUpdate}
        onRetaliate={onRetaliate}
        refusal={refusal}
      />
    </div>
  )
}

export default VitalsControls
