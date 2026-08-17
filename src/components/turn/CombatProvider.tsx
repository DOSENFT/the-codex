import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Character } from '../../lib/character'
import {
  createCombatState,
  loadCombatState,
  saveCombatState,
  type CombatState,
} from '../../lib/combat-state'
import { composeTurn } from '../../lib/turn/compose'
import { logStorageKey, type CombatEvent, type LogEntry } from '../../lib/turn/events'
import {
  append,
  reconcile,
  reduce,
  takenFrom,
  undo,
  type SessionState,
} from '../../lib/turn/reduce'
import type { ComposedTurn, TurnOption } from '../../lib/turn/types'

/* ============================================================================
   CombatProvider — the only place in the app that writes during a turn
   ----------------------------------------------------------------------------
   The rules engine is pure and provably reversible. This is where that meets
   a browser, and everything risky about the slice lives in these ~150 lines.
   Three commitments:

   1.  ONE WRITE PATH FOR THE CHARACTER. This provider never calls
       saveCharacter(). It is handed `onCharacterUpdate` — which is
       useCharacter's `setCharacter`, the function that has always owned the
       sheet — and calls that. A second writer to the same localStorage key is
       how you get a character who quietly loses a level, and V0.9 had exactly
       that class of bug between CombatHelper and the Grimoire.

   2.  PERSIST IMPERATIVELY, INSIDE THE HANDLER. Not in a useEffect. An effect
       that writes state it also reads is the CombatHelper:1281 write-loop, and
       it is worse than a loop: on a suspended iPad tab the effect may not run
       before the process is reclaimed, so the tap is on screen and gone from
       storage. Here, by the time `setCombat` is called the bytes are down.

   3.  THE PROVIDER IS BOUND TO ONE CHARACTER. Mount it with
       `key={character.id}`; switching characters remounts it and re-reads that
       character's own encounter. There is deliberately no effect that watches
       the id, because the failure mode of getting that wrong is writing Nix's
       spent slots onto somebody else's sheet.
   ========================================================================== */

export interface CombatApi {
  /** The whole screen, recomputed from (character, combat, log). */
  turn: ComposedTurn
  inCombat: boolean
  take: (option: TurnOption) => void
  endTurn: () => void
  /** Your turn comes round again — and with it, your Reaction.  Slice 7.
   *
   *  Deliberately a separate verb from `endTurn`, all the way up to here. The
   *  stretch between the two is everyone else's turn, and it is the only window
   *  in which a Reaction is the whole of what you own. Collapsing the pair into
   *  one button would delete that window and, with it, the rule. */
  beginTurn: () => void
  startEncounter: () => void
  endEncounter: () => void
  undoLast: () => void
  /** "Divine Smite" — what the Undo button should offer, or null if nothing. */
  undoLabel: string | null
  /** Set when the last tap was refused, with the reason to show Marcus. */
  refusal: string | null
  dismissRefusal: () => void
}

const CombatContext = createContext<CombatApi | null>(null)

export function useCombat(): CombatApi {
  const value = useContext(CombatContext)
  if (!value) throw new Error('useCombat() must be called inside <CombatProvider>')
  return value
}

// ---------------------------------------------------------------------------
// The log's own storage
// ---------------------------------------------------------------------------

/** Enough of a shape check to reject junk without pretending to validate.
 *
 *  This reads bytes written by a possibly-different build. A missing field
 *  costs one undo; a thrown exception costs the whole turn screen, at the
 *  table, in the middle of a fight. So: filter, never throw. */
function looksLikeEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<LogEntry>
  return (
    typeof entry.round === 'number' &&
    typeof entry.label === 'string' &&
    typeof entry.event === 'object' &&
    entry.event !== null &&
    typeof entry.restore === 'object' &&
    entry.restore !== null &&
    typeof (entry.restore as { combat?: unknown }).combat === 'object'
  )
}

function loadLog(characterId: string): LogEntry[] {
  try {
    const raw = localStorage.getItem(logStorageKey(characterId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(looksLikeEntry) : []
  } catch {
    return []
  }
}

function saveLog(characterId: string, log: readonly LogEntry[]): void {
  try {
    localStorage.setItem(logStorageKey(characterId), JSON.stringify(log))
  } catch {
    // Quota, or Safari private mode. The turn still happened and the sheet is
    // already saved; losing undo history is the correct thing to sacrifice.
  }
}

// ---------------------------------------------------------------------------

export interface CombatProviderProps {
  character: Character
  /** useCharacter's `setCharacter`. The one write path — see note 1 above. */
  onCharacterUpdate: (character: Character) => void
  children: ReactNode
}

export function CombatProvider({ character, onCharacterUpdate, children }: CombatProviderProps) {
  // Reconciled on the way in, so a sheet edited in the Grimoire while combat
  // was paused shows the right slot count the moment the screen opens. This
  // is a read, not a write: the mirror is derived, so nothing is persisted.
  const [combat, setCombat] = useState<CombatState>(
    () =>
      reconcile({
        character,
        combat: loadCombatState(character.id) ?? createCombatState(character),
      }).combat,
  )
  const [log, setLog] = useState<readonly LogEntry[]>(() => loadLog(character.id))
  const [refusal, setRefusal] = useState<string | null>(null)

  /** Write, then render. Order matters — see note 2. */
  const commit = useCallback(
    (next: SessionState, nextLog: readonly LogEntry[]) => {
      if (next.combat !== combat) {
        saveCombatState(character.id, next.combat)
        setCombat(next.combat)
      }
      if (nextLog !== log) {
        saveLog(character.id, nextLog)
        setLog(nextLog)
      }
      // Last, because it is the write that re-renders the rest of the app.
      if (next.character !== character) onCharacterUpdate(next.character)
    },
    [character, combat, log, onCharacterUpdate],
  )

  const dispatch = useCallback(
    (event: CombatEvent) => {
      const applied = reduce({ character, combat }, event, log)
      if (applied.refused) {
        setRefusal(applied.refused)
        return
      }
      setRefusal(null)
      commit(applied.state, applied.entry ? append(log, applied.entry) : log)
    },
    [character, combat, log, commit],
  )

  const take = useCallback(
    (option: TurnOption) => dispatch({ type: 'takeOption', option: takenFrom(option) }),
    [dispatch],
  )
  const endTurn = useCallback(() => dispatch({ type: 'endTurn' }), [dispatch])
  const beginTurn = useCallback(() => dispatch({ type: 'beginTurn' }), [dispatch])
  const startEncounter = useCallback(() => dispatch({ type: 'startCombat' }), [dispatch])
  const endEncounter = useCallback(() => dispatch({ type: 'endCombat' }), [dispatch])

  const undoLast = useCallback(() => {
    const stepped = undo({ character, combat }, log)
    if (!stepped.entry) return
    setRefusal(null)
    commit(stepped.state, stepped.log)
  }, [character, combat, log, commit])

  // The log goes IN, which is what finally makes the one-spell-slot-per-turn
  // rule bite on screen: composeTurn has accepted it since Slice 1 and has had
  // nothing to read until now.
  const turn = useMemo(() => composeTurn({ character, combat, log }), [character, combat, log])

  const value = useMemo<CombatApi>(
    () => ({
      turn,
      inCombat: combat.inCombat,
      take,
      endTurn,
      beginTurn,
      startEncounter,
      endEncounter,
      undoLast,
      undoLabel: log.length > 0 ? log[log.length - 1]!.label : null,
      refusal,
      dismissRefusal: () => setRefusal(null),
    }),
    [turn, combat.inCombat, take, endTurn, beginTurn, startEncounter, endEncounter, undoLast, log, refusal],
  )

  return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>
}
