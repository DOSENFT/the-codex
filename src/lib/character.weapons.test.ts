import { describe, it, expect } from 'vitest'
import { upsertWeapon, attackBonus, type Character, type Weapon } from './character'
import { NIX } from './turn/fixtures/nix'

/* ===========================================================================
   A WEAPON EDIT MUST CHANGE THE WEAPON, NOT MAKE A SECOND ONE.

   `CharacterPage` could add a weapon and delete a weapon and never edit one.
   `editingWeapon` was typed `number | null` for an index the whole time, and
   nothing ever set it to an index — so the form appended unconditionally.

   Marcus found this from the far end. His Dawn Guardian glaive is a +1 weapon
   and the sheet did not know it, so every attack he read off the Combat tab was
   one low: "+7 to hit" where the rules say +8, "1d10+4" where they say 1d10+5.
   The mechanics for it already existed — `attackBonus` has read `bonusToHit`
   all along. What did not exist was any way to type the number in.

   THAT IS WHY THESE ARE THE TESTS. Silently-low numbers look exactly like
   correct numbers at a table, so the first case asserts the arithmetic actually
   moves, and not merely that a field round-tripped.
   ========================================================================= */

const GLAIVE: Weapon = {
  name: 'The Dawn Guardian',
  attackType: 'melee',
  abilityMod: 'STR',
  proficient: true,
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach'],
  magical: true,
  masteryProperty: 'Graze',
}

/** NIX carries two weapons; `upsertWeapon` addresses them by position. */
function armed(...weapons: Weapon[]): Character {
  return { ...NIX, weapons }
}

describe('upsertWeapon', () => {
  it('replaces the weapon at the slot instead of appending a second one', () => {
    const char = armed(GLAIVE, { ...GLAIVE, name: 'Javelin' })
    const next = upsertWeapon(char, 0, { ...GLAIVE, bonusToHit: 1, bonusDamage: 1 })

    /* THE ASSERTION THAT FAILS AGAINST THE OLD CODE. The append built a
       three-weapon list with the stale Dawn Guardian still at index 0. */
    expect(next.weapons).toHaveLength(2)
    expect(next.weapons[0]!.bonusToHit).toBe(1)
    expect(next.weapons.filter(w => w.name === 'The Dawn Guardian')).toHaveLength(1)
  })

  it('leaves every other weapon untouched', () => {
    const javelin = { ...GLAIVE, name: 'Javelin', damageDice: '1d6' }
    const next = upsertWeapon(armed(GLAIVE, javelin), 0, { ...GLAIVE, bonusDamage: 1 })
    expect(next.weapons[1]).toEqual(javelin)
  })

  it('appends for the -1 slot, which is what the new-weapon form passes', () => {
    const next = upsertWeapon(armed(GLAIVE), -1, { ...GLAIVE, name: 'Javelin' })
    expect(next.weapons.map(w => w.name)).toEqual(['The Dawn Guardian', 'Javelin'])
  })

  it('appends rather than throwing when the slot is past the end', () => {
    /* A weapon deleted in another tab while the form was open. Keeping his
       typing beats losing it; see the note on the function. */
    const next = upsertWeapon(armed(GLAIVE), 7, { ...GLAIVE, name: 'Javelin' })
    expect(next.weapons).toHaveLength(2)
    expect(next.weapons[1]!.name).toBe('Javelin')
  })

  it('carries a rename through, which a name-keyed update could not', () => {
    /* `updateSpell` matches on the old name. Had weapons copied that shape,
       renaming "Glaive" to "The Dawn Guardian" would have matched nothing and
       changed nothing — a save button that does nothing, again. */
    const next = upsertWeapon(armed({ ...GLAIVE, name: 'Glaive' }), 0, GLAIVE)
    expect(next.weapons.map(w => w.name)).toEqual(['The Dawn Guardian'])
  })

  it('does not mutate the character it was given', () => {
    const char = armed(GLAIVE)
    upsertWeapon(char, 0, { ...GLAIVE, bonusToHit: 1 })
    expect(char.weapons[0]!.bonusToHit).toBeUndefined()
  })
})

describe('the +1 reaches the number Marcus reads at the table', () => {
  it('moves the attack bonus by exactly the enchantment', () => {
    const char = armed(GLAIVE)
    const before = attackBonus(char, char.weapons[0]!)

    const next = upsertWeapon(char, 0, { ...GLAIVE, bonusToHit: 1, bonusDamage: 1 })
    const after = attackBonus(next, next.weapons[0]!)

    /* Read off the fixture, not hard-coded: STR and proficiency are free to
       change without making this test lie about what it proves. */
    expect(after - before).toBe(1)
    expect(after).toBe(before + 1)
  })

  it('a saved special ability survives on the record the Combat tab reads', () => {
    /* `turn/options.ts` builds the Combat row's tip straight from
       `weapon.specialAbilities`, so getting it onto the character IS getting it
       onto the Combat tab. Radiant Swing is the ability that had nowhere to go. */
    const next = upsertWeapon(armed(GLAIVE), 0, {
      ...GLAIVE,
      specialAbilities: [
        {
          name: 'Radiant Swing',
          trigger: '1/day at dawn',
          effect: 'Forgo one attack: 15 ft cone, DC 15 Dex save, 3d6 radiant, half on save.',
        },
      ],
    })
    expect(next.weapons[0]!.specialAbilities).toHaveLength(1)
    expect(next.weapons[0]!.specialAbilities![0]!.name).toBe('Radiant Swing')
  })
})
