import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import type { VoiceParams } from '../../lib/voice-forge'
import {
  deriveVocabularyLevel,
  deriveSentenceStructure,
  findSuggestedAccent,
} from '../../lib/voice-forge'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import { useAI } from '../../hooks/useAI'
import { GlassCard } from '../ui/GlassCard'
import { ParchmentCard } from '../ui/ParchmentCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceForgePreviewProps {
  params: VoiceParams
  voiceDescription: string
  character: Character
}

interface VoiceForgeResult {
  description: string
  lines: string[]
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * VoiceForgePreview — Displays a voice description with derived traits and
 * AI-generated sample dialogue lines. Auto-generates on mount; supports
 * regeneration, per-line copy, and copy-all with visual feedback.
 */
export function VoiceForgePreview({
  params,
  voiceDescription,
  character,
}: VoiceForgePreviewProps) {
  const ai = useAI()

  /* ------ Derived values ------ */
  const vocabularyLevel = deriveVocabularyLevel(params)
  const sentenceStructure = deriveSentenceStructure(params)
  const suggestedAccent = findSuggestedAccent(params)

  /* ------ State ------ */
  const [generatedLines, setGeneratedLines] = useState<string[]>([])
  const [aiDescription, setAiDescription] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Prevent double-fire of auto-generate in React StrictMode
  const hasGenerated = useRef(false)

  /* ------ AI generation ------ */
  const generateDialogue = useCallback(async () => {
    const systemPrompt = SYSTEM_PROMPTS.voiceForge(character)
    const userMessage = [
      `Voice Description: ${voiceDescription}`,
      `Vocabulary Level: ${vocabularyLevel}`,
      `Sentence Structure: ${sentenceStructure}`,
      suggestedAccent
        ? `Suggested Accent: ${suggestedAccent.name} (${suggestedAccent.region})`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const result = await ai.queryStructured<VoiceForgeResult>(
        systemPrompt,
        userMessage,
      )
      setGeneratedLines(result.lines ?? [])
      setAiDescription(result.description ?? null)
    } catch {
      // Error is tracked in ai.error — no additional handling needed
    }
  }, [
    character,
    voiceDescription,
    vocabularyLevel,
    sentenceStructure,
    suggestedAccent,
    ai,
  ])

  // Auto-generate on mount
  useEffect(() => {
    if (!hasGenerated.current) {
      hasGenerated.current = true
      generateDialogue()
    }
  }, [generateDialogue])

  /* ------ Copy handlers ------ */
  const copyLine = useCallback((line: string, index: number) => {
    navigator.clipboard
      .writeText(line)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
      })
      .catch(() => {
        /* Clipboard API unavailable */
      })
  }, [])

  const copyAll = useCallback(() => {
    if (generatedLines.length === 0) return
    const allText = generatedLines.map((l, i) => `${i + 1}. ${l}`).join('\n')
    navigator.clipboard
      .writeText(allText)
      .then(() => {
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 1500)
      })
      .catch(() => {
        /* Clipboard API unavailable */
      })
  }, [generatedLines])

  /* ------ Vocabulary / structure badge colors ------ */
  const vocabBadgeVariant =
    vocabularyLevel === 'ornate'
      ? 'eldritch'
      : vocabularyLevel === 'moderate'
        ? 'arcane'
        : 'neutral'

  const structBadgeVariant =
    sentenceStructure === 'complex'
      ? 'eldritch'
      : sentenceStructure === 'flowing'
        ? 'arcane'
        : 'ember'

  /* ------ Render ------ */
  return (
    <section
      className="flex flex-col gap-4 animate-fade-in"
      aria-label="Voice Forge Preview"
    >
      {/* ─── Voice Description ─── */}
      <GlassCard>
        <div className="flex flex-col gap-3">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-arcane shrink-0" aria-hidden />
            <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
              Voice Profile
            </h3>
          </div>

          {/* Natural-language voice description */}
          <p className="text-sm text-forge-1 italic leading-relaxed">
            {voiceDescription}
          </p>

          {/* AI-generated description (vivid summary) */}
          {aiDescription && (
            <p className="text-sm text-forge-1 leading-relaxed border-t border-white/5 pt-3">
              {aiDescription}
            </p>
          )}

          {/* Derived trait badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant={vocabBadgeVariant}>
              Vocabulary: {vocabularyLevel}
            </Badge>
            <Badge variant={structBadgeVariant}>
              Structure: {sentenceStructure}
            </Badge>
            {suggestedAccent && (
              <Badge variant="ember" className="gap-1">
                <LinkIcon size={10} aria-hidden />
                Accent: {suggestedAccent.name}
              </Badge>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ─── Generated Dialogue Section ─── */}
      <div className="flex flex-col gap-3">
        {/* Section header with action buttons */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
            Sample Dialogue
          </h3>

          <div className="flex items-center gap-2">
            {/* Copy All */}
            {generatedLines.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAll}
                disabled={ai.loading}
                aria-label={copiedAll ? 'All lines copied' : 'Copy all lines'}
              >
                {copiedAll ? (
                  <Check size={16} className="text-verdant" aria-hidden />
                ) : (
                  <Copy size={16} aria-hidden />
                )}
                <span className="hidden sm:inline">
                  {copiedAll ? 'Copied' : 'Copy All'}
                </span>
              </Button>
            )}

            {/* Regenerate */}
            <Button
              variant="secondary"
              size="sm"
              onClick={generateDialogue}
              loading={ai.loading}
              disabled={ai.loading}
              aria-label="Regenerate dialogue lines"
            >
              {!ai.loading && <RefreshCw size={16} aria-hidden />}
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </div>

        {/* ─── Loading State ─── */}
        {ai.loading && generatedLines.length === 0 && (
          <GlassCard>
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2
                size={20}
                className="animate-spin text-arcane"
                aria-hidden
              />
              <span className="text-sm text-forge-2">
                Generating dialogue lines...
              </span>
            </div>
          </GlassCard>
        )}

        {/* ─── Error State ─── */}
        {ai.error && generatedLines.length === 0 && (
          <GlassCard>
            <div className="flex items-center gap-3 py-4">
              <AlertTriangle
                size={20}
                className="text-ember shrink-0"
                aria-hidden
              />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium text-ember">
                  Generation failed
                </span>
                <span className="text-xs text-forge-2 break-words">
                  {ai.error}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={generateDialogue}
              className="mt-2"
              aria-label="Retry dialogue generation"
            >
              <RefreshCw size={16} aria-hidden />
              Retry
            </Button>
          </GlassCard>
        )}

        {/* ─── Empty State ─── */}
        {!ai.loading && !ai.error && generatedLines.length === 0 && (
          <GlassCard>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Sparkles
                size={24}
                className="text-forge-2"
                aria-hidden
              />
              <span className="text-sm text-forge-2">
                No dialogue lines yet. Hit Regenerate to create sample lines.
              </span>
            </div>
          </GlassCard>
        )}

        {/* ─── Dialogue Lines ─── */}
        {generatedLines.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {generatedLines.map((line, i) => (
              <ParchmentCard key={`line-${i}`} className="group relative pr-12">
                <p className="text-sm text-forge-0 leading-relaxed italic">
                  &ldquo;{line}&rdquo;
                </p>

                {/* Per-line copy button */}
                <button
                  type="button"
                  onClick={() => copyLine(line, i)}
                  className={cn(
                    'absolute top-3 right-3',
                    'inline-flex items-center justify-center',
                    'min-h-[44px] min-w-[44px] rounded-lg',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-white/[0.06]',
                    'active:scale-[0.97]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    copiedIndex === i
                      ? 'text-verdant'
                      : 'text-forge-2 hover:text-forge-1',
                  )}
                  aria-label={
                    copiedIndex === i ? 'Copied' : `Copy line ${i + 1}`
                  }
                >
                  {copiedIndex === i ? (
                    <Check size={16} aria-hidden />
                  ) : (
                    <Copy size={16} aria-hidden />
                  )}
                </button>
              </ParchmentCard>
            ))}
          </div>
        )}

        {/* Loading overlay when regenerating with existing lines */}
        {ai.loading && generatedLines.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2
              size={16}
              className="animate-spin text-arcane"
              aria-hidden
            />
            <span className="text-xs text-forge-2">Regenerating...</span>
          </div>
        )}
      </div>
    </section>
  )
}
