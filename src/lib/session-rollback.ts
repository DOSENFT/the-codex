/* Would this import hand back something he has already spent?
   ---------------------------------------------------------------------------
   TABLE-READY § 9.13 / criterion R-10. Re-importing your own save file is a
   REASSURANCE gesture — it is what you do when the phone slept, or the app was
   backgrounded, or you just want to be sure the session took. Until now that
   gesture silently restored every pool to whatever the file said: heal for 5,
   re-import, and Lay on Hands is 35/35 again. Two uses of a once-per-long-rest
   pool returned by an action taken to protect data.

   The damage is invisible at the moment it happens, because a resource you
   have already spent is a resource you have already stopped tracking. You
   notice three encounters later, when the pool disagrees with the fight you
   remember.

   This module answers one question and holds no opinion about what to do with
   the answer: which pools would move BACKWARDS — that is, which ones would be
   handed back — if this file were written over the session that is live now.
   The app's job is to say so and let him choose (§ 9.13's option (b)); it is
   not to decide for him by merging silently, which would be option (a) and
   would trade a loud wrong answer for a quiet one. */
import type { Character } from './character'

export interface RollbackEntry {
  /** What he calls it, not what the field is called. */
  label: string
  /** What the live session says he has left. */
  from: number | string
  /** What the file would set it back to. */
  to: number | string
}

const LEVEL_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th',
}

/** Only a strict increase counts. An import that spends MORE than the session
 *  has is not a rollback — it is him importing a later state, which is the
 *  thing import is for. Equal is not a change and must never be reported, or
 *  the notice cries wolf on every ordinary re-import and gets dismissed
 *  unread, which is worse than not having it. */
function gained(from: number, to: number): boolean {
  return to > from
}

/**
 * Pools the incoming file would REFILL relative to the live session.
 * Empty array means the import takes nothing back and can proceed silently.
 */
export function findSessionRollback(live: Character, incoming: Character): RollbackEntry[] {
  const out: RollbackEntry[] = []

  // ── hit points ──
  // Damage taken this session is session state exactly like a spent slot.
  if (gained(live.hitPoints.current, incoming.hitPoints.current)) {
    out.push({ label: 'Hit points', from: live.hitPoints.current, to: incoming.hitPoints.current })
  }

  // ── spell slots, per level ──
  for (const [lvl, slot] of Object.entries(incoming.spellSlots ?? {})) {
    const n = Number(lvl)
    const liveSlot = (live.spellSlots ?? {})[n]
    if (!liveSlot || !slot) continue
    if (gained(liveSlot.current, slot.current)) {
      out.push({
        label: `${LEVEL_LABELS[n] ?? `${n}th`}-level spell slots`,
        from: liveSlot.current,
        to: slot.current,
      })
    }
  }

  // ── paladin resources ──
  const lp = live.paladinResources, ip = incoming.paladinResources
  if (lp && ip) {
    if (gained(lp.layOnHands.current, ip.layOnHands.current)) {
      out.push({ label: 'Lay on Hands', from: lp.layOnHands.current, to: ip.layOnHands.current })
    }
    if (gained(lp.channelDivinity.current, ip.channelDivinity.current)) {
      out.push({ label: 'Channel Divinity', from: lp.channelDivinity.current, to: ip.channelDivinity.current })
    }
  }

  // ── homebrew pools, matched by id then by name ──
  // Matched on id first because a renamed pool is still the same pool; falling
  // back to name so that pools authored before ids were stable still match.
  for (const pool of incoming.resourcePools ?? []) {
    const livePool = (live.resourcePools ?? []).find(p => p.id === pool.id)
      ?? (live.resourcePools ?? []).find(p => p.name === pool.name)
    if (!livePool) continue
    if (gained(livePool.current, pool.current)) {
      out.push({ label: pool.name, from: livePool.current, to: pool.current })
    }
  }

  // ── conditions ──
  /* Added because § 9.14(a) measured it: the re-import took `["Charmed"] → []`
     along with the pools. A condition is not a number, but it is session state
     of exactly the same kind — something that happened at the table since the
     file was written — and § 9.14(a)'s own words are that the repair is
     "unchanged, only larger in what it must name".

     Only conditions LOST count. A condition arriving from the file is the file
     being further along, which is what import is for, and is the same rule the
     numbers follow. */
  const liveConds = live.conditions ?? []
  const incomingConds = new Set(incoming.conditions ?? [])
  const dropped = liveConds.filter(c => !incomingConds.has(c))
  if (dropped.length > 0) {
    out.push({
      label: dropped.length === 1 ? 'Condition' : 'Conditions',
      from: dropped.join(', '),
      /* "cleared", not "none" — the file may still carry OTHER conditions, so
         the honest statement is about the ones that go, not about the end state. */
      to: 'cleared',
    })
  }

  return out
}

/** One sentence naming what would be handed back, for the notice.
 *  Written to be read in a dim room in about two seconds. */
export function describeRollback(entries: RollbackEntry[]): string {
  if (entries.length === 0) return ''
  const parts = entries.map(e => `${e.label} ${e.from} → ${e.to}`)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
