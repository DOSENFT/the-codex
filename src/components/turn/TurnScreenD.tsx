import '../../design/tokens.css'
import './turn-d.css'
import type { ComposedTurn, MutexGroup, TurnOption } from '../../lib/turn/types'

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
  /** Take an option.  Rows are inert text until this is supplied. */
  onTake?: (option: TurnOption) => void
  onEndTurn?: () => void
  onUndo?: () => void
  /** What the last entry was called — "Divine Smite".  Null disables Undo. */
  undoLabel?: string | null
  /** The reason the last tap was refused, if it was. */
  refusal?: string | null
  onDismissRefusal?: () => void
}

export function TurnScreenD({
  turn,
  onTake,
  onEndTurn,
  onUndo,
  undoLabel = null,
  refusal = null,
  onDismissRefusal,
}: TurnScreenDProps) {
  const { actor, vitals, economy } = turn
  const hpPct = Math.max(0, Math.min(100, (vitals.hp / vitals.maxHp) * 100))
  const markPct = (vitals.bloodiedAt / vitals.maxHp) * 100

  return (
    <div className="dturn">
      <header className="chrome">
        <div className="who">
          <span className="nm">{actor.name}</span>
          <span className="sub">
            {actor.species} {actor.className} {actor.level} ·{' '}
            <span className={actor.homebrewSubclass ? 'hb' : undefined}>{actor.subclass}</span>
          </span>
        </div>
        <div className="round">Round {turn.round}</div>
      </header>

      <div className="body">
        <div className="colA">
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
              <div className="track">
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
          </section>

          {turn.upon.length > 0 && (
            <section className="upon">
              {turn.upon.map(u => (
                <span key={u.name} className={`tag${u.tone === 'good' ? ' good' : ''}`}>
                  <span className="k">{u.name}</span>
                  <span className="t">{u.text}</span>
                </span>
              ))}
            </section>
          )}

          <section className="econ">
            <EconSlot label="Action" open={economy.action} />
            <EconSlot label="Bonus" open={economy.bonusAction} />
            <EconSlot label="Reaction" open={economy.reaction} />
            <EconSlot label="Move" open={economy.movement} />
          </section>
        </div>

        <div className="colB">
          <section className="list">
            <div className="cap">
              <span className="lbl">Your turn</span>
              <span className="n">{turn.ranked.length} ready</span>
            </div>
            {turn.ranked.map(o => (
              <Act key={o.id} o={o} onTake={onTake} />
            ))}
            {turn.rest.length > 0 && (
              <>
                <div className="cap" style={{ marginTop: 6 }}>
                  <span className="lbl">Everything else</span>
                </div>
                {turn.rest.map(o => (
                  <Act key={o.id} o={o} onTake={onTake} />
                ))}
              </>
            )}
          </section>

          {turn.mutex.map(g => (
            <Mutex key={g.id} g={g} onTake={onTake} />
          ))}
        </div>

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
      </div>

      {/* A refusal is the app disagreeing with a tap, so it appears exactly
          where the tap was heading — above the buttons, not as a corner toast
          that has floated away by the time he looks up from the dice. */}
      {refusal && (
        <button type="button" className="refusal" onClick={onDismissRefusal} aria-live="polite">
          {refusal}
        </button>
      )}

      <footer className="edge">
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
        <button type="button" className="btn primary" onClick={onEndTurn} disabled={!onEndTurn}>
          End turn
        </button>
      </footer>
    </div>
  )
}

function EconSlot({ label, open }: { label: string; open: boolean }) {
  return (
    <div className={`eslot${open ? ' open' : ''}`}>
      <span className="dot" />
      <span>{label}</span>
    </div>
  )
}

/** The body of a row.  Extracted so the interactive and inert forms are
 *  provably the same markup — two copies would drift, and the drift would show
 *  up as a design regression nobody attributed to this slice. */
function ActBody({ o }: { o: TurnOption }) {
  return (
    <>
      <span className="hd">
        <span className="anm">{o.name}</span>
        <span className="cost">{o.cost.label}</span>
      </span>
      <span className="det">{o.detail}</span>
      {/* Why this row sits where it sits. Ranking only speaks when it has
          something the row does not already show — see rank.ts — so this is
          absent from most options, and that silence is deliberate. */}
      {o.why && <span className="note">{o.why}</span>}
      {o.rider && (
        // Gold names the mechanic; cream says the sentence.
        <span className="rider">
          <b>{o.rider.property}</b> — {o.rider.text}
        </span>
      )}
      {!o.available && o.blockedReason && <span className="why">{o.blockedReason}</span>}
      {o.homebrew && <span className="hbtag">{o.source}</span>}
    </>
  )
}

function Act({ o, onTake }: { o: TurnOption; onTake?: (o: TurnOption) => void }) {
  const className = `act${o.available ? '' : ' blocked'}`
  // A blocked row stays on screen and stays readable — D greys with a reason
  // rather than hiding — but it is not pressable, and `disabled` is what says
  // so to VoiceOver as well as to the thumb.
  if (!onTake) return <div className={className}>{<ActBody o={o} />}</div>
  return (
    <button type="button" className={className} disabled={!o.available} onClick={() => onTake(o)}>
      <ActBody o={o} />
    </button>
  )
}

function MutexFace({ f, onTake }: { f: TurnOption; onTake?: (o: TurnOption) => void }) {
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
  if (!onTake) return <div className="face">{body}</div>
  return (
    <button type="button" className="face" disabled={!f.available} onClick={() => onTake(f)}>
      {body}
    </button>
  )
}

function Mutex({ g, onTake }: { g: MutexGroup; onTake?: (o: TurnOption) => void }) {
  return (
    <section className="mutex">
      <div className="cap">
        <span className="lbl">{g.label}</span>
        <span className="n">pick one</span>
      </div>
      <div className="faces">
        {g.faces.map(f => (
          <MutexFace key={f.id} f={f} onTake={onTake} />
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
