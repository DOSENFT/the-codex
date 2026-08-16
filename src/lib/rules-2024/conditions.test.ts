// ---------------------------------------------------------------------------
// rules-2024/conditions — the cascade, and the Bloodied line
// ---------------------------------------------------------------------------
//
// Two failure modes are pinned here above all others.
//
// 1. Resolving a condition name without its cascade. Stunned reads as almost
//    harmless if you stop at the word "Stunned"; it contains Incapacitated,
//    which takes the whole turn away.
//
// 2. Getting the Bloodied boundary off by one. It is inclusive — "half its hit
//    points or fewer" — so Nix at 38 of 76 IS bloodied. An exclusive
//    comparison is wrong on exactly one hit point, which is exactly the hit
//    point the table cares about.

import { describe, it, expect } from 'vitest'
import {
  allConditions,
  blockedSlots,
  bloodiedThreshold,
  crossedIntoBloodied,
  effectOf,
  effectsOf,
  expandConditions,
  isBloodied,
  isSlotBlocked,
} from './conditions'

describe('effectsOf and the cascade', () => {
  it('Incapacitated cascades to block action, bonus action and reaction', () => {
    // New in 2024: the bonus action and the reaction are blocked too. In 2014
    // Incapacitated took the action and the reaction only. If the app gets
    // this wrong it offers Nix a Smite he cannot cast.
    const blocked = blockedSlots(['Incapacitated'])
    expect(blocked).toEqual(expect.arrayContaining(['action', 'bonusAction', 'reaction']))
    expect(isSlotBlocked(['Incapacitated'], 'bonusAction')).toBe(true)
    // And it does NOT block movement — an Incapacitated creature can still be
    // dragged along by its own speed. Blocking it would be a different rule.
    expect(blocked).not.toContain('movement')
  })

  it('Stunned drags Incapacitated in with it', () => {
    // The cascade test that matters. Ask only about the name you were given
    // and Stunned blocks nothing at all.
    expect(effectOf('Stunned').blocks).toEqual([])
    expect(blockedSlots(['Stunned'])).toEqual(
      expect.arrayContaining(['action', 'bonusAction', 'reaction']),
    )
    expect(expandConditions(['Stunned'])).toEqual(['Stunned', 'Incapacitated'])
  })

  it('Unconscious cascades to both Incapacitated and Prone', () => {
    const names = expandConditions(['Unconscious'])
    expect(names).toEqual(['Unconscious', 'Incapacitated', 'Prone'])
    expect(blockedSlots(['Unconscious'])).toEqual(
      expect.arrayContaining(['action', 'bonusAction', 'reaction', 'movement']),
    )
    // Prone survives waking up, which is why it is a separate condition and
    // not a clause inside Unconscious.
    expect(effectsOf(['Unconscious']).map(e => e.name)).toContain('Prone')
  })

  it('does not reduce Speed for Stunned — 2024 dropped that clause', () => {
    // 2014 Stunned said "can't move". 2024 does not. A model reaching for the
    // familiar wording will add it back; this test is here to stop it.
    expect(isSlotBlocked(['Stunned'], 'movement')).toBe(false)
    // Paralyzed, which does say Speed 0, is the control.
    expect(isSlotBlocked(['Paralyzed'], 'movement')).toBe(true)
  })

  it('Frightened gives disadvantage but does not block any slot', () => {
    const frightened = effectOf('Frightened')
    expect(frightened.yourAttacksHaveDisadvantage).toBe(true)
    expect(frightened.blocks).toEqual([])
    expect(frightened.cascades).toEqual([])
    // The movement restriction is directional ("can't move closer"), not a
    // block, so it lives in the note rather than in blocks.
    expect(frightened.note).toContain('closer')
  })

  it('deduplicates a condition that is both named and cascaded into', () => {
    // A DM who marks both "Unconscious" and "Prone" must not produce two Prone
    // entries, and the count must not drift as the cascade is walked.
    expect(expandConditions(['Prone', 'Unconscious'])).toEqual([
      'Prone',
      'Unconscious',
      'Incapacitated',
    ])
    expect(expandConditions(['stunned', 'Stunned', 'STUNNED  '])).toEqual([
      'stunned',
      'Incapacitated',
    ])
  })

  it('is case- and whitespace-insensitive on the way in', () => {
    expect(effectOf('  paralyzed ').known).toBe(true)
    expect(effectOf('PRONE').name).toBe('Prone')
  })
})

describe('unknown conditions pass through', () => {
  it('keeps a homebrew name and invents no effects for it', () => {
    // Marcus writes homebrew. A condition this file has never heard of must
    // reach the screen intact — telling him he is unaffected because we do not
    // recognise the word is worse than useless.
    const custom = effectOf('Hearth-Chilled')
    expect(custom.known).toBe(false)
    expect(custom.name).toBe('Hearth-Chilled')
    expect(custom.blocks).toEqual([])
    expect(custom.yourAttacksHaveDisadvantage).toBe(false)
    expect(custom.cascades).toEqual([])

    // And it still travels alongside the ones we do know.
    expect(effectsOf(['Poisoned', 'Hearth-Chilled']).map(e => e.name)).toEqual([
      'Poisoned',
      'Hearth-Chilled',
    ])
    expect(blockedSlots(['Hearth-Chilled'])).toEqual([])
  })
})

describe('the condition list', () => {
  it('is the fifteen conditions of the 2024 rules', () => {
    expect(allConditions()).toHaveLength(15)
    expect(allConditions().map(c => c.name).sort()).toEqual([
      'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
      'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
      'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
    ])
  })

  it('models Invisible as a benefit, not as an absence of effects', () => {
    // The Gate 3 interface had only "your attacks have disadvantage" and
    // "attacks against you have advantage", which cannot express the one
    // condition that runs the other way. Two fields were added rather than
    // letting Invisible render as nothing.
    const invisible = effectOf('Invisible')
    expect(invisible.yourAttacksHaveAdvantage).toBe(true)
    expect(invisible.attacksAgainstYouHaveDisadvantage).toBe(true)
    expect(invisible.yourAttacksHaveDisadvantage).toBe(false)
    expect(invisible.attacksAgainstYouHaveAdvantage).toBe(false)
  })

  it('does not claim disadvantage for Exhaustion, which is a numeric penalty', () => {
    // 2024 replaced the six-tier ladder with −2 per level on every D20 Test.
    // Rendering that as disadvantage would be a bigger penalty than the rules
    // impose, and would be invisible as an error.
    const exhaustion = effectOf('Exhaustion')
    expect(exhaustion.yourAttacksHaveDisadvantage).toBe(false)
    expect(exhaustion.note).toContain('−2')
  })

  it('carries the caveat for conditions whose booleans are only half the truth', () => {
    // Prone's axis in 2024 is DISTANCE, not melee-versus-ranged: within 5 ft
    // the attacker has advantage, beyond it disadvantage. Both flags are set,
    // which is only coherent because the note discriminates them.
    const prone = effectOf('Prone')
    expect(prone.attacksAgainstYouHaveAdvantage).toBe(true)
    expect(prone.attacksAgainstYouHaveDisadvantage).toBe(true)
    expect(prone.note).toContain('5 ft')
    // Grappled's disadvantage does not apply to the grappler itself.
    expect(effectOf('Grappled').note).toContain('grappler')
  })
})

describe('Bloodied', () => {
  it('bloodiedThreshold(76) === 38', () => {
    expect(bloodiedThreshold(76)).toBe(38)
    expect(bloodiedThreshold(75)).toBe(37)
    expect(bloodiedThreshold(1)).toBe(0)
    expect(bloodiedThreshold(0)).toBe(0)
  })

  it('is true at exactly the threshold, not one below it', () => {
    // "Half its Hit Points or fewer" — inclusive. Nix's max is 76, so 38 IS
    // bloodied and 39 is not. This is the off-by-one the whole function exists
    // to get right.
    expect(isBloodied({ max: 76, current: 39 })).toBe(false)
    expect(isBloodied({ max: 76, current: 38 })).toBe(true)
    expect(isBloodied({ max: 76, current: 37 })).toBe(true)
    // Odd maximum: 38 of 75 is MORE than half, so it is not bloodied.
    expect(isBloodied({ max: 75, current: 38 })).toBe(false)
    expect(isBloodied({ max: 75, current: 37 })).toBe(true)
  })

  it('is still true at 0 hit points', () => {
    // Bloodied is not "wounded but standing". It has no lower bound, and
    // features that trigger on a Bloodied target still trigger at 0.
    expect(isBloodied({ max: 76, current: 0 })).toBe(true)
  })

  it('is false for a creature with no maximum, rather than throwing', () => {
    expect(isBloodied({ max: 0, current: 0 })).toBe(false)
    expect(isBloodied(undefined as unknown as { max: number; current: number })).toBe(false)
  })

  it('crossedIntoBloodied fires on the transition and NOT on subsequent damage', () => {
    const max = 76
    // 41 -> 38: the crossing. This is the moment the table wants announced.
    expect(crossedIntoBloodied({ max, current: 41 }, { max, current: 38 })).toBe(true)
    // 38 -> 20: still bloodied, already announced. Firing again would repeat
    // the same news every single hit for the rest of the fight.
    expect(crossedIntoBloodied({ max, current: 38 }, { max, current: 20 })).toBe(false)
    // Healing back over the line is not a crossing either.
    expect(crossedIntoBloodied({ max, current: 20 }, { max, current: 60 })).toBe(false)
    // But crossing back down after healing above the line is.
    expect(crossedIntoBloodied({ max, current: 60 }, { max, current: 30 })).toBe(true)
  })
})
