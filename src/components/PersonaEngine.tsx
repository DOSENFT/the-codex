import { useState, useCallback } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Wand2,
  Eye,
  Pencil,
  Loader2,
  AlertTriangle,
  Heart,
  Shield,
  Zap,
  Users,
  MessageSquare,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character, CharacterPersona } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { DialogueBank } from './DialogueBank'
import { SceneResponseBank } from './SceneResponseBank'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PersonaEngineProps {
  character: Character
  onUpdate: (char: Character) => void
}

type PersonaTab = 'builder' | 'rp_aid'
type RPAidMode = 'study' | 'in_session'

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
                variant === 'arcane' && 'bg-arcane/10 border-arcane/20 text-arcane',
                variant === 'ember' && 'bg-ember/10 border-ember/20 text-ember',
                variant === 'verdant' && 'bg-verdant/10 border-verdant/20 text-verdant',
                variant === 'eldritch' && 'bg-eldritch/10 border-eldritch/20 text-eldritch',
                variant === 'neutral' && 'bg-white/[0.06] border-white/10 text-forge-1',
              )}
            >
              <span className="leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded text-current opacity-60 hover:opacity-100 transition-opacity"
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

export function PersonaEngine({ character, onUpdate }: PersonaEngineProps) {
  const [activeTab, setActiveTab] = useState<PersonaTab>('builder')
  const [rpMode, setRPMode] = useState<RPAidMode>('study')
  const [copiedPhrase, setCopiedPhrase] = useState<number | null>(null)
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

  /** Copy catchphrase to clipboard */
  async function copyCatchphrase(idx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPhrase(idx)
      setTimeout(() => setCopiedPhrase(null), 1500)
    } catch {
      // Not available
    }
  }

  /* ------ Builder Tab ------ */
  const renderBuilder = () => (
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
  )

  /* ------ RP Aid: Study Mode ------ */
  const renderStudyMode = () => (
    <div className="flex flex-col gap-4 animate-fade-in overflow-y-auto max-h-[70vh] pr-1">
      {/* Default State */}
      {persona.defaultState && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-arcane" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Default State</h4>
          </div>
          <p className="text-sm text-forge-1 leading-relaxed">{persona.defaultState}</p>
        </GlassCard>
      )}

      {/* Core Traits */}
      {(persona.coreTraits?.length ?? 0) > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-ember" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Core Traits</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {persona.coreTraits!.map((t, i) => (
              <Badge key={i} variant="ember">{t.text}</Badge>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Color Traits */}
      {(persona.colorTraits?.length ?? 0) > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-arcane" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Color Traits</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {persona.colorTraits!.map((t, i) => (
              <Badge key={i} variant="arcane">{t.text}</Badge>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Wants & Fears */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(persona.wants?.length ?? 0) > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-verdant" aria-hidden />
              <h4 className="text-sm font-semibold text-forge-0">Wants</h4>
            </div>
            <ul className="flex flex-col gap-1.5">
              {persona.wants!.map((w, i) => (
                <li key={i} className="text-sm text-forge-1 pl-2 border-l-2 border-verdant/30">
                  {w}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
        {(persona.fears?.length ?? 0) > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-eldritch" aria-hidden />
              <h4 className="text-sm font-semibold text-forge-0">Fears</h4>
            </div>
            <ul className="flex flex-col gap-1.5">
              {persona.fears!.map((f, i) => (
                <li key={i} className="text-sm text-forge-1 pl-2 border-l-2 border-eldritch/30">
                  {f}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

      {/* Pressure Response */}
      {persona.pressureResponse && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-ember" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Under Pressure</h4>
          </div>
          <p className="text-sm text-forge-1 leading-relaxed">{persona.pressureResponse}</p>
        </GlassCard>
      )}

      {/* Relationships */}
      {(persona.relationships?.length ?? 0) > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-arcane" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Relationships</h4>
          </div>
          <ul className="flex flex-col gap-1.5">
            {persona.relationships!.map((r, i) => (
              <li key={i} className="text-sm text-forge-1 pl-2 border-l-2 border-arcane/30">
                {r}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Decision Tree */}
      {persona.decisionTree && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-verdant" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Decision Tree</h4>
          </div>
          <p className="text-sm text-forge-1 leading-relaxed whitespace-pre-wrap">
            {persona.decisionTree}
          </p>
        </GlassCard>
      )}

      {/* Catchphrases (study mode - just displayed) */}
      {(persona.catchphrases?.length ?? 0) > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-eldritch" aria-hidden />
            <h4 className="text-sm font-semibold text-forge-0">Catchphrases</h4>
          </div>
          <div className="flex flex-col gap-2">
            {persona.catchphrases!.map((phrase, i) => (
              <p key={i} className="text-sm text-forge-1 italic pl-3 border-l-2 border-eldritch/30">
                &ldquo;{phrase}&rdquo;
              </p>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Patron */}
      {persona.patron.name && (
        <GlassCard>
          <h4 className="text-sm font-semibold text-forge-0 mb-2">
            Patron: {persona.patron.name}
          </h4>
          {persona.patron.domains.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {persona.patron.domains.map((d, i) => (
                <Badge key={i} variant="eldritch">{d}</Badge>
              ))}
            </div>
          )}
          {persona.patron.rpNotes && (
            <p className="text-sm text-forge-2 leading-relaxed">{persona.patron.rpNotes}</p>
          )}
        </GlassCard>
      )}

      {/* Dialogue Bank in study mode */}
      <GlassCard>
        <DialogueBank character={character} onUpdate={onUpdate} />
      </GlassCard>

      {/* Scene Responses in study mode */}
      <GlassCard>
        <SceneResponseBank character={character} onUpdate={onUpdate} />
      </GlassCard>
    </div>
  )

  /* ------ RP Aid: In-Session Mode ------ */
  const renderInSessionMode = () => {
    const favoriteDialogues = (persona.dialogueBank ?? []).filter(d => d.favorite)
    const allCatchphrases = persona.catchphrases ?? []

    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        {/* Quick-reference: Core + Color Traits */}
        {((persona.coreTraits?.length ?? 0) > 0 || (persona.colorTraits?.length ?? 0) > 0) && (
          <GlassCard>
            <h4 className="text-sm font-semibold text-forge-0 mb-3">Quick Traits</h4>
            <div className="flex flex-wrap gap-2">
              {(persona.coreTraits ?? []).map((t, i) => (
                <Badge key={`core-${i}`} variant="ember">{t.text}</Badge>
              ))}
              {(persona.colorTraits ?? []).map((t, i) => (
                <Badge key={`color-${i}`} variant="arcane">{t.text}</Badge>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Tap-to-copy Catchphrases */}
        {allCatchphrases.length > 0 && (
          <GlassCard>
            <h4 className="text-sm font-semibold text-forge-0 mb-3">Catchphrases</h4>
            <div className="flex flex-col gap-2">
              {allCatchphrases.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => copyCatchphrase(idx, phrase)}
                  className={cn(
                    'w-full min-h-[48px] px-4 py-3 rounded-xl text-left',
                    'bg-white/[0.04] border border-white/10',
                    'text-sm text-forge-1 italic',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    'hover:bg-white/[0.08] hover:border-white/20',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>&ldquo;{phrase}&rdquo;</span>
                    {copiedPhrase === idx ? (
                      <Check size={14} className="text-verdant shrink-0" aria-hidden />
                    ) : (
                      <Copy size={14} className="text-forge-2 shrink-0" aria-hidden />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Favorite Dialogue Lines (tap-to-copy) */}
        {favoriteDialogues.length > 0 && (
          <GlassCard>
            <h4 className="text-sm font-semibold text-forge-0 mb-3">Favorite Lines</h4>
            <div className="flex flex-col gap-2">
              {favoriteDialogues.map((line, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => copyCatchphrase(100 + idx, line.text)}
                  className={cn(
                    'w-full min-h-[48px] px-4 py-3 rounded-xl text-left',
                    'bg-white/[0.04] border border-white/10',
                    'text-sm text-forge-1 italic',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    'hover:bg-white/[0.08] hover:border-white/20',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span>&ldquo;{line.text}&rdquo;</span>
                      <Badge variant="neutral" className="ml-2">{line.context}</Badge>
                    </div>
                    {copiedPhrase === 100 + idx ? (
                      <Check size={14} className="text-verdant shrink-0" aria-hidden />
                    ) : (
                      <Copy size={14} className="text-forge-2 shrink-0" aria-hidden />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Patron quick card */}
        {persona.patron.name && (
          <GlassCard>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-forge-0">Patron</h4>
              <Badge variant="eldritch">{persona.patron.name}</Badge>
            </div>
            {persona.patron.domains.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {persona.patron.domains.map((d, i) => (
                  <Badge key={i} variant="neutral">{d}</Badge>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* Empty state for in-session */}
        {allCatchphrases.length === 0 && favoriteDialogues.length === 0 &&
          (persona.coreTraits?.length ?? 0) === 0 && (persona.colorTraits?.length ?? 0) === 0 && (
          <GlassCard className="p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-arcane/10 flex items-center justify-center">
                <Sparkles size={24} className="text-arcane" aria-hidden />
              </div>
              <p className="text-sm text-forge-2 max-w-xs">
                Build your persona in the Builder tab first. Your traits, catchphrases, and
                favorite dialogue lines will appear here for quick reference during play.
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    )
  }

  /* ------ RP Aid Tab ------ */
  const renderRPAid = () => (
    <div className="flex flex-col gap-4">
      {/* Study / In-Session toggle */}
      <div className="flex rounded-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setRPMode('study')}
          className={cn(
            'flex-1 min-h-[44px] px-4 text-sm font-medium',
            'flex items-center justify-center gap-2',
            'transition-all duration-200 ease-forge',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            rpMode === 'study'
              ? 'bg-arcane/15 text-arcane'
              : 'bg-white/[0.02] text-forge-2 hover:text-forge-1 hover:bg-white/[0.04]',
          )}
        >
          <BookOpen size={14} aria-hidden />
          Study
        </button>
        <button
          type="button"
          onClick={() => setRPMode('in_session')}
          className={cn(
            'flex-1 min-h-[44px] px-4 text-sm font-medium',
            'flex items-center justify-center gap-2',
            'transition-all duration-200 ease-forge',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            rpMode === 'in_session'
              ? 'bg-ember/15 text-ember'
              : 'bg-white/[0.02] text-forge-2 hover:text-forge-1 hover:bg-white/[0.04]',
          )}
        >
          <Wand2 size={14} aria-hidden />
          In-Session
        </button>
      </div>

      {rpMode === 'study' && renderStudyMode()}
      {rpMode === 'in_session' && renderInSessionMode()}
    </div>
  )

  /* ------ Main Render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-forge-0">
          Persona Engine
        </h2>
        {persona.lastEditedAt && (
          <span className="text-xs text-forge-2">
            Last edited: {new Date(persona.lastEditedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('builder')}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
            'text-sm font-medium select-none',
            'transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            activeTab === 'builder'
              ? 'bg-arcane/15 text-arcane border border-arcane/30'
              : 'bg-white/[0.04] text-forge-1 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
          )}
        >
          <Pencil size={14} aria-hidden />
          Builder
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rp_aid')}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
            'text-sm font-medium select-none',
            'transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            activeTab === 'rp_aid'
              ? 'bg-eldritch/15 text-eldritch border border-eldritch/30'
              : 'bg-white/[0.04] text-forge-1 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
          )}
        >
          <Eye size={14} aria-hidden />
          RP Aid
        </button>
      </div>

      {/* Content */}
      {activeTab === 'builder' && renderBuilder()}
      {activeTab === 'rp_aid' && renderRPAid()}
    </div>
  )
}
