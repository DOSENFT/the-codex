import { describe, it, expect } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character, CharacterBase } from '../character'
import { resolveCharacter, storableOf } from './derive'
import { tableVitals, discrepancies, proficiencyForLevel, signed, type DiscrepancyId } from './vitals'

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
  it('5 — passes the sheet\'s save DC straight through, it does not recompute it', () => {
    /* SLICE 7 RENAMED THIS TEST AND REVERSED ITS REASON, without touching a line
       of what it asserts. It used to read "reads the STORED save DC", and the
       reason given was that Marcus had been playing with the stored number and
       swapping it for a computed one would change his rolls unannounced. Gate 1
       overruled exactly that: the stored copy is retired and the field IS the
       computed number now.
       The pass-through survives on a different justification. Recomputing here
       would make this module a SECOND place the DC is worked out, and two copies
       of one formula is the bug the whole phase existed to kill. A forged 99
       still comes back as 99 — this file reports, it never corrects. */
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

/* ============================================================================
   SHEET TRUTH slice 7 — the door three of these four flags came in by is shut.

   Every test above this line hands `discrepancies()` a `Character` built with an
   object literal. That was the only kind of character there was when they were
   written. Since slice 3 there are two kinds, and the difference is the whole
   subject of this section:

     a RESOLVED character — one that came out of `resolveCharacter`, which is now
     the only producer the app itself uses (character.ts:376). Its save DC, spell
     attack and proficiency bonus are computed, not stored, so they cannot drift.

     a FORGED character — an object literal, a legacy blob, a hand-edited export,
     a future import path that forgets to resolve. Its numbers can say anything.

   Tests 15–18 are forged sheets, and they still pass, which is what "kept, not
   deleted" has to mean: the branches are live code that still works. Tests 19–22
   are the other half — the proof that no resolved sheet can reach three of them,
   and that the fourth still fires for everyone, forever.
   ========================================================================= */
describe('slice 7 — what retiring the stored numbers made unreachable', () => {
  /** The three that `resolveCharacter` now computes, so they cannot drift. */
  const NEVER: DiscrepancyId[] = ['save-dc', 'spell-attack', 'proficiency']

  /* Thirteen classes, not one: full casters, half casters, the two SLOT_TABLE
     deliberately omits (Warlock's Pact Magic, Artificer's round-up), and four
     that do not cast at all — because "a non-caster can never trip this" is a
     claim in the source and claims in the source are what finding BJ is about.

     Levels run past 20 on purpose. `level` is a free number on the sheet with
     nothing stopping a 24, and level 24 is precisely where the two copies of the
     proficiency formula had drifted before slice 3 collapsed them. A sweep that
     stopped at 20 would have missed the only level that ever mattered. */
  const CLASSES = [
    'Paladin', 'Ranger', 'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard',
    'Warlock', 'Artificer', 'Fighter', 'Rogue', 'Barbarian', 'Monk',
  ]
  const LEVELS = [0, ...Array.from({ length: 20 }, (_, i) => i + 1), 21, 24]
  /* Every score set to the same value, so whatever a class's casting ability
     turns out to be, the sweep has moved it. 3 and 30 are outside the legal
     range and included for that reason; 9 gives a NEGATIVE modifier, which is
     the branch `unsigned` exists for elsewhere in this phase. */
  const SCORES = [3, 8, 9, 10, 11, 14, 16, 18, 20, 30]

  function* sweep(): Generator<Character> {
    const base = storableOf(NIX)
    for (const klass of CLASSES) {
      for (const level of LEVELS) {
        for (const score of SCORES) {
          yield resolveCharacter({
            ...base,
            class: klass,
            level,
            abilityScores: { STR: score, DEX: score, CON: score, INT: score, WIS: score, CHA: score },
          } as CharacterBase)
        }
      }
    }
  }

  it('19 — no character the app can produce trips the save DC, spell attack or proficiency check', () => {
    let checked = 0
    for (const character of sweep()) {
      const fired = discrepancies(character)
        .filter(d => NEVER.includes(d.id))
        .map(d => d.id)
      expect(
        fired,
        `${character.class} level ${character.level}, all scores ${character.abilityScores.CHA}`,
      ).toEqual([])
      checked++
    }
    // The sweep must actually have swept. A generator that yields nothing would
    // pass every assertion above it and prove precisely nothing (finding BG).
    expect(checked).toBe(CLASSES.length * LEVELS.length * SCORES.length)
    expect(checked).toBeGreaterThan(2000)
  })

  it('20 — and the REASON is idempotence: resolving a resolved sheet moves nothing', () => {
    /* This is the mechanism test 19 measures the consequence of. `vitals.ts`
       compares `character.spellSaveDC` against `computeSpellSaveDC(character)`,
       and since character.ts:439 the latter is `resolveCharacter(char).spellSaveDC`
       — so the comparison asks a resolved sheet whether resolving it again would
       move it. If that were ever false, test 19 would go red without anyone
       understanding why; this test names the property by itself. */
    let checked = 0
    for (const character of sweep()) {
      const again = resolveCharacter(character)
      expect(again.spellSaveDC, `${character.class} ${character.level}`).toBe(character.spellSaveDC)
      expect(again.spellAttackBonus).toBe(character.spellAttackBonus)
      expect(again.proficiencyBonus).toBe(character.proficiencyBonus)
      checked++
    }
    expect(checked).toBeGreaterThan(2000)
  })

  it('21 — but all three are still live code, and a sheet that skipped the door still trips them', () => {
    /* "Kept rather than deleted" is only true if the branches still work. This
       is the legacy blob: a Paladin 7 whose three numbers say whatever an old
       file said, never resolved. All three must fire, together, with both
       readings — which is also what makes test 19 a real result rather than a
       test of code that could not fire for anybody. */
    const forged: Character = {
      ...CLEAN,
      proficiencyBonus: 4,
      spellSaveDC: 18,
      spellAttackBonus: 9,
    }
    const fired = discrepancies(forged).filter(d => NEVER.includes(d.id))
    expect(fired.map(d => d.id).sort()).toEqual([...NEVER].sort())
    for (const d of fired) {
      expect(d.sheet).toBeTruthy()
      expect(d.rule).toBeTruthy()
      expect(d.why).toBeTruthy()
    }
  })

  it('22 — spell slots still report, through the front door, forever and by design', () => {
    /* The asymmetry, and it is deliberate (derive.ts:162). Marcus's sheet carries
       3rd-level slots at level 7, which the half-caster table does not grant.
       That may be his DM or an item, and deleting a resource he is playing with
       would be the app overruling his table — so slots stay stored, stay his,
       and stay reported. This check does NOT become unreachable, and a future
       slice that "tidies up" the other three must not take this one with them. */
    const resolved = resolveCharacter({
      ...storableOf(NIX),
      level: 7,
      spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 }, 3: { max: 2, current: 2 } },
    } as CharacterBase)
    const slots = discrepancies(resolved).find(d => d.id === 'spell-slots')
    expect(slots).toBeDefined()
    expect(slots!.sheet).toContain('3rd')
    expect(slots!.rule).not.toContain('3rd')
    // …and it went through the very door that shut the other three.
    expect(discrepancies(resolved).filter(d => NEVER.includes(d.id))).toEqual([])
  })
})
