// ---------------------------------------------------------------------------
// rules-2024/economy — the cost of doing things
// ---------------------------------------------------------------------------
//
// These are not characterization tests.  Nothing in src/ knew any of this
// yesterday, so every assertion here is a claim about the 2024 rules, and each
// one was put to an adversarial fact-checker before it was written down.
//
// The Divine Smite and Vow of Enmity cases are the two that changed edition to
// edition.  A model trained mostly on 2014 text will "correct" both of them
// back, so they are pinned first and loudest.

import { describe, it, expect } from 'vitest'
import type { ClassFeature, Spell } from '../character'
import { createCombatState, useAction, type CombatState } from '../combat-state'
import { NIX } from '../turn/fixtures/nix'
import {
  demandOfFeature,
  demandOfSpell,
  demandOfWeapon,
  slotAvailable,
  spellSlotSpentThisTurn,
} from './economy'

const spell = (name: string): Spell => {
  const hit = NIX.spells.find(s => s.name === name)
  if (!hit) throw new Error(`fixture has no spell "${name}"`)
  return hit
}
const feature = (name: string): ClassFeature => {
  const hit = NIX.features.find(f => f.name === name)
  if (!hit) throw new Error(`fixture has no feature "${name}"`)
  return hit
}

describe('demandOfSpell', () => {
  it('Divine Smite demands the bonus action and consumes a spell slot', () => {
    // 2024: Divine Smite became a 1st-level spell cast as a Bonus Action. In
    // 2014 it cost no action at all and was declared after a hit. Getting this
    // wrong does not just mislabel a card — it hands Nix back a bonus action
    // he has already spent.
    const demand = demandOfSpell(spell('Divine Smite'))
    expect(demand.slot).toBe('bonusAction')
    expect(demand.consumesSpellSlot).toBe(true)
    expect(demand.spellSlotLevel).toBe(1)
  })

  it('a cantrip consumes no slot and so escapes the one-slot rule', () => {
    const demand = demandOfSpell(spell('Sacred Flame'))
    expect(demand.slot).toBe('action')
    expect(demand.consumesSpellSlot).toBe(false)
    expect(demand.spellSlotLevel).toBeUndefined()
  })

  it('reads the slot off the casting time, not off the level', () => {
    expect(demandOfSpell(spell('Misty Step')).slot).toBe('bonusAction')   // 2nd
    expect(demandOfSpell(spell('Cure Wounds')).slot).toBe('action')       // 1st
    // Same tier, opposite slots: the level tells you nothing about the cost.
    expect(demandOfSpell(spell('Shield of Faith')).slot).toBe('bonusAction')
    expect(demandOfSpell(spell('Cure Wounds')).spellSlotLevel).toBe(1)
    expect(demandOfSpell(spell('Misty Step')).spellSlotLevel).toBe(2)
  })

  it('falls back to the Action for a casting time it cannot parse', () => {
    const ritual = { ...spell('Cure Wounds'), castingTime: '1 Minute' }
    expect(demandOfSpell(ritual).slot).toBe('action')
  })
})

describe('demandOfFeature', () => {
  it('Lay on Hands demands the bonus action and consumes no spell slot', () => {
    // 2024 moved Lay on Hands from an Action to a Bonus Action. It spends from
    // a pool, never from a slot — so it does NOT contend with Divine Smite for
    // the one-slot rule, only for the bonus action itself.
    const demand = demandOfFeature(feature('Lay on Hands'))
    expect(demand.slot).toBe('bonusAction')
    expect(demand.consumesSpellSlot).toBe(false)
    expect(demand.spellSlotLevel).toBeUndefined()
  })

  it("Vow of Enmity demands 'free'", () => {
    // 2024 turned Vow of Enmity into a rider on the Attack action: it costs a
    // Channel Divinity use and no economy slot whatsoever. In 2014 it was a
    // Bonus Action. A feature declares this by carrying actionType 'none'.
    const vow: ClassFeature = {
      name: 'Vow of Enmity',
      level: 3,
      description:
        'When you take the Attack action, you can expend one use of your Channel Divinity to gain advantage on attack rolls against one creature.',
      actionType: 'none',
    }
    expect(demandOfFeature(vow)).toEqual({ slot: 'free', consumesSpellSlot: false })
  })

  it('a passive costs nothing, and can never eat the Action', () => {
    // combat-state.ts's featureActionType() files passives under 'action' so
    // they render somewhere. That is a display decision. Here it would be a
    // rules bug: standing in your own aura is not an action.
    expect(demandOfFeature(feature('Aura of Protection')).slot).toBe('free')
  })

  it('routes reactions and homebrew bonus actions by their declaration', () => {
    expect(demandOfFeature(feature('Flaming Cloak')).slot).toBe('reaction')
    expect(demandOfFeature(feature('Hearthfire Manifest')).slot).toBe('bonusAction')
  })

  it('defaults an undeclared feature to the Action, as the app always has', () => {
    const legacy: ClassFeature = { name: 'Something Old', level: 1, description: 'Saved before actionType existed.' }
    expect(demandOfFeature(legacy).slot).toBe('action')
  })
})

describe('demandOfWeapon', () => {
  it('a weapon attack is the Attack action and spends no slot', () => {
    expect(demandOfWeapon(NIX.weapons[0])).toEqual({ slot: 'action', consumesSpellSlot: false })
    expect(demandOfWeapon(NIX.weapons[1]).slot).toBe('action')
  })
})

describe('slotAvailable', () => {
  const fresh = (): CombatState => createCombatState(NIX)

  it('is false for a slot already marked in turnActions', () => {
    const spent = useAction(fresh(), 'bonusAction')
    expect(slotAvailable(spent, 'bonusAction')).toBe(false)
    // Spending one slot must not spend the others.
    expect(slotAvailable(spent, 'action')).toBe(true)
    expect(slotAvailable(spent, 'reaction')).toBe(true)
    expect(slotAvailable(spent, 'movement')).toBe(true)
  })

  it('is true for every slot on a fresh turn', () => {
    const state = fresh()
    for (const slot of ['action', 'bonusAction', 'reaction', 'movement'] as const) {
      expect(slotAvailable(state, slot)).toBe(true)
    }
  })

  it("never refuses 'free' — not even on a turn where everything is spent", () => {
    let state = fresh()
    for (const s of ['action', 'bonusAction', 'reaction', 'movement'] as const) state = useAction(state, s)
    expect(slotAvailable(state, 'action')).toBe(false)
    expect(slotAvailable(state, 'free')).toBe(true)
  })

  it('treats a missing field in a restored state as unspent, not as a crash', () => {
    // CombatState round-trips through localStorage. A state written by an
    // older build arrives without the newer fields, mid-combat, at the table.
    const legacy = { ...fresh(), turnActions: { action: true } } as unknown as CombatState
    expect(slotAvailable(legacy, 'action')).toBe(false)
    expect(slotAvailable(legacy, 'bonusAction')).toBe(true)
  })
})

describe('spellSlotSpentThisTurn', () => {
  it('is true only for events in the current round', () => {
    const log = [
      { round: 1, spellSlotLevel: 1 },
      { round: 2, spellSlotLevel: 2 },
    ]
    expect(spellSlotSpentThisTurn(log, 1)).toBe(true)
    expect(spellSlotSpentThisTurn(log, 2)).toBe(true)
    expect(spellSlotSpentThisTurn(log, 3)).toBe(false)
    expect(spellSlotSpentThisTurn([], 1)).toBe(false)
  })

  it('ignores events that expended no slot', () => {
    // The rule is about slots, not about casting. A cantrip and a weapon swing
    // leave entries in the same log and must not lock out the Smite.
    const log = [{ round: 4 }, { round: 4, spellSlotLevel: 0 }]
    expect(spellSlotSpentThisTurn(log, 4)).toBe(false)
    expect(spellSlotSpentThisTurn([...log, { round: 4, spellSlotLevel: 2 }], 4)).toBe(true)
  })

  it('is scoped to the whole turn, not to one action type', () => {
    // The correction that cost us a Gate 3 line. The printed rule is "on a
    // turn, you can expend only one spell slot to cast a spell" — it does not
    // reset between your Action, your Bonus Action and your Reaction. Having
    // Smited with the bonus action, a levelled Reaction spell on the same turn
    // is illegal, and this function is what will say so.
    const smitedWithBonusAction = [{ round: 5, spellSlotLevel: 1 }]
    expect(spellSlotSpentThisTurn(smitedWithBonusAction, 5)).toBe(true)
  })
})
