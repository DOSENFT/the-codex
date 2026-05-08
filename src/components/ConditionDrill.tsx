import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Flame,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { ParchmentCard } from './ui/ParchmentCard'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConditionDrillProps {
  character: Character
}

interface DrillQuestion {
  scenario: string
  question: string
  correctAnswer: string
  distractors: string[]
  explanation: string
}

type DrillState = 'idle' | 'loading' | 'answering' | 'feedback'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Shuffle an array using Fisher-Yates */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Rapid-fire condition quiz for the Academy/Quizzes tab.
 * AI generates scenarios using the character's actual spells, testing
 * knowledge of D&D 2024 conditions and their mechanical effects.
 */
export function ConditionDrill({ character }: ConditionDrillProps) {
  const { queryStructured, loading, error } = useAI()

  const [state, setState] = useState<DrillState>('idle')
  const [currentQuestion, setCurrentQuestion] = useState<DrillQuestion | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  const fetchQuestion = useCallback(async () => {
    setState('loading')
    setSelectedAnswer(null)
    setIsCorrect(null)
    setCurrentQuestion(null)

    try {
      const systemPrompt = SYSTEM_PROMPTS.conditionDrillGenerator(character)
      const result = await queryStructured<DrillQuestion>(
        systemPrompt,
        'Generate a condition drill question for my character. Use one of my actual spells or abilities.'
      )

      // Validate response shape
      if (!result.scenario || !result.question || !result.correctAnswer || !result.distractors || !result.explanation) {
        throw new Error('Invalid question format received')
      }

      setCurrentQuestion(result)
      setShuffledOptions(shuffle([result.correctAnswer, ...result.distractors]))
      setState('answering')
    } catch {
      setState('idle')
    }
  }, [character, queryStructured])

  const handleAnswer = useCallback((answer: string) => {
    if (!currentQuestion || state !== 'answering') return

    const correct = answer === currentQuestion.correctAnswer
    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setTotalAnswered(prev => prev + 1)

    if (correct) {
      setTotalCorrect(prev => prev + 1)
      setStreak(prev => {
        const newStreak = prev + 1
        setBestStreak(best => Math.max(best, newStreak))
        return newStreak
      })
    } else {
      setStreak(0)
    }

    setState('feedback')

    // Auto-advance after 3s on correct, 5s on incorrect (more time to read explanation)
    autoAdvanceTimer.current = setTimeout(() => {
      fetchQuestion()
    }, correct ? 3000 : 5000)
  }, [currentQuestion, state, fetchQuestion])

  const handleNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
    fetchQuestion()
  }, [fetchQuestion])

  const handleReset = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
    setState('idle')
    setCurrentQuestion(null)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setStreak(0)
    setTotalAnswered(0)
    setTotalCorrect(0)
  }, [])

  // ─── Idle State ───
  if (state === 'idle' && !loading) {
    return (
      <GlassCard className="p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <OrnateHeader>Condition Drill</OrnateHeader>
          <p className="text-sm text-forge-2 max-w-xs">
            Test your knowledge of D&D conditions using {character.name}&rsquo;s actual spells and abilities.
            How many can you get in a row?
          </p>

          {totalAnswered > 0 && (
            <div className="flex items-center gap-3 text-xs text-forge-2">
              <span>Last session: {totalCorrect}/{totalAnswered} correct</span>
              {bestStreak > 0 && (
                <Badge variant="ember">
                  <Flame size={10} className="mr-1" aria-hidden />
                  Best: {bestStreak}
                </Badge>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle size={14} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={fetchQuestion}
            className="mt-1"
          >
            <Zap size={16} aria-hidden />
            Start Drill
          </Button>
        </div>
      </GlassCard>
    )
  }

  // ─── Loading State ───
  if (state === 'loading' || loading) {
    return (
      <GlassCard className="p-5">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={24} className="animate-spin text-arcane" aria-hidden />
          <p className="text-sm text-forge-2">Generating condition scenario...</p>
          {streak > 0 && (
            <Badge variant="ember">
              <Flame size={10} className="mr-1" aria-hidden />
              Streak: {streak}
            </Badge>
          )}
        </div>
      </GlassCard>
    )
  }

  // ─── Question / Feedback States ───
  return (
    <GlassCard className="p-5">
      {/* Header with streak */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-ember" aria-hidden />
          <OrnateHeader>Condition Drill</OrnateHeader>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="ember" className="animate-pulse">
              <Flame size={12} className="mr-1" aria-hidden />
              {streak}
            </Badge>
          )}
          {totalAnswered > 0 && (
            <div className="stat-frame">
              <span className="font-mono text-forge-0 text-xs">{totalCorrect}/{totalAnswered}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg',
              'text-forge-2 hover:text-forge-1 transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'active:scale-[0.95]',
            )}
            aria-label="Reset drill"
          >
            <RotateCcw size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Scenario Card */}
      {currentQuestion && (
        <ParchmentCard className="mb-4">
          <p className="text-sm text-forge-1 leading-relaxed mb-2">
            {currentQuestion.scenario}
          </p>
          <p className="text-sm font-medium text-forge-0">
            {currentQuestion.question}
          </p>
        </ParchmentCard>
      )}

      {/* Answer Grid (2x2) */}
      {currentQuestion && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {shuffledOptions.map((option) => {
            const isSelected = selectedAnswer === option
            const isTheCorrectAnswer = option === currentQuestion.correctAnswer
            const showResult = state === 'feedback'

            let optionStyle = ''
            if (showResult) {
              if (isTheCorrectAnswer) {
                optionStyle = 'border-verdant/60 bg-verdant/10 text-verdant'
              } else if (isSelected && !isCorrect) {
                optionStyle = 'border-red-400/60 bg-red-400/10 text-red-400'
              } else {
                optionStyle = 'border-bronze/15 bg-gold/[0.02] text-forge-2'
              }
            } else {
              optionStyle = isSelected
                ? 'border-arcane/40 bg-arcane/10 text-arcane'
                : 'combat-card text-forge-1 hover:border-gold/40'
            }

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={state === 'feedback'}
                className={cn(
                  'min-h-[44px] px-3 py-2.5 rounded-xl border text-sm font-medium',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  'disabled:cursor-default disabled:active:scale-100',
                  optionStyle,
                )}
              >
                <span className="flex items-center justify-center gap-1.5 text-center">
                  {showResult && isTheCorrectAnswer && (
                    <CheckCircle2 size={14} className="shrink-0" aria-hidden />
                  )}
                  {showResult && isSelected && !isCorrect && !isTheCorrectAnswer && (
                    <XCircle size={14} className="shrink-0" aria-hidden />
                  )}
                  {option}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Feedback / Explanation */}
      {state === 'feedback' && currentQuestion && (
        <div className={cn(
          'rounded-xl border p-3 mb-3 transition-all duration-300',
          isCorrect
            ? 'border-verdant/30 bg-verdant/5'
            : 'border-red-400/30 bg-red-400/5',
        )}>
          <div className="flex items-start gap-2">
            {isCorrect ? (
              <CheckCircle2 size={16} className="text-verdant shrink-0 mt-0.5" aria-hidden />
            ) : (
              <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            )}
            <div>
              <p className={cn(
                'text-sm font-medium mb-1',
                isCorrect ? 'text-verdant' : 'text-red-400',
              )}>
                {isCorrect ? 'Correct!' : `Incorrect — the answer is "${currentQuestion.correctAnswer}"`}
              </p>
              <p className="text-xs text-forge-2 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next button (shown during feedback) */}
      {state === 'feedback' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNext}
          className="w-full"
        >
          Next Question
          <ChevronRight size={14} aria-hidden />
        </Button>
      )}

      {/* Error display */}
      {error && state !== 'idle' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
          <AlertTriangle size={14} aria-hidden />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchQuestion} className="ml-auto">
            Retry
          </Button>
        </div>
      )}
    </GlassCard>
  )
}
