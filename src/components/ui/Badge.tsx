import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'arcane' | 'eldritch' | 'ember' | 'verdant' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  arcane:   'bg-arcane/15 text-arcane border-arcane/25',
  eldritch: 'bg-eldritch/15 text-eldritch border-eldritch/25',
  ember:    'bg-ember/15 text-ember border-ember/25',
  verdant:  'bg-verdant/15 text-verdant border-verdant/25',
  neutral:  'bg-white/8 text-forge-1 border-white/10',
}

/**
 * Color-coded pill badge for status indicators, tags, and labels.
 * Each variant maps to a project accent color with a subtle tinted background.
 */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center',
        'rounded-full border px-2.5 py-0.5',
        'text-xs font-medium leading-none whitespace-nowrap',
        'select-none',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
