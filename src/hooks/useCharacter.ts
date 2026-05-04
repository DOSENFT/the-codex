import { useState, useCallback, useEffect } from 'react'
import {
  Character, RosterEntry,
  loadCharacter, saveCharacter, deleteCharacter,
  loadRoster, getActiveId, setActiveId, migrateFromLegacy,
  expendSpellSlot, restoreSpellSlot, longRest, shortRest,
  toggleSpellPrepared, getPreparedSpells,
  expendLayOnHands, restoreLayOnHands,
  expendChannelDivinity, restoreChannelDivinity,
} from '../lib/character'

export function useCharacter() {
  const [character, setCharacterState] = useState<Character | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [ready, setReady] = useState(false)

  // Boot: migrate legacy, load roster, restore active character
  useEffect(() => {
    migrateFromLegacy()
    const entries = loadRoster()
    setRoster(entries)
    const activeId = getActiveId()
    if (activeId) {
      const char = loadCharacter(activeId)
      if (char) {
        setCharacterState(char)
      }
    }
    setReady(true)
  }, [])

  // Refresh roster from storage
  const refreshRoster = useCallback(() => {
    setRoster(loadRoster())
  }, [])

  // Save + set active character
  const update = useCallback((char: Character) => {
    saveCharacter(char)
    setActiveId(char.id)
    setCharacterState(char)
    // Refresh roster to reflect any name/level/class changes
    setRoster(loadRoster())
  }, [])

  // Create a new character and make it active
  const createCharacter = useCallback((char: Character) => {
    saveCharacter(char)
    setActiveId(char.id)
    setCharacterState(char)
    setRoster(loadRoster())
  }, [])

  // Switch to an existing character by id
  const switchCharacter = useCallback((id: string) => {
    const char = loadCharacter(id)
    if (char) {
      setActiveId(id)
      setCharacterState(char)
    }
  }, [])

  // Clear active character (go to setup screen without deleting anything)
  const clearActive = useCallback(() => {
    setCharacterState(null)
  }, [])

  // Delete current character, fall back to next in roster or null
  const resetCharacter = useCallback(() => {
    if (!character) return
    deleteCharacter(character.id)
    const remaining = loadRoster()
    setRoster(remaining)
    if (remaining.length > 0) {
      const next = loadCharacter(remaining[0].id)
      if (next) {
        setActiveId(next.id)
        setCharacterState(next)
        return
      }
    }
    setCharacterState(null)
  }, [character])

  // Spell slot management
  const useSlot = useCallback((level: number) => {
    if (!character) return
    update(expendSpellSlot(character, level))
  }, [character, update])

  const restoreSlot = useCallback((level: number) => {
    if (!character) return
    update(restoreSpellSlot(character, level))
  }, [character, update])

  // Rest management
  const doLongRest = useCallback(() => {
    if (!character) return
    update(longRest(character))
  }, [character, update])

  const doShortRest = useCallback(() => {
    if (!character) return
    update(shortRest(character))
  }, [character, update])

  // Spell preparation
  const togglePrepared = useCallback((spellName: string) => {
    if (!character) return
    update(toggleSpellPrepared(character, spellName))
  }, [character, update])

  // Paladin resources
  const spendLayOnHands = useCallback((amount: number) => {
    if (!character) return
    update(expendLayOnHands(character, amount))
  }, [character, update])

  const healLayOnHands = useCallback((amount: number) => {
    if (!character) return
    update(restoreLayOnHands(character, amount))
  }, [character, update])

  const spendChannelDivinity = useCallback(() => {
    if (!character) return
    update(expendChannelDivinity(character))
  }, [character, update])

  const healChannelDivinity = useCallback(() => {
    if (!character) return
    update(restoreChannelDivinity(character))
  }, [character, update])

  const preparedSpells = character ? getPreparedSpells(character) : []

  return {
    character,
    roster,
    ready,
    setCharacter: update,
    createCharacter,
    switchCharacter,
    clearActive,
    resetCharacter,
    refreshRoster,
    useSlot,
    restoreSlot,
    doLongRest,
    doShortRest,
    togglePrepared,
    preparedSpells,
    spendLayOnHands,
    healLayOnHands,
    spendChannelDivinity,
    healChannelDivinity,
  }
}
