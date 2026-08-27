// The combat event log — a persisted wire format
//
// ⚠️ EVERYTHING IN THIS FILE IS WRITTEN TO localStorage AND READ BACK LATER,
// possibly by a build that did not write it. Marcus's iPad will suspend the
// tab mid-encounter and restore it an hour later; a Safari update will drop
// the app back to a cold boot in the middle of round nine. So:
//
//   · Every shape here must be JSON-safe. No Dates, no Maps, no functions.
//   · Adding an optional field is safe. Renaming or repurposing one is not.
//   · A reader must survive an entry whose `type` it does not recognise —
//     see `reduce.ts`, which refuses unknown events rather than throwing.
//
// WHY A SNAPSHOT LOG AND NOT INVERSE EVENTS
//
// The tidy design is a log of events, each of which knows how to invert
// itself: spend a slot, undo by restoring one. It is tidy right up until a
// clamp. Healing above maximum, damage below zero, spending the last use of a
// pool that was already empty — every clamp silently destroys the information
// the inverse needed, and the bug does not show up until the one turn Marcus
// actually needs Undo.
//
// So each entry carries the ABSOLUTE prior values of everything its event
// touched. Undo is not a computation; it is a restoration. That makes the
// central property mechanically provable — apply any event to any state, then
// revert, and you are byte-for-byte where you started — and reduce.test.ts
// proves exactly that over every variant.

import type { SpellSlots } from '../character'
import type { CombatState } from '../combat-state'
import type { EconomySlot, SlotSpendRecord } from '../rules-2024/economy'

/** An option as it was TAKEN: a flat, self-contained record of what it cost.
 *
 *  Deliberately not a `TurnOption`. The log outlives the list it came from —
 *  Marcus can level up, re-prepare his spells or edit his homebrew between
 *  taking an action and undoing it, and an entry that pointed at a live option
 *  object would undo the wrong thing or nothing at all. */
export interface TakenOption {
  id: string
  /** For the undo affordance: "Undo — Divine Smite". */
  name: string
  slot: EconomySlot
  spellSlotLevel?: number
  resourcePoolId?: string
  resourceAmount?: number
  /** The spell name to hold concentration on, when taking this starts it. */
  concentration?: string
  /** Temporary hit points taking this grants, already resolved for the
   *  character who took it. Copied off the option at take-time for the same
   *  reason every other field here is: the log outlives the option list, and by
   *  the time Marcus presses Undo his level — and so the size of the pool — may
   *  have changed. Table Truth slice 10d. */
  grantsTempHP?: number
}

export type CombatEvent =
  | { type: 'takeOption'; option: TakenOption }
  | { type: 'endTurn' }
  /** Slice 7. My turn comes round again — the moment my Reaction returns.
   *
   *  Split out of `endTurn` because 2024 refreshes the reaction at the START
   *  of your turn, not at the end of it. A reaction spent on the rogue's turn
   *  must still be spent while the ogre swings, which is precisely the moment
   *  you would reach for it a second time and the app has to say no. */
  | { type: 'beginTurn' }
  | { type: 'startCombat' }
  | { type: 'endCombat' }

/** Absolute prior values for everything one event touched.
 *
 *  Only the keys an event actually changed are present, EXCEPT `combat`, which
 *  is always captured whole: it is five small fields, and a partial snapshot of
 *  it would be a permanent invitation to forget one. */
export interface Restore {
  combat: CombatState
  spellSlots?: SpellSlots
  /** Pool id → prior `current`, for every pool the event charged.
   *
   *  ── Why this replaced two fields ─────────────────────────────────────────
   *  Slice 6 carried `paladinResources` (a whole-object snapshot) and
   *  `featureUses` (feature name → number) side by side, because those were
   *  the only two places a countable thing could live. Slice 6b added a third,
   *  `character.resourcePools`, and a third bespoke restore field would have
   *  made Undo's correctness a function of how many KINDS of pool exist. It is
   *  now a function of one loop.
   *
   *  The key is a POOL ID from `./ids.ts`, not a feature name. Ids are already
   *  the currency `compose` prices in and `reduce` pays in, so this deletes the
   *  last place those two agreed by convention rather than by type.
   *
   *  ── Why replacing was safe, given the warning at the top of this file ────
   *  This is a persisted format, so a rename would normally demand a migration.
   *  Not here: the turn screen has only ever existed behind `?d=1` on branch
   *  `v1`, no build carrying it has reached `main`, and so no
   *  `codex-combat-log-*` value holding the old shape exists in Marcus's
   *  browser. `loadLog` filters rather than throws, so even a stray entry from
   *  a dev session degrades to "that one entry cannot be undone" instead of
   *  taking the log down with it. The window for this change closes the moment
   *  `v1` merges; after that, the rule at the top of the file resumes.
   *
   *  Always a number, and that is an invariant rather than an accident: the
   *  reducer only ever spends from a pool whose counter is FULLY declared
   *  (`usesMax` and `usesCurrent` both present), matching how GrimoireCard and
   *  LoadoutPanel already decide what is trackable. A half-declared counter is
   *  untracked, so it is never charged, so there is never an absent value to
   *  restore. This field carried `| null` for that case until the tests showed
   *  the case cannot arise — an untestable safety net is not a safety net. */
  pools?: Record<string, number>

  /** The temp HP pool as it stood BEFORE the event granted one, present only on
   *  events that granted.
   *
   *  Both halves, always together. Restoring the amount without the label would
   *  leave an 11-point pool named after the feature that just got undone, which
   *  is exactly the drift that keeping the label beside the number was meant to
   *  prevent — and `{ amount: 0, source: null }` is a real, common value here
   *  (you usually had no pool at all), so this cannot be optional-per-half.
   *
   *  Note the asymmetry with `pools`: that one restores something the event
   *  SPENT, this one un-grants something the event GAVE. Undo has to reverse
   *  both directions, and slice 10d is the first event in the app's history that
   *  moves a character stat forwards rather than only paying for it. */
  tempHP?: { amount: number; source: string | null }
}

/** One entry in the log.
 *
 *  Extends `SlotSpendRecord` on purpose: `rules-2024/economy.ts` already knows
 *  how to answer "has a spell slot been spent this turn" from a list of these,
 *  and `composeTurn` already accepts one. This is the seam those two were
 *  built against, and this slice is where it closes — the one-spell-slot-per-
 *  turn rule stops being inert the moment real entries start arriving. */
export interface LogEntry extends SlotSpendRecord {
  event: CombatEvent
  restore: Restore
  /** What to call this when offering to undo it. */
  label: string
  /** The round the event happened in.  Inherited from SlotSpendRecord, and
   *  redeclared here because the one-slot rule depends on it being right. */
  round: number
  /** Set only when the event expended a slot.  The one-slot rule reads this. */
  spellSlotLevel?: number
}

/** How many events are kept. Undo is a safety net for the last thing you did,
 *  not a session replay — and the log rides in localStorage next to the
 *  character, so it does not get to grow without limit. */
export const LOG_DEPTH = 25

export const logStorageKey = (characterId: string) => `codex-combat-log-${characterId}`
