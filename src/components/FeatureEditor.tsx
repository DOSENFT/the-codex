import { useState, useEffect, useCallback } from 'react'
import { X, Shield } from 'lucide-react'
import { cn } from '../lib/cn'
import { type Character, type ClassFeature } from '../lib/character'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface FeatureEditorProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  onCharacterUpdate: (char: Character) => void
  editFeature?: ClassFeature | null
}

const ACTION_TYPE_OPTIONS = [
  { value: 'action', label: 'Action' },
  { value: 'bonusAction', label: 'Bonus Action' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'passive', label: 'Passive' },
  { value: 'none', label: 'None / Free' },
]

const USES_PER_REST_OPTIONS = [
  { value: '', label: 'No limit' },
  { value: 'short', label: 'Short Rest' },
  { value: 'long', label: 'Long Rest' },
  { value: 'unlimited', label: 'At Will' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'class', label: 'Class' },
  { value: 'subclass', label: 'Subclass' },
  { value: 'racial', label: 'Racial' },
  { value: 'feat', label: 'Feat' },
]

const DAMAGE_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Acid', label: 'Acid' },
  { value: 'Cold', label: 'Cold' },
  { value: 'Fire', label: 'Fire' },
  { value: 'Force', label: 'Force' },
  { value: 'Lightning', label: 'Lightning' },
  { value: 'Necrotic', label: 'Necrotic' },
  { value: 'Poison', label: 'Poison' },
  { value: 'Psychic', label: 'Psychic' },
  { value: 'Radiant', label: 'Radiant' },
  { value: 'Thunder', label: 'Thunder' },
]

const SAVE_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'STR', label: 'STR' },
  { value: 'DEX', label: 'DEX' },
  { value: 'CON', label: 'CON' },
  { value: 'INT', label: 'INT' },
  { value: 'WIS', label: 'WIS' },
  { value: 'CHA', label: 'CHA' },
]

// ---------------------------------------------------------------------------
// Default Feature
// ---------------------------------------------------------------------------

function emptyFeature(): ClassFeature {
  return {
    name: '',
    level: 1,
    description: '',
    actionType: 'action',
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureEditor({ isOpen, onClose, character, onCharacterUpdate, editFeature }: FeatureEditorProps) {
  const isEditMode = !!editFeature
  const [form, setForm] = useState<ClassFeature>(editFeature ?? emptyFeature())
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(editFeature ?? emptyFeature())
      setNameError('')
    }
  }, [isOpen, editFeature])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const updateField = useCallback(<K extends keyof ClassFeature>(key: K, value: ClassFeature[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name') setNameError('')
  }, [])

  const handleSave = useCallback(() => {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setNameError('Feature name is required')
      return
    }

    const existing = character.features.find(
      f => f.name.toLowerCase() === trimmedName.toLowerCase(),
    )
    if (existing && (!isEditMode || editFeature!.name.toLowerCase() !== trimmedName.toLowerCase())) {
      setNameError('A feature with this name already exists')
      return
    }

    const featureToSave: ClassFeature = {
      ...form,
      name: trimmedName,
      range: form.range || undefined,
      damageDice: form.damageDice || undefined,
      damageType: form.damageType || undefined,
      saveType: form.saveType || undefined,
      duration: form.duration || undefined,
      source: form.source || undefined,
      tacticalNote: form.tacticalNote || undefined,
      category: form.category || undefined,
    }

    let features: ClassFeature[]
    if (isEditMode) {
      features = character.features.map(f =>
        f.name === editFeature!.name ? featureToSave : f,
      )
    } else {
      features = [...character.features, featureToSave]
    }

    onCharacterUpdate({ ...character, features })
    onClose()
  }, [form, character, isEditMode, editFeature, onCharacterUpdate, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? `Edit feature: ${editFeature!.name}` : 'Add new feature'}
    >
      <div className="absolute inset-0 bg-void-0/80 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'relative w-full sm:max-w-lg max-h-[90vh]',
          'bg-void-1 border border-white/10 rounded-t-2xl sm:rounded-2xl',
          'shadow-[0_0_48px_-12px_rgba(157,78,221,0.15)]',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-4 duration-300',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={16} className="text-eldritch shrink-0" aria-hidden />
            <h2 className="font-display text-sm font-bold text-forge-0 truncate">
              {isEditMode ? 'Edit Feature' : 'Add Feature'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feature editor"
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-colors duration-200',
              'active:scale-[0.92]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain space-y-4">
          {/* Core fields */}
          <GlassCard className="p-4 space-y-3">
            <Input
              label="Feature Name"
              placeholder="e.g. Divine Sense"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              error={nameError}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Level Gained"
                placeholder="1"
                type="number"
                value={String(form.level)}
                onChange={e => updateField('level', Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
              <Select
                label="Action Type"
                options={ACTION_TYPE_OPTIONS}
                value={form.actionType ?? 'action'}
                onChange={e => updateField('actionType', e.target.value as ClassFeature['actionType'])}
              />
            </div>

            <p className="text-[10px] text-forge-2">
              What action does this use? Action, Bonus Action, Reaction, or Passive (always on)?
            </p>
          </GlassCard>

          {/* Description */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">Description</h3>
            <div className="flex flex-col gap-1.5">
              <textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Describe what this feature does..."
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

          {/* Usage */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">Usage Limits</h3>
            <p className="text-[10px] text-forge-2">How many times can you use it before resting?</p>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Recharges On"
                options={USES_PER_REST_OPTIONS}
                value={form.usesPerRest ?? ''}
                onChange={e => updateField('usesPerRest', (e.target.value || undefined) as ClassFeature['usesPerRest'])}
              />
              <Input
                label="Max Uses"
                placeholder="e.g. 3"
                type="number"
                value={form.usesMax !== undefined ? String(form.usesMax) : ''}
                onChange={e => {
                  const val = Number(e.target.value)
                  if (e.target.value === '') {
                    updateField('usesMax', undefined)
                    updateField('usesCurrent', undefined)
                  } else {
                    updateField('usesMax', Math.max(1, val))
                    if (form.usesCurrent === undefined) {
                      updateField('usesCurrent', Math.max(1, val))
                    }
                  }
                }}
              />
            </div>
          </GlassCard>

          {/* Combat Stats */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">Combat Stats</h3>
            <p className="text-[10px] text-forge-2">What dice do you roll? Does it have a range?</p>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Range"
                placeholder="e.g. 60 feet"
                value={form.range ?? ''}
                onChange={e => updateField('range', e.target.value)}
              />
              <Input
                label="Duration"
                placeholder="e.g. 1 minute"
                value={form.duration ?? ''}
                onChange={e => updateField('duration', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Damage Dice"
                placeholder="e.g. 2d8"
                value={form.damageDice ?? ''}
                onChange={e => updateField('damageDice', e.target.value)}
              />
              <Select
                label="Damage Type"
                options={DAMAGE_TYPE_OPTIONS}
                value={form.damageType ?? ''}
                onChange={e => updateField('damageType', e.target.value)}
              />
            </div>

            <Select
              label="Save Type"
              options={SAVE_TYPE_OPTIONS}
              value={form.saveType ?? ''}
              onChange={e => updateField('saveType', e.target.value)}
            />

            <Input
              label="Tactical Note"
              placeholder="Brief combat tip..."
              value={form.tacticalNote ?? ''}
              onChange={e => updateField('tacticalNote', e.target.value)}
            />
          </GlassCard>

          {/* Metadata */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">Metadata</h3>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={form.category ?? ''}
                onChange={e => updateField('category', (e.target.value || undefined) as ClassFeature['category'])}
              />
              <Input
                label="Source"
                placeholder="e.g. PHB p.84"
                value={form.source ?? ''}
                onChange={e => updateField('source', e.target.value)}
              />
            </div>
          </GlassCard>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/5 shrink-0">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="flex-1">
            {isEditMode ? 'Save Changes' : 'Add Feature'}
          </Button>
        </div>
      </div>
    </div>
  )
}
