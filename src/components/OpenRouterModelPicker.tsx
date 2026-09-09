import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { listOpenRouterModels, rankOpenRouterModels, describeOpenRouterModel, type OpenRouterModel } from '../lib/ai'

/* ============================================================================
   THE OPENROUTER MODEL PICKER — the second free tier, 2026-09-09.

   Deliberately the same control as `GeminiModelPicker` next to it, down to the
   Automatic-first ordering and the struck-through orphan row, because the two
   are presented side by side in Settings and a person switching between them
   should not have to learn a second idea. Two differences, and both are facts
   about OpenRouter rather than decisions:

   1. THE LIST LOADS WITHOUT A KEY. `GET /api/v1/models` is public, so this
      fills in the moment the tab is opened. That matters more here than it
      would for Gemini: the question "is there anything free on this thing?" is
      the one Marcus is actually asking, and making him paste a credential
      before he can see the answer gets it asked in the wrong order.

   2. FREE MODELS ARE MARKED, AND THEY SORT FIRST. He is not paying for any of
      this. `rankOpenRouterModels` puts them at the top; the badge here is so a
      paid one picked by hand is a decision rather than an accident that shows
      up later as a 402 mid-scene.

   Like the Gemini picker, this knows no model names. OpenRouter withdraws free
   models weekly — a list in a bundle here would have a shelf life measured in
   days rather than the months a Gemini id gets.
   ========================================================================= */

interface OpenRouterModelPickerProps {
  /** Optional — the list is public. Sent when present so the request is
   *  attributable in his own OpenRouter dashboard. */
  apiKey: string
  /** '' means automatic. */
  value: string
  onChange: (id: string) => void
  /** `list` = full-width rows with descriptions. `chips` = compact wrap. */
  variant?: 'list' | 'chips'
}

const AUTOMATIC: OpenRouterModel = {
  id: '',
  label: 'Automatic',
  description: 'The roomiest free model, every request',
  free: true,
  contextLength: 0,
}

/** How many of 400-odd models to offer. The ranking puts every free one first
 *  and there are around twenty of those, so this shows all of them plus a
 *  little headroom — and stops short of pasting a scrolling wall of paid models
 *  into a phone screen he is holding at a table. */
const SHOWN = 24

type LoadState = 'idle' | 'loading' | 'ok' | 'error'

export function OpenRouterModelPicker({ apiKey, value, onChange, variant = 'list' }: OpenRouterModelPickerProps) {
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  /* Debounced on the key for the same reason the Gemini picker is: this re-runs
     as he types one, and every keystroke would otherwise be a request. Unlike
     that one it also runs with NO key at all — see the header — so the debounce
     is what stops a half-typed key firing twenty attributable requests, not
     what stops the list loading. */
  useEffect(() => {
    const key = apiKey.trim()
    const ac = new AbortController()
    const timer = setTimeout(() => {
      setState('loading')
      setError(null)
      listOpenRouterModels(key || undefined, ac.signal)
        .then(found => {
          if (ac.signal.aborted) return
          setModels(found)
          setState('ok')
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return
          setModels([])
          setState('error')
          setError(err instanceof Error ? err.message : 'Could not reach OpenRouter.')
        })
    }, 600)
    return () => { clearTimeout(timer); ac.abort() }
  }, [apiKey])

  const ranked = rankOpenRouterModels(models).slice(0, SHOWN)
  const orphaned = value && state === 'ok' && !models.some(m => m.id === value)
  const options: OpenRouterModel[] = [AUTOMATIC, ...ranked]
  const freeCount = models.filter(m => m.free).length

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={variant === 'list' ? 'text-sm font-medium text-forge-1' : 'text-xs text-forge-2'}>
          Model
        </span>
        {state === 'loading' && (
          <Loader2 size={12} className="animate-spin text-forge-2" aria-label="Checking which models OpenRouter has" />
        )}
      </div>

      <div className={variant === 'list' ? 'flex flex-col gap-1.5' : 'flex flex-wrap gap-1.5'}>
        {options.map(m => (
          <ModelButton
            key={m.id || '__auto'}
            model={m}
            selected={value === m.id}
            variant={variant}
            onClick={() => onChange(m.id)}
          />
        ))}

        {orphaned && (
          <ModelButton
            model={{
              ...describeOpenRouterModel(value, false, 0),
              description: 'OpenRouter does not offer this any more',
            }}
            selected
            stale
            variant={variant}
            onClick={() => onChange('')}
          />
        )}
      </div>

      {state === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-ember/25 bg-ember/10 p-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-ember" aria-hidden />
          <p className="text-xs text-ember">
            Could not ask OpenRouter which models it has. {error} Automatic still works — it
            asks again on the next request.
          </p>
        </div>
      )}

      <p className="text-xs text-forge-2">
        {state === 'ok'
          ? `${freeCount} free models available right now. Free ones are listed first — they come and go weekly, so Automatic is the setting that keeps working.`
          : 'This list comes from OpenRouter and needs no key to read. Free models are listed first.'}
      </p>
    </div>
  )
}

function ModelButton({
  model, selected, variant, onClick, stale = false,
}: {
  model: OpenRouterModel
  selected: boolean
  variant: 'list' | 'chips'
  onClick: () => void
  stale?: boolean
}) {
  const tone = stale
    ? 'bg-ember/[0.06] border-ember/30 text-ember'
    : selected
      ? 'bg-arcane/10 border-arcane/30 text-forge-0 ornate-border'
      : 'bg-gold/[0.03] border-bronze/20 text-forge-2 hover:bg-gold/[0.06] hover:text-forge-1'

  if (variant === 'chips') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={model.description}
        className={cn(
          'min-h-[44px] rounded-lg border px-3 text-xs font-medium',
          'transition-all duration-200 active:scale-[0.97]',
          tone,
        )}
      >
        <span className={stale ? 'line-through' : undefined}>{model.label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3.5 text-left',
        'transition-all duration-200 ease-forge active:scale-[0.98]',
        tone,
      )}
    >
      <span className={cn('text-sm font-medium', stale && 'line-through')}>{model.label}</span>
      <span className="shrink-0 text-xs opacity-60">{model.description}</span>
    </button>
  )
}
