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

import type { Character, ClassFeature, PaladinResources, SpellSlots } from '../character'
import type { CombatState } from '../combat-state'
import { spellSlotSpentThisTurn } from '../rules-2024/economy'
import { LOG_DEPTH, type CombatEvent, type LogEntry, type Restore, type TakenOption } from './events'
import { featurePoolId } from './ids'
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

/** Where a pool actually lives on the sheet.  Resolved fresh on every event,
 *  because Marcus can rename or delete a feature between taking an action and
 *  undoing it. */
type PoolSite =
  | { kind: 'paladin'; key: 'layOnHands' | 'channelDivinity'; name: string; current: number }
  | { kind: 'feature'; index: number; name: string; current: number }

/** Find the pool an option is priced against.
 *
 *  Precedence mirrors `resourcesOf()` in compose.ts exactly: the bespoke
 *  `paladinResources` field wins over a same-named feature, because that is
 *  the pool the screen is showing. If those two ever disagree the app charges
 *  one and displays the other, so this order is load-bearing, not stylistic.
 *
 *  Returns null for a pool the sheet does not track — an id from a deleted
 *  feature, or a homebrew option whose author priced it against something they
 *  never gave a `usesMax`. Null means "charge nothing and carry on", never
 *  "refuse": the alternative is an ability Marcus can see and cannot press. */
function resolvePool(character: Character, poolId: string): PoolSite | null {
  const paladin = character.paladinResources
  if (poolId === 'lay-on-hands' && paladin?.layOnHands) {
    return { kind: 'paladin', key: 'layOnHands', name: 'Lay on Hands', current: paladin.layOnHands.current }
  }
  if (poolId === 'channel-divinity' && paladin?.channelDivinity) {
    return {
      kind: 'paladin',
      key: 'channelDivinity',
      name: 'Channel Divinity',
      current: paladin.channelDivinity.current,
    }
  }

  const features = character.features ?? []
  // FIRST match only, and `revert` restores the first match only. Two features
  // sharing a name is a pathological sheet; symmetric handling means it stays
  // merely odd instead of becoming corrupting.
  const index = features.findIndex(f => featurePoolId(f.name, f.usesMax) === poolId)
  if (index < 0) return null

  const feature = features[index]!
  // UNTRACKED unless BOTH halves of the counter are present, which is the rule
  // the rest of the app already runs on — GrimoireCard:132 and
  // LoadoutPanel:168 both define `hasUses` exactly this way, and GrimoireCard
  // then treats a half-declared counter as unlimited rather than as empty.
  //
  // The first draft of this function used AND instead of OR and so read a
  // missing `usesCurrent` as zero, which refused a homebrew feature that the
  // Grimoire happily lets Marcus press. Same sheet, two answers, depending on
  // which screen he was looking at. This is the app's answer.
  if (feature.usesMax === undefined || feature.usesCurrent === undefined) return null

  return { kind: 'feature', index, name: feature.name, current: feature.usesCurrent }
}

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
  const site = option.resourcePoolId ? resolvePool(character, option.resourcePoolId) : null
  if (site && amount > 0) {
    if (site.current < amount) {
      return refuse(state, `Not enough ${site.name} left.`)
    }
  }

  // -- everything is affordable; snapshot, then spend ------------------------
  const restore: Restore = { combat: snap(combat) }
  let nextCharacter = character

  if (nextSpellSlots) {
    restore.spellSlots = snap(character.spellSlots)
    nextCharacter = { ...nextCharacter, spellSlots: nextSpellSlots }
  }

  if (site && amount > 0) {
    if (site.kind === 'paladin') {
      const paladin = nextCharacter.paladinResources!
      restore.paladinResources = snap(paladin)
      nextCharacter = {
        ...nextCharacter,
        paladinResources: {
          ...paladin,
          [site.key]: { ...paladin[site.key], current: site.current - amount },
        } as PaladinResources,
      }
    } else {
      // `site.current` is the declared value, never a `?? 0` default — see
      // resolvePool: a half-declared counter never resolves to a site at all.
      restore.featureUses = { [site.name]: site.current }
      const features = nextCharacter.features.map((f, i) =>
        i === site.index ? { ...f, usesCurrent: site.current - amount } : f,
      )
      nextCharacter = { ...nextCharacter, features }
    }
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
  if (restore.paladinResources !== undefined) {
    character = { ...character, paladinResources: snap(restore.paladinResources) }
  }
  if (restore.featureUses !== undefined) {
    const uses = restore.featureUses
    const done = new Set<string>()
    character = {
      ...character,
      // FIRST match only, mirroring resolvePool. Two features sharing a name
      // is a pathological sheet; symmetric handling keeps it merely odd.
      features: (character.features ?? []).map(f => {
        if (!Object.prototype.hasOwnProperty.call(uses, f.name) || done.has(f.name)) return f
        done.add(f.name)
        return { ...f, usesCurrent: uses[f.name]! }
      }),
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
