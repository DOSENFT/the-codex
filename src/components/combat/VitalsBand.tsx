import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { tableVitals, discrepancies, signed } from '../../lib/rules-2024/vitals'
import type { Character } from '../../lib/character'

/* ============================================================================
   THE VITALS BAND — Table Truth slice 2.

   The five numbers a turn is made of, in one card at the top of the Play tab.
   Save DC, initiative and proficiency were absent from this surface entirely;
   AC and spell attack existed only inside `combat/StatsBar.tsx`, which has zero
   importers and has never rendered.

   ON NOT REUSING StatsBar's MARKUP. The slice plan said to absorb the number
   layout from `StatsBar.tsx:254-279` rather than rewrite it. On reading it, the
   layout is three `<div class="stat-box-v3">` boxes whose classes — stat-box-v3,
   stat-box-label, stat-box-value — are **defined nowhere in the repo**. They
   were never in index.css and never in a component style block, so that
   component would have rendered unstyled had anything mounted it. What was
   reusable was the STRUCTURE (dim label over bright value, boxes in a row) and
   that is what this is. Recorded rather than quietly re-specced.

   V-3 IS THE LAYOUT CONSTRAINT, NOT A POLISH PASS. "A numeral is never dim."
   Every value here is forge-0 (or arcane-lit for the hero) at 7:1 or better;
   only the words beside them are forge-2. That is the whole reason the numbers
   are not simply crammed into the existing HP card.

   READ-ONLY, like everything before slice 5. It derives, it renders, it
   persists nothing — not even its own collapse state (see the note below).
   ========================================================================= */

interface VitalsBandProps {
  character: Character
}

export function VitalsBand({ character }: VitalsBandProps) {
  const vitals = useMemo(() => tableVitals(character), [character])
  const flags = useMemo(() => discrepancies(character), [character])

  /* Deliberately NOT persisted through useCollapsible.
     A dismissed warning that stays dismissed is a warning that gets dismissed
     once and never seen again — and the thing it is warning about (slots that
     do not match his level) survives across sessions. It reopens every load
     until the underlying disagreement is actually resolved. */
  const [flagsOpen, setFlagsOpen] = useState(true)

  return (
    <GlassCard className="p-3">
      <div className="flex items-stretch gap-1.5">
        <Stat label="Save DC" value={`${vitals.saveDC}`} hero />
        <Stat label="AC" value={`${vitals.armorClass}`} />
        <Stat label="Init" value={signed(vitals.initiativeMod)} />
        <Stat label="Prof" value={signed(vitals.proficiency)} />
        <Stat label="Sp Atk" value={signed(vitals.spellAttack)} />
      </div>

      {flags.length > 0 && (
        <div className="mt-3 border-t border-ember/25 pt-2">
          <button
            type="button"
            onClick={() => setFlagsOpen(v => !v)}
            aria-expanded={flagsOpen}
            className="flex w-full min-h-12 items-center gap-2 text-left"
          >
            <AlertTriangle size={14} className="shrink-0 text-ember" aria-hidden />
            <span className="text-xs font-semibold text-ember-lit">
              {flags.length === 1
                ? 'Your sheet and the 2024 rules disagree on 1 thing'
                : `Your sheet and the 2024 rules disagree on ${flags.length} things`}
            </span>
            {flagsOpen ? (
              <ChevronUp size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
            ) : (
              <ChevronDown size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
            )}
          </button>

          {flagsOpen && (
            <div className="flex flex-col gap-2.5 pt-1">
              {flags.map(flag => (
                <div key={flag.id}>
                  <p className="text-xs font-semibold text-forge-0">{flag.title}</p>
                  <dl className="mt-1 flex flex-col gap-0.5">
                    <Row term="Your sheet" value={flag.sheet} tone="sheet" />
                    <Row term="2024 rules" value={flag.rule} tone="rule" />
                  </dl>
                  <p className="mt-1 text-xs text-forge-2">{flag.why}</p>
                </div>
              ))}
              <p className="text-xs text-forge-2">
                Nothing has been changed. The app does not know which of these is right for your
                table — that is yours and your DM's call.
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

/** One number and its word. The word may be dim; the number never is (V-3). */
function Stat({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-bronze/20 bg-void-2/50 px-1 py-1.5">
      <span
        className={`font-mono text-lg font-semibold leading-none tabular-nums ${
          hero ? 'text-arcane-lit' : 'text-forge-0'
        }`}
      >
        {value}
      </span>
      <span className="truncate text-[10px] uppercase tracking-[0.08em] text-forge-2">
        {label}
      </span>
    </div>
  )
}

function Row({ term, value, tone }: { term: string; value: string; tone: 'sheet' | 'rule' }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-20 shrink-0 text-[10px] uppercase tracking-[0.08em] text-forge-2">
        {term}
      </dt>
      <dd
        className={`font-mono text-xs ${tone === 'sheet' ? 'text-forge-0' : 'text-ember-lit'}`}
      >
        {value}
      </dd>
    </div>
  )
}
