/* The beat, on screen.
 *
 * Presentational and total: it takes a fully-formed `Beat` and draws it. It
 * cannot fetch, it cannot fail, and — deliberately — IT HAS NO ERROR STATE TO
 * RENDER. That absence is the feature. The raw Gemini JSON in Marcus's
 * screenshot got onto the screen because the component that owned the request
 * also owned an `{error && <p className="text-red-400">…}`. `requestBeat`
 * always resolves, so there is nothing for that branch to display and the
 * branch does not exist to be reached.
 *
 * Band order is fixed and matches the Grimoire's detail card on purpose: he has
 * already learned to read that shape, so this one costs him nothing to learn. */

import { RefreshCw, Check, Signal } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Beat, BeatMove } from '../../lib/rp/beat'

interface BeatCardProps {
  beat: Beat
  loading?: boolean
  onAnother: () => void
  onUsed: () => void
}

const MOVE_STYLE: Record<BeatMove['kind'], { label: string; chip: string; text: string }> = {
  say: { label: 'Say', chip: 'text-arcane', text: 'text-arcane-lit italic' },
  do: { label: 'Do', chip: 'text-ember', text: 'text-forge-0' },
  ask: { label: 'Ask', chip: 'text-verdant', text: 'text-forge-0' },
}

function Band({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 border-t border-white/[0.06] first:border-t-0">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-forge-2 mb-2">
        {title}
      </h4>
      {children}
    </div>
  )
}

export function BeatCard({ beat, loading = false, onAnother, onUsed }: BeatCardProps) {
  const banked = beat.source === 'bank'

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10 animate-fade-in">
      {/* ── Aim strip. Every beat is pointed at a human. ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="font-mono text-[11px] tracking-wider uppercase text-arcane">
          → {beat.aim}
        </span>
        {beat.aimNote && (
          <span className="text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-verdant/30 bg-verdant/10 text-verdant">
            {beat.aimNote}
          </span>
        )}
        <span className="ml-auto text-[9px] uppercase tracking-[0.1em] text-forge-2/70">
          {banked ? 'from the bank' : 'live'}
        </span>
      </div>

      {/* ── The quiet notice. NOT an error: it is a fact about the network,
             phrased as a fact about this card, and it never stops him. ── */}
      {banked && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-bronze/[0.07] border-b border-white/[0.06]">
          <Signal size={13} className="shrink-0 mt-0.5 text-bronze" aria-hidden />
          <p className="text-[11.5px] leading-relaxed text-bronze">
            Written offline, so this one is not tailored to tonight — but it works.
            Tap <span className="font-semibold">Another</span> to try live again.
          </p>
        </div>
      )}

      {/* ── USE IT WHEN. His question, answered, and first because it is what
             tells him whether to read the rest. ── */}
      <Band title="Use it when">
        <p className="text-[13px] leading-relaxed text-forge-1">{beat.useWhen}</p>
      </Band>

      {/* ── THE MOVE — the hero ── */}
      <Band title="The move">
        <div className="space-y-2.5">
          {beat.moves.map((m, i) => {
            const s = MOVE_STYLE[m.kind]
            return (
              <div key={i} className="flex gap-2.5">
                <span className={cn('shrink-0 w-[30px] pt-1 font-mono text-[9px] uppercase tracking-wider', s.chip)}>
                  {s.label}
                </span>
                <p className={cn('flex-1 text-[15px] leading-relaxed', s.text)}>{m.text}</p>
              </div>
            )
          })}
        </div>
      </Band>

      <Band title="What it’s for">
        <p className="text-[13px] leading-relaxed text-forge-1">{beat.goal}</p>
      </Band>

      <Band title="If they bite">
        <p className="text-[13px] leading-relaxed text-forge-1 border-l-2 border-white/10 pl-3">
          {beat.followUp}
        </p>
      </Band>

      {beat.directions.length > 0 && (
        <Band title="Where it can go">
          <div className="space-y-2">
            {beat.directions.map((d, i) => (
              <div key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-forge-1">
                <span className="shrink-0 text-bronze pt-px" aria-hidden>↗</span>
                <p>
                  {d.label && <span className="font-semibold text-forge-0">{d.label} — </span>}
                  {d.text}
                </p>
              </div>
            ))}
          </div>
        </Band>
      )}

      {/* ── THE OUT. The reason he is safe to take the risk at all. ── */}
      <Band title="If it lands flat">
        <p className="text-[12.5px] leading-relaxed text-forge-2 italic">{beat.out}</p>
      </Band>

      {/* ── Footer ── */}
      <div className="flex gap-2 px-3 py-3 border-t border-white/[0.06] bg-black/20">
        <button
          type="button"
          onClick={onUsed}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2',
            'min-h-[48px] px-3 rounded-xl',
            'bg-verdant/15 border border-verdant/30',
            'text-sm font-semibold text-verdant',
            'transition-all duration-200 ease-forge active:scale-[0.96]',
            'hover:bg-verdant/20',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
          )}
        >
          <Check size={16} aria-hidden />
          I played it
        </button>
        <button
          type="button"
          onClick={onAnother}
          disabled={loading}
          aria-label="Another beat"
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'min-h-[48px] px-4 rounded-xl',
            'bg-white/[0.06] border border-white/15',
            'text-sm font-semibold text-forge-1',
            'transition-all duration-200 ease-forge active:scale-[0.96]',
            'hover:bg-white/[0.08]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} aria-hidden />
          Another
        </button>
      </div>
    </div>
  )
}
