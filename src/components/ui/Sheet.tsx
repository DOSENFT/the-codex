import { type ReactNode, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/cn'
import { SPRING_SETTLE, SHEET_EXIT } from '../../lib/motion-utils'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  /** Accessible dialog label */
  label: string
  side?: 'bottom' | 'right'
  /** Backdrop z-index; the panel renders at z + 1 */
  z?: number
  panelClassName?: string
  backdropClassName?: string
  children: ReactNode
}

/**
 * Physical overlay surface — one spring, one material, real enter AND exit.
 * Every sheet and drawer converges here so panels feel hinged to the same
 * world instead of spawned by separate CSS animations.
 *
 * SLICE 15 — it also owns the keyboard contract, and it did not before.
 *
 * This component declares `role="dialog" aria-modal="true"`, which is a promise
 * to a keyboard or screen-reader user that the rest of the page is inert and
 * that Escape gets them out. It was keeping neither half. MechanicsDrawer,
 * DiceRoller, ToyboxPanel, ActionMenu and the editors all hand-roll Escape and
 * a Tab trap; the three surfaces that were migrated onto this shared primitive
 * — the Settings drawer, the character sheet, and combat quick-lookup — lost
 * both in the move, silently, because losing a behaviour looks like nothing.
 *
 * A release proof caught it by pressing Escape on Settings and finding the
 * drawer still there, eating every subsequent click on the app underneath.
 *
 * It belongs here rather than in the three callers for the same reason the
 * spring does: a convention every caller must remember is a convention that is
 * already broken somewhere. Adding a fourth Sheet now costs no keyboard work.
 */
export function Sheet({
  isOpen,
  onClose,
  label,
  side = 'bottom',
  z = 50,
  panelClassName,
  backdropClassName,
  children,
}: SheetProps) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // ── Escape closes ──
  // Bound to the document, not the panel, because the panel is only focused on
  // open — one click into the page underneath a non-trapping sheet and a
  // panel-scoped listener would never hear the key.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── Focus in on open, back where it came from on close ──
  // Without the second half, closing the Settings drawer drops focus onto
  // <body> and the next Tab starts again from the top of the app.
  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      // After the panel has actually mounted; AnimatePresence renders it in
      // the same commit, but the ref is not attached until after this effect.
      requestAnimationFrame(() => panelRef.current?.focus())
    } else {
      returnFocusRef.current?.focus()
      returnFocusRef.current = null
    }
  }, [isOpen])

  // ── Tab stays inside ──
  // The literal meaning of aria-modal="true". Same focusable selector the
  // hand-rolled drawers use, so the two behave identically to a keyboard.
  useEffect(() => {
    if (!isOpen) return
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onTab)
    return () => document.removeEventListener('keydown', onTab)
  }, [isOpen])

  const closed = reduced
    ? { opacity: 0 }
    : side === 'bottom'
      ? { y: '100%' }
      : { x: '100%' }
  const open = { x: 0, y: 0, opacity: 1 }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className={cn('fixed inset-0 bg-black/60 backdrop-blur-[2px]', backdropClassName)}
            style={{ zIndex: z }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            style={{ zIndex: z + 1 }}
            className={cn(
              side === 'bottom'
                ? 'fixed inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain glass-card rounded-t-2xl border-b-0 outline-none'
                : 'fixed inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-void-1 border-l border-white/[0.08] shadow-2xl outline-none',
              panelClassName,
            )}
            initial={closed}
            animate={open}
            exit={{ ...closed, transition: SHEET_EXIT }}
            transition={SPRING_SETTLE}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
