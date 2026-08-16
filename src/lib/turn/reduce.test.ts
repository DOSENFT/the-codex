// The reducer is the first thing in V1.0 that writes to Marcus's sheet, so
// these tests are less a checklist than a contract. Three groups:
//
//   1. THE ROUND-TRIP PROOF. Every event variant, applied to a state and then
//      reverted, must be STRICTLY equal to where it started. `toStrictEqual`
//      and not `toEqual`, deliberately: `toEqual` treats `{usesCurrent:
//      undefined}` as equal to `{}`, which is exactly the distinction the
//      snapshot design exists to preserve. Using the looser matcher
//      would make the most subtle bug in the file invisible.
//
//   2. THE AFFORDABILITY LOCKS. Four ways a tap can silently corrupt the
//      sheet, four refusals.
//
//   3. THE OPEN WORLD. Content the engine has never seen must survive.
//
// None of these can pass against Slice 5's code: `reduce` did not exist.
import { describe, expect, it } from 'vitest'
import type { Character, ClassFeature } from '../character'
import type { CombatState } from '../combat-state'
import { composeTurn } from './compose'
import type { CombatEvent, LogEntry, TakenOption } from './events'
import { LOG_DEPTH } from './events'
import { NIX } from './fixtures/nix'
import { append, reconcile, reduce, revert, takenFrom, undo, type SessionState } from './reduce'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
  concentrating: null,
}

/** A session that is already self-consistent, so any drift a test sees was
 *  caused by the code under test and not by the fixture. */
function session(over: Partial<SessionState> = {}): SessionState {
  return reconcile({
    character: over.character ?? NIX,
    combat: over.combat ?? FIGHTING,
  })
}

function taken(over: Partial<TakenOption> = {}): TakenOption {
  return { id: 'x', name: 'Something', slot: 'action', ...over }
}

const SMITE: TakenOption = {
  id: 'spell-divine-smite',
  name: 'Divine Smite',
  slot: 'bonusAction',
  spellSlotLevel: 1,
}
const LAY_ON_HANDS: TakenOption = {
  id: 'feature-lay-on-hands',
  name: 'Lay on Hands',
  slot: 'bonusAction',
  resourcePoolId: 'lay-on-hands',
  resourceAmount: 5,
}
const SHIELD_OF_FAITH: TakenOption = {
  id: 'spell-shield-of-faith',
  name: 'Shield of Faith',
  slot: 'bonusAction',
  spellSlotLevel: 1,
  concentration: 'Shield of Faith',
}

// ---------------------------------------------------------------------------
// 1. The round-trip proof
// ---------------------------------------------------------------------------

describe('the round-trip proof — undo restores, it does not recompute', () => {
  /** Every event worth reverting, paired with a state that makes it interesting. */
  const CASES: Array<{ what: string; state: SessionState; event: CombatEvent }> = [
    {
      what: 'a plain weapon swing',
      state: session(),
      event: { type: 'takeOption', option: taken({ name: 'Hearthbrand' }) },
    },
    {
      what: 'a spell that expends a slot',
      state: session(),
      event: { type: 'takeOption', option: SMITE },
    },
    {
      what: 'a pool spend of more than one point',
      state: session(),
      event: { type: 'takeOption', option: LAY_ON_HANDS },
    },
    {
      what: 'a slot AND a concentration change at once',
      state: session({ combat: { ...FIGHTING, concentrating: 'Bless' } }),
      event: { type: 'takeOption', option: SHIELD_OF_FAITH },
    },
    {
      what: 'a reaction',
      state: session(),
      event: { type: 'takeOption', option: taken({ slot: 'reaction', name: 'Opportunity Attack' }) },
    },
    { what: 'end of turn', state: session(), event: { type: 'endTurn' } },
    {
      what: 'start of combat, mid-concentration',
      state: session({
        combat: { ...FIGHTING, inCombat: false, round: 1, concentrating: 'Shield of Faith' },
      }),
      event: { type: 'startCombat' },
    },
    {
      what: 'end of combat, mid-concentration',
      state: session({ combat: { ...FIGHTING, concentrating: 'Bless' } }),
      event: { type: 'endCombat' },
    },
    {
      what: 'a pool the sheet does not track',
      state: session(),
      event: { type: 'takeOption', option: taken({ resourcePoolId: 'hearth-embers' }) },
    },
  ]

  for (const { what, state, event } of CASES) {
    it(`round-trips: ${what}`, () => {
      const before = structuredClone(state)
      const applied = reduce(state, event, [])

      expect(applied.refused).toBeUndefined()
      expect(applied.entry).not.toBeNull()

      // The event has to have DONE something, or the round-trip is vacuous.
      // Every case above changes at least the economy or the round.
      expect(applied.state).not.toStrictEqual(before)

      expect(revert(applied.state, applied.entry!)).toStrictEqual(before)
    })
  }

  it('round-trips a whole encounter, unwound one entry at a time', () => {
    // The property that actually matters at the table: four things taken over
    // two rounds, then Undo pressed four times, back to the start.
    const start = session()
    const script: CombatEvent[] = [
      { type: 'takeOption', option: SMITE },
      { type: 'takeOption', option: taken({ name: 'Hearthbrand' }) },
      { type: 'endTurn' },
      { type: 'takeOption', option: LAY_ON_HANDS },
    ]

    let state = start
    let log: readonly LogEntry[] = []
    for (const event of script) {
      const applied = reduce(state, event, log)
      expect(applied.refused).toBeUndefined()
      state = applied.state
      log = append(log, applied.entry!)
    }
    expect(log).toHaveLength(4)
    expect(state).not.toStrictEqual(start)

    for (let i = 0; i < 4; i += 1) {
      const stepped = undo(state, log)
      state = stepped.state
      log = stepped.log
    }
    expect(log).toHaveLength(0)
    expect(state).toStrictEqual(start)
  })

  it('logs NOTHING for a free rider that costs nothing', () => {
    // An entry here would put "Undo — Vow of Enmity" over a button that
    // restores an identical state. `entry: null` is the contract for "nothing
    // happened", and it is the difference between an honest control and a
    // decorative one.
    const state = session()
    const out = reduce(state, { type: 'takeOption', option: taken({ slot: 'free', name: 'Vow' }) }, [])
    expect(out.refused).toBeUndefined()
    expect(out.entry).toBeNull()
    expect(out.state).toBe(state)
  })

  it('never charges a half-declared counter, so there is nothing absent to restore', () => {
    // `usesMax` with no `usesCurrent` is UNTRACKED — GrimoireCard:132 and
    // LoadoutPanel:168 both define a tracked counter as having both halves,
    // and GrimoireCard lets Marcus press an untracked ability freely. The
    // reducer must not be the one screen that calls it exhausted.
    const feature: ClassFeature = {
      name: 'Ember Ward',
      level: 3,
      description: 'A homebrew ward.',
      usesMax: 2,
    }
    expect('usesCurrent' in feature).toBe(false)

    const state = session({ character: { ...NIX, features: [feature] } })
    const applied = reduce(
      state,
      { type: 'takeOption', option: taken({ resourcePoolId: 'ember-ward' }) },
      [],
    )
    expect(applied.refused).toBeUndefined()
    expect(applied.entry!.restore.pools).toBeUndefined()
    expect('usesCurrent' in applied.state.character.features[0]!).toBe(false)
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })

  it('does not show a half-declared counter in the resource strip either', () => {
    // The same rule, one layer up. `usesCurrent ?? 0` used to render "0 / 2"
    // for an ability that is in fact usable — the strip calling a working
    // homebrew feature exhausted.
    const character: Character = {
      ...NIX,
      features: [{ name: 'Ember Ward', level: 3, description: 'A homebrew ward.', usesMax: 2 }],
    }
    const turn = composeTurn({ character, combat: FIGHTING })
    expect(turn.resources.find(r => r.id === 'ember-ward')).toBeUndefined()
  })

  it('snapshots by VALUE — an entry never aliases the state it came from', () => {
    // If the snapshot held a reference, undo would work in memory and break
    // after a reload, because localStorage hands back a copy. Two behaviours
    // that differ only after the iPad suspends the tab is the whole failure
    // class this slice exists to close.
    const state = session()
    const applied = reduce(state, { type: 'takeOption', option: SMITE }, [])
    expect(applied.entry!.restore.combat).not.toBe(state.combat)
    expect(applied.entry!.restore.spellSlots).not.toBe(state.character.spellSlots)
  })

  it('restores only the FIRST of two features sharing a name', () => {
    // A pathological sheet, but a survivable one. resolvePool spends from the
    // first match, so revert must put back the first match and leave its twin
    // alone — restore both and the second feature silently inherits the
    // first's number.
    const twin = (usesCurrent: number): ClassFeature => ({
      name: 'Hearth Ember',
      level: 3,
      description: 'Homebrew.',
      usesMax: 5,
      usesCurrent,
    })
    const state = session({ character: { ...NIX, features: [twin(2), twin(5)] } })
    const applied = reduce(
      state,
      { type: 'takeOption', option: taken({ resourcePoolId: 'hearth-ember' }) },
      [],
    )
    expect(applied.state.character.features.map(f => f.usesCurrent)).toStrictEqual([1, 5])
    expect(revert(applied.state, applied.entry!).character.features.map(f => f.usesCurrent)).toStrictEqual([2, 5])
  })

  it('undoes nothing, safely, when there is no history', () => {
    const state = session()
    const stepped = undo(state, [])
    expect(stepped.entry).toBeNull()
    expect(stepped.state).toBe(state)
    expect(stepped.log).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2. What each event actually spends
// ---------------------------------------------------------------------------

describe('spending', () => {
  it('takes the spell slot off the SHEET, not just off the tracker', () => {
    const state = session()
    expect(state.character.spellSlots[1]!.current).toBe(3)

    const after = reduce(state, { type: 'takeOption', option: SMITE }, []).state
    expect(after.character.spellSlots[1]!.current).toBe(2)
    // …and the combat mirror follows without anyone writing to it twice.
    expect(after.combat.spellSlots[1]).toStrictEqual({ used: 2, max: 4 })
  })

  it('spends the full resourceAmount, not one point', () => {
    // Lay on Hands is measured in POINTS. Charging 1 for a 5-point heal is the
    // bug this asserts against; Nix starts on 15 of 40.
    const after = reduce(session(), { type: 'takeOption', option: LAY_ON_HANDS }, []).state
    const pool = after.character.features.find(f => f.name === 'Lay on Hands')!
    expect(pool.usesCurrent).toBe(10)
  })

  it('closes the economy slot the option used, and only that one', () => {
    const after = reduce(session(), { type: 'takeOption', option: SMITE }, []).state
    expect(after.combat.turnActions).toStrictEqual({
      action: false,
      bonusAction: true,
      reaction: false,
      movement: false,
    })
  })

  it('leaves every slot open for a free rider', () => {
    const after = reduce(
      session(),
      { type: 'takeOption', option: taken({ slot: 'free' }) },
      [],
    ).state
    expect(after.combat.turnActions).toStrictEqual(FIGHTING.turnActions)
  })

  it('records the slot level on the entry so the one-slot rule can see it', () => {
    const entry = reduce(session(), { type: 'takeOption', option: SMITE }, []).entry!
    expect(entry.spellSlotLevel).toBe(1)
    expect(entry.round).toBe(3)
    expect(entry.label).toBe('Divine Smite')
  })

  it('leaves no spellSlotLevel on a cantrip', () => {
    const entry = reduce(session(), { type: 'takeOption', option: taken() }, []).entry!
    expect('spellSlotLevel' in entry).toBe(false)
  })

  it('advances the round and reopens every slot on end of turn', () => {
    const spent = reduce(session(), { type: 'takeOption', option: SMITE }, []).state
    const after = reduce(spent, { type: 'endTurn' }, []).state
    expect(after.combat.round).toBe(4)
    expect(after.combat.turnActions).toStrictEqual(FIGHTING.turnActions)
    // The SHEET is untouched — a new turn does not hand back the spell slot.
    expect(after.character.spellSlots[1]!.current).toBe(2)
  })

  it('keeps concentration through rolling initiative', () => {
    // You cast Shield of Faith in the corridor and then get jumped. Nothing
    // about initiative breaks concentration, and combat-state.createCombatState
    // clearing it is the bug this reducer refuses to inherit.
    const state = session({
      combat: { ...FIGHTING, inCombat: false, concentrating: 'Shield of Faith' },
    })
    const after = reduce(state, { type: 'startCombat' }, []).state
    expect(after.combat.inCombat).toBe(true)
    expect(after.combat.round).toBe(1)
    expect(after.combat.concentrating).toBe('Shield of Faith')
  })

  it('drops concentration when the fight ends', () => {
    const state = session({ combat: { ...FIGHTING, concentrating: 'Bless' } })
    const after = reduce(state, { type: 'endCombat' }, []).state
    expect(after.combat.inCombat).toBe(false)
    expect(after.combat.concentrating).toBeNull()
  })

  it('swaps concentration to the new spell, and undo puts the old one back', () => {
    const state = session({ combat: { ...FIGHTING, concentrating: 'Bless' } })
    const applied = reduce(state, { type: 'takeOption', option: SHIELD_OF_FAITH }, [])
    expect(applied.state.combat.concentrating).toBe('Shield of Faith')
    expect(revert(applied.state, applied.entry!).combat.concentrating).toBe('Bless')
  })
})

// ---------------------------------------------------------------------------
// 3. The affordability locks
// ---------------------------------------------------------------------------

describe('refusals — the four ways a tap could corrupt the sheet', () => {
  it('refuses a second bonus action in the same turn', () => {
    const once = reduce(session(), { type: 'takeOption', option: SMITE }, []).state
    const twice = reduce(once, { type: 'takeOption', option: taken({ slot: 'bonusAction' }) }, [])
    expect(twice.refused).toBe('Your bonus action is already spent this turn.')
    expect(twice.entry).toBeNull()
    expect(twice.state).toBe(once)
  })

  it('refuses a second spell slot in the same turn — the 2024 rule', () => {
    const state = session()
    const first = reduce(state, { type: 'takeOption', option: SMITE }, [])
    const log = append([], first.entry!)

    // Different action type on purpose: the rule is scoped to the TURN, so an
    // Action-cost spell after a Bonus Action smite is still illegal.
    const second = reduce(
      first.state,
      { type: 'takeOption', option: taken({ slot: 'action', spellSlotLevel: 2 }) },
      log,
    )
    expect(second.refused).toBe('You have already expended a spell slot this turn.')
    expect(second.state.character.spellSlots[2]!.current).toBe(2)
  })

  it('allows the second slot once the turn has ended', () => {
    const state = session()
    const first = reduce(state, { type: 'takeOption', option: SMITE }, [])
    const log = append([], first.entry!)
    const turned = reduce(first.state, { type: 'endTurn' }, log)
    const next = append(log, turned.entry!)

    const second = reduce(
      turned.state,
      { type: 'takeOption', option: taken({ slot: 'bonusAction', spellSlotLevel: 1 }) },
      next,
    )
    expect(second.refused).toBeUndefined()
    expect(second.state.character.spellSlots[1]!.current).toBe(1)
  })

  it('refuses a slot level the sheet has none of', () => {
    const empty: Character = { ...NIX, spellSlots: { 1: { max: 4, current: 0 }, 2: { max: 3, current: 2 } } }
    const out = reduce(session({ character: empty }), { type: 'takeOption', option: SMITE }, [])
    expect(out.refused).toBe('No 1st-level slots remaining.')
  })

  it('refuses a slot level the sheet does not have at all', () => {
    const out = reduce(
      session(),
      { type: 'takeOption', option: taken({ spellSlotLevel: 5 }) },
      [],
    )
    expect(out.refused).toBe('No 5th-level slots remaining.')
  })

  it('refuses an empty pool', () => {
    // Divine Sense sits at 0 of 4 on Nix's real sheet.
    const out = reduce(
      session(),
      { type: 'takeOption', option: taken({ name: 'Divine Sense', resourcePoolId: 'divine-sense' }) },
      [],
    )
    expect(out.refused).toBe('Not enough Divine Sense left.')
  })

  it('refuses a pool that cannot pay the FULL amount', () => {
    // 15 points left, a 20-point heal. Partial payment would be the silent
    // corruption; a clamp to zero would be worse.
    const out = reduce(
      session(),
      { type: 'takeOption', option: { ...LAY_ON_HANDS, resourceAmount: 20 } },
      [],
    )
    expect(out.refused).toBe('Not enough Lay on Hands left.')
    expect(out.state.character.features.find(f => f.name === 'Lay on Hands')!.usesCurrent).toBe(15)
  })

  it('refuses an event type it has never heard of, instead of throwing', () => {
    const state = session()
    const out = reduce(state, { type: 'summonKraken' } as unknown as CombatEvent, [])
    expect(out.refused).toBe('This app version does not know that action.')
    expect(out.state).toBe(state)
  })

  it('changes NOTHING when it refuses', () => {
    const state = session()
    const before = structuredClone(state)
    reduce(state, { type: 'takeOption', option: { ...LAY_ON_HANDS, resourceAmount: 999 } }, [])
    expect(state).toStrictEqual(before)
  })
})

// ---------------------------------------------------------------------------
// 4. The spell-slot mirror
// ---------------------------------------------------------------------------

describe('reconcile — the tracker is a mirror, not a second source of truth', () => {
  it('heals drift between the sheet and the combat tracker', () => {
    // The documented V0.9 bug: cast from the spellbook, and the combat screen
    // kept showing the old count.
    const drifted: SessionState = {
      character: NIX,
      combat: { ...FIGHTING, spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } } },
    }
    const fixed = reconcile(drifted)
    expect(fixed.combat.spellSlots).toStrictEqual({ 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } })
    expect(fixed.character).toBe(NIX)
  })

  it('returns the very same object when nothing moved', () => {
    const state = session()
    expect(reconcile(state)).toBe(state)
  })

  it('never reports negative uses, however the sheet was edited', () => {
    const odd: Character = { ...NIX, spellSlots: { 1: { max: 2, current: 5 } } }
    const fixed = reconcile({ character: odd, combat: FIGHTING })
    expect(fixed.combat.spellSlots[1]).toStrictEqual({ used: 0, max: 2 })
  })

  it('ignores a spell-slot key that is not a number', () => {
    // localStorage keys are strings and Marcus's sheet has been edited by
    // hand. One junk key must not put a NaN-indexed entry in the tracker,
    // which renders as an empty row nobody can explain.
    const junk = { ...NIX, spellSlots: { 1: { max: 4, current: 3 }, cantrip: { max: 0, current: 0 } } }
    const fixed = reconcile({ character: junk as unknown as Character, combat: FIGHTING })
    expect(fixed.combat.spellSlots).toStrictEqual({ 1: { used: 1, max: 4 } })
  })

  it('mirrors a sheet with no slots at all without inventing any', () => {
    const mundane: Character = { ...NIX, spellSlots: {} }
    const fixed = reconcile({ character: mundane, combat: FIGHTING })
    expect(fixed.combat.spellSlots).toStrictEqual({})
  })
})

// ---------------------------------------------------------------------------
// 5. The open world
// ---------------------------------------------------------------------------

describe('open world — content the engine has never seen', () => {
  it('takes an option priced against a pool that does not exist, and charges nothing', () => {
    const state = session()
    const out = reduce(
      state,
      { type: 'takeOption', option: taken({ name: 'Hearth Ember', resourcePoolId: 'nope' }) },
      [],
    )
    expect(out.refused).toBeUndefined()
    expect(out.entry!.restore.pools).toBeUndefined()
    expect(out.state.character).toBe(state.character)
    expect(out.state.combat.turnActions.action).toBe(true)
  })

  it('takes an option whose pool is named but uncounted', () => {
    // A homebrew feature with neither usesMax nor usesCurrent is untracked, not
    // exhausted. The old failure mode was an ability you can see and cannot press.
    const uncounted: ClassFeature = { name: 'Lay on Hands', level: 1, description: 'Homebrew, freeform.' }
    const out = reduce(
      session({ character: { ...NIX, features: [uncounted] } }),
      { type: 'takeOption', option: LAY_ON_HANDS },
      [],
    )
    expect(out.refused).toBeUndefined()
    expect(out.state.character.features[0]).toStrictEqual(uncounted)
  })

  it('survives a character with nothing on it', () => {
    const bare = { ...NIX, features: [], spells: [], weapons: [], spellSlots: {} } as Character
    const out = reduce(
      session({ character: bare }),
      { type: 'takeOption', option: LAY_ON_HANDS },
      [],
    )
    expect(out.refused).toBeUndefined()
    expect(out.entry).not.toBeNull()
  })

  it('charges the bespoke paladinResources pool in preference to a same-named feature', () => {
    // Both forms present. compose.ts SHOWS the paladinResources number, so the
    // reducer must SPEND that one — charge the other and the screen would not
    // move after a heal.
    const both: Character = {
      ...NIX,
      paladinResources: {
        layOnHands: { max: 40, current: 30 },
        channelDivinity: { max: 2, current: 2 },
        auraRange: 10,
      },
    }
    const out = reduce(session({ character: both }), { type: 'takeOption', option: LAY_ON_HANDS }, [])
    expect(out.state.character.paladinResources!.layOnHands.current).toBe(25)
    expect(out.state.character.features.find(f => f.name === 'Lay on Hands')!.usesCurrent).toBe(15)
    expect(revert(out.state, out.entry!)).toStrictEqual(session({ character: both }))
  })
})

// ---------------------------------------------------------------------------
// 6. The log
// ---------------------------------------------------------------------------

describe('the log', () => {
  it('keeps the newest LOG_DEPTH entries and drops the oldest', () => {
    let log: readonly LogEntry[] = []
    for (let i = 0; i < LOG_DEPTH + 5; i += 1) {
      log = append(log, {
        event: { type: 'endTurn' },
        restore: { combat: FIGHTING },
        label: `entry ${i}`,
        round: i,
      })
    }
    expect(log).toHaveLength(LOG_DEPTH)
    expect(log[0]!.label).toBe('entry 5')
    expect(log[LOG_DEPTH - 1]!.label).toBe(`entry ${LOG_DEPTH + 4}`)
  })

  it('survives a JSON round-trip through localStorage unchanged', () => {
    // The log IS a persisted wire format. If an entry cannot survive
    // stringify/parse, Undo works until the iPad suspends the tab and then
    // silently stops — the exact failure this shape was chosen to prevent.
    const applied = reduce(session(), { type: 'takeOption', option: SHIELD_OF_FAITH }, [])
    const rehydrated = JSON.parse(JSON.stringify(applied.entry)) as LogEntry
    expect(rehydrated).toStrictEqual(applied.entry)
    expect(revert(applied.state, rehydrated)).toStrictEqual(session())
  })
})

// ---------------------------------------------------------------------------
// 7. The bridge from screen to log
// ---------------------------------------------------------------------------

describe('takenFrom — the narrowing between what is rendered and what is stored', () => {
  it('carries every cost, and nothing that is merely presentation', () => {
    const turn = composeTurn({ character: NIX, combat: FIGHTING })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]

    const smite = all.find(o => o.name === 'Divine Smite')!
    expect(takenFrom(smite)).toStrictEqual({
      id: smite.id,
      name: 'Divine Smite',
      slot: 'bonusAction',
      spellSlotLevel: 1,
    })

    const layOnHands = all.find(o => o.name === 'Lay on Hands')!
    const flat = takenFrom(layOnHands)
    expect(flat.resourcePoolId).toBe('lay-on-hands')
    expect(flat.resourceAmount).toBe(1)
    // No detail, no rider, no score — those are regenerated every render and
    // would be stale the moment Marcus edits the sheet.
    expect(Object.keys(flat).sort()).toStrictEqual(
      ['id', 'name', 'resourceAmount', 'resourcePoolId', 'slot'].sort(),
    )
  })

  it('carries concentration through from the spell that declares it', () => {
    // Shield of Faith is `concentration: true` on Nix's sheet. If this drops
    // on the floor, taking it never records the spell — and Undo has nothing
    // to put back.
    const turn = composeTurn({ character: NIX, combat: FIGHTING })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    const shield = all.find(o => o.name === 'Shield of Faith')!
    expect(shield.concentration).toBe('Shield of Faith')
    expect(takenFrom(shield).concentration).toBe('Shield of Faith')

    // …and a spell that is not concentration says nothing at all.
    const smite = all.find(o => o.name === 'Divine Smite')!
    expect('concentration' in takenFrom(smite)).toBe(false)
  })

  it('drives a real option end to end: compose → take → undo', () => {
    // The full loop as the screen runs it, with no hand-built TakenOption
    // anywhere. This is the test that fails if the ids compose PRICES with
    // ever drift from the ids reduce PAYS with.
    const state = session()
    const turn = composeTurn({ character: state.character, combat: state.combat })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    const layOnHands = all.find(o => o.name === 'Lay on Hands')!
    expect(layOnHands.available).toBe(true)

    const applied = reduce(state, { type: 'takeOption', option: takenFrom(layOnHands) }, [])
    expect(applied.refused).toBeUndefined()
    expect(applied.state.character.features.find(f => f.name === 'Lay on Hands')!.usesCurrent).toBe(14)
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })
})

// ---------------------------------------------------------------------------
// 8. The seam — the log finally feeds the composer
// ---------------------------------------------------------------------------

describe('the seam closes: taking a spell blocks the next one on screen', () => {
  it('greys every other slot-spender after a smite, and ungreys them next turn', () => {
    const state = session()
    const applied = reduce(state, { type: 'takeOption', option: SMITE }, [])
    const log = append([], applied.entry!)

    const turn = composeTurn({ character: applied.state.character, combat: applied.state.combat, log })
    expect(turn.economy.spellSlotUsedThisTurn).toBe(true)

    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    const spenders = all.filter(o => o.cost.spellSlotLevel !== undefined)
    expect(spenders.length).toBeGreaterThan(0)
    for (const o of spenders) expect(o.available).toBe(false)

    // Precedence matters for the message, not just the greying. Nix smote with
    // his bonus action, so bonus-action spells are blocked by the SPENT SLOT —
    // naming the one-spell-slot rule there would be true but not the first
    // thing standing in his way. His Action is still open, so an Action-cost
    // spell is the one that has to name the 2024 rule.
    const byAction = spenders.filter(o => o.cost.slot === 'action')
    expect(byAction.length).toBeGreaterThan(0)
    for (const o of byAction) {
      expect(o.blockedReason).toBe('You may expend only one spell slot on a turn')
    }
    for (const o of spenders.filter(o => o.cost.slot === 'bonusAction')) {
      expect(o.blockedReason).toBe('Your bonus action is spent')
    }

    // Cantrips are untouched by the rule — they expend no slot.
    const cantrips = all.filter(o => o.kind === 'spell' && o.cost.spellSlotLevel === undefined)
    expect(cantrips.some(o => o.available)).toBe(true)

    // …and the block lifts with the turn.
    const turned = reduce(applied.state, { type: 'endTurn' }, log)
    const later = composeTurn({
      character: turned.state.character,
      combat: turned.state.combat,
      log: append(log, turned.entry!),
    })
    expect(later.economy.spellSlotUsedThisTurn).toBe(false)
  })

  it('shows the spent slot on the composed turn immediately', () => {
    const applied = reduce(session(), { type: 'takeOption', option: SMITE }, [])
    const turn = composeTurn({ character: applied.state.character, combat: applied.state.combat })
    expect(turn.spellSlots.find(s => s.level === 1)).toStrictEqual({ level: 1, current: 2, max: 4 })
  })
})

// ---------------------------------------------------------------------------
// 6. Slice 6b — authored pools, and one restore path for all three kinds
// ---------------------------------------------------------------------------
//
// The reducer's private `resolvePool` was deleted in 6b and the two bespoke
// restore fields (`paladinResources`, `featureUses`) collapsed into one
// `pools` map keyed by pool id. None of the tests below can pass against Slice
// 6's code: `character.resourcePools` was not a field, so an option priced
// against one charged nothing at all.

describe('authored pools — a resource with no code written for it', () => {
  const EMBERS = {
    id: 'hearth-embers',
    name: 'Hearth Embers',
    current: 3,
    max: 5,
    unit: 'points' as const,
    recharge: 'longRest' as const,
  }
  /** Nix, plus a pool he made up, plus a feature bound to spend it. */
  const HEARTH: Character = {
    ...NIX,
    resourcePools: [EMBERS],
    features: [
      ...NIX.features,
      {
        name: 'Ember Ward',
        level: 3,
        description: 'Homebrew. Shelter an ally in banked warmth.',
        actionType: 'bonusAction',
        source: 'Homebrew',
        resourcePoolId: 'hearth-embers',
        resourceAmount: 2,
      },
    ],
  }
  const WARD: TakenOption = {
    id: 'feature-ember-ward',
    name: 'Ember Ward',
    slot: 'bonusAction',
    resourcePoolId: 'hearth-embers',
    resourceAmount: 2,
  }

  it('spends it, records it by POOL ID, and puts it back exactly', () => {
    const state = session({ character: HEARTH })
    const applied = reduce(state, { type: 'takeOption', option: WARD }, [])
    expect(applied.refused).toBeUndefined()
    expect(applied.state.character.resourcePools![0]!.current).toBe(1)
    expect(applied.entry!.restore.pools).toStrictEqual({ 'hearth-embers': 3 })
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })

  it('refuses when the pool cannot cover the price, and changes nothing', () => {
    const thin = session({
      character: { ...HEARTH, resourcePools: [{ ...EMBERS, current: 1 }] },
    })
    const out = reduce(thin, { type: 'takeOption', option: WARD }, [])
    expect(out.refused).toBe('Not enough Hearth Embers left.')
    expect(out.entry).toBeNull()
    expect(out.state.character).toBe(thin.character)
  })

  it('undoes quietly when Marcus deleted the pool in between', () => {
    // The reason `setPoolCurrent` no-ops on a missing pool. He spent embers,
    // then deleted the pool from the editor, then hit Undo. A crash here lands
    // mid-encounter, at the table, on the one control whose whole promise is
    // that it is safe to press.
    const state = session({ character: HEARTH })
    const applied = reduce(state, { type: 'takeOption', option: WARD }, [])
    const deleted: SessionState = {
      ...applied.state,
      character: { ...applied.state.character, resourcePools: [] },
    }
    const back = revert(deleted, applied.entry!)
    expect(back.character.resourcePools).toEqual([])
    // The rest of the entry still reverted — one dead pool does not abort the
    // whole restoration.
    expect(back.combat).toStrictEqual(state.combat)
  })

  it('clamps the restore to the max the pool has NOW, not the one it had then', () => {
    const state = session({ character: HEARTH })
    const applied = reduce(state, { type: 'takeOption', option: WARD }, [])
    const shrunk: SessionState = {
      ...applied.state,
      character: {
        ...applied.state.character,
        resourcePools: [{ ...EMBERS, current: 1, max: 2 }],
      },
    }
    expect(revert(shrunk, applied.entry!).character.resourcePools![0]!.current).toBe(2)
  })

  it('prices the composed option from the binding, not from the feature name', () => {
    // The end-to-end wiring: compose must offer "Ember Ward" as costing 2 from
    // hearth-embers, and the reducer must charge exactly that. If these two
    // ever drift the app deducts from a pool the screen is not showing.
    const turn = composeTurn({ character: HEARTH, combat: FIGHTING })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    const ward = all.find(o => o.name === 'Ember Ward')
    expect(ward!.cost).toMatchObject({ resourcePoolId: 'hearth-embers', resourceAmount: 2 })
    expect(turn.resources.find(r => r.id === 'hearth-embers')).toMatchObject({
      current: 3,
      max: 5,
      unit: 'points',
      homebrew: true,
    })

    const applied = reduce(session({ character: HEARTH }), {
      type: 'takeOption',
      option: takenFrom(ward!),
    }, [])
    expect(applied.state.character.resourcePools![0]!.current).toBe(1)
  })
})

describe('homebrew conditions — a condition Marcus wrote that actually bites', () => {
  it('closes the slot it says it closes', () => {
    // Before 6b this was a label the app displayed and then ignored: an
    // unknown condition was all-neutral, so "you can't take Reactions" blocked
    // nothing. That is the 🔴 half-built-feature rule in miniature.
    const bound: Character = {
      ...NIX,
      conditions: ['Hearthbound'],
      customConditions: [
        { name: 'Hearthbound', blocks: ['reaction'], note: 'The hearth holds you.' },
      ],
    }
    const turn = composeTurn({ character: bound, combat: FIGHTING })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    const reactions = all.filter(o => o.cost.slot === 'reaction')
    expect(reactions.length).toBeGreaterThan(0)
    for (const o of reactions) expect(o.available).toBe(false)
    expect(turn.upon.find(u => u.name === 'Hearthbound')?.text).toContain('The hearth holds you.')
  })

  it('leaves an unauthored name exactly as harmless as it was', () => {
    const typo: Character = { ...NIX, conditions: ['Hearthbownd'] }
    const turn = composeTurn({ character: typo, combat: FIGHTING })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    expect(all.filter(o => o.cost.slot === 'reaction').some(o => o.available)).toBe(true)
    expect(turn.upon.find(u => u.name === 'Hearthbownd')).toBeDefined()
  })
})
