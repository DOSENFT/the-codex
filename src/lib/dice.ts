// ---------------------------------------------------------------------------
// Dice vocabulary. Deliberately no randomness.
//
// This file used to hold `secureDie` — a crypto.getRandomValues rejection
// sampler — and `rollDice`, which gave it D&D semantics. Both are gone, along
// with `RollResult`, `DiceStage.tsx`, `DiceAnimation.tsx` and three.js.
//
// The reason is not that they were wrong. `secureDie` was careful code that
// correctly avoided modular bias. The reason is that Marcus rolls physical
// dice, every time, and an app that also rolls is an app competing with the
// table instead of serving it. The randomness was never the hard part; the
// arithmetic under a clock is. See `RollCapture.tsx`, which now takes the
// number his dice showed and adds the bonus the sheet already knows.
//
// What survives is the vocabulary — the die types, the advantage states, and
// the notation formatter — because naming what to roll is still the app's job.
// ---------------------------------------------------------------------------

export type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100
export type AdvantageState = 'normal' | 'advantage' | 'disadvantage'

/** Format a roll as "2d6+3" style notation */
export function formatRollNotation(quantity: number, dieType: DieType, modifier: number): string {
  let notation = `${quantity}d${dieType}`
  if (modifier > 0) notation += `+${modifier}`
  else if (modifier < 0) notation += `${modifier}`
  return notation
}
