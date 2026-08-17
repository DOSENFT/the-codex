import { cn } from '../../lib/cn'
import { RotateCcw } from 'lucide-react'
import { InitialA } from '../../assets/sigils/InitialA'
import { InitialB } from '../../assets/sigils/InitialB'
import { InitialR } from '../../assets/sigils/InitialR'
import { InitialM } from '../../assets/sigils/InitialM'
import { motion } from 'motion/react'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EconomyKey = 'action' | 'bonusAction' | 'reaction' | 'movement'

interface ActionEconomyStripProps {
  economy: {
    action: boolean
    bonusAction: boolean
    reaction: boolean
    movement: boolean
  }
  onToggle: (key: EconomyKey) => void
  onReset: () => void
}

// ---------------------------------------------------------------------------
// Button config
// ---------------------------------------------------------------------------

const ECONOMY_BUTTONS: {
  key: EconomyKey
  label: string
  Initial: React.FC<{ className?: string }>
}[] = [
  { key: 'action', label: 'ACTION', Initial: InitialA },
  { key: 'bonusAction', label: 'BONUS', Initial: InitialB },
  { key: 'reaction', label: 'REACT', Initial: InitialR },
  { key: 'movement', label: 'MOVE', Initial: InitialM },
]

// ---------------------------------------------------------------------------
// Inline styles — parchment-card adapted for buttons
// ---------------------------------------------------------------------------

const availableButtonStyle: React.CSSProperties = {
  background:
    'radial-gradient(ellipse at 30% 20%, oklch(0.72 0.10 80 / 0.03) 0%, transparent 60%), linear-gradient(160deg, oklch(0.20 0.01 55) 0%, oklch(0.16 0.01 60) 100%)',
  border: 'none',
  boxShadow:
    'inset 0 0 0 1px oklch(0.55 0.07 75 / 0.15), 0 0 4px -1px oklch(0.72 0.10 80 / 0.04)',
}

const resetButtonStyle: React.CSSProperties = {
  background:
    'radial-gradient(ellipse at 30% 20%, oklch(0.72 0.10 80 / 0.03) 0%, transparent 60%), linear-gradient(160deg, oklch(0.20 0.01 55) 0%, oklch(0.16 0.01 60) 100%)',
  border: 'none',
  boxShadow:
    'inset 0 0 0 1px oklch(0.55 0.07 75 / 0.15), 0 0 4px -1px oklch(0.72 0.10 80 / 0.04)',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Horizontal strip of four illuminated-initial buttons representing the D&D 5e
 * action economy (Action, Bonus Action, Reaction, Movement). Tap to toggle
 * used/available. A reset button restores all to available.
 *
 * Uses micro-tier 80ms transitions for combat speed. No bounce, no spring.
 */
export function ActionEconomyStrip({
  economy,
  onToggle,
  onReset,
}: ActionEconomyStripProps) {
  const allAvailable =
    !economy.action &&
    !economy.bonusAction &&
    !economy.reaction &&
    !economy.movement

  const [pulsingKey, setPulsingKey] = useState<EconomyKey | 'reset' | null>(
    null,
  )

  return (
    <div className="flex items-stretch gap-2">
      {ECONOMY_BUTTONS.map(({ key, label, Initial }) => {
        const used = economy[key]
        return (
          <div key={key} className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                onToggle(key)
                setPulsingKey(key)
              }}
              aria-label={`${label}: ${used ? 'used, tap to restore' : 'available, tap to use'}`}
              aria-pressed={used}
              className={cn(
                // Layout
                'w-full flex flex-col items-center justify-center gap-1',
                'min-h-[44px] py-2',
                // Card styling — codex card feel
                'rounded-lg',
                // Transition — micro tier, combat speed
                'transition-all duration-[var(--duration-micro)]',
                'ease-[var(--ease-snap)]',
                // Press feedback
                'active:scale-[0.95]',
                // Focus
                'focus-visible:outline-2 focus-visible:outline-gold',
                // Used state — faded ink feel
                used && 'bg-ash-deep opacity-50',
              )}
              style={used ? undefined : availableButtonStyle}
            >
              {/* Illuminated initial — 28px, up from 20px */}
              <div className="relative flex items-center justify-center">
                <Initial
                  className={cn(
                    'w-7 h-7',
                    'transition-colors duration-[var(--duration-micro)]',
                    'ease-[var(--ease-snap)]',
                    used ? 'text-ink-ghost' : 'text-ink-primary',
                  )}
                />
                {/* Strike-through line when used — gold tinted */}
                {used && (
                  <div
                    className={cn(
                      'absolute inset-x-0 top-1/2 h-px',
                      'bg-gold-dim/30',
                      '-translate-y-px',
                    )}
                    aria-hidden
                  />
                )}
              </div>

              {/* Label — 9px Cinzel tracked uppercase */}
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.1em] leading-none',
                  'transition-colors duration-[var(--duration-micro)]',
                  'ease-[var(--ease-snap)]',
                  used ? 'text-ink-ghost' : 'gold-gradient-text',
                )}
              >
                {label}
              </span>
            </button>

            {/* Toggle pulse overlay */}
            {pulsingKey === key && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-gold pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0] }}
                transition={{ duration: 0.15 }}
                onAnimationComplete={() => setPulsingKey(null)}
              />
            )}
          </div>
        )
      })}

      {/* Reset button — circular mark, 40px, still hittable at 44px touch target */}
      <div className="relative self-center">
        <button
          type="button"
          onClick={() => {
            onReset()
            if (!allAvailable) setPulsingKey('reset')
          }}
          disabled={allAvailable}
          aria-label="Reset all actions"
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 min-w-[44px] min-h-[44px] flex-shrink-0',
            'rounded-full',
            'transition-all duration-[var(--duration-micro)]',
            'ease-[var(--ease-snap)]',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-gold',
            allAvailable
              ? 'opacity-25 cursor-default'
              : 'text-ink-muted hover:text-gold-dim hover:shadow-[0_0_8px_-2px] hover:shadow-gold/20',
          )}
          style={resetButtonStyle}
        >
          <RotateCcw size={14} />
        </button>

        {/* Reset pulse overlay */}
        {pulsingKey === 'reset' && (
          <motion.span
            className="absolute inset-0 rounded-full bg-gold pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.15 }}
            onAnimationComplete={() => setPulsingKey(null)}
          />
        )}
      </div>
    </div>
  )
}
