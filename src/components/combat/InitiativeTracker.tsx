import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Plus, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { InitiativeEntry } from '../../lib/combat-state'
import { Badge } from '../ui/Badge'

interface InitiativeTrackerProps {
  entries: InitiativeEntry[]
  currentIndex: number
  round: number
  onAddEntry: (entry: { name: string; initiative: number; hp?: string; ac?: number; isPC: boolean }) => void
  onRemoveEntry: (id: string) => void
  onAdvanceTurn: () => void
  onReorderEntries: (entries: InitiativeEntry[]) => void
  playerCharName: string
}

/**
 * Turn-order tracker for combat encounters.
 * Displays a numbered list of combatants sorted by initiative (highest first),
 * highlights the active turn with a gold pulse, and provides add/remove controls.
 */
export function InitiativeTracker({
  entries,
  currentIndex,
  round,
  onAddEntry,
  onRemoveEntry,
  onAdvanceTurn,
  onReorderEntries,
  playerCharName,
}: InitiativeTrackerProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hp, setHp] = useState('')
  const [isPC, setIsPC] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Sort entries by initiative descending
  const sorted = [...entries].sort((a, b) => b.initiative - a.initiative)

  // Focus name input when form opens
  useEffect(() => {
    if (formOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [formOpen])

  // Sync sorted order back to parent when entries change
  useEffect(() => {
    const currentIds = entries.map(e => e.id).join(',')
    const sortedIds = sorted.map(e => e.id).join(',')
    if (currentIds !== sortedIds && entries.length > 0) {
      onReorderEntries(sorted)
    }
    // Only re-sort when entry count or initiative values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, entries.map(e => `${e.id}:${e.initiative}`).join(',')])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const parsedInit = parseInt(initiative, 10)
      if (!name.trim() || isNaN(parsedInit)) return

      onAddEntry({
        name: name.trim(),
        initiative: parsedInit,
        hp: hp.trim() || undefined,
        isPC,
      })

      setName('')
      setInitiative('')
      setHp('')
      setIsPC(false)
      nameInputRef.current?.focus()
    },
    [name, initiative, hp, isPC, onAddEntry],
  )

  return (
    <div className="bg-ash-warm/80 border border-gold/15 rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="combat-section-header mb-0">Initiative</h3>
        <Badge variant="arcane">Round {round}</Badge>
      </div>

      {/* Combatant List */}
      <div className="max-h-[240px] overflow-y-auto -mx-1 px-1 space-y-0.5">
        {sorted.length === 0 && (
          <p className="text-xs text-ink-muted text-center py-3 select-none">
            No combatants yet. Add one below.
          </p>
        )}

        {sorted.map((entry, idx) => {
          const isActive = idx === currentIndex
          const isPlayer = entry.name === playerCharName || entry.isPC

          return (
            <div
              key={entry.id}
              className={cn(
                'initiative-row group relative',
                isActive && 'initiative-active',
                isPlayer && isActive && 'border-l-2 border-l-gold/60',
                isPlayer && !isActive && 'border-l-2 border-l-gold/20',
              )}
            >
              {/* Active turn indicator */}
              {isActive && (
                <ChevronRight
                  size={12}
                  className="text-arcane shrink-0 -ml-0.5"
                  aria-label="Current turn"
                />
              )}

              {/* Row number */}
              <span
                className={cn(
                  'font-mono w-5 text-center shrink-0',
                  isActive ? 'text-arcane font-bold' : 'text-ink-muted',
                )}
              >
                {idx + 1}
              </span>

              {/* Name */}
              <span
                className={cn(
                  'text-xs font-semibold truncate min-w-0 flex-1',
                  isActive ? 'text-ink-primary' : 'text-ink-secondary',
                )}
                title={entry.name}
              >
                {entry.name}
              </span>

              {/* Initiative value */}
              <span
                className={cn(
                  'text-xs font-mono shrink-0',
                  isActive ? 'text-arcane' : 'text-ink-muted',
                )}
              >
                {entry.initiative}
              </span>

              {/* HP display */}
              {entry.hp && (
                <span className="text-xs font-mono text-ink-muted shrink-0">
                  {entry.hp}
                </span>
              )}

              {/* Remove button (visible on hover) */}
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                className={cn(
                  'opacity-0 group-hover:opacity-100',
                  'p-0.5 rounded transition-all duration-150',
                  'text-ink-muted hover:text-red-400 hover:bg-red-400/10',
                  'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gold',
                  'active:scale-[0.97]',
                )}
                aria-label={`Remove ${entry.name}`}
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add Combatant Toggle */}
      {!formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-1',
            'min-h-[36px] rounded-lg',
            'text-xs font-display uppercase tracking-wider text-ink-muted',
            'border border-dashed border-gold/15',
            'hover:border-gold/30 hover:text-ink-secondary hover:bg-gold/[0.04]',
            'transition-all duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-gold',
          )}
          aria-label="Add combatant"
        >
          <Plus size={12} />
          Add Combatant
        </button>
      )}

      {/* Add Combatant Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 space-y-1.5 border-t border-gold/10 pt-2"
        >
          <div className="grid grid-cols-3 gap-1.5">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goblin"
              className={cn(
                'col-span-2 min-h-[36px] rounded-lg px-2.5',
                'bg-ash-mid/60 text-ink-primary placeholder:text-ink-muted',
                'border border-gold-dim/20 text-xs',
                'transition-all duration-200',
                'focus:border-gold/50 focus:outline-none',
              )}
              aria-label="Combatant name"
            />
            <input
              type="number"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              placeholder="15"
              className={cn(
                'min-h-[36px] rounded-lg px-2.5',
                'bg-ash-mid/60 text-ink-primary placeholder:text-ink-muted',
                'border border-gold-dim/20 text-xs font-mono text-center',
                'transition-all duration-200',
                'focus:border-gold/50 focus:outline-none',
              )}
              aria-label="Initiative roll"
            />
          </div>

          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              placeholder="24/24"
              className={cn(
                'flex-1 min-h-[36px] rounded-lg px-2.5',
                'bg-ash-mid/60 text-ink-primary placeholder:text-ink-muted',
                'border border-gold-dim/20 text-xs font-mono',
                'transition-all duration-200',
                'focus:border-gold/50 focus:outline-none',
              )}
              aria-label="Hit points (optional)"
            />

            <label
              className={cn(
                'flex items-center gap-1 text-xs text-ink-muted select-none cursor-pointer shrink-0',
                'min-h-[36px] px-2 rounded-lg',
                'hover:bg-gold/[0.04] transition-colors',
              )}
            >
              <input
                type="checkbox"
                checked={isPC}
                onChange={(e) => setIsPC(e.target.checked)}
                className="accent-arcane w-3 h-3"
              />
              PC
            </label>
          </div>

          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={!name.trim() || !initiative}
              className={cn(
                'flex-1 min-h-[36px] rounded-lg',
                'bg-arcane/20 text-arcane font-display text-xs uppercase tracking-wider',
                'border border-arcane/25',
                'hover:bg-arcane/30 transition-all duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-gold',
              )}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false)
                setName('')
                setInitiative('')
                setHp('')
                setIsPC(false)
              }}
              className={cn(
                'min-h-[36px] px-3 rounded-lg',
                'text-ink-muted text-xs',
                'hover:text-ink-secondary hover:bg-ash-mid/60 transition-all duration-200',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-gold',
              )}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* End Turn Button */}
      <button
        type="button"
        onClick={onAdvanceTurn}
        disabled={sorted.length === 0}
        className={cn(
          'mt-3 w-full min-h-[44px] rounded-xl',
          'bg-ash-mid border border-gold/25 text-ink-primary',
          'font-display text-xs uppercase tracking-wider',
          'transition-all duration-200',
          'hover:border-gold/40 hover:bg-ash-mid/90',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-gold',
        )}
      >
        End Turn
      </button>
    </div>
  )
}
