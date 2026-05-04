import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ParchmentCardProps {
  children: ReactNode
  className?: string
}

/**
 * Dark-fantasy parchment card with warm radial gradient texture,
 * ember/gold border, and ornamental corner flourishes via pseudo-elements.
 */
export function ParchmentCard({ children, className }: ParchmentCardProps) {
  return (
    <div
      className={cn(
        'parchment-card relative p-5 rounded-xl',
        'border border-ember/25',
        'transition-all duration-300 ease-forge',
        className,
      )}
    >
      {/* Corner flourishes */}
      <span className="parchment-corner parchment-corner--tl" aria-hidden />
      <span className="parchment-corner parchment-corner--tr" aria-hidden />
      <span className="parchment-corner parchment-corner--bl" aria-hidden />
      <span className="parchment-corner parchment-corner--br" aria-hidden />
      {children}
    </div>
  )
}
