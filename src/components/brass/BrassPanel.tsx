import { cn } from '../../lib/cn'

type BrassPanelProps = {
  children: React.ReactNode
  className?: string
  glow?: 'none' | 'brass' | 'arcane' | 'damage' | 'heal'
}

const GLOW_CLASS: Record<NonNullable<BrassPanelProps['glow']>, string> = {
  none: '',
  brass: 'brass-panel-v2--brass',
  arcane: 'brass-panel-v2--arcane',
  damage: 'brass-panel-v2--damage',
  heal: 'brass-panel-v2--heal',
}

export function BrassPanel({ children, className, glow = 'brass' }: BrassPanelProps) {
  return (
    <div className={cn('brass-panel-v2', GLOW_CLASS[glow], 'p-4', className)}>
      {children}
    </div>
  )
}
