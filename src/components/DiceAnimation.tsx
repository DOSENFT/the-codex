import { cn } from '../lib/cn'

interface DiceAnimationProps {
  /** The final value shown on the die face */
  value: number
  /** The type of die (number of sides) — used for styling */
  dieType: number
  /** Whether the tumble animation is currently playing */
  isAnimating: boolean
}

/**
 * DiceAnimation — CSS-only animated die face component.
 *
 * When `isAnimating` is true, applies a tumble+bounce+land animation.
 * When false, shows the final value with a satisfying scale (diceLand) effect.
 * Renders as a rounded square with the value centered.
 */
export function DiceAnimation({ value, dieType, isAnimating }: DiceAnimationProps) {
  // Color based on die type for visual distinction
  const colorClass = getColorClass(dieType)

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'w-14 h-14 rounded-xl',
        'font-mono text-xl font-bold',
        'border select-none',
        'transition-colors duration-200',
        colorClass,
        isAnimating && 'animate-dice-tumble',
        !isAnimating && 'animate-dice-land',
      )}
      aria-label={`Die showing ${value}`}
      role="img"
    >
      {value}
    </div>
  )
}

/** Returns Tailwind classes for die color based on die type */
function getColorClass(dieType: number): string {
  switch (dieType) {
    case 20:
      return 'bg-arcane/15 text-arcane border-arcane/30'
    case 12:
      return 'bg-eldritch/15 text-eldritch border-eldritch/30'
    case 10:
      return 'bg-ember/15 text-ember border-ember/30'
    case 8:
      return 'bg-verdant/15 text-verdant border-verdant/30'
    case 6:
      return 'bg-forge-0/10 text-forge-0 border-forge-0/20'
    case 4:
      return 'bg-red-400/15 text-red-400 border-red-400/30'
    case 100:
      return 'bg-eldritch/15 text-eldritch border-eldritch/30'
    default:
      return 'bg-void-2/60 text-forge-0 border-gold/30'
  }
}
