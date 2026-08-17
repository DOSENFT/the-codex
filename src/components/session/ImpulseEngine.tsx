import { useState, useCallback } from 'react'
import { Zap, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import type { RPMoment } from '../../lib/session-log'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import { ActionCard } from './ActionCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImpulseEngineProps {
  character: Character
  sceneContext?: string
  expanded: boolean
  onToggle: () => void
  onMomentLogged: (moment: Omit<RPMoment, 'id' | 'timestamp'>) => void
}

interface ReactionResult {
  say: string
  do: string
  think: string
}

// ---------------------------------------------------------------------------
// Situation grid data
// ---------------------------------------------------------------------------

interface SituationButton {
  label: string
  color: 'ember' | 'verdant' | 'arcane' | 'eldritch'
}

const SITUATIONS: SituationButton[] = [
  { label: 'Ambush!',      color: 'ember' },
  { label: 'Betrayal!',    color: 'eldritch' },
  { label: 'Gift!',        color: 'verdant' },
  { label: 'Insult!',      color: 'eldritch' },
  { label: 'Revelation!',  color: 'arcane' },
  { label: 'Death!',       color: 'ember' },
  { label: 'Victory!',     color: 'verdant' },
  { label: 'Request!',     color: 'arcane' },
]

const SITUATION_COLOR_MAP: Record<SituationButton['color'], {
  bg: string
  border: string
  text: string
  hoverBg: string
}> = {
  ember: {
    bg: 'bg-ember/10',
    border: 'border-ember/25',
    text: 'text-ember',
    hoverBg: 'hover:bg-ember/15',
  },
  verdant: {
    bg: 'bg-verdant/10',
    border: 'border-verdant/25',
    text: 'text-verdant',
    hoverBg: 'hover:bg-verdant/15',
  },
  arcane: {
    bg: 'bg-arcane/10',
    border: 'border-arcane/25',
    text: 'text-arcane',
    hoverBg: 'hover:bg-arcane/15',
  },
  eldritch: {
    bg: 'bg-eldritch/10',
    border: 'border-eldritch/25',
    text: 'text-eldritch',
    hoverBg: 'hover:bg-eldritch/15',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImpulseEngine({ character, sceneContext, expanded, onToggle, onMomentLogged }: ImpulseEngineProps) {
  const [activeSituation, setActiveSituation] = useState<string | null>(null)
  const [reaction, setReaction] = useState<ReactionResult | null>(null)

  const { loading, error, queryStructured, clearResponse } = useAI()

  // ── Fire a situation ──────────────────────────────────────────────────
  const fireSituation = useCallback(async (situationLabel: string) => {
    setActiveSituation(situationLabel)
    setReaction(null)
    clearResponse()

    try {
      const prompt = SYSTEM_PROMPTS.impulseReaction(character, situationLabel, sceneContext)
      const result = await queryStructured<ReactionResult>(prompt, `${character.name} reacts to: ${situationLabel}`)
      setReaction(result)
    } catch {
      // Error handled by useAI
    }
  }, [character, sceneContext, queryStructured, clearResponse])

  // ── "Another" — re-fire the same situation ────────────────────────────
  const handleAnother = useCallback(() => {
    if (activeSituation) {
      fireSituation(activeSituation)
    }
  }, [activeSituation, fireSituation])

  // ── "Played It" — log moment and return to grid ──────────────────────
  const handlePlayedIt = useCallback(() => {
    if (!reaction || !activeSituation) return

    const text = `${activeSituation} — "${reaction.say.length > 50 ? reaction.say.slice(0, 47) + '...' : reaction.say}"`
    onMomentLogged({
      type: 'react',
      text: text.length > 80 ? text.slice(0, 77) + '...' : text,
      context: sceneContext,
    })

    setActiveSituation(null)
    setReaction(null)
  }, [reaction, activeSituation, sceneContext, onMomentLogged])

  // ── Return to grid ────────────────────────────────────────────────────
  const handleBackToGrid = useCallback(() => {
    setActiveSituation(null)
    setReaction(null)
  }, [])

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <ActionCard
      title="Impulse"
      icon={Zap}
      color="ember"
      count={SITUATIONS.length}
      expanded={expanded}
      onToggle={onToggle}
      emptyMessage="Add persona traits and backstory in Prep mode for better reactions"
    >
      {activeSituation ? (
        /* ── Reaction view ── */
        <div className="space-y-3 animate-fade-in">
          {/* Situation label */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToGrid}
              className={cn(
                'inline-flex items-center gap-1.5',
                'min-h-[44px] px-2 rounded-lg',
                'text-sm text-forge-2',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'hover:bg-white/[0.06]',
              )}
            >
              &larr;
            </button>
            <p className="text-sm font-semibold text-forge-0">
              {activeSituation}
            </p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-[64px] rounded-xl bg-white/[0.04] animate-pulse"
                />
              ))}
              <div className="flex items-center gap-2 px-1 text-sm text-forge-2">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Channeling reaction...
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 px-1">{error}</p>
          )}

          {/* Reaction card */}
          {reaction && (
            <div className="space-y-2 animate-fade-in">
              {/* SAY */}
              <div className="glass-card rounded-xl px-3 py-3 border border-arcane/20">
                <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-1">
                  Say
                </p>
                <p className="text-sm text-forge-0 leading-relaxed">
                  &ldquo;{reaction.say}&rdquo;
                </p>
              </div>

              {/* DO */}
              <div className="glass-card rounded-xl px-3 py-3 border border-ember/20">
                <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-1">
                  Do
                </p>
                <p className="text-sm text-forge-0 leading-relaxed">
                  {reaction.do}
                </p>
              </div>

              {/* THINK */}
              <div className="glass-card rounded-xl px-3 py-3 border border-eldritch/20">
                <p className="text-xs font-semibold text-eldritch uppercase tracking-wider mb-1">
                  Think
                </p>
                <p className="text-sm text-forge-0 leading-relaxed italic">
                  {reaction.think}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePlayedIt}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2',
                    'min-h-[48px] px-3 py-2 rounded-xl',
                    'bg-verdant/15 border border-verdant/30',
                    'text-sm font-semibold text-verdant',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.95]',
                    'hover:bg-verdant/20',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                  )}
                >
                  Played It
                </button>
                <button
                  type="button"
                  onClick={handleAnother}
                  disabled={loading}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2',
                    'min-h-[48px] px-3 py-2 rounded-xl',
                    'bg-white/[0.06] border border-white/15',
                    'text-sm font-semibold text-forge-1',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.95]',
                    'hover:bg-white/[0.08]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                    loading && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <RefreshCw size={16} className={cn(loading && 'animate-spin')} aria-hidden />
                  Another
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Situation grid ── */
        <div className="grid grid-cols-2 gap-2">
          {SITUATIONS.map(({ label, color }) => {
            const colors = SITUATION_COLOR_MAP[color]
            return (
              <button
                key={label}
                type="button"
                onClick={() => fireSituation(label)}
                className={cn(
                  'inline-flex items-center justify-center',
                  'min-h-[52px] px-3 py-3 rounded-xl',
                  'text-sm font-semibold',
                  'border',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                  colors.bg,
                  colors.border,
                  colors.text,
                  colors.hoverBg,
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </ActionCard>
  )
}
