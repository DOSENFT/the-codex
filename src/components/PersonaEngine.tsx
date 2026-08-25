import { useState, useCallback } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character, CharacterPersona } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { DialogueBank } from './DialogueBank'
import { SceneResponseBank } from './SceneResponseBank'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PersonaEngineProps {
  character: Character
  onUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Helper: ensure persona exists                                      */
/* ------------------------------------------------------------------ */

function ensurePersona(char: Character): CharacterPersona {
  return char.persona ?? {
    defaultState: '',
    decisionTree: '',
    physicalTics: [],
    sceneInstincts: [],
    quietTexture: [],
    patron: { name: '', domains: [], symbol: '', rpNotes: '' },
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Editable List                                       */
/* ------------------------------------------------------------------ */

function EditableList({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  variant = 'neutral',
}: {
  label: string
  items: string[]
  onAdd: (text: string) => void
  onRemove: (idx: number) => void
  placeholder: string
  variant?: 'arcane' | 'eldritch' | 'ember' | 'verdant' | 'neutral'
}) {
  const [newItem, setNewItem] = useState('')

  function handleAdd() {
    if (!newItem.trim()) return
    onAdd(newItem.trim())
    setNewItem('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-forge-1 select-none">{label}</label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                'text-sm border transition-colors',
                /* Lit ink, base-accent ground. These chips are his fears, his
                   bonds and his flaws — «abandonment», «harming those he
                   loves» — and in eldritch on an eldritch/10 fill they
                   measured 3.98–4.13:1 at 14px, under V-2's floor. This is
                   the prep screen he reads before a session to remember who
                   he is playing; it is the last content in the app that
                   should be a squint. Fill and border unchanged, so the
                   colour still sorts fears from bonds at a glance. */
                variant === 'arcane' && 'bg-arcane/10 border-arcane/20 text-arcane-lit',
                variant === 'ember' && 'bg-ember/10 border-ember/20 text-ember-lit',
                variant === 'verdant' && 'bg-verdant/10 border-verdant/20 text-verdant',
                variant === 'eldritch' && 'bg-eldritch/10 border-eldritch/20 text-eldritch-lit',
                variant === 'neutral' && 'bg-white/[0.06] border-white/10 text-forge-1',
              )}
            >
              <span className="leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-current opacity-80 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${item}`}
              >
                <Trash2 size={12} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={placeholder}
          /* The <label> above is a bare <label> with no htmlFor and this input
             has no id, so it names nothing — it is a styled word sitting near
             a box. Naming the input directly is the smaller change and does
             not require minting ids for a list that renders five times. */
          aria-label={label}
          className={cn(
            'min-h-[44px] flex-1 rounded-xl',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-white/10',
            'font-body text-sm px-4',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
            'focus:outline-none',
          )}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        {/* The icon is aria-hidden, which was the whole name this button had.
            Found by the occlusion probe, of all things: the audit could only
            call it «BUTTON» because that is genuinely all it is called. Five
            of these render on prep/Persona at once — bonds, flaws, fears,
            ideals, traits — so «Add» alone would have named five different
            buttons the same thing. `label` is already in scope and already
            says which list this is. */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="shrink-0"
          aria-label={`Add to ${label}`}
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

export function PersonaEngine({ character, onUpdate }: PersonaEngineProps) {
  const suggestAI = useAI()
  const persona = ensurePersona(character)

  /** Helper to update persona fields */
  function updatePersona(updates: Partial<CharacterPersona>) {
    onUpdate({
      ...character,
      persona: {
        ...persona,
        ...updates,
        lastEditedAt: new Date().toISOString(),
      },
    })
  }

  /** AI Suggest Traits */
  const handleAISuggest = useCallback(async () => {
    try {
      const result = await suggestAI.queryStructured<{
        colorTraits: string[]
        coreTraits: string[]
        wants: string[]
        fears: string[]
        pressureResponse: string
      }>(
        SYSTEM_PROMPTS.personaBuilder(character),
        `Generate persona traits for ${character.name}, a level ${character.level} ${character.race} ${character.class} (${character.subclass}).`,
      )

      const updates: Partial<CharacterPersona> = {}
      if (result.colorTraits) {
        updates.colorTraits = [
          ...(persona.colorTraits ?? []),
          ...result.colorTraits.map(text => ({ text, category: 'color' as const })),
        ]
      }
      if (result.coreTraits) {
        updates.coreTraits = [
          ...(persona.coreTraits ?? []),
          ...result.coreTraits.map(text => ({ text, category: 'core' as const })),
        ]
      }
      if (result.wants) {
        updates.wants = [...(persona.wants ?? []), ...result.wants]
      }
      if (result.fears) {
        updates.fears = [...(persona.fears ?? []), ...result.fears]
      }
      if (result.pressureResponse && !persona.pressureResponse) {
        updates.pressureResponse = result.pressureResponse
      }

      updatePersona(updates)
    } catch {
      // error handled by hook
    }
  }, [character, persona, suggestAI])

  /* ------ Main Render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* text-xl, not text-lg: 20px is the Cinzel floor (--d-fs-title). This
            is the screen's own name and was rendering one step under it. */}
        <h2 className="font-display text-xl font-semibold text-forge-0">
          Persona Engine
        </h2>
        {persona.lastEditedAt && (
          <span className="text-xs text-forge-1 text-right">
            Last edited: {new Date(persona.lastEditedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Builder Content */}
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* AI Suggest button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleAISuggest}
          loading={suggestAI.loading}
          className="w-full"
        >
          <Sparkles size={16} aria-hidden />
          AI Suggest Traits
        </Button>

        {suggestAI.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-red-400">{suggestAI.error}</p>
          </div>
        )}

        {/* Color Traits */}
        <GlassCard>
          <EditableList
            label="Color Traits (flavor tics)"
            items={(persona.colorTraits ?? []).map(t => t.text)}
            onAdd={text => {
              updatePersona({
                colorTraits: [...(persona.colorTraits ?? []), { text, category: 'color' }],
              })
            }}
            onRemove={idx => {
              const updated = [...(persona.colorTraits ?? [])]
              updated.splice(idx, 1)
              updatePersona({ colorTraits: updated })
            }}
            placeholder="e.g., fidgets with a coin when lying"
            variant="arcane"
          />
        </GlassCard>

        {/* Core Traits */}
        <GlassCard>
          <EditableList
            label="Core Traits (defining behaviors)"
            items={(persona.coreTraits ?? []).map(t => t.text)}
            onAdd={text => {
              updatePersona({
                coreTraits: [...(persona.coreTraits ?? []), { text, category: 'core' }],
              })
            }}
            onRemove={idx => {
              const updated = [...(persona.coreTraits ?? [])]
              updated.splice(idx, 1)
              updatePersona({ coreTraits: updated })
            }}
            placeholder="e.g., never breaks a promise"
            variant="ember"
          />
        </GlassCard>

        {/* Wants */}
        <GlassCard>
          <EditableList
            label="Wants (motivations)"
            items={persona.wants ?? []}
            onAdd={text => {
              updatePersona({ wants: [...(persona.wants ?? []), text] })
            }}
            onRemove={idx => {
              const updated = [...(persona.wants ?? [])]
              updated.splice(idx, 1)
              updatePersona({ wants: updated })
            }}
            placeholder="e.g., find their missing sibling"
            variant="verdant"
          />
        </GlassCard>

        {/* Fears */}
        <GlassCard>
          <EditableList
            label="Fears (anxieties)"
            items={persona.fears ?? []}
            onAdd={text => {
              updatePersona({ fears: [...(persona.fears ?? []), text] })
            }}
            onRemove={idx => {
              const updated = [...(persona.fears ?? [])]
              updated.splice(idx, 1)
              updatePersona({ fears: updated })
            }}
            placeholder="e.g., abandonment"
            variant="eldritch"
          />
        </GlassCard>

        {/* Pressure Response */}
        <GlassCard>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-forge-1 select-none">
              Pressure Response
            </label>
            <textarea
              value={persona.pressureResponse ?? ''}
              onChange={e => updatePersona({ pressureResponse: e.target.value })}
              placeholder="How does this character behave under extreme stress?"
              rows={3}
              className={cn(
                'min-h-[80px] w-full rounded-xl resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-white/10',
                'font-body text-sm px-4 py-3',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
                'focus:outline-none',
              )}
            />
          </div>
        </GlassCard>

        {/* Relationships */}
        <GlassCard>
          <EditableList
            label="Relationships"
            items={persona.relationships ?? []}
            onAdd={text => {
              updatePersona({ relationships: [...(persona.relationships ?? []), text] })
            }}
            onRemove={idx => {
              const updated = [...(persona.relationships ?? [])]
              updated.splice(idx, 1)
              updatePersona({ relationships: updated })
            }}
            placeholder="e.g., rival with the town guard captain"
            variant="neutral"
          />
        </GlassCard>

        {/* Decision Tree */}
        <GlassCard>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-forge-1 select-none">
              Decision Tree
            </label>
            <textarea
              value={persona.decisionTree}
              onChange={e => updatePersona({ decisionTree: e.target.value })}
              placeholder="When faced with a choice, this character first considers..."
              rows={4}
              className={cn(
                'min-h-[88px] w-full rounded-xl resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-white/10',
                'font-body text-sm px-4 py-3',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
                'focus:outline-none',
              )}
            />
          </div>
        </GlassCard>

        {/* Default State */}
        <GlassCard>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-forge-1 select-none">
              Default State
            </label>
            <textarea
              value={persona.defaultState}
              onChange={e => updatePersona({ defaultState: e.target.value })}
              placeholder="How does this character appear when nothing is happening?"
              rows={3}
              className={cn(
                'min-h-[80px] w-full rounded-xl resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-white/10',
                'font-body text-sm px-4 py-3',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
                'focus:outline-none',
              )}
            />
          </div>
        </GlassCard>

        {/* Dialogue Bank */}
        <GlassCard>
          <DialogueBank character={character} onUpdate={onUpdate} />
        </GlassCard>

        {/* Scene Responses */}
        <GlassCard>
          <SceneResponseBank character={character} onUpdate={onUpdate} />
        </GlassCard>
      </div>
    </div>
  )
}
