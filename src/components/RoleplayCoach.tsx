import { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Quote,
  Shuffle,
  Send,
  Loader2,
  AlertTriangle,
  Sparkles,
  Dices,
  ArrowRight,
  Trophy,
  RotateCcw,
  CheckCircle2,
  User,
  Theater,
  Eye,
  MessageSquare,
  Hand,
  Flame,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoleplayCoachProps {
  character: Character
}

interface ImprovGrade {
  score: number
  strengths: string[]
  improvements: string[]
  suggestion: string
}

interface DrillRecord {
  scene: string
  response: string
  grade: ImprovGrade
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-verdant'
  if (score >= 5) return 'text-ember'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-verdant/10 border-verdant/25'
  if (score >= 5) return 'bg-ember/10 border-ember/25'
  return 'bg-red-500/10 border-red-500/25'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RoleplayCoach({ character }: RoleplayCoachProps) {
  const hasPersona = !!character.persona

  /* ------ Persona Quick Reference ------ */
  const [personaOpen, setPersonaOpen] = useState(true)
  const [catchphrase, setCatchphrase] = useState<string | null>(null)

  /* ------ Scene Coach ------ */
  const sceneAI = useAI()
  const [sceneInput, setSceneInput] = useState('')
  const [sceneResponse, setSceneResponse] = useState<string | null>(null)

  /* ------ Improv Drills ------ */
  const improvSceneAI = useAI()
  const improvGradeAI = useAI()
  const [drillScene, setDrillScene] = useState<string | null>(null)
  const [drillResponse, setDrillResponse] = useState('')
  const [drillGrade, setDrillGrade] = useState<ImprovGrade | null>(null)
  const [drillHistory, setDrillHistory] = useState<DrillRecord[]>([])

  /* ------ Mannerism Flashcards ------ */
  const allMannerisms = useMemo(() => {
    if (!character.persona) return []
    return [
      ...character.persona.physicalTics.map(t => ({ type: 'Physical Tic' as const, text: t })),
      ...character.persona.sceneInstincts.map(t => ({ type: 'Scene Instinct' as const, text: t })),
      ...character.persona.quietTexture.map(t => ({ type: 'Quiet Texture' as const, text: t })),
    ]
  }, [character.persona])
  const [flashcardIndex, setFlashcardIndex] = useState(0)

  /* ------ Derived ------ */
  const averageScore = useMemo(() => {
    if (drillHistory.length === 0) return 0
    return Math.round(
      drillHistory.reduce((sum, d) => sum + d.grade.score, 0) / drillHistory.length,
    )
  }, [drillHistory])

  /* ------ Handlers ------ */

  const rollCatchphrase = useCallback(() => {
    if (!character.persona?.catchphrases?.length) return
    const phrases = character.persona.catchphrases
    const random = phrases[Math.floor(Math.random() * phrases.length)]
    setCatchphrase(random)
  }, [character.persona])

  const submitScene = useCallback(async () => {
    if (!sceneInput.trim() || !hasPersona) return
    setSceneResponse(null)
    try {
      const result = await sceneAI.query(
        SYSTEM_PROMPTS.sceneCoach(character),
        sceneInput.trim(),
      )
      setSceneResponse(result)
    } catch {
      // error is handled by useAI hook
    }
  }, [sceneInput, character, hasPersona, sceneAI])

  const startDrill = useCallback(async () => {
    if (!hasPersona) return
    setDrillScene(null)
    setDrillResponse('')
    setDrillGrade(null)
    try {
      const result = await improvSceneAI.query(
        SYSTEM_PROMPTS.sceneCoach(character),
        `Generate a brief, vivid scene prompt for ${character.name} to respond to in-character. The scene should test their defined personality traits, decision tree, and patron relationship. Give ONLY the scene description in 2-3 sentences, nothing else. Make it specific and dramatic.`,
      )
      setDrillScene(result)
    } catch {
      // error handled by hook
    }
  }, [character, hasPersona, improvSceneAI])

  const gradeDrill = useCallback(async () => {
    if (!drillScene || !drillResponse.trim() || !hasPersona) return
    try {
      const grade = await improvGradeAI.queryStructured<ImprovGrade>(
        SYSTEM_PROMPTS.improvGrader(character),
        `SCENE: ${drillScene}\n\nPLAYER'S IN-CHARACTER RESPONSE:\n${drillResponse.trim()}`,
      )
      setDrillGrade(grade)
      setDrillHistory(prev => [
        ...prev,
        { scene: drillScene, response: drillResponse.trim(), grade },
      ])
    } catch {
      // error handled by hook
    }
  }, [drillScene, drillResponse, character, hasPersona, improvGradeAI])

  const resetDrills = useCallback(() => {
    setDrillHistory([])
    setDrillScene(null)
    setDrillResponse('')
    setDrillGrade(null)
  }, [])

  const nextFlashcard = useCallback(() => {
    if (allMannerisms.length === 0) return
    setFlashcardIndex(prev => (prev + 1) % allMannerisms.length)
  }, [allMannerisms.length])

  /* ------ Empty State ------ */
  if (!hasPersona) {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-eldritch/10 flex items-center justify-center">
              <Theater size={28} className="text-eldritch" aria-hidden />
            </div>
            <div className="max-w-xs">
              <p className="text-base font-display font-semibold text-forge-0 mb-2">
                Persona Data Required
              </p>
              <p className="text-sm text-forge-2 leading-relaxed">
                Add persona data in Settings to unlock roleplay coaching.
                Look for the <span className="text-eldritch font-medium">Upgrade</span> button
                on your character sheet to generate physical tics, scene instincts,
                catchphrases, and more.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  const persona = character.persona!

  /* ------ Render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 1: Persona Quick Reference                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <GlassCard>
        <button
          type="button"
          onClick={() => setPersonaOpen(prev => !prev)}
          className={cn(
            'w-full flex items-center justify-between min-h-[44px]',
            'text-left',
            'active:scale-[0.99]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
        >
          <div className="flex items-center gap-2.5">
            <User size={18} className="text-eldritch" aria-hidden />
            <span className="font-display text-base font-semibold text-forge-0">
              Persona Quick Reference
            </span>
          </div>
          {personaOpen ? (
            <ChevronUp size={18} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={18} className="text-forge-2" aria-hidden />
          )}
        </button>

        {personaOpen && (
          <div className="mt-4 flex flex-col gap-4 animate-fade-in">
            {/* Default State */}
            <div className="relative pl-4 border-l-2 border-eldritch/40">
              <Quote size={14} className="absolute -left-[9px] -top-0.5 text-eldritch bg-void-1 p-px" aria-hidden />
              <p className="text-sm text-forge-0 italic leading-relaxed">
                {persona.defaultState}
              </p>
            </div>

            {/* Physical Tics */}
            <div>
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">
                Physical Tics
              </p>
              <div className="flex flex-wrap gap-2">
                {persona.physicalTics.map((tic, i) => (
                  <Badge key={i} variant="eldritch" className="cursor-default">
                    {tic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Scene Instincts */}
            <div>
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">
                Scene Instincts
              </p>
              <ul className="flex flex-col gap-1.5">
                {persona.sceneInstincts.map((instinct, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                    <CheckCircle2 size={14} className="text-verdant shrink-0 mt-0.5" aria-hidden />
                    <span>{instinct}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Patron */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Flame size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-medium text-forge-0">{persona.patron.name}</p>
                <p className="text-xs text-forge-2 mt-0.5">{persona.patron.domains.join(', ')}</p>
              </div>
            </div>

            {/* Catchphrase Roller */}
            {persona.catchphrases && persona.catchphrases.length > 0 && (
              <div>
                <Button variant="ghost" size="sm" onClick={rollCatchphrase}>
                  <Shuffle size={14} aria-hidden />
                  Random Catchphrase
                </Button>
                {catchphrase && (
                  <div className="mt-2 pl-4 border-l-2 border-arcane/30 animate-fade-in">
                    <p className="text-sm text-arcane italic">
                      &ldquo;{catchphrase}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 2: Scene Coach                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <GlassCard>
        <div className="flex items-center gap-2.5 mb-4">
          <Eye size={18} className="text-arcane" aria-hidden />
          <h3 className="font-display text-base font-semibold text-forge-0">Scene Coach</h3>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            value={sceneInput}
            onChange={e => setSceneInput(e.target.value)}
            placeholder="Describe the scene... (e.g., 'A dying soldier reaches out to you on the battlefield')"
            disabled={sceneAI.loading}
            onKeyDown={e => {
              if (e.key === 'Enter' && !sceneAI.loading) submitScene()
            }}
          />

          <Button
            variant="primary"
            size="md"
            onClick={submitScene}
            loading={sceneAI.loading}
            disabled={!sceneInput.trim()}
            className="w-full"
          >
            <Sparkles size={16} aria-hidden />
            Coach My Reaction
          </Button>
        </div>

        {/* Error */}
        {sceneAI.error && (
          <div className="mt-3 rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm text-red-400 font-semibold">Failed to generate coaching</p>
              <p className="text-xs text-forge-2 mt-0.5">{sceneAI.error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {sceneAI.loading && (
          <div className="mt-4 flex flex-col items-center py-6 gap-3">
            <Loader2 size={24} className="animate-spin text-arcane" aria-hidden />
            <p className="text-sm text-forge-2">Analyzing the scene through {character.name}&apos;s eyes...</p>
          </div>
        )}

        {/* Response */}
        {sceneResponse && !sceneAI.loading && (
          <div className="mt-4 animate-slide-up">
            <div className="rounded-xl bg-arcane/[0.04] border border-arcane/15 p-4">
              <div className="prose-sm text-forge-1 leading-relaxed whitespace-pre-wrap">
                {sceneResponse}
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 3: Improv Drills                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={18} className="text-ember" aria-hidden />
            <h3 className="font-display text-base font-semibold text-forge-0">Improv Drills</h3>
          </div>

          {/* Session score */}
          {drillHistory.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Trophy size={14} className="text-ember" aria-hidden />
                <span className="font-mono text-forge-0">{averageScore}/10</span>
                <span className="text-forge-2 text-xs">
                  ({drillHistory.length} drill{drillHistory.length !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                type="button"
                onClick={resetDrills}
                className={cn(
                  'inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg',
                  'text-xs text-forge-2 hover:text-forge-1',
                  'transition-colors duration-200',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
                aria-label="Reset drill scores"
              >
                <RotateCcw size={12} aria-hidden />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* No drill started */}
        {!drillScene && !improvSceneAI.loading && (
          <Button
            variant="secondary"
            size="lg"
            onClick={startDrill}
            loading={improvSceneAI.loading}
            className="w-full"
          >
            <Dices size={16} aria-hidden />
            Start Drill
          </Button>
        )}

        {/* Generating scene */}
        {improvSceneAI.loading && !drillScene && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Loader2 size={24} className="animate-spin text-ember" aria-hidden />
            <p className="text-sm text-forge-2">Setting the scene...</p>
          </div>
        )}

        {/* Scene error */}
        {improvSceneAI.error && !drillScene && (
          <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm text-red-400 font-semibold">Failed to generate scene</p>
              <p className="text-xs text-forge-2 mt-0.5">{improvSceneAI.error}</p>
              <Button variant="ghost" size="sm" onClick={startDrill} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Drill in progress */}
        {drillScene && (
          <div className="flex flex-col gap-3 animate-fade-in">
            {/* Scene prompt */}
            <div className="rounded-xl bg-ember/[0.06] border border-ember/20 p-4">
              <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">The Scene</p>
              <p className="text-sm text-forge-0 leading-relaxed">{drillScene}</p>
            </div>

            {/* Player response */}
            {!drillGrade && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="drill-response"
                    className="text-sm font-medium text-forge-1 select-none"
                  >
                    Your in-character response
                  </label>
                  <textarea
                    id="drill-response"
                    value={drillResponse}
                    onChange={e => setDrillResponse(e.target.value)}
                    placeholder={`Respond as ${character.name}... describe what they say, do, and feel.`}
                    disabled={improvGradeAI.loading}
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
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  />
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={gradeDrill}
                  loading={improvGradeAI.loading}
                  disabled={!drillResponse.trim()}
                  className="w-full"
                >
                  <Send size={16} aria-hidden />
                  Grade Me
                </Button>
              </>
            )}

            {/* Grading loader */}
            {improvGradeAI.loading && (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 size={24} className="animate-spin text-ember" aria-hidden />
                <p className="text-sm text-forge-2">Evaluating persona consistency...</p>
              </div>
            )}

            {/* Grade error */}
            {improvGradeAI.error && !drillGrade && (
              <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm text-red-400 font-semibold">Failed to grade response</p>
                  <p className="text-xs text-forge-2 mt-0.5">{improvGradeAI.error}</p>
                  <Button variant="ghost" size="sm" onClick={gradeDrill} className="mt-2">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Grade result */}
            {drillGrade && (
              <div className="flex flex-col gap-3 animate-slide-up">
                {/* Score */}
                <div className={cn('rounded-xl border p-4', getScoreBg(drillGrade.score))}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn('font-display text-3xl font-bold', getScoreColor(drillGrade.score))}>
                      {drillGrade.score}
                    </span>
                    <span className="text-sm text-forge-2">/10</span>
                  </div>

                  {/* Strengths */}
                  {drillGrade.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-verdant uppercase tracking-wider mb-1.5">Strengths</p>
                      <ul className="flex flex-col gap-1">
                        {drillGrade.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                            <CheckCircle2 size={13} className="text-verdant shrink-0 mt-0.5" aria-hidden />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {drillGrade.improvements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-1.5">Improvements</p>
                      <ul className="flex flex-col gap-1">
                        {drillGrade.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                            <ArrowRight size={13} className="text-ember shrink-0 mt-0.5" aria-hidden />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestion */}
                  {drillGrade.suggestion && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-1.5">Suggestion</p>
                      <p className="text-sm text-forge-1 leading-relaxed italic">
                        {drillGrade.suggestion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Next drill button */}
                <Button variant="secondary" size="md" onClick={startDrill} className="w-full">
                  Next Drill
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 4: Mannerism Flashcards                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {allMannerisms.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2.5 mb-4">
            <Hand size={18} className="text-verdant" aria-hidden />
            <h3 className="font-display text-base font-semibold text-forge-0">Mannerism Flashcards</h3>
          </div>

          {/* Current card */}
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'w-full rounded-xl border p-6 text-center',
                'bg-gradient-to-br from-white/[0.03] to-white/[0.01]',
                'border-white/10',
                'min-h-[120px] flex flex-col items-center justify-center gap-3',
              )}
            >
              <Badge
                variant={
                  allMannerisms[flashcardIndex].type === 'Physical Tic'
                    ? 'eldritch'
                    : allMannerisms[flashcardIndex].type === 'Scene Instinct'
                      ? 'arcane'
                      : 'verdant'
                }
              >
                {allMannerisms[flashcardIndex].type}
              </Badge>
              <p className="text-base text-forge-0 font-medium leading-relaxed max-w-sm">
                {allMannerisms[flashcardIndex].text}
              </p>
            </div>

            {/* Counter */}
            <p className="text-xs text-forge-2 font-mono">
              {flashcardIndex + 1} / {allMannerisms.length}
            </p>

            {/* Next button */}
            <Button variant="secondary" size="md" onClick={nextFlashcard} className="w-full">
              <ArrowRight size={16} aria-hidden />
              Next
            </Button>

            {/* Motivational text */}
            <p className="text-xs text-forge-2 italic text-center">
              Practice this at the table tonight.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
