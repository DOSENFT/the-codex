// === TOYBOX — Modular Strategy Builder ===
// Persistence: codex-toybox-{characterId} in localStorage

import type { TacticDiagramData } from './tactic-diagrams'

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
}

export interface ToyboxData {
  combos: ToyboxCombo[]
  tactics: ToyboxTactic[]
  personaPlays: ToyboxPersonaPlay[]
}

// === PERSISTENCE ===
const STORAGE_PREFIX = 'codex-toybox-'

export function saveToybox(characterId: string, data: ToyboxData): void {
  localStorage.setItem(STORAGE_PREFIX + characterId, JSON.stringify(data))
}

export function loadToybox(characterId: string): ToyboxData {
  const saved = localStorage.getItem(STORAGE_PREFIX + characterId)
  if (!saved) return { combos: [], tactics: [], personaPlays: [] }
  try {
    const parsed = JSON.parse(saved) as Partial<ToyboxData>
    return {
      combos: parsed.combos ?? [],
      tactics: parsed.tactics ?? [],
      personaPlays: parsed.personaPlays ?? [],
    }
  } catch {
    return { combos: [], tactics: [], personaPlays: [] }
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
