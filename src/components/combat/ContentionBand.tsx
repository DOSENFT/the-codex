import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ComposedTurn, MutexGroup, TurnOption } from '../../lib/turn/types'
import { TurnOptionRow } from './TurnOptionRow'

/* ============================================================================
   ONE DECISION, SEVERAL FACES — Table Truth slice 9.

   ── THE HOLE THIS FILLS ─────────────────────────────────────────────────────
   Slice 7 measured it and called it finding AB: of the fourteen options
   `composeTurn` builds for Nix, six could be tapped and EVERY SINGLE ONE of the
   seven that spends a slot or a pool could not. Divine Smite, Shield of Faith,
   Misty Step, Cure Wounds, Warding Bond, Lay on Hands and Channel Divinity all
   live in `turn.mutex`, and until this file the Play tab read `turn.mutex` in
   exactly one place — a footer that COUNTED it. "8 more are in the sections
   below" was, strictly, false: they were in no section at all.

   The live one-slot-per-turn rule box built in slice 7 was therefore also
   unreachable, because the only options it has anything to say about were the
   unreachable ones. That is the single largest thing this slice fixes and it is
   the reason Marcus moved slice 9 ahead of slice 8.

   ── WHY A BRACKET AND NOT SEVEN MORE ROWS ───────────────────────────────────
   This is the whole point, and it is why slice 4 deferred the problem rather
   than flattening it. Painting Smite, Shield of Faith and Misty Step as three
   ordinary rows says you may do all three. You may not: they want one bonus
   action, and under the 2024 rules only ONE levelled spell slot leaves your
   hands per turn. A flat list is not a layout shortcut here — it is a wrong
   rule, printed at the table, in the fifteen seconds when nobody re-reads it.

   So each group is fenced, captioned with `g.label` ("One of these — your bonus
   action"), and carries a sentence naming WHICH constraint binds it. `reason`
   is computed in `contention.ts` and distinguishes the two causes, because they
   have different consequences: a slot clash stops the pair sharing a turn
   forever, whereas an economy clash only means you pick one THIS turn.

   ── AND THE REST ────────────────────────────────────────────────────────────
   `turn.rest` — everything affordable that neither ranked into the top list nor
   contends — lands here too, under its own caption. After this file, every
   option `composeTurn` produces has a row, and every row opens the sheet.

   ── STATE IS PASSED IN, NOT READ ────────────────────────────────────────────
   Props, not `useCombat()`, so the band renders under `renderToStaticMarkup`
   and is tested without a DOM. Same rule as `ReactionsBand`; same shared
   collapse map (`codex-ui-${characterId}`) via the caller's `useCollapsible`.
   ========================================================================= */

/** Why these faces cannot coexist, in the words you would say to a DM.
 *
 *  Stated per group rather than once at the top, because a screen with two
 *  brackets on it can have two different reasons and a single generic sentence
 *  would be wrong about one of them. */
const WHY: Record<MutexGroup['reason'], string> = {
  both: 'They want the same slot — and only one levelled spell slot leaves your hands per turn.',
  resource: 'They draw on the same pool, so spending one leaves less for the other.',
  economy: 'They want the same slot, so this turn you get one of them.',
  /* `contention.ts` cannot produce this one today — its ternary yields
     both / resource / economy and nothing else. The sentence is written anyway
     because `reason` is a four-member union and a `Record` over it must be
     total: the alternative is an index signature that silently paints an
     `undefined` the day the fourth case starts being emitted. */
  spellSlot: 'Only one levelled spell slot leaves your hands per turn, so casting one rules out the other.',
}

/** REACTIONS ARE FILTERED OUT, for the same reason `YourTurnList` filters them.
 *
 *  The reactions band directly above is the one place a reaction lives. A
 *  reaction appearing here as well would make a player count two Reactions,
 *  which is worse than painting it nowhere. `findContention` can build a
 *  reaction bracket, so this is a real branch and not a defensive one. */
const onTurn = (option: TurnOption) => option.cost.slot !== 'reaction'

export interface ContentionBandProps {
  turn: ComposedTurn
  isOpen: boolean
  onToggle: () => void
  /** Opens the option detail sheet. Optional for the same reason
   *  `TurnOptionRow.onOpen` is: a caller with nowhere to send the tap paints no
   *  affordance rather than a control that lies. */
  onOpen?: (option: TurnOption) => void
}

export function ContentionBand({ turn, isOpen, onToggle, onOpen }: ContentionBandProps) {
  const groups = turn.mutex
    .map(g => ({ ...g, faces: g.faces.filter(onTurn) }))
    .filter(g => g.faces.length > 0)

  /* THE DE-DUPE THIS FILE NOW HAS TO DO ITSELF — Slice R2, 2026-09-04.
   *
   * Until this slice `compose.ts` guaranteed a face was in NO list, so `rest`
   * and the brackets could not overlap and this line was a plain filter. R2
   * deleted that guarantee on purpose: a contended option now sits in
   * `ranked`/`rest` like everything else, in the band its price names, because
   * removing it was what made Marcus's Action band go empty exactly while he
   * could still act.
   *
   * Which lands the old invariant here. Left alone, every face would paint
   * twice inside this one card — once in its bracket, once under "Also yours" —
   * and the count would read 14 for 8 things. That is worse than either layout
   * on its own: it is the screen telling him there are two Divine Smites.
   *
   * This band is scheduled for deletion in Slice R3, when the contention
   * sentence moves into the band it is about and the bracket stops being a
   * place. It is kept alive for one slice so that R2's diff is one behaviour,
   * and keeping it alive means keeping it honest. */
  const bracketed = new Set(groups.flatMap(g => g.faces.map(f => f.id)))
  const rest = turn.rest.filter(o => onTurn(o) && !bracketed.has(o.id))
  const total = groups.reduce((n, g) => n + g.faces.length, 0) + rest.length

  return (
    <section className="glass-card p-3" aria-label="Everything else you could do">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-forge-0">
          Everything else
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-forge-2">
          {total}
          {isOpen ? (
            <ChevronUp size={14} className="text-forge-2" aria-hidden />
          ) : (
            <ChevronDown size={14} className="text-forge-2" aria-hidden />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-3">
          {groups.map(group => (
            /* The fence is the rule made visible: a left rule and a caption
               that says "pick one". Take those away and this is the flat list
               the paragraph at the top of this file explains we must not
               paint. */
            <div key={group.id} className="rounded-lg border border-arcane/25 bg-arcane/[0.04] p-2">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-arcane">
                  {group.label}
                </h4>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-arcane/70">
                  pick one
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-forge-1">{WHY[group.reason]}</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {group.faces.map(face => (
                  <li key={face.id}>
                    <TurnOptionRow option={face} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {rest.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-forge-2">
                {/* Named for what it IS rather than "other": these are options
                    that cost nothing contended and simply did not rank into the
                    top five. Nothing is wrong with them. */}
                Also yours
              </h4>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {rest.map(option => (
                  <li key={option.id}>
                    <TurnOptionRow option={option} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {total === 0 && (
            /* Empty still renders, same rule as the reactions band: "there is
               nothing else" is a fact worth two seconds, and a band that
               vanishes leaves you wondering whether you missed it. */
            <p className="text-xs leading-snug text-forge-1">
              Everything you can do this turn is already in the list above.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
