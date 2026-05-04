import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type HexVariant = 'arcane' | 'ember' | 'verdant' | 'eldritch'

interface HexFrameProps {
  children: ReactNode
  className?: string
  variant?: HexVariant
}

const variantStyles: Record<HexVariant, string> = {
  arcane: 'bg-arcane/10 border-arcane/30 text-arcane',
  ember: 'bg-ember/10 border-ember/30 text-ember',
  verdant: 'bg-verdant/10 border-verdant/30 text-verdant',
  eldritch: 'bg-eldritch/10 border-eldritch/30 text-eldritch',
}

/**
 * Hexagonal frame via CSS clip-path for scores, avatars, and icons.
 * Supports four color variants matching the design system accents.
 */
export function HexFrame({ children, className, variant = 'arcane' }: HexFrameProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'w-16 h-16',
        variantStyles[variant],
        className,
      )}
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    >
      {children}
    </div>
  )
}
