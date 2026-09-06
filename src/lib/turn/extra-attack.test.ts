// ---------------------------------------------------------------------------
// Slice R5 — the Action is HELD across two swings
// ---------------------------------------------------------------------------
//
// Marcus: "It also doesnt allow me to take my two mele attacks."
//
// R4 built the rule (`attacksPerAction`). Nothing called it. This slice is the
// first caller, and the behaviour it buys spans three modules at once — the
// state field, the reducer that writes it, and the composer that reads it — so
// the tests live together rather than being scattered a third each into
// `compose.test.ts`, `reduce.test.ts` and `combat-state.test.ts`. One
// behaviour, one file, one story; Gate 3's test plan named those three files
// and this is a deliberate, recorded deviation from it.
//
// NONE OF THESE CAN PASS BEFORE THE SLICE. `attacksUsed` does not exist on
// `CombatState`, `kind` does not exist on `TakenOption`, and the composer has
// no arm that mentions the Attack action.

import { describe, expect, it } from 'vitest'
import type { CombatState } from '../combat-state'
import { attacksPerAction } from '../rules-2024/attacks'
import { composeTurn } from './compose'
import type { LogEntry, TakenOption } from './events'
import { NIX } from './fixtures/nix'
import { reconcile, reduce, revert, takenFrom, type SessionState } from './reduce'
import type { TurnOption } from './types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
  concentrating: null,
}

const session = (over: Partial<SessionState> = {}): SessionState =>
  reconcile({ character: over.character ?? NIX, combat: over.combat ?? FIGHTING })

/** Nix is a level 8 Paladin, so this is 2. Asserted rather than assumed:
 *  if the fixture is ever relevelled below 5 every test below becomes
 *  vacuously true, and a suite that goes green because the premise died is
 *  worse than one that goes red. */
const N = attacksPerAction(NIX)

/** One composed option, by name, from wherever it landed. */
function option(name: string, state: SessionState = session()): TurnOption {
  const turn = composeTurn({ character: state.character, combat: state.combat })
  const hit = [...turn.ranked, ...turn.rest].find(o => o.name === name)
  expect(hit, `no option named ${name} in this turn`).toBeDefined()
  return hit!
}

/** Take something, by name, and return the state it produced. Fails loudly if
 *  the reducer refused — a refusal that a test silently swallowed would make
 *  every assertion after it a statement about the state we started in. */
function take(name: string, state: SessionState = session()): SessionState {
  const applied = reduce(state, { type: 'takeOption', option: takenFrom(option(name, state)) }, [])
  expect(applied.refused, `the reducer refused "${name}": ${applied.refused}`).toBeUndefined()
  return applied.state
}

const WEAPON = 'Hearthbrand'
/** A cantrip on purpose: it costs the action and NO spell slot, so a blocked
 *  result cannot be the one-slot-per-turn rule wearing this slice's face. */
const SPELL = 'Sacred Flame'

// ---------------------------------------------------------------------------
// 1. the premise
// ---------------------------------------------------------------------------

describe('the fixture can still be wrong about this', () => {
  it('Nix has two attacks, which is what makes the rest of this file meaningful', () => {
    expect(N).toBe(2)
  })

  it('the weapon and the cantrip both cost the action', () => {
    expect(option(WEAPON).cost.slot).toBe('action')
    expect(option(SPELL).cost.slot).toBe('action')
  })
})

// ---------------------------------------------------------------------------
// 2. the reducer holds the action open
// ---------------------------------------------------------------------------

describe('the action is held, not spent', () => {
  it('one swing does not close the action', () => {
    const after = take(WEAPON)
    expect(after.combat.turnActions.action).toBe(false)
  })

  it('one swing records one attack used', () => {
    expect(take(WEAPON).combat.attacksUsed).toBe(1)
  })

  it('the second swing is allowed, and it is the one that closes the action', () => {
    const after = take(WEAPON, take(WEAPON))
    expect(after.combat.attacksUsed).toBe(2)
    expect(after.combat.turnActions.action).toBe(true)
  })

  it('a third swing is refused, because the action is now genuinely spent', () => {
    const spent = take(WEAPON, take(WEAPON))
    const third = reduce(spent, { type: 'takeOption', option: takenFrom(option(WEAPON, spent)) }, [])
    expect(third.refused).toBeDefined()
    expect(third.state).toBe(spent)
  })

  it('a character with ONE attack still spends the action on the first swing', () => {
    // The regression that would matter most: everyone who is not a martial.
    const novice = session({ character: { ...NIX, class: 'Cleric', level: 8, features: [] } })
    expect(attacksPerAction(novice.character)).toBe(1)
    const after = take(WEAPON, novice)
    expect(after.combat.turnActions.action).toBe(true)
  })

  it('spending the action on a SPELL closes it outright and holds nothing open', () => {
    const after = take(SPELL)
    expect(after.combat.turnActions.action).toBe(true)
    expect(after.combat.attacksUsed ?? 0).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. the composer tells the truth about why
// ---------------------------------------------------------------------------

describe('mid-Attack, the screen says the true thing', () => {
  const mid = () => take(WEAPON)

  it('the weapon row is STILL AVAILABLE — the complaint, stated as a test', () => {
    const swing = option(WEAPON, mid())
    expect(swing.available).toBe(true)
    expect(swing.blockedReason).toBeUndefined()
  })

  it('a spell costing the action is blocked, and names the Attack action', () => {
    const spell = option(SPELL, mid())
    expect(spell.available).toBe(false)
    expect(spell.blockedReason).toMatch(/attack action/i)
  })

  it('the reason counts what is left, so the sentence is actionable', () => {
    expect(option(SPELL, mid()).blockedReason).toMatch(/1 attack/i)
  })

  it('it does NOT say the action is spent, because that is the false reason', () => {
    // The whole point of putting this arm ABOVE the `spent(slot)` arm. Saying
    // "your action is spent" mid-Attack is a lie that also contradicts the
    // weapon row sitting live two lines above it.
    expect(option(SPELL, mid()).blockedReason).not.toMatch(/is spent/i)
  })

  it('bonus actions are untouched — only the action is mid-decision', () => {
    const turn = composeTurn({ character: mid().character, combat: mid().combat })
    const bonuses = [...turn.ranked, ...turn.rest].filter(o => o.cost.slot === 'bonusAction')
    expect(bonuses.length).toBeGreaterThan(0)
    for (const o of bonuses) expect(o.blockedReason ?? '').not.toMatch(/attack action/i)
  })

  it('once both swings are gone the generic reason comes back', () => {
    const done = take(WEAPON, take(WEAPON))
    const spell = option(SPELL, done)
    expect(spell.available).toBe(false)
    expect(spell.blockedReason).toMatch(/is spent/i)
    expect(spell.blockedReason).not.toMatch(/attack action/i)
  })

  it('before any swing, nothing mentions the Attack action', () => {
    const turn = composeTurn({ character: NIX, combat: FIGHTING })
    for (const o of [...turn.ranked, ...turn.rest]) {
      expect(o.blockedReason ?? '').not.toMatch(/attack action/i)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. a held action must not outlive the turn
// ---------------------------------------------------------------------------

describe('it does not survive the turn that opened it', () => {
  const held = () => take(WEAPON)

  it('ending the turn clears it — a held action that survived would be worse than the bug', () => {
    const after = reduce(held(), { type: 'endTurn' }, []).state
    expect(after.combat.attacksUsed ?? 0).toBe(0)
  })

  it('beginning the next turn clears it', () => {
    const after = reduce(held(), { type: 'beginTurn' }, []).state
    expect(after.combat.attacksUsed ?? 0).toBe(0)
  })

  it('starting a fight clears it', () => {
    const after = reduce(held(), { type: 'startCombat' }, []).state
    expect(after.combat.attacksUsed ?? 0).toBe(0)
  })

  it('ending a fight clears it', () => {
    const after = reduce(held(), { type: 'endCombat' }, []).state
    expect(after.combat.attacksUsed ?? 0).toBe(0)
  })

  it('undoing the first swing puts the state back exactly, held count included', () => {
    const before = session()
    const applied = reduce(before, { type: 'takeOption', option: takenFrom(option(WEAPON)) }, [])
    expect(applied.entry).not.toBeNull()
    expect(applied.state.combat.attacksUsed).toBe(1)
    const back = revert(applied.state, applied.entry as LogEntry)
    expect(back.combat).toStrictEqual(before.combat)
  })

  it('undoing the SECOND swing reopens the action and leaves one used', () => {
    const first = take(WEAPON)
    const applied = reduce(first, { type: 'takeOption', option: takenFrom(option(WEAPON, first)) }, [])
    const back = revert(applied.state, applied.entry as LogEntry)
    expect(back.combat.turnActions.action).toBe(false)
    expect(back.combat.attacksUsed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 5. the localStorage floor
// ---------------------------------------------------------------------------
//
// Marcus has a combat state and an encounter log sitting in his browser right
// now, both written by a build that had never heard of either new field.

describe('what is already in his browser still loads', () => {
  it('a combat state saved without attacksUsed composes without crashing', () => {
    const legacy = { ...FIGHTING }
    delete (legacy as { attacksUsed?: number }).attacksUsed
    const turn = composeTurn({ character: NIX, combat: legacy })
    expect(turn.ranked.length + turn.rest.length).toBeGreaterThan(0)
    expect(option(WEAPON, session({ combat: legacy })).available).toBe(true)
  })

  it('absent attacksUsed means zero, not mid-Attack', () => {
    const legacy = { ...FIGHTING }
    delete (legacy as { attacksUsed?: number }).attacksUsed
    for (const o of composeTurn({ character: NIX, combat: legacy }).ranked) {
      expect(o.blockedReason ?? '').not.toMatch(/attack action/i)
    }
  })

  it('a log entry written without `kind` still reverts', () => {
    // An entry from today's build, replayed by tomorrow's. It must not throw,
    // and it must not be mistaken for a swing.
    const legacy: TakenOption = { ...takenFrom(option(WEAPON)) }
    delete (legacy as { kind?: string }).kind
    const applied = reduce(session(), { type: 'takeOption', option: legacy }, [])
    expect(applied.refused).toBeUndefined()
    // No `kind` means the reducer cannot know it was a swing, so it resolves
    // DOWN — the action closes, exactly as it did before this slice existed.
    expect(applied.state.combat.turnActions.action).toBe(true)
    const back = revert(applied.state, applied.entry as LogEntry)
    expect(back.combat).toStrictEqual(session().combat)
  })

  it('takenFrom carries the kind forward, which is what makes any of this work', () => {
    expect(takenFrom(option(WEAPON)).kind).toBe('attack')
    expect(takenFrom(option(SPELL)).kind).toBe('spell')
  })
})

// ---------------------------------------------------------------------------
// 6. slice R6 — the count leaves the engine
// ---------------------------------------------------------------------------
//
// R5 made all of the above true and NONE of it visible. The composer knew
// `attacksSwung` and `attacksInAction` and kept both to itself: they existed
// only long enough to write one `blockedReason`, and the screen was left to
// infer "you are one swing into two" from the fact that some other rows had
// gone grey. `ComposedTurn.attack` is those same two numbers, returned.
//
// ONE PAIR OF NUMBERS, THREE SURFACES. The header chip, the row's "swing
// again" and the greyed rows' reason all read this, so they cannot disagree
// about the same fight. A component that recomputed the count from the
// character would be a second authority, and the day it drifted the screen
// would contradict itself while looking entirely confident.

describe('the composed turn carries the count', () => {
  const turnOf = (state: SessionState) =>
    composeTurn({ character: state.character, combat: state.combat })

  it('before any swing it is zero of two — present, not absent', () => {
    expect(turnOf(session()).attack).toStrictEqual({ used: 0, of: N })
  })

  it('the count follows the swings', () => {
    expect(turnOf(take(WEAPON)).attack).toStrictEqual({ used: 1, of: 2 })
    expect(turnOf(take(WEAPON, take(WEAPON))).attack).toStrictEqual({ used: 2, of: 2 })
  })

  it('one attack is still a count, not a null', () => {
    // The Cleric's header must be able to say NOTHING, and it has to reach that
    // by reading `of === 1` — not by finding the field missing. A screen that
    // decided by absence would be one optional field away from silently
    // dropping the tally for everyone.
    const novice = session({ character: { ...NIX, class: 'Cleric', level: 8, features: [] } })
    expect(turnOf(novice).attack).toStrictEqual({ used: 0, of: 1 })
  })

  it('the screen count and the engine rule are the same number', () => {
    // The anti-drift test, and the whole reason this is computed in compose.
    for (const character of [
      NIX,
      { ...NIX, class: 'Cleric', level: 8, features: [] },
      { ...NIX, class: 'Fighter', level: 11 },
      { ...NIX, level: 4 },
    ]) {
      expect(composeTurn({ character, combat: FIGHTING }).attack.of).toBe(
        attacksPerAction(character)
      )
    }
  })

  it('the count clears with the turn, like the field it reads', () => {
    const after = reduce(take(WEAPON), { type: 'endTurn' }, []).state
    expect(turnOf(after).attack.used).toBe(0)
  })

  it('a combat state from his browser composes a count anyway', () => {
    const legacy = { ...FIGHTING }
    delete (legacy as { attacksUsed?: number }).attacksUsed
    expect(composeTurn({ character: NIX, combat: legacy }).attack).toStrictEqual({
      used: 0,
      of: 2,
    })
  })

  it('out of combat it is still answered, because the rule is about him', () => {
    // `combat: null` is the character sheet with no encounter loaded. He still
    // has two attacks; he has simply taken none of them.
    expect(composeTurn({ character: NIX, combat: null }).attack).toStrictEqual({
      used: 0,
      of: 2,
    })
  })
})
