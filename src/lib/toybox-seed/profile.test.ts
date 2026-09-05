/* ============================================================================
   THE PROFILE — slice 2.

   The first test in this file is the reason the whole feature exists.
   `WARFARE-DOCTRINE.md` states an aura of +4 and a cloak of 11 temporary hit
   points, because it was written against Charisma 18. Marcus's Charisma is 16.
   Content built on the doctrine's numbers would be wrong on his sheet in the
   most expensive way: quietly, in prose, at the table.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { resolveCharacter } from '../rules-2024/derive'
import { abilityMod, buildProfile, primaryWeapon, weaponReach } from './profile'

/** Marcus, as the sheet actually reads: level 7, Charisma 16.
 *
 *  Rebuilt through `resolveCharacter` rather than spread over `NIX`, because
 *  `spellSaveDC` and `spellAttackBonus` are DERIVED — spreading a new Charisma
 *  over the fixture would leave the level-8 CHA-18 save DC attached to it, and
 *  the profile would report a number no rule produces. That stale-copy bug is
 *  the exact one `resolveCharacter` was built to make impossible; using it here
 *  is how this test gets to trust its own inputs. */
const marcus: Character = resolveCharacter({
  ...NIX,
  level: 7,
  abilityScores: { ...NIX.abilityScores, STR: 18, CHA: 16 },
})

describe('the number the doctrine gets wrong', () => {
  it('the aura is +3 at Charisma 16, not the doctrine’s +4', () => {
    expect(buildProfile(marcus).auraBonus).toBe(3)
  })

  it('the cloak is level + Charisma modifier — 10 for Marcus, 12 for the fixture', () => {
    expect(buildProfile(marcus).cloakTempHp).toBe(10)          // 7 + 3
    expect(buildProfile(NIX).cloakTempHp).toBe(12)             // 8 + 4
  })
})

describe('ability modifiers', () => {
  it('rounds down, through zero and below', () => {
    expect(abilityMod(18)).toBe(4)
    expect(abilityMod(16)).toBe(3)
    expect(abilityMod(11)).toBe(0)
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(9)).toBe(-1)
    expect(abilityMod(8)).toBe(-1)
  })

  it('floors the aura at +1 so a dumped Charisma still helps', () => {
    /* Without the floor, a CHA 8 paladin is handed content promising his party
       a PENALTY to their saving throws. Canon says +1 minimum; so does this. */
    const dumped = resolveCharacter({ ...NIX, abilityScores: { ...NIX.abilityScores, CHA: 8 } })
    expect(buildProfile(dumped).chaMod).toBe(-1)
    expect(buildProfile(dumped).auraBonus).toBe(1)
  })
})

describe('the aura radius', () => {
  it('is 10 feet, and 30 from level 18', () => {
    expect(buildProfile({ ...NIX, level: 7 }).auraRadius).toBe(10)
    expect(buildProfile({ ...NIX, level: 17 }).auraRadius).toBe(10)
    expect(buildProfile({ ...NIX, level: 18 }).auraRadius).toBe(30)
  })
})

describe('the weapon the content means', () => {
  it('prefers a magical melee weapon over a mundane one', () => {
    /* The fixture carries Hearthbrand (magical melee) and a Javelin (ranged).
       Note that this is NOT "The Dawn Guardian" — that is on Marcus's export,
       not on the shared fixture, and the fact that the two resolve differently
       is the templating working. */
    expect(primaryWeapon(NIX)?.name).toBe('Hearthbrand')
  })

  it('never picks a ranged weapon, even when it is the only one', () => {
    const archer = { ...NIX, weapons: NIX.weapons.filter(w => w.attackType === 'ranged') }
    expect(primaryWeapon(archer)).toBeNull()
    expect(buildProfile(archer).weaponName, 'and the profile says so, rather than guessing').toBeNull()
  })

  it('reports the primary weapon’s properties as a lowercased set — round two', () => {
    /* `weaponReach` already reads one property. `needs` reads them all, and it
       reads them to DROP content, so the shape has to be predictable: a set,
       lowercased, and never null. */
    const glaive = {
      ...NIX,
      weapons: NIX.weapons.map(w =>
        w.attackType === 'melee'
          ? { ...w, properties: ['Reach', 'Two-Handed', ' Heavy '] }
          : w),
    }
    const props = buildProfile(glaive).weaponProperties
    expect(props.has('reach')).toBe(true)
    expect(props.has('two-handed')).toBe(true)
    expect(props.has('heavy'), 'authors put stray spaces in pack data').toBe(true)
    expect(props.has('Reach'), 'the set is lowercase, so the lookup must be too').toBe(false)
  })

  it('reports an EMPTY set for a character with no melee weapon, never null', () => {
    /* So `meetsNeeds` can ask `has('reach')` without a null check, and an
       archer simply fails every weapon requirement instead of throwing. */
    const archer = { ...NIX, weapons: NIX.weapons.filter(w => w.attackType === 'ranged') }
    const props = buildProfile(archer).weaponProperties
    expect(props.size).toBe(0)
    expect(props.has('reach')).toBe(false)
  })

  it('reads reach from the property first, then the stated range, then five', () => {
    expect(weaponReach({ ...NIX.weapons[0], properties: ['Reach'], range: '5 ft' }), 'a data slip in `range` must not shorten a glaive').toBe(10)
    expect(weaponReach({ ...NIX.weapons[0], properties: [], range: '15 ft' })).toBe(15)
    expect(weaponReach({ ...NIX.weapons[0], properties: [], range: undefined })).toBe(5)
  })
})

describe('what else is on the sheet', () => {
  it('reports feats as a lowercased set, and reports an absence as an absence', () => {
    const feated = {
      ...NIX,
      feats: [
        { name: 'Sentinel', description: '', isHomebrew: false, effects: [] },
        { name: 'Lucky', description: '', isHomebrew: false, effects: [] },
      ],
    }
    const profile = buildProfile(feated)
    expect(profile.feats.has('sentinel')).toBe(true)
    expect(profile.feats.has('lucky')).toBe(true)
    expect(profile.feats.has('great weapon master')).toBe(false)
    expect(buildProfile(NIX).feats.size, 'the fixture has none').toBe(0)
  })

  it('reports no fighting style when none is recorded', () => {
    /* Marcus's sheet is in exactly this state until he presses the picker —
       which is why the Interception content has to survive its absence. */
    expect(buildProfile(NIX).fightingStyle).toBeNull()
  })

  it('carries the derived numbers rather than recomputing them', () => {
    expect(buildProfile(marcus).saveDC).toBe(marcus.spellSaveDC)
    expect(buildProfile(marcus).spellAttack).toBe(marcus.spellAttackBonus)
    expect(buildProfile(marcus).proficiency).toBe(marcus.proficiencyBonus)
  })
})
