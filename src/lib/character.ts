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
  character: Character,
  opts: { replacing?: boolean } = {},
): SaveOutcome {
  const seen = seenOnDisk[character.id]
  if (!opts.replacing && seen) {
    const on = storedStamp(character.id)
    if (on && on !== seen) {
      const refused: SaveOutcome = { ok: false, reason: STALE_REASON, stale: true }
      announceFailure(STALE_REASON)
      return refused
    }
  }
  character.updatedAt = nextStamp(character.id)
  const wrote = put(CHAR_PREFIX + character.id, JSON.stringify(character))
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
  if (!indexed.ok) announceFailure(indexed.reason)
  return indexed
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
): Character {
  repairLog = repairs ?? null
  try {
    return normalizeInner(parsed, fallbackId)
  } finally {
    repairLog = null
  }
}

function normalizeInner(parsed: Partial<Character>, fallbackId?: string): Character {
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
      proficiencyBonus: parsed.proficiencyBonus ?? 2,
      spellcastingAbility: parsed.spellcastingAbility ?? '',
      spellSaveDC: parsed.spellSaveDC ?? 10,
      spellAttackBonus: parsed.spellAttackBonus ?? 0,
      canPrepareSpells: parsed.canPrepareSpells ?? false,
      maxPreparedSpells: parsed.maxPreparedSpells ?? 0,
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
  } as Character
}

/** Load a specific character by id. Applies migration defaults for new fields. */
export function loadCharacter(id: string): Character | null {
  const saved = localStorage.getItem(CHAR_PREFIX + id)
  if (!saved) return null
  try {
    const character = normalizeCharacter(JSON.parse(saved) as Partial<Character>, id)
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
