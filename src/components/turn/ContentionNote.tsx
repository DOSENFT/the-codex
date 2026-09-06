import type { MutexGroup } from '../../lib/turn/types'
import { CONTENTION_WHY } from '../../lib/turn/contention'

/* ============================================================================
   THE CONTENTION SENTENCE, AT THE FOOT OF THE BAND IT IS ABOUT — Slice R3.
   ----------------------------------------------------------------------------
   Marcus, 2026-09-04:

     "It also has my available spells in boxes labeled 'one of these — your
      bonus action. Pick one' and 'one of these — Your action' underneath it
      all. That seems wrong."

   It was wrong, and it was wrong in a way that took two slices to undo, because
   the box was not merely a caption — it was a PLACE. An option inside it had
   been removed from its band to get there (R2), so the fence that was meant to
   teach him the rule was also the thing emptying the list he was reading.

   WHAT SURVIVES, AND WHY IT MUST. The claim itself is true and is the single
   most valuable thing this screen says: Divine Smite, Shield of Faith and Misty
   Step are not three things he may do, they are one decision with three faces,
   and a screen that lists them as three ordinary rows is printing a wrong rule
   at the table under a six-second clock. Deleting the fence outright would have
   traded Marcus's complaint for a worse one.

   SO THE CLAIM MOVES INSTEAD OF DYING. It is now a marker on each competing row
   — the row says it competes, where he is already looking — and this one
   sentence under the last row of the band. The band header already says ACTION;
   repeating "your action" here is the part of the old caption that was pure
   noise, so it is gone. What is left is the only part he could not work out for
   himself: HOW MANY compete, and WHICH RULE binds them.

   IT IS A SENTENCE, NOT A CONTAINER. Nothing is inside it. That is the whole
   difference between this file and the `Mutex` component it replaces, and it is
   why this one cannot regress into hiding an option: it has no room to hold
   one.
   ========================================================================== */

/** The sentence for ONE band, or nothing.
 *
 *  `group` is null on every band with no live contention — which on a spent
 *  Action is all of them, correctly: `findContention` only brackets options he
 *  can still take, so when there is no decision left to make there is no
 *  sentence about making it. */
export function ContentionNote({ group }: { group: MutexGroup | null }) {
  if (!group) return null
  const n = group.faces.length
  return (
    <p className="bcon">
      {/* THE COUNT IS THE FACT HE CANNOT DERIVE. He can see the rows; what he
          cannot see by looking is that these particular ones are alternatives
          to each other rather than a list. Marked rows and this number have to
          agree, and they do because both are read off the same `faces`. */}
      <span className="bck">{n} of these compete — you get one</span>
      <span className="bcw">{CONTENTION_WHY[group.reason]}</span>
    </p>
  )
}

/** The group binding a given band, if any.
 *
 *  Kept beside the component rather than in `TurnLive` so that "which group
 *  belongs to this band" is answered once. `MutexGroup` has no `slot` field —
 *  it is a property of the faces, all of which share it by construction
 *  (`findContention` buckets BY slot, and `compose.test.ts` asserts the set of
 *  slots in a group has size 1) — so it is read off face zero, which is where
 *  `findContention` itself reads it when it sorts. */
export function groupForSlot(groups: readonly MutexGroup[], slot: string): MutexGroup | null {
  return groups.find(g => g.faces[0]?.cost.slot === slot) ?? null
}

export default ContentionNote
