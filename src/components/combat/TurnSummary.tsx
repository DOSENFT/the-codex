import { useState, useMemo, useCallback } from 'react'
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
  Info,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  type Character,
  type Spell,
  type ClassFeature,
  abilityModifier,
  attackBonus,
  expendSpellSlot,
} from '../../lib/character'
import {
  type CombatState,
  type ActionEconomyType,
  spellActionType,
  featureActionType,
  useAction,
  setConcentration,
} from '../../lib/combat-state'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

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

interface ActionOption {
  name: string
  type: 'spell' | 'feature' | 'weapon'
  actionEconomy: ActionEconomyType
  // Rich detail fields
  summary: string           // 1-line what it does
  mechanicsLine: string     // dice, mods, DC, range — compact
  effectsLine: string       // what happens on hit/cast
  strategicTip?: string     // quick tactical suggestion
  // Roll data
  rollNotation?: string
  rollLabel?: string
  // Spell-specific
  spellLevel?: number
  isConcentration?: boolean
  isRitual?: boolean
  // Feature-specific
  usesRemaining?: string    // "3/5 uses"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  const s: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }
  return s[level] ?? `${level}th`
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** Build a human-readable 1-line summary from a spell's description */
function spellSummary(spell: Spell): string {
  // Use first sentence of description, capped at 80 chars
  const firstSentence = spell.description.split(/\.\s/)[0]
  if (firstSentence.length <= 80) return firstSentence + (firstSentence.endsWith('.') ? '' : '.')
  return firstSentence.slice(0, 77) + '...'
}

/** Build a human-readable 1-line summary from a feature's description */
function featureSummary(feature: ClassFeature): string {
  const firstSentence = feature.description.split(/\.\s/)[0]
  if (firstSentence.length <= 80) return firstSentence + (firstSentence.endsWith('.') ? '' : '.')
  return firstSentence.slice(0, 77) + '...'
}

/** Build the mechanics line: dice, mods, DC, range */
function spellMechanics(spell: Spell, character: Character): string {
  const parts: string[] = []

  if (spell.level > 0) {
    parts.push(levelLabel(spell.level) + '-level')
  } else {
    parts.push('Cantrip')
  }

  if (spell.saveType) {
    parts.push(`DC ${character.spellSaveDC} ${spell.saveType} save`)
  } else if (spell.damageDice) {
    parts.push(`${formatMod(character.spellAttackBonus)} to hit`)
  }

  if (spell.damageDice) {
    parts.push(`${spell.damageDice}${spell.damageType ? ' ' + spell.damageType : ''}`)
  }

  if (spell.range && spell.range !== 'Self') {
    parts.push(spell.range)
  }

  return parts.join(' · ')
}

/** Build the effects line: concentration, duration, components */
function spellEffects(spell: Spell): string {
  const parts: string[] = []

  if (spell.concentration) parts.push('Concentration')
  if (spell.duration && spell.duration !== 'Instantaneous') {
    parts.push(spell.duration)
  } else if (!spell.concentration) {
    parts.push('Instant')
  }
  if (spell.ritual) parts.push('Ritual')
  if (spell.components) parts.push(spell.components)

  return parts.join(' · ')
}

/** Build the effects line for a feature */
function featureEffects(feature: ClassFeature): string {
  const parts: string[] = []
  if (feature.duration) parts.push(feature.duration)
  if (feature.range) parts.push(feature.range)
  if (feature.usesMax !== undefined) {
    parts.push(`${feature.usesCurrent ?? 0}/${feature.usesMax} uses`)
    if (feature.usesPerRest) parts.push(`recharges on ${feature.usesPerRest} rest`)
  }
  return parts.join(' · ') || 'At will'
}

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

  // Categorize available options by action type
  const { actions, bonusActions, reactions } = useMemo(() => {
    const actions: ActionOption[] = []
    const bonusActions: ActionOption[] = []
    const reactions: ActionOption[] = []

    // Weapons → action
    for (const weapon of character.weapons) {
      const bonus = attackBonus(character, weapon)
      const abilityName = weapon.abilityMod
      const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)

      actions.push({
        name: weapon.name,
        type: 'weapon',
        actionEconomy: 'action',
        summary: `${weapon.attackType === 'melee' ? 'Melee' : 'Ranged'} weapon attack with ${weapon.properties.join(', ') || 'no special properties'}.`,
        mechanicsLine: `${formatMod(bonus)} to hit (${abilityName} ${formatMod(abilityModifier(character.abilityScores[weapon.abilityMod]))}${weapon.proficient ? ' + prof' : ''}${weapon.bonusToHit ? ` ${formatMod(weapon.bonusToHit)} magic` : ''}) · ${weapon.damageDice}${formatMod(dmgMod)} ${weapon.damageType}`,
        effectsLine: [
          weapon.magical ? 'Magical' : null,
          ...weapon.properties,
        ].filter(Boolean).join(' · ') || 'Standard attack',
        rollNotation: `1d20${bonus >= 0 ? `+${bonus}` : bonus}`,
        rollLabel: `${weapon.name} Attack`,
      })
    }

    // Prepared spells
    const preparedSpells = character.spells.filter(s => s.prepared)
    for (const spell of preparedSpells) {
      // Skip if no slots for leveled spells
      if (spell.level > 0) {
        const slot = character.spellSlots[spell.level]
        if (!slot || slot.current <= 0) continue
      }

      const actionType = spellActionType(spell.castingTime)

      // Determine roll info
      let rollNotation: string | undefined
      let rollLabel: string | undefined
      if (spell.damageDice) {
        rollNotation = spell.damageDice
        rollLabel = `${spell.name} Damage`
      } else if (spell.saveType) {
        // Save-based spell with no damage (buff/debuff) — no auto-roll
      } else if (spell.level > 0 || spell.castingTime.toLowerCase().includes('attack')) {
        // Spell attack
        rollNotation = `1d20+${character.spellAttackBonus}`
        rollLabel = `${spell.name} Attack`
      }

      const option: ActionOption = {
        name: spell.name,
        type: 'spell',
        actionEconomy: actionType,
        summary: spellSummary(spell),
        mechanicsLine: spellMechanics(spell, character),
        effectsLine: spellEffects(spell),
        strategicTip: spell.tacticalNote || undefined,
        rollNotation,
        rollLabel,
        spellLevel: spell.level,
        isConcentration: spell.concentration,
        isRitual: spell.ritual,
      }

      if (actionType === 'bonusAction') bonusActions.push(option)
      else if (actionType === 'reaction') reactions.push(option)
      else actions.push(option)
    }

    // Class features (available at level)
    for (const feature of character.features) {
      if (feature.level > character.level) continue
      // Skip if uses exhausted
      if (feature.usesMax !== undefined && (feature.usesCurrent ?? 0) <= 0) continue

      const actionType = featureActionType(feature)

      // Determine roll info
      let rollNotation: string | undefined
      let rollLabel: string | undefined
      if (feature.damageDice) {
        rollNotation = feature.damageDice
        rollLabel = `${feature.name}`
      }

      const option: ActionOption = {
        name: feature.name,
        type: 'feature',
        actionEconomy: actionType,
        summary: featureSummary(feature),
        mechanicsLine: [
          feature.damageDice ? `${feature.damageDice}${feature.damageType ? ' ' + feature.damageType : ''}` : null,
          feature.saveType ? `DC ${character.spellSaveDC} ${feature.saveType}` : null,
          feature.range || null,
        ].filter(Boolean).join(' · ') || 'See description',
        effectsLine: featureEffects(feature),
        strategicTip: feature.tacticalNote || undefined,
        rollNotation,
        rollLabel,
        usesRemaining: feature.usesMax !== undefined ? `${feature.usesCurrent ?? 0}/${feature.usesMax}` : undefined,
      }

      if (actionType === 'bonusAction') bonusActions.push(option)
      else if (actionType === 'reaction') reactions.push(option)
      else actions.push(option)
    }

    return { actions, bonusActions, reactions }
  }, [character])

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
          />
        )}
      </div>

      {/* ── Spell Slots Row ── */}
      {Object.keys(character.spellSlots).length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/5 flex flex-wrap gap-2">
          {Object.entries(character.spellSlots)
            .filter(([_, slot]) => slot.max > 0)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, slot]) => (
              <div key={level} className="flex items-center gap-1">
                <span className="text-[10px] text-forge-2 font-medium">{levelLabel(Number(level))}:</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: slot.max }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        i < slot.current
                          ? 'bg-arcane shadow-[0_0_4px_rgba(61,210,255,0.4)]'
                          : 'bg-white/10',
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
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

                    {/* Strategic tip */}
                    {opt.strategicTip && (
                      <div className={cn(
                        'px-2.5 py-1.5 rounded-md mb-2',
                        'bg-white/[0.03] border border-white/5',
                        'text-[10px] text-forge-2 italic leading-relaxed',
                      )}>
                        {opt.strategicTip}
                      </div>
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
