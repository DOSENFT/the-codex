import { useState, useEffect, useCallback } from 'react'
import { X, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/cn'
import { type Character, type Spell, addSpell, updateSpell } from '../lib/character'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface SpellEditorProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  onCharacterUpdate: (char: Character) => void
  editSpell?: Spell | null // null = add mode, Spell = edit mode
}

const SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const

const SCHOOL_OPTIONS = SCHOOLS.map(s => ({ value: s, label: s }))

const LEVEL_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? 'Cantrip' : `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Level`,
}))

const CASTING_TIME_OPTIONS = [
  { value: '1 Action', label: '1 Action' },
  { value: '1 Bonus Action', label: '1 Bonus Action' },
  { value: '1 Reaction', label: '1 Reaction' },
  { value: '1 Minute', label: '1 Minute' },
  { value: '10 Minutes', label: '10 Minutes' },
  { value: '1 Hour', label: '1 Hour' },
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
// Default Spell State
// ---------------------------------------------------------------------------

function emptySpell(): Spell {
  return {
    name: '',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    description: '',
    higherLevels: '',
    prepared: false,
    source: '',
    damageType: '',
    damageDice: '',
    saveType: '',
    areaOfEffect: '',
    tacticalNote: '',
  }
}

// ---------------------------------------------------------------------------
// Toggle Chip Component
// ---------------------------------------------------------------------------

function ToggleChip({
  label,
  active,
  onToggle,
  variant = 'arcane',
}: {
  label: string
  active: boolean
  onToggle: () => void
  variant?: 'arcane' | 'ember' | 'verdant'
}) {
  const activeStyles: Record<string, string> = {
    arcane: 'bg-arcane/15 text-arcane border-arcane/25',
    ember: 'bg-ember/15 text-ember border-ember/25',
    verdant: 'bg-verdant/15 text-verdant border-verdant/25',
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'min-h-[44px] px-4 rounded-xl',
        'text-sm font-medium whitespace-nowrap',
        'border',
        'transition-all duration-200 ease-forge',
        'active:scale-[0.95]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        active
          ? activeStyles[variant]
          : 'bg-white/5 text-forge-2 border-white/5 hover:bg-white/8 hover:text-forge-1',
      )}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// SpellEditor Component
// ---------------------------------------------------------------------------

export function SpellEditor({
  isOpen,
  onClose,
  character,
  onCharacterUpdate,
  editSpell,
}: SpellEditorProps) {
  const isEditMode = !!editSpell
  const [showFullDetails, setShowFullDetails] = useState(isEditMode)
  const [form, setForm] = useState<Spell>(editSpell ?? emptySpell())
  const [nameError, setNameError] = useState('')

  // Reset form when modal opens/closes or editSpell changes
  useEffect(() => {
    if (isOpen) {
      const initial = editSpell ?? emptySpell()
      setForm(initial)
      setShowFullDetails(!!editSpell)
      setNameError('')
    }
  }, [isOpen, editSpell])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // --- Field handlers ---

  const updateField = useCallback(<K extends keyof Spell>(key: K, value: Spell[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name') setNameError('')
  }, [])

  // --- Validation & Submit ---

  const handleSave = useCallback(() => {
    const trimmedName = form.name.trim()

    if (!trimmedName) {
      setNameError('Spell name is required')
      return
    }

    // Check uniqueness: name must not already exist (unless editing the same spell)
    const existingSpell = character.spells.find(
      s => s.name.toLowerCase() === trimmedName.toLowerCase(),
    )
    if (existingSpell && (!isEditMode || editSpell!.name.toLowerCase() !== trimmedName.toLowerCase())) {
      setNameError('A spell with this name already exists')
      return
    }

    const spellToSave: Spell = {
      ...form,
      name: trimmedName,
      damageType: form.damageType || undefined,
      damageDice: form.damageDice || undefined,
      saveType: form.saveType || undefined,
      areaOfEffect: form.areaOfEffect || undefined,
      tacticalNote: form.tacticalNote || undefined,
      higherLevels: form.higherLevels || undefined,
      source: form.source || undefined,
    } as Spell

    let updated: Character
    if (isEditMode) {
      updated = updateSpell(character, editSpell!.name, spellToSave)
    } else {
      updated = addSpell(character, spellToSave)
    }

    onCharacterUpdate(updated)
    onClose()
  }, [form, character, isEditMode, editSpell, onCharacterUpdate, onClose])

  // --- Render ---

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? `Edit spell: ${editSpell!.name}` : 'Add new spell'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void-0/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg max-h-[90vh]',
          'bg-void-1 border border-white/10 rounded-t-2xl sm:rounded-2xl',
          'shadow-[0_0_48px_-12px_rgba(61,210,255,0.15)]',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-4 duration-300',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 size={16} className="text-arcane shrink-0" aria-hidden />
            <h2 className="font-display text-sm font-bold text-forge-0 truncate">
              {isEditMode ? 'Edit Spell' : 'Add Spell'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close spell editor"
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

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain space-y-4">
          {/* Mode toggle: Quick Add vs Full Details */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFullDetails(false)}
              className={cn(
                'flex-1 min-h-[44px] px-3 rounded-xl',
                'text-sm font-medium',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                !showFullDetails
                  ? 'bg-arcane/15 text-arcane border-arcane/25'
                  : 'bg-white/5 text-forge-2 border-white/5 hover:bg-white/8 hover:text-forge-1',
              )}
            >
              Quick Add
            </button>
            <button
              type="button"
              onClick={() => setShowFullDetails(true)}
              className={cn(
                'flex-1 min-h-[44px] px-3 rounded-xl',
                'text-sm font-medium',
                'border transition-all duration-200 ease-forge',
                'active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                showFullDetails
                  ? 'bg-arcane/15 text-arcane border-arcane/25'
                  : 'bg-white/5 text-forge-2 border-white/5 hover:bg-white/8 hover:text-forge-1',
              )}
            >
              Full Details
            </button>
          </div>

          {/* --- Core Fields (always shown) --- */}
          <GlassCard className="p-4 space-y-3">
            {/* Name */}
            <Input
              label="Spell Name"
              placeholder="e.g. Fireball"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              error={nameError}
              autoFocus
            />

            {/* Level & School row */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Level"
                options={LEVEL_OPTIONS}
                value={String(form.level)}
                onChange={e => updateField('level', Number(e.target.value))}
              />
              <Select
                label="School"
                options={SCHOOL_OPTIONS}
                value={form.school}
                onChange={e => updateField('school', e.target.value)}
              />
            </div>

            {/* Toggle chips: Concentration, Ritual, Prepared */}
            <div className="flex flex-wrap gap-2 pt-1">
              <ToggleChip
                label="Concentration"
                active={form.concentration}
                onToggle={() => updateField('concentration', !form.concentration)}
                variant="ember"
              />
              <ToggleChip
                label="Ritual"
                active={form.ritual}
                onToggle={() => updateField('ritual', !form.ritual)}
                variant="verdant"
              />
              <ToggleChip
                label="Prepared"
                active={form.prepared}
                onToggle={() => updateField('prepared', !form.prepared)}
                variant="arcane"
              />
            </div>
          </GlassCard>

          {/* --- Full Details Section --- */}
          {showFullDetails && (
            <div className="space-y-4 animate-fade-in">
              {/* Casting Details */}
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                  Casting Details
                </h3>

                <Select
                  label="Casting Time"
                  options={CASTING_TIME_OPTIONS}
                  value={form.castingTime}
                  onChange={e => updateField('castingTime', e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Range"
                    placeholder="e.g. 60 feet"
                    value={form.range}
                    onChange={e => updateField('range', e.target.value)}
                  />
                  <Input
                    label="Duration"
                    placeholder="e.g. 1 minute"
                    value={form.duration}
                    onChange={e => updateField('duration', e.target.value)}
                  />
                </div>

                <Input
                  label="Components"
                  placeholder="e.g. V, S, M (a tiny ball of bat guano)"
                  value={form.components}
                  onChange={e => updateField('components', e.target.value)}
                />
              </GlassCard>

              {/* Description */}
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                  Description
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-forge-1 select-none">
                    Effect
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => updateField('description', e.target.value)}
                    placeholder="Describe what the spell does..."
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-forge-1 select-none">
                    At Higher Levels
                  </label>
                  <textarea
                    value={form.higherLevels ?? ''}
                    onChange={e => updateField('higherLevels', e.target.value)}
                    placeholder="Optional: effects when cast at a higher level..."
                    rows={2}
                    className={cn(
                      'min-h-[60px] w-full rounded-xl resize-y',
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

                <Input
                  label="Source"
                  placeholder="e.g. PHB, XGE, Homebrew"
                  value={form.source ?? ''}
                  onChange={e => updateField('source', e.target.value)}
                />
              </GlassCard>

              {/* Combat Stats */}
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                  Combat Stats
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Damage Type"
                    options={DAMAGE_TYPE_OPTIONS}
                    value={form.damageType ?? ''}
                    onChange={e => updateField('damageType', e.target.value)}
                  />
                  <Input
                    label="Damage Dice"
                    placeholder="e.g. 8d6"
                    value={form.damageDice ?? ''}
                    onChange={e => updateField('damageDice', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Save Type"
                    options={SAVE_TYPE_OPTIONS}
                    value={form.saveType ?? ''}
                    onChange={e => updateField('saveType', e.target.value)}
                  />
                  <Input
                    label="Area of Effect"
                    placeholder="e.g. 20ft radius"
                    value={form.areaOfEffect ?? ''}
                    onChange={e => updateField('areaOfEffect', e.target.value)}
                  />
                </div>

                <Input
                  label="Tactical Note"
                  placeholder="Brief combat tip..."
                  value={form.tacticalNote ?? ''}
                  onChange={e => updateField('tacticalNote', e.target.value)}
                />
              </GlassCard>
            </div>
          )}

          {/* Collapsed full-details hint */}
          {!showFullDetails && (
            <button
              type="button"
              onClick={() => setShowFullDetails(true)}
              className={cn(
                'w-full min-h-[44px] flex items-center justify-center gap-1.5',
                'rounded-xl border border-white/5 text-xs font-medium text-forge-2',
                'hover:bg-white/[0.03] hover:text-forge-1',
                'transition-colors duration-200',
                'active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              <ChevronDown size={14} aria-hidden />
              Add casting time, description, combat stats...
            </button>
          )}
        </div>

        {/* Footer — action buttons */}
        <div className="flex gap-3 p-4 border-t border-white/5 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            className="flex-1"
          >
            {isEditMode ? 'Save Changes' : 'Add Spell'}
          </Button>
        </div>
      </div>
    </div>
  )
}
