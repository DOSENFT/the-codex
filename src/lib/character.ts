import { type AbilityKey, type SkillName, SKILL_ABILITIES, CASTING_ABILITY, ABILITY_NAMES } from './dnd-rules'
import { resolveCharacter, storableOf, type DerivedNumbers } from './rules-2024/derive'
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

/** Everything about a character that is TYPED IN, and nothing that is worked out.
 *
 *  SHEET TRUTH slice 3. This is the half that goes to disk. `Character` — what
 *  every screen actually holds — is this plus `DerivedNumbers`, and the join
 *  happens in exactly one function, `resolveCharacter`. The point is not tidiness:
 *  a field that does not exist in this interface cannot be written to storage,
 *  cannot be spread out of an older copy, and therefore cannot go stale. Marcus's
 *  bug was a stored `spellSaveDC` of 15 outliving the Charisma 18 that produced
 *  it. After this there is no stored `spellSaveDC` to outlive anything. */
export interface CharacterBase {
  id: string // Unique identifier (crypto.randomUUID)
  name: string
  class: string
  subclass: string
  race: string
  level: number
  spellcastingAbility: string // "Charisma", "Wisdom", "Intelligence"
  /** The save DC for a character the app has NO CASTING RULE FOR — nothing else.
   *
   *  `CASTING_ABILITY` knows which ability a class casts with; when it knows,
   *  the DC is arithmetic and this field is ignored outright. It exists for the
   *  open world: a homebrew class, or a Fighter whose DM gave them a spell, where
   *  refusing to show any number at all would be the app overruling his table.
   *
   *  Named `…Override` and not `spellSaveDC` on purpose. Nothing may read this
   *  directly — `resolveCharacter` is the only reader — because a second reader
   *  is how the stale copy comes back wearing a different name. */
  spellSaveDCOverride?: number
  /** The spell attack bonus for a class the app has no casting rule for.
   *  Same contract as `spellSaveDCOverride`; read only by `resolveCharacter`. */
  spellAttackBonusOverride?: number
  armorClass: number
  hitPoints: { max: number; current: number }

  // Combat state
  conditions: string[] // Active condition names
  deathSaves: { successes: number; failures: number } // Track death saves
  tempHP: number // Temporary hit points
  /** What granted the CURRENT temp HP pool, or null/absent when it was typed in
   *  by hand and the app does not know.  Table Truth slice 10d.
   *
   *  WHY A FIELD AND NOT A DERIVATION. Slice 10a pinned canon's VAL-06 as
   *  violated and recorded the reason the fix could not be a guard inside
   *  `setTempHP`: 2024 says temp HP does not stack and the player CHOOSES which
   *  pool to keep, and a prompt offering that choice has to be able to name what
   *  it is about to destroy. Nothing recorded where a pool came from, so the
   *  prompt could not be written. This is that missing field, and it is the
   *  whole of the model change 10a said would be needed.
   *
   *  IT IS ONE MODEL, NOT TWO. The amount lives on `tempHP` and the label lives
   *  here, and they are written by the same function in the same call —
   *  `setTempHP` sets both, and clears this one whenever the pool reaches 0.
   *  There is deliberately no separate "is the cloak up" flag to drift out of
   *  step with the number: the cloak is up exactly while `tempHP > 0` and this
   *  names it, which is finding BB's lesson applied before the bug rather than
   *  after it.
   *
   *  OPTIONAL because it is persisted. Every character saved before 10d has no
   *  such key, `applyDamage` has never written one, and a pool with no recorded
   *  source is a real and permanent state — it is what typing a number into the
   *  HP tracker produces. Absent and null mean the same thing: the app does not
   *  know, and must say so rather than guess. */
  tempHPSource?: string | null

  // Spell management
  spells: Spell[]
  spellSlots: SpellSlots
  canPrepareSpells: boolean // true for Paladin, Cleric, Druid, Wizard
  /** The prepared-spell count for a class canon has NO PROGRESSION TABLE for.
   *
   *  A DEVIATION FROM GATE 3, recorded rather than slipped in. Gate 3 named two
   *  escape hatches, for the save DC and the spell attack. A third is needed for
   *  the same reason and by the same argument: canon ships a levels table for
   *  Paladin and for nothing else, so retiring the stored `maxPreparedSpells`
   *  without this would silently zero the prepared count of every Cleric, Druid
   *  and Wizard the app has never had a rule for. Read only by
   *  `resolveCharacter`, and only when canon has no row. */
  maxPreparedSpellsOverride?: number

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

/** A character as every screen sees it: what was typed in, plus what the rules
 *  work out from it.
 *
 *  THE NAME DOES NOT CHANGE, and that is the whole trick of this slice. ~200
 *  existing reads of `character.spellSaveDC` keep compiling and simply start
 *  being right, including `turn/options.ts`, which prints `DC ${…}` directly and
 *  is pinned byte-identical to main by `overlay.test.ts` case 15. The fields stay
 *  plain non-nullable `number`s for the same reason: a nullable derived field
 *  would render "DC null" through a file nothing is allowed to edit.
 *
 *  The only thing that moved is WHO MAY PRODUCE ONE. `resolveCharacter` is the
 *  sole way to turn a `CharacterBase` into a `Character`, and `storableOf` is the
 *  sole way back. Everything in between reads. */
export type Character = CharacterBase & DerivedNumbers

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

/* SHEET TRUTH slice 3. These two held the SECOND copy of the save-DC and
   spell-attack formulas — `8 + char.proficiencyBonus + abilityModifier(...)`,
   written out again here. They agreed with `derive.ts`, and nothing whatsoever
   made them agree, which is the precise condition that produced five copies of
   the proficiency formula in four spellings.

   They now delegate, so there is one copy. The bodies are gone, not the
   functions: `vitals.ts` calls them to work out what the rules SAY so it can
   compare that against what the sheet CLAIMS, and hollowing that comparison out
   is slice 7's job, done deliberately and with its own proof, not a side effect
   of tidying arithmetic here.

   Allocating a whole resolved character to read one number off it is wasteful
   and is meant to look it. Four call sites, all in render paths that already do
   far more work than this; the day that stops being true, the answer is to read
   `character.spellSaveDC` directly, which is now correct by construction. */

/** The 2024 spell save DC for this character. One copy, in `derive.ts`. */
export function computeSpellSaveDC(char: Character): number {
  return resolveCharacter(char).spellSaveDC
}

/** The 2024 spell attack bonus for this character. One copy, in `derive.ts`. */
export function computeSpellAttackBonus(char: Character): number {
  return resolveCharacter(char).spellAttackBonus
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

/* ---------------------------------------------------------------------------
   A FAILED WRITE IS NOT A SAVE.

   This is already the law of this codebase — `lib/covenant.ts` states it as
   Rule 2 and obeys it. `saveCharacter` did not. On a full disk, or on an iPad
   in private browsing, `localStorage.setItem` throws `QuotaExceededError`; the
   throw travelled up through every spend, the React tree unwound to the nearest
   boundary, and Marcus was told nothing at all. Measured 2026-08-23 under
   TABLE-READY D-5: the previous save survived (`intact=true`) but
   `userWasTold=false`, with an uncaught `QuotaExceededError` on the console.

   Two things change and nothing else does. The write no longer throws, and a
   write that did not happen is announced. What any feature DOES is untouched:
   the same value is written, at the same moment, by the same callers.
   --------------------------------------------------------------------------- */

export type SaveOutcome = { ok: true } | { ok: false; reason: string; stale?: true }

/** What `saveCharacter` returns, and ONLY `saveCharacter`.
 *
 *  SHEET TRUTH slice 2. Gate 3 planned to add `character` to `SaveOutcome`
 *  itself. Reading the code says no: `SaveOutcome` is also what `put`,
 *  `saveOrAnnounce`, `setActiveId` and `updateRosterEntry` return, and none of
 *  those has a character to hand back. Widening the shared type would have made
 *  three storage primitives carry a field they cannot fill.
 *
 *  WHY IT CARRIES THE CHARACTER AT ALL. This is the whole propagation fix. A
 *  component builds `{ ...character, abilityScores }` — a spread that copies the
 *  stale derived numbers along with everything else — and hands it here.
 *  Handing back the RESOLVED character, and making the caller set state from the
 *  return, means a stale spread cannot survive even one render. The alternative
 *  (each caller remembering to resolve) is the arrangement AMENDMENT A-19 was
 *  written about: it works until a call site forgets. */
export type CharacterSaveOutcome =
  | { ok: true; character: Character }
  | { ok: false; reason: string; stale?: true }

type SaveFailureListener = (reason: string) => void
const saveFailureListeners = new Set<SaveFailureListener>()

/** Subscribe to writes that did not happen. Returns the unsubscribe. */
export function onCharacterSaveFailure(fn: SaveFailureListener): () => void {
  saveFailureListeners.add(fn)
  return () => saveFailureListeners.delete(fn)
}

function announceFailure(reason: string): void {
  for (const fn of saveFailureListeners) {
    // A listener that throws must not turn a storage problem into a crash.
    try { fn(reason) } catch { /* the alarm is not allowed to be the fire */ }
  }
}

/** The reason a player would recognise, not the reason a stack trace gives. */
function reasonFor(err: unknown): string {
  const name = err instanceof Error ? err.name : ''
  if (/quota|QuotaExceeded|NS_ERROR_DOM_QUOTA/i.test(name + String(err))) {
    return 'This device is out of storage, so that change was not saved. Your last saved character is untouched — export it now (Settings → Export Character) before you free up space.'
  }
  return 'This device would not store that change. Your last saved character is untouched — export it now (Settings → Export Character).'
}

/** One guarded write. Never throws; says whether the bytes landed. */
function put(key: string, value: string): SaveOutcome {
  const store = globalThis.localStorage
  // `localStorage?.setItem(...)` is the tidy line and the wrong one: with no
  // storage at all it does nothing, throws nothing, and reports a save that
  // never happened. Absent storage is a failed write, stated as one.
  if (!store) return { ok: false, reason: 'This device has nowhere to store your character.' }
  try {
    store.setItem(key, value)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: reasonFor(err) }
  }
}

/* One guarded write that also raises the alarm — the whole of what D-5 asks,
   in one call, for every writer that is not `saveCharacter`.

   `put` and `announceFailure` were private, so the law above applied only to
   the character file. Independent verification on 2026-08-25 measured what
   that cost: with storage refusing `codex-*`, the FIRST tap of an encounter —
   `Start Combat`, writing `codex-combat-*` through `saveCombatState` — threw
   `QuotaExceededError`, unwound `play/Combat` to its error boundary, and left
   the screen reading "Combat stopped". HP, conditions and the turn deck were
   gone, and switching tabs and back did not bring them back; only healthy
   storage did. Tapping `Action` mid-encounter did the same thing. The save
   alarm this file exists to raise never appeared, because the throw happened
   somewhere the alarm had never been wired.

   Exporting this changes no behaviour on a healthy device: the same value is
   written, at the same moment, by the same callers. It changes one thing on a
   full one — the screen stays up and says what happened. */
export function saveOrAnnounce(key: string, value: string): SaveOutcome {
  const wrote = put(key, value)
  if (!wrote.ok) announceFailure(wrote.reason)
  return wrote
}

/* ---------------------------------------------------------------------------
   LAST-WRITE-WINS IS SILENT DATA LOSS.

   Measured under TABLE-READY D-4: two tabs on the same origin, pool at 35. Tab
   one spends and stores 25. Tab two — sitting there since before that write,
   holding a stale character in memory — spends and stores 30. Tab one's write
   is gone, nothing on either screen says so, and the pool Marcus rations all
   night is wrong. One phone with the app open twice is all it takes.

   So a write now carries the `updatedAt` it was read at, and a write whose
   stored `updatedAt` has moved on is REFUSED rather than applied. Refuse, not
   merge: merging two spends means guessing which one the player meant, and a
   wrong guess is the same lost charge with a confident face on it. The caller
   reloads from disk and says so.

   Everything here is failure-shaped, and every uncertainty resolves to "no
   conflict": no `readAt`, no stored record, unparseable JSON, or a stored
   record with no `updatedAt` all fall through to the write. A guard that
   refuses saves on a hunch is worse than the bug it was added for.
   --------------------------------------------------------------------------- */

/** What THIS TAB has last seen on disk for each character id.
 *
 *  AMENDMENT A-19 — this was a `readAt` string threaded in from `useCharacter`,
 *  and independent verification proved that wrong in a way the two-tab browser
 *  proof could not see. Four call sites write directly and never touch the
 *  hook: `EngageCard` ×2, `CampaignEditor`, and `migrateFromLegacy` below.
 *  Those writes moved disk without moving the hook's ref, so the next ordinary
 *  spend IN THE SAME TAB was refused as a foreign write and Marcus was told a
 *  window that does not exist had changed his file. Opening Settings mounts
 *  `CampaignEditor`, so it cost him a Lay on Hands charge every single time.
 *
 *  Keeping the record here, at the write, means it cannot go stale no matter
 *  who calls. The guard stops depending on the convention "everything goes
 *  through the hook" — a convention four call sites already broke, that
 *  neither the types nor a test enforced, and that nothing stops a fifth from
 *  breaking tomorrow. It also means the three bypassing call sites are now
 *  guarded against the other tab for free, which they were not.
 *
 *  Module-level and deliberately not persisted: it describes what this tab
 *  has observed, and a tab that has observed nothing must never refuse. */
const seenOnDisk: Record<string, string> = {}

/** The stored `updatedAt` for `id`, or null if there is nothing comparable. */
function storedStamp(id: string): string | null {
  const store = globalThis.localStorage
  if (!store) return null
  try {
    const raw = store.getItem(CHAR_PREFIX + id)
    if (!raw) return null
    const at = (JSON.parse(raw) as { updatedAt?: unknown }).updatedAt
    return typeof at === 'string' ? at : null
  } catch {
    return null
  }
}

/** The stored `updatedAt`, for a caller that needs to know what disk holds —
 *  read back after a write rather than assumed from the object it passed in,
 *  because a write can land, half-land (character yes, roster no), or not land
 *  at all, and only the file knows which happened. */
export function characterStamp(id: string): string | null {
  return storedStamp(id)
}

/** The stamp for the write about to happen, guaranteed to differ from the one
 *  already on disk.
 *
 *  `new Date().toISOString()` is millisecond-resolution, and two writes inside
 *  one millisecond produce the same string — so the conflict check above would
 *  compare a stale tab's stamp against a stamp the other tab had just written
 *  and find them equal. The guard would then wave through exactly the write it
 *  exists to refuse. Caught by the unit tests, which write both tabs back to
 *  back and hit the same millisecond every single run; the browser proof never
 *  would, because human taps are hundreds of milliseconds apart. That gap
 *  between "cannot happen at a table" and "cannot happen" is this project's
 *  oldest way of being wrong.
 *
 *  `<=` and not `<`, so a clock that has gone backwards — a device that just
 *  synced NTP, or crossed a DST boundary with a bad implementation — cannot
 *  issue a stamp that sorts before one already on disk either. The invariant
 *  the check depends on is the only thing being bought here: EVERY successful
 *  write leaves a stamp different from the one it replaced. */
function nextStamp(id: string): string {
  const now = new Date().toISOString()
  const prev = storedStamp(id)
  if (!prev || now > prev) return now
  const bumped = Date.parse(prev) + 1
  return Number.isNaN(bumped) ? now : new Date(bumped).toISOString()
}

const STALE_REASON =
  'This character was changed in another window since this one opened it, so that change was NOT saved — saving it would have erased the other window’s. This sheet has been refreshed to what is on disk. Do it again here, and close the other window.'

/**
 * Save a character to its per-id slot and update the roster.
 *
 * Returns the outcome for callers that can act on it, and announces a failure
 * to every subscriber for the ones that cannot. It does not throw: a spend that
 * cannot be persisted must still leave the sheet on screen and the previous
 * save on disk.
 *
 * The write is refused when disk has moved since this tab last saw it —
 * `{ stale: true }`, so the caller can reload rather than treat it as a
 * storage fault. No argument is needed for that: `seenOnDisk` above is kept by
 * this function, so every call site is guarded and none of them can hold a
 * stale idea of what disk contains.
 *
 * `replacing: true` writes unconditionally, for a caller that means to replace
 * the record wholesale no matter what is under it. Nothing in the app passes
 * it today — an import from this tab is not in conflict with this tab — and it
 * exists so that a future caller which genuinely does mean "overwrite" has to
 * say so in the source rather than by omitting an argument.
 */
export function saveCharacter(
  /* `CharacterBase`, not `Character` — slice 3. A caller does not have to have
     worked the derived numbers out already, because this function is going to
     work them out regardless; requiring them would be asking every caller to
     produce a value it is about to throw away. Every `Character` is a
     `CharacterBase`, so all three production callers pass unchanged. */
  incoming: CharacterBase,
  opts: { replacing?: boolean } = {},
): CharacterSaveOutcome {
  // SHEET TRUTH slice 2. Resolve FIRST, before the staleness check and before
  // the stamp, so that everything downstream — the bytes on disk, the roster
  // entry, the value returned to the caller — is the same corrected character.
  // Resolving after the write would put one thing on disk and another on screen,
  // which is the exact shape of the bug this phase exists to kill.
  const character = resolveCharacter(incoming)

  const seen = seenOnDisk[character.id]
  if (!opts.replacing && seen) {
    const on = storedStamp(character.id)
    if (on && on !== seen) {
      const refused: CharacterSaveOutcome = { ok: false, reason: STALE_REASON, stale: true }
      announceFailure(STALE_REASON)
      return refused
    }
  }
  character.updatedAt = nextStamp(character.id)
  // SHEET TRUTH slice 3 — the one line the whole slice is for. What is RETURNED
  // is the resolved character, because that is what the screens need; what is
  // WRITTEN is the base, with the four worked-out numbers subtracted. Slices 1
  // and 2 made the stored copies right on the way in and on the way out. This
  // stops there being a stored copy at all, so there is nothing left to be
  // stale — including the `spellSaveDC` key an older build left on disk, which
  // is spread through `normalizeInner` but deleted here, so the first save after
  // this ships is also the migration.
  const wrote = put(CHAR_PREFIX + character.id, JSON.stringify(storableOf(character)))
  if (!wrote.ok) {
    announceFailure(wrote.reason)
    return wrote
  }
  // The bytes are down, so this IS now what disk holds — recorded before the
  // roster, because a roster failure does not un-write the character.
  seenOnDisk[character.id] = character.updatedAt
  // The roster is an index, not the character. If it cannot be updated the
  // character itself is still safely on disk, so this is reported, not fatal.
  const indexed = updateRosterEntry(character)
  if (!indexed.ok) {
    announceFailure(indexed.reason)
    return indexed
  }
  // A roster failure returns above rather than falling through, because a
  // caller that sets its state from `character` on a reported failure would be
  // showing a sheet the index does not list.
  return { ok: true, character }
}

/**
 * Make a partial character safe to render.
 *
 * This was the body of `loadCharacter`, and living in there is what caused the
 * import bug of 2026-08-17. Marcus exported Nix from an older build, imported
 * the file on a new device, and the app white-screened — because `loadCharacter`
 * defaulted every required field while BOTH import paths did `parsed as
 * Character`, a cast that promises the compiler something the file does not
 * contain. His real export was missing `feats`, `customHooks`, `resourcePools`
 * and `customConditions`; an older one was also missing `abilityScores` and
 * `weapons`. Each of those is read without a guard during boot.
 *
 * A cast is not a check. Every route by which a character enters this app —
 * storage, file import, paste — goes through here now, so there is one place
 * that knows what a complete character is, and adding a required field means
 * adding one default here rather than remembering three call sites.
 */
/**
 * `equipment` and `supplies` are plain `string[]`, and the screens render them
 * directly. An object in there is React error #31 — "objects are not valid as a
 * React child" — which takes out the whole Character tab. Coerce rather than
 * trust: an object with a name becomes its name, anything else is dropped.
 */
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(v => {
      if (typeof v === 'string') return v
      if (v && typeof v === 'object') {
        const o = v as { name?: unknown; quantity?: unknown }
        if (typeof o.name === 'string') {
          const qty = typeof o.quantity === 'number' && o.quantity > 1 ? ` x${o.quantity}` : ''
          return o.name + qty
        }
      }
      return ''
    })
    .filter(Boolean)
}

/**
 * A persona is optional; a HALF-written persona is not. The Academy screen maps
 * `physicalTics`/`sceneInstincts`/`quietTexture` and the Persona screen reads
 * `patron.domains`, none of them guarded — so `persona: {}` in a file killed two
 * screens while the rest of the app carried on looking healthy.
 */
function normalizePersona(p: Partial<CharacterPersona>): CharacterPersona {
  return {
    ...p,
    defaultState: p.defaultState ?? '',
    decisionTree: p.decisionTree ?? '',
    physicalTics: texts(p.physicalTics, 'Persona physical tics'),
    sceneInstincts: texts(p.sceneInstincts, 'Persona scene instincts'),
    quietTexture: texts(p.quietTexture, 'Persona quiet texture'),
    patron: {
      name: text(p.patron?.name, '', 'A patron name'),
      domains: texts(p.patron?.domains, 'Patron domains'),
      symbol: p.patron?.symbol ?? '',
      rpNotes: p.patron?.rpNotes ?? '',
    },
  }
}

/* ── Coercion: the fourth time, and the last ──────────────────────────────────
   Everything below this comment defaults fields that are MISSING. That is three
   bugs' worth of hard-won defaulting and it is still not enough, because the
   fourth shape of this bug is a field that is PRESENT and the wrong type. An
   independent verifier found six of them in one afternoon, on a build I had just
   finished calling clean:

     {"spells":[null]}                     → (null).name          · 7 screens hollow
     {"features":[null]}                   → the same             · 7 screens hollow
     {"weapons":[{"properties":"finesse"}]} → w.properties.map is not a function
                                              · prep/Character renders the polite
                                                boundary notice — the exact thing
                                                TABLE-READY.md exists to prevent
     {"spells":[{"description":{"text":"x"}}]} → React #31 · ALL SEVEN BLANK
     {"customConditions":[{}]}             → (undefined).trim()

   `?? []` cannot see any of these. `properties: w.properties ?? []` passes a
   STRING straight through, because a string is not nullish, and then seven call
   sites spread or `.map` it. The frozen twelve hostile shapes in the check suite
   all pass — they are the survivors, not a sample.

   So: coerce by TYPE, not by presence. A record that is not a record is dropped,
   a string that is an object becomes blank, a list that is not a list becomes
   empty — and every one of those is written down and handed back, because
   silently eating half a character is how you find out at the table that your
   spells are gone. Marcus gets told exactly which record and which field.

   These are deliberately not exported. The only correct place to distrust a file
   is the moment it is read, and that is here. */
let repairLog: string[] | null = null
const note = (msg: string) => { if (repairLog && !repairLog.includes(msg)) repairLog.push(msg) }

/** A list of records, with everything that is not a record removed and named. */
function records<T>(value: unknown, field: string): Partial<T>[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) { note(`${field} was not a list, so none were loaded`); return [] }
  const out: Partial<T>[] = []
  value.forEach((v, i) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v as Partial<T>)
    else note(`${field} #${i + 1} was ${v === null ? 'empty' : `a ${typeof v}`}, not an entry, so it was dropped`)
  })
  return out
}

/** Text, or the fallback. Never an object — React renders those as error #31. */
function text(value: unknown, fallback: string, field: string): string {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const was = Array.isArray(value) ? 'a list' : 'an object'
  note(`${field} was ${was} rather than text, so ${fallback ? `it fell back to “${fallback}”` : 'it was left blank'}`)
  return fallback
}

/** A list of plain strings, with anything else dropped. */
function texts(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) { note(`${field} was not a list, so it was left empty`); return [] }
  const out: string[] = []
  value.forEach(v => { if (typeof v === 'string') out.push(v) })
  const lost = value.length - out.length
  if (lost) note(`${field}: ${lost} ${lost === 1 ? 'entry was' : 'entries were'} not text, so ${lost === 1 ? 'it was' : 'they were'} dropped`)
  return out
}

function num(value: unknown, fallback: number, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value === undefined || value === null) return fallback
  const n = Number(value)
  if (Number.isFinite(n)) return n
  note(`${field} was not a number, so it was set to ${fallback}`)
  return fallback
}

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : value === undefined || value === null ? fallback : Boolean(value)

/**
 * Normalise a character read from anywhere untrusted — a file, localStorage, an
 * older version of this app.
 *
 * @param repairs if supplied, every coercion made is appended to it in plain
 *   language, so the caller can tell Marcus what changed instead of guessing.
 */
export function normalizeCharacter(
  parsed: Partial<Character>,
  fallbackId?: string,
  repairs?: string[],
): CharacterBase {
  repairLog = repairs ?? null
  try {
    return normalizeInner(parsed, fallbackId)
  } finally {
    repairLog = null
  }
}

/** Say, in plain language, that a number on the file was replaced by one the
 *  rules work out — Gate 3's answer to "how does Marcus find out his 15 became a
 *  14?". It is a line in the repair log that already exists, not a modal and not
 *  a prompt: he is not being asked to decide anything, he is being told what the
 *  app did, in the one place the app already tells him what it did to his file.
 *
 *  Only for a class the app HAS a rule for. For anything else the stored number
 *  is still the answer, so nothing was replaced and there is nothing to report —
 *  silence meaning "I have nothing to add", as everywhere else in this codebase. */
function noteRetiredNumbers(parsed: Partial<Character>): void {
  if (!repairLog) return
  const casting = parsed.class ? CASTING_ABILITY[parsed.class] : undefined
  if (!casting) return
  // `ABILITY_NAMES` and not the raw key: this line is read by a player, and
  // "worked out from your CHA" is the app talking to itself out loud. Caught by
  // the test asserting the sentence names the ability, not the column heading.
  const ability = ABILITY_NAMES[casting]
  if (typeof parsed.spellSaveDC === 'number')
    note(`Your spell save DC (${parsed.spellSaveDC} on the file) is now worked out from your ${ability} and your level, so it can never fall behind an ability score change`)
  if (typeof parsed.spellAttackBonus === 'number')
    note(`Your spell attack bonus (${parsed.spellAttackBonus >= 0 ? '+' : ''}${parsed.spellAttackBonus} on the file) is now worked out the same way`)
}

function normalizeInner(parsed: Partial<Character>, fallbackId?: string): CharacterBase {
  noteRetiredNumbers(parsed)
  return {
    ...parsed,
    id: parsed.id ?? fallbackId ?? generateId(),
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
      spellcastingAbility: parsed.spellcastingAbility ?? '',
      canPrepareSpells: parsed.canPrepareSpells ?? false,
      /* SHEET TRUTH slice 3 — this is where `proficiencyBonus ?? 2`,
         `spellSaveDC ?? 10`, `spellAttackBonus ?? 0` and `maxPreparedSpells ?? 0`
         used to be, and it is also the migration for every sheet already on disk.
         There is no default any more because there is nothing to default: those
         four are worked out by `resolveCharacter`, which runs on the way off the
         disk and on the way onto it.
         The old stored number is not thrown away, it is DEMOTED. It becomes the
         override, which `resolveCharacter` consults only for a class the app has
         no rule for. So a Fighter whose DM handed them a spell keeps the DC that
         was typed in, and Marcus's Paladin has his 15 ignored in favour of the 14
         his Charisma actually produces. `??` and not `||`, so a legitimately
         stored 0 survives. */
      spellSaveDCOverride: parsed.spellSaveDCOverride ?? parsed.spellSaveDC,
      spellAttackBonusOverride: parsed.spellAttackBonusOverride ?? parsed.spellAttackBonus,
      maxPreparedSpellsOverride: parsed.maxPreparedSpellsOverride ?? parsed.maxPreparedSpells,
      /* The third instance of the same bug, found 2026-08-17 by importing a
         spell that had only a name. `description` is required by both types and
         is read raw in at least four places — `spell.description.slice(0, 80)`
         and `feature.description.slice(0, 100)` inside a `.map` in
         ActionMenu.tsx, and `.split(/\.\s/)` in turn/options.ts. Undefined
         there does not white-screen; it trips the combat error boundary, so the
         app says "Combat stopped" while everything else keeps running. That is
         WORSE than a blank page, because it reads as handled — the one screen
         Marcus actually uses at the table is dead and the app looks fine.
         Defaulted here rather than guarded at each read site, so the next
         person to reach for `.description` cannot reintroduce it. */
      spells: records<Spell>(parsed.spells, 'A spell').map(s => ({
        ...s,
        name: text(s.name, 'Spell', 'A spell name'),
        level: num(s.level, 0, 'A spell level'),
        school: text(s.school, '', 'A spell school'),
        castingTime: text(s.castingTime, '1 action', 'A casting time'),
        range: text(s.range, '', 'A spell range'),
        components: text(s.components, '', 'Spell components'),
        duration: text(s.duration, 'Instantaneous', 'A spell duration'),
        concentration: bool(s.concentration, false),
        ritual: bool(s.ritual, false),
        description: text(s.description, '', 'A spell description'),
        prepared: bool(s.prepared, false),
      })) as Spell[],
      features: records<ClassFeature>(parsed.features, 'A feature').map(f => ({
        ...f,
        name: text(f.name, 'Feature', 'A feature name'),
        level: num(f.level, 1, 'A feature level'),
        description: text(f.description, '', 'A feature description'),
      })) as ClassFeature[],
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
      weapons: records<Weapon>(parsed.weapons, 'A weapon').map(w => ({
        ...w,
        // `properties` is REQUIRED by the type and was still arriving undefined
        // from real files, which is the top-level import bug one layer down:
        // defaulting the character is not the same as defaulting what is inside
        // it. Seven places spread or iterate this without a guard
        // (`...weapon.properties` in turn/options.ts and print/CharacterRecord,
        // `.map`/`.includes` in CharacterPage, `.some` in skill-guide), and a
        // spread of undefined throws "not iterable" — a white screen, above
        // every error boundary. Found 2026-08-17 by a synthetic export that had
        // a weapon at all; Marcus's own file has none, so it hid.
        // …and the fourth instance was `properties: "finesse"` — a STRING, which
        // is not nullish, so `?? []` waved it through and `.map` threw one frame
        // later. Typed coercion, not presence: a list or nothing.
        properties: texts(w.properties, 'Weapon properties') as Weapon['properties'],
        name: text(w.name, 'Weapon', 'A weapon name'),
        attackType: w.attackType ?? 'melee',
        abilityMod: w.abilityMod ?? 'STR',
        proficient: bool(w.proficient, true),
        damageDice: text(w.damageDice, '1d4', 'Weapon damage dice'),
        damageType: text(w.damageType, 'bludgeoning', 'A weapon damage type') as Weapon['damageType'],
        description: w.description ?? undefined,
        range: w.range ?? undefined,
        masteryProperty: w.masteryProperty ?? undefined,
        specialAbilities: w.specialAbilities ?? undefined,
      })) as Weapon[],
      gender: parsed.gender ?? '',
      pronouns: parsed.pronouns ?? '',
      /* These two are `string[]`, and a file that puts objects in them renders
         the object as a React child — error #31, which kills the whole
         Character screen. Coerced rather than trusted: the file is not ours. */
      equipment: toStringList(parsed.equipment),
      supplies: toStringList(parsed.supplies),
      identities: records<CharacterIdentity>(parsed.identities, 'An identity').map(i => ({
        ...i,
        id: text(i.id, generateId(), 'An identity id'),
        name: text(i.name, 'Identity', 'An identity name'),
        isDefault: bool(i.isDefault, false),
        voiceNotes: text(i.voiceNotes, '', 'Identity voice notes'),
        mannerisms: texts(i.mannerisms, 'Identity mannerisms'),
        personalityTraits: texts(i.personalityTraits, 'Identity personality traits'),
        triggers: texts(i.triggers, 'Identity triggers'),
        /* NOT `texts()` — these are records, not strings, and the typechecker
           caught me writing it the easy way. A bare string here reaches the
           Roleplay screen as `l.text === undefined` and renders an empty row
           with a dead favourite toggle, so it is dropped and named instead. */
        dialogueLines: records<DialogueLine>(i.dialogueLines, 'An identity dialogue line').map(l => ({
          ...l,
          text: text(l.text, '', 'A dialogue line'),
          context: text(l.context, 'social', 'A dialogue line context'),
          favorite: bool(l.favorite, false),
        })) as DialogueLine[],
      })) as CharacterIdentity[],
      activeIdentityId: parsed.activeIdentityId ?? undefined,
      campaignId: parsed.campaignId ?? undefined,
      customHooks: records<CustomRPHook>(parsed.customHooks, 'A roleplay hook').map(h => ({
        ...h,
        id: text(h.id, generateId(), 'A hook id'),
        category: h.category ?? 'ask',
        text: text(h.text, '', 'A hook'),
        createdAt: text(h.createdAt, new Date().toISOString(), 'A hook timestamp'),
      })) as CustomRPHook[],
      // `persona` is optional, but a HALF-written one is not: the Academy screen
      // maps its arrays and the Persona screen reads the patron's domains, both
      // without a guard. An empty `{}` persona killed two screens.
      persona: parsed.persona && typeof parsed.persona === 'object' && !Array.isArray(parsed.persona)
        ? normalizePersona(parsed.persona)
        : undefined,
      // Same story as `weapons.properties`: `effects` is required by the type,
      // arrives missing from older exports, and is read with `.length` without
      // a guard — which is a white screen at boot, not a missing bullet list.
      feats: records<CharacterFeat>(parsed.feats, 'A feat').map(f => ({
        ...f,
        name: text(f.name, 'Feat', 'A feat name'),
        description: text(f.description, '', 'A feat description'),
        isHomebrew: bool(f.isHomebrew, false),
        effects: Array.isArray(f.effects) ? f.effects : [],
      })) as CharacterFeat[],
      // Slice 6b. Defaulted to [] rather than left undefined so that every
      // reader can iterate without a guard, and so a sheet written before 6b
      // gains the fields the first time it is saved — no migration step, no
      // version stamp, and nothing existing is touched.
      /* These two were the only record arrays passed through entirely raw, and
         `customConditions: [{}]` — a condition with no name — reached a bare
         `.trim()` and took prep/Character down behind its boundary. A homebrew
         condition is hand-written by definition; it is the LAST thing that
         should have been trusted. */
      resourcePools: records<ResourcePool>(parsed.resourcePools, 'A resource pool').map(p => ({
        ...p,
        id: text(p.id, generateId(), 'A pool id'),
        name: text(p.name, 'Resource', 'A pool name'),
        current: num(p.current, 0, 'A pool value'),
        max: num(p.max, 0, 'A pool maximum'),
      })) as ResourcePool[],
      customConditions: records<CustomCondition>(parsed.customConditions, 'A homebrew condition').map(c => ({
        ...c,
        name: text(c.name, 'Condition', 'A condition name'),
        cascades: texts(c.cascades, 'Condition cascades'),
      })) as CustomCondition[],
  } as CharacterBase
}

/** Load a specific character by id. Applies migration defaults for new fields. */
export function loadCharacter(id: string): Character | null {
  const saved = localStorage.getItem(CHAR_PREFIX + id)
  if (!saved) return null
  try {
    // SHEET TRUTH slice 1. Every number the rules can work out is worked out
    // here, on the way off the disk, so no screen can be handed a stale one.
    // The stored copies are still WRITTEN at this slice — slice 3 stops that —
    // but nothing reads them any more, because this overwrites them first.
    const character = resolveCharacter(
      normalizeCharacter(JSON.parse(saved) as Partial<Character>, id),
    )
    // Reading IS seeing. This is what makes a refusal recoverable: the caller
    // reloads from disk, and the next attempt is measured against what it just
    // read rather than against the state it was holding when it lost.
    const at = storedStamp(id)
    if (at) seenOnDisk[id] = at
    return character
  } catch {
    return null
  }
}

/** Delete a character by id — removes per-id key, training data, and roster entry. */
export function deleteCharacter(id: string): void {
  // Forget what we saw, or re-creating this id later would be measured against
  // a record that no longer exists and refused on a ghost.
  delete seenOnDisk[id]
  localStorage.removeItem(CHAR_PREFIX + id)
  localStorage.removeItem(`codex-training-${id}`)
  const roster = loadRoster().filter(e => e.id !== id)
  // Guarded even though the two removeItem calls above have already freed
  // space: if this one throws, the character's data is gone and the roster
  // still lists it, which is the one state that reads as corruption.
  saveOrAnnounce(ROSTER_KEY, JSON.stringify(roster))
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
function updateRosterEntry(char: Character): SaveOutcome {
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
  return put(ROSTER_KEY, JSON.stringify(roster))
}

// ---------------------------------------------------------------------------
// Active character tracking
// ---------------------------------------------------------------------------

/** Get the id of the last-used character. */
export function getActiveId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY)
}

/** Set the active character id. Guarded for the same reason as the rest: a
 *  device that cannot remember who is active must not take the sheet down. */
export function setActiveId(id: string): SaveOutcome {
  const wrote = put(ACTIVE_ID_KEY, id)
  if (!wrote.ok) announceFailure(wrote.reason)
  return wrote
}

// ---------------------------------------------------------------------------
// Legacy migration (one-time, from single-character format)
// ---------------------------------------------------------------------------

/** Migrate old `codex-character` key into the new roster system. Returns true if migration occurred.
 *
 *  SHEET TRUTH slice 3. This used to hand-roll its own defaults block — a fifth
 *  copy of what `normalizeCharacter` already does — and spread `parsed` straight
 *  into `saveCharacter`. That was survivable while the derived numbers were also
 *  stored. It stopped being survivable the moment `storableOf` began deleting
 *  them on write: the legacy record's `spellSaveDC` was spread in and then
 *  DELETED, rather than demoted to `spellSaveDCOverride` the way every other
 *  read path demotes it. The number was not retired, it was destroyed.
 *
 *  For Marcus that is invisible, because the app can work a Paladin's DC out
 *  again. For a class it has no casting rule for, the override is the ONLY place
 *  that number can live — and for a Cleric, Druid or Wizard the same is true of
 *  `maxPreparedSpells`, since canon ships a levels table for Paladin and nothing
 *  else. This path would have silently zeroed all of them, with no line in the
 *  repair log to say so.
 *
 *  Found by `_probe-disk.mjs` — a real Chrome against real localStorage —
 *  reporting `overrides kept: (none)` where it should have read
 *  `spellSaveDCOverride=15`. The unit tests were green: `storable.test.ts`
 *  exercises the write paths it calls, and it never called this one. That is the
 *  whole reason the browser probe exists.
 *
 *  Now goes through the one door every other read goes through, which also gets
 *  it the careful coercions it was skipping — `toStringList` on supplies rather
 *  than a bare `?? []`. */
export function migrateFromLegacy(): boolean {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as Partial<Character>
    if (!parsed.name) return false
    const id = generateId()
    /* `id` is FORCED, not merely passed as a fallback. `normalizeCharacter`'s
     * second argument only applies when the record has no id of its own, and a
     * legacy record may well carry one — at which point the sheet is filed under
     * THAT id while `setActiveId` below points at this one. The active id then
     * names a character that does not exist and the app drops to the roster
     * picker on boot. That is a regression this very edit introduced, and the
     * browser probe caught it within a minute: no character screen, so no prep
     * tab, so nothing to click. The old hand-rolled block ended with an
     * unexplained `character.id = id`; this is what it was for. */
    saveCharacter({ ...normalizeCharacter(parsed, id), id })
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
    // A depleted pool must stop naming its source. Nix's cloak "lasts until the
    // Temporary Hit Points are depleted" — so the moment damage eats the last
    // point, the cloak is over and the label is a lie. Clearing it here rather
    // than tracking a separate "cloak active" flag is the whole reason the label
    // lives beside the number: one write, one truth. Slice 10d.
    ...(tempHP === 0 && { tempHPSource: null }),
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

/** Set temp HP, recording WHAT granted it.
 *
 *  The old doc on this function read "replaces, doesn't stack per 2024 rules",
 *  which was half right and the wrong half: 2024 temp HP does not stack, but
 *  the rule is that the PLAYER chooses which pool to keep, not that the newest
 *  one wins. This function is still the blind setter — deliberately. The choice
 *  belongs to whoever can ask a human, and `rules-2024/temp-hp.ts` decides
 *  whether there is anything worth asking about. A setter that silently refused
 *  would be worse than one that silently accepts, because the caller would have
 *  no way to tell the difference.
 *
 *  What IS new is `source`. Amount and label are written by this one function in
 *  this one call so they cannot drift apart, and the label is cleared whenever
 *  the pool reaches 0 — a dead pool must not keep naming the feature that
 *  granted it. Passing no source means "the app does not know", which is the
 *  honest state after a hand-typed number and is not the same as guessing.
 *
 *  Table Truth slice 10d. */
export function setTempHP(
  character: Character,
  amount: number,
  source: string | null = null,
): Character {
  const tempHP = Math.max(0, amount)
  return { ...character, tempHP, tempHPSource: tempHP > 0 ? source : null }
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
