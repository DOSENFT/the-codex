import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Enable hover glow and border lift effect */
  hover?: boolean
}

/**
 * Dark ornate card with gold/bronze border accents.
 * When `hover` is true the card gains a warm gold border brightening + shadow.
 */
export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card p-5 transition-all duration-300 ease-forge',
        hover && [
          'glass-card-hover cursor-pointer',
          'hover:shadow-[0_0_24px_-4px_rgba(197,165,90,0.12)]',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}
