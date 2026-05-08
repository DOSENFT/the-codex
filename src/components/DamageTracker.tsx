import { useState, useCallback, useMemo } from 'react'
import {
  Swords,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  History,
  Crosshair,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type CombatLog,
  type DamageEntry,
  getDamageBreakdown,
  getTopSources,
  getAverageDPR,
  loadDamageLogs,
} from '../lib/damage-log'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DamageTrackerProps {
  characterId: string
  currentLog: CombatLog | null
  round: number
  onLogDamage: (entry: Omit<DamageEntry, 'timestamp'>) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAMAGE_TYPES = [
  'Slashing',
  'Piercing',
  'Bludgeoning',
  'Fire',
  'Cold',
  'Lightning',
  'Thunder',
  'Poison',
  'Acid',
  'Necrotic',
  'Radiant',
  'Psychic',
  'Force',
] as const

type DamageTypeName = (typeof DAMAGE_TYPES)[number]

/** Color mapping for damage type badges and chart segments */
const DAMAGE_TYPE_COLORS: Record<DamageTypeName, string> = {
  Fire: 'text-ember',
  Radiant: 'text-amber-400',
  Cold: 'text-blue-400',
  Lightning: 'text-yellow-400',
  Thunder: 'text-purple-400',
  Poison: 'text-green-400',
  Acid: 'text-lime-400',
  Necrotic: 'text-gray-400',
  Psychic: 'text-pink-400',
  Force: 'text-arcane',
  Slashing: 'text-red-400',
  Piercing: 'text-orange-400',
  Bludgeoning: 'text-stone-400',
}

/** CSS colors for pie chart conic-gradient segments */
const DAMAGE_TYPE_CSS_COLORS: Record<DamageTypeName, string> = {
  Fire: '#f4b545',
  Radiant: '#fbbf24',
  Cold: '#60a5fa',
  Lightning: '#facc15',
  Thunder: '#c084fc',
  Poison: '#4ade80',
  Acid: '#a3e635',
  Necrotic: '#9ca3af',
  Psychic: '#f472b6',
  Force: '#d4a74a',
  Slashing: '#f87171',
  Piercing: '#fb923c',
  Bludgeoning: '#a8a29e',
}

/** Bar chart background colors for source breakdown */
const DAMAGE_TYPE_BAR_BG: Record<DamageTypeName, string> = {
  Fire: 'bg-ember/30',
  Radiant: 'bg-amber-400/30',
  Cold: 'bg-blue-400/30',
  Lightning: 'bg-yellow-400/30',
  Thunder: 'bg-purple-400/30',
  Poison: 'bg-green-400/30',
  Acid: 'bg-lime-400/30',
  Necrotic: 'bg-gray-400/30',
  Psychic: 'bg-pink-400/30',
  Force: 'bg-arcane/30',
  Slashing: 'bg-red-400/30',
  Piercing: 'bg-orange-400/30',
  Bludgeoning: 'bg-stone-400/30',
}

const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((t) => ({ value: t, label: t }))

// ---------------------------------------------------------------------------
// Quick Add Form
// ---------------------------------------------------------------------------

function QuickAddForm({
  onSubmit,
}: {
  onSubmit: (entry: Omit<DamageEntry, 'timestamp'>) => void
}) {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [damageType, setDamageType] = useState<DamageTypeName>('Slashing')
  const [critical, setCritical] = useState(false)
  const [target, setTarget] = useState('')

  const handleSubmit = useCallback(() => {
    const parsedAmount = parseInt(amount, 10)
    if (!source.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    onSubmit({
      source: source.trim(),
      amount: parsedAmount,
      damageType,
      critical,
      target: target.trim() || undefined,
    })

    // Reset form but keep source and damage type for rapid re-entry
    setAmount('')
    setCritical(false)
    setTarget('')
  }, [source, amount, damageType, critical, target, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const isValid = source.trim() && amount && parseInt(amount, 10) > 0

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Source + Amount */}
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <input
          type="text"
          placeholder="Source (e.g. Longsword)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[44px] w-full rounded-xl px-4',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25 text-sm font-body',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
            'focus:outline-none',
          )}
        />
        <input
          type="number"
          placeholder="Dmg"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[44px] w-full rounded-xl px-3 text-center',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25 text-sm font-mono',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
            'focus:outline-none',
          )}
        />
      </div>

      {/* Row 2: Type dropdown + Critical + Target */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
        <div className="relative">
          <select
            value={damageType}
            onChange={(e) => setDamageType(e.target.value as DamageTypeName)}
            className={cn(
              'min-h-[44px] w-full rounded-xl appearance-none',
              'bg-void-2/60 text-forge-0',
              'border border-bronze/25 text-sm font-body',
              'pl-4 pr-10 cursor-pointer',
              'transition-all duration-200 ease-forge',
              'focus:border-arcane/60 focus:bg-void-2/80',
              'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
              'focus:outline-none',
            )}
          >
            {DAMAGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forge-2"
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={() => setCritical(!critical)}
          aria-pressed={critical}
          className={cn(
            'min-h-[44px] min-w-[44px] px-3 rounded-xl',
            'flex items-center justify-center gap-1.5',
            'border transition-all duration-200 ease-forge',
            'active:scale-[0.97] select-none text-xs font-semibold',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            critical
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-gold/[0.04] border-bronze/25 text-forge-2 hover:bg-gold/[0.08]',
          )}
        >
          <Zap size={14} aria-hidden />
          Crit
        </button>

        <input
          type="text"
          placeholder="Target (optional)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[44px] w-full rounded-xl px-4',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25 text-sm font-body',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
            'focus:outline-none',
          )}
        />
      </div>

      {/* Submit */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full"
      >
        <Crosshair size={16} aria-hidden />
        Log Damage
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live View (during active combat)
// ---------------------------------------------------------------------------

function LiveView({ log }: { log: CombatLog }) {
  const lastThree = log.entries.slice(-3).reverse()

  return (
    <div className="flex flex-col gap-3">
      {/* Running total */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
          This Combat
        </span>
        <span className="text-lg font-display font-bold text-forge-0">
          {log.totalDamage}{' '}
          <span className="text-xs font-body font-normal text-forge-2">
            total dmg
          </span>
        </span>
      </div>

      {/* Last 3 entries */}
      {lastThree.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {lastThree.map((entry, i) => {
            const typeColor =
              DAMAGE_TYPE_COLORS[entry.damageType as DamageTypeName] ??
              'text-forge-1'
            return (
              <div
                key={`${entry.timestamp}-${i}`}
                className={cn(
                  'flex items-center justify-between',
                  'px-3 py-2 rounded-lg bg-gold/[0.03]',
                  i === 0 && 'animate-fade-in',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-forge-0 truncate">
                    {entry.source}
                  </span>
                  {entry.critical && (
                    <Badge variant="ember" className="shrink-0">
                      CRIT
                    </Badge>
                  )}
                  {entry.target && (
                    <span className="text-[10px] text-forge-2 truncate">
                      vs {entry.target}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={cn('text-xs font-medium', typeColor)}>
                    {entry.damageType}
                  </span>
                  <span className="text-sm font-mono font-bold text-forge-0">
                    {entry.amount}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Post-Combat Summary
// ---------------------------------------------------------------------------

function PostCombatSummary({
  log,
  round,
}: {
  log: CombatLog
  round: number
}) {
  const breakdown = useMemo(() => getDamageBreakdown(log), [log])
  const topSources = useMemo(() => getTopSources(log), [log])
  const dpr = useMemo(() => getAverageDPR(log, round), [log, round])

  // Build conic-gradient for CSS pie chart
  const pieGradient = useMemo(() => {
    if (breakdown.length === 0) return 'conic-gradient(rgba(255,255,255,0.05) 0deg 360deg)'
    let accumulated = 0
    const stops: string[] = []
    for (const item of breakdown) {
      const color =
        DAMAGE_TYPE_CSS_COLORS[item.type as DamageTypeName] ?? '#9ca3af'
      const start = accumulated
      accumulated += (item.percentage / 100) * 360
      stops.push(`${color} ${start}deg ${accumulated}deg`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [breakdown])

  const topPerformer = topSources[0]

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-frame p-3">
          <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider mb-1">
            Total Damage
          </span>
          <span className="text-xl font-display font-bold text-forge-0">
            {log.totalDamage}
          </span>
        </div>
        <div className="stat-frame p-3">
          <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider mb-1">
            DPR
          </span>
          <span className="text-xl font-display font-bold text-arcane">
            {dpr}
          </span>
        </div>
      </div>

      {/* Top performer */}
      {topPerformer && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-ember/5 border border-ember/15">
          <TrendingUp size={16} className="text-ember shrink-0" aria-hidden />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider block">
              Top Performer
            </span>
            <span className="text-sm font-semibold text-forge-0">
              {topPerformer.source}
            </span>
            <span className="text-xs text-forge-2 ml-2">
              {topPerformer.total} dmg ({topPerformer.count} hits, avg{' '}
              {topPerformer.avgDamage})
            </span>
          </div>
        </div>
      )}

      {/* Pie chart + breakdown */}
      {breakdown.length > 0 && (
        <div className="combat-card flex items-center gap-4">
          {/* CSS pie chart */}
          <div
            className="w-20 h-20 rounded-full shrink-0"
            style={{ background: pieGradient }}
            role="img"
            aria-label={`Damage breakdown: ${breakdown.map((b) => `${b.type} ${b.percentage}%`).join(', ')}`}
          />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {breakdown.map((item) => {
              const typeColor =
                DAMAGE_TYPE_COLORS[item.type as DamageTypeName] ??
                'text-forge-1'
              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between"
                >
                  <span className={cn('text-xs font-medium', typeColor)}>
                    {item.type}
                  </span>
                  <span className="text-xs font-mono text-forge-2">
                    {item.total} ({item.percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Source bar chart */}
      {topSources.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">
            By Source
          </span>
          {topSources.map((src) => {
            const maxTotal = topSources[0].total
            const widthPct = maxTotal > 0 ? (src.total / maxTotal) * 100 : 0
            return (
              <div key={src.source} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-forge-0">
                    {src.source}
                  </span>
                  <span className="text-xs font-mono text-forge-2">
                    {src.total} ({src.count}x)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gold/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-arcane/50 transition-all duration-300 ease-forge"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Combat History
// ---------------------------------------------------------------------------

function CombatHistory({ characterId }: { characterId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const logs = useMemo(() => {
    const all = loadDamageLogs(characterId)
    return all.slice(-5).reverse() // Last 5, newest first
  }, [characterId])

  if (logs.length === 0) {
    return (
      <p className="text-xs text-forge-2 text-center py-3">
        No combat history yet. Log some damage to see your stats here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id
        const dateStr = new Date(log.startedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        const breakdown = getDamageBreakdown(log)

        return (
          <div
            key={log.id}
            className="rounded-xl bg-gold/[0.03] border border-bronze/15 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className={cn(
                'w-full min-h-[44px] flex items-center justify-between px-3 py-2.5',
                'transition-all duration-200 active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-forge-2">{dateStr}</span>
                <span className="text-sm font-semibold text-forge-0">
                  {log.totalDamage} dmg
                </span>
                <Badge variant="neutral">{log.entries.length} hits</Badge>
              </div>
              {isExpanded ? (
                <ChevronUp size={14} className="text-forge-2 shrink-0" aria-hidden />
              ) : (
                <ChevronDown size={14} className="text-forge-2 shrink-0" aria-hidden />
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 flex flex-col gap-1.5 animate-fade-in">
                {breakdown.map((item) => {
                  const typeColor =
                    DAMAGE_TYPE_COLORS[item.type as DamageTypeName] ??
                    'text-forge-1'
                  const barBg =
                    DAMAGE_TYPE_BAR_BG[item.type as DamageTypeName] ??
                    'bg-void-2/60'
                  return (
                    <div key={item.type} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-medium', typeColor)}>
                          {item.type}
                        </span>
                        <span className="text-xs font-mono text-forge-2">
                          {item.total} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gold/[0.06] overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', barBg)}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// "What Works" Insight
// ---------------------------------------------------------------------------

function WhatWorksInsight({ characterId }: { characterId: string }) {
  const insight = useMemo(() => {
    const allLogs = loadDamageLogs(characterId)
    if (allLogs.length === 0) return null

    // Aggregate across ALL combat history
    const bySource = new Map<string, { total: number; count: number }>()
    for (const log of allLogs) {
      for (const entry of log.entries) {
        const prev = bySource.get(entry.source) ?? { total: 0, count: 0 }
        bySource.set(entry.source, {
          total: prev.total + entry.amount,
          count: prev.count + 1,
        })
      }
    }

    if (bySource.size === 0) return null

    // Find best performer by total damage
    let best: { source: string; total: number; count: number; avg: number } | null = null
    for (const [source, stats] of bySource.entries()) {
      const avg = Math.round((stats.total / stats.count) * 10) / 10
      if (!best || stats.total > best.total) {
        best = { source, total: stats.total, count: stats.count, avg }
      }
    }

    return best
  }, [characterId])

  if (!insight) return null

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-verdant/5 border border-verdant/15">
      <TrendingUp size={16} className="text-verdant shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-verdant uppercase tracking-wider block">
          What Works
        </span>
        <span className="text-sm font-semibold text-forge-0">
          {insight.source}
        </span>
        <span className="text-xs text-forge-2 block mt-0.5">
          {insight.avg} avg damage per use across {insight.count} hits ({insight.total} total)
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DamageTracker({
  characterId,
  currentLog,
  round,
  onLogDamage,
}: DamageTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const hasEntries = currentLog !== null && currentLog.entries.length > 0
  const isEnded = currentLog?.endedAt != null

  return (
    <GlassCard className="p-4 ornate-border">
      {/* Header — collapsible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[44px] flex items-center justify-between',
          'transition-all duration-200 active:scale-[0.97]',
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <Swords
            size={16}
            className={cn(hasEntries ? 'text-ember' : 'text-forge-2')}
            aria-hidden
          />
          <OrnateHeader className="flex-1">Damage Tracker</OrnateHeader>
          {hasEntries && !isEnded && (
            <Badge variant="ember">{currentLog!.totalDamage} dmg</Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-forge-2" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-4 animate-fade-in">
          {/* Quick Add Form — always visible when combat is active */}
          {!isEnded && (
            <QuickAddForm onSubmit={onLogDamage} />
          )}

          {/* Live View — shows during active combat with entries */}
          {hasEntries && !isEnded && <LiveView log={currentLog!} />}

          {/* Post-Combat Summary — shows when combat is ended */}
          {hasEntries && isEnded && (
            <PostCombatSummary log={currentLog!} round={round} />
          )}

          {/* "What Works" insight — drawn from all history */}
          <WhatWorksInsight characterId={characterId} />

          {/* History section */}
          <div>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(
                'w-full min-h-[44px] flex items-center justify-between px-1 py-2',
                'text-xs font-semibold text-forge-1 uppercase tracking-wide',
                'transition-all duration-200 active:scale-[0.97]',
              )}
            >
              <span className="flex items-center gap-2">
                <History size={14} className="text-forge-2" aria-hidden />
                Combat History
              </span>
              {historyOpen ? (
                <ChevronUp size={14} className="text-forge-2" aria-hidden />
              ) : (
                <ChevronDown size={14} className="text-forge-2" aria-hidden />
              )}
            </button>

            {historyOpen && <CombatHistory characterId={characterId} />}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
