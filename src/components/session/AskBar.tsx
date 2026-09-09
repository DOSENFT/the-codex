/* The doorway. Five intents and a box he can type anything into.
 *
 * ── WHY THE FREE TEXT IS FIRST-CLASS AND NOT A FALLBACK ────────────────────
 * Marcus: *"The codex does a decent job at allowing me to type in custom things
 * into 'what would I say' … The 'what would I say' is a really good step in the
 * right direction."* It is the one part of the old page he named as working, so
 * it keeps its size and its position rather than being demoted to an "advanced"
 * disclosure under a grid of buttons.
 *
 * The five intents beside it are not categories of content — they are the five
 * things a person at a table actually wants from a beat, and each one changes
 * the SHAPE of what comes back, not its subject. */

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { BEAT_INTENTS, INTENT_LABEL, type BeatIntent } from '../../lib/rp/types'

interface AskBarProps {
  loading: boolean
  /** The person the next beat is pointed at, if he picked one. */
  aimName: string | null
  onClearAim: () => void
  onAsk: (intent: BeatIntent, custom?: string) => void
}

/* `custom` is not in the chip row: it is the textarea. Putting it in the row as
   well would give him two controls that do the same thing and disagree. */
const CHIPS = BEAT_INTENTS.filter(i => i !== 'custom')

export function AskBar({ loading, aimName, onClearAim, onAsk }: AskBarProps) {
  const [text, setText] = useState('')

  const send = (intent: BeatIntent) => {
    const custom = text.trim()
    onAsk(custom ? 'custom' : intent, custom || undefined)
    setText('')
  }

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-3 space-y-2.5">
      {/* ── Who it is pointed at. Visible before he asks, not after. ── */}
      {aimName && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-arcane">
            → {aimName}
          </span>
          <button
            type="button"
            onClick={onClearAim}
            className="text-[11px] text-forge-2 underline underline-offset-2 min-h-[32px] px-1"
          >
            aim at the whole table instead
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        placeholder="What's happening? What do you want to do?"
        className={cn(
          'w-full px-3 py-2.5 rounded-xl resize-none',
          'bg-black/30 border border-white/10',
          'text-sm text-forge-0 placeholder:text-forge-2/70 leading-relaxed',
          'focus:outline-none focus:border-arcane/50 focus:ring-1 focus:ring-arcane/30',
        )}
      />

      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map(intent => (
          <button
            key={intent}
            type="button"
            disabled={loading}
            onClick={() => send(intent)}
            className={cn(
              'inline-flex items-center justify-center',
              'min-h-[44px] px-3 rounded-xl',
              'bg-white/[0.05] border border-white/12',
              'text-[12.5px] font-semibold text-forge-1',
              'transition-all duration-200 ease-forge active:scale-[0.96]',
              'hover:bg-white/[0.09] hover:text-forge-0',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {INTENT_LABEL[intent]}
          </button>
        ))}

        <button
          type="button"
          disabled={loading}
          onClick={() => send('custom')}
          className={cn(
            'inline-flex items-center justify-center gap-2 ml-auto',
            'min-h-[44px] px-4 rounded-xl',
            'bg-arcane/18 border border-arcane/35',
            'text-[12.5px] font-semibold text-arcane-lit',
            'transition-all duration-200 ease-forge active:scale-[0.96]',
            'hover:bg-arcane/25',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            loading && 'opacity-60 cursor-not-allowed',
          )}
        >
          {loading
            ? <Loader2 size={15} className="animate-spin" aria-hidden />
            : <Send size={15} aria-hidden />}
          Give me a beat
        </button>
      </div>
    </div>
  )
}
