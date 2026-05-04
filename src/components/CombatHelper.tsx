import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Sword,
  Zap,
  Shield,
  Footprints,
  RotateCcw,
  Send,
  Loader2,
  Sparkles,
  Moon,
  Sun,
  Focus,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Heart,
  Flame,
  User,
  Minus,
  Play,
  Square,
  SkipForward,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  expendLayOnHands,
  expendChannelDivinity,
  type Character,
  type PaladinResources,
  expendSpellSlot,
  restoreSpellSlot,
  shortRest,
  longRest,
} from '../lib/character'
import {
  type CombatState,
  createCombatState,
  startCombat,
  endCombat,
  nextTurn,
  useAction,
  setConcentration as setCombatConcentration,
  saveCombatState,
  loadCombatState,
  clearCombatState,
} from '../lib/combat-state'
import { BASIC_ACTIONS, PALADIN_ACTIONS } from '../lib/dnd-data'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import { useAI } from '../hooks/useAI'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'
import { HPTracker } from './HPTracker'
import { ActionMenu, type ActionChoice } from './ActionMenu'
import { DamageTracker } from './DamageTracker'
import { ConditionReminder } from './ConditionReminder'
import { type CombatLog, type DamageEntry, createCombatLog, logDamage as logDamageEntry, endCombatLog, saveDamageLogs, loadDamageLogs } from '../lib/damage-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CombatHelperProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

interface ActionEconomy {
  action: boolean
  bonusAction: boolean
  reaction: boolean
  movement: boolean
}

const INITIAL_ECONOMY: ActionEconomy = {
  action: false,
  bonusAction: false,
  reaction: false,
  movement: false,
}

// Spell-slot level ordinal labels for screen readers
const LEVEL_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th',
  7: '7th',
  8: '8th',
  9: '9th',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse basic markdown-like formatting (bold, line breaks) for AI responses */
function formatAIResponse(text: string): JSX.Element[] {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="text-forge-0 font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={j}>{part}</span>
    })

    return (
      <p key={i} className={cn('leading-relaxed', i > 0 && 'mt-1.5')}>
        {formatted}
      </p>
    )
  })
}

/** Count total available spell slots across all levels */
function countAvailableSlots(spellSlots: Character['spellSlots']): number {
  return Object.values(spellSlots).reduce((sum, slot) => sum + slot.current, 0)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** 1. Action Economy Bar */
function ActionEconomyBar({
  economy,
  onToggle,
  onReset,
}: {
  economy: ActionEconomy
  onToggle: (key: keyof ActionEconomy) => void
  onReset: () => void
}) {
  const chips: { key: keyof ActionEconomy; label: string; icon: typeof Sword }[] = [
    { key: 'action', label: 'Action', icon: Sword },
    { key: 'bonusAction', label: 'Bonus', icon: Zap },
    { key: 'reaction', label: 'Reaction', icon: Shield },
    { key: 'movement', label: 'Move', icon: Footprints },
  ]

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase">
          Action Economy
        </h3>
        <button
          onClick={onReset}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center',
            'rounded-lg text-forge-2 hover:text-arcane hover:bg-white/[0.06]',
            'transition-all duration-200 active:scale-[0.95]',
          )}
          aria-label="Reset action economy"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {chips.map(({ key, label, icon: Icon }) => {
          const used = economy[key]
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              aria-pressed={used}
              className={cn(
                'min-h-[44px] px-3.5 rounded-xl',
                'flex items-center gap-2',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.97] select-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                used
                  ? 'bg-white/[0.03] border-white/5 text-forge-2 opacity-40'
                  : 'bg-arcane/10 border-arcane/25 text-arcane',
              )}
            >
              <Icon size={16} aria-hidden />
              <span className="text-sm font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </GlassCard>
  )
}

/** 2. Spell Slots Display */
function SpellSlotsDisplay({
  spellSlots,
  onExpend,
  onRestore,
}: {
  spellSlots: Character['spellSlots']
  onExpend: (level: number) => void
  onRestore: (level: number) => void
}) {
  const levels = Object.entries(spellSlots)
    .map(([lvl, data]) => ({ level: Number(lvl), ...data }))
    .filter((s) => s.max > 0)
    .sort((a, b) => a.level - b.level)

  if (levels.length === 0) {
    return null
  }

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase mb-3">
        Spell Slots
      </h3>

      <div className="flex flex-col gap-3">
        {levels.map(({ level, max, current }) => (
          <div key={level} className="flex items-center gap-3">
            <span className="text-xs font-mono text-forge-2 w-8 shrink-0">
              {LEVEL_LABELS[level] ?? `${level}th`}
            </span>

            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: max }).map((_, i) => {
                const available = i < current
                return (
                  <button
                    key={i}
                    onClick={() => (available ? onExpend(level) : onRestore(level))}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onRestore(level)
                    }}
                    aria-label={
                      available
                        ? `Expend ${LEVEL_LABELS[level] ?? level} level spell slot`
                        : `Restore ${LEVEL_LABELS[level] ?? level} level spell slot`
                    }
                    className={cn(
                      'w-[28px] h-[28px] min-h-[44px] min-w-[44px]',
                      'p-0 flex items-center justify-center',
                      'rounded-full border-2 transition-all duration-200 ease-forge',
                      'active:scale-[0.9]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      available
                        ? [
                            'bg-eldritch/30 border-eldritch/60',
                            'shadow-[0_0_8px_-2px_rgba(139,92,246,0.4)]',
                            'hover:bg-eldritch/40 hover:border-eldritch/80',
                          ]
                        : [
                            'bg-white/[0.03] border-white/10',
                            'hover:bg-white/[0.06] hover:border-white/20',
                          ],
                    )}
                  >
                    {available && (
                      <div className="w-2.5 h-2.5 rounded-full bg-eldritch shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                    )}
                  </button>
                )
              })}
            </div>

            <span className="text-xs font-mono text-forge-2 ml-auto">
              {current}/{max}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/** 2b. Paladin Resource Tracker */
function PaladinResourceTracker({
  resources,
  spellSlots,
  onExpendLayOnHands,
  onExpendChannelDivinity,
  onRestoreChannelDivinity,
}: {
  resources: PaladinResources
  spellSlots: Character['spellSlots']
  onExpendLayOnHands: (amount: number) => void
  onExpendChannelDivinity: () => void
  onRestoreChannelDivinity: () => void
}) {
  const [customAmount, setCustomAmount] = useState('')
  const { layOnHands, channelDivinity, auraRange } = resources
  const lohPercent = layOnHands.max > 0 ? (layOnHands.current / layOnHands.max) * 100 : 0

  const handleCustomSpend = useCallback(() => {
    const amount = parseInt(customAmount, 10)
    if (!isNaN(amount) && amount > 0) {
      onExpendLayOnHands(amount)
      setCustomAmount('')
    }
  }, [customAmount, onExpendLayOnHands])

  const quickSpendButtons = [
    { label: 'Heal 5', amount: 5 },
    { label: 'Heal 10', amount: 10 },
    { label: 'Cure Poison (5)', amount: 5 },
  ]

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase mb-4">
        Paladin Resources
      </h3>

      {/* Lay on Hands Pool */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={14} className="text-verdant" aria-hidden />
          <span className="text-xs font-semibold text-forge-1 uppercase tracking-wide">
            Lay on Hands
          </span>
          <span className="text-xs font-mono text-forge-2 ml-auto">
            {layOnHands.current}/{layOnHands.max} HP
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-verdant/30 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-verdant transition-all duration-300 ease-forge"
            style={{ width: `${lohPercent}%` }}
          />
        </div>

        {/* Quick-spend buttons */}
        <div className="flex gap-2 flex-wrap mb-2">
          {quickSpendButtons.map(({ label, amount }) => (
            <button
              key={label}
              onClick={() => onExpendLayOnHands(amount)}
              disabled={layOnHands.current < amount}
              className={cn(
                'min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-verdant/10 border border-verdant/25 text-verdant',
                'hover:bg-verdant/20 hover:border-verdant/40',
                'transition-all duration-200 active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                'disabled:opacity-30 disabled:pointer-events-none',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              min={1}
              max={layOnHands.current}
              placeholder="Custom"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCustomSpend()
                }
              }}
              className={cn(
                'w-full min-h-[44px] px-3 py-2 rounded-lg text-sm',
                'bg-white/[0.04] border border-white/10 text-forge-1',
                'placeholder:text-forge-2/50',
                'focus:outline-none focus:ring-2 focus:ring-verdant/40 focus:border-verdant/40',
                'transition-all duration-200',
              )}
            />
          </div>
          <button
            onClick={handleCustomSpend}
            disabled={!customAmount || layOnHands.current <= 0}
            className={cn(
              'min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs font-medium',
              'bg-verdant/10 border border-verdant/25 text-verdant',
              'hover:bg-verdant/20 hover:border-verdant/40',
              'transition-all duration-200 active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              'disabled:opacity-30 disabled:pointer-events-none',
            )}
          >
            <Minus size={14} aria-hidden />
            <span className="sr-only">Spend</span>
          </button>
        </div>
      </div>

      {/* Channel Divinity */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={14} className="text-ember" aria-hidden />
          <span className="text-xs font-semibold text-forge-1 uppercase tracking-wide">
            Channel Divinity
          </span>
          <span className="text-xs text-forge-2 ml-1">
            Hearthfire Manifest
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: channelDivinity.max }).map((_, i) => {
              const available = i < channelDivinity.current
              return (
                <button
                  key={i}
                  onClick={() =>
                    available ? onExpendChannelDivinity() : onRestoreChannelDivinity()
                  }
                  aria-label={
                    available
                      ? 'Expend Channel Divinity use'
                      : 'Restore Channel Divinity use'
                  }
                  className={cn(
                    'w-[28px] h-[28px] min-h-[44px] min-w-[44px]',
                    'p-0 flex items-center justify-center',
                    'rounded-full border-2 transition-all duration-200 ease-forge',
                    'active:scale-[0.9]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    available
                      ? [
                          'bg-ember/30 border-ember/60',
                          'shadow-[0_0_8px_-2px_rgba(244,181,69,0.4)]',
                          'hover:bg-ember/40 hover:border-ember/80',
                        ]
                      : [
                          'bg-white/[0.03] border-white/10',
                          'hover:bg-white/[0.06] hover:border-white/20',
                        ],
                  )}
                >
                  {available && (
                    <div className="w-2.5 h-2.5 rounded-full bg-ember shadow-[0_0_6px_rgba(244,181,69,0.6)]" />
                  )}
                </button>
              )
            })}
          </div>

          <span className="text-xs font-mono text-forge-2">
            {channelDivinity.current}/{channelDivinity.max}
          </span>
        </div>
      </div>

      {/* Aura of Protection */}
      <div className="flex items-center gap-2">
        <Badge variant="arcane">
          <Shield size={12} className="mr-1" aria-hidden />
          {auraRange}ft
        </Badge>
        <span className="text-xs text-forge-2">Aura of Protection</span>
      </div>
    </GlassCard>
  )
}

/** 3. Concentration Tracker */
function ConcentrationTracker({
  concentrationSpell,
  availableSpells,
  onSetConcentration,
  onDropConcentration,
}: {
  concentrationSpell: string | null
  availableSpells: Character['spells']
  onSetConcentration: (spellName: string) => void
  onDropConcentration: () => void
}) {
  const concentrationSpells = availableSpells.filter(
    (s) => s.concentration && s.prepared,
  )

  return (
    <GlassCard
      className={cn(
        'p-4 transition-all duration-300',
        concentrationSpell && 'ring-2 ring-ember/40 shadow-[0_0_20px_-4px_rgba(244,181,69,0.2)]',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Focus size={16} className={cn(concentrationSpell ? 'text-ember' : 'text-forge-2')} aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase">
            Concentration
          </h3>
        </div>

        {concentrationSpell && (
          <button
            onClick={onDropConcentration}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
              'transition-all duration-200 active:scale-[0.95]',
            )}
            aria-label="Drop concentration"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {concentrationSpell ? (
        <div className="flex items-center gap-2">
          <Badge variant="ember">{concentrationSpell}</Badge>
          <span className="text-xs text-forge-2">Concentrating</span>
        </div>
      ) : concentrationSpells.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {concentrationSpells.map((spell) => (
            <button
              key={spell.name}
              onClick={() => onSetConcentration(spell.name)}
              className={cn(
                'min-h-[44px] px-3 py-1.5 rounded-lg',
                'bg-white/[0.04] border border-white/10 text-forge-1 text-xs',
                'hover:bg-ember/10 hover:border-ember/30 hover:text-ember',
                'transition-all duration-200 active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              {spell.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-forge-2">No concentration spells prepared</p>
      )}
    </GlassCard>
  )
}

/** 4. AI Combat Advisor */
function AICombatAdvisor({
  character,
  response,
  loading,
  error,
  onQuery,
  onClear,
}: {
  character: Character
  response: string | null
  loading: boolean
  error: string | null
  onQuery: (message: string) => void
  onClear: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const responseRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || loading) return
    onQuery(trimmed)
    setInputValue('')
  }, [inputValue, loading, onQuery])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // Auto-scroll to response when it arrives
  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [response])

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-arcane" aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase">
            Combat Advisor
          </h3>
        </div>
        {response && (
          <button
            onClick={onClear}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-[0.95]',
            )}
            aria-label="Clear AI response"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <Input
            placeholder="Surrounded by 3 goblins, what should I do?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            icon={Sword}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={loading}
          disabled={!inputValue.trim() || loading}
          aria-label="Send combat question"
          className="shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !response && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02]">
          <Loader2 size={18} className="animate-spin text-arcane" aria-hidden />
          <p className="text-sm text-forge-2">Analyzing the battlefield...</p>
        </div>
      )}

      {/* AI response */}
      {response && (
        <div
          ref={responseRef}
          className={cn(
            'glass-card p-4 max-h-64 overflow-y-auto',
            'text-sm text-forge-1 font-body',
            'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
          )}
        >
          {formatAIResponse(response)}
        </div>
      )}
    </GlassCard>
  )
}

/** 5. Smart Actions Panel (replaces QuickActionsGrid) */
function SmartActionsPanel({
  character,
  concentrationSpell,
  onSelectAction,
  loading,
}: {
  character: Character
  concentrationSpell: string | null
  onSelectAction: (actionName: string, description: string) => void
  loading: boolean
}) {
  const [classActionsOpen, setClassActionsOpen] = useState(true)
  const [spellsOpen, setSpellsOpen] = useState(true)
  const [basicActionsOpen, setBasicActionsOpen] = useState(false)

  const isPaladin = character.class === 'Paladin'
  const availableSlots = countAvailableSlots(character.spellSlots)

  // Group prepared spells by casting time
  const spellGroups = useMemo(() => {
    const prepared = character.spells.filter((s) => s.prepared && s.level > 0)
    const groups: Record<string, typeof prepared> = {
      Action: [],
      'Bonus Action': [],
      Reaction: [],
    }

    for (const spell of prepared) {
      const time = spell.castingTime
      if (time.toLowerCase().includes('bonus')) {
        groups['Bonus Action'].push(spell)
      } else if (time.toLowerCase().includes('reaction')) {
        groups['Reaction'].push(spell)
      } else {
        groups['Action'].push(spell)
      }
    }

    return groups
  }, [character.spells])

  const hasAnySpells = Object.values(spellGroups).some((g) => g.length > 0)

  /** Resource info string for a paladin action */
  const getResourceInfo = useCallback(
    (action: (typeof PALADIN_ACTIONS)[number]): string => {
      if (action.name === 'Divine Smite') {
        return `${availableSlots} slot${availableSlots !== 1 ? 's' : ''}`
      }
      if (action.name === 'Lay on Hands' && character.paladinResources) {
        return `${character.paladinResources.layOnHands.current} HP`
      }
      if (action.name === 'Channel Divinity' && character.paladinResources) {
        return `${character.paladinResources.channelDivinity.current}/${character.paladinResources.channelDivinity.max}`
      }
      return ''
    },
    [availableSlots, character.paladinResources],
  )

  const isResourceEmpty = useCallback(
    (action: (typeof PALADIN_ACTIONS)[number]): boolean => {
      if (action.name === 'Divine Smite') return availableSlots <= 0
      if (action.name === 'Lay on Hands' && character.paladinResources) {
        return character.paladinResources.layOnHands.current <= 0
      }
      if (action.name === 'Channel Divinity' && character.paladinResources) {
        return character.paladinResources.channelDivinity.current <= 0
      }
      return false
    },
    [availableSlots, character.paladinResources],
  )

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase mb-3">
        Actions
      </h3>

      {/* Section 1: Class Actions (Paladin only) */}
      {isPaladin && (
        <div className="mb-3">
          <button
            onClick={() => setClassActionsOpen(!classActionsOpen)}
            className={cn(
              'w-full min-h-[44px] flex items-center justify-between px-1 py-2',
              'text-xs font-semibold text-forge-1 uppercase tracking-wide',
              'transition-all duration-200 active:scale-[0.97]',
            )}
          >
            <span className="flex items-center gap-2">
              <Flame size={14} className="text-ember" aria-hidden />
              Class Actions
            </span>
            {classActionsOpen ? (
              <ChevronUp size={14} className="text-forge-2" aria-hidden />
            ) : (
              <ChevronDown size={14} className="text-forge-2" aria-hidden />
            )}
          </button>

          {classActionsOpen && (
            <div className="flex flex-col gap-2 mt-1">
              {PALADIN_ACTIONS.map((action) => {
                const info = getResourceInfo(action)
                const empty = isResourceEmpty(action)
                return (
                  <button
                    key={action.name}
                    onClick={() => onSelectAction(action.name, action.description)}
                    disabled={loading || empty}
                    className={cn(
                      'min-h-[44px] px-3 py-2.5 rounded-xl text-left',
                      'bg-white/[0.03] border border-white/8',
                      'hover:bg-ember/8 hover:border-ember/20',
                      'transition-all duration-200 active:scale-[0.97]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      'disabled:opacity-40 disabled:pointer-events-none',
                      'group',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-forge-0 group-hover:text-ember transition-colors">
                        {action.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {info && (
                          <span className="text-[10px] font-mono text-forge-2">
                            {info}
                          </span>
                        )}
                        <Badge variant="ember">{action.resourceCost}</Badge>
                      </div>
                    </div>
                    <div className="text-[10px] text-forge-2 mt-0.5 leading-snug line-clamp-2">
                      {action.description}
                    </div>
                    {action.dice && (
                      <Badge variant="neutral" className="mt-1.5">
                        {action.dice}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Prepared Spell Quick-Cast */}
      {hasAnySpells && (
        <div className="mb-3">
          <button
            onClick={() => setSpellsOpen(!spellsOpen)}
            className={cn(
              'w-full min-h-[44px] flex items-center justify-between px-1 py-2',
              'text-xs font-semibold text-forge-1 uppercase tracking-wide',
              'transition-all duration-200 active:scale-[0.97]',
            )}
          >
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-eldritch" aria-hidden />
              Prepared Spells
            </span>
            {spellsOpen ? (
              <ChevronUp size={14} className="text-forge-2" aria-hidden />
            ) : (
              <ChevronDown size={14} className="text-forge-2" aria-hidden />
            )}
          </button>

          {spellsOpen && (
            <div className="flex flex-col gap-3 mt-1">
              {(
                Object.entries(spellGroups) as [string, typeof character.spells][]
              ).map(([groupLabel, spells]) => {
                if (spells.length === 0) return null
                return (
                  <div key={groupLabel}>
                    <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider mb-1.5 block px-1">
                      {groupLabel}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {spells.map((spell) => {
                        const isNonConcentration = !spell.concentration
                        const highlightNonConc =
                          concentrationSpell !== null && isNonConcentration
                        return (
                          <button
                            key={spell.name}
                            onClick={() =>
                              onSelectAction(
                                spell.name,
                                `${spell.description}${spell.tacticalNote ? ' Tactical note: ' + spell.tacticalNote : ''}`,
                              )
                            }
                            disabled={loading}
                            className={cn(
                              'min-h-[44px] px-3 py-2 rounded-lg text-left',
                              'bg-white/[0.03] border border-white/8',
                              'hover:bg-eldritch/8 hover:border-eldritch/20',
                              'transition-all duration-200 active:scale-[0.97]',
                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                              'disabled:opacity-40 disabled:pointer-events-none',
                              'group',
                              highlightNonConc && 'border-arcane/20',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-forge-0 group-hover:text-eldritch transition-colors">
                                {spell.name}
                              </span>
                              <Badge
                                variant={
                                  spell.level === 0 ? 'neutral' : 'eldritch'
                                }
                              >
                                {spell.level === 0
                                  ? 'Cantrip'
                                  : `Lvl ${spell.level}`}
                              </Badge>
                              {spell.concentration && (
                                <span
                                  className="w-2 h-2 rounded-full bg-ember shrink-0"
                                  title="Concentration"
                                />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Basic Actions (collapsed by default) */}
      <div>
        <button
          onClick={() => setBasicActionsOpen(!basicActionsOpen)}
          className={cn(
            'w-full min-h-[44px] flex items-center justify-between px-1 py-2',
            'text-xs font-semibold text-forge-1 uppercase tracking-wide',
            'transition-all duration-200 active:scale-[0.97]',
          )}
        >
          <span className="flex items-center gap-2">
            <Sword size={14} className="text-forge-2" aria-hidden />
            Basic Actions
          </span>
          {basicActionsOpen ? (
            <ChevronUp size={14} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={14} className="text-forge-2" aria-hidden />
          )}
        </button>

        {basicActionsOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            {BASIC_ACTIONS.map((action) => (
              <button
                key={action.name}
                onClick={() => onSelectAction(action.name, action.description)}
                disabled={loading}
                className={cn(
                  'min-h-[44px] px-3 py-2.5 rounded-xl text-left',
                  'bg-white/[0.03] border border-white/8',
                  'hover:bg-arcane/8 hover:border-arcane/20',
                  'transition-all duration-200 active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'disabled:opacity-40 disabled:pointer-events-none',
                  'group',
                )}
              >
                <div className="text-xs font-semibold text-forge-0 group-hover:text-arcane transition-colors">
                  {action.name}
                </div>
                <div className="text-[10px] text-forge-2 mt-0.5 leading-snug line-clamp-2">
                  {action.description}
                </div>
                <Badge
                  variant={action.type === 'Reaction' ? 'ember' : 'neutral'}
                  className="mt-1.5"
                >
                  {action.type}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

/** 6. Rest Buttons */
function RestButtons({
  onShortRest,
  onLongRest,
}: {
  onShortRest: () => void
  onLongRest: () => void
}) {
  const [confirmRest, setConfirmRest] = useState<'short' | 'long' | null>(null)

  const handleRest = useCallback(
    (type: 'short' | 'long') => {
      if (confirmRest === type) {
        if (type === 'short') onShortRest()
        else onLongRest()
        setConfirmRest(null)
      } else {
        setConfirmRest(type)
      }
    },
    [confirmRest, onShortRest, onLongRest],
  )

  // Clear confirmation after 3 seconds
  useEffect(() => {
    if (!confirmRest) return
    const timer = setTimeout(() => setConfirmRest(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmRest])

  return (
    <div className="flex gap-3">
      <Button
        variant={confirmRest === 'short' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRest('short')}
        className="flex-1"
      >
        <Moon size={16} aria-hidden />
        {confirmRest === 'short' ? 'Confirm Short Rest?' : 'Short Rest'}
      </Button>

      <Button
        variant={confirmRest === 'long' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRest('long')}
        className="flex-1"
      >
        <Sun size={16} aria-hidden />
        {confirmRest === 'long' ? 'Confirm Long Rest?' : 'Long Rest'}
      </Button>
    </div>
  )
}

/** 7. Persona Card */
function PersonaCard({ persona }: { persona: NonNullable<Character['persona']> }) {
  const [isOpen, setIsOpen] = useState(false)

  // Pick a random catchphrase on mount
  const catchphrase = useMemo(() => {
    if (!persona.catchphrases || persona.catchphrases.length === 0) return null
    return persona.catchphrases[Math.floor(Math.random() * persona.catchphrases.length)]
  }, [persona.catchphrases])

  return (
    <GlassCard className="p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[44px] flex items-center justify-between',
          'transition-all duration-200 active:scale-[0.97]',
        )}
      >
        <div className="flex items-center gap-2">
          <User size={16} className="text-eldritch" aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 font-display tracking-wide uppercase">
            Character Persona
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-forge-2" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-4">
          {/* Default State */}
          <div>
            <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider block mb-1">
              Default State
            </span>
            <p className="text-sm text-forge-1 italic">{persona.defaultState}</p>
          </div>

          {/* Physical Tics */}
          {persona.physicalTics.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
                Physical Tics
              </span>
              <div className="flex gap-2 flex-wrap">
                {persona.physicalTics.map((tic, i) => (
                  <span
                    key={i}
                    className={cn(
                      'bg-white/5 text-forge-1 rounded-full px-3 py-1.5',
                      'text-xs select-none cursor-default',
                      'transition-all duration-200 active:scale-[0.95]',
                    )}
                  >
                    {tic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scene Instincts */}
          {persona.sceneInstincts.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
                Scene Instincts
              </span>
              <ul className="flex flex-col gap-1">
                {persona.sceneInstincts.map((instinct, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-forge-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-2 shrink-0 mt-1.5" />
                    {instinct}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patron */}
          <div>
            <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider block mb-1">
              Patron
            </span>
            <p className="text-sm text-ember">
              {persona.patron.name} &mdash; {persona.patron.domains.join(', ')}
            </p>
          </div>

          {/* Catchphrase */}
          {catchphrase && (
            <p className="text-sm text-forge-2 italic">&ldquo;{catchphrase}&rdquo;</p>
          )}

          {/* Voice Notes */}
          {persona.voiceNotes && (
            <p className="text-xs text-forge-2 italic">{persona.voiceNotes}</p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CombatHelper({ character, onCharacterUpdate, onOpenDiceRoller }: CombatHelperProps) {
  // ── Combat State (persisted) ──
  const [combatState, setCombatState] = useState<CombatState>(() => {
    const saved = loadCombatState(character.id)
    return saved ?? createCombatState(character)
  })

  // Action menu slide-up panel
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  // Concentration warning dialog
  const [concWarning, setConcWarning] = useState<{ newSpell: string; action: ActionChoice } | null>(null)

  // Damage tracking
  const [currentDamageLog, setCurrentDamageLog] = useState<CombatLog | null>(
    combatState.inCombat ? createCombatLog() : null
  )

  // Derive economy from combatState for the ActionEconomyBar
  const economy: ActionEconomy = combatState.turnActions

  // Concentration state derived from combat state
  const concentrationSpell = combatState.concentrating

  // AI hook
  const { response, loading, error, query, clearResponse } = useAI()

  // Persist combat state whenever it changes
  useEffect(() => {
    saveCombatState(character.id, combatState)
  }, [character.id, combatState])

  // --- Combat lifecycle handlers ---

  const handleStartCombat = useCallback(() => {
    const newState = startCombat(character)
    setCombatState(newState)
    setCurrentDamageLog(createCombatLog())
  }, [character])

  const handleEndCombat = useCallback(() => {
    // Save damage log to history
    if (currentDamageLog && currentDamageLog.entries.length > 0) {
      const finished = endCombatLog(currentDamageLog)
      const history = loadDamageLogs(character.id)
      saveDamageLogs(character.id, [...history, finished])
    }
    setCurrentDamageLog(null)
    const newState = endCombat(character)
    setCombatState(newState)
    clearCombatState(character.id)
  }, [character, currentDamageLog])

  const handleNextTurn = useCallback(() => {
    setCombatState((prev) => nextTurn(prev))
  }, [])

  // --- Action Economy handlers ---

  const toggleEconomy = useCallback((key: keyof ActionEconomy) => {
    setCombatState((prev) => ({
      ...prev,
      turnActions: { ...prev.turnActions, [key]: !prev.turnActions[key] },
    }))
  }, [])

  const resetEconomy = useCallback(() => {
    setCombatState((prev) => ({
      ...prev,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    }))
  }, [])

  // --- Action Menu handler ---

  const applyAction = useCallback(
    (action: ActionChoice) => {
      let newState = useAction(combatState, action.type)

      // Use spell slot if applicable
      if (action.slotLevel) {
        const updated = expendSpellSlot(character, action.slotLevel)
        onCharacterUpdate(updated)
      }

      // Set concentration if the spell is concentration
      if (action.category === 'Spell' || action.category === 'Cantrip') {
        const spell = character.spells.find((s) => s.name === action.name)
        if (spell?.concentration) {
          newState = setCombatConcentration(newState, action.name)
        }
      }

      setCombatState(newState)

      // Open dice roller with prefill if there's a roll notation
      if (action.rollNotation && action.rollLabel && onOpenDiceRoller) {
        onOpenDiceRoller({ notation: action.rollNotation, label: action.rollLabel })
      }
    },
    [combatState, character, onCharacterUpdate, onOpenDiceRoller],
  )

  const handleUseAction = useCallback(
    (action: ActionChoice) => {
      // Check concentration conflict
      if (
        action.category === 'Spell' &&
        action.slotLevel &&
        character.spells.find((s) => s.name === action.name)?.concentration &&
        combatState.concentrating
      ) {
        setConcWarning({ newSpell: action.name, action })
        setActionMenuOpen(false)
        return
      }

      applyAction(action)
      setActionMenuOpen(false)
    },
    [combatState.concentrating, character.spells, applyAction],
  )

  const handleConfirmConcentrationSwitch = useCallback(() => {
    if (!concWarning) return
    applyAction(concWarning.action)
    setConcWarning(null)
  }, [concWarning, applyAction])

  const handleCancelConcentrationSwitch = useCallback(() => {
    setConcWarning(null)
  }, [])

  // --- Spell Slot handlers ---

  const handleExpendSlot = useCallback(
    (level: number) => {
      const updated = expendSpellSlot(character, level)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleRestoreSlot = useCallback(
    (level: number) => {
      const updated = restoreSpellSlot(character, level)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  // --- Paladin Resource handlers ---

  const handleExpendLayOnHands = useCallback(
    (amount: number) => {
      const updated = expendLayOnHands(character, amount)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleExpendChannelDivinity = useCallback(() => {
    const updated = expendChannelDivinity(character)
    onCharacterUpdate(updated)
  }, [character, onCharacterUpdate])

  const handleRestoreChannelDivinity = useCallback(() => {
    if (!character.paladinResources) return
    const { current, max } = character.paladinResources.channelDivinity
    if (current >= max) return
    onCharacterUpdate({
      ...character,
      paladinResources: {
        ...character.paladinResources,
        channelDivinity: {
          ...character.paladinResources.channelDivinity,
          current: current + 1,
        },
      },
    })
  }, [character, onCharacterUpdate])

  // --- Concentration handlers ---

  const handleSetConcentration = useCallback((spellName: string) => {
    setCombatState((prev) => setCombatConcentration(prev, spellName))
  }, [])

  const handleDropConcentration = useCallback(() => {
    setCombatState((prev) => setCombatConcentration(prev, null))
  }, [])

  // --- AI handlers ---

  const handleAIQuery = useCallback(
    (message: string) => {
      const systemPrompt = SYSTEM_PROMPTS.combatAdvisor(character)
      query(systemPrompt, message)
    },
    [character, query],
  )

  const handleQuickAction = useCallback(
    (actionName: string, description: string) => {
      const message = `I want to use ${actionName} in combat. ${description} What's the best tactical approach for my character?`
      handleAIQuery(message)
    },
    [handleAIQuery],
  )

  // --- Damage log handler ---

  const handleLogDamage = useCallback(
    (entry: Omit<DamageEntry, 'timestamp'>) => {
      if (!currentDamageLog) return
      const updated = logDamageEntry(currentDamageLog, entry)
      setCurrentDamageLog(updated)
    },
    [currentDamageLog],
  )

  // --- Rest handlers ---

  const handleShortRest = useCallback(() => {
    const updated = shortRest(character)
    onCharacterUpdate(updated)
    setCombatState((prev) => ({
      ...prev,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    }))
  }, [character, onCharacterUpdate])

  const handleLongRest = useCallback(() => {
    const updated = longRest(character)
    onCharacterUpdate(updated)
    const newState = createCombatState(updated)
    setCombatState(newState)
    clearCombatState(character.id)
    clearResponse()
  }, [character, onCharacterUpdate, clearResponse])

  return (
    <section className="flex flex-col gap-4" aria-label="Combat Helper">
      {/* Condition Reminder Banner */}
      {character.conditions.length > 0 && (
        <ConditionReminder character={character} onOpenDiceRoller={onOpenDiceRoller} />
      )}

      {/* 0. Combat Toggle + Round Counter */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant={combatState.inCombat ? 'secondary' : 'primary'}
              size="sm"
              onClick={combatState.inCombat ? handleEndCombat : handleStartCombat}
              className={cn(
                combatState.inCombat && 'border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/50',
              )}
            >
              {combatState.inCombat ? (
                <><Square size={14} aria-hidden /> End Combat</>
              ) : (
                <><Play size={14} aria-hidden /> Start Combat</>
              )}
            </Button>

            {combatState.inCombat && (
              <div className="flex items-center gap-2">
                <Badge variant="arcane">
                  Round {combatState.round}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextTurn}
                  aria-label="Next turn"
                  className="gap-1"
                >
                  <SkipForward size={14} aria-hidden />
                  Next Turn
                </Button>
              </div>
            )}
          </div>

          {combatState.inCombat && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActionMenuOpen(true)}
              className="gap-1.5"
            >
              <Sword size={14} aria-hidden />
              Action
            </Button>
          )}
        </div>

        {/* Action economy status row (compact, shown only in combat) */}
        {combatState.inCombat && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {[
              { key: 'action' as const, label: 'Action', icon: Sword },
              { key: 'bonusAction' as const, label: 'Bonus', icon: Zap },
              { key: 'reaction' as const, label: 'Reaction', icon: Shield },
              { key: 'movement' as const, label: 'Move', icon: Footprints },
            ].map(({ key, label, icon: Icon }) => {
              const used = combatState.turnActions[key]
              return (
                <span
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium',
                    'border select-none transition-colors duration-200',
                    used
                      ? 'bg-white/[0.02] border-white/5 text-forge-2/50 line-through'
                      : 'bg-arcane/8 border-arcane/20 text-arcane',
                  )}
                >
                  <Icon size={10} aria-hidden />
                  {label}
                </span>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Concentration Warning Dialog */}
      {concWarning && (
        <GlassCard className="p-4 ring-2 ring-ember/40 animate-fade-in">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-forge-0">
                Drop Concentration?
              </p>
              <p className="text-xs text-forge-2 mt-1">
                You are concentrating on <strong className="text-ember">{combatState.concentrating}</strong>.
                Casting <strong className="text-eldritch">{concWarning.newSpell}</strong> will end that concentration.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleConfirmConcentrationSwitch} className="flex-1">
              Switch Concentration
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCancelConcentrationSwitch} className="flex-1">
              Cancel
            </Button>
          </div>
        </GlassCard>
      )}

      {/* 0b. HP Tracker */}
      <HPTracker
        character={character}
        onCharacterUpdate={onCharacterUpdate}
      />

      {/* 1. Action Economy Bar */}
      <ActionEconomyBar
        economy={economy}
        onToggle={toggleEconomy}
        onReset={resetEconomy}
      />

      {/* 2. Spell Slots Display */}
      <SpellSlotsDisplay
        spellSlots={character.spellSlots}
        onExpend={handleExpendSlot}
        onRestore={handleRestoreSlot}
      />

      {/* 3. Paladin Resource Tracker (conditional) */}
      {character.paladinResources && (
        <PaladinResourceTracker
          resources={character.paladinResources}
          spellSlots={character.spellSlots}
          onExpendLayOnHands={handleExpendLayOnHands}
          onExpendChannelDivinity={handleExpendChannelDivinity}
          onRestoreChannelDivinity={handleRestoreChannelDivinity}
        />
      )}

      {/* 4. Concentration Tracker */}
      <ConcentrationTracker
        concentrationSpell={concentrationSpell}
        availableSpells={character.spells}
        onSetConcentration={handleSetConcentration}
        onDropConcentration={handleDropConcentration}
      />

      {/* 4b. Damage Tracker (shown during and after combat) */}
      <DamageTracker
        characterId={character.id}
        currentLog={currentDamageLog}
        round={combatState.round}
        onLogDamage={handleLogDamage}
      />

      {/* 5. AI Combat Advisor */}
      <AICombatAdvisor
        character={character}
        response={response}
        loading={loading}
        error={error}
        onQuery={handleAIQuery}
        onClear={clearResponse}
      />

      {/* 6. Smart Actions Panel (replaces QuickActionsGrid) */}
      <SmartActionsPanel
        character={character}
        concentrationSpell={concentrationSpell}
        onSelectAction={handleQuickAction}
        loading={loading}
      />

      {/* 7. Rest Buttons */}
      <RestButtons onShortRest={handleShortRest} onLongRest={handleLongRest} />

      {/* 8. Persona Card (conditional) */}
      {character.persona && <PersonaCard persona={character.persona} />}

      {/* 9. Action Menu (slide-up panel) */}
      <ActionMenu
        isOpen={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        character={character}
        combatState={combatState}
        onUseAction={handleUseAction}
      />
    </section>
  )
}
