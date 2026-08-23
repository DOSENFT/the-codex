import { useState, useEffect } from 'react'
import { Dumbbell, GraduationCap, Mic } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTraining } from '../hooks/useTraining'
import type { Character } from '../lib/character'
import { QuizArena } from './QuizArena'
import { ConditionDrill } from './ConditionDrill'
import { RoleplayCoach } from './RoleplayCoach'
import { SpacedFlashcards } from './SpacedFlashcards'
import { TrainingProgress } from './TrainingProgress'
import { AccentForge } from './accent-forge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AcademyTab = 'training' | 'quizzes' | 'accent'

interface AcademyPageProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Academy tab container. Splits training content into three segments:
 *
 * - **Training** — Roleplay Coach (scene practice, improv drills,
 *   conversation practice). Experiential learning through AI interaction.
 *
 * - **Quizzes** — Quiz Arena (rules/mechanics questions) and Spaced
 *   Flashcards (SRS review of persona traits and rules). Knowledge testing
 *   with progress tracking.
 *
 * - **Accent** — Accent Forge (accent library, DM rapid mode, voice forge
 *   with AI preview). Voice performance training system.
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

  const tabButton = (id: AcademyTab, label: string, Icon: typeof Dumbbell, badge?: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-lg',
        'text-sm font-medium transition-all duration-200 ease-forge relative',
        'active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        tab === id
          ? 'bg-white/[0.08] text-forge-0 shadow-sm border border-white/10'
          : 'text-forge-2 hover:text-forge-1',
      )}
    >
      <Icon size={16} aria-hidden />
      {label}
      {badge !== undefined && badge > 0 && tab !== id && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-eldritch/20 text-eldritch-lit text-xs font-bold border border-eldritch/30">
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <section className="flex flex-col gap-4 animate-fade-in" aria-label="Academy">
      {/* ─── Training Progress ─── */}
      {profile && <TrainingProgress profile={profile} />}

      {/* ─── Segmented Control ─── */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-void-2/60 border border-white/[0.06]">
        {tabButton('training', 'Training', Dumbbell)}
        {tabButton('quizzes', 'Quizzes', GraduationCap, dueCount)}
        {tabButton('accent', 'Accent', Mic)}
      </div>

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
      {tab === 'accent' && (
        <AccentForge character={character} />
      )}
    </section>
  )
}
