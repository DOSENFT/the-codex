import '../../design/tokens.css'
import './turn-d.css'
import type { ReactNode } from 'react'
import type { ComposedTurn, MutexGroup, TurnOption } from '../../lib/turn/types'
import { groupBySlot, type BandSlot } from '../../lib/turn/bands'
import { TurnBands } from './TurnBands'
import { Act } from './TurnRow'

/* ============================================================================
   TurnScreenD — direction D, rendering a ComposedTurn and nothing else.
   ----------------------------------------------------------------------------
   There is NO rules logic in this file and there must never be any.  Every
   decision about what is legal, affordable, contended or ranked was made in
   src/lib/turn/, which is pure and tested; this component's whole job is to
   put that answer on glass at the speed of the table.

   If you find yourself wanting an `if` here about what the player can do, it
   belongs in compose.ts.  That separation is the reason the 15-second metric
   can be measured at all.

   Slice 6 made it interactive WITHOUT making it stateful.  Every handler is an
   optional prop: given none, this is exactly the read-only screen Slices 1-5
   built and the design shoot still measures.  Given them, the same markup
   becomes live.  The component never learns what a spell slot is.
   ========================================================================== */

export interface TurnScreenDProps {
  turn: ComposedTurn
  /** OPEN an option — rows are inert text until this is supplied.
   *
   *  Slice 5 renamed this from `onTake`, and the rename is the slice. A row
   *  used to spend on the first press: one tap on "Divine Smite" burned a 2nd
   *  level slot with nothing on screen saying what it was about to cost or what
   *  it would do. The deck never behaved that way — it opened a sheet — and the
   *  fault only reached D because the flat list was built before the sheet was
   *  wired. Now the press opens; the sheet spends. The old name would have
   *  described neither. */
  onOpen?: (option: TurnOption) => void

  /** Something to hang under ONE row — decided per option, by the caller.
   *
   *  AN OPAQUE NODE, like `rail` and `vitalsControls`, and for the identical
   *  reason: item 7's retaliation has to appear under Hearthfire Manifest and
   *  under no other row, and deciding WHICH row that is means knowing what a
   *  retaliation is. That knowledge lives in src/lib/turn/retaliation.ts and it
   *  stays there. This file calls a function it was handed, once per option,
   *  and paints whatever comes back — usually nothing. */
  rowExtra?: (option: TurnOption) => ReactNode

  /** Something to hang at the END of ONE band — decided per slot, by the caller.
   *
   *  The same opaque-node rule as `rowExtra`, for a fault that rows cannot
   *  express. A row describes an option that exists; slice 6's subject is an
   *  option that DOESN'T — a reaction he owns at the table which the app has
   *  never been told about, so it is absent from `bands` by construction and no
   *  amount of looking at rows can find it. Whether there is such a gap, and
   *  what to say about it, is a rules question answered in `TurnLive`. */
  bandNote?: (slot: BandSlot) => ReactNode
  /** Mark one of the four spent, or un-spend it.  Slice 8d-1.
   *
   *  THE TALLY THE LEGACY DECK KEPT, and the reason it has to come back: the
   *  four dots state what this turn has cost, but until this prop exists they
   *  state it only about things the app has a row for. At a real table half of
   *  what Nix does has no row — he shoves, he grapples, he uses an item the
   *  sheet has never heard of — and without a way to say so by hand the strip
   *  drifts away from the fight within two rounds and is then worse than absent.
   *
   *  OPTIONAL, like every other handler here, and the four slots stay inert
   *  `<div>`s without it. That is not ceremony: the design shoot renders this
   *  screen with no handlers at all and the law at the top of this file says
   *  what comes back must be the read-only card slices 1-5 built.
   *
   *  The key is the `CombatState` field, not the label on the dot — "Bonus" is
   *  `bonusAction` and "Move" is `movement`, and a screen that passed its own
   *  display words up would no-op on exactly those two. */
  onToggleEconomy?: (key: 'action' | 'bonusAction' | 'reaction' | 'movement') => void
  onEndTurn?: () => void
  /** Your turn comes round again.  Slice 7.
   *
   *  A SEPARATE prop from `onEndTurn` because they are separate facts, and the
   *  screen has to be able to show the gap between them: "End turn" hands the
   *  round to the table, and until "My turn begins" is pressed the only thing
   *  Nix owns is his Reaction. One button that did both would erase the very
   *  window this slice exists to render. */
  onBeginTurn?: () => void
  onUndo?: () => void
  /** What the last entry was called — "Divine Smite".  Null disables Undo. */
  undoLabel?: string | null
  /** The reason the last tap was refused, if it was. */
  refusal?: string | null
  onDismissRefusal?: () => void

  /* ── THE FOUR BANDS.  Item 5. ───────────────────────────────────────────
   *
   *  Supplying `bandsOpen` is what turns the flat "Your turn / Everything else"
   *  list into ACTION · BONUS · REACTION · MOVEMENT. It is one prop, given at
   *  one call site, and removing that line puts the flat list back unchanged —
   *  which is this slice's declared revert.
   *
   *  A map rather than a boolean per band, because the collapse state is
   *  persisted per character by the caller (`codex-ui-<id>`, the same store
   *  every other fold on this tab uses) and this screen must not learn how to
   *  persist anything. */
  bandsOpen?: Record<string, boolean>
  onToggleBand?: (slot: BandSlot) => void

  /** Damage · heal · temp HP · the temp-HP source question · death saves · and
   *  the conditions fold, which lives inside `HPTracker` and so arrives with it.
   *
   *  AN OPAQUE NODE, and that is what keeps the law at the top of this file
   *  true. `TurnScreenD` does not import `HPTracker`, does not know what a
   *  condition is, and cannot tell damage from healing. It is handed something
   *  already composed and it renders it under the readout. Absent, the screen is
   *  exactly the read-only card the design shoot measures. */
  vitalsControls?: ReactNode

  /** Dice · look up · slot pips · reset · start/end combat · the class pools.
   *
   *  AN OPAQUE NODE, for the same reason `vitalsControls` is one — and it
   *  REPLACES the read-only `.res` strip rather than joining it. Supplied, the
   *  slots and the pools are painted once, on the rail, and they are pressable.
   *  Absent, `.res` renders exactly as slices 1-6 shipped it and the design
   *  shoot still measures the same screen. What must never happen is BOTH: that
   *  is one number in two places, which is the fault this phase exists to
   *  remove. The `??` below is what makes it impossible rather than merely
   *  intended. */
  rail?: ReactNode

  /** Look up · reset · start/end combat — the verbs that spend nothing.
   *
   *  AN OPAQUE NODE for the third time, and the third time for the same reason:
   *  this file must not learn what "look up" means. Slice 7 took this row OUT
   *  of the pinned strip and mounts it here, at the top of the scroller, and
   *  gave its 48px to the action-economy slots — which are the controls V-6 is
   *  actually about, and the only ones measurement found scrolling away.
   *  Absent, the screen simply has no verb row; nothing else moves. */
  verbs?: ReactNode

  /** Everything the combat tab carries that is not about THIS turn — the damage
   *  log, the advisor, the rest buttons, the rules flags, the persona card.
   *
   *  AN OPAQUE NODE for the fifth time, and the fifth time for the same reason:
   *  this file must not learn what a rest is. It arrives in slice 8b because the
   *  mount forced one decision that was not open to preference. `.dturn` is
   *  `height: 100dvh` with `.body` as its ONLY scroller (see turn-d.css), and
   *  two scrollers cannot be stacked in one tab — the outer one swallows the
   *  gesture and the inner one never reaches its end. So the survivors of the
   *  legacy tab cannot sit beside this screen; they ride inside its scroller.
   *
   *  AT THE END OF `.colB`, NOT OF `.body`. On the phone `.colB` is
   *  `display: contents` and flattens into the one stack, so the two are the
   *  same place. At ≥900px they are not: `.body` is a grid and a direct child
   *  would become a stray third column, while `.colB` IS the scroller and this
   *  lands under the list where it belongs. */
  extras?: ReactNode
}

export function TurnScreenD({
  turn,
  onOpen,
  onToggleEconomy,
  onEndTurn,
  onBeginTurn,
  onUndo,
  undoLabel = null,
  refusal = null,
  onDismissRefusal,
  rowExtra,
  bandNote,
  bandsOpen,
  onToggleBand,
  vitalsControls,
  rail,
  verbs,
  extras,
}: TurnScreenDProps) {
  const { actor, vitals, economy } = turn
  // Computed, not stored, and computed here rather than in TurnLive so that the
  // caller cannot hand the screen a grouping that disagrees with the turn it
  // was handed alongside. `groupBySlot` is pure and has no rules in it — see
  // its header — so the law at the top of this file still holds.
  const bands = bandsOpen ? groupBySlot(turn) : null
  // The card's own count, when the bands are on, is the sum of theirs. Reading
  // `ranked.length` here while the bands counted the whole shelf would put two
  // numbers about the same thing on one screen, which is the fault this phase
  // exists to remove.
  const readyTotal = bands ? bands.reduce((n, b) => n + b.readyCount, 0) : turn.ranked.length
  const hpPct = Math.max(0, Math.min(100, (vitals.hp / vitals.maxHp) * 100))
  const markPct = (vitals.bloodiedAt / vitals.maxHp) * 100
  // Read once and named, because five things below hang off it and
  // `!turn.yourTurn` scattered five times is how one of them ends up inverted.
  const moment = !turn.yourTurn

  return (
    <div className={`dturn${moment ? ' moment' : ''}${rail ? ' has-rail' : ''}`}>
      <header className="chrome">
        {/* SLICE 7 — the header pays 28px toward the reading window.
            "Changeling Paladin 7" is gone: species, class and level cannot
            change during a combat, they are on the character tab, and they
            were costing a second permanent line on an 844px phone.

            THE SUBCLASS STAYS. turn-d.css records why — it is homebrew, it is
            the thing Marcus wrote himself, and truncating it was already ruled
            unacceptable. Losing a visual is the one thing this phase is not
            allowed to do, so the 28px came from the line that says nothing
            rather than the line that says who he is. */}
        <div className="who">
          <span className="nm">{actor.name}</span>
          <span className={`sub${actor.homebrewSubclass ? ' hb' : ''}`}>{actor.subclass}</span>
        </div>
        {/* ROUND 0 IS NOT A ROUND — slice 8b, caught by `no-round-zero`, which
            is a KEEP pin precisely because the legacy tab never printed it and
            this one did. Out of combat `turn.round` is 0 and this line said
            "Round 0" in Cinzel at the top of the screen, which states a fact
            about a fight that is not happening. The counter is a combat
            instrument; when there is no combat it has nothing to count. */}
        {turn.round > 0 && <div className="round">Round {turn.round}</div>}
      </header>

      <div className="body">
        <div className="colA">
          {/* The verbs, first thing in the scroller — so they are still one
              gesture from the top of the tab, and no longer one of the reasons
              the list only had 534px to live in. */}
          {verbs}
          <section className="vitals">
            <div className="vrow">
              <div className="hp">
                {vitals.hp}
                <span className="of"> / {vitals.maxHp}</span>
                {vitals.tempHp > 0 && <span className="of"> +{vitals.tempHp}</span>}
              </div>
              <div className="ac">
                AC <b>{vitals.ac}</b>
              </div>
            </div>
            {/* One row. See turn-d.css — this is the merge that closed the budget. */}
            <div className="hprow">
              {/* NAMED, as of slice 8b. The bar carried the one visual item 10
                  asked for by name — "the color changing aspect of the hit
                  point tracker" — and carried it with no accessible name at
                  all, so to a screen reader it was three unlabelled divs and
                  to `prove-capabilities`' `$hpFill()` it did not exist. Both
                  `hp-colour-*` pins read red against a bar that was working:
                  gold `#c5a55a` at 67/67, ember `#c06030` at 3/67.

                  `progressbar` and not a bare label because the colour is not
                  the only thing the bar says — the LENGTH is the reading, and
                  a name without a value would announce "Hit points" and stop.
                  The numbers come off `vitals`, the same object the fraction
                  above is painted from, so the announced value and the painted
                  width cannot disagree. */}
              <div
                className="track"
                role="progressbar"
                aria-label="Hit points"
                aria-valuenow={vitals.hp}
                aria-valuemin={0}
                aria-valuemax={vitals.maxHp}
                aria-valuetext={`${vitals.hp} of ${vitals.maxHp}${vitals.bloodied ? ', bloodied' : ''}`}
              >
                <div
                  className={`fill${vitals.bloodied ? ' low' : ''}`}
                  style={{ width: `${hpPct}%` }}
                />
                <div className="mark" style={{ left: `${markPct}%` }} />
              </div>
              <div className={`blabel${vitals.bloodied ? ' is' : ''}`}>
                {vitals.bloodied ? 'Bloodied' : `Bloodied at ${vitals.bloodiedAt}`}
              </div>
            </div>
            {/* The controls go INSIDE the vitals section, under the number they
                change. Item 10 asked for them "neatly and masterfully rolled
                into the one module"; a separate box below would be a fourth
                place his hit points are discussed. */}
            {vitalsControls}
          </section>

          {/* THE PILL OPENS — slice 8d-2, and only where there is something
                behind it. `detail` is set by the composer exactly when the
                whole paragraph says more than the truncated line, so a
                condition that states its entire effect in one sentence stays
                the plain pill it has always been. A disclosure that opens onto
                the line already showing is furniture pretending to be a
                feature.

                `<details>` RATHER THAN A BUTTON, and the reason is the law at
                the top of this file. Open/closed is state; this screen holds
                none — `bandsOpen` is a prop precisely so the caller owns the
                persisting. `<details>` is the one disclosure the platform
                owns outright: no state, no handler, present in the inert
                screen the design shoot measures, and reachable by keyboard and
                screen reader without a line of code from us. */}
          {turn.upon.length > 0 && (
            <section className="upon">
              {turn.upon.map(u => {
                const tone = u.tone === 'good' ? ' good' : ''
                const head = (
                  <>
                    <span className="k">{u.name}</span>
                    <span className="t">{u.text}</span>
                  </>
                )
                if (!u.detail) {
                  return (
                    <span key={u.name} className={`tag${tone}`}>
                      {head}
                    </span>
                  )
                }
                return (
                  <details key={u.name} className={`tag${tone}`}>
                    {/* The name and the summary stay in the SUMMARY element, so
                        closed, the strip is byte-for-byte what it shows today. */}
                    <summary aria-label={`${u.name} — full text`}>{head}</summary>
                    <p className="full">{u.detail}</p>
                  </details>
                )
              })}
            </section>
          )}

          {/* THE ECONOMY STRIP USED TO BE HERE, and slice 7 moved it into the
              pinned strip below — it is not duplicated, it is relocated, and
              the count of places it appears is still one. Measured before the
              move: at rest it sat at 416..432, and scrolled to the bottom of
              this list it was at −1646. So the one thing V-6 is actually about
              — never be surprised by what you have already spent — was the one
              thing scrolling off his screen. */}

          {/* THE RAIL CAME BACK IN — slice 8, and it is the reverse of the trip
              slice 4 sent it on. Not a retreat: the pinned strip was 233px on a
              screen that, once it is inside `Layout`, also pays 65px for the tab
              bar. Measured 2026-09-01, the pinned strip plus the tab bar alone
              was 298px against a Gate 1 promise of 121, so something had to come
              out of it, and slice 4 put three things in there that V-6 does not
              ask for.

              WHAT STAYED PINNED AND WHY. V-6's intent is *never be surprised by
              what you have already spent*. The four economy dots and End turn
              are the whole of that: they are the state of THIS turn, and the one
              button that ends it. Slot pips and the class pools are a different
              question — *what do I still have* — and the list answers it in
              place, on every row that costs a slot, which is where he is looking
              when it matters. Pinning twelve pips to guarantee an answer the row
              already gives is 104px of permanent chrome buying a duplicate.

              It sits after the vitals and before the list on purpose: "what I
              have" reads as one block — hit points, conditions, slots, pools —
              and then the list is "what I can do with it". */}
          {rail}
        </div>

        <div className="colB">
          {/* THE BAND — the page turning over.  Slice 7.
              It says only what the app can presently know. There is no board
              until Slice 9, so it does NOT name the creature or the trigger:
              "The goblin steps away" would be a sentence this build cannot
              check, printed in the one place Marcus would trust it most. What
              it can say is whose turn it is not, and what he still holds — and
              that second line is read off `economy.reaction`, which is the
              engine's answer, not a guess made here. */}
          {moment && (
            <section className="mband">
              <span className="mtrig">Someone else is acting</span>
              <span className="msub">
                {economy.reaction
                  ? 'Your Reaction is the one thing that is yours right now.'
                  : 'Your Reaction is spent — it returns when your turn does.'}
              </span>
            </section>
          )}

          <section className="list">
            <div className="cap">
              {/* Slices 1-6 hard-coded "Your turn" here, which the Slice 7
                  off-turn shoot caught saying exactly the wrong thing over a
                  list of reactions. The caption is now the same fact the rest
                  of the screen is composed from. */}
              <span className="lbl">{turn.yourTurn ? 'Your turn' : 'The moment'}</span>
              <span className="n">{readyTotal} ready</span>
            </div>
            {/* THE FOLD IS GONE WHEN THE BANDS ARE ON, and that is the point.
                "6 more — including anything that contends for the same slot —
                are under everything else below" was the app telling him it had
                things it was not showing him. The bands show all of it, shelved
                by the slot it costs, blocked rows greyed with their reason
                where the thing they are about actually lives. */}
            {bands ? (
              <TurnBands
                bands={bands}
                open={bandsOpen ?? {}}
                onToggle={onToggleBand}
                onOpen={onOpen}
                rowExtra={rowExtra}
                bandNote={bandNote}
              />
            ) : (
              <>
                {turn.ranked.map(o => (
                  <Act key={o.id} o={o} onOpen={onOpen} extra={rowExtra?.(o)} />
                ))}
                {turn.rest.length > 0 && (
                  <>
                    <div className="cap" style={{ marginTop: 6 }}>
                      <span className="lbl">Everything else</span>
                    </div>
                    {turn.rest.map(o => (
                      <Act key={o.id} o={o} onOpen={onOpen} extra={rowExtra?.(o)} />
                    ))}
                  </>
                )}
              </>
            )}
          </section>

          {turn.mutex.map(g => (
            <Mutex key={g.id} g={g} onOpen={onOpen} />
          ))}

          {/* LAST, AND BELOW THE MUTEX BRACKETS, because the order of this
              column is a priority order and has been since slice 9 of the
              previous phase: what to do now, then the decisions that contend,
              then everything else. Nothing in here is read in the six seconds
              a turn gets — the damage log is written after the hit, the rest
              buttons between fights, the rules flags at the pub. */}
          {extras && <section className="extras">{extras}</section>}
        </div>

        {/* colC IS THE RAIL'S OLD SEAT, and only one of them is ever in it.
            Slice 4 moved the slots and pools out of the body and onto a pinned
            strip below it, so when a rail is supplied this column does not
            render — see the `.has-rail` grid rule in turn-d.css, which drops
            the tablet from three columns to two rather than reserving 300px
            for nothing. */}
        {!rail && (
        <div className="colC">
          <section className="res">
            {turn.spellSlots.map(s => (
              <div key={s.level} className="rgrp">
                <span className="k">Level {s.level}</span>
                <span className={`v${s.current === 0 ? ' spent' : ''}`}>
                  {s.current}/{s.max}
                </span>
              </div>
            ))}
            {turn.resources
              // Anything already priced on a mutex face is not repeated here —
              // the strip carries only what nothing else on screen carries.
              .filter(r => !mutexPrices(turn, r.id))
              .map(r => (
                <div key={r.id} className="rgrp">
                  <span className="k">{r.name}</span>
                  <span className={`v${r.current === 0 ? ' spent' : ''}`}>
                    {r.current}/{r.max}
                  </span>
                </div>
              ))}
          </section>
        </div>
        )}
      </div>

      {/* ── THE PINNED STRIP ──────────────────────────────────────────────
          Everything below the scroller, in ONE padded region instead of the
          two slice 4 left (`section.rail` at 9/8 and `footer.edge` at 9/8).
          Merging them returns 18px of padding to the list; it is the least
          interesting 18px on this screen and it was bought for free.

          WHAT LIVES HERE IS DECIDED BY V-6, not by convenience: turn-critical
          SPEND controls, always visible. Look up, Reset and End combat spend
          nothing and left in slice 7. The spell slots and the class pools DO
          spend, and they left anyway in slice 8 — see the note on `{rail}` in
          `.colA`. The rule that survived both trips is narrower than "anything
          that spends" and it is worth stating in one line:

              THIS STRIP CARRIES THE STATE OF THIS TURN, AND THE BUTTON THAT
              ENDS IT. Nothing else.

          Four dots and End turn. Every addition to this region since slice 4
          has been argued for as turn-critical and every one of them cost the
          list a row it needed more. If a sixth thing is ever proposed here, the
          question is not "does it spend" — it is "is it about this turn". */}
      <section className="pinned">
        <section className="econ">
          <EconSlot label="Action" slot="action" open={economy.action} onToggle={onToggleEconomy} />
          <EconSlot label="Bonus" slot="bonusAction" open={economy.bonusAction} onToggle={onToggleEconomy} />
          <EconSlot label="Reaction" slot="reaction" open={economy.reaction} onToggle={onToggleEconomy} />
          <EconSlot label="Move" slot="movement" open={economy.movement} onToggle={onToggleEconomy} />
        </section>

        {/* A refusal is the app disagreeing with a tap, so it appears exactly
            where the tap was heading — above the buttons, not as a corner toast
            that has floated away by the time he looks up from the dice. */}
        {refusal && (
          <button type="button" className="refusal" onClick={onDismissRefusal} aria-live="polite">
            {refusal}
          </button>
        )}

        <div className="edge">
        {/* Slices 1-5 shipped a dead "Log damage" button here. A control that
            does nothing is the 🔴 half-built-feature rule made visible, so it
            is replaced by the one thing this screen now genuinely owes the
            table: an Undo that names what it will undo. */}
        <button
          type="button"
          className="btn"
          onClick={onUndo}
          disabled={!onUndo || !undoLabel}
        >
          {undoLabel ? `Undo ${undoLabel}` : 'Undo'}
        </button>
        {/* THE FOOTER SWAPS, and it swaps rather than growing a third button.
            "End turn" while it is not your turn is a control for something
            that already happened, and two of the three states it could be in
            would be wrong. One primary button, and it always names the next
            true thing. */}
        {moment ? (
          <button
            type="button"
            className="btn primary"
            onClick={onBeginTurn}
            disabled={!onBeginTurn}
          >
            My turn begins
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={onEndTurn} disabled={!onEndTurn}>
            End turn
          </button>
        )}
        </div>
      </section>
    </div>
  )
}

/* ONE SLOT, IN TWO STATES OF THE WORLD.  The `<div>` is what the design shoot
   and every screenshot since slice 1 renders; the `<button>` is the same four
   facts with a way to correct them by hand. Same class, same dot, same word — a
   `<button>` here is `display: flex` under `.eslot` exactly as the `<div>` was,
   so nothing about the strip moves when the handler arrives.

   TWO POLARITIES MEET IN THIS FUNCTION and they are opposites, which is why the
   flip is written on its own line rather than inlined four times. `open` comes
   from `ComposedTurn.economy` where TRUE MEANS STILL HIS. `aria-pressed` and the
   accessible name describe what has been SPENT. So `used = !open`.

   THE NAME IS THE LEGACY DECK'S, TO THE BYTE — `TurnDeck.tsx:346` — because the
   four `chip-*` capability pins were written against that string in slice 1,
   before any of this existed. A pin re-pointed at whatever the new code happens
   to say has stopped being a pin, so the app moves to meet it. */
function EconSlot({
  label,
  slot,
  open,
  onToggle,
}: {
  label: string
  slot: 'action' | 'bonusAction' | 'reaction' | 'movement'
  open: boolean
  onToggle?: (key: 'action' | 'bonusAction' | 'reaction' | 'movement') => void
}) {
  const used = !open
  const body = (
    <>
      <span className="dot" />
      <span>{label}</span>
    </>
  )
  if (!onToggle) return <div className={`eslot${open ? ' open' : ''}`}>{body}</div>
  return (
    <button
      type="button"
      className={`eslot${open ? ' open' : ''}`}
      onClick={() => onToggle(slot)}
      aria-label={`${label}: ${used ? 'used' : 'available'}`}
      aria-pressed={used}
      data-econ={slot}
    >
      {body}
    </button>
  )
}

/* `ActBody` and `Act` moved to TurnRow.tsx when the bands arrived, so that the
   bands and the flat list render provably the same row. They were extracted
   from each other for that same reason one layer down; this is the same
   argument at the next size up. */

function MutexFace({ f, onOpen }: { f: TurnOption; onOpen?: (o: TurnOption) => void }) {
  const body = (
    <>
      <span className="fnm">{f.name}</span>
      {/* The bracket is ORDERED by rank, so it owes the same explanation the
          flat rows give. A face that climbed to the top because Nix is
          bleeding has to say so, or the reorder looks like the app moved his
          options around for no reason. Nested in the detail cell rather than
          added as a fourth column, so the three-column grid is untouched. */}
      <span className="fd">
        {f.detail}
        {f.why && <span className="fnote">{f.why}</span>}
      </span>
      <span className="fc">{f.cost.label}</span>
    </>
  )
  if (!onOpen) return <div className="face">{body}</div>
  return (
    <button type="button" className="face" disabled={!f.available} onClick={() => onOpen(f)}>
      {body}
    </button>
  )
}

function Mutex({ g, onOpen }: { g: MutexGroup; onOpen?: (o: TurnOption) => void }) {
  return (
    <section className="mutex">
      <div className="cap">
        <span className="lbl">{g.label}</span>
        <span className="n">pick one</span>
      </div>
      <div className="faces">
        {g.faces.map(f => (
          <MutexFace key={f.id} f={f} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

/** True if some mutex face already states this pool's cost on screen. */
function mutexPrices(turn: ComposedTurn, poolId: string): boolean {
  return turn.mutex.some(g => g.faces.some(f => f.cost.resourcePoolId === poolId))
}

export default TurnScreenD
