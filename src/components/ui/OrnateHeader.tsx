import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface OrnateHeaderProps {
  children: ReactNode
  className?: string
}

/**
 * Centered Cinzel serif section header with ornamental line dividers
 * extending on both sides. Gold gradient lines fade to transparent.
 *
 * The word is 20px and not 14px because 20px is the Cinzel floor the design
 * system sets for itself (`--d-fs-title`, "nothing display-face is smaller")
 * and this component was the last place still under it — TABLE-READY V-4
 * measured 14px here. Uppercase Cinzel at 14px is a display face doing a
 * label's job: it stops being legible at arm's length in bad light and starts
 * being decoration, which is the one thing an ornament must not become.
 *
 * The tracking comes down from 0.12em to 0.08em as the size goes up. Letter-
 * spacing is compensation for small caps; at 20px the letterforms carry
 * themselves and the wide track would only cost the rules their room.
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
          'font-display text-xl font-semibold text-forge-0',
          'tracking-[0.08em] uppercase whitespace-nowrap',
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
