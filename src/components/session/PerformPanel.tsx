import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  MessageSquare,
  ArrowLeft,
  Check,
  Loader2,
  Shuffle,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import type { SceneContext } from './SceneContextFilter'
import type { RPMoment } from '../../lib/session-log'
import { ACCENT_GUIDES } from '../../lib/accent-data'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import { ActionCard } from './ActionCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerformPanelProps {
  character: Character
  sceneContext: SceneContext | 'all'
  expanded: boolean
  onToggle: () => void
  onMomentLogged: (moment: Omit<RPMoment, 'id' | 'timestamp'>) => void
}

interface DeliveryHints {
  tone: string
  pacing: string
  bodyLanguage: string
}

interface RiffVariation {
  line: string
  hint: string
}

// ---------------------------------------------------------------------------
// Context filter maps (same as SessionCockpit)
// ---------------------------------------------------------------------------

const DIALOGUE_CONTEXT_MAP: Record<Exclude<SceneContext, 'all'>, string[]> = {
  combat: ['combat'],
  social: ['social'],
  discovery: ['discovery'],
  emotional: ['emotional'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USED_LINES_PREFIX = 'codex-session-used-'

function loadUsedLines(characterId: string): Set<string> {
  const raw = localStorage.getItem(USED_LINES_PREFIX + characterId)
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set(parsed as string[])
    return new Set()
  } catch {
    return new Set()
  }
}

function saveUsedLines(characterId: string, used: Set<string>): void {
  localStorage.setItem(USED_LINES_PREFIX + characterId, JSON.stringify([...used]))
}

function clearUsedLines(characterId: string): void {
  localStorage.removeItem(USED_LINES_PREFIX + characterId)
}

function findAccentProfile(char: Character) {
  const activeIdentity = char.activeIdentityId && char.identities
    ? char.identities.find(i => i.id === char.activeIdentityId)
    : null
  const accentHint = activeIdentity?.accent ?? char.persona?.voiceNotes ?? ''
  if (!accentHint) return null
  const lower = accentHint.toLowerCase()
  return ACCENT_GUIDES.find(
    a => lower.includes(a.id.toLowerCase()) || lower.includes(a.name.toLowerCase()),
  ) ?? null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PerformPanel({ character, sceneContext, expanded, onToggle, onMomentLogged }: PerformPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [usedLines, setUsedLines] = useState<Set<string>>(() => loadUsedLines(character.id))
  const [deliveryHints, setDeliveryHints] = useState<DeliveryHints | null>(null)
  const [riffVariations, setRiffVariations] = useState<RiffVariation[]>([])

  const { loading: deliveryLoading, error: deliveryError, queryStructured: deliveryQuery, clearResponse: clearDelivery } = useAI()
  const { loading: riffLoading, error: riffError, queryStructured: riffQuery, clearResponse: clearRiff } = useAI()

  // Reset used lines when character changes
  useEffect(() => {
    setUsedLines(loadUsedLines(character.id))
  }, [character.id])

  // ── Data derivation ───────────────────────────────────────────────────
  const catchphrases = character.persona?.catchphrases ?? []

  const allDialogueLines = character.persona?.dialogueBank ?? []
  const filteredDialogueLines = useMemo(() => {
    if (sceneContext === 'all') {
      return allDialogueLines.filter(d => d.favorite)
    }
    return allDialogueLines.filter(d => {
      const contextMatch = DIALOGUE_CONTEXT_MAP[sceneContext].includes(d.context)
      return contextMatch || d.favorite
    })
  }, [allDialogueLines, sceneContext])

  const accentProfile = findAccentProfile(character)
  const accentRules = accentProfile ? accentProfile.rules.slice(0, 3) : []

  // Build a flat list of all performable lines
  const allLines = useMemo(() => {
    const lines: { text: string; source: string; deliveryNotes?: string }[] = []
    for (const phrase of catchphrases) {
      lines.push({ text: phrase, source: 'catchphrase' })
    }
    for (const d of filteredDialogueLines) {
      lines.push({ text: d.text, source: 'dialogue', deliveryNotes: (d as { deliveryNotes?: string }).deliveryNotes })
    }
    return lines
  }, [catchphrases, filteredDialogueLines])

  const lineCount = allLines.length

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSelectLine = useCallback(async (line: { text: string; deliveryNotes?: string }) => {
    setSelectedLine(line.text)
    setDeliveryHints(null)
    setRiffVariations([])
    clearDelivery()
    clearRiff()

    // If the line has pre-existing delivery notes, use them
    if (line.deliveryNotes) {
      setDeliveryHints({
        tone: line.deliveryNotes,
        pacing: '',
        bodyLanguage: '',
      })
    } else {
      // Fetch delivery hints from AI
      try {
        const contextStr = sceneContext === 'all' ? undefined : sceneContext
        const prompt = SYSTEM_PROMPTS.performDelivery(character, line.text, contextStr)
        const result = await deliveryQuery<DeliveryHints>(prompt, `Delivery hints for: "${line.text}"`)
        setDeliveryHints(result)
      } catch {
        // Error state handled by useAI
      }
    }
  }, [character, sceneContext, deliveryQuery, clearDelivery, clearRiff])

  const handleRiff = useCallback(async () => {
    if (!selectedLine) return
    setRiffVariations([])
    clearRiff()
    try {
      const contextStr = sceneContext === 'all' ? undefined : sceneContext
      const prompt = SYSTEM_PROMPTS.performRiff(character, selectedLine, contextStr)
      const result = await riffQuery<{ variations: RiffVariation[] }>(prompt, `Riff on: "${selectedLine}"`)
      setRiffVariations(result.variations ?? [])
    } catch {
      // Error state handled by useAI
    }
  }, [selectedLine, character, sceneContext, riffQuery, clearRiff])

  const handleRate = useCallback((rating: 'nailed' | 'close' | 'off') => {
    if (!selectedLine) return

    // Log the moment
    onMomentLogged({
      type: 'speak',
      text: selectedLine.length > 80 ? selectedLine.slice(0, 77) + '...' : selectedLine,
      context: sceneContext === 'all' ? undefined : sceneContext,
      rating,
    })

    // Mark as used
    setUsedLines(prev => {
      const next = new Set(prev)
      next.add(selectedLine)
      saveUsedLines(character.id, next)
      return next
    })

    // Return to list
    setSelectedLine(null)
    setDeliveryHints(null)
    setRiffVariations([])
  }, [selectedLine, character.id, sceneContext, onMomentLogged])

  const handleBack = useCallback(() => {
    setSelectedLine(null)
    setDeliveryHints(null)
    setRiffVariations([])
  }, [])

  const handleNewSession = useCallback(() => {
    clearUsedLines(character.id)
    setUsedLines(new Set())
  }, [character.id])

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <ActionCard
      title="Perform"
      icon={MessageSquare}
      color="arcane"
      count={lineCount}
      expanded={expanded}
      onToggle={onToggle}
      emptyMessage="Add catchphrases and dialogue lines in Prep mode to see them here"
    >
      {selectedLine ? (
        /* ── Teleprompter view ── */
        <div className="space-y-4 animate-fade-in">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              'inline-flex items-center gap-2',
              'min-h-[44px] px-3 py-2 rounded-xl',
              'text-sm font-medium text-forge-2',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-white/[0.06]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <ArrowLeft size={16} aria-hidden />
            Back to lines
          </button>

          {/* The line, large and readable */}
          <div className="glass-card rounded-xl px-4 py-5 border border-arcane/20">
            <p className="text-lg font-medium text-forge-0 leading-relaxed">
              &ldquo;{selectedLine}&rdquo;
            </p>
          </div>

          {/* Delivery hints */}
          {deliveryLoading && (
            <div className="flex items-center gap-2 px-1 text-sm text-forge-2">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Loading delivery hints...
            </div>
          )}

          {deliveryError && (
            <p className="text-sm text-red-400 px-1">{deliveryError}</p>
          )}

          {deliveryHints && (
            <div className="space-y-2 animate-fade-in">
              {deliveryHints.tone && (
                <div className="glass-card rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-1">Tone</p>
                  <p className="text-sm text-forge-0">{deliveryHints.tone}</p>
                </div>
              )}
              {deliveryHints.pacing && (
                <div className="glass-card rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-1">Pacing</p>
                  <p className="text-sm text-forge-0">{deliveryHints.pacing}</p>
                </div>
              )}
              {deliveryHints.bodyLanguage && (
                <div className="glass-card rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-1">Body Language</p>
                  <p className="text-sm text-forge-0">{deliveryHints.bodyLanguage}</p>
                </div>
              )}
            </div>
          )}

          {/* Riff button */}
          <button
            type="button"
            onClick={handleRiff}
            disabled={riffLoading}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2',
              'min-h-[44px] px-3 py-2 rounded-xl',
              'bg-arcane/10 border border-arcane/25',
              'text-sm font-medium text-arcane',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-arcane/15',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              riffLoading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {riffLoading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <Shuffle size={16} aria-hidden />
            )}
            {riffLoading ? 'Riffing...' : 'Riff'}
          </button>

          {riffError && (
            <p className="text-sm text-red-400 px-1">{riffError}</p>
          )}

          {/* Riff variations */}
          {riffVariations.length > 0 && (
            <div className="space-y-1.5 animate-fade-in">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Variations
              </p>
              {riffVariations.map((v, i) => (
                <div key={`riff-${i}`} className="glass-card rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-sm text-forge-0">&ldquo;{v.line}&rdquo;</p>
                  <p className="text-xs text-forge-2 italic">{v.hint}</p>
                </div>
              ))}
            </div>
          )}

          {/* Self-rating buttons */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
              How did it land?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRate('nailed')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center',
                  'min-h-[48px] px-3 py-2 rounded-xl',
                  'bg-verdant/15 border border-verdant/30',
                  'text-sm font-semibold text-verdant',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'hover:bg-verdant/20',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                )}
              >
                Nailed It
              </button>
              <button
                type="button"
                onClick={() => handleRate('close')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center',
                  'min-h-[48px] px-3 py-2 rounded-xl',
                  'bg-ember/15 border border-ember/30',
                  'text-sm font-semibold text-ember',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'hover:bg-ember/20',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                )}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleRate('off')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center',
                  'min-h-[48px] px-3 py-2 rounded-xl',
                  'bg-white/[0.06] border border-white/15',
                  'text-sm font-semibold text-forge-2',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'hover:bg-white/[0.08]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-2',
                )}
              >
                Off
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Line list view ── */
        <div className="space-y-4">
          {/* Catchphrases */}
          {catchphrases.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Catchphrases
              </p>
              <div className="space-y-1.5">
                {catchphrases.map((phrase, i) => {
                  const isUsed = usedLines.has(phrase)
                  return (
                    <button
                      key={`catch-${i}`}
                      type="button"
                      onClick={() => handleSelectLine({ text: phrase })}
                      className={cn(
                        'w-full flex items-center gap-3',
                        'min-h-[48px] px-3 py-2',
                        'glass-card rounded-xl',
                        'text-left text-sm text-forge-0',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.97]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        'hover:bg-white/[0.06]',
                        isUsed && 'opacity-60',
                      )}
                    >
                      <span className="flex-1 min-w-0 break-words">{phrase}</span>
                      {isUsed && (
                        <Check size={16} className="shrink-0 text-verdant" aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Dialogue lines */}
          {filteredDialogueLines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Dialogue Lines
              </p>
              <div className="space-y-1.5">
                {filteredDialogueLines.map((d, i) => {
                  const isUsed = usedLines.has(d.text)
                  return (
                    <button
                      key={`dialogue-${i}`}
                      type="button"
                      onClick={() => handleSelectLine({ text: d.text, deliveryNotes: (d as { deliveryNotes?: string }).deliveryNotes })}
                      className={cn(
                        'w-full flex items-center gap-3',
                        'min-h-[48px] px-3 py-2',
                        'glass-card rounded-xl',
                        'text-left text-sm text-forge-0',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.97]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        'hover:bg-white/[0.06]',
                        isUsed && 'opacity-60',
                      )}
                    >
                      <span className="flex-1 min-w-0 break-words">{d.text}</span>
                      {isUsed && (
                        <Check size={16} className="shrink-0 text-verdant" aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Accent quick rules */}
          {accentRules.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Accent Quick Rules ({accentProfile?.name})
              </p>
              <div className="space-y-1.5">
                {accentRules.map((r, i) => (
                  <div
                    key={`accent-${i}`}
                    className={cn(
                      'glass-card rounded-xl px-3 py-2',
                      'text-sm',
                    )}
                  >
                    <p className="text-forge-0 font-medium">{r.rule}</p>
                    <p className="text-forge-2 text-xs mt-0.5">{r.example}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Session button */}
          {usedLines.size > 0 && (
            <button
              type="button"
              onClick={handleNewSession}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2',
                'min-h-[44px] px-3 py-2 rounded-xl',
                'bg-white/[0.04] border border-white/10',
                'text-sm font-medium text-forge-2',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'hover:bg-white/[0.06]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              Clear Used Marks
            </button>
          )}
        </div>
      )}
    </ActionCard>
  )
}
