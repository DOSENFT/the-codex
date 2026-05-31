// Educational reference data for D&D 2024 character mechanics
// Concise study aids — not full rulebook entries

import type { AbilityKey, SkillName } from './dnd-rules'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface SkillGuideEntry {
  description: string
  examples: string[]
  pairings: string[]
  rating: 'essential' | 'strong' | 'useful' | 'situational'
}

export interface AbilityGuideEntry {
  description: string
  affectsWhat: string[]
  howToIncrease: string[]
  benchmarks: {
    low: string
    average: string
    high: string
    exceptional: string
  }
}

export interface FeatSynergyEntry {
  description: string
  pairsWellWith: string[]
  combatTip: string
}

// ---------------------------------------------------------------------------
// 1. SKILL_GUIDE — 18 skills
// ---------------------------------------------------------------------------

export const SKILL_GUIDE: Record<SkillName, SkillGuideEntry> = {
  Acrobatics: {
    description:
      'Covers balance, tumbling, and aerial maneuvers. Used to stay on your feet in tricky situations or slip out of restraints.',
    examples: [
      'Tumble past an enemy without provoking an Opportunity Attack (DM discretion)',
      'Balance on a narrow ledge or icy surface',
      'Land gracefully from a fall to reduce damage',
    ],
    pairings: [
      'Rogues and Monks who rely on mobility',
      'Escape Grapple attempts as a DEX alternative to Athletics',
      'Pairs with the Mobile feat for hit-and-run tactics',
    ],
    rating: 'useful',
  },

  'Animal Handling': {
    description:
      'Governs calming, controlling, or intuiting the behavior of animals. Essential for mounted combat and beast companions.',
    examples: [
      'Calm a panicked horse during combat',
      'Convince a guard dog not to bark',
      'Control your mount when it takes damage',
    ],
    pairings: [
      'Rangers with Beast Master archetype',
      'Paladins and Cavaliers who use mounted combat',
      'Druids interacting with wildlife before resorting to spells',
    ],
    rating: 'situational',
  },

  Arcana: {
    description:
      'Measures recall of lore about spells, magic items, planar knowledge, and arcane traditions. Also used to identify magical effects.',
    examples: [
      'Identify a spell being cast by another creature',
      'Recall properties of a magic item or arcane phenomenon',
      'Decipher a magical inscription or sigil',
    ],
    pairings: [
      'Wizards and Artificers with high INT',
      'Any campaign heavy on magical mysteries or planar travel',
      'Pairs with Detect Magic for full arcane investigation',
    ],
    rating: 'strong',
  },

  Athletics: {
    description:
      'Covers climbing, jumping, swimming, and feats of raw physical power. The primary skill for Grapple and Shove attempts.',
    examples: [
      'Grapple or shove an enemy in combat',
      'Climb a sheer cliff without rope',
      'Swim against a strong current',
    ],
    pairings: [
      'Fighters, Barbarians, and Paladins with high STR',
      'Grappler builds that use Tavern Brawler or Skill Expert',
      'Critical for STR-based martials controlling the battlefield',
    ],
    rating: 'essential',
  },

  Deception: {
    description:
      'Lets you convincingly lie, disguise your intentions, or mislead others through word or deed.',
    examples: [
      'Bluff your way past a guard with a fake identity',
      'Feign surrender to set up an ambush',
      'Conceal your true emotions during a tense negotiation',
    ],
    pairings: [
      'Rogues, Bards, and Warlocks with high CHA',
      'Pairs with Disguise Kit proficiency for full impersonation',
      'Assassin Rogues who need to maintain cover identities',
    ],
    rating: 'strong',
  },

  History: {
    description:
      'Represents knowledge of past events, legendary figures, ancient kingdoms, and historical context that might be relevant.',
    examples: [
      'Recall the significance of an ancient battlefield',
      'Identify a noble house by its heraldry',
      'Know the historical weakness of a legendary villain',
    ],
    pairings: [
      'Wizards, Bards (via Jack of All Trades), and Knowledge Clerics',
      'Campaigns heavy on political intrigue or ancient ruins',
      'Pairs with Investigation for thorough research',
    ],
    rating: 'situational',
  },

  Insight: {
    description:
      'Your ability to read body language, detect lies, and discern true intentions. The social counterpart to Perception.',
    examples: [
      'Determine if an NPC is lying or withholding information',
      'Sense that an ally is being magically charmed',
      'Read the mood of a crowd before making a speech',
    ],
    pairings: [
      'Clerics, Druids, and Monks with high WIS',
      'Any face character who negotiates frequently',
      'Counters Deception — the DM often pits these against each other',
    ],
    rating: 'strong',
  },

  Intimidation: {
    description:
      'Covers coercing others through threats, hostile presence, or displays of power. Can force compliance without violence.',
    examples: [
      'Threaten a captured bandit into revealing their hideout',
      'Stare down a rival to make them back off',
      'Demoralize enemies before combat begins',
    ],
    pairings: [
      'Barbarians and Fighters with menacing presence',
      'Pairs with the Menacing feat (if available) or high STR builds',
      'Warlocks and Paladins who leverage supernatural aura',
    ],
    rating: 'useful',
  },

  Investigation: {
    description:
      'Active, deductive searching — piecing together clues, finding hidden mechanisms, or deducing information from evidence.',
    examples: [
      'Search a room for a hidden compartment or trap mechanism',
      'Deduce who committed a crime from available clues',
      'Determine the weak point in a constructed barrier',
    ],
    pairings: [
      'Rogues (Inquisitive archetype) and Wizards',
      'Dungeon-heavy campaigns with traps and puzzles',
      'Distinct from Perception: Investigation is active reasoning, Perception is passive noticing',
    ],
    rating: 'strong',
  },

  Medicine: {
    description:
      'Covers diagnosing ailments, stabilizing dying creatures, and understanding biological phenomena.',
    examples: [
      'Stabilize a dying ally without a spell slot (DC 10)',
      'Diagnose a disease or determine cause of death',
      'Identify a poison by its symptoms',
    ],
    pairings: [
      'Useful when the Cleric is down or out of spell slots',
      'Healer feat turns Medicine checks into meaningful healing',
      'Life Clerics and Druids as backup to magical healing',
    ],
    rating: 'situational',
  },

  Nature: {
    description:
      'Knowledge of terrain, plants, animals, weather, and natural cycles. The natural world equivalent of Arcana.',
    examples: [
      'Identify a dangerous plant or venomous creature',
      'Predict incoming weather patterns',
      'Recall lore about fey creatures or elemental beings',
    ],
    pairings: [
      'Druids and Rangers with deep wilderness knowledge',
      'Campaigns set in wilderness, underdark, or elemental planes',
      'Pairs with Survival for full outdoor expertise',
    ],
    rating: 'situational',
  },

  Perception: {
    description:
      'Your general awareness — spotting hidden creatures, hearing distant sounds, or noticing subtle environmental details. The most commonly rolled skill in D&D.',
    examples: [
      'Spot an ambush before it triggers',
      'Notice a hidden door or secret passage',
      'Hear a whispered conversation from across the room',
    ],
    pairings: [
      'Valuable for every class — the universal must-have skill',
      'Pairs with high WIS; Observant feat adds +5 to passive score',
      'Rangers, Rogues, and Druids especially benefit',
    ],
    rating: 'essential',
  },

  Performance: {
    description:
      'Covers entertaining an audience through music, dance, acting, storytelling, or other artistic expression.',
    examples: [
      'Play a tavern set to earn coin or gather rumors',
      'Distract guards with a dramatic performance',
      'Inspire troops with a rousing battlefield speech (DM discretion)',
    ],
    pairings: [
      'Bards — core class fantasy and Bardic Inspiration flavor',
      'Pairs with Disguise Kit for theatrical deception',
      'Rarely mechanically required but high roleplay value',
    ],
    rating: 'situational',
  },

  Persuasion: {
    description:
      'The art of influencing others through tact, diplomacy, and good-faith argument. The go-to social skill for face characters.',
    examples: [
      'Negotiate a better price with a merchant',
      'Convince a noble to lend military support',
      'Talk down a hostile creature that can understand you',
    ],
    pairings: [
      'Bards, Paladins, Sorcerers, and Warlocks as party face',
      'Pairs with the Skill Expert feat for Expertise',
      'Most universally useful CHA skill across all campaign types',
    ],
    rating: 'essential',
  },

  Religion: {
    description:
      'Knowledge of deities, holy rites, religious hierarchies, undead lore, and planar cosmology related to the divine.',
    examples: [
      'Identify a holy symbol or religious ritual',
      'Recall the weaknesses of undead or fiends',
      'Understand the doctrine of an unfamiliar faith',
    ],
    pairings: [
      'Clerics and Paladins for thematic expertise',
      'Campaigns involving cults, undead, or divine conflict',
      'Pairs with Arcana for comprehensive magical/divine knowledge',
    ],
    rating: 'situational',
  },

  'Sleight of Hand': {
    description:
      'Manual dexterity for pickpocketing, planting items, concealing objects, or performing subtle hand tricks.',
    examples: [
      'Pick a pocket without the target noticing',
      'Palm a key off a table during conversation',
      'Conceal a weapon on your person during a search',
    ],
    pairings: [
      'Rogues (especially Thief archetype) as a core tool',
      'Pairs with Thieves Tools proficiency for full larceny',
      'Useful for planting evidence or swapping items undetected',
    ],
    rating: 'useful',
  },

  Stealth: {
    description:
      'Your ability to move unseen and unheard. Governs hiding, sneaking, and avoiding detection.',
    examples: [
      'Sneak past a patrol of guards undetected',
      'Hide in shadows to set up a surprise round',
      'Move silently through a dungeon to avoid random encounters',
    ],
    pairings: [
      'Rogues depend on this for Sneak Attack setup',
      'Rangers with Pass Without Trace make the whole party stealthy',
      'Pairs with the Skulker feat for hiding in light obscurement',
    ],
    rating: 'essential',
  },

  Survival: {
    description:
      'Covers tracking, foraging, navigating the wilderness, and enduring harsh environmental conditions.',
    examples: [
      'Track a creature through the forest by its footprints',
      'Forage for food and water during overland travel',
      'Navigate without a map using natural landmarks',
    ],
    pairings: [
      'Rangers — core class identity skill',
      'Important in exploration-heavy or hex-crawl campaigns',
      'Pairs with Nature for comprehensive wilderness capability',
    ],
    rating: 'useful',
  },
}

// ---------------------------------------------------------------------------
// 2. ABILITY_GUIDE — 6 abilities
// ---------------------------------------------------------------------------

export const ABILITY_GUIDE: Record<AbilityKey, AbilityGuideEntry> = {
  STR: {
    description:
      'Raw physical power — lifting, breaking, pushing, and hitting hard. Governs melee attack and damage for most weapons.',
    affectsWhat: [
      'Melee attack rolls and damage (non-Finesse weapons)',
      'Athletics checks (Grapple, Shove, climbing, swimming)',
      'Strength saving throws (resisting being pushed, restrained, or knocked prone)',
      'Carrying capacity and push/drag/lift limits',
      'Jump distance',
    ],
    howToIncrease: [
      'Ability Score Improvement (ASI) at class-specific levels',
      'Half-feats that grant +1 STR (e.g., Tavern Brawler, Heavy Armor Master)',
      'Magic items (Gauntlets of Ogre Power, Belt of Giant Strength)',
      'Spells: Enhance Ability (Bull\'s Strength), enlarge effect',
    ],
    benchmarks: {
      low: '6-7: Struggles to open heavy doors or carry standard gear',
      average: '10-11: Typical adult; can perform normal physical tasks',
      high: '16-17: Elite athlete; can bend iron bars with effort',
      exceptional: '20+: Peak mortal power; legendary feats of strength',
    },
  },

  DEX: {
    description:
      'Agility, reflexes, and fine motor control. Governs AC, initiative, ranged attacks, and Finesse weapon attacks.',
    affectsWhat: [
      'AC (when wearing light/medium armor or unarmored)',
      'Initiative rolls',
      'Ranged attack rolls and damage',
      'Finesse melee weapon attack rolls and damage',
      'Dexterity saving throws (dodging area effects like Fireball)',
      'Acrobatics, Sleight of Hand, and Stealth checks',
    ],
    howToIncrease: [
      'Ability Score Improvement at class-specific levels',
      'Half-feats that grant +1 DEX (e.g., Defensive Duelist in some versions)',
      'Magic items (Gloves of Thievery, Manual of Quickness of Action)',
      'Spells: Enhance Ability (Cat\'s Grace), Longstrider (speed only)',
    ],
    benchmarks: {
      low: '6-7: Clumsy; frequently drops things, poor reflexes',
      average: '10-11: Normal coordination and reaction time',
      high: '16-17: Acrobat-level agility; catches arrows by reflex',
      exceptional: '20+: Supernaturally fast; blur of motion in combat',
    },
  },

  CON: {
    description:
      'Endurance, stamina, and vital force. Determines hit points, concentration resilience, and resistance to physical hardship.',
    affectsWhat: [
      'Hit points (modifier added per level)',
      'Constitution saving throws (Concentration checks, resisting poison/disease)',
      'Endurance-related checks (forced march, holding breath, going without sleep)',
      'No skills are governed by CON',
    ],
    howToIncrease: [
      'Ability Score Improvement at class-specific levels',
      'Half-feats that grant +1 CON (e.g., Resilient CON, Tough in 2024)',
      'Magic items (Amulet of Health sets CON to 19, Ioun Stone of Fortitude)',
      'Spells: Enhance Ability (Bear\'s Endurance) for temporary HP',
    ],
    benchmarks: {
      low: '6-7: Sickly; tires quickly, vulnerable to disease',
      average: '10-11: Normal health and stamina',
      high: '16-17: Ironclad endurance; shrugs off illness, rarely fatigues',
      exceptional: '20+: Virtually tireless; can endure extreme conditions indefinitely',
    },
  },

  INT: {
    description:
      'Mental acuity, memory, and analytical reasoning. Primary ability for Wizards and Artificers; governs knowledge skills.',
    affectsWhat: [
      'Wizard and Artificer spellcasting (attack rolls and save DCs)',
      'Arcana, History, Investigation, Nature, and Religion checks',
      'Intelligence saving throws (resisting mental effects from Illusions, Psionics)',
      'Number of prepared spells for certain classes',
    ],
    howToIncrease: [
      'Ability Score Improvement at class-specific levels',
      'Half-feats that grant +1 INT (e.g., Keen Mind, Skill Expert with INT)',
      'Magic items (Headband of Intellect sets INT to 19, Tome of Clear Thought)',
      'Rare in-game boons from study or arcane rituals',
    ],
    benchmarks: {
      low: '6-7: Slow learner; struggles with complex reasoning',
      average: '10-11: Normal recall and reasoning ability',
      high: '16-17: Brilliant scholar; solves complex puzzles quickly',
      exceptional: '20+: Genius intellect; encyclopedic knowledge and razor logic',
    },
  },

  WIS: {
    description:
      'Awareness, intuition, and willpower. Primary ability for Clerics, Druids, and Rangers; governs the most commonly used skills.',
    affectsWhat: [
      'Cleric, Druid, and Ranger spellcasting (attack rolls and save DCs)',
      'Perception, Insight, Survival, Medicine, and Animal Handling checks',
      'Wisdom saving throws (the most common mental save — resisting charm, fear, domination)',
      'Passive Perception (base awareness)',
    ],
    howToIncrease: [
      'Ability Score Improvement at class-specific levels',
      'Half-feats that grant +1 WIS (e.g., Observant, Resilient WIS)',
      'Magic items (Periapt of Wisdom, Ioun Stone of Insight)',
      'Spells: Enhance Ability (Owl\'s Wisdom)',
    ],
    benchmarks: {
      low: '6-7: Oblivious; easily deceived, poor situational awareness',
      average: '10-11: Normal awareness and common sense',
      high: '16-17: Deeply perceptive; reads people and situations instantly',
      exceptional: '20+: Near-omniscient awareness; almost impossible to deceive or surprise',
    },
  },

  CHA: {
    description:
      'Force of personality, confidence, and social magnetism. Primary ability for Bards, Paladins, Sorcerers, and Warlocks.',
    affectsWhat: [
      'Bard, Paladin, Sorcerer, and Warlock spellcasting (attack rolls and save DCs)',
      'Deception, Intimidation, Performance, and Persuasion checks',
      'Charisma saving throws (resisting banishment, planar effects)',
      'Paladin Aura of Protection adds CHA modifier to all saves (party-wide)',
    ],
    howToIncrease: [
      'Ability Score Improvement at class-specific levels',
      'Half-feats that grant +1 CHA (e.g., Fey Touched, Actor)',
      'Magic items (Cloak of Many Fashions for flavor, Tome of Leadership)',
      'Spells: Enhance Ability (Eagle\'s Splendor)',
    ],
    benchmarks: {
      low: '6-7: Off-putting or forgettable; struggles to influence others',
      average: '10-11: Normal social presence; can hold a conversation',
      high: '16-17: Commanding presence; natural leader who draws attention',
      exceptional: '20+: Supernaturally magnetic; inspires devotion or dread effortlessly',
    },
  },
}

// ---------------------------------------------------------------------------
// 3. WEAPON_PROPERTY_GUIDE — common weapon properties
// ---------------------------------------------------------------------------

export const WEAPON_PROPERTY_GUIDE: Record<string, string> = {
  Finesse:
    'You can use either STR or DEX for attack and damage rolls with this weapon. Ideal for Rogues and DEX-based fighters.',
  Heavy:
    'Small creatures have Disadvantage on attack rolls with this weapon. Typically paired with high-damage two-handed weapons like the Greatsword.',
  Light:
    'This weapon is small and easy to handle, making it ideal for Two-Weapon Fighting. You can make a bonus action attack with a different Light weapon in your other hand.',
  Reach:
    'Adds 5 feet to your melee attack range (typically 10 ft total). Lets you strike enemies before they can reach you; powerful with Polearm Master and Sentinel.',
  'Two-Handed':
    'Requires both hands to attack. You cannot hold a shield while wielding this weapon. Grants access to the highest damage dice.',
  Versatile:
    'Can be wielded with one or two hands. When used with two hands, it deals higher damage (listed in parentheses). Great for sword-and-board flexibility.',
  Thrown:
    'You can throw this weapon to make a ranged attack using the same ability modifier you would use for melee. Range is listed in the weapon entry.',
  Ammunition:
    'Requires ammunition (arrows, bolts, etc.) to make ranged attacks. You use DEX for attack and damage rolls. You can recover half your spent ammunition after a fight.',
  Loading:
    'Due to the time needed to reload, you can fire only one piece of ammunition per action, bonus action, or reaction — regardless of extra attacks. The Crossbow Expert feat removes this limitation.',
  Special:
    'This weapon has unique rules described in its entry. The Lance and Net are the most common Special weapons, each with distinct restrictions.',
  Magical:
    'This weapon counts as magical for the purpose of overcoming resistance and immunity to nonmagical attacks. Most monsters at higher levels resist nonmagical damage.',
  Nick:
    'A 2024 weapon mastery property. When you make the extra attack of Two-Weapon Fighting with this weapon, you can do so as part of the Attack action instead of using your Bonus Action.',
  Topple:
    'A 2024 weapon mastery property. When you hit a creature, you can force it to make a Constitution saving throw or be knocked Prone. Excellent for setting up advantage.',
  Graze:
    'A 2024 weapon mastery property. When you miss with an attack roll, you still deal damage equal to your ability modifier to the target. Ensures you always contribute damage.',
  Vex:
    'A 2024 weapon mastery property. When you hit a creature, you gain Advantage on your next attack roll against that creature before the end of your next turn.',
  Cleave:
    'A 2024 weapon mastery property. When you hit a creature, you can make an additional melee attack against a different creature within 5 feet of the original target.',
  Push:
    'A 2024 weapon mastery property. When you hit a creature, you can push it up to 10 feet straight away from you. Useful for battlefield control and forced movement.',
  Slow:
    'A 2024 weapon mastery property. When you hit a creature, its Speed is reduced by 10 feet until the start of your next turn. Helps prevent enemies from escaping.',
  Sap:
    'A 2024 weapon mastery property. When you hit a creature, it has Disadvantage on its next attack roll before the start of your next turn. A defensive mastery option.',
}

// ---------------------------------------------------------------------------
// 4. FEAT_SYNERGIES — common feats
// ---------------------------------------------------------------------------

export const FEAT_SYNERGIES: Record<string, FeatSynergyEntry> = {
  Sentinel: {
    description:
      'When you hit a creature with an Opportunity Attack, its speed drops to 0 for the rest of the turn. Creatures provoke Opportunity Attacks from you even if they Disengage.',
    pairsWellWith: [
      'Polearm Master (OA when enemies enter your 10 ft reach)',
      'Reach weapons (Glaive, Halberd) for a massive control zone',
      'Fighters, Paladins, and other frontliners who want to lock enemies down',
    ],
    combatTip:
      'Position yourself between enemies and your backline. With Polearm Master, enemies trigger your OA at 10 feet and get stopped before they can reach your allies.',
  },

  'Great Weapon Master': {
    description:
      'In 2024, when you hit with a Heavy weapon, you add your Proficiency Bonus to the damage roll. Replaces the old -5/+10 mechanic.',
    pairsWellWith: [
      'Heavy weapons (Greatsword, Maul, Greataxe)',
      'Fighters (more attacks = more bonus damage), Barbarians (Reckless Attack for advantage)',
      'Polearm Master for bonus action attacks that also get the damage bonus',
    ],
    combatTip:
      'Since there is no attack penalty in 2024, this is a straightforward damage increase. Always active with Heavy weapons — just focus on maximizing your number of attacks.',
  },

  'Polearm Master': {
    description:
      'When you take the Attack action with a Glaive, Halberd, Quarterstaff, or Spear, you can make a bonus action attack with the blunt end (1d4). Creatures provoke OAs when entering your reach.',
    pairsWellWith: [
      'Sentinel (stop enemies at 10 feet)',
      'Great Weapon Master (bonus damage on every hit including BA attack)',
      'Fighters, Paladins (Divine Smite on OAs), and Barbarians',
    ],
    combatTip:
      'Use a Glaive or Halberd for 10 ft reach. Enemies entering that range trigger your OA. Combined with Sentinel, they stop moving and never reach you.',
  },

  'War Caster': {
    description:
      'Advantage on CON saves to maintain Concentration. You can perform somatic components with hands full. You can cast a spell as an Opportunity Attack instead of a melee strike.',
    pairsWellWith: [
      'Any concentration caster: Clerics (Spirit Guardians), Druids, Wizards',
      'Sword-and-board Clerics and Paladins who hold weapons + shields',
      'Pairs with Sentinel for casting Hold Person/Booming Blade as an OA',
    ],
    combatTip:
      'If you maintain Concentration spells in melee, this is your top feat. The Advantage on CON saves is the primary draw — the OA casting is a strong bonus.',
  },

  'Shield Master': {
    description:
      'When you take the Attack action, you can use a Bonus Action to shove a creature within 5 feet with your shield. Add your shield\'s AC bonus to DEX saves against single-target effects. On a successful DEX save, take no damage instead of half.',
    pairsWellWith: [
      'STR-based Fighters and Paladins who already use shields',
      'Athletics proficiency for reliable shoves (knock Prone for advantage)',
      'Pairs with Extra Attack: shove Prone, then attack with Advantage',
    ],
    combatTip:
      'Shove an enemy Prone before your Extra Attack, then swing with Advantage on remaining attacks. The DEX save bonus also makes you resilient against Dragon Breath and similar effects.',
  },

  Resilient: {
    description:
      'Increase one ability score by 1 and gain proficiency in saving throws with that ability. Typically taken for CON or WIS saves.',
    pairsWellWith: [
      'Resilient (CON) for concentration casters — stacks with War Caster',
      'Resilient (WIS) for Fighters, Rogues, and other classes weak to charm/fear',
      'Any class that lacks proficiency in a critical saving throw',
    ],
    combatTip:
      'Resilient (CON) becomes more valuable than War Caster at higher levels because your proficiency bonus scales, eventually exceeding the average benefit of Advantage.',
  },

  Lucky: {
    description:
      'You have a number of Luck Points equal to your Proficiency Bonus. Spend one to roll an extra d20 on an attack, ability check, or save and choose which die to use.',
    pairsWellWith: [
      'Every class and build — Lucky is universally powerful',
      'Characters who make many important rolls (Rogues, Fighters)',
      'Pairs with Halfling Luck for extreme reroll redundancy',
    ],
    combatTip:
      'Save Luck Points for saving throws against devastating effects (Stun, Dominate, Banishment). Using them on attacks is fine but defensive use is higher value.',
  },

  Alert: {
    description:
      'You add your Proficiency Bonus to Initiative rolls and cannot be Surprised. In 2024, you can also swap Initiative with a willing ally.',
    pairsWellWith: [
      'Assassin Rogues who need to act first for auto-crits',
      'Spellcasters who want to drop control spells before enemies act',
      'Any character in a party that frequently gets ambushed',
    ],
    combatTip:
      'Going first lets you set the battlefield. Casters can drop Hypnotic Pattern or Wall spells; Rogues can eliminate a target; Fighters can position to protect the backline.',
  },

  Tough: {
    description:
      'Your HP maximum increases by 2 for every level you have. This is retroactive and applies to future levels as well.',
    pairsWellWith: [
      'Frontline characters who absorb damage (Barbarians, Fighters, Paladins)',
      'Low-HP casters who keep getting knocked unconscious',
      'Characters with high AC — more HP makes you even harder to drop',
    ],
    combatTip:
      'Effectively equivalent to +4 CON for HP purposes. If your CON is already 16+, Tough gives more HP per level than raising CON to 18 would.',
  },

  'Inspiring Leader': {
    description:
      'After a Short or Long Rest, you can give a 10-minute speech granting temporary HP equal to your level + CHA modifier to up to 6 allies (including yourself).',
    pairsWellWith: [
      'High-CHA characters: Bards, Paladins, Sorcerers, Warlocks',
      'Parties that take Short Rests frequently',
      'Stacks with other temp HP sources since you apply it out of combat',
    ],
    combatTip:
      'Use this after every rest without fail. At level 10 with +5 CHA, that is 15 temp HP on 6 people = 90 total effective HP for the party, every rest, for free.',
  },

  'Fey Touched': {
    description:
      'Increase INT, WIS, or CHA by 1. You learn Misty Step and one 1st-level Divination or Enchantment spell. Cast each once per Long Rest for free, or with spell slots.',
    pairsWellWith: [
      'Any caster who wants free Misty Step (Clerics, Druids especially)',
      'Martials who need a teleport escape option',
      'Pick Bless or Hex as the 1st-level spell for strong extra value',
    ],
    combatTip:
      'Misty Step is a Bonus Action teleport that gets you out of grapples, past barriers, or to high ground. Choosing Bless as the free spell gives your party a significant accuracy boost.',
  },

  'Shadow Touched': {
    description:
      'Increase INT, WIS, or CHA by 1. You learn Invisibility and one 1st-level Illusion or Necromancy spell. Cast each once per Long Rest for free, or with spell slots.',
    pairsWellWith: [
      'Rogues and Rangers who want free Invisibility for scouting',
      'Warlocks who can also cast Invisibility with Pact slots',
      'Pick Inflict Wounds (Necromancy) for a strong melee nova option',
    ],
    combatTip:
      'Free Invisibility once per day is powerful for scouting, escaping, or setting up an ambush. On a martial, it guarantees Advantage on your first attack of the next fight.',
  },
}
