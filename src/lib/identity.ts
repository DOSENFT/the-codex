import type { Character, CharacterIdentity } from './character'
import { generateId } from './character'

// Re-export types for convenience
export type { CharacterIdentity }

/**
 * Add a new identity to a character. Generates a unique ID automatically.
 */
export function addIdentity(char: Character, identity: Omit<CharacterIdentity, 'id'>): Character {
  const newId: CharacterIdentity = { ...identity, id: generateId() }
  const identities = [...(char.identities ?? []), newId]
  return { ...char, identities }
}

/**
 * Update an existing identity by ID with partial fields.
 */
export function updateIdentity(char: Character, id: string, updates: Partial<CharacterIdentity>): Character {
  const identities = (char.identities ?? []).map(i =>
    i.id === id ? { ...i, ...updates } : i,
  )
  return { ...char, identities }
}

/**
 * Remove an identity by ID. Clears activeIdentityId if it was the removed one.
 */
export function removeIdentity(char: Character, id: string): Character {
  const identities = (char.identities ?? []).filter(i => i.id !== id)
  const activeIdentityId = char.activeIdentityId === id ? undefined : char.activeIdentityId
  return { ...char, identities, activeIdentityId }
}

/**
 * Set the active identity (or undefined to deactivate all).
 */
export function setActiveIdentity(char: Character, id: string | undefined): Character {
  return { ...char, activeIdentityId: id }
}

/**
 * Get the currently active identity object, or undefined if none.
 */
export function getActiveIdentity(char: Character): CharacterIdentity | undefined {
  if (!char.activeIdentityId || !char.identities) return undefined
  return char.identities.find(i => i.id === char.activeIdentityId)
}

/**
 * Determine whether the character warrants a prominent multi-persona UI.
 * Returns true for Changelings, Wild Shape druids, Barbarian rage states,
 * characters with Disguise Self, or anyone with 2+ identities already defined.
 */
export function shouldSurfaceMultiPersona(char: Character): boolean {
  const race = char.race?.toLowerCase() ?? ''
  if (race.includes('changeling')) return true

  const featureNames = (char.features ?? []).map(f => f.name.toLowerCase())
  if (featureNames.some(n => n.includes('wild shape'))) return true
  if (featureNames.some(n => n.includes('rage'))) return true
  if (featureNames.some(n => n.includes('disguise self'))) return true

  if ((char.identities ?? []).length >= 2) return true

  return false
}

/**
 * Create a blank identity template with sensible defaults.
 */
export function createBlankIdentity(name = ''): Omit<CharacterIdentity, 'id'> {
  return {
    name,
    isDefault: false,
    appearance: '',
    accent: '',
    mannerisms: [],
    voiceNotes: '',
    personalityTraits: [],
    triggers: [],
    socialContext: '',
    dialogueLines: [],
  }
}
