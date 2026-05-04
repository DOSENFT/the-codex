import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Sparkles,
  Swords,
  X,
  Loader2,
  AlertTriangle,
  BookOpen,
  Filter,
  Lightbulb,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { type Character, type Spell, getPreparedSpells, toggleSpellPrepared } from '../lib/character'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import { useAI } from '../hooks/useAI'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SchoolName =
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation'

type BadgeVariant = 'arcane' | 'eldritch' | 'ember' | 'verdant' | 'neutral'

interface SpellbookProps {
  character: Character
  onCharacterUpdate: (updated: Character) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a spell school to a Badge variant color. */
function schoolVariant(school: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Abjuration: 'arcane',
    Conjuration: 'verdant',
    Divination: 'eldritch',
    Enchantment: 'eldritch',
    Evocation: 'ember',
    Illusion: 'eldritch',
    Necromancy: 'eldritch',
    Transmutation: 'verdant',
  }
  return map[school] ?? 'neutral'
}

/** Map a casting time to an action-type badge variant + label. */
function actionBadge(castingTime: string): { variant: BadgeVariant; label: string } {
  if (castingTime === '1 Action') return { variant: 'neutral', label: 'Action' }
  if (castingTime.includes('Bonus Action')) return { variant: 'ember', label: 'Bonus' }
  if (castingTime.includes('Reaction')) return { variant: 'eldritch', label: 'Reaction' }
  return { variant: 'neutral', label: castingTime }
}

/** Human-readable label for a spell level. */
function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${suffixes[level] ?? 'th'}`
}

/** Tab label for the filter row. */
function filterTabLabel(level: number): string {
  if (level === 0) return 'Cantrips'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${suffixes[level] ?? 'th'}`
}

// ---------------------------------------------------------------------------
// Advanced Filter Types & Constants
// ---------------------------------------------------------------------------

type CastingTimeFilter = 'Action' | 'Bonus Action' | 'Reaction' | 'Other'
type DamageTypeFilter =
  | 'Fire' | 'Cold' | 'Lightning' | 'Thunder' | 'Radiant'
  | 'Necrotic' | 'Force' | 'Poison' | 'Acid' | 'Psychic'
type RangeFilter = 'Self' | 'Touch' | '30ft+' | '60ft+' | '120ft+'

const CASTING_TIME_OPTIONS: CastingTimeFilter[] = ['Action', 'Bonus Action', 'Reaction', 'Other']
const DAMAGE_TYPE_OPTIONS: DamageTypeFilter[] = [
  'Fire', 'Cold', 'Lightning', 'Thunder', 'Radiant',
  'Necrotic', 'Force', 'Poison', 'Acid', 'Psychic',
]
const RANGE_OPTIONS: RangeFilter[] = ['Self', 'Touch', '30ft+', '60ft+', '120ft+']

interface AdvancedFilters {
  concentration: boolean | null // null = don't filter
  ritual: boolean | null
  castingTimes: CastingTimeFilter[]
  damageTypes: DamageTypeFilter[]
  ranges: RangeFilter[]
}

const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  concentration: null,
  ritual: null,
  castingTimes: [],
  damageTypes: [],
  ranges: [],
}

/** Count how many advanced filter criteria are active. */
function countActiveAdvancedFilters(filters: AdvancedFilters): number {
  let count = 0
  if (filters.concentration !== null) count++
  if (filters.ritual !== null) count++
  count += filters.castingTimes.length
  count += filters.damageTypes.length
  count += filters.ranges.length
  return count
}

/** Check if a spell's casting time matches a filter option. */
function matchesCastingTime(spellCastingTime: string, filter: CastingTimeFilter): boolean {
  switch (filter) {
    case 'Action': return spellCastingTime === '1 Action'
    case 'Bonus Action': return spellCastingTime.includes('Bonus Action')
    case 'Reaction': return spellCastingTime.includes('Reaction')
    case 'Other': return !spellCastingTime.includes('Action') && !spellCastingTime.includes('Reaction')
  }
}

/** Extract numeric feet from a range string. */
function extractFeet(range: string): number {
  const match = range.match(/(\d+)\s*(?:feet|ft|foot)/i)
  return match ? Number(match[1]) : 0
}

/** Check if a spell's range matches a filter option. */
function matchesRange(spellRange: string, filter: RangeFilter): boolean {
  const lower = spellRange.toLowerCase()
  switch (filter) {
    case 'Self': return lower.startsWith('self')
    case 'Touch': return lower === 'touch'
    case '30ft+': return extractFeet(spellRange) >= 30
    case '60ft+': return extractFeet(spellRange) >= 60
    case '120ft+': return extractFeet(spellRange) >= 120
  }
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single component tag (V, S, M) rendered as tiny pills. */
function ComponentPills({ components }: { components: string }) {
  const parts = components.split(',').map(c => c.trim())
  // Pull out V, S separately; anything remaining is the material description
  const letters: string[] = []
  const materialParts: string[] = []

  for (const p of parts) {
    if (p === 'V' || p === 'S') {
      letters.push(p)
    } else if (p.startsWith('M')) {
      letters.push('M')
      // Extract the parenthetical material description if present
      const matMatch = components.match(/M\s*\(([^)]+)\)/)
      if (matMatch) {
        materialParts.push(matMatch[1])
      }
    }
  }

  return (
    <div className="flex items-center gap-1" title={components}>
      {letters.map(l => (
        <span
          key={l}
          className={cn(
            'inline-flex items-center justify-center',
            'h-5 w-5 rounded text-[10px] font-mono font-bold',
            'bg-white/8 text-forge-1 border border-white/10',
          )}
        >
          {l}
        </span>
      ))}
      {materialParts.length > 0 && (
        <span className="text-[11px] text-forge-2 truncate max-w-[120px]" title={materialParts[0]}>
          ({materialParts[0]})
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SpellCard
// ---------------------------------------------------------------------------

interface SpellCardProps {
  spell: Spell
  canPrepare: boolean
  onTogglePrepare: () => void
  onExplain: () => void
  onTactics: () => void
  aiLoading: boolean
}

function SpellCard({
  spell,
  canPrepare,
  onTogglePrepare,
  onExplain,
  onTactics,
  aiLoading,
}: SpellCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isCantrip = spell.level === 0
  const action = actionBadge(spell.castingTime)

  // Determine if this card should appear dimmed (unprepared non-cantrip when class can prepare)
  const isUnprepared = canPrepare && !isCantrip && !spell.prepared

  // Combat stats row should only render when there is combat-relevant data
  const hasCombatStats = spell.damageType || spell.saveType || spell.areaOfEffect

  return (
    <GlassCard
      className={cn(
        'p-0 overflow-hidden',
        // Concentration left border strip
        spell.concentration && 'border-l-2 border-l-ember',
        // Unprepared spells are visually dimmed
        isUnprepared && 'opacity-60',
      )}
    >
      {/* Header — always visible */}
      <div className="p-4 pb-3">
        {/* Row 1: Name + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="font-display text-base font-bold text-forge-0 leading-tight truncate">
              {spell.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={schoolVariant(spell.school)}>
                {isCantrip ? 'Cantrip' : levelLabel(spell.level)} &middot; {spell.school}
              </Badge>
              {/* Action type badge */}
              <Badge variant={action.variant}>
                {action.label}
              </Badge>
              {spell.concentration && (
                <Badge variant="ember" className="shadow-[0_0_8px_-2px_rgba(244,181,69,0.4)]">
                  Concentration
                </Badge>
              )}
              {spell.ritual && (
                <Badge variant="verdant">Ritual</Badge>
              )}
            </div>
          </div>

          {/* Prepared toggle */}
          {canPrepare && !isCantrip && (
            <button
              type="button"
              onClick={onTogglePrepare}
              aria-label={spell.prepared ? `Unprepare ${spell.name}` : `Prepare ${spell.name}`}
              className={cn(
                'shrink-0 min-h-[44px] min-w-[44px]',
                'flex items-center justify-center rounded-lg',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.92]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                spell.prepared
                  ? 'text-ember bg-ember/15'
                  : 'text-forge-2 bg-white/5 hover:bg-white/8 hover:text-forge-1',
              )}
            >
              <Star
                size={20}
                className={cn(spell.prepared && 'fill-ember')}
              />
            </button>
          )}
        </div>

        {/* Row 2: Compact stat row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-forge-1">
          <span className="whitespace-nowrap">{spell.castingTime}</span>
          <span className="text-white/20 select-none" aria-hidden>|</span>
          <span className="whitespace-nowrap">{spell.range}</span>
          <span className="text-white/20 select-none" aria-hidden>|</span>
          <span className="whitespace-nowrap">{spell.duration}</span>
        </div>

        {/* Row 2.5: Combat stats row — only if spell has combat-relevant data */}
        {hasCombatStats && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {spell.damageDice && spell.damageType && (
              <span className="whitespace-nowrap text-ember font-medium">
                <Swords size={12} className="inline -mt-0.5 mr-1" aria-hidden />
                {spell.damageDice} {spell.damageType}
              </span>
            )}
            {spell.damageDice && spell.damageType && (spell.saveType || spell.areaOfEffect) && (
              <span className="text-white/20 select-none" aria-hidden>|</span>
            )}
            {spell.saveType && (
              <span className="whitespace-nowrap text-arcane font-medium">
                {spell.saveType} Save
              </span>
            )}
            {spell.saveType && spell.areaOfEffect && (
              <span className="text-white/20 select-none" aria-hidden>|</span>
            )}
            {spell.areaOfEffect && (
              <span className="whitespace-nowrap text-forge-2">
                {spell.areaOfEffect}
              </span>
            )}
          </div>
        )}

        {/* Tactical note */}
        {spell.tacticalNote && (
          <p className="text-xs italic text-forge-2 mt-1.5 flex items-start gap-1">
            <Lightbulb size={12} className="shrink-0 mt-0.5 text-forge-2" aria-hidden />
            <span>{spell.tacticalNote}</span>
          </p>
        )}

        {/* Row 3: Components */}
        <div className="mt-2.5">
          <ComponentPills components={spell.components} />
        </div>
      </div>

      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${spell.name} details` : `Expand ${spell.name} details`}
        className={cn(
          'w-full min-h-[44px] flex items-center justify-center gap-1.5',
          'border-t border-white/5 text-xs font-medium text-forge-2',
          'transition-colors duration-200',
          'hover:bg-white/[0.03] hover:text-forge-1',
          'active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-arcane',
        )}
      >
        {expanded ? (
          <>
            <ChevronUp size={14} aria-hidden />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown size={14} aria-hidden />
            Show Details
          </>
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-white/5 p-4 pt-3 space-y-3">
          {/* Description */}
          <p className="text-sm text-forge-1 leading-relaxed whitespace-pre-line">
            {spell.description}
          </p>

          {/* Higher levels */}
          {spell.higherLevels && (
            <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
              <p className="text-xs font-semibold text-ember mb-1">At Higher Levels</p>
              <p className="text-xs text-forge-1 leading-relaxed">
                {spell.higherLevels}
              </p>
            </div>
          )}

          {/* Source */}
          {spell.source && (
            <p className="text-[11px] text-forge-2">
              Source: {spell.source}
            </p>
          )}

          {/* AI action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={onExplain}
              disabled={aiLoading}
              className="flex-1"
            >
              <Sparkles size={14} aria-hidden />
              Explain
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onTactics}
              disabled={aiLoading}
              className="flex-1"
            >
              <Swords size={14} aria-hidden />
              Tactics
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// AI Response Modal
// ---------------------------------------------------------------------------

interface AIModalProps {
  spellName: string
  mode: 'explain' | 'tactics'
  response: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

function AIResponseModal({ spellName, mode, response, loading, error, onClose }: AIModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`AI ${mode === 'explain' ? 'Explanation' : 'Tactics'} for ${spellName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void-0/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg max-h-[85vh]',
          'bg-void-1 border border-white/10 rounded-t-2xl sm:rounded-2xl',
          'shadow-[0_0_48px_-12px_rgba(61,210,255,0.15)]',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-4 duration-300',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {mode === 'explain' ? (
              <Sparkles size={16} className="text-arcane shrink-0" aria-hidden />
            ) : (
              <Swords size={16} className="text-eldritch shrink-0" aria-hidden />
            )}
            <h2 className="font-display text-sm font-bold text-forge-0 truncate">
              {mode === 'explain' ? 'Spell Explanation' : 'Tactical Advice'}: {spellName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI response"
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-colors duration-200',
              'active:scale-[0.92]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-forge-2">
              <Loader2 size={28} className="animate-spin text-arcane" />
              <p className="text-sm font-medium">Consulting the arcane texts...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-400">Failed to get AI response</p>
              <p className="text-xs text-forge-2 max-w-xs">{error}</p>
            </div>
          )}

          {response && !loading && (
            <div className="prose prose-sm prose-invert max-w-none text-forge-1 leading-relaxed whitespace-pre-line text-sm">
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <BookOpen size={32} className="text-forge-2" />
      </div>
      <p className="text-sm font-medium text-forge-1">
        {hasFilters ? 'No spells match your filters' : 'No spells in your spellbook'}
      </p>
      <p className="text-xs text-forge-2 max-w-xs">
        {hasFilters
          ? 'Try adjusting your search or level filters to find what you are looking for.'
          : 'Set up your character to populate your spellbook with available spells.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Spellbook Component
// ---------------------------------------------------------------------------

export function Spellbook({ character, onCharacterUpdate }: SpellbookProps) {
  // --- State ---------------------------------------------------------------
  const [searchRaw, setSearchRaw] = useState('')
  const searchQuery = useDebouncedValue(searchRaw, 250)
  const [activeLevel, setActiveLevel] = useState<number | null>(null) // null = "All"
  const [preparedOnly, setPreparedOnly] = useState(character.canPrepareSpells)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS)
  const [aiModal, setAiModal] = useState<{
    spell: Spell
    mode: 'explain' | 'tactics'
  } | null>(null)

  const { response, loading, error, query, clearResponse } = useAI()

  const tabScrollRef = useRef<HTMLDivElement>(null)

  // --- Derived data --------------------------------------------------------

  /** Unique sorted list of spell levels present in the character's spell list. */
  const availableLevels = useMemo(() => {
    const levels = new Set(character.spells.map(s => s.level))
    return Array.from(levels).sort((a, b) => a - b)
  }, [character.spells])

  /** The prepared spell count. */
  const preparedCount = useMemo(
    () => getPreparedSpells(character).filter(s => s.level > 0).length,
    [character],
  )

  /** Count of active advanced filters for the badge. */
  const advancedFilterCount = useMemo(() => countActiveAdvancedFilters(advancedFilters), [advancedFilters])

  /** Filtered spells based on search, level, prepared, and advanced filters. */
  const filteredSpells = useMemo(() => {
    let spells = character.spells

    // Level filter
    if (activeLevel !== null) {
      spells = spells.filter(s => s.level === activeLevel)
    }

    // Prepared filter
    if (preparedOnly) {
      spells = spells.filter(s => s.prepared || s.level === 0)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      spells = spells.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q),
      )
    }

    // Advanced filters: Concentration
    if (advancedFilters.concentration !== null) {
      spells = spells.filter(s => s.concentration === advancedFilters.concentration)
    }

    // Advanced filters: Ritual
    if (advancedFilters.ritual !== null) {
      spells = spells.filter(s => s.ritual === advancedFilters.ritual)
    }

    // Advanced filters: Casting time
    if (advancedFilters.castingTimes.length > 0) {
      spells = spells.filter(s =>
        advancedFilters.castingTimes.some(ct => matchesCastingTime(s.castingTime, ct)),
      )
    }

    // Advanced filters: Damage type
    if (advancedFilters.damageTypes.length > 0) {
      spells = spells.filter(s =>
        s.damageType && advancedFilters.damageTypes.some(dt =>
          s.damageType!.toLowerCase() === dt.toLowerCase(),
        ),
      )
    }

    // Advanced filters: Range
    if (advancedFilters.ranges.length > 0) {
      spells = spells.filter(s =>
        advancedFilters.ranges.some(r => matchesRange(s.range, r)),
      )
    }

    // Sort: cantrips first, then by level, then alphabetically within level
    return spells.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
  }, [character.spells, activeLevel, preparedOnly, searchQuery, advancedFilters])

  const hasActiveFilters = searchQuery.trim() !== '' || activeLevel !== null || preparedOnly || advancedFilterCount > 0

  // --- Handlers ------------------------------------------------------------

  const handleTogglePrepare = useCallback(
    (spellName: string) => {
      const updated = toggleSpellPrepared(character, spellName)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleAIQuery = useCallback(
    async (spell: Spell, mode: 'explain' | 'tactics') => {
      clearResponse()
      setAiModal({ spell, mode })

      const systemPrompt =
        mode === 'explain'
          ? SYSTEM_PROMPTS.spellExplainer(character)
          : SYSTEM_PROMPTS.spellTactician(character)

      const message =
        mode === 'explain'
          ? `Explain the spell "${spell.name}" to me.`
          : `When should I use "${spell.name}"? Give me tactical advice.`

      await query(systemPrompt, message).catch(() => {
        // Error is already captured by useAI — no additional handling needed
      })
    },
    [character, query, clearResponse],
  )

  const handleCloseModal = useCallback(() => {
    setAiModal(null)
    clearResponse()
  }, [clearResponse])

  // --- Render --------------------------------------------------------------

  return (
    <section className="flex flex-col gap-4 w-full" aria-label="Spellbook">
      {/* ---- Search bar -------------------------------------------------- */}
      <Input
        icon={Search}
        placeholder="Search spells..."
        value={searchRaw}
        onChange={e => setSearchRaw(e.target.value)}
        aria-label="Search spells by name or school"
      />

      {/* ---- Level filter tabs ------------------------------------------- */}
      <div
        ref={tabScrollRef}
        className={cn(
          'flex gap-2 overflow-x-auto pb-1',
          'scrollbar-none -mx-1 px-1',
          // Horizontal scroll with touch momentum
          'snap-x snap-mandatory',
        )}
        role="tablist"
        aria-label="Filter spells by level"
      >
        {/* "All" tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeLevel === null}
          onClick={() => setActiveLevel(null)}
          className={cn(
            'shrink-0 snap-start',
            'min-h-[44px] px-4 rounded-xl',
            'text-sm font-medium whitespace-nowrap',
            'transition-all duration-200 ease-forge',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            activeLevel === null
              ? 'bg-arcane/15 text-arcane border border-arcane/25'
              : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
          )}
        >
          All
        </button>

        {availableLevels.map(level => (
          <button
            key={level}
            type="button"
            role="tab"
            aria-selected={activeLevel === level}
            onClick={() => setActiveLevel(level)}
            className={cn(
              'shrink-0 snap-start',
              'min-h-[44px] px-4 rounded-xl',
              'text-sm font-medium whitespace-nowrap',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              activeLevel === level
                ? 'bg-arcane/15 text-arcane border border-arcane/25'
                : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
            )}
          >
            {filterTabLabel(level)}
          </button>
        ))}
      </div>

      {/* ---- Advanced Filters ---------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen(prev => !prev)}
          className={cn(
            'min-h-[44px] flex items-center gap-2.5 px-4 rounded-xl',
            'text-sm font-medium',
            'transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            advancedFilterCount > 0
              ? 'bg-eldritch/15 text-eldritch border border-eldritch/25'
              : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
          )}
          aria-expanded={advancedOpen}
          aria-label={`Advanced filters${advancedFilterCount > 0 ? ` (${advancedFilterCount} active)` : ''}`}
        >
          <SlidersHorizontal size={14} aria-hidden />
          Advanced Filters
          {advancedFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-eldritch/30 text-eldritch text-[10px] font-bold">
              {advancedFilterCount}
            </span>
          )}
          <span className="ml-auto">
            {advancedOpen ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </span>
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 animate-fade-in">
            {/* Concentration toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forge-2 select-none">Concentration</span>
              <div className="flex gap-1.5">
                {([
                  { value: null, label: 'Any' },
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ] as const).map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setAdvancedFilters(f => ({ ...f, concentration: opt.value }))}
                    aria-pressed={advancedFilters.concentration === opt.value}
                    className={cn(
                      'flex-1 min-h-[44px] px-3 rounded-xl',
                      'text-xs font-medium',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.95]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      advancedFilters.concentration === opt.value
                        ? 'bg-ember/15 text-ember border border-ember/25'
                        : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ritual toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forge-2 select-none">Ritual</span>
              <div className="flex gap-1.5">
                {([
                  { value: null, label: 'Any' },
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ] as const).map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setAdvancedFilters(f => ({ ...f, ritual: opt.value }))}
                    aria-pressed={advancedFilters.ritual === opt.value}
                    className={cn(
                      'flex-1 min-h-[44px] px-3 rounded-xl',
                      'text-xs font-medium',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.95]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      advancedFilters.ritual === opt.value
                        ? 'bg-verdant/15 text-verdant border border-verdant/25'
                        : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Casting Time filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forge-2 select-none">Casting Time</span>
              <div className="flex flex-wrap gap-1.5">
                {CASTING_TIME_OPTIONS.map(ct => {
                  const isActive = advancedFilters.castingTimes.includes(ct)
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setAdvancedFilters(f => ({
                        ...f,
                        castingTimes: isActive
                          ? f.castingTimes.filter(x => x !== ct)
                          : [...f.castingTimes, ct],
                      }))}
                      aria-pressed={isActive}
                      className={cn(
                        'min-h-[44px] px-3 rounded-xl',
                        'text-xs font-medium whitespace-nowrap',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        isActive
                          ? 'bg-arcane/15 text-arcane border border-arcane/25'
                          : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
                      )}
                    >
                      {ct}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Damage Type multi-select */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forge-2 select-none">Damage Type</span>
              <div className="flex flex-wrap gap-1.5">
                {DAMAGE_TYPE_OPTIONS.map(dt => {
                  const isActive = advancedFilters.damageTypes.includes(dt)
                  return (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setAdvancedFilters(f => ({
                        ...f,
                        damageTypes: isActive
                          ? f.damageTypes.filter(x => x !== dt)
                          : [...f.damageTypes, dt],
                      }))}
                      aria-pressed={isActive}
                      className={cn(
                        'min-h-[44px] px-3 rounded-xl',
                        'text-xs font-medium whitespace-nowrap',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        isActive
                          ? 'bg-ember/15 text-ember border border-ember/25'
                          : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
                      )}
                    >
                      {dt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Range filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forge-2 select-none">Range</span>
              <div className="flex flex-wrap gap-1.5">
                {RANGE_OPTIONS.map(r => {
                  const isActive = advancedFilters.ranges.includes(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAdvancedFilters(f => ({
                        ...f,
                        ranges: isActive
                          ? f.ranges.filter(x => x !== r)
                          : [...f.ranges, r],
                      }))}
                      aria-pressed={isActive}
                      className={cn(
                        'min-h-[44px] px-3 rounded-xl',
                        'text-xs font-medium whitespace-nowrap',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        isActive
                          ? 'bg-eldritch/15 text-eldritch border border-eldritch/25'
                          : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
                      )}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Clear all advanced filters */}
            {advancedFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setAdvancedFilters(DEFAULT_ADVANCED_FILTERS)}
                className={cn(
                  'min-h-[44px] px-4 rounded-xl',
                  'text-xs font-medium text-forge-2',
                  'bg-white/5 border border-white/5',
                  'hover:bg-white/8 hover:text-forge-1',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
              >
                Clear Advanced Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Prepared filter toggle -------------------------------------- */}
      {character.canPrepareSpells && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPreparedOnly(prev => !prev)}
            aria-pressed={preparedOnly}
            className={cn(
              'min-h-[44px] flex items-center gap-2.5 px-4 rounded-xl',
              'text-sm font-medium',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              preparedOnly
                ? 'bg-ember/15 text-ember border border-ember/25'
                : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
            )}
          >
            <Filter size={14} aria-hidden />
            Prepared Only
          </button>

          <span className="text-xs font-mono text-forge-2">
            <span className={cn(
              'font-bold',
              preparedCount >= character.maxPreparedSpells ? 'text-ember' : 'text-arcane',
            )}>
              {preparedCount}
            </span>
            /{character.maxPreparedSpells} prepared
          </span>
        </div>
      )}

      {/* ---- Spell list -------------------------------------------------- */}
      {filteredSpells.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} />
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label="Spell list">
          {filteredSpells.map(spell => (
            <div key={spell.name} role="listitem">
              <SpellCard
                spell={spell}
                canPrepare={character.canPrepareSpells}
                onTogglePrepare={() => handleTogglePrepare(spell.name)}
                onExplain={() => handleAIQuery(spell, 'explain')}
                onTactics={() => handleAIQuery(spell, 'tactics')}
                aiLoading={loading}
              />
            </div>
          ))}
        </div>
      )}

      {/* ---- AI Response Modal ------------------------------------------- */}
      {aiModal && (
        <AIResponseModal
          spellName={aiModal.spell.name}
          mode={aiModal.mode}
          response={response}
          loading={loading}
          error={error}
          onClose={handleCloseModal}
        />
      )}
    </section>
  )
}
