/* ============================================================================
   THE GAP THAT NO ROW CAN DESCRIBE — Your-Turn slice 6, item 8.
   ----------------------------------------------------------------------------
   Marcus, item 8: "in the combat tab, it doesnt seem to have all of my available
   reactions available. I should have the hearthfire manifest, sentinal, and
   interception."

   Measured before anything was built (`prove-slice6.mjs`, 2026-08-31, his real
   export at 390×844): his Reaction band paints FOUR rows — Hearthfire Manifest,
   Sentinel, Sentinel, Opportunity Attack — and adding Interception to his sheet
   makes it FIVE, with the right trigger text, with no other change anywhere.

   So the engine was already whole and this is not a missing feature. It is that
   **nothing has ever asked him which Fighting Style he took.** `prepare/
   fighting-style.ts` said exactly that in its header in the previous phase, and
   built every part of the answer except the asking.

   ── WHY THE ASK BELONGS HERE, ON THE COMBAT TAB ─────────────────────────────

   The picker has existed in the Grimoire since Open Book slice 6, mounted under
   the *Fighting Style* catalogue row, which is the right home for it: the choice
   sits under the three bands that explain what the choice IS. But a control he
   has never found is indistinguishable from a control that does not exist, and
   the place he NOTICED the gap is the combat tab — he wrote item 8 about the
   combat tab. A question is only asked if it is asked where the person is.

   ── AN ABSENCE CANNOT BE A ROW ──────────────────────────────────────────────

   Rows come from `bands`, `bands` comes from options, and an option he has
   never recorded produces no option. The gap is therefore invisible to every
   row-shaped mechanism this screen has, including slice 5's `rowExtra`, and
   that is why slice 6 added a band-level slot instead of reusing one.

   ── IT DELETES ITSELF ───────────────────────────────────────────────────────

   The moment he picks, `currentFightingStyle` stops returning null, `TurnLive`
   stops passing this note, and the Reaction band is four rows plus his style
   forever after. Nothing here is permanent furniture: this component's whole
   purpose is to stop existing, which is the only honest form for a prompt on a
   screen whose subject is density.

   ── ONE PICKER, NOT TWO ─────────────────────────────────────────────────────

   `FightingStylePicker` is rendered as-is. Copying its eleven rows would be
   finding BB rebuilt by hand — two lists of styles that can disagree about what
   canon contains, on the one question whose whole job is to be recorded once
   and correctly. The rules for what a style is, which one is his, and what
   picking does all stay in `prepare/fighting-style.ts`; this file owns a button
   and a sheet.
   ========================================================================== */

import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { FightingStylePicker } from '../grimoire/FightingStylePicker'
import type { CanonFeat } from '../../lib/canon/types'
import type { Character } from '../../lib/character'

export interface FightingStyleGapProps {
  character: Character
  /** The sheet's one writer, handed down. This component never writes. */
  onPick: (style: CanonFeat) => void
}

export function FightingStyleGap({ character, onPick }: FightingStyleGapProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* `data-` marker, not a class name, so the prover can find this without
          pinning a style — the same rule slice 5's tests follow. */}
      <button
        type="button"
        data-fighting-style-gap
        className="bnote"
        onClick={() => setOpen(true)}
      >
        <span className="bnh">One reaction is missing</span>
        <span className="bnd">
          You chose a Fighting Style at level 2 and this app has never been told
          which. If it is Interception, it is a Reaction — and it belongs in this
          band.
        </span>
        <span className="bna">Tell it which →</span>
      </button>

      <Sheet isOpen={open} onClose={() => setOpen(false)} label="Pick your fighting style">
        <FightingStylePicker
          character={character}
          onPick={style => {
            onPick(style)
            /* Closes on the press. He came here from the combat tab to answer
               one question, and leaving the sheet open would leave him looking
               at the picker instead of at the band that just gained a row —
               which is the thing he actually asked to see. */
            setOpen(false)
          }}
        />
      </Sheet>
    </>
  )
}

export default FightingStyleGap
