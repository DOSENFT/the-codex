/* Canon's five rules about preparing spells, and his four numbers.
 *
 * Open Book slice 5. Marcus, verbatim: "The app should teach me on preparing
 * spells and when i can (i think on long rests i can swap out a spell or
 * something. The documents should have information on this.)"
 *
 * They do. All five sentences have been sitting in `paladin-progression.json`
 * since the canon package landed and nothing has ever rendered one of them.
 * This is the whole of that fix: canon's words, in canon's order, unedited.
 *
 * ── THE NUMBERS COME FIRST, AND THAT IS THE POINT ───────────────────────────
 *
 * Five rules is a paragraph, and a paragraph is what he already has in a PDF he
 * does not open at the table. What a PDF cannot do is apply the rules to HIM.
 * So the top of this card is four numbers about Nix specifically, and the rules
 * underneath explain where those numbers came from.
 *
 * The second number is the one that matters. Every prepared-count in this app
 * has been `spells.filter(s => s.prepared && s.level > 0)` — six call sites,
 * and for a Paladin of the Hearth all six are wrong, because four of his six
 * ticked spells are Oath grants that canon's rule 4 excludes. It has been
 * telling him **6 of 7** when the rule says **2 of 7**. He has five free places
 * and the app talked him out of four of them. `preparedCount` is now the only
 * function that answers this question, here and at the cap alike — a display
 * count and an enforced count that disagree is how that happened in the first
 * place.
 *
 * ── COLLAPSED BY DEFAULT ────────────────────────────────────────────────────
 *
 * Marcus on the source documents: "The documents just have SO much golden
 * information that i want access to and have it actually in app as
 * powerful...idk...idk what it should be without cluttering things." The
 * numbers are always visible because they change; the five sentences are one
 * tap away because they do not. */

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import { PREPARED_SPELL_RULES } from '../../canon'
import { preparedCount, maxPrepared, countsAgainstCap } from '../../lib/prepare/toggle'
import type { Character } from '../../lib/character'

/* `data-figure` is the browser proof's handle. Check E has to say "the screen
 * told him 2 of 7", and a claim read off a container's `textContent` cannot tell
 * which of four numbers it found — so each figure is addressable, and the probe
 * measures ITS box and reads ITS digits. The value is not also published as an
 * attribute on purpose: an attribute the probe trusts is the model again, and
 * the whole point of E is to look at the paint. */
function Figure({
  id,
  value,
  label,
  tone,
}: {
  id: string
  value: number
  label: string
  tone: 'gold' | 'verdant' | 'arcane' | 'forge'
}) {
  const colour = {
    gold: 'text-gold',
    verdant: 'text-verdant',
    arcane: 'text-arcane-lit',
    forge: 'text-forge-1',
  }[tone]
  return (
    <div data-figure={id} className="flex flex-col gap-0.5 min-w-0">
      <span className={cn('font-mono text-lg font-semibold tabular-nums leading-none', colour)}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-forge-2 leading-tight">
        {label}
      </span>
    </div>
  )
}

export function PreparationRules({ character }: { character: Character }) {
  const [open, setOpen] = useState(false)

  const used = preparedCount(character)
  const max = maxPrepared(character)
  // `Math.max(0, …)`: a sheet edited by hand can sit over the cap, and a status
  // line reading "-2 free" is a bug report wearing a number's clothes.
  const free = Math.max(0, max - used)
  // Rule 4's exclusions, counted rather than asserted — this is the figure that
  // explains why `used` is smaller than the tick count he can see on the page.
  const granted = character.spells.filter(
    s => s.prepared && s.level > 0 && !countsAgainstCap(s),
  ).length

  return (
    <div
      data-preparation-rules
      className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden"
    >
      <div className="flex items-center gap-4 px-3 py-2.5 flex-wrap">
        <Figure id="used" value={used} label={`of ${max} used`} tone="gold" />
        <Figure id="free" value={free} label="free to prepare" tone="verdant" />
        <Figure id="granted" value={granted} label="granted free" tone="arcane" />
        <Figure id="level" value={character.level} label="paladin level" tone="forge" />

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cn(
            'ml-auto flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg shrink-0',
            'border border-white/10 bg-white/[0.03] text-xs font-medium text-forge-1',
            'transition-all duration-200 ease-forge active:scale-[0.95]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <BookOpen size={13} aria-hidden />
          The rules
          {open ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
        </button>
      </div>

      {open && (
        <ol
          data-preparation-rule-list
          className="flex flex-col gap-2 border-t border-white/8 px-3 py-3 animate-fade-in"
        >
          {PREPARED_SPELL_RULES.map((rule, i) => (
            <li key={rule} className="flex gap-2.5 text-[11px] leading-relaxed text-forge-1">
              <span className="font-mono text-forge-2 shrink-0 tabular-nums">{i + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
          {PREPARED_SPELL_RULES.length === 0 && (
            /* Canon silent is a state worth SAYING. An empty list where five
               sentences belong reads as a rendering bug; this reads as what it
               is, and `toggle.test.ts` goes red on the same day. */
            <li className="text-[11px] text-forge-2">
              Your canon package carries no preparation rules, so there is nothing to quote here.
            </li>
          )}
        </ol>
      )}
    </div>
  )
}
