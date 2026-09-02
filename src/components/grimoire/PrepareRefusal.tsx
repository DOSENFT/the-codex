/* The card that names the rule that refused.
 *
 * Open Book slice 5. Gate 1's promise about the prepared cap was "Hard cap with
 * a clear reason (Recommended)" — Marcus picked it over a soft warning. This is
 * the reason half. A cap with no reason is the app saying no; a cap that quotes
 * the sentence it is enforcing is the app teaching him the rule, which is what
 * he actually asked for: "The app should teach me on preparing spells and when
 * i can."
 *
 * ── TWO LINES, ALWAYS IN THIS ORDER ─────────────────────────────────────────
 *
 *   1. WHAT HAPPENED, in his numbers. "You have all 7 prepared." He is at a
 *      table with dice in his hand; the first line has to be readable at a
 *      glance without parsing a rulebook sentence.
 *   2. WHY, in canon's words, verbatim. Never paraphrased — `toggle.ts` quotes
 *      `PREPARED_SPELL_RULES` by index and this renders the string it was
 *      handed. The moment the app starts wording its own version of a rule is
 *      the moment it starts being subtly wrong at a table, and neither of us
 *      would notice for months.
 *
 * A refusal with no canon sentence behind it — `locked`, `not-a-spell` — shows
 * line 1 and nothing else, rather than inventing a rule to fill the space.
 *
 * ── THE THIRD LINE IS THE WAY OUT ───────────────────────────────────────────
 *
 * The cap refusal alone is a wall. Marcus: "i think on long rests i can swap out
 * a spell or something." He is right, it is canon's rule 3, and it is the only
 * thing that makes a full loadout non-final. A cap message that does not say so
 * answers his question with the half he already knew. */

import { Lock, Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PrepareRefusal as Refusal } from '../../lib/prepare/toggle'

const LEVEL_WORD: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }
const levelWord = (n: number) => LEVEL_WORD[n] ?? `${n}th`

interface Line {
  headline: string
  /** Canon, verbatim. Empty when this refusal is not about a rule. */
  rule: string
  /** Canon's rule 3, on the one refusal a Long Rest can undo. */
  wayOut: string
  tone: 'stop' | 'granted' | 'locked'
}

function lineFor(refusal: Refusal): Line {
  switch (refusal.code) {
    case 'cap':
      return {
        headline: `You already have all ${refusal.max} prepared.`,
        rule: refusal.rule,
        wayOut: refusal.swapRule,
        tone: 'stop',
      }
    case 'no-slots':
      return {
        headline: `You have no ${levelWord(refusal.spellLevel)}-level spell slots.`,
        rule: refusal.rule,
        wayOut: '',
        tone: 'stop',
      }
    case 'granted':
      return {
        headline:
          refusal.why === 'cantrip'
            ? 'Cantrips are always available — there is nothing to prepare.'
            : 'Your Oath gives you this one. It is always prepared, and it costs you no place.',
        rule: refusal.rule,
        wayOut: '',
        tone: 'granted',
      }
    case 'locked':
      return {
        headline: `You get this at level ${refusal.unlocksAt}.`,
        rule: '',
        wayOut: '',
        tone: 'locked',
      }
    case 'not-a-spell':
      return {
        headline: `${refusal.name} is not a spell you prepare — it is something you have.`,
        rule: '',
        wayOut: '',
        tone: 'locked',
      }
  }
}

const TONE: Record<Line['tone'], { box: string; text: string }> = {
  stop: { box: 'border-ember/40 bg-ember/[0.08]', text: 'text-ember-lit' },
  granted: { box: 'border-verdant/35 bg-verdant/[0.06]', text: 'text-verdant' },
  locked: { box: 'border-bronze/40 bg-white/[0.03]', text: 'text-forge-1' },
}

function ToneIcon({ tone }: { tone: Line['tone'] }) {
  if (tone === 'granted') return <Sparkles size={13} aria-hidden />
  if (tone === 'locked') return <Lock size={13} aria-hidden />
  return <TriangleAlert size={13} aria-hidden />
}

export function PrepareRefusal({ refusal }: { refusal: Refusal }) {
  const line = lineFor(refusal)
  const tone = TONE[line.tone]

  return (
    <div
      role="status"
      data-prepare-refusal={refusal.code}
      className={cn('w-full rounded-lg border px-3 py-2.5 flex flex-col gap-1.5', tone.box)}
    >
      <p className={cn('flex items-start gap-1.5 text-xs font-semibold', tone.text)}>
        <span className="mt-px shrink-0">
          <ToneIcon tone={line.tone} />
        </span>
        {line.headline}
      </p>

      {/* Canon's own sentence. `data-refusal-rule` is what browser check E reads
          geometrically — the proof has to see the RULE on screen, not merely the
          box that was supposed to contain it. */}
      {line.rule && (
        <p data-refusal-rule className="text-[11px] leading-relaxed text-forge-1">
          {line.rule}
        </p>
      )}

      {line.wayOut && (
        <p data-refusal-way-out className="text-[11px] leading-relaxed text-forge-2">
          <span className="font-semibold text-forge-1">You are not stuck: </span>
          {line.wayOut}
        </p>
      )}
    </div>
  )
}
