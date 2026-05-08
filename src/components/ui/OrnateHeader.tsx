import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface OrnateHeaderProps {
  children: ReactNode
  className?: string
}

/**
 * Centered Cinzel serif section header with ornamental line dividers
 * extending on both sides. Gold gradient lines fade to transparent.
 */
export function OrnateHeader({ children, className }: OrnateHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="flex-1 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--color-gold) 100%)',
          opacity: 0.4,
        }}
        aria-hidden
      />
      <h3
        className={cn(
          'font-display text-sm font-semibold text-forge-0',
          'tracking-[0.12em] uppercase whitespace-nowrap',
        )}
      >
        {children}
      </h3>
      <div
        className="flex-1 h-px"
        style={{
          background:
            'linear-gradient(90deg, var(--color-gold) 0%, transparent 100%)',
          opacity: 0.4,
        }}
        aria-hidden
      />
    </div>
  )
}
