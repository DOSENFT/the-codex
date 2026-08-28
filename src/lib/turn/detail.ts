/* The option detail sheet's model — four bands, always the same four, always in
 * the same order.
 *
 *     1  stat block      the numbers, at a glance
 *     2  what it does    canon's whole paragraph, never a slice(0, 80)
 *     3  the rolls       buttons that roll what this actually rolls
 *     4  how to use it   canon's long-form advice, folded
 *
 * ── THE POINT OF A FIXED ORDER ──────────────────────────────────────────────
 * A player mid-turn is not reading, they are LOOKING. Four bands that never
 * move mean the eye learns one shape once and afterwards goes straight to the
 * band it wants. A layout that reorders itself per option — damage first when
 * there is damage, duration first when there is a duration — is the same
 * information and is unusable at speed.
 *
 * So a band that has nothing to say renders EMPTY rather than collapsing and
 * letting the others slide up. That is a deliberate cost, paid in vertical
 * space, for a fixed target.
 *
 * ── THE OPEN-WORLD RULE, AT THE LAST BOUNDARY ───────────────────────────────
 * Canon lookup is a TEXT lookup, never a capability gate. Everything here has
 * a defined answer when canon has never heard of the option: band 1 falls back
 * to the sheet's own cost and source, band 2 to the sheet's own `detail`, band
 * 3 to the segments that option declared, band 4 to nothing at all — because
 * tactics is advice, and inventing advice is worse than having none.
 *
 * A homebrew option is therefore fully usable here, in its own words. That is
 * the whole promise: nothing may cause an option to disappear, and nothing may
 * cause it to be quietly rewritten either.
 *
 * Table Truth slice 7. */

import type { Character } from '../character'
import type { CanonErratum, CanonFeature, CanonSpell } from '../canon/types'
import type { EconomyState, TurnOption } from './types'
import { errataForFeature, featureByName, spellByName } from '../canon/lookup'
import { statBlock } from '../canon/format'
import { featureFacts, type FeatureFact } from '../canon/feature'
import { splitTactics, type TacticsBullet } from '../canon/tactics'
import { rollOffers, type RollOffer } from './rolls'
import { replacementWarning, tempHPReplacement } from '../rules-2024/temp-hp'
import { casterContextOf, featureContextOf } from './overlay'

export interface DetailFact {
  /** null for a fact the source stated without naming — a bare detail segment. */
  label: string | null
  value: string
}

export interface RuleBox {
  /** 'blocked' means the rule stops this option right now; 'notice' means it
   *  will bite if taken. The distinction is the whole value of a live box. */
  tone: 'blocked' | 'notice'
  text: string
}

export interface OptionDetail {
  title: string
  /** The mono sub-line: what it costs, and where it came from. */
  subtitle: string
  /** 'canon' when the words below are the book's; 'sheet' when they are
   *  Marcus's own. Shown, not hidden — homebrew is not a lesser citizen, but
   *  the player is entitled to know which he is reading. */
  provenance: 'canon' | 'sheet'

  /** Band 1. */
  facts: DetailFact[]
  /** Band 2. The FULL paragraph. Never truncated — this band exists because the
   *  old one truncated at 80 characters. */
  whatItDoes: string
  /** Band 3. */
  rolls: RollOffer[]
  /** Band 3, the spend affordance. Null when there is nothing this sheet can
   *  legally spend — see `spendFor`, which slice 10c widened. */
  spend: { label: string } | null
  /** Band 3, above the Spend button: what spending this would DESTROY.
   *
   *  Null in the ordinary case, which is nearly always. Non-null only when the
   *  option grants temporary hit points and the player is already standing in a
   *  pool — canon HEARTH-04's mandatory warning, arriving on the surface that
   *  can actually spend the thing. The sentence itself is `replacementWarning`,
   *  the same function the HP tracker calls, because one rule worded two ways is
   *  two rules as far as the player is concerned. Table Truth slice 10d. */
  spendWarning: string | null
  /** Band 3, the live rule. Null when no rule applies to this option now. */
  ruleBox: RuleBox | null
  /** Band 3, canon's own recorded problems with this feature. */
  errata: CanonErratum[]
  /** Band 4. Empty when canon has no advice, and empty is honest. */
  tactics: TacticsBullet[]
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

/** Resolve canon BOTH WAYS ROUND, exactly as `overlayCanon` does.
 *
 *  The sheet's idea of "spell" and "feature" is not canon's: Divine Smite is a
 *  level 1 spell that half the world still files as a class feature, and an
 *  aura is a feature on one sheet and a spell on the next. Matching only the
 *  sheet's own category would make the detail sheet disagree with the row that
 *  opened it — same option, two different sets of words. */
function resolve(option: TurnOption): {
  spell?: CanonSpell
  feature?: CanonFeature
} {
  const spell = spellByName(option.name)
  const feature = featureByName(option.name)
  const preferSpell = option.kind === 'spell'
  return {
    spell: preferSpell ? spell : feature ? undefined : spell,
    feature: preferSpell ? (spell ? undefined : feature) : feature,
  }
}

/** Band 1 when canon has nothing: the sheet's own words, still as facts.
 *  Segments are split whole and kept whole. */
function factsFromSheet(option: TurnOption): DetailFact[] {
  const facts: DetailFact[] = [{ label: 'Cost', value: option.cost.label }]
  if (option.source) facts.push({ label: 'Source', value: option.source })
  for (const segment of option.detail.split('·').map(s => s.trim()).filter(Boolean)) {
    facts.push({ label: null, value: segment })
  }
  return facts
}

/** Band 1 for a feature. Canon's mechanics bag, classified.
 *
 *  A 'computed' fact shows its working — "12 temp HP (Paladin level +
 *  Charisma modifier)" — because the number is derived and Marcus is entitled
 *  to check it against his own sheet rather than trust it. */
function factsFromFeature(facts: readonly FeatureFact[]): DetailFact[] {
  return facts.map(fact => ({
    label: fact.label,
    value:
      fact.shape === 'computed' && fact.raw !== fact.value
        ? `${fact.value} (${fact.raw})`
        : // Slice 10e. The row has 46 characters and says "(free)"; the sheet
          // has the whole width and says which costs are the ones not being
          // charged, because "free" is the word Marcus would have to take on
          // trust and this is the sentence that makes it checkable. Canon's own
          // string is kept in front of it, unedited.
          fact.free
          ? `${fact.raw} — free: no Action, no Bonus Action, no Reaction, no use`
          : fact.value,
  }))
}

/** The 2024 one-levelled-slot-per-turn rule, read off the ACTUAL turn.
 *
 *  This is the single rule the app is most able to get wrong in the player's
 *  favour, and the one a table argument is most likely to turn on. It is stated
 *  where the decision is made, at the moment it is made, with the live answer —
 *  not as a general note that is true on some turns. */
function ruleBoxFor(option: TurnOption, economy: EconomyState): RuleBox | null {
  const level = option.cost.spellSlotLevel
  if (!level || level < 1) return null

  const slot = ORDINALS[level] ?? `level ${level}`
  return economy.spellSlotUsedThisTurn
    ? {
        tone: 'blocked',
        text: `You have already spent a levelled spell slot this turn. Under the 2024 rules that is one per turn, so this cannot be cast until your next turn.`,
      }
    : {
        tone: 'notice',
        text: `Casting this spends your ${slot} slot AND your one levelled spell slot for the turn. Nothing else levelled can follow it this turn.`,
      }
}

/** Join the caster's save DC onto canon's Save row. Slice 9.
 *
 *  `statBlock` is pure over the spell and has no character, so it can only say
 *  WHICH save — "Dexterity — negates". The number is the half you say out loud
 *  to a DM, and the retired "Actions Reference" panel had it: it reached for
 *  `character.spellSaveDC` itself and painted «DC 16 Dexterity». Retiring that
 *  panel without this join would have cost Marcus a fact, which the prime law
 *  forbids, so the fact moves here first.
 *
 *  THE JOIN LIVES HERE, NOT IN `format.ts`. That file is the pure canon
 *  formatter; handing it a character would make every one of its callers need
 *  one, which is how a formatter turns into a view model. Here the character is
 *  already in hand.
 *
 *  It is a PREFIX, not a replacement: canon's effect ("negates", "half on a
 *  success") is the other half of the ruling and is never dropped. */
function withSaveDC(facts: DetailFact[], character: Character): DetailFact[] {
  const dc = character.spellSaveDC
  if (!dc) return facts
  return facts.map(fact =>
    fact.label === 'Save' && !/\bDC\b/.test(fact.value)
      ? { ...fact, value: `DC ${dc} ${fact.value}` }
      : fact
  )
}

/* WHAT THE SPEND BUTTON IS FOR — widened in slice 10c.
 *
 * Until 10c this returned a label only when the option burned a spell slot or a
 * resource pool, on the reading that an Action is not "spent". At a table it is
 * the only thing that is: your Action is the scarcest resource you own, and the
 * whole of the turn deck exists to track it. Under the old rule Sacred Flame
 * and Javelin — two of the four rows Nix actually sees on a fresh turn — got no
 * Spend button, so the one path built to take an option could not take most
 * options. Half a spend path reads as a broken one.
 *
 * NULL WHEN THE OPTION IS NOT AVAILABLE, and that is the same law the `onSpend`
 * prop states: a Spend control that cannot spend is purely a lie. The row
 * already carries `blockedReason`; the sheet does not need a button that only
 * ever produces a refusal. The reducer still refuses independently — this is
 * the affordance, not the guard, and the guard is not moved here.
 *
 * The label is `cost.label` because that string is ALWAYS populated and is
 * authored by whoever declared the option, which means a homebrew cost the
 * engine cannot parse still names itself on the button. */
function spendFor(option: TurnOption): { label: string } | null {
  if (!option.available) return null
  return { label: option.cost.label }
}

/** Canon HEARTH-04 on the surface that can spend.
 *
 *  The HP tracker asks this question about a number Marcus typed; this asks it
 *  about a number the app computed. Same decision function, same sentence — and
 *  no button state here, because the detail sheet's Spend has always been a
 *  single press and the warning sits above it in the same band. What the two
 *  surfaces share is the RULE; what they are allowed to differ on is the verb.
 *  Slice 10d. */
function tempHPWarningFor(option: TurnOption, character: Character): string | null {
  if (option.grantsTempHP === undefined) return null
  const replacement = tempHPReplacement(character, option.grantsTempHP, option.name)
  return replacement ? replacementWarning(replacement) : null
}

/** Everything the detail sheet paints, assembled once. Pure: no hooks, no
 *  fetch, no clock. It renders identically with the AI off and the wifi off,
 *  which is the requirement this whole slice was scoped around. */
export function optionDetail(
  option: TurnOption,
  character: Character,
  economy: EconomyState
): OptionDetail {
  const { spell, feature } = resolve(option)

  // Computed once: band 1 prints these, and band 3 rolls the dice among them.
  const canonFacts = feature ? featureFacts(feature, featureContextOf(character)) : []

  const facts: DetailFact[] = spell
    ? withSaveDC(
        statBlock(spell).map(f => ({ label: f.label, value: f.value })),
        character
      )
    : feature
      ? factsFromFeature(canonFacts)
      : factsFromSheet(option)

  // A canon feature whose mechanics bag is empty still deserves a band 1 — it
  // has a cost and a source like everything else.
  const filled = facts.length > 0 ? facts : factsFromSheet(option)

  return {
    title: option.name,
    subtitle: [option.cost.label, option.source].filter(Boolean).join(' · '),
    provenance: spell || feature ? 'canon' : 'sheet',
    facts: filled,
    // The three sources, in order of who has the most to say. `option.detail`
    // is the fallback and is exactly the string ActionMenu cuts at 80 chars.
    whatItDoes: spell?.summary || feature?.rawText || option.detail,
    rolls: rollOffers({
      detail: option.detail,
      spell: spell ?? null,
      // A canon feature states its dice in the mechanics bag and nowhere else.
      // See RollSource.segments for why leaving these out made a KNOWN feature
      // worse off than an unknown one.
      segments: canonFacts.filter(f => f.shape === 'dice').map(f => f.raw),
      ctx: casterContextOf(character),
    }),
    spend: spendFor(option),
    // Slice 10d. The option's own name is passed as the incoming source, which
    // is what makes re-taking the cloak you are already wearing NOT raise a
    // warning about itself.
    spendWarning: tempHPWarningFor(option, character),
    ruleBox: ruleBoxFor(option, economy),
    errata: errataForFeature(option.name) as CanonErratum[],
    tactics: spell ? splitTactics(spell.tactics) : [],
  }
}
