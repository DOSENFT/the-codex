import { Layers, Swords, Users, Compass, Heart, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SceneContext = 'all' | 'combat' | 'social' | 'discovery' | 'emotional'

interface SceneContextFilterProps {
  value: SceneContext
  onChange: (ctx: SceneContext) => void
}

// ---------------------------------------------------------------------------
// Chip config
// ---------------------------------------------------------------------------

const CHIPS: { key: SceneContext; label: string; icon: LucideIcon }[] = [
  { key: 'all',        label: 'All',        icon: Layers },
  { key: 'combat',     label: 'Combat',     icon: Swords },
  { key: 'social',     label: 'Social',     icon: Users },
  { key: 'discovery',  label: 'Discovery',  icon: Compass },
  { key: 'emotional',  label: 'Emotional',  icon: Heart },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Horizontal scrollable chip strip for filtering session content by scene
 * context. Snap-scrolls on mobile with hidden scrollbars.
 */
export function SceneContextFilter({ value, onChange }: SceneContextFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 snap-x snap-mandatory"
      role="radiogroup"
      aria-label="Scene context filter"
    >
      {CHIPS.map(({ key, label, icon: Icon }) => {
        const isActive = value === key

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(key)}
            className={cn(
              // Layout
              'inline-flex items-center gap-2 shrink-0',
              'min-h-[44px] px-4 rounded-xl',
              'text-sm font-medium whitespace-nowrap',
              'snap-start',
              // Transition
              'transition-all duration-200 ease-forge',
              // Press feedback
              'active:scale-[0.95]',
              // Focus
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              // Selection cursor
              'select-none cursor-pointer',
              // Active vs inactive
              isActive
                ? 'bg-arcane/15 text-arcane border border-arcane/25'
                : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/[0.08]',
            )}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
