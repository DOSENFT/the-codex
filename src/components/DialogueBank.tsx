import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Plus,
  Star,
  Copy,
  Check,
  Edit3,
  Trash2,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  BookOpen,
  Target,
  Zap,
  Theater,
  Tag,
  Volume2,
  Footprints,
  Brain,
  Mic2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character, DialogueLine } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DialogueBankProps {
  character: Character
  onUpdate: (char: Character) => void
}

const CONTEXTS = ['combat', 'social', 'discovery', 'emotional', 'quiet'] as const
type DialogueContext = (typeof CONTEXTS)[number]

const CONTEXT_COLORS: Record<DialogueContext, 'ember' | 'arcane' | 'verdant' | 'eldritch' | 'neutral'> = {
  combat: 'ember',
  social: 'arcane',
  discovery: 'verdant',
  emotional: 'eldritch',
  quiet: 'neutral',
}

type BankMode = 'library' | 'practice' | 'quickdraw' | 'delivery'

const MODE_CONFIG: Record<BankMode, { label: string; icon: typeof BookOpen }> = {
  library: { label: 'Library', icon: BookOpen },
  practice: { label: 'Practice', icon: Target },
  quickdraw: { label: 'Quick-Draw', icon: Zap },
  delivery: { label: 'Delivery Coach', icon: Theater },
}

/* ------------------------------------------------------------------ */
/*  Delivery Coaching Types                                            */
/* ------------------------------------------------------------------ */

interface DeliveryCoaching {
  tone: string
  pacing: string
  emotion: string
  bodyLanguage: string
  vocalDynamics: string
  variant: string
}

interface PracticeScenario {
  scenario: string
  idealTone: string
}

interface PracticeEvaluation {
  score: number
  fit: string
  voiceMatch: string
  suggestion: string
}

interface QuickDrawEvaluation {
  voiceMatch: number
  contextFit: number
  creativity: number
  note: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DialogueBank({ character, onUpdate }: DialogueBankProps) {
  const [activeContext, setActiveContext] = useState<DialogueContext>('combat')
  const [activeMode, setActiveMode] = useState<BankMode>('library')
  const [newText, setNewText] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editScenario, setEditScenario] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [scenarioFilter, setScenarioFilter] = useState('')

  // Practice mode state
  const [practiceScenario, setPracticeScenario] = useState<PracticeScenario | null>(null)
  const [practiceSelected, setPracticeSelected] = useState<number | null>(null)
  const [practiceCustom, setPracticeCustom] = useState('')
  const [practiceEval, setPracticeEval] = useState<PracticeEvaluation | null>(null)

  // Quick-Draw mode state
  const [qdPrompt, setQdPrompt] = useState('')
  const [qdInput, setQdInput] = useState('')
  const [qdTimeLeft, setQdTimeLeft] = useState(10)
  const [qdRunning, setQdRunning] = useState(false)
  const [qdEval, setQdEval] = useState<QuickDrawEvaluation | null>(null)
  const [qdStreak, setQdStreak] = useState(0)
  const [qdShowResult, setQdShowResult] = useState(false)
  const qdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qdInputRef = useRef<HTMLInputElement>(null)

  // Delivery Coach mode state
  const [coachingIdx, setCoachingIdx] = useState<number | null>(null)
  const [coaching, setCoaching] = useState<DeliveryCoaching | null>(null)

  // AI hooks
  const suggestAI = useAI()
  const practiceAI = useAI()
  const quickDrawAI = useAI()
  const deliveryAI = useAI()

  const dialogueBank: DialogueLine[] = character.persona?.dialogueBank ?? []

  /* ------------------------------------------------------------------ */
  /*  Utility Functions                                                  */
  /* ------------------------------------------------------------------ */

  function getFilteredLines(): (DialogueLine & { globalIdx: number })[] {
    let lines = dialogueBank
      .map((line, idx) => ({ ...line, globalIdx: idx }))
      .filter(line => line.context === activeContext)

    if (scenarioFilter && activeMode === 'library') {
      lines = lines.filter(line =>
        line.scenario?.toLowerCase().includes(scenarioFilter.toLowerCase()),
      )
    }

    return lines
  }

  function getFavoriteLines(): (DialogueLine & { globalIdx: number })[] {
    return dialogueBank
      .map((line, idx) => ({ ...line, globalIdx: idx }))
      .filter(line => line.context === activeContext && line.favorite)
  }

  function updateBank(newBank: DialogueLine[]) {
    onUpdate({
      ...character,
      persona: {
        ...character.persona!,
        dialogueBank: newBank,
        lastEditedAt: new Date().toISOString(),
      },
    })
  }

  function handleAdd() {
    if (!newText.trim()) return
    const newLine: DialogueLine = {
      text: newText.trim(),
      context: activeContext,
      favorite: false,
    }
    updateBank([...dialogueBank, newLine])
    setNewText('')
  }

  function handleRemove(globalIdx: number) {
    updateBank(dialogueBank.filter((_, i) => i !== globalIdx))
  }

  function handleToggleFavorite(globalIdx: number) {
    const updated = [...dialogueBank]
    updated[globalIdx] = { ...updated[globalIdx], favorite: !updated[globalIdx].favorite }
    updateBank(updated)
  }

  function startEdit(globalIdx: number, text: string, scenario?: string) {
    setEditingIdx(globalIdx)
    setEditText(text)
    setEditScenario(scenario ?? '')
  }

  function saveEdit() {
    if (editingIdx === null || !editText.trim()) return
    const updated = [...dialogueBank]
    updated[editingIdx] = {
      ...updated[editingIdx],
      text: editText.trim(),
      scenario: editScenario.trim() || undefined,
    }
    updateBank(updated)
    setEditingIdx(null)
    setEditText('')
    setEditScenario('')
  }

  function cancelEdit() {
    setEditingIdx(null)
    setEditText('')
    setEditScenario('')
  }

  async function handleCopy(globalIdx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(globalIdx)
      setTimeout(() => setCopiedIdx(null), 1500)
    } catch {
      // Clipboard API not available in some contexts
    }
  }

  const handleSuggest = useCallback(async () => {
    try {
      const result = await suggestAI.queryStructured<{ lines: string[] }>(
        SYSTEM_PROMPTS.dialogueSuggestion(character, activeContext),
        `Generate 3 in-character ${activeContext} dialogue lines for ${character.name}.`,
      )
      if (result.lines && Array.isArray(result.lines)) {
        const newLines: DialogueLine[] = result.lines.map(text => ({
          text,
          context: activeContext,
          favorite: false,
        }))
        updateBank([...dialogueBank, ...newLines])
      }
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, dialogueBank, suggestAI])

  /* ------------------------------------------------------------------ */
  /*  Practice Mode Logic                                               */
  /* ------------------------------------------------------------------ */

  const generatePracticeScenario = useCallback(async () => {
    setPracticeScenario(null)
    setPracticeSelected(null)
    setPracticeCustom('')
    setPracticeEval(null)
    try {
      const result = await practiceAI.queryStructured<PracticeScenario>(
        SYSTEM_PROMPTS.dialoguePractice(character, activeContext),
        `Generate a practice scenario for ${character.name} in a ${activeContext} context.`,
      )
      setPracticeScenario(result)
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, practiceAI])

  const submitPracticeChoice = useCallback(async () => {
    if (!practiceScenario) return
    const chosenText =
      practiceSelected !== null
        ? dialogueBank[practiceSelected]?.text
        : practiceCustom.trim()
    if (!chosenText) return

    try {
      const result = await practiceAI.queryStructured<PracticeEvaluation>(
        SYSTEM_PROMPTS.dialogueEvaluate(character, activeContext),
        `Scenario: "${practiceScenario.scenario}"\n\nChosen dialogue line: "${chosenText}"\n\nEvaluate this choice.`,
      )
      setPracticeEval(result)
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, practiceScenario, practiceSelected, practiceCustom, dialogueBank, practiceAI])

  /* ------------------------------------------------------------------ */
  /*  Quick-Draw Mode Logic                                             */
  /* ------------------------------------------------------------------ */

  const startQuickDraw = useCallback(async () => {
    setQdEval(null)
    setQdInput('')
    setQdShowResult(false)
    setQdTimeLeft(10)
    setQdRunning(false)

    try {
      const result = await quickDrawAI.queryStructured<{ prompt: string }>(
        SYSTEM_PROMPTS.dialogueQuickDraw(character, activeContext),
        `Generate a quick-draw scenario for ${character.name} in ${activeContext} context.`,
      )
      setQdPrompt(result.prompt)
      setQdRunning(true)
      setQdTimeLeft(10)
      // Focus the input
      setTimeout(() => qdInputRef.current?.focus(), 100)
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, quickDrawAI])

  // Timer countdown
  useEffect(() => {
    if (!qdRunning) {
      if (qdTimerRef.current) {
        clearInterval(qdTimerRef.current)
        qdTimerRef.current = null
      }
      return
    }

    qdTimerRef.current = setInterval(() => {
      setQdTimeLeft(prev => {
        if (prev <= 0.1) {
          setQdRunning(false)
          // Time ran out — auto-submit whatever they have
          submitQuickDraw()
          return 0
        }
        return prev - 0.1
      })
    }, 100)

    return () => {
      if (qdTimerRef.current) {
        clearInterval(qdTimerRef.current)
        qdTimerRef.current = null
      }
    }
  }, [qdRunning])

  const submitQuickDraw = useCallback(async () => {
    setQdRunning(false)
    if (qdTimerRef.current) {
      clearInterval(qdTimerRef.current)
      qdTimerRef.current = null
    }

    const response = qdInput.trim()
    if (!response) {
      setQdEval({ voiceMatch: 0, contextFit: 0, creativity: 0, note: 'No response given — time ran out!' })
      setQdStreak(0)
      setQdShowResult(true)
      return
    }

    try {
      const result = await quickDrawAI.queryStructured<QuickDrawEvaluation>(
        SYSTEM_PROMPTS.dialogueQuickDrawEval(character, activeContext),
        `Scenario: "${qdPrompt}"\n\nPlayer's response (as ${character.name}): "${response}"\n\nEvaluate this response.`,
      )
      setQdEval(result)
      const avg = (result.voiceMatch + result.contextFit + result.creativity) / 3
      if (avg >= 3) {
        setQdStreak(prev => prev + 1)
      } else {
        setQdStreak(0)
      }
      setQdShowResult(true)
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, qdPrompt, qdInput, quickDrawAI])

  /* ------------------------------------------------------------------ */
  /*  Delivery Coach Mode Logic                                         */
  /* ------------------------------------------------------------------ */

  const getDeliveryCoaching = useCallback(async (globalIdx: number, text: string) => {
    setCoachingIdx(globalIdx)
    setCoaching(null)
    try {
      const result = await deliveryAI.queryStructured<DeliveryCoaching>(
        SYSTEM_PROMPTS.dialogueDeliveryCoach(character),
        `Provide delivery coaching for this line: "${text}"`,
      )
      setCoaching(result)
      // Save delivery notes back to the line
      const updated = [...dialogueBank]
      updated[globalIdx] = {
        ...updated[globalIdx],
        deliveryNotes: `Tone: ${result.tone} | Pacing: ${result.pacing}`,
      }
      updateBank(updated)
    } catch {
      // error handled by hook
    }
  }, [character, dialogueBank, deliveryAI])

  /* ------------------------------------------------------------------ */
  /*  Computed Data                                                      */
  /* ------------------------------------------------------------------ */

  const filteredLines = getFilteredLines()
  const favoriteLines = getFavoriteLines()

  /* ------------------------------------------------------------------ */
  /*  Render Helpers                                                     */
  /* ------------------------------------------------------------------ */

  function renderStars(count: number, max: number = 5) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            size={16}
            className={cn(
              'transition-all duration-200',
              i < count ? 'text-ember fill-ember' : 'text-forge-2',
            )}
            aria-hidden
          />
        ))}
      </div>
    )
  }

  function renderLineCard(
    line: DialogueLine & { globalIdx: number },
    options?: {
      selectable?: boolean
      selected?: boolean
      onSelect?: () => void
      showCoaching?: boolean
      onCoach?: () => void
    },
  ) {
    const { text, favorite, globalIdx, scenario } = line
    const isEditing = editingIdx === globalIdx
    const isCoachTarget = coachingIdx === globalIdx

    return (
      <ParchmentCard
        key={globalIdx}
        className={cn(
          'p-3',
          options?.selectable && 'cursor-pointer',
          options?.selected && 'border-arcane/40 bg-arcane/5',
        )}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className={cn(
                'min-h-[60px] w-full rounded-lg resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25',
                'font-body text-sm px-3 py-2',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                'focus:outline-none',
              )}
            />
            <input
              value={editScenario}
              onChange={e => setEditScenario(e.target.value)}
              placeholder="Scenario tag (optional)..."
              className={cn(
                'min-h-[44px] w-full rounded-lg',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25',
                'font-body text-sm px-3 py-2',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                'focus:outline-none',
              )}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-verdant/15 text-verdant hover:bg-verdant/25 transition-colors"
                aria-label="Save edit"
              >
                <Check size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gold/[0.04] text-forge-2 hover:bg-gold/[0.08] transition-colors"
                aria-label="Cancel edit"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col gap-1"
            onClick={options?.onSelect}
            role={options?.selectable ? 'button' : undefined}
            tabIndex={options?.selectable ? 0 : undefined}
            onKeyDown={options?.selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') options.onSelect?.() } : undefined}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm text-forge-1 leading-relaxed italic">
                <span className="text-gold/40 text-2xl font-display leading-none mr-1">&ldquo;</span>{text}<span className="text-gold/40 text-2xl font-display leading-none ml-1">&rdquo;</span>
              </p>
              {!options?.selectable && (
                <div className="flex gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(globalIdx)}
                    className={cn(
                      'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors',
                      favorite
                        ? 'text-ember'
                        : 'text-forge-2 hover:text-ember hover:bg-ember/10',
                    )}
                    aria-label={favorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <Star size={14} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(globalIdx, text)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-arcane hover:bg-arcane/10 transition-colors"
                    aria-label="Copy to clipboard"
                  >
                    {copiedIdx === globalIdx ? (
                      <Check size={14} className="text-verdant" aria-hidden />
                    ) : (
                      <Copy size={14} aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(globalIdx, text, scenario)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-arcane hover:bg-arcane/10 transition-colors"
                    aria-label="Edit line"
                  >
                    <Edit3 size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(globalIdx)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label="Delete line"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              )}
            </div>
            {scenario && (
              <div className="flex items-center gap-1.5 mt-1">
                <Tag size={10} className="text-forge-2" aria-hidden />
                <span className="text-xs text-forge-2">{scenario}</span>
              </div>
            )}
            {options?.showCoaching && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  options.onCoach?.()
                }}
                className={cn(
                  'mt-2 self-start min-h-[44px] px-3 rounded-lg',
                  'inline-flex items-center gap-1.5',
                  'text-xs font-medium text-arcane',
                  'bg-arcane/10 border border-arcane/20',
                  'hover:bg-arcane/15 hover:border-arcane/30',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                )}
              >
                <Theater size={12} aria-hidden />
                Get Coaching
              </button>
            )}
            {/* Show coaching results inline */}
            {isCoachTarget && coaching && activeMode === 'delivery' && (
              <div className="mt-3 pt-3 border-t border-bronze/25 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-arcane shrink-0" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-forge-0">Tone</p>
                    <p className="text-xs text-forge-1">{coaching.tone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Footprints size={14} className="text-verdant shrink-0" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-forge-0">Pacing</p>
                    <p className="text-xs text-forge-1">{coaching.pacing}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-eldritch shrink-0" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-forge-0">Emotion</p>
                    <p className="text-xs text-forge-1">{coaching.emotion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Footprints size={14} className="text-ember shrink-0" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-forge-0">Body Language</p>
                    <p className="text-xs text-forge-1">{coaching.bodyLanguage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mic2 size={14} className="text-arcane shrink-0" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-forge-0">Vocal Dynamics</p>
                    <p className="text-xs text-forge-1">{coaching.vocalDynamics}</p>
                  </div>
                </div>
                <ParchmentCard className="p-3">
                  <p className="text-xs font-medium text-ember mb-1">Try it this way:</p>
                  <p className="text-sm text-forge-0 italic leading-relaxed">
                    &ldquo;{coaching.variant}&rdquo;
                  </p>
                </ParchmentCard>
              </div>
            )}
            {isCoachTarget && deliveryAI.loading && activeMode === 'delivery' && (
              <div className="mt-3 flex items-center gap-2 text-forge-2">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                <span className="text-xs">Analyzing delivery...</span>
              </div>
            )}
          </div>
        )}
      </ParchmentCard>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Mode-Specific Renderers                                            */
  /* ------------------------------------------------------------------ */

  function renderLibraryMode() {
    return (
      <>
        {/* AI Suggest button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSuggest}
          loading={suggestAI.loading}
          className="self-start"
        >
          <Sparkles size={14} aria-hidden />
          AI Suggest ({activeContext})
        </Button>

        {/* Error state */}
        {suggestAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{suggestAI.error}</p>
          </div>
        )}

        {/* Scenario filter */}
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-forge-2 shrink-0" aria-hidden />
          <input
            value={scenarioFilter}
            onChange={e => setScenarioFilter(e.target.value)}
            placeholder="Filter by scenario tag..."
            className={cn(
              'min-h-[36px] flex-1 rounded-lg',
              'bg-void-2/40 text-forge-0 placeholder:text-forge-2',
              'border border-bronze/15',
              'font-body text-xs px-3 py-1.5',
              'transition-all duration-200 ease-forge',
              'focus:border-arcane/40 focus:bg-void-2/60',
              'focus:outline-none',
            )}
          />
          {scenarioFilter && (
            <button
              type="button"
              onClick={() => setScenarioFilter('')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-forge-0 transition-colors"
              aria-label="Clear filter"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        {/* Quick Access — Favorites */}
        {favoriteLines.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-ember uppercase tracking-wider">
              Quick Access
            </h4>
            <div className="flex flex-col gap-1.5">
              {favoriteLines.map(line => (
                <button
                  key={`fav-${line.globalIdx}`}
                  type="button"
                  onClick={() => handleCopy(line.globalIdx, line.text)}
                  className={cn(
                    'w-full text-left min-h-[44px] px-4 py-2.5 rounded-xl',
                    'bg-ember/5 border border-ember/15',
                    'hover:bg-ember/10 hover:border-ember/25',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.98]',
                    'group',
                  )}
                >
                  <p className="text-sm text-forge-0 font-medium italic leading-relaxed">
                    &ldquo;{line.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {copiedIdx === line.globalIdx ? (
                      <span className="text-xs text-verdant">Copied!</span>
                    ) : (
                      <span className="text-xs text-forge-2 group-hover:text-forge-1 transition-colors">
                        Tap to copy
                      </span>
                    )}
                    {line.scenario && (
                      <Badge variant="neutral" className="text-[10px]">{line.scenario}</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All lines (exclude favorites already shown in Quick Access) */}
        {(() => {
          const linesToShow = favoriteLines.length > 0
            ? filteredLines.filter(line => !line.favorite)
            : filteredLines
          return linesToShow.length > 0 ? (
            <div className="flex flex-col gap-2">
              {linesToShow.map(line => renderLineCard(line))}
            </div>
          ) : favoriteLines.length === 0 ? (
            <GlassCard className="p-6">
              <p className="text-sm text-forge-2 text-center italic">
                No {activeContext} lines yet{scenarioFilter ? ` matching "${scenarioFilter}"` : ''}. Add one below or use AI Suggest.
              </p>
            </GlassCard>
          ) : null
        })()}

        {/* Add new line */}
        <div className="flex gap-2">
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={`Add a ${activeContext} line for ${character.name}...`}
            className={cn(
              'min-h-[44px] flex-1 rounded-xl resize-none',
              'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
              'border border-bronze/25',
              'font-body text-sm px-4 py-3',
              'transition-all duration-200 ease-forge',
              'focus:border-arcane/60 focus:bg-void-2/80',
              'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
              'focus:outline-none',
            )}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="shrink-0"
          >
            <Plus size={16} aria-hidden />
          </Button>
        </div>
      </>
    )
  }

  function renderPracticeMode() {
    const contextLines = getFilteredLines()

    return (
      <div className="flex flex-col gap-4">
        {/* Generate scenario button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={generatePracticeScenario}
          loading={practiceAI.loading && !practiceScenario}
          className="self-start"
        >
          <Target size={14} aria-hidden />
          Generate Scenario
        </Button>

        {practiceAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{practiceAI.error}</p>
          </div>
        )}

        {/* Scenario display */}
        {practiceScenario && (
          <>
            <ParchmentCard className="p-4">
              <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                Scenario
              </p>
              <p className="text-sm text-forge-0 leading-relaxed">
                {practiceScenario.scenario}
              </p>
              <p className="text-xs text-forge-2 mt-2">
                Ideal tone: <span className="text-eldritch">{practiceScenario.idealTone}</span>
              </p>
            </ParchmentCard>

            {/* Selectable lines */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-forge-1 uppercase tracking-wider">
                Choose a response:
              </h4>
              {contextLines.length > 0 ? (
                contextLines.map(line => (
                  <GlassCard
                    key={`practice-${line.globalIdx}`}
                    className={cn(
                      'p-3 cursor-pointer',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.98]',
                      practiceSelected === line.globalIdx && 'border-arcane/40 bg-arcane/5',
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setPracticeSelected(line.globalIdx)
                        setPracticeCustom('')
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setPracticeSelected(line.globalIdx); setPracticeCustom('') } }}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                        'transition-all duration-200',
                        practiceSelected === line.globalIdx
                          ? 'border-arcane bg-arcane/20'
                          : 'border-gold/30',
                      )}>
                        {practiceSelected === line.globalIdx && (
                          <div className="w-2 h-2 rounded-full bg-arcane" />
                        )}
                      </div>
                      <p className="text-sm text-forge-1 italic leading-relaxed">
                        &ldquo;{line.text}&rdquo;
                      </p>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <p className="text-xs text-forge-2 italic">
                  No {activeContext} lines in your bank. Write a custom response below.
                </p>
              )}

              {/* Custom input */}
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs text-forge-2">Or write your own:</p>
                <textarea
                  value={practiceCustom}
                  onChange={e => {
                    setPracticeCustom(e.target.value)
                    setPracticeSelected(null)
                  }}
                  placeholder={`Write a custom ${activeContext} response...`}
                  className={cn(
                    'min-h-[60px] w-full rounded-xl resize-none',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4 py-3',
                    'transition-all duration-200 ease-forge',
                    'focus:border-arcane/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                    'focus:outline-none',
                  )}
                />
              </div>

              {/* Submit */}
              <Button
                variant="primary"
                size="sm"
                onClick={submitPracticeChoice}
                loading={practiceAI.loading && !!practiceScenario}
                disabled={practiceSelected === null && !practiceCustom.trim()}
                className="self-start"
              >
                Submit Choice
              </Button>
            </div>

            {/* Evaluation */}
            {practiceEval && (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-verdant uppercase tracking-wider">
                    Evaluation
                  </span>
                  <Badge variant={practiceEval.score >= 7 ? 'verdant' : practiceEval.score >= 4 ? 'ember' : 'ember'}>
                    {practiceEval.score}/10
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-xs font-medium text-forge-0">Scenario Fit</p>
                    <p className="text-xs text-forge-1">{practiceEval.fit}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-forge-0">Voice Match</p>
                    <p className="text-xs text-forge-1">{practiceEval.voiceMatch}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-forge-0">Suggestion</p>
                    <p className="text-xs text-forge-1">{practiceEval.suggestion}</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </div>
    )
  }

  function renderQuickDrawMode() {
    const timerPercent = (qdTimeLeft / 10) * 100
    const timerColor = qdTimeLeft <= 3 ? 'bg-red-500' : 'bg-ember'

    return (
      <div className="flex flex-col gap-4">
        {/* Streak counter */}
        {qdStreak > 0 && (
          <div className="flex items-center gap-2 self-end">
            <Zap size={16} className="text-ember" aria-hidden />
            <span className="text-sm font-bold text-ember">{qdStreak}</span>
            <span className="text-xs text-forge-2">streak</span>
          </div>
        )}

        {/* Start / Next button */}
        {!qdRunning && !qdShowResult && (
          <Button
            variant="primary"
            size="md"
            onClick={startQuickDraw}
            loading={quickDrawAI.loading && !qdPrompt}
            className="self-center"
          >
            <Zap size={16} aria-hidden />
            {qdStreak > 0 ? 'Next Round' : 'Start Quick-Draw'}
          </Button>
        )}

        {quickDrawAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{quickDrawAI.error}</p>
          </div>
        )}

        {/* Active round */}
        {(qdRunning || qdShowResult) && qdPrompt && (
          <>
            {/* Timer bar */}
            {qdRunning && (
              <div className="w-full h-2 rounded-full bg-void-2/60 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-100 ease-linear',
                    timerColor,
                    qdTimeLeft <= 3 && 'animate-pulse',
                  )}
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            )}

            {/* Scenario prompt */}
            <ParchmentCard className="p-4">
              <p className="text-base text-forge-0 font-medium leading-relaxed text-center">
                {qdPrompt}
              </p>
            </ParchmentCard>

            {/* Input */}
            {qdRunning && (
              <div className="flex gap-2">
                <input
                  ref={qdInputRef}
                  value={qdInput}
                  onChange={e => setQdInput(e.target.value)}
                  placeholder={`Respond as ${character.name}...`}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitQuickDraw()
                    }
                  }}
                  className={cn(
                    'min-h-[44px] flex-1 rounded-xl',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4 py-3',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(255,107,53,0.12)]',
                    'focus:outline-none',
                  )}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={submitQuickDraw}
                  disabled={!qdInput.trim()}
                  className="shrink-0"
                >
                  <Check size={16} aria-hidden />
                </Button>
              </div>
            )}

            {/* Results */}
            {qdShowResult && qdEval && (
              <GlassCard className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Stars */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-forge-2 uppercase">Voice</span>
                        {renderStars(qdEval.voiceMatch)}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-forge-2 uppercase">Context</span>
                        {renderStars(qdEval.contextFit)}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-forge-2 uppercase">Creative</span>
                        {renderStars(qdEval.creativity)}
                      </div>
                    </div>
                    {qdInput.trim() && (
                      <p className="text-xs text-forge-2 italic mt-1">
                        Your response: &ldquo;{qdInput.trim()}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div className="pt-2 border-t border-bronze/25">
                    <p className="text-xs text-forge-1">{qdEval.note}</p>
                  </div>

                  {/* Next button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQdShowResult(false)
                      startQuickDraw()
                    }}
                    loading={quickDrawAI.loading}
                    className="self-center mt-1"
                  >
                    <RotateCcw size={14} aria-hidden />
                    Next Round
                  </Button>
                </div>
              </GlassCard>
            )}

            {/* Loading eval */}
            {!qdRunning && !qdShowResult && quickDrawAI.loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-forge-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                <span className="text-xs">Evaluating...</span>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function renderDeliveryCoachMode() {
    // Show all lines in current context, favorites first
    const allLines = getFilteredLines()
    const sorted = [
      ...allLines.filter(l => l.favorite),
      ...allLines.filter(l => !l.favorite),
    ]

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-forge-2">
          Tap &ldquo;Get Coaching&rdquo; on any line to receive AI delivery guidance.
        </p>

        {deliveryAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{deliveryAI.error}</p>
          </div>
        )}

        {sorted.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sorted.map(line =>
              renderLineCard(line, {
                showCoaching: true,
                onCoach: () => getDeliveryCoaching(line.globalIdx, line.text),
              }),
            )}
          </div>
        ) : (
          <GlassCard className="p-6">
            <p className="text-sm text-forge-2 text-center italic">
              No {activeContext} lines to coach. Add some in Library mode first.
            </p>
          </GlassCard>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Main Render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <OrnateHeader>Dialogue Bank</OrnateHeader>
        <Badge variant="neutral">
          {dialogueBank.length} line{dialogueBank.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Mode Selector — segmented pill */}
      <div className="flex bg-gold/[0.03] border border-gold/25 rounded-xl p-1 gap-1">
        {(Object.keys(MODE_CONFIG) as BankMode[]).map(mode => {
          const { label, icon: Icon } = MODE_CONFIG[mode]
          const isActive = activeMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5',
                'min-h-[40px] px-2 rounded-lg',
                'text-xs font-medium select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold',
                isActive
                  ? 'bg-gold/[0.12] text-gold border border-gold/30 shadow-sm'
                  : 'text-forge-2 hover:text-forge-1 hover:bg-gold/[0.04]',
              )}
            >
              <Icon size={13} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Context tabs */}
      <div className="flex flex-wrap gap-2">
        {CONTEXTS.map(ctx => {
          const isActive = activeContext === ctx
          const color = CONTEXT_COLORS[ctx]
          return (
            <button
              key={ctx}
              type="button"
              onClick={() => {
                setActiveContext(ctx)
                cancelEdit()
              }}
              className={cn(
                'inline-flex items-center min-h-[44px] px-4 rounded-xl',
                'text-sm font-medium capitalize select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                isActive
                  ? `ornate-border bg-${color}/15 text-${color} border border-${color}/30`
                  : 'bg-gold/[0.04] text-forge-1 border border-bronze/25 hover:bg-gold/[0.08] hover:border-gold/30',
              )}
            >
              {ctx}
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="ornate-divider" />

      {/* Mode Content */}
      {activeMode === 'library' && renderLibraryMode()}
      {activeMode === 'practice' && renderPracticeMode()}
      {activeMode === 'quickdraw' && renderQuickDrawMode()}
      {activeMode === 'delivery' && renderDeliveryCoachMode()}
    </div>
  )
}
