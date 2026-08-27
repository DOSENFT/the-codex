/* ─────────────────────────────────────────────────────────────────────────────
   ERRATA RULINGS — what Marcus's table decided about each rules problem.
   ────────────────────────────────────────────────────────────────────────────
   Canon flags twelve places where the Oath of the Hearth does not work as
   written. Slice 8 makes them readable; this file makes them ANSWERABLE, and
   that is the difference between a warning and a tool.

   The reasoning, in Marcus's terms: a flag you cannot answer is a flag you
   re-read every session. The cloak's missing trigger (HEARTH-03) is not a bug
   the app can fix — only a DM can — so the useful thing the app can do is hold
   the answer once it exists, and put it in front of him at the moment the cloak
   comes up. Three states, and the first one is the honest default:

     · `unasked`  — nobody has raised it with the DM yet. The default, and it
                    is NOT the same as "fine": an unanswered rules problem is
                    still live at the table.
     · `canon`    — going with canon's recommended fix, as printed.
     · `dm`       — the DM ruled something else, IN MARCUS'S OWN WORDS. The
                    words are the point; a boolean here would lose the ruling
                    and keep only the fact that one happened.

   WHY `canon` IS NOT THE DEFAULT, though it is the most likely answer. Canon's
   own `appAction` on HEARTH-01 says it out loud: *"Do not silently implement
   either version. Present the conflict to the player."* Defaulting to a fix is
   implementing it silently — the app would be house-ruling on Marcus's behalf
   and he would find out at the table. Slice 8's contract is that nothing is
   changed and nothing is enforced; slice 8b acts, and only on rulings that
   exist.

   ONE KEY PER CHARACTER, not per erratum. `codex-errata-${characterId}` holds
   the whole map. Twelve keys would be twelve reads on every mount and twelve
   chances for a partial write; the same argument that put every collapsible
   into one `codex-ui-${characterId}` map.
   ────────────────────────────────────────────────────────────────────────── */
import { saveOrAnnounce } from './character'

export type RulingStatus = 'unasked' | 'canon' | 'dm'

export interface ErratumRuling {
  status: RulingStatus
  /** The DM's actual words. Only meaningful when `status === 'dm'`, and kept
   *  rather than cleared when the status moves back — see `setRuling`. */
  dmWording?: string
  /** ISO date the ruling was last set. Displayed as "ruled on", so Marcus can
   *  tell a decision from this campaign apart from one from the last. */
  decidedAt?: string
}

/** id → ruling. Absent id means `unasked`; see `rulingFor`. */
export type ErratumRulings = Record<string, ErratumRuling>

const PREFIX = 'codex-errata-'

export const errataKey = (characterId: string) => `${PREFIX}${characterId}`

/** The ruling for one erratum, with the default supplied.
 *
 *  Callers never index the map directly, so "no entry" and "entry saying
 *  unasked" are the same thing everywhere — which is what lets `save` drop
 *  empty entries without changing what anything reads. */
export function rulingFor(rulings: ErratumRulings, erratumId: string): ErratumRuling {
  return rulings[erratumId] ?? { status: 'unasked' }
}

/** Load the map. Every failure resolves to "no rulings recorded".
 *
 *  Deliberately total: a corrupt key must not take the Play tab down. Losing a
 *  ruling is bad; losing the combat screen mid-fight is worse, and the ruling
 *  is recoverable by asking the DM again. */
export function loadRulings(characterId: string): ErratumRulings {
  try {
    const raw = localStorage.getItem(errataKey(characterId))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: ErratumRulings = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const v = value as Partial<ErratumRuling>
      /* An unrecognised status is discarded rather than coerced. Coercing an
         unknown string to `canon` would invent a ruling; to `dm` would invent
         one with no wording. Dropping it reads as "not asked", which is the
         one answer that is never wrong to show. */
      if (v.status !== 'canon' && v.status !== 'dm' && v.status !== 'unasked') continue
      out[id] = {
        status: v.status,
        ...(typeof v.dmWording === 'string' ? { dmWording: v.dmWording } : {}),
        ...(typeof v.decidedAt === 'string' ? { decidedAt: v.decidedAt } : {}),
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveRulings(characterId: string, rulings: ErratumRulings): void {
  saveOrAnnounce(errataKey(characterId), JSON.stringify(rulings))
}

/** Set one ruling, returning a NEW map. Pure — the caller decides when to write.
 *
 *  `now` is a parameter rather than a `new Date()` call so the function is
 *  testable without freezing the clock, and so a caller can stamp a batch of
 *  rulings with one timestamp.
 *
 *  TWO BEHAVIOURS WORTH STATING:
 *
 *  1. Moving back to `unasked` DROPS the entry entirely. `rulingFor` returns
 *     `unasked` for a missing id, so the read is identical and the stored map
 *     does not accumulate tombstones for twelve errata across every character.
 *
 *  2. `dmWording` is CARRIED, not cleared, when the status moves to `canon`.
 *     Marcus switching to canon's fix does not mean his DM never said anything
 *     — and if he switches back, retyping the ruling from memory is exactly the
 *     kind of small loss that makes a feature not worth using. Nothing renders
 *     it while the status is `canon`; it is simply still there. */
export function setRuling(
  rulings: ErratumRulings,
  erratumId: string,
  status: RulingStatus,
  dmWording: string | undefined,
  now: Date,
): ErratumRulings {
  const next = { ...rulings }
  if (status === 'unasked') {
    delete next[erratumId]
    return next
  }
  const carried = dmWording ?? rulings[erratumId]?.dmWording
  next[erratumId] = {
    status,
    ...(carried != null && carried !== '' ? { dmWording: carried } : {}),
    decidedAt: now.toISOString(),
  }
  return next
}

/** How many of the given errata still have no answer. Drives the band's caption
 *  — "6 flagged, 6 still unanswered" is a to-do; "6 flagged" is just noise. */
export function unansweredCount(rulings: ErratumRulings, erratumIds: readonly string[]): number {
  return erratumIds.filter(id => rulingFor(rulings, id).status === 'unasked').length
}
