// The turn machine — the only thing in the app allowed to SPEND
//
// Everything else in src/lib/turn/ answers "what could you do". This answers
// "you did it", and it is the first module in V1.0 that changes Marcus's
// character sheet. That makes it the highest-risk file in the slice, so it is
// built to three rules:
//
//   1. PURE. `reduce` and `revert` are functions of their arguments. No
//      localStorage, no Date, no crypto, no React. Persistence belongs to
//      CombatProvider, which is the one place allowed to write.
//
//   2. NEVER THROW. This engine runs on content the engine has never seen —
//      Nix is homebrew, the Oath of the Hearth is homebrew, and Marcus edits
//      his sheet between sessions. An event naming a pool that no longer
//      exists must degrade to "take the action, charge nothing", never to a
//      white screen at the table.
//
//   3. REVERSIBLE. Every accepted event returns a LogEntry carrying the
//      absolute prior value of everything it touched, and
//      `revert(reduce(s, e).state, entry)` is deep-equal to `s`. That is a
//      property, not a hope, and reduce.test.ts proves it per variant.
//
// WHAT IT DOES NOT DECIDE
//
// Legality. Whether Nix may act while Incapacitated, whether an option is
// contended, whether a condition greys a row — all of that is composeTurn's,
// and duplicating it here would create two rulebooks that drift. This file
// guards AFFORDABILITY only: the slot is still open, the pool still has
// something in it, and the 2024 one-spell-slot-per-turn rule holds. Those are
// the four ways a tap can quietly corrupt the sheet, and they are the four
// things worth a second lock.

import type { Character, ClassFeature, SpellSlots } from '../character'
import type { CombatState } from '../combat-state'
import { spellSlotSpentThisTurn } from '../rules-2024/economy'
import { findPool, setPoolCurrent, spendable } from '../rules-2024/resources'
import { LOG_DEPTH, type CombatEvent, type LogEntry, type Restore, type TakenOption } from './events'
import type { TurnOption } from './types'

/** The two things a turn can change, together.  Deliberately NOT a class and
 *  not a store: the reducer is a function over this pair, so a test can build
 *  one in two lines and the provider can hold one in a ref. */
export interface SessionState {
  character: Character
  combat: CombatState
}

/** The outcome of dispatching one event.
 *
 *  `entry` is null exactly when nothing changed — either the event was refused
 *  or it was a no-op. A caller that appends a null entry would put an undo
 *  button on screen that undoes nothing, so the type makes that impossible to
 *  do by accident. */
export interface Applied {
  state: SessionState
  entry: LogEntry | null
  /** Human-readable, shown to Marcus. Present iff the event was refused. */
  refused?: string
}

// ---------------------------------------------------------------------------
// The spell-slot mirror
// ---------------------------------------------------------------------------
//
// V0.9 stores spell slots TWICE: `character.spellSlots[n] = {max, current}` is
// the sheet, and `combat.spellSlots[n] = {max, used}` is the combat tracker.
// Two writers, two shapes, opposite polarity — and the documented drift bug
// where casting from one screen left the other stale.
//
// Deleting one of them is the tempting fix and it is the wrong one: both are
// live in localStorage on Marcus's iPad right now, and a migration that
// mis-reads either loses his slots mid-campaign. So instead the combat copy is
// demoted to a DERIVED MIRROR — recomputed from the sheet on every reduce and
// on every load, never written independently. The storage shape does not
// change, nothing needs migrating, and the drift becomes unrepresentable.

type CombatSlots = CombatState['spellSlots']

function mirrorOf(character: Character): CombatSlots {
  const out: CombatSlots = {}
  for (const [level, slot] of Object.entries(character.spellSlots ?? {})) {
    const n = Number(level)
    if (!Number.isFinite(n)) continue
    const max = slot?.max ?? 0
    const current = slot?.current ?? 0
    // Clamped: a sheet edited to current > max must not produce negative
    // "used", which would render as a spell slot pip count below zero.
    out[n] = { used: Math.max(0, max - current), max }
  }
  return out
}

function sameSlots(a: CombatSlots, b: CombatSlots): boolean {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every(k => {
    const x = a[Number(k)]
    const y = b[Number(k)]
    return !!y && x!.used === y.used && x!.max === y.max
  })
}

/** Bring the combat tracker back in line with the sheet.
 *
 *  Idempotent, and returns the SAME object when nothing moved — React leans on
 *  that to skip a render, and the round-trip proof leans on it to stay
 *  byte-identical. Call it on load, after any edit made outside combat, and
 *  after every reduce. */
export function reconcile(state: SessionState): SessionState {
  const spellSlots = mirrorOf(state.character)
  if (sameSlots(state.combat.spellSlots ?? {}, spellSlots)) return state
  return { ...state, combat: { ...state.combat, spellSlots } }
}

// ---------------------------------------------------------------------------
// Resource pools
// ---------------------------------------------------------------------------

// Slice 6b deleted this file's private `resolvePool`/`PoolSite` pair in favour
// of `rules-2024/resources.ts`. The deletion is the point of the slice, not a
// tidy-up: that function and `resourcesOf()` in compose.ts were two independent
// implementations of "where does this pool live", and they had to agree on
// precedence, on ids, and on what counts as a tracked counter, forever, by
// hand. Whenever they disagreed the app would charge one pool and display
// another — the failure that still looks correct on screen.
//
// Everything the old function documented is preserved in `poolsOf()`:
// paladin-before-feature precedence, first-match-only, and BOTH halves of a
// counter required before it can be charged. It adds the third site,
// `character.resourcePools`, which is what Marcus authors himself.
//
// `findPool` still returns null for a pool the sheet does not track — an id
// from a deleted feature, or a homebrew option priced against something that
// was never given a `usesMax`. Null still means "charge nothing and carry on",
// never "refuse": the alternative is an ability Marcus can see and cannot
// press.

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/** A deep copy, JSON-shaped.
 *
 *  Storing a reference would be deep-equal today and a live grenade tomorrow:
 *  the log is JSON round-tripped through localStorage anyway, so cloning at
 *  capture makes an in-memory undo behave EXACTLY like an undo after a reload.
 *  Two behaviours that differ only after a tab suspend is the bug class this
 *  whole slice is built to avoid. */
function snap<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`

// ---------------------------------------------------------------------------
// reduce
// ---------------------------------------------------------------------------

/** Apply one event.
 *
 *  @param log  the encounter log so far — read ONLY for the one-spell-slot
 *              rule, which is scoped to the round and so cannot be answered
 *              from state alone. Not mutated; the caller appends.
 */
export function reduce(
  state: SessionState,
  event: CombatEvent,
  log: readonly LogEntry[] = [],
): Applied {
  switch (event.type) {
    case 'takeOption':
      return takeOption(state, event, event.option, log)
    case 'endTurn':
      return endTurn(state, event)
    case 'startCombat':
      return startCombat(state, event)
    case 'endCombat':
      return endCombat(state, event)
    default:
      // Forward compatibility, and it is not theoretical: an entry written by
      // a newer build can be sitting in localStorage when Safari serves the
      // cached older one. Refuse it, keep the state, stay on screen.
      return { state, entry: null, refused: 'This app version does not know that action.' }
  }
}

function refuse(state: SessionState, why: string): Applied {
  return { state, entry: null, refused: why }
}

function takeOption(
  state: SessionState,
  event: CombatEvent,
  option: TakenOption,
  log: readonly LogEntry[],
): Applied {
  const { character, combat } = state
  const round = combat.round

  // -- 1. the economy slot ---------------------------------------------------
  // 'free' and 'movement' riders never close a slot; everything else does.
  const slot = option.slot
  if (slot === 'action' || slot === 'bonusAction' || slot === 'reaction') {
    if (combat.turnActions?.[slot]) {
      return refuse(state, `Your ${SLOT_WORD[slot]} is already spent this turn.`)
    }
  }

  // -- 2. the spell slot -----------------------------------------------------
  const level = option.spellSlotLevel
  const spendsSlot = typeof level === 'number' && level > 0
  let nextSpellSlots: SpellSlots | undefined
  if (spendsSlot) {
    // The 2024 rule, and note the scope: one slot per TURN, across every
    // action type. Action Surge does not buy a second levelled spell.
    if (spellSlotSpentThisTurn(log, round)) {
      return refuse(state, 'You have already expended a spell slot this turn.')
    }
    const line = character.spellSlots?.[level!]
    if (!line || line.current <= 0) {
      return refuse(state, `No ${ordinal(level!)}-level slots remaining.`)
    }
    nextSpellSlots = { ...character.spellSlots, [level!]: { ...line, current: line.current - 1 } }
  }

  // -- 3. the resource pool --------------------------------------------------
  const amount = option.resourceAmount ?? 1
  const site = option.resourcePoolId ? findPool(character, option.resourcePoolId) : null
  if (site && amount > 0 && !spendable(site, amount)) {
    return refuse(state, `Not enough ${site.name} left.`)
  }

  // -- everything is affordable; snapshot, then spend ------------------------
  const restore: Restore = { combat: snap(combat) }
  let nextCharacter = character

  if (nextSpellSlots) {
    restore.spellSlots = snap(character.spellSlots)
    nextCharacter = { ...nextCharacter, spellSlots: nextSpellSlots }
  }

  if (site && amount > 0) {
    // One line for all three kinds of pool. `site.current` is the declared
    // value, never a `?? 0` default — `poolsOf` skips a half-declared counter
    // entirely, so it can never resolve to a site in the first place.
    //
    // The snapshot is keyed by POOL ID, and it is taken BEFORE the write. That
    // ordering is the whole of Undo's correctness: `setPoolCurrent` clamps, and
    // a clamp destroys the number an inverse would need to run backwards.
    restore.pools = { [site.id]: site.current }
    nextCharacter = setPoolCurrent(nextCharacter, site.id, site.current - amount)
  }

  const closesSlot =
    slot === 'action' || slot === 'bonusAction' || slot === 'reaction' || slot === 'movement'
  const turnActions = closesSlot ? { ...combat.turnActions, [slot]: true } : combat.turnActions

  // NOTHING HAPPENED is a real outcome, and it must not produce a log entry.
  // A free rider on a homebrew feature the sheet does not count — Vow of
  // Enmity, say — costs no slot, no spell slot and no points. Logging it would
  // put "Undo — Vow of Enmity" on screen over a button that restores an
  // identical state: a control that lies about having done something, which is
  // the 🔴 "half-built feature running as if done" rule in miniature.
  const touched =
    closesSlot ||
    nextCharacter !== character ||
    (option.concentration !== undefined && option.concentration !== combat.concentrating)
  if (!touched) return { state: reconcile(state), entry: null }

  const nextCombat: CombatState = {
    ...combat,
    turnActions,
    // Starting a new concentration spell drops the old one, which is the rule
    // and is also why `restore.combat` is captured whole: undo has to put the
    // previous spell back, not merely clear this one.
    concentrating: option.concentration ?? combat.concentrating,
  }

  const entry: LogEntry = {
    event,
    restore,
    label: option.name,
    round,
    ...(spendsSlot ? { spellSlotLevel: level } : {}),
  }

  return { state: reconcile({ character: nextCharacter, combat: nextCombat }), entry }
}

const SLOT_WORD: Record<'action' | 'bonusAction' | 'reaction', string> = {
  action: 'action',
  bonusAction: 'bonus action',
  reaction: 'reaction',
}

function endTurn(state: SessionState, event: CombatEvent): Applied {
  const { combat } = state
  const entry: LogEntry = {
    event,
    restore: { combat: snap(combat) },
    label: `End of round ${combat.round}`,
    round: combat.round,
  }
  return {
    state: {
      ...state,
      combat: {
        ...combat,
        round: combat.round + 1,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      },
    },
    entry,
  }
}

function startCombat(state: SessionState, event: CombatEvent): Applied {
  const { character, combat } = state
  const entry: LogEntry = {
    event,
    restore: { combat: snap(combat) },
    label: 'Start of combat',
    round: combat.round,
  }
  return {
    state: reconcile({
      character,
      combat: {
        ...combat,
        inCombat: true,
        round: 1,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        // Concentration SURVIVES rolling initiative. `createCombatState` in
        // combat-state.ts clears it; that is a bug you only notice if you cast
        // Shield of Faith in the corridor and then get jumped, which is
        // exactly how it goes. Nothing about initiative breaks concentration.
        concentrating: combat.concentrating,
      },
    }),
    entry,
  }
}

function endCombat(state: SessionState, event: CombatEvent): Applied {
  const { character, combat } = state
  const entry: LogEntry = {
    event,
    restore: { combat: snap(combat) },
    label: 'End of combat',
    round: combat.round,
  }
  return {
    state: reconcile({
      character,
      combat: {
        ...combat,
        inCombat: false,
        round: 1,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        // Cleared here and not on startCombat: the fight is over, and a stale
        // "concentrating on Bless" badge three sessions later is worse than a
        // dropped one. Undo restores it from the snapshot if it mattered.
        concentrating: null,
      },
    }),
    entry,
  }
}

// ---------------------------------------------------------------------------
// revert
// ---------------------------------------------------------------------------

/** Put back exactly what one entry took.
 *
 *  A restoration, not a computation — see the header of events.ts for why the
 *  inverse-event design was rejected. Applying `revert` to a state the entry
 *  did not come from is undefined but safe: it overwrites the recorded keys
 *  and leaves everything else alone. */
export function revert(state: SessionState, entry: LogEntry): SessionState {
  const restore = entry.restore
  let character = state.character

  if (restore.spellSlots !== undefined) {
    character = { ...character, spellSlots: snap(restore.spellSlots) }
  }
  if (restore.pools !== undefined) {
    // One loop, whatever kind of pool each id turns out to name. The two
    // hand-written branches this replaced could only ever put back the two
    // kinds of pool that existed when they were written.
    //
    // `setPoolCurrent` is deliberately forgiving here, and both of its
    // forgivenesses matter at a real table:
    //   · A pool that no longer exists is a QUIET NO-OP. Marcus can delete a
    //     homebrew pool between spending it and undoing the spend, and Undo
    //     must not crash mid-encounter over a resource he has thrown away.
    //   · The value is clamped to the pool's CURRENT max, not the max it had
    //     when the snapshot was taken. If he lowered the max in between,
    //     handing back the old number would hand back a pool bigger than the
    //     one he now owns.
    for (const [poolId, prior] of Object.entries(restore.pools)) {
      character = setPoolCurrent(character, poolId, prior)
    }
  }

  // The combat snapshot is absolute and always present, so no mirror pass is
  // needed: it was taken while character and combat agreed, and both halves
  // are being restored together.
  return { character, combat: snap(restore.combat) }
}

// ---------------------------------------------------------------------------
// The log
// ---------------------------------------------------------------------------

/** Flatten a rendered option into the self-contained record the log stores.
 *
 *  The one narrowing on the way in, and it belongs here rather than in the
 *  component: what the UI holds is a `TurnOption` that will be regenerated on
 *  the next render, and what the log needs is a value that still means
 *  something after Marcus levels up. Everything not on this list — the detail
 *  string, the rider prose, the rank — is presentation, and presentation has
 *  no business in a persisted format. */
export function takenFrom(option: TurnOption): TakenOption {
  return {
    id: option.id,
    name: option.name,
    slot: option.cost.slot,
    ...(option.cost.spellSlotLevel !== undefined ? { spellSlotLevel: option.cost.spellSlotLevel } : {}),
    ...(option.cost.resourcePoolId !== undefined
      ? {
          resourcePoolId: option.cost.resourcePoolId,
          resourceAmount: option.cost.resourceAmount ?? 1,
        }
      : {}),
    ...(option.concentration !== undefined ? { concentration: option.concentration } : {}),
  }
}

/** Append, oldest dropped past LOG_DEPTH.  Returns a new array. */
export function append(log: readonly LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [...log, entry]
  return next.length > LOG_DEPTH ? next.slice(next.length - LOG_DEPTH) : next
}

/** Undo the most recent entry.  Returns the same log and state when there is
 *  nothing to undo, so the caller can treat "no history" as a no-op rather
 *  than a special case. */
export function undo(
  state: SessionState,
  log: readonly LogEntry[],
): { state: SessionState; log: readonly LogEntry[]; entry: LogEntry | null } {
  const entry = log.length > 0 ? log[log.length - 1]! : null
  if (!entry) return { state, log, entry: null }
  return { state: revert(state, entry), log: log.slice(0, -1), entry }
}
