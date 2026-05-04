// ---------------------------------------------------------------------------
// Dice rolling utilities with cryptographically secure randomness
// ---------------------------------------------------------------------------

/* ─── Types ─── */

export type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100
export type AdvantageState = 'normal' | 'advantage' | 'disadvantage'

export interface RollResult {
  id: number
  dieType: DieType
  quantity: number
  modifier: number
  advantage: AdvantageState
  /** Individual die values (before advantage filtering) */
  rawDice: number[]
  /** Individual die values used in the total (after advantage filtering) */
  keptDice: number[]
  /** Dice that were dropped by advantage/disadvantage */
  droppedDice: number[]
  total: number
}

/* ─── Secure Random Die ─── */

/**
 * Generate a cryptographically secure random die roll using rejection sampling.
 *
 * For a die with N sides, we find the largest multiple of N that fits in a
 * 32-bit unsigned integer (0 to 2^32 - 1). If the random value is >= that
 * threshold, we reject and re-roll to avoid modular bias.
 *
 * Falls back to Math.random() if crypto.getRandomValues is unavailable.
 */
export function secureDie(sides: number): number {
  // Validate input
  if (sides < 1 || !Number.isInteger(sides)) {
    throw new Error(`secureDie: sides must be a positive integer, got ${sides}`)
  }

  // Fallback if crypto is unavailable
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    return Math.floor(Math.random() * sides) + 1
  }

  const maxUint32 = 0x100000000 // 2^32
  // Largest multiple of `sides` that fits in [0, 2^32)
  const threshold = maxUint32 - (maxUint32 % sides)

  const buffer = new Uint32Array(1)

  // Rejection sampling loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(buffer)
    const value = buffer[0]

    // Reject values >= threshold to avoid modular bias
    if (value < threshold) {
      return (value % sides) + 1
    }
    // If rejected, loop and try again (probability of rejection is < 1/sides,
    // so expected iterations is < 2 even for the worst case)
  }
}

/* ─── Roll Dice ─── */

/**
 * Roll dice with full D&D semantics: quantity, modifier, and advantage/disadvantage.
 *
 * When rolling a single d20 with advantage or disadvantage, two d20s are rolled
 * and the higher (advantage) or lower (disadvantage) is kept.
 */
export function rollDice(
  dieType: DieType,
  quantity: number,
  modifier: number,
  advantage: AdvantageState,
): Omit<RollResult, 'id'> {
  let rawDice: number[]
  let keptDice: number[]
  let droppedDice: number[] = []

  if (dieType === 20 && advantage !== 'normal' && quantity === 1) {
    // Roll 2d20, keep higher or lower
    const die1 = secureDie(20)
    const die2 = secureDie(20)
    rawDice = [die1, die2]

    if (advantage === 'advantage') {
      const kept = Math.max(die1, die2)
      const dropped = Math.min(die1, die2)
      keptDice = [kept]
      droppedDice = [dropped]
    } else {
      const kept = Math.min(die1, die2)
      const dropped = Math.max(die1, die2)
      keptDice = [kept]
      droppedDice = [dropped]
    }
  } else {
    rawDice = Array.from({ length: quantity }, () => secureDie(dieType))
    keptDice = rawDice
  }

  const diceSum = keptDice.reduce((sum, val) => sum + val, 0)

  return {
    dieType,
    quantity,
    modifier,
    advantage,
    rawDice,
    keptDice,
    droppedDice,
    total: diceSum + modifier,
  }
}

/* ─── Format Notation ─── */

/** Format a roll as "2d6+3" style notation */
export function formatRollNotation(quantity: number, dieType: DieType, modifier: number): string {
  let notation = `${quantity}d${dieType}`
  if (modifier > 0) notation += `+${modifier}`
  else if (modifier < 0) notation += `${modifier}`
  return notation
}
