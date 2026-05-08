import { useState, useRef, useEffect, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InlineExplainerProps {
  /** The mechanic/term being explained */
  term: string
  /** The explanation text shown in the popover */
  explanation: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InlineExplainer — renders a small (?) icon button inline with text.
 * On click, shows a glass-card tooltip/popover positioned above the button
 * with the mechanic explanation. Dismisses on click outside or Escape.
 */
export function InlineExplainer({ term, explanation }: InlineExplainerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // ── Position the popover above the button ──
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const updatePosition = useCallback(() => {
    if (!containerRef.current || !popoverRef.current) return

    const buttonRect = containerRef.current.getBoundingClientRect()
    const popoverEl = popoverRef.current

    // Calculate available space
    const viewportWidth = window.innerWidth
    const popoverWidth = Math.min(280, viewportWidth - 32) // 16px margin on each side

    // Center the popover above the button
    let left = buttonRect.left + buttonRect.width / 2 - popoverWidth / 2

    // Clamp to viewport edges with 16px margin
    if (left < 16) left = 16
    if (left + popoverWidth > viewportWidth - 16) left = viewportWidth - 16 - popoverWidth

    // Position above the button with 8px gap
    const top = buttonRect.top - 8

    setPopoverStyle({
      position: 'fixed',
      width: `${popoverWidth}px`,
      left: `${left}px`,
      bottom: `${window.innerHeight - top}px`,
    })

    // Hide if out of viewport
    if (popoverEl.getBoundingClientRect().top < 0) {
      // Flip below if no space above
      setPopoverStyle({
        position: 'fixed',
        width: `${popoverWidth}px`,
        left: `${left}px`,
        top: `${buttonRect.bottom + 8}px`,
      })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Delay to allow popover to render before measuring
      requestAnimationFrame(updatePosition)
    }
  }, [isOpen, updatePosition])

  // ── Click outside handler ──
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // Use setTimeout to avoid immediately closing from the same click that opened it
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ── Escape key handler ──
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <span ref={containerRef} className="inline-flex items-center relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Explain: ${term}`}
        aria-expanded={isOpen}
        className={cn(
          'inline-flex items-center justify-center',
          'min-h-[44px] min-w-[44px] -m-2.5 p-2.5', // Expand touch target while keeping visual size small
          'rounded-full',
          'text-forge-2 hover:text-arcane',
          'transition-all duration-200 ease-forge',
          'active:scale-90',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        )}
      >
        <HelpCircle size={14} aria-hidden />
      </button>

      {/* ── Popover ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="tooltip"
          aria-label={`Explanation for ${term}`}
          style={popoverStyle}
          className={cn(
            'z-[60]',
            'glass-card p-3 rounded-xl ornate-border',
            'border border-bronze/25',
            'shadow-[0_0_24px_-4px_rgba(197,165,90,0.15)]',
            'animate-fade-in',
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2',
              'bottom-[-6px]',
              'w-3 h-3 rotate-45',
              'bg-void-1 border-r border-b border-bronze/25',
            )}
            aria-hidden
          />

          {/* Content */}
          <p className="text-[11px] font-semibold text-arcane uppercase tracking-wider mb-1">
            {term}
          </p>
          <p className="text-xs text-forge-1 leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </span>
  )
}
