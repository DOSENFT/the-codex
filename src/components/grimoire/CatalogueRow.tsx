/* One catalogue entry as a row: closed, it is a line; open, it is the sheet.
 *
 * Open Book slice 3. Replaces `GrimoireCard`, which knew only the sheet-shaped
 * `AbilityItem` pair and therefore could not draw the seventy-three things that
 * are not on his sheet.
 *
 * ── WHAT A ROW OWES THE READER, CLOSED ──────────────────────────────────────
 * Gate 1's guardrail is "what does this cost me" in two taps. One of those taps
 * is opening the row, so the closed row has to carry the cost already — the
 * word, in the colour of its slot. Everything else on the closed line is there
 * to let him find the row: the name, what it is, and whether it is locked.
 *
 * ── NOTHING THE OLD CARD DID IS DROPPED ─────────────────────────────────────
 * `GrimoireCard` carried a dice roll, the prepared tick, use tracking, copy,
 * edit and delete. All six are still here, on the same callbacks `GrimoirePage`
 * already wires, because slice 3 replaces a PRESENTATION and Marcus's first
 * instruction about a consolidation was "without losing any features". The
 * prepared tick becomes a real rule in slice 5; until then it behaves exactly
 * as it did, and is offered on exactly the entries it could act on before.
 *
 * ── THE LOCK ────────────────────────────────────────────────────────────────
 * `data-lock-chip` moves here from `GrimoirePage.tsx`, where slice 1 left it
 * with a comment saying so. The attribute name is unchanged on purpose: the
 * phase's browser check **B** counts those chips geometrically, and renaming it
 * would turn a passing proof into a vacuous one. */

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Copy, Dices, Lock, Minus, Pencil, Plus, Shield, Sparkles, Star, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CatalogueEntry } from '../../lib/catalogue/types'
import type { EntryDetail } from '../../lib/catalogue/detail'
import type { ErratumRulings } from '../../lib/errata-rulings'
import type { PrepareRefusal as Refusal } from '../../lib/prepare/toggle'
import { EntryDetailPanel } from './EntryDetailPanel'
import { PrepareRefusal } from './PrepareRefusal'

export interface CatalogueRowProps {
  entry: CatalogueEntry
  detail: EntryDetail
  expanded: boolean
  mode: 'session' | 'prep'
  rulings?: ErratumRulings
  /** Read off `character.features` by the page; the catalogue does not carry
   *  charges because a charge is sheet STATE and the catalogue is a list of
   *  what exists. Null for anything that has no uses to track. */
  uses?: { current: number; max: number } | null
  onToggleExpand: () => void
  onRollDice: (notation: string, label: string) => void
  onTogglePrepared?: () => void
  /** Set by the page when the last press of Prepare on THIS row was refused.
   *  Slice 5 — the rule that refused, so it can be shown where he pressed. */
  refusal?: Refusal | null
  onExpendUse?: () => void
  onRestoreUse?: () => void
  onEdit?: () => void
  onDelete?: () => void
  /** A choice this particular entry carries, rendered below everything else.
   *
   *  Slice 6, and it is one slot rather than a `fightingStyle` prop on purpose:
   *  a row that knew about Fighting Styles would have to learn about every
   *  future choice too, and this component's whole job is to be the SAME row
   *  for all 84 entries. What goes in here is the page's business. */
  extra?: ReactNode
}

/* The closed row's cost word comes from `entry.turnCost` rather than from
 * `detail.cost`, so that the word on the row and the chip in the filter bar can
 * never disagree — they are the same field. `detail.cost` is canon's fuller
 * phrasing and belongs in band 1, where there is room for it. */
const COST_WORD: Record<CatalogueEntry['turnCost'], string> = {
  action: 'Action',
  bonus: 'Bonus',
  reaction: 'Reaction',
  passive: 'Always',
  other: '',
}

const COST_COLOUR: Record<CatalogueEntry['turnCost'], string> = {
  action: 'text-arcane-lit',
  bonus: 'text-ember-lit',
  reaction: 'text-eldritch-lit',
  passive: 'text-verdant',
  other: 'text-forge-2',
}

function KindIcon({ entry }: { entry: CatalogueEntry }) {
  if (entry.kind === 'spell') return <Sparkles size={14} className="text-arcane" aria-hidden />
  if (entry.kind === 'feat') return <Star size={14} className="text-gold" aria-hidden />
  return <Shield size={14} className="text-eldritch-lit" aria-hidden />
}

export function CatalogueRow({
  entry,
  detail,
  expanded,
  mode,
  rulings,
  uses = null,
  onToggleExpand,
  onRollDice,
  onTogglePrepared,
  refusal = null,
  onExpendUse,
  onRestoreUse,
  onEdit,
  onDelete,
  extra = null,
}: CatalogueRowProps) {
  const [copied, setCopied] = useState(false)
  const locked = entry.lockedUntil !== null

  const handleCopy = () => {
    // Canon's paragraph, not the sheet's summary — what he pastes into a table
    // chat should be the same words the app just showed him.
    navigator.clipboard?.writeText(`${detail.title}\n${detail.bands.whatItDoes}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      data-catalogue-entry={entry.key}
      data-locked={locked ? entry.lockedUntil! : undefined}
      className={cn(
        'overflow-hidden rounded-xl border transition-all duration-200 ease-forge',
        expanded ? 'border-arcane/30 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]',
        /* Dimmed, not hidden, and only while CLOSED. Open, a locked entry is
           drawn at full contrast: Marcus asked for "visually locked, but still
           provide me the ability to see them and their details", and details he
           has to squint at are not details he was given. */
        locked && !expanded && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <KindIcon entry={entry} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('truncate text-sm font-semibold', locked ? 'text-forge-1' : 'text-forge-0')}>
              {entry.name}
            </span>
            {locked && (
              <span
                data-lock-chip={entry.lockedUntil!}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-bronze/50 px-1.5 py-px text-[10px] font-semibold text-forge-2"
              >
                <Lock size={9} aria-hidden />
                Level {entry.lockedUntil}
              </span>
            )}
            {entry.alwaysPrepared && (
              <span className="rounded border border-arcane/50 bg-arcane/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-arcane-lit">
                Always
              </span>
            )}
            {!entry.alwaysPrepared && entry.prepared && (
              <span className="rounded border border-verdant/50 bg-verdant/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-verdant">
                Prepared
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-forge-2">{detail.subtitle}</span>
        </span>

        {COST_WORD[entry.turnCost] && (
          <span className={cn('shrink-0 text-[11px] font-semibold', COST_COLOUR[entry.turnCost])}>
            {COST_WORD[entry.turnCost]}
          </span>
        )}
        {expanded
          ? <ChevronUp size={15} className="shrink-0 text-forge-2" aria-hidden />
          : <ChevronDown size={15} className="shrink-0 text-forge-2" aria-hidden />}
      </button>

      {expanded && (
        <>
          <EntryDetailPanel detail={detail} rulings={rulings} />

          {/* ── the things a row can DO ─────────────────────────────────────
                 Below the three bands, deliberately: the bands are what he came
                 for, and a button above them would push band 1 down past the
                 fold that Gate 1 protects. */}
          <div className="flex flex-wrap items-center gap-2 border-t border-bronze/20 px-3 py-2.5">
            {detail.hero && (
              <button
                type="button"
                onClick={() => onRollDice(detail.hero!.dice, `${entry.name}${detail.hero!.note ? ` (${detail.hero!.note})` : ''}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-arcane/45 bg-arcane/10 px-2.5 py-1.5 text-xs font-semibold text-arcane-lit"
              >
                <Dices size={13} aria-hidden />
                Roll {detail.hero.dice}
              </button>
            )}

            {onTogglePrepared && (
              <button
                type="button"
                onClick={onTogglePrepared}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold',
                  entry.prepared
                    ? 'border-verdant/50 bg-verdant/10 text-verdant'
                    : 'border-white/10 text-forge-2',
                )}
              >
                <Star size={13} aria-hidden />
                {entry.prepared ? 'Prepared' : 'Prepare'}
              </button>
            )}

            {/* The refusal sits on its OWN row inside the flex-wrap — `w-full`
                on the card forces the wrap — so the rule text is never squeezed
                into whatever width is left beside the buttons. Browser check E
                has to see the sentence, and a sentence three characters wide is
                on screen without being readable. */}
            {refusal && <PrepareRefusal refusal={refusal} />}

            {/* Locked entries say why the button is absent rather than simply
                not having one — an empty space is indistinguishable from a bug. */}
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bronze/40 px-2.5 py-1.5 text-xs text-forge-2">
                <Lock size={12} aria-hidden />
                Can't prepare until level {entry.lockedUntil}
              </span>
            )}

            {uses && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1">
                <button
                  type="button"
                  onClick={onExpendUse}
                  disabled={!onExpendUse || uses.current === 0}
                  aria-label={`Spend a use of ${entry.name}`}
                  className="text-forge-2 disabled:opacity-30"
                >
                  <Minus size={13} aria-hidden />
                </button>
                <span className="font-mono text-xs tabular-nums text-forge-0">
                  {uses.current}/{uses.max}
                </span>
                <button
                  type="button"
                  onClick={onRestoreUse}
                  disabled={!onRestoreUse || uses.current >= uses.max}
                  aria-label={`Restore a use of ${entry.name}`}
                  className="text-forge-2 disabled:opacity-30"
                >
                  <Plus size={13} aria-hidden />
                </button>
              </span>
            )}

            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy ${entry.name}`}
                className="rounded-lg p-1.5 text-forge-2"
              >
                <Copy size={13} aria-hidden />
              </button>
              {copied && <span className="text-[10px] text-verdant">Copied</span>}
              {mode === 'prep' && onEdit && (
                <button type="button" onClick={onEdit} aria-label={`Edit ${entry.name}`} className="rounded-lg p-1.5 text-forge-2">
                  <Pencil size={13} aria-hidden />
                </button>
              )}
              {mode === 'prep' && onDelete && (
                <button type="button" onClick={onDelete} aria-label={`Delete ${entry.name}`} className="rounded-lg p-1.5 text-forge-2">
                  <Trash2 size={13} aria-hidden />
                </button>
              )}
            </span>
          </div>

          {/* Below the action strip, not above it. The strip is one line of
              chrome; `extra` is a block. Putting the block first would push
              Copy, Edit and Delete off the bottom of a phone for the one entry
              that has an `extra`, which is losing a feature to add one. */}
          {extra}
        </>
      )}
    </div>
  )
}
