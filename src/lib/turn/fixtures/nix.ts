// ---------------------------------------------------------------------------
// Nix — the seeded state
// ---------------------------------------------------------------------------
//
// Changeling Paladin 8, Oath of the Hearth (homebrew).  Marcus's actual
// character, reconstructed from inject-nix-backstory.js and the subclass text
// in dnd-data.ts:182-206 — not invented demo data.  Homebrew is the main case
// here, not an edge case, so the fixture carries it from the very first test.
//
// THE `level: 8` BELOW IS NOT A CLAIM ABOUT MARCUS'S CHARACTER.  **Nix is level
// 7** (confirmed by Marcus 2026-08-27, slice 8b).  The fixture sits one level
// above him on purpose, because level 8 is the lowest level that reaches every
// branch listed below — notably "written down but not yet castable" (Fireball
// unlocks at 9) alongside a full 2nd-tier slot table.  If you change this number
// to 7 to "make it match", several branches below stop being exercised and the
// characterization suite silently gets weaker.  Change the number only together
// with the branches, and never because it looked wrong next to his sheet.
// Anything that must be true of MARCUS at the table is proved in the browser
// provers (`docs/plans/table-truth/prove-slice*.mjs`), which seed level 7.
//
// It is typed as `Character`, which means `tsc` checks it against the real
// interface.  That is deliberate: the Slice 1 screenshot run died because a
// hand-rolled seed used `currentHP` instead of `hitPoints.current`, and an
// untyped fixture would let that happen again.
//
// Every branch of categorizeTurnOptions() is reachable from this one object:
// magical/mastery/special-ability weapons and a plain one; a cantrip that
// skips the slot check; a prepared spell with no slot tier; an unprepared
// spell; features above level; a feature with its uses spent; passives.
// If you add to it, keep that property — the characterization suite is only
// as good as the branches this fixture reaches.
//
// NOTE ON SLOTS: a Paladin 8 is a half-caster with 4×1st and 3×2nd and no 3rd
// tier at all.  Fireball is on the Oath of the Hearth list at level 9, so Nix
// has it written down and cannot yet cast it.  That is not a contrivance —
// it is why the "no slot tier" branch exists.

import type { Character } from '../../character'

export const NIX: Character = {
  id: 'nix-fixture',
  name: 'Nix',
  class: 'Paladin',
  subclass: 'Oath of the Hearth',
  race: 'Changeling',
  level: 8,

  spellcastingAbility: 'Charisma',
  spellSaveDC: 16,
  spellAttackBonus: 8,
  proficiencyBonus: 3,
  armorClass: 19,
  hitPoints: { max: 76, current: 41 },

  conditions: [],
  deathSaves: { successes: 0, failures: 0 },
  tempHP: 0,

  abilityScores: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 18 },
  skillProficiencies: ['Persuasion', 'Insight'],
  skillExpertise: [],
  savingThrowProficiencies: ['WIS', 'CHA'],

  // No feats. getFeatTips() therefore contributes nothing to any strategicTip
  // in this fixture, which keeps the pinned tip strings readable. Feat-tip
  // merging is real behaviour and is characterized separately.
  feats: [],

  weapons: [
    {
      // Everything on at once: magical, mastery, a special ability, a range.
      name: 'Hearthbrand',
      attackType: 'melee',
      abilityMod: 'STR',
      proficient: true,
      damageDice: '1d8',
      damageType: 'Slashing',
      properties: ['Versatile (1d10)'],
      magical: true,
      bonusToHit: 1,
      bonusDamage: 1,
      range: '5 ft',
      masteryProperty: 'Sap',
      specialAbilities: [
        { name: 'Banked Coals', trigger: 'On hit', effect: 'Deal 1d4 fire damage' },
      ],
    },
    {
      // Nothing on at all: no magic, no mastery, no range, no properties.
      // This is the option that reaches the 'Standard attack' fallback.
      name: 'Javelin',
      attackType: 'ranged',
      abilityMod: 'STR',
      proficient: true,
      damageDice: '1d6',
      damageType: 'Piercing',
      properties: [],
    },
  ],

  canPrepareSpells: true,
  maxPreparedSpells: 8,
  // 4x1st, 3x2nd, no 3rd tier — a Paladin 8. Two 1st are already spent.
  spellSlots: {
    1: { max: 4, current: 3 },
    2: { max: 3, current: 2 },
  },
  spells: [
    {
      name: 'Sacred Flame',
      level: 0,
      school: 'Evocation',
      castingTime: 'Action',
      range: '60 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'Flame-like radiance descends on a creature. It must succeed on a DEX save or take radiant damage. The target gains no benefit from cover.',
      saveType: 'DEX',
      damageDice: '2d8',
      damageType: 'Radiant',
      source: 'Homebrew',
    },
    {
      // D&D 2024: Divine Smite is a 1st-level spell cast as a Bonus Action.
      name: 'Divine Smite',
      level: 1,
      school: 'Evocation',
      castingTime: 'Bonus Action',
      range: 'Self',
      components: 'V',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'Your weapon flares with radiance. The target takes extra radiant damage.',
      damageDice: '2d8',
      damageType: 'Radiant',
      tacticalNote: 'Wait for a hit before spending the slot.',
    },
    {
      name: 'Cure Wounds',
      level: 1,
      school: 'Abjuration',
      castingTime: 'Action',
      range: 'Touch',
      components: 'V, S',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'A creature you touch regains hit points.',
      damageDice: '2d8',
    },
    {
      name: 'Shield of Faith',
      level: 1,
      school: 'Abjuration',
      castingTime: 'Bonus Action',
      range: '60 feet',
      components: 'V, S, M',
      duration: '10 minutes',
      concentration: true,
      ritual: false,
      prepared: true,
      description: 'A shimmering field appears and surrounds a creature, granting it +2 bonus to AC.',
    },
    {
      name: 'Misty Step',
      level: 2,
      school: 'Conjuration',
      castingTime: 'Bonus Action',
      range: 'Self',
      components: 'V',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.',
    },
    {
      // Oath of the Hearth, level 5 oath spell.
      name: 'Warding Bond',
      level: 2,
      school: 'Abjuration',
      castingTime: 'Action',
      range: 'Touch',
      components: 'V, S, M',
      duration: '1 hour',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'You create a bond with a willing creature. It gains +1 AC and saves, and resistance to all damage; you take the damage it takes.',
      source: 'Oath of the Hearth',
    },
    {
      // Prepared, but Nix has no 3rd-level slot tier at all. Dropped today.
      name: 'Fireball',
      level: 3,
      school: 'Evocation',
      castingTime: 'Action',
      range: '150 feet',
      components: 'V, S, M',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      prepared: true,
      description: 'A bright streak flashes to a point you choose and blossoms into flame.',
      saveType: 'DEX',
      damageDice: '8d6',
      damageType: 'Fire',
      source: 'Oath of the Hearth',
    },
    {
      // Known but not prepared. Dropped today.
      name: 'Bless',
      level: 1,
      school: 'Enchantment',
      castingTime: 'Action',
      range: '30 feet',
      components: 'V, S, M',
      duration: '1 minute',
      concentration: true,
      ritual: false,
      prepared: false,
      description: 'You bless up to three creatures. They add 1d4 to attack rolls and saving throws.',
    },
  ],

  features: [
    {
      // D&D 2024: Lay on Hands is a Bonus Action.
      name: 'Lay on Hands',
      level: 1,
      description: 'You have a pool of healing power. As a Bonus Action, you can touch a creature and restore hit points from the pool.',
      actionType: 'bonusAction',
      range: 'Touch',
      usesPerRest: 'long',
      usesMax: 40,
      usesCurrent: 15,
      category: 'class',
    },
    {
      // Uses spent. Dropped today.
      name: 'Divine Sense',
      level: 1,
      description: 'You can sense the presence of celestials, fiends, and undead.',
      actionType: 'bonusAction',
      usesPerRest: 'long',
      usesMax: 4,
      usesCurrent: 0,
      category: 'class',
    },
    {
      name: 'Channel Divinity: Sacred Weapon',
      level: 3,
      description: 'You imbue your weapon with positive energy, adding your Charisma modifier to attack rolls.',
      actionType: 'bonusAction',
      usesPerRest: 'short',
      usesMax: 2,
      usesCurrent: 1,
      duration: '1 minute',
      category: 'class',
    },
    {
      name: 'Hearthfire Manifest',
      level: 3,
      description: 'A manifestation sheds bright light 10ft and dim light 10ft more. Summon or dismiss it as a Bonus Action.',
      actionType: 'bonusAction',
      range: '30 feet',
      source: 'Homebrew',
      category: 'subclass',
      tacticalNote: 'Keep it out before the fight so the Reaction is live.',
    },
    {
      name: 'Flaming Cloak',
      level: 3,
      description: 'Expend one Channel Divinity use to transform your manifestation into a flaming cloak. Gain temporary hit points equal to your Paladin level plus your spellcasting modifier.',
      actionType: 'reaction',
      damageDice: '1d10',
      damageType: 'Fire',
      usesPerRest: 'short',
      usesMax: 2,
      usesCurrent: 1,
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      name: 'Aura of Protection',
      level: 6,
      description: 'You and friendly creatures within 10 feet of you gain a bonus to saving throws equal to your Charisma modifier.',
      actionType: 'passive',
      range: '10 feet',
      category: 'class',
    },
    {
      name: 'Aura of Solace',
      level: 7,
      description: 'You and allies within your Aura of Protection have resistance to Fire, Cold, and Psychic damage.',
      actionType: 'passive',
      range: '10 feet',
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      // Level 15. Above Nix's level — dropped today.
      name: 'Smoldering Smite',
      level: 15,
      description: 'When you cast Divine Smite, add 1d8 fire damage that ignores resistance and immunity to fire.',
      actionType: 'passive',
      source: 'Homebrew',
      category: 'subclass',
    },
    {
      // Level 20. Above Nix's level — dropped today.
      name: 'Hearth Warden',
      level: 20,
      description: 'As a Bonus Action, imbue your Aura of Protection with blazing flames for 10 minutes.',
      actionType: 'bonusAction',
      usesPerRest: 'long',
      usesMax: 1,
      usesCurrent: 1,
      source: 'Homebrew',
      category: 'subclass',
    },
  ],

  gender: 'Male',
  pronouns: 'he/him',
  equipment: ['Shield', 'Chain mail', "Rysanna's pendant"],
  supplies: ['Healing Potion x2'],

  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
}
