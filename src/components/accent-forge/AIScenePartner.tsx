import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Send,
  Theater,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Star,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { ACCENT_PROFILES } from '../../lib/accent-data'
import type { Character } from '../../lib/character'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import { GlassCard } from '../ui/GlassCard'
import { ParchmentCard } from '../ui/ParchmentCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AIScenePartnerProps {
  character: Character
}

interface CoachingEntry {
  accentScore: number
  whatWorked: string
  whatToFix: string
  rewrite: string
}

interface SceneOpenResponse {
  npcName: string
  sceneSetting: string
  npcLine: string
  coaching: null
}

interface SceneReplyResponse {
  npcLine: string
  coaching: {
    accentScore: number
    whatWorked: string
    whatToFix: string
    rewrite: string
  }
}

/** A single rendered message in the chat log */
interface ChatMessage {
  id: string
  sender: 'npc' | 'player' | 'system'
  text: string
  coaching?: CoachingEntry
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCENARIOS = [
  'Tavern',
  'Marketplace',
  'Throne Room',
  'Battlefield',
  'Prison Cell',
  'Temple',
  'Dark Alley',
  'Campfire',
] as const

type Scenario = (typeof SCENARIOS)[number]

/** Group accents by category for the selector */
function groupAccentsByCategory() {
  const fantasy = ACCENT_PROFILES.filter((a) => a.category === 'fantasy')
  const realWorld = ACCENT_PROFILES.filter((a) => a.category === 'real-world')
  return { fantasy, realWorld }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Accent score badge with color coding */
function ScoreBadge({ score }: { score: number }) {
  const variant =
    score <= 2 ? 'ember' : score === 3 ? 'arcane' : 'verdant'
  return (
    <Badge variant={variant} className="text-sm px-3 py-1 gap-1.5">
      <Star size={12} aria-hidden />
      {score}/5
    </Badge>
  )
}

/** Expandable coaching card for a single exchange */
function CoachingCard({
  coaching,
  index,
  expanded,
  onToggle,
}: {
  coaching: CoachingEntry
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <GlassCard
      className={cn(
        'ml-0 mr-auto max-w-[90%] sm:max-w-[75%]',
        'border-l-2 border-l-eldritch/40',
        'p-0 overflow-hidden',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'min-h-[44px] px-4 py-3',
          'text-sm font-medium text-forge-1',
          'hover:bg-white/[0.03] transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          'active:scale-[0.99]',
        )}
        aria-expanded={expanded}
        aria-controls={`coaching-panel-${index}`}
      >
        <span className="flex items-center gap-2">
          <ScoreBadge score={coaching.accentScore} />
          <span className="text-forge-2 text-xs">Dialect Coach</span>
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-forge-2 shrink-0" aria-hidden />
        ) : (
          <ChevronDown size={16} className="text-forge-2 shrink-0" aria-hidden />
        )}
      </button>

      {expanded && (
        <div
          id={`coaching-panel-${index}`}
          className="px-4 pb-4 flex flex-col gap-3 animate-fade-in"
        >
          {/* What Worked */}
          <div>
            <p className="text-xs font-semibold text-verdant mb-1 uppercase tracking-wider">
              What Worked
            </p>
            <p className="text-sm text-forge-1 leading-relaxed">
              {coaching.whatWorked}
            </p>
          </div>

          {/* What to Fix */}
          <div>
            <p className="text-xs font-semibold text-ember mb-1 uppercase tracking-wider">
              What to Fix
            </p>
            <p className="text-sm text-forge-1 leading-relaxed">
              {coaching.whatToFix}
            </p>
          </div>

          {/* Better Version */}
          <div>
            <p className="text-xs font-semibold text-arcane mb-1 uppercase tracking-wider">
              Better Version
            </p>
            <ParchmentCard className="mt-1 p-3">
              <p className="text-sm text-arcane italic leading-relaxed">
                &ldquo;{coaching.rewrite}&rdquo;
              </p>
            </ParchmentCard>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AIScenePartner({ character }: AIScenePartnerProps) {
  /* ---- State ---- */
  const [selectedAccentId, setSelectedAccentId] = useState<string | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [sceneStarted, setSceneStarted] = useState(false)
  const [exchanges, setExchanges] = useState<{ npc: string; player: string }[]>(
    [],
  )
  const [npcName, setNpcName] = useState('')
  const [currentNpcLine, setCurrentNpcLine] = useState('')
  const [sceneSetting, setSceneSetting] = useState('')
  const [playerInput, setPlayerInput] = useState('')
  const [coachingHistory, setCoachingHistory] = useState<CoachingEntry[]>([])
  const [expandedCoaching, setExpandedCoaching] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sceneEnded, setSceneEnded] = useState(false)

  const ai = useAI()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* ---- Derived ---- */
  const accent = selectedAccentId
    ? ACCENT_PROFILES.find((a) => a.id === selectedAccentId) ?? null
    : null
  const { fantasy, realWorld } = groupAccentsByCategory()
  const canBeginScene = selectedAccentId !== null && selectedScenario !== null
  const canEndScene = exchanges.length >= 2

  /* ---- Auto-scroll ---- */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, ai.loading])

  /* ---- Helpers ---- */

  const nextMsgId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }, [])

  /* ---- Scene Start ---- */

  const handleBeginScene = useCallback(async () => {
    if (!accent || !selectedScenario) return

    setSceneStarted(true)
    setChatMessages([])
    setExchanges([])
    setCoachingHistory([])
    setExpandedCoaching(null)
    setSceneEnded(false)

    const systemPrompt = SYSTEM_PROMPTS.accentScenePartner(
      character,
      accent.name,
      accent.rules.map((r) => `${r.rule}: ${r.example}`).join('\n'),
      selectedScenario,
      [],
    )

    try {
      const result = await ai.queryStructured<SceneOpenResponse>(
        systemPrompt,
        'Begin the scene.',
      )

      setNpcName(result.npcName)
      setSceneSetting(result.sceneSetting)
      setCurrentNpcLine(result.npcLine)

      setChatMessages([
        {
          id: nextMsgId(),
          sender: 'system',
          text: result.sceneSetting,
        },
        {
          id: nextMsgId(),
          sender: 'npc',
          text: result.npcLine,
        },
      ])
    } catch {
      // Error is surfaced via ai.error — no additional handling needed
    }
  }, [accent, selectedScenario, character, ai, nextMsgId])

  /* ---- Player Send ---- */

  const handleSend = useCallback(async () => {
    const trimmed = playerInput.trim()
    if (!trimmed || !accent || !selectedScenario || ai.loading) return

    // Add player message to chat
    const playerMsg: ChatMessage = {
      id: nextMsgId(),
      sender: 'player',
      text: trimmed,
    }
    setChatMessages((prev) => [...prev, playerMsg])
    setPlayerInput('')

    // Build updated exchanges (include current one for the prompt)
    const newExchanges = [
      ...exchanges,
      { npc: currentNpcLine, player: trimmed },
    ]

    const systemPrompt = SYSTEM_PROMPTS.accentScenePartner(
      character,
      accent.name,
      accent.rules.map((r) => `${r.rule}: ${r.example}`).join('\n'),
      selectedScenario,
      newExchanges,
    )

    try {
      const result = await ai.queryStructured<SceneReplyResponse>(
        systemPrompt,
        trimmed,
      )

      setExchanges(newExchanges)
      setCurrentNpcLine(result.npcLine)

      const coaching: CoachingEntry = {
        accentScore: result.coaching.accentScore,
        whatWorked: result.coaching.whatWorked,
        whatToFix: result.coaching.whatToFix,
        rewrite: result.coaching.rewrite,
      }
      setCoachingHistory((prev) => [...prev, coaching])

      const coachingIndex = coachingHistory.length

      setChatMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          sender: 'npc',
          text: result.npcLine,
          coaching,
        },
      ])

      // Auto-expand the latest coaching
      setExpandedCoaching(coachingIndex)
    } catch {
      // Error is surfaced via ai.error
    }
  }, [
    playerInput,
    accent,
    selectedScenario,
    ai,
    exchanges,
    currentNpcLine,
    character,
    coachingHistory.length,
    nextMsgId,
  ])

  /* ---- End Scene ---- */

  const handleEndScene = useCallback(() => {
    setSceneEnded(true)
  }, [])

  /* ---- Reset ---- */

  const handleReset = useCallback(() => {
    setSceneStarted(false)
    setSceneEnded(false)
    setChatMessages([])
    setExchanges([])
    setCoachingHistory([])
    setExpandedCoaching(null)
    setNpcName('')
    setCurrentNpcLine('')
    setSceneSetting('')
    setPlayerInput('')
    ai.clearResponse()
  }, [ai])

  /* ---- Key handler for textarea ---- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  /* ---- Summary Stats ---- */

  const averageScore =
    coachingHistory.length > 0
      ? coachingHistory.reduce((sum, c) => sum + c.accentScore, 0) /
        coachingHistory.length
      : 0

  /* ================================================================ */
  /*  RENDER: Scene Summary (End State)                                */
  /* ================================================================ */

  if (sceneEnded) {
    const roundedAvg = Math.round(averageScore * 10) / 10
    const scoreVariant: 'ember' | 'arcane' | 'verdant' =
      roundedAvg < 2.5 ? 'ember' : roundedAvg < 4 ? 'arcane' : 'verdant'

    return (
      <section
        className="flex flex-col gap-5 animate-fade-in"
        aria-label="Scene Summary"
      >
        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Theater size={20} className="text-arcane shrink-0" aria-hidden />
            <h3 className="text-lg font-semibold text-forge-0">
              Scene Complete
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={scoreVariant} className="text-base px-4 py-1.5">
              <Star size={14} className="mr-1" aria-hidden />
              Average: {roundedAvg}/5
            </Badge>
            <span className="text-sm text-forge-2">
              {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''} with{' '}
              {npcName}
            </span>
          </div>

          {accent && (
            <p className="text-sm text-forge-2">
              Accent practiced:{' '}
              <span className="text-forge-1 font-medium">{accent.name}</span>{' '}
              &middot; Scenario:{' '}
              <span className="text-forge-1 font-medium">
                {selectedScenario}
              </span>
            </p>
          )}

          {/* Per-exchange breakdown */}
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
              Score Breakdown
            </p>
            <div className="flex flex-wrap gap-2">
              {coachingHistory.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-sm text-forge-1"
                >
                  <span className="text-forge-2">#{i + 1}</span>
                  <ScoreBadge score={c.accentScore} />
                </div>
              ))}
            </div>
          </div>

          {/* Overall coaching notes */}
          {coachingHistory.length > 0 && (
            <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-white/8">
              <div>
                <p className="text-xs font-semibold text-verdant mb-1 uppercase tracking-wider">
                  Strengths Across Exchanges
                </p>
                <ul className="list-disc list-inside text-sm text-forge-1 space-y-1">
                  {coachingHistory.map((c, i) => (
                    <li key={i}>
                      <span className="text-forge-2 text-xs mr-1">#{i + 1}:</span>
                      {c.whatWorked}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-ember mb-1 uppercase tracking-wider">
                  Areas to Improve
                </p>
                <ul className="list-disc list-inside text-sm text-forge-1 space-y-1">
                  {coachingHistory.map((c, i) => (
                    <li key={i}>
                      <span className="text-forge-2 text-xs mr-1">#{i + 1}:</span>
                      {c.whatToFix}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </GlassCard>

        <div className="flex gap-3">
          <Button variant="primary" onClick={handleBeginScene} size="lg">
            <RotateCcw size={16} aria-hidden />
            New Scene (Same Setup)
          </Button>
          <Button variant="secondary" onClick={handleReset} size="lg">
            Change Setup
          </Button>
        </div>
      </section>
    )
  }

  /* ================================================================ */
  /*  RENDER: Setup Phase                                              */
  /* ================================================================ */

  if (!sceneStarted) {
    return (
      <section
        className="flex flex-col gap-5 animate-fade-in"
        aria-label="Scene Partner Setup"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Theater size={20} className="text-arcane shrink-0" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-forge-0">
              AI Scene Partner
            </h3>
            <p className="text-sm text-forge-2 mt-0.5">
              Practice your accent in a live D&amp;D scene with an AI NPC
            </p>
          </div>
        </div>

        {/* Accent Selector */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="accent-select"
            className="text-sm font-medium text-forge-1"
          >
            Choose an Accent
          </label>
          <select
            id="accent-select"
            value={selectedAccentId ?? ''}
            onChange={(e) =>
              setSelectedAccentId(e.target.value || null)
            }
            className={cn(
              'min-h-[44px] px-3 py-2 rounded-xl',
              'bg-void-2/60 border border-white/10',
              'text-sm text-forge-0',
              'focus:outline-none focus:ring-2 focus:ring-arcane/50 focus:border-arcane/40',
              'transition-all duration-200',
              'appearance-none cursor-pointer',
              // Custom caret
              'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27 fill=%27none%27%3E%3Cpath d=%27M3 4.5L6 7.5L9 4.5%27 stroke=%27%23888%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")]',
              'bg-no-repeat bg-[right_12px_center]',
            )}
          >
            <option value="" disabled>
              Select an accent to practice...
            </option>
            <optgroup label="Fantasy">
              {fantasy.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.region}
                </option>
              ))}
            </optgroup>
            <optgroup label="Real-World">
              {realWorld.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.region}
                </option>
              ))}
            </optgroup>
          </select>
          {accent && (
            <p className="text-xs text-forge-2 mt-0.5">
              {accent.description}
            </p>
          )}
        </div>

        {/* Scenario Chips */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-forge-1">Pick a Scenario</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((scenario) => {
              const isSelected = selectedScenario === scenario
              return (
                <button
                  key={scenario}
                  type="button"
                  onClick={() => setSelectedScenario(scenario)}
                  className={cn(
                    'min-h-[44px] px-4 rounded-xl border text-sm font-medium',
                    'transition-all duration-200 ease-forge select-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    'active:scale-[0.97]',
                    isSelected
                      ? 'bg-arcane/15 border-arcane/30 text-arcane shadow-[0_0_12px_-4px_rgba(61,210,255,0.2)]'
                      : 'bg-white/[0.03] border-white/8 text-forge-2 hover:bg-white/[0.06] hover:text-forge-1 hover:border-white/12',
                  )}
                >
                  {scenario}
                </button>
              )
            })}
          </div>
        </div>

        {/* Begin Scene */}
        <Button
          variant="primary"
          size="lg"
          disabled={!canBeginScene}
          loading={ai.loading}
          onClick={handleBeginScene}
          className="self-start"
        >
          <Theater size={18} aria-hidden />
          Begin Scene
        </Button>
      </section>
    )
  }

  /* ================================================================ */
  /*  RENDER: Active Scene                                             */
  /* ================================================================ */

  // Track coaching index for expandable cards
  let coachingIdx = -1

  return (
    <section
      className="flex flex-col gap-0 animate-fade-in"
      aria-label="Active Scene"
    >
      {/* ── Scene Header ── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Theater size={16} className="text-arcane shrink-0" aria-hidden />
          <span className="text-sm font-medium text-forge-1 truncate">
            {selectedScenario}
          </span>
          {accent && (
            <Badge variant="neutral" className="shrink-0">
              {accent.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEndScene && (
            <Button variant="secondary" size="sm" onClick={handleEndScene}>
              End Scene
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw size={14} aria-hidden />
          </Button>
        </div>
      </div>

      {/* ── Chat Log ── */}
      <div
        className={cn(
          'flex flex-col gap-3',
          'max-h-[60vh] overflow-y-auto',
          'pr-1 -mr-1',
          'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
        )}
        role="log"
        aria-label="Scene conversation"
        aria-live="polite"
      >
        {chatMessages.map((msg) => {
          /* ── System message (scene setting) ── */
          if (msg.sender === 'system') {
            return (
              <p
                key={msg.id}
                className="text-sm italic text-forge-2 px-2 py-1 leading-relaxed"
              >
                {msg.text}
              </p>
            )
          }

          /* ── NPC message ── */
          if (msg.sender === 'npc') {
            const hasCoaching = !!msg.coaching
            if (hasCoaching) coachingIdx++
            const thisCoachingIdx = coachingIdx

            return (
              <div key={msg.id} className="flex flex-col gap-2">
                <GlassCard
                  className={cn(
                    'ml-0 mr-auto max-w-[90%] sm:max-w-[75%]',
                    'border-l-2 border-l-arcane/30',
                  )}
                >
                  <Badge variant="arcane" className="mb-2">
                    {npcName}
                  </Badge>
                  <p className="text-sm text-forge-0 leading-relaxed">
                    &ldquo;{msg.text}&rdquo;
                  </p>
                </GlassCard>

                {hasCoaching && (
                  <CoachingCard
                    coaching={msg.coaching!}
                    index={thisCoachingIdx}
                    expanded={expandedCoaching === thisCoachingIdx}
                    onToggle={() =>
                      setExpandedCoaching((prev) =>
                        prev === thisCoachingIdx ? null : thisCoachingIdx,
                      )
                    }
                  />
                )}
              </div>
            )
          }

          /* ── Player message ── */
          return (
            <GlassCard
              key={msg.id}
              className={cn(
                'ml-auto mr-0 max-w-[90%] sm:max-w-[75%]',
                'border-r-2 border-r-eldritch/30',
                'bg-eldritch/[0.04]',
              )}
            >
              <p className="text-sm text-forge-0 leading-relaxed">
                &ldquo;{msg.text}&rdquo;
              </p>
            </GlassCard>
          )
        })}

        {/* Loading indicator while AI generates */}
        {ai.loading && (
          <GlassCard
            className={cn(
              'ml-0 mr-auto max-w-[90%] sm:max-w-[75%]',
              'border-l-2 border-l-arcane/30',
            )}
          >
            <div className="flex items-center gap-2 text-forge-2">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              <span className="text-sm">
                {npcName || 'NPC'} is responding...
              </span>
            </div>
          </GlassCard>
        )}

        {/* Error display */}
        {ai.error && (
          <GlassCard
            className={cn(
              'ml-0 mr-auto max-w-[90%] sm:max-w-[75%]',
              'border-l-2 border-l-ember/40',
            )}
          >
            <p className="text-sm text-ember">{ai.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={exchanges.length === 0 ? handleBeginScene : handleSend}
              className="mt-2"
            >
              <RotateCcw size={14} aria-hidden />
              Retry
            </Button>
          </GlassCard>
        )}

        {/* Scroll anchor */}
        <div ref={chatEndRef} aria-hidden />
      </div>

      {/* ── Input Area ── */}
      {!sceneEnded && (
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/8">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={ai.loading}
              placeholder="Respond in accent... try writing how it SOUNDS"
              className={cn(
                'flex-1 min-h-[52px] px-4 py-3 rounded-xl resize-none',
                'bg-void-2/60 border border-white/10',
                'text-sm text-forge-0 placeholder:text-forge-2',
                'focus:outline-none focus:ring-2 focus:ring-arcane/50 focus:border-arcane/40',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
            <Button
              variant="primary"
              size="md"
              disabled={!playerInput.trim() || ai.loading}
              loading={ai.loading}
              onClick={handleSend}
              className="self-end shrink-0"
              aria-label="Send message"
            >
              <Send size={16} aria-hidden />
            </Button>
          </div>
          <p className="text-xs text-forge-2 px-1">
            Write how you&apos;d SAY it — use the accent&apos;s eye dialect! E.g.,
            &ldquo;Aye, I dunnae think tha&apos;s wise, lad.&rdquo;
          </p>
        </div>
      )}
    </section>
  )
}
