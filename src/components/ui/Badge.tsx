import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'arcane' | 'eldritch' | 'ember' | 'verdant' | 'neutral' | 'gold'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

/* A-23 — the ink is lit, the tint is not.
 *
 * `eldritch` printed `text-eldritch` (#8b5cf6) on its own `bg-eldritch/15`.
 * The tint lifts the ground under the word, so the pill measured 3.67–3.90:1
 * in situ — below the 4.5:1 floor — while the raw colour on pure void reads
 * 4.68:1 and looks fine in a swatch. That gap is why it survived this long:
 * every check that measured the token passed, and only a check that measured
 * the rendered pixel caught it. It was 11 of the 84 findings in the A-22
 * sweep, on its own.
 *
 * The fix keeps the tint — the tint is what carries the category, and losing
 * it would cost the colour coding that makes these scannable at arm's length —
 * and lights only the ink, using the `-lit` ramp `index.css` already defines
 * for exactly this and already annotates for exactly this reason. */
const variantStyles: Record<BadgeVariant, string> = {
  arcane:   'bg-arcane/15 text-arcane border-arcane/25',
  eldritch: 'bg-eldritch/15 text-eldritch-lit border-eldritch/25',
  ember:    'bg-ember/15 text-ember border-ember/25',
  verdant:  'bg-verdant/15 text-verdant border-verdant/25',
  gold:     'bg-gold/15 text-gold border-gold/25',
  neutral:  'bg-void-2/60 text-forge-1 border-bronze/20',
}

/**
 * Color-coded pill badge for status indicators, tags, and labels.
 * Each variant maps to a project accent color with a subtle tinted background.
 */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center',
        'rounded-full border px-2.5 py-0.5',
        'text-xs font-medium leading-none whitespace-nowrap',
        'select-none',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
