import type { TurnAttack } from '../../lib/turn/types'

/* ============================================================================
   THE HELD ACTION, SAID OUT LOUD — Slice R6.
   ----------------------------------------------------------------------------
   Marcus, 2026-09-04: "It also doesnt allow me to take my two mele attacks."

   R4 built the rule. R5 made the Action HOLD across both swings, and made none
   of it visible: after his first tap the weapon row stays live, six other rows
   grey with a true reason — and the row he needs is the only one on the screen
   that says nothing, under a header still reading `ACTION · open`. At a table
   under a six second clock, an app that is right and silent is indistinguishable
   from an app that ignored the tap. That is what this file is for.

   TWO SENTENCES, IN THE TWO PLACES HE LOOKS:

     · the header chip   "1 of 2 used"           — the state of the action
     · the row line      "1 attack left · Swing again"  — what to do about it

   IT COMPUTES NOTHING. `turn.attack` arrives already counted from `compose.ts`,
   which reads the same two numbers it writes every blocked row's reason from.
   Recomputing `of` here from the character would make this file a second
   authority on Extra Attack, and the day the two drifted the header would
   contradict the rows beneath it while looking entirely confident. The same
   shape as `ContentionNote.tsx` from R3, and for the same reason: components
   that render, plus one pure predicate the caller can ask BEFORE it builds a
   node.
   ========================================================================== */

/** Are you strictly in the middle of an Attack action?
 *
 *  STRICTLY BETWEEN, and both ends matter. At zero the action has not started;
 *  at the full count it is genuinely spent and the ordinary "your action is
 *  spent" is the true thing to say. Both ends land on the behaviour that
 *  shipped before R5, which is what keeps this out of the way of anyone who is
 *  not mid-swing — every Cleric, and every martial below level 5.
 *
 *  EXPORTED AS A PREDICATE, and that is not tidiness. `Act` chooses between two
 *  DIFFERENT markups on the truthiness of its `extra` prop (`TurnRow.tsx:105`),
 *  and a React element that renders null is still a truthy element. A caller
 *  that handed over `<SwingAgain/>` unconditionally would give every weapon
 *  attack in the app a permanent empty box with a hairline over it. So the
 *  caller asks this first and passes the literal `null` when the answer is no. */
export function midAttack(attack: TurnAttack): boolean {
  return attack.used > 0 && attack.used < attack.of
}

/** The chip in the band header: how much of the Attack action is gone.
 *
 *  PRINTED AT ZERO, and this is the decision in this file most worth
 *  challenging. `BandHead` already argues the case for its neighbour in its own
 *  words — "THE COUNT IS ALWAYS PRINTED, INCLUDING ZERO... a count that
 *  disappeared when it hit zero would leave the band looking identical to a band
 *  whose rows are merely collapsed" — and it holds harder here. Marcus's
 *  complaint was never that a second swing was refused; it was that the app
 *  never told him it knew he had two. A chip that appeared only after the first
 *  tap would leave the screen silent at the one moment he is DECIDING.
 *
 *  Nothing at all when there is only one attack in the action, which is most
 *  characters and every martial below level 5: their Action band is exactly what
 *  it was before this slice, to the byte. */
export function AttackTally({ attack }: { attack: TurnAttack }) {
  if (attack.of <= 1) return null
  return (
    <span className="batk">
      {attack.used} of {attack.of} used
    </span>
  )
}

/** The line under the weapon row, offering the swing he has left.
 *
 *  NOT PRINTED BEFORE THE FIRST SWING. The header already carries the fact, and
 *  "swing again" on a swing not yet taken is a lie about what he has done. The
 *  count is `of - used`, the same arithmetic the composer prints into every
 *  blocked row's reason, so the live row and the greyed ones agree by reading
 *  rather than by coincidence.
 *
 *  Two spans, split the way `.bcon` splits: the numeral is the fact he cannot
 *  derive by looking and carries the tally ink every count on this screen
 *  carries; the verb is the only part that is an instruction, and it is the only
 *  part that is amber. */
export function SwingAgain({ attack }: { attack: TurnAttack }) {
  if (!midAttack(attack)) return null
  const left = attack.of - attack.used
  return (
    <p className="swing">
      <span className="swn">
        {left} attack{left === 1 ? '' : 's'} left
      </span>
      <span className="swv">Swing again</span>
    </p>
  )
}

export default AttackTally
