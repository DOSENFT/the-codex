// ---------------------------------------------------------------------------
// Adopting a rule the report named
// ---------------------------------------------------------------------------
//
// `vitals.ts` finds the places the stored sheet and the 2024 rules disagree, and
// its stated law is that it reports and never corrects. That law is right, and
// this module does not weaken it: the reason the reporter cannot correct is that
// it does not know which side is true for Marcus's table, and this module does
// not know either. It knows only what the rule says and how to write it down.
//
// THE MISSING PIECE WAS NOT A CORRECTION, IT WAS A DOOR. Before this, the flag
// read "Your sheet and the 2024 rules disagree" and then "Nothing has been
// changed… that is yours and your DM's call" — a call he was given no way to
// make. So the flag reopened on every load, forever, by design
// (`VitalsBand.tsx:41`), and the only way to act on it was to hand-edit JSON.
// A permanent notice you cannot answer stops being information and becomes
// furniture; he reported the level-3 slots as "confusing and taking up screen
// space", which is what furniture looks like from the player's chair.
//
// So: the app still does not decide. He decides, once, with a press, and the
// sheet keeps the answer. Nothing here runs on load, on import, on level-up, or
// from any code path that is not a person pressing a labelled button.
//
// WHY IT RETURNS A DESCRIPTOR AND NOT A CHARACTER. The caller must be able to
// show what the press will do BEFORE it happens — `from`, `to`, and a label —
// otherwise the button is "trust me" and the player is back to not owning the
// understanding. `next` is the sheet as it would be, computed up front; pressing
// is just handing it back.
//
// OPEN-WORLD, inherited from `vitals.ts` and `lookup.ts`: a class with no table
// yields `null`. A sheet that already matches yields `null`. Null means "I have
// nothing to add", never "you are wrong", and the caller renders no door at all.
//
// Marcus's ruling, 2026-08-28: "The level 3 spell slots should only appear in
// app when i reach a level that unlocks them."

import type { Character, SpellSlots } from '../character'
import { SLOT_TABLE, describeSlots } from './vitals'

/** A change the player can read before agreeing to it. */
export interface Adoption {
  /** The press, in words. Names what moves, not "fix" or "correct" — the sheet
   *  was never established to be wrong, only different from the general rule. */
  label: string
  /** The sheet as it stands, in the same phrasing the flag already used. */
  from: string
  /** The sheet as it would be. */
  to: string
  /** That sheet, built. Never the same reference as the input, because an
   *  `Adoption` that changes nothing is a `null` instead of an object. */
  next: Character
}

/** What the class/level slot table would make of this sheet, or `null` when
 *  there is nothing to offer — no table for the class, or no disagreement.
 *
 *  CURRENT IS CLAMPED, NEVER RAISED. If the table grants fewer slots than the
 *  sheet has spent down to, `current` follows `max` down; if it grants more,
 *  `current` stays where it is. Handing him back expended slots would be the app
 *  inventing a rest he did not take, and a wrong resource in the generous
 *  direction is still a wrong resource at the table.
 *
 *  LEVELS THE TABLE DOES NOT GRANT ARE DELETED, not zeroed. `describeSlots`
 *  already declines to mention a zero, but a `{ max: 0, current: 0 }` left on
 *  the sheet is a key every other reader of `spellSlots` has to remember to skip
 *  — and the whole complaint was that an empty row was taking up space. */
export function slotAdoption(character: Character): Adoption | null {
  const table = SLOT_TABLE[character.class]
  if (!table) return null

  /* A LEVEL THE TABLE DOES NOT COVER IS A SILENCE, NOT AN EMPTY TABLE. `level`
     is a free number on the sheet — nothing in the app prevents 24, and
     `vitals.ts:122` records that it has already been bitten by exactly that.
     Reading a missing row as `{}` makes "the table has no opinion" and "the
     table grants nothing" the same value, and here the two could not be further
     apart: the second one deletes every slot he owns. Caught by the level-30
     test, which was written expecting silence and got an offer to empty the
     sheet. */
  const expected = table[character.level]
  if (!expected) return null

  const stored: Record<number, number> = {}
  for (const [level, slot] of Object.entries(character.spellSlots)) {
    if (slot && slot.max > 0) stored[Number(level)] = slot.max
  }

  const levels = new Set([...Object.keys(stored).map(Number), ...Object.keys(expected).map(Number)])
  const differs = [...levels].some(level => (stored[level] ?? 0) !== (expected[level] ?? 0))
  if (!differs) return null

  const nextSlots: SpellSlots = {}
  for (const [levelKey, max] of Object.entries(expected)) {
    if (max <= 0) continue
    const level = Number(levelKey)
    const held = character.spellSlots[level]
    nextSlots[level] = { max, current: Math.min(held?.current ?? max, max) }
  }

  return {
    label: 'Use the 2024 slots',
    from: describeSlots(stored),
    to: describeSlots(expected),
    next: { ...character, spellSlots: nextSlots },
  }
}
