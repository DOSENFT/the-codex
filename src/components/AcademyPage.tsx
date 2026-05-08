import { useState, useEffect } from 'react'
import { Dumbbell, GraduationCap } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTraining } from '../hooks/useTraining'
import type { Character } from '../lib/character'
import { QuizArena } from './QuizArena'
import { ConditionDrill } from './ConditionDrill'
import { RoleplayCoach } from './RoleplayCoach'
import { SpacedFlashcards } from './SpacedFlashcards'
import { TrainingProgress } from './TrainingProgress'
import { OrnateHeader } from './ui/OrnateHeader'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AcademyTab = 'training' | 'quizzes'

interface AcademyPageProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Academy tab container. Splits training content into two clear segments:
 *
 * - **Training** — Roleplay Coach (scene practice, improv drills,
 *   conversation practice). Experiential learning through AI interaction.
 *
 * - **Quizzes** — Quiz Arena (rules/mechanics questions) and Spaced
 *   Flashcards (SRS review of persona traits and rules). Knowledge testing
 *   with progress tracking.
 *
 * A persistent TrainingProgress bar sits above the segmented control,
 * showing XP, level, streak, and category accuracy.
 */
export function AcademyPage({ character, onCharacterUpdate }: AcademyPageProps) {
  const [tab, setTab] = useState<AcademyTab>('training')

  const {
    profile,
    recordQuiz,
    reviewCard,
    getDueCards,
    suggestedDifficulty,
    weakCategories,
    initFlashcard,
  } = useTraining(character.id)

  // Initialize flashcards from persona traits on load
  useEffect(() => {
    if (!character.persona) return
    const traits = [
      ...(character.persona.physicalTics ?? []).map((_: string, i: number) => `physicalTic-${i}`),
      ...(character.persona.sceneInstincts ?? []).map((_: string, i: number) => `sceneInstinct-${i}`),
      ...(character.persona.quietTexture ?? []).map((_: string, i: number) => `quietTexture-${i}`),
      ...(character.persona.catchphrases ?? []).map((_: string, i: number) => `catchphrase-${i}`),
    ]
    traits.forEach((id) => initFlashcard(id))
  }, [character.persona, initFlashcard])

  const dueCount = getDueCards().length

  return (
    <section className="flex flex-col gap-5 animate-fade-in" aria-label="Academy">
      {/* ─── Section Header ─── */}
      <OrnateHeader>Academy</OrnateHeader>

      {/* ─── Training Progress ─── */}
      {profile && <TrainingProgress profile={profile} />}

      {/* ─── Segmented Control ─── */}
      <div className="flex gap-2 p-1 rounded-xl bg-void-2/60 border border-gold/15 ornate-border">
        <button
          type="button"
          onClick={() => setTab('training')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg',
            'text-sm font-medium transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            tab === 'training'
              ? 'bg-gold/[0.08] text-forge-0 shadow-sm border border-bronze/25'
              : 'text-forge-2 hover:text-forge-1',
          )}
        >
          <Dumbbell size={16} aria-hidden />
          Training
        </button>
        <button
          type="button"
          onClick={() => setTab('quizzes')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg',
            'text-sm font-medium transition-all duration-200 ease-forge relative',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            tab === 'quizzes'
              ? 'bg-gold/[0.08] text-forge-0 shadow-sm border border-bronze/25'
              : 'text-forge-2 hover:text-forge-1',
          )}
        >
          <GraduationCap size={16} aria-hidden />
          Quizzes
          {dueCount > 0 && tab !== 'quizzes' && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-eldritch/20 text-eldritch text-[10px] font-bold border border-eldritch/30">
              {dueCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Divider ─── */}
      <div className="ornate-divider" aria-hidden />

      {/* ─── Content ─── */}
      {tab === 'training' && (
        <RoleplayCoach character={character} />
      )}
      {tab === 'quizzes' && (
        <div className="flex flex-col gap-5">
          <QuizArena
            character={character}
            onQuizAnswer={recordQuiz}
            suggestedDifficulty={suggestedDifficulty()}
            weakCategories={weakCategories}
          />
          <ConditionDrill character={character} />
          {profile && (
            <SpacedFlashcards
              character={character}
              profile={profile}
              onReviewCard={reviewCard}
            />
          )}
        </div>
      )}
    </section>
  )
}
