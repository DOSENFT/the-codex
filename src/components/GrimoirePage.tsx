import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  BookOpen,
  Sparkles,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Filter,
  X,
  Shield,
  Lock,
  Unlock,
  Swords,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type Character,
  type Spell,
  type ClassFeature,
  toggleSpellPrepared,
  removeSpell,
  expendSpellSlot,
  restoreSpellSlot,
} from '../lib/character'
import { GrimoireCard } from './grimoire/GrimoireCard'
import { LoadoutPanel } from './grimoire/LoadoutPanel'
import { SessionReadyCard } from './grimoire/SessionReadyCard'
import { SpellEditor } from './SpellEditor'
import { FeatureEditor } from './FeatureEditor'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AbilityItem =
  | { type: 'spell'; data: Spell }
  | { type: 'feature'; data: ClassFeature }

type TypeFilter = 'all' | 'spells' | 'features'
type ActionFilter = 'all' | 'action' | 'bonus' | 'reaction' | 'passive'

interface GrimoirePageProps {
  character: Character
  onCharacterUpdate: (updated: Character) => void
  mode: 'session' | 'prep'
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionType(item: AbilityItem): string {
  if (item.type === 'spell') {
    const ct = item.data.castingTime.toLowerCase()
    if (ct.includes('bonus')) return 'bonus'
    if (ct.includes('reaction')) return 'reaction'
    return 'action'
  }
  const at = item.data.actionType
  if (at === 'bonusAction') return 'bonus'
  if (at === 'reaction') return 'reaction'
  if (at === 'passive') return 'passive'
  return 'action'
}

function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${level}${suffixes[level] ?? 'th'}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrimoirePage({ character, onCharacterUpdate, mode, onOpenDiceRoller }: GrimoirePageProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [preparedOnly, setPreparedOnly] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [lockAndLoadActive, setLockAndLoadActive] = useState(false)

  // Spell Editor state
  const [spellEditorOpen, setSpellEditorOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null)

  // Feature Editor state
  const [featureEditorOpen, setFeatureEditorOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<ClassFeature | null>(null)

  // Build unified list
  const allItems: AbilityItem[] = useMemo(() => {
    const items: AbilityItem[] = []

    character.spells.forEach(spell => {
      items.push({ type: 'spell', data: spell })
    })

    character.features.forEach(feature => {
      items.push({ type: 'feature', data: feature })
    })

    return items
  }, [character.spells, character.features])

  // Filter items
  const filteredItems = useMemo(() => {
    let items = allItems

    // Type filter
    if (typeFilter === 'spells') items = items.filter(i => i.type === 'spell')
    if (typeFilter === 'features') items = items.filter(i => i.type === 'feature')

    // Action filter
    if (actionFilter !== 'all') {
      items = items.filter(i => getActionType(i) === actionFilter)
    }

    // Prepared filter
    if (preparedOnly) {
      items = items.filter(i => {
        if (i.type === 'spell') return i.data.prepared || i.data.level === 0
        return true // features are always "prepared"
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i => {
        const name = i.type === 'spell' ? i.data.name : i.data.name
        const desc = i.type === 'spell' ? i.data.description : i.data.description
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
      })
    }

    // Sort: features first (alphabetical), then spells by level then name
    items.sort((a, b) => {
      // Group by type
      if (a.type !== b.type) return a.type === 'feature' ? -1 : 1

      // Within type, sort by name
      const nameA = a.data.name.toLowerCase()
      const nameB = b.data.name.toLowerCase()

      if (a.type === 'spell' && b.type === 'spell') {
        // Sort spells by level first
        if (a.data.level !== b.data.level) return a.data.level - b.data.level
      }

      return nameA.localeCompare(nameB)
    })

    return items
  }, [allItems, typeFilter, actionFilter, preparedOnly, search])

  // Counts
  const spellCount = allItems.filter(i => i.type === 'spell').length
  const featureCount = allItems.filter(i => i.type === 'feature').length

  // Loadout summary counts
  const preparedSpellCount = useMemo(
    () => character.spells.filter(s => s.prepared || s.level === 0).length,
    [character.spells],
  )
  const featuresReadyCount = useMemo(
    () => character.features.filter(f =>
      !f.usesMax || !f.usesCurrent || f.usesCurrent > 0
    ).length,
    [character.features],
  )
  const combatWeaponsCount = useMemo(
    () => character.weapons.filter(w => w.magical || (w.specialAbilities && w.specialAbilities.length > 0)).length,
    [character.weapons],
  )

  // Handlers
  const handleTogglePrepared = useCallback((spellName: string) => {
    onCharacterUpdate(toggleSpellPrepared(character, spellName))
  }, [character, onCharacterUpdate])

  const handleDeleteSpell = useCallback((spellName: string) => {
    onCharacterUpdate(removeSpell(character, spellName))
  }, [character, onCharacterUpdate])

  const handleDeleteFeature = useCallback((featureName: string) => {
    const features = character.features.filter(f => f.name !== featureName)
    onCharacterUpdate({ ...character, features })
  }, [character, onCharacterUpdate])

  const handleExpendUse = useCallback((featureName: string) => {
    const features = character.features.map(f => {
      if (f.name === featureName && f.usesCurrent !== undefined && f.usesCurrent > 0) {
        return { ...f, usesCurrent: f.usesCurrent - 1 }
      }
      return f
    })
    onCharacterUpdate({ ...character, features })
  }, [character, onCharacterUpdate])

  const handleRestoreUse = useCallback((featureName: string) => {
    const features = character.features.map(f => {
      if (f.name === featureName && f.usesCurrent !== undefined && f.usesMax !== undefined && f.usesCurrent < f.usesMax) {
        return { ...f, usesCurrent: f.usesCurrent + 1 }
      }
      return f
    })
    onCharacterUpdate({ ...character, features })
  }, [character, onCharacterUpdate])

  const handleExpendSlot = useCallback((level: number) => {
    onCharacterUpdate(expendSpellSlot(character, level))
  }, [character, onCharacterUpdate])

  const handleRestoreSlot = useCallback((level: number) => {
    onCharacterUpdate(restoreSpellSlot(character, level))
  }, [character, onCharacterUpdate])

  const handleEditSpell = useCallback((spell: Spell) => {
    setEditingSpell(spell)
    setSpellEditorOpen(true)
  }, [])

  const handleEditFeature = useCallback((feature: ClassFeature) => {
    setEditingFeature(feature)
    setFeatureEditorOpen(true)
  }, [])

  const handleRollDice = useCallback((notation: string, label: string) => {
    onOpenDiceRoller?.({ notation, label })
  }, [onOpenDiceRoller])

  return (
    <section className="flex flex-col gap-3 animate-fade-in" aria-label="Grimoire">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen size={20} className="text-arcane" aria-hidden />
          <h2 className="font-display text-xl font-semibold text-forge-0">Grimoire</h2>
          <Badge variant="neutral">{filteredItems.length}</Badge>
        </div>
        {mode === 'prep' && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setEditingSpell(null); setSpellEditorOpen(true) }}>
              <Plus size={14} aria-hidden />
              Spell
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditingFeature(null); setFeatureEditorOpen(true) }}>
              <Plus size={14} aria-hidden />
              Feature
            </Button>
          </div>
        )}
      </div>

      {/* ─── Lock & Load Bar (prep mode only) ─── */}
      {mode === 'prep' && (
        <div
          className={cn(
            'rounded-xl border p-3 transition-all duration-300 ease-forge',
            lockAndLoadActive
              ? 'bg-gold/[0.06] border-gold/25 shadow-[0_0_20px_-6px_rgba(197,165,90,0.2)]'
              : 'bg-white/[0.03] border-white/8',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Summary text */}
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              {character.spells.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-arcane shrink-0" aria-hidden />
                  <span className="text-xs text-forge-1">
                    <span className="font-semibold text-arcane">{preparedSpellCount}</span> {preparedSpellCount === 1 ? 'spell' : 'spells'} prepared
                  </span>
                </div>
              )}
              {character.features.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-eldritch shrink-0" aria-hidden />
                  <span className="text-xs text-forge-1">
                    <span className="font-semibold text-eldritch">{featuresReadyCount}</span> {featuresReadyCount === 1 ? 'feature' : 'features'} ready
                  </span>
                </div>
              )}
              {combatWeaponsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Swords size={12} className="text-ember shrink-0" aria-hidden />
                  <span className="text-xs text-forge-1">
                    <span className="font-semibold text-ember">{combatWeaponsCount}</span> {combatWeaponsCount === 1 ? 'item' : 'items'} equipped
                  </span>
                </div>
              )}
              {character.spells.length === 0 && character.features.length === 0 && combatWeaponsCount === 0 && (
                <span className="text-xs text-forge-2">No loadout items yet</span>
              )}
            </div>

            {/* Lock & Load toggle */}
            <button
              type="button"
              onClick={() => setLockAndLoadActive(!lockAndLoadActive)}
              className={cn(
                'flex items-center gap-2 min-h-[44px] px-4 rounded-lg shrink-0',
                'text-xs font-semibold',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                lockAndLoadActive
                  ? [
                      'bg-gold/15 text-gold border-gold/30',
                      'shadow-[0_0_12px_-4px_rgba(197,165,90,0.3)]',
                    ]
                  : 'bg-white/[0.04] text-forge-1 border-white/10 hover:bg-white/[0.06] hover:border-white/15',
              )}
              aria-pressed={lockAndLoadActive}
              aria-label={lockAndLoadActive ? 'Close loadout panel' : 'Open loadout panel'}
            >
              {lockAndLoadActive ? (
                <Lock size={14} aria-hidden />
              ) : (
                <Unlock size={14} aria-hidden />
              )}
              Lock & Load
            </button>
          </div>
        </div>
      )}

      {/* ─── Loadout Panel (expanded, prep mode only) ─── */}
      {mode === 'prep' && lockAndLoadActive && (
        <LoadoutPanel
          character={character}
          onTogglePrepared={handleTogglePrepared}
        />
      )}

      {/* ─── Search ─── */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-forge-2 pointer-events-none" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search abilities..."
          className={cn(
            'w-full min-h-[44px] rounded-xl',
            'bg-white/[0.04] text-forge-0 placeholder:text-forge-2',
            'border border-white/10',
            'text-sm pl-10 pr-10',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-white/[0.06]',
            'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
            'focus:outline-none',
          )}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-forge-2 hover:text-forge-1 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Clear search"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>

      {/* ─── Type Filter Chips ─── */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all' as TypeFilter, label: 'All', count: allItems.length },
          { id: 'spells' as TypeFilter, label: 'Spells', count: spellCount },
          { id: 'features' as TypeFilter, label: 'Features', count: featureCount },
        ]).map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTypeFilter(id)}
            className={cn(
              'min-h-[36px] px-3 rounded-lg text-xs font-medium',
              'border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              typeFilter === id
                ? 'bg-arcane/15 text-arcane border-arcane/25'
                : 'bg-white/[0.03] text-forge-2 border-white/8 hover:bg-white/[0.06] hover:text-forge-1',
            )}
          >
            {label} ({count})
          </button>
        ))}

        {/* Action filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle action type filters"
          aria-expanded={showFilters}
          className={cn(
            'min-h-[36px] px-3 rounded-lg text-xs font-medium',
            'border transition-all duration-200 ease-forge',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            showFilters || actionFilter !== 'all'
              ? 'bg-ember/15 text-ember border-ember/25'
              : 'bg-white/[0.03] text-forge-2 border-white/8 hover:bg-white/[0.06] hover:text-forge-1',
          )}
        >
          <Filter size={12} className="inline mr-1" aria-hidden />
          Filters
        </button>

        {/* Prepared toggle */}
        <button
          onClick={() => setPreparedOnly(!preparedOnly)}
          className={cn(
            'min-h-[36px] px-3 rounded-lg text-xs font-medium',
            'border transition-all duration-200 ease-forge',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            preparedOnly
              ? 'bg-verdant/15 text-verdant border-verdant/25'
              : 'bg-white/[0.03] text-forge-2 border-white/8 hover:bg-white/[0.06] hover:text-forge-1',
          )}
        >
          <Star size={12} className="inline mr-1" aria-hidden />
          Prepared
        </button>
      </div>

      {/* ─── Action Filter Row (expanded) ─── */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {([
            { id: 'all' as ActionFilter, label: 'All Actions' },
            { id: 'action' as ActionFilter, label: 'Action' },
            { id: 'bonus' as ActionFilter, label: 'Bonus' },
            { id: 'reaction' as ActionFilter, label: 'Reaction' },
            { id: 'passive' as ActionFilter, label: 'Passive' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActionFilter(id)}
              className={cn(
                'min-h-[36px] px-3 rounded-lg text-xs font-medium',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                actionFilter === id
                  ? 'bg-ember/15 text-ember border-ember/25'
                  : 'bg-white/[0.03] text-forge-2 border-white/8 hover:bg-white/[0.06] hover:text-forge-1',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Spell Slot Status (session mode) ─── */}
      {mode === 'session' && Object.keys(character.spellSlots).length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-arcane" aria-hidden />
            <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Spell Slots</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(character.spellSlots)
              .filter(([_, slot]) => slot.max > 0)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, slot]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <span className="text-xs text-forge-2 font-medium">{levelLabel(Number(level))}:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: slot.max }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => i < slot.current ? handleExpendSlot(Number(level)) : handleRestoreSlot(Number(level))}
                        className={cn(
                          'w-3.5 h-3.5 rounded-full transition-all duration-200',
                          'active:scale-90',
                          i < slot.current
                            ? 'bg-arcane shadow-[0_0_4px_rgba(61,210,255,0.4)]'
                            : 'bg-white/10 border border-white/20',
                        )}
                        aria-label={i < slot.current ? `Expend ${levelLabel(Number(level))} slot` : `Restore ${levelLabel(Number(level))} slot`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-forge-2">{slot.current}/{slot.max}</span>
                </div>
              ))}
          </div>
        </GlassCard>
      )}

      {/* ─── Ability Cards ─── */}
      {filteredItems.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <BookOpen size={32} className="text-forge-2 mx-auto mb-3" aria-hidden />
          <p className="text-sm text-forge-2">
            {search ? 'No abilities match your search.' : 'No abilities yet. Add spells and features to fill your Grimoire.'}
          </p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => {
            const key = `${item.type}-${item.data.name}`
            return (
              <GrimoireCard
                key={key}
                item={item}
                character={character}
                expanded={expandedItem === key}
                mode={mode}
                onToggleExpand={() => setExpandedItem(expandedItem === key ? null : key)}
                onRollDice={handleRollDice}
                onTogglePrepared={item.type === 'spell' ? () => handleTogglePrepared(item.data.name) : undefined}
                onExpendUse={item.type === 'feature' ? () => handleExpendUse(item.data.name) : undefined}
                onRestoreUse={item.type === 'feature' ? () => handleRestoreUse(item.data.name) : undefined}
                onEdit={mode === 'prep' ? () => {
                  if (item.type === 'spell') handleEditSpell(item.data as Spell)
                  else handleEditFeature(item.data as ClassFeature)
                } : undefined}
                onDelete={mode === 'prep' ? () => {
                  if (item.type === 'spell') handleDeleteSpell(item.data.name)
                  else handleDeleteFeature(item.data.name)
                } : undefined}
              />
            )
          })}
        </div>
      )}

      {/* ─── Session Ready Card (prep mode only) ─── */}
      {mode === 'prep' && (
        <SessionReadyCard character={character} />
      )}

      {/* ─── Editors ─── */}
      <SpellEditor
        isOpen={spellEditorOpen}
        onClose={() => { setSpellEditorOpen(false); setEditingSpell(null) }}
        character={character}
        onCharacterUpdate={onCharacterUpdate}
        editSpell={editingSpell}
      />

      <FeatureEditor
        isOpen={featureEditorOpen}
        onClose={() => { setFeatureEditorOpen(false); setEditingFeature(null) }}
        character={character}
        onCharacterUpdate={onCharacterUpdate}
        editFeature={editingFeature}
      />
    </section>
  )
}
