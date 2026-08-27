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
  /** Band 3, the spend affordance. Null when nothing is spent. */
  spend: { label: string } | null
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

function spendFor(option: TurnOption): { label: string } | null {
  if (option.cost.spellSlotLevel || option.cost.resourcePoolId) {
    return { label: option.cost.label }
  }
  return null
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
    ? statBlock(spell).map(f => ({ label: f.label, value: f.value }))
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
    ruleBox: ruleBoxFor(option, economy),
    errata: errataForFeature(option.name) as CanonErratum[],
    tactics: spell ? splitTactics(spell.tactics) : [],
  }
}
