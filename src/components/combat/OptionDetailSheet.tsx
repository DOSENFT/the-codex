import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import type { OptionDetail } from '../../lib/turn/detail'
import type { RollOffer } from '../../lib/turn/rolls'

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
  /** Band 4 starts open only in tests that need to read it. */
  tacticsOpen?: boolean
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
  tacticsOpen = false,
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

      {/* ── ③c What canon says is wrong with this ───────────────────────── */}
      {detail.errata.length > 0 && (
        <div className={BAND}>
          <span className={`${LABEL} text-ember`}>
            ⚑ Canon lists {detail.errata.length} errat
            {detail.errata.length === 1 ? 'um' : 'a'} on this feature
          </span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {detail.errata.map(e => (
              <li key={e.id} className="text-xs leading-relaxed text-forge-1">
                <span className="font-mono text-[10px] text-forge-2">{e.id}</span> {e.problem}
              </li>
            ))}
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
                  {bullet.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
