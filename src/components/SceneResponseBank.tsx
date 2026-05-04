import { useState } from 'react'
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Check,
  X,
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SceneResponseBankProps {
  character: Character
  onUpdate: (char: Character) => void
}

const SITUATION_TYPES = [
  'Betrayal',
  'Victory',
  'Loss',
  'Discovery',
  'Confrontation',
  'Mercy',
  'Fear',
  'Joy',
] as const

type SituationType = (typeof SITUATION_TYPES)[number]

const SITUATION_COLORS: Record<SituationType, 'arcane' | 'eldritch' | 'ember' | 'verdant' | 'neutral'> = {
  Betrayal: 'ember',
  Victory: 'verdant',
  Loss: 'neutral',
  Discovery: 'arcane',
  Confrontation: 'ember',
  Mercy: 'eldritch',
  Fear: 'neutral',
  Joy: 'verdant',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SceneResponseBank({ character, onUpdate }: SceneResponseBankProps) {
  const [expandedSituation, setExpandedSituation] = useState<SituationType | null>(null)
  const [newResponse, setNewResponse] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const sceneResponses = character.persona?.sceneResponses ?? []

  /** Get responses for a specific situation */
  function getResponses(situation: SituationType): string[] {
    const entry = sceneResponses.find(s => s.situation === situation)
    return entry?.responses ?? []
  }

  /** Update the character with new scene responses */
  function updateResponses(situation: SituationType, responses: string[]) {
    const existing = [...sceneResponses]
    const idx = existing.findIndex(s => s.situation === situation)

    if (idx >= 0) {
      if (responses.length === 0) {
        existing.splice(idx, 1)
      } else {
        existing[idx] = { situation, responses }
      }
    } else if (responses.length > 0) {
      existing.push({ situation, responses })
    }

    onUpdate({
      ...character,
      persona: {
        ...character.persona!,
        sceneResponses: existing,
        lastEditedAt: new Date().toISOString(),
      },
    })
  }

  /** Add a new response to a situation */
  function handleAddResponse(situation: SituationType) {
    if (!newResponse.trim()) return
    const current = getResponses(situation)
    updateResponses(situation, [...current, newResponse.trim()])
    setNewResponse('')
  }

  /** Remove a response by index */
  function handleRemoveResponse(situation: SituationType, idx: number) {
    const current = getResponses(situation)
    updateResponses(situation, current.filter((_, i) => i !== idx))
  }

  /** Start editing a response */
  function startEdit(idx: number, text: string) {
    setEditingIdx(idx)
    setEditText(text)
  }

  /** Save edited response */
  function saveEdit(situation: SituationType) {
    if (editingIdx === null || !editText.trim()) return
    const current = getResponses(situation)
    const updated = [...current]
    updated[editingIdx] = editText.trim()
    updateResponses(situation, updated)
    setEditingIdx(null)
    setEditText('')
  }

  /** Cancel editing */
  function cancelEdit() {
    setEditingIdx(null)
    setEditText('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-forge-0">
          Scene Responses
        </h3>
        <Badge variant="neutral">
          {sceneResponses.reduce((sum, s) => sum + s.responses.length, 0)} banked
        </Badge>
      </div>

      {/* Situation Grid */}
      <div className="grid grid-cols-2 gap-3">
        {SITUATION_TYPES.map(situation => {
          const responses = getResponses(situation)
          const isExpanded = expandedSituation === situation
          const color = SITUATION_COLORS[situation]

          return (
            <div key={situation} className={cn(isExpanded && 'col-span-2')}>
              <button
                type="button"
                onClick={() => {
                  setExpandedSituation(isExpanded ? null : situation)
                  setNewResponse('')
                  cancelEdit()
                }}
                className={cn(
                  'w-full min-h-[56px] rounded-xl px-4 py-3',
                  'flex items-center justify-between',
                  'border transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  isExpanded
                    ? `bg-${color === 'arcane' ? 'arcane' : color === 'ember' ? 'ember' : color === 'verdant' ? 'verdant' : color === 'eldritch' ? 'eldritch' : 'white'}/10 border-${color === 'arcane' ? 'arcane' : color === 'ember' ? 'ember' : color === 'verdant' ? 'verdant' : color === 'eldritch' ? 'eldritch' : 'white'}/30`
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20',
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium text-forge-0">{situation}</span>
                  <span className="text-xs text-forge-2">
                    {responses.length} response{responses.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-forge-2" aria-hidden />
                ) : (
                  <ChevronDown size={16} className="text-forge-2" aria-hidden />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-3 flex flex-col gap-3 animate-fade-in">
                  {/* Existing responses */}
                  {responses.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {responses.map((response, idx) => (
                        <GlassCard key={idx} className="p-3">
                          {editingIdx === idx ? (
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
                                  onClick={() => saveEdit(situation)}
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
                            <div className="flex items-start gap-3">
                              <p className="flex-1 text-sm text-forge-1 leading-relaxed italic">
                                &ldquo;{response}&rdquo;
                              </p>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEdit(idx, response)}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-arcane hover:bg-arcane/10 transition-colors"
                                  aria-label="Edit response"
                                >
                                  <Edit3 size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveResponse(situation, idx)}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                  aria-label="Remove response"
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
                    <p className="text-sm text-forge-2 italic pl-1">
                      No responses banked yet. Add your first one below.
                    </p>
                  )}

                  {/* Add new response */}
                  <div className="flex gap-2">
                    <textarea
                      value={newResponse}
                      onChange={e => setNewResponse(e.target.value)}
                      placeholder={`How does ${character.name} react to ${situation.toLowerCase()}?`}
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
                          handleAddResponse(situation)
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddResponse(situation)}
                      disabled={!newResponse.trim()}
                      className="shrink-0"
                    >
                      <Plus size={16} aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
