import { useState, useCallback } from 'react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import { ChevronRight } from 'lucide-react'

interface InlineDiceSectionProps {
  character: Character
  onOpenFullRoller: () => void
}

type AdvantageMode = 'adv' | 'normal' | 'dis'

interface RollResult {
  total: number
  dice: number[]
  natural?: number
}

const DIE_TYPES = [4, 6, 8, 10, 12, 20] as const

function rollDice(sides: number, count: number = 1): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
}

function formatDieLabel(sides: number): string {
  return `d${sides}`
}

export function InlineDiceSection({ character, onOpenFullRoller }: InlineDiceSectionProps) {
  const [selectedDie, setSelectedDie] = useState(20)
  const [advantage, setAdvantage] = useState<AdvantageMode>('normal')
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null)
  const [rolling, setRolling] = useState(false)

  const performRoll = useCallback(
    (sides: number, advMode: AdvantageMode) => {
      setRolling(true)

      // Brief animation delay
      setTimeout(() => {
        let dice: number[]
        let total: number
        let natural: number | undefined

        if (sides === 20 && advMode !== 'normal') {
          // Roll 2d20 for advantage/disadvantage
          dice = rollDice(20, 2)
          if (advMode === 'adv') {
            total = Math.max(dice[0], dice[1])
            natural = total
          } else {
            total = Math.min(dice[0], dice[1])
            natural = total
          }
        } else if (sides === 20) {
          dice = rollDice(20, 1)
          total = dice[0]
          natural = dice[0]
        } else {
          dice = rollDice(sides, 1)
          total = dice[0]
        }

        setLastRoll({ total, dice, natural })
        setRolling(false)
      }, 200)
    },
    [],
  )

  const handleDieSelect = useCallback(
    (sides: number) => {
      setSelectedDie(sides)
      performRoll(sides, advantage)
    },
    [advantage, performRoll],
  )

  const handleAdvantageChange = useCallback(
    (mode: AdvantageMode) => {
      setAdvantage(mode)
    },
    [],
  )

  const isNat20 = lastRoll?.natural === 20 && selectedDie === 20
  const isNat1 = lastRoll?.natural === 1 && selectedDie === 20

  // Build notation string
  const notation = (() => {
    if (selectedDie === 20 && advantage === 'adv') return '2d20kh1'
    if (selectedDie === 20 && advantage === 'dis') return '2d20kl1'
    return `1d${selectedDie}`
  })()

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ADV/Normal/DIS Toggle - only shown for d20 */}
      {selectedDie === 20 && (
        <div className="flex items-center gap-1">
          {(
            [
              { mode: 'adv' as const, label: 'ADV' },
              { mode: 'normal' as const, label: '\u2014' },
              { mode: 'dis' as const, label: 'DIS' },
            ] as const
          ).map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleAdvantageChange(mode)}
              className={cn(
                'min-h-[44px] min-w-[44px] px-3 py-1 rounded-full',
                'text-[10px] font-mono font-bold uppercase',
                'transition-all duration-150',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1',
                advantage === mode
                  ? 'bg-arcane/20 border border-arcane/40 text-arcane'
                  : 'bg-ash-mid/60 border border-gold-dim/20 text-ink-muted',
              )}
              aria-label={
                mode === 'adv'
                  ? 'Roll with advantage'
                  : mode === 'dis'
                    ? 'Roll with disadvantage'
                    : 'Roll normally'
              }
              aria-pressed={advantage === mode}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Dice Display - Diamond Shape */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => performRoll(selectedDie, advantage)}
          className={cn(
            'dice-display',
            'w-16 h-16 rotate-45',
            'border-2 rounded-lg',
            'flex items-center justify-center',
            'transition-all duration-200',
            'active:scale-[0.9]',
            'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
            isNat20
              ? 'border-arcane/60 bg-arcane/10 shadow-[0_0_20px_rgba(212,167,74,0.3)]'
              : isNat1
                ? 'border-red-400/60 bg-red-400/10 shadow-[0_0_20px_rgba(248,113,113,0.3)]'
                : 'border-gold/30 bg-ash-mid/80',
          )}
          aria-label={`Roll ${notation}`}
        >
          <span
            className={cn(
              'dice-display-value',
              '-rotate-45',
              'font-display text-2xl font-bold',
              'transition-all duration-200',
              rolling && 'opacity-30 scale-75',
              !rolling && lastRoll && 'animate-dice-land',
              isNat20 && 'text-arcane drop-shadow-[0_0_8px_rgba(212,167,74,0.8)]',
              isNat1 && 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]',
              !isNat20 && !isNat1 && 'text-ink-primary',
            )}
          >
            {rolling ? '\u00B7\u00B7\u00B7' : lastRoll ? lastRoll.total : '\u2014'}
          </span>
        </button>

        {/* Nat 20 / Nat 1 labels */}
        {!rolling && isNat20 && (
          <span className="text-[10px] font-mono font-bold text-arcane uppercase tracking-widest mt-1">
            Nat 20
          </span>
        )}
        {!rolling && isNat1 && (
          <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest mt-1">
            Nat 1
          </span>
        )}

        {/* Notation below diamond */}
        <span className="text-[10px] font-mono text-ink-muted mt-1">{notation}</span>

        {/* Individual dice shown for advantage/disadvantage */}
        {lastRoll && selectedDie === 20 && advantage !== 'normal' && !rolling && (
          <span className="text-[10px] font-mono text-ink-muted/60">
            ({lastRoll.dice.join(', ')})
          </span>
        )}
      </div>

      {/* Die Type Selector */}
      <div className="flex items-center gap-1">
        {DIE_TYPES.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => handleDieSelect(sides)}
            className={cn(
              'min-h-[36px] min-w-[36px] rounded-lg',
              'text-[10px] font-mono font-bold',
              'transition-all duration-150',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1',
              selectedDie === sides
                ? 'bg-arcane/15 border border-arcane/30 text-arcane'
                : 'bg-ash-mid/60 border border-gold-dim/20 text-ink-muted hover:border-gold-dim/40',
            )}
            aria-label={`Select ${formatDieLabel(sides)}`}
            aria-pressed={selectedDie === sides}
          >
            {formatDieLabel(sides)}
          </button>
        ))}
      </div>

      {/* Expand to Full Roller */}
      <button
        type="button"
        onClick={onOpenFullRoller}
        className={cn(
          'flex items-center gap-0.5',
          'text-[10px] text-ink-muted hover:text-arcane',
          'transition-colors duration-150',
          'min-h-[44px]',
          'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1',
        )}
      >
        Full Roller
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}
