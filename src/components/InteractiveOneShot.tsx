import { useState, useCallback, useRef, useEffect } from 'react'
import {
  BookOpen,
  Send,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Scroll,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flag,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { ParchmentCard } from './ui/ParchmentCard'
import { GlassCard } from './ui/GlassCard'
import { HexFrame } from './ui/HexFrame'
import { OrnateHeader } from './ui/OrnateHeader'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InteractiveOneShotProps {
  character: Character
  onComplete: (score: number) => void
  onBack: () => void
}

interface OneShotCoaching {
  rating: 'green' | 'amber' | 'red'
  note: string
}

interface OneShotTurn {
  narration: string
  options: string[]
  userResponse: string
  coaching: OneShotCoaching
}

interface OneShotSummary {
  score: number
  strengths: string[]
  improvements: string[]
  highlight: string
}

interface AITurnResponse {
  narration: string
  coaching: { rating: string; note: string }
  options: string[]
  isConclusion: boolean
  summary?: OneShotSummary
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_TURNS = 10
const MIN_TURNS_FOR_CONCLUDE = 5

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function coachingColor(rating: string): string {
  switch (rating) {
    case 'green': return 'bg-verdant'
    case 'amber': return 'bg-ember'
    case 'red': return 'bg-red-400'
    default: return 'bg-forge-2'
  }
}

function coachingBadgeVariant(rating: string): 'verdant' | 'ember' | 'arcane' {
  switch (rating) {
    case 'green': return 'verdant'
    case 'amber': return 'ember'
    default: return 'arcane'
  }
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-verdant'
  if (score >= 5) return 'text-ember'
  return 'text-red-400'
}

/* ------------------------------------------------------------------ */
/*  CoachingDot — small expandable coaching indicator                  */
/* ------------------------------------------------------------------ */

function CoachingDot({ coaching }: { coaching: OneShotCoaching }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className={cn(
          'inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          'bg-white/[0.03] border border-white/[0.06]',
          'hover:bg-white/[0.06]',
        )}
        aria-label={`Coaching: ${coaching.rating}. ${expanded ? 'Collapse' : 'Expand'} note`}
      >
        <span
          className={cn(
            'w-3 h-3 rounded-full shrink-0',
            coachingColor(coaching.rating),
          )}
          aria-hidden
        />
        <span className="text-xs text-forge-2 select-none">Coaching</span>
        {expanded ? (
          <ChevronUp size={12} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={12} className="text-forge-2" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="pl-5 animate-fade-in">
          <Badge variant={coachingBadgeVariant(coaching.rating)}>
            {coaching.note}
          </Badge>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function InteractiveOneShot({ character, onComplete, onBack }: InteractiveOneShotProps) {
  /* ------ AI hook ------ */
  const ai = useAI()

  /* ------ State ------ */
  const [phase, setPhase] = useState<'idle' | 'playing' | 'concluded'>('idle')
  const [turns, setTurns] = useState<OneShotTurn[]>([])
  const [currentNarration, setCurrentNarration] = useState<string | null>(null)
  const [currentOptions, setCurrentOptions] = useState<string[]>([])
  const [currentCoaching, setCurrentCoaching] = useState<OneShotCoaching | null>(null)
  const [freeformInput, setFreeformInput] = useState('')
  const [summary, setSummary] = useState<OneShotSummary | null>(null)
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set())

  /* ------ Refs ------ */
  const storyEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* ------ Scroll to bottom on new narration ------ */
  useEffect(() => {
    if (currentNarration && storyEndRef.current) {
      storyEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentNarration, turns.length])

  /* ------ Send a turn to AI ------ */
  const sendTurn = useCallback(async (userResponse?: string) => {
    const previousTurns = userResponse
      ? [
          ...turns.map(t => ({
            narration: t.narration,
            response: t.userResponse,
            coaching: { rating: t.coaching.rating, note: t.coaching.note },
          })),
          {
            narration: currentNarration ?? '',
            response: userResponse,
            coaching: currentCoaching
              ? { rating: currentCoaching.rating, note: currentCoaching.note }
              : { rating: 'green', note: '' },
          },
        ]
      : []

    // If user responded, record the current turn before getting next
    if (userResponse && currentNarration) {
      setTurns(prev => [
        ...prev,
        {
          narration: currentNarration,
          options: currentOptions,
          userResponse,
          coaching: currentCoaching ?? { rating: 'green', note: 'Adventure begins!' },
        },
      ])
    }

    try {
      const result = await ai.queryStructured<AITurnResponse>(
        SYSTEM_PROMPTS.interactiveOneShot(character, previousTurns),
        userResponse
          ? `The player responds: "${userResponse}"\n\nContinue the adventure.`
          : `Begin the adventure for ${character.name}. Set the scene with an intriguing hook.`,
      )

      setCurrentNarration(result.narration)
      setCurrentOptions(result.options ?? [])
      setCurrentCoaching({
        rating: (result.coaching?.rating ?? 'green') as 'green' | 'amber' | 'red',
        note: result.coaching?.note ?? '',
      })

      if (result.isConclusion && result.summary) {
        // Record the final turn
        setTurns(prev => [
          ...prev,
          {
            narration: result.narration,
            options: [],
            userResponse: '',
            coaching: {
              rating: (result.coaching?.rating ?? 'green') as 'green' | 'amber' | 'red',
              note: result.coaching?.note ?? '',
            },
          },
        ])
        setSummary(result.summary)
        setPhase('concluded')
        onComplete(result.summary.score)
      } else {
        setPhase('playing')
      }
    } catch {
      // error handled by useAI hook
    }

    setFreeformInput('')
  }, [turns, currentNarration, currentOptions, currentCoaching, character, ai, onComplete])

  /* ------ Handlers ------ */

  const beginAdventure = useCallback(() => {
    setTurns([])
    setCurrentNarration(null)
    setCurrentOptions([])
    setCurrentCoaching(null)
    setSummary(null)
    setFreeformInput('')
    sendTurn()
  }, [sendTurn])

  const selectOption = useCallback((option: string) => {
    sendTurn(option)
  }, [sendTurn])

  const submitFreeform = useCallback(() => {
    if (!freeformInput.trim()) return
    sendTurn(freeformInput.trim())
  }, [freeformInput, sendTurn])

  const concludeAdventure = useCallback(() => {
    sendTurn('I want to conclude this adventure. Wrap up the story naturally.')
  }, [sendTurn])

  const toggleTurnExpand = useCallback((index: number) => {
    setExpandedTurns(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  /* ------ Derived state ------ */
  const turnNumber = turns.length + (phase === 'playing' && currentNarration ? 1 : 0)
  const canConclude = turns.length >= MIN_TURNS_FOR_CONCLUDE && phase === 'playing'

  /* ------ Render ------ */
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg',
              'text-forge-2 hover:text-forge-1',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Back to drills"
          >
            <ArrowLeft size={18} aria-hidden />
          </button>
          <OrnateHeader>Interactive One-Shot</OrnateHeader>
        </div>

        {phase === 'playing' && (
          <div className="flex items-center gap-2">
            <Scroll size={14} className="text-ember" aria-hidden />
            <span className="text-sm font-mono text-forge-0">
              Turn {turnNumber}/{MAX_TURNS}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Idle Phase — Start button                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {phase === 'idle' && !ai.loading && (
        <GlassCard className="border-ember/15">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-ember/10 flex items-center justify-center">
              <BookOpen size={28} className="text-ember" aria-hidden />
            </div>
            <div className="max-w-xs">
              <p className="text-base font-display font-semibold text-forge-0 mb-2">
                Interactive One-Shot
              </p>
              <p className="text-sm text-forge-2 leading-relaxed">
                Embark on a short adventure as {character.name}. Make choices in-character,
                receive real-time coaching on your roleplay, and earn XP based on your
                characterization score.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={beginAdventure}
              className="w-full max-w-xs"
            >
              <Sparkles size={16} aria-hidden />
              Begin One-Shot
            </Button>
          </div>
        </GlassCard>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Loading state                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {ai.loading && (
        <div className="flex flex-col items-center py-8 gap-3 animate-fade-in">
          <Loader2 size={28} className="animate-spin text-ember" aria-hidden />
          <p className="text-sm text-forge-2 italic">The story unfolds...</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Error state                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {ai.error && !ai.loading && (
        <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm text-red-400 font-semibold">Something went wrong</p>
            <p className="text-xs text-forge-2 mt-0.5">{ai.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={phase === 'idle' ? beginAdventure : () => sendTurn()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Playing Phase — Story + Choices                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {phase === 'playing' && !ai.loading && currentNarration && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Previous turns (collapsed, expandable) */}
          {turns.length > 0 && (
            <div className="flex flex-col gap-2">
              {turns.map((turn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleTurnExpand(i)}
                  className={cn(
                    'w-full text-left min-h-[44px] px-3 py-2 rounded-lg',
                    'bg-white/[0.02] border border-white/[0.06]',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-white/[0.04]',
                    'active:scale-[0.99]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  )}
                  aria-expanded={expandedTurns.has(i)}
                  aria-label={`Turn ${i + 1} details`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        coachingColor(turn.coaching.rating),
                      )}
                      aria-hidden
                    />
                    <span className="text-xs font-mono text-forge-2">Turn {i + 1}</span>
                    <span className="text-xs text-forge-2 truncate flex-1">
                      {turn.narration.slice(0, 60)}...
                    </span>
                    {expandedTurns.has(i) ? (
                      <ChevronUp size={12} className="text-forge-2 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown size={12} className="text-forge-2 shrink-0" aria-hidden />
                    )}
                  </div>

                  {expandedTurns.has(i) && (
                    <div
                      className="mt-3 flex flex-col gap-2 animate-fade-in"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-sm text-forge-1 leading-relaxed">{turn.narration}</p>
                      <div className="pl-3 border-l-2 border-ember/30">
                        <p className="text-xs text-forge-2 uppercase tracking-wider mb-1">Your Response</p>
                        <p className="text-sm text-forge-0 italic">{turn.userResponse}</p>
                      </div>
                      <Badge variant={coachingBadgeVariant(turn.coaching.rating)}>
                        {turn.coaching.note}
                      </Badge>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Coaching from previous turn */}
          {turns.length > 0 && currentCoaching && (
            <CoachingDot coaching={currentCoaching} />
          )}

          {/* Current narration */}
          <ParchmentCard>
            <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
              {turns.length === 0 ? 'The Adventure Begins' : `Turn ${turnNumber}`}
            </p>
            <p className="text-sm text-forge-0 leading-relaxed">{currentNarration}</p>
          </ParchmentCard>

          {/* Decision area */}
          <div className="flex flex-col gap-3">
            {/* Option buttons */}
            {currentOptions.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectOption(option)}
                disabled={ai.loading}
                className={cn(
                  'w-full min-h-[44px] px-4 py-3 rounded-xl text-left',
                  'bg-white/[0.04] border border-white/10',
                  'text-sm text-forge-0 font-medium',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.08] hover:border-white/20',
                  'active:scale-[0.98]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <span className="text-ember font-mono mr-2">{i + 1}.</span>
                {option}
              </button>
            ))}

            {/* Freeform input */}
            <div className="flex flex-col gap-2">
              <textarea
                ref={inputRef}
                value={freeformInput}
                onChange={e => setFreeformInput(e.target.value)}
                placeholder={`What does ${character.name} do?`}
                disabled={ai.loading}
                rows={2}
                className={cn(
                  'min-h-[60px] w-full rounded-xl resize-y',
                  'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                  'border border-white/10',
                  'font-body text-sm px-4 py-3',
                  'transition-all duration-200 ease-forge',
                  'focus:border-ember/60 focus:bg-void-2/80',
                  'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                  'focus:outline-none',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && freeformInput.trim()) {
                    e.preventDefault()
                    submitFreeform()
                  }
                }}
              />
              <Button
                variant="secondary"
                size="md"
                onClick={submitFreeform}
                disabled={!freeformInput.trim() || ai.loading}
                className="w-full"
              >
                <Send size={16} aria-hidden />
                Do Something Else
              </Button>
            </div>

            {/* Conclude Adventure button */}
            {canConclude && (
              <Button
                variant="ghost"
                size="sm"
                onClick={concludeAdventure}
                disabled={ai.loading}
                className="w-full mt-1"
              >
                <Flag size={14} aria-hidden />
                Conclude Adventure
              </Button>
            )}
          </div>

          <div ref={storyEndRef} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Concluded Phase — Summary                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {phase === 'concluded' && summary && (
        <div className="flex flex-col gap-5 animate-slide-up">
          {/* Final narration */}
          {currentNarration && (
            <ParchmentCard>
              <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                The End
              </p>
              <p className="text-sm text-forge-0 leading-relaxed italic">{currentNarration}</p>
            </ParchmentCard>
          )}

          {/* Score card */}
          <GlassCard className="border-ember/20">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <HexFrame
                  variant={summary.score >= 8 ? 'verdant' : summary.score >= 5 ? 'ember' : 'arcane'}
                >
                  <span className={cn('font-display text-2xl font-bold', getScoreColor(summary.score))}>
                    {summary.score}
                  </span>
                </HexFrame>
                <div>
                  <p className="text-sm text-forge-2">/10 Characterization Score</p>
                  <p className="text-xs text-forge-2 mt-0.5">
                    {turns.length} turns completed
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Trophy size={12} className="text-ember" aria-hidden />
                    <span className="text-xs font-mono text-ember">
                      +{summary.score * 5} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Highlight */}
          {summary.highlight && (
            <ParchmentCard className="border-arcane/25">
              <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-2">
                Highlight Moment
              </p>
              <p className="text-sm text-forge-0 leading-relaxed italic">
                &ldquo;{summary.highlight}&rdquo;
              </p>
            </ParchmentCard>
          )}

          {/* Strengths */}
          {summary.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-verdant uppercase tracking-wider mb-2">
                Strengths
              </p>
              <ul className="flex flex-col gap-1.5">
                {summary.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                    <CheckCircle2 size={13} className="text-verdant shrink-0 mt-0.5" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {summary.improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                Areas for Growth
              </p>
              <ul className="flex flex-col gap-1.5">
                {summary.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                    <ArrowRight size={13} className="text-ember shrink-0 mt-0.5" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Turn-by-turn coaching recap */}
          {turns.length > 0 && (
            <GlassCard className="border-white/[0.06]">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-3">
                Turn-by-Turn Coaching
              </p>
              <div className="flex flex-col gap-2">
                {turns.map((turn, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0 mt-1',
                        coachingColor(turn.coaching.rating),
                      )}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-forge-2">Turn {i + 1}: </span>
                      <span className="text-xs text-forge-1">{turn.coaching.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={beginAdventure}
              className="w-full"
            >
              <Sparkles size={16} aria-hidden />
              New Adventure
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft size={16} aria-hidden />
              Back to Drills
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
