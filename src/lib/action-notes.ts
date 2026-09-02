import { saveOrAnnounce } from './character'

/* ============================================================================
   WHAT HE WROTE ABOUT AN ACTION — the store, on its own. Your-Turn slice 8d-3.

   THIS MOVED RATHER THAN APPEARED, AND THAT IS THE WHOLE POINT OF THE SLICE.
   These four declarations were private to `components/combat/TurnSummary.tsx`,
   which is the V0.9 turn surface and is mounted **nowhere** any more. So the
   notes Marcus has already written are sitting in `localStorage` under a key
   that no rendered component knows, which is the exact shape of the gap he
   named: *"it kind of seems like a loss."* Nothing was deleted. The only reader
   was.

   The rule he set on the same breath was *"unless it would cause too much
   drift/mess/conflict"*, and drift is precisely what a second store would be.
   So the detail sheet does not get its own copy of any of this — the key string
   `codex-action-notes-<id>` exists in ONE place in the repo, here, and both
   surfaces call these two functions. That is what makes 8d-3 a re-mount instead
   of a rebuild: his existing notes appear in the new place because it is
   reading the same bytes, not because anything migrated them.

   THE KEY IS THE OPTION'S NAME, NOT ITS ID, and that is inherited, not chosen.
   Every note already on his disk is filed under `ActionOption.name`, and
   `TurnOption.name` is the same string for the same thing. Filing new notes by
   `id` would be more stable in the abstract and would silently orphan every
   note he has. Inheriting a merely-adequate key beats a better key that loses
   his writing.
   ========================================================================== */

export interface ActionNote {
  label: string
  text: string
}

export interface ActionNotesData {
  [actionName: string]: {
    /** His own line about this action. Named `customTip` because that is what
     *  the stored JSON on his disk already calls it — see the header. */
    customTip?: string
    notes: ActionNote[]
  }
}

const keyFor = (characterId: string) => `codex-action-notes-${characterId}`

export function loadActionNotes(characterId: string): ActionNotesData {
  try {
    const raw = localStorage.getItem(keyFor(characterId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveActionNotes(characterId: string, notes: ActionNotesData): void {
  // Guarded: this fires on the same taps as `saveCombatState`, and unguarded it
  // took the combat screen down the same way. See `saveOrAnnounce`.
  saveOrAnnounce(keyFor(characterId), JSON.stringify(notes))
}

/** Read one action's note, or `undefined` when he has not written one.
 *
 *  Empty string collapses to `undefined` deliberately: a stored `""` and no
 *  entry at all are the same fact — he has written nothing here — and two
 *  encodings of one fact is how a screen ends up painting an empty note box. */
export function noteFor(notes: ActionNotesData, actionName: string): string | undefined {
  const tip = notes[actionName]?.customTip?.trim()
  return tip ? tip : undefined
}

/** His note for one action, written into a NEW object.
 *
 *  Returns rather than mutates so a React caller can hand the result straight
 *  to `setState` and to `saveActionNotes` — one value, stored and rendered,
 *  instead of a write to disk that the screen then has to be told about.
 *
 *  Blank clears the tip and KEEPS the entry's `notes` array: the tip and the
 *  labelled notes are two different things he wrote, and clearing one has never
 *  meant discarding the other. */
export function withNote(
  notes: ActionNotesData,
  actionName: string,
  tip: string,
): ActionNotesData {
  const trimmed = tip.trim()
  const existing = notes[actionName]
  return {
    ...notes,
    [actionName]: {
      ...existing,
      notes: existing?.notes ?? [],
      ...(trimmed ? { customTip: trimmed } : { customTip: undefined }),
    },
  }
}
