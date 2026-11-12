// ---------------------------------------------------------------------------
// Defenses — what Nix is immune or resistant to, and WHY
// ---------------------------------------------------------------------------
//
// Marcus, 2026-11-12: "I have a pendant that provides me ... full resistance to
// poison ... when I try to input that amulet or that pendant into my items, it
// doesn't do any changes or effects."
//
// Before this file the app had no idea of a damage type at all. Equipment is a
// list of names (`equipment: string[]`), nothing read it, and even his own
// Aura of Solace (resistance to Fire, Cold and Psychic) was prose. So a poison
// hit took full HP off a character who is immune to poison, and the screen
// looked exactly as it would if that were right.
//
// THE MODEL. Two sources, one answer:
//   1. `magicItems[]` — items HE authors, each carrying the protections it
//      grants. Only an EQUIPPED item counts: a periapt in the bag protects
//      nobody.
//   2. Aura of Solace — his subclass feature, from level 7. Off while he is
//      Incapacitated (canon VAL-12), and the app says so rather than going
//      quiet.
// Every defense names its sources, so at a table "why did that do nothing?"
// has an answer on the screen.
//
// THE RULES APPLIED (2024 PHB, "Damage and Healing"): Immunity means the
// damage does nothing. Resistance halves it, rounded down. Resistance is
// applied BEFORE temporary hit points absorb anything. Immunity beats
// resistance; two sources of the same resistance still only halve once.
//
// Type-only import from character.ts, the same arrangement pools.ts uses, so
// character.ts can import this file at runtime without a cycle.
import type { CharacterBase } from '../character'

export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic',
  'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
] as const
export type DamageType = (typeof DAMAGE_TYPES)[number]

/** The fifteen 2024 conditions, spelled as the app's condition grid spells them. */
export const CONDITION_NAMES = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious',
] as const

/** Conditions that include Incapacitated in 2024, which switches auras off. */
const INCAPACITATING = new Set(['Incapacitated', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'])

export interface MagicItem {
  id: string
  name: string
  /** Worn or carried in a way that makes it work. Only equipped items protect. */
  equipped: boolean
  resistances: DamageType[]
  immunities: DamageType[]
  /** Condition names from CONDITION_NAMES. */
  conditionImmunities: string[]
  note?: string
}

export interface DamageDefense {
  damageType: DamageType
  kind: 'immune' | 'resist'
  sources: string[]
}

export interface ConditionDefense {
  condition: string
  sources: string[]
}

export interface Defenses {
  damage: DamageDefense[]
  conditions: ConditionDefense[]
  /** Sources that would protect him but are switched off right now, with why. */
  inactive: { source: string; reason: string }[]
}

/** Limits on a hand-edited or imported file. Generous for a real sheet, small
 *  enough that a corrupt file cannot flood the combat screen. */
export const MAX_MAGIC_ITEMS = 40
export const MAX_ITEM_NAME = 80
export const MAX_ITEM_NOTE = 300

const AURA_OF_SOLACE = 'aura of solace'
const AURA_OF_SOLACE_TYPES: DamageType[] = ['Fire', 'Cold', 'Psychic']

/** One-tap fills for common protective items. Only items whose 2024 text is a
 *  plain immunity or resistance are listed; anything that needs a choice
 *  (Ring of Resistance) is entered by hand. */
export const MAGIC_ITEM_PRESETS: Omit<MagicItem, 'id' | 'equipped'>[] = [
  {
    name: 'Periapt of Proof against Poison',
    immunities: ['Poison'],
    resistances: [],
    conditionImmunities: ['Poisoned'],
  },
  {
    name: 'Brooch of Shielding',
    immunities: [],
    resistances: ['Force'],
    conditionImmunities: [],
    note: 'Also immune to damage from the Magic Missile spell.',
  },
]

// ---------------------------------------------------------------------------
// Validation — every magic item on disk passes through here
// ---------------------------------------------------------------------------

function canonicalOf<T extends string>(list: readonly T[], value: unknown): T | null {
  if (typeof value !== 'string') return null
  const wanted = value.trim().toLowerCase()
  return list.find(v => v.toLowerCase() === wanted) ?? null
}

function canonicalList<T extends string>(list: readonly T[], value: unknown): T[] {
  if (!Array.isArray(value)) return []
  const out: T[] = []
  for (const raw of value) {
    const hit = canonicalOf(list, raw)
    if (hit && !out.includes(hit)) out.push(hit)
  }
  return out
}

let idCounter = 0
export function newMagicItemId(): string {
  idCounter += 1
  return `item-${Date.now().toString(36)}-${idCounter}`
}

/** Clean whatever a file says about magic items into the shape the app trusts.
 *
 *  Unknown damage types and conditions are dropped (never guessed at), names
 *  are trimmed and capped, an item with no name is dropped, and `equipped`
 *  defaults to true because an item someone bothered to write down with a
 *  protection on it is almost always one they are wearing. */
export function normalizeMagicItems(value: unknown): MagicItem[] {
  if (!Array.isArray(value)) return []
  const out: MagicItem[] = []
  const seenIds = new Set<string>()
  for (const raw of value) {
    if (out.length >= MAX_MAGIC_ITEMS) break
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const r = raw as Record<string, unknown>
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, MAX_ITEM_NAME) : ''
    if (!name) continue
    let id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : newMagicItemId()
    if (seenIds.has(id)) id = newMagicItemId()
    seenIds.add(id)
    const immunities = canonicalList(DAMAGE_TYPES, r.immunities)
    const item: MagicItem = {
      id,
      name,
      equipped: typeof r.equipped === 'boolean' ? r.equipped : true,
      immunities,
      // Immune already covers it; a resistance to the same type is noise.
      resistances: canonicalList(DAMAGE_TYPES, r.resistances).filter(t => !immunities.includes(t)),
      conditionImmunities: canonicalList(CONDITION_NAMES, r.conditionImmunities),
    }
    if (typeof r.note === 'string' && r.note.trim()) item.note = r.note.trim().slice(0, MAX_ITEM_NOTE)
    out.push(item)
  }
  return out
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

type DefenseSheet = Pick<CharacterBase, 'level' | 'features' | 'conditions'> & {
  magicItems?: unknown
}

function isIncapacitated(sheet: DefenseSheet): boolean {
  return (sheet.conditions ?? []).some(c => INCAPACITATING.has(c))
}

function hasAuraOfSolace(sheet: DefenseSheet): boolean {
  return (sheet.features ?? []).some(
    f => typeof f?.name === 'string' && f.name.trim().toLowerCase() === AURA_OF_SOLACE && (f.level ?? 0) <= sheet.level,
  )
}

/** Everything protecting this character right now, each with its sources. */
export function defensesOf(sheet: DefenseSheet): Defenses {
  const immune = new Map<DamageType, string[]>()
  const resist = new Map<DamageType, string[]>()
  const conditions = new Map<string, string[]>()
  const inactive: Defenses['inactive'] = []
  const add = <K>(map: Map<K, string[]>, key: K, source: string) => {
    const list = map.get(key) ?? []
    if (!list.includes(source)) list.push(source)
    map.set(key, list)
  }

  for (const item of normalizeMagicItems(sheet.magicItems)) {
    if (!item.equipped) continue
    for (const t of item.immunities) add(immune, t, item.name)
    for (const t of item.resistances) add(resist, t, item.name)
    for (const c of item.conditionImmunities) add(conditions, c, item.name)
  }

  if (hasAuraOfSolace(sheet)) {
    if (isIncapacitated(sheet)) {
      inactive.push({ source: 'Aura of Solace', reason: "off while you're Incapacitated" })
    } else {
      for (const t of AURA_OF_SOLACE_TYPES) add(resist, t, 'Aura of Solace')
    }
  }

  const damage: DamageDefense[] = []
  for (const t of DAMAGE_TYPES) {
    const im = immune.get(t)
    if (im) {
      damage.push({ damageType: t, kind: 'immune', sources: im })
      continue
    }
    const re = resist.get(t)
    if (re) damage.push({ damageType: t, kind: 'resist', sources: re })
  }

  return {
    damage,
    conditions: CONDITION_NAMES.filter(c => conditions.has(c)).map(c => ({ condition: c, sources: conditions.get(c)! })),
    inactive,
  }
}

export interface DamageOutcome {
  /** What was rolled. */
  rolled: number
  /** What actually comes off temp HP and then HP. */
  taken: number
  kind: 'immune' | 'resist' | null
  sources: string[]
}

/** How much of a hit lands once defenses apply. No type, or a type he has no
 *  defense against, means the full amount: the type is only worth asking about
 *  when it changes the answer. */
export function damageAfterDefenses(
  sheet: DefenseSheet,
  amount: number,
  type: DamageType | null | undefined,
): DamageOutcome {
  const rolled = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0
  if (!type) return { rolled, taken: rolled, kind: null, sources: [] }
  const defense = defensesOf(sheet).damage.find(d => d.damageType === type)
  if (!defense) return { rolled, taken: rolled, kind: null, sources: [] }
  if (defense.kind === 'immune') return { rolled, taken: 0, kind: 'immune', sources: defense.sources }
  return { rolled, taken: Math.floor(rolled / 2), kind: 'resist', sources: defense.sources }
}

/** The sources making him immune to a condition, or null when nothing does. */
export function conditionImmunitySources(sheet: DefenseSheet, condition: string): string[] | null {
  const hit = defensesOf(sheet).conditions.find(c => c.condition === condition)
  return hit ? hit.sources : null
}

/** Short words for one defense, e.g. "Poison: immune (Periapt of Proof against Poison)". */
export function describeDefense(d: DamageDefense): string {
  return `${d.damageType}: ${d.kind === 'immune' ? 'immune' : 'resistant'} (${d.sources.join(', ')})`
}
