import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Search,
  Shuffle,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { ACCENT_PROFILES, type AccentProfile } from '../../lib/accent-data'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DMRapidModeProps {
  onSelectAccent: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter accents by search query against name, tags, region, and npcArchetypes */
function filterAccents(accents: AccentProfile[], query: string): AccentProfile[] {
  if (!query.trim()) return accents
  const q = query.toLowerCase().trim()
  return accents.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.region.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q)) ||
      a.npcArchetypes.some((n) => n.toLowerCase().includes(q)),
  )
}

// ---------------------------------------------------------------------------
// Toast component (inline, self-dismissing)
// ---------------------------------------------------------------------------

function CopyToast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl',
        'bg-void-2/95 border border-verdant/30 text-verdant text-sm font-medium',
        'shadow-[0_0_20px_-4px_rgba(57,217,138,0.25)]',
        'animate-fade-in',
      )}
      role="status"
      aria-live="polite"
    >
      <Check size={14} aria-hidden />
      Copied to clipboard
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact Card
// ---------------------------------------------------------------------------

function RapidCard({
  accent,
  onSelectAccent,
  onCopy,
  isHighlighted,
  cardRef,
}: {
  accent: AccentProfile
  onSelectAccent: (id: string) => void
  onCopy: (text: string) => void
  isHighlighted: boolean
  cardRef?: (el: HTMLDivElement | null) => void
}) {
  const topRules = accent.rules.slice(0, 3)
  const topPhrases = accent.phrases.slice(0, 2)

  return (
    <GlassCard
      className={cn(
        '!py-3 !px-4 transition-all duration-300',
        isHighlighted &&
          'ring-1 ring-arcane/40 shadow-[0_0_20px_-4px_rgba(61,210,255,0.2)]',
      )}
    >
      <div ref={cardRef} className="flex flex-col gap-2.5">
        {/* Name row + anchor vowel */}
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-display text-sm font-semibold text-forge-0 truncate">
            {accent.name}
          </h4>
          <span className="inline-flex bg-arcane/10 text-arcane text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 select-none">
            {accent.anchorVowel.split('\u2014')[0].trim()}
          </span>
        </div>

        {/* 3 key rules */}
        <ol className="flex flex-col gap-1">
          {topRules.map((r, i) => (
            <li key={i} className="text-xs text-forge-1 leading-snug">
              <span className="text-forge-2 font-mono mr-1.5">{i + 1}.</span>
              {r.rule}
            </li>
          ))}
        </ol>

        {/* Cadence cheat */}
        <p className="text-xs text-forge-1 italic leading-snug">
          {accent.cadenceCheat}
        </p>

        {/* 2 instant phrases */}
        <div className="flex flex-col gap-1.5 bg-white/[0.02] rounded-lg p-2.5 border border-white/5">
          {topPhrases.map((phrase, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="text-xs text-forge-1 italic flex-1 leading-snug">
                &ldquo;{phrase}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => onCopy(phrase)}
                className={cn(
                  'inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 -my-2 rounded-lg shrink-0',
                  'text-forge-2 hover:text-forge-1',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.06]',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
                aria-label={`Copy phrase: ${phrase.slice(0, 40)}`}
              >
                <Copy size={13} aria-hidden />
              </button>
            </div>
          ))}
        </div>

        {/* Full Details button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectAccent(accent.id)}
          className="self-start !px-3"
        >
          Full Details
          <ChevronRight size={14} aria-hidden />
        </Button>
      </div>
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DMRapidMode -- DM's 60-second quick-reference. Compact cards for
 * mid-session use. Search, randomize, and instantly grab key rules + phrases
 * for any accent. Built for SPEED: a DM glances at this and instantly knows
 * how to voice an NPC.
 */
export function DMRapidMode({ onSelectAccent }: DMRapidModeProps) {
  const [search, setSearch] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardElements = useRef<Record<string, HTMLDivElement | null>>({})

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  const filtered = filterAccents(ACCENT_PROFILES, search)

  // Copy to clipboard with toast feedback
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToastVisible(true)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 1500)
    }).catch((err) => {
      console.error('[DMRapidMode] Failed to copy:', err)
    })
  }, [])

  // Randomize: pick a random accent, highlight it, scroll to it
  const handleRandomize = useCallback(() => {
    const pool = filtered.length > 0 ? filtered : ACCENT_PROFILES
    const randomAccent = pool[Math.floor(Math.random() * pool.length)]

    setHighlightedId(randomAccent.id)

    // Scroll the card into view
    const el = cardElements.current[randomAccent.id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Clear highlight after 2s
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
  }, [filtered])

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* ── Search + Randomize row ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forge-2"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accents..."
            className={cn(
              'min-h-[44px] w-full rounded-xl',
              'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
              'border border-white/10',
              'font-body text-sm',
              'pl-10 pr-4',
              'transition-all duration-200 ease-forge',
              'focus:border-arcane/60 focus:bg-void-2/80',
              'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
              'focus:outline-none',
            )}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleRandomize}>
          <Shuffle size={16} aria-hidden />
          Randomize
        </Button>
      </div>

      {/* ── Card list ── */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((accent) => (
            <RapidCard
              key={accent.id}
              accent={accent}
              onSelectAccent={onSelectAccent}
              onCopy={handleCopy}
              isHighlighted={highlightedId === accent.id}
              cardRef={(el) => { cardElements.current[accent.id] = el }}
            />
          ))}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Search size={32} className="text-forge-2/50" aria-hidden />
          <p className="text-sm text-forge-2">
            No accents match &ldquo;{search}&rdquo;
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            Clear search
          </Button>
        </div>
      )}

      {/* ── Toast ── */}
      <CopyToast visible={toastVisible} />
    </div>
  )
}
