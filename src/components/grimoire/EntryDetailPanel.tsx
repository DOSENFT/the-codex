/* One entry, open: the three bands, laid out.
 *
 * Open Book slice 3. `docs/plans/grimoire/mockups/02-detail.html` is the mockup
 * Marcus approved at Gate 1, and this is that mockup with real data behind it.
 *
 *     1  at a glance    the cost, the numeral, the grid
 *     2  full text      canon's whole paragraph, the upcast box, the book
 *     3  how to use it  canon's advice, split at canon's own headings
 *
 * ── WHAT THIS FILE IS AND IS NOT ────────────────────────────────────────────
 * It is a LAYOUT. Every word it prints was decided in `catalogue/detail.ts` or
 * `canon/bands.ts`, both of which are pure and tested without a browser. This
 * file chooses where things sit and what colour they are, and nothing else. It
 * has no state, no effects and no character — if a question needs the sheet to
 * answer it, the answer arrives in `detail`.
 *
 * ── THE FALL-THROUGH RULE, WHICH IS THE POINT ───────────────────────────────
 * Gate 3 decision 3: band 1 is a layout, not a dump. Four facts are promoted out
 * of the plain grid — the cost to a hero line, the dice to a 34px numeral, the
 * upcast and the book down into band 2 — and every promotion is somewhere a fact
 * can quietly stop being drawn.
 *
 * So the grid is NOT an allowlist. It does not ask "do I recognise this label";
 * it draws every fact whose label the model declared `consumed`, and nothing
 * else. A label that has never existed before — a canon revision, a homebrew
 * row, a field somebody adds next year — lands in the grid BY CONSTRUCTION,
 * because falling through is the default and being hidden requires the model to
 * have said so. `EntryDetailPanel.test.tsx` hands it an invented label and
 * requires it on screen.
 *
 * Marcus's words, from the intake: "The documents just have SO much golden
 * information that i want access to". A screen that silently drops what it does
 * not recognise is exactly how that information goes missing again. */

import type { EntryDetail } from '../../lib/catalogue/detail'
import type { BandFact } from '../../lib/canon/bands'
import { leadGap } from '../../lib/canon/tactics'
import { rulingFor, type ErratumRulings } from '../../lib/errata-rulings'

export interface EntryDetailPanelProps {
  detail: EntryDetail
  /** How the table ruled on each erratum. Read-only here — the ruling controls
   *  live on the combat tab, which is where a ruling gets made. Defaults to
   *  none recorded, which reads as "not ruled on yet". */
  rulings?: ErratumRulings
}

/* Deliberately carries no colour, for the reason `OptionDetailSheet.tsx:76`
 * gives: two Tailwind colour utilities on one element are resolved by
 * stylesheet order, not by the order they were written. */
const BAND_LABEL =
  'flex items-center gap-2 pt-3 text-[10px] font-bold uppercase tracking-[0.13em]'

/* Exhaustive by TYPE, not by habit: adding a tone to `HeroCost` without giving
 * it a colour here is a compile error rather than an invisible black word. */
const COST_COLOUR: Record<NonNullable<EntryDetail['cost']>['tone'], string> = {
  action: 'text-arcane-lit',
  bonus: 'text-ember-lit',
  reaction: 'text-eldritch-lit',
  passive: 'text-verdant',
  /* A duration canon named — "10 minutes". Neutral ON PURPOSE: the three slot
   * colours are a promise that the thing is reachable on a turn, and this one
   * is not. Colouring it like an Action is the fault this tone was added to
   * fix; see `heroCostFor`. */
  time: 'text-forge-1',
}

const DICE_COLOUR: Record<NonNullable<EntryDetail['hero']>['tone'], string> = {
  damage: 'text-ember-lit',
  healing: 'text-verdant',
  ward: 'text-eldritch-lit',
}

const TAG_STYLE: Record<EntryDetail['tags'][number]['tone'], string> = {
  prepared: 'text-verdant border-verdant/50 bg-verdant/10',
  always: 'text-arcane-lit border-arcane/50 bg-arcane/10',
  locked: 'text-forge-2 border-bronze/50 border-dashed',
  concentration: 'text-eldritch-lit border-eldritch/50',
  free: 'text-verdant border-verdant/45',
}

/** A fact spans both columns when it cannot live in one.
 *
 *  The threshold is about a 390px phone at two columns, which is the width
 *  Gate 1's guardrail names. A label-less fact — canon stating a detail without
 *  naming it — always spans, because a bare value in a narrow column with no
 *  word above it reads as an orphan. */
function isWide(fact: BandFact): boolean {
  return fact.label === null || fact.value.length > 30
}

function BandLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className={BAND_LABEL}>
      <span className="rounded-[3px] bg-forge-2 px-1.5 py-px font-mono text-[10px] font-bold text-void-0">
        {n}
      </span>
      <span className="text-forge-1">{title}</span>
      <span className="h-px flex-1 bg-bronze/25" />
    </div>
  )
}

export function EntryDetailPanel({ detail, rulings = {} }: EntryDetailPanelProps) {
  const promoted = new Set<string | null>(detail.consumed)
  const grid = detail.bands.facts.filter(f => !promoted.has(f.label))
  const paragraphs = detail.bands.whatItDoes.split(/\n+/).map(p => p.trim()).filter(Boolean)

  return (
    <div data-entry-detail={detail.title} className="border-t border-bronze/20">
      {/* ── the lock: a strip he can read, not a wall ──────────────────── */}
      {detail.lock && (
        <div
          data-lock-strip={detail.lock.unlocksAt}
          className="flex items-start gap-2.5 border-b border-bronze/25 bg-bronze/[0.09] px-4 py-3"
        >
          <span aria-hidden className="text-[15px] leading-none">🔒</span>
          <p className="text-xs leading-relaxed text-forge-1">{detail.lock.text}</p>
        </div>
      )}

      {/* ── the chips ──────────────────────────────────────────────────── */}
      {detail.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {detail.tags.map(tag => (
            <span
              key={tag.label}
              data-tag={tag.tone}
              className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] ${TAG_STYLE[tag.tone] ?? 'text-forge-2 border-bronze/40'}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ══ BAND 1 · AT A GLANCE ═══════════════════════════════════════════
             The mid-combat band, and the one Gate 1 put a guardrail on: it must
             need no scroll at 390×844. Everything below it is for reading; this
             is for playing. */}
      <section data-band="1" className="border-b border-bronze/20 px-4 pb-4">
        <BandLabel n="1" title="At a glance" />

        {detail.cost && (
          <div data-cost={detail.cost.tone} className="mt-2.5 flex flex-wrap items-baseline gap-2">
            <span className={`text-[19px] font-bold leading-tight ${COST_COLOUR[detail.cost.tone]}`}>
              {detail.cost.word}
            </span>
            {/* Canon's own second half — "taken immediately after hitting…" —
                which is the half that answers "can I do this right now". */}
            {detail.cost.when && (
              <span className="text-xs leading-snug text-forge-1">{detail.cost.when}</span>
            )}
          </div>
        )}

        {detail.hero && (
          <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
            <span
              data-hero-dice={detail.hero.tone}
              className={`font-mono text-[34px] font-bold leading-none tracking-tight ${DICE_COLOUR[detail.hero.tone] ?? 'text-forge-0'}`}
            >
              {detail.hero.dice}
            </span>
            {detail.hero.note && (
              <span className="text-xs leading-snug text-forge-1">{detail.hero.note}</span>
            )}
          </div>
        )}

        {/* THE GRID. Everything the promotions did not take, in canon's order,
            with no opinion about whether this layout has heard of it. */}
        {grid.length > 0 && (
          <dl className="mt-3.5 grid grid-cols-2 gap-x-3.5 gap-y-2.5">
            {grid.map((fact, i) => (
              <div
                key={`${fact.label ?? '—'}-${i}`}
                data-fact={fact.label ?? ''}
                className={`min-w-0 ${isWide(fact) ? 'col-span-2' : ''}`}
              >
                {/* V-3, from the mockup: a value is never dim. Only its word is. */}
                {fact.label && (
                  <dt className="text-[9px] uppercase tracking-[0.1em] text-forge-2">{fact.label}</dt>
                )}
                <dd className="mt-0.5 text-[13px] font-semibold leading-snug text-forge-0">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* ══ BAND 2 · FULL TEXT ═════════════════════════════════════════════
             Never a slice(0, n). This band is the whole of item 2 of Marcus's
             eleven: the app was showing him his own four-word Divine Smite while
             canon held the paragraph. */}
      <section data-band="2" className="border-b border-bronze/20 px-4 pb-4">
        <BandLabel n="2" title="Full text" />
        <div className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-forge-1">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {detail.higherLevel && (
          <div className="mt-3 rounded-r-lg border-l-2 border-arcane bg-arcane/[0.06] px-3 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-arcane-lit">
              Cast with a higher slot
            </span>
            <p className="mt-1 text-xs leading-relaxed text-forge-0">{detail.higherLevel}</p>
          </div>
        )}

        {/* Whose words those were. `provenance` is the model's answer and this
            line is the only place the player is told — the open-world rule is
            worth nothing if homebrew is presented as if canon wrote it. */}
        <p data-provenance={detail.bands.provenance} className="mt-3 text-[10px] tracking-wide text-forge-2">
          {detail.bands.provenance === 'canon'
            ? [detail.source, detail.subtitle].filter(Boolean).join(' · ')
            : 'From your sheet — canon has no record of this, so these are your own words.'}
        </p>
      </section>

      {/* ══ ⚑ ERRATA ═══════════════════════════════════════════════════════
             The same record the combat sheet shows, in the same words. It is
             here because the Grimoire is where he reads a feature at leisure,
             and "canon says this is broken" is the first thing worth knowing
             before he builds a turn around it. */}
      {detail.bands.errata.length > 0 && (
        <section data-errata={detail.bands.errata.length} className="border-b border-bronze/20 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-ember">
            ⚑ Canon lists {detail.bands.errata.length} errat
            {detail.bands.errata.length === 1 ? 'um' : 'a'} on this
          </span>
          <ul className="mt-1.5 flex flex-col gap-2">
            {detail.bands.errata.map(e => {
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
                      {ruling.dmWording ? ` — ${ruling.dmWording}` : ' — wording not recorded'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ══ BAND 3 · HOW TO USE IT ═════════════════════════════════════════
             Canon's advice, split at canon's own capitalised headings. Empty is
             honest: canon has no note for this and the app will not invent one. */}
      {detail.bands.tactics.length > 0 && (
        <section data-band="3" className="px-4 pb-5">
          <BandLabel n="3" title="How to use it" />
          <p className="mt-2 text-[10px] leading-relaxed text-forge-2">
            Canon's own words, with your numbers filled in.
          </p>
          <div className="mt-2.5 flex flex-col gap-3">
            {detail.bands.tactics.map((bullet, i) => (
              <div key={i}>
                {bullet.lead && (
                  <div className="text-[10px] font-bold uppercase leading-snug tracking-[0.09em] text-ember-lit">
                    {bullet.lead}
                  </div>
                )}
                <p className={`text-[13px] leading-relaxed text-forge-1 ${bullet.lead ? 'mt-1' : ''}`}>
                  {leadGap(bullet)}
                  {bullet.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
