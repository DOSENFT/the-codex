import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Enable hover glow and border lift effect */
  hover?: boolean
}

/**
 * Glass-morphism card built on the `.glass-card` base class from index.css.
 * When `hover` is true the card gains a subtle border brightening + shadow
 * on hover via the `.glass-card-hover` utility and an arcane glow ring.
 */
export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card p-5 transition-all duration-300 ease-forge',
        hover && [
          'glass-card-hover cursor-pointer',
          'hover:shadow-[0_0_24px_-4px_rgba(61,210,255,0.12)]',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}
