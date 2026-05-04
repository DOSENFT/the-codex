import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Dices,
  Send,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Mic,
  MicOff,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { ParchmentCard } from './ui/ParchmentCard'
import { HexFrame } from './ui/HexFrame'
import { OrnateHeader } from './ui/OrnateHeader'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ImprovGrade {
  score: number
  strengths: string[]
  improvements: string[]
  suggestion: string
}

interface DrillRecord {
  scene: string
  say: string
  do_: string
  grade: ImprovGrade
}

type Difficulty = 'apprentice' | 'journeyman' | 'master'

interface ImprovDrillEnhancedProps {
  character: Character
  onDrillComplete?: (grade: ImprovGrade) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-verdant'
  if (score >= 5) return 'text-ember'
  return 'text-red-400'
}

const difficultyLabels: Record<Difficulty, string> = {
  apprentice: 'Apprentice',
  journeyman: 'Journeyman',
  master: 'Master',
}

const difficultyPrompts: Record<Difficulty, string> = {
  apprentice:
    'Generate a simple, straightforward scene. The emotional stakes are clear and the "right" character reaction is fairly obvious. Good for warming up.',
  journeyman:
    'Generate a moderately complex scene with some moral ambiguity or emotional tension. The character should need to weigh their defined traits against the situation.',
  master:
    'Generate a highly complex scene that directly challenges the character\'s core beliefs, patron relationship, or decision tree. Include conflicting motivations and time pressure.',
}

/** Check if Web Speech API is available */
function hasSpeechRecognition(): boolean {
  return !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImprovDrillEnhanced({ character, onDrillComplete }: ImprovDrillEnhancedProps) {
  /* ------ AI hooks ------ */
  const sceneAI = useAI()
  const gradeAI = useAI()

  /* ------ State ------ */
  const [difficulty, setDifficulty] = useState<Difficulty>('journeyman')
  const [drillScene, setDrillScene] = useState<string | null>(null)
  const [sayInput, setSayInput] = useState('')
  const [doInput, setDoInput] = useState('')
  const [grade, setGrade] = useState<ImprovGrade | null>(null)
  const [history, setHistory] = useState<DrillRecord[]>([])

  /* ------ Voice-to-text ------ */
  const [isListening, setIsListening] = useState(false)
  const [activeField, setActiveField] = useState<'say' | 'do'>('say')
  const recognitionRef = useRef<unknown>(null)
  const speechAvailable = useMemo(() => hasSpeechRecognition(), [])

  const sayRef = useRef<HTMLTextAreaElement>(null)
  const doRef = useRef<HTMLTextAreaElement>(null)

  /* ------ Derived ------ */
  const averageScore = useMemo(() => {
    if (history.length === 0) return 0
    return Math.round(history.reduce((sum, d) => sum + d.grade.score, 0) / history.length)
  }, [history])

  /* ------ Speech Recognition Setup ------ */
  const startListening = useCallback((field: 'say' | 'do') => {
    if (!speechAvailable) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      if (field === 'say') {
        setSayInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
      } else {
        setDoInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setActiveField(field)
    setIsListening(true)
    recognition.start()
  }, [speechAvailable])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop()
    }
    setIsListening(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        (recognitionRef.current as { stop: () => void }).stop()
      }
    }
  }, [])

  /* ------ Handlers ------ */

  const startDrill = useCallback(async () => {
    setDrillScene(null)
    setSayInput('')
    setDoInput('')
    setGrade(null)
    try {
      const result = await sceneAI.query(
        SYSTEM_PROMPTS.sceneCoach(character),
        `Generate a brief, vivid scene prompt for ${character.name} to respond to in-character. ${difficultyPrompts[difficulty]} The scene should test their defined personality traits, decision tree, and patron relationship. Give ONLY the scene description in 2-3 sentences, nothing else. Make it specific and dramatic.`,
      )
      setDrillScene(result)
    } catch {
      // error handled by hook
    }
  }, [character, difficulty, sceneAI])

  const submitResponse = useCallback(async () => {
    if (!drillScene || (!sayInput.trim() && !doInput.trim())) return
    const combinedResponse = [
      sayInput.trim() ? `${character.name} says: "${sayInput.trim()}"` : '',
      doInput.trim() ? `${character.name} does: ${doInput.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const result = await gradeAI.queryStructured<ImprovGrade>(
        SYSTEM_PROMPTS.improvGrader(character),
        `SCENE: ${drillScene}\n\nPLAYER'S IN-CHARACTER RESPONSE:\n${combinedResponse}`,
      )
      setGrade(result)
      setHistory(prev => [
        ...prev,
        { scene: drillScene, say: sayInput.trim(), do_: doInput.trim(), grade: result },
      ])
      onDrillComplete?.(result)
    } catch {
      // error handled by hook
    }
  }, [drillScene, sayInput, doInput, character, gradeAI, onDrillComplete])

  const resetDrills = useCallback(() => {
    setHistory([])
    setDrillScene(null)
    setSayInput('')
    setDoInput('')
    setGrade(null)
  }, [])

  /* ------ Render ------ */
  return (
    <div className="flex flex-col gap-4">
      {/* Header + Session Score */}
      <div className="flex items-center justify-between">
        <OrnateHeader>Improv Drills</OrnateHeader>

        {history.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Trophy size={14} className="text-ember" aria-hidden />
              <span className="font-mono text-forge-0">{averageScore}/10</span>
              <span className="text-forge-2 text-xs">
                ({history.length} drill{history.length !== 1 ? 's' : ''})
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

      {/* Difficulty Selector */}
      <div className="flex gap-2">
        {(Object.keys(difficultyLabels) as Difficulty[]).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={cn(
              'flex-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              d === difficulty
                ? 'bg-ember/15 border border-ember/40 text-ember'
                : 'bg-white/[0.03] border border-white/10 text-forge-2 hover:text-forge-1 hover:border-white/20',
            )}
          >
            {difficultyLabels[d]}
          </button>
        ))}
      </div>

      {/* Start Button */}
      {!drillScene && !sceneAI.loading && (
        <Button
          variant="secondary"
          size="lg"
          onClick={startDrill}
          className="w-full"
        >
          <Dices size={16} aria-hidden />
          Start Drill
        </Button>
      )}

      {/* Loading scene */}
      {sceneAI.loading && !drillScene && (
        <div className="flex flex-col items-center py-6 gap-3">
          <Loader2 size={24} className="animate-spin text-ember" aria-hidden />
          <p className="text-sm text-forge-2">Setting the scene...</p>
        </div>
      )}

      {/* Scene error */}
      {sceneAI.error && !drillScene && (
        <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm text-red-400 font-semibold">Failed to generate scene</p>
            <p className="text-xs text-forge-2 mt-0.5">{sceneAI.error}</p>
            <Button variant="ghost" size="sm" onClick={startDrill} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Active Drill */}
      {drillScene && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Scene Prompt */}
          <div className="rounded-xl bg-ember/[0.06] border border-ember/20 p-4">
            <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">The Scene</p>
            <p className="text-sm text-forge-0 leading-relaxed">{drillScene}</p>
          </div>

          {/* Response Inputs */}
          {!grade && (
            <>
              {/* SAY textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="drill-say"
                    className="text-sm font-medium text-forge-1 select-none"
                  >
                    What does your character SAY?
                  </label>
                  {speechAvailable && (
                    <button
                      type="button"
                      onClick={() => isListening && activeField === 'say' ? stopListening() : startListening('say')}
                      className={cn(
                        'inline-flex items-center justify-center w-11 h-11 rounded-lg',
                        'transition-all duration-200',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        isListening && activeField === 'say'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-white/[0.04] text-forge-2 hover:text-forge-1 border border-white/10',
                      )}
                      aria-label={isListening && activeField === 'say' ? 'Stop recording' : 'Start voice input for speech'}
                    >
                      {isListening && activeField === 'say' ? (
                        <MicOff size={16} aria-hidden />
                      ) : (
                        <Mic size={16} aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  ref={sayRef}
                  id="drill-say"
                  value={sayInput}
                  onChange={e => setSayInput(e.target.value)}
                  onFocus={() => setActiveField('say')}
                  placeholder={`"I speak as ${character.name} would..."`}
                  disabled={gradeAI.loading}
                  rows={3}
                  className={cn(
                    'min-h-[80px] w-full rounded-xl resize-y',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-white/10',
                    'font-body text-sm px-4 py-3',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                />
              </div>

              {/* DO textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="drill-do"
                    className="text-sm font-medium text-forge-1 select-none"
                  >
                    What does your character DO?
                  </label>
                  {speechAvailable && (
                    <button
                      type="button"
                      onClick={() => isListening && activeField === 'do' ? stopListening() : startListening('do')}
                      className={cn(
                        'inline-flex items-center justify-center w-11 h-11 rounded-lg',
                        'transition-all duration-200',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                        isListening && activeField === 'do'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-white/[0.04] text-forge-2 hover:text-forge-1 border border-white/10',
                      )}
                      aria-label={isListening && activeField === 'do' ? 'Stop recording' : 'Start voice input for actions'}
                    >
                      {isListening && activeField === 'do' ? (
                        <MicOff size={16} aria-hidden />
                      ) : (
                        <Mic size={16} aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  ref={doRef}
                  id="drill-do"
                  value={doInput}
                  onChange={e => setDoInput(e.target.value)}
                  onFocus={() => setActiveField('do')}
                  placeholder="Describe their actions, body language, movements..."
                  disabled={gradeAI.loading}
                  rows={3}
                  className={cn(
                    'min-h-[80px] w-full rounded-xl resize-y',
                    'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                    'border border-white/10',
                    'font-body text-sm px-4 py-3',
                    'transition-all duration-200 ease-forge',
                    'focus:border-ember/60 focus:bg-void-2/80',
                    'focus:shadow-[0_0_0_3px_rgba(244,181,69,0.12)]',
                    'focus:outline-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                />
              </div>

              {/* Submit */}
              <Button
                variant="primary"
                size="md"
                onClick={submitResponse}
                loading={gradeAI.loading}
                disabled={!sayInput.trim() && !doInput.trim()}
                className="w-full"
              >
                <Send size={16} aria-hidden />
                Grade Me
              </Button>
            </>
          )}

          {/* Grading loader */}
          {gradeAI.loading && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 size={24} className="animate-spin text-ember" aria-hidden />
              <p className="text-sm text-forge-2">Evaluating persona consistency...</p>
            </div>
          )}

          {/* Grade error */}
          {gradeAI.error && !grade && (
            <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm text-red-400 font-semibold">Failed to grade response</p>
                <p className="text-xs text-forge-2 mt-0.5">{gradeAI.error}</p>
                <Button variant="ghost" size="sm" onClick={submitResponse} className="mt-2">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Grade Result */}
          {grade && (
            <div className="flex flex-col gap-4 animate-slide-up">
              {/* Score in HexFrame */}
              <div className="flex items-center gap-4">
                <HexFrame
                  variant={grade.score >= 8 ? 'verdant' : grade.score >= 5 ? 'ember' : 'arcane'}
                >
                  <span className={cn('font-display text-2xl font-bold', getScoreColor(grade.score))}>
                    {grade.score}
                  </span>
                </HexFrame>
                <div>
                  <p className="text-sm text-forge-2">/10 Persona Consistency</p>
                  <p className="text-xs text-forge-2 mt-0.5 capitalize">{difficulty} difficulty</p>
                </div>
              </div>

              {/* Strengths */}
              {grade.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-verdant uppercase tracking-wider mb-2">Strengths</p>
                  <ul className="flex flex-col gap-1.5">
                    {grade.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                        <CheckCircle2 size={13} className="text-verdant shrink-0 mt-0.5" aria-hidden />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {grade.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">Improvements</p>
                  <ul className="flex flex-col gap-1.5">
                    {grade.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-forge-1">
                        <ArrowRight size={13} className="text-ember shrink-0 mt-0.5" aria-hidden />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestion in ParchmentCard */}
              {grade.suggestion && (
                <ParchmentCard>
                  <p className="text-xs font-semibold text-arcane uppercase tracking-wider mb-2">Suggestion</p>
                  <p className="text-sm text-forge-1 leading-relaxed italic">
                    {grade.suggestion}
                  </p>
                </ParchmentCard>
              )}

              {/* Next Drill */}
              <Button variant="secondary" size="md" onClick={startDrill} className="w-full">
                Next Drill
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
