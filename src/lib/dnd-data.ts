// D&D 2024 classes, races, subclasses
// This is used for the character setup dropdowns

export const CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard'
] as const

export const RACES = [
  'Aasimar', 'Changeling', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome',
  'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'
] as const

// 2024 PHB subclasses by class (+ homebrew entries + Custom option)
export const SUBCLASSES: Record<string, string[]> = {
  Barbarian: ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot', 'Custom (Homebrew)'],
  Bard: ['College of Dance', 'College of Glamour', 'College of Lore', 'College of Valor', 'Custom (Homebrew)'],
  Cleric: ['Life Domain', 'Light Domain', 'Trickery Domain', 'War Domain', 'Custom (Homebrew)'],
  Druid: ['Circle of the Land', 'Circle of the Moon', 'Circle of the Sea', 'Circle of the Stars', 'Custom (Homebrew)'],
  Fighter: ['Battle Master', 'Champion', 'Eldritch Knight', 'Psi Warrior', 'Custom (Homebrew)'],
  Monk: ['Warrior of Mercy', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of the Open Hand', 'Custom (Homebrew)'],
  Paladin: ['Oath of Devotion', 'Oath of Glory', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of the Hearth', 'Custom (Homebrew)'],
  Ranger: ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Hunter', 'Custom (Homebrew)'],
  Rogue: ['Arcane Trickster', 'Assassin', 'Soulknife', 'Thief', 'Custom (Homebrew)'],
  Sorcerer: ['Aberrant Sorcery', 'Clockwork Sorcery', 'Draconic Sorcery', 'Wild Magic Sorcery', 'Custom (Homebrew)'],
  Warlock: ['Archfey Patron', 'Celestial Patron', 'Fiend Patron', 'Great Old One Patron', 'Custom (Homebrew)'],
  Wizard: ['Abjurer', 'Diviner', 'Evoker', 'Illusionist', 'Custom (Homebrew)']
}

// Basic actions available to all characters in combat
export const BASIC_ACTIONS = [
  { name: 'Attack', type: 'Action', description: 'Make one melee or ranged attack (or more with Extra Attack).' },
  { name: 'Cast a Spell', type: 'Action', description: 'Cast a spell with a casting time of 1 Action.' },
  { name: 'Dash', type: 'Action', description: 'Double your movement speed for this turn.' },
  { name: 'Disengage', type: 'Action', description: 'Your movement doesn\'t provoke Opportunity Attacks for the rest of the turn.' },
  { name: 'Dodge', type: 'Action', description: 'Attack rolls against you have Disadvantage, and you have Advantage on DEX saves until your next turn.' },
  { name: 'Help', type: 'Action', description: 'Give an ally Advantage on their next ability check or attack roll against a target within 5ft of you.' },
  { name: 'Hide', type: 'Action', description: 'Make a Stealth check to become Hidden.' },
  { name: 'Influence', type: 'Action', description: 'Make a Charisma check to influence a creature\'s attitude.' },
  { name: 'Magic', type: 'Action', description: 'Use a magic item or interact with a magical effect.' },
  { name: 'Ready', type: 'Action', description: 'Prepare an action to trigger on a specific condition (uses your Reaction).' },
  { name: 'Search', type: 'Action', description: 'Make a Perception or Investigation check to find something.' },
  { name: 'Study', type: 'Action', description: 'Make a check to recall or discern information.' },
  { name: 'Utilize', type: 'Action', description: 'Use a non-magical object or interact with the environment.' },
  { name: 'Opportunity Attack', type: 'Reaction', description: 'When an enemy leaves your reach, make one melee attack as a Reaction.' },
]

// Spell slot table by class level (full casters)
export const FULL_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
}

// Half-caster spell slots (Paladin, Ranger)
export const HALF_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1:  {},
  2:  { 1: 2 },
  3:  { 1: 3 },
  4:  { 1: 3 },
  5:  { 1: 4, 2: 2 },
  6:  { 1: 4, 2: 2 },
  7:  { 1: 4, 2: 3 },
  8:  { 1: 4, 2: 3 },
  9:  { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
}

// Warlock Pact Magic slots
export const WARLOCK_SLOTS: Record<number, { slots: number; level: number }> = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
}

// Which classes are full/half/pact casters
export const CASTER_TYPE: Record<string, 'full' | 'half' | 'pact' | 'third' | 'none'> = {
  Barbarian: 'none',
  Bard: 'full',
  Cleric: 'full',
  Druid: 'full',
  Fighter: 'third', // Eldritch Knight only
  Monk: 'none',
  Paladin: 'half',
  Ranger: 'half',
  Rogue: 'third', // Arcane Trickster only
  Sorcerer: 'full',
  Warlock: 'pact',
  Wizard: 'full',
}

// Which classes prepare spells (2024 rules — Ranger now prepares too!)
export const PREPARES_SPELLS: Record<string, boolean> = {
  Barbarian: false,
  Bard: false, // Bard knows spells in 2024
  Cleric: true,
  Druid: true,
  Fighter: false,
  Monk: false,
  Paladin: true,
  Ranger: true, // NEW in 2024! Ranger prepares spells
  Rogue: false,
  Sorcerer: false,
  Warlock: false,
  Wizard: true,
}

// Spellcasting ability by class
export const SPELLCASTING_ABILITY: Record<string, string> = {
  Bard: 'Charisma',
  Cleric: 'Wisdom',
  Druid: 'Wisdom',
  Fighter: 'Intelligence', // Eldritch Knight
  Paladin: 'Charisma',
  Ranger: 'Wisdom',
  Rogue: 'Intelligence', // Arcane Trickster
  Sorcerer: 'Charisma',
  Warlock: 'Charisma',
  Wizard: 'Intelligence',
}

// Race-specific content for non-PHB or nuanced species — injected into AI prompts
export const RACE_CONTENT: Record<string, string> = {
  'Changeling': `SPECIES: Changeling (2024 Rules)
Creature Type: Fey
Size: Medium (4-7 feet) or Small (2-4 feet), chosen at character creation
Speed: 30 feet

TRAITS:
Changeling Instincts: You gain proficiency in two of the following skills of your choice: Deception, Insight, Intimidation, Performance, or Persuasion.

Shape-Shifter: As an Action, you can change your appearance and your voice. You determine the specifics of the changes, including your coloration, hair length, and sex. You can also adjust your height and weight and can change your size between Medium and Small. You can make yourself appear as a member of another playable species, though none of your game statistics change. You must maintain a similar arrangement of limbs, and you cannot replicate the appearance of an individual you have never seen. Clothing and equipment are not changed by this trait. You stay in the new form until you use an Action to revert to your true form or until you die.

While shape-shifted using this trait, you have Advantage on all Charisma checks.`,
}

// Homebrew subclass content — injected into AI prompts for accurate advice
export const HOMEBREW_CONTENT: Record<string, string> = {
  'Oath of the Hearth': `HOMEBREW SUBCLASS: Oath of the Hearth (Paladin)
Source: Homebrew — patron Astera is Aesis the Shepherd.
Tenets: Tend the hearth with holy effort. Gather those in need of warmth and rest. Guard the hearth with flame within and without.

OATH SPELLS (always prepared):
- Level 3: Faerie Fire, Burning Hands
- Level 5: Scorching Ray, Warding Bond
- Level 9: Fireball, Beacon of Hope
- Level 13: Wall of Fire, Fire Shield
- Level 17: Flame Strike, Hallow

SUBCLASS FEATURES:
Level 3 — Hearthfire Manifest: A manifestation (floating ember, dancing flame, or spirit) sheds bright light 10ft, dim light 10ft more. Range 30ft or extinguished. Summon/dismiss as Bonus Action. As a Reaction, expend one Channel Divinity use to transform it into a flaming cloak: gain Temporary HP equal to Paladin level + spellcasting ability modifier. While active, creatures hitting you with melee attacks take 1d10 Fire damage. Lasts until temp HP is depleted.

Level 7 — Aura of Solace: You and allies within your Aura of Protection have resistance to Fire, Cold, and Psychic damage.

Level 15 — Smoldering Smite: When you use a Magic action to cast Divine Smite, add 1d8 Fire damage to each smite. This Fire damage ignores resistance and immunity to Fire damage.

Level 20 — Hearth Warden: As a Bonus Action, imbue your Aura of Protection with blazing flames for 10 minutes (1/Long Rest, or restore by expending a level 5 spell slot, no action required).
  - Edge of Flame: Once per turn, choose one creature within your Aura (including yourself) to regain 10 HP.
  - Punishing Flame: Any creature you choose within your aura may add Fire damage equal to your Charisma modifier to their weapon attacks.
  - Swift Flame: Whenever you cast a spell with a casting time of an Action, you can cast it using a Bonus Action instead.`,
}

// Paladin-specific class actions with resource costs
export const PALADIN_ACTIONS = [
  {
    name: 'Divine Smite',
    type: 'Special' as const,
    description: 'When you hit with a melee weapon, cast Divine Smite as a Magic action (bonus action in some readings). Expend a spell slot to deal extra Radiant damage: 2d8 for a 1st-level slot, +1d8 per slot level above 1st (max 5d8). +1d8 vs. Undead or Fiend.',
    dice: '2d8 + 1d8/slot level',
    resourceCost: 'Spell Slot',
  },
  {
    name: 'Lay on Hands',
    type: 'Action' as const,
    description: 'Touch a creature and draw from your healing pool. Spend points to restore HP (1:1), or spend 5 points to cure one poison or disease.',
    dice: null,
    resourceCost: 'Lay on Hands Pool',
  },
  {
    name: 'Channel Divinity',
    type: 'Varies' as const,
    description: 'Use one of your Channel Divinity options. Oath of the Hearth: Hearthfire Manifest — as a Reaction, transform your manifestation into a flaming cloak granting temp HP (level + CHA mod). Melee attackers take 1d10 Fire.',
    dice: '1d10 Fire (retaliation)',
    resourceCost: 'Channel Divinity Use',
  },
] as const

// Astera's full character persona (Changeling Paladin, Oath of the Hearth)
export const ASTERA_PERSONA = {
  defaultState: 'Still, warm, watchful — like a banked coal. Quiet unless quiet breaks someone.',
  decisionTree: 'Tend first (heal, mend, feed). If tending fails, Gather (pull the group together, plan). If gathering fails, Guard (put yourself between the threat and those in need). Violence is the last hearth-tool, not the first.',
  physicalTics: [
    'Adjusts gear that doesn\'t need adjusting — especially straps, buckles, cloaks',
    'Stands slightly in front of allies without realizing it',
    'Touches the hearthfire manifestation (floating ember) like checking a pulse',
    'Rolls a coin or small token between fingers when thinking',
    'Looks at exits before looking at people when entering a room',
    'Breathes through pain rather than vocalizing it',
  ],
  sceneInstincts: [
    'Walk the perimeter of a new camp. Check sightlines.',
    'When someone is hurting, move closer — not to talk, just to be near.',
    'Feed people. Prepare food. Offer warmth before words.',
    'After combat, check every ally before checking yourself.',
    'Ask the quiet party member a direct question. Pull them in.',
    'When tensions rise in the group, stand between and say nothing. Let silence de-escalate.',
  ],
  quietTexture: [
    'Hums while cooking — never a real melody, just warmth',
    'Carves small marks into wood when resting — a private ritual, not decoration',
    'Watches fire like it\'s having a conversation',
    'Places their own bedroll near the door or opening, never in the center',
    'Cleans and oils weapons methodically, with the same care as cooking',
  ],
  patron: {
    name: 'Aesis the Shepherd',
    domains: ['Fire', 'Hearth', 'Protection', 'Gathering'],
    symbol: 'A flame cupped in two hands',
    rpNotes: 'Aesis doesn\'t speak in thunderbolts. The guidance comes as warmth — a gut feeling that the fire should be tended, that someone nearby needs rest. Astera doesn\'t hear a voice; they feel a pull, like heat drawing them toward what needs doing.',
  },
  voiceNotes: 'Low and even. Rarely raises voice. When they do, it\'s a snap — brief, controlled, then back to calm. Words are chosen like rations: only what\'s needed.',
  catchphrases: [
    'That\'ll hold.',
    'Eat first. Talk after.',
    'Nobody goes cold while I\'m standing.',
    'I\'ve had worse.',
  ],
}

// Custom subclass sentinel value
export const CUSTOM_SUBCLASS = 'Custom (Homebrew)'

export type ClassName = typeof CLASSES[number]
export type RaceName = typeof RACES[number]
