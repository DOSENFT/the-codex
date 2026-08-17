import { useState, useEffect, useRef, useCallback } from 'react'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../../lib/cn'

interface RestManagementProps {
  onShortRest: () => void
  onLongRest: () => void
}

/** Duration (ms) before the confirm state auto-resets. */
const CONFIRM_TIMEOUT = 3000

/* ── Seal Ornament SVGs ── */

/** Crescent moon wax-seal mark for Short Rest */
function MoonSeal() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-1 opacity-40">
      <path d="M13 3a7 7 0 1 0 0 14 5 5 0 0 1 0-14z" fill="currentColor" />
    </svg>
  )
}

/** Sun/star wax-seal mark for Long Rest */
function SunSeal() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-1 opacity-40">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="10" y1="16" x2="10" y2="19" />
        <line x1="1" y1="10" x2="4" y2="10" />
        <line x1="16" y1="10" x2="19" y2="10" />
        <line x1="3.5" y1="3.5" x2="5.6" y2="5.6" />
        <line x1="14.4" y1="14.4" x2="16.5" y2="16.5" />
        <line x1="3.5" y1="16.5" x2="5.6" y2="14.4" />
        <line x1="14.4" y1="5.6" x2="16.5" y2="3.5" />
      </g>
    </svg>
  )
}

/**
 * Two-tap rest cards for Short Rest and Long Rest.
 * First tap enters a confirmation state with a gold highlight.
 * Second tap within 3 seconds executes the rest.
 * Auto-resets if the user does not confirm in time.
 */
export function RestManagement({ onShortRest, onLongRest }: RestManagementProps) {
  const [shortConfirm, setShortConfirm] = useState(false)
  const [longConfirm, setLongConfirm] = useState(false)
  const shortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (shortTimerRef.current) clearTimeout(shortTimerRef.current)
      if (longTimerRef.current) clearTimeout(longTimerRef.current)
    }
  }, [])

  // Auto-reset short rest confirmation after timeout
  useEffect(() => {
    if (!shortConfirm) return
    shortTimerRef.current = setTimeout(() => {
      setShortConfirm(false)
    }, CONFIRM_TIMEOUT)
    return () => {
      if (shortTimerRef.current) clearTimeout(shortTimerRef.current)
    }
  }, [shortConfirm])

  // Auto-reset long rest confirmation after timeout
  useEffect(() => {
    if (!longConfirm) return
    longTimerRef.current = setTimeout(() => {
      setLongConfirm(false)
    }, CONFIRM_TIMEOUT)
    return () => {
      if (longTimerRef.current) clearTimeout(longTimerRef.current)
    }
  }, [longConfirm])

  const handleShortRest = useCallback(() => {
    if (!shortConfirm) {
      setShortConfirm(true)
      setLongConfirm(false) // Reset other card
      return
    }
    // Second tap — execute
    setShortConfirm(false)
    onShortRest()
  }, [shortConfirm, onShortRest])

  const handleLongRest = useCallback(() => {
    if (!longConfirm) {
      setLongConfirm(true)
      setShortConfirm(false) // Reset other card
      return
    }
    // Second tap — execute
    setLongConfirm(false)
    onLongRest()
  }, [longConfirm, onLongRest])

  return (
    <div>
      {/* Section Header — gold gradient text, no combat-section-header wrapper */}
      <h3 className="gold-gradient-text font-display text-[0.65rem] font-semibold uppercase tracking-[0.12em] mb-2">
        Rest Management
      </h3>

      {/* Two Cards Side by Side — motion entrance */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        {/* Short Rest Card */}
        <button
          type="button"
          onClick={handleShortRest}
          className={cn(
            'rest-card-v3',
            shortConfirm && 'rest-card-v3-confirm',
            'focus-visible:outline-2 focus-visible:outline-gold',
          )}
          aria-label={shortConfirm ? 'Confirm short rest' : 'Short rest'}
        >
          {shortConfirm ? (
            <>
              <span className="text-gold-dim"><MoonSeal /></span>
              <Moon size={20} className="text-arcane shrink-0" />
              <span className="font-display text-xs font-bold text-arcane uppercase tracking-wider">
                Confirm?
              </span>
              <span className="text-xs text-arcane/80">
                Tap again to rest
              </span>
            </>
          ) : (
            <>
              <span className="text-gold-dim"><MoonSeal /></span>
              <Moon size={20} className="text-arcane shrink-0" />
              <span className="font-display text-xs font-bold text-ink-primary uppercase tracking-wider">
                Short Rest
              </span>
              <span className="text-xs text-ink-muted leading-tight">
                Reset Arcane Recovery
                <br />
                &amp; some resources
              </span>
            </>
          )}
        </button>

        {/* Long Rest Card */}
        <button
          type="button"
          onClick={handleLongRest}
          className={cn(
            'rest-card-v3',
            longConfirm && 'rest-card-v3-confirm',
            'focus-visible:outline-2 focus-visible:outline-gold',
          )}
          aria-label={longConfirm ? 'Confirm long rest' : 'Long rest'}
        >
          {longConfirm ? (
            <>
              <span className="text-gold-dim"><SunSeal /></span>
              <Sun size={20} className="text-ember shrink-0" />
              <span className="font-display text-xs font-bold text-arcane uppercase tracking-wider">
                Confirm?
              </span>
              <span className="text-xs text-arcane/80">
                Tap again to rest
              </span>
            </>
          ) : (
            <>
              <span className="text-gold-dim"><SunSeal /></span>
              <Sun size={20} className="text-ember shrink-0" />
              <span className="font-display text-xs font-bold text-ink-primary uppercase tracking-wider">
                Long Rest
              </span>
              <span className="text-xs text-ink-muted leading-tight">
                Reset all resources
                <br />
                &amp; spell slots &middot; Stabilize
              </span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}
