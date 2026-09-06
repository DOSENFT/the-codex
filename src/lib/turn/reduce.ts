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

import { setTempHP, type Character, type ClassFeature, type SpellSlots } from '../character'
import type { CombatState } from '../combat-state'
import { spellSlotSpentThisTurn } from '../rules-2024/economy'
import { findPool, setPoolCurrent, spendable } from '../rules-2024/resources'
import { LOG_DEPTH, type CombatEvent, type LogEntry, type Restore, type TakenOption } from './events'
import { attacksPerAction, isWeaponAttack } from '../rules-2024/attacks'
import { addRetaliation } from './retaliation'
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
  const slotsAgree = sameSlots(state.combat.spellSlots ?? {}, spellSlots)
  // Slice 7. A combat state written before this build has no `yourTurn`, and
  // Marcus has one sitting in localStorage right now. Absent reads as TRUE —
  // "it is your turn" is the only behaviour the app has ever had, so nothing
  // he has saved changes meaning when he loads this build.
  const turnKnown = typeof state.combat.yourTurn === 'boolean'
  // Identity is preserved when there is nothing to fix. Callers compare states
  // with strictEqual to prove an event changed nothing, and a fresh object
  // every time would quietly turn those proofs into tautologies.
  if (slotsAgree && turnKnown) return state
  return {
    ...state,
    combat: {
      ...state.combat,
      ...(slotsAgree ? {} : { spellSlots }),
      ...(turnKnown ? {} : { yourTurn: true }),
    },
  }
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
    case 'beginTurn':
      return beginTurn(state, event)
    case 'startCombat':
      return startCombat(state, event)
    case 'endCombat':
      return endCombat(state, event)
    case 'retaliate':
      return retaliate(state, event, event.amount, event.source)
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

/** Drop a half-finished Attack action.  Slice R5.
 *
 *  A function, and not the `attacksUsed: undefined` it replaced, because those
 *  are different objects and this file's round-trip proof can tell. Writing the
 *  key as undefined leaves it PRESENT, and `toStrictEqual` counts a
 *  present-but-undefined key as different from an absent one — which is the
 *  whole reason the proof uses the strict matcher (see this file's header, and
 *  `events.ts`'s). Setting it to undefined therefore made `revert` land one key
 *  away from where it started on every turn boundary: invisible in JSON,
 *  invisible on screen, and a failing property test.
 *
 *  Returns the SAME object when there is nothing to drop, so the identity
 *  guarantee `reconcile` documents survives this too. */
function clearHeldAttacks(combat: CombatState): CombatState {
  if (combat.attacksUsed === undefined) return combat
  const next = { ...combat }
  delete next.attacksUsed
  return next
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
      // Slice 7 dropped "this turn" from the reaction's refusal, and only the
      // reaction's. An action IS spent this turn and comes back with the next
      // one; a reaction, once spent, stays spent through everybody else's turns
      // until yours comes round — so "already spent this turn" was the one
      // phrase guaranteed to be read during a turn that is not yours, saying
      // something false about the turn it is being read in. The other three
      // keep their wording untouched.
      const when = slot === 'reaction' ? ' — it returns when your turn does' : ' this turn'
      return refuse(state, `Your ${SLOT_WORD[slot]} is already spent${when}.`)
    }
  }

  // Slice 7. Off-turn, a reaction is the ONLY thing you own. The screen already
  // greys everything else, but the screen is a view and this is the authority:
  // a stale render, a double-tap that lands after the turn flipped, or a log
  // entry replayed from a build that did not know about turns all arrive here.
  //
  // `free` is not refused. A free rider is bookkeeping, not an action — the
  // reducer has always treated it as costing nothing, and taking that away
  // off-turn would remove capability to enforce a rule nobody is breaking.
  if (combat.yourTurn === false && slot !== 'reaction' && slot !== 'free') {
    return refuse(state, `It is not your turn — only a Reaction is yours right now.`)
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

  // -- 4. the grant ----------------------------------------------------------
  //
  // THE FIRST THING THIS REDUCER EVER GAVE. Every other line above spends: a
  // slot closes, a pool goes down, a spell slot is expended. Slice 10d adds the
  // one arrow that points the other way, because a feature that grants 11
  // temporary hit points and then makes you type "11" into a different screen is
  // a computed fact demoted to a suggestion — and canon's HEARTH-04 rates the
  // resulting confusion HIGH.
  //
  // Snapshot BEFORE the write, and both halves together, for exactly the reason
  // stated on `restore.pools` above: `setTempHP` clamps at 0 and clears the
  // label at 0, so the prior state is unrecoverable the instant it runs. Note
  // that `{ amount: 0, source: null }` is the ordinary case — you usually had no
  // pool at all — which is why this cannot be conditional on there being one.
  //
  // NO PROMPT HERE, and that is deliberate. `rules-2024/temp-hp.ts` decides
  // whether accepting would destroy a live pool, and the two surfaces that can
  // ask a human do the asking before they dispatch. A reducer that silently
  // refused would leave the UI unable to tell "refused" from "applied", and a
  // reducer that prompted would not be a pure function.
  if (option.grantsTempHP !== undefined && option.grantsTempHP > 0) {
    restore.tempHP = { amount: nextCharacter.tempHP ?? 0, source: nextCharacter.tempHPSource ?? null }
    nextCharacter = setTempHP(nextCharacter, option.grantsTempHP, option.name)
  }

  // -- 5. Extra Attack: the action is HELD, not spent -------------------------
  //
  // Slice R5, and the smallest change that answers "It also doesnt allow me to
  // take my two mele attacks." One Attack action contains `attacksPerAction`
  // swings, so the action must stay OPEN between them — otherwise the first
  // swing closes it and the second is refused at the top of this function.
  //
  // The promotion to `action: true` happens on the LAST swing, so every other
  // rule in this file keeps working unchanged: the double-spend refusal above
  // still catches a third attack, `endTurn` still clears the slot, and Undo
  // still restores from `restore.combat`, which was snapshotted whole before
  // any of this ran. `attacksUsed` needs no inverse written for it.
  //
  // `option.kind` is optional on `TakenOption`, so an entry replayed from a
  // build that never wrote it reads as "not a swing" and closes the action
  // outright — the behaviour that entry was recorded under.
  const attacksInAction = attacksPerAction(character)
  const held =
    isWeaponAttack({ kind: option.kind, cost: { slot } }) &&
    attacksInAction > 1 &&
    (combat.attacksUsed ?? 0) + 1 < attacksInAction
  const nextAttacksUsed = isWeaponAttack({ kind: option.kind, cost: { slot } })
    ? (combat.attacksUsed ?? 0) + 1
    : combat.attacksUsed

  const closesSlot =
    slot === 'action' || slot === 'bonusAction' || slot === 'reaction' || slot === 'movement'
  const turnActions =
    closesSlot && !held ? { ...combat.turnActions, [slot]: true } : combat.turnActions

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
    // Spread conditionally, never as `attacksUsed: undefined`. This file's
    // round-trip proof uses `toStrictEqual`, which counts a present-but-
    // undefined key as different from an absent one — writing the key
    // unconditionally would make every Undo test fail on a difference that is
    // invisible in JSON and real in JavaScript.
    ...(nextAttacksUsed !== undefined ? { attacksUsed: nextAttacksUsed } : {}),
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
        ...clearHeldAttacks(combat),
        round: combat.round + 1,
        // SLICE 7 — THE ONE CHANGE HERE, AND IT IS A RULES FIX.
        //
        // The action, the bonus action and the movement are gone the instant
        // your turn is: you cannot take any of them while the ogre swings.
        // The REACTION is the exception — it is the only thing you own during
        // everybody else's turn, and 2024 gives it back at the START of your
        // next turn, not at the end of this one. Clearing it here (as every
        // build before this one did) meant a reaction spent on your own turn
        // was silently handed back to you the moment you tapped End turn, and
        // you could spend it again before your next turn ever arrived.
        //
        // So it survives, and `beginTurn` is what returns it.
        turnActions: {
          action: false,
          bonusAction: false,
          movement: false,
          reaction: combat.turnActions?.reaction === true,
        },
        yourTurn: false,
      },
    },
    entry,
  }
}

/** My turn comes round again. Everything refreshes, including the reaction.
 *
 *  Deliberately NOT folded into `endTurn`. The gap between the two is the
 *  whole point of the slice: it is the stretch of table time where Marcus owns
 *  exactly one thing, and until now the app pretended it did not exist. */
function beginTurn(state: SessionState, event: CombatEvent): Applied {
  const { combat } = state
  const entry: LogEntry = {
    event,
    restore: { combat: snap(combat) },
    label: `Start of round ${combat.round}`,
    round: combat.round,
  }
  return {
    state: {
      ...state,
      combat: {
        ...clearHeldAttacks(combat),
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        yourTurn: true,
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
        ...clearHeldAttacks(combat),
        inCombat: true,
        round: 1,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        // Concentration SURVIVES rolling initiative. `createCombatState` in
        // combat-state.ts clears it; that is a bug you only notice if you cast
        // Shield of Faith in the corridor and then get jumped, which is
        // exactly how it goes. Nothing about initiative breaks concentration.
        concentrating: combat.concentrating,
        // A new fight starts at zero. Slice 10f — see `endCombat` below for why
        // it is cleared at BOTH ends rather than only one.
        retaliation: undefined,
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
        ...clearHeldAttacks(combat),
        inCombat: false,
        round: 1,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        // Cleared here and not on startCombat: the fight is over, and a stale
        // "concentrating on Bless" badge three sessions later is worse than a
        // dropped one. Undo restores it from the snapshot if it mattered.
        concentrating: null,
        // PER ENCOUNTER, and cleared at both ends on purpose. Clearing only on
        // `startCombat` would leave last fight's total on screen for as long as
        // the party stayed out of initiative — a number that is true of nothing
        // currently happening, sitting where the DM reads it. Clearing only on
        // `endCombat` would carry a tally into a fight that began without the
        // last one being formally ended, which is how it usually goes. Both.
        //
        // Undo puts it back either way: `restore.combat` is the whole state.
        retaliation: undefined,
      },
    }),
    entry,
  }
}

/** Write down a retaliation die that has already been rolled.
 *
 *  THE ONLY EVENT THAT ADDS INFORMATION. Every other variant rearranges facts
 *  the app could recompute from the sheet; this one is the app's only memory of
 *  a physical thing that happened once. That asymmetry is why it is the only
 *  event whose payload is validated: an `amount` of NaN reaching the tally
 *  would render "NaN damage" to the DM and there would be nothing left to
 *  recover it from.
 *
 *  Refused out of combat, deliberately. "Per encounter" is meaningless when
 *  there is no encounter, and silently accepting would open a tally that the
 *  next `startCombat` immediately wipes — the app would have taken the tap,
 *  shown a total, and then lost it, which is worse than saying no. */
function retaliate(
  state: SessionState,
  event: CombatEvent,
  amount: number,
  source: string,
): Applied {
  const { character, combat } = state

  if (!combat.inCombat) {
    return refuse(state, 'Start the encounter before recording retaliation damage.')
  }
  if (!Number.isFinite(amount) || Math.trunc(amount) < 1) {
    return refuse(state, 'A retaliation has to be at least 1 damage.')
  }

  const rolled = Math.trunc(amount)
  const entry: LogEntry = {
    event,
    // Whole, as always. `addRetaliation` returns a new object, but the snapshot
    // is what makes undo a restoration rather than a subtraction — and
    // subtracting is exactly where a tally would drift, since undoing the
    // FIRST of three retaliations must leave the other two intact.
    restore: { combat: snap(combat) },
    label: `${source} — ${rolled} retaliation`,
    round: combat.round,
  }

  return {
    state: reconcile({ character, combat: addRetaliation(combat, rolled) }),
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
  if (restore.tempHP !== undefined) {
    // Un-granting, which is the one direction Undo did not have to reverse
    // before slice 10d. Absolute, like everything else here — it puts back the
    // pool that was standing when the option was taken, whether that was 0 (the
    // usual case) or another feature's 11 that the grant had replaced.
    //
    // Damage taken since is deliberately NOT compensated for. Undo restores what
    // one entry did; it is not a rewind of the encounter, and pretending
    // otherwise would hand back hit points the ogre already ate.
    character = setTempHP(character, restore.tempHP.amount, restore.tempHP.source)
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
    // Slice R5. Copied at take-time for the reason every other field here is
    // copied: the log outlives the option list, and by the time this entry is
    // read the option object it came from may no longer exist.
    kind: option.kind,
    ...(option.cost.spellSlotLevel !== undefined ? { spellSlotLevel: option.cost.spellSlotLevel } : {}),
    ...(option.cost.resourcePoolId !== undefined
      ? {
          resourcePoolId: option.cost.resourcePoolId,
          resourceAmount: option.cost.resourceAmount ?? 1,
        }
      : {}),
    ...(option.concentration !== undefined ? { concentration: option.concentration } : {}),
    ...(option.grantsTempHP !== undefined ? { grantsTempHP: option.grantsTempHP } : {}),
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
