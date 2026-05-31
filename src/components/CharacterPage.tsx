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
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type Character,
  type Weapon,
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
import { SKILL_GUIDE, ABILITY_GUIDE, WEAPON_PROPERTY_GUIDE, FEAT_SYNERGIES } from '../lib/skill-guide'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { useCollapsible } from '../hooks/useCollapsible'

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
    <div className="animate-fade-in">
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

const RATING_STYLES: Record<string, { variant: 'verdant' | 'arcane' | 'ember' | 'neutral'; label: string }> = {
  essential: { variant: 'verdant', label: 'Essential' },
  strong: { variant: 'arcane', label: 'Strong' },
  useful: { variant: 'ember', label: 'Useful' },
  situational: { variant: 'neutral', label: 'Situational' },
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
    }
    onCharacterUpdate({ ...character, weapons: [...character.weapons, newWeapon] })
    setWeaponForm({})
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
                {isStudying && SKILL_GUIDE[skill] && (
                  <div className="mt-1 mb-2 ml-8">
                    <div className="p-3 rounded-lg bg-arcane/[0.04] border border-arcane/15 animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen size={12} className="text-arcane" aria-hidden />
                          <span className="text-[10px] font-bold text-arcane uppercase">{skill}</span>
                          {RATING_STYLES[SKILL_GUIDE[skill].rating] && (
                            <Badge variant={RATING_STYLES[SKILL_GUIDE[skill].rating].variant}>
                              {RATING_STYLES[SKILL_GUIDE[skill].rating].label}
                            </Badge>
                          )}
                        </div>
                      </div>

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
                )}
              </div>
            )
          })}
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-forge-0">{weapon.name}</span>
                    {weapon.magical && <Badge variant="arcane">Magical</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="ember">{weapon.attackType}</Badge>
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
              </GlassCard>
            )
          })}

          {/* Add weapon form */}
          {editingWeapon === -1 ? (
            <GlassCard className="p-4 border-arcane/20">
              <h4 className="text-xs font-bold text-forge-0 uppercase tracking-wider mb-3">New Weapon</h4>
              <div className="flex flex-col gap-2">
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
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddWeapon} className="flex-1">
                    <Plus size={14} aria-hidden /> Add Weapon
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditingWeapon(null); setWeaponForm({}) }}>
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

      {/* ─── Feats & Synergies ─── */}
      <Section id="feats" title="Feats & Synergies" icon={Target} characterId={character.id}>
        <p className="text-xs text-forge-2 mb-3 px-1">
          Tap any feat to see how it works with your character's build.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(FEAT_SYNERGIES).map(([name, entry]) => (
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

        {/* Feat study panel */}
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
