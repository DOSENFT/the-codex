import { useState, useMemo, useCallback } from 'react'
import {
  RotateCcw,
  CheckCircle2,
  BookOpen,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { type FlashcardProgress, getDueFlashcards } from '../lib/training'
import type { Character } from '../lib/character'
import type { TrainingProfile } from '../lib/training'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'
import { ParchmentCard } from './ui/ParchmentCard'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SpacedFlashcardsProps {
  character: Character
  profile: TrainingProfile
  onReviewCard: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => void
}

interface FlashcardData {
  id: string
  front: string  // question/prompt (the trait type)
  back: string   // answer (the trait text)
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate flashcards from character persona traits.
 * physicalTics, sceneInstincts, quietTexture each become flashcards.
 */
function buildFlashcardDeck(character: Character): FlashcardData[] {
  const cards: FlashcardData[] = []
  const persona = character.persona
  if (!persona) return cards

  if (persona.physicalTics) {
    persona.physicalTics.forEach((tic, i) => {
      cards.push({
        id: `physicalTic-${i}`,
        front: `Physical Tic #${i + 1} — How does ${character.name} express this habit?`,
        back: tic,
      })
    })
  }

  if (persona.sceneInstincts) {
    persona.sceneInstincts.forEach((instinct, i) => {
      cards.push({
        id: `sceneInstinct-${i}`,
        front: `Scene Instinct #${i + 1} — What does ${character.name} naturally do in this scenario?`,
        back: instinct,
      })
    })
  }

  if (persona.quietTexture) {
    persona.quietTexture.forEach((texture, i) => {
      cards.push({
        id: `quietTexture-${i}`,
        front: `Quiet Texture #${i + 1} — What subtle detail colors ${character.name}'s idle moments?`,
        back: texture,
      })
    })
  }

  if (persona.catchphrases) {
    persona.catchphrases.forEach((phrase, i) => {
      cards.push({
        id: `catchphrase-${i}`,
        front: `Catchphrase #${i + 1} — What would ${character.name} say?`,
        back: phrase,
      })
    })
  }

  return cards
}

function getOverdueDays(card: FlashcardProgress): number {
  const today = new Date()
  const reviewDate = new Date(card.nextReviewDate)
  const diff = today.getTime() - reviewDate.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpacedFlashcards({ character, profile, onReviewCard }: SpacedFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

  // Build the full deck from persona
  const fullDeck = useMemo(() => buildFlashcardDeck(character), [character])

  // Get due cards sorted by overdue-ness
  const dueCards = useMemo(() => {
    const due = getDueFlashcards(profile.flashcardProgress)
    // Sort most overdue first
    due.sort((a, b) => getOverdueDays(b) - getOverdueDays(a))
    // Filter to only cards that exist in our deck
    const deckIds = new Set(fullDeck.map((c) => c.id))
    return due.filter((c) => deckIds.has(c.cardId))
  }, [profile.flashcardProgress, fullDeck])

  const totalDue = dueCards.length
  const currentCard = dueCards[currentIndex]
  const currentData = currentCard
    ? fullDeck.find((d) => d.id === currentCard.cardId)
    : null

  const isComplete = currentIndex >= totalDue || totalDue === 0

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleRate = useCallback(
    (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentCard) return
      onReviewCard(currentCard.cardId, rating)
      setReviewedCount((prev) => prev + 1)
      setIsFlipped(false)
      setCurrentIndex((prev) => prev + 1)
    },
    [currentCard, onReviewCard],
  )

  // No persona or no flashcard data
  if (fullDeck.length === 0) {
    return (
      <GlassCard>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-eldritch/10 flex items-center justify-center">
            <BookOpen size={24} className="text-eldritch" aria-hidden />
          </div>
          <p className="text-sm text-forge-1 max-w-xs">
            Add persona traits (physical tics, scene instincts, quiet texture) to{' '}
            <span className="text-arcane font-medium">{character.name}</span>{' '}
            to generate flashcards for spaced repetition practice.
          </p>
        </div>
      </GlassCard>
    )
  }

  // All cards reviewed — completion state
  if (isComplete) {
    return (
      <GlassCard>
        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-xl bg-verdant/10 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-verdant" aria-hidden />
          </div>
          {reviewedCount > 0 ? (
            <>
              <p className="text-base font-display font-semibold text-forge-0">
                All caught up!
              </p>
              <p className="text-sm text-forge-2 max-w-xs">
                You reviewed {reviewedCount} card{reviewedCount !== 1 ? 's' : ''} this session.
                Come back later when more cards are due.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-display font-semibold text-forge-0">
                No cards due
              </p>
              <p className="text-sm text-forge-2 max-w-xs">
                All {fullDeck.length} flashcards are scheduled for future review.
                Check back later!
              </p>
            </>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <OrnateHeader>Spaced Review</OrnateHeader>
        <div className="stat-frame">
          <span className="text-xs text-forge-2">Progress</span>
          <span className="font-mono text-forge-0">{currentIndex + 1}/{totalDue}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gold/[0.06] border border-bronze/25 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-300"
          style={{ width: `${((currentIndex) / totalDue) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      {currentData && (
        <button
          type="button"
          onClick={handleFlip}
          className={cn(
            'relative w-full min-h-[200px] rounded-2xl border p-6 ornate-border',
            'flex flex-col items-center justify-center text-center',
            'transition-all duration-300 ease-forge cursor-pointer select-none',
            'active:scale-[0.98]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eldritch',
            isFlipped
              ? 'bg-eldritch/[0.06] border-eldritch/30 shadow-[0_0_20px_-4px_rgba(138,43,226,0.15)]'
              : 'bg-gold/[0.04] border-bronze/25 hover:bg-gold/[0.06] hover:border-gold/30',
          )}
          aria-label={isFlipped ? 'Showing answer, tap to flip back' : 'Tap to reveal answer'}
        >
          {/* Flip indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-forge-2">
            <RotateCcw size={10} aria-hidden />
            <span>{isFlipped ? 'Answer' : 'Tap to flip'}</span>
          </div>

          {/* Card content */}
          <div className={cn(
            'transition-all duration-300',
            isFlipped ? 'animate-fade-in' : '',
          )}>
            {!isFlipped ? (
              <p className="text-base text-forge-0 font-medium leading-relaxed">
                {currentData.front}
              </p>
            ) : (
              <p className="text-base text-eldritch font-medium leading-relaxed">
                {currentData.back}
              </p>
            )}
          </div>

          {/* Overdue indicator */}
          {getOverdueDays(currentCard) > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="ember" className="text-[10px]">
                {getOverdueDays(currentCard)}d overdue
              </Badge>
            </div>
          )}
        </button>
      )}

      {/* Rating buttons — only visible when flipped */}
      {isFlipped && (
        <div className="grid grid-cols-4 gap-2 animate-fade-in">
          <button
            type="button"
            onClick={() => handleRate('again')}
            className={cn(
              'flex flex-col items-center gap-1 min-h-[52px] px-2 py-2.5 rounded-xl',
              'text-xs font-medium border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400',
              'bg-red-500/[0.08] border-red-500/25 text-red-400',
              'hover:bg-red-500/[0.15]',
            )}
          >
            <span className="font-semibold">Again</span>
            <span className="text-[10px] opacity-70">1d</span>
          </button>

          <button
            type="button"
            onClick={() => handleRate('hard')}
            className={cn(
              'flex flex-col items-center gap-1 min-h-[52px] px-2 py-2.5 rounded-xl',
              'text-xs font-medium border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400',
              'bg-amber-500/[0.08] border-amber-500/25 text-amber-400',
              'hover:bg-amber-500/[0.15]',
            )}
          >
            <span className="font-semibold">Hard</span>
            <span className="text-[10px] opacity-70">
              {currentCard ? Math.max(1, Math.round(currentCard.interval * 1.2)) : 1}d
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRate('good')}
            className={cn(
              'flex flex-col items-center gap-1 min-h-[52px] px-2 py-2.5 rounded-xl',
              'text-xs font-medium border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
              'bg-verdant/[0.08] border-verdant/25 text-verdant',
              'hover:bg-verdant/[0.15]',
            )}
          >
            <span className="font-semibold">Good</span>
            <span className="text-[10px] opacity-70">
              {currentCard ? Math.max(1, Math.round(currentCard.interval * currentCard.easeFactor)) : 1}d
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRate('easy')}
            className={cn(
              'flex flex-col items-center gap-1 min-h-[52px] px-2 py-2.5 rounded-xl',
              'text-xs font-medium border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'bg-arcane/[0.08] border-arcane/25 text-arcane',
              'hover:bg-arcane/[0.15]',
            )}
          >
            <span className="font-semibold">Easy</span>
            <span className="text-[10px] opacity-70">
              {currentCard ? Math.max(1, Math.round(currentCard.interval * currentCard.easeFactor * 1.3)) : 1}d
            </span>
          </button>
        </div>
      )}

      {/* Skip button when not flipped */}
      {!isFlipped && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentIndex((prev) => prev + 1)
              setIsFlipped(false)
            }}
          >
            Skip
            <ChevronRight size={14} aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
