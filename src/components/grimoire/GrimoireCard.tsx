import { useState } from 'react'
import {
  Swords,
  Zap,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
  Dices,
  Copy,
  Pencil,
  Trash2,
  Star,
  Minus,
  Plus,
  Timer,
  Target,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character, Spell, ClassFeature } from '../../lib/character'
import { Badge } from '../ui/Badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AbilityItem =
  | { type: 'spell'; data: Spell }
  | { type: 'feature'; data: ClassFeature }

interface GrimoireCardProps {
  item: AbilityItem
  character: Character
  expanded: boolean
  mode?: 'session' | 'prep'
  onToggleExpand: () => void
  onRollDice: (notation: string, label: string) => void
  onTogglePrepared?: () => void
  onExpendUse?: () => void
  onRestoreUse?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${s[level] ?? 'th'}`
}

function actionLabel(item: AbilityItem): { text: string; variant: 'ember' | 'arcane' | 'verdant' | 'neutral' } {
  if (item.type === 'spell') {
    const ct = item.data.castingTime.toLowerCase()
    if (ct.includes('bonus')) return { text: 'Bonus', variant: 'ember' }
    if (ct.includes('reaction')) return { text: 'Reaction', variant: 'verdant' }
    return { text: 'Action', variant: 'arcane' }
  }
  const at = item.data.actionType
  if (at === 'bonusAction') return { text: 'Bonus', variant: 'ember' }
  if (at === 'reaction') return { text: 'Reaction', variant: 'verdant' }
  if (at === 'passive') return { text: 'Passive', variant: 'neutral' }
  return { text: 'Action', variant: 'arcane' }
}

function getRange(item: AbilityItem): string | undefined {
  if (item.type === 'spell') return item.data.range
  return item.data.range
}

function getDamageDice(item: AbilityItem): string | undefined {
  if (item.type === 'spell') return item.data.damageDice
  return item.data.damageDice
}

function getDamageType(item: AbilityItem): string | undefined {
  if (item.type === 'spell') return item.data.damageType
  return item.data.damageType
}

function getSaveType(item: AbilityItem): string | undefined {
  if (item.type === 'spell') return item.data.saveType
  return item.data.saveType
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrimoireCard({
  item,
  character,
  expanded,
  mode = 'session',
  onToggleExpand,
  onRollDice,
  onTogglePrepared,
  onExpendUse,
  onRestoreUse,
  onEdit,
  onDelete,
}: GrimoireCardProps) {
  const [copied, setCopied] = useState(false)

  const action = actionLabel(item)
  const range = getRange(item)
  const damageDice = getDamageDice(item)
  const damageType = getDamageType(item)
  const saveType = getSaveType(item)

  const isSpell = item.type === 'spell'
  const spell = isSpell ? item.data as Spell : null
  const feature = !isSpell ? item.data as ClassFeature : null

  const handleCopy = () => {
    const text = `${item.data.name}\n${item.data.description}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRoll = () => {
    if (damageDice) {
      onRollDice(damageDice, `${item.data.name}${damageType ? ` (${damageType})` : ''}`)
    }
  }

  // Resource tracking
  const hasUses = feature && feature.usesMax !== undefined && feature.usesCurrent !== undefined
  const spellLevel = spell?.level ?? 0
  const spellSlot = spellLevel > 0 ? character.spellSlots[spellLevel] : null

  // Prep-mode readiness: determine if this item is "combat ready"
  const isPrep = mode === 'prep'
  const isItemReady = isSpell
    ? (spell?.prepared || spell?.level === 0)
    : !hasUses || (feature!.usesCurrent! > 0)
  const featureCharged = hasUses && feature!.usesCurrent! > 0

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 ease-forge overflow-hidden',
        // Prep-mode: dim unprepared spells, highlight prepared ones
        isPrep && isSpell && !isItemReady && !expanded
          ? 'bg-white/[0.015] border-white/5 opacity-70'
          : isPrep && isSpell && isItemReady && !expanded
            ? 'bg-arcane/[0.04] border-arcane/20 shadow-[0_0_12px_-4px_rgba(212,167,74,0.15)]'
            : isPrep && !isSpell && hasUses && featureCharged && !expanded
              ? 'bg-verdant/[0.03] border-verdant/15'
              : isPrep && !isSpell && hasUses && !featureCharged && !expanded
                ? 'bg-white/[0.015] border-white/5 opacity-70'
                : expanded
                  ? 'bg-white/[0.05] border-white/15'
                  : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.04]',
      )}
    >
      {/* ─── Header (always visible) ─── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'w-full min-h-[56px] px-4 py-3',
          'flex items-start justify-between text-left',
          'transition-colors duration-200',
          'active:scale-[0.99]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        <div className="flex-1 min-w-0">
          {/* Name + badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-forge-0">{item.data.name}</span>
            <Badge variant={isSpell ? 'arcane' : 'eldritch'}>
              {isSpell ? 'Spell' : 'Feature'}
            </Badge>
            <Badge variant={action.variant}>{action.text}</Badge>
            {range && range !== 'Self' && (
              <span className="text-xs text-forge-2">{range}</span>
            )}
            {spell?.concentration && (
              <Badge variant="ember">Conc</Badge>
            )}
            {spell?.ritual && (
              <Badge variant="verdant">Ritual</Badge>
            )}
          </div>

          {/* Combat info row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isSpell && (
              <span className="text-xs text-forge-2">{levelLabel(spellLevel)}</span>
            )}
            {/* The word is the label, the number is the value. --d-dim (forge-2) is
                for "Lvl" and "DC"; the numeral goes one step up to forge-1, which is
                the only ink in the scale that clears the 7:1 floor a value has to
                clear at arm's length. Splitting the span is the whole fix. */}
            {!isSpell && feature && (
              <span className="text-xs text-forge-2">
                Lvl <span className="text-forge-1 tabular-nums">{feature.level}</span>
              </span>
            )}
            {damageDice && (
              <span className="text-xs font-mono text-ember">
                {damageDice}{damageType ? ` ${damageType}` : ''}
              </span>
            )}
            {saveType && (
              <span className="text-xs text-forge-2">
                DC <span className="text-forge-1 tabular-nums">{character.spellSaveDC}</span> {saveType}
              </span>
            )}
            {isSpell && spell?.prepared && (
              <Star size={10} className="text-verdant fill-verdant" aria-label="Prepared" />
            )}
          </div>

          {/* Resource pips */}
          {hasUses && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-forge-2">Uses:</span>
              <div className="pip-row -my-2">
                {Array.from({ length: feature!.usesMax! }).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (i < feature!.usesCurrent!) onExpendUse?.()
                      else onRestoreUse?.()
                    }}
                    className="pip-tap"
                    data-slot={i < feature!.usesCurrent! ? 'full' : 'spent'}
                    data-tone="eldritch"
                    aria-label={i < feature!.usesCurrent! ? 'Expend use' : 'Restore use'}
                  >
                    <i />
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-forge-1">
                {feature!.usesCurrent}/{feature!.usesMax}
              </span>
            </div>
          )}

          {spellSlot && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-forge-2">Slots:</span>
              {/* Read-only. These are a readout of the level's slots, not the
                  controls that spend them — the controls live on the Combat and
                  Grimoire session cards. A readout does not need a 48px cell and
                  should not pretend to be pressable, so it draws the small dot
                  directly instead of borrowing .pip-tap's tap geometry. */}
              <div className="flex gap-1">
                {Array.from({ length: spellSlot.max }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      i < spellSlot.current
                        ? 'bg-arcane shadow-[0_0_4px_rgba(61,210,255,0.4)]'
                        : 'bg-void-1 ring-1 ring-bronze/85',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-forge-1">
                {spellSlot.current}/{spellSlot.max}
              </span>
            </div>
          )}
        </div>

        {/* Prep-mode quick toggle + Expand chevron */}
        <div className="flex items-center gap-1 ml-2 mt-1 shrink-0">
          {/* Quick prepare toggle (prep mode, spells only) */}
          {isPrep && isSpell && onTogglePrepared && spell && spell.level > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTogglePrepared()
              }}
              className={cn(
                'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.9]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                spell.prepared
                  ? 'text-arcane'
                  : 'text-forge-2 hover:text-forge-1',
              )}
              aria-label={spell.prepared ? `Unprepare ${spell.name}` : `Prepare ${spell.name}`}
              aria-pressed={spell.prepared}
            >
              <Star
                size={18}
                className={cn(
                  'transition-all duration-200',
                  spell.prepared && 'fill-arcane drop-shadow-[0_0_4px_rgba(212,167,74,0.5)]',
                )}
                aria-hidden
              />
            </button>
          )}

          {/* Charged indicator (prep mode, features with uses) */}
          {isPrep && !isSpell && hasUses && (
            <div
              className={cn(
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
              )}
              aria-label={featureCharged ? 'Charged' : 'Expended'}
            >
              <Zap
                size={16}
                className={cn(
                  'transition-all duration-200',
                  featureCharged
                    ? 'text-verdant fill-verdant drop-shadow-[0_0_4px_rgba(57,217,138,0.5)]'
                    : 'text-forge-2',
                )}
                aria-hidden
              />
            </div>
          )}

          {expanded ? (
            <ChevronUp size={16} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={16} className="text-forge-2" aria-hidden />
          )}
        </div>
      </button>

      {/* ─── Expanded Detail ─── */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-fade-in">
          {/* Description */}
          <p className="text-sm text-forge-1 leading-relaxed mt-3 whitespace-pre-wrap">
            {item.data.description}
          </p>

          {/* Spell-specific details */}
          {isSpell && spell && (
            <div className="mt-3 space-y-1">
              {spell.castingTime && (
                <div className="flex items-center gap-2 text-xs">
                  <Timer size={12} className="text-forge-2" aria-hidden />
                  <span className="text-forge-2">Casting Time:</span>
                  <span className="text-forge-1">{spell.castingTime}</span>
                </div>
              )}
              {spell.duration && (
                <div className="flex items-center gap-2 text-xs">
                  <Timer size={12} className="text-forge-2" aria-hidden />
                  <span className="text-forge-2">Duration:</span>
                  <span className="text-forge-1">{spell.duration}</span>
                </div>
              )}
              {spell.components && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-forge-2">Components:</span>
                  <span className="text-forge-1">{spell.components}</span>
                </div>
              )}
              {spell.areaOfEffect && (
                <div className="flex items-center gap-2 text-xs">
                  <Target size={12} className="text-forge-2" aria-hidden />
                  <span className="text-forge-2">Area:</span>
                  <span className="text-forge-1">{spell.areaOfEffect}</span>
                </div>
              )}
              {spell.higherLevels && (
                <div className="mt-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <span className="text-xs font-semibold text-arcane block mb-1">At Higher Levels</span>
                  <p className="text-xs text-forge-2 leading-relaxed">{spell.higherLevels}</p>
                </div>
              )}
            </div>
          )}

          {/* Feature-specific details */}
          {!isSpell && feature && (
            <div className="mt-3 space-y-1">
              {feature.duration && (
                <div className="flex items-center gap-2 text-xs">
                  <Timer size={12} className="text-forge-2" aria-hidden />
                  <span className="text-forge-2">Duration:</span>
                  <span className="text-forge-1">{feature.duration}</span>
                </div>
              )}
              {feature.usesPerRest && feature.usesPerRest !== 'unlimited' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-forge-2">Recharges on:</span>
                  <span className="text-forge-1">{feature.usesPerRest === 'short' ? 'Short Rest' : 'Long Rest'}</span>
                </div>
              )}
              {feature.category && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-forge-2">Source:</span>
                  <span className="text-forge-1 capitalize">{feature.category}</span>
                </div>
              )}
            </div>
          )}

          {/* Tactical note */}
          {(spell?.tacticalNote || feature?.tacticalNote) && (
            <div className="mt-3 p-2.5 rounded-lg bg-ember/5 border border-ember/15">
              <span className="text-xs font-semibold text-ember block mb-1">Tactical Tip</span>
              <p className="text-xs text-forge-1 leading-relaxed">
                {spell?.tacticalNote || feature?.tacticalNote}
              </p>
            </div>
          )}

          {/* Source */}
          {(spell?.source || feature?.source) && (
            <p className="text-xs text-forge-2 mt-2">
              Source: {spell?.source || feature?.source}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {damageDice && (
              <button
                onClick={handleRoll}
                className={cn(
                  'flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
                  'text-xs font-medium',
                  'bg-eldritch/15 text-eldritch border border-eldritch/25',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-eldritch/20 active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
              >
                <Dices size={14} aria-hidden />
                Roll {damageDice}
              </button>
            )}

            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
                'text-xs font-medium',
                'bg-white/[0.04] text-forge-2 border border-white/8',
                'transition-all duration-200 ease-forge',
                'hover:bg-white/[0.06] hover:text-forge-1 active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              <Copy size={14} aria-hidden />
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {isSpell && onTogglePrepared && (
              <button
                onClick={onTogglePrepared}
                className={cn(
                  'flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg',
                  'text-xs font-semibold',
                  'border transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  spell?.prepared
                    ? [
                        'bg-arcane/15 text-arcane border-arcane/30',
                        'shadow-[0_0_12px_-4px_rgba(212,167,74,0.25)]',
                      ]
                    : 'bg-white/[0.04] text-forge-2 border-white/8 hover:bg-white/[0.06] hover:text-forge-1',
                )}
              >
                <Star
                  size={14}
                  className={cn(
                    'transition-all duration-200',
                    spell?.prepared && 'fill-arcane',
                  )}
                  aria-hidden
                />
                {isPrep
                  ? spell?.prepared ? 'Prepared for Session' : 'Prepare for Session'
                  : spell?.prepared ? 'Prepared' : 'Prepare'
                }
              </button>
            )}

            {onEdit && (
              <button
                onClick={onEdit}
                className={cn(
                  'flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
                  'text-xs font-medium',
                  'bg-white/[0.04] text-forge-2 border border-white/8',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.06] hover:text-forge-1 active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
              >
                <Pencil size={14} aria-hidden />
                Edit
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                className={cn(
                  'flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
                  'text-xs font-medium',
                  'bg-white/[0.04] text-red-400 border border-white/8',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-red-500/10 hover:border-red-500/20 active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
              >
                <Trash2 size={14} aria-hidden />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
