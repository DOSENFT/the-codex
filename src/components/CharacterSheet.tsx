import { useState } from 'react'
import { X, Plus, Trash2, Edit3, Check, Shield, Swords, Brain, Eye, Backpack } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import type { Character, Weapon, AbilityScores, AbilityKey, SkillName } from '../lib/character'
import { abilityModifier, skillBonus, savingThrowBonus, passivePerception, attackBonus, computeSpellSaveDC, computeSpellAttackBonus } from '../lib/character'
import { ALL_SKILLS, ALL_ABILITIES, ABILITY_NAMES, SKILL_ABILITIES } from '../lib/dnd-rules'

interface CharacterSheetProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  onUpdate: (char: Character) => void
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function AbilityScoreGrid({ character, onUpdate }: { character: Character; onUpdate: (c: Character) => void }) {
  const [editing, setEditing] = useState<AbilityKey | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (ability: AbilityKey) => {
    setEditing(ability)
    setEditValue(String(character.abilityScores[ability]))
  }

  const commitEdit = () => {
    if (!editing) return
    const val = Math.max(1, Math.min(30, Number(editValue) || 10))
    const scores = { ...character.abilityScores, [editing]: val }
    onUpdate({ ...character, abilityScores: scores })
    setEditing(null)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {ALL_ABILITIES.map((ability) => {
        const score = character.abilityScores[ability]
        const mod = abilityModifier(score)
        const isEditing = editing === ability

        return (
          <button
            key={ability}
            type="button"
            onClick={() => !isEditing && startEdit(ability)}
            className={cn(
              'flex flex-col items-center gap-0.5 p-3 rounded-xl',
              'border transition-all duration-200 ease-forge',
              'active:scale-95',
              'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]',
            )}
          >
            <span className="text-[10px] font-mono font-bold text-forge-2 uppercase tracking-wider">
              {ability}
            </span>
            {isEditing ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                className="w-12 text-center text-lg font-bold bg-transparent border-b border-arcane text-forge-0 outline-none"
                autoFocus
                min={1}
                max={30}
              />
            ) : (
              <span className="text-lg font-bold text-forge-0">{score}</span>
            )}
            <span className={cn(
              'text-sm font-mono font-semibold',
              mod >= 0 ? 'text-verdant' : 'text-red-400',
            )}>
              {formatMod(mod)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SavingThrowsList({ character, onUpdate }: { character: Character; onUpdate: (c: Character) => void }) {
  const toggleSave = (ability: AbilityKey) => {
    const profs = character.savingThrowProficiencies.includes(ability)
      ? character.savingThrowProficiencies.filter(a => a !== ability)
      : [...character.savingThrowProficiencies, ability]
    onUpdate({ ...character, savingThrowProficiencies: profs })
  }

  return (
    <div className="flex flex-col gap-1">
      {ALL_ABILITIES.map((ability) => {
        const bonus = savingThrowBonus(character, ability)
        const proficient = character.savingThrowProficiencies.includes(ability)
        return (
          <button
            key={ability}
            type="button"
            onClick={() => toggleSave(ability)}
            className={cn(
              'flex items-center justify-between min-h-[40px] px-3 py-1.5 rounded-lg',
              'transition-all duration-200 ease-forge active:scale-[0.98]',
              proficient
                ? 'bg-verdant/8 border border-verdant/20'
                : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]',
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full border-2',
                proficient ? 'bg-verdant border-verdant' : 'border-forge-2',
              )} />
              <span className="text-sm text-forge-1">{ABILITY_NAMES[ability]}</span>
            </div>
            <span className={cn(
              'font-mono text-sm font-semibold',
              bonus >= 0 ? 'text-verdant' : 'text-red-400',
            )}>
              {formatMod(bonus)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SkillsList({ character, onUpdate }: { character: Character; onUpdate: (c: Character) => void }) {
  const toggleSkill = (skill: SkillName) => {
    const hasProf = character.skillProficiencies.includes(skill)
    const hasExpertise = character.skillExpertise.includes(skill)

    if (!hasProf) {
      // Add proficiency
      onUpdate({ ...character, skillProficiencies: [...character.skillProficiencies, skill] })
    } else if (!hasExpertise) {
      // Upgrade to expertise
      onUpdate({ ...character, skillExpertise: [...character.skillExpertise, skill] })
    } else {
      // Remove both
      onUpdate({
        ...character,
        skillProficiencies: character.skillProficiencies.filter(s => s !== skill),
        skillExpertise: character.skillExpertise.filter(s => s !== skill),
      })
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {ALL_SKILLS.map((skill) => {
        const bonus = skillBonus(character, skill)
        const proficient = character.skillProficiencies.includes(skill)
        const expertise = character.skillExpertise.includes(skill)
        const ability = SKILL_ABILITIES[skill]

        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggleSkill(skill)}
            className={cn(
              'flex items-center justify-between min-h-[36px] px-3 py-1 rounded-lg',
              'transition-all duration-200 ease-forge active:scale-[0.98]',
              expertise
                ? 'bg-arcane/8 border border-arcane/20'
                : proficient
                  ? 'bg-verdant/8 border border-verdant/20'
                  : 'bg-transparent hover:bg-white/[0.03]',
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full border-2',
                expertise ? 'bg-arcane border-arcane' : proficient ? 'bg-verdant border-verdant' : 'border-forge-2/50',
              )} />
              <span className="text-sm text-forge-1">{skill}</span>
              <span className="text-[10px] text-forge-2/60 font-mono">{ability}</span>
            </div>
            <span className={cn(
              'font-mono text-xs font-semibold',
              bonus >= 0 ? 'text-verdant' : 'text-red-400',
            )}>
              {formatMod(bonus)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function WeaponsList({ character, onUpdate }: { character: Character; onUpdate: (c: Character) => void }) {
  const [adding, setAdding] = useState(false)
  const [newWeapon, setNewWeapon] = useState<Partial<Weapon>>({
    name: '', attackType: 'melee', abilityMod: 'STR', proficient: true,
    damageDice: '1d8', damageType: 'Slashing', properties: [],
  })

  const addWeapon = () => {
    if (!newWeapon.name?.trim()) return
    const weapon: Weapon = {
      name: newWeapon.name!.trim(),
      attackType: newWeapon.attackType ?? 'melee',
      abilityMod: newWeapon.abilityMod ?? 'STR',
      proficient: newWeapon.proficient ?? true,
      damageDice: newWeapon.damageDice ?? '1d8',
      damageType: newWeapon.damageType ?? 'Slashing',
      properties: newWeapon.properties ?? [],
      magical: newWeapon.magical,
      bonusToHit: newWeapon.bonusToHit,
      bonusDamage: newWeapon.bonusDamage,
    }
    onUpdate({ ...character, weapons: [...character.weapons, weapon] })
    setAdding(false)
    setNewWeapon({ name: '', attackType: 'melee', abilityMod: 'STR', proficient: true, damageDice: '1d8', damageType: 'Slashing', properties: [] })
  }

  const removeWeapon = (index: number) => {
    const weapons = character.weapons.filter((_, i) => i !== index)
    onUpdate({ ...character, weapons })
  }

  return (
    <div className="flex flex-col gap-2">
      {character.weapons.map((weapon, i) => {
        const toHit = attackBonus(character, weapon)
        const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)

        return (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-forge-0">{weapon.name}</span>
                {weapon.magical && <Badge variant="arcane" className="text-[9px]">Magic</Badge>}
              </div>
              <span className="text-xs text-forge-2">
                {weapon.damageDice}{dmgMod >= 0 ? `+${dmgMod}` : dmgMod} {weapon.damageType}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-verdant">
                {formatMod(toHit)} hit
              </span>
              <button
                type="button"
                onClick={() => removeWeapon(i)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                aria-label={`Remove ${weapon.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )
      })}

      {adding ? (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-arcane/20 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Weapon name"
            value={newWeapon.name}
            onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
            className="min-h-[40px] w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none focus:border-arcane/40"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newWeapon.abilityMod}
              onChange={(e) => setNewWeapon({ ...newWeapon, abilityMod: e.target.value as AbilityKey })}
              className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 outline-none"
            >
              {ALL_ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              type="text"
              placeholder="Damage (e.g. 1d8)"
              value={newWeapon.damageDice}
              onChange={(e) => setNewWeapon({ ...newWeapon, damageDice: e.target.value })}
              className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Damage type"
              value={newWeapon.damageType}
              onChange={(e) => setNewWeapon({ ...newWeapon, damageType: e.target.value })}
              className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none"
            />
            <select
              value={newWeapon.attackType}
              onChange={(e) => setNewWeapon({ ...newWeapon, attackType: e.target.value as 'melee' | 'ranged' })}
              className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 outline-none"
            >
              <option value="melee">Melee</option>
              <option value="ranged">Ranged</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-forge-1 cursor-pointer">
            <input
              type="checkbox"
              checked={newWeapon.magical ?? false}
              onChange={(e) => setNewWeapon({ ...newWeapon, magical: e.target.checked })}
              className="accent-arcane"
            />
            Magical weapon
          </label>
          {newWeapon.magical && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="+Hit bonus"
                value={newWeapon.bonusToHit ?? ''}
                onChange={(e) => setNewWeapon({ ...newWeapon, bonusToHit: Number(e.target.value) || 0 })}
                className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none"
              />
              <input
                type="number"
                placeholder="+Dmg bonus"
                value={newWeapon.bonusDamage ?? ''}
                onChange={(e) => setNewWeapon({ ...newWeapon, bonusDamage: Number(e.target.value) || 0 })}
                className="min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={addWeapon} className="flex-1 gap-1">
              <Check size={14} /> Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-dashed border-white/10 text-sm text-forge-2 hover:bg-white/[0.03] hover:text-forge-1 transition-all active:scale-[0.98]"
        >
          <Plus size={16} /> Add Weapon
        </button>
      )}
    </div>
  )
}

function EquipmentList({ character, onUpdate }: { character: Character; onUpdate: (c: Character) => void }) {
  const [newItem, setNewItem] = useState('')
  const [addingTo, setAddingTo] = useState<'equipment' | 'supplies' | null>(null)

  const addItem = (type: 'equipment' | 'supplies') => {
    if (!newItem.trim()) return
    const list = [...(character[type] ?? []), newItem.trim()]
    onUpdate({ ...character, [type]: list })
    setNewItem('')
    setAddingTo(null)
  }

  const removeItem = (type: 'equipment' | 'supplies', index: number) => {
    const list = (character[type] ?? []).filter((_: string, i: number) => i !== index)
    onUpdate({ ...character, [type]: list })
  }

  const renderList = (type: 'equipment' | 'supplies', label: string) => {
    const items = character[type] ?? []
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-forge-1">{label}</h4>
        {items.length === 0 && addingTo !== type && (
          <p className="text-xs text-forge-2/60 italic">No {label.toLowerCase()} yet</p>
        )}
        {items.map((item: string, i: number) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-sm text-forge-1">{item}</span>
            <button
              type="button"
              onClick={() => removeItem(type, i)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label={`Remove ${item}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {addingTo === type ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(type)}
              placeholder={type === 'equipment' ? 'Rope, torch, etc.' : 'Health Potion x3'}
              className="flex-1 min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 px-3 text-sm text-forge-0 placeholder:text-forge-2/50 outline-none focus:border-arcane/40"
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={() => addItem(type)} className="gap-1">
              <Check size={14} /> Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setAddingTo(null); setNewItem('') }}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAddingTo(type); setNewItem('') }}
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-dashed border-white/10 text-sm text-forge-2 hover:bg-white/[0.03] hover:text-forge-1 transition-all active:scale-[0.98]"
          >
            <Plus size={16} /> Add {label.slice(0, -1)}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Gender/Pronouns display */}
      {(character.gender || character.pronouns) && (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {character.gender && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-forge-2">Gender:</span>
              <span className="text-forge-0 font-medium">{character.gender}</span>
            </div>
          )}
          {character.pronouns && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-forge-2">Pronouns:</span>
              <span className="text-forge-0 font-medium">{character.pronouns}</span>
            </div>
          )}
        </div>
      )}
      {renderList('equipment', 'Equipment')}
      {renderList('supplies', 'Supplies')}
    </div>
  )
}

export function CharacterSheet({ isOpen, onClose, character, onUpdate }: CharacterSheetProps) {
  const [activeSection, setActiveSection] = useState<'abilities' | 'saves' | 'skills' | 'weapons' | 'gear'>('abilities')

  const spellDC = computeSpellSaveDC(character)
  const spellAtk = computeSpellAttackBonus(character)
  const passive = passivePerception(character)

  const sections = [
    { id: 'abilities' as const, label: 'Stats', icon: Brain },
    { id: 'saves' as const, label: 'Saves', icon: Shield },
    { id: 'skills' as const, label: 'Skills', icon: Eye },
    { id: 'weapons' as const, label: 'Arms', icon: Swords },
    { id: 'gear' as const, label: 'Gear', icon: Backpack },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[92dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0',
          'animate-slide-up',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-forge-2/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-forge-0">{character.name}</h2>
            <p className="text-xs text-forge-2">
              {character.race} {character.class} ({character.subclass}) &middot; Lvl {character.level}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-forge-2 hover:text-forge-0 hover:bg-white/[0.06] transition-all active:scale-95"
            aria-label="Close character sheet"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] font-mono text-forge-2 uppercase">AC</span>
              <span className="text-lg font-bold text-forge-0">{character.armorClass}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] font-mono text-forge-2 uppercase">Prof</span>
              <span className="text-lg font-bold text-arcane">{formatMod(character.proficiencyBonus)}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] font-mono text-forge-2 uppercase">DC</span>
              <span className="text-lg font-bold text-ember">{spellDC}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] font-mono text-forge-2 uppercase">Spell</span>
              <span className="text-lg font-bold text-eldritch">{formatMod(spellAtk)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-forge-2">
            <Eye size={12} className="text-forge-2" />
            Passive Perception: <span className="font-mono font-semibold text-forge-1">{passive}</span>
          </div>
        </div>

        {/* Section tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.03]">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg text-xs font-medium',
                  'transition-all duration-200 ease-forge active:scale-[0.97]',
                  activeSection === id
                    ? 'bg-arcane/15 text-arcane border border-arcane/25'
                    : 'text-forge-2 hover:text-forge-1 hover:bg-white/[0.04]',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Section content */}
        <div className="px-4 pb-8 safe-bottom">
          {activeSection === 'abilities' && (
            <AbilityScoreGrid character={character} onUpdate={onUpdate} />
          )}
          {activeSection === 'saves' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-forge-2">Tap to toggle proficiency</p>
              <SavingThrowsList character={character} onUpdate={onUpdate} />
            </div>
          )}
          {activeSection === 'skills' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-forge-2">Tap: none → proficient → expertise → none</p>
              <SkillsList character={character} onUpdate={onUpdate} />
            </div>
          )}
          {activeSection === 'weapons' && (
            <WeaponsList character={character} onUpdate={onUpdate} />
          )}
          {activeSection === 'gear' && (
            <EquipmentList character={character} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </>
  )
}
