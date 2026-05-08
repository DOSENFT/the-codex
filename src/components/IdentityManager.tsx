import { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  UserCheck,
  X,
  Theater,
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character, CharacterIdentity } from '../lib/character'
import {
  addIdentity,
  updateIdentity,
  removeIdentity,
  setActiveIdentity,
  shouldSurfaceMultiPersona,
  createBlankIdentity,
} from '../lib/identity'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IdentityManagerProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Tag Input (chips with add/remove)                   */
/* ------------------------------------------------------------------ */

function TagInput({
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
  const [value, setValue] = useState('')

  function handleAdd() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-forge-1 select-none">{label}</label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
                'border transition-colors',
                variant === 'arcane' && 'bg-gold/[0.08] border-gold/25 text-gold',
                variant === 'eldritch' && 'bg-gold/[0.06] border-bronze/25 text-bronze',
                variant === 'ember' && 'bg-gold/[0.08] border-gold/20 text-gold',
                variant === 'verdant' && 'bg-verdant/10 border-verdant/20 text-verdant',
                variant === 'neutral' && 'bg-gold/[0.06] border-bronze/25 text-forge-1',
              )}
            >
              <span className="leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="min-h-[24px] min-w-[24px] flex items-center justify-center rounded-full text-current opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${item}`}
              >
                <X size={10} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
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
          disabled={!value.trim()}
          className="shrink-0"
        >
          <Plus size={16} aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Textarea field                                       */
/* ------------------------------------------------------------------ */

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-forge-1 select-none">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-xl resize-none',
          'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
          'border border-bronze/25',
          'font-body text-sm px-4 py-3',
          'transition-all duration-200 ease-forge',
          'focus:border-arcane/60 focus:bg-void-2/80',
          'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
          'focus:outline-none',
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Identity Edit Form (inline accordion)               */
/* ------------------------------------------------------------------ */

function IdentityEditForm({
  identity,
  onUpdate,
}: {
  identity: CharacterIdentity
  onUpdate: (updates: Partial<CharacterIdentity>) => void
}) {
  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-gold/25">
      {/* Name */}
      <Input
        label="Name"
        value={identity.name}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder="Identity name..."
      />

      {/* Appearance */}
      <TextArea
        label="Appearance"
        value={identity.appearance ?? ''}
        onChange={val => onUpdate({ appearance: val })}
        placeholder="Physical description in this form..."
        rows={3}
      />

      {/* Accent */}
      <Input
        label="Accent"
        value={identity.accent ?? ''}
        onChange={e => onUpdate({ accent: e.target.value })}
        placeholder="Southern drawl, clipped aristocratic..."
      />

      {/* Mannerisms */}
      <TagInput
        label="Mannerisms"
        items={identity.mannerisms}
        onAdd={text => onUpdate({ mannerisms: [...identity.mannerisms, text] })}
        onRemove={idx => onUpdate({ mannerisms: identity.mannerisms.filter((_, i) => i !== idx) })}
        placeholder="Add a mannerism..."
        variant="arcane"
      />

      {/* Voice Notes */}
      <TextArea
        label="Voice Notes"
        value={identity.voiceNotes}
        onChange={val => onUpdate({ voiceNotes: val })}
        placeholder="How do you voice this identity? Pitch, cadence, signature phrases..."
        rows={2}
      />

      {/* Personality Traits */}
      <TagInput
        label="Personality Traits"
        items={identity.personalityTraits}
        onAdd={text => onUpdate({ personalityTraits: [...identity.personalityTraits, text] })}
        onRemove={idx => onUpdate({ personalityTraits: identity.personalityTraits.filter((_, i) => i !== idx) })}
        placeholder="Add a trait..."
        variant="eldritch"
      />

      {/* Triggers */}
      <TagInput
        label="Triggers (when to switch to this identity)"
        items={identity.triggers}
        onAdd={text => onUpdate({ triggers: [...identity.triggers, text] })}
        onRemove={idx => onUpdate({ triggers: identity.triggers.filter((_, i) => i !== idx) })}
        placeholder="e.g. 'entering nobility circles'..."
        variant="ember"
      />

      {/* Social Context */}
      <Input
        label="Social Context"
        value={identity.socialContext ?? ''}
        onChange={e => onUpdate({ socialContext: e.target.value })}
        placeholder="In court, Undercover, At the tavern..."
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Identity Card                                       */
/* ------------------------------------------------------------------ */

function IdentityCard({
  identity,
  isActive,
  isExpanded,
  onToggleActive,
  onToggleExpand,
  onUpdate,
  onDelete,
}: {
  identity: CharacterIdentity
  isActive: boolean
  isExpanded: boolean
  onToggleActive: () => void
  onToggleExpand: () => void
  onUpdate: (updates: Partial<CharacterIdentity>) => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <GlassCard
      className={cn(
        'combat-card ornate-border transition-all duration-200 ease-forge',
        isActive && [
          'border-gold/40',
          'shadow-[0_0_20px_-4px_rgba(197,165,90,0.25)]',
        ],
      )}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            isActive
              ? 'bg-gold/[0.15] text-gold'
              : 'bg-gold/[0.06] text-forge-2',
          )}
        >
          <Theater size={18} aria-hidden />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-forge-0 font-semibold text-sm truncate">
              {identity.name || 'Unnamed Identity'}
            </h3>
            {isActive && <Badge variant="eldritch">Active</Badge>}
            {identity.isDefault && <Badge variant="verdant">Default</Badge>}
          </div>

          {/* Preview details */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {identity.appearance && (
              <span className="text-xs text-forge-2 truncate max-w-[180px]">
                {identity.appearance}
              </span>
            )}
            {identity.mannerisms.length > 0 && (
              <Badge variant="neutral">
                {identity.mannerisms.length} mannerism{identity.mannerisms.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {identity.triggers.length > 0 && (
              <Badge variant="ember">
                {identity.triggers.length} trigger{identity.triggers.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {identity.accent && (
              <span className="text-xs text-forge-2 italic">
                {identity.accent}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleActive}
            className={cn(
              'text-xs',
              isActive && 'text-gold',
            )}
            aria-label={isActive ? 'Deactivate identity' : 'Set as active identity'}
          >
            <UserCheck size={16} aria-hidden />
            <span className="hidden sm:inline">{isActive ? 'Active' : 'Activate'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </Button>
        </div>
      </div>

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="mt-4">
          <IdentityEditForm identity={identity} onUpdate={onUpdate} />

          {/* Delete section */}
          <div className="mt-6 pt-4 border-t border-gold/15">
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={14} aria-hidden />
                Delete Identity
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-400">Delete permanently?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component: IdentityManager                                    */
/* ------------------------------------------------------------------ */

export function IdentityManager({ character, onCharacterUpdate }: IdentityManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const identities = character.identities ?? []
  const isMultiPersona = shouldSurfaceMultiPersona(character)

  /* ---- Handlers ---- */

  const handleAddIdentity = useCallback(() => {
    const blank = createBlankIdentity()
    const updated = addIdentity(character, blank)
    onCharacterUpdate(updated)
    // Expand the newly created identity (last in list)
    const newIdentities = updated.identities ?? []
    if (newIdentities.length > 0) {
      setExpandedId(newIdentities[newIdentities.length - 1].id)
    }
  }, [character, onCharacterUpdate])

  const handleUpdateIdentity = useCallback(
    (id: string, updates: Partial<CharacterIdentity>) => {
      const updated = updateIdentity(character, id, updates)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleRemoveIdentity = useCallback(
    (id: string) => {
      const updated = removeIdentity(character, id)
      onCharacterUpdate(updated)
      if (expandedId === id) setExpandedId(null)
    },
    [character, onCharacterUpdate, expandedId],
  )

  const handleToggleActive = useCallback(
    (id: string) => {
      const newActiveId = character.activeIdentityId === id ? undefined : id
      const updated = setActiveIdentity(character, newActiveId)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedId(prev => (prev === id ? null : id))
    },
    [],
  )

  /* ---- Render ---- */

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <OrnateHeader>
        {isMultiPersona ? 'Multi-Persona Mode' : 'Situational Personas'}
      </OrnateHeader>
      <p className="text-xs text-forge-2 text-center -mt-3">
        {isMultiPersona
          ? 'Manage distinct identities your character adopts'
          : 'Define alternate presentations for different situations'}
      </p>

      {/* Identity Cards */}
      {identities.length === 0 ? (
        <ParchmentCard className="flex flex-col items-center justify-center py-10 text-center">
          <Theater size={32} className="text-gold mb-3" aria-hidden />
          <p className="text-forge-0 text-sm font-display font-semibold tracking-wide">No identities defined</p>
          <p className="text-forge-2 text-xs mt-1 max-w-[280px]">
            Add an identity to track disguises, alternate forms, or situational personas.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddIdentity}
            className="mt-4"
          >
            <Plus size={16} aria-hidden />
            Add First Identity
          </Button>
        </ParchmentCard>
      ) : (
        <div className="flex flex-col gap-3">
          {identities.map(identity => (
            <IdentityCard
              key={identity.id}
              identity={identity}
              isActive={character.activeIdentityId === identity.id}
              isExpanded={expandedId === identity.id}
              onToggleActive={() => handleToggleActive(identity.id)}
              onToggleExpand={() => handleToggleExpand(identity.id)}
              onUpdate={updates => handleUpdateIdentity(identity.id, updates)}
              onDelete={() => handleRemoveIdentity(identity.id)}
            />
          ))}
        </div>
      )}

      {/* Add Identity Button (shown when list is non-empty) */}
      {identities.length > 0 && (
        <Button
          variant="secondary"
          size="md"
          onClick={handleAddIdentity}
          className="self-start"
        >
          <Plus size={16} aria-hidden />
          Add Identity
        </Button>
      )}
    </div>
  )
}
