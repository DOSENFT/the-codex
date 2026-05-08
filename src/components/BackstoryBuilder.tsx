import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Loader2,
  AlertTriangle,
  Scroll,
  Users,
  BrainCircuit,
  Feather,
  Link2,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character, Backstory, BackstoryMemory } from '../lib/character'
import { generateId } from '../lib/character'
import { Button } from './ui/Button'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BackstoryBuilderProps {
  character: Character
  onUpdate: (character: Character) => void
  onStartDrill?: (memory: BackstoryMemory) => void
}

type SectionId = 'origin' | 'memories' | 'relationships' | 'threads' | 'seeds'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EMOTIONAL_CORES = [
  'grief',
  'betrayal',
  'hope',
  'joy',
  'fear',
  'rage',
  'wonder',
  'shame',
  'pride',
  'loss',
] as const

type EmotionalCore = (typeof EMOTIONAL_CORES)[number]

const EMOTIONAL_CORE_VARIANTS: Record<EmotionalCore, 'neutral' | 'verdant' | 'ember' | 'arcane' | 'eldritch'> = {
  grief: 'neutral',
  betrayal: 'ember',
  hope: 'verdant',
  joy: 'verdant',
  fear: 'ember',
  rage: 'ember',
  wonder: 'arcane',
  shame: 'neutral',
  pride: 'eldritch',
  loss: 'neutral',
}

const RELATIONSHIP_STATUSES = ['alive', 'dead', 'unknown', 'missing'] as const

type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number]

const STATUS_VARIANTS: Record<RelationshipStatus, 'verdant' | 'ember' | 'neutral' | 'eldritch'> = {
  alive: 'verdant',
  dead: 'ember',
  unknown: 'neutral',
  missing: 'eldritch',
}

/* ------------------------------------------------------------------ */
/*  Helper: ensure backstory exists                                    */
/* ------------------------------------------------------------------ */

function ensureBackstory(char: Character): Backstory {
  return char.backstory ?? {
    origin: '',
    keyMemories: [],
    relationships: [],
    unresolvedThreads: [],
    personalitySeeds: [],
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Collapsible Section                                 */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
  count,
}: {
  title: string
  icon: typeof Scroll
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <ParchmentCard>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 min-h-[44px]',
          'text-left select-none',
          'transition-colors duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          'active:scale-[0.99]',
        )}
      >
        {expanded ? (
          <ChevronDown size={16} className="text-ember shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={16} className="text-forge-2 shrink-0" aria-hidden />
        )}
        <Icon size={16} className="text-ember shrink-0" aria-hidden />
        <span className="font-display text-sm font-semibold text-forge-0 flex-1">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant="neutral">{count}</Badge>
        )}
      </button>
      {expanded && (
        <div className="mt-4 flex flex-col gap-4 animate-fade-in">
          {children}
        </div>
      )}
    </ParchmentCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Simple List Editor                                  */
/* ------------------------------------------------------------------ */

function SimpleListEditor({
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  items: string[]
  onAdd: (text: string) => void
  onRemove: (idx: number) => void
  placeholder: string
}) {
  const [newItem, setNewItem] = useState('')

  function handleAdd() {
    if (!newItem.trim()) return
    onAdd(newItem.trim())
    setNewItem('')
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <li
              key={idx}
              className={cn(
                'combat-card flex items-center gap-2 rounded-lg px-3 py-2',
                'bg-gold/[0.03] border border-gold/20',
                'text-sm text-forge-1',
              )}
            >
              <span className="flex-1 leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className={cn(
                  'min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg',
                  'text-forge-2 hover:text-red-400',
                  'transition-colors duration-200',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                )}
                aria-label={`Remove "${item}"`}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'min-h-[44px] flex-1 rounded-xl',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25',
            'font-body text-sm px-4',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
            'focus:outline-none',
          )}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="shrink-0"
        >
          <Plus size={16} aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BackstoryBuilder({ character, onUpdate, onStartDrill }: BackstoryBuilderProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(['origin']),
  )
  const aiHelper = useAI()

  /* Memory form state */
  const [showMemoryForm, setShowMemoryForm] = useState(false)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryDesc, setMemoryDesc] = useState('')
  const [memoryEmotion, setMemoryEmotion] = useState<EmotionalCore>('hope')
  const [memoryNpc, setMemoryNpc] = useState('')

  /* Relationship form state */
  const [showRelForm, setShowRelForm] = useState(false)
  const [relName, setRelName] = useState('')
  const [relRelation, setRelRelation] = useState('')
  const [relStatus, setRelStatus] = useState<RelationshipStatus>('alive')

  const backstory = ensureBackstory(character)

  /* ------ Section Toggle ------ */
  function toggleSection(id: SectionId) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ------ Update Helper ------ */
  function updateBackstory(updates: Partial<Backstory>) {
    onUpdate({
      ...character,
      backstory: {
        ...backstory,
        ...updates,
      },
    })
  }

  /* ------ AI Generate Backstory ------ */
  const handleAIGenerate = useCallback(async () => {
    try {
      const result = await aiHelper.queryStructured<{
        origin: string
        memories: { title: string; description: string; emotionalCore: string; npcInvolved?: string }[]
        relationships: { name: string; relation: string; status: string }[]
      }>(
        SYSTEM_PROMPTS.backstoryHelper(character),
        `Generate a compelling backstory for ${character.name}, a level ${character.level} ${character.race} ${character.class} (${character.subclass}).${character.persona ? ` Their default state is: ${character.persona.defaultState}. Their decision-making priority: ${character.persona.decisionTree}.` : ''}`,
      )

      const updates: Partial<Backstory> = {}

      if (result.origin) {
        updates.origin = result.origin
      }
      if (result.memories?.length) {
        updates.keyMemories = [
          ...backstory.keyMemories,
          ...result.memories.map(m => ({
            id: generateId(),
            title: m.title,
            description: m.description,
            emotionalCore: m.emotionalCore,
            npcInvolved: m.npcInvolved,
          })),
        ]
      }
      if (result.relationships?.length) {
        updates.relationships = [
          ...backstory.relationships,
          ...result.relationships,
        ]
      }

      updateBackstory(updates)

      // Expand all sections to show the results
      setExpandedSections(new Set(['origin', 'memories', 'relationships', 'threads', 'seeds']))
    } catch {
      // error handled by hook
    }
  }, [character, backstory, aiHelper])

  /* ------ Memory CRUD ------ */
  function addMemory() {
    if (!memoryTitle.trim() || !memoryDesc.trim()) return
    const memory: BackstoryMemory = {
      id: generateId(),
      title: memoryTitle.trim(),
      description: memoryDesc.trim(),
      emotionalCore: memoryEmotion,
      npcInvolved: memoryNpc.trim() || undefined,
    }
    updateBackstory({
      keyMemories: [...backstory.keyMemories, memory],
    })
    setMemoryTitle('')
    setMemoryDesc('')
    setMemoryEmotion('hope')
    setMemoryNpc('')
    setShowMemoryForm(false)
  }

  function removeMemory(id: string) {
    updateBackstory({
      keyMemories: backstory.keyMemories.filter(m => m.id !== id),
    })
  }

  /* ------ Relationship CRUD ------ */
  function addRelationship() {
    if (!relName.trim() || !relRelation.trim()) return
    updateBackstory({
      relationships: [
        ...backstory.relationships,
        { name: relName.trim(), relation: relRelation.trim(), status: relStatus },
      ],
    })
    setRelName('')
    setRelRelation('')
    setRelStatus('alive')
    setShowRelForm(false)
  }

  function removeRelationship(idx: number) {
    const updated = [...backstory.relationships]
    updated.splice(idx, 1)
    updateBackstory({ relationships: updated })
  }

  /* ------ Render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <OrnateHeader>Backstory Builder</OrnateHeader>

      {/* AI Generate Button */}
      <Button
        variant="primary"
        size="md"
        onClick={handleAIGenerate}
        loading={aiHelper.loading}
        className="w-full"
      >
        <Sparkles size={16} aria-hidden />
        AI Generate Backstory
      </Button>

      {aiHelper.error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-red-400">{aiHelper.error}</p>
        </div>
      )}

      {aiHelper.loading && (
        <div className="flex flex-col items-center py-6 gap-3">
          <Loader2 size={24} className="animate-spin text-ember" aria-hidden />
          <p className="text-sm text-forge-2">Weaving your tale...</p>
        </div>
      )}

      {/* Divider */}
      <div className="ornate-divider" />

      {/* ================================================================ */}
      {/* Section 1: Origin                                                */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Origin"
        icon={Scroll}
        expanded={expandedSections.has('origin')}
        onToggle={() => toggleSection('origin')}
        count={backstory.origin ? 1 : 0}
      >
        <label htmlFor="backstory-origin" className="text-sm font-medium text-forge-1 select-none">
          Where are you from? Family? Formative event?
        </label>
        <textarea
          id="backstory-origin"
          value={backstory.origin}
          onChange={e => updateBackstory({ origin: e.target.value })}
          onBlur={() => {
            // Auto-save happens through onUpdate, just trigger a save
            if (backstory.origin !== character.backstory?.origin) {
              updateBackstory({ origin: backstory.origin })
            }
          }}
          placeholder="Born in the mountain fortress of Karak-Dum, you were raised by a clan of dwarven smiths who forged weapons for the crown..."
          rows={5}
          className={cn(
            'min-h-[110px] w-full rounded-xl resize-y',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25',
            'font-body text-sm px-4 py-3',
            'transition-all duration-200 ease-forge',
            'focus:border-ember/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
            'focus:outline-none',
          )}
        />
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* Section 2: Key Memories                                          */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Key Memories"
        icon={BrainCircuit}
        expanded={expandedSections.has('memories')}
        onToggle={() => toggleSection('memories')}
        count={backstory.keyMemories.length}
      >
        {/* Existing memories */}
        {backstory.keyMemories.length > 0 && (
          <div className="flex flex-col gap-3">
            {backstory.keyMemories.map(memory => (
              <div
                key={memory.id}
                className={cn(
                  'combat-card rounded-xl p-4',
                  'bg-gold/[0.03] border border-gold/20',
                  'transition-all duration-200',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h4 className="text-sm font-semibold text-forge-0">{memory.title}</h4>
                      <Badge variant={EMOTIONAL_CORE_VARIANTS[memory.emotionalCore as EmotionalCore] ?? 'neutral'}>
                        {memory.emotionalCore}
                      </Badge>
                    </div>
                    <p className="text-sm text-forge-1 leading-relaxed line-clamp-2">
                      {memory.description}
                    </p>
                    {memory.npcInvolved && (
                      <p className="text-xs text-forge-2 mt-1.5">
                        NPC: <span className="text-arcane">{memory.npcInvolved}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onStartDrill && (
                      <button
                        type="button"
                        onClick={() => onStartDrill(memory)}
                        className={cn(
                          'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg',
                          'bg-ember/10 text-ember border border-ember/20',
                          'hover:bg-ember/20 hover:border-ember/30',
                          'transition-all duration-200',
                          'active:scale-[0.95]',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                        )}
                        aria-label={`Relive memory: ${memory.title}`}
                        title="Relive This"
                      >
                        <Play size={16} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMemory(memory.id)}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg',
                        'text-forge-2 hover:text-red-400',
                        'transition-colors duration-200',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                      )}
                      aria-label={`Delete memory: ${memory.title}`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add memory form */}
        {showMemoryForm ? (
          <div className="flex flex-col gap-3 rounded-xl p-4 bg-gold/[0.02] border border-gold/15">
            <input
              type="text"
              value={memoryTitle}
              onChange={e => setMemoryTitle(e.target.value)}
              placeholder="Memory title (e.g., The Day the Temple Fell)"
              className={cn(
                'min-h-[44px] w-full rounded-xl',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25',
                'font-body text-sm px-4',
                'transition-all duration-200 ease-forge',
                'focus:border-ember/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                'focus:outline-none',
              )}
            />
            <textarea
              value={memoryDesc}
              onChange={e => setMemoryDesc(e.target.value)}
              placeholder="Describe this pivotal moment..."
              rows={3}
              className={cn(
                'min-h-[80px] w-full rounded-xl resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25',
                'font-body text-sm px-4 py-3',
                'transition-all duration-200 ease-forge',
                'focus:border-ember/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                'focus:outline-none',
              )}
            />
            <div className="flex gap-2 flex-wrap">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                <label className="text-xs text-forge-2 select-none">Emotional Core</label>
                <select
                  value={memoryEmotion}
                  onChange={e => setMemoryEmotion(e.target.value as EmotionalCore)}
                  className={cn(
                    'min-h-[44px] w-full rounded-xl appearance-none',
                    'bg-void-2/60 text-forge-0',
                    'border border-bronze/25',
                    'font-body text-sm px-4',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                    'cursor-pointer',
                  )}
                >
                  {EMOTIONAL_CORES.map(ec => (
                    <option key={ec} value={ec}>
                      {ec.charAt(0).toUpperCase() + ec.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                <label className="text-xs text-forge-2 select-none">NPC Involved (optional)</label>
                <input
                  type="text"
                  value={memoryNpc}
                  onChange={e => setMemoryNpc(e.target.value)}
                  placeholder="e.g., Elder Mara"
                  className={cn(
                    'min-h-[44px] w-full rounded-xl',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                  )}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={addMemory}
                disabled={!memoryTitle.trim() || !memoryDesc.trim()}
                className="flex-1"
              >
                <Plus size={14} aria-hidden />
                Add Memory
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMemoryForm(false)
                  setMemoryTitle('')
                  setMemoryDesc('')
                  setMemoryEmotion('hope')
                  setMemoryNpc('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMemoryForm(true)}
            className="w-full"
          >
            <Plus size={14} aria-hidden />
            Add Memory
          </Button>
        )}
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* Section 3: Relationships                                         */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Relationships"
        icon={Users}
        expanded={expandedSections.has('relationships')}
        onToggle={() => toggleSection('relationships')}
        count={backstory.relationships.length}
      >
        {/* Existing relationships */}
        {backstory.relationships.length > 0 && (
          <div className="flex flex-col gap-2">
            {backstory.relationships.map((rel, idx) => (
              <div
                key={idx}
                className={cn(
                  'ornate-border flex items-center gap-3 rounded-lg px-3 py-2.5',
                  'bg-gold/[0.03] border border-gold/20',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-forge-0">{rel.name}</span>
                    <span className="text-xs text-forge-2">{rel.relation}</span>
                    <Badge variant={STATUS_VARIANTS[rel.status as RelationshipStatus] ?? 'neutral'}>
                      {rel.status}
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRelationship(idx)}
                  className={cn(
                    'min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg',
                    'text-forge-2 hover:text-red-400',
                    'transition-colors duration-200',
                    'active:scale-[0.95]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  )}
                  aria-label={`Remove relationship with ${rel.name}`}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add relationship form */}
        {showRelForm ? (
          <div className="flex flex-col gap-3 rounded-xl p-4 bg-gold/[0.02] border border-gold/15">
            <div className="flex gap-2 flex-wrap">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-xs text-forge-2 select-none">Name</label>
                <input
                  type="text"
                  value={relName}
                  onChange={e => setRelName(e.target.value)}
                  placeholder="e.g., Elder Mara"
                  className={cn(
                    'min-h-[44px] w-full rounded-xl',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-xs text-forge-2 select-none">Relation</label>
                <input
                  type="text"
                  value={relRelation}
                  onChange={e => setRelRelation(e.target.value)}
                  placeholder="e.g., Mentor"
                  className={cn(
                    'min-h-[44px] w-full rounded-xl',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-[120px]">
                <label className="text-xs text-forge-2 select-none">Status</label>
                <select
                  value={relStatus}
                  onChange={e => setRelStatus(e.target.value as RelationshipStatus)}
                  className={cn(
                    'min-h-[44px] w-full rounded-xl appearance-none',
                    'bg-void-2/60 text-forge-0',
                    'border border-bronze/25',
                    'font-body text-sm px-4',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                    'cursor-pointer',
                  )}
                >
                  {RELATIONSHIP_STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={addRelationship}
                disabled={!relName.trim() || !relRelation.trim()}
                className="flex-1"
              >
                <Plus size={14} aria-hidden />
                Add Relationship
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRelForm(false)
                  setRelName('')
                  setRelRelation('')
                  setRelStatus('alive')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRelForm(true)}
            className="w-full"
          >
            <Plus size={14} aria-hidden />
            Add Relationship
          </Button>
        )}
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* Section 4: Unresolved Threads                                    */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Unresolved Threads"
        icon={Link2}
        expanded={expandedSections.has('threads')}
        onToggle={() => toggleSection('threads')}
        count={backstory.unresolvedThreads.length}
      >
        <p className="text-xs text-forge-2">
          Dangling plot hooks, unanswered questions, and unfinished business.
        </p>
        <SimpleListEditor
          items={backstory.unresolvedThreads}
          onAdd={text => updateBackstory({
            unresolvedThreads: [...backstory.unresolvedThreads, text],
          })}
          onRemove={idx => {
            const updated = [...backstory.unresolvedThreads]
            updated.splice(idx, 1)
            updateBackstory({ unresolvedThreads: updated })
          }}
          placeholder="e.g., Who burned down the temple?"
        />
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* Section 5: Personality Seeds                                     */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Personality Seeds"
        icon={Feather}
        expanded={expandedSections.has('seeds')}
        onToggle={() => toggleSection('seeds')}
        count={backstory.personalitySeeds.length}
      >
        <p className="text-xs text-forge-2">
          How did your backstory shape who you are today?
        </p>
        <SimpleListEditor
          items={backstory.personalitySeeds}
          onAdd={text => updateBackstory({
            personalitySeeds: [...backstory.personalitySeeds, text],
          })}
          onRemove={idx => {
            const updated = [...backstory.personalitySeeds]
            updated.splice(idx, 1)
            updateBackstory({ personalitySeeds: updated })
          }}
          placeholder="e.g., Distrusts authority after the betrayal"
        />
      </CollapsibleSection>

      {/* Empty state */}
      {!backstory.origin &&
        backstory.keyMemories.length === 0 &&
        backstory.relationships.length === 0 &&
        backstory.unresolvedThreads.length === 0 &&
        backstory.personalitySeeds.length === 0 &&
        !aiHelper.loading && (
          <ParchmentCard className="p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-ember/10 flex items-center justify-center">
                <Scroll size={24} className="text-ember" aria-hidden />
              </div>
              <p className="text-sm text-forge-2 max-w-xs">
                Every hero has a story. Use the AI generator or fill in the sections
                above to craft{' '}
                <span className="text-ember font-medium">{character.name}</span>&apos;s
                past. Memories can be relived as improv drills.
              </p>
            </div>
          </ParchmentCard>
        )}
    </div>
  )
}
