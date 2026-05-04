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
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Input } from './ui/Input'
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

  /* ------ Scene Coach ------ */
  const sceneAI = useAI()
  const [sceneInput, setSceneInput] = useState('')
  const [sceneResponse, setSceneResponse] = useState<string | null>(null)

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
      <div className="flex gap-2 p-1 rounded-xl bg-void-2/60 border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setMode('study')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg',
            'text-sm font-medium transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            mode === 'study'
              ? 'bg-white/[0.08] text-forge-0 shadow-sm border border-white/10'
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
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
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
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
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
      </ParchmentCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 2: Scene Coach (Arcane theme - GlassCard + blue)  */}
      {/* Only visible in Study mode                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mode === 'study' && (
        <GlassCard className="border-arcane/15">
          <div className="flex items-center gap-2.5 mb-4">
            <Eye size={18} className="text-arcane" aria-hidden />
            <OrnateHeader className="flex-1">Scene Coach</OrnateHeader>
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
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section 3: Drill Type Selector + Drills                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
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
              : 'bg-white/[0.04] text-forge-2 border-white/10 hover:bg-white/[0.08]',
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
              : 'bg-white/[0.04] text-forge-2 border-white/10 hover:bg-white/[0.08]',
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
