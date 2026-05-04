import { useState, useCallback } from 'react'
import {
  Plus,
  Star,
  Copy,
  Check,
  Edit3,
  Trash2,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DialogueBankProps {
  character: Character
  onUpdate: (char: Character) => void
}

interface DialogueLine {
  text: string
  context: string
  favorite: boolean
}

const CONTEXTS = ['combat', 'social', 'discovery', 'emotional', 'quiet'] as const
type DialogueContext = (typeof CONTEXTS)[number]

const CONTEXT_COLORS: Record<DialogueContext, 'ember' | 'arcane' | 'verdant' | 'eldritch' | 'neutral'> = {
  combat: 'ember',
  social: 'arcane',
  discovery: 'verdant',
  emotional: 'eldritch',
  quiet: 'neutral',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DialogueBank({ character, onUpdate }: DialogueBankProps) {
  const [activeContext, setActiveContext] = useState<DialogueContext>('combat')
  const [newText, setNewText] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const suggestAI = useAI()

  const dialogueBank: DialogueLine[] = character.persona?.dialogueBank ?? []

  /** Get lines filtered by active context */
  function getFilteredLines(): (DialogueLine & { globalIdx: number })[] {
    return dialogueBank
      .map((line, idx) => ({ ...line, globalIdx: idx }))
      .filter(line => line.context === activeContext)
  }

  /** Update character with new dialogue bank */
  function updateBank(newBank: DialogueLine[]) {
    onUpdate({
      ...character,
      persona: {
        ...character.persona!,
        dialogueBank: newBank,
        lastEditedAt: new Date().toISOString(),
      },
    })
  }

  /** Add a new dialogue line */
  function handleAdd() {
    if (!newText.trim()) return
    const newLine: DialogueLine = {
      text: newText.trim(),
      context: activeContext,
      favorite: false,
    }
    updateBank([...dialogueBank, newLine])
    setNewText('')
  }

  /** Remove a dialogue line */
  function handleRemove(globalIdx: number) {
    updateBank(dialogueBank.filter((_, i) => i !== globalIdx))
  }

  /** Toggle favorite */
  function handleToggleFavorite(globalIdx: number) {
    const updated = [...dialogueBank]
    updated[globalIdx] = { ...updated[globalIdx], favorite: !updated[globalIdx].favorite }
    updateBank(updated)
  }

  /** Start inline edit */
  function startEdit(globalIdx: number, text: string) {
    setEditingIdx(globalIdx)
    setEditText(text)
  }

  /** Save inline edit */
  function saveEdit() {
    if (editingIdx === null || !editText.trim()) return
    const updated = [...dialogueBank]
    updated[editingIdx] = { ...updated[editingIdx], text: editText.trim() }
    updateBank(updated)
    setEditingIdx(null)
    setEditText('')
  }

  /** Cancel inline edit */
  function cancelEdit() {
    setEditingIdx(null)
    setEditText('')
  }

  /** Copy line to clipboard */
  async function handleCopy(globalIdx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(globalIdx)
      setTimeout(() => setCopiedIdx(null), 1500)
    } catch {
      // Clipboard API not available in some contexts
    }
  }

  /** AI Suggest dialogue lines */
  const handleSuggest = useCallback(async () => {
    try {
      const result = await suggestAI.queryStructured<{ lines: string[] }>(
        SYSTEM_PROMPTS.dialogueSuggestion(character, activeContext),
        `Generate 3 in-character ${activeContext} dialogue lines for ${character.name}.`,
      )
      if (result.lines && Array.isArray(result.lines)) {
        const newLines: DialogueLine[] = result.lines.map(text => ({
          text,
          context: activeContext,
          favorite: false,
        }))
        updateBank([...dialogueBank, ...newLines])
      }
    } catch {
      // error handled by hook
    }
  }, [character, activeContext, dialogueBank, suggestAI])

  const filteredLines = getFilteredLines()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-forge-0">
          Dialogue Bank
        </h3>
        <Badge variant="neutral">
          {dialogueBank.length} line{dialogueBank.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Context tabs */}
      <div className="flex flex-wrap gap-2">
        {CONTEXTS.map(ctx => {
          const isActive = activeContext === ctx
          const color = CONTEXT_COLORS[ctx]
          return (
            <button
              key={ctx}
              type="button"
              onClick={() => {
                setActiveContext(ctx)
                cancelEdit()
              }}
              className={cn(
                'inline-flex items-center min-h-[44px] px-4 rounded-xl',
                'text-sm font-medium capitalize select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                isActive
                  ? `bg-${color}/15 text-${color} border border-${color}/30`
                  : 'bg-white/[0.04] text-forge-1 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
              )}
            >
              {ctx}
            </button>
          )
        })}
      </div>

      {/* AI Suggest button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleSuggest}
        loading={suggestAI.loading}
        className="self-start"
      >
        <Sparkles size={14} aria-hidden />
        AI Suggest ({activeContext})
      </Button>

      {/* Error state */}
      {suggestAI.error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-red-400">{suggestAI.error}</p>
        </div>
      )}

      {/* Dialogue lines */}
      {filteredLines.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filteredLines.map(({ text, favorite, globalIdx }) => (
            <GlassCard key={globalIdx} className="p-3">
              {editingIdx === globalIdx ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className={cn(
                      'min-h-[60px] w-full rounded-lg resize-y',
                      'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                      'border border-white/10',
                      'font-body text-sm px-3 py-2',
                      'transition-all duration-200 ease-forge',
                      'focus:border-arcane/60 focus:bg-void-2/80',
                      'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
                      'focus:outline-none',
                    )}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-verdant/15 text-verdant hover:bg-verdant/25 transition-colors"
                      aria-label="Save edit"
                    >
                      <Check size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/[0.04] text-forge-2 hover:bg-white/[0.08] transition-colors"
                      aria-label="Cancel edit"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-forge-1 leading-relaxed italic">
                    &ldquo;{text}&rdquo;
                  </p>
                  <div className="flex gap-0.5 shrink-0">
                    {/* Favorite toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(globalIdx)}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors',
                        favorite
                          ? 'text-ember'
                          : 'text-forge-2 hover:text-ember hover:bg-ember/10',
                      )}
                      aria-label={favorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star size={14} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
                    </button>
                    {/* Copy */}
                    <button
                      type="button"
                      onClick={() => handleCopy(globalIdx, text)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-arcane hover:bg-arcane/10 transition-colors"
                      aria-label="Copy to clipboard"
                    >
                      {copiedIdx === globalIdx ? (
                        <Check size={14} className="text-verdant" aria-hidden />
                      ) : (
                        <Copy size={14} aria-hidden />
                      )}
                    </button>
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => startEdit(globalIdx, text)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-arcane hover:bg-arcane/10 transition-colors"
                      aria-label="Edit line"
                    >
                      <Edit3 size={14} aria-hidden />
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemove(globalIdx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="Delete line"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-6">
          <p className="text-sm text-forge-2 text-center italic">
            No {activeContext} lines yet. Add one below or use AI Suggest.
          </p>
        </GlassCard>
      )}

      {/* Add new line */}
      <div className="flex gap-2">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder={`Add a ${activeContext} line for ${character.name}...`}
          className={cn(
            'min-h-[44px] flex-1 rounded-xl resize-none',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-white/10',
            'font-body text-sm px-4 py-3',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
            'focus:outline-none',
          )}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="shrink-0"
        >
          <Plus size={16} aria-hidden />
        </Button>
      </div>
    </div>
  )
}
