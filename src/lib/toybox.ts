// === TOYBOX — Modular Strategy Builder ===
// Persistence: codex-toybox-{characterId} in localStorage

import type { TacticDiagramData } from './tactic-diagrams'
import { saveOrAnnounce } from './character'

/* ==========================================================================
   ANNOTATIONS — the lines under an entry that are not steps

   A combo's steps say what to do. These say the things that decide whether
   doing it was right: where to stand, who to tell, and what the app is not
   sure about. They are deliberately ONE field with a `kind` rather than
   `positioning?`, `partyNote?` and `warning?` — the three render identically
   apart from a marker, so three fields would buy a slightly more descriptive
   type at the price of an authored ordering the writer can no longer control.

   NOT LOAD-BEARING, and that is the whole reason the split matters. A block
   label that cannot be written for this character kills the entry (see
   `toybox-seed/template.ts`); an annotation that cannot be written is simply
   dropped and its siblings survive. A party call-out naming a wizard who is
   not at this table must not cost the combo it was attached to.
   ========================================================================== */
export type PlayNoteKind = 'positioning' | 'party' | 'warning'

export interface PlayNote {
  kind: PlayNoteKind
  text: string
}

// === COMBO BLOCKS ===
export interface ComboBlock {
  id: string
  type: 'action' | 'bonus' | 'reaction' | 'movement' | 'free'
  label: string
  source: 'spell' | 'weapon' | 'feature' | 'item' | 'custom'
  sourceName?: string
  notes?: string
}

export interface ToyboxCombo {
  id: string
  name: string
  description?: string
  blocks: ComboBlock[]
  tags: string[]
  favorite: boolean
  createdAt: number
  category?: 'burst' | 'sustained' | 'defensive' | 'utility' | 'aoe'
  /** What must be true for this combo to be runnable — a prepared spell, a
   *  feature, an unspent resource.
   *
   *  MIRRORS `ToyboxTactic.requirements`, and exists for one reason: after a
   *  long rest Marcus picks seven prepared spells, and the only way to pick
   *  them for a reason is to read backwards from the plays he wants to run.
   *  That read is `entries.flatMap(e => e.requirements)`, which is possible
   *  only while this is a structured list and not a sentence in `description`.
   *
   *  Optional because every combo written before this field existed has none,
   *  and "none recorded" is not the same as "needs nothing". */
  requirements?: string[]
  /** Where to stand, who to call out to, what to be careful of. See `PlayNote`. */
  annotations?: PlayNote[]
}

// === TACTICS ===
export interface ToyboxTactic {
  id: string
  name: string
  trigger: string
  actions: string[]
  priority: 'critical' | 'high' | 'normal'
  tags: string[]
  favorite: boolean
  createdAt: number
  diagram?: TacticDiagramData
  requirements?: string[]
  category?: 'core' | 'survival' | 'burst' | 'control' | 'support'
  annotations?: PlayNote[]
}

// === PERSONA PLAYS ===
export interface ToyboxPersonaPlay {
  id: string
  name: string
  situation: string
  approach: string
  keyPhrases: string[]
  skillCheck?: string
  tags: string[]
  favorite: boolean
  createdAt: number
  annotations?: PlayNote[]
}

export interface ToyboxData {
  combos: ToyboxCombo[]
  tactics: ToyboxTactic[]
  personaPlays: ToyboxPersonaPlay[]
  /** Ids of the seed packs that have already been applied to this character.
   *
   *  THIS FIELD IS THE ONLY THING STANDING BETWEEN A DELETION AND A GHOST.
   *  Before it existed, "has this been seeded?" was answered by asking whether
   *  the Toybox was empty — which is true again the moment you delete the last
   *  seeded entry, so the next mount put it straight back. A marker records
   *  that the delivery HAPPENED, which is a different fact from whether its
   *  contents are still here, and only the first one can be reasoned about
   *  after the user has been at it.
   *
   *  Optional, and absent means "nothing seeded yet". Every Toybox already in
   *  localStorage predates this field, and reading them as unseeded is exactly
   *  right: they never were. */
  seededPacks?: string[]
}

// === PERSISTENCE ===
const STORAGE_PREFIX = 'codex-toybox-'

export function saveToybox(characterId: string, data: ToyboxData): void {
  saveOrAnnounce(STORAGE_PREFIX + characterId, JSON.stringify(data))
}

export function loadToybox(characterId: string): ToyboxData {
  const saved = localStorage.getItem(STORAGE_PREFIX + characterId)
  if (!saved) return { combos: [], tactics: [], personaPlays: [], seededPacks: [] }
  try {
    const parsed = JSON.parse(saved) as Partial<ToyboxData>
    return {
      combos: parsed.combos ?? [],
      tactics: parsed.tactics ?? [],
      personaPlays: parsed.personaPlays ?? [],
      // The whole migration, in one line: a Toybox written before packs existed
      // reports "nothing seeded", which is true, and gets seeded once.
      seededPacks: parsed.seededPacks ?? [],
    }
  } catch {
    return { combos: [], tactics: [], personaPlays: [], seededPacks: [] }
  }
}

// === COMBO CRUD ===
export function addComboToData(data: ToyboxData, combo: ToyboxCombo): ToyboxData {
  return { ...data, combos: [...data.combos, combo] }
}

export function updateComboInData(data: ToyboxData, id: string, updates: Partial<ToyboxCombo>): ToyboxData {
  return { ...data, combos: data.combos.map(c => c.id === id ? { ...c, ...updates } : c) }
}

export function deleteComboFromData(data: ToyboxData, id: string): ToyboxData {
  return { ...data, combos: data.combos.filter(c => c.id !== id) }
}

// === TACTIC CRUD ===
export function addTacticToData(data: ToyboxData, tactic: ToyboxTactic): ToyboxData {
  return { ...data, tactics: [...data.tactics, tactic] }
}

export function updateTacticInData(data: ToyboxData, id: string, updates: Partial<ToyboxTactic>): ToyboxData {
  return { ...data, tactics: data.tactics.map(t => t.id === id ? { ...t, ...updates } : t) }
}

export function deleteTacticFromData(data: ToyboxData, id: string): ToyboxData {
  return { ...data, tactics: data.tactics.filter(t => t.id !== id) }
}

// === PERSONA PLAY CRUD ===
export function addPersonaPlayToData(data: ToyboxData, play: ToyboxPersonaPlay): ToyboxData {
  return { ...data, personaPlays: [...data.personaPlays, play] }
}

export function updatePersonaPlayInData(data: ToyboxData, id: string, updates: Partial<ToyboxPersonaPlay>): ToyboxData {
  return { ...data, personaPlays: data.personaPlays.map(p => p.id === id ? { ...p, ...updates } : p) }
}

export function deletePersonaPlayFromData(data: ToyboxData, id: string): ToyboxData {
  return { ...data, personaPlays: data.personaPlays.filter(p => p.id !== id) }
}
