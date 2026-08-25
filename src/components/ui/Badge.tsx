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
 * for exactly this and already annotates for exactly this reason.
 *
 * ── A-35: the comment above was right about four more rows than it changed. ──
 *
 * A-23 wrote fourteen lines of reasoning and then lit exactly ONE row of the
 * table beneath it. `arcane`, `ember`, `verdant` and `gold` kept printing base
 * ink on their own 15 % tint — the identical pairing, in the identical table,
 * eleven lines below the paragraph explaining why that fails. It survived
 * because nothing measured it: the badges that were on the seven graded screens
 * happened to be the ones that clear, and the one that does not is on
 * play/Combat IN COMBAT, a state no pass had ever entered. The run that finally
 * started combat read it at 5.73:1 against V-3's 7:1 numeral floor — a «Round»
 * badge, which is a counter, which is precisely what V-3 is a floor under.
 *
 * Every row was then computed rather than assumed (_g4-badge.mjs; alpha
 * compositing is exact, and its model came out 0.4 pessimistic-free of the
 * measured pixel, i.e. it under-reports the danger, which is the safe way to be
 * wrong). Worst ground of the two these sit on:
 *
 *     arcane    6.59:1  -> lit 9.07:1   below V-3           FIXED
 *     eldritch  3.85:1  -> lit 7.08:1   below V-2 and V-3   already fixed by A-23
 *     ember     6.15:1  -> lit 8.18:1   below V-3           FIXED  <- the measured one
 *     verdant   7.82:1                  clears both         LEFT ALONE
 *     gold      6.28:1                  below V-3 only      LEFT ALONE, deliberately
 *
 * `gold` is the one place this stops, and it stops on purpose. It clears V-2 as
 * text and only misses V-3, which governs numerals — and no gold badge in this
 * app currently prints one, so there is no measured defect here. Lighting it
 * would mean inventing `--color-gold-lit`, and adding a colour to satisfy a
 * rule nothing has failed is how a palette drifts. It is recorded in
 * TABLE-READY.md §14 instead: the first gold badge to carry a number reads
 * 6.28:1 and needs the token before it ships. `verdant` likewise has no `-lit`
 * token and does not need one. */
const variantStyles: Record<BadgeVariant, string> = {
  arcane:   'bg-arcane/15 text-arcane-lit border-arcane/25',
  eldritch: 'bg-eldritch/15 text-eldritch-lit border-eldritch/25',
  ember:    'bg-ember/15 text-ember-lit border-ember/25',
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
