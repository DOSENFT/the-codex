import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { listGeminiModels, rankGeminiModels, describeGeminiModel, type GeminiModel } from '../lib/ai'

/* ============================================================================
   THE GEMINI MODEL PICKER — Table Truth slice 3.

   This replaces the same four hardcoded buttons pasted into three places
   (Settings twice, CharacterSetup once). One of those four ids was retired by
   Google and every AI feature in the app went to 404 — including Character
   Forging, which is the one AI feature that cannot degrade into something
   useful. A list of models that ships in a bundle is a list that expires.

   So this control does not know any model names. It asks the key.

   THE FIRST OPTION IS "AUTOMATIC", AND IT IS THE DEFAULT. Automatic stores an
   EMPTY geminiModel, which `resolveGeminiModel` reads as "pick the newest thing
   this key can reach, every time". That is the setting that survives Google
   retiring something while Marcus is at a table with no laptop. Choosing a
   specific model is still offered — quotas are per-model, so switching is the
   real fix for a 429 at 9pm — but it is now a choice rather than the only mode.

   A stored model the key can no longer reach is shown, struck through and
   labelled, rather than silently vanishing from the list. He set it; he gets
   told what happened to it.
   ========================================================================= */

interface GeminiModelPickerProps {
  apiKey: string
  /** '' means automatic. */
  value: string
  onChange: (id: string) => void
  /** `list` = full-width rows with descriptions. `chips` = compact wrap. */
  variant?: 'list' | 'chips'
}

const AUTOMATIC: GeminiModel = {
  id: '',
  label: 'Automatic',
  description: 'The newest one your key can reach',
}

type LoadState = 'idle' | 'loading' | 'ok' | 'error'

export function GeminiModelPicker({ apiKey, value, onChange, variant = 'list' }: GeminiModelPickerProps) {
  const [models, setModels] = useState<string[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  /* Debounced, because this runs while he is typing a key character by
     character and every keystroke would otherwise be a request to Google with
     an obviously invalid key. Same shape as the Ollama URL probe next to it. */
  useEffect(() => {
    const key = apiKey.trim()
    if (key.length < 20) {
      setState('idle')
      setModels([])
      setError(null)
      return
    }
    const ac = new AbortController()
    const timer = setTimeout(() => {
      setState('loading')
      setError(null)
      listGeminiModels(key, ac.signal)
        .then(ids => {
          if (ac.signal.aborted) return
          setModels(ids)
          setState('ok')
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return
          setModels([])
          setState('error')
          setError(err instanceof Error ? err.message : 'Could not reach Google.')
        })
    }, 600)
    return () => { clearTimeout(timer); ac.abort() }
  }, [apiKey])

  const ranked = rankGeminiModels(models).map(describeGeminiModel)
  const orphaned = value && state === 'ok' && !models.includes(value)
  const options: GeminiModel[] = [AUTOMATIC, ...ranked]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={variant === 'list' ? 'text-sm font-medium text-forge-1' : 'text-xs text-forge-2'}>
          Model
        </span>
        {state === 'loading' && (
          <Loader2 size={12} className="animate-spin text-forge-2" aria-label="Checking which models your key can use" />
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
              ...describeGeminiModel(value),
              description: 'Not available on this key any more',
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
            Could not ask Google which models this key can use. {error} Automatic still works — it
            asks again on the next request.
          </p>
        </div>
      )}

      <p className="text-xs text-forge-2">
        {state === 'ok'
          ? `${models.length} models available on this key. Each has its own free quota — switch if one is rate-limited.`
          : 'Add your key above and this list fills in from Google. Each model has its own free quota.'}
      </p>
    </div>
  )
}

function ModelButton({
  model, selected, variant, onClick, stale = false,
}: {
  model: GeminiModel
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
