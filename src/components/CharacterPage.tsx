import { useState, useCallback } from 'react'
import {
  User,
  Shield,
  Swords,
  Heart,
  Star,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Download,
  Package,
  Sparkles,
  BookOpen,
  X,
  Info,
  Check,
  Target,
  BarChart3,
  Award,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type Character,
  type CharacterFeat,
  type Weapon,
  type WeaponAbility,
  type AbilityKey,
  type SkillName,
  abilityModifier,
  skillBonus,
  savingThrowBonus,
  passivePerception,
  attackBonus,
  generateId,
} from '../lib/character'
import { SKILL_ABILITIES, ABILITY_NAMES } from '../lib/dnd-rules'
import { SKILL_GUIDE, ABILITY_GUIDE, WEAPON_PROPERTY_GUIDE, FEAT_SYNERGIES, WEAPON_MASTERY_OPTIONS, characterSkillRating } from '../lib/skill-guide'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { useCollapsible } from '../hooks/useCollapsible'
import { poolsOf } from '../lib/rules-2024/resources'
import { ResourceLedger } from './resources/ResourceLedger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CharacterPageProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

const ABILITY_KEYS: AbilityKey[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  id,
  title,
  icon: Icon,
  characterId,
  defaultOpen,
  badge,
  children,
}: {
  id: string
  title: string
  icon: typeof User
  characterId: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const { isOpen, toggle } = useCollapsible(id, characterId, defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'w-full min-h-[52px] px-4 py-3 rounded-xl',
          'flex items-center justify-between',
          'bg-white/[0.04] border border-white/10',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          isOpen && 'bg-white/[0.06] border-white/20',
        )}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-forge-1" aria-hidden />
          <span className="text-sm font-semibold text-forge-0">{title}</span>
          {badge && <Badge variant="arcane">{badge}</Badge>}
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={16} className="text-forge-2" aria-hidden />
        )}
      </button>
      {isOpen && (
        <div className="mt-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Study Panel — slide-in detail view for studying a mechanic
// ---------------------------------------------------------------------------

function StudyPanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="animate-object-enter">
      <GlassCard className="p-4 border-arcane/20 bg-arcane/[0.03]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-arcane" aria-hidden />
            <span className="text-xs font-bold text-arcane uppercase tracking-wider">Study: {title}</span>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-95',
            )}
            aria-label="Close study panel"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </GlassCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rating Badge
// ---------------------------------------------------------------------------

const RATING_STYLES: Record<string, { variant: 'verdant' | 'arcane' | 'ember' | 'neutral' | 'eldritch'; label: string }> = {
  essential: { variant: 'verdant', label: 'Essential' },
  strong: { variant: 'arcane', label: 'Strong' },
  useful: { variant: 'ember', label: 'Useful' },
  situational: { variant: 'neutral', label: 'Situational' },
  weak: { variant: 'eldritch', label: 'Weak' },
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CharacterPage({ character, onCharacterUpdate }: CharacterPageProps) {
  const [editingScore, setEditingScore] = useState<AbilityKey | null>(null)
  const [scoreValue, setScoreValue] = useState('')
  const [studyingAbility, setStudyingAbility] = useState<AbilityKey | null>(null)
  const [studyingSkill, setStudyingSkill] = useState<SkillName | null>(null)
  const [studyingProperty, setStudyingProperty] = useState<string | null>(null)
  const [editingWeapon, setEditingWeapon] = useState<number | null>(null)

  // Weapon form state
  const [weaponForm, setWeaponForm] = useState<Partial<Weapon>>({})
  const [weaponFormAbilities, setWeaponFormAbilities] = useState<WeaponAbility[]>([])
  const [weaponAdvancedOpen, setWeaponAdvancedOpen] = useState(false)
  const [customPropertyInput, setCustomPropertyInput] = useState('')
  const [expandedWeaponAbility, setExpandedWeaponAbility] = useState<number | null>(null)

  // Feat form state
  const [editingFeat, setEditingFeat] = useState<number | null>(null) // -1 = adding new
  const [featForm, setFeatForm] = useState<Partial<CharacterFeat>>({})
  const [featEffects, setFeatEffects] = useState<string[]>([])
  const [newFeatEffect, setNewFeatEffect] = useState('')

  const handleScoreEdit = useCallback((key: AbilityKey) => {
    setEditingScore(key)
    setScoreValue(String(character.abilityScores[key]))
  }, [character.abilityScores])

  const handleScoreConfirm = useCallback(() => {
    if (!editingScore) return
    const val = Math.min(30, Math.max(1, Number(scoreValue) || 10))
    const scores = { ...character.abilityScores, [editingScore]: val }
    onCharacterUpdate({ ...character, abilityScores: scores })
    setEditingScore(null)
  }, [editingScore, scoreValue, character, onCharacterUpdate])

  const formatMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`

  // Toggle skill proficiency (none → proficient → expertise → none)
  const cycleSkillProf = useCallback((skill: SkillName) => {
    const isProficient = character.skillProficiencies.includes(skill)
    const isExpert = character.skillExpertise.includes(skill)

    let newProfs = [...character.skillProficiencies]
    let newExpertise = [...character.skillExpertise]

    if (isExpert) {
      // Expertise → none
      newProfs = newProfs.filter(s => s !== skill)
      newExpertise = newExpertise.filter(s => s !== skill)
    } else if (isProficient) {
      // Proficient → expertise
      newExpertise.push(skill)
    } else {
      // None → proficient
      newProfs.push(skill)
    }

    onCharacterUpdate({
      ...character,
      skillProficiencies: newProfs,
      skillExpertise: newExpertise,
    })
  }, [character, onCharacterUpdate])

  // Toggle saving throw proficiency
  const toggleSaveProf = useCallback((ability: AbilityKey) => {
    const has = character.savingThrowProficiencies.includes(ability)
    const newSaves = has
      ? character.savingThrowProficiencies.filter(a => a !== ability)
      : [...character.savingThrowProficiencies, ability]
    onCharacterUpdate({ ...character, savingThrowProficiencies: newSaves })
  }, [character, onCharacterUpdate])

  // Add weapon
  const handleAddWeapon = useCallback(() => {
    const newWeapon: Weapon = {
      name: weaponForm.name || 'New Weapon',
      attackType: weaponForm.attackType || 'melee',
      abilityMod: weaponForm.abilityMod || 'STR',
      proficient: weaponForm.proficient ?? true,
      damageDice: weaponForm.damageDice || '1d8',
      damageType: weaponForm.damageType || 'Slashing',
      properties: weaponForm.properties || [],
      magical: weaponForm.magical,
      bonusToHit: weaponForm.bonusToHit,
      bonusDamage: weaponForm.bonusDamage,
      description: weaponForm.description || undefined,
      range: weaponForm.range || undefined,
      masteryProperty: weaponForm.masteryProperty || undefined,
      specialAbilities: weaponFormAbilities.length ? weaponFormAbilities : undefined,
    }
    onCharacterUpdate({ ...character, weapons: [...character.weapons, newWeapon] })
    setWeaponForm({})
    setWeaponFormAbilities([])
    setWeaponAdvancedOpen(false)
    setEditingWeapon(null)
  }, [weaponForm, character, onCharacterUpdate])

  // Delete weapon
  const handleDeleteWeapon = useCallback((index: number) => {
    const weapons = character.weapons.filter((_, i) => i !== index)
    onCharacterUpdate({ ...character, weapons })
  }, [character, onCharacterUpdate])

  // Add/remove equipment
  const [newEquipment, setNewEquipment] = useState('')
  const handleAddEquipment = useCallback(() => {
    if (!newEquipment.trim()) return
    onCharacterUpdate({ ...character, equipment: [...character.equipment, newEquipment.trim()] })
    setNewEquipment('')
  }, [newEquipment, character, onCharacterUpdate])

  const handleRemoveEquipment = useCallback((index: number) => {
    const equipment = character.equipment.filter((_, i) => i !== index)
    onCharacterUpdate({ ...character, equipment })
  }, [character, onCharacterUpdate])

  // Add/remove supplies
  const [newSupply, setNewSupply] = useState('')
  const handleAddSupply = useCallback(() => {
    if (!newSupply.trim()) return
    onCharacterUpdate({ ...character, supplies: [...character.supplies, newSupply.trim()] })
    setNewSupply('')
  }, [newSupply, character, onCharacterUpdate])

  const handleRemoveSupply = useCallback((index: number) => {
    const supplies = character.supplies.filter((_, i) => i !== index)
    onCharacterUpdate({ ...character, supplies })
  }, [character, onCharacterUpdate])

  // Add feat
  const handleAddFeat = useCallback(() => {
    const name = (featForm.name || '').trim()
    if (!name) return
    // Check if feat name matches FEAT_SYNERGIES for auto-populate
    const synergy = FEAT_SYNERGIES[name]
    const newFeat: CharacterFeat = {
      name,
      description: featForm.description || synergy?.description || '',
      source: featForm.source || 'PHB',
      isHomebrew: featForm.isHomebrew ?? false,
      abilityIncrease: featForm.abilityIncrease,
      effects: featEffects.length > 0 ? featEffects : (synergy ? synergy.pairsWellWith : []),
      prerequisites: featForm.prerequisites || undefined,
      tacticalNote: featForm.tacticalNote || synergy?.combatTip || undefined,
    }
    onCharacterUpdate({ ...character, feats: [...(character.feats || []), newFeat] })
    setFeatForm({})
    setFeatEffects([])
    setNewFeatEffect('')
    setEditingFeat(null)
  }, [featForm, featEffects, character, onCharacterUpdate])

  // Delete feat
  const handleDeleteFeat = useCallback((index: number) => {
    const feats = (character.feats || []).filter((_, i) => i !== index)
    onCharacterUpdate({ ...character, feats })
  }, [character, onCharacterUpdate])

  // Auto-populate feat form from FEAT_SYNERGIES when name matches
  const handleFeatNameChange = useCallback((name: string) => {
    setFeatForm(prev => ({ ...prev, name }))
    const synergy = FEAT_SYNERGIES[name]
    if (synergy) {
      setFeatForm(prev => ({
        ...prev,
        name,
        description: prev.description || synergy.description,
        tacticalNote: prev.tacticalNote || synergy.combatTip,
      }))
      if (featEffects.length === 0) {
        setFeatEffects(synergy.pairsWellWith)
      }
    }
  }, [featEffects.length])

  // Export
  const handleExport = useCallback(() => {
    const data = JSON.stringify(character, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-${character.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-lvl${character.level}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [character])

  return (
    <section className="flex flex-col gap-4 animate-fade-in" aria-label="Character">
      {/* ─── Header Card ─── */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-eldritch/10 flex items-center justify-center">
            <User size={24} className="text-eldritch" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold text-forge-0 truncate">{character.name}</h2>
            <p className="text-sm text-forge-2">
              {character.race} {character.class}{character.subclass ? ` (${character.subclass})` : ''} · Level {character.level}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-[10px] text-forge-2 uppercase tracking-wider">AC</span>
            <span className="text-lg font-mono font-bold text-forge-0">{character.armorClass}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-[10px] text-forge-2 uppercase tracking-wider">HP</span>
            <span className="text-lg font-mono font-bold text-forge-0">{character.hitPoints.current}/{character.hitPoints.max}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-[10px] text-forge-2 uppercase tracking-wider">Prof</span>
            <span className="text-lg font-mono font-bold text-forge-0">+{character.proficiencyBonus}</span>
          </div>
        </div>
      </GlassCard>

      {/* ─── Ability Scores ─── */}
      <Section id="ability-scores" title="Ability Scores" icon={Star} characterId={character.id} defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          {ABILITY_KEYS.map(key => {
            const score = character.abilityScores[key]
            const mod = abilityModifier(score)
            const isEditing = editingScore === key
            const isSavingProf = character.savingThrowProficiencies.includes(key)
            const saveBonus = savingThrowBonus(character, key)

            return (
              <div key={key} className="flex flex-col gap-1">
                <button
                  onClick={() => handleScoreEdit(key)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-xl',
                    'bg-white/[0.03] border border-white/8',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-white/[0.05] active:scale-[0.97]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    studyingAbility === key && 'border-arcane/40 bg-arcane/[0.06]',
                  )}
                >
                  <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider mb-1">{key}</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={scoreValue}
                      onChange={e => setScoreValue(e.target.value)}
                      onBlur={handleScoreConfirm}
                      onKeyDown={e => e.key === 'Enter' && handleScoreConfirm()}
                      autoFocus
                      className="w-12 text-center text-lg font-mono font-bold text-forge-0 bg-transparent border-b border-arcane focus:outline-none"
                      min={1}
                      max={30}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-lg font-mono font-bold text-forge-0">{score}</span>
                  )}
                  <span className={cn(
                    'text-xs font-mono mt-0.5',
                    mod >= 0 ? 'text-verdant' : 'text-ember',
                  )}>
                    {formatMod(mod)}
                  </span>
                </button>

                {/* Save toggle + Study button row */}
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleSaveProf(key)}
                    className={cn(
                      'flex-1 min-h-[32px] rounded-lg text-[9px] font-semibold',
                      'flex items-center justify-center gap-1',
                      'transition-all duration-200 active:scale-95',
                      isSavingProf
                        ? 'bg-arcane/15 border border-arcane/30 text-arcane'
                        : 'bg-white/[0.02] border border-white/5 text-forge-2',
                    )}
                    aria-label={`${isSavingProf ? 'Remove' : 'Add'} ${key} saving throw proficiency`}
                  >
                    <Shield size={9} aria-hidden />
                    {isSavingProf ? formatMod(saveBonus) : 'Save'}
                  </button>
                  <button
                    onClick={() => setStudyingAbility(studyingAbility === key ? null : key)}
                    className={cn(
                      'min-h-[32px] min-w-[32px] rounded-lg',
                      'flex items-center justify-center',
                      'transition-all duration-200 active:scale-95',
                      studyingAbility === key
                        ? 'bg-arcane/15 border border-arcane/30 text-arcane'
                        : 'bg-white/[0.02] border border-white/5 text-forge-2 hover:text-arcane',
                    )}
                    aria-label={`Study ${ABILITY_NAMES[key]}`}
                  >
                    <BookOpen size={10} aria-hidden />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Ability study panel */}
        {studyingAbility && ABILITY_GUIDE[studyingAbility] && (
          <div className="mt-3">
            <StudyPanel
              isOpen
              onClose={() => setStudyingAbility(null)}
              title={ABILITY_NAMES[studyingAbility]}
            >
              {(() => {
                const guide = ABILITY_GUIDE[studyingAbility]
                const score = character.abilityScores[studyingAbility]
                const benchmark = score <= 8 ? 'low' : score <= 12 ? 'average' : score <= 16 ? 'high' : 'exceptional'
                return (
                  <>
                    <p className="text-sm text-forge-1 leading-relaxed mb-3">{guide.description}</p>

                    {/* Current benchmark */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 mb-3">
                      <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-1">
                        Your {studyingAbility} {score} is:
                      </span>
                      <p className="text-xs text-forge-0">{guide.benchmarks[benchmark]}</p>
                    </div>

                    {/* Affects */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-1.5">
                        Governs
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {guide.affectsWhat.map((item, i) => (
                          <Badge key={i} variant="neutral">{item}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* How to increase */}
                    <div>
                      <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-1.5">
                        How to Increase
                      </span>
                      <ul className="flex flex-col gap-1">
                        {guide.howToIncrease.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-forge-1">
                            <span className="w-1 h-1 rounded-full bg-arcane shrink-0 mt-1.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )
              })()}
            </StudyPanel>
          </div>
        )}

        {/* Passive stats */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <Badge variant="neutral">Passive Perception: {passivePerception(character)}</Badge>
          <Badge variant="neutral">Spell DC: {character.spellSaveDC}</Badge>
          <Badge variant="neutral">Spell Atk: {formatMod(character.spellAttackBonus)}</Badge>
        </div>
      </Section>

      {/* ─── Skills ─── */}
      <Section id="skills" title="Skills" icon={TrendingUp} characterId={character.id} badge={`${character.skillProficiencies.length} prof`}>
        <p className="text-[10px] text-forge-2 mb-2 px-1">
          Tap the bonus to cycle: none → proficient → expertise. Tap the skill name to study it.
        </p>
        <div className="flex flex-col gap-1">
          {(Object.keys(SKILL_ABILITIES) as SkillName[]).sort().map(skill => {
            const bonus = skillBonus(character, skill)
            const isProficient = character.skillProficiencies.includes(skill)
            const isExpert = character.skillExpertise.includes(skill)
            const abilityKey = SKILL_ABILITIES[skill]
            const isStudying = studyingSkill === skill

            return (
              <div key={skill} className="flex flex-col">
                <div className={cn(
                  'flex items-center min-h-[44px] px-3 py-1 rounded-lg',
                  'transition-all duration-200',
                  isStudying ? 'bg-arcane/[0.08] border border-arcane/20' :
                  isProficient ? 'bg-arcane/5' : '',
                )}>
                  {/* Proficiency cycle button */}
                  <button
                    onClick={() => cycleSkillProf(skill)}
                    className={cn(
                      'w-6 h-6 rounded-full mr-2 flex items-center justify-center shrink-0',
                      'transition-all duration-200 active:scale-90',
                      isExpert
                        ? 'bg-verdant/20 border-2 border-verdant text-verdant'
                        : isProficient
                          ? 'bg-arcane/20 border-2 border-arcane text-arcane'
                          : 'bg-white/[0.03] border border-white/10 text-forge-2 hover:border-arcane/40',
                    )}
                    aria-label={`${skill}: ${isExpert ? 'expertise' : isProficient ? 'proficient' : 'not proficient'}. Tap to change.`}
                  >
                    {isExpert ? (
                      <Star size={10} aria-hidden />
                    ) : isProficient ? (
                      <Check size={10} aria-hidden />
                    ) : null}
                  </button>

                  {/* Skill name — tap to study */}
                  <button
                    onClick={() => setStudyingSkill(isStudying ? null : skill)}
                    className={cn(
                      'flex-1 text-left min-h-[44px] flex items-center',
                      'text-xs font-medium transition-colors',
                      isProficient ? 'text-forge-0' : 'text-forge-2',
                      'hover:text-arcane',
                    )}
                  >
                    <span className="truncate">{skill}</span>
                    <span className="text-[9px] text-forge-2 ml-1.5 opacity-60">({abilityKey})</span>
                  </button>

                  {/* Bonus */}
                  <span className={cn(
                    'font-mono text-sm font-semibold shrink-0 ml-2',
                    isExpert ? 'text-verdant' : isProficient ? 'text-arcane' : 'text-forge-2',
                  )}>
                    {formatMod(bonus)}
                  </span>
                </div>

                {/* Skill study panel */}
                {isStudying && SKILL_GUIDE[skill] && (() => {
                  const charRating = characterSkillRating(character, skill)
                  const ratingStyle = RATING_STYLES[charRating.rating]
                  return (
                    <div className="mt-1 mb-2 ml-8">
                      <div className="p-3 rounded-lg bg-arcane/[0.04] border border-arcane/15 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BookOpen size={12} className="text-arcane" aria-hidden />
                            <span className="text-[10px] font-bold text-arcane uppercase">{skill}</span>
                            {ratingStyle && (
                              <Badge variant={ratingStyle.variant}>
                                {ratingStyle.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Character-specific rating reason */}
                        <p className="text-[10px] text-forge-2 italic leading-relaxed mb-2 px-1">
                          {charRating.reason}
                        </p>

                        <p className="text-xs text-forge-1 leading-relaxed mb-2">
                          {SKILL_GUIDE[skill].description}
                        </p>

                        <div className="mb-2">
                          <span className="text-[9px] font-bold text-forge-2 uppercase tracking-wider block mb-1">
                            Examples
                          </span>
                          <ul className="flex flex-col gap-0.5">
                            {SKILL_GUIDE[skill].examples.map((ex, i) => (
                              <li key={i} className="text-[11px] text-forge-2 flex items-start gap-1.5">
                                <Target size={8} className="text-arcane shrink-0 mt-1" aria-hidden />
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-forge-2 uppercase tracking-wider block mb-1">
                            Best With
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {SKILL_GUIDE[skill].pairings.map((p, i) => (
                              <span key={i} className="text-[10px] text-forge-2 bg-white/[0.03] px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </Section>

      {/* ─── Character Insight ─── */}
      <Section id="character-insight" title="Character Insight" icon={BarChart3} characterId={character.id}>
        <div className="flex flex-col gap-4">
          {/* Ability Score Bars */}
          <div>
            <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-2">
              Ability Scores
            </span>
            <div className="flex flex-col gap-1.5">
              {ABILITY_KEYS.map(key => {
                const score = character.abilityScores[key]
                const mod = abilityModifier(score)
                const pct = Math.min(100, (score / 20) * 100)
                const barColor =
                  score >= 16 ? 'bg-verdant' :
                  score >= 12 ? 'bg-arcane' :
                  score >= 8 ? 'bg-forge-1' :
                  'bg-ember'
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-forge-2 w-8 text-right">{key}</span>
                    <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-forge-0 w-6 text-right">{score}</span>
                    <span className={cn(
                      'text-[10px] font-mono w-7 text-right',
                      mod >= 0 ? 'text-verdant' : 'text-ember',
                    )}>
                      {formatMod(mod)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combat Profile Card */}
          <GlassCard className="p-3">
            <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-2">
              Combat Profile
            </span>
            {(() => {
              const hasMelee = character.weapons.some(w => w.attackType === 'melee')
              const hasRanged = character.weapons.some(w => w.attackType === 'ranged')
              const hasSpells = character.spells.some(s => s.prepared && s.damageDice)
              let attackProfile = 'Hybrid'
              if (hasSpells && !hasMelee && !hasRanged) attackProfile = 'Spell-focused'
              else if (hasMelee && !hasRanged && !hasSpells) attackProfile = 'Melee-focused'
              else if (hasRanged && !hasMelee && !hasSpells) attackProfile = 'Ranged-focused'
              else if (hasSpells && (hasMelee || hasRanged)) attackProfile = 'Hybrid (martial + caster)'
              else if (hasMelee && hasRanged) attackProfile = 'Hybrid (melee + ranged)'

              const bestWeaponBonus = character.weapons.reduce((max, w) => Math.max(max, attackBonus(character, w)), -Infinity)
              const bestSpellBonus = character.spellAttackBonus

              const bestAttack = character.weapons.length > 0 || character.spells.length > 0
                ? (bestWeaponBonus >= bestSpellBonus
                    ? `${formatMod(bestWeaponBonus)} (weapon)`
                    : `${formatMod(bestSpellBonus)} (spell)`)
                : 'N/A'

              // Best damage potential
              const weaponDamages = character.weapons.map(w => {
                const dmgMod = abilityModifier(character.abilityScores[w.abilityMod]) + (w.bonusDamage ?? 0)
                return `${w.damageDice}${dmgMod >= 0 ? `+${dmgMod}` : dmgMod} ${w.damageType}`
              })
              const bestDamage = weaponDamages.length > 0 ? weaponDamages[0] : 'N/A'

              // AC/HP assessment
              const acAssessment = character.armorClass >= 18 ? 'Well-armored' :
                character.armorClass >= 15 ? 'Moderately armored' :
                character.armorClass >= 12 ? 'Lightly armored' : 'Vulnerable'

              return (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-[9px] text-forge-2 uppercase block">Attack Type</span>
                    <span className="text-xs font-semibold text-forge-0">{attackProfile}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-[9px] text-forge-2 uppercase block">Best Attack</span>
                    <span className="text-xs font-mono font-semibold text-forge-0">{bestAttack}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-[9px] text-forge-2 uppercase block">Top Damage</span>
                    <span className="text-xs font-mono font-semibold text-ember">{bestDamage}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-[9px] text-forge-2 uppercase block">AC {character.armorClass} / HP {character.hitPoints.max}</span>
                    <span className="text-xs font-semibold text-forge-0">{acAssessment}</span>
                  </div>
                </div>
              )
            })()}
          </GlassCard>

          {/* Skill Proficiency Matrix */}
          <div>
            <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-2">
              Skill Clusters
            </span>
            {(() => {
              const categories: { name: string; skills: SkillName[] }[] = [
                { name: 'Combat', skills: ['Athletics', 'Acrobatics'] },
                { name: 'Social', skills: ['Persuasion', 'Deception', 'Intimidation', 'Performance'] },
                { name: 'Knowledge', skills: ['Arcana', 'History', 'Nature', 'Religion'] },
                { name: 'Awareness', skills: ['Perception', 'Insight', 'Investigation', 'Survival', 'Medicine', 'Stealth', 'Sleight of Hand', 'Animal Handling'] },
              ]

              // Find best and worst
              let bestIdx = 0, worstIdx = 0
              let bestPct = 0, worstPct = 1
              categories.forEach((cat, idx) => {
                const profCount = cat.skills.filter(s => character.skillProficiencies.includes(s)).length
                const pct = profCount / cat.skills.length
                if (pct > bestPct) { bestPct = pct; bestIdx = idx }
                if (pct < worstPct) { worstPct = pct; worstIdx = idx }
              })

              return (
                <div className="flex flex-col gap-2">
                  {categories.map((cat, idx) => {
                    const profCount = cat.skills.filter(s => character.skillProficiencies.includes(s)).length
                    const pct = cat.skills.length > 0 ? (profCount / cat.skills.length) * 100 : 0
                    const isBest = idx === bestIdx && profCount > 0
                    const isWorst = idx === worstIdx && profCount < cat.skills.length

                    return (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-20 flex items-center gap-1.5">
                          <span className={cn(
                            'text-[10px] font-semibold',
                            isBest ? 'text-verdant' : isWorst ? 'text-ember' : 'text-forge-1',
                          )}>
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isBest ? 'bg-verdant' : isWorst ? 'bg-ember' : 'bg-arcane',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-forge-2 w-10 text-right">
                          {profCount}/{cat.skills.length}
                        </span>
                        {isBest && <Badge variant="verdant" className="text-[8px] px-1.5 py-0">Best</Badge>}
                        {isWorst && profCount === 0 && <Badge variant="ember" className="text-[8px] px-1.5 py-0">Gap</Badge>}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Saving Throw Assessment */}
          <div>
            <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-2">
              Saving Throws
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {ABILITY_KEYS.map(key => {
                const bonus = savingThrowBonus(character, key)
                const hasProf = character.savingThrowProficiencies.includes(key)
                const mod = abilityModifier(character.abilityScores[key])
                const isVulnerable = !hasProf && mod <= 0
                const isStrong = hasProf && mod >= 2

                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg border',
                      isVulnerable ? 'bg-ember/[0.06] border-ember/20' :
                      isStrong ? 'bg-verdant/[0.06] border-verdant/20' :
                      'bg-white/[0.03] border-white/5',
                    )}
                  >
                    <span className={cn(
                      'text-[10px] font-bold',
                      isVulnerable ? 'text-ember' :
                      isStrong ? 'text-verdant' : 'text-forge-2',
                    )}>
                      {key}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasProf && <Shield size={8} className="text-arcane" aria-hidden />}
                      <span className={cn(
                        'text-xs font-mono font-semibold',
                        isVulnerable ? 'text-ember' :
                        isStrong ? 'text-verdant' : 'text-forge-0',
                      )}>
                        {formatMod(bonus)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Flag vulnerabilities */}
            {(() => {
              const vulnerabilities = ABILITY_KEYS.filter(key => {
                const hasProf = character.savingThrowProficiencies.includes(key)
                const mod = abilityModifier(character.abilityScores[key])
                return !hasProf && mod <= 0
              })
              if (vulnerabilities.length === 0) return null
              return (
                <div className="mt-2 p-2 rounded-lg bg-ember/[0.04] border border-ember/15 flex items-start gap-2">
                  <AlertTriangle size={12} className="text-ember shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[10px] text-ember leading-relaxed">
                    Vulnerable saves: {vulnerabilities.map(v => ABILITY_NAMES[v]).join(', ')}. Consider Resilient or ability increases.
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      </Section>

      {/* ─── Weapons ─── */}
      <Section id="weapons" title="Weapons" icon={Swords} characterId={character.id} badge={`${character.weapons.length}`}>
        <div className="flex flex-col gap-2">
          {character.weapons.map((weapon, i) => {
            const bonus = attackBonus(character, weapon)
            const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)

            return (
              <GlassCard key={`${weapon.name}-${i}`} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-forge-0">{weapon.name}</span>
                    {weapon.magical && <Badge variant="arcane">Magical</Badge>}
                    {weapon.masteryProperty && <Badge variant="verdant">{weapon.masteryProperty}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="ember">{weapon.attackType}</Badge>
                    {weapon.range && (
                      <Badge variant="neutral">{weapon.range}</Badge>
                    )}
                    <button
                      onClick={() => handleDeleteWeapon(i)}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
                        'transition-all duration-200 active:scale-95',
                      )}
                      aria-label={`Delete ${weapon.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Description (homebrew flavor) */}
                {weapon.description && (
                  <p className="text-xs italic text-forge-2 mt-1">{weapon.description}</p>
                )}

                {/* Mechanics breakdown */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-forge-2">
                  <span className="font-mono">
                    {formatMod(bonus)} to hit
                    <span className="text-forge-2/50 ml-1">
                      ({weapon.abilityMod} {formatMod(abilityModifier(character.abilityScores[weapon.abilityMod]))}
                      {weapon.proficient ? ' +prof' : ''}
                      {weapon.bonusToHit ? ` ${formatMod(weapon.bonusToHit)}` : ''})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <span className="font-mono text-ember">
                    {weapon.damageDice}{dmgMod >= 0 ? `+${dmgMod}` : dmgMod} {weapon.damageType}
                  </span>
                </div>

                {/* Properties — tappable to study */}
                {weapon.properties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {weapon.properties.map(prop => (
                      <button
                        key={prop}
                        onClick={() => setStudyingProperty(studyingProperty === prop ? null : prop)}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5',
                          'text-xs font-medium leading-none whitespace-nowrap select-none',
                          'transition-all duration-200 active:scale-95',
                          studyingProperty === prop
                            ? 'bg-arcane/15 text-arcane border-arcane/25'
                            : 'bg-white/8 text-forge-1 border-white/10 hover:border-arcane/30',
                        )}
                      >
                        {prop}
                        {studyingProperty !== prop && <Info size={9} className="ml-1 text-forge-2" aria-hidden />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Property study panel */}
                {studyingProperty && weapon.properties.includes(studyingProperty) && WEAPON_PROPERTY_GUIDE[studyingProperty] && (
                  <div className="mt-2 p-2.5 rounded-lg bg-arcane/[0.04] border border-arcane/15 animate-fade-in">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen size={10} className="text-arcane" aria-hidden />
                      <span className="text-[10px] font-bold text-arcane uppercase">{studyingProperty}</span>
                    </div>
                    <p className="text-xs text-forge-1 leading-relaxed">{WEAPON_PROPERTY_GUIDE[studyingProperty]}</p>
                  </div>
                )}

                {/* Special Abilities */}
                {weapon.specialAbilities && weapon.specialAbilities.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider">Special Abilities</span>
                    {weapon.specialAbilities.map((ability, ai) => (
                      <button
                        key={ai}
                        onClick={() => setExpandedWeaponAbility(expandedWeaponAbility === ai ? null : ai)}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-lg border min-h-[44px]',
                          'transition-all duration-200 active:scale-[0.98]',
                          expandedWeaponAbility === ai
                            ? 'bg-eldritch/[0.06] border-eldritch/20'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-forge-0">{ability.name}</span>
                          <Badge variant="eldritch" className="text-[9px]">{ability.trigger}</Badge>
                        </div>
                        {expandedWeaponAbility === ai && (
                          <div className="mt-1.5 animate-fade-in">
                            <p className="text-[11px] text-forge-1 leading-relaxed">{ability.effect}</p>
                            {(ability.damageDice || ability.damageType) && (
                              <p className="text-[10px] font-mono text-ember mt-1">
                                {ability.damageDice}{ability.damageType ? ` ${ability.damageType}` : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </GlassCard>
            )
          })}

          {/* Add weapon form */}
          {editingWeapon === -1 ? (
            <GlassCard className="p-4 border-arcane/20">
              <h4 className="text-xs font-bold text-forge-0 uppercase tracking-wider mb-3">New Weapon</h4>
              <div className="flex flex-col gap-3">
                {/* ── Basic Section ── */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Basic</span>
                  <input
                    type="text"
                    placeholder="Weapon name"
                    value={weaponForm.name || ''}
                    onChange={e => setWeaponForm({ ...weaponForm, name: e.target.value })}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      'transition-colors duration-200',
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={weaponForm.attackType || 'melee'}
                      onChange={e => setWeaponForm({ ...weaponForm, attackType: e.target.value as 'melee' | 'ranged' })}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'focus:border-arcane/50 outline-none',
                      )}
                    >
                      <option value="melee">Melee</option>
                      <option value="ranged">Ranged</option>
                    </select>
                    <select
                      value={weaponForm.abilityMod || 'STR'}
                      onChange={e => setWeaponForm({ ...weaponForm, abilityMod: e.target.value as AbilityKey })}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'focus:border-arcane/50 outline-none',
                      )}
                    >
                      {ABILITY_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Damage Section ── */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Damage</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Damage dice (1d8)"
                      value={weaponForm.damageDice || ''}
                      onChange={e => setWeaponForm({ ...weaponForm, damageDice: e.target.value })}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      )}
                    />
                    <input
                      type="text"
                      placeholder="Damage type"
                      value={weaponForm.damageType || ''}
                      onChange={e => setWeaponForm({ ...weaponForm, damageType: e.target.value })}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      )}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Range (e.g. 5 ft, 20/60 ft)"
                    value={weaponForm.range || ''}
                    onChange={e => setWeaponForm({ ...weaponForm, range: e.target.value })}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                    )}
                  />
                </div>

                {/* ── Properties Section ── */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Properties</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(WEAPON_PROPERTY_GUIDE).map(prop => {
                      const isSelected = (weaponForm.properties || []).includes(prop)
                      return (
                        <button
                          key={prop}
                          type="button"
                          onClick={() => {
                            const current = weaponForm.properties || []
                            setWeaponForm({
                              ...weaponForm,
                              properties: isSelected
                                ? current.filter(p => p !== prop)
                                : [...current, prop],
                            })
                          }}
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 min-h-[36px]',
                            'text-xs font-medium leading-none whitespace-nowrap select-none',
                            'transition-all duration-200 active:scale-95',
                            isSelected
                              ? 'bg-arcane/15 text-arcane border-arcane/25'
                              : 'bg-white/[0.04] text-forge-2 border-white/10 hover:border-arcane/20 hover:text-forge-1',
                          )}
                        >
                          {isSelected && <Check size={10} className="mr-1" aria-hidden />}
                          {prop}
                        </button>
                      )
                    })}
                  </div>
                  {/* Custom property input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Custom property..."
                      value={customPropertyInput}
                      onChange={e => setCustomPropertyInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customPropertyInput.trim()) {
                          const current = weaponForm.properties || []
                          if (!current.includes(customPropertyInput.trim())) {
                            setWeaponForm({ ...weaponForm, properties: [...current, customPropertyInput.trim()] })
                          }
                          setCustomPropertyInput('')
                        }
                      }}
                      className={cn(
                        'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPropertyInput.trim()) {
                          const current = weaponForm.properties || []
                          if (!current.includes(customPropertyInput.trim())) {
                            setWeaponForm({ ...weaponForm, properties: [...current, customPropertyInput.trim()] })
                          }
                          setCustomPropertyInput('')
                        }
                      }}
                      disabled={!customPropertyInput.trim()}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-xl bg-arcane/10 border border-arcane/25 text-arcane',
                        'hover:bg-arcane/20 transition-all duration-200 active:scale-95',
                        'disabled:opacity-30 disabled:pointer-events-none',
                      )}
                      aria-label="Add custom property"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {/* Show selected properties as removable chips */}
                  {(weaponForm.properties || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(weaponForm.properties || []).map(prop => (
                        <button
                          key={prop}
                          type="button"
                          onClick={() => {
                            setWeaponForm({
                              ...weaponForm,
                              properties: (weaponForm.properties || []).filter(p => p !== prop),
                            })
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 min-h-[32px]',
                            'text-xs font-medium bg-arcane/10 text-arcane border-arcane/20',
                            'hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400',
                            'transition-all duration-200 active:scale-95',
                          )}
                        >
                          {prop}
                          <X size={10} className="opacity-60" aria-hidden />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Advanced Section (collapsible) ── */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setWeaponAdvancedOpen(!weaponAdvancedOpen)}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl',
                      'flex items-center justify-between',
                      'bg-white/[0.03] border border-white/8 text-forge-1',
                      'transition-all duration-200 active:scale-[0.98]',
                      weaponAdvancedOpen && 'border-arcane/20 bg-arcane/[0.03]',
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">Advanced</span>
                    {weaponAdvancedOpen ? (
                      <ChevronUp size={14} className="text-forge-2" aria-hidden />
                    ) : (
                      <ChevronDown size={14} className="text-forge-2" aria-hidden />
                    )}
                  </button>

                  {weaponAdvancedOpen && (
                    <div className="mt-2 flex flex-col gap-3 animate-fade-in">
                      {/* Toggles row */}
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={weaponForm.magical ?? false}
                            onChange={e => setWeaponForm({ ...weaponForm, magical: e.target.checked || undefined })}
                            className="w-5 h-5 rounded border-white/20 bg-white/[0.04] text-arcane accent-arcane"
                          />
                          <span className="text-xs text-forge-1">Magical</span>
                        </label>
                        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={weaponForm.proficient ?? true}
                            onChange={e => setWeaponForm({ ...weaponForm, proficient: e.target.checked })}
                            className="w-5 h-5 rounded border-white/20 bg-white/[0.04] text-arcane accent-arcane"
                          />
                          <span className="text-xs text-forge-1">Proficient</span>
                        </label>
                      </div>

                      {/* Bonus to Hit / Bonus Damage */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Bonus to Hit</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={weaponForm.bonusToHit ?? ''}
                            onChange={e => setWeaponForm({ ...weaponForm, bonusToHit: e.target.value ? Number(e.target.value) : undefined })}
                            className={cn(
                              'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                              'bg-white/[0.04] border border-white/10 text-forge-0',
                              'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                            )}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Bonus Damage</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={weaponForm.bonusDamage ?? ''}
                            onChange={e => setWeaponForm({ ...weaponForm, bonusDamage: e.target.value ? Number(e.target.value) : undefined })}
                            className={cn(
                              'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                              'bg-white/[0.04] border border-white/10 text-forge-0',
                              'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                            )}
                          />
                        </div>
                      </div>

                      {/* Mastery Property */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Mastery Property</label>
                        <select
                          value={weaponForm.masteryProperty || ''}
                          onChange={e => setWeaponForm({ ...weaponForm, masteryProperty: e.target.value || undefined })}
                          className={cn(
                            'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                            'bg-white/[0.04] border border-white/10 text-forge-0',
                            'focus:border-arcane/50 outline-none',
                          )}
                        >
                          <option value="">None</option>
                          {WEAPON_MASTERY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {/* Description textarea */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Description</label>
                        <textarea
                          placeholder="Homebrew flavor text, appearance, lore..."
                          value={weaponForm.description || ''}
                          onChange={e => setWeaponForm({ ...weaponForm, description: e.target.value })}
                          rows={2}
                          className={cn(
                            'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                            'bg-white/[0.04] border border-white/10 text-forge-0',
                            'placeholder:text-forge-2 focus:border-arcane/50 outline-none resize-none',
                          )}
                        />
                      </div>

                      {/* Special Abilities */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Special Abilities</span>
                        {weaponFormAbilities.map((ability, ai) => (
                          <div key={ai} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/8 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-eldritch uppercase">Ability {ai + 1}</span>
                              <button
                                type="button"
                                onClick={() => setWeaponFormAbilities(weaponFormAbilities.filter((_, j) => j !== ai))}
                                className={cn(
                                  'min-h-[36px] min-w-[36px] flex items-center justify-center',
                                  'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
                                  'transition-all duration-200 active:scale-95',
                                )}
                                aria-label={`Remove ability ${ai + 1}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Name (e.g. Life Drain)"
                              value={ability.name}
                              onChange={e => {
                                const updated = [...weaponFormAbilities]
                                updated[ai] = { ...updated[ai], name: e.target.value }
                                setWeaponFormAbilities(updated)
                              }}
                              className={cn(
                                'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                                'bg-white/[0.04] border border-white/10 text-forge-0',
                                'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                              )}
                            />
                            <input
                              type="text"
                              placeholder="Trigger (e.g. On hit, 1/long rest)"
                              value={ability.trigger}
                              onChange={e => {
                                const updated = [...weaponFormAbilities]
                                updated[ai] = { ...updated[ai], trigger: e.target.value }
                                setWeaponFormAbilities(updated)
                              }}
                              className={cn(
                                'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                                'bg-white/[0.04] border border-white/10 text-forge-0',
                                'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                              )}
                            />
                            <textarea
                              placeholder="Effect (e.g. Deal 1d4 necrotic, heal same)"
                              value={ability.effect}
                              onChange={e => {
                                const updated = [...weaponFormAbilities]
                                updated[ai] = { ...updated[ai], effect: e.target.value }
                                setWeaponFormAbilities(updated)
                              }}
                              rows={2}
                              className={cn(
                                'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                                'bg-white/[0.04] border border-white/10 text-forge-0',
                                'placeholder:text-forge-2 focus:border-arcane/50 outline-none resize-none',
                              )}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Damage dice (optional)"
                                value={ability.damageDice || ''}
                                onChange={e => {
                                  const updated = [...weaponFormAbilities]
                                  updated[ai] = { ...updated[ai], damageDice: e.target.value || undefined }
                                  setWeaponFormAbilities(updated)
                                }}
                                className={cn(
                                  'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                                  'bg-white/[0.04] border border-white/10 text-forge-0',
                                  'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                                )}
                              />
                              <input
                                type="text"
                                placeholder="Damage type (optional)"
                                value={ability.damageType || ''}
                                onChange={e => {
                                  const updated = [...weaponFormAbilities]
                                  updated[ai] = { ...updated[ai], damageType: e.target.value || undefined }
                                  setWeaponFormAbilities(updated)
                                }}
                                className={cn(
                                  'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                                  'bg-white/[0.04] border border-white/10 text-forge-0',
                                  'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setWeaponFormAbilities([...weaponFormAbilities, { name: '', trigger: '', effect: '' }])}
                          className={cn(
                            'w-full min-h-[44px] px-3 rounded-xl',
                            'flex items-center justify-center gap-1.5',
                            'text-xs font-medium text-forge-2',
                            'border border-dashed border-white/10 hover:border-eldritch/30',
                            'bg-transparent hover:bg-eldritch/[0.04] hover:text-eldritch',
                            'transition-all duration-200 active:scale-[0.98]',
                          )}
                        >
                          <Plus size={12} aria-hidden />
                          Add Special Ability
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Submit / Cancel ── */}
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddWeapon} className="flex-1">
                    <Plus size={14} aria-hidden /> Add Weapon
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditingWeapon(null); setWeaponForm({}); setWeaponFormAbilities([]); setWeaponAdvancedOpen(false); setCustomPropertyInput('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditingWeapon(-1)} className="w-full">
              <Plus size={14} aria-hidden /> Add Weapon
            </Button>
          )}
        </div>
      </Section>

      {/* ─── Equipment & Supplies ─── */}
      <Section id="equipment" title="Equipment & Supplies" icon={Package} characterId={character.id}>
        <div className="space-y-4">
          {/* Equipment */}
          <div>
            <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">Equipment</h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {character.equipment.map((item, i) => (
                <button
                  key={`eq-${i}`}
                  onClick={() => handleRemoveEquipment(i)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1',
                    'text-xs font-medium bg-white/8 text-forge-1 border-white/10',
                    'hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400',
                    'transition-all duration-200 active:scale-95',
                    'min-h-[36px]',
                  )}
                  aria-label={`Remove ${item}`}
                >
                  {item}
                  <X size={10} className="opacity-40" aria-hidden />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add equipment..."
                value={newEquipment}
                onChange={e => setNewEquipment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEquipment()}
                className={cn(
                  'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm',
                  'bg-white/[0.04] border border-white/10 text-forge-0',
                  'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                  'transition-colors duration-200',
                )}
              />
              <button
                onClick={handleAddEquipment}
                disabled={!newEquipment.trim()}
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center',
                  'rounded-xl bg-arcane/10 border border-arcane/25 text-arcane',
                  'hover:bg-arcane/20 transition-all duration-200 active:scale-95',
                  'disabled:opacity-30 disabled:pointer-events-none',
                )}
                aria-label="Add equipment"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Supplies */}
          <div>
            <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">Supplies</h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {character.supplies.map((item, i) => (
                <button
                  key={`sp-${i}`}
                  onClick={() => handleRemoveSupply(i)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1',
                    'text-xs font-medium bg-white/8 text-forge-1 border-white/10',
                    'hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400',
                    'transition-all duration-200 active:scale-95',
                    'min-h-[36px]',
                  )}
                  aria-label={`Remove ${item}`}
                >
                  {item}
                  <X size={10} className="opacity-40" aria-hidden />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add supply..."
                value={newSupply}
                onChange={e => setNewSupply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSupply()}
                className={cn(
                  'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm',
                  'bg-white/[0.04] border border-white/10 text-forge-0',
                  'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                  'transition-colors duration-200',
                )}
              />
              <button
                onClick={handleAddSupply}
                disabled={!newSupply.trim()}
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center',
                  'rounded-xl bg-arcane/10 border border-arcane/25 text-arcane',
                  'hover:bg-arcane/20 transition-all duration-200 active:scale-95',
                  'disabled:opacity-30 disabled:pointer-events-none',
                )}
                aria-label="Add supply"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {character.equipment.length === 0 && character.supplies.length === 0 && (
            <p className="text-xs text-forge-2 italic">No equipment or supplies yet. Add items above.</p>
          )}
        </div>
      </Section>

      {/* ─── Resources — every countable thing, including the ones Marcus
             writes himself. Sits ABOVE Class Resources because this is the
             surface that can be edited; the one below is a read-only paladin
             panel that survives untouched (it is the only place Aura Range is
             shown). Folding the two together is Slice 6c's problem. ─── */}
      <Section
        id="resources"
        title="Resources"
        icon={Sparkles}
        characterId={character.id}
        defaultOpen
        badge={`${poolsOf(character).length}`}
      >
        <div className="dres-embed">
          <ResourceLedger character={character} onChange={onCharacterUpdate} heading="" />
        </div>
      </Section>

      {/* ─── Class Resources ─── */}
      {character.paladinResources && (
        <Section id="class-resources" title="Class Resources" icon={Sparkles} characterId={character.id} defaultOpen>
          <GlassCard className="p-4 space-y-3">
            {/* Lay on Hands */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-forge-0">Lay on Hands</span>
                <span className="text-xs font-mono text-forge-2">
                  {character.paladinResources.layOnHands.current}/{character.paladinResources.layOnHands.max} HP
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-verdant transition-all duration-300"
                  style={{ width: `${(character.paladinResources.layOnHands.current / character.paladinResources.layOnHands.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Channel Divinity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-forge-0">Channel Divinity</span>
                <span className="text-xs font-mono text-forge-2">
                  {character.paladinResources.channelDivinity.current}/{character.paladinResources.channelDivinity.max}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: character.paladinResources.channelDivinity.max }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-5 h-5 rounded-full transition-all duration-200',
                      i < character.paladinResources!.channelDivinity.current
                        ? 'bg-arcane shadow-[0_0_6px_rgba(61,210,255,0.4)]'
                        : 'bg-white/10 border border-white/20',
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Aura Range */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-forge-2">Aura Range</span>
              <span className="text-sm font-mono text-forge-0">{character.paladinResources.auraRange} ft</span>
            </div>
          </GlassCard>
        </Section>
      )}

      {/* ─── Feats ─── */}
      <Section id="feats" title="Feats" icon={Award} characterId={character.id} badge={`${(character.feats || []).length}`}>
        <div className="flex flex-col gap-3">
          {/* Existing feats display */}
          {(character.feats || []).map((feat, i) => {
            const synergy = FEAT_SYNERGIES[feat.name]
            const isStudying = studyingProperty === `feat-detail:${i}`

            return (
              <GlassCard key={`${feat.name}-${i}`} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-forge-0">{feat.name}</span>
                    <Badge variant={feat.isHomebrew ? 'eldritch' : 'arcane'}>
                      {feat.isHomebrew ? 'Homebrew' : feat.source || 'PHB'}
                    </Badge>
                    {feat.abilityIncrease && (
                      <Badge variant="verdant">+{feat.abilityIncrease.amount} {feat.abilityIncrease.ability}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStudyingProperty(isStudying ? null : `feat-detail:${i}`)}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-lg text-forge-2 hover:text-arcane hover:bg-white/[0.06]',
                        'transition-all duration-200 active:scale-95',
                      )}
                      aria-label={`${isStudying ? 'Close' : 'Study'} ${feat.name}`}
                    >
                      {isStudying ? <ChevronUp size={14} /> : <Info size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteFeat(i)}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
                        'transition-all duration-200 active:scale-95',
                      )}
                      aria-label={`Delete ${feat.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-forge-1 leading-relaxed mb-1.5">{feat.description}</p>

                {/* Effects as bullet list */}
                {feat.effects.length > 0 && (
                  <ul className="flex flex-col gap-0.5 mb-1.5">
                    {feat.effects.map((effect, ei) => (
                      <li key={ei} className="text-[11px] text-forge-2 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-arcane shrink-0 mt-1.5" />
                        {effect}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tactical note */}
                {feat.tacticalNote && (
                  <div className="p-2 rounded-lg bg-ember/[0.04] border border-ember/15 mb-1.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Swords size={9} className="text-ember" aria-hidden />
                      <span className="text-[9px] font-bold text-ember uppercase">Tactical Note</span>
                    </div>
                    <p className="text-[11px] text-forge-1 leading-relaxed">{feat.tacticalNote}</p>
                  </div>
                )}

                {/* Expanded study panel: synergy data */}
                {isStudying && synergy && (
                  <div className="mt-2 animate-fade-in">
                    <div className="p-2.5 rounded-lg bg-arcane/[0.04] border border-arcane/15">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BookOpen size={10} className="text-arcane" aria-hidden />
                        <span className="text-[10px] font-bold text-arcane uppercase">Strategy Guide</span>
                      </div>

                      {/* Pairs well with */}
                      <div className="mb-2">
                        <span className="text-[9px] font-bold text-forge-2 uppercase tracking-wider block mb-1">
                          Pairs Well With
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {synergy.pairsWellWith.map((item, si) => (
                            <Badge key={si} variant="eldritch">{item}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Combat strategy card */}
                      <div className="p-2.5 rounded-lg bg-ember/[0.06] border border-ember/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Swords size={10} className="text-ember" aria-hidden />
                          <span className="text-[10px] font-bold text-ember uppercase">Combat Strategy</span>
                        </div>
                        <p className="text-xs text-forge-1 leading-relaxed">{synergy.combatTip}</p>

                        {/* Action type indicators */}
                        <div className="flex items-center gap-2 mt-2">
                          {feat.name.toLowerCase().includes('sentinel') || feat.name.toLowerCase().includes('polearm') ? (
                            <Badge variant="eldritch">Reaction: OA</Badge>
                          ) : null}
                          {feat.name.toLowerCase().includes('polearm') || feat.name.toLowerCase().includes('shield master') ? (
                            <Badge variant="ember">Bonus Action</Badge>
                          ) : null}
                          {feat.name.toLowerCase().includes('great weapon') || feat.name.toLowerCase().includes('war caster') ? (
                            <Badge variant="arcane">Passive</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}

          {/* Add Feat Form */}
          {editingFeat === -1 ? (
            <GlassCard className="p-4 border-arcane/20">
              <h4 className="text-xs font-bold text-forge-0 uppercase tracking-wider mb-3">New Feat</h4>
              <div className="flex flex-col gap-3">
                {/* Name — with auto-complete from FEAT_SYNERGIES */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    placeholder="Feat name (e.g. Sentinel)"
                    value={featForm.name || ''}
                    onChange={e => handleFeatNameChange(e.target.value)}
                    list="feat-suggestions"
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      'transition-colors duration-200',
                    )}
                  />
                  <datalist id="feat-suggestions">
                    {Object.keys(FEAT_SYNERGIES).map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="What does this feat do?"
                    value={featForm.description || ''}
                    onChange={e => setFeatForm({ ...featForm, description: e.target.value })}
                    rows={3}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none resize-none',
                    )}
                  />
                </div>

                {/* Source + Homebrew toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Source</label>
                    <select
                      value={featForm.source || 'PHB'}
                      onChange={e => setFeatForm({ ...featForm, source: e.target.value })}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'focus:border-arcane/50 outline-none',
                      )}
                    >
                      <option value="PHB">PHB</option>
                      <option value="Xanathar">Xanathar&apos;s</option>
                      <option value="Tasha">Tasha&apos;s</option>
                      <option value="Homebrew">Homebrew</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 justify-end">
                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={featForm.isHomebrew ?? false}
                        onChange={e => setFeatForm({ ...featForm, isHomebrew: e.target.checked })}
                        className="w-5 h-5 rounded border-white/20 bg-white/[0.04] text-arcane accent-arcane"
                      />
                      <span className="text-xs text-forge-1">Homebrew</span>
                    </label>
                  </div>
                </div>

                {/* Effects — add/remove */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Effects</label>
                  {featEffects.map((effect, ei) => (
                    <div key={ei} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-forge-1 flex-1 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-arcane shrink-0 mt-1.5" />
                        {effect}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFeatEffects(featEffects.filter((_, j) => j !== ei))}
                        className={cn(
                          'min-h-[32px] min-w-[32px] flex items-center justify-center',
                          'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
                          'transition-all duration-200 active:scale-95',
                        )}
                        aria-label={`Remove effect ${ei + 1}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an effect..."
                      value={newFeatEffect}
                      onChange={e => setNewFeatEffect(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFeatEffect.trim()) {
                          setFeatEffects([...featEffects, newFeatEffect.trim()])
                          setNewFeatEffect('')
                        }
                      }}
                      className={cn(
                        'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newFeatEffect.trim()) {
                          setFeatEffects([...featEffects, newFeatEffect.trim()])
                          setNewFeatEffect('')
                        }
                      }}
                      disabled={!newFeatEffect.trim()}
                      className={cn(
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-xl bg-arcane/10 border border-arcane/25 text-arcane',
                        'hover:bg-arcane/20 transition-all duration-200 active:scale-95',
                        'disabled:opacity-30 disabled:pointer-events-none',
                      )}
                      aria-label="Add effect"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Ability Increase (optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Ability Increase (optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={featForm.abilityIncrease?.ability || ''}
                      onChange={e => {
                        if (e.target.value) {
                          setFeatForm({
                            ...featForm,
                            abilityIncrease: {
                              ability: e.target.value as AbilityKey,
                              amount: featForm.abilityIncrease?.amount || 1,
                            },
                          })
                        } else {
                          setFeatForm({ ...featForm, abilityIncrease: undefined })
                        }
                      }}
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                        'bg-white/[0.04] border border-white/10 text-forge-0',
                        'focus:border-arcane/50 outline-none',
                      )}
                    >
                      <option value="">None</option>
                      {ABILITY_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    {featForm.abilityIncrease && (
                      <input
                        type="number"
                        placeholder="Amount"
                        value={featForm.abilityIncrease.amount}
                        onChange={e => setFeatForm({
                          ...featForm,
                          abilityIncrease: {
                            ...featForm.abilityIncrease!,
                            amount: Number(e.target.value) || 1,
                          },
                        })}
                        min={1}
                        max={2}
                        className={cn(
                          'min-h-[44px] px-3 py-2 rounded-xl text-sm',
                          'bg-white/[0.04] border border-white/10 text-forge-0',
                          'focus:border-arcane/50 outline-none',
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Prerequisites (optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Prerequisites (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. STR 13, Proficiency with heavy armor"
                    value={featForm.prerequisites || ''}
                    onChange={e => setFeatForm({ ...featForm, prerequisites: e.target.value })}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none',
                    )}
                  />
                </div>

                {/* Tactical Note (optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-forge-2 uppercase tracking-wider">Tactical Note (optional)</label>
                  <textarea
                    placeholder="How to use this feat in combat..."
                    value={featForm.tacticalNote || ''}
                    onChange={e => setFeatForm({ ...featForm, tacticalNote: e.target.value })}
                    rows={2}
                    className={cn(
                      'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                      'bg-white/[0.04] border border-white/10 text-forge-0',
                      'placeholder:text-forge-2 focus:border-arcane/50 outline-none resize-none',
                    )}
                  />
                </div>

                {/* Submit / Cancel */}
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddFeat} className="flex-1">
                    <Plus size={14} aria-hidden /> Add Feat
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditingFeat(null); setFeatForm({}); setFeatEffects([]); setNewFeatEffect('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditingFeat(-1)} className="w-full">
              <Plus size={14} aria-hidden /> Add Feat
            </Button>
          )}

          {/* Feat Reference — browse known feats from FEAT_SYNERGIES */}
          {(character.feats || []).length === 0 && editingFeat !== -1 && (
            <div className="mt-1">
              <p className="text-[10px] text-forge-2 mb-2 px-1">
                Browse the feat reference library below, or add a custom feat above.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(FEAT_SYNERGIES).map(([name]) => (
                  <button
                    key={name}
                    onClick={() => setStudyingProperty(studyingProperty === `feat:${name}` ? null : `feat:${name}`)}
                    className={cn(
                      'min-h-[44px] px-3 py-2 rounded-xl text-left',
                      'bg-white/[0.03] border border-white/8',
                      'hover:bg-eldritch/[0.06] hover:border-eldritch/20',
                      'transition-all duration-200 active:scale-[0.97]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      studyingProperty === `feat:${name}` && 'bg-eldritch/[0.08] border-eldritch/25',
                    )}
                  >
                    <span className="text-xs font-semibold text-forge-0">{name}</span>
                  </button>
                ))}
              </div>

              {/* Feat reference study panel */}
              {studyingProperty?.startsWith('feat:') && (() => {
                const featName = studyingProperty.slice(5)
                const entry = FEAT_SYNERGIES[featName]
                if (!entry) return null
                return (
                  <div className="mt-3">
                    <StudyPanel isOpen onClose={() => setStudyingProperty(null)} title={featName}>
                      <p className="text-sm text-forge-1 leading-relaxed mb-3">{entry.description}</p>

                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-forge-2 uppercase tracking-wider block mb-1.5">
                          Pairs Well With
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {entry.pairsWellWith.map((item, i) => (
                            <Badge key={i} variant="eldritch">{item}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-ember/[0.04] border border-ember/15">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Swords size={10} className="text-ember" aria-hidden />
                          <span className="text-[10px] font-bold text-ember uppercase">Combat Tip</span>
                        </div>
                        <p className="text-xs text-forge-1 leading-relaxed">{entry.combatTip}</p>
                      </div>
                    </StudyPanel>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </Section>

      {/* ─── Export ─── */}
      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={handleExport} className="flex-1">
          <Download size={16} aria-hidden />
          Export Character
        </Button>
      </div>
    </section>
  )
}
