/* The Roleplay tab's spine.
 *
 * ── THE FOUR ZONES, IN THIS ORDER, FOR THIS REASON ─────────────────────────
 * Marcus: *"The page also seems decently disorganized."* It was: six sibling
 * cards of equal weight, in the order they were built, none of them aware of
 * each other. The order below is a claim about what he needs and when.
 *
 *   1. SCENE   — what he tells the app once, at the start of the night.
 *   2. ASK     — the doorway. The thing he actually taps, mid-scene, one-handed.
 *   3. BEAT    — the answer, occupying the middle of the screen because it is
 *                the only thing on this page he reads while people watch him.
 *   4. TABLE   — the roster and the nudge. Below the fold on purpose: it is a
 *                between-scenes glance, not a during-scene one.
 *
 * ── WHY THIS COMPONENT DOES NOT USE `useAI` ────────────────────────────────
 * `useAI` exposes an `error` string, and an `error` string on the screen is the
 * exact failure Marcus photographed. There is nothing this component could
 * usefully do with it — `requestBeat` has already turned every failure into a
 * complete beat by the time control returns here — and a hook that hands you an
 * error is a hook someone eventually renders. So it calls `queryAIStructured`
 * directly, holds its own AbortController, and HAS NO ERROR STATE AT ALL.
 * The cancel-on-unmount and supersede-the-previous-request behaviours that
 * `useAI` provides are reimplemented below in the ten lines they take, because
 * those two are real and the error surface is not. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Wand2 } from 'lucide-react'
import type { Character } from '../../lib/character'
import type { RPMoment } from '../../lib/session-log'
import { queryAIStructured } from '../../lib/ai'
import { requestBeat } from '../../lib/rp/engine'
import type { Beat } from '../../lib/rp/beat'
import { emptyTable, loadTable, markSpotlight, saveTable } from '../../lib/rp/table'
import type { BeatIntent, BeatRequest, TableMember, TableState } from '../../lib/rp/types'

import { SceneBar } from './SceneBar'
import { AskBar } from './AskBar'
import { BeatCard } from './BeatCard'
import { TableCard } from './TableCard'

interface RoleplayEngineProps {
  character: Character
  onMomentLogged: (moment: Omit<RPMoment, 'id' | 'timestamp'>) => void
}

export function RoleplayEngine({ character, onMomentLogged }: RoleplayEngineProps) {
  const [table, setTable] = useState<TableState>(emptyTable)
  const [aimAt, setAimAt] = useState<TableMember | null>(null)
  const [beat, setBeat] = useState<Beat | null>(null)
  const [loading, setLoading] = useState(false)

  /** The request that produced the beat on screen, so ↻ can repeat it. */
  const lastReq = useRef<BeatRequest | null>(null)
  /** How many times ↻ has been pressed on this request — walks the bank so a
   *  second tap during an outage is a different card. */
  const nth = useRef(0)

  const abortRef = useRef<AbortController | null>(null)
  const genRef = useRef(0)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // ── Table persistence ─────────────────────────────────────────────────
  useEffect(() => { setTable(loadTable(character.id)); setAimAt(null) }, [character.id])

  const updateTable = useCallback((next: TableState) => {
    setTable(next)
    saveTable(character.id, next)
  }, [character.id])

  // ── The one call ──────────────────────────────────────────────────────
  const run = useCallback(async (req: BeatRequest) => {
    lastReq.current = req

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    genRef.current += 1
    const mine = genRef.current
    const current = () => genRef.current === mine

    setLoading(true)
    /* `requestBeat` cannot reject — that is enforced in `rp/engine.test.ts`, not
       hoped for here — so there is deliberately no catch and no error branch. */
    const result = await requestBeat(req, (sys, user) =>
      queryAIStructured<unknown>(sys, user, undefined, controller.signal))

    if (!current()) return   // he asked again while this was in flight
    setBeat(result)
    setLoading(false)
  }, [])

  const ask = useCallback((intent: BeatIntent, custom?: string) => {
    nth.current = 0
    void run({ character, table, intent, aimAt, custom, nth: 0 })
  }, [character, table, aimAt, run])

  const another = useCallback(() => {
    const prev = lastReq.current
    if (!prev) return
    nth.current += 1
    void run({ ...prev, nth: nth.current })
  }, [run])

  const aimAtMember = useCallback((member: TableMember) => {
    setAimAt(member)
    nth.current = 0
    void run({ character, table, intent: 'pull-in', aimAt: member, nth: 0 })
  }, [character, table, run])

  // ── "I played it" ─────────────────────────────────────────────────────
  const played = useCallback(() => {
    if (!beat) return

    /* The spotlight clock only moves for a beat that was actually AIMED at a
       person. Stamping the whole table on a beat aimed at the room would make
       everyone look recently-served and the nudge would go quiet all night. */
    const target = table.members.find(m => m.name === beat.aim)
    if (target) updateTable(markSpotlight(table, target.id, Date.now()))

    const line = beat.moves[0]?.text ?? beat.goal
    const text = `${beat.aim} — ${line}`
    onMomentLogged({
      type: 'react',
      text: text.length > 80 ? text.slice(0, 77) + '…' : text,
      context: table.scene || undefined,
    })

    setBeat(null)
    setAimAt(null)
    lastReq.current = null
    nth.current = 0
  }, [beat, table, updateTable, onMomentLogged])

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="space-y-3">
      {/* 1 ── SCENE */}
      <SceneBar
        scene={table.scene}
        mood={table.mood}
        onChange={({ scene, mood }) => updateTable({ ...table, scene, mood })}
      />

      {/* 2 ── ASK */}
      <AskBar
        loading={loading}
        aimName={aimAt?.name ?? null}
        onClearAim={() => setAimAt(null)}
        onAsk={ask}
      />

      {/* 3 ── BEAT */}
      {loading && !beat && (
        <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-2.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-[38px] rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {beat && (
        <BeatCard beat={beat} loading={loading} onAnother={another} onUsed={played} />
      )}

      {!beat && !loading && (
        /* Not an empty state so much as an instruction. Every sentence here is
           something the old page assumed he already knew. */
        <div className="glass-card rounded-2xl border border-white/10 px-4 py-5 text-center space-y-2">
          <Wand2 size={20} className="mx-auto text-arcane/70" aria-hidden />
          <p className="text-sm text-forge-1 leading-relaxed">
            Ask for a beat and you get a whole move — when to use it, what to say
            or do, what it&rsquo;s for, where to take it next, and how to get out
            if it lands flat.
          </p>
          <p className="text-[12px] text-forge-2 leading-relaxed">
            Add the people at your table below and it will aim them at whoever
            has been quiet longest.
          </p>
        </div>
      )}

      {/* 4 ── TABLE */}
      <TableCard table={table} onChange={updateTable} onAim={aimAtMember} />
    </div>
  )
}
