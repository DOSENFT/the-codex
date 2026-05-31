import { useMemo } from 'react'
import {
  Shield,
  Sparkles,
  Swords,
  Zap,
  Check,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character, Spell, ClassFeature, Weapon } from '../../lib/character'
import { Badge } from '../ui/Badge'
import { GlassCard } from '../ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoadoutPanelProps {
  character: Character
  onTogglePrepared: (spellName: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${s[level] ?? 'th'}`
}

/** Group spells by level, returning sorted entries. */
function groupSpellsByLevel(spells: Spell[]): [number, Spell[]][] {
  const map = new Map<number, Spell[]>()
  for (const spell of spells) {
    const group = map.get(spell.level) ?? []
    group.push(spell)
    map.set(spell.level, group)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b)
}

/** Get combat-ready weapons (magical or with special abilities). */
function getCombatWeapons(weapons: Weapon[]): Weapon[] {
  return weapons.filter(w => w.magical || (w.specialAbilities && w.specialAbilities.length > 0))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 min-h-[36px]">
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
          'transition-colors duration-200',
          ok
            ? 'bg-verdant/20 text-verdant'
            : 'bg-ember/20 text-ember',
        )}
      >
        {ok ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
      </div>
      <span className="text-xs text-forge-1">{label}</span>
    </div>
  )
}

function ProgressBar({ current, max, color = 'arcane' }: { current: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0

  const barColor =
    color === 'verdant' ? 'bg-verdant' :
    color === 'ember' ? 'bg-ember' :
    color === 'eldritch' ? 'bg-eldritch' :
    'bg-arcane'

  const glowColor =
    color === 'verdant' ? 'shadow-[0_0_8px_rgba(57,217,138,0.3)]' :
    color === 'ember' ? 'shadow-[0_0_8px_rgba(232,146,74,0.3)]' :
    color === 'eldritch' ? 'shadow-[0_0_8px_rgba(139,92,246,0.3)]' :
    'shadow-[0_0_8px_rgba(212,167,74,0.3)]'

  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-forge',
          barColor,
          pct === 100 && glowColor,
        )}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}

function SpellChip({
  spell,
  onToggle,
}: {
  spell: Spell
  onToggle: () => void
}) {
  const isPrepared = spell.prepared || spell.level === 0
  const isCantrip = spell.level === 0

  return (
    <button
      type="button"
      onClick={isCantrip ? undefined : onToggle}
      disabled={isCantrip}
      className={cn(
        'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium',
        'border transition-all duration-200 ease-forge',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        isCantrip
          ? 'bg-arcane/10 text-arcane/70 border-arcane/15 cursor-default'
          : isPrepared
            ? [
                'bg-arcane/15 text-arcane border-arcane/30',
                'shadow-[0_0_8px_-2px_rgba(212,167,74,0.2)]',
                'hover:bg-arcane/20 active:scale-[0.95]',
              ]
            : [
                'bg-white/[0.03] text-forge-2 border-white/8',
                'opacity-70',
                'hover:bg-white/[0.06] hover:text-forge-1 hover:opacity-100',
                'active:scale-[0.95]',
              ],
      )}
      aria-label={isCantrip ? `${spell.name} (always prepared)` : isPrepared ? `Unprepare ${spell.name}` : `Prepare ${spell.name}`}
      aria-pressed={isPrepared}
    >
      {spell.name}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LoadoutPanel({ character, onTogglePrepared }: LoadoutPanelProps) {
  // --- Computed data ---
  const spellsByLevel = useMemo(() => groupSpellsByLevel(character.spells), [character.spells])

  const preparedSpells = useMemo(
    () => character.spells.filter(s => s.prepared || s.level === 0),
    [character.spells],
  )

  const nonCantripPrepared = useMemo(
    () => character.spells.filter(s => s.prepared && s.level > 0).length,
    [character.spells],
  )

  const featuresWithUses = useMemo(
    () => character.features.filter(f => f.usesMax !== undefined && f.usesCurrent !== undefined),
    [character.features],
  )

  const chargedFeatures = useMemo(
    () => featuresWithUses.filter(f => f.usesCurrent! > 0),
    [featuresWithUses],
  )

  const combatWeapons = useMemo(
    () => getCombatWeapons(character.weapons),
    [character.weapons],
  )

  // --- Slot status ---
  const slotEntries = useMemo(
    () =>
      Object.entries(character.spellSlots)
        .filter(([_, slot]) => slot.max > 0)
        .sort(([a], [b]) => Number(a) - Number(b)),
    [character.spellSlots],
  )

  const allSlotsFull = useMemo(
    () => slotEntries.every(([_, slot]) => slot.current === slot.max),
    [slotEntries],
  )

  const allFeaturesCharged = useMemo(
    () => featuresWithUses.every(f => f.usesCurrent! >= f.usesMax!),
    [featuresWithUses],
  )

  const hasSpells = character.spells.length > 0
  const hasFeatures = character.features.length > 0
  const hasSlots = slotEntries.length > 0
  const hasCombatWeapons = combatWeapons.length > 0

  // If there's nothing to show, render an empty-state
  if (!hasSpells && !hasFeatures && !hasCombatWeapons) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-gold" aria-hidden />
          <span className="text-sm font-display font-semibold text-forge-0">Lock & Load</span>
        </div>
        <p className="text-xs text-forge-2">
          Add spells, features, or magical weapons to see your combat loadout here.
        </p>
      </GlassCard>
    )
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* ─── Spells Section ─── */}
      {hasSpells && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-arcane" aria-hidden />
            <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Prepared Spells</span>
            <Badge variant="arcane">{preparedSpells.length}</Badge>
          </div>

          {/* Prepared spell count + progress */}
          {character.canPrepareSpells && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-forge-2">
                  Prepared: {nonCantripPrepared} / {character.maxPreparedSpells}
                </span>
                <span className="text-[10px] text-forge-2">
                  {nonCantripPrepared >= character.maxPreparedSpells ? 'Full' : `${character.maxPreparedSpells - nonCantripPrepared} remaining`}
                </span>
              </div>
              <ProgressBar current={nonCantripPrepared} max={character.maxPreparedSpells} color="arcane" />
            </div>
          )}

          {/* Spell chips grouped by level */}
          <div className="space-y-3">
            {spellsByLevel.map(([level, spells]) => (
              <div key={level}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">
                    {levelLabel(level)}{level > 0 ? ' Level' : 's'}
                  </span>
                  {level > 0 && character.spellSlots[level] && (
                    <span className="text-[10px] text-forge-2">
                      ({character.spellSlots[level].current}/{character.spellSlots[level].max} slots)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {spells.map(spell => (
                    <SpellChip
                      key={spell.name}
                      spell={spell}
                      onToggle={() => onTogglePrepared(spell.name)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ─── Features Section ─── */}
      {featuresWithUses.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-eldritch" aria-hidden />
            <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Limited Features</span>
            <Badge variant="eldritch">{chargedFeatures.length}/{featuresWithUses.length}</Badge>
          </div>

          <div className="space-y-2">
            {featuresWithUses.map(f => {
              const charged = f.usesCurrent! > 0
              return (
                <div
                  key={f.name}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg border',
                    'transition-all duration-200 ease-forge',
                    charged
                      ? 'bg-verdant/5 border-verdant/15'
                      : 'bg-white/[0.02] border-white/5 opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0 transition-colors duration-200',
                        charged ? 'bg-verdant shadow-[0_0_6px_rgba(57,217,138,0.4)]' : 'bg-white/15',
                      )}
                    />
                    <span className={cn(
                      'text-xs font-medium truncate',
                      charged ? 'text-forge-0' : 'text-forge-2',
                    )}>
                      {f.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: f.usesMax! }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'w-2.5 h-2.5 rounded-full transition-all duration-200',
                            i < f.usesCurrent!
                              ? 'bg-eldritch shadow-[0_0_4px_rgba(139,92,246,0.4)]'
                              : 'bg-white/10 border border-white/15',
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-forge-2 tabular-nums">
                      {f.usesCurrent}/{f.usesMax}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* ─── Combat Weapons Section ─── */}
      {hasCombatWeapons && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords size={14} className="text-ember" aria-hidden />
            <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Combat Weapons</span>
            <Badge variant="ember">{combatWeapons.length}</Badge>
          </div>

          <div className="space-y-2">
            {combatWeapons.map(w => (
              <div
                key={w.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-ember/15 bg-ember/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Swords size={12} className="text-ember shrink-0" aria-hidden />
                  <span className="text-xs font-medium text-forge-0 truncate">{w.name}</span>
                  {w.magical && <Badge variant="gold" className="text-[9px] px-1.5">Magical</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-ember">{w.damageDice}</span>
                  {w.specialAbilities && w.specialAbilities.length > 0 && (
                    <span className="text-[10px] text-forge-2">
                      +{w.specialAbilities.length} {w.specialAbilities.length === 1 ? 'ability' : 'abilities'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ─── Quick Actions Checklist ─── */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-gold" aria-hidden />
          <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Readiness Check</span>
        </div>

        <div className="space-y-1">
          {/* Spell slots status */}
          {hasSlots && (
            <StatusIndicator
              ok={allSlotsFull}
              label={allSlotsFull ? 'All spell slots full' : 'Some spell slots expended'}
            />
          )}

          {/* Per-level slot breakdown when not all full */}
          {hasSlots && !allSlotsFull && (
            <div className="flex flex-wrap gap-2 ml-7 mb-1">
              {slotEntries.map(([level, slot]) => (
                <span
                  key={level}
                  className={cn(
                    'text-[10px] font-medium',
                    slot.current === slot.max ? 'text-verdant' : 'text-ember',
                  )}
                >
                  {levelLabel(Number(level))}: {slot.current}/{slot.max}
                </span>
              ))}
            </div>
          )}

          {/* Features status */}
          {featuresWithUses.length > 0 && (
            <StatusIndicator
              ok={allFeaturesCharged}
              label={allFeaturesCharged ? 'All features recharged' : `${chargedFeatures.length}/${featuresWithUses.length} features charged`}
            />
          )}

          {/* Prepared spells status */}
          {character.canPrepareSpells && (
            <StatusIndicator
              ok={nonCantripPrepared >= character.maxPreparedSpells}
              label={`Prepared spells: ${nonCantripPrepared} / ${character.maxPreparedSpells}`}
            />
          )}

          {/* Combat weapons */}
          {hasCombatWeapons && (
            <StatusIndicator
              ok={true}
              label={`${combatWeapons.length} combat ${combatWeapons.length === 1 ? 'weapon' : 'weapons'} equipped`}
            />
          )}
        </div>
      </GlassCard>
    </div>
  )
}
