import { useState, useCallback, useRef, useMemo } from 'react'
import { Sparkles, Copy, Check, AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { useAI } from '../../hooks/useAI'
import { SYSTEM_PROMPTS } from '../../lib/prompts'
import type { Character } from '../../lib/character'
import { loadCampaign } from '../../lib/campaign'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionAIResponse {
  sayOptions: string[]
  doAction: string
  innerThought: string
}

interface AIAssistPanelProps {
  character: Character
  sceneContext?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAssistPanel({ character, sceneContext }: AIAssistPanelProps) {
  const { loading, error, queryStructured } = useAI()
  const [result, setResult] = useState<SessionAIResponse | null>(null)
  const [sceneInput, setSceneInput] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load campaign data ─────────────────────────────────────────────────
  const campaign = useMemo(() => {
    if (!character.campaignId) return null
    return loadCampaign(character.campaignId)
  }, [character.campaignId])

  // ── Query handler ──────────────────────────────────────────────────────
  const handleAsk = useCallback(async () => {
    const prompt = SYSTEM_PROMPTS.sessionAssist(character, campaign, sceneContext)
    const message = sceneInput.trim() || 'What would I say or do right now?'
    try {
      const data = await queryStructured<SessionAIResponse>(prompt, message)
      setResult(data)
    } catch {
      // error state handled by useAI
    }
  }, [character, campaign, sceneContext, sceneInput, queryStructured])

  // ── Copy handler (tap-to-copy with icon swap) ──────────────────────────
  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 1500)
    } catch {
      // Clipboard not available
    }
  }, [])

  return (
    <div className="animate-fade-in space-y-3">
      {/* ── Scene input (optional) ── */}
      <textarea
        value={sceneInput}
        onChange={(e) => setSceneInput(e.target.value)}
        placeholder="Describe the scene or leave blank for a general prompt..."
        rows={2}
        className={cn(
          'w-full min-h-[44px] px-3 py-2.5',
          'bg-white/[0.04] border border-white/10 rounded-xl',
          'text-sm text-forge-0 placeholder:text-forge-2',
          'resize-y',
          'transition-all duration-200 ease-forge',
          'focus:outline-none focus:border-arcane/50 focus:ring-1 focus:ring-arcane/25',
        )}
      />

      {/* ── Primary action button ── */}
      <Button
        variant="primary"
        size="lg"
        loading={loading}
        onClick={handleAsk}
        className="w-full"
      >
        <Sparkles size={18} aria-hidden />
        What would I say?
      </Button>

      {/* ── Error state ── */}
      {error && (
        <div
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl',
            'bg-red-500/10 border border-red-500/25',
            'animate-fade-in',
          )}
          role="alert"
        >
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleAsk}
            className={cn(
              'inline-flex items-center gap-1.5',
              'min-h-[44px] px-3 rounded-lg',
              'text-sm font-medium text-red-300',
              'hover:bg-red-500/10',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.97]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <RotateCcw size={14} aria-hidden />
            Retry
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {result && !error && (
        <div className="space-y-3 animate-fade-in">
          {/* Say options — tap to copy */}
          {result.sayOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Say
              </p>
              {result.sayOptions.map((line, i) => {
                const isCopied = copiedIdx === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCopy(line, i)}
                    className={cn(
                      'w-full flex items-center gap-3',
                      'min-h-[48px] px-3 py-2',
                      'glass-card rounded-xl',
                      'text-left text-sm text-arcane',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.97]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                      'hover:bg-white/[0.06]',
                    )}
                  >
                    <span className="flex-1 min-w-0 break-words">
                      &ldquo;{line}&rdquo;
                    </span>
                    {isCopied ? (
                      <Check size={16} className="shrink-0 text-verdant" aria-hidden />
                    ) : (
                      <Copy size={16} className="shrink-0 text-forge-2" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Do action */}
          {result.doAction && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Do
              </p>
              <p className="text-sm text-ember px-1">{result.doAction}</p>
            </div>
          )}

          {/* Inner thought */}
          {result.innerThought && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Inner Thought
              </p>
              <p className="text-sm text-eldritch italic px-1">
                {result.innerThought}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
