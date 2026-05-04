import { useState, useCallback, useEffect } from 'react'
import {
  User,
  Shield,
  Sparkles,
  Globe,
  TrendingUp,
  Target,
  Zap,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  Server,
  Wifi,
  Upload,
  Plus,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { loadAIConfig, saveAIConfig, queryAI, fetchOllamaModels, GEMINI_MODELS, type AIProvider } from '../lib/ai'
import { generateId, type Character, type Spell, type ClassFeature, type SpellSlots, type RosterEntry, type AbilityScores } from '../lib/character'
import {
  CLASSES,
  RACES,
  SUBCLASSES,
  SPELLCASTING_ABILITY,
  PREPARES_SPELLS,
  CASTER_TYPE,
  HOMEBREW_CONTENT,
  RACE_CONTENT,
  CUSTOM_SUBCLASS,
} from '../lib/dnd-data'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { GlassCard } from './ui/GlassCard'

interface CharacterSetupProps {
  onComplete: (character: Character) => void
  roster: RosterEntry[]
  onSelectCharacter: (id: string) => void
}

/** Shape the AI returns from the characterSetup prompt. */
interface AICharacterResponse {
  spellcastingAbility: string
  canPrepareSpells: boolean
  maxPreparedSpells: number
  proficiencyBonus: number
  spellSlots: Record<string, number>
  availableSpells: Array<{
    name: string
    level: number
    school: string
    castingTime: string
    range: string
    components: string
    duration: string
    concentration: boolean
    ritual: boolean
    description: string
    higherLevels?: string | null
    alwaysPrepared: boolean
    source?: string
  }>
  classFeatures: Array<{
    name: string
    level: number
    description: string
    usesPerRest?: 'short' | 'long' | 'unlimited' | null
    usesMax?: number | null
  }>
}

// ─── Step metadata ──────────────────────────────────────────────────────────

interface StepConfig {
  title: string
  subtitle: string
  icon: typeof User
}

const STEPS: StepConfig[] = [
  { title: 'Name',              subtitle: 'What do they call you?',    icon: User },
  { title: 'Class',             subtitle: 'Choose your calling',       icon: Shield },
  { title: 'Subclass',          subtitle: 'Specialize your path',      icon: Sparkles },
  { title: 'Race',              subtitle: 'Choose your lineage',       icon: Globe },
  { title: 'Level',             subtitle: 'How seasoned are you?',     icon: TrendingUp },
  { title: 'Spell Save DC',     subtitle: 'Your spell difficulty',     icon: Target },
  { title: 'Spell Attack',      subtitle: 'Your spell attack bonus',   icon: Zap },
  { title: 'Armor Class',       subtitle: 'Your defensive ward',       icon: ShieldCheck },
  { title: 'Hit Points',        subtitle: 'Your vitality',             icon: Heart },
  { title: 'AI Connection',     subtitle: 'Power your companion',      icon: Key },
]

const TOTAL_STEPS = STEPS.length

// ─── Component ──────────────────────────────────────────────────────────────

export function CharacterSetup({ onComplete, roster, onSelectCharacter }: CharacterSetupProps) {
  const [step, setStep] = useState(-1) // -1 = welcome/import screen
  const { loading, error, queryStructured, clearResponse } = useAI()
  const [forgeError, setForgeError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleImportCharacter = useCallback(() => {
    setImportError(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          if (!parsed.name || !parsed.class || !parsed.race || !parsed.level) {
            setImportError('Invalid character file — missing name, class, race, or level.')
            return
          }
          if (!parsed.spells || !parsed.spellSlots) {
            setImportError('Invalid character file — missing spells or spell slot data.')
            return
          }
          if (!parsed.id) {
            parsed.id = generateId()
          }
          parsed.updatedAt = new Date().toISOString()
          onComplete(parsed as Character)
        } catch {
          setImportError('Could not read file — make sure it is a valid Codex character JSON.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [onComplete])

  // Form state
  const [name, setName] = useState('')
  const [charClass, setCharClass] = useState<string>(CLASSES[0])
  const [subclass, setSubclass] = useState<string>(SUBCLASSES[CLASSES[0]][0])
  const [race, setRace] = useState<string>(RACES[0])
  const [level, setLevel] = useState(5)
  const [spellSaveDC, setSpellSaveDC] = useState(13)
  const [spellAttackBonus, setSpellAttackBonus] = useState(5)
  const [armorClass, setArmorClass] = useState(16)
  const [hitPointsMax, setHitPointsMax] = useState(45)

  // AI config state
  const [aiProvider, setAiProvider] = useState<AIProvider>('ollama')
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash')
  const [ollamaUrl, setOllamaUrl] = useState('http://192.168.1.174:11434')
  const [ollamaModel, setOllamaModel] = useState('gemma3-27b-abliterated:latest')
  const [showKey, setShowKey] = useState(false)
  const [aiTestSuccess, setAiTestSuccess] = useState(false)
  const [aiTestError, setAiTestError] = useState<string | null>(null)
  const [aiTestLoading, setAiTestLoading] = useState(false)

  // Ollama model discovery
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; size: string; family: string }>>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const refreshOllamaModels = useCallback(async (url: string) => {
    setModelsLoading(true)
    try {
      const models = await fetchOllamaModels(url)
      setOllamaModels(models)
    } catch {
      setOllamaModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  // Load saved AI config on mount
  useEffect(() => {
    const config = loadAIConfig()
    setAiProvider(config.provider)
    if (config.geminiApiKey) setGeminiKey(config.geminiApiKey)
    if (config.geminiModel) setGeminiModel(config.geminiModel)
    if (config.ollamaUrl) setOllamaUrl(config.ollamaUrl)
    if (config.ollamaModel) setOllamaModel(config.ollamaModel)
  }, [])

  // Auto-fetch Ollama models when on the AI step with Ollama selected
  useEffect(() => {
    if (aiProvider === 'ollama' && ollamaUrl && step === 9) {
      refreshOllamaModels(ollamaUrl)
    }
  }, [aiProvider, ollamaUrl, step, refreshOllamaModels])

  const hasApiKey = aiProvider === 'gemini' ? geminiKey.trim().length > 0 : ollamaUrl.trim().length > 0

  const saveAndTestAI = useCallback(async () => {
    const config = {
      provider: aiProvider,
      geminiApiKey: aiProvider === 'gemini' ? geminiKey : undefined,
      geminiModel: aiProvider === 'gemini' ? geminiModel : undefined,
      ollamaUrl: aiProvider === 'ollama' ? ollamaUrl : undefined,
      ollamaModel: aiProvider === 'ollama' ? ollamaModel : undefined,
    }
    saveAIConfig(config)
    setAiTestError(null)
    setAiTestSuccess(false)
    setAiTestLoading(true)
    try {
      await queryAI('Respond with exactly: OK', 'Test', config)
      setAiTestSuccess(true)
    } catch (err) {
      setAiTestError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setAiTestLoading(false)
    }
  }, [aiProvider, geminiKey, ollamaUrl, ollamaModel])

  // Homebrew subclass state
  const [customSubclassName, setCustomSubclassName] = useState('')
  const [homebrewNotes, setHomebrewNotes] = useState('')

  // Resolve the actual subclass name (custom text or selected option)
  const isCustom = subclass === CUSTOM_SUBCLASS
  const isKnownHomebrew = !isCustom && HOMEBREW_CONTENT[subclass] !== undefined
  const resolvedSubclass = isCustom ? customSubclassName : subclass
  const resolvedHomebrew = isCustom
    ? homebrewNotes
    : isKnownHomebrew
      ? HOMEBREW_CONTENT[subclass]
      : ''

  // Keep subclass in sync when class changes
  const handleClassChange = useCallback((newClass: string) => {
    setCharClass(newClass)
    const subs = SUBCLASSES[newClass]
    setSubclass(subs?.[0] ?? '')
    setCustomSubclassName('')
    setHomebrewNotes('')
  }, [])

  const handleSubclassChange = useCallback((value: string) => {
    setSubclass(value)
    if (value !== CUSTOM_SUBCLASS) {
      setCustomSubclassName('')
      setHomebrewNotes('')
    }
  }, [])

  // ── Navigation ──

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return name.trim().length >= 2
      case 1: return !!charClass
      case 2: return isCustom ? customSubclassName.trim().length >= 2 : !!subclass
      case 3: return !!race
      case 4: return level >= 1 && level <= 20
      case 5: return spellSaveDC >= 1
      case 6: return true // spell attack bonus can be 0
      case 7: return armorClass >= 1
      case 8: return hitPointsMax >= 1
      case 9: return hasApiKey
      default: return false
    }
  }

  const goNext = () => {
    if (step < TOTAL_STEPS - 1 && canGoNext()) setStep(step + 1)
  }

  const goBack = () => {
    if (step > -1) setStep(step - 1)
  }

  // ── Forge Character ──

  const forgeCharacter = async () => {
    setForgeError(null)
    clearResponse()

    // Ensure AI config is saved before forging
    saveAIConfig({
      provider: aiProvider,
      geminiApiKey: aiProvider === 'gemini' ? geminiKey : undefined,
      geminiModel: aiProvider === 'gemini' ? geminiModel : undefined,
      ollamaUrl: aiProvider === 'ollama' ? ollamaUrl : undefined,
      ollamaModel: aiProvider === 'ollama' ? ollamaModel : undefined,
    })

    const raceSection = RACE_CONTENT[race]
      ? `\n\n--- SPECIES RULES ---\n${RACE_CONTENT[race]}\n--- END SPECIES ---\nUse the above species rules. Note the creature type, traits, and any special mechanics.`
      : ''

    const homebrewSection = resolvedHomebrew
      ? `\n\n--- HOMEBREW SUBCLASS CONTENT ---\n${resolvedHomebrew}\n--- END HOMEBREW ---\nUse the above homebrew content as the authoritative source for this subclass's features and oath spells. Include all homebrew oath spells as always-prepared, and include all homebrew features available at level ${level}.`
      : ''

    const prompt = `Set up a ${race} ${charClass} (${resolvedSubclass}) at level ${level}. Spellcasting ability: ${SPELLCASTING_ABILITY[charClass] ?? 'None'}. The class ${PREPARES_SPELLS[charClass] ? 'prepares spells' : 'knows spells (no daily preparation)'}. Caster type: ${CASTER_TYPE[charClass]}.${raceSection}${homebrewSection}`

    try {
      const result = await queryStructured<AICharacterResponse>(
        SYSTEM_PROMPTS.characterSetup,
        prompt,
      )

      // Build spell slots map
      const spellSlots: SpellSlots = {}
      for (const [lvl, max] of Object.entries(result.spellSlots)) {
        const n = Number(lvl)
        if (n > 0 && max > 0) {
          spellSlots[n] = { max, current: max }
        }
      }

      // Build spells list
      const spells: Spell[] = (result.availableSpells ?? []).map((s) => ({
        name: s.name,
        level: s.level,
        school: s.school,
        castingTime: s.castingTime,
        range: s.range,
        components: s.components,
        duration: s.duration,
        concentration: s.concentration,
        ritual: s.ritual,
        description: s.description,
        higherLevels: s.higherLevels ?? undefined,
        prepared: s.alwaysPrepared || s.level === 0, // cantrips + always-prepared
        source: s.source ?? 'PHB 2024',
      }))

      // Build class features
      const features: ClassFeature[] = (result.classFeatures ?? []).map((f) => ({
        name: f.name,
        level: f.level,
        description: f.description,
        usesPerRest: f.usesPerRest ?? undefined,
        usesMax: f.usesMax ?? undefined,
        usesCurrent: f.usesMax ?? undefined,
      }))

      const now = new Date().toISOString()
      const character: Character = {
        id: generateId(),
        name: name.trim(),
        class: charClass,
        subclass: resolvedSubclass,
        race,
        level,
        spellcastingAbility: result.spellcastingAbility || SPELLCASTING_ABILITY[charClass] || '',
        spellSaveDC,
        spellAttackBonus,
        proficiencyBonus: result.proficiencyBonus || Math.ceil(level / 4) + 1,
        armorClass,
        hitPoints: { max: hitPointsMax, current: hitPointsMax },
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        tempHP: 0,
        spells,
        spellSlots,
        canPrepareSpells: result.canPrepareSpells ?? PREPARES_SPELLS[charClass] ?? false,
        maxPreparedSpells: result.maxPreparedSpells ?? 0,
        features,
        homebrewNotes: resolvedHomebrew || undefined,
        abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        skillProficiencies: [],
        skillExpertise: [],
        savingThrowProficiencies: [],
        weapons: [],
        createdAt: now,
        updatedAt: now,
      }

      onComplete(character)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to forge character. Try again.'
      setForgeError(msg)
    }
  }

  // ── Render helpers ──

  const { title, subtitle, icon: StepIcon } = STEPS[step] ?? STEPS[0]

  const classOptions = CLASSES.map((c) => ({ value: c, label: c }))
  const subclassOptions = (SUBCLASSES[charClass] ?? []).map((s) => ({ value: s, label: s }))
  const raceOptions = RACES.map((r) => ({ value: r, label: r }))

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Input
            icon={User}
            label="Character Name"
            placeholder="Thalindra, Grog, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={40}
          />
        )
      case 1:
        return (
          <Select
            label="Class"
            options={classOptions}
            value={charClass}
            onChange={(e) => handleClassChange(e.target.value)}
          />
        )
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <Select
              label="Subclass"
              options={subclassOptions}
              value={subclass}
              onChange={(e) => handleSubclassChange(e.target.value)}
            />
            {isCustom && (
              <>
                <Input
                  icon={Sparkles}
                  label="Homebrew Subclass Name"
                  placeholder="e.g. Oath of the Hearth"
                  value={customSubclassName}
                  onChange={(e) => setCustomSubclassName(e.target.value)}
                  autoFocus
                  maxLength={60}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-forge-1">
                    Subclass Description
                  </label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-forge-0 placeholder:text-forge-2/50 focus:outline-none focus:border-arcane/50 focus:shadow-[0_0_0_3px_rgba(61,210,255,0.1)] transition-all duration-200 resize-y font-mono text-xs leading-relaxed"
                    placeholder="Paste your homebrew subclass features, spells, and abilities here..."
                    value={homebrewNotes}
                    onChange={(e) => setHomebrewNotes(e.target.value)}
                  />
                  <p className="text-xs text-forge-2">
                    Include oath spells, features by level, and any special mechanics. The AI will use this to generate your character accurately.
                  </p>
                </div>
              </>
            )}
            {isKnownHomebrew && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-ember/10 border border-ember/20">
                <Sparkles size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
                <p className="text-xs text-ember">
                  Homebrew content loaded for <span className="font-semibold">{subclass}</span>. The AI will use your subclass's oath spells, features, and abilities.
                </p>
              </div>
            )}
          </div>
        )
      case 3:
        return (
          <Select
            label="Race"
            options={raceOptions}
            value={race}
            onChange={(e) => setRace(e.target.value)}
          />
        )
      case 4:
        return (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-forge-1 select-none">
              Level
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLevel(Math.max(1, level - 1))}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.04] border border-white/10 text-forge-0 flex items-center justify-center hover:border-white/20 active:scale-95 transition-all duration-200 ease-forge"
                aria-label="Decrease level"
              >
                -
              </button>
              <span className="text-3xl font-display font-bold text-arcane tabular-nums min-w-[3ch] text-center">
                {level}
              </span>
              <button
                type="button"
                onClick={() => setLevel(Math.min(20, level + 1))}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.04] border border-white/10 text-forge-0 flex items-center justify-center hover:border-white/20 active:scale-95 transition-all duration-200 ease-forge"
                aria-label="Increase level"
              >
                +
              </button>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full accent-arcane"
              aria-label="Level slider"
            />
          </div>
        )
      case 5:
        return (
          <Input
            icon={Target}
            label="Spell Save DC"
            type="number"
            value={String(spellSaveDC)}
            onChange={(e) => setSpellSaveDC(Number(e.target.value) || 0)}
            min={1}
            max={30}
            placeholder="e.g. 13"
          />
        )
      case 6:
        return (
          <Input
            icon={Zap}
            label="Spell Attack Bonus"
            type="number"
            value={String(spellAttackBonus)}
            onChange={(e) => setSpellAttackBonus(Number(e.target.value) || 0)}
            min={0}
            max={20}
            placeholder="e.g. +5"
          />
        )
      case 7:
        return (
          <Input
            icon={ShieldCheck}
            label="Armor Class"
            type="number"
            value={String(armorClass)}
            onChange={(e) => setArmorClass(Number(e.target.value) || 0)}
            min={1}
            max={30}
            placeholder="e.g. 16"
          />
        )
      case 8:
        return (
          <Input
            icon={Heart}
            label="Max Hit Points"
            type="number"
            value={String(hitPointsMax)}
            onChange={(e) => setHitPointsMax(Number(e.target.value) || 0)}
            min={1}
            max={999}
            placeholder="e.g. 45"
          />
        )
      case 9:
        return (
          <div className="flex flex-col gap-4">
            {/* Provider toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-forge-1">Provider</span>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {(['gemini', 'ollama'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAiProvider(p)}
                    className={cn(
                      'flex-1 min-h-[44px] text-sm font-medium',
                      'transition-all duration-200 ease-forge active:scale-[0.98]',
                      aiProvider === p
                        ? 'bg-arcane/15 text-arcane'
                        : 'bg-white/[0.04] text-forge-2 hover:bg-white/[0.08] hover:text-forge-1',
                    )}
                  >
                    {p === 'gemini' ? 'Gemini (Free)' : 'Ollama (Local)'}
                  </button>
                ))}
              </div>
            </div>

            {aiProvider === 'gemini' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="setup-gemini-key" className="text-sm font-medium text-forge-1">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      id="setup-gemini-key"
                      type={showKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => { setGeminiKey(e.target.value); setAiTestSuccess(false); setAiTestError(null) }}
                      placeholder="Paste your Gemini API key"
                      className={cn(
                        'min-h-[44px] w-full rounded-xl',
                        'bg-white/[0.04] text-forge-0 placeholder:text-forge-2/50',
                        'border border-white/10',
                        'font-mono text-sm pl-4 pr-12',
                        'transition-all duration-200 ease-forge',
                        'focus:border-arcane/50 focus:shadow-[0_0_0_3px_rgba(61,210,255,0.1)] focus:outline-none',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-forge-2 hover:text-forge-1 transition-colors"
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-forge-2">
                    Free at{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arcane underline underline-offset-2"
                    >
                      aistudio.google.com/apikey
                    </a>
                  </p>
                </div>

                {/* Model selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-forge-1">Model</span>
                  <div className="flex flex-col gap-1.5">
                    {GEMINI_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setGeminiModel(m.id); setAiTestSuccess(false); setAiTestError(null) }}
                        className={cn(
                          'flex items-center justify-between min-h-[44px] px-3.5 rounded-xl text-left',
                          'transition-all duration-200 ease-forge active:scale-[0.98]',
                          'border',
                          geminiModel === m.id
                            ? 'bg-arcane/10 border-arcane/30 text-forge-0'
                            : 'bg-white/[0.03] border-white/8 text-forge-2 hover:bg-white/[0.06] hover:text-forge-1',
                        )}
                      >
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className="text-xs opacity-60">{m.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-forge-2">
                    Each model has its own free quota. If one is rate-limited, switch to another.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Input
                  icon={Server}
                  label="Ollama URL"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://192.168.1.174:11434"
                />
                {/* Model picker */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-forge-1">Model</span>
                  {modelsLoading ? (
                    <div className="flex items-center gap-2 min-h-[44px] px-3 text-forge-2 text-sm">
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                      Detecting models...
                    </div>
                  ) : ollamaModels.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {ollamaModels.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => { setOllamaModel(m.name); setAiTestSuccess(false); setAiTestError(null) }}
                          className={cn(
                            'flex items-center justify-between min-h-[44px] px-3.5 rounded-xl text-left',
                            'transition-all duration-200 ease-forge active:scale-[0.98]',
                            'border',
                            ollamaModel === m.name
                              ? 'bg-arcane/10 border-arcane/30 text-forge-0'
                              : 'bg-white/[0.03] border-white/8 text-forge-2 hover:bg-white/[0.06] hover:text-forge-1',
                          )}
                        >
                          <span className="text-sm font-medium">{m.name.replace(':latest', '')}</span>
                          <span className="text-xs opacity-60">{m.size}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      label=""
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="gemma3-27b-abliterated:latest"
                    />
                  )}
                </div>
              </>
            )}

            {/* Test button */}
            <Button
              variant="secondary"
              size="md"
              onClick={saveAndTestAI}
              loading={aiTestLoading}
              disabled={!hasApiKey}
              className="w-full"
            >
              {aiTestLoading ? 'Testing...' : (
                <>
                  <Wifi size={16} aria-hidden />
                  Test Connection
                </>
              )}
            </Button>

            {aiTestSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
                <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
                <span className="text-sm text-verdant">Connection successful — ready to forge</span>
              </div>
            )}

            {aiTestError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25 animate-fade-in">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
                <span className="text-sm text-red-400">{aiTestError}</span>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1
  const displayError = forgeError || error

  // ── Welcome / Import screen ──
  if (step === -1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-4 py-8 bg-void-0">
        <GlassCard className="w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center text-center gap-2 mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-arcane/10 text-arcane mb-2">
              <Shield size={28} aria-hidden />
            </div>
            <h1 className="font-display text-2xl font-bold text-forge-0">
              The Codex
            </h1>
            <p className="text-sm text-forge-2">
              Your D&D 2024 companion
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep(0)}
              className="w-full gap-2"
            >
              <Plus size={18} aria-hidden />
              Create New Character
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleImportCharacter}
              className="w-full gap-2"
            >
              <Upload size={18} aria-hidden />
              Import Character
            </Button>
          </div>

          {roster.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <h3 className="text-sm font-medium text-forge-1 mb-3">Your Characters</h3>
              <div className="flex flex-col gap-2">
                {roster.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectCharacter(entry.id)}
                    className={cn(
                      'flex items-center justify-between w-full min-h-[56px] px-4 py-3 rounded-xl text-left',
                      'bg-white/[0.03] border border-white/8',
                      'transition-all duration-200 ease-forge',
                      'hover:bg-white/[0.06] hover:border-white/12',
                      'active:scale-[0.98]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-forge-0">{entry.name}</span>
                      <span className="text-xs text-forge-2">
                        {entry.class}{entry.subclass ? ` (${entry.subclass})` : ''} · Lvl {entry.level}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-forge-2 shrink-0" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          )}

          {importError && (
            <div className="flex items-start gap-2 p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-red-300">{importError}</p>
            </div>
          )}

          <p className="text-xs text-forge-2/60 text-center mt-6">
            Import a previously exported <span className="font-mono">.json</span> character file to pick up right where you left off.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-4 py-8 bg-void-0">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-forge-2 font-mono">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <span className="text-xs text-forge-2 font-mono">
            {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-void-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-arcane to-eldritch transition-all duration-500 ease-forge"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <GlassCard className="w-full max-w-md animate-fade-in">
        {/* Step header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-arcane/10 text-arcane">
            <StepIcon size={20} aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-forge-0">
              {title}
            </h2>
            <p className="text-sm text-forge-2">{subtitle}</p>
          </div>
        </div>

        {/* Step content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>

        {/* Error state */}
        {displayError && (
          <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-red-300">
              {displayError}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={loading}
              className="gap-1"
            >
              <ChevronLeft size={16} aria-hidden />
              Back
            </Button>
          )}

          <div className="flex-1" />

          {isLastStep ? (
            <Button
              variant="primary"
              size="lg"
              onClick={forgeCharacter}
              loading={loading}
              disabled={!canGoNext()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  Forging...
                </>
              ) : (
                <>
                  <Sparkles size={18} aria-hidden />
                  Forge Character
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canGoNext()}
              className="gap-1"
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Character preview breadcrumb */}
      {(name || charClass) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-forge-2">
          {name && <span className="text-forge-1">{name}</span>}
          {name && charClass && <span aria-hidden>&middot;</span>}
          {charClass && <span className="text-eldritch">{charClass}</span>}
          {resolvedSubclass && step >= 2 && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="text-forge-2 text-xs">{resolvedSubclass}</span>
            </>
          )}
          {race && step >= 3 && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="text-forge-2 text-xs">{race}</span>
            </>
          )}
          {step >= 4 && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="text-forge-2 text-xs">Lvl {level}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
