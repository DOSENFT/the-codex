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
    'text-eldritch border-eldritch/40 bg-eldritch/10 shadow-[0_0_10px_-3px_rgba(139,92,246,0.25)]',
  movement:
    'text-ember border-ember/40 bg-ember/10 shadow-[0_0_10px_-3px_rgba(232,146,74,0.25)]',
  sensory:
    'text-ink-secondary border-ink-secondary/30 bg-ink-secondary/10 shadow-[0_0_10px_-3px_rgba(191,181,160,0.15)]',
}

const INACTIVE_STYLE =
  'bg-gold/[0.03] border border-gold-dim/15 text-ink-muted opacity-50 hover:opacity-70'

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
              'text-[10px] font-semibold leading-none',
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
                'min-h-[36px] rounded-lg px-2 py-1.5',
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
              <span className="block text-[10px] font-semibold leading-tight truncate">
                {condition.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
