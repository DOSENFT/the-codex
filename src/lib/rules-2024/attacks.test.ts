// ---------------------------------------------------------------------------
// rules-2024/attacks — Extra Attack, tests 5 to 8 of the amended Gate 3 plan
// ---------------------------------------------------------------------------
//
// Marcus's second complaint: "It also doesnt allow me to take my two mele
// attacks." He is a Paladin past level 5, so under the 2024 rules his Attack
// action contains two — and nothing in this repo knew that until this file's
// subject existed. Every assertion here is therefore a claim about the RULES,
// not a characterization of prior behaviour, and each one is red against the
// build that shipped this morning for the simplest possible reason: there was
// no `attacksPerAction` to ask.
//
// THE SHAPE OF THE FAILURE THIS FILE GUARDS. Two attacks is the pleasant half.
// The dangerous half is ONE attack claimed as two — an app that offers Marcus a
// swing he does not have makes him take it, and a DM who catches the app lying
// once stops letting him use it. So the negative cases outnumber the positive
// ones below, and the unknown-class case is the loudest of them.

import { describe, it, expect } from 'vitest'
import type { Character, ClassFeature } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { TIDEWRIGHT } from '../turn/fixtures/openworld'
import { composeTurn } from '../turn/compose'
import type { TurnOption } from '../turn/types'
import { attacksPerAction, isWeaponAttack, EXTRA_ATTACK_AT } from './attacks'

/** A sheet with one thing changed. Built off NIX rather than from a literal so
 *  these stay characters the rest of the app would accept — a hand-rolled
 *  object with three fields would let this file pass while the real shape
 *  drifted underneath it. */
const as = (over: Partial<Character>): Character => ({ ...NIX, ...over })

const feature = (name: string, level?: number): ClassFeature => ({
  name,
  level: level ?? 1,
  description: 'fixture',
})

describe('5. the boundary is level 5, and it is the whole rule', () => {
  it('a level 7 Paladin has 2 attacks; a level 4 Paladin has 1', () => {
    expect(attacksPerAction(as({ class: 'Paladin', level: 7 }))).toBe(2)
    expect(attacksPerAction(as({ class: 'Paladin', level: 4 }))).toBe(1)
  })

  it('gains it AT 5, not after it — the off-by-one that would cost him a turn', () => {
    expect(attacksPerAction(as({ class: 'Paladin', level: 5 }))).toBe(2)
  })

  it('answers for the fixture as it actually ships, not only for made-up levels', () => {
    // NIX is a level 8 Paladin. If this ever disagrees with the two lines
    // above, the fixture moved and every downstream slice is testing a
    // character Marcus does not have.
    expect(NIX.class).toBe('Paladin')
    expect(NIX.level).toBeGreaterThanOrEqual(5)
    expect(attacksPerAction(NIX)).toBe(2)
  })

  it('gives the four other martial classes the same single tier', () => {
    for (const cls of ['Barbarian', 'Monk', 'Ranger', 'Fighter']) {
      expect(attacksPerAction(as({ class: cls, level: 4 }))).toBe(1)
      expect(attacksPerAction(as({ class: cls, level: 5 }))).toBe(2)
    }
  })

  it('gives the Fighter the two tiers above that, as the app already promises', () => {
    /* `mechanics-reference.ts` tells the player in the app: "Fighters get the
       most: 2 attacks at level 5, 3 at level 11, and 4 at level 20." The Gate 3
       signature was amended mid-slice R4 because it could not hold this, and
       this is the test that amendment exists for. An engine that contradicts
       the reference text shipped beside it is a companion app arguing with
       itself at the table. */
    const fighter = (level: number) => attacksPerAction(as({ class: 'Fighter', level }))
    expect(fighter(10)).toBe(2)
    expect(fighter(11)).toBe(3)
    expect(fighter(19)).toBe(3)
    expect(fighter(20)).toBe(4)
    // …and no other class has a second tier to reach.
    expect(attacksPerAction(as({ class: 'Paladin', level: 20 }))).toBe(2)
  })

  it('reads a class name a human typed, not an exact key', () => {
    // `character.class` is free text. "Paladin (Oath of the Hearth)" is the
    // shape a real export takes, and matching it exactly would silently drop
    // every sheet that says anything more than the bare word.
    for (const written of ['paladin', 'PALADIN', 'Paladin (Oath of the Hearth)']) {
      expect(attacksPerAction(as({ class: written, level: 7 }))).toBe(2)
    }
  })
})

describe('6. an unknown class answers 1 — homebrew must not manufacture a swing', () => {
  it('the open-world fixture gets one attack, at level 7', () => {
    // TIDEWRIGHT is a "Tidewright", a class this table has never heard of and
    // never will. Level 7 is past every boundary in the book, which is exactly
    // why it is the right sheet to ask: the wrong answer here is generous.
    expect(TIDEWRIGHT.level).toBeGreaterThanOrEqual(5)
    expect(EXTRA_ATTACK_AT[TIDEWRIGHT.class.toLowerCase()]).toBeUndefined()
    expect(attacksPerAction(TIDEWRIGHT)).toBe(1)
  })

  it('and so does every class the 2024 rules give no Extra Attack', () => {
    for (const cls of ['Rogue', 'Wizard', 'Cleric', 'Druid', 'Sorcerer', 'Bard', 'Warlock']) {
      expect(attacksPerAction(as({ class: cls, level: 20 }))).toBe(1)
    }
  })

  it('never answers less than 1, whatever the sheet is missing', () => {
    /* THE FLOOR, ASSERTED AGAINST GARBAGE. These objects should not exist, but
       this one round-trips localStorage from builds that predate half the
       fields, and a character screen that renders zero options because a level
       came back as a string is a worse bug than the one being fixed. */
    const junk: unknown[] = [
      as({ class: '', level: 0 }),
      as({ class: undefined as unknown as string, level: 7 }),
      as({ class: 'Paladin', level: undefined as unknown as number }),
      as({ class: 'Paladin', level: NaN }),
      as({ class: 'Paladin', level: '7' as unknown as number }),
      {},
    ]
    for (const c of junk) expect(attacksPerAction(c as Character)).toBe(1)
  })
})

describe('7. a sheet listing Extra Attack overrides class and level', () => {
  it('gives a Valour Bard the second swing the class table cannot know about', () => {
    // College of Valour grants Extra Attack at 6 — from a SUBCLASS, which is
    // not a function of class and level and so is structurally invisible to
    // the table. The sheet is the only thing that can say so, and it does.
    const bard = as({
      class: 'Bard',
      subclass: 'College of Valour',
      level: 6,
      features: [...NIX.features, feature('Extra Attack', 6)],
    })
    expect(attacksPerAction(as({ class: 'Bard', level: 6 }))).toBe(1)
    expect(attacksPerAction(bard)).toBe(2)
  })

  it('matches the feature by name however it was written down', () => {
    for (const written of ['Extra Attack', 'extra attack', 'Extra  Attack']) {
      const sheet = as({ class: 'Rogue', level: 7, features: [feature(written, 5)] })
      expect(attacksPerAction(sheet)).toBe(2)
    }
  })

  it('does not believe a feature the sheet says he has not reached yet', () => {
    // A character builder writes the whole class table onto the sheet with the
    // level each entry is GAINED at. Reading that as "has it" would hand a
    // level 3 Bard a swing out of his own forward planning.
    const early = as({ class: 'Bard', level: 3, features: [feature('Extra Attack', 6)] })
    expect(attacksPerAction(early)).toBe(1)
    // …and the moment he reaches it, it counts.
    expect(attacksPerAction({ ...early, level: 6 })).toBe(2)
  })

  it('can only ever ADD a swing, never take one away', () => {
    /* The two sources arbitrate by max, and this is the case that proves it
       matters. A level 11 Fighter whose sheet ALSO lists Extra Attack has
       three attacks, not the two a naive "the sheet wins" override would give
       him — the feature line says "you have Extra Attack" and can never say
       "you have three of them". */
    const fighter = as({
      class: 'Fighter',
      level: 11,
      features: [feature('Extra Attack', 5)],
    })
    expect(attacksPerAction(fighter)).toBe(3)
  })

  it('and the fixture does NOT rely on it — Nix answers from class and level', () => {
    // The reason `attacksPerAction` reads class+level at all. Nix's real export
    // lists Divine Smite, Hearthfire Manifest and the auras; Extra Attack is
    // not written down anywhere on it. A sheet-only rule would have left
    // Marcus's actual complaint unfixed.
    expect(NIX.features.some(f => f.name.toLowerCase() === 'extra attack')).toBe(false)
    expect(attacksPerAction(NIX)).toBe(2)
  })
})

describe('8. an opportunity attack is not a weapon attack for this purpose', () => {
  const turn = composeTurn({ character: NIX, combat: null })
  const all: TurnOption[] = [...turn.ranked, ...turn.rest]
  const find = (p: (o: TurnOption) => boolean) => {
    const hit = all.find(p)
    expect(hit, 'the composed turn no longer contains this option').toBeDefined()
    return hit!
  }

  it('says yes to the swing that costs his Action', () => {
    const sword = find(o => o.name === 'Hearthbrand')
    expect(sword.kind).toBe('attack')
    expect(isWeaponAttack(sword)).toBe(true)
  })

  it('says no to the one that costs his Reaction', () => {
    /* THE CASE THE 5E RULE EXPLICITLY EXCLUDES, and `mechanics-reference.ts`
       says it in the app's own words: Extra Attack "does not apply to
       opportunity attacks, bonus action attacks, or reaction attacks".

       This is also the shape that would break QUIETLY. The composer builds the
       Opportunity Attack from the weapon option itself, so it carries
       `kind: 'attack'` too — a rule that checked only the kind would start a
       two-swing Attack action on someone ELSE's turn and hold Marcus's Action
       open across the round. */
    const oa = find(o => o.name.startsWith('Opportunity Attack'))
    expect(oa.kind).toBe('attack')
    expect(oa.cost.slot).toBe('reaction')
    expect(isWeaponAttack(oa)).toBe(false)
  })

  it('says no to a bonus-action attack, whatever it is called', () => {
    // Asserted through a synthesised option rather than by finding one on the
    // sheet, because Nix has no bonus-action weapon attack and the rule has to
    // hold for the sheets that do (two-weapon fighting, the Nick mastery).
    const sword = find(o => o.name === 'Hearthbrand')
    const offhand: TurnOption = {
      ...sword,
      id: `${sword.id}-offhand`,
      cost: { ...sword.cost, slot: 'bonusAction' },
    }
    expect(isWeaponAttack(offhand)).toBe(false)
  })

  it('says no to every spell and feature that costs the same Action', () => {
    // The other half of the boundary. `slot === 'action'` alone would sweep in
    // Bless, Sacred Flame and Warding Bond, and mid-Attack the engine would
    // then treat casting as another swing.
    const others = all.filter(o => o.cost.slot === 'action' && o.kind !== 'attack')
    expect(others.length).toBeGreaterThan(0)
    for (const o of others) expect(isWeaponAttack(o)).toBe(false)
  })

  it('does not read the name, the source or the synthetic flag', () => {
    /* A rule that pattern-matched "Opportunity Attack" would be defeated by the
       first homebrew reaction called something else — and open-world content is
       the thing this repo is built to respect. Proven by taking the real
       opportunity attack, giving it an Action's price and nothing else, and
       watching the answer flip on the slot alone. */
    const oa = find(o => o.name.startsWith('Opportunity Attack'))
    expect(isWeaponAttack({ ...oa, cost: { ...oa.cost, slot: 'action' } })).toBe(true)
    const renamed = find(o => o.name === 'Hearthbrand')
    expect(isWeaponAttack({ ...renamed, name: 'Tidal Rebuke', synthetic: true })).toBe(true)
  })

  it('survives an option missing the fields it reads', () => {
    // Same floor as `attacksPerAction`'s: this is called in a render path, and
    // throwing there blanks the combat tab.
    expect(isWeaponAttack({} as TurnOption)).toBe(false)
    expect(isWeaponAttack(undefined as unknown as TurnOption)).toBe(false)
  })
})

describe('the table itself', () => {
  it('lists only classes that gain it, in ascending order, with no zeroth tier', () => {
    // The table is data, and data is where a plausible-looking wrong number
    // hides best. Every tier must be a real level and they must climb, or
    // `filter(at => level >= at)` counts them in an order that means nothing.
    for (const [cls, tiers] of Object.entries(EXTRA_ATTACK_AT)) {
      expect(tiers.length, cls).toBeGreaterThan(0)
      expect([...tiers], cls).toEqual([...tiers].sort((a, b) => a - b))
      for (const at of tiers) {
        expect(at, cls).toBeGreaterThanOrEqual(1)
        expect(at, cls).toBeLessThanOrEqual(20)
      }
    }
  })

  it('has no entry for a class the 2024 rules do not grant it to', () => {
    for (const cls of ['rogue', 'wizard', 'cleric', 'druid', 'sorcerer', 'bard', 'warlock']) {
      expect(EXTRA_ATTACK_AT[cls], cls).toBeUndefined()
    }
  })
})
