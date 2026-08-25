import { useMemo } from 'react'
import { cn } from '../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConditionsGridProps {
  conditions: string[]
  onToggle: (conditionName: string) => void
}

// ---------------------------------------------------------------------------
// D&D 2024 Conditions Data
// ---------------------------------------------------------------------------

type ConditionCategory = 'debuff' | 'control' | 'movement' | 'sensory'

interface ConditionDef {
  name: string
  category: ConditionCategory
}

const CONDITIONS: ConditionDef[] = [
  // Debuff (red)
  { name: 'Blinded', category: 'debuff' },
  { name: 'Exhaustion', category: 'debuff' },
  { name: 'Incapacitated', category: 'debuff' },
  { name: 'Paralyzed', category: 'debuff' },
  { name: 'Petrified', category: 'debuff' },
  { name: 'Poisoned', category: 'debuff' },
  { name: 'Stunned', category: 'debuff' },
  { name: 'Unconscious', category: 'debuff' },
  // Control (purple / eldritch)
  { name: 'Charmed', category: 'control' },
  { name: 'Frightened', category: 'control' },
  // Movement (ember)
  { name: 'Grappled', category: 'movement' },
  { name: 'Prone', category: 'movement' },
  { name: 'Restrained', category: 'movement' },
  // Sensory
  { name: 'Deafened', category: 'sensory' },
  { name: 'Invisible', category: 'sensory' },
]

// ---------------------------------------------------------------------------
// Category color maps
// ---------------------------------------------------------------------------

const ACTIVE_STYLES: Record<ConditionCategory, string> = {
  debuff:
    'text-red-400 border-red-400/40 bg-red-400/10 shadow-[0_0_10px_-3px_rgba(248,113,113,0.25)]',
  control:
    'text-eldritch-lit border-eldritch/40 bg-eldritch/10 shadow-[0_0_10px_-3px_rgba(139,92,246,0.25)]',
  movement:
    'text-ember border-ember/40 bg-ember/10 shadow-[0_0_10px_-3px_rgba(232,146,74,0.25)]',
  sensory:
    'text-ink-secondary border-ink-secondary/30 bg-ink-secondary/10 shadow-[0_0_10px_-3px_rgba(191,181,160,0.15)]',
}

/* `opacity-50` used to sit on this line and it was the second half of a
   two-part defect. `text-ink-muted` resolved to nothing — the token was never
   declared, see index.css — so the chip inherited its parent's ink, and then
   this halved it: twelve condition names at 1.3:1, on the screen where he has
   six seconds to find one and tap it. The token is declared now; the opacity
   would still drag it to roughly 2.4:1, so it goes.

   The active/inactive hierarchy never depended on it. An active chip is its
   category's accent — red, eldritch, ember — with a tinted fill and a glow; an
   inactive one is dim grey ink on a 3 %-gold wash with no glow. That difference
   is hue and light, and it survives a dark room. Halved alpha does not. */
const INACTIVE_STYLE =
  'bg-gold/[0.03] border border-gold-dim/15 text-ink-muted hover:text-forge-1 hover:border-gold-dim/30'

// ---------------------------------------------------------------------------
// ConditionsGrid Component
// ---------------------------------------------------------------------------

export function ConditionsGrid({ conditions, onToggle }: ConditionsGridProps) {
  const activeCount = useMemo(
    () => CONDITIONS.filter(c => conditions.includes(c.name)).length,
    [conditions],
  )

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="combat-section-header">Conditions</span>
        {activeCount > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              'rounded-full px-2 py-0.5',
              'text-xs font-semibold leading-none',
              'bg-red-400/10 text-red-400 border border-red-400/20',
            )}
          >
            Active: {activeCount}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {CONDITIONS.map(condition => {
          const isActive = conditions.includes(condition.name)

          return (
            <button
              key={condition.name}
              type="button"
              onClick={() => onToggle(condition.name)}
              className={cn(
                'min-h-[44px] rounded-lg px-2 py-1.5',
                'border transition-all duration-200 ease-snap',
                'active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                'select-none',
                isActive
                  ? cn(ACTIVE_STYLES[condition.category], 'opacity-100')
                  : INACTIVE_STYLE,
              )}
              aria-pressed={isActive}
              aria-label={`${condition.name} condition${isActive ? ' (active)' : ''}`}
            >
              <span className="block text-xs font-semibold leading-tight truncate">
                {condition.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
