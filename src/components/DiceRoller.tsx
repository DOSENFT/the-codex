import { useState, useCallback, useEffect, useRef } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { GlassCard } from './ui/GlassCard'

/* ─── Types ─── */

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100
type AdvantageState = 'normal' | 'advantage' | 'disadvantage'

interface DiceRollerProps {
  isOpen: boolean
  onClose: () => void
}

interface RollResult {
  id: number
  dieType: DieType
  quantity: number
  modifier: number
  advantage: AdvantageState
  /** Individual die values (before advantage filtering) */
  rawDice: number[]
  /** Individual die values used in the total (after advantage filtering) */
  keptDice: number[]
  /** Dice that were dropped by advantage/disadvantage */
  droppedDice: number[]
  total: number
}

/* ─── Constants ─── */

const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20, 100]

const DIE_LABELS: Record<DieType, string> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
  100: 'd100',
}

const MAX_QUANTITY = 10
const MIN_QUANTITY = 1
const MAX_MODIFIER = 20
const MIN_MODIFIER = -20
const MAX_HISTORY = 5
const ROLL_ANIMATION_MS = 400

interface QuickPreset {
  label: string
  dieType: DieType
  quantity: number
  modifier: number
  advantage: AdvantageState
  immediate: boolean
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: 'd20', dieType: 20, quantity: 1, modifier: 0, advantage: 'normal', immediate: true },
  { label: 'd20+mod', dieType: 20, quantity: 1, modifier: 0, advantage: 'normal', immediate: false },
  { label: '2d6', dieType: 6, quantity: 2, modifier: 0, advantage: 'normal', immediate: true },
]

/* ─── Utility Functions ─── */

function rollDie(sides: DieType): number {
  return Math.floor(Math.random() * sides) + 1
}

function rollDice(
  dieType: DieType,
  quantity: number,
  modifier: number,
  advantage: AdvantageState,
): Omit<RollResult, 'id'> {
  let rawDice: number[]
  let keptDice: number[]
  let droppedDice: number[] = []

  if (dieType === 20 && advantage !== 'normal' && quantity === 1) {
    // Roll 2d20, keep higher or lower
    const die1 = rollDie(20)
    const die2 = rollDie(20)
    rawDice = [die1, die2]

    if (advantage === 'advantage') {
      const kept = Math.max(die1, die2)
      const dropped = Math.min(die1, die2)
      keptDice = [kept]
      droppedDice = [dropped]
    } else {
      const kept = Math.min(die1, die2)
      const dropped = Math.max(die1, die2)
      keptDice = [kept]
      droppedDice = [dropped]
    }
  } else {
    rawDice = Array.from({ length: quantity }, () => rollDie(dieType))
    keptDice = rawDice
  }

  const diceSum = keptDice.reduce((sum, val) => sum + val, 0)

  return {
    dieType,
    quantity,
    modifier,
    advantage,
    rawDice,
    keptDice,
    droppedDice,
    total: diceSum + modifier,
  }
}

/** Format a roll as "2d6+3" style notation */
function formatRollNotation(quantity: number, dieType: DieType, modifier: number): string {
  let notation = `${quantity}d${dieType}`
  if (modifier > 0) notation += `+${modifier}`
  else if (modifier < 0) notation += `${modifier}`
  return notation
}

/* ─── Sub-Components ─── */

function DragHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1" aria-hidden>
      <div className="w-10 h-1 rounded-full bg-forge-2/40" />
    </div>
  )
}

function DieButton({
  die,
  selected,
  onSelect,
}: {
  die: DieType
  selected: boolean
  onSelect: (die: DieType) => void
}) {
  return (
    <button
      type="button"
      aria-label={`Select ${DIE_LABELS[die]}`}
      aria-pressed={selected}
      onClick={() => onSelect(die)}
      className={cn(
        'min-h-[44px] min-w-[44px] px-2.5 rounded-xl',
        'font-mono text-sm font-semibold',
        'transition-all duration-200 ease-forge',
        'active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        selected
          ? 'bg-arcane/20 text-arcane border border-arcane/40 shadow-[0_0_12px_-2px_rgba(61,210,255,0.3)]'
          : 'bg-white/[0.04] text-forge-1 border border-white/10 hover:bg-white/[0.08] hover:text-forge-0',
      )}
    >
      {DIE_LABELS[die]}
    </button>
  )
}

function StepperControl({
  label,
  value,
  min,
  max,
  onChange,
  formatValue,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}) {
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-forge-1 select-none">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
            'bg-white/[0.04] border border-white/10 text-forge-1',
            'transition-all duration-200 ease-forge',
            'hover:bg-white/[0.08] hover:text-forge-0',
            'active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
        >
          <Minus size={18} aria-hidden />
        </button>

        <span
          className="min-w-[3rem] text-center font-mono text-lg font-semibold text-forge-0 select-none"
          aria-live="polite"
        >
          {displayValue}
        </span>

        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
            'bg-white/[0.04] border border-white/10 text-forge-1',
            'transition-all duration-200 ease-forge',
            'hover:bg-white/[0.08] hover:text-forge-0',
            'active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function AdvantageToggle({
  value,
  onChange,
}: {
  value: AdvantageState
  onChange: (v: AdvantageState) => void
}) {
  const options: { state: AdvantageState; label: string }[] = [
    { state: 'normal', label: 'Normal' },
    { state: 'advantage', label: 'Advantage' },
    { state: 'disadvantage', label: 'Disadvantage' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-forge-1 select-none">Roll Mode</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Advantage mode">
        {options.map(({ state, label }) => {
          const isActive = value === state
          return (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => onChange(state)}
              className={cn(
                'flex-1 min-h-[44px] px-2 rounded-xl',
                'text-xs font-semibold',
                'transition-all duration-200 ease-forge',
                'active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                isActive && state === 'normal' &&
                  'bg-white/[0.08] text-forge-0 border border-white/20',
                isActive && state === 'advantage' &&
                  'bg-verdant/20 text-verdant border border-verdant/40 shadow-[0_0_12px_-2px_rgba(57,217,138,0.25)]',
                isActive && state === 'disadvantage' &&
                  'bg-red-400/20 text-red-400 border border-red-400/40 shadow-[0_0_12px_-2px_rgba(248,113,113,0.25)]',
                !isActive &&
                  'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06] hover:text-forge-1',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RollResultDisplay({
  result,
  animatingTotal,
}: {
  result: RollResult
  animatingTotal: number | null
}) {
  const displayTotal = animatingTotal !== null ? animatingTotal : result.total
  const isNat20 = result.dieType === 20 && result.keptDice.length === 1 && result.keptDice[0] === 20
  const isNat1 = result.dieType === 20 && result.keptDice.length === 1 && result.keptDice[0] === 1

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      {/* Total */}
      <div
        className={cn(
          'font-display text-5xl font-bold tabular-nums transition-all duration-200 ease-forge',
          isNat20 && 'text-verdant drop-shadow-[0_0_16px_rgba(57,217,138,0.6)]',
          isNat1 && 'text-red-400 drop-shadow-[0_0_16px_rgba(248,113,113,0.6)]',
          !isNat20 && !isNat1 && 'text-forge-0',
        )}
        aria-live="assertive"
        aria-label={`Roll result: ${result.total}`}
      >
        {displayTotal}
      </div>

      {/* Nat 20 / Nat 1 label */}
      {isNat20 && (
        <Badge variant="verdant" className="animate-pulse-glow text-xs">
          Natural 20!
        </Badge>
      )}
      {isNat1 && (
        <Badge
          variant="neutral"
          className="border-red-400/40 bg-red-400/15 text-red-400 text-xs"
        >
          Natural 1
        </Badge>
      )}

      {/* Individual dice */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {result.keptDice.map((value, i) => {
          const isD20Nat20 = result.dieType === 20 && value === 20
          const isD20Nat1 = result.dieType === 20 && value === 1

          return (
            <span
              key={`kept-${i}`}
              className={cn(
                'inline-flex items-center justify-center min-w-[32px] h-8 px-2',
                'rounded-lg font-mono text-sm font-semibold',
                'animate-fade-in',
                isD20Nat20 && 'bg-verdant/20 text-verdant border border-verdant/30',
                isD20Nat1 && 'bg-red-400/20 text-red-400 border border-red-400/30',
                !isD20Nat20 && !isD20Nat1 && 'bg-arcane/10 text-arcane border border-arcane/20',
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {value}
            </span>
          )
        })}

        {/* Show dropped dice in advantage/disadvantage mode */}
        {result.droppedDice.map((value, i) => (
          <span
            key={`dropped-${i}`}
            className={cn(
              'inline-flex items-center justify-center min-w-[32px] h-8 px-2',
              'rounded-lg font-mono text-sm font-medium',
              'bg-white/[0.03] text-forge-2/60 border border-white/5 line-through',
              'animate-fade-in',
            )}
            style={{ animationDelay: `${(result.keptDice.length + i) * 60}ms` }}
            aria-label={`Dropped die: ${value}`}
          >
            {value}
          </span>
        ))}

        {/* Modifier display */}
        {result.modifier !== 0 && (
          <span
            className="inline-flex items-center h-8 px-2 font-mono text-sm font-semibold text-ember animate-fade-in"
            style={{ animationDelay: `${(result.keptDice.length + result.droppedDice.length) * 60}ms` }}
          >
            {result.modifier > 0 ? `+${result.modifier}` : result.modifier}
          </span>
        )}
      </div>

      {/* Notation */}
      <span className="text-xs text-forge-2 font-mono">
        {formatRollNotation(result.quantity, result.dieType, result.modifier)}
        {result.advantage === 'advantage' && ' (adv)'}
        {result.advantage === 'disadvantage' && ' (disadv)'}
      </span>
    </div>
  )
}

function HistoryCard({ result }: { result: RollResult }) {
  const isNat20 = result.dieType === 20 && result.keptDice.length === 1 && result.keptDice[0] === 20
  const isNat1 = result.dieType === 20 && result.keptDice.length === 1 && result.keptDice[0] === 1
  const notation = formatRollNotation(result.quantity, result.dieType, result.modifier)

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg',
        'bg-white/[0.03] border border-white/[0.06]',
        'animate-fade-in',
      )}
    >
      <span className="font-mono text-xs text-forge-2">
        {notation}
        {result.advantage === 'advantage' && ' adv'}
        {result.advantage === 'disadvantage' && ' dis'}
      </span>
      <span
        className={cn(
          'font-mono text-sm font-bold',
          isNat20 && 'text-verdant',
          isNat1 && 'text-red-400',
          !isNat20 && !isNat1 && 'text-forge-0',
        )}
      >
        = {result.total}
      </span>
    </div>
  )
}

/* ─── Main Component ─── */

/**
 * DiceRoller — slide-up panel for rolling D&D 5e (2024) dice.
 *
 * Renders a full-featured dice rolling interface with die type selection,
 * quantity and modifier controls, advantage/disadvantage toggle for d20,
 * animated roll results, roll history, and quick-roll presets.
 *
 * The parent component (Layout.tsx) controls visibility via `isOpen` and
 * provides an `onClose` callback. This component manages all roller state
 * internally.
 */
export function DiceRoller({ isOpen, onClose }: DiceRollerProps) {
  /* ── Roller State ── */
  const [dieType, setDieType] = useState<DieType>(20)
  const [quantity, setQuantity] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [advantage, setAdvantage] = useState<AdvantageState>('normal')
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null)
  const [history, setHistory] = useState<RollResult[]>([])
  const [isRolling, setIsRolling] = useState(false)
  const [animatingTotal, setAnimatingTotal] = useState<number | null>(null)

  const rollIdRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  /* ── Focus Trap ── */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focus the panel on next frame so the transition starts
      requestAnimationFrame(() => {
        panelRef.current?.focus()
      })
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Trap focus within panel
  useEffect(() => {
    if (!isOpen) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  /* ── Escape Key ── */
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  /* ── Cleanup animation frame on unmount ── */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  /* ── Roll Logic ── */
  const executeRoll = useCallback(
    (
      overrideDie?: DieType,
      overrideQty?: number,
      overrideMod?: number,
      overrideAdv?: AdvantageState,
    ) => {
      if (isRolling) return

      const d = overrideDie ?? dieType
      const q = overrideQty ?? quantity
      const m = overrideMod ?? modifier
      const a = overrideAdv ?? (d === 20 ? advantage : 'normal')

      setIsRolling(true)

      const result = rollDice(d, q, m, a)
      rollIdRef.current += 1
      const newResult: RollResult = { ...result, id: rollIdRef.current }

      // Counting-up animation
      const startTime = performance.now()
      const maxRandom = d * q + Math.abs(m)

      function animate(now: number) {
        const elapsed = now - startTime
        if (elapsed < ROLL_ANIMATION_MS) {
          // Show random numbers while "rolling"
          const randomTotal = Math.floor(Math.random() * maxRandom) + 1
          setAnimatingTotal(randomTotal)
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          // Land on actual result
          setAnimatingTotal(null)
          setCurrentResult(newResult)
          setHistory((prev) => [newResult, ...prev].slice(0, MAX_HISTORY))
          setIsRolling(false)
          animationFrameRef.current = null
        }
      }

      // Set a placeholder result immediately so the result area renders
      setCurrentResult(newResult)
      setAnimatingTotal(0)
      animationFrameRef.current = requestAnimationFrame(animate)
    },
    [isRolling, dieType, quantity, modifier, advantage],
  )

  /* ── Quick Preset Handler ── */
  const handleQuickPreset = useCallback(
    (preset: QuickPreset) => {
      setDieType(preset.dieType)
      setQuantity(preset.quantity)
      if (preset.label !== 'd20+mod') {
        setModifier(preset.modifier)
      }
      setAdvantage(preset.advantage)

      if (preset.immediate) {
        executeRoll(preset.dieType, preset.quantity, preset.modifier, preset.advantage)
      }
      // For 'd20+mod', we just set the state so the user can pick their modifier then roll
    },
    [executeRoll],
  )

  /* ── Die Type Change Handler ── */
  const handleDieTypeChange = useCallback((die: DieType) => {
    setDieType(die)
    // Reset advantage when switching away from d20
    if (die !== 20) {
      setAdvantage('normal')
    }
  }, [])

  /* ── Dynamic roll button label ── */
  const rollButtonLabel = `Roll ${formatRollNotation(quantity, dieType, modifier)}`

  /* ── Render ── */

  // Body scroll lock when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-forge',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Dice Roller"
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[90dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0',
          'outline-none',
          'transition-transform duration-300 ease-forge',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          // Prevent interaction when hidden
          !isOpen && 'pointer-events-none',
        )}
      >
        <DragHandle />

        {/* Close button */}
        <div className="flex justify-end px-4 pb-1">
          <button
            type="button"
            aria-label="Close dice roller"
            onClick={onClose}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
              'text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-6 safe-bottom flex flex-col gap-5">
          {/* ── Quick Roll Presets ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1 select-none">Quick Roll</span>
            <div className="flex gap-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={`Quick roll ${preset.label}`}
                  onClick={() => handleQuickPreset(preset)}
                  disabled={isRolling}
                  className={cn(
                    'flex-1 min-h-[44px] px-3 rounded-xl',
                    'font-mono text-sm font-semibold',
                    'bg-eldritch/10 text-eldritch border border-eldritch/25',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-eldritch/20 hover:border-eldritch/40',
                    'active:scale-95',
                    'disabled:opacity-40 disabled:pointer-events-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Die Type Selector ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1 select-none">Die Type</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {DIE_TYPES.map((die) => (
                <DieButton
                  key={die}
                  die={die}
                  selected={dieType === die}
                  onSelect={handleDieTypeChange}
                />
              ))}
            </div>
          </div>

          {/* ── Quantity & Modifier Row ── */}
          <div className="grid grid-cols-2 gap-4">
            <StepperControl
              label="Number of dice"
              value={quantity}
              min={MIN_QUANTITY}
              max={MAX_QUANTITY}
              onChange={setQuantity}
            />
            <StepperControl
              label="Modifier"
              value={modifier}
              min={MIN_MODIFIER}
              max={MAX_MODIFIER}
              onChange={setModifier}
              formatValue={(v) => (v >= 0 ? `+${v}` : `${v}`)}
            />
          </div>

          {/* ── Advantage/Disadvantage Toggle (d20 only) ── */}
          {dieType === 20 && (
            <div className="animate-fade-in">
              <AdvantageToggle value={advantage} onChange={setAdvantage} />
            </div>
          )}

          {/* ── ROLL Button ── */}
          <Button
            variant="primary"
            size="lg"
            className="w-full text-base font-bold tracking-wide"
            onClick={() => executeRoll()}
            disabled={isRolling}
            loading={isRolling}
            aria-label={rollButtonLabel}
          >
            {isRolling ? 'Rolling...' : rollButtonLabel}
          </Button>

          {/* ── Roll Result Display ── */}
          {currentResult && (
            <GlassCard className="animate-slide-up">
              <RollResultDisplay
                result={currentResult}
                animatingTotal={animatingTotal}
              />
            </GlassCard>
          )}

          {/* ── Roll History ── */}
          {history.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-forge-2 select-none">
                Recent Rolls
              </span>
              <div className="flex flex-col gap-1">
                {history.map((roll) => (
                  <HistoryCard key={roll.id} result={roll} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
