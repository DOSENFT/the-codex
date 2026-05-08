import { useState, useCallback, useEffect } from 'react'
import {
  Swords,
  BookOpen,
  Scroll,
  Shield,
  Dices,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Send,
  Target,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'
import { ParchmentCard } from './ui/ParchmentCard'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuizQuestion {
  question: string
  type: 'multiple_choice' | 'true_false' | 'open_ended' | 'scenario'
  options?: string[]
  distractors?: string[]
  correctAnswer: string
  explanation: string
  difficulty: 'apprentice' | 'journeyman' | 'master'
  category: string
  topic?: string
}

type QuizMode = 'spells' | 'combat' | 'rules' | 'class_features' | 'dice_rolls'

interface QuizArenaProps {
  character: Character
  onQuizAnswer?: (category: string, difficulty: string, correct: boolean) => void
  suggestedDifficulty?: 'apprentice' | 'journeyman' | 'master'
  weakCategories?: string[]
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
  {
    id: 'dice_rolls',
    label: 'Dice Rolls',
    icon: Dices,
    prompt: 'Generate a dice roll practice question. Ask what dice to roll for a specific action using my character\'s actual weapons and spell stats. Include the exact answer (e.g. "d20 + 6" or "8d6 fire damage").',
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

export function QuizArena({
  character,
  onQuizAnswer,
  suggestedDifficulty,
  weakCategories,
}: QuizArenaProps) {
  const { loading, error, queryStructured, clearResponse } = useAI()

  const [mode, setMode] = useState<QuizMode>('spells')
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [practiceWeakMode, setPracticeWeakMode] = useState(false)
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [recentQA, setRecentQA] = useState<{ q: string; a: string }[]>([])

  // Apply suggested difficulty when it changes (only if no active question)
  useEffect(() => {
    // We just track suggestedDifficulty for prompt generation, no state needed
  }, [suggestedDifficulty])

  /* ------ derived ------ */
  const isCorrect =
    hasAnswered && selectedAnswer !== null
      ? selectedAnswer.toLowerCase().trim() === question?.correctAnswer.toLowerCase().trim()
      : false

  /* ------ handlers ------ */
  const generateQuestion = useCallback(async (targetCategories?: string[]) => {
    clearResponse()
    setQuestion(null)
    setSelectedAnswer(null)
    setOpenAnswer('')
    setHasAnswered(false)

    const modeConfig = MODES.find((m) => m.id === mode)!

    // Build difficulty hint
    const diffHint = suggestedDifficulty
      ? ` Aim for "${suggestedDifficulty}" difficulty level.`
      : ''

    // Build category targeting hint
    const categoryHint = targetCategories && targetCategories.length > 0
      ? ` Focus on these weak areas: ${targetCategories.join(', ')}.`
      : ''

    try {
      const result = await queryStructured<QuizQuestion>(
        SYSTEM_PROMPTS.quizMaster(character, recentTopics, recentQA),
        modeConfig.prompt + diffHint + categoryHint,
      )

      // Handle new JSON format: if `distractors` present but `options` missing,
      // build shuffled options from correctAnswer + distractors
      if (result.distractors && result.distractors.length > 0 && !result.options) {
        const allOptions = [result.correctAnswer, ...result.distractors]
        // Fisher-Yates shuffle
        for (let i = allOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]]
        }
        result.options = allOptions
        // Ensure type is multiple_choice when we have options
        if (!result.type) {
          result.type = 'multiple_choice'
        }
      }

      // Default type to multiple_choice if options exist but type is missing
      if (result.options && result.options.length > 0 && !result.type) {
        result.type = 'multiple_choice'
      }

      setQuestion(result)
    } catch {
      // error state is handled by useAI hook
    }
  }, [character, mode, queryStructured, clearResponse, suggestedDifficulty, recentTopics, recentQA])

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

      // Track recent topics for dedup (keep last 10)
      if (question.topic) {
        setRecentTopics((prev) => [...prev, question.topic!].slice(-10))
      }

      // Track recent Q&A for context consistency (keep last 3)
      setRecentQA((prev) => [
        ...prev,
        { q: question.question, a: question.correctAnswer },
      ].slice(-3))

      // Report to training system
      if (onQuizAnswer) {
        onQuizAnswer(question.category || mode, question.difficulty, correct)
      }
    },
    [hasAnswered, question, onQuizAnswer, mode],
  )

  const submitOpenAnswer = useCallback(() => {
    if (!openAnswer.trim()) return
    submitAnswer(openAnswer.trim())
  }, [openAnswer, submitAnswer])

  const nextQuestion = useCallback(() => {
    if (practiceWeakMode && weakCategories && weakCategories.length > 0) {
      generateQuestion(weakCategories)
    } else {
      generateQuestion()
    }
  }, [generateQuestion, practiceWeakMode, weakCategories])

  const resetScore = useCallback(() => {
    setScore({ correct: 0, total: 0 })
    setQuestion(null)
    setSelectedAnswer(null)
    setOpenAnswer('')
    setHasAnswered(false)
    setPracticeWeakMode(false)
    setRecentTopics([])
    setRecentQA([])
    clearResponse()
  }, [clearResponse])

  const handlePracticeWeaknesses = useCallback(() => {
    setPracticeWeakMode(true)
    generateQuestion(weakCategories)
  }, [generateQuestion, weakCategories])

  /* ------ render helpers ------ */
  const renderModeChips = () => (
    <div className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const Icon = m.icon
        const isActive = mode === m.id
        const isWeak = weakCategories?.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id)
              setPracticeWeakMode(false)
            }}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
              'text-sm font-medium select-none',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              isActive
                ? 'bg-arcane/15 text-arcane border border-arcane/30'
                : 'combat-card text-forge-1 hover:bg-gold/[0.08] hover:border-gold/30',
              isWeak && !isActive && 'border-red-500/30',
            )}
          >
            <Icon size={16} aria-hidden />
            {m.label}
            {isWeak && (
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" aria-label="Weak category" />
            )}
          </button>
        )
      })}
    </div>
  )

  const renderScoreboard = () => (
    <div className="flex items-center gap-3">
      <div className="stat-frame">
        <Trophy size={16} className="text-ember" aria-hidden />
        <span className="font-mono text-forge-0">
          {score.correct}/{score.total}
        </span>
        {score.total > 0 && (
          <span className="text-forge-2 text-xs">
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
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
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
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'disabled:cursor-default',
              // Default state
              !hasAnswered && 'combat-card text-forge-0 hover:border-gold/40',
              // After answering
              hasAnswered && isCorrectOption && 'bg-verdant/10 border-verdant/40 text-verdant',
              hasAnswered && isSelected && !isCorrectOption && 'bg-red-400/10 border-red-400/40 text-red-400',
              hasAnswered && !isSelected && !isCorrectOption && 'bg-gold/[0.02] border-bronze/15 text-forge-2',
            )}
          >
            <span
              className={cn(
                'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                'text-xs font-semibold',
                !hasAnswered && 'bg-void-2/60 text-forge-1',
                hasAnswered && isCorrectOption && 'bg-verdant/20 text-verdant',
                hasAnswered && isSelected && !isCorrectOption && 'bg-red-500/20 text-red-400',
                hasAnswered && !isSelected && !isCorrectOption && 'bg-void-2/60 text-forge-2',
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
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'disabled:cursor-default',
              !hasAnswered && 'combat-card text-forge-0 hover:border-gold/40',
              hasAnswered && isCorrectOption && 'bg-verdant/10 border-verdant/40 text-verdant',
              hasAnswered && isSelected && !isCorrectOption && 'bg-red-400/10 border-red-400/40 text-red-400',
              hasAnswered && !isSelected && !isCorrectOption && 'bg-gold/[0.02] border-bronze/15 text-forge-2',
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
        <OrnateHeader>Quiz Arena</OrnateHeader>
        {renderScoreboard()}
      </div>

      {/* Mode selector */}
      {renderModeChips()}

      <div className="ornate-divider" aria-hidden />

      {/* Practice Weaknesses button */}
      {weakCategories && weakCategories.length > 0 && !practiceWeakMode && (
        <Button
          variant="secondary"
          size="md"
          onClick={handlePracticeWeaknesses}
          className="w-full"
        >
          <Target size={16} aria-hidden />
          Practice Weaknesses ({weakCategories.length} area{weakCategories.length !== 1 ? 's' : ''})
        </Button>
      )}

      {/* Weakness practice active indicator */}
      {practiceWeakMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ember/[0.08] border border-ember/20">
          <Target size={14} className="text-ember shrink-0" aria-hidden />
          <span className="text-xs text-ember font-medium">
            Targeting weak areas: {weakCategories?.join(', ')}
          </span>
          <button
            type="button"
            onClick={() => setPracticeWeakMode(false)}
            className="ml-auto text-xs text-forge-2 hover:text-forge-1 min-h-[44px] px-2 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Generate button */}
      <Button
        variant="primary"
        size="lg"
        loading={loading}
        onClick={() => practiceWeakMode ? generateQuestion(weakCategories) : generateQuestion()}
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
              <Button variant="ghost" size="sm" onClick={() => generateQuestion()} className="mt-3">
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
        <ParchmentCard className="animate-slide-up">
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
        </ParchmentCard>
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
