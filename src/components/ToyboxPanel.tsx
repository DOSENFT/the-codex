import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Swords, Target, Drama, Sparkles, Plus, Star, Pencil,
  ChevronUp, ChevronDown, Trash2, Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { GlassCard } from './ui/GlassCard'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import {
  type ToyboxData, type ToyboxCombo, type ToyboxTactic, type ToyboxPersonaPlay,
  type ComboBlock, loadToybox, saveToybox,
  addComboToData, updateComboInData, deleteComboFromData,
  addTacticToData, updateTacticInData, deleteTacticFromData,
  addPersonaPlayToData, updatePersonaPlayInData, deletePersonaPlayFromData,
} from '../lib/toybox'
import { ComboCard, TacticCard } from './toybox'
import { DeployView } from './toybox/DeployView'
import type { Character } from '../lib/character'
import { generateId } from '../lib/character'

/* ==========================================================================
   TOYBOX PANEL — Strategy drawer with Combos / Tactics / Persona tabs
   Slides in from the right. Manages its own localStorage state.
   ========================================================================== */

// ─── Types ───

type TabId = 'combos' | 'tactics' | 'persona'

type ComboCategory = ToyboxCombo['category']
type TacticCategory = ToyboxTactic['category']

interface ToyboxPanelProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  onOpenDice?: (prefill: { notation: string; label: string }) => void
  onUseSlot?: (level: number) => void
  concentratingOn?: string | null
}

// ─── Constants ───

const TABS: { id: TabId; label: string; icon: typeof Swords }[] = [
  { id: 'combos', label: 'Combos', icon: Swords },
  { id: 'tactics', label: 'Tactics', icon: Target },
  { id: 'persona', label: 'Persona', icon: Drama },
]

const COMBO_CATEGORIES: { value: ComboCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'burst', label: 'Burst' },
  { value: 'sustained', label: 'Sustained' },
  { value: 'defensive', label: 'Defensive' },
  { value: 'aoe', label: 'AoE' },
  { value: 'utility', label: 'Utility' },
]

const TACTIC_CATEGORIES: { value: TacticCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'core', label: 'Core' },
  { value: 'survival', label: 'Survival' },
  { value: 'burst', label: 'Burst' },
  { value: 'control', label: 'Control' },
  { value: 'support', label: 'Support' },
]

const BLOCK_TYPES: ComboBlock['type'][] = ['action', 'bonus', 'reaction', 'movement', 'free']

const BLOCK_TYPE_COLORS: Record<ComboBlock['type'], string> = {
  action: 'bg-red-400/15 border-red-400/30 text-red-400',
  bonus: 'bg-ember/15 border-ember/30 text-ember',
  reaction: 'bg-arcane/15 border-arcane/30 text-arcane',
  movement: 'bg-verdant/15 border-verdant/30 text-verdant',
  free: 'bg-white/8 border-white/15 text-forge-2',
}

const BLOCK_SOURCE_OPTIONS: ComboBlock['source'][] = ['spell', 'weapon', 'feature', 'item', 'custom']

const PRIORITY_OPTIONS: ToyboxTactic['priority'][] = ['critical', 'high', 'normal']

// ─── Inline text input styling ───
const inputCls = [
  'w-full min-h-[44px] px-3 py-2 rounded-xl',
  'bg-white/[0.04] border border-white/10 text-forge-0 text-sm',
  'placeholder:text-forge-2',
  'focus:border-arcane/50 focus:bg-white/[0.06] outline-none',
  'transition-colors duration-200',
].join(' ')

const textareaCls = [
  inputCls,
  'resize-none',
].join(' ')

// ─── Main Component ───

export function ToyboxPanel({
  isOpen,
  onClose,
  character,
  onOpenDice,
  onUseSlot,
  concentratingOn,
}: ToyboxPanelProps) {
  // ── Core state — load from localStorage immediately so data survives remounts ──
  const [data, setData] = useState<ToyboxData>(() => loadToybox(character.id))
  const [activeTab, setActiveTab] = useState<TabId>('combos')
  const [comboFilter, setComboFilter] = useState<ComboCategory | 'all'>('all')
  const [tacticFilter, setTacticFilter] = useState<TacticCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Form state ──
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editId, setEditId] = useState<string | null>(null)

  // ── Deploy state ──
  const [deployCombo, setDeployCombo] = useState<ToyboxCombo | null>(null)

  // ── AI state ──
  const { loading: aiLoading, query: aiQuery, queryStructured } = useAI()
  const [aiSuggestions, setAiSuggestions] = useState<unknown[] | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // ── Combo form fields ──
  const [comboName, setComboName] = useState('')
  const [comboDesc, setComboDesc] = useState('')
  const [comboBlocks, setComboBlocks] = useState<ComboBlock[]>([])
  const [comboTags, setComboTags] = useState<string[]>([])
  const [comboCategory, setComboCategory] = useState<ComboCategory | undefined>(undefined)
  const [comboTagInput, setComboTagInput] = useState('')

  // ── Block sub-form ──
  const [blockFormOpen, setBlockFormOpen] = useState(false)
  const [blockType, setBlockType] = useState<ComboBlock['type']>('action')
  const [blockLabel, setBlockLabel] = useState('')
  const [blockSource, setBlockSource] = useState<ComboBlock['source']>('spell')
  const [blockSourceName, setBlockSourceName] = useState('')
  const [blockNotes, setBlockNotes] = useState('')

  // ── Tactic form fields ──
  const [tacticName, setTacticName] = useState('')
  const [tacticTrigger, setTacticTrigger] = useState('')
  const [tacticActions, setTacticActions] = useState<string[]>([''])
  const [tacticPriority, setTacticPriority] = useState<ToyboxTactic['priority']>('normal')
  const [tacticTags, setTacticTags] = useState<string[]>([])
  const [tacticCategory, setTacticCategory] = useState<TacticCategory | undefined>(undefined)
  const [tacticTagInput, setTacticTagInput] = useState('')

  // ── Persona form fields ──
  const [personaName, setPersonaName] = useState('')
  const [personaSituation, setPersonaSituation] = useState('')
  const [personaApproach, setPersonaApproach] = useState('')
  const [personaPhrases, setPersonaPhrases] = useState<string[]>([''])
  const [personaSkillCheck, setPersonaSkillCheck] = useState('')
  const [personaTags, setPersonaTags] = useState<string[]>([])
  const [personaTagInput, setPersonaTagInput] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)

  // ── Reload data when character changes (always, not just when open) ──
  useEffect(() => {
    setData(loadToybox(character.id))
  }, [character.id])

  // ── Persist helper ──
  const persist = useCallback(
    (updated: ToyboxData) => {
      setData(updated)
      saveToybox(character.id, updated)
    },
    [character.id],
  )

  // ── Close forms helper ──
  const closeForm = useCallback(() => {
    setFormMode('closed')
    setEditId(null)
    resetComboForm()
    resetTacticForm()
    resetPersonaForm()
    setBlockFormOpen(false)
    setAiSuggestions(null)
    setAiError(null)
  }, [])

  // ── Escape key handler ──
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (deployCombo) {
          setDeployCombo(null)
        } else if (formMode !== 'closed') {
          closeForm()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, formMode, deployCombo, closeForm, onClose])

  // ── Form reset helpers ──
  function resetComboForm() {
    setComboName('')
    setComboDesc('')
    setComboBlocks([])
    setComboTags([])
    setComboCategory(undefined)
    setComboTagInput('')
    resetBlockSubForm()
  }

  function resetBlockSubForm() {
    setBlockType('action')
    setBlockLabel('')
    setBlockSource('spell')
    setBlockSourceName('')
    setBlockNotes('')
    setBlockFormOpen(false)
  }

  function resetTacticForm() {
    setTacticName('')
    setTacticTrigger('')
    setTacticActions([''])
    setTacticPriority('normal')
    setTacticTags([])
    setTacticCategory(undefined)
    setTacticTagInput('')
  }

  function resetPersonaForm() {
    setPersonaName('')
    setPersonaSituation('')
    setPersonaApproach('')
    setPersonaPhrases([''])
    setPersonaSkillCheck('')
    setPersonaTags([])
    setPersonaTagInput('')
  }

  // ── Populate form for editing ──
  function startEditCombo(combo: ToyboxCombo) {
    setFormMode('edit')
    setEditId(combo.id)
    setComboName(combo.name)
    setComboDesc(combo.description ?? '')
    setComboBlocks([...combo.blocks])
    setComboTags([...combo.tags])
    setComboCategory(combo.category)
  }

  function startEditTactic(tactic: ToyboxTactic) {
    setFormMode('edit')
    setEditId(tactic.id)
    setTacticName(tactic.name)
    setTacticTrigger(tactic.trigger)
    setTacticActions([...tactic.actions])
    setTacticPriority(tactic.priority)
    setTacticTags([...tactic.tags])
    setTacticCategory(tactic.category)
  }

  function startEditPersona(play: ToyboxPersonaPlay) {
    setFormMode('edit')
    setEditId(play.id)
    setPersonaName(play.name)
    setPersonaSituation(play.situation)
    setPersonaApproach(play.approach)
    setPersonaPhrases(play.keyPhrases.length > 0 ? [...play.keyPhrases] : [''])
    setPersonaSkillCheck(play.skillCheck ?? '')
    setPersonaTags([...play.tags])
  }

  // ═════════════════════════════════════════
  // COMBO CRUD
  // ═════════════════════════════════════════

  function saveCombo() {
    if (!comboName.trim()) return
    if (formMode === 'edit' && editId) {
      persist(updateComboInData(data, editId, {
        name: comboName.trim(),
        description: comboDesc.trim() || undefined,
        blocks: comboBlocks,
        tags: comboTags,
        category: comboCategory,
      }))
    } else {
      const combo: ToyboxCombo = {
        id: generateId(),
        name: comboName.trim(),
        description: comboDesc.trim() || undefined,
        blocks: comboBlocks,
        tags: comboTags,
        favorite: false,
        createdAt: Date.now(),
        category: comboCategory,
      }
      persist(addComboToData(data, combo))
    }
    closeForm()
  }

  function deleteCombo(id: string) {
    persist(deleteComboFromData(data, id))
  }

  function toggleComboFavorite(id: string) {
    const combo = data.combos.find(c => c.id === id)
    if (combo) persist(updateComboInData(data, id, { favorite: !combo.favorite }))
  }

  // ── Block sub-form CRUD ──
  function addBlock() {
    if (!blockLabel.trim()) return
    const block: ComboBlock = {
      id: generateId(),
      type: blockType,
      label: blockLabel.trim(),
      source: blockSource,
      sourceName: blockSourceName.trim() || undefined,
      notes: blockNotes.trim() || undefined,
    }
    setComboBlocks(prev => [...prev, block])
    resetBlockSubForm()
  }

  function removeBlock(id: string) {
    setComboBlocks(prev => prev.filter(b => b.id !== id))
  }

  // ═════════════════════════════════════════
  // TACTIC CRUD
  // ═════════════════════════════════════════

  function saveTacticItem() {
    if (!tacticName.trim()) return
    const filteredActions = tacticActions.filter(a => a.trim())
    if (formMode === 'edit' && editId) {
      persist(updateTacticInData(data, editId, {
        name: tacticName.trim(),
        trigger: tacticTrigger.trim(),
        actions: filteredActions,
        priority: tacticPriority,
        tags: tacticTags,
        category: tacticCategory,
      }))
    } else {
      const tactic: ToyboxTactic = {
        id: generateId(),
        name: tacticName.trim(),
        trigger: tacticTrigger.trim(),
        actions: filteredActions,
        priority: tacticPriority,
        tags: tacticTags,
        favorite: false,
        createdAt: Date.now(),
        category: tacticCategory,
      }
      persist(addTacticToData(data, tactic))
    }
    closeForm()
  }

  function deleteTacticItem(id: string) {
    persist(deleteTacticFromData(data, id))
  }

  function toggleTacticFavorite(id: string) {
    const tactic = data.tactics.find(t => t.id === id)
    if (tactic) persist(updateTacticInData(data, id, { favorite: !tactic.favorite }))
  }

  // ═════════════════════════════════════════
  // PERSONA PLAY CRUD
  // ═════════════════════════════════════════

  function savePersonaItem() {
    if (!personaName.trim()) return
    const filteredPhrases = personaPhrases.filter(p => p.trim())
    if (formMode === 'edit' && editId) {
      persist(updatePersonaPlayInData(data, editId, {
        name: personaName.trim(),
        situation: personaSituation.trim(),
        approach: personaApproach.trim(),
        keyPhrases: filteredPhrases,
        skillCheck: personaSkillCheck.trim() || undefined,
        tags: personaTags,
      }))
    } else {
      const play: ToyboxPersonaPlay = {
        id: generateId(),
        name: personaName.trim(),
        situation: personaSituation.trim(),
        approach: personaApproach.trim(),
        keyPhrases: filteredPhrases,
        skillCheck: personaSkillCheck.trim() || undefined,
        tags: personaTags,
        favorite: false,
        createdAt: Date.now(),
      }
      persist(addPersonaPlayToData(data, play))
    }
    closeForm()
  }

  function deletePersonaItem(id: string) {
    persist(deletePersonaPlayFromData(data, id))
  }

  function togglePersonaFavorite(id: string) {
    const play = data.personaPlays.find(p => p.id === id)
    if (play) persist(updatePersonaPlayInData(data, id, { favorite: !play.favorite }))
  }

  // ═════════════════════════════════════════
  // AI SUGGEST
  // ═════════════════════════════════════════

  async function handleAISuggest() {
    setAiError(null)
    setAiSuggestions(null)
    try {
      if (activeTab === 'combos') {
        const prompt = SYSTEM_PROMPTS.comboSuggester(character, comboBlocks)
        const result = await queryStructured<{ suggestions: unknown[] }>(prompt, 'Suggest combos for my character')
        setAiSuggestions(result.suggestions ?? [])
      } else if (activeTab === 'tactics') {
        const prompt = SYSTEM_PROMPTS.tacticSuggester(character)
        const result = await queryStructured<{ suggestions: unknown[] }>(prompt, 'Suggest tactics for my character')
        setAiSuggestions(result.suggestions ?? [])
      } else if (activeTab === 'persona') {
        const prompt = SYSTEM_PROMPTS.personaPlaySuggester(character)
        const result = await queryStructured<{ suggestions: unknown[] }>(prompt, 'Suggest persona plays for my character')
        setAiSuggestions(result.suggestions ?? [])
      }
    } catch {
      setAiError('AI suggestion failed. Check your AI settings and try again.')
    }
  }

  function adoptComboSuggestion(suggestion: Record<string, unknown>) {
    const combo: ToyboxCombo = {
      id: generateId(),
      name: (suggestion.name as string) ?? 'Untitled Combo',
      description: (suggestion.description as string) ?? undefined,
      blocks: Array.isArray(suggestion.blocks)
        ? (suggestion.blocks as Record<string, unknown>[]).map(b => ({
            id: generateId(),
            type: (b.type as ComboBlock['type']) ?? 'action',
            label: (b.label as string) ?? '',
            source: (b.source as ComboBlock['source']) ?? 'custom',
            sourceName: (b.sourceName as string) ?? undefined,
            notes: (b.notes as string) ?? undefined,
          }))
        : [],
      tags: Array.isArray(suggestion.tags) ? (suggestion.tags as string[]) : [],
      favorite: false,
      createdAt: Date.now(),
      category: (suggestion.category as ComboCategory) ?? undefined,
    }
    persist(addComboToData(data, combo))
    setAiSuggestions(null)
  }

  function adoptTacticSuggestion(suggestion: Record<string, unknown>) {
    const tactic: ToyboxTactic = {
      id: generateId(),
      name: (suggestion.name as string) ?? 'Untitled Tactic',
      trigger: (suggestion.trigger as string) ?? '',
      actions: Array.isArray(suggestion.actions) ? (suggestion.actions as string[]) : [],
      priority: (suggestion.priority as ToyboxTactic['priority']) ?? 'normal',
      tags: Array.isArray(suggestion.tags) ? (suggestion.tags as string[]) : [],
      favorite: false,
      createdAt: Date.now(),
      category: (suggestion.category as TacticCategory) ?? undefined,
    }
    persist(addTacticToData(data, tactic))
    setAiSuggestions(null)
  }

  function adoptPersonaSuggestion(suggestion: Record<string, unknown>) {
    const play: ToyboxPersonaPlay = {
      id: generateId(),
      name: (suggestion.name as string) ?? 'Untitled Play',
      situation: (suggestion.situation as string) ?? '',
      approach: (suggestion.approach as string) ?? '',
      keyPhrases: Array.isArray(suggestion.keyPhrases) ? (suggestion.keyPhrases as string[]) : [],
      skillCheck: (suggestion.skillCheck as string) ?? undefined,
      tags: Array.isArray(suggestion.tags) ? (suggestion.tags as string[]) : [],
      favorite: false,
      createdAt: Date.now(),
    }
    persist(addPersonaPlayToData(data, play))
    setAiSuggestions(null)
  }

  // ─── Tag input helpers ───

  function handleTagKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    tagInput: string,
    setTagInput: (v: string) => void,
    tags: string[],
    setTags: (v: string[]) => void,
  ) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(/,/g, '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
      }
      setTagInput('')
    }
  }

  function removeTag(tags: string[], setTags: (v: string[]) => void, tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  // ─── Filtered data ───

  const filteredCombos = comboFilter === 'all'
    ? data.combos
    : data.combos.filter(c => c.category === comboFilter)

  const filteredTactics = tacticFilter === 'all'
    ? data.tactics
    : data.tactics.filter(t => t.category === tacticFilter)

  // ─── Don't render when closed ───

  if (!isOpen) return null

  // ─── Deploy overlay ───
  if (deployCombo) {
    return (
      <DeployView
        combo={deployCombo}
        onClose={() => setDeployCombo(null)}
        onOpenDice={onOpenDice}
        onUseSlot={onUseSlot}
        concentratingOn={concentratingOn}
      />
    )
  }

  // ═════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-void-0/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50',
          'w-full max-w-xl bg-void-1 border-l border-white/[0.08] shadow-xl',
          'overflow-y-auto',
          'transition-transform duration-300 ease-forge',
          'translate-x-0',
        )}
        role="dialog"
        aria-label="The Toybox"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-void-1/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-forge-0 tracking-tight">
              The Toybox
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAISuggest}
                disabled={aiLoading}
                aria-label="AI Suggest"
              >
                {aiLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Suggest
              </Button>
              <button
                onClick={onClose}
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center',
                  'rounded-xl text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
                aria-label="Close The Toybox"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex mt-3 border-b border-white/[0.06]">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); closeForm(); setAiSuggestions(null); setAiError(null) }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium',
                  'min-h-[44px] transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  activeTab === id
                    ? 'text-arcane border-b-2 border-arcane'
                    : 'text-forge-2 hover:text-forge-1',
                )}
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── AI Error ── */}
        {aiError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-400/10 border border-red-400/20 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{aiError}</p>
          </div>
        )}

        {/* ── AI Suggestions ── */}
        {aiSuggestions && aiSuggestions.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            <p className="text-xs font-semibold text-arcane uppercase tracking-wider">AI Suggestions</p>
            {aiSuggestions.map((suggestion, i) => {
              const s = suggestion as Record<string, unknown>
              return (
                <GlassCard key={i} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold text-forge-0 truncate">
                        {(s.name as string) ?? 'Suggestion'}
                      </p>
                      {typeof s.description === 'string' && s.description && (
                        <p className="text-xs text-forge-2 mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                      {typeof s.trigger === 'string' && s.trigger && (
                        <p className="text-xs text-forge-2 mt-1 italic">
                          When: {s.trigger}
                        </p>
                      )}
                      {typeof s.situation === 'string' && s.situation && (
                        <p className="text-xs text-forge-2 mt-1 italic">
                          Situation: {s.situation}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (activeTab === 'combos') adoptComboSuggestion(s)
                        else if (activeTab === 'tactics') adoptTacticSuggestion(s)
                        else adoptPersonaSuggestion(s)
                      }}
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                </GlassCard>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAiSuggestions(null)}
              className="w-full"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* ── Content ── */}
        <div className="px-4 py-4 space-y-3">
          {/* ════════════════════════════════════════════
              COMBOS TAB
              ════════════════════════════════════════════ */}
          {activeTab === 'combos' && (
            <>
              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {COMBO_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setComboFilter(c.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border',
                      'min-h-[34px] transition-all duration-200 ease-forge',
                      'active:scale-[0.97]',
                      comboFilter === c.value
                        ? 'bg-arcane/15 border-arcane/30 text-arcane'
                        : 'bg-white/[0.04] border-white/10 text-forge-2 hover:text-forge-1',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Combo list or empty state */}
              {filteredCombos.length === 0 && formMode === 'closed' ? (
                <EmptyState
                  icon={Swords}
                  title="No combos yet"
                  description="Build multi-step action combos for your character"
                  onAdd={() => { setFormMode('create'); resetComboForm() }}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    {filteredCombos.map(combo => (
                      <ComboCard
                        key={combo.id}
                        combo={combo}
                        expanded={expandedId === combo.id}
                        onToggleExpand={() => setExpandedId(expandedId === combo.id ? null : combo.id)}
                        onToggleFavorite={() => toggleComboFavorite(combo.id)}
                        onEdit={() => startEditCombo(combo)}
                        onDelete={() => deleteCombo(combo.id)}
                        onDeploy={() => setDeployCombo(combo)}
                      />
                    ))}
                  </div>

                  {/* FAB */}
                  {formMode === 'closed' && (
                    <button
                      onClick={() => { setFormMode('create'); resetComboForm() }}
                      className={cn(
                        'fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-2xl',
                        'bg-arcane/90 text-void-0 shadow-lg shadow-arcane/25',
                        'flex items-center justify-center',
                        'transition-all duration-200 ease-forge',
                        'hover:bg-arcane hover:shadow-arcane/40 hover:scale-105',
                        'active:scale-95',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      )}
                      aria-label="Create new combo"
                    >
                      <Plus size={24} aria-hidden />
                    </button>
                  )}
                </>
              )}

              {/* ── Combo Form ── */}
              {formMode !== 'closed' && activeTab === 'combos' && (
                <GlassCard className="space-y-3">
                  <p className="font-display text-sm font-semibold text-forge-0">
                    {formMode === 'edit' ? 'Edit Combo' : 'New Combo'}
                  </p>

                  <input
                    type="text"
                    placeholder="Combo name"
                    value={comboName}
                    onChange={e => setComboName(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />

                  <textarea
                    placeholder="Description (optional)"
                    value={comboDesc}
                    onChange={e => setComboDesc(e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />

                  {/* Category selector */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMBO_CATEGORIES.filter(c => c.value !== 'all').map(c => (
                        <button
                          key={c.value}
                          onClick={() => setComboCategory(comboCategory === c.value ? undefined : c.value as ComboCategory)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border',
                            'min-h-[34px] transition-all duration-200 ease-forge',
                            'active:scale-[0.97]',
                            comboCategory === c.value
                              ? 'bg-arcane/15 border-arcane/30 text-arcane'
                              : 'bg-white/[0.04] border-white/10 text-forge-2 hover:text-forge-1',
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blocks list */}
                  {comboBlocks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-forge-2">Steps</p>
                      {comboBlocks.map((block, i) => (
                        <div
                          key={block.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <span className="text-xs font-semibold text-forge-2 w-5 text-center">{i + 1}</span>
                          <span className={cn('text-xs font-semibold uppercase px-1.5 py-0.5 rounded border', BLOCK_TYPE_COLORS[block.type])}>
                            {block.type}
                          </span>
                          <span className="text-sm text-forge-0 truncate flex-1">{block.label}</span>
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="min-w-[34px] min-h-[34px] flex items-center justify-center text-forge-2 hover:text-red-400 transition-colors active:scale-[0.97]"
                            aria-label={`Remove step ${i + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Block sub-form */}
                  {blockFormOpen ? (
                    <div className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-forge-2 font-semibold">Add Step</p>

                      {/* Block type pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {BLOCK_TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => setBlockType(t)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border',
                              'min-h-[34px] transition-all duration-200',
                              'active:scale-[0.97]',
                              blockType === t
                                ? BLOCK_TYPE_COLORS[t]
                                : 'bg-white/[0.04] border-white/10 text-forge-2',
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="What does this step do?"
                        value={blockLabel}
                        onChange={e => setBlockLabel(e.target.value)}
                        className={inputCls}
                      />

                      {/* Source selector */}
                      <div className="flex flex-wrap gap-1.5">
                        {BLOCK_SOURCE_OPTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => setBlockSource(s)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-medium capitalize border',
                              'min-h-[34px] transition-all duration-200',
                              'active:scale-[0.97]',
                              blockSource === s
                                ? 'bg-eldritch/15 border-eldritch/30 text-eldritch'
                                : 'bg-white/[0.04] border-white/10 text-forge-2',
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Source name (e.g. Fireball)"
                        value={blockSourceName}
                        onChange={e => setBlockSourceName(e.target.value)}
                        className={inputCls}
                      />

                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={blockNotes}
                        onChange={e => setBlockNotes(e.target.value)}
                        className={inputCls}
                      />

                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={addBlock} disabled={!blockLabel.trim()}>
                          Add Step
                        </Button>
                        <Button variant="ghost" size="sm" onClick={resetBlockSubForm}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setBlockFormOpen(true)}>
                      <Plus size={14} />
                      Add Step
                    </Button>
                  )}

                  {/* Tags */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {comboTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-forge-1">
                          {tag}
                          <button
                            onClick={() => removeTag(comboTags, setComboTags, tag)}
                            className="text-forge-2 hover:text-red-400 transition-colors"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add tag (press Enter)"
                      value={comboTagInput}
                      onChange={e => setComboTagInput(e.target.value)}
                      onKeyDown={e => handleTagKeyDown(e, comboTagInput, setComboTagInput, comboTags, setComboTags)}
                      className={inputCls}
                    />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" size="sm" onClick={saveCombo} disabled={!comboName.trim()}>
                      {formMode === 'edit' ? 'Save Changes' : 'Create Combo'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={closeForm}>
                      Cancel
                    </Button>
                  </div>
                </GlassCard>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════
              TACTICS TAB
              ════════════════════════════════════════════ */}
          {activeTab === 'tactics' && (
            <>
              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {TACTIC_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setTacticFilter(c.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border',
                      'min-h-[34px] transition-all duration-200 ease-forge',
                      'active:scale-[0.97]',
                      tacticFilter === c.value
                        ? 'bg-arcane/15 border-arcane/30 text-arcane'
                        : 'bg-white/[0.04] border-white/10 text-forge-2 hover:text-forge-1',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Tactic list or empty state */}
              {filteredTactics.length === 0 && formMode === 'closed' ? (
                <EmptyState
                  icon={Target}
                  title="No tactics yet"
                  description="Create if-then playbooks for combat situations"
                  onAdd={() => { setFormMode('create'); resetTacticForm() }}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    {filteredTactics.map(tactic => (
                      <TacticCard
                        key={tactic.id}
                        tactic={tactic}
                        expanded={expandedId === tactic.id}
                        onToggleExpand={() => setExpandedId(expandedId === tactic.id ? null : tactic.id)}
                        onToggleFavorite={() => toggleTacticFavorite(tactic.id)}
                        onEdit={() => startEditTactic(tactic)}
                        onDelete={() => deleteTacticItem(tactic.id)}
                      />
                    ))}
                  </div>

                  {/* FAB */}
                  {formMode === 'closed' && (
                    <button
                      onClick={() => { setFormMode('create'); resetTacticForm() }}
                      className={cn(
                        'fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-2xl',
                        'bg-arcane/90 text-void-0 shadow-lg shadow-arcane/25',
                        'flex items-center justify-center',
                        'transition-all duration-200 ease-forge',
                        'hover:bg-arcane hover:shadow-arcane/40 hover:scale-105',
                        'active:scale-95',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      )}
                      aria-label="Create new tactic"
                    >
                      <Plus size={24} aria-hidden />
                    </button>
                  )}
                </>
              )}

              {/* ── Tactic Form ── */}
              {formMode !== 'closed' && activeTab === 'tactics' && (
                <GlassCard className="space-y-3">
                  <p className="font-display text-sm font-semibold text-forge-0">
                    {formMode === 'edit' ? 'Edit Tactic' : 'New Tactic'}
                  </p>

                  <input
                    type="text"
                    placeholder="Tactic name"
                    value={tacticName}
                    onChange={e => setTacticName(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />

                  <input
                    type="text"
                    placeholder="Trigger (e.g. When HP drops below 25%)"
                    value={tacticTrigger}
                    onChange={e => setTacticTrigger(e.target.value)}
                    className={inputCls}
                  />

                  {/* Actions list */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Actions</p>
                    <div className="space-y-1.5">
                      {tacticActions.map((action, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-xs text-forge-2 mt-3 w-5 text-center shrink-0">{i + 1}.</span>
                          <input
                            type="text"
                            placeholder={`Action step ${i + 1}`}
                            value={action}
                            onChange={e => {
                              const updated = [...tacticActions]
                              updated[i] = e.target.value
                              setTacticActions(updated)
                            }}
                            className={cn(inputCls, 'flex-1')}
                          />
                          {tacticActions.length > 1 && (
                            <button
                              onClick={() => setTacticActions(tacticActions.filter((_, j) => j !== i))}
                              className="min-w-[34px] min-h-[34px] flex items-center justify-center text-forge-2 hover:text-red-400 transition-colors active:scale-[0.97]"
                              aria-label={`Remove action ${i + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTacticActions([...tacticActions, ''])}
                      className="mt-1.5"
                    >
                      <Plus size={14} />
                      Add Action
                    </Button>
                  </div>

                  {/* Priority */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Priority</p>
                    <div className="flex gap-1.5">
                      {PRIORITY_OPTIONS.map(p => (
                        <button
                          key={p}
                          onClick={() => setTacticPriority(p)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border capitalize',
                            'min-h-[34px] transition-all duration-200 ease-forge',
                            'active:scale-[0.97]',
                            tacticPriority === p
                              ? p === 'critical'
                                ? 'bg-red-400/15 border-red-400/30 text-red-400'
                                : p === 'high'
                                  ? 'bg-ember/15 border-ember/30 text-ember'
                                  : 'bg-arcane/15 border-arcane/30 text-arcane'
                              : 'bg-white/[0.04] border-white/10 text-forge-2 hover:text-forge-1',
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TACTIC_CATEGORIES.filter(c => c.value !== 'all').map(c => (
                        <button
                          key={c.value}
                          onClick={() => setTacticCategory(tacticCategory === c.value ? undefined : c.value as TacticCategory)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border',
                            'min-h-[34px] transition-all duration-200 ease-forge',
                            'active:scale-[0.97]',
                            tacticCategory === c.value
                              ? 'bg-arcane/15 border-arcane/30 text-arcane'
                              : 'bg-white/[0.04] border-white/10 text-forge-2 hover:text-forge-1',
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {tacticTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-forge-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tacticTags, setTacticTags, tag)}
                            className="text-forge-2 hover:text-red-400 transition-colors"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add tag (press Enter)"
                      value={tacticTagInput}
                      onChange={e => setTacticTagInput(e.target.value)}
                      onKeyDown={e => handleTagKeyDown(e, tacticTagInput, setTacticTagInput, tacticTags, setTacticTags)}
                      className={inputCls}
                    />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" size="sm" onClick={saveTacticItem} disabled={!tacticName.trim()}>
                      {formMode === 'edit' ? 'Save Changes' : 'Create Tactic'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={closeForm}>
                      Cancel
                    </Button>
                  </div>
                </GlassCard>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════
              PERSONA TAB
              ════════════════════════════════════════════ */}
          {activeTab === 'persona' && (
            <>
              {/* Persona play list or empty state */}
              {data.personaPlays.length === 0 && formMode === 'closed' ? (
                <EmptyState
                  icon={Drama}
                  title="No persona plays yet"
                  description="Create social strategies and roleplay playbooks"
                  onAdd={() => { setFormMode('create'); resetPersonaForm() }}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    {data.personaPlays.map(play => (
                      <PersonaPlayCard
                        key={play.id}
                        play={play}
                        expanded={expandedId === play.id}
                        onToggleExpand={() => setExpandedId(expandedId === play.id ? null : play.id)}
                        onToggleFavorite={() => togglePersonaFavorite(play.id)}
                        onEdit={() => startEditPersona(play)}
                        onDelete={() => deletePersonaItem(play.id)}
                      />
                    ))}
                  </div>

                  {/* FAB */}
                  {formMode === 'closed' && (
                    <button
                      onClick={() => { setFormMode('create'); resetPersonaForm() }}
                      className={cn(
                        'fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-2xl',
                        'bg-arcane/90 text-void-0 shadow-lg shadow-arcane/25',
                        'flex items-center justify-center',
                        'transition-all duration-200 ease-forge',
                        'hover:bg-arcane hover:shadow-arcane/40 hover:scale-105',
                        'active:scale-95',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      )}
                      aria-label="Create new persona play"
                    >
                      <Plus size={24} aria-hidden />
                    </button>
                  )}
                </>
              )}

              {/* ── Persona Form ── */}
              {formMode !== 'closed' && activeTab === 'persona' && (
                <GlassCard className="space-y-3">
                  <p className="font-display text-sm font-semibold text-forge-0">
                    {formMode === 'edit' ? 'Edit Persona Play' : 'New Persona Play'}
                  </p>

                  <input
                    type="text"
                    placeholder="Play name (e.g. The Pious Deflection)"
                    value={personaName}
                    onChange={e => setPersonaName(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />

                  <textarea
                    placeholder="Situation (when to use this play)"
                    value={personaSituation}
                    onChange={e => setPersonaSituation(e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />

                  <textarea
                    placeholder="Approach (how to execute)"
                    value={personaApproach}
                    onChange={e => setPersonaApproach(e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />

                  {/* Key phrases */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Key Phrases</p>
                    <div className="space-y-1.5">
                      {personaPhrases.map((phrase, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Phrase ${i + 1}`}
                            value={phrase}
                            onChange={e => {
                              const updated = [...personaPhrases]
                              updated[i] = e.target.value
                              setPersonaPhrases(updated)
                            }}
                            className={cn(inputCls, 'flex-1')}
                          />
                          {personaPhrases.length > 1 && (
                            <button
                              onClick={() => setPersonaPhrases(personaPhrases.filter((_, j) => j !== i))}
                              className="min-w-[34px] min-h-[34px] flex items-center justify-center text-forge-2 hover:text-red-400 transition-colors active:scale-[0.97]"
                              aria-label={`Remove phrase ${i + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPersonaPhrases([...personaPhrases, ''])}
                      className="mt-1.5"
                    >
                      <Plus size={14} />
                      Add Phrase
                    </Button>
                  </div>

                  {/* Skill check */}
                  <input
                    type="text"
                    placeholder="Skill check (e.g. Persuasion, Deception)"
                    value={personaSkillCheck}
                    onChange={e => setPersonaSkillCheck(e.target.value)}
                    className={inputCls}
                  />

                  {/* Tags */}
                  <div>
                    <p className="text-xs text-forge-2 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {personaTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-forge-1">
                          {tag}
                          <button
                            onClick={() => removeTag(personaTags, setPersonaTags, tag)}
                            className="text-forge-2 hover:text-red-400 transition-colors"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add tag (press Enter)"
                      value={personaTagInput}
                      onChange={e => setPersonaTagInput(e.target.value)}
                      onKeyDown={e => handleTagKeyDown(e, personaTagInput, setPersonaTagInput, personaTags, setPersonaTags)}
                      className={inputCls}
                    />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" size="sm" onClick={savePersonaItem} disabled={!personaName.trim()}>
                      {formMode === 'edit' ? 'Save Changes' : 'Create Play'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={closeForm}>
                      Cancel
                    </Button>
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ==========================================================================
   EMPTY STATE — Reusable empty state card
   ========================================================================== */

function EmptyState({
  icon: Icon,
  title,
  description,
  onAdd,
}: {
  icon: typeof Swords
  title: string
  description: string
  onAdd: () => void
}) {
  return (
    <GlassCard className="flex flex-col items-center text-center py-8 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <Icon size={24} className="text-forge-2" aria-hidden />
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-forge-0">{title}</p>
        <p className="text-xs text-forge-2 mt-1">{description}</p>
      </div>
      <Button variant="primary" size="sm" onClick={onAdd}>
        <Plus size={14} />
        Create First
      </Button>
    </GlassCard>
  )
}

/* ==========================================================================
   PERSONA PLAY CARD — Expandable persona play card
   ========================================================================== */

function PersonaPlayCard({
  play,
  expanded,
  onToggleExpand,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  play: ToyboxPersonaPlay
  expanded: boolean
  onToggleExpand: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header Row */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'transition-all duration-200 ease-forge active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
        aria-expanded={expanded}
      >
        {/* Favorite star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg',
            'transition-all duration-200 ease-forge active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
          aria-label={play.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              play.favorite ? 'text-ember fill-ember' : 'text-forge-2/40',
            )}
          />
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="font-display text-forge-0 font-semibold text-sm truncate block">
            {play.name}
          </span>
        </div>

        {/* Skill check badge */}
        {play.skillCheck && (
          <Badge variant="eldritch" className="flex-shrink-0">
            {play.skillCheck}
          </Badge>
        )}

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-forge-2 flex-shrink-0 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 text-forge-2 flex-shrink-0 transition-transform duration-200" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="animate-fade-in">
          <div className="px-4 pb-4 space-y-3">
            {/* Hairline divider */}
            <div className="h-px bg-white/[0.08]" />

            {/* Situation */}
            {play.situation && (
              <div>
                <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-0.5">Situation</p>
                <p className="text-sm text-forge-1 leading-snug">{play.situation}</p>
              </div>
            )}

            {/* Approach */}
            {play.approach && (
              <div>
                <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-0.5">Approach</p>
                <p className="text-sm text-forge-1 leading-snug">{play.approach}</p>
              </div>
            )}

            {/* Key phrases */}
            {play.keyPhrases.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-1">Key Phrases</p>
                <div className="space-y-1">
                  {play.keyPhrases.map((phrase, i) => (
                    <p key={i} className="text-sm text-forge-0 italic pl-3 border-l-2 border-eldritch/30">
                      &ldquo;{phrase}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {play.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {play.tags.map(tag => (
                  <Badge key={tag} variant="neutral">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                aria-label="Edit persona play"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="hover:text-red-400"
                aria-label="Delete persona play"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
