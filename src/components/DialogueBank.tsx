import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  Sunrise,
  BarChart3,
  Lock,
  Award,
  Flame,
  Crown,
  Compass,
  Sword,
  MessageSquare,
  Trophy,
  ChevronRight,
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
import {
  type MasteryProfile,
  MASTERY_LEVELS,
  MASTERY_BADGES,
  loadMasteryProfile,
  saveMasteryProfile,
  getMasteryForLine,
  recordPractice,
  masteryColor,
  masteryBgColor,
  checkBadges,
  recordWarmup,
} from '../lib/dialogue-mastery'

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

type BankMode = 'library' | 'practice' | 'quickdraw' | 'rehearsal' | 'warmup' | 'journal'

const MODE_CONFIG: Record<BankMode, { label: string; icon: typeof BookOpen }> = {
  library: { label: 'Library', icon: BookOpen },
  practice: { label: 'Practice', icon: Target },
  quickdraw: { label: 'Quick-Draw', icon: Zap },
  rehearsal: { label: 'Rehearsal', icon: Theater },
  warmup: { label: 'Warmup', icon: Sunrise },
  journal: { label: 'Journal', icon: BarChart3 },
}

type RehearsalLevel = 1 | 2 | 3
const REHEARSAL_LEVEL_LABELS: Record<RehearsalLevel, string> = {
  1: 'Guided',
  2: 'Solo',
  3: 'Improv',
}

/* Warmup step constants */
const WARMUP_TOTAL_STEPS = 5

/* Badge icon mapping for lucide components */
const BADGE_ICONS: Record<string, typeof Star> = {
  MessageSquare,
  Sword,
  Flame,
  Crown,
  Compass,
  Star,
  Sunrise,
  Trophy,
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

interface RehearsalImprovResult {
  situation: string
  idealLineIndex: number
  hint: string
}

interface WarmupSceneResult {
  scene: string
  prompt: string
  suggestedTone: string
}

interface ImprovSparkResult {
  spark: string
  trait: string
  difficulty: string
}

interface JournalInsightResult {
  insight: string
  suggestion: string
  focusArea: string
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

  // Delivery Coach mode state (reused in Rehearsal Guided mode)
  const [coachingIdx, setCoachingIdx] = useState<number | null>(null)
  const [coaching, setCoaching] = useState<DeliveryCoaching | null>(null)

  // Rehearsal mode state
  const [rehearsalLevel, setRehearsalLevel] = useState<RehearsalLevel>(1)
  const [rehearsalLineIdx, setRehearsalLineIdx] = useState<number | null>(null)
  const [rehearsalDelivered, setRehearsalDelivered] = useState(false)
  const [rehearsalRating, setRehearsalRating] = useState<'nailed' | 'close' | 'off' | null>(null)
  const [rehearsalCoachingVisible, setRehearsalCoachingVisible] = useState(false)
  const [improvResult, setImprovResult] = useState<RehearsalImprovResult | null>(null)
  const [improvSubset, setImprovSubset] = useState<(DialogueLine & { globalIdx: number })[]>([])
  const [improvSelectedIdx, setImprovSelectedIdx] = useState<number | null>(null)

  // Warmup mode state
  const [warmupStep, setWarmupStep] = useState(0) // 0 = not started, 1-5 = steps
  const [warmupLines, setWarmupLines] = useState<(DialogueLine & { globalIdx: number })[]>([])
  const [warmupScene, setWarmupScene] = useState<WarmupSceneResult | null>(null)
  const [warmupSpark, setWarmupSpark] = useState<ImprovSparkResult | null>(null)
  const [warmupLinesRehearsed, setWarmupLinesRehearsed] = useState(0)
  const [warmupCompleted, setWarmupCompleted] = useState(false)
  const [warmupStepRated, setWarmupStepRated] = useState(false)

  // Journal mode state
  const [journalInsight, setJournalInsight] = useState<JournalInsightResult | null>(null)

  // Mastery profile
  const [masteryProfile, setMasteryProfile] = useState<MasteryProfile>(() =>
    loadMasteryProfile(character.id),
  )

  // AI hooks
  const suggestAI = useAI()
  const practiceAI = useAI()
  const quickDrawAI = useAI()
  const deliveryAI = useAI()
  const rehearsalAI = useAI()
  const warmupAI = useAI()
  const journalAI = useAI()

  const dialogueBank: DialogueLine[] = character.persona?.dialogueBank ?? []

  // Reload mastery profile when character changes
  useEffect(() => {
    setMasteryProfile(loadMasteryProfile(character.id))
  }, [character.id])

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
  /*  Mastery Helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Save a practice rating, update mastery profile, check badges, persist. */
  function handleMasteryRating(text: string, rating: 'nailed' | 'close' | 'off') {
    let updated = recordPractice(masteryProfile, text, rating)
    updated = checkBadges(updated)
    setMasteryProfile(updated)
    saveMasteryProfile(updated)
  }

  /* ------------------------------------------------------------------ */
  /*  Rehearsal Mode Logic                                               */
  /* ------------------------------------------------------------------ */

  function resetRehearsal() {
    setRehearsalLineIdx(null)
    setRehearsalDelivered(false)
    setRehearsalRating(null)
    setRehearsalCoachingVisible(false)
    setCoachingIdx(null)
    setCoaching(null)
    setImprovResult(null)
    setImprovSubset([])
    setImprovSelectedIdx(null)
  }

  /** Guided mode: Select a line, get coaching, practice, rate. */
  function selectRehearsalLine(globalIdx: number) {
    resetRehearsal()
    setRehearsalLineIdx(globalIdx)
    if (rehearsalLevel === 1) {
      // Auto-fetch coaching for Guided level
      getDeliveryCoaching(globalIdx, dialogueBank[globalIdx].text)
    }
  }

  function handleRehearsalDelivered() {
    setRehearsalDelivered(true)
    if (rehearsalLevel === 2) {
      // Solo mode: reveal coaching after delivery
      if (rehearsalLineIdx !== null) {
        getDeliveryCoaching(rehearsalLineIdx, dialogueBank[rehearsalLineIdx].text)
      }
      setRehearsalCoachingVisible(true)
    }
  }

  function handleRehearsalRate(rating: 'nailed' | 'close' | 'off') {
    setRehearsalRating(rating)
    if (rehearsalLineIdx !== null) {
      handleMasteryRating(dialogueBank[rehearsalLineIdx].text, rating)
    } else if (improvResult && improvSelectedIdx !== null && improvSubset[improvSelectedIdx]) {
      handleMasteryRating(improvSubset[improvSelectedIdx].text, rating)
    }
  }

  /** Improv mode: AI generates a situation, player picks the right line. */
  const startImprovRehearsal = useCallback(async () => {
    resetRehearsal()
    const allLines = dialogueBank.map((line, idx) => ({ ...line, globalIdx: idx }))
    if (allLines.length < 2) return

    // Pick 3-5 random lines as the subset
    const shuffled = [...allLines].sort(() => Math.random() - 0.5)
    const subset = shuffled.slice(0, Math.min(5, shuffled.length))
    setImprovSubset(subset)

    try {
      const result = await rehearsalAI.queryStructured<RehearsalImprovResult>(
        SYSTEM_PROMPTS.rehearsalImprov(character, subset),
        `Create an improv situation for ${character.name} where one of the given lines is the best choice.`,
      )
      setImprovResult(result)
    } catch {
      // error handled by hook
    }
  }, [character, dialogueBank, rehearsalAI])

  function handleImprovSelect(subsetIdx: number) {
    setImprovSelectedIdx(subsetIdx)
    setRehearsalDelivered(true)
  }

  /* ------------------------------------------------------------------ */
  /*  Warmup Mode Logic                                                  */
  /* ------------------------------------------------------------------ */

  function resetWarmup() {
    setWarmupStep(0)
    setWarmupLines([])
    setWarmupScene(null)
    setWarmupSpark(null)
    setWarmupLinesRehearsed(0)
    setWarmupCompleted(false)
    setWarmupStepRated(false)
  }

  const startWarmup = useCallback(() => {
    resetWarmup()
    // Pick 3 random lines for steps 1-3
    const allLines = dialogueBank.map((line, idx) => ({ ...line, globalIdx: idx }))
    const shuffled = [...allLines].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(3, shuffled.length))
    setWarmupLines(picked)
    setWarmupStep(1)
  }, [dialogueBank])

  const advanceWarmup = useCallback(async () => {
    const nextStep = warmupStep + 1
    setWarmupStepRated(false)
    if (nextStep > WARMUP_TOTAL_STEPS) {
      // Complete warmup
      let updated = recordWarmup(masteryProfile, warmupLinesRehearsed)
      updated = checkBadges(updated)
      setMasteryProfile(updated)
      saveMasteryProfile(updated)
      setWarmupCompleted(true)
      return
    }

    setWarmupStep(nextStep)

    if (nextStep === 4) {
      // Step 4: Scene response
      try {
        const result = await warmupAI.queryStructured<WarmupSceneResult>(
          SYSTEM_PROMPTS.warmupScene(character, activeContext),
          `Generate a warmup scene for ${character.name}.`,
        )
        setWarmupScene(result)
      } catch {
        // error handled by hook
      }
    } else if (nextStep === 5) {
      // Step 5: Improv spark
      try {
        const result = await warmupAI.queryStructured<ImprovSparkResult>(
          SYSTEM_PROMPTS.improvSpark(character, activeContext),
          `Generate an improv spark challenge for ${character.name}.`,
        )
        setWarmupSpark(result)
      } catch {
        // error handled by hook
      }
    }
  }, [warmupStep, character, activeContext, warmupAI, warmupLinesRehearsed, masteryProfile])

  function handleWarmupLineRate(text: string, rating: 'nailed' | 'close' | 'off') {
    handleMasteryRating(text, rating)
    setWarmupLinesRehearsed(prev => prev + 1)
    setWarmupStepRated(true)
  }

  /* ------------------------------------------------------------------ */
  /*  Journal Mode Logic                                                 */
  /* ------------------------------------------------------------------ */

  const fetchJournalInsight = useCallback(async () => {
    setJournalInsight(null)
    try {
      const result = await journalAI.queryStructured<JournalInsightResult>(
        SYSTEM_PROMPTS.journalInsight(character, masteryProfile),
        `Analyze mastery data for ${character.name} and provide coaching insight.`,
      )
      setJournalInsight(result)
    } catch {
      // error handled by hook
    }
  }, [character, masteryProfile, journalAI])

  /** Compute journal stats from mastery profile. */
  const journalStats = useMemo(() => {
    const allRatings = masteryProfile.lines.flatMap(l => l.ratings)
    const nailed = allRatings.filter(r => r === 'nailed').length
    const close = allRatings.filter(r => r === 'close').length
    const off = allRatings.filter(r => r === 'off').length
    const totalPracticed = masteryProfile.lines.filter(l => l.practiceCount > 0).length
    const totalLines = dialogueBank.length
    const unused = totalLines - totalPracticed

    // Context distribution of practiced lines
    const practicedKeys = new Set(masteryProfile.lines.filter(l => l.practiceCount > 0).map(l => l.lineKey))
    const contextCounts: Record<string, number> = {}
    for (const line of dialogueBank) {
      const key = line.text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 40)
      if (practicedKeys.has(key)) {
        contextCounts[line.context] = (contextCounts[line.context] ?? 0) + 1
      }
    }

    return { nailed, close, off, totalPracticed, totalLines, unused, contextCounts }
  }, [masteryProfile, dialogueBank])

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
      showMastery?: boolean
    },
  ) {
    const { text, favorite, globalIdx, scenario } = line
    const isEditing = editingIdx === globalIdx
    const isCoachTarget = coachingIdx === globalIdx
    const mastery = options?.showMastery ? getMasteryForLine(masteryProfile, text) : undefined
    const mLevel = mastery?.level ?? 0

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
              {options?.showMastery && (
                <div
                  className={cn(
                    'w-3 h-3 rounded-full shrink-0 mt-1.5 border',
                    mLevel === 0
                      ? 'border-forge-2 bg-transparent'
                      : cn('border-transparent', masteryBgColor(mLevel)),
                  )}
                  title={`Mastery: ${MASTERY_LEVELS[mLevel]}`}
                  aria-label={`Mastery level: ${MASTERY_LEVELS[mLevel]}`}
                />
              )}
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
            {/* Coaching results now rendered within Rehearsal mode directly */}
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
              'min-h-[44px] flex-1 rounded-lg',
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
                      <Badge variant="neutral" className="text-xs">{line.scenario}</Badge>
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
              {linesToShow.map(line => renderLineCard(line, { showMastery: true }))}
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
                        <span className="text-xs text-forge-2 uppercase">Voice</span>
                        {renderStars(qdEval.voiceMatch)}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-forge-2 uppercase">Context</span>
                        {renderStars(qdEval.contextFit)}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-forge-2 uppercase">Creative</span>
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

  /* ------------------------------------------------------------------ */
  /*  Rehearsal Mode Renderer                                            */
  /* ------------------------------------------------------------------ */

  function renderRehearsalMode() {
    const allLines = getFilteredLines()
    const sorted = [
      ...allLines.filter(l => l.favorite),
      ...allLines.filter(l => !l.favorite),
    ]

    /** Rating buttons shared between Guided/Solo/Improv after delivery. */
    function renderRatingButtons(lineText: string) {
      if (rehearsalRating) {
        // Already rated — show result
        const colorMap = { nailed: 'text-verdant', close: 'text-ember', off: 'text-red-400' }
        const labelMap = { nailed: 'Nailed It', close: 'Close', off: 'Off' }
        return (
          <div className="flex items-center gap-2 mt-3">
            <Check size={14} className={colorMap[rehearsalRating]} aria-hidden />
            <span className={cn('text-sm font-medium', colorMap[rehearsalRating])}>
              {labelMap[rehearsalRating]}
            </span>
            <button
              type="button"
              onClick={() => {
                resetRehearsal()
              }}
              className={cn(
                'ml-auto min-h-[44px] px-4 rounded-xl',
                'text-xs font-medium text-forge-1',
                'bg-gold/[0.04] border border-bronze/25',
                'hover:bg-gold/[0.08] hover:border-gold/30',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
              )}
            >
              Next Line
            </button>
          </div>
        )
      }

      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-forge-2 font-medium uppercase tracking-wider">Rate your delivery:</p>
          <div className="flex gap-2">
            {(['nailed', 'close', 'off'] as const).map(r => {
              const colors = {
                nailed: 'bg-verdant/15 text-verdant border-verdant/30 hover:bg-verdant/25',
                close: 'bg-ember/15 text-ember border-ember/30 hover:bg-ember/25',
                off: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
              }
              const labels = { nailed: 'Nailed It', close: 'Close', off: 'Off' }
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRehearsalRate(r)}
                  className={cn(
                    'flex-1 min-h-[44px] px-3 rounded-xl',
                    'text-sm font-medium border',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    colors[r],
                  )}
                >
                  {labels[r]}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    /** Render the coaching display (shared between Guided and Solo reveal). */
    function renderCoachingDisplay() {
      if (deliveryAI.loading) {
        return (
          <div className="mt-3 flex items-center gap-2 text-forge-2">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            <span className="text-xs">Analyzing delivery...</span>
          </div>
        )
      }
      if (deliveryAI.error) {
        return (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{deliveryAI.error}</p>
          </div>
        )
      }
      if (!coaching) return null
      return (
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
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Rehearsal level selector */}
        <div className="flex gap-2">
          {([1, 2, 3] as RehearsalLevel[]).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setRehearsalLevel(lvl)
                resetRehearsal()
              }}
              className={cn(
                'flex-1 min-h-[44px] px-3 rounded-xl',
                'text-sm font-medium border select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                rehearsalLevel === lvl
                  ? 'bg-arcane/15 text-arcane border-arcane/30'
                  : 'bg-gold/[0.04] text-forge-2 border-bronze/25 hover:bg-gold/[0.08] hover:text-forge-1',
              )}
            >
              {REHEARSAL_LEVEL_LABELS[lvl]}
            </button>
          ))}
        </div>

        {/* Level description */}
        <p className="text-xs text-forge-2">
          {rehearsalLevel === 1 && 'Select a line to get full coaching, then practice and rate yourself.'}
          {rehearsalLevel === 2 && 'Select a line and deliver it blind, then reveal coaching to compare.'}
          {rehearsalLevel === 3 && 'AI generates a situation \u2014 pick the right line from a random subset.'}
        </p>

        {rehearsalAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{rehearsalAI.error}</p>
          </div>
        )}

        {/* IMPROV level (3) */}
        {rehearsalLevel === 3 && (
          <div className="flex flex-col gap-3">
            {!improvResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={startImprovRehearsal}
                loading={rehearsalAI.loading}
                disabled={dialogueBank.length < 2}
                className="self-start"
              >
                <Sparkles size={14} aria-hidden />
                Generate Improv Scenario
              </Button>
            )}

            {dialogueBank.length < 2 && (
              <p className="text-xs text-forge-2 italic">
                Add at least 2 lines to your dialogue bank to use Improv mode.
              </p>
            )}

            {improvResult && (
              <>
                <ParchmentCard className="p-4">
                  <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                    Situation
                  </p>
                  <p className="text-sm text-forge-0 leading-relaxed">
                    {improvResult.situation}
                  </p>
                  {!rehearsalDelivered && (
                    <p className="text-xs text-forge-2 mt-2 italic">
                      Hint: {improvResult.hint}
                    </p>
                  )}
                </ParchmentCard>

                {/* Line choices */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-forge-1 uppercase tracking-wider">
                    Pick the best line:
                  </h4>
                  {improvSubset.map((line, subIdx) => {
                    const isIdeal = rehearsalDelivered && subIdx === improvResult.idealLineIndex
                    const isSelected = improvSelectedIdx === subIdx
                    return (
                      <GlassCard
                        key={`improv-${subIdx}`}
                        className={cn(
                          'p-3 transition-all duration-200 ease-forge',
                          !rehearsalDelivered && 'cursor-pointer active:scale-[0.98]',
                          isSelected && 'border-arcane/40 bg-arcane/5',
                          rehearsalDelivered && isIdeal && 'border-verdant/40 bg-verdant/5',
                        )}
                      >
                        <div
                          role={!rehearsalDelivered ? 'button' : undefined}
                          tabIndex={!rehearsalDelivered ? 0 : undefined}
                          onClick={!rehearsalDelivered ? () => handleImprovSelect(subIdx) : undefined}
                          onKeyDown={!rehearsalDelivered ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleImprovSelect(subIdx) } : undefined}
                          className="flex items-center gap-2"
                        >
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                            'transition-all duration-200',
                            isSelected ? 'border-arcane bg-arcane/20' : 'border-gold/30',
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-arcane" />}
                          </div>
                          <p className="text-sm text-forge-1 italic leading-relaxed">
                            &ldquo;{line.text}&rdquo;
                          </p>
                          {rehearsalDelivered && isIdeal && (
                            <Badge variant="verdant" className="ml-auto shrink-0 text-xs">Ideal</Badge>
                          )}
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>

                {/* Rating after selection */}
                {rehearsalDelivered && improvSelectedIdx !== null && (
                  <div className="flex flex-col gap-2">
                    {improvSelectedIdx === improvResult.idealLineIndex ? (
                      <p className="text-xs text-verdant font-medium">
                        Correct choice! Now rate your delivery.
                      </p>
                    ) : (
                      <p className="text-xs text-ember font-medium">
                        The ideal line was #{improvResult.idealLineIndex + 1}. Rate your overall attempt.
                      </p>
                    )}
                    {renderRatingButtons(improvSubset[improvSelectedIdx]?.text ?? '')}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* GUIDED (1) and SOLO (2) modes — line list */}
        {(rehearsalLevel === 1 || rehearsalLevel === 2) && (
          <div className="flex flex-col gap-3">
            {sorted.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sorted.map(line => {
                  const isActive = rehearsalLineIdx === line.globalIdx
                  const mastery = getMasteryForLine(masteryProfile, line.text)
                  const mLevel = mastery?.level ?? 0

                  return (
                    <ParchmentCard
                      key={line.globalIdx}
                      className={cn(
                        'p-3 transition-all duration-200 ease-forge',
                        !isActive && 'cursor-pointer active:scale-[0.98]',
                        isActive && 'border-arcane/40 bg-arcane/5',
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isActive && selectRehearsalLine(line.globalIdx)}
                        onKeyDown={e => { if (!isActive && (e.key === 'Enter' || e.key === ' ')) selectRehearsalLine(line.globalIdx) }}
                        className="flex items-start gap-2"
                      >
                        {/* Mastery dot */}
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full shrink-0 mt-1.5 border',
                            mLevel === 0
                              ? 'border-forge-2 bg-transparent'
                              : cn('border-transparent', masteryBgColor(mLevel)),
                          )}
                          title={`Mastery: ${MASTERY_LEVELS[mLevel]}`}
                        />
                        <p className="flex-1 text-sm text-forge-1 leading-relaxed italic">
                          <span className="text-gold/40 text-2xl font-display leading-none mr-1">&ldquo;</span>
                          {line.text}
                          <span className="text-gold/40 text-2xl font-display leading-none ml-1">&rdquo;</span>
                        </p>
                      </div>

                      {/* Expanded rehearsal area */}
                      {isActive && (
                        <div className="mt-3 pt-3 border-t border-bronze/25">
                          {/* Guided: coaching visible immediately */}
                          {rehearsalLevel === 1 && renderCoachingDisplay()}

                          {/* Solo: hidden coaching until delivery */}
                          {rehearsalLevel === 2 && !rehearsalDelivered && (
                            <p className="text-xs text-forge-2 italic mb-3">
                              Deliver this line in character, then tap the button below.
                            </p>
                          )}
                          {rehearsalLevel === 2 && rehearsalCoachingVisible && renderCoachingDisplay()}

                          {/* Delivery button */}
                          {!rehearsalDelivered && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleRehearsalDelivered}
                              className="self-start mt-3"
                              disabled={rehearsalLevel === 1 && deliveryAI.loading}
                            >
                              <Mic2 size={14} aria-hidden />
                              I Delivered It
                            </Button>
                          )}

                          {/* Rating buttons after delivery */}
                          {rehearsalDelivered && renderRatingButtons(line.text)}
                        </div>
                      )}
                    </ParchmentCard>
                  )
                })}
              </div>
            ) : (
              <GlassCard className="p-6">
                <p className="text-sm text-forge-2 text-center italic">
                  No {activeContext} lines to rehearse. Add some in Library mode first.
                </p>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Warmup Mode Renderer                                               */
  /* ------------------------------------------------------------------ */

  function renderWarmupMode() {
    // Not started
    if (warmupStep === 0 && !warmupCompleted) {
      return (
        <div className="flex flex-col gap-4 items-center py-6">
          <Sunrise size={40} className="text-ember" aria-hidden />
          <h3 className="text-lg font-display text-forge-0">Pre-Session Warmup</h3>
          <p className="text-sm text-forge-2 text-center max-w-xs">
            A quick 5-step routine to get you into character before your session.
          </p>
          {dialogueBank.length === 0 ? (
            <p className="text-xs text-forge-2 italic text-center">
              Add dialogue lines in Library mode to start warmups.
            </p>
          ) : (
            <Button variant="primary" size="md" onClick={startWarmup}>
              <Sunrise size={16} aria-hidden />
              Start Warmup
            </Button>
          )}
          {/* Streak display */}
          {masteryProfile.warmupStreak > 0 && (
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-ember" aria-hidden />
              <span className="text-sm font-bold text-ember">{masteryProfile.warmupStreak}</span>
              <span className="text-xs text-forge-2">day streak</span>
            </div>
          )}
        </div>
      )
    }

    // Completed
    if (warmupCompleted) {
      return (
        <div className="flex flex-col gap-4 items-center py-6">
          <div className="w-16 h-16 rounded-full bg-verdant/15 border border-verdant/30 flex items-center justify-center">
            <Check size={32} className="text-verdant" aria-hidden />
          </div>
          <h3 className="text-lg font-display text-verdant">Ready for Session</h3>
          <p className="text-sm text-forge-2 text-center">
            You rehearsed {warmupLinesRehearsed} line{warmupLinesRehearsed !== 1 ? 's' : ''} and completed your warmup.
          </p>
          {masteryProfile.warmupStreak > 0 && (
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-ember" aria-hidden />
              <span className="text-sm font-bold text-ember">{masteryProfile.warmupStreak}</span>
              <span className="text-xs text-forge-2">day streak</span>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={resetWarmup}
          >
            <RotateCcw size={14} aria-hidden />
            Start Another
          </Button>
        </div>
      )
    }

    // Active warmup
    const progressPercent = (warmupStep / WARMUP_TOTAL_STEPS) * 100

    return (
      <div className="flex flex-col gap-4">
        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-forge-2 font-medium">Step {warmupStep} of {WARMUP_TOTAL_STEPS}</span>
            <span className="text-xs text-forge-2">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-void-2/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-ember transition-all duration-300 ease-forge"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {warmupAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{warmupAI.error}</p>
          </div>
        )}

        {/* Steps 1-3: Random line with coaching hint */}
        {warmupStep >= 1 && warmupStep <= 3 && (() => {
          const lineIdx = warmupStep - 1
          const warmupLine = warmupLines[lineIdx]
          if (!warmupLine) {
            return (
              <GlassCard className="p-6">
                <p className="text-sm text-forge-2 text-center italic">
                  No more lines available. Add more lines in Library mode.
                </p>
                <Button variant="secondary" size="sm" onClick={advanceWarmup} className="self-center mt-3">
                  Skip <ChevronRight size={14} aria-hidden />
                </Button>
              </GlassCard>
            )
          }
          return (
            <div className="flex flex-col gap-3">
              <ParchmentCard className="p-4">
                <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-2">
                  Deliver this line in character
                </p>
                <p className="text-base text-forge-0 font-medium italic leading-relaxed text-center">
                  <span className="text-gold/40 text-2xl font-display leading-none mr-1">&ldquo;</span>
                  {warmupLine.text}
                  <span className="text-gold/40 text-2xl font-display leading-none ml-1">&rdquo;</span>
                </p>
                <p className="text-xs text-forge-2 mt-2 text-center capitalize">
                  Context: {warmupLine.context}
                </p>
              </ParchmentCard>

              {!warmupStepRated ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-forge-2 font-medium uppercase tracking-wider">Rate your delivery:</p>
                  <div className="flex gap-2">
                    {(['nailed', 'close', 'off'] as const).map(r => {
                      const colors = {
                        nailed: 'bg-verdant/15 text-verdant border-verdant/30 hover:bg-verdant/25',
                        close: 'bg-ember/15 text-ember border-ember/30 hover:bg-ember/25',
                        off: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
                      }
                      const labels = { nailed: 'Nailed It', close: 'Close', off: 'Off' }
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleWarmupLineRate(warmupLine.text, r)}
                          className={cn(
                            'flex-1 min-h-[44px] px-3 rounded-xl',
                            'text-sm font-medium border',
                            'transition-all duration-200 ease-forge',
                            'active:scale-[0.97]',
                            colors[r],
                          )}
                        >
                          {labels[r]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={advanceWarmup} className="self-center">
                  Next Step <ChevronRight size={14} className="ml-1" aria-hidden />
                </Button>
              )}
            </div>
          )
        })()}

        {/* Step 4: Scene response */}
        {warmupStep === 4 && (
          <div className="flex flex-col gap-3">
            {warmupAI.loading && !warmupScene && (
              <div className="flex items-center justify-center gap-2 py-6 text-forge-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                <span className="text-xs">Generating scene...</span>
              </div>
            )}

            {warmupScene && (
              <>
                <ParchmentCard className="p-4">
                  <p className="text-xs font-semibold text-eldritch uppercase tracking-wider mb-2">
                    Scene
                  </p>
                  <p className="text-sm text-forge-0 leading-relaxed">
                    {warmupScene.scene}
                  </p>
                  <div className="mt-3 pt-2 border-t border-bronze/20">
                    <p className="text-xs text-forge-2">
                      <span className="font-medium text-forge-1">Prompt:</span> {warmupScene.prompt}
                    </p>
                    <p className="text-xs text-forge-2 mt-1">
                      <span className="font-medium text-forge-1">Suggested tone:</span>{' '}
                      <span className="text-eldritch">{warmupScene.suggestedTone}</span>
                    </p>
                  </div>
                </ParchmentCard>

                <p className="text-xs text-forge-2 text-center italic">
                  Respond in character, then move to the next step.
                </p>

                <Button variant="secondary" size="sm" onClick={advanceWarmup} className="self-center">
                  Next Step <ChevronRight size={14} className="ml-1" aria-hidden />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 5: Improv spark */}
        {warmupStep === 5 && (
          <div className="flex flex-col gap-3">
            {warmupAI.loading && !warmupSpark && (
              <div className="flex items-center justify-center gap-2 py-6 text-forge-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                <span className="text-xs">Generating spark...</span>
              </div>
            )}

            {warmupSpark && (
              <>
                <ParchmentCard className="p-4">
                  <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                    Improv Spark
                  </p>
                  <p className="text-sm text-forge-0 leading-relaxed">
                    {warmupSpark.spark}
                  </p>
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-bronze/20">
                    <Badge variant="arcane" className="text-xs">{warmupSpark.trait}</Badge>
                    <Badge variant="ember" className="text-xs">{warmupSpark.difficulty}</Badge>
                  </div>
                </ParchmentCard>

                <p className="text-xs text-forge-2 text-center italic">
                  Try this improv challenge in your head, then finish your warmup.
                </p>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={advanceWarmup}
                  className="self-center"
                >
                  <Check size={14} aria-hidden />
                  Complete Warmup
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Journal Mode Renderer                                              */
  /* ------------------------------------------------------------------ */

  function renderJournalMode() {
    const { nailed, close, off, totalPracticed, totalLines, unused, contextCounts } = journalStats
    const totalRatings = nailed + close + off

    return (
      <div className="flex flex-col gap-4">
        {/* Usage stats */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-forge-0 uppercase tracking-wider mb-3">
            Usage Overview
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-display text-forge-0">{totalPracticed}</span>
              <span className="text-xs text-forge-2">Lines practiced</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-display text-forge-2">{unused}</span>
              <span className="text-xs text-forge-2">Unused</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-display text-ember">{masteryProfile.warmupStreak}</span>
              <span className="text-xs text-forge-2">Day streak</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-display text-arcane">
                {masteryProfile.warmups.filter(w => w.completed).length}
              </span>
              <span className="text-xs text-forge-2">Warmups done</span>
            </div>
          </div>
        </GlassCard>

        {/* Rating distribution */}
        {totalRatings > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-xs font-semibold text-forge-0 uppercase tracking-wider mb-3">
              Rating Distribution
            </h4>
            <div className="flex flex-col gap-2">
              {([
                { label: 'Nailed It', count: nailed, color: 'bg-verdant', textColor: 'text-verdant' },
                { label: 'Close', count: close, color: 'bg-ember', textColor: 'text-ember' },
                { label: 'Off', count: off, color: 'bg-red-500', textColor: 'text-red-400' },
              ] as const).map(item => {
                const pct = totalRatings > 0 ? (item.count / totalRatings) * 100 : 0
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium w-16', item.textColor)}>{item.label}</span>
                    <div className="flex-1 h-3 rounded-full bg-void-2/60 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-300', item.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-forge-2 w-8 text-right">{item.count}</span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* Context distribution */}
        {Object.keys(contextCounts).length > 0 && (
          <GlassCard className="p-4">
            <h4 className="text-xs font-semibold text-forge-0 uppercase tracking-wider mb-3">
              Context Distribution
            </h4>
            <div className="flex flex-wrap gap-2">
              {CONTEXTS.map(ctx => {
                const count = contextCounts[ctx] ?? 0
                const pct = totalPracticed > 0 ? Math.round((count / totalPracticed) * 100) : 0
                const color = CONTEXT_COLORS[ctx]
                return (
                  <div
                    key={ctx}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
                      count > 0
                        ? `bg-${color}/10 border-${color}/25 text-${color}`
                        : 'bg-gold/[0.02] border-bronze/15 text-forge-2',
                    )}
                  >
                    <span className="text-xs font-medium capitalize">{ctx}</span>
                    <span className="text-xs">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* Growth: Practice trend */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-forge-0 uppercase tracking-wider mb-3">
            Growth
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-display text-forge-0">
                {masteryProfile.lines.reduce((sum, l) => sum + l.practiceCount, 0)}
              </span>
              <span className="text-xs text-forge-2">Total practices</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-display text-forge-0">
                {masteryProfile.bestStreak}
              </span>
              <span className="text-xs text-forge-2">Best streak</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-display text-ember">
                {masteryProfile.lines.filter(l => l.level >= 1).length}
              </span>
              <span className="text-xs text-forge-2">Guided+</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-display text-verdant">
                {masteryProfile.lines.filter(l => l.level >= 3).length}
              </span>
              <span className="text-xs text-forge-2">Improv level</span>
            </div>
          </div>
        </GlassCard>

        {/* AI Insight button */}
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchJournalInsight}
            loading={journalAI.loading}
            disabled={masteryProfile.lines.length === 0}
            className="self-start"
          >
            <Sparkles size={14} aria-hidden />
            AI Coaching Insight
          </Button>

          {journalAI.error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-red-400">{journalAI.error}</p>
            </div>
          )}

          {journalInsight && (
            <ParchmentCard className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="arcane" className="text-xs">{journalInsight.focusArea}</Badge>
              </div>
              <p className="text-sm text-forge-0 leading-relaxed mb-2">
                {journalInsight.insight}
              </p>
              <p className="text-xs text-forge-1 italic">
                {journalInsight.suggestion}
              </p>
            </ParchmentCard>
          )}

          {masteryProfile.lines.length === 0 && (
            <p className="text-xs text-forge-2 italic">
              Practice some lines first to get AI coaching insights.
            </p>
          )}
        </div>

        {/* Badge grid */}
        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-forge-0 uppercase tracking-wider mb-3">
            Badges
          </h4>
          {MASTERY_BADGES.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {MASTERY_BADGES.map(badge => {
                const earned = masteryProfile.badges.includes(badge.id)
                const IconComp = BADGE_ICONS[badge.icon] ?? Award
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-xl border',
                      'transition-all duration-200',
                      earned
                        ? 'bg-gold/[0.06] border-gold/25'
                        : 'bg-void-2/30 border-bronze/10 opacity-50',
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      earned
                        ? 'bg-gold/15 text-gold'
                        : 'bg-void-2/40 text-forge-2',
                    )}>
                      {earned ? (
                        <IconComp size={16} aria-hidden />
                      ) : (
                        <Lock size={14} aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={cn(
                        'text-xs font-medium leading-tight',
                        earned ? 'text-forge-0' : 'text-forge-2',
                      )}>
                        {badge.name}
                      </span>
                      <span className="text-xs text-forge-2 leading-tight">
                        {badge.description}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-forge-2 italic text-center">
              No badges available yet.
            </p>
          )}
        </GlassCard>
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

      {/* Mode Selector — horizontal scroll strip for 6 modes at 375px */}
      <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
        <div className="inline-flex bg-gold/[0.03] border border-gold/25 rounded-xl p-1 gap-1 min-w-max">
          {(Object.keys(MODE_CONFIG) as BankMode[]).map(mode => {
            const { label, icon: Icon } = MODE_CONFIG[mode]
            const isActive = activeMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5',
                  'min-h-[44px] px-3 rounded-lg whitespace-nowrap',
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
                {label}
              </button>
            )
          })}
        </div>
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
      {activeMode === 'rehearsal' && renderRehearsalMode()}
      {activeMode === 'warmup' && renderWarmupMode()}
      {activeMode === 'journal' && renderJournalMode()}
    </div>
  )
}
