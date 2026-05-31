import { useState, useMemo } from 'react'
import { Search, Mic, Star, Globe, Wand2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ACCENT_PROFILES, type AccentProfile } from '../../lib/accent-data'
import { GlassCard } from '../ui/GlassCard'
import { Badge } from '../ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccentLibraryProps {
  onSelectAccent: (id: string) => void
}

type FilterChip = 'all' | 'fantasy' | 'real-world' | 'beginner' | 'advanced'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Difficulty badge variant based on level. */
function difficultyVariant(d: number): 'verdant' | 'arcane' | 'ember' {
  if (d <= 2) return 'verdant'
  if (d === 3) return 'arcane'
  return 'ember'
}

/** Difficulty label. */
function difficultyLabel(d: number): string {
  switch (d) {
    case 1: return 'Beginner'
    case 2: return 'Easy'
    case 3: return 'Moderate'
    case 4: return 'Advanced'
    case 5: return 'Expert'
    default: return 'Moderate'
  }
}

/** Category badge variant. */
function categoryVariant(c: 'fantasy' | 'real-world'): 'eldritch' | 'arcane' {
  return c === 'fantasy' ? 'eldritch' : 'arcane'
}

/** Category display label. */
function categoryLabel(c: 'fantasy' | 'real-world'): string {
  return c === 'fantasy' ? 'Fantasy' : 'Real-World'
}

/* ------------------------------------------------------------------ */
/*  Filter Chips Config                                                */
/* ------------------------------------------------------------------ */

const FILTER_CHIPS: { id: FilterChip; label: string; icon?: typeof Globe }[] = [
  { id: 'all', label: 'All' },
  { id: 'fantasy', label: 'Fantasy', icon: Wand2 },
  { id: 'real-world', label: 'Real-World', icon: Globe },
  { id: 'beginner', label: 'Beginner' },
  { id: 'advanced', label: 'Advanced' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * AccentLibrary — searchable, filterable accent browser.
 * Displays all available accents as cards with difficulty, category,
 * tags, and anchor vowel preview. Supports full-text search across
 * name, description, and tags, plus category/difficulty filtering.
 */
export function AccentLibrary({ onSelectAccent }: AccentLibraryProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all')

  /* ------ Filter + Search ------ */
  const filteredCards = useMemo(() => {
    let cards: AccentProfile[] = ACCENT_PROFILES

    // Apply category/difficulty filter
    switch (activeFilter) {
      case 'fantasy':
        cards = cards.filter((c) => c.category === 'fantasy')
        break
      case 'real-world':
        cards = cards.filter((c) => c.category === 'real-world')
        break
      case 'beginner':
        cards = cards.filter((c) => c.difficulty <= 2)
        break
      case 'advanced':
        cards = cards.filter((c) => c.difficulty >= 4)
        break
      default:
        break
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      cards = cards.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.anchorVowel.toLowerCase().includes(q)
      )
    }

    return cards
  }, [activeFilter, search])

  /* ------ Render ------ */

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-arcane/10 flex items-center justify-center shrink-0">
          <Mic size={20} className="text-arcane" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-forge-0">
            Accent Library
          </h3>
          <p className="text-xs text-forge-2">
            Browse and select an accent to practice
          </p>
        </div>
      </div>

      {/* ─── Search Input ─── */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-forge-2 pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accents..."
          aria-label="Search accents"
          className={cn(
            'min-h-[44px] w-full rounded-xl pl-11 pr-4',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-white/10',
            'font-body text-sm',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
            'focus:outline-none',
          )}
        />
      </div>

      {/* ─── Filter Chips ─── */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1"
        role="group"
        aria-label="Filter accents"
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.id
          const Icon = chip.icon

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                'inline-flex items-center gap-1.5 shrink-0',
                'min-h-[44px] px-3.5 rounded-xl border',
                'text-xs font-medium whitespace-nowrap',
                'transition-all duration-200 ease-forge select-none',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                isActive
                  ? 'bg-arcane/15 border-arcane/30 text-arcane'
                  : 'bg-white/[0.03] border-white/8 text-forge-2 hover:bg-white/[0.06] hover:text-forge-1',
              )}
              aria-pressed={isActive}
            >
              {Icon && <Icon size={13} aria-hidden />}
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ─── Accent Grid ─── */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredCards.map((accent) => (
            <GlassCard key={accent.id} hover>
              <button
                type="button"
                onClick={() => onSelectAccent(accent.id)}
                className={cn(
                  'w-full text-left flex flex-col gap-2.5 min-h-[44px]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'active:scale-[0.98] transition-transform duration-150 ease-forge',
                )}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 w-full">
                  <h4 className="font-display text-sm font-semibold text-forge-0 leading-tight">
                    {accent.name}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={categoryVariant(accent.category)}>
                      {categoryLabel(accent.category)}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-forge-2 leading-relaxed line-clamp-2">
                  {accent.description}
                </p>

                {/* Difficulty + Stars */}
                <div className="flex items-center gap-2">
                  <Badge variant={difficultyVariant(accent.difficulty)}>
                    {difficultyLabel(accent.difficulty)}
                  </Badge>
                  <div className="flex items-center gap-0.5" aria-label={`Difficulty ${accent.difficulty} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={11}
                        className={cn(
                          'transition-colors duration-150',
                          n <= accent.difficulty
                            ? difficultyVariant(accent.difficulty) === 'verdant'
                              ? 'text-verdant'
                              : difficultyVariant(accent.difficulty) === 'arcane'
                                ? 'text-arcane'
                                : 'text-ember'
                            : 'text-forge-2/30',
                        )}
                        fill={n <= accent.difficulty ? 'currentColor' : 'none'}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {accent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {accent.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'inline-flex items-center px-2 py-0.5',
                          'rounded-md bg-white/[0.04] border border-white/[0.06]',
                          'text-[10px] text-forge-2 font-medium',
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Anchor Vowel */}
                <div className="flex items-center gap-2 mt-auto pt-1.5 border-t border-white/5">
                  <span className="text-[10px] text-forge-2 uppercase tracking-wider font-medium">
                    Anchor
                  </span>
                  <code
                    className={cn(
                      'inline-flex items-center px-2 py-0.5',
                      'rounded-md bg-arcane/8 border border-arcane/15',
                      'font-mono text-[11px] text-arcane/80',
                    )}
                  >
                    {accent.anchorVowel}
                  </code>
                </div>
              </button>
            </GlassCard>
          ))}
        </div>
      ) : (
        /* ─── Empty State ─── */
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Search size={20} className="text-forge-2" aria-hidden />
            </div>
            <p className="text-sm text-forge-2 text-center">
              No accents match your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setActiveFilter('all')
              }}
              className={cn(
                'inline-flex items-center gap-2 min-h-[44px] px-4',
                'text-sm font-medium text-arcane rounded-xl',
                'transition-all duration-200 ease-forge',
                'hover:bg-arcane/10',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              Clear filters
            </button>
          </div>
        </GlassCard>
      )}

      {/* ─── Result Count ─── */}
      {(search.trim() || activeFilter !== 'all') && filteredCards.length > 0 && (
        <p className="text-xs text-forge-2 text-center">
          Showing {filteredCards.length} of {ACCENT_PROFILES.length} accents
        </p>
      )}
    </div>
  )
}
