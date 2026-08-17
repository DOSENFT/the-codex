/* ============================================================================
   The Table Covenant — lines, veils, and the one control that is always there
   ----------------------------------------------------------------------------
   Two things live here, and they are deliberately in the same small file
   because they are the same promise made twice:

     THE COVENANT   what the table agreed to before play — the lines that never
                    happen, the veils that happen off-screen. Written once,
                    edited whenever, read at a glance.

     THE VEIL       the control itself. Not modelled here (it has no state worth
                    storing) except by its absence: NOTHING in this module can
                    turn it off, and nothing in this module is ever consulted to
                    decide whether to show it. That is not an oversight. A veil
                    with a settings switch is a veil that is off on the night it
                    is needed, and the covenant is data — data must never get a
                    vote on whether the escape hatch exists.

   THREE RULES THIS FILE IS BUILT AROUND

   1. NEVER DROP A LINE. A malformed note, an unknown `kind`, a value written by
      a future version — none of them may cost the reader an entry they typed.
      Everything parses defensively and keeps what it can read. A line silently
      lost is worse than a file that refuses to load, because the app then lies
      about what the table agreed to.

   2. A FAILED WRITE IS NOT A SAVE. On an iPad in private browsing, or with the
      quota full, `setItem` throws. Swallowing that and rendering the new line
      in the list would show Marcus a boundary that does not exist anywhere but
      on screen. `saveCovenant` therefore returns a result the caller has to
      look at; it cannot be ignored by accident.

   3. THIS IS NOT A LOG. There is no record of the veil ever being raised — no
      count, no timestamp, no "last used". Nobody at the table has to explain
      themselves afterwards, and there is no artefact for anyone to read later.
      The absence is the feature; see the note in `safety/Veil.tsx`.

   Storage is global (`codex-covenant`), NOT per character. Safety belongs to
   the people at the table, not to Nix — switching characters must never switch
   what the table agreed to.
   ========================================================================== */

export const COVENANT_KEY = 'codex-covenant'

/** A line never happens. A veil happens, off-screen, and play moves on. */
export type Boundary = 'line' | 'veil'

export interface CovenantEntry {
  id: string
  kind: Boundary
  /** The player's own words. Never interpreted, never matched against, never sent anywhere. */
  text: string
}

export interface Covenant {
  entries: CovenantEntry[]
  /** Free space for anything that is neither a line nor a veil — pronouns, a
   *  standing arrangement, "check in with me before X". */
  note: string
  /** ISO string, or null if never saved. Shown so a stale covenant looks stale. */
  updatedAt: string | null
}

export const EMPTY_COVENANT: Covenant = { entries: [], note: '', updatedAt: null }

export type SaveResult =
  | { ok: true; saved: Covenant }
  | { ok: false; reason: string }

let idSeq = 0
function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  // No randomness available (older webview, a test runner). Uniqueness within a
  // session is all an entry id is for — it is never persisted as a key anywhere
  // else, and never shown.
  idSeq += 1
  return `cov-${idSeq}`
}

function asBoundary(value: unknown): Boundary {
  // Rule 1. An unrecognised kind becomes the STRICTER of the two, never the
  // looser one and never a dropped row. If we cannot tell whether the table
  // said "never" or "off-screen", "never" is the safe way to be wrong.
  return value === 'veil' ? 'veil' : 'line'
}

/** Parse anything at all into a covenant, keeping every entry that has text. */
export function parseCovenant(raw: unknown): Covenant {
  if (typeof raw !== 'object' || raw === null) return { ...EMPTY_COVENANT }
  const bag = raw as Record<string, unknown>
  const list = Array.isArray(bag.entries) ? bag.entries : []

  const entries: CovenantEntry[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const row = item as Record<string, unknown>
    const text = typeof row.text === 'string' ? row.text.trim() : ''
    if (!text) continue // an empty row is not a boundary, it is a blank line
    entries.push({
      id: typeof row.id === 'string' && row.id ? row.id : newId(),
      kind: asBoundary(row.kind),
      text,
    })
  }

  return {
    entries,
    note: typeof bag.note === 'string' ? bag.note : '',
    updatedAt: typeof bag.updatedAt === 'string' ? bag.updatedAt : null,
  }
}

export function loadCovenant(): Covenant {
  try {
    const stored = globalThis.localStorage?.getItem(COVENANT_KEY)
    if (!stored) return { ...EMPTY_COVENANT }
    return parseCovenant(JSON.parse(stored))
  } catch {
    // Unreadable storage or unparseable JSON. An empty covenant is honest —
    // it shows nothing rather than claiming the table agreed to nothing.
    return { ...EMPTY_COVENANT }
  }
}

/**
 * Persist, and say so truthfully. The stamped covenant comes back on success so
 * the caller renders what is actually on disk rather than what it hoped to put
 * there. Rule 2: there is no return value that means "probably".
 */
export function saveCovenant(covenant: Covenant, now: () => Date = () => new Date()): SaveResult {
  const saved: Covenant = { ...covenant, updatedAt: now().toISOString() }
  // `localStorage?.setItem(...)` would have been the tidy line, and it is the
  // wrong one: on a device with no storage at all the optional chain does
  // nothing, throws nothing, and this function reports a save that never
  // happened. Absent storage is a failed write, stated as one.
  const store = globalThis.localStorage
  if (!store) return { ok: false, reason: 'This device has nowhere to store the covenant.' }
  try {
    store.setItem(COVENANT_KEY, JSON.stringify(saved))
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'This device would not store the covenant.',
    }
  }
  return { ok: true, saved }
}

/** Add a boundary. Blank text is refused — silently adding an empty row would
 *  make the list look longer than the agreement actually is. */
export function addEntry(covenant: Covenant, kind: Boundary, text: string): Covenant {
  const clean = text.trim()
  if (!clean) return covenant
  return { ...covenant, entries: [...covenant.entries, { id: newId(), kind, text: clean }] }
}

/** Edit in place. Clearing the text does NOT delete the row — deleting is an
 *  explicit act with its own button, so a fumbled edit cannot erase a line. */
export function updateEntry(
  covenant: Covenant,
  id: string,
  patch: Partial<Pick<CovenantEntry, 'kind' | 'text'>>,
): Covenant {
  return {
    ...covenant,
    entries: covenant.entries.map(e => (e.id === id ? { ...e, ...patch } : e)),
  }
}

export function removeEntry(covenant: Covenant, id: string): Covenant {
  return { ...covenant, entries: covenant.entries.filter(e => e.id !== id) }
}

export function boundariesOf(covenant: Covenant, kind: Boundary): CovenantEntry[] {
  return covenant.entries.filter(e => e.kind === kind)
}

/** True when the table has written nothing down yet — used only to choose
 *  between an empty state and a list. Never used to decide anything about the
 *  veil control itself. */
export function isBlank(covenant: Covenant): boolean {
  return covenant.entries.length === 0 && covenant.note.trim() === ''
}
