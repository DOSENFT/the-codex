// ---------------------------------------------------------------------------
// Table vitals, and the places the sheet and the 2024 rules disagree
// ---------------------------------------------------------------------------
//
// Two jobs, deliberately in one file because they read the same fields:
//
//   tableVitals()   — the five numbers a turn is actually made of.
//   discrepancies() — every place the STORED sheet and the 2024 rule differ.
//
// THE LAW OF THIS FILE: it reports, it never corrects. Nothing here returns a
// "fixed" character and nothing here is allowed to. Marcus's sheet is the only
// copy of a character that has been played for months; a rules table is a
// generalisation that does not know about his DM, his magic items, or the
// homebrew oath he is carrying. When the two disagree the app's entire job is
// to say so clearly and then get out of the way.
//
// That is why `Discrepancy` has a `sheet` field and a `rule` field and NO
// `correct` field. There is nowhere to put the answer, because the app does not
// have it.
//
// OPEN-WORLD, same as lookup.ts: a class this file has no table for produces no
// discrepancy. Silence means "I have nothing to add", never "you are wrong".
//
// Table Truth slice 2.

import {
  abilityModifier,
  computeSpellSaveDC,
  computeSpellAttackBonus,
  type Character,
} from '../character'
import { FULL_CASTER_SLOTS, HALF_CASTER_SLOTS } from '../dnd-data'

/** The five numbers Marcus asked for by name, plus AC, which was already on the
 *  sheet but not on the Play tab. Every one of them is READ or DERIVED — none
 *  is stored by this module and none is written back. */
export interface TableVitals {
  /** STORED (`character.spellSaveDC`), not recomputed. If the stored value and
   *  the formula disagree that is a discrepancy to report, not a number to
   *  quietly swap at the table — he has been playing with this one. */
  saveDC: number
  spellAttack: number
  armorClass: number
  proficiency: number
  /** DERIVED from DEX every render; the app stores no initiative anywhere.
   *  Deliberately just the ability modifier: 2024 initiative can also carry
   *  feat and aura bonuses, and inventing a total the sheet cannot justify
   *  would be worse than showing the part we can prove. */
  initiativeMod: number
}

export function tableVitals(character: Character): TableVitals {
  return {
    saveDC: character.spellSaveDC,
    spellAttack: character.spellAttackBonus,
    armorClass: character.armorClass,
    proficiency: character.proficiencyBonus,
    initiativeMod: abilityModifier(character.abilityScores.DEX),
  }
}

/** Signed rendering, because a modifier without its sign is not a modifier.
 *  `+0` rather than `0` for the same reason — it reads as "checked and zero"
 *  instead of "not filled in". */
export function signed(n: number): string {
  return n < 0 ? `${n}` : `+${n}`
}

export type DiscrepancyId = 'spell-slots' | 'save-dc' | 'spell-attack' | 'proficiency'

export interface Discrepancy {
  id: DiscrepancyId
  /** Short heading. Names the subject, not the verdict. */
  title: string
  /** What the app shows today, straight off the stored sheet. */
  sheet: string
  /** What the 2024 rule produces for this class at this level. */
  rule: string
  /** The derivation, so the claim can be checked rather than believed. */
  why: string
}

/** 2024 PHB: +2 at level 1, and +1 at each of 5, 9, 13, 17. */
export function proficiencyForLevel(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4)
}

/* Which slot table a class uses.
 *
 * Warlock is ABSENT on purpose — Pact Magic is a different resource with its
 * own table, and comparing it against these would manufacture a disagreement
 * that does not exist. Artificer is absent for a subtler reason: it is a
 * half-caster that rounds UP at level 1, so HALF_CASTER_SLOTS is wrong for it
 * specifically. Anything not listed here simply gets no slot check. */
const SLOT_TABLE: Record<string, Record<number, Record<number, number>>> = {
  Paladin: HALF_CASTER_SLOTS,
  Ranger: HALF_CASTER_SLOTS,
  Bard: FULL_CASTER_SLOTS,
  Cleric: FULL_CASTER_SLOTS,
  Druid: FULL_CASTER_SLOTS,
  Sorcerer: FULL_CASTER_SLOTS,
  Wizard: FULL_CASTER_SLOTS,
}

function describeSlots(slots: Record<number, number>): string {
  const levels = Object.keys(slots)
    .map(Number)
    .filter(level => slots[level] > 0)
    .sort((a, b) => a - b)
  if (levels.length === 0) return 'no spell slots'
  return levels.map(level => `${ordinal(level)} ×${slots[level]}`).join(' · ')
}

function ordinal(n: number): string {
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

/** Every disagreement between the stored sheet and the 2024 rules, in the order
 *  they matter at a table. Empty means the two agree — which is worth showing
 *  too, because "checked, no problems" is information. */
export function discrepancies(character: Character): Discrepancy[] {
  const found: Discrepancy[] = []

  /* ── Spell slots ──────────────────────────────────────────────────────
     The one that started this. His stored sheet renders 3rd-level slots at
     level 7, where the half-caster table gives none until 9. Note that the
     table lives in dnd-data.ts and NOTHING in the app reads it — slots are
     persisted on the character and never recomputed, which is exactly how a
     wrong value survives a level-up. */
  const table = SLOT_TABLE[character.class]
  if (table) {
    const expected = table[character.level] ?? {}
    const stored: Record<number, number> = {}
    for (const [level, slot] of Object.entries(character.spellSlots)) {
      if (slot && slot.max > 0) stored[Number(level)] = slot.max
    }

    const levels = new Set([
      ...Object.keys(stored).map(Number),
      ...Object.keys(expected).map(Number),
    ])
    const differs = [...levels].some(level => (stored[level] ?? 0) !== (expected[level] ?? 0))

    if (differs) {
      found.push({
        id: 'spell-slots',
        title: 'Spell slots',
        sheet: describeSlots(stored),
        rule: describeSlots(expected),
        why:
          `A level ${character.level} ${character.class} is a ` +
          `${table === HALF_CASTER_SLOTS ? 'half-caster' : 'full caster'}. ` +
          `Feats, items or your DM can legitimately change this — the app has no way to know.`,
      })
    }
  }

  /* ── Proficiency bonus ────────────────────────────────────────────────
     Pure arithmetic off the level, with no legitimate exception in 2024. If
     this one ever fires, the level or the bonus was mistyped. */
  const expectedProf = proficiencyForLevel(character.level)
  if (character.proficiencyBonus !== expectedProf) {
    found.push({
      id: 'proficiency',
      title: 'Proficiency bonus',
      sheet: signed(character.proficiencyBonus),
      rule: signed(expectedProf),
      why: `+2 at level 1, +1 again at 5, 9, 13 and 17. At level ${character.level} that is ${signed(expectedProf)}.`,
    })
  }

  /* ── Save DC and spell attack ─────────────────────────────────────────
     Recomputed from the ability scores by helpers that already existed in
     character.ts and were only ever used at character-creation time. Both
     return the stored value unchanged for a class with no casting ability, so
     a non-caster can never trip this. */
  const expectedDC = computeSpellSaveDC(character)
  if (character.spellSaveDC !== expectedDC) {
    found.push({
      id: 'save-dc',
      title: 'Spell save DC',
      sheet: `${character.spellSaveDC}`,
      rule: `${expectedDC}`,
      why:
        `8 + proficiency (${signed(character.proficiencyBonus)}) + ` +
        `${character.spellcastingAbility || 'casting ability'} modifier.`,
    })
  }

  const expectedAtk = computeSpellAttackBonus(character)
  if (character.spellAttackBonus !== expectedAtk) {
    found.push({
      id: 'spell-attack',
      title: 'Spell attack bonus',
      sheet: signed(character.spellAttackBonus),
      rule: signed(expectedAtk),
      why:
        `Proficiency (${signed(character.proficiencyBonus)}) + ` +
        `${character.spellcastingAbility || 'casting ability'} modifier.`,
    })
  }

  return found
}
