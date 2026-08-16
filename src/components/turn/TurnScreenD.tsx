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
   ========================================================================== */

export function TurnScreenD({ turn }: { turn: ComposedTurn }) {
  const { actor, vitals, economy } = turn
  const hpPct = Math.max(0, Math.min(100, (vitals.hp / vitals.maxHp) * 100))
  const markPct = (vitals.bloodiedAt / vitals.maxHp) * 100

  return (
    <div className="dturn">
      {turn.seeded && (
        <div className="fixture">Seeded fixture · slice 1</div>
      )}

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
              <Act key={o.id} o={o} />
            ))}
            {turn.rest.length > 0 && (
              <>
                <div className="cap" style={{ marginTop: 6 }}>
                  <span className="lbl">Everything else</span>
                </div>
                {turn.rest.map(o => (
                  <Act key={o.id} o={o} />
                ))}
              </>
            )}
          </section>

          {turn.mutex.map(g => (
            <Mutex key={g.id} g={g} />
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

      <footer className="edge">
        <button className="btn">Log damage</button>
        <button className="btn primary">End turn</button>
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

function Act({ o }: { o: TurnOption }) {
  return (
    <div className={`act${o.available ? '' : ' blocked'}`}>
      <div className="hd">
        <span className="anm">{o.name}</span>
        <span className="cost">{o.cost.label}</span>
      </div>
      <div className="det">{o.detail}</div>
      {o.rider && (
        // Gold names the mechanic; cream says the sentence.
        <div className="rider">
          <b>{o.rider.property}</b> — {o.rider.text}
        </div>
      )}
      {!o.available && o.blockedReason && <div className="why">{o.blockedReason}</div>}
      {o.homebrew && <div className="hbtag">{o.source}</div>}
    </div>
  )
}

function Mutex({ g }: { g: MutexGroup }) {
  return (
    <section className="mutex">
      <div className="cap">
        <span className="lbl">{g.label}</span>
        <span className="n">pick one</span>
      </div>
      <div className="faces">
        {g.faces.map(f => (
          <div key={f.id} className="face">
            <span className="fnm">{f.name}</span>
            <span className="fd">{f.detail}</span>
            <span className="fc">{f.cost.label}</span>
          </div>
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
