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
import type { Character, CharacterBase } from '../character'

/** The four numbers that stop being stored. Named as a group because slice 3
 *  subtracts exactly this set from what reaches disk: `Character` is
 *  `CharacterBase & DerivedNumbers`, and `storableOf` is the subtraction. */
export interface DerivedNumbers {
  proficiencyBonus: number
  spellSaveDC: number
  spellAttackBonus: number
  maxPreparedSpells: number
}

/** The keys of `DerivedNumbers`, as values.
 *
 *  Written out rather than derived from the interface because TypeScript erases
 *  types and `storableOf` needs them at RUNTIME. A hand-maintained list the
 *  compiler does not check is exactly how five copies of the proficiency formula
 *  came to exist, so this one is checked in BOTH directions — see below. */
export const DERIVED_KEYS = [
  'proficiencyBonus',
  'spellSaveDC',
  'spellAttackBonus',
  'maxPreparedSpells',
] as const satisfies readonly (keyof DerivedNumbers)[]

/* SOUNDNESS (`satisfies`, above): nothing in the list is a key that does not
   exist. COMPLETENESS (here): no key of `DerivedNumbers` is missing from the
   list. `satisfies` alone gives only the first, and the dangerous direction is
   the second — a fifth derived number added to the interface and forgotten here
   would silently keep being written to disk, which is the entire fault this
   slice exists to make impossible. This line makes that a compile error. */
type MissingFromDerivedKeys = Exclude<keyof DerivedNumbers, (typeof DERIVED_KEYS)[number]>
const _everyDerivedKeyIsListed: MissingFromDerivedKeys extends never ? true : never = true
void _everyDerivedKeyIsListed

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
export function resolveCharacter(base: CharacterBase): Character {
  const level = base.level
  const proficiencyBonus = proficiencyFor(level)
  const row = progressionRow(base.class, level)
  const casting = castingAbilityOf(base)

  // A class that does not cast has no rule to apply, so applying one would be
  // making something up. `mod === null` is the open-world branch throughout.
  const mod = casting ? modifierOf(base.abilityScores[casting]) : null

  return {
    ...base,
    proficiencyBonus,
    /* THE OVERRIDE IS NOT A SECOND OPINION — it is the answer for a character
       the app has no rule for. When `mod` is null the app cannot compute a save
       DC at all, and before slice 3 that gap was filled by the stored field.
       The stored field is gone, so the gap needs somewhere to live, and it is
       named `…Override` so that no future reader mistakes it for the number.
       When the app CAN compute, the override is ignored outright rather than
       preferred — otherwise it is just the old stale copy under a new name, and
       Marcus's Charisma-18 bug walks straight back in. */
    spellSaveDC: mod === null ? (base.spellSaveDCOverride ?? 10) : 8 + proficiencyBonus + mod,
    spellAttackBonus: mod === null ? (base.spellAttackBonusOverride ?? 0) : proficiencyBonus + mod,
    // Canon's table or the override. `??` here is the open-world fallback, not a
    // default: it means "canon has no table for your class, so your number
    // stands". Paladin has a table; Cleric and Wizard do not, yet.
    maxPreparedSpells: row?.preparedSpells ?? base.maxPreparedSpellsOverride ?? 0,
    // Spell slots are deliberately NOT touched, at any level. Marcus's sheet
    // carries slots his level does not grant; that may be his DM or an item,
    // and deleting a resource he is playing with would be the app overruling
    // his table. `discrepancies()` keeps reporting them, forever, by design.
  }
}

/** The inverse of `resolveCharacter`: what actually goes to disk.
 *
 *  SLICE 3, and the whole of it. Slices 1 and 2 made the numbers right by
 *  overwriting the stored ones on the way in and on the way out. This makes them
 *  unable to go wrong, because after this there is no stored one to be stale —
 *  a saved sheet has no `spellSaveDC` key at all.
 *
 *  Deliberately key-driven rather than a destructuring rest, so that the set it
 *  removes is `DERIVED_KEYS` — the same list the compiler checks for
 *  completeness above — instead of four names repeated in a second place. */
export function storableOf(char: Character): CharacterBase {
  const base = { ...char } as Character & Partial<DerivedNumbers>
  for (const key of DERIVED_KEYS) delete base[key]
  return base as CharacterBase
}
