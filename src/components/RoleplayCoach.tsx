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
  ArrowRight,
  CheckCircle2,
  User,
  Theater,
  Eye,
  Hand,
  Flame,
  BookOpen,
  Swords,
  RotateCcw,
  Star,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Badge } from './ui/Badge'
import { ImprovDrillEnhanced } from './ImprovDrillEnhanced'
import { ConversationDrill } from './ConversationDrill'
import { MessageCircle } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoleplayCoachProps {
  character: Character
}

interface SceneCoaching {
  scores: { persona: number; emotion: number; physical: number; decision: number; patron: number }
  overall: number
  strengths: string[]
  improvements: string[]
  coachNote: string
}

type CoachMode = 'study' | 'session'
type DrillType = 'improv' | 'conversation'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RoleplayCoach({ character }: RoleplayCoachProps) {
  const hasPersona = !!character.persona

  /* ------ Mode Toggle ------ */
  const [mode, setMode] = useState<CoachMode>('study')
  const [drillType, setDrillType] = useState<DrillType>('improv')

  /* ------ Persona Quick Reference ------ */
  const [personaOpen, setPersonaOpen] = useState(true)
  const [catchphrase, setCatchphrase] = useState<string | null>(null)

  /* ------ Scene Coach (reversed flow) ------ */
  const [generatedScene, setGeneratedScene] = useState<string | null>(null)
  const [sayInput, setSayInput] = useState('')
  const [doInput, setDoInput] = useState('')
  const [coaching, setCoaching] = useState<SceneCoaching | null>(null)
  const [referenceReaction, setReferenceReaction] = useState<string | null>(null)
  const [showReference, setShowReference] = useState(false)
  const sceneGenAI = useAI()
  const sceneGradeAI = useAI()
  const sceneRefAI = useAI()

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

  /* ------ Handlers ------ */

  const rollCatchphrase = useCallback(() => {
    if (!character.persona?.catchphrases?.length) return
    const phrases = character.persona.catchphrases
    const random = phrases[Math.floor(Math.random() * phrases.length)]
    setCatchphrase(random)
  }, [character.persona])

  const generateScene = useCallback(async () => {
    if (!hasPersona) return
    setGeneratedScene(null)
    setSayInput('')
    setDoInput('')
    setCoaching(null)
    setReferenceReaction(null)
    setShowReference(false)
    try {
      const result = await sceneGenAI.query(
        SYSTEM_PROMPTS.sceneGenerator(character),
        `Generate a new scene for ${character.name} to react to.`,
      )
      setGeneratedScene(result)
    } catch {
      // error is handled by useAI hook
    }
  }, [character, hasPersona, sceneGenAI])

  const submitResponse = useCallback(async () => {
    if (!sayInput.trim() || !doInput.trim() || !generatedScene) return
    setCoaching(null)
    try {
      const result = await sceneGradeAI.queryStructured<SceneCoaching>(
        SYSTEM_PROMPTS.sceneResponseGrader(character, generatedScene, sayInput.trim(), doInput.trim()),
        `Grade this response for ${character.name}.`,
      )
      setCoaching(result)
    } catch {
      // error is handled by useAI hook
    }
  }, [sayInput, doInput, generatedScene, character, sceneGradeAI])

  const fetchReference = useCallback(async () => {
    if (!generatedScene) return
    if (referenceReaction) {
      setShowReference(prev => !prev)
      return
    }
    setShowReference(true)
    try {
      const result = await sceneRefAI.query(
        SYSTEM_PROMPTS.sceneReferenceReaction(character, generatedScene),
        `Show the reference reaction for ${character.name}.`,
      )
      setReferenceReaction(result)
    } catch {
      // error is handled by useAI hook
    }
  }, [generatedScene, referenceReaction, character, sceneRefAI])

  const nextScene = useCallback(() => {
    generateScene()
  }, [generateScene])

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
      {/* Mode Toggle: Study / In-Session                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <OrnateHeader>Roleplay Coach</OrnateHeader>

      <div className="flex gap-2 p-1 rounded-xl bg-void-2/60 border border-gold/15 ornate-border">
        <button
          type="button"
          onClick={() => setMode('study')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg',
            'text-sm font-medium transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            mode === 'study'
              ? 'bg-gold/[0.08] text-forge-0 shadow-sm border border-bronze/25'
              : 'text-forge-2 hover:text-forge-1',
          )}
        >
          <BookOpen size={16} aria-hidden />
          Study
        </button>
        <button
          type="button"
          onClick={() => setMode('session')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg',
            'text-sm font-medium transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            mode === 'session'
              ? 'bg-ember/10 text-ember shadow-sm border border-ember/25'
              : 'text-forge-2 hover:text-forge-1',
          )}
        >
          <Swords size={16} aria-hidden />
          In-Session
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 1: Persona Quick Reference (Eldritch theme)       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ParchmentCard className="border-eldritch/25">
        <button
          type="button"
          onClick={() => setPersonaOpen(prev => !prev)}
          className={cn(
            'w-full flex items-center justify-between min-h-[44px]',
            'text-left',
            'active:scale-[0.99]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <div className="flex items-center gap-2.5">
            <User size={18} className="text-eldritch" aria-hidden />
            <span className="font-lore text-base font-semibold text-forge-0">
              Persona Quick Reference
            </span>
          </div>
          {personaOpen ? (
            <ChevronUp size={18} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={18} className="text-forge-2" aria-hidden />
          )}
        </button>

        {/* In-Session mode: show collapsed essential view */}
        {mode === 'session' && !personaOpen && (
          <div className="mt-3 flex flex-wrap gap-2 animate-fade-in">
            <Badge variant="eldritch">{persona.defaultState.split('.')[0]}</Badge>
            {persona.catchphrases && persona.catchphrases.length > 0 && (
              <Badge variant="arcane">
                {persona.catchphrases.length} catchphrase{persona.catchphrases.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}

        {personaOpen && (
          <div className={cn(
            'mt-4 flex flex-col gap-4 animate-fade-in',
            mode === 'session' && 'gap-3',
          )}>
            {/* Default State */}
            <div className="relative pl-4 border-l-2 border-eldritch/40">
              <Quote size={14} className="absolute -left-[9px] -top-0.5 text-eldritch bg-void-1 p-px" aria-hidden />
              <p className="text-sm text-forge-0 italic leading-relaxed">
                {persona.defaultState}
              </p>
            </div>

            {/* Physical Tics - full in Study, compact in Session */}
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

            {/* Scene Instincts - only in Study mode */}
            {mode === 'study' && (
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
            )}

            {/* Patron */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/[0.03] border border-gold/15">
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
      </ParchmentCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 2: Scene Coach (Reversed Flow)                    */}
      {/* AI generates scene → user responds → AI coaches           */}
      {/* Only visible in Study mode                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mode === 'study' && (
        <GlassCard className="border-eldritch/15">
          <div className="flex items-center gap-2.5 mb-4">
            <Theater size={18} className="text-eldritch" aria-hidden />
            <OrnateHeader className="flex-1">Scene Coach</OrnateHeader>
          </div>

          {/* --- Step 1: Generate Scene Button (no scene yet) --- */}
          {!generatedScene && !sceneGenAI.loading && (
            <div className="flex flex-col items-center py-6 gap-4">
              <p className="text-sm text-forge-2 text-center max-w-xs leading-relaxed">
                Generate an immersive scene, then respond in character.
                The AI will coach your performance.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={generateScene}
                className="w-full"
              >
                <Sparkles size={18} aria-hidden />
                Generate Scene
              </Button>
            </div>
          )}

          {/* --- Scene Generation Loading --- */}
          {sceneGenAI.loading && !generatedScene && (
            <div className="flex flex-col items-center py-8 gap-3 animate-fade-in">
              <Loader2 size={28} className="animate-spin text-eldritch" aria-hidden />
              <p className="text-sm text-forge-2">
                Conjuring a scene for {character.name}...
              </p>
            </div>
          )}

          {/* --- Scene Generation Error --- */}
          {sceneGenAI.error && !generatedScene && (
            <div className="mt-3 rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm text-red-400 font-semibold">Failed to generate scene</p>
                <p className="text-xs text-forge-2 mt-0.5">{sceneGenAI.error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={generateScene} className="ml-auto shrink-0">
                <RotateCcw size={14} aria-hidden />
                Retry
              </Button>
            </div>
          )}

          {/* --- Step 2: Scene Display + User Response --- */}
          {generatedScene && (
            <div className="flex flex-col gap-4 animate-slide-up">
              {/* Scene Card */}
              <ParchmentCard className="border-eldritch/20 bg-gradient-to-br from-eldritch/[0.03] to-transparent">
                <p className="text-xs font-semibold text-eldritch uppercase tracking-wider mb-2">
                  The Scene
                </p>
                <p className="text-sm text-forge-0 leading-relaxed whitespace-pre-wrap">
                  {generatedScene}
                </p>
              </ParchmentCard>

              {/* SAY Input */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="scene-say-input"
                  className="text-xs font-semibold text-arcane uppercase tracking-wider"
                >
                  What does {character.name} SAY?
                </label>
                <textarea
                  id="scene-say-input"
                  value={sayInput}
                  onChange={e => setSayInput(e.target.value)}
                  placeholder="Speak in character..."
                  disabled={sceneGradeAI.loading}
                  rows={3}
                  className={cn(
                    'w-full rounded-xl border bg-gold/[0.03] px-4 py-3',
                    'text-sm text-forge-0 placeholder:text-forge-2/60',
                    'border-bronze/25 focus:border-arcane/40 focus:ring-1 focus:ring-arcane/20',
                    'transition-all duration-200 ease-forge resize-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'min-h-[72px]',
                  )}
                />
              </div>

              {/* DO Input */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="scene-do-input"
                  className="text-xs font-semibold text-ember uppercase tracking-wider"
                >
                  What does {character.name} DO?
                </label>
                <textarea
                  id="scene-do-input"
                  value={doInput}
                  onChange={e => setDoInput(e.target.value)}
                  placeholder="Describe actions, body language, physical reactions..."
                  disabled={sceneGradeAI.loading}
                  rows={3}
                  className={cn(
                    'w-full rounded-xl border bg-gold/[0.03] px-4 py-3',
                    'text-sm text-forge-0 placeholder:text-forge-2/60',
                    'border-bronze/25 focus:border-ember/40 focus:ring-1 focus:ring-ember/20',
                    'transition-all duration-200 ease-forge resize-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'min-h-[72px]',
                  )}
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="md"
                onClick={submitResponse}
                loading={sceneGradeAI.loading}
                disabled={!sayInput.trim() || !doInput.trim()}
                className="w-full"
              >
                <Send size={16} aria-hidden />
                Get Coaching
              </Button>

              {/* Grading Error */}
              {sceneGradeAI.error && (
                <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm text-red-400 font-semibold">Coaching failed</p>
                    <p className="text-xs text-forge-2 mt-0.5">{sceneGradeAI.error}</p>
                  </div>
                </div>
              )}

              {/* Grading Loading */}
              {sceneGradeAI.loading && (
                <div className="flex flex-col items-center py-4 gap-3 animate-fade-in">
                  <Loader2 size={24} className="animate-spin text-arcane" aria-hidden />
                  <p className="text-sm text-forge-2">
                    Evaluating your performance...
                  </p>
                </div>
              )}

              {/* --- Step 3: Coaching Results --- */}
              {coaching && !sceneGradeAI.loading && (
                <GlassCard className="border-arcane/20 animate-slide-up">
                  {/* Overall Score */}
                  <div className="flex items-center justify-between mb-4">
                    <OrnateHeader>Coaching Results</OrnateHeader>
                    <div className="stat-frame">
                      <Star size={16} className="text-arcane" aria-hidden />
                      <span className={cn(
                        'text-xl font-display font-bold',
                        coaching.overall >= 8 ? 'text-verdant' :
                        coaching.overall >= 5 ? 'text-arcane' :
                        'text-ember',
                      )}>
                        {coaching.overall}
                      </span>
                      <span className="text-sm text-forge-2">/10</span>
                    </div>
                  </div>

                  {/* Score Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {([
                      { key: 'persona', label: 'Persona' },
                      { key: 'emotion', label: 'Emotion' },
                      { key: 'physical', label: 'Physical' },
                      { key: 'decision', label: 'Decision' },
                      { key: 'patron', label: 'Patron' },
                    ] as const).map(dim => {
                      const score = coaching.scores[dim.key]
                      const variant = score >= 8 ? 'verdant' : score >= 5 ? 'arcane' : 'ember'
                      return (
                        <Badge key={dim.key} variant={variant as 'verdant' | 'arcane' | 'ember'}>
                          {dim.label}: {score}
                        </Badge>
                      )
                    })}
                  </div>

                  {/* Strengths */}
                  {coaching.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-verdant uppercase tracking-wider mb-1.5">
                        Strengths
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {coaching.strengths.map((s, i) => (
                          <Badge key={i} variant="verdant">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {coaching.improvements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-1.5">
                        Areas to Improve
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {coaching.improvements.map((imp, i) => (
                          <Badge key={i} variant="ember">{imp}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coach Note */}
                  {coaching.coachNote && (
                    <div className="mt-3 pt-3 border-t border-gold/15">
                      <p className="text-sm text-forge-1 italic leading-relaxed">
                        {coaching.coachNote}
                      </p>
                    </div>
                  )}
                </GlassCard>
              )}

              {/* --- Reference Reaction Toggle --- */}
              {generatedScene && coaching && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchReference}
                    loading={sceneRefAI.loading}
                    className="w-full"
                  >
                    <Eye size={14} aria-hidden />
                    {showReference ? 'Hide' : 'Show'} Reference Reaction
                  </Button>

                  {sceneRefAI.error && (
                    <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
                      <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
                      <div>
                        <p className="text-sm text-red-400 font-semibold">Failed to load reference</p>
                        <p className="text-xs text-forge-2 mt-0.5">{sceneRefAI.error}</p>
                      </div>
                    </div>
                  )}

                  {showReference && referenceReaction && (
                    <ParchmentCard className="border-arcane/15 animate-slide-up">
                      <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-2">
                        Reference: What {character.name} Would Do
                      </p>
                      <p className="text-sm text-forge-1 leading-relaxed whitespace-pre-wrap italic">
                        {referenceReaction}
                      </p>
                    </ParchmentCard>
                  )}

                  {showReference && sceneRefAI.loading && (
                    <div className="flex items-center justify-center py-3 gap-2 animate-fade-in">
                      <Loader2 size={16} className="animate-spin text-arcane" aria-hidden />
                      <p className="text-xs text-forge-2">Generating reference...</p>
                    </div>
                  )}
                </div>
              )}

              {/* --- Next Scene Button --- */}
              {coaching && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={nextScene}
                  loading={sceneGenAI.loading}
                  className="w-full"
                >
                  <ArrowRight size={16} aria-hidden />
                  Next Scene
                </Button>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 3: Drill Type Selector + Drills                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="ornate-divider" aria-hidden />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDrillType('improv')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl',
            'text-sm font-medium transition-all duration-200 ease-forge active:scale-[0.97]',
            'border',
            drillType === 'improv'
              ? 'bg-ember/15 text-ember border-ember/30'
              : 'combat-card text-forge-2 hover:border-gold/40',
          )}
        >
          <Theater size={16} aria-hidden />
          Improv Drills
        </button>
        <button
          type="button"
          onClick={() => setDrillType('conversation')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl',
            'text-sm font-medium transition-all duration-200 ease-forge active:scale-[0.97]',
            'border',
            drillType === 'conversation'
              ? 'bg-eldritch/15 text-eldritch border-eldritch/30'
              : 'combat-card text-forge-2 hover:border-gold/40',
          )}
        >
          <MessageCircle size={16} aria-hidden />
          Conversation
        </button>
      </div>

      {drillType === 'improv' && (
        <ParchmentCard className="border-ember/25">
          <ImprovDrillEnhanced character={character} />
        </ParchmentCard>
      )}

      {drillType === 'conversation' && (
        <ConversationDrill
          character={character}
          onComplete={() => {}}
          onBack={() => setDrillType('improv')}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 4: Mannerism Flashcards (Verdant theme)           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {allMannerisms.length > 0 && <div className="ornate-divider" aria-hidden />}
      {allMannerisms.length > 0 && (
        <GlassCard className={cn(
          'border-verdant/15',
          mode === 'session' && 'p-4',
        )}>
          <div className="flex items-center gap-2.5 mb-4">
            <Hand size={18} className="text-verdant" aria-hidden />
            <OrnateHeader className="flex-1">Mannerism Flashcards</OrnateHeader>
          </div>

          {/* Current card */}
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'w-full rounded-xl border p-6 text-center',
                'bg-gradient-to-br from-verdant/[0.03] to-white/[0.01]',
                'border-verdant/15',
                'min-h-[120px] flex flex-col items-center justify-center gap-3',
                mode === 'session' && 'min-h-[88px] p-4',
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
              <p className={cn(
                'text-base text-forge-0 font-medium leading-relaxed max-w-sm',
                mode === 'session' && 'text-sm',
              )}>
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

            {/* Motivational text - only in study mode */}
            {mode === 'study' && (
              <p className="text-xs text-forge-2 italic text-center">
                Practice this at the table tonight.
              </p>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
