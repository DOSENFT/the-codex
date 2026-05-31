import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface OrnateDividerProps {
  /** Center ornament content (e.g. a diamond symbol or label text) */
  children?: ReactNode
  className?: string
}

/**
 * Divider with two gradient lines flanking an optional center ornament.
 * The CSS pseudo-elements on `.ornate-divider` handle the gradient lines;
 * children are placed in the gap between them.
 *
 * Without children the two lines meet in the center with no visible ornament.
 */
export function OrnateDivider({ children, className }: OrnateDividerProps) {
  return (
    <div className={cn('ornate-divider', className)} aria-hidden>
      {children}
    </div>
  )
}
