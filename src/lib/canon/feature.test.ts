import { describe, it, expect } from 'vitest'
import { featureByName } from './lookup'
import {
  featureFacts,
  factsLine,
  resolveFormula,
  humanizeKey,
  isFreeRider,
  type FeatureContext,
} from './feature'
import type { CanonFeature } from './types'

/* ============================================================================
   SLICE 6 — the cloak's real number.

   Canon writes `tempHP: "Paladin level + Charisma modifier"`. Marcus needs 12.
   Canon ALSO ships `atLevel7.tempHPWithCha18 = 11`, which is that formula
   already answered for a character he no longer is. These tests are the reason
   the app computes and never reads.
   ========================================================================= */

/** Nix as the fixtures have him: Paladin 8, CHA 18. */
const NIX_CTX: FeatureContext = {
  className: 'Paladin',
  characterLevel: 8,
  abilityMod: { strength: 3, dexterity: 1, constitution: 2, wisdom: 1, charisma: 4 },
  spellcastingAbility: 'charisma',
}

describe('resolveFormula — the terms it can prove, and the ones it refuses', () => {
  it('resolves a class level plus an ability modifier', () => {
    expect(resolveFormula('Paladin level + Charisma modifier', NIX_CTX)).toBe(12)
  })

  it("resolves canon's other phrasing, 'spellcasting ability modifier'", () => {
    expect(resolveFormula('Paladin level + spellcasting ability modifier', NIX_CTX)).toBe(12)
  })

  it('is case- and punctuation-insensitive about the names', () => {
    expect(resolveFormula('PALADIN Level + charisma Modifier', NIX_CTX)).toBe(12)
  })

  it('adds a bare literal term', () => {
    expect(resolveFormula('10 + Charisma modifier', NIX_CTX)).toBe(14)
  })

  it("refuses a class this character does not have, rather than using her level", () => {
    // A Warlock level is not a Paladin level, and answering "8" here would be a
    // confident wrong number at a table.
    expect(resolveFormula('Warlock level + Charisma modifier', NIX_CTX)).toBeNull()
  })

  it('refuses an ability the sheet has no score for', () => {
    expect(resolveFormula('Intelligence modifier', NIX_CTX)).toBeNull()
  })

  it('refuses the WHOLE formula when any single term is unprovable', () => {
    // Half a formula resolved is worse than none: it looks like an answer.
    expect(resolveFormula('Paladin level + Sorcery Point modifier', NIX_CTX)).toBeNull()
  })

  it('refuses prose outright', () => {
    expect(resolveFormula('1d10 Fire to a creature that hits you', NIX_CTX)).toBeNull()
    expect(resolveFormula('Until the Temporary Hit Points are depleted', NIX_CTX)).toBeNull()
  })
})

describe('humanizeKey — canon\'s own word for the fact', () => {
  it('splits camelCase and leaves acronyms alone', () => {
    expect(humanizeKey('tempHP')).toBe('temp HP')
    expect(humanizeKey('cloakCost')).toBe('cloak cost')
    expect(humanizeKey('duration')).toBe('duration')
    expect(humanizeKey('manifestSummonDismiss')).toBe('manifest summon dismiss')
  })
})

describe('featureFacts — classification by the shape of the VALUE', () => {
  const HEARTHFIRE = featureByName('Hearthfire Manifest')

  it('canon still ships the record these tests are about', () => {
    expect(HEARTHFIRE, 'Hearthfire Manifest must be in the corpus').toBeDefined()
    expect(HEARTHFIRE!.mechanics).toBeDefined()
  })

  it('sorts every one of the cloak\'s mechanics into a shape', () => {
    const byKey = new Map(featureFacts(HEARTHFIRE, NIX_CTX).map(f => [f.key, f.shape]))
    expect(byKey.get('tempHP')).toBe('computed')
    expect(byKey.get('retaliation')).toBe('dice')
    expect(byKey.get('duration')).toBe('duration')
    expect(byKey.get('cloakAction')).toBe('economy')
    expect(byKey.get('manifestSummonDismiss')).toBe('economy')
    expect(byKey.get('light')).toBe('measure')
    expect(byKey.get('leash')).toBe('measure')
    expect(byKey.get('cloakCost')).toBe('prose')
  })

  it('computes the temp HP from the rule — 12, not canon\'s frozen 11', () => {
    const tempHP = featureFacts(HEARTHFIRE, NIX_CTX).find(f => f.key === 'tempHP')
    expect(tempHP!.value).toBe('12 temp HP')
    // The frozen snapshot canon ships beside it, for the record.
    expect((HEARTHFIRE as CanonFeature & { atLevel7?: { tempHPWithCha18?: number } }).atLevel7
      ?.tempHPWithCha18).toBe(11)
  })

  it('moves with the character — level 9 makes it 13, level 20 CHA 20 makes it 25', () => {
    const at9 = featureFacts(HEARTHFIRE, { ...NIX_CTX, characterLevel: 9 })
    expect(at9.find(f => f.key === 'tempHP')!.value).toBe('13 temp HP')

    const at20 = featureFacts(HEARTHFIRE, {
      ...NIX_CTX,
      characterLevel: 20,
      abilityMod: { ...NIX_CTX.abilityMod, charisma: 5 },
    })
    expect(at20.find(f => f.key === 'tempHP')!.value).toBe('25 temp HP')
  })

  it('extracts the die and its type without paraphrasing the sentence', () => {
    const retaliation = featureFacts(HEARTHFIRE, NIX_CTX).find(f => f.key === 'retaliation')!
    expect(retaliation.value).toBe('1d10 Fire retaliation')
    // canon's sentence is kept verbatim for the detail sheet.
    expect(retaliation.raw).toBe(
      '1d10 Fire to a creature that hits you with a melee attack'
    )
  })

  it('keeps a duration clause whole and unlabelled', () => {
    const duration = featureFacts(HEARTHFIRE, NIX_CTX).find(f => f.key === 'duration')!
    expect(duration.value).toBe('Until the Temporary Hit Points are depleted')
  })

  it('a feature with no mechanics bag yields no facts, and does not throw', () => {
    expect(featureFacts(undefined, NIX_CTX)).toEqual([])
    expect(featureFacts({ level: 1, name: 'X', rawText: 'y' }, NIX_CTX)).toEqual([])
  })

  it('skips non-string entries rather than stringifying them', () => {
    // `atLevel7` is an object; a naive walk would render "[object Object]".
    const facts = featureFacts(
      { level: 1, name: 'X', rawText: 'y', mechanics: { a: { b: 1 }, c: 3, d: '  ' } },
      NIX_CTX
    )
    expect(facts).toEqual([])
  })
})

describe('factsLine — what a row says, and in what order', () => {
  it('states the number, then the die, then the duration', () => {
    /* CHANGED IN SLICE 10e, and here is the why the guard at the top of this
       file asks for. The old pin read "…· 1d10 Fire retaliation · …" — the die
       with no price beside it. Marcus told us on 2026-08-27 what he reads that
       as: "it's a reaction 1d10 damage if I get hit". It is not. Canon makes the
       ACTIVATION the Reaction and the retaliation free, automatic and uncapped,
       so a blank price was costing him a reaction every round he held one back.
       Six characters, and they are the six he was missing.

       Nothing computed moved: 12 is still 12 and 1d10 is still 1d10. Slice 8b's
       law — a correction changes what the app SAYS, never what it COMPUTES. */
    const facts = featureFacts(featureByName('Hearthfire Manifest'), NIX_CTX)
    expect(factsLine(facts)).toBe(
      '12 temp HP · 1d10 Fire retaliation (free) · Until the Temporary Hit Points are depleted'
    )
  })

  it('states no cost, no light radius and no prose — the row prints the cost itself', () => {
    const line = factsLine(featureFacts(featureByName('Hearthfire Manifest'), NIX_CTX))
    expect(line).not.toContain('Channel Divinity use')
    expect(line).not.toContain('Bright Light')
    expect(line).not.toMatch(/\bReaction\b/)
    expect(line).not.toContain('Bonus Action')
  })

  it('NEVER emits an ellipsis — the thing this phase exists to kill', () => {
    const line = factsLine(featureFacts(featureByName('Hearthfire Manifest'), NIX_CTX))
    expect(line).not.toContain('…')
    expect(line).not.toContain('...')
  })

  it('is empty, not "undefined", when there is nothing to say', () => {
    expect(factsLine([])).toBe('')
  })
})

/* ============================================================================
   SLICE 10e — the price of the retaliation.

   Marcus, 2026-08-27: Hearthfire Manifest is "a bonus action, then it's a
   reaction 1d10 damage if I get hit". Canon disagrees, in its own paragraph:
   the ACTIVATION is the Reaction (plus one Channel Divinity use), and then "the
   creature takes 1d10 Fire damage in retaliation" every time it hits him, with
   no cap and nothing to decide. He has been holding a reaction in reserve for
   something that was already his.

   The app's share of the blame is exact: the row said "1d10 Fire retaliation"
   and left the price blank, and a blank price at a table reads as expensive.
   ========================================================================= */

describe('isFreeRider — a die with its own trigger and no named price', () => {
  it('marks canon\'s retaliation, which is the sentence Marcus had backwards', () => {
    expect(isFreeRider('1d10 Fire to a creature that hits you with a melee attack')).toBe(true)
  })

  it('leaves the damage a feature ALREADY charged for alone', () => {
    /* Smoldering Smite's "1d8 Fire" is the damage the Smite you cast is made of.
       It states no trigger of its own, so it is not a rider and is not free —
       and marking it so would be the app telling Marcus a spell slot is free. */
    expect(isFreeRider('1d8 Fire')).toBe(false)
  })

  it('needs BOTH halves — a trigger alone is not enough', () => {
    // A trigger that names its price is exactly the case this must not mark.
    expect(isFreeRider('When you are hit, you can take a Reaction to deal 1d6 Fire')).toBe(false)
    expect(isFreeRider('When you hit, expend one use to deal 2d8 Radiant')).toBe(false)
    expect(isFreeRider('Whenever you spend a spell slot, deal 1d8 more')).toBe(false)
  })

  it('needs BOTH halves — a price-free value with no trigger is not a rider either', () => {
    expect(isFreeRider('3d6 Necrotic')).toBe(false)
    expect(isFreeRider('')).toBe(false)
  })

  it('is read off the whole corpus, so a THIRD free rider would be found too', () => {
    /* The rule, not the two records that satisfy it today. Canon's next package
       is allowed to add one, and it will be marked without an edit here. */
    expect(isFreeRider('When the ward breaks, the attacker takes 2d6 Cold')).toBe(true)
  })

  it('reaches the fact — the cloak\'s die carries `free`, the temp HP does not', () => {
    const facts = featureFacts(featureByName('Hearthfire Manifest'), NIX_CTX)
    expect(facts.find(f => f.key === 'retaliation')!.free).toBe(true)
    // Only a DIE is asked the price question. Marking a duration "free" is noise
    // where the whole point is a signal.
    expect(facts.find(f => f.key === 'tempHP')!.free).toBeUndefined()
    expect(facts.find(f => f.key === 'duration')!.free).toBeUndefined()
  })

  it('changes what the row SAYS and not one thing it COMPUTES', () => {
    // Slice 8b's law, applied to a correction rather than a ruling.
    const facts = featureFacts(featureByName('Hearthfire Manifest'), NIX_CTX)
    const retaliation = facts.find(f => f.key === 'retaliation')!
    expect(retaliation.value).toBe('1d10 Fire retaliation')
    expect(retaliation.raw).toBe('1d10 Fire to a creature that hits you with a melee attack')
    expect(facts.find(f => f.key === 'tempHP')!.value).toBe('12 temp HP')
  })
})
