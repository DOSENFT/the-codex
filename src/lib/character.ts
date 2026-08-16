import { type AbilityKey, type SkillName, SKILL_ABILITIES, CASTING_ABILITY } from './dnd-rules'
// Slice 6b. `resources.ts` imports Character back, but only as a TYPE, so the
// cycle is erased at compile time and there is no runtime edge in that
// direction. Kept that way on purpose: character.ts is the module every screen
// loads first and it must not wait on the rules layer to initialise.
import { rechargePools, type ResourcePool } from './rules-2024/resources'
import type { CustomCondition } from './rules-2024/conditions'

// Re-export for convenience
export type { AbilityKey, SkillName }

// ---------------------------------------------------------------------------
// Identity System
// ---------------------------------------------------------------------------

export interface CharacterIdentity {
  id: string
  name: string              // "Elara" or "Barkeep Disguise"
  isDefault: boolean
  appearance?: string
  accent?: string           // accent guide ID or freeform
  mannerisms: string[]
  voiceNotes: string
  personalityTraits: string[]
  triggers: string[]        // when to switch TO this identity
  socialContext?: string    // "In court", "Undercover"
  dialogueLines: DialogueLine[]
}

// ---------------------------------------------------------------------------
// Campaign System
// ---------------------------------------------------------------------------

export interface CampaignData {
  id: string
  name: string
  setting: string
  worldDetails: string
  currentQuest: string
  partyMembers: PartyMember[]
  notableNPCs: CampaignNPC[]
  sessionNotes: SessionNote[]
}

export interface PartyMember {
  name: string
  class: string
  race: string
  personality: string
  relationshipToPC: string
}

export interface CampaignNPC {
  name: string
  role: string
  notes: string
}

export interface SessionNote {
  id: string
  date: string
  summary: string
}

// ---------------------------------------------------------------------------
// Dialogue Line (shared type)
// ---------------------------------------------------------------------------

export interface DialogueLine {
  text: string
  context: string           // combat, social, discovery, emotional, quiet
  favorite: boolean
  scenario?: string         // "entering a tavern", "interrogation"
  deliveryNotes?: string    // AI-generated delivery coaching
}

export interface AbilityScores {
  STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number
}

export interface WeaponAbility {
  name: string        // "Life Drain"
  trigger: string     // "On hit", "1/long rest"
  effect: string      // "Deal 1d4 necrotic, heal same"
  damageDice?: string
  damageType?: string
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
  description?: string              // Homebrew flavor text
  range?: string                    // "5 ft", "20/60 ft"
  masteryProperty?: string          // 2024 weapon mastery: Nick, Topple, Graze, etc.
  specialAbilities?: WeaponAbility[]
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
  actionType?: 'action' | 'bonusAction' | 'reaction' | 'passive' | 'none'
  range?: string           // "30 feet", "Self", "Touch"
  damageDice?: string      // "2d8", "3d6"
  damageType?: string      // "Radiant", "Fire"
  saveType?: string        // "DEX", "WIS"
  duration?: string        // "Instantaneous", "1 minute"
  source?: string          // "PHB p.84", "Homebrew"
  tacticalNote?: string    // Brief combat tip
  category?: 'class' | 'subclass' | 'racial' | 'feat'

  // -- Slice 6b: a feature may spend a pool other than its own counter -------
  // Without these two, a pool Marcus authors has no consumer: he can create
  // "Hearth Embers 5" and nothing in the app is able to spend from it. The
  // feature's own `usesMax`/`usesCurrent` counter still works exactly as
  // before and is still the default — this is the opt-in route for the case
  // the counter cannot express, which is several features drawing on ONE
  // shared pool at different prices.
  /** Id of a ResourcePool this feature draws from instead of its own counter. */
  resourcePoolId?: string
  /** How much of that pool one use costs.  Absent means 1. */
  resourceAmount?: number
}

export interface SpellSlots {
  [level: number]: { max: number; current: number }
  // e.g. { 1: { max: 4, current: 3 }, 2: { max: 3, current: 3 } }
}

export interface CustomRPHook {
  id: string
  category: 'ask' | 'observe' | 'connect' | 'offer' | 'muse'
  text: string
  createdAt: string
}

export interface CharacterFeat {
  name: string
  description: string
  source?: string             // "PHB", "Homebrew"
  isHomebrew: boolean
  abilityIncrease?: { ability: AbilityKey; amount: number }
  effects: string[]           // Brief list of mechanical effects
  prerequisites?: string
  tacticalNote?: string       // How to USE this feat
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
  // KEPT, not replaced. Slice 6b puts a generic pool model over the top of
  // this field; it does not migrate away from it. See rules-2024/resources.ts.
  paladinResources?: PaladinResources

  // Homebrew resources and conditions Marcus authored in the app (Slice 6b).
  // Both are optional and both default to [] on load, so every character saved
  // before 6b existed reads back as "has none" rather than "is broken".
  resourcePools?: ResourcePool[]
  customConditions?: CustomCondition[]

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

  // Identity system (multi-persona)
  identities?: CharacterIdentity[]
  activeIdentityId?: string

  // Campaign reference
  campaignId?: string

  // Custom RP hooks
  customHooks?: CustomRPHook[]

  // Feats
  feats: CharacterFeat[]

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
      // Everything below this comment is a REQUIRED field of Character that
      // was not being defaulted. A stored character missing any of them
      // white-screens the whole app ABOVE every error boundary, before a
      // single surface has rendered — getPreparedSpells() reaches for
      // .spells.filter() and StatsBar reaches for .hitPoints.max during boot.
      // Found by seeding a threadbare character in the Slice 1 shoot script;
      // `thin-character-boots--phone` is the standing regression guard.
      // Guardrail: zero blank screens, ever.
      name: parsed.name ?? 'Unnamed',
      class: parsed.class ?? '',
      subclass: parsed.subclass ?? '',
      race: parsed.race ?? '',
      level: parsed.level ?? 1,
      hitPoints: parsed.hitPoints ?? { max: 1, current: 1 },
      armorClass: parsed.armorClass ?? 10,
      proficiencyBonus: parsed.proficiencyBonus ?? 2,
      spellcastingAbility: parsed.spellcastingAbility ?? '',
      spellSaveDC: parsed.spellSaveDC ?? 10,
      spellAttackBonus: parsed.spellAttackBonus ?? 0,
      canPrepareSpells: parsed.canPrepareSpells ?? false,
      maxPreparedSpells: parsed.maxPreparedSpells ?? 0,
      spells: parsed.spells ?? [],
      features: parsed.features ?? [],
      spellSlots: parsed.spellSlots ?? {},
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      conditions: parsed.conditions ?? [],
      deathSaves: parsed.deathSaves ?? { successes: 0, failures: 0 },
      tempHP: parsed.tempHP ?? 0,
      abilityScores: parsed.abilityScores ?? { ...DEFAULT_ABILITY_SCORES },
      skillProficiencies: parsed.skillProficiencies ?? [],
      skillExpertise: parsed.skillExpertise ?? [],
      savingThrowProficiencies: parsed.savingThrowProficiencies ?? [],
      weapons: (parsed.weapons ?? []).map((w: Partial<Weapon>) => ({
        ...w,
        description: w.description ?? undefined,
        range: w.range ?? undefined,
        masteryProperty: w.masteryProperty ?? undefined,
        specialAbilities: w.specialAbilities ?? undefined,
      })) as Weapon[],
      gender: parsed.gender ?? '',
      pronouns: parsed.pronouns ?? '',
      equipment: parsed.equipment ?? [],
      supplies: parsed.supplies ?? [],
      identities: parsed.identities ?? [],
      activeIdentityId: parsed.activeIdentityId ?? undefined,
      campaignId: parsed.campaignId ?? undefined,
      customHooks: parsed.customHooks ?? [],
      feats: parsed.feats ?? [],
      // Slice 6b. Defaulted to [] rather than left undefined so that every
      // reader can iterate without a guard, and so a sheet written before 6b
      // gains the fields the first time it is saved — no migration step, no
      // version stamp, and nothing existing is touched.
      resourcePools: parsed.resourcePools ?? [],
      customConditions: parsed.customConditions ?? [],
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

  // Slice 6b: authored pools refill last, over the top of everything above.
  // `rechargePools` touches ONLY `resourcePools` — the paladin pair and the
  // feature counters are recharged by the code immediately above this line and
  // must keep exactly one writer each, or a bug in one gets masked by the
  // other. Called on the merged object so it sees the fields as they will be
  // saved, not as they were.
  return rechargePools(
    {
      ...character,
      spellSlots: slots,
      features,
      hitPoints: { ...character.hitPoints, current: character.hitPoints.max },
      tempHP: 0,
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      ...(paladinResources && { paladinResources }),
    },
    'long',
  )
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

  // Only pools whose recharge is 'shortRest' come back here — see the refill
  // table in rechargePools. A long-rest pool surviving a short rest is the
  // whole point of the distinction.
  return rechargePools(
    {
      ...character,
      features,
      ...(paladinResources && { paladinResources }),
    },
    'short',
  )
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

// ---------------------------------------------------------------------------
// Spell CRUD
// ---------------------------------------------------------------------------

/** Add a new spell to the character's spell list. */
export function addSpell(char: Character, spell: Spell): Character {
  return { ...char, spells: [...char.spells, spell] }
}

/** Update a spell by its original name. */
export function updateSpell(char: Character, oldName: string, spell: Spell): Character {
  return {
    ...char,
    spells: char.spells.map(s => s.name === oldName ? spell : s),
  }
}

/** Remove a spell from the character's spell list. */
export function removeSpell(char: Character, spellName: string): Character {
  return {
    ...char,
    spells: char.spells.filter(s => s.name !== spellName),
  }
}
