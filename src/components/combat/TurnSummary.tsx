import { useMemo } from 'react'
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
  Square,
  Heart,
  Flame,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  type Character,
  type Spell,
  type ClassFeature,
  abilityModifier,
  attackBonus,
} from '../../lib/character'
import { type CombatState, spellActionType, featureActionType } from '../../lib/combat-state'
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
}

interface ActionOption {
  name: string
  detail: string
  type: 'spell' | 'feature' | 'weapon'
  rollNotation?: string
  rollLabel?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  const s: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }
  return `${level}${s[level] ?? 'th'}`
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
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
}: TurnSummaryProps) {
  // Categorize available options by action type
  const { actions, bonusActions, reactions } = useMemo(() => {
    const actions: ActionOption[] = []
    const bonusActions: ActionOption[] = []
    const reactions: ActionOption[] = []

    // Weapons → action
    for (const weapon of character.weapons) {
      const bonus = attackBonus(character, weapon)
      const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)
      actions.push({
        name: weapon.name,
        detail: `${formatMod(bonus)} · ${weapon.damageDice}${dmgMod >= 0 ? `+${dmgMod}` : dmgMod} ${weapon.damageType}`,
        type: 'weapon',
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
      const detail = [
        spell.level > 0 ? levelLabel(spell.level) : 'Cantrip',
        spell.concentration ? 'conc' : null,
        spell.damageDice ? `${spell.damageDice}${spell.damageType ? ` ${spell.damageType}` : ''}` : null,
      ].filter(Boolean).join(' · ')

      const option: ActionOption = {
        name: spell.name,
        detail,
        type: 'spell',
        rollNotation: spell.damageDice || undefined,
        rollLabel: spell.damageDice ? `${spell.name}` : undefined,
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
      const detail = [
        feature.range || null,
        feature.damageDice ? `${feature.damageDice}${feature.damageType ? ` ${feature.damageType}` : ''}` : null,
        feature.usesMax !== undefined ? `${feature.usesCurrent ?? 0}/${feature.usesMax} uses` : null,
      ].filter(Boolean).join(' · ')

      const option: ActionOption = {
        name: feature.name,
        detail: detail || feature.description.slice(0, 40) + (feature.description.length > 40 ? '...' : ''),
        type: 'feature',
        rollNotation: feature.damageDice || undefined,
        rollLabel: feature.damageDice ? feature.name : undefined,
      }

      if (actionType === 'bonusAction') bonusActions.push(option)
      else if (actionType === 'reaction') reactions.push(option)
      else actions.push(option)
    }

    return { actions, bonusActions, reactions }
  }, [character])

  const handleRoll = (option: ActionOption) => {
    if (option.rollNotation && option.rollLabel && onOpenDiceRoller) {
      onOpenDiceRoller({ notation: option.rollNotation, label: option.rollLabel })
    }
  }

  const MAX_SHOW = 4

  return (
    <div
      className={cn(
        'rounded-xl border border-ember/25 bg-ember/[0.04] overflow-hidden',
        'animate-fade-in',
      )}
    >
      {/* Header */}
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

      {/* Quick Stats Row */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 text-xs">
        <span className="font-mono text-forge-0">
          HP: {character.hitPoints.current}/{character.hitPoints.max}
        </span>
        <span className="font-mono text-forge-0">AC: {character.armorClass}</span>
        {character.tempHP > 0 && (
          <span className="font-mono text-arcane">+{character.tempHP} temp</span>
        )}

        {/* Concentration */}
        {combatState.concentrating && (
          <span className="flex items-center gap-1 text-ember">
            <Focus size={10} aria-hidden />
            {combatState.concentrating}
          </span>
        )}

        {/* Active conditions */}
        {character.conditions.length > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle size={10} aria-hidden />
            {character.conditions.join(', ')}
          </span>
        )}
      </div>

      {/* Action sections */}
      <div className="px-4 py-3 space-y-3">
        {/* Actions */}
        <ActionSection
          label="Action"
          icon={Sword}
          used={combatState.turnActions.action}
          options={actions}
          maxShow={MAX_SHOW}
          onRoll={handleRoll}
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
            onRoll={handleRoll}
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
            onRoll={handleRoll}
            color="eldritch"
          />
        )}

        {/* Movement */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-medium',
            combatState.turnActions.movement ? 'text-forge-2 line-through opacity-40' : 'text-forge-0',
          )}>
            {combatState.turnActions.movement ? '—' : '•'}
          </span>
          <Footprints size={12} className={cn(combatState.turnActions.movement ? 'text-forge-2 opacity-40' : 'text-forge-1')} aria-hidden />
          <span className={cn(
            'text-xs font-medium',
            combatState.turnActions.movement ? 'text-forge-2 line-through opacity-40' : 'text-forge-0',
          )}>
            Movement: 30ft
          </span>
        </div>
      </div>

      {/* Spell Slots Row */}
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

      {/* Class Resources */}
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
  onRoll,
  color,
}: {
  label: string
  icon: typeof Sword
  used: boolean
  options: ActionOption[]
  maxShow: number
  onRoll: (option: ActionOption) => void
  color: 'arcane' | 'ember' | 'eldritch'
}) {
  const visible = options.slice(0, maxShow)
  const remaining = options.length - maxShow

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn(
          'text-xs font-medium',
          used ? 'text-forge-2 line-through opacity-40' : 'text-forge-0',
        )}>
          {used ? '—' : '•'}
        </span>
        <Icon size={12} className={cn(used ? 'text-forge-2 opacity-40' : `text-${color}`)} aria-hidden />
        <span className={cn(
          'text-xs font-bold uppercase tracking-wider',
          used ? 'text-forge-2 line-through opacity-40' : 'text-forge-0',
        )}>
          {label}
        </span>
      </div>

      {!used && (
        <div className="flex flex-col gap-1 pl-5">
          {visible.map((opt) => (
            <button
              key={opt.name}
              onClick={() => onRoll(opt)}
              className={cn(
                'flex items-center justify-between min-h-[36px] px-3 py-1.5 rounded-lg text-left',
                'bg-white/[0.02] border border-white/5',
                'transition-all duration-200 ease-forge',
                'hover:bg-white/[0.04] hover:border-white/10',
                'active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              <span className="text-xs font-medium text-forge-0 truncate">{opt.name}</span>
              <span className="text-[10px] text-forge-2 ml-2 shrink-0">{opt.detail}</span>
            </button>
          ))}
          {remaining > 0 && (
            <span className="text-[10px] text-forge-2 pl-3">+{remaining} more</span>
          )}
        </div>
      )}
    </div>
  )
}
