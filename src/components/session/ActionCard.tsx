import { type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionColor = 'arcane' | 'ember' | 'eldritch' | 'verdant'

interface ActionCardProps {
  title: string
  icon: LucideIcon
  color: ActionColor
  count: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  emptyMessage?: string
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const colorMap: Record<ActionColor, {
  border: string
  text: string
  bg: string
  topBorder: string
}> = {
  arcane: {
    border: 'border-arcane/25',
    text: 'text-arcane',
    bg: 'bg-arcane/10',
    topBorder: 'border-t-arcane',
  },
  ember: {
    border: 'border-ember/25',
    text: 'text-ember',
    bg: 'bg-ember/10',
    topBorder: 'border-t-ember',
  },
  eldritch: {
    border: 'border-eldritch/25',
    text: 'text-eldritch',
    bg: 'bg-eldritch/10',
    topBorder: 'border-t-eldritch',
  },
  verdant: {
    border: 'border-verdant/25',
    text: 'text-verdant',
    bg: 'bg-verdant/10',
    topBorder: 'border-t-verdant',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable expandable card mirroring the Combat tab's Action / Bonus / Reaction
 * pattern. Collapsed shows a 56px header row; expanded reveals children via a
 * CSS grid-rows height animation (no JS measurement needed).
 *
 * Color-coded top border indicates category: arcane (blue), ember (gold),
 * eldritch (purple).
 */
export function ActionCard({
  title,
  icon: Icon,
  color,
  count,
  expanded,
  onToggle,
  children,
  emptyMessage = 'Nothing here yet.',
}: ActionCardProps) {
  const { border, text, bg, topBorder } = colorMap[color]

  return (
    <div
      className={cn(
        'glass-card overflow-hidden',
        'border-t-[3px]',
        topBorder,
        'animate-fade-in',
      )}
    >
      {/* ── Header row (always visible, 56px) ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          // Layout
          'w-full flex items-center gap-3',
          'min-h-[56px] px-4 py-3',
          // Interaction
          'select-none cursor-pointer',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          // Focus
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        {/* Icon */}
        <span
          className={cn(
            'flex items-center justify-center',
            'w-8 h-8 rounded-lg shrink-0',
            bg,
          )}
        >
          <Icon size={18} className={text} aria-hidden />
        </span>

        {/* Title */}
        <span className="flex-1 text-left text-sm font-semibold text-forge-0">
          {title}
        </span>

        {/* Count badge */}
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'min-w-[24px] h-6 px-1.5',
            'rounded-full text-xs font-medium',
            border,
            'border',
            count > 0 ? [bg, text] : 'bg-white/5 text-forge-2',
          )}
        >
          {count}
        </span>

        {/* Chevron (rotates on expand) */}
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(
            'shrink-0 text-forge-2',
            'transition-transform duration-200 ease-forge',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* ── Expandable body ── */}
      {/* CSS grid-rows trick: 0fr collapses to 0, 1fr expands to content.
          The inner div has min-h-0 so it can shrink below intrinsic height. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-forge',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-4 pb-4">
            {/* Subtle top divider */}
            <div className="h-px bg-white/[0.06] mb-3" />

            {count === 0 ? (
              // Empty state
              <p className="text-sm text-forge-2 italic text-center py-4">
                {emptyMessage}
              </p>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
