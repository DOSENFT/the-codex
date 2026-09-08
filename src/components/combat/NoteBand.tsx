/* HIS OWN LINE ABOUT AN ACTION. Combat Open Book slice 3.
 *
 * ── WHY IT MOVED HERE ───────────────────────────────────────────────────────
 * It was declared privately inside `OptionDetailSheet.tsx`, which is the file
 * slice 8 deletes. Slice 1 replaced the sheet with an inline card and carried
 * across everything EXCEPT this band, so from slice 1 until now his notes were
 * not shown on the Combat tab at all — not deleted (nothing on that path writes
 * to `codex-action-notes-*`), but not visible, which is the same thing to the
 * man holding the phone.
 *
 * So the band comes out of the dying file intact rather than being rewritten
 * inside the new one. `OptionDetailSheet` imports it and renders it exactly
 * where it did, so every existing sheet test still describes the sheet, and the
 * card gains the band without a second implementation of it existing for even
 * one slice.
 *
 * ── WHAT WAS NOT ALLOWED TO CHANGE IN THE MOVE ──────────────────────────────
 * The string "Edit strategic tip" is V0.9's accessible name to the byte
 * (`TurnSummary.tsx:824`) and there is a pin written against it. A pin
 * re-pointed at whatever the new code happens to say has stopped being a pin,
 * so the app moves to meet the pin and never the reverse.
 *
 * ── THE TWO DECISIONS THE BAND CARRIES, RESTATED SO THE MOVE DOES NOT LOSE THEM
 * IT IS ADDITIVE, AND V0.9's WAS AN OVERRIDE. `TurnSummary`'s `customTip`
 * REPLACED a one-line auto-generated `strategicTip`, and one line for one line
 * is fair. There is no such line here — band ③ is canon's whole tactics text —
 * so inheriting the override would mean his one sentence hiding all of it. His
 * words go BESIDE canon's. The stored field is still `customTip`, so this is a
 * decision about painting, not a migration, and it is reversible in one file.
 *
 * IT IS LAST. The order of the bands is the feature and the rolls are what he
 * came for. A note is the least urgent thing on the card and the only thing on
 * it he is guaranteed to already know, so it sits under everything and moves
 * nothing above it. */

import { useState } from 'react'

/* Deliberately carries NO colour — two Tailwind colour utilities on one element
 * are resolved by stylesheet order, not by the order they appear in the class
 * attribute, so `${LABEL} text-gold` would be a coin flip rather than an
 * override. The caller states its own ink. Duplicated from
 * `OptionDetailSheet.tsx` rather than imported FROM it, because that file is
 * what slice 8 deletes and an import would point the new card at a corpse. */
const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-wider'

export interface NoteBandProps {
  /** Undefined means he has not written one. Empty string is normalised to
   *  undefined by `noteFor`, so this is never `''` and no caller has to decide
   *  what a blank means. */
  note?: string
  /** Absent and `note` absent → the band is not painted at all. Absent WITH a
   *  note → his words are painted read-only, on the same rule as `onRoll`: the
   *  FACT is worth showing even where the control cannot act. */
  onSave?: (text: string) => void
}

export function NoteBand({ note, onSave }: NoteBandProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  /* Nothing written and nowhere to write it — the band does not exist. */
  if (!note && !onSave) return null

  const open = () => {
    /* Seeded HERE and not from `useState(note)`: this component instance
       survives the card being pointed at a different option, and an initialiser
       would hand him the last option's words to edit. */
    setDraft(note ?? '')
    setEditing(true)
  }

  return (
    <div className="px-4 py-3">
      <span className={`${LABEL} text-gold`}>Your note</span>
      {editing && onSave ? (
        <>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label="Your strategic tip for this action"
            placeholder="Write a custom strategic tip..."
            rows={3}
            className="mt-2 w-full rounded-lg border border-bronze/30 bg-void-2/50 px-3 py-2 text-[13px] leading-relaxed text-forge-0"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-bronze/30 px-3 py-1.5 text-xs text-forge-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onSave(draft); setEditing(false) }}
              className="rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-semibold text-gold"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          {/* The placeholder is deliberate. An empty band and a band that has
              lost his note look identical, and only one of those is fine. */}
          <p className={`mt-1 text-[13px] leading-relaxed ${note ? 'text-forge-0' : 'text-forge-2 italic'}`}>
            {note ?? 'No strategic tip — tap edit to add one'}
          </p>
          {onSave && (
            <button
              type="button"
              onClick={open}
              className="mt-2 rounded-lg border border-bronze/30 px-3 py-1.5 text-xs text-forge-2"
            >
              {/* V0.9's accessible name to the byte. It is also the visible
                  text, not just the label, so the two cannot disagree. */}
              Edit strategic tip
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default NoteBand
