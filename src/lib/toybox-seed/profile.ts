import type { Character, Weapon } from '../character'
import { currentFightingStyle } from '../prepare/fighting-style'
import { resolveParty, type PartyRole } from './party'

/* ==========================================================================
   THE PROFILE — every number the content is allowed to speak

   THIS IS THE ONLY PLACE A RULE NUMBER IS WORKED OUT FOR SEEDED CONTENT, and
   that is the whole point. `WARFARE-DOCTRINE.md` was written against Charisma
   18 and states an aura of +4 and a cloak of 11 temporary hit points. Marcus's
   Charisma is 16. Every one of those numbers is wrong for his character, and
   they are wrong in the most expensive way — quietly, in prose, at the table.

   Content therefore never writes a number. It writes `{{auraBonus}}`, and this
   file answers. The consequence is that the same pack is correct at level 7
   and at level 8, at Charisma 16 and at 18, and the test that proves it is
   simply "resolve the pack twice, for two different sheets, and require the
   numbers to differ."
   ========================================================================== */

export interface SeedProfile {
  level: number
  proficiency: number
  strMod: number
  chaMod: number
  /** Aura of Protection: the Charisma modifier, floored at +1 by canon. */
  auraBonus: number
  /** 10 feet, and 30 from level 18. */
  auraRadius: number
  /** Hearthfire's cloak: paladin level + spellcasting modifier. */
  cloakTempHp: number
  saveDC: number
  spellAttack: number
  weaponName: string | null
  weaponDice: string | null
  weaponReach: number | null
  fightingStyle: string | null
  /** Lowercased feat names, so a lookup is `feats.has('sentinel')`. */
  feats: Set<string>
  party: Partial<Record<PartyRole, string>>
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** The weapon the content means when it says "your weapon".
 *
 *  A magical melee weapon first, then any melee weapon, then nothing. Nothing
 *  is a real answer: a character with only a bow gets no weapon tokens, and
 *  every combo that names a weapon is dropped rather than told to swing a bow
 *  in melee. Ranged weapons are deliberately never chosen — this pack is
 *  written for a paladin standing in the way of something. */
export function primaryWeapon(character: Character): Weapon | null {
  const melee = (character.weapons ?? []).filter(w => w.attackType === 'melee')
  return melee.find(w => w.magical) ?? melee[0] ?? null
}

/** Reach in feet: the property first, then the stated range, then 5.
 *
 *  The property wins over `range` because a Reach weapon whose range field
 *  still says "5 ft" is a data entry slip, not a five-foot glaive, and the
 *  positioning advice that hangs off this number is wrong at 5. */
export function weaponReach(weapon: Weapon): number {
  if (weapon.properties?.some(p => /reach/i.test(p))) return 10
  const stated = /(\d+)\s*ft/i.exec(weapon.range ?? '')
  return stated ? Number(stated[1]) : 5
}

export function buildProfile(character: Character): SeedProfile {
  const chaMod = abilityMod(character.abilityScores.CHA)
  const weapon = primaryWeapon(character)
  const style = currentFightingStyle(character)

  return {
    level: character.level,
    proficiency: character.proficiencyBonus,
    strMod: abilityMod(character.abilityScores.STR),
    chaMod,
    // Canon floors the aura at +1, so a paladin who dumped Charisma still
    // helps. Without the floor a CHA 8 paladin would be handed content
    // promising his party a penalty to their saving throws.
    auraBonus: Math.max(1, chaMod),
    auraRadius: character.level >= 18 ? 30 : 10,
    cloakTempHp: character.level + chaMod,
    saveDC: character.spellSaveDC,
    spellAttack: character.spellAttackBonus,
    weaponName: weapon?.name ?? null,
    weaponDice: weapon?.damageDice ?? null,
    weaponReach: weapon ? weaponReach(weapon) : null,
    fightingStyle: style?.name ?? null,
    feats: new Set((character.feats ?? []).map(f => f.name.trim().toLowerCase())),
    party: resolveParty(character),
  }
}
