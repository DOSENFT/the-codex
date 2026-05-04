import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Search, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type MechanicsCategory,
  type MechanicsEntry,
  MECHANICS_CATEGORIES,
  searchMechanics,
} from '../lib/mechanics-reference'
import { GlassCard } from './ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MechanicsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DragHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1" aria-hidden>
      <div className="w-10 h-1 rounded-full bg-forge-2/40" />
    </div>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 min-h-[44px] px-3.5 rounded-xl',
        'text-xs font-medium whitespace-nowrap',
        'transition-all duration-200 ease-forge',
        'active:scale-[0.95]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        active
          ? 'bg-arcane/15 text-arcane border border-arcane/25'
          : 'bg-white/5 text-forge-2 border border-white/5 hover:bg-white/8 hover:text-forge-1',
      )}
    >
      {label}
    </button>
  )
}

function MechanicsEntryCard({ entry }: { entry: MechanicsEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse: ${entry.question}` : `Expand: ${entry.question}`}
        className={cn(
          'w-full text-left p-4 min-h-[44px]',
          'transition-colors duration-200',
          'hover:bg-white/[0.02]',
          'active:scale-[0.99]',
          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-arcane',
        )}
      >
        <h3 className="font-display text-sm font-bold text-forge-0 leading-tight">
          {entry.question}
        </h3>
        <p className="mt-1.5 text-xs text-forge-1 leading-relaxed">
          {entry.shortAnswer}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5',
              'text-[10px] font-medium border',
              entry.category === 'attack' && 'bg-ember/10 text-ember border-ember/20',
              entry.category === 'saving_throw' && 'bg-arcane/10 text-arcane border-arcane/20',
              entry.category === 'ability_check' && 'bg-eldritch/10 text-eldritch border-eldritch/20',
              entry.category === 'damage' && 'bg-red-400/10 text-red-400 border-red-400/20',
              entry.category === 'conditions' && 'bg-amber-400/10 text-amber-400 border-amber-400/20',
              entry.category === 'action_economy' && 'bg-verdant/10 text-verdant border-verdant/20',
              entry.category === 'spellcasting' && 'bg-eldritch/10 text-eldritch border-eldritch/20',
            )}
          >
            {MECHANICS_CATEGORIES.find(c => c.id === entry.category)?.label ?? entry.category}
          </span>
          <span className="ml-auto text-forge-2">
            {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </span>
        </div>
      </button>

      {/* Expanded explanation */}
      {expanded && (
        <div className="border-t border-white/5 p-4 pt-3 animate-fade-in">
          <p className="text-sm text-forge-1 leading-relaxed whitespace-pre-line">
            {entry.fullExplanation}
          </p>
        </div>
      )}
    </GlassCard>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <BookOpen size={32} className="text-forge-2" />
      </div>
      <p className="text-sm font-medium text-forge-1">
        {hasSearch ? 'No mechanics match your search' : 'Browse D&D mechanics'}
      </p>
      <p className="text-xs text-forge-2 max-w-xs">
        {hasSearch
          ? 'Try different keywords or clear the category filter.'
          : 'Search for rules or browse by category to learn game mechanics.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * MechanicsDrawer — slide-up panel for browsing and searching D&D 2024 game
 * mechanics. Follows the same pattern as DiceRoller: backdrop + fixed bottom
 * panel with glass-card styling.
 */
export function MechanicsDrawer({ isOpen, onClose }: MechanicsDrawerProps) {
  const [searchRaw, setSearchRaw] = useState('')
  const [activeCategory, setActiveCategory] = useState<MechanicsCategory | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // ── Filtered entries ──
  const filteredEntries = useMemo(() => {
    return searchMechanics(searchRaw, activeCategory ?? undefined)
  }, [searchRaw, activeCategory])

  // ── Focus management ──
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // ── Focus trap ──
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
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ── Handlers ──
  const handleCategoryToggle = useCallback((cat: MechanicsCategory) => {
    setActiveCategory(prev => (prev === cat ? null : cat))
  }, [])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-forge',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mechanics Reference"
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[90dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0',
          'outline-none',
          'transition-transform duration-300 ease-forge',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          !isOpen && 'pointer-events-none',
        )}
      >
        <DragHandle />

        {/* Close button */}
        <div className="flex justify-end px-4 pb-1">
          <button
            type="button"
            aria-label="Close mechanics reference"
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

        <div className="px-4 pb-6 safe-bottom flex flex-col gap-4">
          {/* ── Title ── */}
          <h2 className="font-display text-lg font-bold text-forge-0 tracking-tight">
            Mechanics Reference
          </h2>

          {/* ── Search input ── */}
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forge-2"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search mechanics..."
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              aria-label="Search mechanics"
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

          {/* ── Category filter chips ── */}
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 snap-x snap-mandatory"
            role="group"
            aria-label="Filter by category"
          >
            <CategoryChip
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {MECHANICS_CATEGORIES.map(cat => (
              <CategoryChip
                key={cat.id}
                label={cat.label}
                active={activeCategory === cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
              />
            ))}
          </div>

          {/* ── Results list ── */}
          {filteredEntries.length === 0 ? (
            <EmptyState hasSearch={searchRaw.trim() !== '' || activeCategory !== null} />
          ) : (
            <div className="flex flex-col gap-3" role="list" aria-label="Mechanics entries">
              {filteredEntries.map(entry => (
                <div key={entry.id} role="listitem">
                  <MechanicsEntryCard entry={entry} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
