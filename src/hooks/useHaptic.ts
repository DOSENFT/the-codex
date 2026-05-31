import { useCallback } from 'react'

/**
 * Haptic feedback hook for mobile devices.
 * Respects prefers-reduced-motion.
 * Falls back silently when Vibration API is unavailable.
 */
export function useHaptic() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const vibrate = useCallback(
    (ms: number) => {
      if (canVibrate && !prefersReduced) {
        navigator.vibrate(ms)
      }
    },
    [canVibrate, prefersReduced],
  )

  /** Micro tap — toggle, pip, press acknowledgment */
  const tap = useCallback(() => vibrate(10), [vibrate])

  /** Commit — consequential action (spell cast, rest, expend resource) */
  const commit = useCallback(() => vibrate(15), [vibrate])

  return { tap, commit }
}
