// ---------------------------------------------------------------------------
// The Tidewright — a character the engine has never met
// ---------------------------------------------------------------------------
//
// Slice 6c. NIX is the main case and is homebrew, but he is homebrew *around*
// a Paladin: he has `paladinResources`, his features are named "Lay on Hands"
// and "Channel Divinity", his weapon declares a 2024 mastery the table knows.
// Every one of those is a name the engine recognises, and a fixture that keeps
// hitting the recognised path cannot tell us what happens on the other one.
//
// So: nothing here is real. Not the class, not the subclass, not the species,
// not a single weapon, spell, feature, mastery, condition, or pool. If any
// name below ever starts matching something in `rules-2024/`, the test file
// that imports this fixture fails on purpose — see `openworld.test.ts`, which
// asserts the non-overlap rather than trusting this comment.
//
// The point is not that a Tidewright is a good subclass. The point is that
// Marcus's table will invent content this app has never heard of for as long
// as the campaign runs, and every one of those inventions has to compose,
// rank, spend and undo exactly as well as a Paladin does.
//
// Deliberate differences from NIX, each one covering a path he does not reach:
//   · NO `paladinResources` at all — the bespoke pool pair is optional.
//   · An authored pool measured in `dice` recharging at `dawn`. Nix's pools are
//     points/uses on rests; these two enum arms had no fixture.
//   · A feature with 'aura' in its NAME that is declared as an Action. Nix's
//     auras all declare `passive`, so his fixture cannot see the name sniff.
//   · A declared mastery no table knows, on a weapon name no table knows —
//     both halves of the lookup miss at once.
//   · A weapon with no mastery at all and an unknown name — the honest nothing.
//   · A condition Marcus wrote, currently ON him.

import type { Character } from '../../character'

/** The invented pool. Exported because the tests price against it and a
 *  literal repeated in three assertions is a literal that will drift. */
export const TALLY_ID = 'saltwater-tally'

export const TIDEWRIGHT: Character = {
  id: 'openworld-fixture',
  name: 'Vess Corrow',
  class: 'Tidewright',
  subclass: 'Vow of the Undertow',
  race: 'Saltborn',
  level: 7,

  spellcastingAbility: 'Wisdom',
  spellSaveDC: 15,
  spellAttackBonus: 7,
  proficiencyBonus: 3,
  armorClass: 16,
  hitPoints: { max: 58, current: 58 },

  // A condition of Marcus's own devising, and it is ON. `upon` must show it,
  // with his words, and the economy must obey what it says it does.
  conditions: ['Undertowed'],
  customConditions: [
    {
      name: 'Undertowed',
      blocks: ['reaction'],
      attacksAgainstYouHaveAdvantage: true,
      note: 'Dragged half a step out of the moment. You cannot take Reactions, and attacks against you have advantage, until you spend a Bonus Action to set your feet.',
    },
  ],

  deathSaves: { successes: 0, failures: 0 },
  tempHP: 0,

  abilityScores: { STR: 12, DEX: 16, CON: 14, INT: 10, WIS: 18, CHA: 8 },
  skillProficiencies: ['Athletics', 'Perception'],
  skillExpertise: [],
  savingThrowProficiencies: ['DEX', 'WIS'],
  feats: [],

  weapons: [
    {
      // Both halves of the mastery lookup miss: 'Brinehook' is not in the 2024
      // weapon table, and 'Undertow' is not a 2024 mastery property. The rider
      // must survive anyway, carrying Marcus's word and admitting `known:
      // false` rather than inventing a window for it.
      name: 'Brinehook',
      attackType: 'melee',
      abilityMod: 'DEX',
      proficient: true,
      damageDice: '1d8',
      damageType: 'Piercing',
      properties: ['Finesse'],
      range: '5 ft',
      masteryProperty: 'Undertow',
    },
    {
      // No mastery declared and an unknown name, so there is genuinely nothing
      // to say. Saying nothing is the correct answer; inventing one is not.
      name: "Tidewright's Lash",
      attackType: 'melee',
      abilityMod: 'DEX',
      proficient: true,
      damageDice: '1d6',
      damageType: 'Slashing',
      properties: ['Reach'],
    },
  ],

  // An authored pool. `dice` and `dawn` are the two enum arms Nix never
  // exercises, and an enum arm with no fixture is an enum arm nobody has run.
  resourcePools: [
    {
      id: TALLY_ID,
      name: 'Saltwater Tally',
      current: 6,
      max: 6,
      unit: 'dice',
      recharge: 'dawn',
      note: 'Rolled, not spent — the sea keeps its own count.',
    },
  ],

  canPrepareSpells: true,
  maxPreparedSpells: 4,
  spellSlots: {
    1: { max: 3, current: 3 },
  },
  spells: [
    {
      name: 'Drown the Lantern',
      level: 1,
      school: 'Illusion',
      castingTime: 'Action',
      range: '30 feet',
      components: 'S',
      duration: '1 minute',
      concentration: true,
      ritual: false,
      prepared: true,
      description: 'Light within range gutters and fails, as though held underwater.',
      source: 'Homebrew',
    },
  ],

  features: [
    {
      // THE ONE THAT WAS BROKEN. Declared an Action, in Marcus's own hand, and
      // filed as a passive anyway because the word 'aura' is in the name.
      name: 'Undertow Aura',
      level: 3,
      description: 'Water rises to your knees in a 10-foot radius. Enemies who start their turn in it lose 10 feet of movement.',
      actionType: 'action',
      range: '10 feet',
      resourcePoolId: TALLY_ID,
      resourceAmount: 2,
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      // Must join the bonus-action mutex alongside anything else that wants
      // the slot. Draws on its own counter, not the pool — both routes live.
      name: 'Riptide Step',
      level: 3,
      description: 'You are pulled 15 feet along the ground to an unoccupied space you can see.',
      actionType: 'bonusAction',
      range: 'Self',
      usesPerRest: 'short',
      usesMax: 3,
      usesCurrent: 3,
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      // The second bonus-action contender, so a mutex can actually form: one
      // option in a slot is not a choice. It is also the escape the homebrew
      // condition's own text names, which is the sort of thing Marcus writes
      // and the engine must never need to understand.
      name: 'Set Your Feet',
      level: 1,
      description: 'Plant yourself against the pull. Ends the Undertowed condition on you.',
      actionType: 'bonusAction',
      range: 'Self',
      // It has to COST something to contend: `findContention` only brackets
      // options that spend a slot or a pool, on the reasoning that two free
      // things are not a decision. So this draws one die of the tally — which
      // is also the better fiction.
      resourcePoolId: TALLY_ID,
      resourceAmount: 1,
      source: 'Homebrew',
      category: 'class',
    },
    {
      // A Reaction, and the condition currently on him closes that slot.
      name: 'Salt Ward',
      level: 5,
      description: 'Brine crusts over the wound. Reduce the damage by 1d10.',
      actionType: 'reaction',
      damageDice: '1d10',
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      // Genuinely passive, and says so.
      name: 'Brine-Marked',
      level: 1,
      description: 'You can breathe water, and you always know which way the tide is running.',
      actionType: 'passive',
      source: 'Homebrew',
      category: 'class',
    },
  ],

  gender: 'Non-binary',
  pronouns: 'they/them',
  equipment: ['Kelp-weave coat', 'Sounding line'],
  supplies: [],

  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
}
