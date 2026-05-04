import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface OrnateHeaderProps {
  children: ReactNode
  className?: string
}

/**
 * Serif font section header with a decorative flourish line below.
 * Uses Playfair Display via the .font-lore utility and a gradient
 * border that fades from ember through gold to transparent.
 */
export function OrnateHeader({ children, className }: OrnateHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h3
        className={cn(
          'font-lore text-lg font-semibold text-forge-0',
          'tracking-wide',
        )}
      >
        {children}
      </h3>
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, var(--color-ember) 0%, rgba(244,181,69,0.4) 40%, transparent 100%)',
        }}
        aria-hidden
      />
    </div>
  )
}
