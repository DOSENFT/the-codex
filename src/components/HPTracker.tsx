import { useState, useCallback, useMemo } from 'react'
import {
  Heart,
  Swords,
  HeartPulse,
  ShieldPlus,
  X,
  Check,
  Skull,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useCollapsible } from '../hooks/useCollapsible'
import {
  type Character,
  applyDamage,
  applyHealing,
  setTempHP,
  toggleCondition,
  addDeathSaveSuccess,
  addDeathSaveFailure,
  resetDeathSaves,
} from '../lib/character'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HPTrackerProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
}

type InputMode = 'damage' | 'heal' | 'temp' | null

// ---------------------------------------------------------------------------
// D&D 2024 Conditions
// ---------------------------------------------------------------------------

interface ConditionInfo {
  name: string
  effect: string
  category: 'debuff' | 'control' | 'movement' | 'sensory'
}

const CONDITIONS: ConditionInfo[] = [
  { name: 'Blinded', effect: "Can't see; attacks have Disadvantage", category: 'sensory' },
  { name: 'Charmed', effect: "Can't attack charmer; charmer has social Advantage", category: 'control' },
  { name: 'Deafened', effect: "Can't hear; auto-fail hearing checks", category: 'sensory' },
  { name: 'Exhaustion', effect: '-2 per level to D20 Tests; speed reduced', category: 'debuff' },
  { name: 'Frightened', effect: "Disadvantage while source visible; can't approach", category: 'control' },
  { name: 'Grappled', effect: 'Speed 0; can escape with DC check', category: 'movement' },
  { name: 'Incapacitated', effect: "Can't take Actions, Bonus Actions, or Reactions", category: 'debuff' },
  { name: 'Invisible', effect: "Can't be seen; attacks have Advantage", category: 'sensory' },
  { name: 'Paralyzed', effect: 'Incapacitated; auto-fail STR/DEX saves', category: 'debuff' },
  { name: 'Petrified', effect: 'Turned to stone; weight x10; resist all damage', category: 'debuff' },
  { name: 'Poisoned', effect: 'Disadvantage on attacks and ability checks', category: 'debuff' },
  { name: 'Prone', effect: 'Crawl to move; melee hits have Advantage', category: 'movement' },
  { name: 'Restrained', effect: 'Speed 0; attacks have Disadvantage', category: 'movement' },
  { name: 'Stunned', effect: 'Incapacitated; auto-fail STR/DEX saves', category: 'debuff' },
  { name: 'Unconscious', effect: 'Drop prone; Incapacitated; auto-crit in 5ft', category: 'debuff' },
]

/* The INK is lit in both maps and the base accent is left to the border and
   the fill. Measured off the painted pixels on 2026-08-25: «Deafened» in
   forge-2 came in at 4.40:1 and «Frightened» in eldritch at 4.13:1, both under
   V-2's 4.5 — and both of those are the name of a thing that is happening to
   him right now, at 12px, in a dim room. The tint behind the word still says
   which family the condition belongs to; the word itself is now readable. */
const CATEGORY_COLORS: Record<ConditionInfo['category'], string> = {
  debuff: 'text-red-400 border-red-400/30 bg-red-400/10',
  control: 'text-eldritch-lit border-eldritch/30 bg-eldritch/10',
  movement: 'text-ember-lit border-ember/30 bg-ember/10',
  sensory: 'text-forge-1 border-forge-2/30 bg-forge-2/10',
}

const CATEGORY_ACTIVE_COLORS: Record<ConditionInfo['category'], string> = {
  debuff: 'text-red-400 border-red-400/60 bg-red-400/20 shadow-[0_0_12px_-3px_rgba(248,113,113,0.3)]',
  control: 'text-eldritch-lit border-eldritch/60 bg-eldritch/20 shadow-[0_0_12px_-3px_rgba(139,92,246,0.3)]',
  movement: 'text-ember-lit border-ember/60 bg-ember/20 shadow-[0_0_12px_-3px_rgba(244,181,69,0.3)]',
  sensory: 'text-forge-1 border-forge-2/60 bg-forge-2/20 shadow-[0_0_12px_-3px_rgba(141,152,167,0.3)]',
}

// ---------------------------------------------------------------------------
// Quick-value buttons for inline inputs
// ---------------------------------------------------------------------------

const QUICK_VALUES = [1, 5, 10] as const

// ---------------------------------------------------------------------------
// HPTracker Component
// ---------------------------------------------------------------------------

export function HPTracker({ character, onCharacterUpdate }: HPTrackerProps) {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  /* Per character, and through the hook that already exists — this writes into
     the same `codex-ui-${id}` map every other fold in the app uses, so slice 4
     adds no storage key. Nix's conditions belong to Nix. */
  const conditionsFold = useCollapsible('hp-conditions', character.id, false)
  const [inputValue, setInputValue] = useState('')

  // Derived state
  const currentHP = character.hitPoints.current
  const maxHP = character.hitPoints.max
  const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 0
  const tempHP = character.tempHP
  const isDead = currentHP === 0

  const hpColor = useMemo(() => {
    if (currentHP === 0) return 'text-red-400'
    if (hpPercent < 25) return 'text-red-400'
    if (hpPercent <= 75) return 'text-ember'
    return 'text-forge-0'
  }, [currentHP, hpPercent])

  const isCritical = currentHP > 0 && hpPercent < 25

  // Bar gradient color based on percentage
  const barColor = useMemo(() => {
    if (hpPercent <= 25) return 'from-red-500 to-red-400'
    if (hpPercent <= 50) return 'from-red-400 to-ember'
    if (hpPercent <= 75) return 'from-ember to-verdant'
    return 'from-verdant to-verdant'
  }, [hpPercent])

  // -------------------------------------------
  // Handlers
  // -------------------------------------------

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

  const handleToggleCondition = useCallback(
    (conditionName: string) => {
      onCharacterUpdate(toggleCondition(character, conditionName))
    },
    [character, onCharacterUpdate],
  )

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

  const isStabilized = character.deathSaves.successes >= 3
  const isFullDead = character.deathSaves.failures >= 3

  // -------------------------------------------
  // Render
  // -------------------------------------------

  return (
    <GlassCard className="space-y-4 ornate-border">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Heart size={18} className="text-red-400 shrink-0" aria-hidden />
        <OrnateHeader className="flex-1">Hit Points</OrnateHeader>
      </div>

      {/* HP Display */}
      <div className="stat-frame mx-auto px-6 py-3">
        <div className="flex items-center justify-center gap-2">
          <span
            className={cn(
              'font-mono text-4xl font-bold tabular-nums transition-colors duration-300',
              hpColor,
              isCritical && 'animate-pulse',
            )}
            aria-label={`${currentHP} of ${maxHP} hit points`}
          >
            {currentHP}
            <span className="text-forge-2 text-2xl mx-1">/</span>
            <span className="text-forge-1 text-2xl">{maxHP}</span>
          </span>

          {/* Temp HP Badge */}
          {tempHP > 0 && (
            <Badge variant="arcane" className="ml-1 text-xs font-mono">
              +{tempHP} temp
            </Badge>
          )}
        </div>
      </div>

      {/* HP Bar */}
      <div
        className="relative w-full h-3 rounded-full bg-void-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={currentHP}
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-label="Hit points"
      >
        {/* Temp HP overlay (shown behind main bar as lighter extension) */}
        {tempHP > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-arcane/25 transition-all duration-500 ease-forge"
            style={{ width: `${Math.min(100, ((currentHP + tempHP) / maxHP) * 100)}%` }}
          />
        )}

        {/* Main HP bar */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500 ease-forge',
            barColor,
          )}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Action Row */}
      {inputMode === null ? (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="text-red-400 border-red-400/20 hover:bg-red-400/10 hover:border-red-400/30"
            onClick={() => setInputMode('damage')}
            aria-label="Apply damage"
          >
            <Swords size={16} aria-hidden />
            <span className="text-xs">Damage</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="text-verdant border-verdant/20 hover:bg-verdant/10 hover:border-verdant/30"
            onClick={() => setInputMode('heal')}
            aria-label="Apply healing"
          >
            <HeartPulse size={16} aria-hidden />
            <span className="text-xs">Heal</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="text-arcane border-arcane/20 hover:bg-arcane/10 hover:border-arcane/30"
            onClick={() => setInputMode('temp')}
            aria-label="Set temporary hit points"
          >
            <ShieldPlus size={16} aria-hidden />
            <span className="text-xs">Temp HP</span>
          </Button>
        </div>
      ) : (
        /* Inline Input */
        <div className="animate-fade-in space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                inputMode === 'damage' && 'text-red-400',
                inputMode === 'heal' && 'text-verdant',
                inputMode === 'temp' && 'text-arcane',
              )}
            >
              {inputMode === 'damage' ? 'Damage' : inputMode === 'heal' ? 'Heal' : 'Temp HP'}
            </span>
          </div>

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
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25 font-mono text-lg',
                'transition-all duration-200 ease-forge',
                'focus:outline-none focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
              )}
              aria-label={`${inputMode} amount`}
            />

            {/* Quick value buttons */}
            {QUICK_VALUES.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => handleQuickValue(v)}
                className={cn(
                  'min-h-[44px] min-w-[44px] rounded-xl',
                  'bg-void-2/60 border border-bronze/25',
                  'font-mono text-sm text-forge-1',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-gold/[0.08] hover:border-gold/30 hover:text-forge-0',
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
            <Button
              variant="primary"
              size="sm"
              className={cn(
                'flex-1',
                inputMode === 'damage' &&
                  'from-red-500 to-red-600 shadow-[0_0_16px_-4px_rgba(239,68,68,0.35)]',
                inputMode === 'heal' &&
                  'from-verdant to-emerald-500 shadow-[0_0_16px_-4px_rgba(57,217,138,0.35)]',
                inputMode === 'temp' &&
                  'from-arcane to-gold shadow-[0_0_16px_-4px_rgba(197,165,90,0.3)]',
              )}
              onClick={handleApply}
              disabled={!inputValue || parseInt(inputValue, 10) <= 0}
            >
              <Check size={16} aria-hidden />
              Apply
            </Button>

            <Button variant="ghost" size="sm" onClick={handleCancel} aria-label="Cancel">
              <X size={16} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Death Saves — only visible at 0 HP */}
      {isDead && (
        <div className="animate-slide-up space-y-3 pt-2 border-t border-bronze/15">
          {isFullDead ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <Skull size={20} className="text-red-400" aria-hidden />
              <span className="font-display text-red-400 font-bold text-lg tracking-wide">
                Dead.
              </span>
            </div>
          ) : isStabilized ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <ShieldAlert size={20} className="text-verdant" aria-hidden />
              <span className="font-display text-verdant font-bold text-lg tracking-wide">
                Stabilized!
              </span>
            </div>
          ) : (
            <>
              <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider text-center">
                Death Saves
              </h4>

              {/* Success row */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-forge-2 font-medium w-16 text-right">Success</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <button
                      key={`success-${i}`}
                      type="button"
                      onClick={handleDeathSaveSuccess}
                      disabled={character.deathSaves.successes > i}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all duration-200 ease-forge',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                        character.deathSaves.successes > i
                          ? 'bg-verdant/30 border-verdant shadow-[0_0_8px_-2px_rgba(57,217,138,0.4)]'
                          : 'bg-transparent border-forge-2/40 hover:border-verdant/60 active:scale-90 cursor-pointer',
                      )}
                      aria-label={
                        character.deathSaves.successes > i
                          ? `Death save success ${i + 1} filled`
                          : `Add death save success`
                      }
                    >
                      {character.deathSaves.successes > i && (
                        <Check size={14} className="text-verdant mx-auto" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Failure row */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-forge-2 font-medium w-16 text-right">Failure</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <button
                      key={`failure-${i}`}
                      type="button"
                      onClick={handleDeathSaveFailure}
                      disabled={character.deathSaves.failures > i}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all duration-200 ease-forge',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                        character.deathSaves.failures > i
                          ? 'bg-red-400/30 border-red-400 shadow-[0_0_8px_-2px_rgba(248,113,113,0.4)]'
                          : 'bg-transparent border-forge-2/40 hover:border-red-400/60 active:scale-90 cursor-pointer',
                      )}
                      aria-label={
                        character.deathSaves.failures > i
                          ? `Death save failure ${i + 1} filled`
                          : `Add death save failure`
                      }
                    >
                      {character.deathSaves.failures > i && (
                        <X size={14} className="text-red-400 mx-auto" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reset button — always available when dead */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleResetDeathSaves}>
              Reset Death Saves
            </Button>
          </div>
        </div>
      )}

      {/* Conditions Section — Table Truth slice 4.
          Marcus: "it doesnt happen often and that portion takes up so much
          room." It is a 16-cell grid of 48px buttons — roughly 340px of a
          844px screen — standing permanently open for a state that is empty
          most of the night.

          THE HEADER STATES ITS OWN STATE, which is the whole reason this is
          allowed to fold. A collapsed section that says only "Active
          Conditions" has replaced a visible fact with a question, and at a
          table the question gets answered by tapping. Folded, this header
          still answers it: the condition NAMES when there are any, the word
          "None" when there are not. Nothing is hidden except the means of
          changing it — which is the tap he is making anyway.

          Default CLOSED, and that is the one place this differs from every
          other fold in the app. Everywhere else the content is the point;
          here the summary genuinely carries it. */}
      <div className="space-y-3 pt-2 border-t border-bronze/15">
        <button
          type="button"
          onClick={conditionsFold.toggle}
          aria-expanded={conditionsFold.isOpen}
          className={cn(
            'flex w-full min-h-[48px] items-center gap-2 text-left',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider shrink-0">
            Active Conditions
          </span>
          {/* forge-1, not forge-2: folded, this span IS the readout, and V-2's
              4.5:1 floor applies to the thing you are actually reading. */}
          <span
            className={cn(
              'truncate text-xs font-semibold',
              character.conditions.length > 0 ? 'text-red-400' : 'text-forge-1',
            )}
          >
            {character.conditions.length > 0 ? character.conditions.join(', ') : 'None'}
          </span>
          {conditionsFold.isOpen ? (
            <ChevronUp size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
          ) : (
            <ChevronDown size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
          )}
        </button>

        {conditionsFold.isOpen && (
        <div className="grid grid-cols-2 gap-1.5">
          {CONDITIONS.map(condition => {
            const isActive = character.conditions.includes(condition.name)

            return (
              <button
                key={condition.name}
                type="button"
                onClick={() => handleToggleCondition(condition.name)}
                className={cn(
                  /* 44px → 48px. A condition is applied and cleared DURING a
                     turn — "I'm prone", "he's frightened" — so it is a turn
                     control, and V-5b's floor for those is 48, not the general
                     44. These two were the last of that family still at 44. */
                  'min-h-[48px] rounded-xl px-3 py-2 text-left',
                  'border transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  isActive
                    ? CATEGORY_ACTIVE_COLORS[condition.category]
                    : cn(
                        CATEGORY_COLORS[condition.category],
                        /* Was `opacity-50 hover:opacity-80`, and that came off
                           rather than getting a number adjusted. It dimmed the
                           WORD along with the chip, putting every inactive
                           condition name at roughly half the contrast the
                           audit believes it measured — the audit reads the
                           span's own opacity and the 50% lives on the button
                           above it, so this one was invisible to the
                           instrument AND worse in the room. Same rule the turn
                           deck already follows: dim the GROUND, keep the ink
                           legible.

                           Nothing replaces it, because the quiet state was
                           already carried without it: /10 fill against /20,
                           /30 border against /60, no glow against a glow, and
                           the effect line only appears when the condition is
                           on. That is four signals; the wash was a fifth that
                           cost legibility to say what the other four already
                           said. */
                        'hover:bg-white/[0.04]',
                      ),
                )}
                aria-pressed={isActive}
                aria-label={`${condition.name}: ${condition.effect}`}
              >
                <span className="block text-xs font-semibold leading-tight">
                  {condition.name}
                </span>
                {isActive && (
                  <span className="block text-xs leading-tight mt-0.5 opacity-75">
                    {condition.effect}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        )}
      </div>
    </GlassCard>
  )
}
