/* The open card, in the row, on the Combat tab.
 *
 * Combat Open Book slice 1 — and the whole of what Marcus asked for, in one
 * sentence of his own: "I just want that same build on the combat page so I
 * don't have to keep switching back and forth in order to truly grasp the
 * spells/abilities."
 *
 * ── IT OWNS ALMOST NOTHING, AND THAT IS THE DESIGN ──────────────────────────
 * The three bands are `EntryDetailPanel`, imported from `components/canon` and
 * NOT reimplemented — the same component the Grimoire has painted since Open
 * Book slice 3, given the same model. If the two screens ever disagree about a
 * spell it will be because the data disagreed, never because someone maintained
 * two layouts and only fixed one. That was the whole finding behind Gate 2: the
 * gap between the tabs was presentation, not data.
 *
 * The turn-specific half is `TurnCardActions`. This file is the seam between
 * them and a close button, and that is all it is.
 *
 * ── NO PORTAL, NO BACKDROP, NO SHEET ────────────────────────────────────────
 * It renders inline, in the document, under its own row. The bottom sheet it
 * replaces put the card over the list and took the row off screen, which is the
 * "switching back and forth" complaint wearing a different costume — he could
 * read the spell or see his turn, never both. */

import type { OptionDetail } from '../../lib/turn/detail'
import type { ErratumRulings } from '../../lib/errata-rulings'
import { EntryDetailPanel } from '../canon/EntryDetailPanel'
import { TurnCardActions } from './TurnCardActions'
import { NoteBand } from './NoteBand'

export interface InlineOptionCardProps {
  detail: OptionDetail
  /** How the table ruled on each erratum, read once by `TurnLive` and handed
   *  down — the same map the Rules flags band writes. */
  rulings?: ErratumRulings
  onRollDice?: (prefill: { notation: string; label: string }) => void
  onSpend?: () => void
  refusal?: string | null
  /** HIS OWN LINE ABOUT THIS OPTION — slice 3, and the one thing slice 1
   *  admitted it had not carried across from the sheet it unmounted. Undefined
   *  means he has not written one. */
  note?: string
  /** Saves that line. Absent with `note` absent → no band at all. */
  onSaveNote?: (text: string) => void
  onClose: () => void
}

export function InlineOptionCard({
  detail,
  rulings,
  onRollDice,
  onSpend,
  refusal = null,
  note,
  onSaveNote,
  onClose,
}: InlineOptionCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-bronze/30 bg-void-1">
      <EntryDetailPanel detail={detail.panel} rulings={rulings} />
      <TurnCardActions
        detail={detail}
        onRoll={onRollDice}
        onSpend={onSpend}
        refusal={refusal}
      />
      {/* ⑤ HIS OWN WORDS, UNDER CANON'S AND UNDER THE ROLLS. The sheet put the
          note last for a stated reason — "the rolls are what he came for" — and
          that reason is stronger here, not weaker: this card sits inside the
          list, so anything above the rolls pushes the rolls further from the
          row that was tapped. It renders nothing at all when there is neither a
          note nor a saver, so a card for an option he has never annotated is
          byte-identical to the slice-2 card. */}
      <NoteBand note={note} onSave={onSaveNote} />
      {/* THE SECOND DOOR OUT. Tapping the row again closes it too, and that is
          the one most thumbs will find — but a card this tall can leave its own
          row scrolled off the top, and a close that requires scrolling back up
          to reach is not a close. */}
      <button
        type="button"
        onClick={onClose}
        className="w-full border-t border-bronze/20 px-4 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-forge-2 transition-colors hover:text-gold"
      >
        Close
      </button>
    </div>
  )
}

export default InlineOptionCard
