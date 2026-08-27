import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Sword,
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
  Flame,
  User,
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
  type ActionEconomyType,
  createCombatState,
  startCombat,
  endCombat,
  nextTurn,
  useAction,
  setConcentration as setCombatConcentration,
  saveCombatState,
  loadCombatState,
  clearCombatState,
  spellActionType,
  featureActionType,
} from '../lib/combat-state'
import { TurnDeck, type ActionEconomy } from './TurnDeck'
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
import { TurnSummary } from './combat/TurnSummary'
import { QuickLookup } from './combat/QuickLookup'
import { CanonMatchReport } from './combat/CanonMatchReport'
import { VitalsBand } from './combat/VitalsBand'
import { TurnOptionRow } from './combat/TurnOptionRow'
import { ReactionsBand } from './combat/ReactionsBand'
import { CombatProvider, useCombat } from './turn/CombatProvider'
import { useCollapsible } from '../hooks/useCollapsible'
import { type CombatLog, type DamageEntry, createCombatLog, logDamage as logDamageEntry, endCombatLog, saveDamageLogs, loadDamageLogs } from '../lib/damage-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CombatHelperProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

/* The type moved to TurnDeck, which is now the surface that owns these four
   slots — see § 9.1 / U-2. Imported back here because the state still lives in
   CombatHelper and is handed down; nothing else changed about it. */
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
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
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
  onCancel,
  onClear,
}: {
  character: Character
  response: string | null
  loading: boolean
  error: string | null
  onQuery: (message: string) => void
  /** The way out. See the Stop button below — this panel disables its own
   *  input while it waits, so without this there was no way out. */
  onCancel: () => void
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
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
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
        {/* While it is thinking, the send button IS the stop button. The panel
            locks its own input during a query, so putting the escape anywhere
            else would mean hunting for it mid-fight — it belongs under the
            thumb that is already there.

            The WORD, not a glyph. This was an ✕ until the first screenshot of
            it, which showed an ✕ sitting four inches below the panel's other
            ✕ — the one that clears a finished answer. Two identical marks that
            do different things, in the one place where the whole point is not
            having to think. "Stop" cannot be misread. */}
        {loading ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            aria-label="Stop the advisor"
            className="shrink-0"
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            aria-label="Send combat question"
            className="shrink-0"
          >
            <Send size={16} />
          </Button>
        )}
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
          {/* Status, not a control. There was a second Stop here; two controls
              for one decision is a decision to make, and this row's job is to
              say what is happening. */}
          <p className="text-sm text-forge-2">Analyzing the battlefield&hellip;</p>
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
      <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase mb-3">
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
                      'enabled:hover:bg-ember/8 enabled:hover:border-ember/20',
                      'transition-all duration-200 enabled:active:scale-[0.97]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'group',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-forge-0 group-hover:text-ember transition-colors">
                        {action.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {info && (
                          <span className="text-xs font-mono text-forge-2">
                            {info}
                          </span>
                        )}
                        <Badge variant="ember">{action.resourceCost}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-forge-2 mt-0.5 leading-snug line-clamp-2">
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
                    <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-1.5 block px-1">
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
                              'enabled:hover:bg-eldritch/8 enabled:hover:border-eldritch/20',
                              'transition-all duration-200 enabled:active:scale-[0.97]',
                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              'group',
                              highlightNonConc && 'border-arcane/20',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-semibold text-forge-0 group-hover:text-eldritch transition-colors truncate">
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
                              <span className="text-xs font-mono text-forge-2 shrink-0 whitespace-nowrap">
                                {spell.range}
                              </span>
                            </div>
                            {/* Mechanics row */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {spell.saveType ? (
                                <span className="text-xs font-mono text-arcane">
                                  DC {character.spellSaveDC} {spell.saveType}
                                </span>
                              ) : spell.level > 0 ? (
                                <span className="text-xs font-mono text-arcane">
                                  +{character.spellAttackBonus} hit
                                </span>
                              ) : null}
                              {spell.damageDice && (
                                <span className="text-xs font-mono text-ember font-medium">
                                  {spell.damageDice}{spell.damageType ? ` ${spell.damageType}` : ''}
                                </span>
                              )}
                              {spell.castingTime.toLowerCase().includes('bonus') && (
                                <Badge variant="ember" className="text-xs px-1.5 py-0">BA</Badge>
                              )}
                              {spell.castingTime.toLowerCase().includes('reaction') && (
                                <Badge variant="ember" className="text-xs px-1.5 py-0">Rx</Badge>
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
                  'enabled:hover:bg-arcane/8 enabled:hover:border-arcane/20',
                  'transition-all duration-200 enabled:active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'group',
                )}
              >
                <div className="text-xs font-semibold text-forge-0 group-hover:text-arcane transition-colors">
                  {action.name}
                </div>
                <div className="text-xs text-forge-2 mt-0.5 leading-snug line-clamp-2">
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
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
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
            <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1">
              Default State
            </span>
            <p className="text-sm text-forge-1 italic">{persona.defaultState}</p>
          </div>

          {/* Physical Tics */}
          {persona.physicalTics.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
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
              <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
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
            <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1">
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
// Collapsible Section Wrapper
// ---------------------------------------------------------------------------

function CollapsibleCombatSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  title: string
  icon: typeof Sword
  isOpen: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full min-h-[48px] px-4 py-2.5 rounded-xl',
          'flex items-center justify-between',
          'bg-white/[0.03] border border-white/8',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          isOpen && 'bg-white/[0.05] border-white/12',
        )}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-forge-1" aria-hidden />
          <span className="text-xs font-semibold text-forge-0 uppercase tracking-wider">{title}</span>
          {badge && (
            <Badge variant="ember">{badge}</Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-forge-2" aria-hidden />
        )}
      </button>
      {isOpen && (
        <div className="mt-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── "YOUR TURN" — the engine's first appearance on the Play tab. Slice 5. ──
 *
 * Everything above this line on the combat screen is either a number Marcus
 * reads or a menu he opens. This is the first surface that answers the actual
 * question — "it is my turn, what can I do RIGHT NOW" — and every row in it
 * came through `composeTurn` → `overlayCanon`, which means the words are
 * canon's where canon has them and Marcus's where it does not.
 *
 * It reads `useCombat()` and nothing else. No props, no state, no writes: the
 * provider it reads from persists only inside its dispatch handler, and this
 * component never dispatches. That is what makes it safe to mount alongside the
 * legacy screen instead of in place of it.
 *
 * IT IS A SHORTLIST, AND IT SAYS SO. `turn.ranked` is the top five uncontended
 * affordable options. Two things are deliberately NOT here yet: the contention
 * brackets (Smite vs Lay on Hands vs Misty Step — one decision with three
 * faces) and the "everything else" fold. Both are real parts of the turn and
 * both arrive with slices 6 and 9; until then the footer counts them out loud
 * rather than letting the list imply it is the whole truth. Nothing is lost in
 * the meantime — every existing surface on this tab is still below, untouched.
 */
function YourTurnList() {
  const { turn } = useCombat()

  /* REACTIONS ARE NOT LISTED HERE ANY MORE — slice 6.
   *
   * Off your turn `rank.ts` scores a reaction +40 and both of Nix's land at the
   * top of `ranked`. They are now also the whole content of the reactions band
   * directly below, and painting the same two rows twice on one screen is worse
   * than painting them nowhere: it makes a player count two Reactions. The band
   * is the one place they live; this list is everything that costs a turn. */
  const ranked = turn.ranked.filter(option => option.cost.slot !== 'reaction')
  const elsewhere =
    turn.rest.filter(o => o.cost.slot !== 'reaction').length +
    turn.mutex.reduce((n, g) => n + g.faces.filter(f => f.cost.slot !== 'reaction').length, 0)

  /* A `section` with a stable label rather than a GlassCard, and a real `ul`
     rather than a stack of divs, because the browser prover has to be able to
     ask the PAINTED page "which rows are these, and how many line boxes did
     each one take" — and slice 4's finding Q is that a proof which reads the
     model instead of the paint is a proof of the model. `glass-card` is the
     same class GlassCard applies, so nothing about the look changes. */
  return (
    <section className="glass-card p-3" aria-label="Your turn options">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-forge-0">
          {/* The caption is the same fact the rest of the screen is composed
              from, not a hardcoded string — off-turn a list of reactions headed
              "Your turn" says exactly the wrong thing. */}
          {turn.yourTurn ? 'Your turn' : 'The moment'}
        </h3>
        <span className="font-mono text-[11px] text-forge-2">{ranked.length} ready</span>
      </div>

      {ranked.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {ranked.map(option => (
            <li key={option.id}>
              <TurnOptionRow option={option} />
            </li>
          ))}
        </ul>
      ) : (
        /* Off-turn this is the usual state, and it is not a failure — it is the
           rule. Saying so, and pointing at the band that DOES have something in
           it, is the difference between an empty list and a wrong one. */
        <p className="mt-2 text-xs leading-snug text-forge-1">
          {turn.yourTurn
            ? 'Nothing here is both affordable and yours to spend this moment. Everything you own is still in the sections below.'
            : 'It is not your turn — a Reaction is the only thing you can spend. Your reactions are listed just below.'}
        </p>
      )}

      {elsewhere > 0 && (
        <p className="mt-2 text-[11px] leading-snug text-forge-2">
          {elsewhere} more — including anything that contends for the same slot — are in the
          sections below.
        </p>
      )}
    </section>
  )
}

/* The context read for the reactions band. Slice 6.
 *
 * `ReactionsBand` itself takes plain props — no `useCombat`, no `useCollapsible`
 * — so it renders identically under `renderToStaticMarkup` and can be tested
 * without a DOM. This eight-line wrapper is where the hooks live instead.
 *
 * The collapse key joins the map every other section on this tab already uses
 * (`codex-ui-${characterId}`). No new storage key: Marcus asked for fewer things
 * on screen, not for more places a preference can go missing. Default OPEN,
 * because this band is the thing he told us was absent. */
function ReactionsBandLive({ character }: { character: Character }) {
  const { turn } = useCombat()
  const section = useCollapsible('combat-reactions', character.id, true)
  return (
    <ReactionsBand
      turn={turn}
      character={character}
      isOpen={section.isOpen}
      onToggle={section.toggle}
    />
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/* THE SHELL. Table Truth slice 5.
 *
 * `CombatProvider` is the layer that owns the rules engine — `composeTurn`, the
 * reducer, the undo log. Until now nothing on the Play tab mounted it, so the
 * engine that Slices 1-4 built has never once been on screen at the table.
 * This is the wire.
 *
 * IT IS MOUNTED READ-ONLY, AND THAT IS A PROPERTY OF THE PROVIDER, NOT A HOPE.
 * `CombatProvider` persists in exactly one place — inside `commit`, which is
 * reachable only from `dispatch` and `undoLast`. Nothing below dispatches yet.
 * So on this slice the provider reads `codex-combat-${id}`, composes the turn
 * from it, and writes nothing at all; `turn/storage-safety.test.tsx` proves the
 * key is byte-identical across a full render — and that nothing so much as
 * called `setItem` — rather than asserting it in a comment.
 *
 * WHY A SHELL AND NOT A HOOK CALL INSIDE THE BODY. `CombatHelperInner` still
 * owns the legacy write path — the `useState` at the top and the `useEffect`
 * that saves on every change, including on mount. Two writers to one key is the
 * hazard this phase exists to retire, and the retirement happens in slice 10,
 * deliberately, after the read path has been proven at the table. Until then
 * the two are kept in a strict order: the provider's state initialiser runs
 * during the SHELL's render, before the inner component renders and long before
 * its effect fires, so the provider always sees the bytes as they were on
 * arrival. Reversing that order is the one edit that would break this.
 *
 * `key={character.id}` is load-bearing: the provider binds to one character and
 * has no effect watching the id, because the failure mode of getting that wrong
 * is writing Nix's spent slots onto somebody else's sheet.
 */
export function CombatHelper(props: CombatHelperProps) {
  return (
    <CombatProvider
      key={props.character.id}
      character={props.character}
      onCharacterUpdate={props.onCharacterUpdate}
    >
      <CombatHelperInner {...props} />
    </CombatProvider>
  )
}

function CombatHelperInner({ character, onCharacterUpdate, onOpenDiceRoller }: CombatHelperProps) {
  // ── Combat State (persisted) ──
  const [combatState, setCombatState] = useState<CombatState>(() => {
    const saved = loadCombatState(character.id)
    return saved ?? createCombatState(character)
  })

  // Action menu slide-up panel
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [actionMenuFilter, setActionMenuFilter] = useState<ActionEconomyType>('action')

  // Concentration warning dialog
  const [concWarning, setConcWarning] = useState<{ newSpell: string; action: ActionChoice } | null>(null)

  // Damage tracking
  const [currentDamageLog, setCurrentDamageLog] = useState<CombatLog | null>(
    combatState.inCombat ? createCombatLog() : null
  )

  // Quick lookup panel
  const [lookupOpen, setLookupOpen] = useState(false)

  // Collapsible section hooks.
  // Action economy, spell slots and class resources no longer have one: those
  // three moved into the fixed TurnDeck (§ 9.1 / U-2), where being collapsible
  // would defeat the point — the deck exists so a spend is always reachable.
  const concentrationSection = useCollapsible('combat-concentration', character.id, true)
  const conditionsSection = useCollapsible('combat-conditions', character.id, false)
  const aiAdvisorSection = useCollapsible('combat-ai-advisor', character.id, false)
  const damageLogSection = useCollapsible('combat-damage-log', character.id, false)
  const actionsRefSection = useCollapsible('combat-actions-ref', character.id, false)
  const restSection = useCollapsible('combat-rest', character.id, false)

  // Derive economy from combatState for the ActionEconomyBar
  const economy: ActionEconomy = combatState.turnActions

  // Concentration state derived from combat state
  const concentrationSpell = combatState.concentrating

  // AI hook
  const { response, loading, error, queryStream, cancel, clearResponse } = useAI()

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
      // Streamed — counsel arrives as it's thought, not as a wall after a wait
      queryStream(systemPrompt, message).catch(() => { /* surfaced via useAI error state */ })
    },
    [character, queryStream],
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

  // ── Count available options per action economy type (for badges) ──
  const actionMenuCounts = useMemo(() => {
    const counts: Record<ActionEconomyType, number> = { action: 0, bonusAction: 0, reaction: 0 }

    // Weapons = action only
    counts.action += character.weapons.length

    // Spells (cantrips + leveled, filtered by casting time)
    for (const spell of character.spells) {
      if (!spell.prepared) continue
      const type = spellActionType(spell.castingTime)
      counts[type]++
    }

    // Class features
    for (const feature of character.features) {
      if (feature.level > character.level) continue
      const type = featureActionType(feature)
      counts[type]++
    }

    // Other universal actions: 6 standard actions + bonus actions + reactions
    counts.action += 6 // Dash, Dodge, Disengage, Help, Hide, Ready
    counts.bonusAction += 1 // Two-Weapon Attack
    counts.reaction += 2 // Opportunity Attack, Readied Action

    return counts
  }, [character.weapons, character.spells, character.features, character.level])

  const openActionMenu = useCallback((filter: ActionEconomyType) => {
    setActionMenuFilter(filter)
    setActionMenuOpen(true)
  }, [])

  return (
    <section className="flex flex-col gap-4" aria-label="Combat Helper">
      {/* ── TEMPORARY — Table Truth slice 1's tracer bullet ──
             Proves the canon corpus loaded, and says out loud what it does NOT
             cover on this sheet. Read-only: it dispatches nothing and persists
             nothing. Slice 9 deletes it, once the rows themselves carry canon
             and the coverage is visible where it actually matters. */}
      <CanonMatchReport character={character} />

      {/* ── Table Truth slice 2 — the vitals band ──
             Save DC, initiative and proficiency were absent from this surface
             entirely; AC and spell attack existed only in the unmounted
             combat/StatsBar.tsx. First thing on the tab because it is the set
             of numbers a turn is made of, and because V-3 wants them read at
             60cm rather than hunted for. Read-only: derives and renders. */}
      <VitalsBand character={character} />

      {/* ── Table Truth slice 5 — the ranked turn list ──
             The rules engine's first appearance on this tab. Above TurnSummary
             because it answers the question TurnSummary makes you go hunting
             for, and because V-6 wants the thing you read first to be the thing
             you need first. TurnSummary stays exactly where it is: slice 9 is
             where surfaces are retired, and only after what each one uniquely
             does has been pinned as a test. */}
      <YourTurnList />

      {/* ── Table Truth slice 6 — the reactions band ──
             Marcus: the combat tab doesn't show "my reactions (like hearth fire
             manifest and what it does or when i can use it)". Directly below
             the turn list because the two answer opposite halves of the round,
             and a player scanning off-turn should hit this second, not tenth.
             Read-only, like everything else on this tab so far: it derives from
             the same composed turn and writes only its own collapse flag. */}
      <ReactionsBandLive character={character} />

      {/* ── Always visible: TurnSummary (when in combat) ── */}
      {combatState.inCombat && (
        <TurnSummary
          character={character}
          combatState={combatState}
          onNextTurn={handleNextTurn}
          onEndCombat={handleEndCombat}
          onOpenDiceRoller={onOpenDiceRoller}
          onOpenLookup={() => setLookupOpen(true)}
          onCombatStateChange={setCombatState}
          onCharacterUpdate={onCharacterUpdate}
        />
      )}

      {/* ── «Start Combat» is no longer here ──
             It moved into the fixed TurnDeck on 2026-08-25. It was a `sm`
             button alone inside a full-width GlassCard at the top of this
             page — y=113 on an 844px screen — and V-6 asks that turn-critical
             controls sit in the bottom 60%. The behaviour is untouched:
             `handleStartCombat` is the same handler, passed down. Only where
             it is, is different. See TurnDeck.tsx's header for the full note,
             including why a control that spends nothing is allowed there. */}

      {/* Condition Reminder Banner */}
      {character.conditions.length > 0 && (
        <ConditionReminder character={character} onOpenDiceRoller={onOpenDiceRoller} />
      )}

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

      {/* ── The turn deck ───────────────────────────────────────────────────
           These three surfaces — the economy, the slots, the class resources —
           are what a turn SPENDS, and they are no longer in this scroll at all.
           They are rendered at the bottom of this component as a fixed deck
           pinned above the tab bar (`TurnDeck.tsx`), because ordering them
           within the page could never satisfy V-6: put them first and they land
           at the TOP of the screen, put them later and they fall off the
           bottom. An earlier pass moved them above the HP tracker and got the
           first spell-slot pip from y=1647 to y=903 — real, and still past the
           fold on an 844-tall phone.

           HP, conditions, the damage log, the advisor and the reference stay
           here, in the page, because they are READ rather than spent. That is
           the line the deck is drawn on: it holds what mutates a number on
           disk, and nothing else. § 9.1 / U-2. ── */}

      {/* ── Always visible: HP Tracker ── */}
      <HPTracker
        character={character}
        onCharacterUpdate={onCharacterUpdate}
      />

      {/* ── Collapsible: Concentration (only when NOT in combat — TurnSummary handles it during combat) ── */}
      {!combatState.inCombat && (
        <CollapsibleCombatSection
          title="Concentration"
          icon={Focus}
          isOpen={concentrationSection.isOpen}
          onToggle={concentrationSection.toggle}
          badge={concentrationSpell || undefined}
        >
          <ConcentrationTracker
            concentrationSpell={concentrationSpell}
            availableSpells={character.spells}
            onSetConcentration={handleSetConcentration}
            onDropConcentration={handleDropConcentration}
          />
        </CollapsibleCombatSection>
      )}

      {/* ── Collapsible: Damage Log ── */}
      <CollapsibleCombatSection
        title="Damage Log"
        icon={Flame}
        isOpen={damageLogSection.isOpen}
        onToggle={damageLogSection.toggle}
      >
        <DamageTracker
          characterId={character.id}
          currentLog={currentDamageLog}
          round={combatState.round}
          onLogDamage={handleLogDamage}
        />
      </CollapsibleCombatSection>

      {/* ── Collapsible: AI Combat Advisor ── */}
      <CollapsibleCombatSection
        title="Combat Advisor"
        icon={Sparkles}
        isOpen={aiAdvisorSection.isOpen}
        onToggle={aiAdvisorSection.toggle}
      >
        <AICombatAdvisor
          character={character}
          response={response}
          loading={loading}
          error={error}
          onQuery={handleAIQuery}
          onCancel={cancel}
          onClear={clearResponse}
        />
      </CollapsibleCombatSection>

      {/* ── Collapsible: Actions Reference ── */}
      <CollapsibleCombatSection
        title="Actions Reference"
        icon={Sword}
        isOpen={actionsRefSection.isOpen}
        onToggle={actionsRefSection.toggle}
      >
        <SmartActionsPanel
          character={character}
          concentrationSpell={concentrationSpell}
          onSelectAction={handleQuickAction}
          loading={loading}
        />
      </CollapsibleCombatSection>

      {/* ── Collapsible: Rest Management ── */}
      <CollapsibleCombatSection
        title="Rest Management"
        icon={Moon}
        isOpen={restSection.isOpen}
        onToggle={restSection.toggle}
      >
        <RestButtons onShortRest={handleShortRest} onLongRest={handleLongRest} />
      </CollapsibleCombatSection>

      {/* 8. Persona Card (conditional) */}
      {character.persona && <PersonaCard persona={character.persona} />}

      {/* 9. Action Menu (slide-up panel) */}
      <ActionMenu
        isOpen={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        character={character}
        combatState={combatState}
        onUseAction={handleUseAction}
        filter={actionMenuFilter}
      />

      {/* 10. Quick Lookup (slide-up panel) */}
      <QuickLookup
        isOpen={lookupOpen}
        onClose={() => setLookupOpen(false)}
        character={character}
        onRollDice={onOpenDiceRoller}
      />

      {/* 11. The turn deck — fixed, above the tab bar, never scrolls.
             Rendered last so it is the last thing in the stacking context that
             is not an overlay; positioned by `position: fixed`, so where it
             appears in this tree does not affect where it appears on screen. */}
      <TurnDeck
        character={character}
        inCombat={combatState.inCombat}
        onStartCombat={handleStartCombat}
        economy={economy}
        onToggleEconomy={toggleEconomy}
        onResetEconomy={resetEconomy}
        onExpendSlot={handleExpendSlot}
        onRestoreSlot={handleRestoreSlot}
        onExpendLayOnHands={handleExpendLayOnHands}
        onExpendChannelDivinity={handleExpendChannelDivinity}
        onRestoreChannelDivinity={handleRestoreChannelDivinity}
      />
    </section>
  )
}
