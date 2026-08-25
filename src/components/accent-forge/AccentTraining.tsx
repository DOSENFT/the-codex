import { useState, useCallback, useRef } from 'react'
import {
  Languages,
  Theater,
  Dumbbell,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { ACCENT_PROFILES, type AccentProfile } from '../../lib/accent-data'
import type { Character } from '../../lib/character'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import { GlassCard } from '../ui/GlassCard'
import { ParchmentCard } from '../ui/ParchmentCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AIScenePartner } from './AIScenePartner'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccentTrainingProps {
  character: Character
  onSelectAccent: (id: string) => void
}

type TrainingMode = 'translator' | 'scene-partner' | 'technique-lab' | null

interface TranslatorResult {
  accentedText: string
  keyShifts: { from: string; to: string; rule: string }[]
  performanceNote: string
}

interface TechniqueItem {
  id: string
  title: string
  description: string
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const MODE_CARDS: {
  id: TrainingMode & string
  label: string
  description: string
  Icon: typeof Languages
}[] = [
  {
    id: 'translator',
    label: 'Accent Translator',
    description: 'Translate any text into an accent',
    Icon: Languages,
  },
  {
    id: 'scene-partner',
    label: 'Scene Partner',
    description: 'Practice accents in conversation with AI',
    Icon: Theater,
  },
  {
    id: 'technique-lab',
    label: 'Technique Lab',
    description: 'Hollywood-grade accent mastery drills',
    Icon: Dumbbell,
  },
]

const TECHNIQUES: TechniqueItem[] = [
  {
    id: 'anchor-sound',
    title: 'The Anchor Sound',
    description:
      'Find the ONE sound that defines this accent. Master that, and everything else follows. For Scottish, it\u2019s the rolled R. For Cockney, it\u2019s the glottal stop. For Elvish, it\u2019s the elongated vowels. Start every practice session by producing this sound 20 times.',
  },
  {
    id: 'muscle-memory',
    title: 'Muscle Memory Drilling',
    description:
      'Your mouth has habits. Breaking them requires repetition. Pick 5 words that use your accent\u2019s key sound shift. Say them 10 times each. Then use them in sentences. Then use them in emotional sentences (angry, sad, pleading). This builds the neural pathways that make accents automatic.',
  },
  {
    id: 'grandmother',
    title: 'The Grandmother Technique',
    description:
      'Imagine a specific person who speaks with this accent. A grandmother, a shopkeeper, a king. Visualize their face, their posture, their attitude. When you speak in their accent, you\u2019re not \u2018doing an accent\u2019 \u2014 you\u2019re channeling a person. This bypasses self-consciousness.',
  },
  {
    id: 'emotional-pressure',
    title: 'Emotional Pressure Test',
    description:
      'The moment your character gets angry, scared, or excited, your accent will slip. That\u2019s where most people fail. Practice this: say the same line in 5 emotions (calm, angry, pleading, laughing, whispering) while maintaining the accent. If it slips, you haven\u2019t drilled enough.',
  },
  {
    id: 'three-word-anchor',
    title: 'The Three-Word Anchor',
    description:
      'Choose three common words your character says often. These are your \u2018anchor words.\u2019 Always say them in perfect accent. When you feel the accent slipping mid-session, drop one of these words into your next sentence. It pulls you back.',
  },
  {
    id: 'code-switching',
    title: 'Code-Switching Drill',
    description:
      'Say a sentence in your normal voice. Now say it in the accent. Now alternate: normal, accent, normal, accent. Get faster. This trains your brain to switch on command \u2014 essential for DMs who run multiple NPCs.',
  },
  {
    id: 'physicality-bridge',
    title: 'The Physicality Bridge',
    description:
      'Accent isn\u2019t just mouth \u2014 it\u2019s body. Scottish: square your shoulders. Elvish: lift your chin, elongate your neck. Orcish: hunch forward, clench your jaw. The body posture triggers the voice. Find the physical gesture that unlocks your accent.',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AccentTraining({ character, onSelectAccent }: AccentTrainingProps) {
  /* ------ State ------ */
  const [activeMode, setActiveMode] = useState<TrainingMode>(null)

  // Translator state
  const [selectedAccentId, setSelectedAccentId] = useState<string>(ACCENT_PROFILES[0]?.id ?? '')
  const [inputText, setInputText] = useState('')
  const [translatorResult, setTranslatorResult] = useState<TranslatorResult | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Technique Lab state
  const [expandedTechnique, setExpandedTechnique] = useState<string | null>(null)

  // AI
  const ai = useAI()

  /* ------ Handlers ------ */

  const handleSelectMode = useCallback((mode: TrainingMode) => {
    setActiveMode(mode)
  }, [])

  const handleBack = useCallback(() => {
    setActiveMode(null)
    // Reset translator state when leaving
    setTranslatorResult(null)
    ai.clearResponse()
  }, [ai])

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim() || !selectedAccentId) return

    const accent = ACCENT_PROFILES.find((a) => a.id === selectedAccentId)
    if (!accent) return

    const systemPrompt = SYSTEM_PROMPTS.accentTranslator(
      accent.name,
      accent.rules.map((r) => `${r.rule}: ${r.example}`).join('\n'),
      accent.eyeDialect
        .map((ed) => `${ed.original} \u2192 ${ed.accented} (${ed.note})`)
        .join('\n'),
    )

    try {
      const result = await ai.queryStructured<TranslatorResult>(systemPrompt, inputText)
      setTranslatorResult(result)
    } catch {
      // Error is already captured in ai.error
    }
  }, [inputText, selectedAccentId, ai])

  const handleCopy = useCallback(async () => {
    if (!translatorResult) return
    try {
      await navigator.clipboard.writeText(translatorResult.accentedText)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available
    }
  }, [translatorResult])

  const handleTryAnother = useCallback(() => {
    setInputText('')
    setTranslatorResult(null)
    ai.clearResponse()
  }, [ai])

  const handleToggleTechnique = useCallback((id: string) => {
    setExpandedTechnique((prev) => (prev === id ? null : id))
  }, [])

  /* ------ Derived ------ */

  const selectedAccent: AccentProfile | undefined = ACCENT_PROFILES.find(
    (a) => a.id === selectedAccentId,
  )

  const canTranslate = inputText.trim().length > 0 && !!selectedAccentId && !ai.loading

  /* ------ Render: Mode Selector ------ */

  function renderModeSelector() {
    return (
      <div className="flex flex-col gap-3 animate-fade-in" role="group" aria-label="Training modes">
        <h3 className="text-lg font-display font-semibold text-forge-0">
          Choose a Training Mode
        </h3>
        <p className="text-sm text-forge-2 -mt-1">
          Master accents through translation, live practice, or Hollywood-grade drills.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {MODE_CARDS.map((mode) => {
            const ModeIcon = mode.Icon
            return (
              <GlassCard key={mode.id} hover className="!p-0">
                <button
                  type="button"
                  onClick={() => handleSelectMode(mode.id as TrainingMode)}
                  className={cn(
                    'flex flex-col items-center text-center gap-3 w-full p-5',
                    'min-h-[120px] rounded-xl',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center',
                      'w-12 h-12 rounded-xl',
                      'bg-arcane/10 text-arcane',
                      'transition-colors duration-200',
                    )}
                  >
                    <ModeIcon size={24} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-forge-0">{mode.label}</p>
                    <p className="text-xs text-forge-2 mt-0.5">{mode.description}</p>
                  </div>
                </button>
              </GlassCard>
            )
          })}
        </div>
      </div>
    )
  }

  /* ------ Render: Mode Header (back button + title) ------ */

  function renderModeHeader(title: string, description: string, Icon: typeof Languages) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in">
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'inline-flex items-center gap-1.5 self-start',
            'min-h-[44px] px-2 -ml-2 rounded-lg',
            'text-sm text-forge-2 font-medium',
            'transition-all duration-200 ease-forge',
            'hover:text-forge-0 hover:bg-white/[0.06]',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to modes
        </button>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center shrink-0',
              'w-10 h-10 rounded-xl',
              'bg-arcane/10 border border-arcane/20 text-arcane',
              'shadow-[0_0_12px_-4px_rgba(61,210,255,0.2)]',
            )}
          >
            <Icon size={20} aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-forge-0">{title}</h3>
            <p className="text-xs text-forge-2">{description}</p>
          </div>
        </div>
      </div>
    )
  }

  /* ------ Render: Accent Translator ------ */

  function renderTranslator() {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {renderModeHeader('Accent Translator', 'Translate any text into an accent', Languages)}

        {/* Step 1: Pick Accent */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="translator-accent-select"
            className="text-sm font-medium text-forge-1"
          >
            Choose an accent
          </label>
          <select
            id="translator-accent-select"
            value={selectedAccentId}
            onChange={(e) => {
              setSelectedAccentId(e.target.value)
              setTranslatorResult(null)
            }}
            className={cn(
              'min-h-[44px] px-3 rounded-xl',
              'bg-white/[0.04] border border-white/10 text-forge-0',
              'text-sm font-body',
              'transition-all duration-200 ease-forge',
              'hover:border-white/20',
              'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              'appearance-none cursor-pointer',
              // Custom arrow via background
              'bg-[length:16px_16px] bg-no-repeat bg-[right_12px_center]',
              'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27%238d98a7%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M6 9l6 6 6-6%27 stroke=%27%238d98a7%27 stroke-width=%272%27 fill=%27none%27/%3E%3C/svg%3E")]',
              'pr-10',
            )}
          >
            {ACCENT_PROFILES.map((accent) => (
              <option key={accent.id} value={accent.id}>
                {accent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Input Text */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="translator-input"
            className="text-sm font-medium text-forge-1"
          >
            Your text
          </label>
          <textarea
            id="translator-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type any phrase, sentence, or dialogue..."
            rows={3}
            disabled={ai.loading}
            className={cn(
              'min-h-[88px] px-4 py-3 rounded-xl resize-y',
              'bg-white/[0.04] border border-white/10 text-forge-0',
              'text-sm font-body leading-relaxed',
              'placeholder:text-forge-2',
              'transition-all duration-200 ease-forge',
              'hover:border-white/20',
              'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
        </div>

        {/* Step 3: Translate Button */}
        <Button
          variant="primary"
          onClick={handleTranslate}
          disabled={!canTranslate}
          loading={ai.loading}
        >
          <Sparkles size={16} aria-hidden />
          Translate
        </Button>

        {/* Error State */}
        {ai.error && (
          <GlassCard className="!border-red-500/30 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-medium text-red-400">Translation failed</p>
                <p className="text-xs text-forge-2 mt-1">{ai.error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTranslate}
                  className="mt-2"
                >
                  Try again
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Result */}
        {translatorResult && !ai.loading && (
          <div className="animate-fade-in flex flex-col gap-4">
            <ParchmentCard>
              <div className="flex flex-col gap-4">
                {/* Accented text — the star */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ember uppercase tracking-wider">
                      Accented Translation
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        'min-h-[44px] min-w-[44px] px-3 rounded-lg',
                        'text-xs font-medium',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.97]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        copied
                          ? 'text-verdant bg-verdant/10'
                          : 'text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
                      )}
                      aria-label={copied ? 'Copied' : 'Copy accented text'}
                    >
                      {copied ? (
                        <>
                          <Check size={14} aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} aria-hidden />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-lg font-mono text-arcane leading-relaxed">
                    {translatorResult.accentedText}
                  </p>
                </div>

                {/* Key Sound Shifts */}
                {translatorResult.keyShifts.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-forge-2 uppercase tracking-wider">
                      Key Sound Shifts
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {translatorResult.keyShifts.map((shift, i) => (
                        <Badge key={i} variant="arcane">
                          {shift.from} &rarr; {shift.to}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Note */}
                {translatorResult.performanceNote && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-forge-2 uppercase tracking-wider">
                      Performance Note
                    </span>
                    <p className="text-sm text-forge-1 italic leading-relaxed">
                      {translatorResult.performanceNote}
                    </p>
                  </div>
                )}
              </div>
            </ParchmentCard>

            {/* Try Another */}
            <Button variant="secondary" onClick={handleTryAnother}>
              Try Another
            </Button>
          </div>
        )}
      </div>
    )
  }

  /* ------ Render: Scene Partner ------ */

  function renderScenePartner() {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {renderModeHeader('Scene Partner', 'Practice accents in conversation with AI', Theater)}
        <AIScenePartner character={character} />
      </div>
    )
  }

  /* ------ Render: Technique Lab ------ */

  function renderTechniqueLab() {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {renderModeHeader(
          'Technique Lab',
          'Hollywood-grade accent mastery drills',
          Dumbbell,
        )}

        <div className="flex flex-col gap-3">
          {TECHNIQUES.map((tech) => {
            const isExpanded = expandedTechnique === tech.id
            return (
              <GlassCard key={tech.id} className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleToggleTechnique(tech.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`technique-panel-${tech.id}`}
                  className={cn(
                    'flex items-center justify-between w-full gap-3',
                    'min-h-[56px] px-5 py-3',
                    'text-left',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.99]',
                    'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-arcane',
                    isExpanded && 'border-b border-white/8',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-semibold font-display',
                      'transition-colors duration-200',
                      isExpanded ? 'text-arcane' : 'text-forge-0',
                    )}
                  >
                    {tech.title}
                  </span>
                  <span
                    className={cn(
                      'flex items-center justify-center shrink-0',
                      'w-7 h-7 rounded-lg',
                      'transition-all duration-200 ease-forge',
                      isExpanded
                        ? 'bg-arcane/10 text-arcane'
                        : 'bg-white/[0.04] text-forge-2',
                    )}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} aria-hidden />
                    ) : (
                      <ChevronDown size={16} aria-hidden />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div
                    id={`technique-panel-${tech.id}`}
                    role="region"
                    aria-label={tech.title}
                    className="px-5 py-4 animate-fade-in"
                  >
                    <p className="text-sm text-forge-1 leading-relaxed">
                      {tech.description}
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/6">
                      <p className="text-xs text-arcane font-medium italic">
                        Try it: Pick an accent from the Library tab and apply this technique
                        during your next session. Start with just 5 minutes of focused
                        practice.
                      </p>
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      </div>
    )
  }

  /* ------ Main Render ------ */

  return (
    <section className="flex flex-col gap-4" aria-label="Accent Training">
      {activeMode === null && renderModeSelector()}
      {activeMode === 'translator' && renderTranslator()}
      {activeMode === 'scene-partner' && renderScenePartner()}
      {activeMode === 'technique-lab' && renderTechniqueLab()}
    </section>
  )
}
