// A realistic mid-campaign character, seeded so every surface renders with real state
// instead of empty states. Mid-fight on purpose: wounded, concentrating, slots spent,
// conditions in play — the condition the app is actually judged in.
//
// Shapes mirror `src/lib/character.ts`. Keys mirror the CHAR_PREFIX / ROSTER_KEY /
// ACTIVE_ID_KEY constants at character.ts:369-372.

const ID = 'seed-vaelin-0001';
const NOW = '2026-08-15T19:00:00.000Z';

const spell = (o) => ({
  school: 'Evocation', castingTime: '1 action', range: 'Self', components: 'V, S',
  duration: 'Instantaneous', concentration: false, ritual: false, prepared: true,
  description: '', source: 'PHB', ...o,
});

export const CHARACTER = {
  id: ID,
  name: 'Vaelin Ashgrove',
  class: 'Paladin',
  subclass: 'Oath of Vengeance',
  race: 'Half-Elf',
  level: 8,
  gender: 'Male',
  pronouns: 'he/him',
  spellcastingAbility: 'Charisma',
  spellSaveDC: 16,
  spellAttackBonus: 8,
  proficiencyBonus: 3,
  armorClass: 19,

  // Mid-fight: hurt, but standing.
  hitPoints: { max: 76, current: 41 },
  tempHP: 5,
  conditions: ['Concentrating', 'Frightened'],
  deathSaves: { successes: 0, failures: 0 },

  abilityScores: { STR: 18, DEX: 10, CON: 16, INT: 9, WIS: 12, CHA: 18 },
  skillProficiencies: ['Athletics', 'Intimidation', 'Persuasion', 'Insight'],
  skillExpertise: [],
  savingThrowProficiencies: ['WIS', 'CHA'],

  weapons: [
    {
      name: 'Oathkeeper', attackType: 'melee', abilityMod: 'STR', proficient: true,
      damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'],
      magical: true, bonusToHit: 1, bonusDamage: 1, range: '5 ft',
      masteryProperty: 'Sap',
      description: 'A longsword rebound in ash-oak after the siege at Emberfall.',
      specialAbilities: [{
        name: 'Vow of Enmity', trigger: '1/short rest',
        effect: 'Advantage on attacks against one creature for 1 minute.',
      }],
    },
    {
      name: 'Javelin', attackType: 'ranged', abilityMod: 'STR', proficient: true,
      damageDice: '1d6', damageType: 'Piercing', properties: ['Thrown'], range: '30/120 ft',
    },
  ],

  canPrepareSpells: true,
  maxPreparedSpells: 8,
  spellSlots: { 1: { max: 4, current: 2 }, 2: { max: 3, current: 1 }, 3: { max: 2, current: 2 } },
  spells: [
    spell({ name: 'Divine Smite', level: 1, school: 'Evocation', castingTime: 'Special',
      range: 'Self', damageDice: '2d8', damageType: 'Radiant',
      description: 'Expend a slot on a melee hit for extra radiant damage.',
      higherLevels: '+1d8 per slot level above 1st, +1d8 vs undead or fiend.',
      tacticalNote: 'The whole point of the class. Spend it on a crit.' }),
    spell({ name: 'Bless', level: 1, school: 'Enchantment', castingTime: '1 action',
      range: '30 feet', components: 'V, S, M', duration: 'Concentration, up to 1 minute',
      concentration: true, description: 'Up to three creatures add 1d4 to attacks and saves.',
      tacticalNote: 'Cast turn one. It outperforms almost anything else you could do.' }),
    spell({ name: 'Shield of Faith', level: 1, school: 'Abjuration', castingTime: '1 bonus action',
      range: '60 feet', duration: 'Concentration, up to 10 minutes', concentration: true,
      description: '+2 AC to one creature.' }),
    spell({ name: 'Compelled Duel', level: 1, school: 'Enchantment', castingTime: '1 bonus action',
      range: '30 feet', duration: 'Concentration, up to 1 minute', concentration: true,
      saveType: 'WIS', prepared: false, description: 'Force a creature to fight only you.' }),
    spell({ name: 'Hold Person', level: 2, school: 'Enchantment', castingTime: '1 action',
      range: '60 feet', duration: 'Concentration, up to 1 minute', concentration: true,
      saveType: 'WIS', description: 'Paralyse a humanoid.',
      tacticalNote: 'Paralysed means every hit within 5 ft is a crit. Smite the crit.' }),
    spell({ name: 'Misty Step', level: 2, school: 'Conjuration', castingTime: '1 bonus action',
      range: 'Self', components: 'V', description: 'Teleport 30 feet.' }),
    spell({ name: 'Magic Weapon', level: 2, school: 'Transmutation', castingTime: '1 bonus action',
      range: 'Touch', duration: 'Concentration, up to 1 hour', concentration: true,
      prepared: false, description: 'A weapon becomes +1.' }),
    spell({ name: 'Haste', level: 3, school: 'Transmutation', castingTime: '1 action',
      range: '30 feet', duration: 'Concentration, up to 1 minute', concentration: true,
      description: 'Double speed, +2 AC, advantage on DEX saves, one extra action.',
      tacticalNote: 'Losing concentration costs the target a turn. Guard it.' }),
    spell({ name: 'Revivify', level: 3, school: 'Necromancy', castingTime: '1 action',
      range: 'Touch', components: 'V, S, M (300gp diamond)',
      description: 'Return a creature dead less than a minute to life with 1 hp.' }),
    spell({ name: 'Sacred Flame', level: 0, school: 'Evocation', range: '60 feet',
      damageDice: '2d8', damageType: 'Radiant', saveType: 'DEX',
      description: 'Radiant flame descends on a creature you can see.' }),
  ],

  features: [
    { name: 'Lay on Hands', level: 1, description: 'A pool of healing equal to five times your level.',
      usesPerRest: 'long', actionType: 'action', range: 'Touch', category: 'class' },
    { name: 'Divine Sense', level: 1, description: 'Detect celestial, fiend, or undead within 60 feet.',
      usesPerRest: 'long', usesMax: 5, usesCurrent: 3, actionType: 'action', category: 'class' },
    { name: 'Channel Divinity: Vow of Enmity', level: 3,
      description: 'Bonus action. Advantage on attacks against one creature for 1 minute.',
      usesPerRest: 'short', usesMax: 1, usesCurrent: 0, actionType: 'bonusAction',
      range: '10 feet', duration: '1 minute', category: 'subclass',
      tacticalNote: 'Free advantage means more crits, and crits are where smites pay.' },
    { name: 'Channel Divinity: Abjure Enemy', level: 3,
      description: 'Frighten one creature; its speed drops to 0 on a failed save.',
      usesPerRest: 'short', usesMax: 1, usesCurrent: 0, actionType: 'action',
      range: '60 feet', saveType: 'WIS', category: 'subclass' },
    { name: 'Aura of Protection', level: 6,
      description: 'You and allies within 10 feet add your Charisma modifier to saving throws.',
      usesPerRest: 'unlimited', actionType: 'passive', range: '10 feet', category: 'class',
      tacticalNote: 'Stand close to the squishy ones. This is your best feature and it is passive.' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action.',
      usesPerRest: 'unlimited', actionType: 'passive', category: 'class' },
    { name: 'Relentless Avenger', level: 7,
      description: 'On an opportunity attack hit, move up to half your speed as part of the reaction.',
      usesPerRest: 'unlimited', actionType: 'reaction', category: 'subclass' },
    { name: 'Fey Ancestry', level: 1, description: 'Advantage against being charmed; magic cannot put you to sleep.',
      usesPerRest: 'unlimited', actionType: 'passive', category: 'racial' },
  ],

  paladinResources: {
    layOnHands: { max: 40, current: 15 },
    channelDivinity: { max: 1, current: 0 },
    auraRange: 10,
  },

  feats: [{
    name: 'Great Weapon Master', description: 'Heavy weapon specialist.',
    source: 'PHB', isHomebrew: false,
    effects: ['On a crit or kill, bonus action attack', '-5 to hit for +10 damage'],
    tacticalNote: 'Only take the -5 when you have advantage or the target AC is low.',
  }],

  equipment: ['Plate armour', 'Shield (emblazoned with a broken crown)', 'Holy symbol of the Ashen Vow',
    "Explorer's pack", 'Rope, hempen (50 ft)', 'Signet ring of House Ashgrove'],
  supplies: ['Potion of Healing x3', 'Potion of Greater Healing x1', 'Diamond (300gp) x1', 'Rations x5'],

  homebrewNotes: 'Oathkeeper hums faintly when an oathbreaker is within 30 feet. DM ruling: advantage on Insight to detect a lie told by someone who has broken a sworn word.',

  persona: {
    defaultState: 'Watchful and courteous, standing a half-step closer than is comfortable.',
    decisionTree: 'Protect first. Ask second. Forgive only after the debt is paid.',
    physicalTics: ['Thumbs the notch in his sword hilt when lying',
      'Straightens other people\'s collars mid-conversation',
      'Never sits with his back to a door'],
    sceneInstincts: ['Steps between the threat and the youngest person present',
      'Answers a question with the oath it touches',
      'Goes very quiet before he goes very loud'],
    quietTexture: ['Polishes armour that is already clean', 'Hums a hymn he refuses to name'],
    patron: {
      name: 'The Ashen Vow', domains: ['Vengeance', 'Memory', 'Oaths'],
      symbol: 'A broken crown above a still-burning coal',
      rpNotes: 'Not a god. A promise made by the dead of Emberfall, kept by whoever is still standing.',
    },
    voiceNotes: 'Low, unhurried, faint Highland burr. Rolls his R\'s only when angry — the tell.',
    catchphrases: ['"I gave my word."', '"Then it will have to be me."', '"Ash remembers."'],
    wants: ['To find the officer who gave the order at Emberfall', 'To deserve the sword he carries'],
    fears: ['That vengeance is the only thing holding him together',
      'Becoming the thing he swore against'],
    pressureResponse: 'Gets quieter and more polite. The politeness is the warning.',
    lastEditedAt: NOW,
  },

  backstory: {
    origin: 'Second son of a minor house, sent to the Emberfall garrison to be made useful. He was the only one who walked out.',
    keyMemories: [
      { id: 'm1', title: 'The Order to Hold', description: 'The command came to hold the gate. Two hundred did. He was sent for water.',
        emotionalCore: 'survivor guilt', npcInvolved: 'Captain Roewen' },
      { id: 'm2', title: 'The Vow in the Ash', description: 'He swore over the coals the next morning. Nobody witnessed it. He counts that as binding.',
        emotionalCore: 'resolve' },
      { id: 'm3', title: 'The Letter He Never Sent', description: 'Six drafts to his mother explaining why he did not die. All burned.',
        emotionalCore: 'shame' },
    ],
    relationships: [
      { name: 'Captain Roewen', relation: 'commanding officer', status: 'missing' },
      { name: 'Lady Ashgrove', relation: 'mother', status: 'estranged' },
      { name: 'Bram', relation: 'brother', status: 'dead' },
      { name: 'Sister Vessa', relation: 'confessor', status: 'alive' },
    ],
    unresolvedThreads: ['Who ordered the garrison to hold?',
      'Roewen was seen alive in Karthis three months ago',
      'The sword was not his to take'],
    personalitySeeds: ['Courtesy as armour', 'Cannot abandon a position', 'Distrusts nobility, is nobility'],
  },

  customHooks: [],
  createdAt: '2026-03-02T12:00:00.000Z',
  updatedAt: NOW,
};

export const ROSTER = [{
  id: ID, name: CHARACTER.name, class: CHARACTER.class,
  subclass: CHARACTER.subclass, level: CHARACTER.level, updatedAt: NOW,
}];

/**
 * Everything the app needs in localStorage to boot straight into a live session.
 * `codex-active-id` and `codex-app-mode` are stored as raw strings, not JSON —
 * see character.ts:477 and App.tsx:17.
 */
export function seedEntries(mode = 'session') {
  return {
    'codex-roster': JSON.stringify(ROSTER),
    'codex-active-id': ID,
    [`codex-character-${ID}`]: JSON.stringify(CHARACTER),
    'codex-app-mode': mode,
  };
}

export const CHARACTER_ID = ID;
