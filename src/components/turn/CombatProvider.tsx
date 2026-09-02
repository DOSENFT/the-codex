import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Character } from '../../lib/character'
import {
  clearCombatState,
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

   4.  IT IS THE ONLY OWNER OF `codex-combat-${id}` — added in slice 10b, and
       the reason the slice exists. Until 10b, `CombatHelperInner` kept a SECOND
       `useState<CombatState>` initialised from the same key, and the fixed turn
       deck spent through that one. The two copies agreed exactly once, at
       mount, and diverged on the first tap: the deck greyed the Action, wrote
       `action: true` to disk from an effect, and the ranked list — composed
       from this provider's snapshot, which nothing re-read — went on offering
       Marcus every option he had just paid for until he reloaded the tab.

       Measured in a browser before the fix, by `prove-slice10b.mjs`:
       4 options ready on arrival → 4 after spending the Action → 1 after a
       reload. Source alone could not have settled it; nothing was thrown and
       nothing was logged. The app was simply, silently, one turn behind.

       So the legacy setter moved HERE rather than being deleted or duplicated.
       `updateCombat` is that setter, and it is deliberately NOT the reducer:
       `take`/`endTurn` route through `reduce`, which refuses illegal spends,
       while `updateCombat` is the manual override the deck has always been —
       Marcus tapping a chip because the table said so. Both now write the same
       object, so `composeTurn` sees every spend the moment it happens.
   ========================================================================== */

export interface CombatApi {
  /** The whole screen, recomputed from (character, combat, log). */
  turn: ComposedTurn
  /** The state `turn` was composed from. Exposed in slice 10b so the surfaces
   *  that used to keep their own copy — the turn deck, the round counter, the
   *  concentration band — read the SAME object the engine read. */
  combat: CombatState
  inCombat: boolean
  /** The manual override: set the combat state directly, no rules applied.
   *
   *  This is the turn deck's write path, and the deck is honest about what it
   *  is — a tally Marcus keeps by hand. It does not consult `reduce`, so it
   *  cannot refuse; that is the point of a manual tally. What it DOES do is
   *  persist before it renders, so a tap that is on screen is a tap that is on
   *  disk. Accepts an updater for the call sites that need `prev`. */
  updateCombat: (next: CombatState | ((prev: CombatState) => CombatState)) => void
  /** The encounter is over: forget the stored turn, keep the fresh one.
   *
   *  Separate from `updateCombat` because the old pairing — set, then clear —
   *  wrote the bytes and deleted them in the same breath, and under the effect
   *  it replaced, deleted them and then wrote them BACK. */
  forgetCombat: (next: CombatState) => void
  /** Spend an option through the rules engine.
   *
   *  RETURNS WHETHER IT HAPPENED — added in slice 10c, and the return value is
   *  the slice's smallest load-bearing part. The detail sheet has to close on a
   *  spend and stay open on a refusal, and the only other way to know which
   *  occurred is to watch `refusal` change on a later render — which cannot
   *  distinguish "refused now" from "was already refused", and cannot tell a
   *  refusal apart from a spend that legitimately changed nothing. The reducer
   *  already knows, synchronously; this just stops throwing the answer away. */
  take: (option: TurnOption) => boolean
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
  /** Write down a retaliation die that has already come up.  Slice 10f.
   *
   *  Returns whether it was recorded, for the same reason `take` does: the
   *  confirm strip that offered the number has to close on success and stay
   *  open — with the number still in it, still editable — on a refusal. The one
   *  refusal that will actually happen at the table is "not in combat", and the
   *  worst possible response to it is to swallow the roll. */
  retaliate: (amount: number, source: string) => boolean
  undoLast: () => void
  /** "Divine Smite" — what the Undo button should offer, or null if nothing. */
  undoLabel: string | null
  /** The entry `undoLast` would put back, or null when the log is empty.
   *
   *  THE WHOLE ENTRY, AND NOT JUST ITS LABEL — Held Reaction slice 5. A surface
   *  that offers a *narrow* undo has to be able to ask what it would be undoing,
   *  and the only honest way to ask is by SHAPE: `entry.event.type`. The
   *  reactions band offers "Undo" beside the fire tally and must not offer it
   *  when the last thing that happened was a spell slot — and a band that
   *  decided that by looking for the word "retaliation" inside `label` would be
   *  this phase's own fault wearing a new coat, since `label` is prose built
   *  from a feature name the open-world rule says we may never match on.
   *
   *  `undoLabel` is derived from this rather than read a second time, so the
   *  name on the button and the event behind the button cannot come apart. */
  undoEntry: LogEntry | null
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

  /** True if the event was applied, false if the reducer refused it. Slice 10c
   *  started returning this; every caller before 10c ignored the value and
   *  still may. */
  const dispatch = useCallback(
    (event: CombatEvent) => {
      const applied = reduce({ character, combat }, event, log)
      if (applied.refused) {
        setRefusal(applied.refused)
        return false
      }
      setRefusal(null)
      commit(applied.state, applied.entry ? append(log, applied.entry) : log)
      return true
    },
    [character, combat, log, commit],
  )

  /* The manual path. Note 4.
     `next` is resolved against THIS render's `combat` rather than inside
     `setCombat`'s updater, and that is not laziness — the write has to happen
     exactly once, and it has to happen before the render. React is entitled to
     call an updater twice, which would be two identical writes today and two
     different ones the moment anything in the chain stops being pure. The cost
     is that two calls in a single tick would collapse into one; verified at
     the eleven call sites that moved in 10b that none fires twice in a tick,
     because every one of them is a tap.

     The identity guard is load-bearing too: `toggleEconomy` and friends are
     free to return `prev` unchanged, and a no-op tap must not touch the disk. */
  const updateCombat = useCallback(
    (next: CombatState | ((prev: CombatState) => CombatState)) => {
      const resolved = typeof next === 'function' ? next(combat) : next
      if (resolved === combat) return
      saveCombatState(character.id, resolved)
      setCombat(resolved)
    },
    [character.id, combat],
  )

  const forgetCombat = useCallback(
    (next: CombatState) => {
      clearCombatState(character.id)
      setCombat(next)
    },
    [character.id],
  )

  const take = useCallback(
    (option: TurnOption) => dispatch({ type: 'takeOption', option: takenFrom(option) }),
    [dispatch],
  )
  const endTurn = useCallback(() => dispatch({ type: 'endTurn' }), [dispatch])
  const beginTurn = useCallback(() => dispatch({ type: 'beginTurn' }), [dispatch])
  const startEncounter = useCallback(() => dispatch({ type: 'startCombat' }), [dispatch])
  const endEncounter = useCallback(() => dispatch({ type: 'endCombat' }), [dispatch])
  const retaliate = useCallback(
    (amount: number, source: string) => dispatch({ type: 'retaliate', amount, source }),
    [dispatch],
  )

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

  /* ONE READ OF THE LOG'S LAST ENTRY, and both facts taken off it. Before slice
     5 the label was read here directly; adding a second read for the event type
     would have made it possible for a button to say "Undo Divine Smite" while
     the gate beside it had decided the entry was a retaliation. */
  const undoEntry = log.length > 0 ? log[log.length - 1]! : null

  const value = useMemo<CombatApi>(
    () => ({
      turn,
      combat,
      inCombat: combat.inCombat,
      updateCombat,
      forgetCombat,
      take,
      endTurn,
      beginTurn,
      startEncounter,
      endEncounter,
      retaliate,
      undoLast,
      undoLabel: undoEntry?.label ?? null,
      undoEntry,
      refusal,
      dismissRefusal: () => setRefusal(null),
    }),
    [turn, combat, updateCombat, forgetCombat, take, endTurn, beginTurn, startEncounter, endEncounter, retaliate, undoLast, undoEntry, refusal],
  )

  return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>
}
