import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type TrainingProfile,
  type FlashcardProgress,
  loadTrainingProfile,
  saveTrainingProfile,
  recordQuiz as recordQuizFn,
  recordDrill as recordDrillFn,
  recordOneShot as recordOneShotFn,
  recordConversation as recordConversationFn,
  reviewFlashcard,
  getDueFlashcards,
  suggestDifficulty,
  createFlashcardProgress,
} from '../lib/training'

/**
 * React hook wrapping the training persistence layer.
 * Auto-loads on mount, auto-saves when profile changes.
 */
export function useTraining(characterId: string | null) {
  const [profile, setProfile] = useState<TrainingProfile | null>(null)
  const isInitialLoad = useRef(true)

  // Load profile on mount or characterId change
  useEffect(() => {
    if (!characterId) {
      setProfile(null)
      return
    }
    isInitialLoad.current = true
    const loaded = loadTrainingProfile(characterId)
    setProfile(loaded)
  }, [characterId])

  // Auto-save when profile changes (skip initial load)
  useEffect(() => {
    if (!profile) return
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    saveTrainingProfile(profile)
  }, [profile])

  /** Record a quiz answer and update profile. */
  const recordQuiz = useCallback(
    (category: string, difficulty: string, correct: boolean) => {
      setProfile((prev) => {
        if (!prev) return prev
        return recordQuizFn(prev, category, difficulty, correct)
      })
    },
    [],
  )

  /** Record a drill completion and update profile. */
  const recordDrill = useCallback(
    (scene: string, score: number) => {
      setProfile((prev) => {
        if (!prev) return prev
        return recordDrillFn(prev, scene, score)
      })
    },
    [],
  )

  /** Record a one-shot adventure completion and update profile. Awards XP (score x 5). */
  const recordOneShot = useCallback(
    (turns: number, score: number) => {
      setProfile((prev) => {
        if (!prev) return prev
        return recordOneShotFn(prev, turns, score)
      })
    },
    [],
  )

  /** Record a conversation drill completion and update profile. Awards XP (score x 5). */
  const recordConversation = useCallback(
    (npcType: string, exchanges: number, score: number) => {
      setProfile((prev) => {
        if (!prev) return prev
        return recordConversationFn(prev, npcType, exchanges, score)
      })
    },
    [],
  )

  /** Review a flashcard with a rating (SM-2). */
  const reviewCard = useCallback(
    (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
      setProfile((prev) => {
        if (!prev) return prev
        const updatedProgress = prev.flashcardProgress.map((card) => {
          if (card.cardId === cardId) {
            return reviewFlashcard(card, rating)
          }
          return card
        })
        return { ...prev, flashcardProgress: updatedProgress }
      })
    },
    [],
  )

  /** Get all due flashcards. */
  const getDueCards = useCallback((): FlashcardProgress[] => {
    if (!profile) return []
    return getDueFlashcards(profile.flashcardProgress)
  }, [profile])

  /** Get suggested difficulty for a category. */
  const suggestedDifficulty = useCallback(
    (category?: string): 'apprentice' | 'journeyman' | 'master' => {
      if (!profile) return 'apprentice'
      return suggestDifficulty(profile.quizHistory, category)
    },
    [profile],
  )

  /** Initialize a flashcard entry if it doesn't already exist. */
  const initFlashcard = useCallback(
    (cardId: string) => {
      setProfile((prev) => {
        if (!prev) return prev
        const exists = prev.flashcardProgress.some((c) => c.cardId === cardId)
        if (exists) return prev
        return {
          ...prev,
          flashcardProgress: [...prev.flashcardProgress, createFlashcardProgress(cardId)],
        }
      })
    },
    [],
  )

  return {
    profile,
    recordQuiz,
    recordDrill,
    recordOneShot,
    recordConversation,
    reviewCard,
    getDueCards,
    suggestedDifficulty,
    weakCategories: profile?.weakCategories ?? [],
    initFlashcard,
  }
}
