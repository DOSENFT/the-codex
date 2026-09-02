import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { discrepancies } from '../../lib/rules-2024/vitals'
import { slotAdoption } from '../../lib/rules-2024/adopt'
import type { Character } from '../../lib/character'

/* ============================================================================
   WHERE YOUR SHEET AND THE 2024 RULES DISAGREE — "Your Turn" slice 9.

   ── THIS IS A MOVE. NOTHING HERE IS NEW BEHAVIOUR ───────────────────────────
   Every line below was `VitalsBand`'s until this slice. It is EXTRACTED rather
   than copied: `VitalsBand` keeps its five numbers and no longer renders a flag,
   so there is exactly one surface reporting one disagreement. A second copy
   would be item 6 — the duplication this whole phase exists to remove — rebuilt
   by the slice meant to close it, and the second copy would be back across the
   tab from the pips again.

   ── WHY IT MOVED: 2,430 PIXELS ──────────────────────────────────────────────
   Gate 1 decision 2, and it was right about the fault and wrong about where it
   was. Measured on his export at 390×844 in combat (`_diag9.mjs`, 2026-09-02):
   the notice sat at page-y 2,830 in a 341px card, and the nine slot dots it is
   entirely about sat at 400. **2,430px apart** — a complaint about spell slots
   filed four screens from the spell slots. Mounted in the rail it is now
   touching them.

   (Gate 1 also said it "costs most of screen one, every time, forever". Slice 8b
   moved the whole extras block below the card, so that half was already false
   before this slice started, and it is recorded in `04-slices.md` rather than
   quietly built against.)

   ── CLOSED BY DEFAULT, WHICH REVERSES AN ARGUMENT MADE OUT LOUD ─────────────
   `VitalsBand` used to hold `useState(true)` under a comment reading: *"A
   dismissed warning that stays dismissed is a warning that gets dismissed once
   and never seen again — and the thing it is warning about survives across
   sessions. It reopens every load until the underlying disagreement is actually
   resolved."*

   That was correct on the day it was written and both of its premises have since
   expired. It was written when the flag had **no way to answer it** — so
   reopening was the only pressure available — and when it lived four screens
   from the thing it described, where being quiet meant being forgotten. Today it
   has a one-tap answer (added 2026-08-28) and it is a line under the very dots
   it is complaining about. A label on the thing does not need to shout; it needs
   to be next to the thing. The state is still not persisted, so it is closed on
   every load rather than dismissed forever, and the count on the closed line
   still says how many are outstanding.

   ── STILL NOT THE APP'S OPINION ─────────────────────────────────────────────
   Unchanged from `VitalsBand`: `slotAdoption` builds the sheet, the button shows
   what it would do, nothing happens without a press, and canon's own instruction
   ("do not silently implement either version") is why there is a button and not
   a correction.
   ========================================================================= */

const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-wider'

export interface SheetRuleFlagsProps {
  character: Character
  /** Present when this surface is allowed to write. Absent leaves a report with
   *  no door — still the right rendering anywhere the sheet is being looked at
   *  rather than played. */
  onAdopt?: (next: Character) => void
  /** Tests and provers only — render already open. Same reason `ErrataBand`
   *  takes `initiallyExpanded`: this repo has no DOM, and a fold that can only
   *  be opened by a click is a fold no static render can read. */
  initiallyOpen?: boolean
}

export function SheetRuleFlags({ character, onAdopt, initiallyOpen = false }: SheetRuleFlagsProps) {
  const flags = useMemo(() => discrepancies(character), [character])

  /* Asked for a SHAPE, not for slots by name — null means there is nothing to
     offer and no button is drawn. This component does not know which rule it is
     offering, only that one exists and what it says it does, so a second
     adoptable rule later needs no change here. */
  const adoption = useMemo(() => slotAdoption(character), [character])

  const [open, setOpen] = useState(initiallyOpen)

  /* Nothing, not an empty landmark. An empty section in the rail is a
     border-top and a gap for a disagreement that does not exist. */
  if (flags.length === 0) return null

  return (
    <section className="ruleflag" aria-label="Your sheet and the 2024 rules">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full min-h-12 items-center gap-2 text-left"
      >
        <AlertTriangle size={14} className="shrink-0 text-ember" aria-hidden />
        <span className="text-xs font-semibold text-ember-lit">
          {flags.length === 1
            ? 'Your sheet and the 2024 rules disagree on 1 thing'
            : `Your sheet and the 2024 rules disagree on ${flags.length} things`}
        </span>
        {open ? (
          <ChevronUp size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
        ) : (
          <ChevronDown size={14} className="ml-auto shrink-0 text-forge-1" aria-hidden />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-2.5 pb-1 pt-1">
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

          {adoption && onAdopt && (
            <button
              type="button"
              onClick={() => onAdopt(adoption.next)}
              className="min-h-12 w-full rounded-lg border border-ember/40 bg-ember/10 px-3 py-2 text-left"
            >
              <span className="text-xs font-semibold text-ember-lit">{adoption.label}</span>
              {/* The change spelled out ON the button. A control that says only
                  "fix" asks to be trusted; this one can be read and refused
                  before it is pressed. */}
              <span className={`mt-0.5 ${LABEL} normal-case tracking-normal text-forge-2`}>
                {adoption.from} → {adoption.to}
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function Row({ term, value, tone }: { term: string; value: string; tone: 'sheet' | 'rule' }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-20 shrink-0 text-[10px] uppercase tracking-[0.08em] text-forge-2">
        {term}
      </dt>
      <dd className={`font-mono text-xs ${tone === 'sheet' ? 'text-forge-0' : 'text-ember-lit'}`}>
        {value}
      </dd>
    </div>
  )
}
