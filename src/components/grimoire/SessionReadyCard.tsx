import { useMemo } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  Swords,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import { Badge } from '../ui/Badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionReadyCardProps {
  character: Character
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${s[level] ?? 'th'}`
}

function ProgressBar({ current, max, color = 'arcane' }: { current: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0

  const barColor =
    color === 'verdant' ? 'bg-verdant' :
    color === 'ember' ? 'bg-ember' :
    color === 'eldritch' ? 'bg-eldritch' :
    'bg-arcane'

  return (
    <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-forge', barColor)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionReadyCard({ character }: SessionReadyCardProps) {
  // --- Computed stats ---
  const preparedCount = useMemo(
    () => character.spells.filter(s => s.prepared || s.level === 0).length,
    [character.spells],
  )

  const nonCantripPrepared = useMemo(
    () => character.spells.filter(s => s.prepared && s.level > 0).length,
    [character.spells],
  )

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

  const featuresWithUses = useMemo(
    () => character.features.filter(f => f.usesMax !== undefined && f.usesCurrent !== undefined),
    [character.features],
  )

  const chargedCount = useMemo(
    () => featuresWithUses.filter(f => f.usesCurrent! > 0).length,
    [featuresWithUses],
  )

  const combatWeaponsCount = useMemo(
    () => character.weapons.filter(w => w.magical || (w.specialAbilities && w.specialAbilities.length > 0)).length,
    [character.weapons],
  )

  // --- Readiness assessment ---
  const checks = useMemo(() => {
    const results: boolean[] = []

    // Spell slots full?
    if (slotEntries.length > 0) {
      results.push(allSlotsFull)
    }

    // Features charged?
    if (featuresWithUses.length > 0) {
      results.push(chargedCount === featuresWithUses.length)
    }

    // Spells prepared?
    if (character.canPrepareSpells) {
      results.push(nonCantripPrepared >= character.maxPreparedSpells)
    }

    return results
  }, [slotEntries, allSlotsFull, featuresWithUses, chargedCount, character.canPrepareSpells, nonCantripPrepared, character.maxPreparedSpells])

  const passedChecks = checks.filter(Boolean).length
  const totalChecks = checks.length
  const isReady = totalChecks === 0 || passedChecks === totalChecks

  const hasContent = character.spells.length > 0 || character.features.length > 0 || combatWeaponsCount > 0

  if (!hasContent) return null

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-300 ease-forge',
        'relative overflow-hidden',
        isReady
          ? 'bg-verdant/[0.04] border-verdant/20'
          : 'bg-ember/[0.04] border-ember/20',
      )}
    >
      {/* Subtle glow effect when ready */}
      {isReady && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(57, 217, 138, 0.06) 0%, transparent 70%)',
          }}
          aria-hidden
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isReady ? (
              <ShieldCheck size={18} className="text-verdant" aria-hidden />
            ) : (
              <ShieldAlert size={18} className="text-ember" aria-hidden />
            )}
            <span className="text-sm font-display font-semibold text-forge-0">Session Status</span>
          </div>
          <Badge variant={isReady ? 'verdant' : 'ember'}>
            {isReady ? 'Ready for Battle' : 'Needs Prep'}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Prepared Spells */}
          {character.spells.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-arcane" aria-hidden />
                <span className="text-xs text-forge-2 uppercase tracking-wider">Spells</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-arcane tabular-nums">{preparedCount}</span>
                {character.canPrepareSpells && (
                  <span className="text-xs text-forge-2">/ {character.maxPreparedSpells + character.spells.filter(s => s.level === 0).length}</span>
                )}
              </div>
              {character.canPrepareSpells && (
                <ProgressBar current={nonCantripPrepared} max={character.maxPreparedSpells} color="arcane" />
              )}
            </div>
          )}

          {/* Spell Slots */}
          {slotEntries.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-gold" aria-hidden />
                <span className="text-xs text-forge-2 uppercase tracking-wider">Slots</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {slotEntries.map(([level, slot]) => (
                  <span
                    key={level}
                    className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded',
                      slot.current === slot.max
                        ? 'bg-verdant/10 text-verdant'
                        : slot.current === 0
                          ? 'bg-ember/10 text-ember'
                          : 'bg-ember/10 text-ember',
                    )}
                  >
                    {levelLabel(Number(level))}: {slot.current}/{slot.max}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Features Charged */}
          {featuresWithUses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-eldritch" aria-hidden />
                <span className="text-xs text-forge-2 uppercase tracking-wider">Features</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-eldritch tabular-nums">{chargedCount}</span>
                <span className="text-xs text-forge-2">/ {featuresWithUses.length} charged</span>
              </div>
              <ProgressBar current={chargedCount} max={featuresWithUses.length} color="eldritch" />
            </div>
          )}

          {/* Combat Weapons */}
          {combatWeaponsCount > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Swords size={10} className="text-ember" aria-hidden />
                <span className="text-xs text-forge-2 uppercase tracking-wider">Weapons</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-ember tabular-nums">{combatWeaponsCount}</span>
                <span className="text-xs text-forge-2">combat-ready</span>
              </div>
            </div>
          )}
        </div>

        {/* Readiness progress */}
        {totalChecks > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-forge-2">Readiness</span>
              <span className={cn(
                'text-xs font-medium',
                isReady ? 'text-verdant' : 'text-ember',
              )}>
                {passedChecks}/{totalChecks} checks passed
              </span>
            </div>
            <ProgressBar
              current={passedChecks}
              max={totalChecks}
              color={isReady ? 'verdant' : 'ember'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
