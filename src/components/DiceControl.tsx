/* Who owns the dice control, and where it is allowed to sit.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * FINDING BF, opened at the close of slice 10e and measured before this file
 * was written (`_probe-bf.mjs`, `_probe-bf2.mjs`). On a 390×844 phone, in
 * combat, on Marcus's real sheet:
 *
 *     --turn-deck-h .......... 302px       (186px minimised)
 *     <main> ................. 421px       (537px minimised)
 *     dice button ............ fixed, z-50, 56×56, top edge at y=406
 *     overhang into <main> ... 71px, IN BOTH DECK STATES
 *
 * The button's `bottom` is expressed in terms of `--turn-deck-h`, so it MOVES
 * with the deck — minimising the deck does not uncover the text underneath it,
 * it only changes which text is underneath it. Measured: expanded it covers the
 * Interception row's rules text; minimised it covers the Opportunity Attack
 * row's cost. One text run became two.
 *
 * ── THE LAW WAS ALREADY WRITTEN, AND APPLIED TO ONLY ONE OVERLAY ────────────
 * `Layout.tsx` states it in as many words:
 *
 *     "The scroll region is BOUNDED, not padded. Padding at the end of the
 *      content only guarantees you can scroll the last row out from under a
 *      fixed overlay. It does nothing at any other scroll position: at
 *      scroll-top, whatever happens to be at the foot of the viewport is still
 *      underneath."
 *
 * That is finding BF, described a phase early. The page was then bounded
 * against the turn deck — and left unbounded against the dice button, which is
 * the other fixed thing in the same corner. So this is not a new principle; it
 * is the existing one finally applied to both overlays.
 *
 * ── WHY BOUNDING ALONE IS THE WRONG FIX ON THE PLAY TAB ─────────────────────
 * Bounding `<main>` against the button costs 71px of full-width content height
 * to clear a control that is 56px wide. On a screen with 779px of content
 * (every tab with no deck) that is 9% and it is worth paying. On the Play tab,
 * where the deck has already taken the page down to 421px, it would be 19% —
 * and the whole complaint is that Marcus cannot read a reactions band that
 * already only fits 2 of its 5 rows. A fix that shrinks the porthole to widen
 * it is not a fix.
 *
 * So the rule is: **a surface that already owns fixed chrome at the bottom of
 * the screen adopts the dice control into it, and the page is bounded against
 * that chrome — which it already was.** The turn deck is such a surface, and it
 * has the room: measured, its slot-pip row ends at x≈225 of 390 in both deck
 * states, leaving 165px of dead width that costs nothing to use. The button
 * lands there and the deck does not get one pixel taller.
 *
 * Everywhere else, nothing docks, the button keeps floating exactly where it
 * always has — and `<main>` is finally bounded against it.
 *
 * ── WHAT THE PROOF ACTUALLY MEASURED (prove-slice10f-a.mjs, 390×844) ────────
 * Written before the code and left standing afterwards, because the numbers
 * came back as predicted and a prediction that survives is worth more than a
 * number recorded after the fact:
 *
 *                       BEFORE                    AFTER
 *   Play, expanded      main 421px, 56px          main 421px, NO fixed
 *                       of dice button inside     chrome inside it at all
 *   Play, minimised     main 537px, same 56px     main 537px, likewise
 *   Grimoire (no deck)  main 723px, same 56px     main 652px, likewise
 *
 * Read the Play rows first: `<main>` did not lose one pixel. The control moved
 * into 165px of dead width the deck was already paying for, so the reactions
 * band still fits the same 2 of 5 rows expanded and 3 of 5 minimised. That
 * equality is the point — a "fix" that cleared the overlap by shrinking the
 * page would have made Marcus's actual complaint worse, and these two numbers
 * are what would have caught it.
 *
 * Grimoire is where the 71px is spent, exactly as budgeted above: 723 → 652,
 * 9.8% of a page that had room. Note 71px, not 56px — bounding costs the
 * button's height PLUS the 15px it floats above the old boundary, because the
 * page has to clear its top edge, not its footprint.
 *
 * One caution for whoever reads this next. The "text runs covered" count is
 * the WEAK claim: pre-change, Grimoire already reported zero covered runs, not
 * because it was safe but because no word happened to land in that 56px
 * corner. The claim that cannot get lucky is the one in the table — zero fixed
 * chrome intersecting `<main>`'s box, which makes "nothing is covered" true at
 * every scroll position, on every sheet, rather than at the three the prover
 * sampled.
 *
 * ── WHY A CONTEXT AND NOT A PROP ────────────────────────────────────────────
 * `Layout` renders `{children}`; the deck is mounted five levels down inside
 * `CombatHelper`. Threading a callback down would put a dice prop on four
 * components that have nothing to do with dice. The context carries two things
 * and no state of its own beyond the docking count:
 *
 *   open()       open the dice roller — the same call the floating button makes
 *   useDiceDock() a surface declaring "I have adopted this control"
 *
 * `open` is **null** when there is no provider. A `TurnDeck` rendered bare in a
 * unit test therefore renders no dice button rather than a broken one, and the
 * component stays independently renderable — which is how every other test in
 * `src/components/` mounts it.
 *
 * Table Truth slice 10f-a (finding BF).
 */
import { createContext, useContext, useEffect } from 'react'

export interface DiceControl {
  /** Open the dice roller. `null` when no provider is mounted. */
  open: (() => void) | null
  /** Called by an adopting surface on mount/unmount. Not for general use. */
  setDocked: (docked: boolean) => void
}

const NO_PROVIDER: DiceControl = { open: null, setDocked: () => {} }

export const DiceControlContext = createContext<DiceControl>(NO_PROVIDER)

/** The dice control, for a surface that wants to open the roller. */
export function useDiceControl(): DiceControl {
  return useContext(DiceControlContext)
}

/** Declare that this surface has adopted the dice control into its own chrome.
 *
 *  While at least one surface has, `Layout` stops painting the floating button
 *  — so the app never has two of them, and never has a fixed one over content
 *  on a screen whose chrome could hold it instead.
 *
 *  Returns `open`, so the caller does not need both hooks. */
export function useDiceDock(): (() => void) | null {
  const { open, setDocked } = useDiceControl()
  useEffect(() => {
    /* Only claim the dock if there is something to dock. Without a provider
       `open` is null, nothing is rendered, and claiming would hide a floating
       button that this surface never replaced. */
    if (!open) return
    setDocked(true)
    return () => setDocked(false)
  }, [open, setDocked])
  return open
}
