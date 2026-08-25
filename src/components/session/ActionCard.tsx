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

/* `tally` is the accent LIT, and it exists because a numeral is held to 7:1
   while a word beside it is held to 4.5. The count badge prints a number in
   the card's own accent on a 10%-tint of that same accent, which is the worst
   ground the colour has anywhere in the app: measured off the painted pixels,
   arcane came in at 6.82:1 and ember at 6.80:1 — both under V-3 by a margin
   too small to see and large enough to matter at arm's length in a dim room.
   Only the glyph changes. `text` still carries the icon and everything that is
   a word, so the card reads as the same colour it always did. */
const colorMap: Record<ActionColor, {
  border: string
  text: string
  tally: string
  bg: string
  topBorder: string
}> = {
  arcane: {
    border: 'border-arcane/25',
    text: 'text-arcane',
    tally: 'text-arcane-lit',
    bg: 'bg-arcane/10',
    topBorder: 'border-t-arcane',
  },
  ember: {
    border: 'border-ember/25',
    text: 'text-ember',
    tally: 'text-ember-lit',
    bg: 'bg-ember/10',
    topBorder: 'border-t-ember',
  },
  eldritch: {
    border: 'border-eldritch/25',
    text: 'text-eldritch-lit',
    tally: 'text-eldritch-lit',
    bg: 'bg-eldritch/10',
    topBorder: 'border-t-eldritch',
  },
  verdant: {
    border: 'border-verdant/25',
    text: 'text-verdant',
    tally: 'text-verdant',
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
  const { border, text, tally, bg, topBorder } = colorMap[color]

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
            'rounded-full text-xs font-medium tabular-nums',
            border,
            'border',
            // `tally`, not `text` — this is a numeral, so V-3's 7:1 applies and
            // the base accent does not clear it on its own 10% tint.
            // forge-1, not forge-2, for the same reason at zero: forge-2 is
            // 5.40:1 and a zero is still a number he reads.
            count > 0 ? [bg, tally] : 'bg-white/5 text-forge-1',
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
        {/* `invisible` when collapsed, and this is a correctness fix wearing a
            styling class. `grid-rows-[0fr]` gives the TRACK zero height; the
            content inside keeps its natural box and is merely clipped by
            `overflow-hidden`. So while this card was shut, every control in it
            was still in the tab order, still in the accessibility tree, and
            still returned a full-size rect from `getBoundingClientRect()` —
            which is how the contrast audit came to grade «Add Hook» against a
            gold background belonging to a card two screens further down. The
            text was never painted there; only its coordinates were.

            `visibility` is in the transition list on purpose. Collapsing, it
            holds `visible` for the full 200ms so the content does not vanish
            before the height finishes closing; expanding, it flips to visible
            at once. The animation is unchanged and nothing you can see moves.
            What changes is that a shut card is now shut to the keyboard, to a
            screen reader, and to any instrument that asks the page what is on
            it. */}
        <div
          className={cn(
            'overflow-hidden min-h-0',
            'transition-[visibility] duration-200 ease-forge',
            expanded ? 'visible' : 'invisible',
          )}
        >
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
