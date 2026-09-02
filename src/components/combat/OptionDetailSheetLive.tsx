import { useState } from 'react'
import type { Character } from '../../lib/character'
import type { ErratumRulings } from '../../lib/errata-rulings'
import type { TurnOption } from '../../lib/turn/types'
import { optionDetail } from '../../lib/turn/detail'
import { loadActionNotes, noteFor, saveActionNotes, withNote } from '../../lib/action-notes'
import { useCombat } from '../turn/CombatProvider'
import { OptionDetailSheet } from './OptionDetailSheet'

/* ============================================================================
   THE DETAIL SHEET, LIVE — Table Truth slice 7, moved here by Your-Turn slice 5.
   ----------------------------------------------------------------------------
   IT WAS A PRIVATE FUNCTION INSIDE CombatHelper.tsx UNTIL NOW, and the move is
   the point rather than tidiness. Slice 5 makes D's rows open this same sheet.
   Copying forty lines into TurnLive would have put two wrappers around one
   modal — two places to decide whether a spend closes it, two places to clear
   the refusal — which is finding BB (one fact, two models) rebuilt by hand in
   the phase that exists to remove exactly that. `CombatHelper` now imports what
   it used to declare, so slice 8 deletes an import instead of a component.

   A hooks wrapper for the same reason `ReactionsBandLive` is one: the sheet
   body is a pure function of its props so it can be rendered — and asserted on
   — in the node test environment, which has no DOM. The `useCombat()` call
   lives here instead.

   IT READS THE SAME COMPOSED TURN THE ROW CAME FROM. `turn.economy` is what
   makes the one-slot-per-turn box live rather than a general note: the box says
   "you have already spent your slot" only when this turn's economy says so.
   Reading a different source here than the row read would let the sheet and the
   row that opened it disagree about the same turn.

   IT IS ALSO THE ONLY PLACE ON EITHER TAB THAT SPENDS THROUGH THE RULES.
   Every other writer goes through `updateCombat`, which is the manual override
   and applies no rules at all; `take` routes through `reduce`, which refuses an
   illegal spend and can put it back. D's rows called `take` DIRECTLY until this
   slice, which meant one press on "Divine Smite" burned a 2nd level slot with
   nothing on screen first saying what it cost or what it did. Now the press
   opens; this sheet spends.

   WHY THE REFUSAL IS THE PROVIDER'S AND NOT A `useState` HERE. That would be a
   second model of one fact, which is finding BB again. It is safe to read the
   shared one because `close` clears it, so a refusal can never outlive the
   sheet that produced it.
   ========================================================================== */

export interface OptionDetailSheetLiveProps {
  /** Null renders nothing at all — the closed state is the absence of an
   *  option, not a boolean beside one, so the two can never disagree. */
  option: TurnOption | null
  character: Character
  onClose: () => void
  onRollDice?: (prefill: { notation: string; label: string }) => void
  /** The same map the Rules flags band writes, so a ruling recorded there is
   *  the ruling this sheet reports. */
  rulings: ErratumRulings
}

export function OptionDetailSheetLive({
  option,
  character,
  onClose,
  onRollDice,
  rulings,
}: OptionDetailSheetLiveProps) {
  const { turn, take, refusal, dismissRefusal } = useCombat()

  /* HIS NOTES, READ ONCE ON MOUNT — slice 8d-3, and the hooks wrapper is where
     they belong for the reason this whole file exists: the sheet body is a pure
     function of its props so it can be asserted on in the node environment,
     which has no `localStorage` at all.

     Lazy, so the disk is not read on every render of a sheet that is closed
     nine tenths of the time. Held in state as well as written, because the save
     has to show up under his thumb immediately — re-reading the disk to repaint
     would be a second source for a fact this component already has. */
  const [notes, setNotes] = useState(() => loadActionNotes(character.id))

  /* Clearing on close is what keeps one shared refusal honest: whichever way
     the sheet goes away — the ✕, the backdrop, Escape — the next option opens
     with nothing carried over from the last one. */
  const close = () => {
    dismissRefusal()
    onClose()
  }

  if (!option) return null

  /* Filed under the option's NAME. Inherited, not chosen — every note already
     on his disk is keyed that way. See `lib/action-notes.ts`. */
  const saveNote = (text: string) => {
    const next = withNote(notes, option.name, text)
    setNotes(next)
    saveActionNotes(character.id, next)
  }

  return (
    <OptionDetailSheet
      isOpen
      detail={optionDetail(option, character, turn.economy)}
      onClose={close}
      onRoll={onRollDice}
      /* CLOSES ON A SPEND, STAYS OPEN ON A REFUSAL. On success the option in
         hand has become a description of something already done, and leaving it
         up invites a second tap on a slot that is gone; on refusal the reason
         has to land on the surface the tap happened on, or it lands nowhere. */
      onSpend={() => {
        if (take(option)) close()
      }}
      refusal={refusal}
      rulings={rulings}
      note={noteFor(notes, option.name)}
      onSaveNote={saveNote}
    />
  )
}

export default OptionDetailSheetLive
