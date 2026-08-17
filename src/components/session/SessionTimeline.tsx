import { useMemo } from 'react'
import { MessageSquare, Zap, Compass, Sparkles, StopCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { RPMoment } from '../../lib/session-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionTimelineProps {
  moments: RPMoment[]
  onEndSession: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<RPMoment['type'], {
  icon: typeof MessageSquare
  color: string
  bg: string
  border: string
}> = {
  speak: {
    icon: MessageSquare,
    color: 'text-arcane',
    bg: 'bg-arcane/10',
    border: 'border-arcane/20',
  },
  react: {
    icon: Zap,
    color: 'text-ember',
    bg: 'bg-ember/10',
    border: 'border-ember/20',
  },
  engage: {
    icon: Compass,
    color: 'text-verdant',
    bg: 'bg-verdant/10',
    border: 'border-verdant/20',
  },
  spark: {
    icon: Sparkles,
    color: 'text-eldritch',
    bg: 'bg-eldritch/10',
    border: 'border-eldritch/20',
  },
}

const PATTERN_COLORS: Record<string, string> = {
  speak: 'bg-arcane',
  react: 'bg-ember',
  engage: 'bg-verdant',
  spark: 'bg-eldritch',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return 'now'
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionTimeline({ moments, onEndSession }: SessionTimelineProps) {
  // ── Pattern breakdown ─────────────────────────────────────────────────
  const patternData = useMemo(() => {
    if (moments.length === 0) return null
    const counts: Record<string, number> = { speak: 0, react: 0, engage: 0, spark: 0 }
    for (const m of moments) {
      counts[m.type] = (counts[m.type] ?? 0) + 1
    }
    const total = moments.length
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        pct: Math.round((count / total) * 100),
      }))
  }, [moments])

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-forge-0">
            Session Timeline
          </p>
          <span className="text-xs text-forge-2">
            {moments.length} moment{moments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Pattern breakdown bar */}
        {patternData && patternData.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
              {patternData.map(({ type, pct }) => (
                <div
                  key={type}
                  className={cn('h-full transition-all duration-300', PATTERN_COLORS[type])}
                  style={{ width: `${pct}%` }}
                  title={`${type}: ${pct}%`}
                />
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              {patternData.map(({ type, pct }) => (
                <span key={type} className="flex items-center gap-1 text-xs text-forge-2">
                  <span className={cn('w-2 h-2 rounded-full', PATTERN_COLORS[type])} />
                  {type} {pct}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline strip */}
        {moments.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
            {moments.map((moment) => {
              const config = TYPE_CONFIG[moment.type]
              const Icon = config.icon
              return (
                <div
                  key={moment.id}
                  className={cn(
                    'flex items-center gap-2 shrink-0',
                    'px-2.5 py-1.5 rounded-lg',
                    'border',
                    config.bg,
                    config.border,
                  )}
                >
                  <Icon size={12} className={config.color} aria-hidden />
                  <span className="text-xs text-forge-0 whitespace-nowrap">
                    {truncateText(moment.text, 30)}
                  </span>
                  <span className="text-xs text-forge-3 whitespace-nowrap">
                    {relativeTime(moment.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-forge-2 italic text-center py-3">
            Your RP timeline builds as you play
          </p>
        )}

        {/* End Session button */}
        <button
          type="button"
          onClick={onEndSession}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2',
            'min-h-[44px] px-3 py-2 rounded-xl',
            'bg-white/[0.04] border border-white/10',
            'text-sm font-medium text-forge-2',
            'transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'hover:bg-white/[0.06] hover:text-forge-1',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-2',
          )}
        >
          <StopCircle size={16} aria-hidden />
          End Session
        </button>
      </div>
    </div>
  )
}
