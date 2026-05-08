import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Mic,
  Square,
  Play,
  Pause,
  Star,
  Loader2,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Music,
  BookOpen,
  Volume2,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import { ACCENT_GUIDES, type AccentGuide } from '../lib/accent-data'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccentCoachProps {
  character: Character
}

type Phase = 'library' | 'practice'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const hasMediaSupport =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AccentCoach({ character }: AccentCoachProps) {
  /* ------ Core State ------ */
  const [selectedAccentId, setSelectedAccentId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('library')
  const [currentPhrase, setCurrentPhrase] = useState(0)

  /* ------ Recording State ------ */
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selfRating, setSelfRating] = useState<number | null>(null)

  /* ------ AI Phrases State ------ */
  const [aiPhrases, setAiPhrases] = useState<string[] | null>(null)
  const phraseAI = useAI()

  /* ------ Collapsible Sections ------ */
  const [rulesOpen, setRulesOpen] = useState(true)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  /* ------ Refs ------ */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ------ Derived ------ */
  const selectedAccent: AccentGuide | null =
    selectedAccentId
      ? ACCENT_GUIDES.find((a) => a.id === selectedAccentId) ?? null
      : null

  const allPhrases = selectedAccent
    ? [...selectedAccent.phrases, ...(aiPhrases ?? [])]
    : []

  /* ------ Cleanup on unmount ------ */
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------ Cleanup audio URL when it changes ------ */
  const prevAudioUrl = useRef<string | null>(null)
  useEffect(() => {
    if (prevAudioUrl.current && prevAudioUrl.current !== audioUrl) {
      URL.revokeObjectURL(prevAudioUrl.current)
    }
    prevAudioUrl.current = audioUrl
  }, [audioUrl])

  /* ------ Select Accent ------ */
  const selectAccent = useCallback((id: string) => {
    setSelectedAccentId(id)
    setPhase('practice')
    setCurrentPhrase(0)
    setSelfRating(null)
    setAiPhrases(null)
    setAudioUrl(null)
    setRecording(false)
    setPlaying(false)
    setRecordingTime(0)
    setRulesOpen(true)
    setTipsOpen(false)
    setAiOpen(false)
  }, [])

  const goBack = useCallback(() => {
    setPhase('library')
    setSelectedAccentId(null)
    setAiPhrases(null)
    setSelfRating(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
    }
    if (timerRef.current) clearInterval(timerRef.current)
  }, [audioUrl, recording])

  /* ------ Phrase Navigation ------ */
  const prevPhrase = useCallback(() => {
    setCurrentPhrase((p) => Math.max(0, p - 1))
    setSelfRating(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setPlaying(false)
  }, [audioUrl])

  const nextPhrase = useCallback(() => {
    setCurrentPhrase((p) => Math.min(allPhrases.length - 1, p + 1))
    setSelfRating(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setPlaying(false)
  }, [allPhrases.length, audioUrl])

  /* ------ Recording ------ */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)
      setSelfRating(null)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch (err) {
      console.error('[AccentCoach] Failed to start recording:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /* ------ Playback ------ */
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }, [playing, audioUrl])

  const handleAudioEnded = useCallback(() => {
    setPlaying(false)
  }, [])

  /* ------ AI Phrase Generation ------ */
  const generatePhrases = useCallback(async () => {
    if (!selectedAccent) return
    setAiOpen(true)
    try {
      const rulesText = selectedAccent.rules
        .map((r) => `- ${r.rule} (e.g. ${r.example})`)
        .join('\n')
      const result = await phraseAI.queryStructured<{ phrases: string[] }>(
        SYSTEM_PROMPTS.accentPhraseGenerator(character, selectedAccent.name, rulesText),
        `Generate 5 practice phrases for ${character.name} using the ${selectedAccent.name} accent.`,
      )
      setAiPhrases(result.phrases)
    } catch {
      // error handled by useAI hook
    }
  }, [selectedAccent, character, phraseAI])

  /* ------ Rating Tips ------ */
  const getRatingTip = (rating: number): string => {
    if (!selectedAccent) return ''
    switch (rating) {
      case 1:
        return `Try starting with just one rule at a time. Focus on: "${selectedAccent.rules[0].rule}" — ${selectedAccent.rules[0].example}`
      case 2:
        return `You are getting the feel. Slow down and exaggerate the accent more than feels natural — it will sound more authentic than you think.`
      case 3:
        return `Solid foundation! Now work on the rhythm: ${selectedAccent.rhythm}`
      case 4:
        return `Almost there! Focus on consistency — maintain the accent through the entire phrase without breaking.`
      case 5:
        return `Excellent! Try combining this accent with your character\'s personality for a fully immersive voice.`
      default:
        return ''
    }
  }

  /* ================================================================ */
  /*  RENDER: Library Phase                                            */
  /* ================================================================ */

  if (phase === 'library') {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {/* Header */}
        <OrnateHeader>Accent Library</OrnateHeader>
        <p className="text-xs text-forge-2 text-center -mt-2">
          Choose an accent to practice for your character
        </p>

        {/* Accent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCENT_GUIDES.map((accent) => (
            <GlassCard key={accent.id} hover className="combat-card">
              <button
                type="button"
                onClick={() => selectAccent(accent.id)}
                className="w-full text-left flex flex-col gap-2.5 min-h-[44px]"
              >
                <div className="flex items-center justify-between w-full">
                  <h4 className="font-display text-sm font-semibold text-forge-0">
                    {accent.name}
                  </h4>
                  <Badge variant="arcane">{accent.rules.length} rules</Badge>
                </div>
                <p className="text-xs text-forge-2 leading-relaxed">
                  {accent.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-arcane font-medium mt-auto pt-1">
                  <Volume2 size={13} aria-hidden />
                  Practice this accent
                </div>
              </button>
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  RENDER: Practice Phase                                           */
  /* ================================================================ */

  if (!selectedAccent) return null

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Back button + header */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={goBack}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-3 self-start',
            'text-sm font-medium text-forge-1 rounded-xl',
            'transition-all duration-200 ease-forge',
            'hover:bg-gold/[0.06] hover:text-forge-0',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Library
        </button>

        <OrnateHeader>{selectedAccent.name}</OrnateHeader>
        <p className="text-xs text-forge-2 text-center -mt-2">{selectedAccent.description}</p>
      </div>

      {/* ------ Rules Section (collapsible) ------ */}
      <GlassCard className="ornate-border">
        <button
          type="button"
          onClick={() => setRulesOpen((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between min-h-[44px]',
            'text-left',
          )}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen size={16} className="text-arcane" aria-hidden />
            <span className="font-display text-sm font-semibold text-forge-0">
              Phonetic Rules
            </span>
            <Badge variant="neutral">{selectedAccent.rules.length}</Badge>
          </div>
          {rulesOpen ? (
            <ChevronUp size={16} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={16} className="text-forge-2" aria-hidden />
          )}
        </button>
        {rulesOpen && (
          <div className="mt-3 flex flex-col gap-2 animate-fade-in">
            {selectedAccent.rules.map((r, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-bronze/15 last:border-b-0"
              >
                <span className="text-sm text-forge-0 font-medium shrink-0">
                  {r.rule}
                </span>
                <span className="text-xs text-forge-2 italic">{r.example}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ------ Phrases Section ------ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Music size={16} className="text-gold" aria-hidden />
          <span className="font-display text-sm font-semibold text-forge-0 tracking-wide">
            Practice Phrases
          </span>
        </div>

        {allPhrases.length > 0 && (
          <>
            <ParchmentCard>
              <p className="text-base text-forge-0 leading-relaxed text-center font-medium min-h-[48px] flex items-center justify-center">
                {allPhrases[currentPhrase]}
              </p>
            </ParchmentCard>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevPhrase}
                disabled={currentPhrase === 0}
              >
                <ChevronLeft size={16} aria-hidden />
                Prev
              </Button>
              <span className="text-xs text-forge-2 font-mono">
                {currentPhrase + 1} of {allPhrases.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextPhrase}
                disabled={currentPhrase >= allPhrases.length - 1}
              >
                Next
                <ChevronRight size={16} aria-hidden />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ------ Recording Section ------ */}
      <GlassCard className="border-gold/25">
        <div className="flex items-center gap-2.5 mb-3">
          <Mic size={16} className="text-gold" aria-hidden />
          <span className="font-display text-sm font-semibold text-forge-0 tracking-wide">
            Record Yourself
          </span>
        </div>

        {hasMediaSupport ? (
          <div className="flex flex-col gap-3">
            {/* Record / Stop controls */}
            <div className="flex items-center gap-3">
              {!recording ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={startRecording}
                  className="flex-1"
                >
                  <Mic size={16} aria-hidden />
                  Record
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={stopRecording}
                  className="flex-1 border-red-500/40"
                >
                  <Square size={16} className="text-red-400" aria-hidden />
                  Stop
                </Button>
              )}

              {/* Recording indicator */}
              {recording && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono text-red-400">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Playback controls */}
            {audioUrl && !recording && (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={togglePlayback}
                  className="flex-1"
                >
                  {playing ? (
                    <>
                      <Pause size={16} aria-hidden />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={16} aria-hidden />
                      Play Back
                    </>
                  )}
                </Button>
                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
              </div>
            )}

            {/* Self-rating */}
            {audioUrl && !recording && (
              <div className="flex flex-col gap-2 pt-2 border-t border-bronze/15">
                <span className="text-xs text-forge-2 font-medium">
                  How did it sound?
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelfRating(n)}
                      className={cn(
                        'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg',
                        'transition-all duration-200 ease-forge',
                        'active:scale-[0.95]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                        selfRating !== null && n <= selfRating
                          ? 'text-ember'
                          : 'text-forge-2 hover:text-forge-1',
                      )}
                      aria-label={`Rate ${n} out of 5`}
                    >
                      <Star
                        size={22}
                        fill={selfRating !== null && n <= selfRating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                {selfRating !== null && (
                  <div className="flex items-start gap-2 mt-1 p-3 rounded-lg bg-gold/[0.03] border border-bronze/15 animate-fade-in">
                    <Lightbulb
                      size={14}
                      className="text-ember shrink-0 mt-0.5"
                      aria-hidden
                    />
                    <p className="text-xs text-forge-1 leading-relaxed">
                      {getRatingTip(selfRating)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gold/[0.03] border border-bronze/15">
            <AlertTriangle
              size={16}
              className="text-ember shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-xs text-forge-1 leading-relaxed">
              Recording not available in this browser. Practice by speaking aloud
              and use the tips below to refine your accent.
            </p>
          </div>
        )}
      </GlassCard>

      {/* ------ AI Custom Phrases (collapsible) ------ */}
      <GlassCard className="ornate-border">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between min-h-[44px]',
            'text-left',
          )}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-eldritch" aria-hidden />
            <span className="font-display text-sm font-semibold text-forge-0">
              AI Custom Phrases
            </span>
          </div>
          {aiOpen ? (
            <ChevronUp size={16} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={16} className="text-forge-2" aria-hidden />
          )}
        </button>

        {aiOpen && (
          <div className="mt-3 flex flex-col gap-3 animate-fade-in">
            {!aiPhrases && !phraseAI.loading && (
              <Button
                variant="secondary"
                size="md"
                onClick={generatePhrases}
                className="w-full"
              >
                <Sparkles size={16} aria-hidden />
                Generate phrases for {character.name}
              </Button>
            )}

            {phraseAI.loading && (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2
                  size={24}
                  className="animate-spin text-arcane"
                  aria-hidden
                />
                <p className="text-sm text-forge-2">
                  Generating custom phrases...
                </p>
              </div>
            )}

            {phraseAI.error && !aiPhrases && (
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="text-red-400 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div>
                  <p className="text-sm text-red-400 font-semibold">
                    Failed to generate phrases
                  </p>
                  <p className="text-xs text-forge-2 mt-0.5">
                    {phraseAI.error}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generatePhrases}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {aiPhrases && (
              <div className="flex flex-col gap-2">
                {aiPhrases.map((phrase, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      // Jump to this AI phrase in the phrases list
                      const idx = (selectedAccent?.phrases.length ?? 0) + i
                      setCurrentPhrase(idx)
                      setSelfRating(null)
                      if (audioUrl) {
                        URL.revokeObjectURL(audioUrl)
                        setAudioUrl(null)
                      }
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg min-h-[44px]',
                      'text-sm text-forge-1 leading-relaxed',
                      'bg-gold/[0.02] border border-bronze/15',
                      'transition-all duration-200 ease-forge',
                      'hover:bg-gold/[0.06] hover:border-bronze/25',
                      'active:scale-[0.99]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                      currentPhrase === (selectedAccent?.phrases.length ?? 0) + i &&
                        'border-arcane/30 bg-arcane/5',
                    )}
                  >
                    <span className="text-xs text-forge-2 font-mono mr-2">
                      {i + 1}.
                    </span>
                    {phrase}
                  </button>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generatePhrases}
                  loading={phraseAI.loading}
                  className="self-start mt-1"
                >
                  <Sparkles size={14} aria-hidden />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* ------ Tips Section (collapsible) ------ */}
      <GlassCard className="ornate-border">
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between min-h-[44px]',
            'text-left',
          )}
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb size={16} className="text-ember" aria-hidden />
            <span className="font-display text-sm font-semibold text-forge-0">
              Tips &amp; Rhythm
            </span>
          </div>
          {tipsOpen ? (
            <ChevronUp size={16} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={16} className="text-forge-2" aria-hidden />
          )}
        </button>

        {tipsOpen && (
          <div className="mt-3 flex flex-col gap-3 animate-fade-in">
            {/* Tips */}
            <div className="flex flex-col gap-2">
              {selectedAccent.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-forge-1"
                >
                  <Lightbulb
                    size={13}
                    className="text-ember shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            {/* Rhythm */}
            <div className="pt-3 border-t border-bronze/15">
              <div className="flex items-center gap-2 mb-2">
                <Music size={13} className="text-eldritch" aria-hidden />
                <span className="text-xs font-semibold text-forge-0 uppercase tracking-wider">
                  Rhythm
                </span>
              </div>
              <p className="text-sm text-forge-1 leading-relaxed italic">
                {selectedAccent.rhythm}
              </p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
