import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  Compass,
  HelpCircle,
  Eye,
  Users,
  Heart,
  Sparkles,
  Shuffle,
  Copy,
  Check,
  Zap,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character, CampaignData, CustomRPHook } from '../../lib/character'
import { saveCharacter, generateId } from '../../lib/character'
import { loadCampaign } from '../../lib/campaign'
import { generateStaticHooks, shuffleHooks, type RPHook, type HookCategory } from '../../lib/rp-hooks'
import { ActionCard } from './ActionCard'
import { Badge } from '../ui/Badge'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import type { RPMoment } from '../../lib/session-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngageCardProps {
  character: Character
  sceneContext?: string
  expanded: boolean
  onToggle: () => void
  onCharacterUpdate: (char: Character) => void
  onMomentLogged?: (moment: Omit<RPMoment, 'id' | 'timestamp'>) => void
}

interface SparkResult {
  spark: string
  trait: string
  difficulty: 'easy' | 'medium' | 'hard'
}

type TargetTab = 'member' | 'party' | 'npc'

const SCENE_TYPES = ['combat debrief', 'campfire', 'travel', 'celebration', 'mourning', 'planning'] as const

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<HookCategory, LucideIcon> = {
  ask: HelpCircle,
  observe: Eye,
  connect: Users,
  offer: Heart,
  muse: Sparkles,
}

const FILTER_CATEGORIES = ['all', 'ask', 'observe', 'connect', 'offer', 'muse'] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EngageCard({ character, sceneContext, expanded, onToggle, onCharacterUpdate, onMomentLogged }: EngageCardProps) {
  const [activeCategory, setActiveCategory] = useState<HookCategory | 'all'>('all')
  const [hooks, setHooks] = useState<RPHook[]>([])
  const [aiHooks, setAiHooks] = useState<RPHook[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Spark feature state ───────────────────────────────────────────────
  const [sparkResult, setSparkResult] = useState<SparkResult | null>(null)
  const [sparkTimerActive, setSparkTimerActive] = useState(false)
  const [sparkTimeLeft, setSparkTimeLeft] = useState(20)
  const sparkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Session-only deleted static hook IDs ────────────────────────────
  const [deletedStaticIds, setDeletedStaticIds] = useState<Set<string>>(new Set())

  // ── Add hook form state ─────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [addCategory, setAddCategory] = useState<HookCategory>('ask')
  const [addText, setAddText] = useState('')

  // ── Target selector state ───────────────────────────────────────────
  const [showTargetPanel, setShowTargetPanel] = useState(false)
  const [targetTab, setTargetTab] = useState<TargetTab>('member')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedSceneType, setSelectedSceneType] = useState<string | null>(null)
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null)

  // ── Load campaign from character.campaignId ─────────────────────────
  const campaign = useMemo<CampaignData | null>(() => {
    if (!character.campaignId) return null
    return loadCampaign(character.campaignId)
  }, [character.campaignId])

  // ── Static hook generation ──────────────────────────────────────────
  const staticHooks = useMemo(
    () => generateStaticHooks(character, campaign, sceneContext),
    [character, campaign, sceneContext],
  )

  // ── Merge static + custom hooks ─────────────────────────────────────
  const customAsRPHooks: RPHook[] = useMemo(
    () => (character.customHooks ?? []).map(ch => ({
      id: `custom-${ch.id}`,
      category: ch.category,
      text: ch.text,
      isCustom: true,
    })),
    [character.customHooks],
  )

  // Sync staticHooks into state when they change
  useEffect(() => {
    setHooks(staticHooks)
    setDeletedStaticIds(new Set())
  }, [staticHooks])

  // ── Combined hooks (static minus deleted + custom) ──────────────────
  const allDisplayHooks = useMemo(() => {
    const filtered = hooks.filter(h => !deletedStaticIds.has(h.id))
    return [...filtered, ...customAsRPHooks]
  }, [hooks, deletedStaticIds, customAsRPHooks])

  // ── Category filter ─────────────────────────────────────────────────
  const filteredHooks = activeCategory === 'all'
    ? allDisplayHooks
    : allDisplayHooks.filter(h => h.category === activeCategory)

  const filteredAIHooks = activeCategory === 'all'
    ? aiHooks
    : aiHooks.filter(h => h.category === activeCategory)

  // ── Total count for ActionCard ──────────────────────────────────────
  const totalCount = allDisplayHooks.length + aiHooks.length

  // ── Copy handler ────────────────────────────────────────────────────
  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // Clipboard not available
    }
  }, [])

  // ── Delete hook handler ─────────────────────────────────────────────
  const handleDelete = useCallback((hook: RPHook) => {
    if (hook.isCustom) {
      // Remove from character.customHooks and persist
      const rawId = hook.id.replace('custom-', '')
      const updated = {
        ...character,
        customHooks: (character.customHooks ?? []).filter(ch => ch.id !== rawId),
      }
      saveCharacter(updated)
      onCharacterUpdate(updated)
    } else {
      // Session-only deletion for static hooks
      setDeletedStaticIds(prev => new Set(prev).add(hook.id))
    }
  }, [character, onCharacterUpdate])

  // ── Add custom hook handler ─────────────────────────────────────────
  const handleAddHook = useCallback(() => {
    const text = addText.trim()
    if (!text) return

    const newHook: CustomRPHook = {
      id: generateId(),
      category: addCategory,
      text,
      createdAt: new Date().toISOString(),
    }

    const updated = {
      ...character,
      customHooks: [...(character.customHooks ?? []), newHook],
    }
    saveCharacter(updated)
    onCharacterUpdate(updated)
    setAddText('')
    setShowAddForm(false)
  }, [addText, addCategory, character, onCharacterUpdate])

  // ── AI hook generation ──────────────────────────────────────────────
  const { loading: aiLoading, error: aiError, queryStructured } = useAI()
  const { loading: sparkLoading, error: sparkError, queryStructured: sparkQuery } = useAI()

  const handleAISuggest = useCallback(async () => {
    const prompt = SYSTEM_PROMPTS.rpHookGenerator(character, campaign, sceneContext)
    try {
      const data = await queryStructured<{
        hooks: Array<{
          category: HookCategory
          text: string
          targetPartyMember?: string
        }>
      }>(prompt, 'Generate roleplay hooks for my character')
      setAiHooks(
        data.hooks.map((h, i) => ({
          id: `ai-${h.category}-${i}`,
          category: h.category,
          text: h.text,
          targetPartyMember: h.targetPartyMember,
        })),
      )
    } catch {
      // Error handled by useAI
    }
  }, [character, campaign, sceneContext, queryStructured])

  // ── Targeted AI generation ──────────────────────────────────────────
  const handleTargetedGenerate = useCallback(async () => {
    let prompt: string | null = null

    if (targetTab === 'member' && selectedMember) {
      const member = campaign?.partyMembers.find(pm => pm.name === selectedMember)
      if (member) {
        prompt = SYSTEM_PROMPTS.rpHookForPartyMember(character, member, campaign, sceneContext)
      }
    } else if (targetTab === 'party' && selectedSceneType && campaign) {
      prompt = SYSTEM_PROMPTS.rpHookForParty(character, campaign, selectedSceneType, sceneContext)
    } else if (targetTab === 'npc' && selectedNPC) {
      const npc = campaign?.notableNPCs.find(n => n.name === selectedNPC)
      if (npc) {
        prompt = SYSTEM_PROMPTS.rpHookForNPC(character, npc, campaign, sceneContext)
      }
    }

    if (!prompt) return

    try {
      const data = await queryStructured<{
        hooks: Array<{
          category: HookCategory
          text: string
          targetPartyMember?: string
        }>
      }>(prompt, 'Generate targeted roleplay hooks')
      setAiHooks(
        data.hooks.map((h, i) => ({
          id: `ai-${h.category}-${i}`,
          category: h.category,
          text: h.text,
          targetPartyMember: h.targetPartyMember,
        })),
      )
    } catch {
      // Error handled by useAI
    }
  }, [targetTab, selectedMember, selectedSceneType, selectedNPC, campaign, character, sceneContext, queryStructured])

  // ── Quick Hook (random pick + copy) ─────────────────────────────────
  const handleQuickHook = useCallback(() => {
    const all = [...allDisplayHooks, ...aiHooks]
    if (all.length === 0) return
    const random = all[Math.floor(Math.random() * all.length)]
    handleCopy(random.text, `quick-${random.id}`)
  }, [allDisplayHooks, aiHooks, handleCopy])

  // ── Spark handlers ────────────────────────────────────────────────────
  const handleSpark = useCallback(async () => {
    setSparkResult(null)
    setSparkTimerActive(false)
    setSparkTimeLeft(20)
    if (sparkTimerRef.current) {
      clearInterval(sparkTimerRef.current)
      sparkTimerRef.current = null
    }
    try {
      const prompt = SYSTEM_PROMPTS.improvSpark(character, sceneContext)
      const result = await sparkQuery<SparkResult>(prompt, 'Generate a creativity spark challenge')
      setSparkResult(result)
    } catch {
      // Error handled by useAI
    }
  }, [character, sceneContext, sparkQuery])

  const handleSparkTimer = useCallback(() => {
    if (sparkTimerActive) {
      // Stop timer
      if (sparkTimerRef.current) {
        clearInterval(sparkTimerRef.current)
        sparkTimerRef.current = null
      }
      setSparkTimerActive(false)
      setSparkTimeLeft(20)
      return
    }
    // Start 20-second countdown
    setSparkTimeLeft(20)
    setSparkTimerActive(true)
    sparkTimerRef.current = setInterval(() => {
      setSparkTimeLeft(prev => {
        if (prev <= 1) {
          if (sparkTimerRef.current) {
            clearInterval(sparkTimerRef.current)
            sparkTimerRef.current = null
          }
          setSparkTimerActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [sparkTimerActive])

  const handleSparkComplete = useCallback(() => {
    if (!sparkResult) return
    if (sparkTimerRef.current) {
      clearInterval(sparkTimerRef.current)
      sparkTimerRef.current = null
    }
    setSparkTimerActive(false)
    onMomentLogged?.({
      type: 'spark',
      text: sparkResult.spark.length > 80 ? sparkResult.spark.slice(0, 77) + '...' : sparkResult.spark,
      context: sceneContext,
    })
    setSparkResult(null)
    setSparkTimeLeft(20)
  }, [sparkResult, sceneContext, onMomentLogged])

  // ── Can generate check ──────────────────────────────────────────────
  const canGenerate =
    (targetTab === 'member' && !!selectedMember) ||
    (targetTab === 'party' && !!selectedSceneType) ||
    (targetTab === 'npc' && !!selectedNPC)

  const partyMembers = campaign?.partyMembers ?? []
  const notableNPCs = campaign?.notableNPCs ?? []

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <ActionCard
      title="Engage"
      icon={Compass}
      color="verdant"
      count={totalCount}
      expanded={expanded}
      onToggle={onToggle}
      emptyMessage="Add persona traits, backstory, and campaign data in Prep mode to generate RP hooks"
    >
      <div className="space-y-3">
        {/* ── Category filter pills ── */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat
            const Icon = cat !== 'all' ? CATEGORY_ICONS[cat] : null
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'inline-flex items-center gap-1.5',
                  'min-h-[44px] px-3 py-1.5 rounded-full',
                  'text-xs font-medium uppercase tracking-wider',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                  isActive
                    ? 'bg-verdant/15 text-verdant border border-verdant/30'
                    : 'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06]',
                )}
              >
                {Icon && <Icon size={14} aria-hidden />}
                {cat === 'all' ? 'All' : cat}
              </button>
            )
          })}
        </div>

        {/* ── Add Hook button + inline form ── */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2',
              'min-h-[44px] px-3 py-2 rounded-xl',
              'border border-dashed border-white/20',
              'text-sm font-medium text-forge-2',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-white/[0.04] hover:border-verdant/30 hover:text-verdant',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
            )}
          >
            <Plus size={16} aria-hidden />
            Add Hook
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-verdant/20 bg-verdant/[0.03] p-3">
            {/* Category selector */}
            <div className="flex flex-wrap gap-1.5">
              {(['ask', 'observe', 'connect', 'offer', 'muse'] as HookCategory[]).map(cat => {
                const Icon = CATEGORY_ICONS[cat]
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAddCategory(cat)}
                    className={cn(
                      'inline-flex items-center gap-1',
                      'min-h-[44px] px-2.5 py-1 rounded-full',
                      'text-xs font-medium uppercase tracking-wider',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.97]',
                      addCategory === cat
                        ? 'bg-verdant/15 text-verdant border border-verdant/30'
                        : 'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06]',
                    )}
                  >
                    <Icon size={12} aria-hidden />
                    {cat}
                  </button>
                )
              })}
            </div>
            {/* Text input */}
            <input
              type="text"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddHook() }}
              placeholder="Type your hook..."
              className={cn(
                'w-full min-h-[44px] px-3 py-2 rounded-lg',
                'bg-white/[0.06] border border-white/10',
                'text-sm text-forge-0 placeholder:text-forge-3',
                'focus:outline-none focus:border-verdant/40',
                'transition-colors duration-200',
              )}
              autoFocus
            />
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddHook}
                disabled={!addText.trim()}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5',
                  'min-h-[44px] px-3 py-2 rounded-lg',
                  'bg-verdant/15 border border-verdant/30',
                  'text-sm font-medium text-verdant',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'hover:bg-verdant/20',
                  !addText.trim() && 'opacity-40 cursor-not-allowed',
                )}
              >
                <Plus size={14} aria-hidden />
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddText('') }}
                className={cn(
                  'min-h-[44px] min-w-[40px] inline-flex items-center justify-center',
                  'rounded-lg',
                  'bg-white/[0.04] border border-white/10',
                  'text-forge-2',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'hover:bg-white/[0.06]',
                )}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* ── Hooks list (static + custom merged) ── */}
        {filteredHooks.length > 0 && (
          <div className="space-y-1.5">
            {filteredHooks.map(hook => {
              const isCopied = copiedId === hook.id
              const CatIcon = CATEGORY_ICONS[hook.category]
              return (
                <div
                  key={hook.id}
                  className={cn(
                    'w-full flex items-center gap-2',
                    'min-h-[48px] px-3 py-2',
                    'glass-card rounded-xl',
                    'text-left text-sm text-forge-0',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-white/[0.06]',
                    'group',
                  )}
                >
                  <CatIcon size={16} className="shrink-0 text-forge-2" aria-hidden />
                  <button
                    type="button"
                    onClick={() => handleCopy(hook.text, hook.id)}
                    className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                  >
                    <span className="break-words">
                      {hook.text}
                      {hook.isCustom && (
                        <span className="ml-1.5 text-xs text-verdant/50 uppercase font-medium">custom</span>
                      )}
                    </span>
                  </button>
                  {isCopied ? (
                    <Check size={16} className="shrink-0 text-verdant" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCopy(hook.text, hook.id)}
                      className="shrink-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
                    >
                      <Copy size={14} className="text-forge-2" aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(hook)}
                    className={cn(
                      'shrink-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      'hover:bg-red-500/10 transition-all',
                    )}
                    aria-label={`Delete hook: ${hook.text.slice(0, 30)}`}
                  >
                    <X size={14} className="text-forge-3 hover:text-red-400" aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── AI Suggested hooks section ── */}
        {filteredAIHooks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
              AI Suggested
            </p>
            <div className="space-y-1.5 rounded-xl border border-verdant/20 bg-verdant/[0.03] p-2">
              {filteredAIHooks.map(hook => {
                const isCopied = copiedId === hook.id
                const CatIcon = CATEGORY_ICONS[hook.category]
                return (
                  <div
                    key={hook.id}
                    className={cn(
                      'w-full flex items-center gap-2',
                      'min-h-[48px] px-3 py-2',
                      'glass-card rounded-xl',
                      'text-left text-sm text-forge-0',
                      'transition-all duration-200 ease-forge',
                      'hover:bg-white/[0.06]',
                      'group',
                    )}
                  >
                    <CatIcon size={16} className="shrink-0 text-verdant" aria-hidden />
                    <button
                      type="button"
                      onClick={() => handleCopy(hook.text, hook.id)}
                      className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                    >
                      <span className="break-words">{hook.text}</span>
                    </button>
                    {isCopied ? (
                      <Check size={16} className="shrink-0 text-verdant" aria-hidden />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCopy(hook.text, hook.id)}
                        className="shrink-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <Copy size={14} className="text-forge-2" aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAiHooks(prev => prev.filter(h => h.id !== hook.id))}
                      className={cn(
                        'shrink-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg',
                        'opacity-0 group-hover:opacity-100 focus:opacity-100',
                        'hover:bg-red-500/10 transition-all',
                      )}
                      aria-label="Dismiss AI hook"
                    >
                      <X size={14} className="text-forge-3 hover:text-red-400" aria-hidden />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── AI loading skeleton ── */}
        {aiLoading && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
              AI Suggesting...
            </p>
            <div className="space-y-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-[48px] rounded-xl bg-white/[0.04] animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── AI error state ── */}
        {aiError && (
          <p className="text-sm text-red-400 px-1">{aiError}</p>
        )}

        {/* ── Action buttons row ── */}
        <div className="flex gap-2">
          {/* Shuffle button */}
          <button
            type="button"
            onClick={() => setHooks(shuffleHooks(staticHooks))}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2',
              'min-h-[44px] px-3 py-2 rounded-xl',
              'bg-white/[0.04] border border-white/10',
              'text-sm font-medium text-forge-1',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-white/[0.06]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
            )}
          >
            <Shuffle size={16} aria-hidden />
            Shuffle
          </button>

          {/* AI Target toggle button */}
          <button
            type="button"
            onClick={() => setShowTargetPanel(prev => !prev)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2',
              'min-h-[44px] px-3 py-2 rounded-xl',
              'bg-white/[0.04] border border-white/10',
              'text-sm font-medium text-forge-1',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-white/[0.06]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
              showTargetPanel && 'bg-verdant/10 border-verdant/30 text-verdant',
            )}
          >
            <Sparkles size={16} aria-hidden />
            AI Target
            <ChevronDown
              size={14}
              className={cn('transition-transform duration-200', showTargetPanel && 'rotate-180')}
              aria-hidden
            />
          </button>
        </div>

        {/* ── Target Panel (expandable) ── */}
        {showTargetPanel && (
          <div className="space-y-3 rounded-xl border border-verdant/20 bg-verdant/[0.03] p-3 animate-fade-in">
            {/* Segment tabs */}
            <div className="flex rounded-lg bg-white/[0.04] p-0.5">
              {([
                { key: 'member' as TargetTab, label: 'Party Member' },
                { key: 'party' as TargetTab, label: 'The Party' },
                { key: 'npc' as TargetTab, label: 'NPC' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setTargetTab(tab.key); setSelectedMember(null); setSelectedSceneType(null); setSelectedNPC(null) }}
                  className={cn(
                    'flex-1 min-h-[44px] px-2 py-1.5 rounded-md',
                    'text-xs font-medium text-center',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    targetTab === tab.key
                      ? 'bg-verdant/15 text-verdant'
                      : 'text-forge-2 hover:text-forge-1',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Entity / scene pills */}
            <div className="flex flex-wrap gap-1.5">
              {targetTab === 'member' && partyMembers.map(pm => (
                <button
                  key={pm.name}
                  type="button"
                  onClick={() => setSelectedMember(pm.name === selectedMember ? null : pm.name)}
                  className={cn(
                    'min-h-[44px] px-3 py-1.5 rounded-full',
                    'text-xs font-medium',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    selectedMember === pm.name
                      ? 'bg-verdant/15 text-verdant border border-verdant/30'
                      : 'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06]',
                  )}
                >
                  {pm.name}
                </button>
              ))}
              {targetTab === 'member' && partyMembers.length === 0 && (
                <p className="text-xs text-forge-3 py-2">No party members added to campaign</p>
              )}

              {targetTab === 'party' && SCENE_TYPES.map(scene => (
                <button
                  key={scene}
                  type="button"
                  onClick={() => setSelectedSceneType(scene === selectedSceneType ? null : scene)}
                  className={cn(
                    'min-h-[44px] px-3 py-1.5 rounded-full',
                    'text-xs font-medium capitalize',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    selectedSceneType === scene
                      ? 'bg-verdant/15 text-verdant border border-verdant/30'
                      : 'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06]',
                  )}
                >
                  {scene}
                </button>
              ))}
              {targetTab === 'party' && !campaign && (
                <p className="text-xs text-forge-3 py-2">No campaign linked to character</p>
              )}

              {targetTab === 'npc' && notableNPCs.map(npc => (
                <button
                  key={npc.name}
                  type="button"
                  onClick={() => setSelectedNPC(npc.name === selectedNPC ? null : npc.name)}
                  className={cn(
                    'min-h-[44px] px-3 py-1.5 rounded-full',
                    'text-xs font-medium',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    selectedNPC === npc.name
                      ? 'bg-verdant/15 text-verdant border border-verdant/30'
                      : 'bg-white/[0.04] text-forge-2 border border-white/10 hover:bg-white/[0.06]',
                  )}
                >
                  {npc.name}
                </button>
              ))}
              {targetTab === 'npc' && notableNPCs.length === 0 && (
                <p className="text-xs text-forge-3 py-2">No NPCs added to campaign</p>
              )}
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleTargetedGenerate}
              disabled={!canGenerate || aiLoading}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2',
                'min-h-[44px] px-3 py-2 rounded-xl',
                'bg-verdant/15 border border-verdant/30',
                'text-sm font-semibold text-verdant',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'hover:bg-verdant/20',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                (!canGenerate || aiLoading) && 'opacity-40 cursor-not-allowed',
              )}
            >
              <Sparkles size={16} aria-hidden />
              {aiLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        )}

        {/* ── Quick Hook + Spark row ── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleQuickHook}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2',
              'min-h-[52px] px-4 py-3 rounded-xl',
              'bg-verdant/15 border border-verdant/30',
              'text-sm font-semibold text-verdant',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-verdant/20',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
            )}
          >
            <Zap size={18} aria-hidden />
            Quick Hook
          </button>

          <button
            type="button"
            onClick={handleSpark}
            disabled={sparkLoading}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2',
              'min-h-[52px] px-4 py-3 rounded-xl',
              'bg-eldritch/15 border border-eldritch/30',
              'text-sm font-semibold text-eldritch',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'hover:bg-eldritch/20',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eldritch',
              sparkLoading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {sparkLoading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={18} aria-hidden />
            )}
            {sparkLoading ? 'Sparking...' : 'Spark'}
          </button>
        </div>

        {/* ── Spark result card ── */}
        {sparkError && (
          <p className="text-sm text-red-400 px-1">{sparkError}</p>
        )}

        {sparkLoading && !sparkResult && (
          <div className="space-y-1.5">
            <div className="h-[80px] rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
        )}

        {sparkResult && (
          <div className="space-y-3 rounded-xl border border-eldritch/20 bg-eldritch/[0.03] p-3 animate-fade-in">
            <p className="text-sm text-forge-0 leading-relaxed">
              {sparkResult.spark}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="eldritch">{sparkResult.trait}</Badge>
              <Badge variant={
                sparkResult.difficulty === 'easy' ? 'verdant'
                : sparkResult.difficulty === 'medium' ? 'ember'
                : 'eldritch'
              }>
                {sparkResult.difficulty}
              </Badge>
            </div>

            {/* Timer toggle + complete */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSparkTimer}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5',
                  'min-h-[44px] px-3 py-2 rounded-xl',
                  'border',
                  'text-sm font-medium',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  sparkTimerActive
                    ? 'bg-ember/15 border-ember/30 text-ember'
                    : 'bg-white/[0.04] border-white/10 text-forge-2 hover:bg-white/[0.06]',
                )}
              >
                <Timer size={16} aria-hidden />
                {sparkTimerActive ? `${sparkTimeLeft}s` : '20s Timer'}
              </button>

              <button
                type="button"
                onClick={handleSparkComplete}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2',
                  'min-h-[44px] px-3 py-2 rounded-xl',
                  'bg-verdant/15 border border-verdant/30',
                  'text-sm font-semibold text-verdant',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'hover:bg-verdant/20',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
                )}
              >
                <Check size={16} aria-hidden />
                Completed
              </button>
            </div>
          </div>
        )}
      </div>
    </ActionCard>
  )
}
