/* Impulse — eight situations, each of which now produces a whole beat.
 *
 * ── WHAT WAS WRONG WITH IT ─────────────────────────────────────────────────
 * Marcus, 2026-09-07, after tapping one of these buttons while prepping:
 *
 *     "the impulse module seems OK, but doesn't seem fully built. Like I just
 *      tapped on 'ambush' but Idk when I'd actually use what it suggested, and
 *      it literally is just one or two lines."
 *
 * Both halves of that are the same defect. The card used to render SAY / DO /
 * THINK — three sentences with no situation attached, so the hard part (working
 * out the moment they belong in) was still his. `useWhen` is the literal answer
 * to his first clause and `directions` / `followUp` / `out` are the answer to
 * the second: the grid now hands him a beat with a future instead of a line.
 *
 * ── WHAT ELSE LEFT ─────────────────────────────────────────────────────────
 * The `{error && <p className="text-red-400">{error}</p>}` that used to live at
 * line 192 of this file. That element is what put a raw Gemini 503 blob in the
 * middle of his roleplay card. `requestBeat` cannot reject, so there is nothing
 * for it to say and it is gone rather than merely unreachable. */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Zap } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import type { RPMoment } from '../../lib/session-log'
import { queryAIStructured } from '../../lib/ai'
import { requestBeat } from '../../lib/rp/engine'
import type { Beat } from '../../lib/rp/beat'
import { loadTable, nextToAim } from '../../lib/rp/table'
import type { BeatIntent } from '../../lib/rp/types'
import { ActionCard } from './ActionCard'
import { BeatCard } from './BeatCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImpulseEngineProps {
  character: Character
  sceneContext?: string
  expanded: boolean
  onToggle: () => void
  onMomentLogged: (moment: Omit<RPMoment, 'id' | 'timestamp'>) => void
}

// ---------------------------------------------------------------------------
// Situation grid data
// ---------------------------------------------------------------------------

interface SituationButton {
  label: string
  color: 'ember' | 'verdant' | 'arcane' | 'eldritch'
  intent: BeatIntent
  /** The sentence the model actually receives. The button label alone ("Gift!")
   *  is a noun; a beat needs a moment, and these are the moment. */
  moment: string
}

const SITUATIONS: SituationButton[] = [
  { label: 'Ambush!', color: 'ember', intent: 'react',
    moment: 'An ambush has just landed on us — no warning, everyone is still reacting.' },
  { label: 'Betrayal!', color: 'eldritch', intent: 'raise',
    moment: 'Someone we trusted has just turned on us in front of everyone.' },
  { label: 'Gift!', color: 'verdant', intent: 'react',
    moment: 'Someone has just given me something, and I did not expect it.' },
  { label: 'Insult!', color: 'eldritch', intent: 'raise',
    moment: 'I have just been insulted out loud, in front of the others.' },
  { label: 'Revelation!', color: 'arcane', intent: 'land',
    moment: 'Something just came out that changes what we thought was true.' },
  { label: 'Death!', color: 'ember', intent: 'land',
    moment: 'Someone has just died and the room has gone silent.' },
  { label: 'Victory!', color: 'verdant', intent: 'land',
    moment: 'We have just won, and nobody has decided yet what winning feels like.' },
  { label: 'Request!', color: 'arcane', intent: 'pull-in',
    moment: 'Someone has just asked me for something I do not have to give them.' },
]

/* Ink lit, ground unchanged — the same move as the condition chips and for the
   same measurement. «Betrayal!» and «Insult!» in eldritch on eldritch/10 came
   in at 4.48:1 and 4.47:1 at 14px, two hundredths under V-2's floor. A miss
   that small is not a rounding error to wave through; it is the exact size of
   miss that survives every review because it looks like a pass. */
const SITUATION_COLOR_MAP: Record<SituationButton['color'], {
  bg: string
  border: string
  text: string
  hoverBg: string
}> = {
  ember: {
    bg: 'bg-ember/10',
    border: 'border-ember/25',
    text: 'text-ember-lit',
    hoverBg: 'hover:bg-ember/15',
  },
  verdant: {
    bg: 'bg-verdant/10',
    border: 'border-verdant/25',
    text: 'text-verdant',
    hoverBg: 'hover:bg-verdant/15',
  },
  arcane: {
    bg: 'bg-arcane/10',
    border: 'border-arcane/25',
    text: 'text-arcane-lit',
    hoverBg: 'hover:bg-arcane/15',
  },
  eldritch: {
    bg: 'bg-eldritch/10',
    border: 'border-eldritch/25',
    text: 'text-eldritch-lit',
    hoverBg: 'hover:bg-eldritch/15',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImpulseEngine({ character, sceneContext, expanded, onToggle, onMomentLogged }: ImpulseEngineProps) {
  const [active, setActive] = useState<SituationButton | null>(null)
  const [beat, setBeat] = useState<Beat | null>(null)
  const [loading, setLoading] = useState(false)
  const nth = useRef(0)

  const abortRef = useRef<AbortController | null>(null)
  const genRef = useRef(0)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // ── Fire a situation ──────────────────────────────────────────────────
  const fire = useCallback(async (situation: SituationButton, again = false) => {
    setActive(situation)
    if (!again) { setBeat(null); nth.current = 0 } else { nth.current += 1 }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    genRef.current += 1
    const mine = genRef.current

    setLoading(true)

    /* The roster is read at FIRE time rather than held in state, so a player
       added in the Roleplay zone thirty seconds ago is already known here. */
    const table = loadTable(character.id)
    if (sceneContext && !table.scene) table.scene = sceneContext

    // No try/catch: `requestBeat` resolves with a banked beat on every failure
    // there is, which is asserted in `lib/rp/engine.test.ts`.
    const result = await requestBeat(
      {
        character,
        table,
        intent: situation.intent,
        aimAt: nextToAim(table, Date.now()),
        custom: situation.moment,
        nth: nth.current,
      },
      (sys, user) => queryAIStructured<unknown>(sys, user, undefined, controller.signal),
    )

    if (genRef.current !== mine) return
    setBeat(result)
    setLoading(false)
  }, [character, sceneContext])

  const handleAnother = useCallback(() => {
    if (active) void fire(active, true)
  }, [active, fire])

  const handlePlayedIt = useCallback(() => {
    if (!beat || !active) return
    const line = beat.moves[0]?.text ?? beat.goal
    const text = `${active.label} — ${line}`
    onMomentLogged({
      type: 'react',
      text: text.length > 80 ? text.slice(0, 77) + '…' : text,
      context: sceneContext,
    })
    setActive(null)
    setBeat(null)
  }, [beat, active, sceneContext, onMomentLogged])

  const handleBackToGrid = useCallback(() => {
    abortRef.current?.abort()
    genRef.current += 1      // whatever is in flight no longer owns this panel
    setActive(null)
    setBeat(null)
    setLoading(false)
  }, [])

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <ActionCard
      title="Impulse"
      icon={Zap}
      color="ember"
      count={SITUATIONS.length}
      expanded={expanded}
      onToggle={onToggle}
      emptyMessage="Add persona traits and backstory in Prep mode for better reactions"
    >
      {active ? (
        /* ── Beat view ── */
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToGrid}
              aria-label="Back to situations"
              className={cn(
                'inline-flex items-center gap-1.5',
                'min-h-[44px] px-2 rounded-lg',
                'text-sm text-forge-2',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.97]',
                'hover:bg-white/[0.06]',
              )}
            >
              &larr;
            </button>
            <p className="text-sm font-semibold text-forge-0">{active.label}</p>
          </div>

          {loading && !beat && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-[44px] rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          )}

          {beat && (
            <BeatCard
              beat={beat}
              loading={loading}
              onAnother={handleAnother}
              onUsed={handlePlayedIt}
            />
          )}
        </div>
      ) : (
        /* ── Situation grid ── */
        <div className="grid grid-cols-2 gap-2">
          {SITUATIONS.map(situation => {
            const colors = SITUATION_COLOR_MAP[situation.color]
            return (
              <button
                key={situation.label}
                type="button"
                onClick={() => void fire(situation)}
                className={cn(
                  'inline-flex items-center justify-center',
                  'min-h-[52px] px-3 py-3 rounded-xl',
                  'text-sm font-semibold',
                  'border',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                  colors.bg,
                  colors.border,
                  colors.text,
                  colors.hoverBg,
                )}
              >
                {situation.label}
              </button>
            )
          })}
        </div>
      )}
    </ActionCard>
  )
}
