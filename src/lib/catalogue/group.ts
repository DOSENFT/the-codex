/* The four ways to look at the 84.
 *
 * Open Book slice 4. Gate 1, asked to pick one organising principle, Marcus
 * declined all four options and answered: "Multiple organization options, like
 * a filter." So the app does not choose — he does, and the choice is a view,
 * never a filter.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO KEEP ───────────────────────────────────
 * GROUPING NEVER LOSES AN ENTRY. Every mode returns all 84, partitioned. That
 * is Gate 1 rule 4, and it is the same rule as the fall-through rule in
 * `EntryDetailPanel.tsx`, one level up: there a FACT the layout does not
 * recognise must still be drawn, here an ENTRY whose bucket the module does not
 * recognise must still be grouped.
 *
 * It is enforced structurally rather than by care. Nothing here filters, tests
 * membership, or consults a list of permitted values. Each mode is a total
 * function from an entry to a bucket — `keyOf` cannot return "nowhere" — and the
 * groups are whatever buckets came back. An origin string nobody has written
 * yet, a `turnCost` from a future canon revision, a spell at a level this game
 * does not have: each gets its own group and sorts to the end, because being
 * unrecognised is a fact about this module and not about the entry.
 *
 * The word "filter" in Marcus's answer is about the CONTROL — four chips, like a
 * filter bar. Not about the behaviour. He asked to see everything; a chip that
 * hid seventy of the eighty-four would be the old bug wearing a new hat.
 *
 * ── WHY `'level'` IS THE DEFAULT ────────────────────────────────────────────
 * Gate 3 deferred the default to a measurement: "if more than ~15 of the 84
 * land in `turnCost: 'other'`, the default should be Source, not Turn cost."
 * Twenty of them do, so that rule fired — and the rule was wrong, because it
 * only ever compared two of the four modes and assumed Source was balanced.
 * Measured across all four, over his real 84:
 *
 *     turn    4 groups, biggest 46   Action 46 · Bonus 16 · Reaction 2 · other 20
 *     source  3 groups, biggest 69   Paladin 69 · Oath of the Hearth 13 · Feat 2
 *     level   6 groups, biggest 22   L1 19 · L2 13 · L3 12 · L4 8 · L5 10 · F&f 22
 *     ready   3 groups, biggest 38   Ready 22 · Known 24 · Locked 38
 *
 * Source's largest heading holds 69 of 84 — opening on it would have shown him
 * one enormous list called "Paladin", which is the complaint that started this
 * phase wearing a heading. Level is the only mode where nothing dominates, and
 * it is also the axis his question is usually about ("what can I cast at 2nd?").
 * Marcus was shown the four distributions and chose Level, 2026-08-29; Gate 3's
 * deferred rule was backtracked in `03-program-design.md` rather than kept.
 *
 * The guard lives in `group.test.ts`: whatever the default is, its biggest
 * group must hold under half the catalogue. A default cannot quietly outlive
 * the measurement that chose it.
 */

import type { CatalogueEntry, TurnCost } from './types'

export type GroupMode = 'turn' | 'source' | 'level' | 'ready'

export interface CatalogueGroup {
  id: string
  label: string
  entries: CatalogueEntry[]
}

/** The four chips, in the order they are shown. `level` leads because it is
 *  the default; see the header. */
export const GROUP_MODES: readonly { mode: GroupMode; label: string }[] = [
  { mode: 'level', label: 'Level' },
  { mode: 'source', label: 'Source' },
  { mode: 'turn', label: 'Turn cost' },
  { mode: 'ready', label: 'Ready' },
]

export const DEFAULT_GROUP_MODE: GroupMode = 'level'

/** A bucket. `rank` orders the groups; ties break alphabetically on `label`, so
 *  two unrecognised values never swap places between renders. */
interface Bucket {
  id: string
  label: string
  rank: number
}

/* Ranks below 90 are reserved for buckets this module knows the right order
 * for. 90+ is "recognised as unknown" — sorted to the end, never dropped. */
const UNKNOWN_RANK = 90

const TURN_BUCKET: Record<TurnCost, Bucket> = {
  action: { id: 'action', label: 'Action', rank: 0 },
  bonus: { id: 'bonus', label: 'Bonus Action', rank: 1 },
  reaction: { id: 'reaction', label: 'Reaction', rank: 2 },
  passive: { id: 'passive', label: 'Always active', rank: 3 },
  /* Not a failure bucket, and not phrased as one. Canon prices plenty of real
   * things in minutes and hours, and after slice 3 those carry canon's actual
   * wording — "10 minutes" — on the card. The group says what is true of them
   * all: the cost is there, it is just not one of his three turn slots. */
  other: { id: 'other', label: 'Not a turn slot', rank: 4 },
}

/* Canon's own layering, coarse to specific: the class, then the oath on top of
 * it, then what he chose. Anything else — a race, a background, a source that
 * does not exist yet — falls past these and sorts alphabetically at the end. */
const SOURCE_RANK: Record<string, number> = {
  Paladin: 0,
  'Oath of the Hearth': 1,
  'Fighting Style': 2,
  Feat: 3,
  'Your sheet': 80, // his own words, last of the KNOWN ranks but before unknown
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function bucketFor(entry: CatalogueEntry, mode: GroupMode): Bucket {
  switch (mode) {
    case 'turn':
      /* `?? ` and not a bare index: `turnCost` arrives from JSON at runtime, and
       * TypeScript's guarantee about the union stops at the file boundary. */
      return TURN_BUCKET[entry.turnCost] ?? {
        id: `turn-${slug(String(entry.turnCost))}`,
        label: String(entry.turnCost),
        rank: UNKNOWN_RANK,
      }

    case 'source': {
      const origin = entry.origin || 'Unattributed'
      return {
        id: `src-${slug(origin)}`,
        label: origin,
        rank: SOURCE_RANK[origin] ?? UNKNOWN_RANK,
      }
    }

    case 'level': {
      /* Non-spells have no spell level and that is not a gap to be filled in.
       * They get a named home rather than a "level null" group. */
      if (entry.spellLevel === null) {
        return { id: 'lvl-features', label: 'Features & feats', rank: 89 }
      }
      if (entry.spellLevel === 0) return { id: 'lvl-0', label: 'Cantrips', rank: 0 }
      return {
        id: `lvl-${entry.spellLevel}`,
        label: `Level ${entry.spellLevel} spells`,
        // +1 so cantrips keep rank 0 and level 1 is not confused with them.
        rank: entry.spellLevel + 1,
      }
    }

    case 'ready': {
      /* THE ORDER IS THE POINT OF THIS MODE. It answers "what can I do right
       * now", so what he can do comes first and what he cannot comes last.
       * Locked is tested FIRST because a locked entry can also read as prepared
       * — `alwaysPrepared` is a property of the spell, not of his level — and
       * "Ready now" is the one label in the app that must never be wrong. */
      if (entry.lockedUntil !== null) {
        return { id: 'ready-locked', label: 'Locked at your level', rank: 2 }
      }
      if (entry.prepared || entry.alwaysPrepared) {
        return { id: 'ready-now', label: 'Ready now', rank: 0 }
      }
      return { id: 'ready-not', label: 'Known, not prepared', rank: 1 }
    }
  }
}

/** Partition the catalogue. Never filters it — see the header.
 *
 *  Entry order WITHIN a group is the order it arrived in, which is
 *  `buildCatalogue`'s order and therefore canon's. Groups with no members do
 *  not appear at all: an empty "Reaction" heading tells him he has no reactions,
 *  which after slice 6 will be false, and a heading that lies is worse than one
 *  that is absent. */
export function groupCatalogue(
  entries: readonly CatalogueEntry[],
  mode: GroupMode,
): CatalogueGroup[] {
  const byId = new Map<string, { bucket: Bucket; entries: CatalogueEntry[] }>()

  for (const entry of entries) {
    const bucket = bucketFor(entry, mode)
    const found = byId.get(bucket.id)
    if (found) found.entries.push(entry)
    else byId.set(bucket.id, { bucket, entries: [entry] })
  }

  return [...byId.values()]
    .sort((a, b) =>
      a.bucket.rank - b.bucket.rank || a.bucket.label.localeCompare(b.bucket.label))
    .map(({ bucket, entries: members }) => ({
      id: bucket.id,
      label: bucket.label,
      entries: members,
    }))
}
