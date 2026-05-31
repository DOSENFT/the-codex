import { useReducedMotion } from 'motion/react'

/**
 * Shared motion preference hook.
 * Wraps motion's useReducedMotion so every component respects
 * prefers-reduced-motion in a consistent way.
 */
export function useMotionPreference() {
  const shouldReduceMotion = useReducedMotion()

  return {
    shouldReduceMotion: !!shouldReduceMotion,
    /** Safe transition: instant when reduced motion preferred */
    transition: shouldReduceMotion ? { duration: 0 } : undefined,
  }
}
