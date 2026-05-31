import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { HairlineDivider } from './HairlineDivider'

interface SectionHeaderProps {
  children: ReactNode
  className?: string
  /** Hide the preceding divider (rare, for first section in a container) */
  hideDivider?: boolean
}

/**
 * Cinzel uppercase tracked section header, preceded by a hairline divider.
 * Per aesthetic rules: "Section headers are ALWAYS preceded by a hairline divider."
 * Set `hideDivider` to suppress the divider for the first section in a container.
 */
export function SectionHeader({ children, className, hideDivider = false }: SectionHeaderProps) {
  return (
    <>
      {!hideDivider && <HairlineDivider className="mt-3" />}
      <h3 className={cn('section-header', !hideDivider && 'mt-3', 'mb-2', className)}>
        {children}
      </h3>
    </>
  )
}
