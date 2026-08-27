import { useState, useMemo } from 'react'
import { Search, X, BookOpen, Dices } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character, Spell, ClassFeature } from '../../lib/character'
import { Badge } from '../ui/Badge'
import { Sheet } from '../ui/Sheet'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickLookupProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  onRollDice?: (prefill: { notation: string; label: string }) => void
}

type LookupItem =
  | { type: 'spell'; data: Spell }
  | { type: 'feature'; data: ClassFeature }

/** The one-line preview for a search result. Slice 9.
 *
 *  Returns the FIRST SENTENCE, whole, or the whole string when it has no
 *  sentence break. It never cuts inside a word and it never appends an
 *  ellipsis, because those are the two things that made the old preview
 *  unreadable rather than merely short. A row that ends up long simply wraps —
 *  this is a list you scan and tap, not a fixed-height grid. */
function previewSentence(description: string): string {
  const trimmed = description.trim()
  const [first] = trimmed.split(/(?<=\.)\s/)
  return first || trimmed
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickLookup({ isOpen, onClose, character, onRollDice }: QuickLookupProps) {
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<LookupItem | null>(null)

  // Build items
  const allItems: LookupItem[] = useMemo(() => {
    const items: LookupItem[] = []
    character.spells.forEach(s => items.push({ type: 'spell', data: s }))
    character.features.forEach(f => items.push({ type: 'feature', data: f }))
    return items
  }, [character.spells, character.features])

  // Filter
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10) // Show first 10 when empty
    const q = search.toLowerCase()
    return allItems.filter(i =>
      i.data.name.toLowerCase().includes(q) ||
      i.data.description.toLowerCase().includes(q),
    ).slice(0, 15)
  }, [allItems, search])

  const handleClose = () => { onClose(); setSearch(''); setSelectedItem(null) }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      label="Quick Grimoire lookup"
      z={55}
      backdropClassName="bg-void-0/60 backdrop-blur-sm"
      panelClassName="max-h-[70vh] flex flex-col overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-white/5 shrink-0">
          <BookOpen size={16} className="text-arcane shrink-0" aria-hidden />
          <h3 className="text-sm font-bold text-forge-0">Quick Lookup</h3>
          <div className="flex-1" />
          <button
            onClick={() => { onClose(); setSearch(''); setSelectedItem(null) }}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-colors duration-200 active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Close lookup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-2 pointer-events-none" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedItem(null) }}
              placeholder="Search spells and features..."
              autoFocus
              className={cn(
                'w-full min-h-[44px] rounded-xl',
                'bg-white/[0.04] text-forge-0 placeholder:text-forge-2',
                'border border-white/10',
                'text-sm pl-10 pr-4',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-white/[0.06]',
                'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
                'focus:outline-none',
              )}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {selectedItem ? (
            // Detail view
            <div className="animate-fade-in">
              <button
                onClick={() => setSelectedItem(null)}
                className="text-xs text-arcane hover:underline mb-3 min-h-[44px]"
              >
                &larr; Back to results
              </button>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-bold text-forge-0">{selectedItem.data.name}</span>
                  <Badge variant={selectedItem.type === 'spell' ? 'arcane' : 'eldritch'}>
                    {selectedItem.type === 'spell' ? 'Spell' : 'Feature'}
                  </Badge>
                </div>

                <p className="text-sm text-forge-1 leading-relaxed whitespace-pre-wrap mb-3">
                  {selectedItem.data.description}
                </p>

                {selectedItem.type === 'spell' && selectedItem.data.higherLevels && (
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 mb-3">
                    <span className="text-xs font-semibold text-arcane">At Higher Levels:</span>
                    <p className="text-xs text-forge-2 mt-1">{selectedItem.data.higherLevels}</p>
                  </div>
                )}

                {/* Roll button */}
                {(selectedItem.type === 'spell' ? selectedItem.data.damageDice : selectedItem.data.damageDice) && (
                  <button
                    onClick={() => {
                      const dice = selectedItem.type === 'spell'
                        ? selectedItem.data.damageDice
                        : selectedItem.data.damageDice
                      if (dice && onRollDice) {
                        onRollDice({ notation: dice, label: selectedItem.data.name })
                        onClose()
                        setSearch('')
                        setSelectedItem(null)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
                      'bg-eldritch/15 text-eldritch-lit border border-eldritch/25',
                      'text-sm font-medium',
                      'transition-all duration-200 ease-forge',
                      'hover:bg-eldritch/20 active:scale-[0.95]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    )}
                  >
                    <Dices size={16} aria-hidden />
                    Roll {selectedItem.type === 'spell' ? selectedItem.data.damageDice : selectedItem.data.damageDice}
                  </button>
                )}
              </div>
            </div>
          ) : (
            // List view
            <div className="flex flex-col gap-1.5">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-forge-2 text-center py-6">No results found.</p>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={`${item.type}-${item.data.name}`}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      'flex items-center justify-between min-h-[48px] px-3 py-2 rounded-xl text-left',
                      'bg-white/[0.02] border border-white/5',
                      'transition-all duration-200 ease-forge',
                      'hover:bg-white/[0.04] hover:border-white/10',
                      'active:scale-[0.98]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* NOT `truncate`. A name is the one string that must
                            never be cut: "Channel Divinity: Sacred Weap…" is
                            the row failing at the only job it has. */}
                        <span className="text-sm font-medium text-forge-0">{item.data.name}</span>
                        <Badge variant={item.type === 'spell' ? 'arcane' : 'eldritch'}>
                          {item.type === 'spell' ? 'Spell' : 'Feature'}
                        </Badge>
                      </div>
                      {/* A WHOLE SENTENCE, not sixty characters — slice 9.
                          This row read `.slice(0, 60) + '...'` inside a
                          `truncate`, which is two truncations stacked: the
                          model cut mid-word and CSS then cut the cut. It was
                          the last literal `'...'` painted anywhere in the app.
                          A preview in a search list is legitimate; cutting a
                          word in half is not. The house rule is drop whole
                          segments, never characters, and never an ellipsis. */}
                      <p className="text-xs text-forge-2 mt-0.5 leading-snug">
                        {previewSentence(item.data.description)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
    </Sheet>
  )
}
