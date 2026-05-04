import { useState, useCallback } from 'react'
import {
  Swords,
  BookOpen,
  Scroll,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Send,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuizQuestion {
  question: string
  type: 'multiple_choice' | 'true_false' | 'open_ended' | 'scenario'
  options?: string[]
  correctAnswer: string
  explanation: string
  difficulty: 'apprentice' | 'journeyman' | 'master'
  category: string
}

type QuizMode = 'spells' | 'combat' | 'rules' | 'class_features'

interface QuizArenaProps {
  character: Character
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES: { id: QuizMode; label: string; icon: typeof Swords; prompt: string }[] = [
  {
    id: 'spells',
    label: 'Spell Knowledge',
    icon: Scroll,
    prompt: 'Generate a quiz question about one of my character\'s spells. Focus on exact mechanics, casting time, range, components, duration, and tactical use per D&D 2024 rules.',
  },
  {
    id: 'combat',
    label: 'Combat Tactics',
    icon: Swords,
    prompt: 'Generate a scenario-based combat tactics question for my character. Include a tactical situation and ask what the best action would be, considering action economy and spell slots.',
  },
  {
    id: 'rules',
    label: 'Rules Mastery',
    icon: BookOpen,
    prompt: 'Generate a D&D 2024 rules question. Focus on mechanics that differ from the 2014 version, action economy, conditions, or commonly misunderstood rules.',
  },
  {
    id: 'class_features',
    label: 'Class Features',
    icon: Shield,
    prompt: 'Generate a question about one of my character\'s class or subclass features. Focus on exact mechanics, uses per rest, interactions, and tactical applications per D&D 2024 rules.',
  },
]

const DIFFICULTY_CONFIG: Record<
  QuizQuestion['difficulty'],
  { variant: 'verdant' | 'ember' | 'eldritch'; label: string }
> = {
  apprentice: { variant: 'verdant', label: 'Apprentice' },
  journeyman: { variant: 'ember', label: 'Journeyman' },
  master: { variant: 'eldritch', label: 'Master' },
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuizArena({ character }: QuizArenaProps) {
  const { loading, error, queryStructured, clearResponse } = useAI()

  const [mode, setMode] = useState<QuizMode>('spells')
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  /* ------ derived ------ */
  const isCorrect =
    hasAnswered && selectedAnswer !== null
      ? selectedAnswer.toLowerCase().trim() === question?.correctAnswer.toLowerCase().trim()
      : false

  /* ------ handlers ------ */
  const generateQuestion = useCallback(async () => {
    clearResponse()
    setQuestion(null)
    setSelectedAnswer(null)
    setOpenAnswer('')
    setHasAnswered(false)

    const modeConfig = MODES.find((m) => m.id === mode)!

    try {
      const result = await queryStructured<QuizQuestion>(
        SYSTEM_PROMPTS.quizMaster(character),
        modeConfig.prompt,
      )
      setQuestion(result)
    } catch {
      // error state is handled by useAI hook
    }
  }, [character, mode, queryStructured, clearResponse])

  const submitAnswer = useCallback(
    (answer: string) => {
      if (hasAnswered || !question) return
      setSelectedAnswer(answer)
      setHasAnswered(true)

      const correct =
        answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
      setScore((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        total: prev.total + 1,
      }))
    },
    [hasAnswered, question],
  )

  const submitOpenAnswer = useCallback(() => {
    if (!openAnswer.trim()) return
    submitAnswer(openAnswer.trim())
  }, [openAnswer, submitAnswer])

  const nextQuestion = useCallback(() => {
    generateQuestion()
  }, [generateQuestion])

  const resetScore = useCallback(() => {
    setScore({ correct: 0, total: 0 })
    setQuestion(null)
    setSelectedAnswer(null)
    setOpenAnswer('')
    setHasAnswered(false)
    clearResponse()
  }, [clearResponse])

  /* ------ render helpers ------ */
  const renderModeChips = () => (
    <div className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const Icon = m.icon
        const isActive = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
              'text-sm font-medium select-none',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              isActive
                ? 'bg-arcane/15 text-arcane border border-arcane/30'
                : 'bg-white/[0.04] text-forge-1 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
            )}
          >
            <Icon size={16} aria-hidden />
            {m.label}
          </button>
        )
      })}
    </div>
  )

  const renderScoreboard = () => (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-forge-1">
        <Trophy size={16} className="text-ember" aria-hidden />
        <span className="font-mono text-forge-0">
          {score.correct}/{score.total}
        </span>
        {score.total > 0 && (
          <span className="text-forge-2">
            ({Math.round((score.correct / score.total) * 100)}%)
          </span>
        )}
      </div>
      {score.total > 0 && (
        <button
          type="button"
          onClick={resetScore}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
            'text-xs text-forge-2 hover:text-forge-1',
            'transition-colors duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
          aria-label="Reset score"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
      )}
    </div>
  )

  const renderMultipleChoice = (q: QuizQuestion) => (
    <div className="grid grid-cols-1 gap-2.5">
      {(q.options ?? []).map((option, i) => {
        const label = OPTION_LABELS[i]
        const isSelected = selectedAnswer === option
        const isCorrectOption =
          hasAnswered && option.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()

        return (
          <button
            key={label}
            type="button"
            disabled={hasAnswered}
            onClick={() => submitAnswer(option)}
            className={cn(
              'flex items-start gap-3 min-h-[44px] px-4 py-3 rounded-xl',
              'text-sm text-left font-body',
              'border transition-all duration-200 ease-forge',
              'active:scale-[0.98]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              'disabled:cursor-default',
              // Default state
              !hasAnswered && 'bg-white/[0.04] border-white/10 text-forge-0 hover:bg-white/[0.08] hover:border-white/20',
              // After answering
              hasAnswered && isCorrectOption && 'bg-verdant/10 border-verdant/40 text-verdant',
              hasAnswered && isSelected && !isCorrectOption && 'bg-red-500/10 border-red-500/40 text-red-400',
              hasAnswered && !isSelected && !isCorrectOption && 'bg-white/[0.02] border-white/5 text-forge-2',
            )}
          >
            <span
              className={cn(
                'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                'text-xs font-semibold',
                !hasAnswered && 'bg-white/10 text-forge-1',
                hasAnswered && isCorrectOption && 'bg-verdant/20 text-verdant',
                hasAnswered && isSelected && !isCorrectOption && 'bg-red-500/20 text-red-400',
                hasAnswered && !isSelected && !isCorrectOption && 'bg-white/5 text-forge-2',
              )}
            >
              {label}
            </span>
            <span className="pt-0.5">{option}</span>
          </button>
        )
      })}
    </div>
  )

  const renderTrueFalse = () => (
    <div className="grid grid-cols-2 gap-3">
      {['True', 'False'].map((option) => {
        const isSelected = selectedAnswer === option
        const isCorrectOption =
          hasAnswered && option.toLowerCase().trim() === question?.correctAnswer.toLowerCase().trim()

        return (
          <button
            key={option}
            type="button"
            disabled={hasAnswered}
            onClick={() => submitAnswer(option)}
            className={cn(
              'min-h-[52px] rounded-xl text-base font-semibold',
              'border transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              'disabled:cursor-default',
              !hasAnswered && 'bg-white/[0.04] border-white/10 text-forge-0 hover:bg-white/[0.08] hover:border-white/20',
              hasAnswered && isCorrectOption && 'bg-verdant/10 border-verdant/40 text-verdant',
              hasAnswered && isSelected && !isCorrectOption && 'bg-red-500/10 border-red-500/40 text-red-400',
              hasAnswered && !isSelected && !isCorrectOption && 'bg-white/[0.02] border-white/5 text-forge-2',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )

  const renderOpenEnded = () => (
    <div className="flex gap-2">
      <Input
        value={openAnswer}
        onChange={(e) => setOpenAnswer(e.target.value)}
        placeholder="Type your answer..."
        disabled={hasAnswered}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !hasAnswered) submitOpenAnswer()
        }}
        className="flex-1"
      />
      <Button
        variant="primary"
        size="md"
        onClick={submitOpenAnswer}
        disabled={hasAnswered || !openAnswer.trim()}
      >
        <Send size={16} aria-hidden />
        Submit
      </Button>
    </div>
  )

  const renderResult = () => {
    if (!hasAnswered || !question) return null

    return (
      <div
        className={cn(
          'rounded-xl border p-4 animate-fade-in',
          isCorrect
            ? 'bg-verdant/8 border-verdant/25 shadow-[0_0_20px_-4px_rgba(57,217,138,0.15)]'
            : 'bg-red-500/8 border-red-500/25 shadow-[0_0_20px_-4px_rgba(239,68,68,0.15)]',
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {isCorrect ? (
            <>
              <CheckCircle2 size={20} className="text-verdant shrink-0" aria-hidden />
              <span className="font-display font-semibold text-verdant">Correct!</span>
            </>
          ) : (
            <>
              <XCircle size={20} className="text-red-400 shrink-0" aria-hidden />
              <span className="font-display font-semibold text-red-400">Incorrect</span>
            </>
          )}
        </div>

        {!isCorrect && (
          <p className="text-sm text-forge-1 mb-2">
            <span className="text-forge-2">Correct answer: </span>
            <span className="font-medium text-forge-0">{question.correctAnswer}</span>
          </p>
        )}

        <p className="text-sm text-forge-1 leading-relaxed">{question.explanation}</p>
      </div>
    )
  }

  /* ------ main render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-semibold text-forge-0">Quiz Arena</h2>
        {renderScoreboard()}
      </div>

      {/* Mode selector */}
      {renderModeChips()}

      {/* Generate button */}
      <Button
        variant="primary"
        size="lg"
        loading={loading}
        onClick={generateQuestion}
        className="w-full"
      >
        {question ? 'Generate New Question' : 'Generate Question'}
      </Button>

      {/* Error state */}
      {error && (
        <GlassCard className="border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Failed to generate question</p>
              <p className="text-xs text-forge-2">{error}</p>
              <Button variant="ghost" size="sm" onClick={generateQuestion} className="mt-3">
                Try Again
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Loading state */}
      {loading && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin text-arcane" aria-hidden />
            <p className="text-sm text-forge-2">Generating question...</p>
          </div>
        </GlassCard>
      )}

      {/* Question card */}
      {question && !loading && (
        <GlassCard className="animate-slide-up">
          {/* Question header */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant={DIFFICULTY_CONFIG[question.difficulty].variant}>
              {DIFFICULTY_CONFIG[question.difficulty].label}
            </Badge>
            <Badge variant="neutral">{question.category.replace('_', ' ')}</Badge>
            <Badge variant="arcane">{question.type.replace('_', ' ')}</Badge>
          </div>

          {/* Question text */}
          <p className="text-base text-forge-0 font-medium leading-relaxed mb-5">
            {question.question}
          </p>

          {/* Answer area */}
          {question.type === 'multiple_choice' && renderMultipleChoice(question)}
          {question.type === 'true_false' && renderTrueFalse()}
          {(question.type === 'open_ended' || question.type === 'scenario') && renderOpenEnded()}

          {/* Result */}
          {hasAnswered && <div className="mt-4">{renderResult()}</div>}

          {/* Next question button */}
          {hasAnswered && (
            <div className="mt-4">
              <Button variant="secondary" size="md" onClick={nextQuestion} className="w-full">
                Next Question
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {/* Empty state */}
      {!question && !loading && !error && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-arcane/10 flex items-center justify-center">
              <BookOpen size={24} className="text-arcane" aria-hidden />
            </div>
            <p className="text-sm text-forge-1 max-w-xs">
              Select a quiz mode and generate a question to test your D&D 2024 knowledge for{' '}
              <span className="text-arcane font-medium">{character.name}</span>.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
