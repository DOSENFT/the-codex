import { useState, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Copy,
  Check,
  Lightbulb,
  Music,
  Users,
  BookOpen,
  Eye,
  Theater,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Send,
  Mic,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { ACCENT_PROFILES, type AccentProfile } from '../../lib/accent-data'
import type { Character } from '../../lib/character'
import { GlassCard } from '../ui/GlassCard'
import { ParchmentCard } from '../ui/ParchmentCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccentDetailViewProps {
  accentId: string
  onBack: () => void
  character: Character
}

type RepresentationTab = 'rules-mouth' | 'eye-dialect' | 'speak-it'

interface PhraseBreakdownResult {
  accentedPhrase: string
  words: { original: string; accented: string; mouth: string; rule: string }[]
  rhythm: string
  commonMistake: string
}

interface AccentTranslatorResult {
  accentedText: string
  keyShifts: { from: string; to: string; rule: string }[]
  performanceNote: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Moderate',
  4: 'Advanced',
  5: 'Expert',
}

const DIFFICULTY_VARIANT: Record<number, 'verdant' | 'arcane' | 'ember' | 'eldritch' | 'neutral'> = {
  1: 'verdant',
  2: 'verdant',
  3: 'arcane',
  4: 'ember',
  5: 'eldritch',
}

const CATEGORY_VARIANT: Record<string, 'arcane' | 'ember'> = {
  fantasy: 'arcane',
  'real-world': 'ember',
}

const VOCAL_PARAM_META: {
  key: keyof AccentProfile['vocalParams']
  label: string
  low: string
  high: string
}[] = [
  { key: 'pitch', label: 'Pitch', low: 'Low', high: 'High' },
  { key: 'pacing', label: 'Pacing', low: 'Slow', high: 'Fast' },
  { key: 'resonance', label: 'Resonance', low: 'Thin', high: 'Full' },
  { key: 'breathiness', label: 'Breathiness', low: 'Clear', high: 'Airy' },
  { key: 'gravel', label: 'Gravel', low: 'Smooth', high: 'Rough' },
]

const TAB_CONFIG: { id: RepresentationTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'rules-mouth', label: 'Rules & Mouth', icon: Theater },
  { id: 'eye-dialect', label: 'Eye Dialect', icon: Eye },
  { id: 'speak-it', label: 'Speak It', icon: Mic },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a mouth position coaching note based on common accent patterns
 * found in the rule text. Returns null when no pattern matches.
 */
function getMouthInstruction(rule: string): string | null {
  const lower = rule.toLowerCase()

  if (lower.includes('drop') || lower.includes('soften'))
    return 'Relax your jaw and let your tongue sit low. Don\'t tense up — let the sound trail off naturally instead of closing the shape.'

  if (lower.includes('roll') || lower.includes('trill'))
    return 'Press your tongue tip against the ridge behind your top teeth. Push a short burst of air to create the vibration. Start with a single tap before attempting a full trill.'

  if (lower.includes('elongate') || lower.includes('stretch') || lower.includes('lengthen') || lower.includes('draw out'))
    return 'Hold the vowel shape longer than feels natural. Keep your mouth in position and let the sound sustain — don\'t rush to the next consonant.'

  if (lower.includes('guttural') || lower.includes('back of throat') || lower.includes('uvular') || lower.includes('throaty'))
    return 'Constrict the back of your throat and push air through the narrowed passage. Your tongue root should pull back slightly.'

  if (lower.includes('nasal') || lower.includes('through your nose') || lower.includes('nasalize'))
    return 'Let air flow through your nose by lowering your soft palate. Keep your tongue high and forward. You should feel vibration in your nasal bridge.'

  if (lower.includes('glottal stop') || lower.includes('glottal'))
    return 'Close your vocal cords briefly — like the catch in the middle of "uh-oh." It replaces the consonant with a tiny silence.'

  if (lower.includes('higher pitch') || lower.includes('lighter') || lower.includes('brighten') || lower.includes('lift'))
    return 'Raise the back of your tongue and brighten your tone. Think of speaking from the front of your mouth rather than the chest.'

  if (lower.includes('lower') || lower.includes('deepen') || lower.includes('darken'))
    return 'Drop your jaw slightly and speak from your chest. Let the sound resonate lower in your throat.'

  if (lower.includes('clip') || lower.includes('crisp') || lower.includes('precise') || lower.includes('sharp'))
    return 'Keep your articulation tight. Each consonant gets a clean start and stop — no blending into the next sound.'

  if (lower.includes('slur') || lower.includes('blend') || lower.includes('mush') || lower.includes('run together'))
    return 'Let words flow into each other. Relax your lips and tongue so consonants soften and syllables merge.'

  if (lower.includes('aspirate') || lower.includes('breathy'))
    return 'Add a puff of air after the consonant. Your lips should part slightly, releasing a small breath before the vowel.'

  if (lower.includes('round') || lower.includes('purse'))
    return 'Push your lips forward into a rounded shape, like you\'re about to whistle. Hold that position through the vowel.'

  if (lower.includes('flat') || lower.includes('flatten'))
    return 'Spread your lips wide and keep your tongue flat. The sound should feel broad in your mouth, not focused.'

  if (lower.includes('swallow') || lower.includes('omit') || lower.includes('silent'))
    return 'Simply skip the sound entirely. Close the gap so the surrounding sounds connect directly — no pause where the letter used to be.'

  if (lower.includes('lisp') || lower.includes('interdental') || lower.includes('th'))
    return 'Place your tongue between your teeth and push air around it. The tip should be visible between your front teeth.'

  if (lower.includes('sing') || lower.includes('melodic') || lower.includes('musical') || lower.includes('lilt'))
    return 'Let your pitch rise and fall like a melody. Stress syllables get a noticeable lift, unstressed ones dip. Think of it as speaking on a gentle wave.'

  return null
}

/**
 * Build the accent rules string used in AI prompts.
 */
function buildRulesString(accent: AccentProfile): string {
  return accent.rules.map((r) => `${r.rule}: ${r.example}`).join('\n')
}

/**
 * Build the eye dialect examples string used in AI prompts.
 */
function buildEyeDialectString(accent: AccentProfile): string {
  return accent.eyeDialect.map((ed) => `${ed.original} → ${ed.accented} (${ed.note})`).join('\n')
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Expandable phrase card with AI-generated pronunciation breakdown.
 * Manages its own AI query state and expand/collapse animation.
 */
function PhraseCard({
  phrase,
  index,
  isExpanded,
  onToggle,
  copiedIndex,
  onCopy,
  accent,
}: {
  phrase: string
  index: number
  isExpanded: boolean
  onToggle: () => void
  copiedIndex: number | null
  onCopy: (phrase: string, index: number) => void
  accent: AccentProfile
}) {
  const ai = useAI()
  const [breakdown, setBreakdown] = useState<PhraseBreakdownResult | null>(null)
  const [breakdownError, setBreakdownError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  const handleToggle = useCallback(async () => {
    if (isExpanded) {
      onToggle()
      return
    }

    onToggle()

    // Load breakdown if we haven't yet
    if (!hasLoadedRef.current && !breakdown) {
      hasLoadedRef.current = true
      setBreakdownError(null)
      try {
        const systemPrompt = SYSTEM_PROMPTS.phraseBreakdown(
          accent.name,
          buildRulesString(accent),
          buildEyeDialectString(accent),
        )
        const result = await ai.queryStructured<PhraseBreakdownResult>(
          systemPrompt,
          `Break down this phrase: "${phrase}"`,
        )
        setBreakdown(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate breakdown'
        setBreakdownError(msg)
        hasLoadedRef.current = false
      }
    }
  }, [isExpanded, onToggle, breakdown, accent, ai, phrase])

  return (
    <ParchmentCard className="!p-0 overflow-hidden">
      {/* Phrase row — always visible */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-xs text-forge-2 font-mono shrink-0 mt-0.5 w-5 text-right">
          {index + 1}.
        </span>

        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex-1 text-left text-sm text-forge-0 leading-relaxed',
            'min-h-[44px] flex items-center',
            'transition-colors duration-200',
            'hover:text-arcane',
            'active:scale-[0.99]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane focus-visible:rounded-md',
          )}
        >
          {phrase}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {/* Copy button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(phrase, index)
            }}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg shrink-0',
              'transition-all duration-200 ease-forge',
              'hover:bg-white/[0.06]',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              copiedIndex === index ? 'text-verdant' : 'text-forge-2 hover:text-forge-1',
            )}
            aria-label={copiedIndex === index ? 'Copied' : `Copy phrase ${index + 1}`}
          >
            {copiedIndex === index ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </button>

          {/* Expand chevron */}
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg shrink-0',
              'transition-all duration-200 ease-forge',
              'hover:bg-white/[0.06]',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              isExpanded ? 'text-arcane' : 'text-forge-2 hover:text-forge-1',
            )}
            aria-label={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
          >
            {isExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-ember/15 bg-white/[0.02] px-4 py-4 animate-fade-in">
          {/* Loading state */}
          {ai.loading && !breakdown && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 size={18} className="animate-spin text-arcane" aria-hidden />
              <span className="text-sm text-forge-2">Generating pronunciation breakdown...</span>
            </div>
          )}

          {/* Error state */}
          {breakdownError && !breakdown && (
            <div className="flex items-center gap-3 py-4 text-ember">
              <AlertTriangle size={16} aria-hidden />
              <span className="text-sm">{breakdownError}</span>
            </div>
          )}

          {/* Breakdown content */}
          {breakdown && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Accented version */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Accented Version
                </span>
                <p className="text-base text-arcane font-display font-semibold leading-relaxed">
                  {breakdown.accentedPhrase}
                </p>
              </div>

              {/* Word-by-word breakdown */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Word Breakdown
                </span>
                <div className="grid gap-2">
                  {breakdown.words.map((w, wi) => (
                    <div
                      key={wi}
                      className="flex flex-col gap-0.5 py-1.5 border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm text-forge-1 font-mono">{w.original}</span>
                        <span className="text-forge-2 text-xs select-none" aria-hidden>&rarr;</span>
                        <span className="text-sm text-arcane font-mono font-semibold">{w.accented}</span>
                        <Badge variant="neutral" className="text-xs">{w.rule}</Badge>
                      </div>
                      <div className="flex items-start gap-1.5 ml-1">
                        <Theater size={12} className="text-ember shrink-0 mt-0.5" aria-hidden />
                        <span className="text-xs text-forge-2 italic">{w.mouth}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rhythm */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Rhythm Pattern
                </span>
                <p className="text-sm text-forge-1 font-mono leading-relaxed">{breakdown.rhythm}</p>
              </div>

              {/* Common mistake */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-ember/5 border border-ember/15">
                <AlertTriangle size={14} className="text-ember shrink-0 mt-0.5" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ember uppercase tracking-wider font-semibold">
                    Common Mistake
                  </span>
                  <span className="text-xs text-forge-1">{breakdown.commonMistake}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ParchmentCard>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * AccentDetailView -- active accent training tool. Renders when a user
 * selects an accent from the library. Shows rules with mouth coaching in
 * three representation modes (Rules & Mouth / Eye Dialect + Translator /
 * Speak It drills), vocal parameter bars, rhythm & cadence info, interactive
 * practice phrases with AI breakdowns, NPC archetypes, tips, and dialect notes.
 */
export function AccentDetailView({ accentId, onBack, character }: AccentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<RepresentationTab>('rules-mouth')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [expandedPhraseIndex, setExpandedPhraseIndex] = useState<number | null>(null)
  const [expandedSpeakItIndex, setExpandedSpeakItIndex] = useState<number | null>(null)

  // Accent Translator state
  const [translatorInput, setTranslatorInput] = useState('')
  const [translatorResult, setTranslatorResult] = useState<AccentTranslatorResult | null>(null)
  const [translatorCopied, setTranslatorCopied] = useState(false)
  const translatorAI = useAI()

  // Look up accent from the full profile dataset
  const accent = ACCENT_PROFILES.find((a) => a.id === accentId) ?? null

  // Copy handler with brief visual feedback
  const copyPhrase = useCallback((phrase: string, index: number) => {
    navigator.clipboard
      .writeText(phrase)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
      })
      .catch((err) => {
        console.error('[AccentDetailView] Failed to copy phrase:', err)
      })
  }, [])

  // Copy translated text
  const copyTranslation = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setTranslatorCopied(true)
        setTimeout(() => setTranslatorCopied(false), 1500)
      })
      .catch((err) => {
        console.error('[AccentDetailView] Failed to copy translation:', err)
      })
  }, [])

  // Accent translator handler
  const handleTranslate = useCallback(async () => {
    if (!accent || !translatorInput.trim()) return

    try {
      const systemPrompt = SYSTEM_PROMPTS.accentTranslator(
        accent.name,
        buildRulesString(accent),
        buildEyeDialectString(accent),
      )
      const result = await translatorAI.queryStructured<AccentTranslatorResult>(
        systemPrompt,
        translatorInput.trim(),
      )
      setTranslatorResult(result)
    } catch (err) {
      console.error('[AccentDetailView] Translation failed:', err)
    }
  }, [accent, translatorInput, translatorAI])

  // Toggle practice phrase expansion (only one at a time)
  const togglePhraseExpand = useCallback((index: number) => {
    setExpandedPhraseIndex((prev) => (prev === index ? null : index))
  }, [])

  // Toggle Speak It phrase expansion (only one at a time)
  const toggleSpeakItExpand = useCallback((index: number) => {
    setExpandedSpeakItIndex((prev) => (prev === index ? null : index))
  }, [])

  // ── Not Found State ──
  if (!accent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
        <p className="text-sm text-forge-2">Accent not found.</p>
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-4',
            'text-sm font-medium text-forge-1 rounded-xl',
            'transition-all duration-200 ease-forge',
            'hover:bg-white/[0.06] hover:text-forge-0',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Library
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Back Button                                                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'inline-flex items-center gap-2 min-h-[44px] px-3 self-start',
          'text-sm font-medium text-forge-1 rounded-xl',
          'transition-all duration-200 ease-forge',
          'hover:bg-white/[0.06] hover:text-forge-0',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Library
      </button>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Header                                                            */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-forge-0">
            {accent.name}
          </h2>
          <Badge variant={DIFFICULTY_VARIANT[accent.difficulty]}>
            {DIFFICULTY_LABELS[accent.difficulty]}
          </Badge>
          <Badge variant={CATEGORY_VARIANT[accent.category] ?? 'neutral'}>
            {accent.category === 'fantasy' ? 'Fantasy' : 'Real-World'}
          </Badge>
        </div>
        <p className="text-sm text-forge-1 leading-relaxed">{accent.description}</p>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Three-Tab Representation Toggle                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Tab bar */}
        <div className="inline-flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/8 self-start">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg',
                  'text-sm font-medium whitespace-nowrap',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  isActive
                    ? 'bg-arcane/15 text-arcane border border-arcane/30'
                    : 'bg-white/[0.03] text-forge-2 border border-white/8 hover:text-forge-1 hover:bg-white/[0.06]',
                )}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Rules & Mouth ── */}
        {activeTab === 'rules-mouth' && (
          <GlassCard>
            <div className="flex flex-col gap-2 animate-fade-in">
              {accent.rules.map((r, i) => {
                const mouth = getMouthInstruction(r.rule)
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 py-3 border-b border-white/5 last:border-b-0"
                  >
                    {/* Rule + example */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <span className="text-sm text-forge-0 font-medium shrink-0">
                        <span className="text-arcane font-mono text-xs mr-2">{i + 1}.</span>
                        {r.rule}
                      </span>
                      <span className="text-xs text-forge-2 italic">{r.example}</span>
                    </div>

                    {/* Mouth position coaching note */}
                    {mouth && (
                      <div className="flex items-start gap-2 ml-5 mt-1 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <Theater size={13} className="text-ember shrink-0 mt-0.5" aria-hidden />
                        <span className="text-xs text-forge-1 italic leading-relaxed">{mouth}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* ── Tab: Eye Dialect ── */}
        {activeTab === 'eye-dialect' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Original → Accented grid */}
            <GlassCard>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 pb-2 border-b border-white/10 mb-1">
                <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                  Original
                </span>
                <span className="text-xs text-forge-2" aria-hidden />
                <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                  Accented
                </span>
              </div>
              {accent.eyeDialect.map((ed, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-2.5 border-b border-white/5 last:border-b-0"
                >
                  <span className="text-sm text-forge-1 font-mono">{ed.original}</span>
                  <span className="text-forge-2 text-xs select-none" aria-hidden>
                    &rarr;
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-arcane font-mono font-semibold">
                      {ed.accented}
                    </span>
                    {ed.note && (
                      <span className="text-xs text-forge-2 italic">{ed.note}</span>
                    )}
                  </div>
                </div>
              ))}
            </GlassCard>

            {/* ── Accent Translator ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-arcane" aria-hidden />
                <span className="text-sm font-semibold text-forge-0">
                  Accent Translator
                </span>
                <Badge variant="arcane">AI</Badge>
              </div>

              <GlassCard className="!p-0 overflow-hidden border-arcane/20">
                {/* Input area */}
                <div className="p-4 flex flex-col gap-3">
                  <label htmlFor="translator-input" className="sr-only">
                    Type any phrase to hear it in this accent
                  </label>
                  <textarea
                    id="translator-input"
                    value={translatorInput}
                    onChange={(e) => setTranslatorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleTranslate()
                      }
                    }}
                    placeholder="Type any phrase to hear it in this accent..."
                    rows={2}
                    className={cn(
                      'w-full bg-void-2 text-forge-0 text-sm rounded-lg px-4 py-3',
                      'border border-white/10 placeholder-forge-2',
                      'resize-none',
                      'transition-all duration-200 ease-forge',
                      'focus:outline-none focus:border-arcane/40 focus:ring-1 focus:ring-arcane/20',
                    )}
                  />

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleTranslate}
                    loading={translatorAI.loading}
                    disabled={!translatorInput.trim()}
                    className="self-end"
                  >
                    <Send size={14} aria-hidden />
                    Translate
                  </Button>
                </div>

                {/* Error state */}
                {translatorAI.error && !translatorResult && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-ember text-sm">
                      <AlertTriangle size={14} aria-hidden />
                      <span>{translatorAI.error}</span>
                    </div>
                  </div>
                )}

                {/* Loading state (when no result yet) */}
                {translatorAI.loading && !translatorResult && (
                  <div className="flex items-center justify-center gap-3 px-4 pb-6 pt-2">
                    <Loader2 size={18} className="animate-spin text-arcane" aria-hidden />
                    <span className="text-sm text-forge-2">Translating into {accent.name}...</span>
                  </div>
                )}

                {/* Result */}
                {translatorResult && (
                  <div className="border-t border-arcane/15 animate-fade-in">
                    <ParchmentCard className="!rounded-none !border-0">
                      <div className="flex flex-col gap-4">
                        {/* Accented text — prominent display */}
                        <div className="flex items-start gap-3">
                          <p className="text-lg font-display font-semibold text-arcane leading-relaxed flex-1">
                            {translatorResult.accentedText}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyTranslation(translatorResult.accentedText)}
                            className={cn(
                              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg shrink-0',
                              'transition-all duration-200 ease-forge',
                              'hover:bg-white/[0.06]',
                              'active:scale-[0.97]',
                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                              translatorCopied ? 'text-verdant' : 'text-forge-2 hover:text-forge-1',
                            )}
                            aria-label={translatorCopied ? 'Copied' : 'Copy accented text'}
                          >
                            {translatorCopied ? (
                              <Check size={16} aria-hidden />
                            ) : (
                              <Copy size={16} aria-hidden />
                            )}
                          </button>
                        </div>

                        {/* Key sound shifts */}
                        <div className="flex flex-wrap gap-1.5">
                          {translatorResult.keyShifts.map((shift, si) => (
                            <Badge key={si} variant="arcane" className="text-xs">
                              {shift.from} &rarr; {shift.to}
                            </Badge>
                          ))}
                        </div>

                        {/* Performance note */}
                        <p className="text-xs text-forge-1 italic leading-relaxed">
                          {translatorResult.performanceNote}
                        </p>
                      </div>
                    </ParchmentCard>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}

        {/* ── Tab: Speak It ── */}
        {activeTab === 'speak-it' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Anchor vowel hero */}
            <GlassCard>
              <div className="flex flex-col items-center gap-3 py-2">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Anchor Vowel — Your Foundation Sound
                </span>
                <span className="text-4xl font-display font-bold text-arcane">
                  {accent.anchorVowel}
                </span>
                {(() => {
                  const anchorMouth = getMouthInstruction(accent.anchorVowel)
                  // Generate a general coaching note for the anchor vowel
                  const anchorNote = anchorMouth
                    || 'Find this vowel sound and use it as your home base. Every other sound in the accent orbits around it.'
                  return (
                    <div className="flex items-start gap-2 max-w-md">
                      <Theater size={14} className="text-ember shrink-0 mt-0.5" aria-hidden />
                      <p className="text-sm text-forge-1 italic text-center leading-relaxed">
                        {anchorNote}
                      </p>
                    </div>
                  )
                })()}
                <p className="text-xs text-forge-2 text-center max-w-sm">
                  {accent.cadenceCheat}
                </p>
              </div>
            </GlassCard>

            {/* Phrase Pronunciation Drill */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Mic size={16} className="text-arcane" aria-hidden />
                <span className="text-sm font-semibold text-forge-0">
                  Phrase Pronunciation Drill
                </span>
                <Badge variant="neutral">{accent.phrases.length}</Badge>
              </div>

              <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
                {accent.phrases.map((phrase, i) => (
                  <SpeakItPhraseCard
                    key={i}
                    phrase={phrase}
                    index={i}
                    isExpanded={expandedSpeakItIndex === i}
                    onToggle={() => toggleSpeakItExpand(i)}
                    copiedIndex={copiedIndex}
                    onCopy={copyPhrase}
                    accent={accent}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Vocal Parameters                                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center gap-2.5 mb-4">
          <Music size={16} className="text-arcane" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">
            Vocal Parameters
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          {VOCAL_PARAM_META.map(({ key, label, low, high }) => {
            const value = accent.vocalParams[key]
            const pct = (value / 10) * 100

            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-forge-0">{label}</span>
                  <span className="text-xs text-forge-2 font-mono">{value}/10</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-forge-2 w-10 text-right shrink-0">
                    {low}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-void-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-arcane/80 to-arcane transition-all duration-500 ease-forge"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-forge-2 w-10 shrink-0">{high}</span>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Rhythm & Cadence                                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <ParchmentCard>
        <div className="flex items-center gap-2.5 mb-3">
          <Music size={16} className="text-ember" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">
            Rhythm &amp; Cadence
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-forge-1 leading-relaxed italic">
            {accent.rhythm}
          </p>

          <div className="flex flex-wrap items-start gap-4 pt-2 border-t border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                Anchor Vowel
              </span>
              <span className="inline-flex bg-arcane/10 text-arcane text-xs font-mono px-2.5 py-1 rounded-md">
                {accent.anchorVowel}
              </span>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                Cadence Cheat
              </span>
              <span className="text-xs text-forge-1 italic">{accent.cadenceCheat}</span>
            </div>
          </div>
        </div>
      </ParchmentCard>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Practice Phrases (Interactive)                                    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} className="text-arcane" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">
            Practice Phrases
          </span>
          <Badge variant="neutral">{accent.phrases.length}</Badge>
        </div>

        <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
          {accent.phrases.map((phrase, i) => (
            <PhraseCard
              key={i}
              phrase={phrase}
              index={i}
              isExpanded={expandedPhraseIndex === i}
              onToggle={() => togglePhraseExpand(i)}
              copiedIndex={copiedIndex}
              onCopy={copyPhrase}
              accent={accent}
            />
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* NPC Archetypes                                                    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-eldritch" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">
            NPC Archetypes
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {accent.npcArchetypes.map((archetype) => (
            <Badge key={archetype} variant="eldritch">
              {archetype}
            </Badge>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Tips                                                              */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center gap-2.5 mb-3">
          <Lightbulb size={16} className="text-ember" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">Tips</span>
        </div>

        <ul className="flex flex-col gap-2">
          {accent.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-forge-1">
              <Lightbulb
                size={13}
                className="text-ember shrink-0 mt-0.5"
                aria-hidden
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Dialect Notes                                                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {accent.dialectNotes && (
        <p className="text-sm text-forge-2 italic leading-relaxed px-1 pb-2">
          {accent.dialectNotes}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Speak-It Phrase Card (separate component to manage its own AI state)
// ---------------------------------------------------------------------------

/**
 * Speak It tab phrase card — same expand/collapse pattern as PhraseCard
 * but used exclusively in the "Speak It" tab. Manages its own AI state
 * independently so each card can load its breakdown without conflicting.
 */
function SpeakItPhraseCard({
  phrase,
  index,
  isExpanded,
  onToggle,
  copiedIndex,
  onCopy,
  accent,
}: {
  phrase: string
  index: number
  isExpanded: boolean
  onToggle: () => void
  copiedIndex: number | null
  onCopy: (phrase: string, index: number) => void
  accent: AccentProfile
}) {
  const ai = useAI()
  const [breakdown, setBreakdown] = useState<PhraseBreakdownResult | null>(null)
  const [breakdownError, setBreakdownError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Use a separate index namespace so copied state doesn't collide with practice phrases
  // We offset by 1000 to avoid conflict with the main phrase list
  const copyIndex = index + 1000

  const handleToggle = useCallback(async () => {
    if (isExpanded) {
      onToggle()
      return
    }

    onToggle()

    if (!hasLoadedRef.current && !breakdown) {
      hasLoadedRef.current = true
      setBreakdownError(null)
      try {
        const systemPrompt = SYSTEM_PROMPTS.phraseBreakdown(
          accent.name,
          buildRulesString(accent),
          buildEyeDialectString(accent),
        )
        const result = await ai.queryStructured<PhraseBreakdownResult>(
          systemPrompt,
          `Break down this phrase: "${phrase}"`,
        )
        setBreakdown(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate breakdown'
        setBreakdownError(msg)
        hasLoadedRef.current = false
      }
    }
  }, [isExpanded, onToggle, breakdown, accent, ai, phrase])

  return (
    <GlassCard className="!p-0 overflow-hidden">
      {/* Phrase row */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-xs text-forge-2 font-mono shrink-0 mt-0.5 w-5 text-right">
          {index + 1}.
        </span>

        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex-1 text-left text-sm text-forge-0 leading-relaxed',
            'min-h-[44px] flex items-center',
            'transition-colors duration-200',
            'hover:text-arcane',
            'active:scale-[0.99]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane focus-visible:rounded-md',
          )}
        >
          {phrase}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(phrase, copyIndex)
            }}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg shrink-0',
              'transition-all duration-200 ease-forge',
              'hover:bg-white/[0.06]',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              copiedIndex === copyIndex ? 'text-verdant' : 'text-forge-2 hover:text-forge-1',
            )}
            aria-label={copiedIndex === copyIndex ? 'Copied' : `Copy phrase ${index + 1}`}
          >
            {copiedIndex === copyIndex ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </button>

          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg shrink-0',
              'transition-all duration-200 ease-forge',
              'hover:bg-white/[0.06]',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              isExpanded ? 'text-arcane' : 'text-forge-2 hover:text-forge-1',
            )}
            aria-label={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
          >
            {isExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-white/[0.02] px-4 py-4 animate-fade-in">
          {/* Loading */}
          {ai.loading && !breakdown && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 size={18} className="animate-spin text-arcane" aria-hidden />
              <span className="text-sm text-forge-2">Generating pronunciation drill...</span>
            </div>
          )}

          {/* Error */}
          {breakdownError && !breakdown && (
            <div className="flex items-center gap-3 py-4 text-ember">
              <AlertTriangle size={16} aria-hidden />
              <span className="text-sm">{breakdownError}</span>
            </div>
          )}

          {/* Breakdown */}
          {breakdown && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Accented version */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Say It Like This
                </span>
                <p className="text-base text-arcane font-display font-semibold leading-relaxed">
                  {breakdown.accentedPhrase}
                </p>
              </div>

              {/* Word breakdown */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Word-by-Word
                </span>
                <div className="grid gap-2">
                  {breakdown.words.map((w, wi) => (
                    <div
                      key={wi}
                      className="flex flex-col gap-0.5 py-1.5 border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm text-forge-1 font-mono">{w.original}</span>
                        <span className="text-forge-2 text-xs select-none" aria-hidden>&rarr;</span>
                        <span className="text-sm text-arcane font-mono font-semibold">{w.accented}</span>
                        <Badge variant="neutral" className="text-xs">{w.rule}</Badge>
                      </div>
                      <div className="flex items-start gap-1.5 ml-1">
                        <Theater size={12} className="text-ember shrink-0 mt-0.5" aria-hidden />
                        <span className="text-xs text-forge-2 italic">{w.mouth}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rhythm */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-forge-2 uppercase tracking-wider font-semibold">
                  Rhythm Coaching
                </span>
                <p className="text-sm text-forge-1 font-mono leading-relaxed">{breakdown.rhythm}</p>
              </div>

              {/* Common mistake */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-ember/5 border border-ember/15">
                <AlertTriangle size={14} className="text-ember shrink-0 mt-0.5" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ember uppercase tracking-wider font-semibold">
                    Watch Out
                  </span>
                  <span className="text-xs text-forge-1">{breakdown.commonMistake}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}
