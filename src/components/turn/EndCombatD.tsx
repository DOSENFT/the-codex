/* ============================================================================
   THE SECOND TAP — rebuilt in D.
   ----------------------------------------------------------------------------
   WHAT WENT MISSING. `handleEndCombat` finalises the damage log and calls
   `forgetCombat`, which removes `codex-combat-${id}` from disk. A mis-tap
   mid-fight takes the round, the spent economy and the concentration with it.
   The old deck knew that: its button only ARMED, and `EndCombatConfirm` was the
   thing that ended the fight. The D phase moved the verb into `TurnVerbs` and
   wired `onClick` straight to the irreversible call — measured on Marcus's own
   export 2026-09-05, one tap took `inCombat true -> false` and `round 3 -> 1`,
   with nothing asked. This restores the guard.

   REBUILT, NOT REMOUNTED — his ruling. `EndCombatConfirm` paints in a palette
   this card does not use (`red-500/40`, `text-forge-1`, `rounded-xl`), so
   remounting it would have put a foreign object in the middle of the one row he
   presses under time pressure. The WORDS are carried over verbatim, because
   they were already right.

   NO HOOKS IN THIS FILE, DELIBERATELY. `TurnVerbs` calls `useDiceDock`, a
   `useContext`, so it cannot be invoked outside a renderer — and this repo has
   no jsdom, so `renderToStaticMarkup` is the whole of the node suite's reach
   and it emits no handlers. Had the armed/unarmed branch stayed inside
   `TurnVerbs` as 03-program-design.md first drew it, "the first tap arms and
   does not end" would have been unprovable in this suite: the only destructive
   control in the tab, pinned by the shape of its markup and nothing else.
   Hook-free, these are ordinary functions returning element trees, and
   `EndCombatD.test.tsx` presses their real handlers.

   WHY AMBER AND NOT EMBER. `--d-ember` is 4.68:1 and `tokens.css` marks it
   `>=16px only`; this strip's sentence is `--d-fs-body` (15px), so ember text
   would break the contrast floor this design system sets for itself. `.rbtn.end`
   is already amber for the same reason, and this is the same verb. Ember appears
   once — the 1px border, where a contrast ratio does not apply.

   Slice R7.
   ========================================================================== */

/** The strip itself: the sentence and the two doors. Rendered only when armed. */
export function EndCombatD({
  onKeepGoing,
  onConfirm,
}: {
  onKeepGoing: () => void
  onConfirm: () => void
}) {
  return (
    <div className="endc" role="group" aria-label="End combat confirmation">
      {/* Verbatim from `EndCombatConfirm`, and pinned by that component's tests
          as well as this one's. It states the consequence in the words of the
          thing that actually happens, because a confirm that only asks "are you
          sure?" moves the decision without informing it. */}
      <span className="endc-msg">
        End the encounter? Your damage log is saved to history, and the round
        counter, concentration and spent economy clear.
      </span>
      <div className="endc-doors">
        {/* THE WAY OUT IS FIRST. Two controls that read the same are one control
            to a screen reader, so they are named apart — and the safe one is the
            one the thumb reaches without aiming. */}
        <button type="button" className="rbtn" onClick={onKeepGoing} aria-label="Keep fighting">
          Keep going
        </button>
        <button
          type="button"
          className="rbtn end"
          onClick={onConfirm}
          aria-label="End combat — confirm"
        >
          End combat
        </button>
      </div>
    </div>
  )
}

/** The whole two-tap mechanism: unarmed it is a button that arms; armed it is
 *  the strip, in the button's place.
 *
 *  IN PLACE, not below. The row stays one row and the doors land where the thumb
 *  already was; `Look up` and `Reset` survive the arming, so the confirm cannot
 *  be mistaken for a modal that has taken the screen. The cost is that those two
 *  move when the row wraps — ruled acceptable against spending 48px of the
 *  scroller on a full-width strip (03-program-design.md §"Least confident", 1).
 *
 *  `onArm` ABSENT FALLS BACK to calling `onConfirm` on the first tap. That keeps
 *  `TurnRail.test.tsx` and the read-only design-shoot card — which supply no arm
 *  handler — meaning what they meant. It is also the design's own least
 *  confident decision (§2): a caller who FORGETS the handler silently gets the
 *  unguarded behaviour back. `TurnLive` is the only caller that can end a real
 *  fight, and it is pinned in the browser by `prove-sliceR7.mjs` rather than
 *  here. */
export function EndCombatDoor({
  armed,
  onArm,
  onCancel,
  onConfirm,
}: {
  armed?: boolean
  onArm?: () => void
  onCancel?: () => void
  onConfirm: () => void
}) {
  if (armed) return <EndCombatD onKeepGoing={onCancel ?? (() => {})} onConfirm={onConfirm} />
  return (
    <button
      type="button"
      className="rbtn end"
      onClick={onArm ?? onConfirm}
      aria-label="End combat"
      /* It opens something rather than doing something, and it says so. */
      aria-expanded={onArm ? false : undefined}
    >
      End combat
    </button>
  )
}

export default EndCombatD
