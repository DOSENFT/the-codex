import { cn } from '../../lib/cn'

type BrassBadgeProps = {
  variant?: 'level' | 'oath' | 'default'
  children: React.ReactNode
  className?: string
}

export function BrassBadge({ variant = 'default', children, className }: BrassBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        'brass-panel-v2',
        variant === 'level' && 'min-w-[44px] min-h-[44px] px-2.5 py-1 justify-center',
        variant === 'oath' && 'px-3.5 py-2',
        variant === 'default' && 'px-3 py-1.5',
        className,
      )}
    >
      {children}
    </span>
  )
}
