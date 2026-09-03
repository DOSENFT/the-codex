import { AlertTriangle, Crosshair, Users, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PlayNote, PlayNoteKind } from '../../lib/toybox'

/* ==========================================================================
   PLAY LINES — the two rows every Toybox card grew in slice 4

   A REQUIREMENT ROW AND AN ANNOTATION ROW, shared by `ComboCard`,
   `TacticCard` and `PersonaPlayCard`. Gate 3 said "no new component; three
   small additions to three existing renders" — this is the one place slice 4
   departs from it, and the reason is the defect the slice exists to fix.

   THE DEFECT: on `TacticCard`, `requirements` and `tags` both rendered as
   `<Badge variant="neutral">`, in adjacent rows, with identical styling. A
   requirement — the thing that decides whether you can run the play at all,
   and the thing tomorrow's prepared-spell list is read backwards out of — was
   pixel-identical to a search keyword. Three separate copies of the fix is
   three chances to fix it differently, and a "requirement" that looks like one
   thing on Combos and another on Tactics is the same defect in a new costume.

   ── WHY THE INK IS NOT COLOURED ──

   Only the MARKER carries the category. The body text stays on `text-forge-1`,
   which is the ramp already proven across this app. That is not timidity, it
   is `ui/Badge.tsx`'s A-23/A-35 finding applied before it can bite: a colour
   that reads fine as a swatch can fail in situ, and requirement text routinely
   contains numerals ("save DC 14", "1d10+3"), which WCAG V-3 holds to a 7:1
   floor rather than V-2's 4.5:1. `gold` measures 6.28:1 — it clears V-2 and
   misses V-3, which is exactly why `TABLE-READY.md §14` records that the first
   gold badge to carry a NUMBER needs a new token first. So gold prints the
   three letters "REQ" and never a digit, and the digits print on forge-1.

   Marker glyphs are also distinct SHAPES, not merely distinct colours, so the
   three kinds survive a colour-blind reader, and each carries a screen-reader
   label because an icon that is the only thing naming a category is invisible
   to anyone not looking at it.
   ========================================================================== */

const NOTE_STYLES: Record<PlayNoteKind, { Icon: LucideIcon; tint: string; label: string }> = {
  positioning: { Icon: Crosshair,     tint: 'text-arcane',   label: 'Positioning' },
  party:       { Icon: Users,         tint: 'text-verdant',  label: 'Party' },
  warning:     { Icon: AlertTriangle, tint: 'text-red-400',  label: 'Heads up' },
}

/** The one line that says what this play costs you before you can run it.
 *
 *  Joined with " · " and never a list of pills: a requirement is one answer to
 *  one question, and splitting it into badges is what made it read as tags. */
export function PlayRequirements({ requirements }: { requirements?: string[] }) {
  if (!requirements || requirements.length === 0) return null
  return (
    <p className="flex items-baseline gap-2 leading-snug">
      <span className="flex-shrink-0 text-[10px] font-semibold tracking-[0.09em] text-gold">
        REQ
      </span>
      <span className="text-forge-1 text-sm">{requirements.join(' · ')}</span>
    </p>
  )
}

/** Where to stand, who to tell, and what the app is not sure about. */
export function PlayAnnotations({ annotations }: { annotations?: PlayNote[] }) {
  if (!annotations || annotations.length === 0) return null
  return (
    <div className="space-y-1.5">
      {annotations.map((note, i) => {
        const style = NOTE_STYLES[note.kind] ?? NOTE_STYLES.positioning
        const { Icon } = style
        return (
          <p key={i} className="flex items-start gap-2 leading-snug">
            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', style.tint)} aria-hidden="true" />
            <span className="sr-only">{style.label}: </span>
            <span className="text-forge-1 text-sm">{note.text}</span>
          </p>
        )
      })}
    </div>
  )
}
