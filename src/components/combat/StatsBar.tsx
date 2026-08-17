import { useState, useCallback, useMemo } from 'react'
import {
  Heart,
  Swords,
  HeartPulse,
  ShieldPlus,
  Shield,
  Wind,
  X,
  Check,
  Skull,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../../lib/cn'
import {
  type Character,
  applyDamage,
  applyHealing,
  setTempHP,
  addDeathSaveSuccess,
  addDeathSaveFailure,
  resetDeathSaves,
} from '../../lib/character'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsBarProps {
  character: Character
  combatState: { concentrating: string | null }
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

type InputMode = 'damage' | 'heal' | 'temp' | null

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_VALUES = [1, 5, 10] as const

/** Races with 25ft base walking speed. All others default to 30ft. */
const SLOW_RACES = new Set(['Dwarf', 'Gnome', 'Halfling'])

/** Derive base walking speed from race name. */
function deriveSpeed(race: string): number {
  const normalized = race.trim()
  for (const slow of SLOW_RACES) {
    if (normalized.toLowerCase().includes(slow.toLowerCase())) return 25
  }
  return 30
}

// ---------------------------------------------------------------------------
// Input mode color mapping
// ---------------------------------------------------------------------------

const INPUT_MODE_COLORS: Record<Exclude<InputMode, null>, {
  label: string
  text: string
  button: string
}> = {
  damage: {
    label: 'Damage',
    text: 'text-red-400',
    button: 'from-red-500 to-red-600',
  },
  heal: {
    label: 'Heal',
    text: 'text-verdant',
    button: 'from-verdant to-emerald-500',
  },
  temp: {
    label: 'Temp HP',
    text: 'text-arcane',
    button: 'from-arcane to-gold',
  },
}

// ---------------------------------------------------------------------------
// StatsBar Component
// ---------------------------------------------------------------------------

export function StatsBar({
  character,
  combatState,
  onCharacterUpdate,
  onOpenDiceRoller,
}: StatsBarProps) {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  const [inputValue, setInputValue] = useState('')

  // ---- Derived state ----
  const currentHP = character.hitPoints.current
  const maxHP = character.hitPoints.max
  const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 0
  const tempHP = character.tempHP
  const isDead = currentHP === 0
  const speed = deriveSpeed(character.race)

  const hpColor = useMemo(() => {
    if (currentHP === 0) return 'text-blood'
    if (hpPercent < 25) return 'text-blood'
    if (hpPercent <= 75) return 'text-ember'
    return 'text-verdant'
  }, [currentHP, hpPercent])

  const hpBarModifier = useMemo(() => {
    if (currentHP === 0) return 'hp-bar-fill--dead'
    if (hpPercent < 25) return 'hp-bar-fill--low'
    if (hpPercent <= 75) return 'hp-bar-fill--mid'
    return 'hp-bar-fill--high'
  }, [currentHP, hpPercent])

  // ---- Death save derived ----
  const isStabilized = character.deathSaves.successes >= 3
  const isFullDead = character.deathSaves.failures >= 3

  // ---- Handlers ----

  const handleApply = useCallback(() => {
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) {
      setInputMode(null)
      setInputValue('')
      return
    }

    let updated: Character
    switch (inputMode) {
      case 'damage':
        updated = applyDamage(character, amount)
        break
      case 'heal':
        updated = applyHealing(character, amount)
        break
      case 'temp':
        updated = setTempHP(character, amount)
        break
      default:
        return
    }

    onCharacterUpdate(updated)
    setInputMode(null)
    setInputValue('')
  }, [inputValue, inputMode, character, onCharacterUpdate])

  const handleQuickValue = useCallback((value: number) => {
    setInputValue(String(value))
  }, [])

  const handleCancel = useCallback(() => {
    setInputMode(null)
    setInputValue('')
  }, [])

  const handleDeathSaveSuccess = useCallback(() => {
    if (character.deathSaves.successes < 3) {
      onCharacterUpdate(addDeathSaveSuccess(character))
    }
  }, [character, onCharacterUpdate])

  const handleDeathSaveFailure = useCallback(() => {
    if (character.deathSaves.failures < 3) {
      onCharacterUpdate(addDeathSaveFailure(character))
    }
  }, [character, onCharacterUpdate])

  const handleResetDeathSaves = useCallback(() => {
    onCharacterUpdate(resetDeathSaves(character))
  }, [character, onCharacterUpdate])

  // ---- HP hero gradient class ----
  const hpGradientClass = useMemo(() => {
    if (currentHP === 0) return 'text-blood'
    if (hpPercent < 25) return 'text-blood'
    if (hpPercent <= 75) return 'text-ember'
    return 'gold-gradient-text'
  }, [currentHP, hpPercent])

  // ---- Render ----

  return (
    <div className="space-y-3">

      {/* ================================================================
          HP HERO DISPLAY — the most important number on the combat tab
          ================================================================ */}
      <div className="flex flex-col items-center">
        {/* HP value — reads at arm's length */}
        <motion.div
          className="flex items-baseline gap-0.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Heart
            size={16}
            className={cn('shrink-0 self-center mr-1.5', hpColor)}
            aria-hidden
          />
          <span
            className={cn(
              'font-mono text-[36px] font-bold leading-none',
              'tabular-nums',
              hpGradientClass,
            )}
          >
            {currentHP}
          </span>
          <span className="font-mono text-base text-ink-muted mx-0.5 tabular-nums">/</span>
          <span className="font-mono text-base text-ink-secondary tabular-nums">{maxHP}</span>
        </motion.div>

        {/* HP bar — full width, 8px tall, v3 with shine */}
        <div
          className="hp-bar-v3 mt-2"
          role="progressbar"
          aria-valuenow={currentHP}
          aria-valuemin={0}
          aria-valuemax={maxHP}
          aria-label="Hit points"
        >
          <div
            className={cn('hp-bar-fill', hpBarModifier)}
            style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
          />
          {tempHP > 0 && (
            <div
              className="hp-bar-temp"
              style={{ width: `${Math.min(100, (tempHP / maxHP) * 100)}%` }}
            />
          )}
          {/* Shine sweep — re-triggers on HP change via key */}
          <span key={currentHP} className="hp-bar-shine" />
        </div>

        {/* Temp HP tag — only when > 0 */}
        {tempHP > 0 && (
          <span className="mt-1.5 font-mono text-xs font-semibold text-arcane tracking-[0.06em] uppercase tabular-nums">
            temp +{tempHP}
          </span>
        )}
      </div>

      {/* ================================================================
          STAT FRAMES ROW — AC, Speed, Spell Save DC (secondary to HP)
          ================================================================ */}
      <div className="flex gap-2">
        {/* ARMOR CLASS */}
        <div className="stat-box-v3">
          <span className="stat-box-label">AC</span>
          <div className="flex items-center gap-1">
            <Shield size={14} className="text-gold shrink-0" aria-hidden />
            <span className="stat-box-value">{character.armorClass}</span>
          </div>
        </div>

        {/* SPEED */}
        <div className="stat-box-v3">
          <span className="stat-box-label">Speed</span>
          <div className="flex items-baseline gap-0.5">
            <Wind size={12} className="text-ink-secondary shrink-0" aria-hidden />
            <span className="stat-box-value">{speed}</span>
            <span className="text-ink-muted text-xs font-medium font-mono">ft</span>
          </div>
        </div>

        {/* SPELL SAVE DC */}
        <div className="stat-box-v3">
          <span className="stat-box-label">Spell DC</span>
          <span className="stat-box-value text-arcane">{character.spellSaveDC}</span>
        </div>
      </div>

      {/* ================================================================
          HP ACTION BUTTONS — gold-dim accent bar with group-hover extend
          ================================================================ */}
      {inputMode === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('damage')}
            className={cn(
              'group relative flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5',
              'rounded-lg border border-gold-dim/20 bg-ash-mid/60',
              'text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary',
              'transition-all duration-200 ease-snap',
              'hover:bg-red-400/10 hover:border-red-400/30 hover:text-red-400',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
            aria-label="Apply damage"
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gold-dim/25 transition-all duration-200 group-hover:h-6" />
            <Swords size={14} className="text-ink-muted" aria-hidden />
            Damage
          </button>

          <button
            type="button"
            onClick={() => setInputMode('heal')}
            className={cn(
              'group relative flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5',
              'rounded-lg border border-gold-dim/20 bg-ash-mid/60',
              'text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary',
              'transition-all duration-200 ease-snap',
              'hover:bg-verdant/10 hover:border-verdant/30 hover:text-verdant',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
            aria-label="Apply healing"
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gold-dim/25 transition-all duration-200 group-hover:h-6" />
            <HeartPulse size={14} className="text-ink-muted" aria-hidden />
            Heal
          </button>

          <button
            type="button"
            onClick={() => setInputMode('temp')}
            className={cn(
              'group relative flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5',
              'rounded-lg border border-gold-dim/20 bg-ash-mid/60',
              'text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary',
              'transition-all duration-200 ease-snap',
              'hover:bg-arcane/10 hover:border-arcane/30 hover:text-arcane',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
            aria-label="Set temporary hit points"
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gold-dim/25 transition-all duration-200 group-hover:h-6" />
            <ShieldPlus size={14} className="text-ink-muted" aria-hidden />
            Temp HP
          </button>
        </div>
      ) : (
        /* ---- Inline Input ---- */
        <div className="animate-fade-in space-y-2">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.12em]',
              INPUT_MODE_COLORS[inputMode].text,
            )}
          >
            {INPUT_MODE_COLORS[inputMode].label}
          </span>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleApply()
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder="0"
              autoFocus
              className={cn(
                'min-h-[44px] flex-1 rounded-xl px-4',
                'bg-ash-mid/60 text-ink-primary placeholder:text-ink-muted',
                'border border-gold-dim/25 font-mono text-lg tabular-nums',
                'transition-all duration-200 ease-snap',
                'focus:outline-none focus:border-arcane/60 focus:bg-ash-mid/80',
                'focus:ring-2 focus:ring-gold/10',
              )}
              aria-label={`${INPUT_MODE_COLORS[inputMode].label} amount`}
            />

            {QUICK_VALUES.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => handleQuickValue(v)}
                className={cn(
                  'min-h-[44px] min-w-[44px] rounded-xl',
                  'bg-ash-mid/60 border border-gold-dim/25',
                  'font-mono text-sm text-ink-secondary tabular-nums',
                  'transition-all duration-200 ease-snap',
                  'hover:bg-gold/[0.08] hover:border-gold/30 hover:text-ink-primary',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  inputValue === String(v) && 'border-arcane/40 text-arcane bg-arcane/10',
                )}
                aria-label={`Set value to ${v}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={!inputValue || parseInt(inputValue, 10) <= 0}
              className={cn(
                'flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5',
                'rounded-lg font-semibold text-sm text-ash-deep',
                'bg-gradient-to-r transition-all duration-200 ease-snap',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                'disabled:opacity-40 disabled:pointer-events-none',
                INPUT_MODE_COLORS[inputMode].button,
              )}
            >
              <Check size={16} aria-hidden />
              Apply
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                'min-h-[44px] min-w-[44px] inline-flex items-center justify-center',
                'rounded-lg text-ink-secondary',
                'bg-transparent hover:bg-gold/[0.06] hover:text-ink-primary',
                'transition-all duration-200 ease-snap',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              )}
              aria-label="Cancel"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          SECONDARY STATS — hairline divider, then dense reference row
          ================================================================ */}
      <div className="hairline-divider" aria-hidden />

      <div className="flex gap-2">
        {/* Concentration */}
        <div className="stat-box-v3">
          <span className="stat-box-label">Concentration</span>
          {combatState.concentrating ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
              </span>
              <span
                className="stat-box-value text-ember text-xs truncate max-w-[80px]"
                title={combatState.concentrating}
              >
                {combatState.concentrating}
              </span>
            </div>
          ) : (
            <span className="stat-box-value text-ink-muted text-xs">None</span>
          )}
        </div>

        {/* Death Saves — only visible when HP = 0 */}
        {isDead && (
          <div className="stat-box-v3">
            <span className="stat-box-label">Death Saves</span>
            <div className="flex items-center gap-2">
              {/* Successes */}
              <div className="flex gap-1" aria-label="Death save successes">
                {[0, 1, 2].map(i => (
                  <button
                    key={`s-${i}`}
                    type="button"
                    onClick={handleDeathSaveSuccess}
                    disabled={character.deathSaves.successes > i}
                    className={cn(
                      'w-5 h-5 rounded-full border-[1.5px] transition-all duration-200 ease-snap',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                      character.deathSaves.successes > i
                        ? 'bg-verdant/40 border-verdant shadow-[0_0_6px_-1px] shadow-verdant'
                        : 'bg-transparent border-ink-muted/40 hover:border-verdant/60 active:scale-90 cursor-pointer',
                    )}
                    aria-label={
                      character.deathSaves.successes > i
                        ? `Death save success ${i + 1} filled`
                        : 'Add death save success'
                    }
                  />
                ))}
              </div>

              <span className="text-ink-muted/30 text-xs select-none">/</span>

              {/* Failures */}
              <div className="flex gap-1" aria-label="Death save failures">
                {[0, 1, 2].map(i => (
                  <button
                    key={`f-${i}`}
                    type="button"
                    onClick={handleDeathSaveFailure}
                    disabled={character.deathSaves.failures > i}
                    className={cn(
                      'w-5 h-5 rounded-full border-[1.5px] transition-all duration-200 ease-snap',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                      character.deathSaves.failures > i
                        ? 'bg-red-400/40 border-red-400 shadow-[0_0_6px_-1px] shadow-red-400'
                        : 'bg-transparent border-ink-muted/40 hover:border-red-400/60 active:scale-90 cursor-pointer',
                    )}
                    aria-label={
                      character.deathSaves.failures > i
                        ? `Death save failure ${i + 1} filled`
                        : 'Add death save failure'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          DEATH SAVE RESOLUTION STATE
          ================================================================ */}
      {isDead && (isStabilized || isFullDead) && (
        <div className="animate-slide-up flex items-center justify-center gap-3 py-2 border-t border-gold-dim/10">
          {isFullDead ? (
            <>
              <Skull size={18} className="text-blood" aria-hidden />
              <span className="font-display text-blood font-bold text-base tracking-wide">
                Dead.
              </span>
            </>
          ) : (
            <>
              <ShieldAlert size={18} className="text-verdant" aria-hidden />
              <span className="font-display gold-gradient-text font-bold text-base tracking-wide">
                Stabilized!
              </span>
            </>
          )}

          <button
            type="button"
            onClick={handleResetDeathSaves}
            className={cn(
              'ml-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center',
              'rounded-lg text-ink-muted hover:text-ink-secondary',
              'bg-transparent hover:bg-gold/[0.06]',
              'transition-all duration-200 ease-snap',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
            aria-label="Reset death saves"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
