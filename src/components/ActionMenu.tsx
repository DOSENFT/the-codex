import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Sword,
  Sparkles,
  Zap,
  Shield,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  Footprints,
  Hand,
  Clock,
  BookOpen,
  Info,
} from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { SPRING_SETTLE, SHEET_EXIT } from '../lib/motion-utils'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { GlassCard } from './ui/GlassCard'
import { useInertWhenClosed } from '../hooks/useInertWhenClosed'
import type { Character } from '../lib/character'
import { attackBonus, abilityModifier } from '../lib/character'
import type { CombatState } from '../lib/combat-state'
import { type ActionEconomyType, spellActionType, featureActionType } from '../lib/combat-state'
import { BONUS_ACTIONS, REACTIONS } from '../lib/dnd-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionChoice {
  type: ActionEconomyType
  name: string
  category: string
  slotLevel?: number
  rollNotation?: string
  rollLabel?: string
}

interface ActionMenuProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  combatState: CombatState
  onUseAction: (action: ActionChoice) => void
  filter: ActionEconomyType
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function MenuSection({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string
  icon: typeof Sword
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-2 min-h-[48px] px-2 -mx-2 rounded-lg',
          'text-sm font-semibold text-forge-1',
          'transition-all duration-200 ease-forge',
          'hover:bg-white/[0.04] hover:text-forge-0',
          'active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        {isOpen ? (
          <ChevronDown size={14} aria-hidden className="text-forge-2 shrink-0" />
        ) : (
          <ChevronRight size={14} aria-hidden className="text-forge-2 shrink-0" />
        )}
        <Icon size={14} aria-hidden className={iconColor} />
        <span className="flex-1 text-left">{title}</span>
        {badge}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-1.5 pl-1 pt-1 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action Item Button
// ---------------------------------------------------------------------------

function ActionItem({
  name,
  cost,
  effect,
  disabled,
  onSelect,
  variant = 'default',
  badge,
}: {
  name: string
  cost?: string
  effect?: string
  disabled?: boolean
  onSelect: () => void
  variant?: 'default' | 'arcane' | 'eldritch' | 'ember'
  badge?: React.ReactNode
}) {
  const variantMap: Record<string, string> = {
    default: 'hover:bg-white/[0.06] hover:border-white/15',
    arcane: 'hover:bg-arcane/8 hover:border-arcane/25',
    eldritch: 'hover:bg-eldritch/8 hover:border-eldritch/25',
    ember: 'hover:bg-ember/8 hover:border-ember/25',
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'min-h-[44px] px-3 py-2.5 rounded-xl text-left',
        'bg-white/[0.03] border border-white/8',
        'transition-all duration-200 enabled:active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        'group',
        variantMap[variant],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-forge-0 group-hover:text-forge-0 transition-colors truncate">
          {name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {cost && (
            <span className="text-xs font-mono text-forge-2">{cost}</span>
          )}
          {badge}
        </div>
      </div>
      {effect && (
        <div className="text-xs text-forge-2 mt-0.5 leading-snug line-clamp-2">
          {effect}
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Other Actions (Dash, Dodge, etc.) — action-cost only
// ---------------------------------------------------------------------------

const OTHER_ACTIONS: { name: string; effect: string; icon: typeof Sword }[] = [
  { name: 'Dash', effect: 'Double your movement speed for this turn.', icon: Footprints },
  { name: 'Dodge', effect: 'Attacks against you have Disadvantage; Advantage on DEX saves.', icon: Shield },
  { name: 'Disengage', effect: 'Movement does not provoke Opportunity Attacks.', icon: Footprints },
  { name: 'Help', effect: 'Give an ally Advantage on their next check or attack.', icon: Hand },
  { name: 'Hide', effect: 'Make a Stealth check to become Hidden.', icon: Eye },
  { name: 'Ready', effect: 'Prepare an action to trigger later (uses Reaction).', icon: Clock },
]

// ---------------------------------------------------------------------------
// Header labels by filter
// ---------------------------------------------------------------------------

const FILTER_HEADERS: { [K in ActionEconomyType]: string } = {
  action: 'Choose Action',
  bonusAction: 'Choose Bonus Action',
  reaction: 'Choose Reaction',
}

const FILTER_COST_LABELS: { [K in ActionEconomyType]: string } = {
  action: 'Action',
  bonusAction: 'Bonus Action',
  reaction: 'Reaction',
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ActionMenu({ isOpen, onClose, character, combatState, onUseAction, filter }: ActionMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // ── Focus management ──
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
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

  // ── Closed means closed (Slice 15) ──
  // Mounted-and-slid-off-screen, so its 11 controls stay tabbable without this.
  useInertWhenClosed(panelRef, isOpen)

  // ── Escape key ──
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // ── Body scroll lock ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Derived data ──

  const isActionSlotUsed = combatState.turnActions[filter]

  const cantrips = useMemo(
    () => character.spells.filter((s) => s.level === 0 && s.prepared && spellActionType(s.castingTime) === filter),
    [character.spells, filter],
  )

  const spellsByLevel = useMemo(() => {
    const map = new Map<number, typeof character.spells>()
    for (const spell of character.spells) {
      if (spell.level > 0 && spell.prepared && spellActionType(spell.castingTime) === filter) {
        const list = map.get(spell.level) || []
        list.push(spell)
        map.set(spell.level, list)
      }
    }
    return map
  }, [character.spells, filter])

  const classFeatures = useMemo(
    () => character.features.filter((f) => f.level <= character.level && featureActionType(f) === filter),
    [character.features, character.level, filter],
  )

  // Remaining spell slots (from character's actual current spell slots)
  const getSlotRemaining = useCallback(
    (level: number): number => {
      const charSlot = character.spellSlots[level]
      return charSlot ? charSlot.current : 0
    },
    [character.spellSlots],
  )

  const LEVEL_LABELS: Record<number, string> = {
    1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th',
    6: '6th', 7: '7th', 8: '8th', 9: '9th',
  }

  // ── Action handlers ──

  const handleWeaponAttack = useCallback(
    (weapon: Character['weapons'][number]) => {
      const bonus = attackBonus(character, weapon)
      onUseAction({
        type: 'action',
        name: weapon.name,
        category: 'Weapon Attack',
        rollNotation: `d20+${bonus}`,
        rollLabel: `${weapon.name} Attack`,
      })
    },
    [character, onUseAction],
  )

  const handleCantrip = useCallback(
    (spell: Character['spells'][number]) => {
      const notation = spell.damageDice
        ? `${spell.damageDice}${spell.saveType ? '' : `+${character.spellAttackBonus}`}`
        : `d20+${character.spellAttackBonus}`
      onUseAction({
        type: spellActionType(spell.castingTime),
        name: spell.name,
        category: 'Cantrip',
        rollNotation: notation,
        rollLabel: spell.name,
      })
    },
    [character.spellAttackBonus, onUseAction],
  )

  const handleSpell = useCallback(
    (spell: Character['spells'][number], slotLevel: number) => {
      const notation = spell.damageDice
        ? spell.damageDice
        : spell.saveType
          ? undefined
          : `d20+${character.spellAttackBonus}`
      onUseAction({
        type: spellActionType(spell.castingTime),
        name: spell.name,
        category: 'Spell',
        slotLevel,
        rollNotation: notation,
        rollLabel: spell.name,
      })
    },
    [character.spellAttackBonus, onUseAction],
  )

  const handleClassFeature = useCallback(
    (feature: Character['features'][number]) => {
      onUseAction({
        type: featureActionType(feature),
        name: feature.name,
        category: 'Class Feature',
      })
    },
    [onUseAction],
  )

  const handleOtherAction = useCallback(
    (name: string, type: ActionEconomyType) => {
      onUseAction({
        type,
        name,
        category: 'Other',
      })
    },
    [onUseAction],
  )

  // ── Count sections to detect empty state ──

  const showWeapons = filter === 'action' && character.weapons.length > 0
  const showCantrips = cantrips.length > 0
  const showSpells = spellsByLevel.size > 0
  const showFeatures = classFeatures.length > 0
  const showOtherActions = filter === 'action'
  const showBonusActions = filter === 'bonusAction'
  const showReactions = filter === 'reaction'

  const hasContent = showWeapons || showCantrips || showSpells || showFeatures
    || showOtherActions || showBonusActions || showReactions

  // Pre-compute label outside narrowing scope (TS narrows `filter` to `never` inside !hasContent)
  const costLabel = FILTER_COST_LABELS[filter]

  // ── Render ──

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-forge',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={FILTER_HEADERS[filter]}
        tabIndex={-1}
        initial={false}
        animate={isOpen ? { y: 0 } : { y: '100%' }}
        transition={isOpen ? SPRING_SETTLE : SHEET_EXIT}
        /* A closed sheet is translated off the bottom edge and made
           pointer-events-none, which stops the thumb but not the screen reader
           and not the Tab key: every control in here stayed in the a11y tree and
           in the focus order while invisible. `inert` is the one attribute that
           removes both at once. React 18 has no typed prop for it, hence the
           spread. Nothing about what the sheet DOES changes. */
        {...(!isOpen ? ({ inert: '', 'aria-hidden': true } as Record<string, unknown>) : {})}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[85dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0',
          'outline-none',
          !isOpen && 'pointer-events-none',
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-forge-2/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="font-display text-xl font-semibold text-forge-0 tracking-tight">
            {FILTER_HEADERS[filter]}
          </h2>
          <button
            type="button"
            aria-label="Close action menu"
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

        <div className="px-4 pb-6 safe-bottom flex flex-col gap-3">
          {/* ── Empty State ── */}
          {!hasContent && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Info size={24} className="text-forge-2/50" aria-hidden />
              <p className="text-sm text-forge-2">
                No {costLabel.toLowerCase()} options available.
              </p>
              <p className="text-xs text-forge-2/60">
                Your character has no abilities that cost a {costLabel.toLowerCase()}.
              </p>
            </div>
          )}

          {/* ── Weapon Attacks (action only) ── */}
          {showWeapons && (
            <MenuSection
              title="Weapon Attacks"
              icon={Sword}
              iconColor="text-arcane"
              defaultOpen={true}
            >
              {character.weapons.map((weapon) => {
                const bonus = attackBonus(character, weapon)
                return (
                  <ActionItem
                    key={weapon.name}
                    name={weapon.name}
                    cost="Action"
                    effect={`d20+${bonus} to hit | ${weapon.damageDice} ${weapon.damageType}`}
                    disabled={isActionSlotUsed}
                    onSelect={() => handleWeaponAttack(weapon)}
                    variant="arcane"
                    badge={<Badge variant="arcane">Attack</Badge>}
                  />
                )
              })}
            </MenuSection>
          )}

          {/* ── Cantrips ── */}
          {showCantrips && (
            <MenuSection
              title="Cantrips"
              icon={Sparkles}
              iconColor="text-eldritch"
              defaultOpen={true}
            >
              {cantrips.map((spell) => (
                <ActionItem
                  key={spell.name}
                  name={spell.name}
                  cost={FILTER_COST_LABELS[filter]}
                  effect={
                    [
                      spell.damageDice && `${spell.damageDice} ${spell.damageType ?? ''}`,
                      spell.range && spell.range !== 'Self' && `Range: ${spell.range}`,
                      spell.concentration && 'Concentration',
                    ]
                      .filter(Boolean)
                      .join(' | ') || spell.description.slice(0, 80)
                  }
                  disabled={isActionSlotUsed}
                  onSelect={() => handleCantrip(spell)}
                  variant="eldritch"
                  badge={<Badge variant="neutral">Cantrip</Badge>}
                />
              ))}
            </MenuSection>
          )}

          {/* ── Spell Slots by Level ── */}
          {Array.from(spellsByLevel.entries())
            .sort(([a], [b]) => a - b)
            .map(([level, spells]) => {
              const remaining = getSlotRemaining(level)
              const label = LEVEL_LABELS[level] ?? `${level}th`
              return (
                <MenuSection
                  key={level}
                  title={`${label} Level Spells`}
                  icon={BookOpen}
                  iconColor="text-eldritch"
                  defaultOpen={false}
                  badge={
                    <Badge variant={remaining > 0 ? 'eldritch' : 'neutral'}>
                      {remaining} slot{remaining !== 1 ? 's' : ''}
                    </Badge>
                  }
                >
                  {spells.map((spell) => (
                    <ActionItem
                      key={spell.name}
                      name={spell.name}
                      cost={FILTER_COST_LABELS[filter]}
                      effect={
                        [
                          spell.damageDice && `${spell.damageDice} ${spell.damageType ?? ''}`,
                          spell.concentration && 'Concentration',
                          spell.range && spell.range !== 'Self' && `Range: ${spell.range}`,
                        ]
                          .filter(Boolean)
                          .join(' | ') || spell.description.slice(0, 80)
                      }
                      disabled={remaining <= 0 || isActionSlotUsed}
                      onSelect={() => handleSpell(spell, level)}
                      variant="eldritch"
                      badge={
                        <Badge variant={spell.concentration ? 'ember' : 'eldritch'}>
                          Lvl {level}
                        </Badge>
                      }
                    />
                  ))}
                </MenuSection>
              )
            })}

          {/* ── Class Features ── */}
          {showFeatures && (
            <MenuSection
              title="Class Features"
              icon={Zap}
              iconColor="text-ember"
              defaultOpen={false}
            >
              {classFeatures.map((feature) => {
                const hasUses = feature.usesMax !== undefined && feature.usesMax > 0
                const remaining = hasUses ? (feature.usesCurrent ?? 0) : undefined
                return (
                  <ActionItem
                    key={feature.name}
                    name={feature.name}
                    cost={
                      hasUses
                        ? `${remaining}/${feature.usesMax} uses`
                        : feature.usesPerRest === 'unlimited'
                          ? 'At will'
                          : undefined
                    }
                    effect={feature.description.slice(0, 100)}
                    disabled={(hasUses && remaining !== undefined && remaining <= 0) || isActionSlotUsed}
                    onSelect={() => handleClassFeature(feature)}
                    variant="ember"
                    badge={
                      feature.usesPerRest ? (
                        <Badge variant="neutral">
                          {feature.usesPerRest === 'short'
                            ? 'Short Rest'
                            : feature.usesPerRest === 'long'
                              ? 'Long Rest'
                              : 'At Will'}
                        </Badge>
                      ) : undefined
                    }
                  />
                )
              })}
            </MenuSection>
          )}

          {/* ── Other Actions — action filter only (Dash, Dodge, etc.) ── */}
          {showOtherActions && (
            <MenuSection
              title="Other Actions"
              icon={Shield}
              iconColor="text-forge-2"
              defaultOpen={false}
            >
              {OTHER_ACTIONS.map((action) => (
                <ActionItem
                  key={action.name}
                  name={action.name}
                  cost="Action"
                  effect={action.effect}
                  disabled={isActionSlotUsed}
                  onSelect={() => handleOtherAction(action.name, 'action')}
                />
              ))}
            </MenuSection>
          )}

          {/* ── Universal Bonus Actions — bonusAction filter only ── */}
          {showBonusActions && (
            <MenuSection
              title="Bonus Actions"
              icon={Zap}
              iconColor="text-ember"
              defaultOpen={true}
            >
              {BONUS_ACTIONS.map((ba) => (
                <ActionItem
                  key={ba.name}
                  name={ba.name}
                  cost="Bonus Action"
                  effect={ba.description}
                  disabled={isActionSlotUsed}
                  onSelect={() => handleOtherAction(ba.name, 'bonusAction')}
                  variant="ember"
                  badge={ba.condition ? <Badge variant="neutral">Conditional</Badge> : undefined}
                />
              ))}
            </MenuSection>
          )}

          {/* ── Universal Reactions — reaction filter only ── */}
          {showReactions && (
            <MenuSection
              title="Reactions"
              icon={Shield}
              iconColor="text-eldritch"
              defaultOpen={true}
            >
              {REACTIONS.map((rxn) => (
                <ActionItem
                  key={rxn.name}
                  name={rxn.name}
                  cost="Reaction"
                  effect={rxn.description}
                  disabled={isActionSlotUsed}
                  onSelect={() => handleOtherAction(rxn.name, 'reaction')}
                  variant="eldritch"
                />
              ))}
            </MenuSection>
          )}
        </div>
      </motion.div>
    </>
  )
}
