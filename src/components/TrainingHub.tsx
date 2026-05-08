import { useState, useCallback, useEffect } from 'react'
import {
  Brain,
  Theater,
  Swords,
  Sparkles,
  Loader2,
  AlertTriangle,
  Send,
  ArrowRight,
  Shield,
  Heart,
  Target,
  Lightbulb,
  Map,
  BookOpen,
  BookHeart,
  Mic,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { useTraining } from '../hooks/useTraining'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character, BackstoryMemory } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { OrnateHeader } from './ui/OrnateHeader'
import { QuizArena } from './QuizArena'
import { RoleplayCoach } from './RoleplayCoach'
import { PersonaEngine } from './PersonaEngine'
import { TrainingProgress } from './TrainingProgress'
import { SpacedFlashcards } from './SpacedFlashcards'
import { BackstoryBuilder } from './BackstoryBuilder'
import { AccentCoach } from './AccentCoach'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrainingHubProps {
  character: Character
  onCharacterUpdate?: (char: Character) => void
}

type TrainingMode = 'rules_quiz' | 'roleplay_coach' | 'combat_sims' | 'persona' | 'flashcards' | 'backstory' | 'accent'

interface CombatScenario {
  scenario: string
  enemies: {
    name: string
    ac: number
    hp: number
    abilities: string[]
  }[]
  terrain: string
  objectives: string[]
  hints: string[]
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES: { id: TrainingMode; label: string; icon: typeof Brain }[] = [
  { id: 'rules_quiz', label: 'Rules Quiz', icon: Brain },
  { id: 'roleplay_coach', label: 'Roleplay Coach', icon: Theater },
  { id: 'combat_sims', label: 'Combat Sims', icon: Swords },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
  { id: 'persona', label: 'Persona', icon: Sparkles },
  { id: 'backstory', label: 'Backstory', icon: BookHeart },
  { id: 'accent', label: 'Accent', icon: Mic },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TrainingHub({ character, onCharacterUpdate }: TrainingHubProps) {
  const [mode, setMode] = useState<TrainingMode>('rules_quiz')
  const [backstoryDrillMemory, setBackstoryDrillMemory] = useState<BackstoryMemory | undefined>(undefined)

  /* ------ Training Profile ------ */
  const {
    profile,
    recordQuiz,
    recordDrill,
    reviewCard,
    getDueCards,
    suggestedDifficulty,
    weakCategories,
    initFlashcard,
  } = useTraining(character.id)

  // Initialize flashcards from persona on load
  useEffect(() => {
    if (!character.persona) return
    const traits = [
      ...(character.persona.physicalTics ?? []).map((_, i) => `physicalTic-${i}`),
      ...(character.persona.sceneInstincts ?? []).map((_, i) => `sceneInstinct-${i}`),
      ...(character.persona.quietTexture ?? []).map((_, i) => `quietTexture-${i}`),
      ...(character.persona.catchphrases ?? []).map((_, i) => `catchphrase-${i}`),
    ]
    traits.forEach((id) => initFlashcard(id))
  }, [character.persona, initFlashcard])

  /* ------ Combat Sim State ------ */
  const scenarioAI = useAI()
  const evaluateAI = useAI()
  const [scenario, setScenario] = useState<CombatScenario | null>(null)
  const [playerAction, setPlayerAction] = useState('')
  const [evaluation, setEvaluation] = useState<string | null>(null)
  const [hintsRevealed, setHintsRevealed] = useState(false)

  /* ------ Combat Sim Handlers ------ */
  const generateScenario = useCallback(async () => {
    setScenario(null)
    setPlayerAction('')
    setEvaluation(null)
    setHintsRevealed(false)
    try {
      const result = await scenarioAI.queryStructured<CombatScenario>(
        SYSTEM_PROMPTS.combatSimScenario(character),
        `Generate a tactical combat scenario appropriate for a level ${character.level} ${character.class} (${character.subclass}). Consider their prepared spells and class features. Make it challenging but solvable.`,
      )
      setScenario(result)
    } catch {
      // error handled by useAI hook
    }
  }, [character, scenarioAI])

  const submitAction = useCallback(async () => {
    if (!scenario || !playerAction.trim()) return
    try {
      const context = `COMBAT SCENARIO:\n${scenario.scenario}\n\nENEMIES:\n${scenario.enemies.map(e => `- ${e.name} (AC ${e.ac}, HP ${e.hp}) — ${e.abilities.join(', ')}`).join('\n')}\n\nTERRAIN: ${scenario.terrain}\n\nOBJECTIVES: ${scenario.objectives.join(', ')}\n\nPLAYER'S ACTION:\n${playerAction.trim()}`

      const result = await evaluateAI.query(
        SYSTEM_PROMPTS.combatSimEvaluator(character),
        context,
      )
      setEvaluation(result)

      // Record drill with a score based on having completed it
      recordDrill(scenario.scenario.slice(0, 50), 8)
    } catch {
      // error handled by hook
    }
  }, [scenario, playerAction, character, evaluateAI, recordDrill])

  /* ------ Render Mode Chips ------ */
  const renderModeChips = () => {
    const dueCount = getDueCards().length
    return (
      <div className="flex flex-wrap gap-2">
        {MODES.map(m => {
          const Icon = m.icon
          const isActive = mode === m.id
          const showDueBadge = m.id === 'flashcards' && dueCount > 0
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
                'text-sm font-medium select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                isActive
                  ? 'bg-arcane/15 text-arcane border border-arcane/30'
                  : 'combat-card text-forge-1 hover:border-gold/40',
              )}
            >
              <Icon size={16} aria-hidden />
              {m.label}
              {showDueBadge && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-eldritch/20 text-eldritch text-[10px] font-bold">
                  {dueCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  /* ------ Render Combat Sims ------ */
  const renderCombatSims = () => (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Generate button */}
      <Button
        variant="primary"
        size="lg"
        loading={scenarioAI.loading}
        onClick={generateScenario}
        className="w-full"
      >
        <Swords size={16} aria-hidden />
        {scenario ? 'Generate New Scenario' : 'Generate Scenario'}
      </Button>

      {/* Scenario error */}
      {scenarioAI.error && (
        <GlassCard className="border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Failed to generate scenario</p>
              <p className="text-xs text-forge-2">{scenarioAI.error}</p>
              <Button variant="ghost" size="sm" onClick={generateScenario} className="mt-3">
                Try Again
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Loading */}
      {scenarioAI.loading && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin text-arcane" aria-hidden />
            <p className="text-sm text-forge-2">Generating combat scenario...</p>
          </div>
        </GlassCard>
      )}

      {/* Scenario display */}
      {scenario && !scenarioAI.loading && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* Scenario description */}
          <GlassCard>
            <div className="flex items-center gap-2.5 mb-3">
              <Map size={18} className="text-arcane" aria-hidden />
              <OrnateHeader className="flex-1">The Situation</OrnateHeader>
            </div>
            <p className="text-sm text-forge-1 leading-relaxed">{scenario.scenario}</p>
          </GlassCard>

          {/* Enemy stat blocks */}
          <div className="grid grid-cols-1 gap-3">
            {scenario.enemies.map((enemy, i) => (
              <GlassCard key={i}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-sm font-semibold text-forge-0">{enemy.name}</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Shield size={13} className="text-arcane" aria-hidden />
                      <span className="font-mono text-forge-0">AC {enemy.ac}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Heart size={13} className="text-red-400" aria-hidden />
                      <span className="font-mono text-forge-0">{enemy.hp} HP</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {enemy.abilities.map((ability, j) => (
                    <Badge key={j} variant="neutral">
                      {ability}
                    </Badge>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Terrain */}
          <GlassCard>
            <div className="flex items-center gap-2.5 mb-2">
              <Target size={16} className="text-verdant" aria-hidden />
              <h4 className="text-sm font-semibold text-forge-0">Terrain</h4>
            </div>
            <p className="text-sm text-forge-1 leading-relaxed">{scenario.terrain}</p>
          </GlassCard>

          {/* Objectives */}
          <GlassCard>
            <h4 className="text-sm font-semibold text-forge-0 mb-2">Objectives</h4>
            <ul className="flex flex-col gap-1.5">
              {scenario.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                  <ArrowRight size={14} className="text-arcane shrink-0 mt-0.5" aria-hidden />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Hints (toggleable) */}
          <div>
            <button
              type="button"
              onClick={() => setHintsRevealed(prev => !prev)}
              className={cn(
                'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl',
                'text-sm font-medium select-none',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                hintsRevealed
                  ? 'bg-ember/15 text-ember border border-ember/30'
                  : 'bg-gold/[0.04] text-forge-2 border border-bronze/25 hover:bg-gold/[0.08] hover:border-gold/30',
              )}
            >
              <Lightbulb size={14} aria-hidden />
              {hintsRevealed ? 'Hide Hints' : 'Show Hints'}
            </button>
            {hintsRevealed && (
              <div className="mt-3 flex flex-col gap-1.5 animate-fade-in">
                {scenario.hints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ember/80 pl-2">
                    <Lightbulb size={13} className="shrink-0 mt-0.5" aria-hidden />
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player action input */}
          {!evaluation && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="combat-action"
                  className="text-sm font-medium text-forge-1 select-none"
                >
                  What would you do?
                </label>
                <textarea
                  id="combat-action"
                  value={playerAction}
                  onChange={e => setPlayerAction(e.target.value)}
                  placeholder={`Describe ${character.name}'s action: movement, spells, abilities, positioning...`}
                  disabled={evaluateAI.loading}
                  rows={4}
                  className={cn(
                    'min-h-[88px] w-full rounded-xl resize-y',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-bronze/25',
                    'font-body text-sm px-4 py-3',
                    'transition-all duration-200 ease-forge',
                    'focus:border-arcane/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                    'focus:outline-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={submitAction}
                loading={evaluateAI.loading}
                disabled={!playerAction.trim()}
                className="w-full"
              >
                <Send size={16} aria-hidden />
                Submit Action
              </Button>
            </div>
          )}

          {/* Evaluation loading */}
          {evaluateAI.loading && (
            <GlassCard>
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 size={24} className="animate-spin text-arcane" aria-hidden />
                <p className="text-sm text-forge-2">Evaluating your tactical decision...</p>
              </div>
            </GlassCard>
          )}

          {/* Evaluation error */}
          {evaluateAI.error && !evaluation && (
            <GlassCard className="border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm text-red-400 font-semibold">Failed to evaluate action</p>
                  <p className="text-xs text-forge-2 mt-0.5">{evaluateAI.error}</p>
                  <Button variant="ghost" size="sm" onClick={submitAction} className="mt-2">
                    Try Again
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Evaluation result */}
          {evaluation && !evaluateAI.loading && (
            <GlassCard className="animate-slide-up border-arcane/20">
              <div className="flex items-center gap-2.5 mb-3">
                <Target size={18} className="text-arcane" aria-hidden />
                <h4 className="font-display text-base font-semibold text-forge-0">Tactical Evaluation</h4>
              </div>
              <div className="text-sm text-forge-1 leading-relaxed whitespace-pre-wrap">
                {evaluation}
              </div>
              <div className="mt-4">
                <Button variant="secondary" size="md" onClick={generateScenario} className="w-full">
                  Next Scenario
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Empty state */}
      {!scenario && !scenarioAI.loading && !scenarioAI.error && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-arcane/10 flex items-center justify-center">
              <Swords size={24} className="text-arcane" aria-hidden />
            </div>
            <p className="text-sm text-forge-1 max-w-xs">
              Generate a combat scenario tailored to{' '}
              <span className="text-arcane font-medium">{character.name}</span>&apos;s abilities.
              Describe your tactical approach and get AI feedback on your decisions.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )

  /* ------ Main Render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <OrnateHeader>Training Hall</OrnateHeader>

      {/* Training Progress — always visible */}
      {profile && <TrainingProgress profile={profile} />}

      {/* Sub-mode chips */}
      {renderModeChips()}

      <div className="ornate-divider" aria-hidden />

      {/* Content area */}
      {mode === 'rules_quiz' && (
        <QuizArena
          character={character}
          onQuizAnswer={recordQuiz}
          suggestedDifficulty={suggestedDifficulty()}
          weakCategories={weakCategories}
        />
      )}
      {mode === 'roleplay_coach' && <RoleplayCoach character={character} />}
      {mode === 'combat_sims' && renderCombatSims()}
      {mode === 'flashcards' && profile && (
        <SpacedFlashcards
          character={character}
          profile={profile}
          onReviewCard={reviewCard}
        />
      )}
      {mode === 'persona' && onCharacterUpdate && (
        <PersonaEngine character={character} onUpdate={onCharacterUpdate} />
      )}
      {mode === 'backstory' && onCharacterUpdate && (
        <BackstoryBuilder
          character={character}
          onUpdate={onCharacterUpdate}
          onStartDrill={(memory) => {
            setBackstoryDrillMemory(memory)
            setMode('roleplay_coach')
          }}
        />
      )}
      {mode === 'accent' && (
        <AccentCoach character={character} />
      )}
    </div>
  )
}
