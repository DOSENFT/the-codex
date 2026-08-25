import { useState, useCallback, useEffect } from 'react'
import { saveOrAnnounce } from '../lib/character'

const STORAGE_PREFIX = 'codex-ui-'

/** Load collapse state map for a character from localStorage */
function loadCollapseState(characterId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + characterId)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Save collapse state map for a character to localStorage */
function saveCollapseState(characterId: string, state: Record<string, boolean>): void {
  saveOrAnnounce(STORAGE_PREFIX + characterId, JSON.stringify(state))
}

/**
 * Persists section collapse state per character in localStorage.
 *
 * @param sectionId  Unique identifier for the collapsible section
 * @param characterId  The active character's id (used for per-character persistence)
 * @param defaultOpen  Whether the section starts open (default: true)
 */
export function useCollapsible(sectionId: string, characterId: string, defaultOpen = true) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = loadCollapseState(characterId)
    return saved[sectionId] !== undefined ? saved[sectionId] : defaultOpen
  })

  // Sync when character changes
  useEffect(() => {
    const saved = loadCollapseState(characterId)
    setIsOpen(saved[sectionId] !== undefined ? saved[sectionId] : defaultOpen)
  }, [characterId, sectionId, defaultOpen])

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev
      const all = loadCollapseState(characterId)
      all[sectionId] = next
      saveCollapseState(characterId, all)
      return next
    })
  }, [characterId, sectionId])

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open)
    const all = loadCollapseState(characterId)
    all[sectionId] = open
    saveCollapseState(characterId, all)
  }, [characterId, sectionId])

  return { isOpen, toggle, setOpen }
}
