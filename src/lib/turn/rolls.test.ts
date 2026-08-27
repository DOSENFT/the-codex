import { describe, expect, it } from 'vitest'
import { SPELLS } from '../../canon'
import { critNotation, rollOffers } from './rolls'
import type { CasterContext } from '../canon/format'

/* ============================================================================
   BAND 3 — the rolls.

   The test that matters most here is the one that asserts a button is ABSENT.
   `option.dice` hands Shield of Faith, Misty Step and Warding Bond a "1d20+8"
   apiece; putting that on screen would teach Marcus, at a table, that casting
   Misty Step involves an attack roll. A missing button costs a moment. A wrong
   button costs an argument and a wrong ruling.
   ========================================================================= */

const NIX: CasterContext = {
  spellSaveDC: 15,
  spellAttackBonus: 7,
  characterLevel: 7,
  abilityMod: 4,
}

const spell = (id: string) => SPELLS.find(s => s.id === id) ?? SPELLS.find(s => s.name === id)!

describe('rollOffers — the buttons that must NOT appear', () => {
  it('Shield of Faith offers NO attack roll, whatever option.dice claims', () => {
    const sof = spell('shield-of-faith')
    expect(sof.attackRoll, 'canon must still agree, or this test is stale').toBeNull()

    const offers = rollOffers({ detail: '+2 AC · concentration, 10 min', spell: sof, ctx: NIX })
    expect(offers.filter(o => o.kind === 'attack')).toEqual([])
    expect(offers.some(o => o.notation.includes('d20'))).toBe(false)
  })

  it('no spell canon calls attack-less is given a d20 — checked across all 71', () => {
    /* The generalisation of the test above. If a future change starts sourcing
       offers from option.dice again, this fails on a dozen records at once. */
    const wrong: string[] = []
    for (const s of SPELLS) {
      if (s.attackRoll) continue
      const offers = rollOffers({ detail: '', spell: s, ctx: NIX })
      if (offers.some(o => o.notation.includes('d20'))) wrong.push(s.name)
    }
    expect(wrong, 'these spells were handed an attack roll they do not have').toEqual([])
  })

  it('a save spell gets NO crit button — Sacred Flame cannot crit', () => {
    /* Crits happen on attack rolls. Sacred Flame is a Dexterity save. A crit
       button here would be the app inventing a rule beside a real one, which is
       the most convincing place to put a wrong rule. */
    const flame = spell('sacred-flame')
    expect(flame.save).not.toBeNull()
    expect(flame.attackRoll).toBeNull()

    const offers = rollOffers({ detail: '', spell: flame, ctx: NIX })
    expect(offers.some(o => o.kind === 'damage')).toBe(true)
    expect(offers.filter(o => o.kind === 'crit')).toEqual([])
  })
})

describe('rollOffers — from canon’s structured fields', () => {
  it('scales a cantrip to the character’s level, not to level 1', () => {
    // Sacred Flame at character level 7 is tier 2: the die count doubles.
    const one = rollOffers({ detail: '', spell: spell('sacred-flame'), ctx: NIX })
    const seven = one.find(o => o.kind === 'damage')!
    const first = rollOffers({
      detail: '',
      spell: spell('sacred-flame'),
      ctx: { ...NIX, characterLevel: 1 },
    }).find(o => o.kind === 'damage')!

    expect(seven.notation).not.toBe(first.notation)
    expect(seven.notation).toBe('2d8')
    expect(first.notation).toBe('1d8')
  })

  it('adds the ability modifier to healing only when canon says to', () => {
    // Cure Wounds carries mod: "spellcasting ability modifier". Prayer of
    // Healing carries no mod at all, and inventing one would overheal.
    const cure = rollOffers({ detail: '', spell: spell('cure-wounds'), ctx: NIX })
    expect(cure.find(o => o.kind === 'heal')!.notation).toBe('2d8+4')

    const prayer = rollOffers({ detail: '', spell: spell('prayer-of-healing'), ctx: NIX })
    expect(prayer.find(o => o.kind === 'heal')!.notation).toBe('2d8')
  })

  it('an attacking spell gets to-hit, damage and crit, in that order', () => {
    const ray = spell('scorching-ray')
    expect(ray.attackRoll).toBeTruthy()
    const offers = rollOffers({ detail: '', spell: ray, ctx: NIX })
    expect(offers.map(o => o.kind)).toEqual(['attack', 'damage', 'crit'])
    expect(offers[0].notation).toBe('1d20+7')
  })

  it('every notation it emits across the corpus is rollable, never prose', () => {
    /* Six of the 71 records put prose in damage.dice. A button reading
       "1d6 (scales at character levels 5, 11, 17)" is not a button. */
    const bad: string[] = []
    for (const s of SPELLS)
      for (const o of rollOffers({ detail: '', spell: s, ctx: NIX }))
        if (!/^\d+d\d+([+-]\d+)?(\+\d+d\d+)*$/.test(o.notation)) bad.push(`${s.name}: ${o.notation}`)
    expect(bad, 'these notations cannot be handed to a dice roller').toEqual([])
  })
})

describe('rollOffers — the open-world fallback, when canon knows nothing', () => {
  const OPPORTUNITY =
    '+7 to hit (STR +3 + prof +1 magic) · 1d8+4 Slashing · 5 ft · Magical'

  it('reads a homebrew row by SHAPE — no canon record needed', () => {
    const offers = rollOffers({ detail: OPPORTUNITY, ctx: NIX })
    expect(offers.map(o => o.notation)).toEqual(['1d20+7', '1d8+4', '2d8+4'])
    expect(offers.map(o => o.kind)).toEqual(['attack', 'damage', 'crit'])
  })

  it('names the damage from canon’s own word — "roll Slashing"', () => {
    const offers = rollOffers({ detail: OPPORTUNITY, ctx: NIX })
    expect(offers.find(o => o.kind === 'damage')!.label).toBe('roll Slashing')
  })

  it('segments that are not rolls contribute no buttons', () => {
    // "5 ft" and "Magical" are facts, not rolls. Two segments, two buttons
    // (plus the crit), not four.
    const offers = rollOffers({ detail: OPPORTUNITY, ctx: NIX })
    expect(offers).toHaveLength(3)
  })

  it('an option with nothing rollable offers nothing, and does not throw', () => {
    expect(rollOffers({ detail: '12 temp HP · until depleted', ctx: NIX })).toEqual([])
    expect(rollOffers({ detail: '', ctx: NIX })).toEqual([])
  })

  it('a declared roll with no to-hit gets no crit either', () => {
    // The cloak's retaliation: 1d10 Fire, triggered, no attack roll involved.
    const offers = rollOffers({ detail: '12 temp HP · 1d10 Fire retaliation', ctx: NIX })
    expect(offers.map(o => o.notation)).toEqual(['1d10'])
    expect(offers[0].label).toBe('roll Fire')
  })
})

describe('critNotation — doubling that refuses to guess', () => {
  it('doubles the dice and leaves the modifier alone (2024)', () => {
    expect(critNotation('2d8')).toBe('4d8')
    expect(critNotation('1d8+4')).toBe('2d8+4')
    expect(critNotation('3d6-1')).toBe('6d6-1')
  })

  it('NEVER doubles the modifier', () => {
    /* The 2014-era table habit was to double everything. Under 2024 the
       modifier is added once. Getting this wrong inflates every crit Marcus
       rolls, and he would have no reason to doubt it. */
    expect(critNotation('1d8+4')).not.toBe('2d8+8')
  })

  it('returns null rather than guess at a compound expression', () => {
    expect(critNotation('5d6+5d6')).toBeNull()
    expect(critNotation('2d8 per ray')).toBeNull()
    expect(critNotation('')).toBeNull()
  })
})
