// Static D&D 2024 rules reference data

export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export type SkillName =
  | 'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics'
  | 'Deception' | 'History' | 'Insight' | 'Intimidation'
  | 'Investigation' | 'Medicine' | 'Nature' | 'Perception'
  | 'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand'
  | 'Stealth' | 'Survival'

/** Maps each skill to its governing ability */
export const SKILL_ABILITIES: Record<SkillName, AbilityKey> = {
  'Acrobatics': 'DEX',
  'Animal Handling': 'WIS',
  'Arcana': 'INT',
  'Athletics': 'STR',
  'Deception': 'CHA',
  'History': 'INT',
  'Insight': 'WIS',
  'Intimidation': 'CHA',
  'Investigation': 'INT',
  'Medicine': 'WIS',
  'Nature': 'INT',
  'Perception': 'WIS',
  'Performance': 'CHA',
  'Persuasion': 'CHA',
  'Religion': 'INT',
  'Sleight of Hand': 'DEX',
  'Stealth': 'DEX',
  'Survival': 'WIS',
}

export const ALL_SKILLS: SkillName[] = Object.keys(SKILL_ABILITIES) as SkillName[]

export const ALL_ABILITIES: AbilityKey[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
}

/** Spellcasting ability by class */
export const CASTING_ABILITY: Record<string, AbilityKey> = {
  'Bard': 'CHA',
  'Cleric': 'WIS',
  'Druid': 'WIS',
  'Paladin': 'CHA',
  'Ranger': 'WIS',
  'Sorcerer': 'CHA',
  'Warlock': 'CHA',
  'Wizard': 'INT',
  'Artificer': 'INT',
}
