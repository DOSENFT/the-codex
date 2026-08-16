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

import type { PaladinResources, SpellSlots } from '../character'
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
}

export type CombatEvent =
  | { type: 'takeOption'; option: TakenOption }
  | { type: 'endTurn' }
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
  paladinResources?: PaladinResources
  /** Feature name → prior `usesCurrent`.
   *
   *  Always a number, and that is an invariant rather than an accident: the
   *  reducer only ever spends from a pool whose counter is FULLY declared
   *  (`usesMax` and `usesCurrent` both present), matching how GrimoireCard and
   *  LoadoutPanel already decide what is trackable. A half-declared counter is
   *  untracked, so it is never charged, so there is never an absent value to
   *  restore. This field carried `| null` for that case until the tests showed
   *  the case cannot arise — an untestable safety net is not a safety net. */
  featureUses?: Record<string, number>
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
