import { LayoutList } from 'lucide-react'
import { cn } from '../../lib/cn'
import { GROUP_MODES, type GroupMode } from '../../lib/catalogue/group'

/* The four chips. Gate 1: "Multiple organization options, like a filter."
 *
 * ── WHY THIS DOES NOT LOOK LIKE THE FILTER CHIPS ABOVE IT ───────────────────
 * There are already three chip rows on this page and every one of them REMOVES
 * rows: Spells/Features, the action filters, Prepared. This row removes nothing
 * — it re-sorts the same 84 under different headings. Two controls that look
 * identical and do opposite things is how he ends up believing a view hid
 * something.
 *
 * So it is separated by a rule and a word ("Group by"), it is `gold` where the
 * filters are arcane/ember/verdant, and the selected chip is filled rather than
 * tinted. The count is deliberately NOT shown on these chips: a number next to
 * a chip, in this page's vocabulary, means "this many survive if you press it",
 * and every one of these would read 84.
 */

interface GroupSwitcherProps {
  mode: GroupMode
  onChange: (mode: GroupMode) => void
  /** Shown once, after the label — the conservation law, said out loud. */
  total: number
}

export function GroupSwitcher({ mode, onChange, total }: GroupSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-group-switcher>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-forge-2 shrink-0">
        <LayoutList size={12} aria-hidden />
        Group by
      </span>

      <div
        role="radiogroup"
        aria-label={`Group ${total} abilities by`}
        className="flex flex-wrap gap-2"
      >
        {GROUP_MODES.map(({ mode: m, label }) => {
          const on = m === mode
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              data-group-mode={m}
              onClick={() => onChange(m)}
              className={cn(
                'min-h-[48px] px-3.5 rounded-lg text-xs font-medium',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                on
                  ? [
                      'bg-gold/20 text-gold border-gold/40 font-semibold',
                      'shadow-[0_0_12px_-4px_rgba(197,165,90,0.35)]',
                    ]
                  : 'bg-white/[0.03] text-forge-1 border-white/8 hover:bg-white/[0.06] hover:text-forge-0',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* The heading over each group.
 *
 * Sticky, because the whole point of a grouping is knowing which pile you are
 * looking at, and at 390px wide a level-4 spell is four scrolls below the words
 * "Level 4 spells". `top-0` and not a magic offset — the page has no fixed
 * chrome above the list on this tab.
 *
 * The count is on the heading rather than on the chips for the reason in the
 * block above: here it says "this heading holds nine of them", which is true,
 * and the nine headings add to 84, which is the claim slice 4 exists to make. */
export function GroupHeading({ label, count }: { label: string; count: number }) {
  return (
    <h3
      data-group-heading={label}
      data-group-count={count}
      className={cn(
        'sticky top-0 z-10 -mx-1 px-1 py-1.5',
        'flex items-baseline gap-2',
        'bg-void-0/95 backdrop-blur-sm',
      )}
    >
      <span className="font-display text-sm font-semibold text-forge-0">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-forge-2">{count}</span>
      <span className="flex-1 h-px bg-white/8 self-center" aria-hidden />
    </h3>
  )
}
