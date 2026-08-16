// ---------------------------------------------------------------------------
// Conditions & Bloodied — D&D 2024
// ---------------------------------------------------------------------------
//
// `character.conditions` has been a bare `string[]` since V0.9 (character.ts:226)
// and nothing has ever read it for rules.  A Paladin could be Incapacitated and
// the turn screen would still cheerfully offer him his bonus action.  This is
// the file that gives those strings consequences.
//
// Two things are load-bearing here.
//
// 1. THE CASCADE.  Incapacitated is not a leaf.  Paralyzed, Petrified, Stunned
//    and Unconscious all *contain* it, and Unconscious contains Prone as well.
//    Resolve only the name you were given and Stunned looks harmless.
//    New in 2024: Incapacitated blocks the BONUS ACTION and the REACTION too,
//    not just the action.  It does NOT block movement.
//
// 2. UNKNOWN NAMES PASS THROUGH.  Marcus writes homebrew.  A condition this
//    file has never heard of comes back with `known: false`, its name intact
//    and no effects invented for it.  Dropping it would be worse than useless:
//    it would tell him he is fine when the DM has just said otherwise.
//
// Bloodied is in here too even though it is not a condition — it is a derived
// threshold, and 2024 made it a glossary term with no inherent penalty.  It is
// here because it is the other thing the app must read off hit points, and it
// has never existed in src/ at all.
//
// Verified 2026-08-16 by a research pass plus an adversarial refute pass with
// sources.  Two results worth writing down because they are counter-intuitive:
// 2024 Stunned does NOT set Speed to 0 (2014 did), and a creature at 0 HP is
// still Bloodied.

import type { EconomySlot } from './economy'

export interface ConditionEffect {
  name: string
  /** Economy slots this condition forbids outright. */
  blocks: EconomySlot[]
  yourAttacksHaveDisadvantage: boolean
  attacksAgainstYouHaveAdvantage: boolean
  /** Conditions this one imposes as well.  Resolved by `expandConditions()`. */
  cascades: string[]

  // -- additions to the Gate 3 interface ------------------------------------
  // Gate 3 defined only the two fields above for attack effects.  That shape
  // cannot express Invisible, which is the mirror image of every other entry
  // here, so a beneficial condition would have rendered as "no effect".  These
  // three are additive; nothing in the approved design is removed.

  /** Invisible is the only entry that improves your attacks. */
  yourAttacksHaveAdvantage: boolean
  attacksAgainstYouHaveDisadvantage: boolean
  /** The caveat a boolean cannot carry.  Rendered verbatim at the table when
   *  present — several of these conditions are only conditionally true, and
   *  saying so is more honest than a flag that is right most of the time. */
  note?: string

  /** False when this file has never heard of the name.  The effects are then
   *  all-neutral and the name is preserved verbatim. */
  known: boolean
}

const NEUTRAL: Omit<ConditionEffect, 'name'> = {
  blocks: [],
  yourAttacksHaveDisadvantage: false,
  attacksAgainstYouHaveAdvantage: false,
  cascades: [],
  yourAttacksHaveAdvantage: false,
  attacksAgainstYouHaveDisadvantage: false,
  known: true,
}

const effect = (name: string, over: Partial<ConditionEffect> = {}): ConditionEffect => ({
  name,
  ...NEUTRAL,
  ...over,
})

/** The 15 conditions of the 2024 rules.  Exactly fifteen — the count is
 *  asserted in the tests, so adding a homebrew one here would be caught. */
const CONDITIONS: Record<string, ConditionEffect> = {
  blinded: effect('Blinded', {
    yourAttacksHaveDisadvantage: true,
    attacksAgainstYouHaveAdvantage: true,
    note: 'You automatically fail any check that requires sight.',
  }),
  charmed: effect('Charmed', {
    note: "You can't attack the charmer, and it has advantage on social checks against you.",
  }),
  deafened: effect('Deafened', {
    note: 'You automatically fail any check that requires hearing.',
  }),
  exhaustion: effect('Exhaustion', {
    // 2024 replaced the six-tier ladder with a scaling penalty. It is a
    // NUMBER, not disadvantage, so neither attack flag is set — claiming
    // disadvantage here would be a different and larger penalty than the rules
    // impose. Levels are not tracked yet; Slice 7 owns condition state.
    note: 'Each level: −2 to every D20 Test and −5 ft Speed. Death at level 6.',
  }),
  frightened: effect('Frightened', {
    yourAttacksHaveDisadvantage: true,
    note: "While the source is in sight: disadvantage on checks and attacks, and you can't willingly move closer to it.",
  }),
  grappled: effect('Grappled', {
    blocks: ['movement'],
    yourAttacksHaveDisadvantage: true,
    note: 'Speed 0. Disadvantage applies only against targets other than the grappler.',
  }),
  incapacitated: effect('Incapacitated', {
    // The 2024 change that matters most in this file: the bonus action and the
    // reaction are blocked as well. Movement is NOT.
    blocks: ['action', 'bonusAction', 'reaction'],
    note: "Concentration ends, and you can't speak. Movement is unaffected.",
  }),
  invisible: effect('Invisible', {
    yourAttacksHaveAdvantage: true,
    attacksAgainstYouHaveDisadvantage: true,
    note: 'Advantage on Initiative. Unaffected by effects requiring their target to be seen.',
  }),
  paralyzed: effect('Paralyzed', {
    blocks: ['movement'],
    attacksAgainstYouHaveAdvantage: true,
    cascades: ['Incapacitated'],
    note: 'Speed 0. You auto-fail STR and DEX saves; hits from within 5 ft are critical hits.',
  }),
  petrified: effect('Petrified', {
    blocks: ['movement'],
    attacksAgainstYouHaveAdvantage: true,
    cascades: ['Incapacitated'],
    note: 'Turned to stone: Speed 0, resistance to all damage, immune to poison and disease.',
  }),
  poisoned: effect('Poisoned', {
    yourAttacksHaveDisadvantage: true,
    note: 'Disadvantage on attack rolls and ability checks.',
  }),
  prone: effect('Prone', {
    // The 2024 axis is DISTANCE, not melee-versus-ranged. An attacker within
    // 5 ft has advantage; anyone further away has disadvantage. Both flags are
    // set true, which is contradictory in isolation and correct in context —
    // the note carries the discriminator.
    yourAttacksHaveDisadvantage: true,
    attacksAgainstYouHaveAdvantage: true,
    attacksAgainstYouHaveDisadvantage: true,
    note: 'Attackers within 5 ft have advantage; further away, disadvantage. Standing up costs half your Speed; you can only crawl.',
  }),
  restrained: effect('Restrained', {
    blocks: ['movement'],
    yourAttacksHaveDisadvantage: true,
    attacksAgainstYouHaveAdvantage: true,
    note: 'Speed 0, and disadvantage on DEX saves.',
  }),
  stunned: effect('Stunned', {
    // 2024 dropped the explicit Speed-0 clause that 2014 had. Movement is not
    // blocked here, and that is not an omission.
    attacksAgainstYouHaveAdvantage: true,
    cascades: ['Incapacitated'],
    note: 'You auto-fail STR and DEX saves. Speed is not reduced in the 2024 rules.',
  }),
  unconscious: effect('Unconscious', {
    blocks: ['movement'],
    attacksAgainstYouHaveAdvantage: true,
    cascades: ['Incapacitated', 'Prone'],
    note: 'Speed 0, you drop what you hold, and hits from within 5 ft are critical hits.',
  }),
}

// ---------------------------------------------------------------------------
// Homebrew conditions (Slice 6b)
// ---------------------------------------------------------------------------
//
// Before this, an unrecognised condition survived to the screen as a NAME and
// nothing more: all-neutral, `known: false`, blocking nothing. That is the
// right default for a name typed in a hurry, and the wrong one for a condition
// Marcus sat down and authored. "Hearthbound: you can't take Reactions" was a
// label the app displayed and then ignored — a half-built feature running as
// if done, which the 🔴 rules forbid by name.
//
// A CustomCondition is a partial ConditionEffect. Every field is optional, so
// authoring one costs a name and nothing else, and each field Marcus does fill
// in behaves exactly like the book's.

export interface CustomCondition {
  name: string
  blocks?: EconomySlot[]
  yourAttacksHaveDisadvantage?: boolean
  attacksAgainstYouHaveAdvantage?: boolean
  yourAttacksHaveAdvantage?: boolean
  attacksAgainstYouHaveDisadvantage?: boolean
  cascades?: string[]
  /** Rendered verbatim at the table.  The half of a homebrew condition the
   *  flags above can never carry. */
  note?: string
}

/** Look up one condition by name, case- and space-insensitively.
 *
 *  `custom` is consulted FIRST and beats the book. That direction is chosen
 *  deliberately: the opposite would let Marcus author a condition, save it, see
 *  it in his list, and have the app quietly disregard it — the exact failure
 *  this parameter exists to end. A homebrew entry named "Stunned" therefore
 *  redefines Stunned at this table, which is a house rule, not a bug. The
 *  editor is where a name collision gets pointed out; here it is obeyed.
 *
 *  Unknown names still come back as a neutral, `known: false` pass-through
 *  rather than null: a name typed at the table must survive the trip. */
export function effectOf(name: string, custom?: readonly CustomCondition[]): ConditionEffect {
  const key = typeof name === 'string' ? name.trim().toLowerCase() : ''
  if (key && custom) {
    const mine = custom.find(c => c?.name?.trim().toLowerCase() === key)
    if (mine) {
      return {
        ...NEUTRAL,
        ...mine,
        // A partial cannot be allowed to smuggle `undefined` in over a
        // required field, so the two array fields are re-defaulted after the
        // spread rather than trusted from it.
        name: mine.name.trim(),
        blocks: mine.blocks ?? [],
        cascades: mine.cascades ?? [],
        known: true,
      }
    }
  }
  const hit = CONDITIONS[key]
  if (hit) return hit
  return {
    name: typeof name === 'string' ? name.trim() : String(name),
    ...NEUTRAL,
    known: false,
  }
}

/** Every condition implied by these names, including cascaded ones, in a
 *  stable order: the names you gave first, then what they drag in with them.
 *  Deduplicated case-insensitively; the first spelling wins. */
export function expandConditions(
  conditionNames: readonly string[],
  custom?: readonly CustomCondition[],
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (name: string) => {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(name.trim())
  }

  const queue = [...(conditionNames ?? [])].filter(n => typeof n === 'string')
  for (const name of queue) push(name)
  // Breadth-first over the cascade. Unconscious -> Incapacitated + Prone is the
  // deepest real case, but the loop does not assume that.
  for (let i = 0; i < out.length; i++) {
    // Custom conditions cascade too, and a homebrew cascade can name a book
    // condition (or another homebrew one) — the loop does not care which.
    for (const cascaded of effectOf(out[i], custom).cascades) push(cascaded)
  }
  return out
}

/** The effects of these conditions AND of everything they cascade into.
 *
 *  Callers get the complete picture from one call — ask for `['Stunned']` and
 *  the Incapacitated entry that actually blocks the turn is in the result. */
export function effectsOf(
  conditionNames: readonly string[],
  custom?: readonly CustomCondition[],
): ConditionEffect[] {
  // NOT `.map(effectOf)` — Array.prototype.map hands the callback (value,
  // index, array), so the index would arrive as `custom` and every lookup
  // after the first would silently skip the homebrew table. Spelled out.
  return expandConditions(conditionNames, custom).map(name => effectOf(name, custom))
}

/** Every economy slot forbidden by these conditions, cascades included. */
export function blockedSlots(
  conditionNames: readonly string[],
  custom?: readonly CustomCondition[],
): EconomySlot[] {
  const out = new Set<EconomySlot>()
  for (const e of effectsOf(conditionNames, custom)) for (const s of e.blocks) out.add(s)
  return [...out]
}

/** Is this slot forbidden right now?  The question Slice 5 actually asks. */
export function isSlotBlocked(
  conditionNames: readonly string[],
  slot: EconomySlot,
  custom?: readonly CustomCondition[],
): boolean {
  return blockedSlots(conditionNames, custom).includes(slot)
}

/** Every condition this file knows, for the editor's picker. */
export function allConditions(): ConditionEffect[] {
  return Object.values(CONDITIONS)
}

// ---------------------------------------------------------------------------
// Bloodied — a derived threshold, not a condition
// ---------------------------------------------------------------------------
//
// 2024 made "Bloodied" a glossary term: a creature is Bloodied while it has
// half its hit points or fewer. It carries no inherent penalty — it is a
// trigger other features hang off, and a thing the table wants to SEE.
// It is inclusive ("or fewer"), so 38 of 76 IS bloodied while 38 of 75 is not,
// and it remains true at 0 HP.

/** floor(max / 2).  76 -> 38.  A non-positive max yields 0. */
export function bloodiedThreshold(maxHP: number): number {
  if (typeof maxHP !== 'number' || !Number.isFinite(maxHP) || maxHP <= 0) return 0
  return Math.floor(maxHP / 2)
}

/** Half or fewer.  Compared as `current * 2 <= max` so the inclusive boundary
 *  cannot be lost to a rounding argument on an odd maximum. */
export function isBloodied(hp: { max: number; current: number }): boolean {
  if (!hp || typeof hp.max !== 'number' || typeof hp.current !== 'number') return false
  if (hp.max <= 0) return false
  return hp.current * 2 <= hp.max
}

/** Edge detection: did this change push the creature over the line?
 *  The reducer gets this for free by comparing before and after.  It fires on
 *  the crossing only — further damage while already bloodied is not a crossing,
 *  which is what stops the table getting the same announcement twice. */
export function crossedIntoBloodied(
  before: { max: number; current: number },
  after: { max: number; current: number },
): boolean {
  return !isBloodied(before) && isBloodied(after)
}
