import type { SeedPack } from '../types'
import { HEARTH_7_R2_COMBOS } from './hearth-7-r2.combos'
import { HEARTH_7_R2_TACTICS } from './hearth-7-r2.tactics'
import { HEARTH_7_R2_PERSONA } from './hearth-7-r2.persona'

/* ==========================================================================
   PACK: hearth-7-r2 — the second batch, for the paladin who is actually here

   WHY THIS IS A SECOND PACK AND NOT MORE ENTRIES IN `hearth-7`. Because
   `seededPacks` already contains `hearth-7` for the one character that matters.
   A marked pack is skipped forever — that is the rule that makes deleting a
   card stick — so entries added to round one would sit in this repo and never
   reach his phone. A new pack id is the only thing that reaches an
   already-seeded Toybox. `docs/plans/toybox-r2/02-architecture.md` §1.

   WHY IT EXISTS AT ALL. Marcus starred none of round one's 31. Not because they
   are wrong — they are accurate and they paint — but because round one was
   written against the TEST FIXTURE: a paladin with "Hearthbrand", a 1d8
   one-handed sword at five feet, Strength 16 and no feats. He carries The Dawn
   Guardian — 1d10, Two-Handed, Reach 10, Graze — with Strength 18, Athletics,
   Sentinel and Lucky. The tokens swapped the NAMES in correctly, so every card
   reads as a true sentence; the tactical thinking behind them is sword-and-board
   thinking for a man holding a glaive, and that is invisible from the glass.

   THE TWO RULES THIS PACK IS WRITTEN TO, both from Gate 1:

     A COMBO IS ONE TURN. Numbered action-economy steps and a Deploy button,
     because it is a thing you press while the table waits for you. At most one
     ACTION, one BONUS and one REACTION — `../pack-hearth-7-r2.test.ts` asserts
     it, so the line is kept by the build and not by whoever writes the next one.

     A TACTIC IS EVERYTHING THAT IS NOT ONE TURN. Where to stand, what to buy,
     what to prepare, what to ask your DM. A trigger and a priority, no Deploy.

   AND THE BAR ABOVE THE LINE: a combo must contain a SURPRISE — two pieces
   snapping into more than their sum. A tactic must CHANGE A DECISION he would
   otherwise get wrong. Accurate-but-obvious is what round one shipped and it is
   the thing this pack exists to not ship. "Attack twice and Smite" is Tuesday.

   THE LEVEL WINDOW IS 5 TO 8, matching round one and for round one's reasons:
   five because several combos spend Extra Attack, eight because at nine the
   slot table grows a third tier and this content stops being true.

   INHERITED, AND STILL BINDING. Every derived number is a `{{token}}`. No party
   token outside `annotations`. `skillCheck` is a badge of 24 characters. No
   quotation marks in `keyPhrases`. A claim his own files NAME but never DEFINE
   carries a `warning` — that is the pattern round one set for Sentinel,
   Interception and Graze, and this pack leans on all three.
   ========================================================================== */

export const HEARTH_7_R2: SeedPack = {
  id: 'hearth-7-r2',
  label: 'Load the round two plays',
  gate: {
    class: 'Paladin',
    subclass: 'Oath of the Hearth',
    minLevel: 5,
    maxLevel: 8,
  },

  combos: HEARTH_7_R2_COMBOS,
  tactics: HEARTH_7_R2_TACTICS,
  personaPlays: HEARTH_7_R2_PERSONA,
}
