import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ErratumScope, ErratumBlockKind } from '../../lib/canon/errata'
import { erratumBlocks, erratumFeatureName } from '../../lib/canon/errata'
import type { ErratumRulings, RulingStatus } from '../../lib/errata-rulings'
import { rulingFor, unansweredCount } from '../../lib/errata-rulings'

/* ============================================================================
   WHAT CANON SAYS IS BROKEN — Table Truth slice 8.

   ── THE HOLE THIS FILLS ─────────────────────────────────────────────────────
   Canon ships twelve `HEARTH-##` records, each naming a place where the Oath of
   the Hearth does not work as written. Before this file the Play tab said one
   thing about them, in the option detail sheet: "⚑ Canon lists 4 errata on this
   feature", followed by the `problem` line and nothing else. No fix, no app
   note, no reasoning, and — the part that mattered — no way to answer any of
   them. A flag you cannot answer is a flag you re-read every session.

   ── WHY THE BAND IS THE HOME AND THE SHEET IS THE SHORTCUT ──────────────────
   Checked before building rather than after (the finding-AB lesson). Two of the
   six errata live for Nix reach no turn option at all: Aura of Solace is
   passive, so no row is ever composed for it, and HEARTH-08 is filed under
   "Oath Spells", which is a CATEGORY and not a feature name any row carries. If
   the detail sheet were the only home, those two would be unreachable — pinned
   by a test in `errata.test.ts` so the day someone adds an "Oath Spells" row it
   says so instead of quietly changing which surface carries the flag.

   ── ONE TAP, NOT TWO, AND THE ANSWER IS NEVER BEHIND ONE ────────────────────
   The live six run to 4,557 characters. Painted whole, the band would be five
   screens of prose with the thing Marcus is meant to DO buried at the bottom of
   each one. So each erratum shows its fault in full — never an ellipsis, that
   is the phase's whole point — and canon's fix, the app note and canon's
   reasoning sit behind a tap on the row itself. The three-way ruling control is
   NOT behind that tap: the caption promises "6 still unanswered" and a caption
   that costs six taps to act on is a nag rather than a to-do list.

   ── NOTHING HERE IS ENFORCED ────────────────────────────────────────────────
   Reading this band changes no rule and spends nothing. It writes one key,
   `codex-errata-${characterId}`, and only when Marcus taps a ruling. Canon's
   own instruction on HEARTH-01 is the reason the default is "not asked yet"
   rather than "canon's fix": *"Do not silently implement either version.
   Present the conflict to the player."* Acting on a ruling is slice 8b, and it
   is deliberately scoped AFTER his DM has ruled — the app must not enforce a
   house rule before the house has ruled.

   ── STATE IS PASSED IN, NOT READ ────────────────────────────────────────────
   Scopes and rulings arrive as props, like `ReactionsBand` and `ContentionBand`
   before it, so the whole band renders under `renderToStaticMarkup` and is
   tested without a DOM. The two pieces of state that ARE local — which erratum
   is expanded, and the draft in the DM textarea — are local on purpose: neither
   is a preference worth persisting, and a draft that autosaves on every
   keystroke would write storage once per character typed.
   ========================================================================= */

const SEVERITY_INK: Record<string, string> = {
  BREAKING: 'text-ember',
  HIGH: 'text-ember',
  MEDIUM: 'text-gold',
  LOW: 'text-forge-2',
}

/* Per-kind ink, so the eye can tell the bad news from the remedy from the note
   about this app without reading the headings. Kept as data rather than a
   ternary in the JSX because `ErratumBlockKind` is a nine-member union and a
   partial map here would paint an unstyled heading the day canon starts
   emitting a field none of the twelve carry today. */
const BLOCK_INK: Record<ErratumBlockKind, string> = {
  problem: 'text-ember',
  cause: 'text-forge-2',
  recommendedFix: 'text-gold',
  narrowerAlternative: 'text-gold',
  appAction: 'text-arcane',
  comparison: 'text-forge-2',
  assessment: 'text-forge-2',
  mitigatingFactor: 'text-forge-2',
  note: 'text-forge-2',
}

const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-wider'

function Block({ kind, label, text }: { kind: ErratumBlockKind; label: string; text: string }) {
  return (
    <div className="mt-2">
      <span className={`${LABEL} ${BLOCK_INK[kind]}`}>{label}</span>
      <p className="mt-1 text-xs leading-relaxed text-forge-0">{text}</p>
    </div>
  )
}

/** Where the level came from, said out loud.
 *
 *  Not decoration. The sheet and canon can disagree — a DM who granted a
 *  feature early makes the sheet right and canon's parenthetical wrong — and a
 *  player about to argue a rule at the table is entitled to know which of the
 *  two the app believed before he quotes it. */
function levelNote(scope: ErratumScope): string {
  if (scope.levelSource === 'sheet') return `level ${scope.featureLevel} · your sheet`
  if (scope.levelSource === 'canon') return `level ${scope.featureLevel} · canon`
  return 'level unknown — shown anyway'
}

const CHOICES: { status: RulingStatus; label: string }[] = [
  { status: 'unasked', label: 'Not asked yet' },
  { status: 'canon', label: "Canon's fix" },
  { status: 'dm', label: 'My DM ruled' },
]

function RulingControl({
  erratumId,
  rulings,
  onRule,
}: {
  erratumId: string
  rulings: ErratumRulings
  onRule: (erratumId: string, status: RulingStatus, dmWording?: string) => void
}) {
  const ruling = rulingFor(rulings, erratumId)
  const [draft, setDraft] = useState(ruling.dmWording ?? '')

  return (
    <div className="mt-2.5 border-t border-bronze/20 pt-2">
      <span className={`${LABEL} text-forge-2`}>How your table ruled it</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`Ruling for ${erratumId}`}>
        {CHOICES.map(choice => {
          const on = ruling.status === choice.status
          return (
            <button
              key={choice.status}
              type="button"
              aria-pressed={on}
              /* The draft rides along on every choice, which is what makes
                 `setRuling`'s carry-the-wording behaviour reachable: typing a
                 DM ruling and then tapping "Canon's fix" keeps the words for
                 the day he taps back. */
              onClick={() => onRule(erratumId, choice.status, draft || undefined)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                on
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : 'border-bronze/30 bg-void-2/50 text-forge-2 hover:border-gold/40'
              }`}
            >
              {choice.label}
            </button>
          )
        })}
      </div>

      {ruling.status === 'dm' && (
        <div className="mt-2">
          <label className={`${LABEL} text-forge-2`} htmlFor={`dm-${erratumId}`}>
            In your DM's words
          </label>
          <textarea
            id={`dm-${erratumId}`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            /* Committed on blur, not per keystroke. A ruling is a sentence, and
               a sentence is forty writes to disk if every character saves. */
            onBlur={() => onRule(erratumId, 'dm', draft)}
            rows={2}
            placeholder="e.g. the cloak fires once per round, my call"
            className="mt-1 w-full rounded-lg border border-bronze/30 bg-void-2/50 px-2 py-1.5 text-xs leading-relaxed text-forge-0 placeholder:text-forge-2/60"
          />
        </div>
      )}

      {ruling.status === 'canon' && ruling.dmWording && (
        /* Kept, not shown as a ruling: he switched to canon's printed fix, so
           canon's fix is what governs. But the words are still on disk and
           saying so beats him wondering whether they were thrown away. */
        <p className="mt-1.5 text-[11px] leading-snug text-forge-2">
          Your DM's earlier wording is kept, in case you switch back.
        </p>
      )}
    </div>
  )
}

export interface ErrataBandProps {
  /** Errata on features the character has TODAY, worst first. */
  live: ErratumScope[]
  /** Errata on features not yet reached, soonest first. */
  later: ErratumScope[]
  rulings: ErratumRulings
  isOpen: boolean
  onToggle: () => void
  onRule: (erratumId: string, status: RulingStatus, dmWording?: string) => void
  /** Tests and provers only — the ids to render already expanded. Same reason
   *  `OptionDetailBody` takes `tacticsOpen`: a fold that can only be opened by
   *  a click is a fold no static render can read. */
  initiallyExpanded?: readonly string[]
  /** Likewise for the "arrives as you level" fold. */
  laterOpen?: boolean
}

export function ErrataBand({
  live,
  later,
  rulings,
  isOpen,
  onToggle,
  onRule,
  initiallyExpanded = [],
  laterOpen = false,
}: ErrataBandProps) {
  const [expanded, setExpanded] = useState<string[]>([...initiallyExpanded])
  const [showLater, setShowLater] = useState(laterOpen)

  const unanswered = unansweredCount(rulings, live.map(s => s.erratum.id))
  const toggleOne = (id: string) =>
    setExpanded(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))

  return (
    <section className="glass-card p-3" aria-label="Rules flags on your sheet">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-forge-0">
          Rules flags
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-forge-2">
          {/* The count says what is left to DO, not how many flags exist. "6"
              alone is a number you learn to ignore by the third session. */}
          {unanswered > 0 ? `${live.length} · ${unanswered} unanswered` : `${live.length} · all answered`}
          {isOpen ? (
            <ChevronUp size={14} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={14} className="text-forge-2" aria-hidden />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[11px] leading-snug text-forge-1">
            Canon flags places where this subclass does not work as written. Nothing here is
            changed or enforced — record how your table ruled it.
          </p>

          {live.length === 0 ? (
            <p className="text-xs leading-snug text-forge-1">
              Nothing canon flags applies to what you can do yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {live.map(scope => {
                const e = scope.erratum
                const blocks = erratumBlocks(e)
                const fault = blocks.find(b => b.kind === 'problem')
                const rest = blocks.filter(b => b.kind !== 'problem')
                const open = expanded.includes(e.id)
                return (
                  <li key={e.id} className="rounded-lg border border-bronze/25 bg-void-2/30 p-2">
                    <button
                      type="button"
                      onClick={() => toggleOne(e.id)}
                      aria-expanded={open}
                      className="w-full text-left"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wider text-forge-0">
                          {erratumFeatureName(e)}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${
                            SEVERITY_INK[e.severity] ?? 'text-forge-2'
                          }`}
                        >
                          {e.severity.toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2 font-mono text-[10px] text-forge-2">
                        <span>{e.id}</span>
                        <span>{levelNote(scope)}</span>
                      </div>
                      {/* The fault, whole. No clamp, no budget, no ellipsis —
                          the band scrolls and this is the sentence the rest of
                          the record is about. */}
                      {fault && (
                        <p className="mt-1.5 text-xs leading-relaxed text-forge-0">{fault.text}</p>
                      )}
                      {rest.length > 0 && (
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-gold">
                          {open ? '▾ less' : `▸ what canon says to do about it`}
                        </span>
                      )}
                    </button>

                    {open && rest.map(b => <Block key={b.kind} {...b} />)}

                    <RulingControl erratumId={e.id} rulings={rulings} onRule={onRule} />
                  </li>
                )
              })}
            </ul>
          )}

          {later.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowLater(v => !v)}
                aria-expanded={showLater}
                className="flex w-full items-center gap-2 py-1 text-left"
              >
                <span className={`${LABEL} text-forge-2`}>
                  {later.length} more arrive as you level
                </span>
                <span className="ml-auto font-mono text-xs text-forge-2">
                  {showLater ? '▾' : '▸'}
                </span>
              </button>
              {showLater && (
                <ul className="mt-1 flex flex-col gap-2">
                  {later.map(scope => {
                    const e = scope.erratum
                    const fault = erratumBlocks(e).find(b => b.kind === 'problem')
                    return (
                      /* Read-only, and that is the point: there is nothing to
                         rule on yet. Answering a rules problem about a feature
                         you will get at level 15 is a conversation you would
                         have to have again by the time it mattered. */
                      <li key={e.id} className="rounded-lg border border-bronze/15 p-2">
                        <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
                          <span className="min-w-0 flex-1 text-forge-1">
                            {erratumFeatureName(e)}
                          </span>
                          <span className="shrink-0 text-forge-2">{levelNote(scope)}</span>
                        </div>
                        {fault && (
                          <p className="mt-1 text-[11px] leading-relaxed text-forge-1">
                            {fault.text}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
