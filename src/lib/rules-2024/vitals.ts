// ---------------------------------------------------------------------------
// Table vitals, and the places the sheet and the 2024 rules disagree
// ---------------------------------------------------------------------------
//
// Two jobs, deliberately in one file because they read the same fields:
//
//   tableVitals()   — the five numbers a turn is actually made of.
//   discrepancies() — every place the sheet and the 2024 rule differ.
//
// SHEET TRUTH slice 7 REVERSED THE PREMISE OF THIS FILE, and the comments below
// are corrected rather than quietly left to rot. When this was written the sheet
// STORED its save DC, spell attack and proficiency bonus, so all three could
// drift from the rules and this module's job was to notice. Slices 1–4 retired
// the stored copies: `resolveCharacter` now computes all three on the way out of
// storage, on Marcus's own Gate 1 ruling ("always compute; retire stored").
//
// Three of the four checks below therefore CANNOT FIRE for any character the app
// is able to produce, and `vitals.test.ts` §slice 7 sweeps thirteen classes ×
// twenty-three levels × ten ability lines to prove it rather than assert it.
//
// They are KEPT anyway, and that is a decision, not an oversight (Gate 3,
// least-confident #5). A `Character` that never went through `resolveCharacter`
// — a legacy blob, a hand-edited export, a future bug in a new import path — is
// exactly what this module was built to catch, and deleting the checks would
// mean the app's answer to that sheet is silence. Tests 15–18 hold them live
// against forged characters; test 19 holds the front door shut.
//
// SPELL SLOTS ARE THE ASYMMETRY, and the one case that still fires in normal
// use. `derive.ts:162` deliberately never touches them: Marcus's sheet carries
// slots his level does not grant, that may be his DM or an item, and deleting a
// resource he is playing with would be the app overruling his table. So slots
// stay stored, stay reported, forever.
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
import { proficiencyFor } from './derive'

/** The five numbers Marcus asked for by name, plus AC, which was already on the
 *  sheet but not on the Play tab. Every one of them is READ or DERIVED — none
 *  is stored by this module and none is written back. */
export interface TableVitals {
  /** Read straight off `character.spellSaveDC` — which, since slice 3, IS the
   *  computed number. This field used to carry a note saying the stored value
   *  was deliberately preferred to the formula because "he has been playing with
   *  this one"; that reasoning is now history. Marcus's Gate 1 answer overruled
   *  it after the sheet spent months telling him his Charisma was 18.
   *
   *  The pass-through stays a pass-through on purpose: recomputing here would
   *  make this file a SECOND place the DC is worked out, and two copies of one
   *  formula is the bug this whole phase existed to kill. */
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

/** 2024 PHB: +2 at level 1, and +1 at each of 5, 9, 13, 17.
 *
 *  SHEET TRUTH slice 3, and a correction to slice 1. `derive.ts` claims in its
 *  own comments to hold "THE ONLY COPY" of this formula, and names this function
 *  as one of the five it replaced. It did not replace it — this body was still
 *  here, and it was found by the source scan in `storable.test.ts`, not by
 *  reading. A comment asserting an invariant is not the invariant; the scan is.
 *
 *  The two copies had already drifted. This one clamped the bottom (`Math.max(1,
 *  level)`) and not the top; `proficiencyFor` clamps both. A level-24 character —
 *  which nothing prevents, since `level` is a free number on the sheet — got +7
 *  from this function and +6 from the other, so the discrepancy reporter would
 *  have accused the sheet of being wrong using a number the app itself no longer
 *  agreed with. Kept as a named export rather than deleted because it is what
 *  this module means by the rule, and `vitals.test.ts` pins it at all twenty
 *  levels; it simply no longer knows how to work it out. */
export function proficiencyForLevel(level: number): number {
  return proficiencyFor(level)
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
     Pure arithmetic off the level, with no legitimate exception in 2024.

     SLICE 7: UNREACHABLE THROUGH THE APP'S OWN DOOR. `resolveCharacter` sets
     `proficiencyBonus = proficiencyFor(level)`, and `proficiencyForLevel` below
     IS `proficiencyFor` — the same function, since slice 3 collapsed the two
     copies that had already drifted at level 24. Comparing a value against the
     function that produced it can only ever be equal. Kept because a forged or
     legacy sheet is still a sheet, and test 19 proves the door rather than
     trusting this comment (finding BJ: a comment asserting an invariant is not
     the invariant). */
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
     Recomputed from the ability scores. Both return the stored value unchanged
     for a class with no casting ability, so a non-caster can never trip this.

     SLICE 7: UNREACHABLE THROUGH THE APP'S OWN DOOR, for a sharper reason than
     the proficiency check above. `computeSpellSaveDC` is now literally
     `resolveCharacter(char).spellSaveDC` (character.ts:439) — so this line asks
     a resolved character whether resolving it again would move it. It would not:
     `resolveCharacter` reads level, class and ability scores, and writing its
     output back changes none of those. That idempotence IS the unreachability,
     and test 20 pins it directly instead of inferring it from this paragraph.

     THIS IS THE CHECK MARCUS'S BUG WOULD HAVE TRIPPED. His sheet said 18 and his
     Charisma was 16; the DC on his Play tab was 15 when it should have been 14.
     The reporter would have said so — but a report is not a fix, and he had been
     reading a wrong number for months with the report right there. Slice 3 made
     the drift impossible instead. Keeping the check costs one comparison and
     covers the sheets that never came through the front door. */
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
