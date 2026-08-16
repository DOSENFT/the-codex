import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Sword,
  Zap,
  Shield,
  Footprints,
  Focus,
  AlertTriangle,
  Dices,
  SkipForward,
  Search,
  Heart,
  Flame,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Square,
  Sparkles,
  Radio,
  Info,
  Pencil,
  Plus,
  Check,
  Minus,
  Trash2,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  type Character,
  type Spell,
  type ClassFeature,
  abilityModifier,
  attackBonus,
  expendSpellSlot,
  restoreSpellSlot,
} from '../../lib/character'
import {
  type CombatState,
  type ActionEconomyType,
  spellActionType,
  featureActionType,
  useAction,
  setConcentration,
} from '../../lib/combat-state'
import { getFeatTips } from '../../lib/skill-guide'
import { categorizeTurnOptions, levelLabel, type ActionOption } from '../../lib/turn/options'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

// ---------------------------------------------------------------------------
// Action Notes — persistent custom notes per action per character
// ---------------------------------------------------------------------------

interface ActionNote {
  label: string
  text: string
}

interface ActionNotesData {
  [actionName: string]: {
    customTip?: string        // overrides auto-generated strategicTip
    notes: ActionNote[]       // custom note categories
  }
}

function loadActionNotes(characterId: string): ActionNotesData {
  try {
    const raw = localStorage.getItem(`codex-action-notes-${characterId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveActionNotes(characterId: string, notes: ActionNotesData): void {
  localStorage.setItem(`codex-action-notes-${characterId}`, JSON.stringify(notes))
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TurnSummaryProps {
  character: Character
  combatState: CombatState
  onNextTurn: () => void
  onEndCombat: () => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
  onOpenLookup: () => void
  onCombatStateChange: (state: CombatState) => void
  onCharacterUpdate: (character: Character) => void
}

// The composition logic that lived here now lives in src/lib/turn/options.ts,
// unchanged, so that composeTurn() and this screen cannot drift apart.  It is
// re-exported from this module because Slice 2's characterization suite
// imports it from here and that import must keep working — the tests are the
// proof of the move, so the move may not disturb them.
export {
  categorizeTurnOptions,
  type ActionOption,
  type CategorizedOptions,
} from '../../lib/turn/options'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TurnSummary({
  character,
  combatState,
  onNextTurn,
  onEndCombat,
  onOpenDiceRoller,
  onOpenLookup,
  onCombatStateChange,
  onCharacterUpdate,
}: TurnSummaryProps) {
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState<ActionNotesData>(() => loadActionNotes(character.id))

  // Persist action notes when they change
  useEffect(() => {
    saveActionNotes(character.id, actionNotes)
  }, [character.id, actionNotes])

  // Categorize available options by action type.  The body of this memo was
  // lifted verbatim to categorizeTurnOptions() above so Phase-0 behaviour can
  // be pinned by tests before Slice 4 extracts it to src/lib/turn/.
  const { actions, bonusActions, reactions, passives } = useMemo(
    () => categorizeTurnOptions(character),
    [character],
  )

  // Handle using an action — this actually does things
  const handleUseAction = useCallback((option: ActionOption) => {
    let newState = useAction(combatState, option.actionEconomy)

    // Expend spell slot if leveled spell
    if (option.type === 'spell' && option.spellLevel && option.spellLevel > 0) {
      const updated = expendSpellSlot(character, option.spellLevel)
      onCharacterUpdate(updated)
    }

    // Set concentration if applicable
    if (option.isConcentration) {
      newState = setConcentration(newState, option.name)
    }

    onCombatStateChange(newState)

    // Open dice roller if there's something to roll
    if (option.rollNotation && option.rollLabel && onOpenDiceRoller) {
      onOpenDiceRoller({ notation: option.rollNotation, label: option.rollLabel })
    }

    setExpandedAction(null)
  }, [combatState, character, onCharacterUpdate, onCombatStateChange, onOpenDiceRoller])

  // Toggle action economy manually
  const toggleEconomy = useCallback((key: keyof CombatState['turnActions']) => {
    onCombatStateChange({
      ...combatState,
      turnActions: { ...combatState.turnActions, [key]: !combatState.turnActions[key] },
    })
  }, [combatState, onCombatStateChange])

  // Reset action economy
  const resetEconomy = useCallback(() => {
    onCombatStateChange({
      ...combatState,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    })
  }, [combatState, onCombatStateChange])

  // Drop concentration
  const handleDropConcentration = useCallback(() => {
    onCombatStateChange(setConcentration(combatState, null))
  }, [combatState, onCombatStateChange])

  // Spell slot manual controls
  const handleExpendSlot = useCallback((level: number) => {
    const updated = expendSpellSlot(character, level)
    onCharacterUpdate(updated)
  }, [character, onCharacterUpdate])

  const handleRestoreSlot = useCallback((level: number) => {
    const updated = restoreSpellSlot(character, level)
    onCharacterUpdate(updated)
  }, [character, onCharacterUpdate])

  // Action notes CRUD
  const updateActionNote = useCallback((actionName: string, customTip: string | undefined, notes: ActionNote[]) => {
    setActionNotes(prev => ({
      ...prev,
      [actionName]: { customTip, notes },
    }))
  }, [])

  const MAX_SHOW = 4

  return (
    <div
      className={cn(
        'rounded-xl border border-ember/25 bg-ember/[0.04] overflow-hidden',
        'animate-fade-in',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-ember/[0.06] border-b border-ember/15">
        <div className="flex items-center gap-2">
          <Badge variant="ember">Round {combatState.round}</Badge>
          <span className="text-sm font-bold text-forge-0 uppercase tracking-wide">Your Turn</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenLookup}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-arcane hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Quick lookup"
          >
            <Search size={16} />
          </button>
          <Button variant="primary" size="sm" onClick={onNextTurn}>
            <SkipForward size={14} aria-hidden />
            Next Turn
          </Button>
        </div>
      </div>

      {/* ── Action Economy Strip ── */}
      <div className="px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          {([
            { key: 'action' as const, label: 'Action', icon: Sword, color: 'arcane' as const },
            { key: 'bonusAction' as const, label: 'Bonus', icon: Zap, color: 'ember' as const },
            { key: 'reaction' as const, label: 'React', icon: Shield, color: 'eldritch' as const },
            { key: 'movement' as const, label: 'Move', icon: Footprints, color: 'neutral' as const },
          ] as const).map(({ key, label, icon: Icon, color }) => {
            const used = combatState.turnActions[key]
            return (
              <button
                key={key}
                onClick={() => toggleEconomy(key)}
                aria-pressed={used}
                aria-label={`${label}: ${used ? 'used' : 'available'}`}
                className={cn(
                  'flex-1 min-h-[44px] px-2 rounded-lg',
                  'flex items-center justify-center gap-1.5',
                  'text-xs font-semibold border',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.96] select-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  used
                    ? 'bg-white/[0.02] border-white/5 text-forge-2/40 line-through'
                    : color === 'arcane'
                      ? 'bg-arcane/10 border-arcane/25 text-arcane'
                      : color === 'ember'
                        ? 'bg-ember/10 border-ember/25 text-ember'
                        : color === 'eldritch'
                          ? 'bg-eldritch/10 border-eldritch/25 text-eldritch'
                          : 'bg-white/[0.04] border-white/10 text-forge-1',
                )}
              >
                <Icon size={13} aria-hidden />
                {label}
              </button>
            )
          })}
          <button
            onClick={resetEconomy}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-arcane hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-95',
            )}
            aria-label="Reset action economy"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Concentration Bar (only when concentrating) ── */}
      {combatState.concentrating && (
        <div className={cn(
          'px-4 py-2 border-b border-ember/20',
          'bg-ember/[0.06] flex items-center justify-between',
        )}>
          <div className="flex items-center gap-2">
            <Focus size={14} className="text-ember" aria-hidden />
            <span className="text-xs font-semibold text-ember uppercase tracking-wider">Concentrating</span>
            <Badge variant="ember">{combatState.concentrating}</Badge>
          </div>
          <button
            onClick={handleDropConcentration}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
              'transition-all duration-200 active:scale-95',
            )}
            aria-label="Drop concentration"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 text-xs">
        <span className="font-mono text-forge-0">
          HP: {character.hitPoints.current}/{character.hitPoints.max}
        </span>
        <span className="font-mono text-forge-0">AC: {character.armorClass}</span>
        {character.tempHP > 0 && (
          <span className="font-mono text-arcane">+{character.tempHP} temp</span>
        )}
        {character.conditions.length > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle size={10} aria-hidden />
            {character.conditions.join(', ')}
          </span>
        )}
      </div>

      {/* ── Auras & Passives (always-on, no action cost) ── */}
      {passives.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Radio size={10} className="text-verdant/60" aria-hidden />
            <span className="text-[10px] font-semibold text-forge-2/60 uppercase tracking-wider">Always Active</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {passives.map(p => (
              <button
                key={p.name}
                onClick={() => setExpandedAction(expandedAction === p.name ? null : p.name)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                  'text-[11px] font-medium border min-h-[32px]',
                  'transition-all duration-200 active:scale-[0.96]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                  expandedAction === p.name
                    ? 'bg-verdant/10 border-verdant/25 text-verdant'
                    : 'bg-white/[0.02] border-white/8 text-forge-2 hover:text-forge-1 hover:border-white/15',
                )}
              >
                <Radio size={9} aria-hidden />
                {p.name}
                {p.usesRemaining && (
                  <span className="text-[9px] font-mono opacity-60">{p.usesRemaining}</span>
                )}
              </button>
            ))}
          </div>
          {/* Expanded passive detail */}
          {passives.map(p => expandedAction === p.name && (
            <div
              key={`${p.name}-detail`}
              className={cn(
                'mt-2 px-3 py-2.5 rounded-lg',
                'bg-verdant/[0.04] border border-verdant/15',
                'animate-fade-in',
              )}
            >
              <p className="text-xs text-forge-1 leading-relaxed mb-1.5">{p.summary}</p>
              <div className="flex items-start gap-2 mb-1">
                <Info size={10} className="text-forge-2 mt-0.5 shrink-0" aria-hidden />
                <span className="text-[11px] text-forge-2">{p.effectsLine}</span>
              </div>
              {p.strategicTip && (
                <p className="text-[10px] text-forge-2/70 italic mt-1">{p.strategicTip}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Action Sections ── */}
      <div className="px-4 py-3 space-y-3">
        {/* Actions */}
        <ActionSection
          label="Action"
          icon={Sword}
          used={combatState.turnActions.action}
          options={actions}
          maxShow={MAX_SHOW}
          onUseAction={handleUseAction}
          expandedAction={expandedAction}
          onToggleExpand={setExpandedAction}
          color="arcane"
          actionNotes={actionNotes}
          onUpdateNotes={updateActionNote}
        />

        {/* Bonus Actions */}
        {bonusActions.length > 0 && (
          <ActionSection
            label="Bonus Action"
            icon={Zap}
            used={combatState.turnActions.bonusAction}
            options={bonusActions}
            maxShow={MAX_SHOW}
            onUseAction={handleUseAction}
            expandedAction={expandedAction}
            onToggleExpand={setExpandedAction}
            color="ember"
            actionNotes={actionNotes}
            onUpdateNotes={updateActionNote}
          />
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <ActionSection
            label="Reaction"
            icon={Shield}
            used={combatState.turnActions.reaction}
            options={reactions}
            maxShow={MAX_SHOW}
            onUseAction={handleUseAction}
            expandedAction={expandedAction}
            onToggleExpand={setExpandedAction}
            color="eldritch"
            actionNotes={actionNotes}
            onUpdateNotes={updateActionNote}
          />
        )}
      </div>

      {/* ── Spell Slots Row — tappable pips ── */}
      {Object.keys(character.spellSlots).length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/5 flex flex-wrap gap-3">
          {Object.entries(character.spellSlots)
            .filter(([_, slot]) => slot.max > 0)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, slot]) => {
              const lvl = Number(level)
              return (
                <div key={level} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-forge-2 font-medium">{levelLabel(lvl)}:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: slot.max }).map((_, i) => {
                      const isFilled = i < slot.current
                      return (
                        <button
                          key={i}
                          onClick={() => isFilled ? handleExpendSlot(lvl) : handleRestoreSlot(lvl)}
                          aria-label={`${levelLabel(lvl)} slot ${i + 1}: ${isFilled ? 'expend' : 'restore'}`}
                          className={cn(
                            'w-4 h-4 rounded-full',
                            'transition-all duration-200 ease-forge',
                            'active:scale-90',
                            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-arcane',
                            isFilled
                              ? 'bg-arcane shadow-[0_0_6px_rgba(61,210,255,0.5)] hover:bg-arcane/70'
                              : 'bg-white/10 hover:bg-white/20',
                          )}
                        />
                      )
                    })}
                  </div>
                  <span className="text-[9px] font-mono text-forge-2/60">{slot.current}/{slot.max}</span>
                </div>
              )
            })}
        </div>
      )}

      {/* ── Class Resources ── */}
      {character.paladinResources && (
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Heart size={10} className="text-verdant" aria-hidden />
            <span className="text-forge-2">Lay on Hands:</span>
            <span className="font-mono text-forge-0">{character.paladinResources.layOnHands.current} HP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={10} className="text-ember" aria-hidden />
            <span className="text-forge-2">Channel:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: character.paladinResources.channelDivinity.max }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    i < character.paladinResources!.channelDivinity.current
                      ? 'bg-ember shadow-[0_0_4px_rgba(244,181,69,0.4)]'
                      : 'bg-white/10',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActionSection Sub-component
// ---------------------------------------------------------------------------

function ActionSection({
  label,
  icon: Icon,
  used,
  options,
  maxShow,
  onUseAction,
  expandedAction,
  onToggleExpand,
  color,
  actionNotes,
  onUpdateNotes,
}: {
  label: string
  icon: typeof Sword
  used: boolean
  options: ActionOption[]
  maxShow: number
  onUseAction: (option: ActionOption) => void
  expandedAction: string | null
  onToggleExpand: (name: string | null) => void
  color: 'arcane' | 'ember' | 'eldritch'
  actionNotes: ActionNotesData
  onUpdateNotes: (actionName: string, customTip: string | undefined, notes: ActionNote[]) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? options : options.slice(0, maxShow)
  const remaining = options.length - maxShow

  const colorStyles = {
    arcane: { border: 'border-arcane/20', bg: 'bg-arcane/[0.06]', text: 'text-arcane', hoverBg: 'hover:bg-arcane/10' },
    ember: { border: 'border-ember/20', bg: 'bg-ember/[0.06]', text: 'text-ember', hoverBg: 'hover:bg-ember/10' },
    eldritch: { border: 'border-eldritch/20', bg: 'bg-eldritch/[0.06]', text: 'text-eldritch', hoverBg: 'hover:bg-eldritch/10' },
  }
  const cs = colorStyles[color]

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1.5">
        <Icon
          size={12}
          className={cn(used ? 'text-forge-2 opacity-40' : cs.text)}
          aria-hidden
        />
        <span className={cn(
          'text-xs font-bold uppercase tracking-wider',
          used ? 'text-forge-2 line-through opacity-40' : 'text-forge-0',
        )}>
          {label}
        </span>
        {used && (
          <span className="text-[10px] text-forge-2 italic">used this turn</span>
        )}
      </div>

      {/* Action cards */}
      {!used && (
        <div className="flex flex-col gap-1.5 pl-5">
          {visible.map((opt) => {
            const isExpanded = expandedAction === opt.name
            const notes = actionNotes[opt.name]

            return (
              <div key={opt.name} className="flex flex-col">
                {/* Collapsed row — tap to expand */}
                <button
                  onClick={() => onToggleExpand(isExpanded ? null : opt.name)}
                  className={cn(
                    'flex items-center justify-between min-h-[44px] px-3 py-2 rounded-lg text-left',
                    'border transition-all duration-200 ease-forge',
                    'active:scale-[0.98]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    isExpanded
                      ? `${cs.bg} ${cs.border}`
                      : `bg-white/[0.02] border-white/5 ${cs.hoverBg} hover:border-white/10`,
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-forge-0 truncate">{opt.name}</span>
                      {opt.type === 'spell' && (
                        <Badge variant={opt.spellLevel === 0 ? 'neutral' : 'arcane'} className="text-[9px] px-1.5 py-0">
                          {opt.spellLevel === 0 ? 'Cantrip' : levelLabel(opt.spellLevel!)}
                        </Badge>
                      )}
                      {opt.type === 'feature' && (
                        <Badge variant="eldritch" className="text-[9px] px-1.5 py-0">
                          Feature
                        </Badge>
                      )}
                      {opt.isConcentration && (
                        <Focus size={10} className="text-ember shrink-0" aria-label="Concentration" />
                      )}
                      {notes && notes.notes.length > 0 && (
                        <Pencil size={9} className="text-forge-2/40 shrink-0" aria-label="Has custom notes" />
                      )}
                    </div>
                    {/* Quick mechanics preview when collapsed */}
                    {!isExpanded && (
                      <p className="text-[10px] text-forge-2 mt-0.5 truncate">
                        {opt.mechanicsLine}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {opt.rollNotation && (
                      <Dices size={12} className={cn(cs.text, 'opacity-60')} aria-hidden />
                    )}
                    {isExpanded ? (
                      <ChevronUp size={12} className="text-forge-2" aria-hidden />
                    ) : (
                      <ChevronDown size={12} className="text-forge-2" aria-hidden />
                    )}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <ExpandedActionPanel
                    opt={opt}
                    cs={cs}
                    color={color}
                    notes={notes}
                    onUseAction={onUseAction}
                    onUpdateNotes={onUpdateNotes}
                  />
                )}
              </div>
            )
          })}

          {/* Show more / less */}
          {remaining > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={cn(
                'text-[11px] font-medium pl-3 py-1.5 min-h-[44px]',
                'flex items-center gap-1',
                cs.text, 'hover:underline',
              )}
            >
              {showAll ? (
                <>
                  <ChevronUp size={12} aria-hidden />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} aria-hidden />
                  +{remaining} more
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExpandedActionPanel — detail view with editable notes
// ---------------------------------------------------------------------------

function ExpandedActionPanel({
  opt,
  cs,
  color,
  notes,
  onUseAction,
  onUpdateNotes,
}: {
  opt: ActionOption
  cs: { border: string; bg: string; text: string }
  color: 'arcane' | 'ember' | 'eldritch'
  notes: ActionNotesData[string] | undefined
  onUseAction: (option: ActionOption) => void
  onUpdateNotes: (actionName: string, customTip: string | undefined, notes: ActionNote[]) => void
}) {
  const [editingTip, setEditingTip] = useState(false)
  const [tipDraft, setTipDraft] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteLabel, setNewNoteLabel] = useState('')
  const [newNoteText, setNewNoteText] = useState('')
  const tipInputRef = useRef<HTMLTextAreaElement>(null)
  const noteLabelRef = useRef<HTMLInputElement>(null)

  const customTip = notes?.customTip
  const customNotes = notes?.notes ?? []
  const displayTip = customTip ?? opt.strategicTip

  // Focus on inputs when toggled
  useEffect(() => {
    if (editingTip && tipInputRef.current) tipInputRef.current.focus()
  }, [editingTip])
  useEffect(() => {
    if (addingNote && noteLabelRef.current) noteLabelRef.current.focus()
  }, [addingNote])

  const handleSaveTip = () => {
    const trimmed = tipDraft.trim()
    onUpdateNotes(opt.name, trimmed || undefined, customNotes)
    setEditingTip(false)
  }

  const handleAddNote = () => {
    const label = newNoteLabel.trim()
    const text = newNoteText.trim()
    if (!label || !text) return
    onUpdateNotes(opt.name, customTip, [...customNotes, { label, text }])
    setNewNoteLabel('')
    setNewNoteText('')
    setAddingNote(false)
  }

  const handleDeleteNote = (index: number) => {
    const updated = customNotes.filter((_, i) => i !== index)
    onUpdateNotes(opt.name, customTip, updated)
  }

  return (
    <div className={cn(
      'mt-0 px-3 py-3 rounded-b-lg border border-t-0',
      cs.border, cs.bg,
      'animate-fade-in',
    )}>
      {/* Summary */}
      <p className="text-xs text-forge-1 leading-relaxed mb-2">
        {opt.summary}
      </p>

      {/* Mechanics breakdown */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-start gap-2">
          <Dices size={11} className="text-forge-2 mt-0.5 shrink-0" aria-hidden />
          <span className="text-[11px] font-mono text-forge-0">{opt.mechanicsLine}</span>
        </div>
        <div className="flex items-start gap-2">
          <Info size={11} className="text-forge-2 mt-0.5 shrink-0" aria-hidden />
          <span className="text-[11px] text-forge-2">{opt.effectsLine}</span>
        </div>
        {opt.usesRemaining && (
          <div className="flex items-center gap-2">
            <Sparkles size={11} className="text-forge-2 shrink-0" aria-hidden />
            <span className="text-[11px] text-forge-2">Uses: {opt.usesRemaining}</span>
          </div>
        )}
      </div>

      {/* Strategic tip — editable */}
      <div className={cn(
        'px-2.5 py-1.5 rounded-md mb-2',
        'bg-white/[0.03] border border-white/5',
      )}>
        {editingTip ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={tipInputRef}
              value={tipDraft}
              onChange={(e) => setTipDraft(e.target.value)}
              placeholder="Write a custom strategic tip..."
              rows={2}
              className={cn(
                'w-full bg-transparent text-[11px] text-forge-1 leading-relaxed',
                'border-none outline-none resize-none placeholder:text-forge-2/30',
              )}
            />
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={() => setEditingTip(false)}
                className="min-h-[32px] px-2.5 rounded text-[10px] text-forge-2 hover:text-forge-0 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTip}
                className={cn(
                  'min-h-[32px] px-2.5 rounded text-[10px] font-medium',
                  'bg-arcane/20 text-arcane hover:bg-arcane/30 transition-colors',
                  'flex items-center gap-1',
                )}
              >
                <Check size={10} aria-hidden />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] text-forge-2 italic leading-relaxed flex-1">
              {displayTip || 'No strategic tip — tap edit to add one'}
            </p>
            <button
              onClick={() => {
                setTipDraft(customTip ?? opt.strategicTip ?? '')
                setEditingTip(true)
              }}
              className={cn(
                'min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0',
                'rounded text-forge-2/40 hover:text-arcane hover:bg-white/[0.06]',
                'transition-all duration-200',
              )}
              aria-label="Edit strategic tip"
            >
              <Pencil size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Custom notes */}
      {customNotes.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {customNotes.map((note, i) => (
            <div
              key={i}
              className={cn(
                'px-2.5 py-1.5 rounded-md',
                'bg-white/[0.02] border border-white/5',
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-semibold text-forge-1 uppercase tracking-wider">
                  {note.label}
                </span>
                <button
                  onClick={() => handleDeleteNote(i)}
                  className={cn(
                    'min-w-[24px] min-h-[24px] flex items-center justify-center',
                    'rounded text-forge-2/30 hover:text-red-400 hover:bg-red-400/10',
                    'transition-colors',
                  )}
                  aria-label={`Delete ${note.label} note`}
                >
                  <Trash2 size={9} />
                </button>
              </div>
              <p className="text-[10px] text-forge-2 leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add custom note */}
      {addingNote ? (
        <div className={cn(
          'px-2.5 py-2 rounded-md mb-2',
          'bg-white/[0.03] border border-arcane/20',
        )}>
          <input
            ref={noteLabelRef}
            value={newNoteLabel}
            onChange={(e) => setNewNoteLabel(e.target.value)}
            placeholder="Category (e.g., Combo, Synergy, Reminder)"
            className={cn(
              'w-full bg-transparent text-[11px] font-semibold text-forge-0 mb-1.5',
              'border-none outline-none placeholder:text-forge-2/30',
            )}
          />
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Your note..."
            rows={2}
            className={cn(
              'w-full bg-transparent text-[10px] text-forge-1 leading-relaxed',
              'border-none outline-none resize-none placeholder:text-forge-2/30',
            )}
          />
          <div className="flex items-center gap-1.5 justify-end mt-1">
            <button
              onClick={() => { setAddingNote(false); setNewNoteLabel(''); setNewNoteText('') }}
              className="min-h-[32px] px-2.5 rounded text-[10px] text-forge-2 hover:text-forge-0 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNoteLabel.trim() || !newNoteText.trim()}
              className={cn(
                'min-h-[32px] px-2.5 rounded text-[10px] font-medium',
                'bg-arcane/20 text-arcane hover:bg-arcane/30 transition-colors',
                'flex items-center gap-1',
                'disabled:opacity-30 disabled:pointer-events-none',
              )}
            >
              <Check size={10} aria-hidden />
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNote(true)}
          className={cn(
            'w-full min-h-[32px] px-2.5 rounded-md mb-2',
            'flex items-center justify-center gap-1.5',
            'text-[10px] text-forge-2/50 hover:text-arcane',
            'border border-dashed border-white/5 hover:border-arcane/20',
            'bg-transparent hover:bg-arcane/[0.04]',
            'transition-all duration-200',
          )}
        >
          <Plus size={10} aria-hidden />
          Add custom note
        </button>
      )}

      {/* USE IT button */}
      <button
        onClick={() => onUseAction(opt)}
        className={cn(
          'w-full min-h-[44px] px-4 rounded-lg',
          'flex items-center justify-center gap-2',
          'text-sm font-semibold',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.96]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          color === 'arcane'
            ? 'bg-arcane/20 text-arcane border border-arcane/30 hover:bg-arcane/30'
            : color === 'ember'
              ? 'bg-ember/20 text-ember border border-ember/30 hover:bg-ember/30'
              : 'bg-eldritch/20 text-eldritch border border-eldritch/30 hover:bg-eldritch/30',
        )}
      >
        {opt.rollNotation ? (
          <>
            <Dices size={16} aria-hidden />
            Use {opt.name}
            {opt.spellLevel && opt.spellLevel > 0 ? ` (${levelLabel(opt.spellLevel)} slot)` : ''}
          </>
        ) : (
          <>
            <Sword size={16} aria-hidden />
            Use {opt.name}
            {opt.spellLevel && opt.spellLevel > 0 ? ` (${levelLabel(opt.spellLevel)} slot)` : ''}
          </>
        )}
      </button>
    </div>
  )
}
