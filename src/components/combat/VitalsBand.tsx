import { useMemo } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { tableVitals, signed } from '../../lib/rules-2024/vitals'
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

   ⚠ THE FLAG LEFT THIS BAND — "Your Turn" slice 9, 2026-09-02.
   For a while this band did two jobs: report the five numbers, AND carry the
   "your sheet and the 2024 rules disagree" notice with its one-tap answer. The
   second job moved to `combat/SheetRuleFlags.tsx` and it MOVED — it was not
   copied — so there is still exactly one surface reporting one disagreement.

   The reason is a measurement, not a preference. This band lives in the extras
   block; the nine slot dots the flag is entirely about live in the rail. On his
   export at 390×844 in combat they were **2,430px apart** (`_diag9.mjs`): a
   complaint about spell slots filed four screens away from the spell slots. Its
   new home is a line directly underneath them.

   Two things this band used to argue for went with it and are argued again, in
   full, at the top of that file: why the write is not the band's opinion, and
   why the fold that used to open by default now starts closed. Neither
   reasoning is repeated here, because a reason kept in two places is a reason
   that will disagree with itself.

   What is left is what the band was originally for: five numbers, read at 60cm.
   It derives, it renders, and it persists nothing.
   ========================================================================= */

interface VitalsBandProps {
  character: Character
}

export function VitalsBand({ character }: VitalsBandProps) {
  const vitals = useMemo(() => tableVitals(character), [character])

  return (
    <GlassCard className="p-3">
      <div className="flex items-stretch gap-1.5">
        <Stat label="Save DC" value={`${vitals.saveDC}`} hero />
        <Stat label="AC" value={`${vitals.armorClass}`} />
        <Stat label="Init" value={signed(vitals.initiativeMod)} />
        <Stat label="Prof" value={signed(vitals.proficiency)} />
        <Stat label="Sp Atk" value={signed(vitals.spellAttack)} />
      </div>
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

/* `Row` — the sheet-vs-rules two-line comparison — left with the flag. It is
   `SheetRuleFlags`'s now. `noUnusedLocals` is off in this repo's tsconfig, so a
   component left behind here would have compiled, shipped and rendered nowhere
   for as long as anyone cared to leave it: that is precisely how 697 lines of
   unreachable panel survived until slice 8b went looking. */
