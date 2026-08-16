// ---------------------------------------------------------------------------
// Action Economy — D&D 2024
// ---------------------------------------------------------------------------
//
// What a thing COSTS, and whether you can still pay for it this turn.  Nothing
// here decides what is *offered* — that is Slice 4's composer — and nothing
// here mutates state.  Pure functions over (option, CombatState, log).
//
// The rule this file exists for is the one-spell-slot rule, and it is subtler
// than it looks:
//
//     "On a turn, you can expend only one spell slot to cast a spell."
//
// Note the scope: a TURN, not an action.  An adversarial pass on our own Gate 3
// notes REFUTED the narrower reading we had written down (Action + Bonus
// Action).  It applies to every action type at once — Action Surge does not buy
// a second levelled spell, and a levelled Reaction spell on your own turn after
// you have already spent a slot is illegal.  Cantrips are free of it entirely,
// because they expend no slot.
//
// That single rule is what makes Divine Smite and Misty Step contend for Nix
// even though he has both a bonus action and slots of both tiers left.  Slice 5
// turns that contention into UI; this file just states the law.

import type { Spell, ClassFeature, Weapon } from '../character'
import type { ActionEconomyType, CombatState } from '../combat-state'
import { spellActionType } from '../combat-state'

/** 2024 adds two slots the existing union does not model: movement, and free
 *  riders that cost nothing at all.  Oath of Vengeance's Vow of Enmity is the
 *  canonical example — in 2024 it rides on the Attack action rather than being
 *  an action of its own, which the old three-way union cannot express. */
export type EconomySlot = ActionEconomyType | 'movement' | 'free'

export interface SlotDemand {
  slot: EconomySlot
  /** True for spell-slot spenders.  2024 permits only ONE spell slot per turn,
   *  which is what makes Smite / Misty Step mutually exclusive — not merely the
   *  fact that they both want the bonus action. */
  consumesSpellSlot: boolean
  /** The tier of slot spent, when one is.  Undefined for cantrips and for
   *  everything that is not a spell. */
  spellSlotLevel?: number
}

/** What a spell costs.
 *
 *  `castingTime` is free text on saved characters, so this leans on the
 *  existing `spellActionType()` parser rather than inventing a second one.
 *  Anything it does not recognise as a bonus action or a reaction is an
 *  Action — including "1 Minute" rituals, which are not a combat concern and
 *  must not crash the turn screen by being unrepresentable. */
export function demandOfSpell(spell: Spell): SlotDemand {
  const levelled = typeof spell.level === 'number' && spell.level > 0
  return {
    slot: spellActionType(spell.castingTime ?? 'Action'),
    consumesSpellSlot: levelled,
    ...(levelled ? { spellSlotLevel: spell.level } : {}),
  }
}

/** What a class feature costs.
 *
 *  A feature that declares `actionType: 'passive'` or `'none'` costs nothing —
 *  it demands the `free` slot.  This is a deliberate divergence from
 *  `featureActionType()` in combat-state.ts, which files both under 'action'
 *  so they render somewhere; that is a display decision, and this file is
 *  about legality.  A passive must never be able to consume Marcus's Action.
 *
 *  A feature with NO declared actionType defaults to 'action', matching the
 *  existing behaviour.  Most features saved before this file existed are in
 *  that state, and quietly reclassifying them would change what the app has
 *  always shown. */
export function demandOfFeature(feature: ClassFeature): SlotDemand {
  switch (feature.actionType) {
    case 'bonusAction':
      return { slot: 'bonusAction', consumesSpellSlot: false }
    case 'reaction':
      return { slot: 'reaction', consumesSpellSlot: false }
    case 'passive':
    case 'none':
      return { slot: 'free', consumesSpellSlot: false }
    default:
      return { slot: 'action', consumesSpellSlot: false }
  }
}

/** What a weapon attack costs: the Attack action.
 *
 *  Deliberately flat.  The two-weapon-fighting bonus action, Extra Attack, and
 *  the Nick mastery (which folds the Light extra attack into the Attack action
 *  and leaves the bonus action free) are all questions about how many attacks
 *  one Attack action contains — that is contention, and it belongs to Slice 5,
 *  not to "what slot does swinging a sword want". */
export function demandOfWeapon(_weapon: Weapon): SlotDemand {
  return { slot: 'action', consumesSpellSlot: false }
}

/** Is this slot still free this turn?
 *
 *  `free` is always available — that is what free means.  Everything else
 *  reads `CombatState.turnActions`, defensively: that object is round-tripped
 *  through localStorage, so a state saved by an older build can arrive with
 *  fields missing, and an undefined field means "not used yet", not "crash". */
export function slotAvailable(combat: CombatState, slot: EconomySlot): boolean {
  if (slot === 'free') return true
  const used = combat?.turnActions as Partial<CombatState['turnActions']> | undefined
  return used?.[slot] !== true
}

/** The minimum shape `spellSlotSpentThisTurn()` needs from an event.
 *
 *  The real `LoggedEvent` arrives in Slice 6 with a great deal more on it.
 *  Writing against the structural minimum means this function is testable now
 *  and needs no edit when the richer type lands — `LoggedEvent` will simply
 *  satisfy it. */
export interface SlotSpendRecord {
  round: number
  /** Present and > 0 when this event expended a spell slot. */
  spellSlotLevel?: number
}

/** Has a spell slot already been spent this turn?  The 2024 one-slot rule.
 *
 *  Scoped to the whole round, across every action type — see the header.  A
 *  cantrip leaves no `spellSlotLevel` and so never trips this. */
export function spellSlotSpentThisTurn(
  log: readonly SlotSpendRecord[],
  round: number,
): boolean {
  if (!Array.isArray(log)) return false
  return log.some(
    e =>
      e?.round === round &&
      typeof e.spellSlotLevel === 'number' &&
      e.spellSlotLevel > 0,
  )
}
