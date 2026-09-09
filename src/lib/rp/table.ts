/* The table — the first thing in this app that knows other humans exist.
 *
 * Marcus, asked who the roleplay tab is for: *"Explicitly the table — I'm the
 * social engine."*
 *
 * Every module in `components/session/` before this one is about Nix. But the
 * thing he is actually good at, and the thing he wanted help getting better at,
 * is aiming a moment at another person. Tonight there are two people at that
 * table who have never played before, and until this file nothing in the app
 * knew they were there.
 *
 * ── THE ONE PIECE OF JUDGEMENT IN HERE ──────────────────────────────────────
 * `nextToAim` ranks a NEW player who has been handed nothing above a veteran who
 * has been quiet for an hour. That is a real opinion and it could be wrong, so
 * it is stated here rather than buried in a sort comparator: a veteran chooses
 * their silence and can end it whenever they like. A first-timer is usually not
 * quiet by choice — they are quiet because they do not yet know it is allowed. */

import type { TableMember, TableState } from './types'

export type { TableMember, TableState } from './types'

const KEY = (characterId: string) => `codex-rp-table-${characterId}`

export const emptyTable = (): TableState => ({ scene: '', mood: '', members: [] })

function normaliseMember(raw: unknown, i: number): TableMember | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `m${i}`,
    name,
    // `=== true` and not truthiness: this flag changes what the AI is told about
    // a real person, so a stray "yes" from a hand-edited file does not buy it.
    isNew: r.isNew === true,
    lastSpotlightAt: typeof r.lastSpotlightAt === 'number' ? r.lastSpotlightAt : null,
    beatsAimed: typeof r.beatsAimed === 'number' && r.beatsAimed > 0 ? Math.trunc(r.beatsAimed) : 0,
  }
}

/** Never throws and never returns undefined. A corrupt table is an empty table,
 *  because the alternative is a crashed Roleplay tab mid-session. */
export function loadTable(characterId: string): TableState {
  try {
    const raw = localStorage.getItem(KEY(characterId))
    if (!raw) return emptyTable()
    const data = JSON.parse(raw) as Record<string, unknown>
    return {
      scene: typeof data.scene === 'string' ? data.scene : '',
      mood: typeof data.mood === 'string' ? data.mood : '',
      members: Array.isArray(data.members)
        ? data.members.map(normaliseMember).filter((m): m is TableMember => m !== null)
        : [],
    }
  } catch {
    return emptyTable()
  }
}

export function saveTable(characterId: string, table: TableState): void {
  try {
    localStorage.setItem(KEY(characterId), JSON.stringify(table))
  } catch {
    // Private mode, quota, no storage at all. The session continues in memory;
    // losing the roster on reload is bad, and throwing here is worse.
  }
}

/** He played a beat at someone. Only that member changes. */
export function markSpotlight(table: TableState, memberId: string, now: number): TableState {
  return {
    ...table,
    members: table.members.map(m =>
      m.id === memberId
        ? { ...m, lastSpotlightAt: now, beatsAimed: m.beatsAimed + 1 }
        : m),
  }
}

/** Milliseconds since this person last had the spotlight, or null if they have
 *  never had it this session.
 *
 *  NULL, NOT INFINITY, and not 0. "Never" is a different sentence from "a long
 *  time ago" and the UI says a different thing for each. Collapsing them is how
 *  a brand-new player who has been handed nothing all night ends up looking
 *  identical to someone who spoke twenty minutes ago. */
export function quietFor(member: TableMember, now: number): number | null {
  if (member.lastSpotlightAt === null) return null
  return Math.max(0, now - member.lastSpotlightAt)
}

/** Who most needs the spotlight, or null if there is nobody to aim at.
 *
 *  Order: new-and-untouched, then anyone untouched, then longest quiet. Ties
 *  break on roster order so the answer is stable between renders — a nudge that
 *  changes its mind every second is a nudge he learns to ignore. */
export function nextToAim(table: TableState, now: number): TableMember | null {
  const candidates = table.members
  if (candidates.length === 0) return null

  const rank = (m: TableMember): number => {
    if (m.lastSpotlightAt === null) return m.isNew ? 0 : 1
    return 2
  }

  let best = candidates[0]
  let bestRank = rank(best)
  for (let i = 1; i < candidates.length; i++) {
    const m = candidates[i]
    const r = rank(m)
    if (r < bestRank) { best = m; bestRank = r; continue }
    if (r > bestRank) continue

    if (r === 2) {
      // Both have spoken: the one who spoke longer ago.
      if ((quietFor(m, now) ?? 0) > (quietFor(best, now) ?? 0)) best = m
    } else {
      // Neither has spoken: fewer beats aimed at them wins.
      if (m.beatsAimed < best.beatsAimed) best = m
    }
  }
  return best
}

/** "quiet 22m" / "not yet tonight". The chip text, decided here so the two
 *  components that draw it cannot disagree. */
export function quietLabel(member: TableMember, now: number): string {
  const ms = quietFor(member, now)
  if (ms === null) return member.beatsAimed > 0 ? 'no beat landed yet' : 'not yet tonight'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  return `quiet ${mins}m`
}
