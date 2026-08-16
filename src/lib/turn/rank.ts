// Ranking — deciding which five options he reads first
//
// Slice 4 left every score at 0 and the shortlist was simply the first five
// off the sheet. This module replaces that, and the first thing to be honest
// about is what it is NOT.
//
// It is not a tactical adviser. There is no board until Slice 9, so nothing
// here knows where the goblin is standing, how many enemies are bunched, or
// whether the boss is about to go. A module that ranked "best move" from that
// much ignorance would be confidently wrong, which at a table is worse than
// being silent — Marcus would follow it once, get burned, and never trust the
// screen again.
//
// What it IS: a reading order. The shortlist answers "what is worth looking
// at first", using the two things the app genuinely knows —
//
//   1. what each option COSTS, and
//   2. what is TRUE of Nix right now (hurt, concentrating, mid-turn).
//
// So a free swing outranks a burned spell slot, a heal climbs when he is
// bleeding and sinks when he is not, and a reaction never squats in the
// shortlist because a reaction is by definition not a thing you do on your
// turn. Every one of those is defensible out loud, which is the bar.
//
// OPEN-WORLD BY CONSTRUCTION. Nothing here matches a name against a list of
// book features — Slice 6c will run this whole engine against invented
// content and it has to survive. The situational factors read the AUTHOR's
// own words on their own option (a homebrew feature that says it restores hit
// points is a heal, because its author said so) and the structural factors
// read the cost, which every option carries. An option this module cannot
// characterise simply gets no situational adjustment; it is never dropped and
// never broken.

import type { TurnOption } from './types'

/** What is true of the character right now.  Deliberately a flat value object
 *  and not the Character: ranking must be trivially testable, and a factor
 *  that needed the whole sheet would be a factor doing too much. */
export interface RankContext {
  /** current / max, clamped to 0..1.  1 = untouched, 0 = down. */
  hpFraction: number
  bloodied: boolean
  /** Name of the spell already held, or null.  Drives the clash factor. */
  concentratingOn: string | null
}

/** One reason the score moved, kept so the number is never a black box.
 *  `phrase` is set only when the reason is worth SAYING on screen. */
export interface RankFactor {
  readonly name: string
  readonly delta: number
  readonly phrase?: string
}

export interface Ranking {
  score: number
  /** The one line the row should say about its position, if any. */
  why?: string
  factors: readonly RankFactor[]
}

/* -- weights ---------------------------------------------------------------
   Gathered here rather than scattered through the code so the whole editorial
   position of the shortlist can be read in one screen and argued with. */
const W = {
  /** The action is the main event of a turn; the bonus action is a garnish. */
  action: 20,
  bonusAction: 10,
  /** A reaction happens on someone ELSE's turn.  Large and blunt on purpose:
   *  no reaction should ever outrank a real move on the "your turn" list. */
  reaction: -40,
  /** Spending a slot costs more the higher the tier.  A 3rd-level slot is a
   *  real decision; the app should not casually put it at the top. */
  slotBase: -6,
  slotPerLevel: -6,
  /** Any named pool: Lay on Hands, Channel Divinity, a homebrew Hearth pool. */
  pool: -8,
  /** Limited uses that are not yet a modelled pool.  See LIMITED_USES. */
  limitedUses: -8,
  /** A mastery or homebrew rider is value that costs nothing. */
  rider: 4,
  /** Full weight of "you are hurt", scaled by how hurt.  At the bloodied line
   *  this is worth about as much as a whole action, which is right: a paladin
   *  at half health should be looking at Lay on Hands. */
  hurtMax: 50,
  /** Healing when there is nothing to heal is noise. */
  healAtFull: -20,
  /** Breaking concentration is usually a mistake, and always worth saying. */
  concentrationClash: -45,
} as const

/* NO DAMAGE TERM, AND THAT IS A DECISION.
 *
 * The obvious factor — rank the big hit above the small one — is missing, and
 * it is missing because the app cannot honestly compute it. It was written,
 * and then it was deleted after the numbers were read back off Nix's real
 * sheet:
 *
 *   Hearthbrand  41.5  dice=1d20+7      <- the TO-HIT roll, averaged as if it
 *   Javelin      40.5  dice=1d20+6         were damage
 *   Sacred Flame 29    dice=2d8         <- actual damage, so it scored LOWER
 *   Shield of Faith 16.5 dice=1d20+8    <- a buff with no damage at all,
 *   Divine Smite  7    dice=2d8            outranking the paladin's signature
 *
 * `rollNotation` is whatever die the row invites you to roll, and for a weapon
 * that is the attack, not the damage — weapon damage lives only inside the
 * authored mechanics prose ("1d8+4 Slashing"). So the term was rewarding
 * options for having an attack bonus and punishing them for being honest about
 * their damage, and Shield of Faith beat Divine Smite for no reason a human
 * would accept. That is the "looks considered, is arbitrary" failure this file
 * opens by refusing.
 *
 * Half a signal is worse than none here: including damage for the spells that
 * happen to expose it, and not for weapons, biases the whole list toward
 * spells. The damage numbers are printed on every row anyway, an inch from his
 * thumb, and Marcus can compare 1d8+4 to 2d8 faster than the app can guess.
 * When the content model carries damage as DATA rather than as prose, this is
 * the first factor to add back.
 */

/* -- reading the author's own words ---------------------------------------
   These are heuristics over text the CONTENT AUTHOR wrote, not a registry of
   known features.  That distinction is the whole open-world guarantee: add a
   homebrew ability whose text says it restores hit points and it participates
   in the hurt factor with no code change. */
const HEALS = /\bheal(s|ing)?\b|\bhit points?\b|\brestores?\b|\btemp(orary)? hp\b/i
const CONCENTRATION = /\bconcentration\b/i
/** A cost label like "1/2 uses" or "15/40 uses".  A bridge, and a named one:
 *  Slice 6b gives every limited thing a real ResourcePool and this clause
 *  becomes dead code the day it lands. */
const LIMITED_USES = /\d+\s*\/\s*\d+/

/** What the content model knows that the rendered row does not.
 *
 *  `detail` is a one-line summary built for a phone screen, and Lay on Hands
 *  proves why that is not enough to rank from: its line reads "Touch · 15/40
 *  uses · recharges on long rest" and never says the word heal, while its
 *  description says "restore hit points" plainly. Ranking off the truncation
 *  would have quietly failed to raise the heal on a dying paladin — the exact
 *  moment the feature exists for. So the composer hands over the full authored
 *  prose, and any structural flag the model actually carries. */
export interface RankHints {
  /** The option's own description or summary — everything its author wrote. */
  prose?: string
  /** Set when the content model states this outright.  Preferred over reading
   *  the prose, and absent for homebrew that never declared it, which is why
   *  the text fallback stays. */
  concentration?: boolean
}

/** Everything this option is about, as one haystack.  Name included because a
 *  homebrew ability is often named for what it does. */
const textOf = (o: TurnOption, hints: RankHints) => `${o.name} ${o.detail} ${hints.prose ?? ''}`

export function scoreOption(option: TurnOption, ctx: RankContext, hints: RankHints = {}): Ranking {
  const factors: RankFactor[] = []
  const add = (name: string, delta: number, phrase?: string) => {
    if (delta !== 0) factors.push(phrase ? { name, delta, phrase } : { name, delta })
  }

  // -- structure: what kind of turn-thing is this ---------------------------
  if (option.cost.slot === 'action') add('action', W.action)
  else if (option.cost.slot === 'bonusAction') add('bonus action', W.bonusAction)
  else if (option.cost.slot === 'reaction') add('reaction', W.reaction, 'Not on your turn')

  // No magnitude term — see the note above the weights. `option.dice` is read
  // by nothing here on purpose, and a passing glance at it should stop.
  if (option.rider) add('rider', W.rider)

  // -- cost: the app should not spend Nix's resources for him ---------------
  const level = option.cost.spellSlotLevel
  if (level !== undefined) add('spell slot', W.slotBase + W.slotPerLevel * level)
  if (option.cost.resourcePoolId !== undefined) add('resource pool', W.pool)
  else if (level === undefined && LIMITED_USES.test(option.cost.label)) {
    add('limited uses', W.limitedUses)
  }

  // -- situation ------------------------------------------------------------
  const text = textOf(option, hints)

  if (HEALS.test(text)) {
    if (ctx.hpFraction >= 1) {
      add('healing, unhurt', W.healAtFull, 'You are at full health')
    } else {
      const weight = Math.round((1 - ctx.hpFraction) * W.hurtMax)
      add('healing, hurt', weight, ctx.bloodied ? 'You are bloodied' : 'You are hurt')
    }
  }

  const concentrates = hints.concentration ?? CONCENTRATION.test(`${option.detail} ${hints.prose ?? ''}`)
  if (ctx.concentratingOn && concentrates) {
    add('concentration clash', W.concentrationClash, `Would drop ${ctx.concentratingOn}`)
  }

  const score = Math.round(factors.reduce((sum, f) => sum + f.delta, 0) * 10) / 10

  // The row speaks only when it has something non-obvious to say. The cost and
  // the dice are already printed an inch away, so repeating them as a reason
  // would be chatter; "you are bloodied" and "would drop Shield of Faith" are
  // facts about the situation that appear nowhere else on the row. Whichever
  // phrased factor moved the score furthest wins — including a negative one,
  // because "why is this so far down" is the same question.
  let why: string | undefined
  let strongest = 0
  for (const f of factors) {
    if (f.phrase && Math.abs(f.delta) > strongest) {
      strongest = Math.abs(f.delta)
      why = f.phrase
    }
  }

  return why === undefined ? { score, factors } : { score, why, factors }
}

/** Score an option and return a new one carrying the result.  Pure: the input
 *  is never touched, so the caller can score before contention marks faces. */
export function withRank(option: TurnOption, ctx: RankContext, hints: RankHints = {}): TurnOption {
  const { score, why } = scoreOption(option, ctx, hints)
  return why === undefined ? { ...option, score } : { ...option, score, why }
}

/** Highest score first.  Returns a NEW array; Array#sort is stable per spec,
 *  so equal scores keep sheet order and the list never shuffles between
 *  renders — a list that reorders itself while you look at it is unusable at
 *  a table. */
export function sortByRank(options: readonly TurnOption[]): TurnOption[] {
  return [...options].sort((a, b) => b.score - a.score)
}
