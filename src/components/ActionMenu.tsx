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
} from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { GlassCard } from './ui/GlassCard'
import { OrnateHeader } from './ui/OrnateHeader'
import type { Character } from '../lib/character'
import { attackBonus, abilityModifier } from '../lib/character'
import type { CombatState } from '../lib/combat-state'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionChoice {
  type: 'action' | 'bonusAction'
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
          'flex items-center gap-2 min-h-[44px] px-2 -mx-2 rounded-lg',
          'text-sm font-semibold text-forge-1',
          'transition-all duration-200 ease-forge',
          'hover:bg-gold/[0.04] hover:text-forge-0',
          'active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
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
    default: 'hover:bg-gold/[0.06] hover:border-gold/25',
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
        'combat-card min-h-[44px] px-3 py-2.5 text-left',
        'active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        'disabled:opacity-30 disabled:pointer-events-none',
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
            <span className="text-[10px] font-mono text-forge-2">{cost}</span>
          )}
          {badge}
        </div>
      </div>
      {effect && (
        <div className="text-[10px] text-forge-2 mt-0.5 leading-snug line-clamp-2">
          {effect}
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Other Actions (Dash, Dodge, etc.)
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
// Main Component
// ---------------------------------------------------------------------------

export function ActionMenu({ isOpen, onClose, character, combatState, onUseAction }: ActionMenuProps) {
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

  const cantrips = useMemo(
    () => character.spells.filter((s) => s.level === 0 && s.prepared),
    [character.spells],
  )

  const spellsByLevel = useMemo(() => {
    const map = new Map<number, typeof character.spells>()
    for (const spell of character.spells) {
      if (spell.level > 0 && spell.prepared) {
        const list = map.get(spell.level) || []
        list.push(spell)
        map.set(spell.level, list)
      }
    }
    return map
  }, [character.spells])

  const classFeatures = useMemo(
    () => character.features.filter((f) => f.level <= character.level),
    [character.features, character.level],
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
      const mod = abilityModifier(character.abilityScores[weapon.abilityMod])
      const bonusDmg = weapon.bonusDamage ?? 0
      const dmgMod = mod + bonusDmg
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
        type: 'action',
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
      const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')
      const notation = spell.damageDice
        ? spell.damageDice
        : spell.saveType
          ? undefined
          : `d20+${character.spellAttackBonus}`
      onUseAction({
        type: isBonusAction ? 'bonusAction' : 'action',
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
        type: 'action',
        name: feature.name,
        category: 'Class Feature',
      })
    },
    [onUseAction],
  )

  const handleOtherAction = useCallback(
    (name: string) => {
      onUseAction({
        type: 'action',
        name,
        category: 'Other',
      })
    },
    [onUseAction],
  )

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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Action Menu"
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[85dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0 ornate-border',
          'outline-none',
          'transition-transform duration-300 ease-forge',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          !isOpen && 'pointer-events-none',
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-forge-2/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <OrnateHeader className="flex-1">Choose Action</OrnateHeader>
          <button
            type="button"
            aria-label="Close action menu"
            onClick={onClose}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
              'text-forge-2 hover:text-forge-0 hover:bg-gold/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-6 safe-bottom flex flex-col gap-3">
          {/* ── Weapon Attacks ── */}
          {character.weapons.length > 0 && (
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
                    disabled={combatState.turnActions.action}
                    onSelect={() => handleWeaponAttack(weapon)}
                    variant="arcane"
                    badge={<Badge variant="arcane">Attack</Badge>}
                  />
                )
              })}
            </MenuSection>
          )}

          {/* Divider */}
          {character.weapons.length > 0 && cantrips.length > 0 && (
            <div className="ornate-divider" aria-hidden />
          )}

          {/* ── Cantrips ── */}
          {cantrips.length > 0 && (
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
                  cost="Action"
                  effect={
                    [
                      spell.damageDice && `${spell.damageDice} ${spell.damageType ?? ''}`,
                      spell.range && spell.range !== 'Self' && `Range: ${spell.range}`,
                      spell.concentration && 'Concentration',
                    ]
                      .filter(Boolean)
                      .join(' | ') || spell.description.slice(0, 80)
                  }
                  disabled={combatState.turnActions.action}
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
                  {spells.map((spell) => {
                    const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')
                    const actionType = isBonusAction ? 'bonusAction' : 'action'
                    const isUsed = combatState.turnActions[actionType]
                    return (
                      <ActionItem
                        key={spell.name}
                        name={spell.name}
                        cost={isBonusAction ? 'Bonus Action' : 'Action'}
                        effect={
                          [
                            spell.damageDice && `${spell.damageDice} ${spell.damageType ?? ''}`,
                            spell.concentration && 'Concentration',
                            spell.range && spell.range !== 'Self' && `Range: ${spell.range}`,
                          ]
                            .filter(Boolean)
                            .join(' | ') || spell.description.slice(0, 80)
                        }
                        disabled={remaining <= 0 || isUsed}
                        onSelect={() => handleSpell(spell, level)}
                        variant="eldritch"
                        badge={
                          <Badge variant={spell.concentration ? 'ember' : 'eldritch'}>
                            Lvl {level}
                          </Badge>
                        }
                      />
                    )
                  })}
                </MenuSection>
              )
            })}

          {/* Divider */}
          {(cantrips.length > 0 || spellsByLevel.size > 0) && classFeatures.length > 0 && (
            <div className="ornate-divider" aria-hidden />
          )}

          {/* ── Class Features ── */}
          {classFeatures.length > 0 && (
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
                    disabled={hasUses && remaining !== undefined && remaining <= 0}
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

          {/* Divider */}
          <div className="ornate-divider" aria-hidden />

          {/* ── Other Actions (Dash, Dodge, etc.) ── */}
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
                disabled={combatState.turnActions.action}
                onSelect={() => handleOtherAction(action.name)}
              />
            ))}
          </MenuSection>
        </div>
      </div>
    </>
  )
}
