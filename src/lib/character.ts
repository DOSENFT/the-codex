import { type AbilityKey, type SkillName, SKILL_ABILITIES, CASTING_ABILITY } from './dnd-rules'

// Re-export for convenience
export type { AbilityKey, SkillName }

export interface AbilityScores {
  STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number
}

export interface Weapon {
  name: string
  attackType: 'melee' | 'ranged'
  abilityMod: AbilityKey
  proficient: boolean
  damageDice: string
  damageType: string
  properties: string[]
  magical?: boolean
  bonusToHit?: number
  bonusDamage?: number
}

export interface Spell {
  name: string
  level: number // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  higherLevels?: string
  prepared: boolean // Is this spell currently prepared?
  source?: string // PHB, homebrew, etc.
  // Combat-ready fields (optional for backward compatibility)
  damageType?: string // e.g. "Radiant", "Fire", "Force"
  damageDice?: string // e.g. "2d8", "3d6"
  saveType?: string // e.g. "DEX", "WIS", "CON"
  areaOfEffect?: string // e.g. "20ft radius", "30ft cone"
  tacticalNote?: string // Brief combat tip
}

export interface PaladinResources {
  layOnHands: { max: number; current: number }
  channelDivinity: { max: number; current: number }
  auraRange: number
}

export interface BackstoryMemory {
  id: string
  title: string
  description: string
  emotionalCore: string    // "grief", "betrayal", "hope", etc.
  npcInvolved?: string
}

export interface Backstory {
  origin: string
  keyMemories: BackstoryMemory[]
  relationships: { name: string; relation: string; status: string }[]
  unresolvedThreads: string[]
  personalitySeeds: string[]
}

export interface CharacterPersona {
  defaultState: string
  decisionTree: string
  physicalTics: string[]
  sceneInstincts: string[]
  quietTexture: string[]
  patron: {
    name: string
    domains: string[]
    symbol: string
    rpNotes: string
  }
  voiceNotes?: string
  catchphrases?: string[]
  // Toy Method fields
  colorTraits?: { text: string; category: 'color' }[]
  coreTraits?: { text: string; category: 'core' }[]
  sceneResponses?: { situation: string; responses: string[] }[]
  dialogueBank?: { text: string; context: string; favorite: boolean }[]
  wants?: string[]
  fears?: string[]
  pressureResponse?: string
  relationships?: string[]
  lastEditedAt?: string
}

export interface ClassFeature {
  name: string
  level: number
  description: string
  usesPerRest?: 'short' | 'long' | 'unlimited'
  usesMax?: number
  usesCurrent?: number
}

export interface SpellSlots {
  [level: number]: { max: number; current: number }
  // e.g. { 1: { max: 4, current: 3 }, 2: { max: 3, current: 3 } }
}

export interface Character {
  id: string // Unique identifier (crypto.randomUUID)
  name: string
  class: string
  subclass: string
  race: string
  level: number
  spellcastingAbility: string // "Charisma", "Wisdom", "Intelligence"
  spellSaveDC: number
  spellAttackBonus: number
  proficiencyBonus: number
  armorClass: number
  hitPoints: { max: number; current: number }

  // Combat state
  conditions: string[] // Active condition names
  deathSaves: { successes: number; failures: number } // Track death saves
  tempHP: number // Temporary hit points

  // Spell management
  spells: Spell[]
  spellSlots: SpellSlots
  canPrepareSpells: boolean // true for Paladin, Cleric, Druid, Wizard
  maxPreparedSpells: number // e.g. CHA mod + Paladin level / 2

  // Class features
  features: ClassFeature[]

  // Homebrew
  homebrewNotes?: string

  // Paladin-specific resources (optional)
  paladinResources?: PaladinResources

  // Ability scores & proficiencies
  abilityScores: AbilityScores
  skillProficiencies: SkillName[]
  skillExpertise: SkillName[]
  savingThrowProficiencies: AbilityKey[]
  weapons: Weapon[]

  // Identity
  gender: string              // "Male", "Female", "Non-binary", or freeform
  pronouns: string            // "he/him", "she/her", "they/them", or freeform

  // Inventory
  equipment: string[]         // general gear (rope, torch, rations, etc.)
  supplies: string[]          // consumables with optional qty ("Health Potion x3")

  // Character persona for roleplay (optional)
  persona?: CharacterPersona

  // Backstory (optional)
  backstory?: Backstory

  // Metadata
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Ability Score Calculations
// ---------------------------------------------------------------------------

const DEFAULT_ABILITY_SCORES: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }

/** Standard D&D ability modifier formula */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Calculate skill bonus: ability mod + proficiency (×2 for expertise) */
export function skillBonus(char: Character, skill: SkillName): number {
  const ability = SKILL_ABILITIES[skill]
  const mod = abilityModifier(char.abilityScores[ability])
  if (char.skillExpertise.includes(skill)) return mod + char.proficiencyBonus * 2
  if (char.skillProficiencies.includes(skill)) return mod + char.proficiencyBonus
  return mod
}

/** Calculate saving throw bonus */
export function savingThrowBonus(char: Character, ability: AbilityKey): number {
  const mod = abilityModifier(char.abilityScores[ability])
  if (char.savingThrowProficiencies.includes(ability)) return mod + char.proficiencyBonus
  return mod
}

/** Passive perception = 10 + perception skill bonus */
export function passivePerception(char: Character): number {
  return 10 + skillBonus(char, 'Perception')
}

/** Attack bonus for a weapon */
export function attackBonus(char: Character, weapon: Weapon): number {
  const mod = abilityModifier(char.abilityScores[weapon.abilityMod])
  const prof = weapon.proficient ? char.proficiencyBonus : 0
  const magic = weapon.bonusToHit ?? 0
  return mod + prof + magic
}

/** Compute spell save DC from ability scores */
export function computeSpellSaveDC(char: Character): number {
  const castingAbility = CASTING_ABILITY[char.class]
  if (!castingAbility) return char.spellSaveDC
  return 8 + char.proficiencyBonus + abilityModifier(char.abilityScores[castingAbility])
}

/** Compute spell attack bonus from ability scores */
export function computeSpellAttackBonus(char: Character): number {
  const castingAbility = CASTING_ABILITY[char.class]
  if (!castingAbility) return char.spellAttackBonus
  return char.proficiencyBonus + abilityModifier(char.abilityScores[castingAbility])
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/** Generate a unique ID. Falls back to a manual implementation when crypto.randomUUID is unavailable (e.g. non-HTTPS on mobile). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: manual UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Lightweight entry for the roster list
export interface RosterEntry {
  id: string
  name: string
  class: string
  subclass: string
  level: number
  updatedAt: string
}

// ---------------------------------------------------------------------------
// localStorage persistence — multi-character roster system
// ---------------------------------------------------------------------------

const LEGACY_KEY = 'codex-character'
const ROSTER_KEY = 'codex-roster'
const ACTIVE_ID_KEY = 'codex-active-id'
const CHAR_PREFIX = 'codex-character-'

/** Save a character to its per-id slot and update the roster. */
export function saveCharacter(character: Character): void {
  character.updatedAt = new Date().toISOString()
  localStorage.setItem(CHAR_PREFIX + character.id, JSON.stringify(character))
  updateRosterEntry(character)
}

/** Load a specific character by id. Applies migration defaults for new fields. */
export function loadCharacter(id: string): Character | null {
  const saved = localStorage.getItem(CHAR_PREFIX + id)
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved) as Partial<Character>
    return {
      ...parsed,
      id: parsed.id ?? id,
      conditions: parsed.conditions ?? [],
      deathSaves: parsed.deathSaves ?? { successes: 0, failures: 0 },
      tempHP: parsed.tempHP ?? 0,
      abilityScores: parsed.abilityScores ?? { ...DEFAULT_ABILITY_SCORES },
      skillProficiencies: parsed.skillProficiencies ?? [],
      skillExpertise: parsed.skillExpertise ?? [],
      savingThrowProficiencies: parsed.savingThrowProficiencies ?? [],
      weapons: parsed.weapons ?? [],
      gender: parsed.gender ?? '',
      pronouns: parsed.pronouns ?? '',
      equipment: parsed.equipment ?? [],
      supplies: parsed.supplies ?? [],
    } as Character
  } catch {
    return null
  }
}

/** Delete a character by id — removes per-id key, training data, and roster entry. */
export function deleteCharacter(id: string): void {
  localStorage.removeItem(CHAR_PREFIX + id)
  localStorage.removeItem(`codex-training-${id}`)
  const roster = loadRoster().filter(e => e.id !== id)
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
  // If this was the active character, clear active id
  if (getActiveId() === id) {
    localStorage.removeItem(ACTIVE_ID_KEY)
  }
}

// ---------------------------------------------------------------------------
// Roster management
// ---------------------------------------------------------------------------

/** Load the full roster list. */
export function loadRoster(): RosterEntry[] {
  const raw = localStorage.getItem(ROSTER_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as RosterEntry[]
  } catch {
    return []
  }
}

/** Update or insert a roster entry from a Character object. */
function updateRosterEntry(char: Character): void {
  const roster = loadRoster()
  const entry: RosterEntry = {
    id: char.id,
    name: char.name,
    class: char.class,
    subclass: char.subclass,
    level: char.level,
    updatedAt: char.updatedAt,
  }
  const idx = roster.findIndex(e => e.id === char.id)
  if (idx >= 0) {
    roster[idx] = entry
  } else {
    roster.push(entry)
  }
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
}

// ---------------------------------------------------------------------------
// Active character tracking
// ---------------------------------------------------------------------------

/** Get the id of the last-used character. */
export function getActiveId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY)
}

/** Set the active character id. */
export function setActiveId(id: string): void {
  localStorage.setItem(ACTIVE_ID_KEY, id)
}

// ---------------------------------------------------------------------------
// Legacy migration (one-time, from single-character format)
// ---------------------------------------------------------------------------

/** Migrate old `codex-character` key into the new roster system. Returns true if migration occurred. */
export function migrateFromLegacy(): boolean {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as Partial<Character>
    if (!parsed.name) return false
    const id = generateId()
    const character: Character = {
      ...parsed,
      id,
      conditions: parsed.conditions ?? [],
      deathSaves: parsed.deathSaves ?? { successes: 0, failures: 0 },
      tempHP: parsed.tempHP ?? 0,
      abilityScores: parsed.abilityScores ?? { ...DEFAULT_ABILITY_SCORES },
      skillProficiencies: parsed.skillProficiencies ?? [],
      skillExpertise: parsed.skillExpertise ?? [],
      savingThrowProficiencies: parsed.savingThrowProficiencies ?? [],
      weapons: parsed.weapons ?? [],
      gender: parsed.gender ?? '',
      pronouns: parsed.pronouns ?? '',
      equipment: parsed.equipment ?? [],
      supplies: parsed.supplies ?? [],
    } as Character
    character.id = id
    saveCharacter(character)
    setActiveId(id)
    localStorage.removeItem(LEGACY_KEY)
    return true
  } catch {
    return false
  }
}

// Spell slot management
export function expendSpellSlot(character: Character, level: number): Character {
  const slots = { ...character.spellSlots }
  if (slots[level] && slots[level].current > 0) {
    slots[level] = { ...slots[level], current: slots[level].current - 1 }
  }
  return { ...character, spellSlots: slots }
}

export function restoreSpellSlot(character: Character, level: number): Character {
  const slots = { ...character.spellSlots }
  if (slots[level] && slots[level].current < slots[level].max) {
    slots[level] = { ...slots[level], current: slots[level].current + 1 }
  }
  return { ...character, spellSlots: slots }
}

export function longRest(character: Character): Character {
  const slots: SpellSlots = {}
  for (const [level, slot] of Object.entries(character.spellSlots)) {
    slots[Number(level)] = { max: slot.max, current: slot.max }
  }

  // Reset feature uses
  const features = character.features.map(f => {
    if (f.usesPerRest && f.usesMax) {
      return { ...f, usesCurrent: f.usesMax }
    }
    return f
  })

  // Reset Paladin resources on long rest
  const paladinResources = character.paladinResources
    ? {
        ...character.paladinResources,
        layOnHands: { ...character.paladinResources.layOnHands, current: character.paladinResources.layOnHands.max },
        channelDivinity: { ...character.paladinResources.channelDivinity, current: character.paladinResources.channelDivinity.max },
      }
    : undefined

  return {
    ...character,
    spellSlots: slots,
    features,
    hitPoints: { ...character.hitPoints, current: character.hitPoints.max },
    tempHP: 0,
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    ...(paladinResources && { paladinResources }),
  }
}

export function shortRest(character: Character): Character {
  const features = character.features.map(f => {
    if (f.usesPerRest === 'short' && f.usesMax) {
      return { ...f, usesCurrent: f.usesMax }
    }
    return f
  })

  // Restore 1 Channel Divinity use on short rest
  const paladinResources = character.paladinResources
    ? {
        ...character.paladinResources,
        channelDivinity: {
          ...character.paladinResources.channelDivinity,
          current: Math.min(
            character.paladinResources.channelDivinity.current + 1,
            character.paladinResources.channelDivinity.max,
          ),
        },
      }
    : undefined

  return {
    ...character,
    features,
    ...(paladinResources && { paladinResources }),
  }
}

// Prepared spell management (for Paladin, Cleric, Druid, Wizard)
export function toggleSpellPrepared(character: Character, spellName: string): Character {
  const spells = character.spells.map(s => {
    if (s.name === spellName) {
      // Cantrips are always "prepared"
      if (s.level === 0) return s
      return { ...s, prepared: !s.prepared }
    }
    return s
  })
  return { ...character, spells }
}

export function getPreparedSpells(character: Character): Spell[] {
  return character.spells.filter(s => s.prepared || s.level === 0)
}

export function getSpellsByLevel(character: Character, level: number): Spell[] {
  return character.spells.filter(s => s.level === level && s.prepared)
}

// Paladin resource management
export function expendLayOnHands(character: Character, amount: number): Character {
  if (!character.paladinResources) return character
  const current = character.paladinResources.layOnHands.current
  const spend = Math.min(amount, current)
  if (spend <= 0) return character
  return {
    ...character,
    paladinResources: {
      ...character.paladinResources,
      layOnHands: { ...character.paladinResources.layOnHands, current: current - spend },
    },
  }
}

export function restoreLayOnHands(character: Character, amount: number): Character {
  if (!character.paladinResources) return character
  const { current, max } = character.paladinResources.layOnHands
  return {
    ...character,
    paladinResources: {
      ...character.paladinResources,
      layOnHands: { ...character.paladinResources.layOnHands, current: Math.min(current + amount, max) },
    },
  }
}

export function expendChannelDivinity(character: Character): Character {
  if (!character.paladinResources) return character
  const current = character.paladinResources.channelDivinity.current
  if (current <= 0) return character
  return {
    ...character,
    paladinResources: {
      ...character.paladinResources,
      channelDivinity: { ...character.paladinResources.channelDivinity, current: current - 1 },
    },
  }
}

export function restoreChannelDivinity(character: Character): Character {
  if (!character.paladinResources) return character
  const { current, max } = character.paladinResources.channelDivinity
  if (current >= max) return character
  return {
    ...character,
    paladinResources: {
      ...character.paladinResources,
      channelDivinity: { ...character.paladinResources.channelDivinity, current: current + 1 },
    },
  }
}

// Compute paladin resources from level
export function computePaladinResources(level: number): PaladinResources {
  return {
    layOnHands: { max: 5 * level, current: 5 * level },
    channelDivinity: { max: level >= 11 ? 3 : 2, current: level >= 11 ? 3 : 2 },
    auraRange: level >= 18 ? 30 : 10,
  }
}

// ---------------------------------------------------------------------------
// Combat: HP Management
// ---------------------------------------------------------------------------

/** Apply damage: reduces tempHP first, then current HP. Never below 0. */
export function applyDamage(character: Character, amount: number): Character {
  if (amount <= 0) return character
  let remaining = amount
  let tempHP = character.tempHP

  // Temp HP absorbs damage first
  if (tempHP > 0) {
    if (remaining >= tempHP) {
      remaining -= tempHP
      tempHP = 0
    } else {
      tempHP -= remaining
      remaining = 0
    }
  }

  const newCurrent = Math.max(0, character.hitPoints.current - remaining)

  return {
    ...character,
    tempHP,
    hitPoints: { ...character.hitPoints, current: newCurrent },
  }
}

/** Apply healing: increases current HP. Never above max. Auto-resets death saves when healing from 0 HP. */
export function applyHealing(character: Character, amount: number): Character {
  if (amount <= 0) return character
  const wasAtZero = character.hitPoints.current === 0
  const newCurrent = Math.min(character.hitPoints.max, character.hitPoints.current + amount)

  return {
    ...character,
    hitPoints: { ...character.hitPoints, current: newCurrent },
    // Auto-reset death saves when healed from 0 HP
    ...(wasAtZero && { deathSaves: { successes: 0, failures: 0 } }),
  }
}

/** Set temp HP (replaces, doesn't stack per 2024 rules). */
export function setTempHP(character: Character, amount: number): Character {
  return { ...character, tempHP: Math.max(0, amount) }
}

// ---------------------------------------------------------------------------
// Combat: Conditions
// ---------------------------------------------------------------------------

/** Toggle a condition on/off. */
export function toggleCondition(character: Character, condition: string): Character {
  const conditions = character.conditions.includes(condition)
    ? character.conditions.filter(c => c !== condition)
    : [...character.conditions, condition]
  return { ...character, conditions }
}

// ---------------------------------------------------------------------------
// Combat: Death Saves
// ---------------------------------------------------------------------------

/** Add a death save success. */
export function addDeathSaveSuccess(character: Character): Character {
  const successes = Math.min(3, character.deathSaves.successes + 1)
  return {
    ...character,
    deathSaves: { ...character.deathSaves, successes },
  }
}

/** Add a death save failure. */
export function addDeathSaveFailure(character: Character): Character {
  const failures = Math.min(3, character.deathSaves.failures + 1)
  return {
    ...character,
    deathSaves: { ...character.deathSaves, failures },
  }
}

/** Reset death saves (when healed from 0 HP). */
export function resetDeathSaves(character: Character): Character {
  return {
    ...character,
    deathSaves: { successes: 0, failures: 0 },
  }
}
