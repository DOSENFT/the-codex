import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { SPELL_SIGILS } from '../../assets/sigils'
import { cn } from '../../lib/cn'
import { useHaptic } from '../../hooks/useHaptic'

interface SpellSlotSigilsProps {
  spellSlots: Record<number, { max: number; current: number }>
  onExpend: (level: number) => void
  onRestore: (level: number) => void
}

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
}

/**
 * Tracks per-sigil animation phase.
 * - 'idle' = no animation running
 * - 'expending' = ember flash + smoke wisp playing
 * - 'restoring' = rekindle sweep playing
 */
type AnimPhase = 'idle' | 'expending' | 'restoring'

/**
 * Key for identifying a specific sigil button within the grid.
 * Format: `${level}-${slotIndex}`
 */
function sigilKey(level: number, index: number): string {
  return `${level}-${index}`
}

export function SpellSlotSigils({
  spellSlots,
  onExpend,
  onRestore,
}: SpellSlotSigilsProps) {
  const { commit } = useHaptic()

  // Track animation phase per individual sigil
  const [animating, setAnimating] = useState<Record<string, AnimPhase>>({})

  // Timeout refs so we can clean up on unmount
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timeoutsRef.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  const setPhase = useCallback((key: string, phase: AnimPhase) => {
    setAnimating((prev) => ({ ...prev, [key]: phase }))
  }, [])

  const scheduleIdle = useCallback(
    (key: string, delayMs: number) => {
      // Clear any existing timeout for this key
      const existing = timeoutsRef.current.get(key)
      if (existing) clearTimeout(existing)

      const t = setTimeout(() => {
        setPhase(key, 'idle')
        timeoutsRef.current.delete(key)
      }, delayMs)
      timeoutsRef.current.set(key, t)
    },
    [setPhase],
  )

  const handleTap = useCallback(
    (level: number, slotIndex: number, isAvailable: boolean) => {
      const key = sigilKey(level, slotIndex)
      const currentPhase = animating[key] ?? 'idle'

      // Don't interrupt an in-progress animation
      if (currentPhase !== 'idle') return

      if (isAvailable) {
        // Expend: fire callback, run animation
        setPhase(key, 'expending')
        onExpend(level)
        commit()
        // Smoke wisp is longest at 400ms; pad slightly for visual completion
        scheduleIdle(key, 450)
      } else {
        // Restore: fire callback, run animation
        setPhase(key, 'restoring')
        onRestore(level)
        commit()
        // Rekindle sweep is 300ms
        scheduleIdle(key, 350)
      }
    },
    [animating, commit, onExpend, onRestore, scheduleIdle, setPhase],
  )

  // Filter & sort active levels
  const activeLevels = Object.entries(spellSlots)
    .map(([level, slot]) => ({ level: Number(level), ...slot }))
    .filter((entry) => entry.max > 0)
    .sort((a, b) => a.level - b.level)

  if (activeLevels.length === 0) return null

  return (
    <motion.div
      className="flex flex-col gap-2"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {/* Slot Rows — The Sigil Registry */}
      {activeLevels.map(({ level, max, current }) => {
        const Sigil = SPELL_SIGILS[level]

        return (
          <motion.div
            key={level}
            className="flex items-center gap-0"
            variants={{
              hidden: { opacity: 0, x: -12 },
              visible: {
                opacity: 1,
                x: 0,
                transition: {
                  duration: 0.35,
                  ease: [0.25, 0.46, 0.45, 0.94],
                },
              },
            }}
          >
            {/* Roman numeral level label — grimoire chapter number */}
            <span
              className={cn(
                'text-xs font-bold gold-gradient-text',
                'tracking-[0.1em] leading-none',
                'w-8 shrink-0 text-right pr-2',
                'select-none',
              )}
            >
              {ROMAN_NUMERALS[level] ?? `${level}`}
            </span>

            {/* Manuscript margin marker — vertical hairline */}
            <span
              className="shrink-0 w-px self-stretch bg-gold-dim/20"
              aria-hidden
            />

            {/* Sigil Buttons */}
            <div className="flex items-center gap-1 flex-1 pl-2">
              {Array.from({ length: max }, (_, i) => {
                const key = sigilKey(level, i)
                const isAvailable = i < current
                const phase = animating[key] ?? 'idle'

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTap(level, i, isAvailable)}
                    className={cn(
                      'relative min-h-[44px] min-w-[44px] p-0',
                      'flex items-center justify-center',
                      'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1',
                      'cursor-pointer',
                      'active:scale-[0.95]',
                      'transition-transform duration-[var(--duration-micro)] ease-[var(--ease-snap)]',
                    )}
                    aria-label={
                      isAvailable
                        ? `Expend level ${level} spell slot`
                        : `Restore level ${level} spell slot`
                    }
                  >
                    {/* Atmospheric halo — ambient glow for available sigils */}
                    {isAvailable && (
                      <span
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle, oklch(0.72 0.10 80 / 0.04) 0%, transparent 70%)',
                        }}
                        aria-hidden
                      />
                    )}

                    {/* Ember flash overlay (expend animation) */}
                    {phase === 'expending' && (
                      <span
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle, var(--color-ember) 0%, transparent 70%)',
                          filter: 'blur(12px)',
                          animation: 'emberFlash 150ms var(--ease-snap) forwards',
                        }}
                        aria-hidden
                      />
                    )}

                    {/* Smoke wisp (expend animation) */}
                    {phase === 'expending' && (
                      <span
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse, var(--color-ink-ghost) 0%, transparent 70%)',
                          animation: 'smokeWisp 400ms var(--ease-settle) forwards',
                        }}
                        aria-hidden
                      />
                    )}

                    {/* Rekindle sweep (restore animation) */}
                    {phase === 'restoring' && (
                      <span
                        className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
                        aria-hidden
                      >
                        <span
                          className="absolute inset-y-0 w-1"
                          style={{
                            background: 'var(--color-gold-bright)',
                            opacity: 0.3,
                            animation: 'rekindleSweep 300ms var(--ease-snap) forwards',
                          }}
                        />
                      </span>
                    )}

                    {/* The Sigil — 32px, up from 28px */}
                    {Sigil && (
                      <span
                        className={cn(
                          'inline-flex w-8 h-8',
                          isAvailable
                            ? 'text-ink-primary opacity-100'
                            : 'text-ink-ghost opacity-20',
                        )}
                        style={{
                          transition: 'color 200ms var(--ease-snap), opacity 200ms var(--ease-snap)',
                        }}
                      >
                        <Sigil className="w-full h-full" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Count — right-aligned, micro parchment-card badge */}
            <span
              className={cn(
                'font-mono text-xs text-ink-muted',
                'shrink-0 tabular-nums',
                'pl-2 w-10 text-right',
                'bg-ash-mid rounded px-1.5 py-0.5',
              )}
              style={{
                boxShadow: 'inset 0 0 0 1px oklch(0.55 0.07 75 / 0.15)',
              }}
            >
              {current}/{max}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
