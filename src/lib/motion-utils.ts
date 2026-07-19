/**
 * Motion library animation variants — v3 choreography system.
 * Keeps animation config DRY across combat components.
 * Uses the design system's easing tokens.
 */

/** Easing curves matching CSS custom properties */
const EASE_SETTLE = [0.22, 1, 0.36, 1] as const
const EASE_CEREMONY = [0.65, 0, 0.35, 1] as const

/** Physical springs — surfaces settle like objects with mass, never teleport */
export const SPRING_SETTLE = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 } as const
export const SPRING_SNAP = { type: 'spring', stiffness: 520, damping: 42 } as const

/** Exit for sheets/drawers — leaving is quicker than arriving, like setting a tool down */
export const SHEET_EXIT = { duration: 0.22, ease: [0.4, 0, 1, 1] } as const

/** Reveal-up: element slides from y:12px to y:0 with fade */
export const revealUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: EASE_SETTLE },
}

/** Container that staggers its children's entrance */
export const staggerContainer = (staggerMs = 80) => ({
  animate: {
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  },
})

/** Child variant for use inside a stagger container */
export const staggerChild = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE_SETTLE },
  },
}

/** Ceremony-tier entrance — slower, for ritual moments */
export const ceremonyReveal = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.48, ease: EASE_CEREMONY },
}

/** Gold pulse — brief flash for toggle feedback */
export const goldPulse = {
  initial: { opacity: 0 },
  animate: { opacity: [0, 0.15, 0] },
  transition: { duration: 0.15, ease: 'easeOut' },
}

/** Slide in from right — for initiative entries */
export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2, ease: EASE_SETTLE },
}

/** Scale reveal — portrait entrance */
export const scaleReveal = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.28, ease: EASE_SETTLE },
}

// ═══════════════════════════════════════════════════════════════════════
// Block 1 — Staggered Entry System (Phase 5)
// ═══════════════════════════════════════════════════════════════════════

/** Parent container — staggers its Block 1 surface children */
export const block1Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
}

/** Child variant for Block 1 surfaces (CharacterCard, VitalsRow, etc.) */
export const surfaceVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_SETTLE,
    },
  },
}

/** Grid container — staggers its panel/button children */
export const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
}

/** Panel child inside a grid container */
export const panelVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: EASE_SETTLE },
  },
}
