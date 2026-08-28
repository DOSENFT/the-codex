import { describe, it, expect } from 'vitest'
import {
  proficiencyFor,
  progressionRow,
  castingAbilityOf,
  resolveCharacter,
} from './derive'
import { abilityModifier, normalizeCharacter, type Character } from '../character'
import { PROGRESSION_BY_CLASS } from '../../canon'

/* A level-7 Oath of the Hearth Paladin at Charisma 16 — Marcus's real sheet,
 * carrying the stale numbers an edit in Prep leaves behind today: DC 15 and
 * +7, which are the Charisma-18 answers. If these tests pass while those two
 * fields stay as written, nothing has been fixed. */
function nix(over: Partial<Character> = {}): Character {
  return {
    id: 'nix',
    name: 'Nix',
    class: 'Paladin',
    subclass: 'Oath of the Hearth',
    race: 'Changeling',
    level: 7,
    spellcastingAbility: 'Charisma',
    spellSaveDC: 15,
    spellAttackBonus: 7,
    proficiencyBonus: 3,
    maxPreparedSpells: 5,
    armorClass: 18,
    hitPoints: { max: 67, current: 67 },
    abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    tempHP: 0,
    skillProficiencies: ['Athletics', 'Persuasion'],
    skillExpertise: [],
    savingThrowProficiencies: [],
    weapons: [],
    equipment: [],
    supplies: [],
    spells: [],
    spellSlots: [{ level: 1, max: 4, used: 0 }, { level: 2, max: 3, used: 0 }],
    features: [],
    feats: [],
    ...over,
  } as unknown as Character
}

describe('proficiencyFor — the only copy of a formula that had five', () => {
  it('matches canon\'s own table at every one of the twenty levels', () => {
    // The point of this test. Four hand-typed copies of this formula agreed
    // with canon by luck; this is what makes them agree on purpose.
    for (const row of PROGRESSION_BY_CLASS.Paladin) {
      expect(proficiencyFor(row.level)).toBe(row.proficiencyBonus)
    }
  })

  it('steps at 5, 9, 13 and 17 — the boundaries, not just the happy level', () => {
    expect([4, 5, 8, 9, 12, 13, 16, 17].map(proficiencyFor)).toEqual([
      2, 3, 3, 4, 4, 5, 5, 6,
    ])
  })

  it('clamps rather than extrapolating off either end of the table', () => {
    expect(proficiencyFor(0)).toBe(2)
    expect(proficiencyFor(99)).toBe(6)
  })
})

describe('progressionRow — canon has one table and admits it', () => {
  it('reads level 7 off the row nothing used to read', () => {
    const row = progressionRow('Paladin', 7)
    expect(row).toMatchObject({
      proficiencyBonus: 3,
      preparedSpells: 7,
      layOnHandsPool: 35,
      channelDivinityUses: 2,
    })
  })

  it('returns null for a class canon has no table for', () => {
    // Open world. Null means "nothing to add", never "you are wrong".
    expect(progressionRow('Fighter', 7)).toBeNull()
  })

  it('returns null off the end of the table rather than the nearest row', () => {
    expect(progressionRow('Paladin', 21)).toBeNull()
  })
})

describe('castingAbilityOf', () => {
  it('knows a Paladin casts on Charisma', () => {
    expect(castingAbilityOf({ class: 'Paladin' })).toBe('CHA')
  })

  it('returns null for a Fighter — there is no DC to invent', () => {
    expect(castingAbilityOf({ class: 'Fighter' })).toBeNull()
  })
})

describe('resolveCharacter — Nix at Charisma 16', () => {
  it('works out the DC he actually has, discarding the stored 15', () => {
    // THE BUG. Fails against the pre-slice code, which returns the stored 15.
    const r = resolveCharacter(nix())
    expect(r.spellSaveDC).toBe(14)
    expect(r.spellAttackBonus).toBe(6)
    expect(r.proficiencyBonus).toBe(3)
  })

  it('reads his prepared-spell count off canon instead of the stored 5', () => {
    expect(resolveCharacter(nix()).maxPreparedSpells).toBe(7)
  })

  it('follows an edit to Charisma — 16 to 18 and back', () => {
    const up = resolveCharacter(nix({ abilityScores: { ...nix().abilityScores, CHA: 18 } }))
    expect([up.spellSaveDC, up.spellAttackBonus]).toEqual([15, 7])
    const down = resolveCharacter(nix({ abilityScores: { ...nix().abilityScores, CHA: 16 } }))
    expect([down.spellSaveDC, down.spellAttackBonus]).toEqual([14, 6])
  })

  it('follows a level-up across the 8 to 9 proficiency step', () => {
    const nine = resolveCharacter(nix({ level: 9 }))
    expect(nine.proficiencyBonus).toBe(4)
    expect(nine.spellSaveDC).toBe(15)
    expect(nine.spellAttackBonus).toBe(7)
    expect(nine.maxPreparedSpells).toBe(9)
  })

  it('is idempotent', () => {
    const once = resolveCharacter(nix())
    expect(resolveCharacter(once)).toEqual(once)
  })

  it('changes nothing else on the sheet', () => {
    const before = nix()
    const after = resolveCharacter(before)
    expect(after.armorClass).toBe(before.armorClass)
    expect(after.hitPoints).toEqual(before.hitPoints)
    expect(after.abilityScores).toEqual(before.abilityScores)
    expect(after.skillProficiencies).toEqual(before.skillProficiencies)
  })

  it('leaves spell slots exactly alone, at every level', () => {
    // His sheet carries slots his level does not grant. That may be his DM or
    // an item. The app reports it and never corrects it.
    for (const level of [1, 7, 9, 20]) {
      expect(resolveCharacter(nix({ level })).spellSlots).toEqual(nix().spellSlots)
    }
  })
})

describe('resolveCharacter — the open world', () => {
  /* SLICE 3 CHANGED WHERE THESE READ FROM, and these two tests are how it was
     noticed rather than assumed. They used to pass `spellSaveDC: 12` — the
     STORED field — and assert it survived. That field no longer exists on the
     thing being passed in; the escape hatch is `spellSaveDCOverride`, which is
     the same value under a name that cannot be mistaken for the answer. The
     behaviour under test is unchanged: for a class the app has no rule for, the
     number on the sheet stands. */
  it('invents nothing for a class that does not cast', () => {
    const fighter = nix({ class: 'Fighter', spellSaveDCOverride: 12, spellAttackBonusOverride: 4 })
    const r = resolveCharacter(fighter)
    expect(r.spellSaveDC).toBe(12)
    expect(r.spellAttackBonus).toBe(4)
    // Proficiency IS universal, so that one still gets fixed.
    expect(r.proficiencyBonus).toBe(3)
  })

  it('ignores the override outright for a class it CAN compute', () => {
    /* The trap this slice had to avoid. An override that is merely *preferred*
       over the computed number is the old stale copy wearing a new name, and
       Marcus's Charisma-18 bug walks straight back in through it. 15 is exactly
       the wrong number he reported; the assertion is that it is not honoured. */
    const r = resolveCharacter(nix({ spellSaveDCOverride: 15, spellAttackBonusOverride: 7 }))
    expect(r.spellSaveDC).toBe(14)
    expect(r.spellAttackBonus).toBe(6)
  })

  it('keeps the stored prepared count for a class canon has no table for', () => {
    expect(resolveCharacter(nix({ class: 'Cleric', maxPreparedSpellsOverride: 5 })).maxPreparedSpells).toBe(5)
  })

  it('a Cleric saved before slice 3 does not lose their prepared count', () => {
    /* The migration, end to end, and the reason a THIRD override exists at all —
       Gate 3 named only two. Canon ships a levels table for Paladin and for
       nothing else, so retiring the stored `maxPreparedSpells` without demoting
       it would silently zero every Cleric, Druid and Wizard. What is on disk is
       the old key; what comes back is the count. */
    const fromDisk = normalizeCharacter({ name: 'A Cleric', class: 'Cleric', level: 7, maxPreparedSpells: 9 })
    expect(resolveCharacter(fromDisk).maxPreparedSpells).toBe(9)
  })

  it('tells the player, in words, which numbers it stopped believing', () => {
    /* Gate 3's answer to "how does Marcus find out his 15 became a 14?": a line
       in the repair log that already exists, not a modal. Asserted on the
       SUBSTANCE — that it names the old number and the ability it now comes
       from — rather than on the exact sentence, which is copy and may be
       reworded without this going red. */
    const repairs: string[] = []
    normalizeCharacter({ name: 'Nix', class: 'Paladin', level: 7, spellSaveDC: 15 }, undefined, repairs)
    expect(repairs.join(' ')).toMatch(/15/)
    expect(repairs.join(' ')).toMatch(/Charisma/i)
    // And silence for a class it has no rule for — nothing was replaced.
    const none: string[] = []
    normalizeCharacter({ name: 'A Fighter', class: 'Fighter', level: 7, spellSaveDC: 12 }, undefined, none)
    expect(none).toEqual([])
  })

  it('still derives the DC for a caster canon has no LEVEL table for', () => {
    // Cleric: no progression row, but WIS casting is a universal rule. The two
    // are independent, and conflating them would silence a rule that applies.
    const cleric = resolveCharacter(nix({ class: 'Cleric' }))
    expect(cleric.spellSaveDC).toBe(8 + 3 + abilityModifier(nix().abilityScores.WIS))
    expect(cleric.spellSaveDC).toBe(12)
  })
})

describe('the duplicated modifier formula stays honest', () => {
  it('agrees with character.ts\'s abilityModifier across the whole range', () => {
    // derive.ts keeps its own four-line copy to avoid a runtime import cycle.
    // This is the pin that stops the copy drifting.
    for (let score = 1; score <= 30; score++) {
      const viaDerive = resolveCharacter(
        nix({ class: 'Paladin', abilityScores: { ...nix().abilityScores, CHA: score } }),
      ).spellSaveDC
      expect(viaDerive).toBe(8 + 3 + abilityModifier(score))
    }
  })
})
