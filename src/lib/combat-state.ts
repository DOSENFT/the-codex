import type { Character, ClassFeature } from './character'
import { saveOrAnnounce } from './character'

// ---------------------------------------------------------------------------
// Action Economy Types & Helpers
// ---------------------------------------------------------------------------

export type ActionEconomyType = 'action' | 'bonusAction' | 'reaction'

/** Parse a spell's castingTime string into an ActionEconomyType. */
export function spellActionType(castingTime: string): ActionEconomyType {
  const lower = castingTime.toLowerCase()
  if (lower.includes('bonus')) return 'bonusAction'
  if (lower.includes('reaction')) return 'reaction'
  return 'action'
}

/** Determine the ActionEconomyType for a class feature. Defaults to 'action'. */
export function featureActionType(feature: ClassFeature): ActionEconomyType {
  if (feature.actionType === 'bonusAction') return 'bonusAction'
  if (feature.actionType === 'reaction') return 'reaction'
  if (feature.actionType === 'none' || feature.actionType === 'passive') return 'action' // passive/none features show under action
  return 'action'
}

// ---------------------------------------------------------------------------
// Initiative Tracker
// ---------------------------------------------------------------------------

export interface InitiativeEntry {
  id: string
  name: string
  initiative: number
  hp?: string
  ac?: number
  isPC: boolean
}

// ---------------------------------------------------------------------------
// Combat State — turn-level action economy & resource tracking
// ---------------------------------------------------------------------------

export interface CombatState {
  inCombat: boolean
  round: number
  turnActions: { action: boolean; bonusAction: boolean; reaction: boolean; movement: boolean }
  spellSlots: Record<number, { used: number; max: number }>
  concentrating: string | null
  /** Is it MY turn right now?  Slice 7.
   *
   *  Until Slice 7 the app had no answer to this question, and so it had no
   *  place to put a reaction: every reaction-slot option was ranked to the
   *  bottom of the list with the note "Not on your turn" and could never be
   *  taken, on any turn, ever. An opportunity attack — the single most common
   *  thing a melee character does off-turn — was documented in `dnd-data.ts`
   *  and implemented nowhere.
   *
   *  OPTIONAL ON PURPOSE. Marcus's live combat state is in his browser's
   *  localStorage and predates this field; `reconcile` reads a missing value
   *  as `true`, which is exactly the behaviour he has today. Nothing he has
   *  saved changes meaning. */
  yourTurn?: boolean
  /** Retaliation damage recorded THIS ENCOUNTER.  Slice 10f (HEARTH-05).
   *
   *  The one number in this app that is captured rather than computed — a d10
   *  came up 7, and nothing on Nix's sheet implies 7. Canon's `appAction` asks
   *  for it in as many words: "display the total retaliation damage dealt per
   *  encounter so the DM can see the real numbers."
   *
   *  WHY IT LIVES HERE AND NOT IN THE LOG. Summing it out of the event log is
   *  the obvious implementation and it is wrong quietly: `LOG_DEPTH` is 25 and
   *  the log truncates, so in a long fight the earliest retaliations fall off
   *  the end and the DM's total would SHRINK as the fight went on — while
   *  looking exactly as authoritative as a correct one. `CombatState` is never
   *  truncated. The log still carries each event, for undo.
   *
   *  PER ENCOUNTER is enforced in `turn/reduce.ts`, which clears it on BOTH
   *  `startCombat` and `endCombat` — not here. This file's `endCombat` rebuilds
   *  from `createCombatState` and so drops it for free, but the reducer's does
   *  not (it spreads the prior state to keep concentration), and the reducer is
   *  the path every real tap takes.
   *
   *  OPTIONAL ON PURPOSE, same as `yourTurn` and for the same reason, but with
   *  less riding on it: absent means nothing has been recorded, which is
   *  exactly zero. `retaliation.ts`'s `tallyOf` reads absent as `{0, 0}`, so
   *  `reconcile` needs no branch and Marcus's stored `codex-combat-*` keys do
   *  not change meaning. */
  retaliation?: { total: number; hits: number }
}

const STORAGE_PREFIX = 'codex-combat-'

/** Create a fresh (out-of-combat) state from a character's current spell slots. */
export function createCombatState(character: Character): CombatState {
  const spellSlots: Record<number, { used: number; max: number }> = {}
  for (const [level, slot] of Object.entries(character.spellSlots)) {
    spellSlots[Number(level)] = { used: 0, max: slot.max }
  }
  return {
    inCombat: false,
    round: 1,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    spellSlots,
    concentrating: null,
    yourTurn: true,
  }
}

/** Transition into combat — resets turn actions, keeps spell-slot snapshot. */
export function startCombat(character: Character): CombatState {
  return { ...createCombatState(character), inCombat: true }
}

/** End combat — returns a clean, out-of-combat state. */
export function endCombat(character: Character): CombatState {
  return createCombatState(character)
}

/** Advance to the next turn — increments round, resets turn actions. */
export function nextTurn(state: CombatState): CombatState {
  return {
    ...state,
    round: state.round + 1,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  }
}

/** Mark a specific action type as used this turn. */
export function useAction(state: CombatState, type: keyof CombatState['turnActions']): CombatState {
  return {
    ...state,
    turnActions: { ...state.turnActions, [type]: true },
  }
}

/** Consume one spell slot of the given level. No-op if none remain. */
export function useSlot(state: CombatState, level: number): CombatState {
  const slot = state.spellSlots[level]
  if (!slot || slot.used >= slot.max) return state
  return {
    ...state,
    spellSlots: {
      ...state.spellSlots,
      [level]: { ...slot, used: slot.used + 1 },
    },
  }
}

/** Set (or clear) the concentration spell. Pass null to drop concentration. */
export function setConcentration(state: CombatState, spellName: string | null): CombatState {
  return { ...state, concentrating: spellName }
}

// ---------------------------------------------------------------------------
// Persistence helpers (localStorage)
// ---------------------------------------------------------------------------

/* Guarded, because this is the write behind `Start Combat` and behind every
   `Action` / `Bonus` / `Reaction` tap. Unguarded it threw straight through the
   React tree and took `play/Combat` down to its error boundary — see the note
   on `saveOrAnnounce` in `character.ts`. The alarm now stands and the encounter
   keeps running on the state already in memory. */
export function saveCombatState(characterId: string, state: CombatState): void {
  saveOrAnnounce(STORAGE_PREFIX + characterId, JSON.stringify(state))
}

export function loadCombatState(characterId: string): CombatState | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + characterId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CombatState
  } catch {
    return null
  }
}

export function clearCombatState(characterId: string): void {
  localStorage.removeItem(STORAGE_PREFIX + characterId)
}
