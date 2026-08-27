import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { buildMatchReport } from '../../lib/canon/report'
import type { Character } from '../../lib/character'

/* ============================================================================
   THE TRACER BULLET — Table Truth slice 1.

   TEMPORARY. This strip is scaffolding: it exists to prove the canon corpus is
   loaded, indexed, and honest about what it does not cover, before a single row
   on the Play tab starts trusting it. Slice 9 removes it, once canon is feeding
   the rows themselves and the coverage is visible in the rows instead.

   It is deliberately unglamorous and deliberately READ-ONLY. It calls nothing,
   dispatches nothing, and persists nothing — the whole point of a tracer bullet
   is that if it did any damage you would not be able to tell it apart from the
   feature it is tracing.

   Why it leads with the MISSES. "Canon loaded: 71 spells" is a claim you cannot
   check. "Canon has nothing for these 4 things on your sheet" is one you can —
   and under the open-world rule those four are not bugs, they are homebrew
   keeping its own words. What would be a bug is not being told.
   ========================================================================= */

interface CanonMatchReportProps {
  character: Character
}

export function CanonMatchReport({ character }: CanonMatchReportProps) {
  const [open, setOpen] = useState(false)
  const report = useMemo(() => buildMatchReport(character), [character])

  const missing =
    report.unmatchedSpells.length +
    report.unmatchedFeatures.length +
    report.unmatchedConditions.length
  const flagged = missing + report.aboveLevel.length

  return (
    <GlassCard className="p-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left min-h-11"
      >
        <BookOpen size={14} className="shrink-0 text-gold" aria-hidden />
        <span className="font-mono text-xs text-forge-1">
          Canon {report.canonBuild} ·{' '}
          <span className="text-forge-0">{report.counts.spells}</span> spells ·{' '}
          <span className="text-forge-0">{report.counts.errata}</span> errata · matched{' '}
          <span className="text-forge-0">{report.matched}</span> of{' '}
          <span className="text-forge-0">{report.checked}</span> on your sheet
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {flagged > 0 && (
            <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-xs text-ember-lit">
              {flagged}
            </span>
          )}
          {open ? (
            <ChevronUp size={14} className="text-forge-1" aria-hidden />
          ) : (
            <ChevronDown size={14} className="text-forge-1" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-bronze/20 pt-3">
          {flagged === 0 && (
            <p className="text-xs text-forge-1">
              Canon has a record for everything on your sheet.
            </p>
          )}

          <Group
            title="Canon has no entry — keeps your own wording"
            names={[
              ...report.unmatchedSpells,
              ...report.unmatchedFeatures,
              ...report.unmatchedConditions,
            ]}
            note="Not an error. Homebrew and subclass content the rules package doesn't cover renders exactly as it does today."
          />

          {report.aboveLevel.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-ember-lit">
                On your sheet, but canon says you unlock it later
              </p>
              <ul className="flex flex-col gap-0.5">
                {report.aboveLevel.map(entry => (
                  <li key={entry.name} className="font-mono text-xs text-forge-1">
                    <span className="text-forge-0">{entry.name}</span> — unlocks at Paladin{' '}
                    <span className="text-forge-0">{entry.unlocksAt}</span>, you are{' '}
                    <span className="text-forge-0">{character.level}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-forge-2">
                Shown, never removed. Your sheet may be right and the package stale — that is
                your call and your DM's, not the app's.
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

function Group({ title, names, note }: { title: string; names: string[]; note: string }) {
  if (names.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-forge-1">
        {title} <span className="font-mono text-forge-0">({names.length})</span>
      </p>
      <ul className="flex flex-col gap-0.5">
        {names.map(name => (
          <li key={name} className="font-mono text-xs text-forge-0">
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-forge-2">{note}</p>
    </div>
  )
}
