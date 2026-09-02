import { useState, useMemo, useCallback, useEffect } from 'react'
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
  removeSpell,
  expendSpellSlot,
  restoreSpellSlot,
} from '../lib/character'
import { togglePrepared, preparedCount, type PrepareRefusal } from '../lib/prepare/toggle'
import { toggleFightingStyle, FIGHTING_STYLE_FEATURE } from '../lib/prepare/fighting-style'
import type { CanonFeat } from '../lib/canon/types'
import { buildCatalogue } from '../lib/catalogue/build'
import type { CatalogueEntry } from '../lib/catalogue/types'
import { entryDetail, type EntryDetail } from '../lib/catalogue/detail'
import { groupCatalogue, DEFAULT_GROUP_MODE, type GroupMode } from '../lib/catalogue/group'
import { loadRulings, type ErratumRulings } from '../lib/errata-rulings'
import { normalizeName } from '../lib/canon/lookup'
import { CatalogueRow } from './grimoire/CatalogueRow'
import { GroupSwitcher, GroupHeading } from './grimoire/GroupSwitcher'
import { LoadoutPanel } from './grimoire/LoadoutPanel'
import { PreparationRules } from './grimoire/PreparationRules'
import { FightingStylePicker } from './grimoire/FightingStylePicker'
import { SessionReadyCard } from './grimoire/SessionReadyCard'
import { SpellEditor } from './SpellEditor'
import { FeatureEditor } from './FeatureEditor'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/* Slice 1's adapter stood here — 70 lines that squeezed a `CatalogueEntry` back
 * into the sheet-shaped `AbilityItem` pair so the old `GrimoireCard` could draw
 * it. It was the tracer bullet's mock, it was labelled TEMPORARY, and slice 3
 * was declared not done until it was gone. It is gone, along with the card.
 * `CatalogueRow` reads the entry directly and `entryDetail` does the rest. */

interface CatalogueRowItem {
  entry: CatalogueEntry
  detail: EntryDetail
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
  const [groupMode, setGroupMode] = useState<GroupMode>(DEFAULT_GROUP_MODE)
  /* The last refusal, keyed by entry — so it appears in the row he pressed and
   * nowhere else. One at a time on purpose: a page that accumulates refusals
   * turns a rule into a scolding. */
  const [refusals, setRefusals] = useState<Record<string, PrepareRefusal>>({})

  // Spell Editor state
  const [spellEditorOpen, setSpellEditorOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null)

  // Feature Editor state
  const [featureEditorOpen, setFeatureEditorOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<ClassFeature | null>(null)

  /* THE ONE LINE THAT WAS ITEM 2. This read `character.spells` and
   * `character.features`, so the Grimoire showed the eleven things typed onto
   * his sheet and none of the eighty-four he can actually do. */
  const allItems: CatalogueRowItem[] = useMemo(
    () => buildCatalogue(character).map(entry => ({ entry, detail: entryDetail(entry, character) })),
    [character],
  )

  /* Read-only here. The controls that RECORD a ruling live on the combat tab,
   * for the reason `CombatHelper.tsx:789` gives about a second `loadRulings`
   * being a second source of truth; the Grimoire only reports what was ruled. */
  const [rulings, setRulings] = useState<ErratumRulings>(() => loadRulings(character.id))
  useEffect(() => { setRulings(loadRulings(character.id)) }, [character.id])

  // Filter items
  const filteredItems = useMemo(() => {
    let items = allItems

    // Type filter. A feat is a feature as far as this row of chips is
    // concerned — it is a thing you have, not a thing you prepare.
    if (typeFilter === 'spells') items = items.filter(i => i.entry.kind === 'spell')
    if (typeFilter === 'features') items = items.filter(i => i.entry.kind !== 'spell')

    // Action filter — canon's cost, not a re-parse of the sheet's wording.
    if (actionFilter !== 'all') {
      items = items.filter(i => i.entry.turnCost === actionFilter)
    }

    // Prepared filter
    if (preparedOnly) {
      items = items.filter(i => i.entry.prepared)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      /* Searching CANON's paragraph now, not the sheet's summary. That is a
       * widening he asked for without naming it: "Divine Smite" used to match
       * four words of his own typing, and now matches the 1,900-character
       * record the app has been holding all along. */
      items = items.filter(i =>
        i.entry.name.toLowerCase().includes(q) ||
        i.detail.bands.whatItDoes.toLowerCase().includes(q),
      )
    }

    /* Sort: features first (alphabetical), then spells by level then name.
     * Since slice 4 this is the order WITHIN a group, not the order of the page
     * — `groupCatalogue` preserves the order entries arrive in, so this sort is
     * what decides it. Under the default `level` grouping the level part of it
     * is a no-op inside a group and the alphabetical part is what shows. */
    return [...items].sort((a, b) => {
      const aSpell = a.entry.kind === 'spell'
      const bSpell = b.entry.kind === 'spell'
      if (aSpell !== bSpell) return aSpell ? 1 : -1
      if (aSpell && bSpell && a.entry.spellLevel !== b.entry.spellLevel) {
        return (a.entry.spellLevel ?? 0) - (b.entry.spellLevel ?? 0)
      }
      return a.entry.name.toLowerCase().localeCompare(b.entry.name.toLowerCase())
    })
  }, [allItems, typeFilter, actionFilter, preparedOnly, search])

  /* The grouping, applied LAST — after the filters, never instead of them.
   *
   * `groupCatalogue` speaks in entries; this page draws entry+detail pairs. The
   * map is by key rather than by index because `groupCatalogue` reorders, and an
   * index would silently pair a heading's row with somebody else's detail sheet
   * — the loudest possible bug wearing the quietest possible cause. */
  const groups = useMemo(() => {
    const byKey = new Map(filteredItems.map(i => [i.entry.key, i]))
    return groupCatalogue(filteredItems.map(i => i.entry), groupMode).map(g => ({
      id: g.id,
      label: g.label,
      items: g.entries.map(e => byKey.get(e.key)!),
    }))
  }, [filteredItems, groupMode])

  // Counts
  const spellCount = allItems.filter(i => i.entry.kind === 'spell').length
  const featureCount = allItems.filter(i => i.entry.kind !== 'spell').length

  /* Loadout summary counts.
   *
   * This read `s.prepared || s.level === 0` and said "6 spells prepared". The
   * number the CAP enforces was 2 of 7, because canon's rule 4 excludes his four
   * Oath grants and rule 5 excludes cantrips. A display count and an enforced
   * count that disagree is a bar that fills up while the button keeps working —
   * so there is now one function and both read it. (Slice 5.) */
  const preparedSpellCount = useMemo(() => preparedCount(character), [character])
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
  /* Slice 5. This was `toggleSpellPrepared(character, spellName)` — a reducer
   * that flipped a boolean on a spell already on the sheet and did nothing at
   * all otherwise. Three consequences, all of which Marcus met:
   *
   *  · the cap was displayed and never enforced;
   *  · the 73 catalogue entries not on his sheet could not be prepared, because
   *    there was no record to flip — which is why `onTogglePrepared` below used
   *    to require `entry.onSheet`;
   *  · a tap on an Oath grant silently unprepared a spell canon says he always
   *    has, and the count did not even move.
   *
   * `togglePrepared` refuses instead, and the refusal names the rule. */
  const handleTogglePrepared = useCallback((spellName: string, key: string) => {
    const result = togglePrepared(character, spellName)
    if (result.ok) {
      // Clear this row's refusal on success — a stale "you have all 7 prepared"
      // sitting under a spell he just unprepared is worse than no message.
      setRefusals(prev => {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
      onCharacterUpdate(result.next)
      return
    }
    setRefusals(prev => ({ ...prev, [key]: result.refusal }))
  }, [character, onCharacterUpdate])

  /* Slice 6. One line, because everything downstream already existed: the style
   * lands on `character.feats`, `turn/feats.ts` reads its sentences, and
   * `compose.ts` splices the reaction into the combat tab. Nothing had ever
   * asked him the question, which is the whole of why Interception was missing. */
  const handlePickFightingStyle = useCallback((style: CanonFeat) => {
    onCharacterUpdate(toggleFightingStyle(character, style))
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
                    {/* "2 of 7", not "2" — the bare number was the thing that
                        read as a full loadout when five places were free. */}
                    <span className="font-semibold text-arcane">{preparedSpellCount}</span> of {character.maxPreparedSpells} prepared
                  </span>
                </div>
              )}
              {character.features.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-eldritch shrink-0" aria-hidden />
                  <span className="text-xs text-forge-1">
                    <span className="font-semibold text-eldritch-lit">{featuresReadyCount}</span> {featuresReadyCount === 1 ? 'feature' : 'features'} ready
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
          /* The panel speaks in names; refusals are keyed the way the rows are,
             so the key is derived here rather than the panel being taught about
             catalogue keys. A refusal raised from the panel therefore surfaces
             on the matching ROW — one message, one place, wherever it started. */
          onTogglePrepared={name => handleTogglePrepared(name, normalizeName(name))}
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
              'min-h-[48px] px-3.5 rounded-lg text-xs font-medium',
              'border transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              typeFilter === id
                ? 'bg-arcane/15 text-arcane border-arcane/25'
                : 'bg-white/[0.03] text-forge-1 border-white/8 hover:bg-white/[0.06] hover:text-forge-0',
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
            'min-h-[48px] px-3.5 rounded-lg text-xs font-medium',
            'border transition-all duration-200 ease-forge',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            showFilters || actionFilter !== 'all'
              ? 'bg-ember/15 text-ember border-ember/25'
              : 'bg-white/[0.03] text-forge-1 border-white/8 hover:bg-white/[0.06] hover:text-forge-0',
          )}
        >
          <Filter size={12} className="inline mr-1" aria-hidden />
          Filters
        </button>

        {/* Prepared toggle */}
        <button
          onClick={() => setPreparedOnly(!preparedOnly)}
          className={cn(
            'min-h-[48px] px-3.5 rounded-lg text-xs font-medium',
            'border transition-all duration-200 ease-forge',
            'active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            preparedOnly
              ? 'bg-verdant/15 text-verdant border-verdant/25'
              : 'bg-white/[0.03] text-forge-1 border-white/8 hover:bg-white/[0.06] hover:text-forge-0',
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
                'min-h-[48px] px-3.5 rounded-lg text-xs font-medium',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                actionFilter === id
                  ? 'bg-ember/15 text-ember border-ember/25'
                  : 'bg-white/[0.03] text-forge-1 border-white/8 hover:bg-white/[0.06] hover:text-forge-0',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Preparation: his numbers, and canon's five rules (slice 5) ───
             Above the group switcher and below the filters, because it is a
             statement about the whole list rather than a control over it. */}
      {character.canPrepareSpells && <PreparationRules character={character} />}

      {/* ─── Group by (slice 4) ─── */}
      <div className="border-t border-white/8 pt-3">
        <GroupSwitcher mode={groupMode} onChange={setGroupMode} total={filteredItems.length} />
      </div>

      {/* ─── Spell Slot Status (session mode) ─── */}
      {mode === 'session' && Object.keys(character.spellSlots).length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-arcane" aria-hidden />
            <span className="text-xs font-semibold text-forge-1 uppercase tracking-wider">Spell Slots</span>
          </div>
          {/* One level per line, and the line IS the gauge. Four 14px dots on a
              shared row was compact and unpressable: 26×14 measured, against a
              48px floor for anything spent during a turn. Giving each slot its
              own 48px cell costs vertical space that a level-per-line layout
              pays for by reading better anyway — level on the left, the slots
              along a rail, the count on the right, the same left-to-right
              direction the stepper underneath actually has. */}
          <div className="flex flex-col">
            {Object.entries(character.spellSlots)
              .filter(([_, slot]) => slot.max > 0)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, slot]) => (
                <div key={level} className="flex items-center gap-2">
                  <span className="text-xs text-forge-2 font-medium uppercase tracking-wider w-9 shrink-0">
                    {levelLabel(Number(level))}
                  </span>
                  <div className="pip-row">
                    {Array.from({ length: slot.max }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => i < slot.current ? handleExpendSlot(Number(level)) : handleRestoreSlot(Number(level))}
                        className="pip-tap"
                        data-slot={i < slot.current ? 'full' : 'spent'}
                        aria-label={i < slot.current ? `Expend ${levelLabel(Number(level))} slot` : `Restore ${levelLabel(Number(level))} slot`}
                      >
                        <i />
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-mono text-forge-1 ml-auto tabular-nums">
                    {slot.current}/{slot.max}
                  </span>
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
        <div className="flex flex-col gap-4">
          {groups.map(group => (
          <div key={group.id} className="flex flex-col gap-2" data-group={group.id}>
          <GroupHeading label={group.label} count={group.items.length} />
          {group.items.map(({ entry, detail }) => {
            const key = entry.key
            /* HIS record, when he has one. Edit, Delete and the use counters all
               operate on the object that is actually in storage — the catalogue
               is a list of what exists, not a store, and the seventy-three
               entries that are not on his sheet have nothing for them to act on.
               Offering the button anyway would be a button that does nothing. */
            const ownSpell = character.spells.find(s => normalizeName(s.name) === key)
            const ownFeature = character.features.find(f => normalizeName(f.name) === key)
            const uses =
              ownFeature?.usesMax !== undefined && ownFeature.usesCurrent !== undefined
                ? { current: ownFeature.usesCurrent, max: ownFeature.usesMax }
                : null

            return (
              <CatalogueRow
                key={key}
                entry={entry}
                detail={detail}
                expanded={expandedItem === key}
                mode={mode}
                rulings={rulings}
                uses={uses}
                onToggleExpand={() => setExpandedItem(expandedItem === key ? null : key)}
                onRollDice={handleRollDice}
                /* `entry.onSheet` is gone from this condition, and that is the
                   line that makes the other 73 preparable at all: `togglePrepared`
                   converts a canon record onto the sheet when there is nothing
                   there to flip. `entry.preparable` is still required, so the
                   button never appears on a cantrip, an Oath grant, a feature or
                   anything locked — the four cases the refusals exist to explain
                   when something calls the function anyway. */
                onTogglePrepared={
                  entry.preparable ? () => handleTogglePrepared(entry.name, key) : undefined
                }
                refusal={refusals[key] ?? null}
                onExpendUse={ownFeature ? () => handleExpendUse(ownFeature.name) : undefined}
                onRestoreUse={ownFeature ? () => handleRestoreUse(ownFeature.name) : undefined}
                onEdit={
                  mode === 'prep' && entry.onSheet
                    ? () => {
                        if (ownSpell) handleEditSpell(ownSpell)
                        else if (ownFeature) handleEditFeature(ownFeature)
                      }
                    : undefined
                }
                onDelete={
                  mode === 'prep' && entry.onSheet
                    ? () => {
                        if (ownSpell) handleDeleteSpell(ownSpell.name)
                        else if (ownFeature) handleDeleteFeature(ownFeature.name)
                      }
                    : undefined
                }
                /* The one entry in the 84 that carries a choice. `locked` is
                   the lock `build.ts` already computed for this row — passed
                   down rather than recomputed, so the picker can never disagree
                   with the chip above it about what level he is. */
                extra={
                  entry.kind === 'feature' && key === normalizeName(FIGHTING_STYLE_FEATURE) ? (
                    <FightingStylePicker
                      character={character}
                      onPick={handlePickFightingStyle}
                      locked={entry.lockedUntil !== null}
                    />
                  ) : undefined
                }
              />
            )
          })}
          </div>
          ))}
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
