import type { Character } from './character'

// ---------------------------------------------------------------------------
// Combat State — turn-level action economy & resource tracking
// ---------------------------------------------------------------------------

export interface CombatState {
  inCombat: boolean
  round: number
  turnActions: { action: boolean; bonusAction: boolean; reaction: boolean; movement: boolean }
  spellSlots: Record<number, { used: number; max: number }>
  concentrating: string | null
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

export function saveCombatState(characterId: string, state: CombatState): void {
  localStorage.setItem(STORAGE_PREFIX + characterId, JSON.stringify(state))
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
