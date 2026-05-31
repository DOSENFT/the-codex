import { cn } from '../../lib/cn'

interface HairlineDividerProps {
  className?: string
}

/**
 * Gold gradient hairline divider.
 * Renders as a 1px horizontal line fading from transparent to gold and back.
 * Pass className for width/margin overrides (e.g. `w-3/4`, `my-4`).
 */
export function HairlineDivider({ className }: HairlineDividerProps) {
  return <div className={cn('hairline-divider', className)} aria-hidden />
}
