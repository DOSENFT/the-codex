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
  Upload,
  Package,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  type Character,
  type Weapon,
  type AbilityKey,
  abilityModifier,
  skillBonus,
  savingThrowBonus,
  passivePerception,
  attackBonus,
  computePaladinResources,
  generateId,
} from '../lib/character'
import { SKILL_ABILITIES } from '../lib/dnd-rules'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'
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
  children,
}: {
  id: string
  title: string
  icon: typeof User
  characterId: string
  defaultOpen?: boolean
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
// Component
// ---------------------------------------------------------------------------

export function CharacterPage({ character, onCharacterUpdate }: CharacterPageProps) {
  const [editingScore, setEditingScore] = useState<AbilityKey | null>(null)
  const [scoreValue, setScoreValue] = useState('')

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

            return (
              <button
                key={key}
                onClick={() => handleScoreEdit(key)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-xl',
                  'bg-white/[0.03] border border-white/8',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.05] active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
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
                {isSavingProf && (
                  <Badge variant="arcane" className="mt-1 text-[8px]">Save</Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Passive stats */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <Badge variant="neutral">Passive Perception: {passivePerception(character)}</Badge>
          <Badge variant="neutral">Spell DC: {character.spellSaveDC}</Badge>
          <Badge variant="neutral">Spell Atk: {formatMod(character.spellAttackBonus)}</Badge>
        </div>
      </Section>

      {/* ─── Skills ─── */}
      <Section id="skills" title="Skills" icon={TrendingUp} characterId={character.id}>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(SKILL_ABILITIES) as Array<keyof typeof SKILL_ABILITIES>).sort().map(skill => {
            const bonus = skillBonus(character, skill)
            const isProficient = character.skillProficiencies.includes(skill)
            const isExpert = character.skillExpertise.includes(skill)

            return (
              <div
                key={skill}
                className={cn(
                  'flex items-center justify-between px-3 py-1.5 rounded-lg',
                  'text-xs',
                  isProficient ? 'bg-arcane/5 text-forge-0' : 'text-forge-2',
                )}
              >
                <span className="truncate">
                  {isExpert && <span className="text-verdant mr-1">**</span>}
                  {isProficient && !isExpert && <span className="text-arcane mr-1">*</span>}
                  {skill}
                </span>
                <span className="font-mono font-medium shrink-0 ml-2">{formatMod(bonus)}</span>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ─── Weapons ─── */}
      <Section id="weapons" title="Weapons" icon={Swords} characterId={character.id}>
        {character.weapons.length === 0 ? (
          <p className="text-sm text-forge-2 px-1">No weapons configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {character.weapons.map((weapon, i) => {
              const bonus = attackBonus(character, weapon)
              const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)

              return (
                <GlassCard key={`${weapon.name}-${i}`} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-forge-0">{weapon.name}</span>
                      {weapon.magical && <Badge variant="arcane" className="ml-2">Magical</Badge>}
                    </div>
                    <Badge variant="ember">{weapon.attackType}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-forge-2">
                    <span className="font-mono">
                      {formatMod(bonus)} to hit
                    </span>
                    <span className="font-mono">
                      {weapon.damageDice}{dmgMod >= 0 ? `+${dmgMod}` : dmgMod} {weapon.damageType}
                    </span>
                  </div>
                  {weapon.properties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {weapon.properties.map(prop => (
                        <Badge key={prop} variant="neutral">{prop}</Badge>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        )}
      </Section>

      {/* ─── Equipment & Supplies ─── */}
      <Section id="equipment" title="Equipment & Supplies" icon={Package} characterId={character.id}>
        <div className="space-y-3">
          {character.equipment.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">Equipment</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.equipment.map((item, i) => (
                  <Badge key={`eq-${i}`} variant="neutral">{item}</Badge>
                ))}
              </div>
            </div>
          )}
          {character.supplies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">Supplies</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.supplies.map((item, i) => (
                  <Badge key={`sp-${i}`} variant="neutral">{item}</Badge>
                ))}
              </div>
            </div>
          )}
          {character.equipment.length === 0 && character.supplies.length === 0 && (
            <p className="text-sm text-forge-2 px-1">No equipment or supplies tracked.</p>
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
