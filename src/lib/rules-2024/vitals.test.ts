import { describe, it, expect } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { tableVitals, discrepancies, proficiencyForLevel, signed } from './vitals'

/* ============================================================================
   Table Truth slice 2.

   The thing under test is a REPORTER, so the tests are mostly about restraint:
   does it stay quiet when it should, does it refuse to claim a class it has no
   table for, and does it ever hand back a modified character. (It must not —
   there is no code path that returns one, and a test pins that.)
   ========================================================================= */

/** A Paladin 7 whose sheet is internally consistent: prof +3, CHA 18 → +4,
 *  so DC 15 and spell attack +7, and the half-caster table gives 4×1st, 3×2nd.
 *  Every discrepancy test below starts from this and breaks exactly one thing,
 *  so a firing check can only be caused by the field it names. */
const CLEAN: Character = {
  ...NIX,
  level: 7,
  proficiencyBonus: 3,
  spellSaveDC: 15,
  spellAttackBonus: 7,
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } },
}

describe('tableVitals', () => {
  it('5 — reads the STORED save DC, it does not recompute it', () => {
    // Deliberate: he has been playing with the stored number. Swapping it for a
    // computed one at the table would change his rolls with no announcement.
    const drifted = { ...CLEAN, spellSaveDC: 99 }
    expect(tableVitals(drifted).saveDC).toBe(99)
  })

  it('6 — derives initiative from DEX, since nothing stores it', () => {
    expect(tableVitals({ ...CLEAN, abilityScores: { ...CLEAN.abilityScores, DEX: 10 } }).initiativeMod).toBe(0)
    expect(tableVitals({ ...CLEAN, abilityScores: { ...CLEAN.abilityScores, DEX: 18 } }).initiativeMod).toBe(4)
    expect(tableVitals({ ...CLEAN, abilityScores: { ...CLEAN.abilityScores, DEX: 7 } }).initiativeMod).toBe(-2)
  })

  it('7 — carries AC, proficiency and spell attack through unchanged', () => {
    const v = tableVitals(CLEAN)
    expect(v.armorClass).toBe(CLEAN.armorClass)
    expect(v.proficiency).toBe(3)
    expect(v.spellAttack).toBe(7)
  })

  it('8 — never mutates the character it was handed', () => {
    const before = JSON.stringify(CLEAN)
    tableVitals(CLEAN)
    discrepancies(CLEAN)
    expect(JSON.stringify(CLEAN)).toBe(before)
  })
})

describe('signed', () => {
  it('9 — a modifier always carries its sign, including zero', () => {
    expect(signed(3)).toBe('+3')
    expect(signed(0)).toBe('+0')
    expect(signed(-2)).toBe('-2')
  })
})

describe('proficiencyForLevel', () => {
  it('10 — +2 at 1, stepping at 5, 9, 13, 17', () => {
    expect([1, 4].map(proficiencyForLevel)).toEqual([2, 2])
    expect([5, 8].map(proficiencyForLevel)).toEqual([3, 3])
    expect([9, 12].map(proficiencyForLevel)).toEqual([4, 4])
    expect([13, 16].map(proficiencyForLevel)).toEqual([5, 5])
    expect([17, 20].map(proficiencyForLevel)).toEqual([6, 6])
  })
})

describe('discrepancies — silence is the default', () => {
  it('11 — a consistent sheet produces none at all', () => {
    expect(discrepancies(CLEAN)).toEqual([])
  })

  it('12 — THE ONE THIS SLICE EXISTS FOR: 3rd-level slots at Paladin 7', () => {
    // Marcus's screenshot: the deck renders two 3rd-level slot pips. The
    // half-caster table gives none until level 9.
    const withThirds: Character = {
      ...CLEAN,
      spellSlots: { ...CLEAN.spellSlots, 3: { max: 2, current: 2 } },
    }
    const found = discrepancies(withThirds)
    const slots = found.find(d => d.id === 'spell-slots')
    expect(slots, 'the slot mismatch must be reported').toBeDefined()
    expect(slots!.sheet).toContain('3rd ×2')
    expect(slots!.rule).not.toContain('3rd')
    expect(slots!.rule).toBe('1st ×4 · 2nd ×3')
  })

  it('12b — and it goes quiet again at the level that grants them', () => {
    const atNine: Character = {
      ...CLEAN,
      level: 9,
      proficiencyBonus: 4,
      spellSaveDC: 16,
      spellAttackBonus: 8,
      spellSlots: { ...CLEAN.spellSlots, 3: { max: 2, current: 2 } },
    }
    expect(discrepancies(atNine).find(d => d.id === 'spell-slots')).toBeUndefined()
  })

  it('13 — a missing slot tier counts too, not just an extra one', () => {
    const short: Character = { ...CLEAN, spellSlots: { 1: { max: 4, current: 4 } } }
    const slots = discrepancies(short).find(d => d.id === 'spell-slots')
    expect(slots).toBeDefined()
    expect(slots!.sheet).toBe('1st ×4')
    expect(slots!.rule).toBe('1st ×4 · 2nd ×3')
  })

  it('14 — spends no opinion on a class it has no table for (open-world)', () => {
    // Warlock is Pact Magic; Artificer rounds up at level 1. Neither is in the
    // map, so neither can be told it is wrong by a table that does not fit it.
    for (const klass of ['Warlock', 'Artificer', 'Fighter', 'Hearthwarden']) {
      const other: Character = { ...CLEAN, class: klass, spellSlots: { 3: { max: 9, current: 9 } } }
      expect(
        discrepancies(other).find(d => d.id === 'spell-slots'),
        `${klass} has no slot table here and must not be corrected`,
      ).toBeUndefined()
    }
  })

  it('15 — flags a proficiency bonus that does not match the level', () => {
    const found = discrepancies({ ...CLEAN, proficiencyBonus: 4 })
    const prof = found.find(d => d.id === 'proficiency')
    expect(prof).toBeDefined()
    expect(prof!.sheet).toBe('+4')
    expect(prof!.rule).toBe('+3')
  })

  it('16 — flags a save DC and spell attack that drift from the ability scores', () => {
    // CHA 18 (+4) and prof +3 give DC 15 / attack +7.
    const found = discrepancies({ ...CLEAN, spellSaveDC: 16, spellAttackBonus: 8 })
    expect(found.find(d => d.id === 'save-dc')?.rule).toBe('15')
    expect(found.find(d => d.id === 'spell-attack')?.rule).toBe('+7')
  })

  it('17 — every report shows BOTH readings and never names a winner', () => {
    const messy: Character = {
      ...CLEAN,
      proficiencyBonus: 4,
      spellSaveDC: 16,
      spellSlots: { ...CLEAN.spellSlots, 3: { max: 2, current: 2 } },
    }
    const found = discrepancies(messy)
    expect(found.length).toBeGreaterThan(1)
    for (const d of found) {
      expect(d.sheet, `${d.id} must state what the sheet says`).toBeTruthy()
      expect(d.rule, `${d.id} must state what the rule says`).toBeTruthy()
      expect(d.why, `${d.id} must show its working`).toBeTruthy()
      // The shape itself is the guarantee: there is nowhere to put a verdict.
      expect(Object.keys(d).sort()).toEqual(['id', 'rule', 'sheet', 'title', 'why'])
    }
  })
})

describe('the app\'s own Nix fixture', () => {
  /* Not a bug being fixed here — a fact being pinned. The fixture stores
     spellSaveDC 16 and spellAttackBonus 8 for a level-8 Paladin with CHA 18 and
     proficiency +3, where the formula gives 15 and +7. Its only +1 is a
     weapon's `bonusToHit`, which does not touch spell numbers. If someone later
     "fixes" the fixture, this test tells them the checker was watching. */
  it('18 — reports the +1 drift the fixture has carried all along', () => {
    const found = discrepancies(NIX)
    expect(found.find(d => d.id === 'save-dc')).toMatchObject({ sheet: '16', rule: '15' })
    expect(found.find(d => d.id === 'spell-attack')).toMatchObject({ sheet: '+8', rule: '+7' })
    // Its slots and proficiency, by contrast, are correct for a Paladin 8.
    expect(found.find(d => d.id === 'spell-slots')).toBeUndefined()
    expect(found.find(d => d.id === 'proficiency')).toBeUndefined()
  })
})
