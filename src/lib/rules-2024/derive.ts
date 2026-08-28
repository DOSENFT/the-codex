// ---------------------------------------------------------------------------
// Derived numbers — the one place a rule turns into a number
// ---------------------------------------------------------------------------
//
// SHEET TRUTH slice 1.
//
// THE LAW OF THIS FILE, and it is the opposite of `vitals.ts`'s law: this file
// CORRECTS. `vitals.ts` reports a disagreement and gets out of the way, because
// a stored armour class might encode a magic item the app cannot see. That
// argument does not hold for a spell save DC. A save DC is not a fact about
// Marcus's table, it is arithmetic on two numbers already on his sheet — and a
// stored copy of arithmetic is not a second opinion, it is a stale one.
//
// What was actually wrong: `spellSaveDC`, `spellAttackBonus` and
// `proficiencyBonus` were typed in once and remembered. Editing Charisma in
// Prep wrote `abilityScores` and nothing else, so every combat surface kept
// painting a DC computed from a Charisma he no longer had. The app even
// noticed — and printed the wrong number in larger type than the warning about
// it.
//
// WHY THE NAMES DO NOT CHANGE. `Character` keeps `spellSaveDC` as a plain
// `number`, so all ~200 existing reads keep compiling and simply start being
// right. That is not laziness: `turn/options.ts` is pinned BYTE-IDENTICAL to
// main by `overlay.test.ts` case 15 and prints `DC ${character.spellSaveDC}`
// directly. A nullable derived field would render "DC null" through a file
// nothing is allowed to edit. The fix therefore had to go in the PRODUCER, not
// in fourteen consumers — which is the better shape anyway.
//
// OPEN WORLD, unchanged from `lookup.ts`: canon has a table for Paladin and for
// nothing else. A class with no table keeps its stored table-only numbers and
// gets no invented ones. Silence means "I have nothing to add", never "you are
// wrong".

import { CASTING_ABILITY, type AbilityKey } from '../dnd-rules'
import { PROGRESSION_BY_CLASS } from '../../canon'
import type { CanonProgressionLevel } from '../canon/types'
// Type-only, so the cycle with character.ts is erased at compile time and there
// is no runtime edge — the same arrangement `resources.ts` uses, and for the
// same reason.
import type { Character } from '../character'

/** The four numbers that stop being stored. Named as a group because slice 3
 *  subtracts exactly this set from what reaches disk. */
export interface DerivedNumbers {
  proficiencyBonus: number
  spellSaveDC: number
  spellAttackBonus: number
  maxPreparedSpells: number
}

/** 2024 PHB, universal across every class: +2 at level 1, +1 every four levels.
 *
 *  THIS IS THE ONLY COPY. There were five, in four spellings — `vitals.ts:84`,
 *  `Settings.tsx:353`, `CharacterSetup.tsx:395`, canon's own `levels[]` rows,
 *  and the defaults in `character.ts`. They all agreed, and nothing whatsoever
 *  made them agree; `derive.test.ts` now checks this one against all twenty of
 *  canon's rows, so a disagreement is a red test instead of a wrong number at
 *  the table. */
export function proficiencyFor(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4)
}

/** Canon's row for a class at a level, or null when canon has no table for that
 *  class — or when the level is off the end of the one it has. Null is an
 *  answer here, not a failure. */
export function progressionRow(
  className: string,
  level: number,
): CanonProgressionLevel | null {
  const rows = PROGRESSION_BY_CLASS[className]
  if (!rows) return null
  return rows.find(r => r.level === level) ?? null
}

/** Which ability this class casts with, or null for a class that does not cast.
 *  A Fighter genuinely has no spell save DC and the app must not invent one. */
export function castingAbilityOf(char: {
  class: string
}): AbilityKey | null {
  return CASTING_ABILITY[char.class] ?? null
}

/** Standard D&D ability modifier. Duplicated from `character.ts:342` rather
 *  than imported, because importing a VALUE from character.ts would create a
 *  real runtime cycle — this file is imported by character.ts. Four characters
 *  of arithmetic, pinned by a test against character.ts's copy. */
function modifierOf(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Work out every derived number from the ability scores and the level.
 *
 *  THE ONE PRODUCER. Pure, and idempotent — `resolve(resolve(x))` equals
 *  `resolve(x)` — which is what lets it sit on both the read path and the write
 *  path without the two fighting.
 *
 *  Slice 1 derives the four numbers in `DerivedNumbers`. The paladin pools
 *  (Lay on Hands, Channel Divinity, aura range) join them in slice 4, where the
 *  clamp rule they need is built. */
export function resolveCharacter(char: Character): Character {
  const level = char.level
  const proficiencyBonus = proficiencyFor(level)
  const row = progressionRow(char.class, level)
  const casting = castingAbilityOf(char)

  // A class that does not cast keeps whatever is on its sheet. There is no
  // rule to apply, so applying one would be making something up.
  const mod = casting ? modifierOf(char.abilityScores[casting]) : null

  return {
    ...char,
    proficiencyBonus,
    spellSaveDC: mod === null ? char.spellSaveDC : 8 + proficiencyBonus + mod,
    spellAttackBonus: mod === null ? char.spellAttackBonus : proficiencyBonus + mod,
    // Canon's table or nothing. `?? char.maxPreparedSpells` is the open-world
    // fallback, not a default: it means "canon has no table for your class, so
    // your number stands".
    maxPreparedSpells: row?.preparedSpells ?? char.maxPreparedSpells,
    // Spell slots are deliberately NOT touched, at any level. Marcus's sheet
    // carries slots his level does not grant; that may be his DM or an item,
    // and deleting a resource he is playing with would be the app overruling
    // his table. `discrepancies()` keeps reporting them, forever, by design.
  }
}
