import { cn } from '../../lib/cn'

interface SpellSlotPipsProps {
  spellSlots: Record<number, { max: number; current: number }>
  onExpend: (level: number) => void
  onRestore: (level: number) => void
}

const LEVEL_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th',
  7: '7th',
  8: '8th',
  9: '9th',
}

export function SpellSlotPips({ spellSlots, onExpend, onRestore }: SpellSlotPipsProps) {
  // Filter to levels that actually have slots
  const activeLevels = Object.entries(spellSlots)
    .map(([level, slot]) => ({ level: Number(level), ...slot }))
    .filter((entry) => entry.max > 0)
    .sort((a, b) => a.level - b.level)

  // Return null if no spell slots exist
  if (activeLevels.length === 0) return null

  return (
    <div className="bg-ash-warm/80 border border-gold/15 rounded-xl p-3">
      {/* Header */}
      <h3 className="text-xs font-mono font-bold uppercase tracking-[0.15em] text-ink-muted mb-2">
        Spell Slots
      </h3>

      {/* Slot Rows */}
      <div className="flex flex-col gap-1">
        {activeLevels.map(({ level, max, current }) => (
          <div key={level} className="flex items-center gap-2">
            {/* Level Label */}
            <span className="text-xs font-mono text-ink-muted w-6 shrink-0">
              {LEVEL_LABELS[level] ?? `${level}th`}
            </span>

            {/* Pip Buttons */}
            <div className="flex items-center gap-0.5 flex-1">
              {Array.from({ length: max }, (_, i) => {
                const isFilled = i < current
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (isFilled) {
                        onExpend(level)
                      } else {
                        onRestore(level)
                      }
                    }}
                    className={cn(
                      'min-h-[44px] min-w-[44px] p-0 flex items-center justify-center',
                      'transition-all duration-150',
                      'active:scale-[0.9]',
                      'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1',
                    )}
                    aria-label={
                      isFilled
                        ? `Expend level ${level} spell slot`
                        : `Restore level ${level} spell slot`
                    }
                  >
                    {isFilled ? (
                      /* Available (filled) pip */
                      <span className="w-5 h-5 rounded-full bg-eldritch/30 border-2 border-eldritch/60 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-eldritch shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                      </span>
                    ) : (
                      /* Expended (empty) pip */
                      <span className="w-5 h-5 rounded-full bg-gold/[0.03] border border-gold-dim/25" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Count */}
            <span className="text-xs font-mono text-ink-muted shrink-0">
              {current}/{max}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
