import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import { attackBonus } from '../../lib/character'
import { BASIC_ACTIONS } from '../../lib/dnd-data'

interface SmartActionsGridProps {
  character: Character
  onSelectAction: (name: string, description: string) => void
  onOpenActionMenu: () => void
  loading: boolean
}

/** Action type used internally to unify weapons, spells, and basic actions. */
interface SmartAction {
  name: string
  description: string
  subtitle: string
  source: 'weapon' | 'spell' | 'basic'
}

/** Key basic actions shown in the grid (subset of BASIC_ACTIONS). */
const KEY_BASIC_NAMES = ['Shield', 'Dash', 'Dodge', 'Help', 'Disengage'] as const

/** Maximum number of action cards displayed in the grid. */
const MAX_ACTIONS = 8

/**
 * Compact 2-column grid of available combat actions.
 * Prioritizes weapon attacks, then prepared cantrips, then key basic actions.
 * Each card is tappable and reports the selected action to the parent.
 */
export function SmartActionsGrid({
  character,
  onSelectAction,
  onOpenActionMenu,
  loading,
}: SmartActionsGridProps) {
  const actions = useMemo<SmartAction[]>(() => {
    const result: SmartAction[] = []

    // 1. Weapon attacks
    for (const weapon of character.weapons) {
      if (result.length >= MAX_ACTIONS) break
      const bonus = attackBonus(character, weapon)
      const sign = bonus >= 0 ? '+' : ''
      const rangeLabel = weapon.attackType === 'ranged' ? 'Ranged' : 'Melee'
      result.push({
        name: weapon.name,
        description: `${rangeLabel} weapon attack. ${weapon.damageDice} ${weapon.damageType} damage.${weapon.properties.length > 0 ? ' ' + weapon.properties.join(', ') + '.' : ''}`,
        subtitle: `${rangeLabel} ${sign}${bonus}`,
        source: 'weapon',
      })
    }

    // 2. Prepared cantrips (level 0, prepared)
    const cantrips = character.spells.filter(
      (s) => s.level === 0 && s.prepared,
    )
    for (const cantrip of cantrips) {
      if (result.length >= MAX_ACTIONS) break
      result.push({
        name: cantrip.name,
        description: cantrip.description,
        subtitle: cantrip.range || 'Self',
        source: 'spell',
      })
    }

    // 3. Key basic actions
    for (const actionName of KEY_BASIC_NAMES) {
      if (result.length >= MAX_ACTIONS) break
      const basic = BASIC_ACTIONS.find((a) => a.name === actionName)
      if (basic) {
        result.push({
          name: basic.name,
          description: basic.description,
          subtitle: basic.type,
          source: 'basic',
        })
      }
    }

    return result.slice(0, MAX_ACTIONS)
  }, [character])

  return (
    <div className="bg-ash-warm/80 border border-gold/15 rounded-xl p-3">
      {/* Header */}
      <h3 className="combat-section-header">Smart Actions</h3>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <button
            key={`${action.source}-${action.name}`}
            type="button"
            onClick={() => onSelectAction(action.name, action.description)}
            disabled={loading}
            className={cn(
              'action-card text-left',
              action.source === 'weapon' && 'border-l-2 border-l-ember/40',
              action.source === 'spell' && 'border-l-2 border-l-eldritch/40',
              loading && 'opacity-40 cursor-not-allowed',
              'focus-visible:outline-2 focus-visible:outline-gold',
            )}
            aria-label={`${action.name}: ${action.subtitle}`}
          >
            <span className="text-xs font-semibold text-ink-primary truncate">
              {action.name}
            </span>
            <span className="text-xs text-ink-muted truncate">
              {action.subtitle}
            </span>
          </button>
        ))}

        {/* Empty state when no actions available */}
        {actions.length === 0 && (
          <p className="col-span-2 text-xs text-ink-muted text-center py-4 select-none">
            No weapons, cantrips, or actions configured.
          </p>
        )}
      </div>

      {/* Manage Actions Link */}
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={onOpenActionMenu}
          className={cn(
            'flex items-center gap-1',
            'text-xs text-ink-muted uppercase tracking-wider',
            'hover:text-arcane transition-colors duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-gold',
            'min-h-[28px] px-2',
          )}
        >
          Manage Actions
          <ChevronDown size={10} />
        </button>
      </div>
    </div>
  )
}
