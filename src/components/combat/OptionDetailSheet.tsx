import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import type { OptionDetail } from '../../lib/turn/detail'
import type { RollOffer } from '../../lib/turn/rolls'
import { rulingFor, type ErratumRulings } from '../../lib/errata-rulings'
import { leadGap } from '../../lib/canon/tactics'

/* ============================================================================
   THE OPTION DETAIL SHEET — Table Truth slice 7. This is where the "…" dies.

   One tap on a row, four bands, always the same four in the same order:

       ┌──────────────────────────────────────────┐
       │ Divine Smite                     close ✕ │
       │ 1st slot · Paladin                       │   ← header
       ├──────────────────────────────────────────┤
       │ Cast   Bonus Action, immediately after…  │   ① the numbers
       │ Damage 2d8 Radiant · +1d8 Fiend/Undead   │
       ├──────────────────────────────────────────┤
       │ WHAT IT DOES                             │   ② canon, WHOLE
       │ When you hit with a melee weapon…        │
       ├──────────────────────────────────────────┤
       │ [2d8 ] [4d8    ] [Spend  ]               │   ③ the rolls
       │ [dmg ] [on crit] [1st slot]              │
       │ ⚑ One slot per turn — live               │
       ├──────────────────────────────────────────┤
       │ HOW TO USE IT                        ▾   │   ④ folded
       └──────────────────────────────────────────┘

   WHY THE ORDER NEVER CHANGES. A player mid-turn is not reading, they are
   LOOKING. Four bands that never move mean the eye learns one shape once. A
   layout that reorders per option is the same information and is unusable at
   speed. So a band with nothing to say still holds its place.

   WHY BAND 4 IS FOLDED AND THE OTHERS ARE NOT. Canon's tactics run to 2,462
   characters. Open by default it would push the rolls off the bottom of the
   screen, and the rolls are what you came for. Folded, it is one tap away —
   and it is the only band that is advice rather than fact.

   WHY THIS FILE HAS NO `slice(0, n)` ANYWHERE. That is the entire point of the
   slice. `OptionDetail` arrives complete from `detail.ts` and every string in
   it is painted whole. There is no budget here and no ellipsis, because there
   is no width to fit — the sheet scrolls.

   WORKS WITH THE AI OFF AND THE WIFI OFF. Nothing below fetches. The only
   state in this component is whether band 4 is folded.
   ========================================================================= */

export interface OptionDetailBodyProps {
  detail: OptionDetail
  onClose: () => void
  /** Hands a roll to the app's dice roller. Absent in tests and in any caller
   *  that has no roller — the buttons then render as plain, inert facts rather
   *  than vanishing, because the NOTATION is useful even unclickable. */
  onRoll?: (prefill: { notation: string; label: string }) => void
  /** Spends the cost. Absent → the button is not painted at all: unlike a
   *  notation, a "Spend" control that cannot spend is purely a lie. */
  onSpend?: () => void
  /** Why the last spend was refused, or null. Slice 10c.
   *
   *  The rules engine refuses; nothing painted the reason anywhere the player
   *  could see it. It belongs HERE, directly under the button that was pressed
   *  — a refusal shown anywhere else is a message about a tap the player has
   *  already stopped thinking about. */
  refusal?: string | null
  /** Band 4 starts open only in tests that need to read it. */
  tacticsOpen?: boolean
  /** HIS OWN LINE ABOUT THIS OPTION — slice 8d-3. Undefined means he has not
   *  written one; empty string is normalised to undefined by `noteFor`, so this
   *  is never `''` and no caller has to decide what a blank means. */
  note?: string
  /** Saves that line. Absent and `note` absent → band 5 is not painted at all,
   *  which keeps the inert render the design shoot measures byte-identical to
   *  the sheet that shipped before this slice. Absent with a `note` present →
   *  his words are painted read-only, on the same rule as `onRoll`: the FACT is
   *  worth showing even where the control cannot act. */
  onSaveNote?: (text: string) => void
  /** How the table ruled on each erratum — slice 8. Defaults to none recorded,
   *  which is also what every caller passed before this prop existed, so the
   *  band degrades to exactly its slice-7 reading plus "not ruled on yet". */
  rulings?: ErratumRulings
}

const BAND = 'border-b border-bronze/20 px-4 py-3'

/* Deliberately carries NO colour. Two Tailwind colour utilities on one element
 * are resolved by stylesheet order, not by the order they appear in the class
 * attribute, so `${LABEL} text-ember` is a coin flip rather than an override.
 * Each caller states its own ink. */
const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-wider'

function RollButton({
  offer,
  onRoll,
}: {
  offer: RollOffer
  onRoll?: (p: { notation: string; label: string }) => void
}) {
  const face = (
    <>
      <span className="font-mono text-sm font-semibold text-forge-0">{offer.notation}</span>
      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-forge-2">
        {offer.label}
      </span>
    </>
  )

  if (!onRoll) {
    return (
      <span className="min-w-[72px] rounded-lg border border-bronze/30 bg-void-2/50 px-3 py-2 text-center">
        {face}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onRoll({ notation: offer.notation, label: offer.label })}
      className="min-w-[72px] rounded-lg border border-bronze/30 bg-void-2/50 px-3 py-2 text-center transition-colors hover:border-gold/50"
    >
      {face}
    </button>
  )
}

/* ── ⑤ Your note ────────────────────────────────────────────────────────────
   The one band on this sheet that canon did not write. Slice 8d-3.

   IT IS ADDITIVE AND V0.9's WAS AN OVERRIDE, WHICH IS A DELIBERATE DEPARTURE.
   `TurnSummary`'s `customTip` REPLACED a one-line auto-generated `strategicTip`,
   and replacing one line with one line is fair. This sheet has no such line —
   band ④ is canon's whole tactics text, thousands of characters of it — so
   inheriting the override would mean his one sentence hiding all of it. His
   words go BESIDE canon's. The stored field is still `customTip`, so this is a
   decision about painting and not a migration, and it is reversible in one
   component if he ever wants the override back.

   IT IS LAST FOR THE SAME REASON BAND ④ IS FOLDED. The order of the bands is
   the feature (see the header) and the rolls are what he came for. A note is
   the least urgent thing on the sheet and the only thing he is guaranteed to
   already know, so it sits under everything and moves nothing above it. */
function NoteBand({ note, onSave }: { note?: string; onSave?: (text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  /* Nothing written and nowhere to write it — the band does not exist, so the
     read-only render is exactly the sheet that shipped before this slice. */
  if (!note && !onSave) return null

  const open = () => {
    /* Seeded HERE and not from `useState(note)`: this component instance
       survives the sheet being pointed at a different option, and an initialiser
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
              {/* V0.9's accessible name to the byte (`TurnSummary.tsx:824`).
                  The `action-notes` pin was written against that string in
                  slice 1, before this sheet could show a note at all; a pin
                  re-pointed at whatever the new code says has stopped being a
                  pin, so the app moves to meet it. It is also the visible text,
                  not just the label, so the two cannot disagree. */}
              Edit strategic tip
            </button>
          )}
        </>
      )}
    </div>
  )
}

/** The sheet's contents, as a pure function of its props.
 *
 *  Split out from the `Sheet` wrapper deliberately: `Sheet` portals into
 *  `document.body`, so it cannot render in the node test environment at all.
 *  Keeping the whole of the actual layout in a plain component means every band
 *  below is covered by a real render test rather than by a browser prover
 *  alone. */
export function OptionDetailBody({
  detail,
  onClose,
  onRoll,
  onSpend,
  refusal = null,
  tacticsOpen = false,
  rulings = {},
  note,
  onSaveNote,
}: OptionDetailBodyProps) {
  const [showTactics, setShowTactics] = useState(tacticsOpen)

  return (
    <div className="pb-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={BAND}>
        <div className="flex items-baseline gap-2">
          <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-forge-0">
            {detail.title}
          </h2>
          {detail.provenance === 'sheet' && (
            /* Homebrew is not a lesser citizen — but the player is entitled to
               know whose words he is reading before he quotes them at a DM. */
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ember">
              your own
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-mono text-xs text-forge-2 hover:text-forge-0"
          >
            close ✕
          </button>
        </div>
        {detail.subtitle && (
          <p className="mt-1 font-mono text-[11px] text-forge-1">{detail.subtitle}</p>
        )}
      </div>

      {/* ── ① The numbers ───────────────────────────────────────────────── */}
      <dl className={BAND}>
        {detail.facts.map((fact, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <dt className="w-24 shrink-0 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-forge-2">
              {fact.label ?? ''}
            </dt>
            <dd className="min-w-0 flex-1 text-xs leading-relaxed text-forge-0">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* ── ② What it does — the whole paragraph ────────────────────────── */}
      <div className={BAND}>
        <span className={`${LABEL} text-forge-2`}>What it does</span>
        <p className="mt-1.5 text-sm leading-relaxed text-forge-0">{detail.whatItDoes}</p>
      </div>

      {/* ── ③ The rolls ─────────────────────────────────────────────────── */}
      {(detail.rolls.length > 0 || detail.spend) && (
        <div className={BAND}>
          <span className={`${LABEL} text-forge-2`}>Roll from here</span>
          {/* Canon HEARTH-04 — slice 10d. ABOVE the button, not below it: the
              refusal underneath answers a press that already happened, and this
              one has to be read before the press that would destroy a pool.
              `role="status"`, because it is drawn the moment the sheet opens and
              is not a response to anything the player just did. */}
          {detail.spendWarning && (
            <p
              role="status"
              className="mt-2 border-l-2 border-l-ember bg-ember/5 py-1.5 pl-2 text-xs leading-relaxed text-forge-0"
            >
              <span className={`${LABEL} text-ember`}>⚑ Replaces</span>
              {detail.spendWarning}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.rolls.map(offer => (
              <RollButton key={offer.key} offer={offer} onRoll={onRoll} />
            ))}
            {detail.spend && onSpend && (
              <button
                type="button"
                onClick={onSpend}
                className="min-w-[72px] rounded-lg border border-ember/50 bg-ember/10 px-3 py-2 text-center"
              >
                <span className="font-mono text-sm font-semibold text-ember">Spend</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-ember/70">
                  {detail.spend.label}
                </span>
              </button>
            )}
          </div>
          {/* THE REFUSAL — slice 10c. Inside band ③, under the button, because
              this sentence is the reducer answering the tap that produced it.
              `role="alert"` so it is announced rather than merely drawn: the
              button does not visibly change on a refusal, and a screen that
              looks identical after a press is the failure this sentence is
              here to prevent. */}
          {refusal && (
            <p
              role="alert"
              className="mt-2 border-l-2 border-l-ember bg-ember/5 py-1.5 pl-2 text-xs leading-relaxed text-forge-0"
            >
              <span className={`${LABEL} text-ember`}>⚑ Not spent</span>
              {refusal}
            </p>
          )}
        </div>
      )}

      {/* ── ③b The live rule ────────────────────────────────────────────── */}
      {detail.ruleBox && (
        <div
          className={`${BAND} border-l-2 ${
            detail.ruleBox.tone === 'blocked' ? 'border-l-ember bg-ember/5' : 'border-l-gold'
          }`}
        >
          <span className={`${LABEL} text-ember`}>
            ⚑ {detail.ruleBox.tone === 'blocked' ? 'Not this turn' : 'One slot per turn'}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-forge-0">{detail.ruleBox.text}</p>
        </div>
      )}

      {/* ── ③c What canon says is wrong with this, and how you ruled it ───
             Slice 8 upgraded this band from `id + problem`. What it adds is
             not more canon — the full record lives in the Rules flags band,
             which is its home, and repeating 800 characters of it here would
             bury the rolls. What it adds is the OPERATIVE rule: if the table
             has ruled, that ruling governs, and mid-combat it is the only part
             of the record that changes what Marcus does next.

             So: the fault, whole, as before; then one line saying how it was
             answered. Unanswered says so, because "we never asked" is a fact
             worth having at the moment the feature comes up. */}
      {detail.errata.length > 0 && (
        <div className={BAND}>
          <span className={`${LABEL} text-ember`}>
            ⚑ Canon lists {detail.errata.length} errat
            {detail.errata.length === 1 ? 'um' : 'a'} on this feature
          </span>
          <ul className="mt-1.5 flex flex-col gap-2">
            {detail.errata.map(e => {
              const ruling = rulingFor(rulings, e.id)
              return (
                <li key={e.id} className="text-xs leading-relaxed text-forge-1">
                  <span className="font-mono text-[10px] text-forge-2">{e.id}</span> {e.problem}
                  {ruling.status === 'unasked' && (
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-forge-2">
                      not ruled on yet
                    </span>
                  )}
                  {ruling.status === 'canon' && (
                    <span className="mt-1 block text-[11px] leading-relaxed text-gold">
                      <b className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        Your table follows canon's fix
                      </b>
                      {e.recommendedFix ? ` — ${e.recommendedFix}` : ''}
                    </span>
                  )}
                  {ruling.status === 'dm' && (
                    <span className="mt-1 block text-[11px] leading-relaxed text-arcane">
                      <b className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        Your DM ruled
                      </b>
                      {/* No wording is still a ruling — it means the table
                          settled it and nobody wrote down how. Saying "ruled,
                          wording not recorded" beats printing a bare heading
                          over nothing. */}
                      {ruling.dmWording ? ` — ${ruling.dmWording}` : ' — wording not recorded'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── ④ How to use it — folded ────────────────────────────────────── */}
      {detail.tactics.length > 0 && (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShowTactics(v => !v)}
            className="flex w-full items-center gap-2 py-1 text-left"
            aria-expanded={showTactics}
          >
            <span className={`${LABEL} text-gold`}>How to use it</span>
            <span className="ml-auto font-mono text-xs text-forge-2">
              {showTactics ? '▾' : '▸'}
            </span>
          </button>
          {showTactics && (
            <ul className="mt-2 flex flex-col gap-2.5">
              {detail.tactics.map((bullet, i) => (
                <li
                  key={i}
                  className="relative pl-3.5 text-[13px] leading-relaxed text-forge-0 before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-gold"
                >
                  {bullet.lead && <b className="font-semibold text-arcane">{bullet.lead}</b>}
                  {/* The dash/colon rule moved to `canon/tactics.ts` in Open
                      Book slice 3, when the Grimoire became the second screen
                      drawing band 3. It was inline here and correct; two copies
                      of it would not have stayed correct. */}
                  {leadGap(bullet)}
                  {bullet.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── ⑤ Your note ─────────────────────────────────────────────────── */}
      <NoteBand note={note} onSave={onSaveNote} />
    </div>
  )
}

export interface OptionDetailSheetProps extends OptionDetailBodyProps {
  isOpen: boolean
}

/** The sheet itself: the shared overlay primitive plus the body above.
 *  `Sheet` owns Escape, the focus trap and the portal — see its header. */
export function OptionDetailSheet({ isOpen, ...body }: OptionDetailSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={body.onClose} label={body.detail.title} side="bottom" z={60}>
      <OptionDetailBody {...body} />
    </Sheet>
  )
}
