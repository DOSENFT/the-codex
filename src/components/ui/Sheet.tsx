import { type ReactNode } from 'react'
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
