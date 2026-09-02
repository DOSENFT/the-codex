/* Canon prose → the separately-priced abilities inside one feature.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * Marcus's item 7 and half of item 8: "i dont think the hearthfire manifest
 * reaction (retaliation with fire damage) is working" and "it doesnt seem to
 * have all of my available reactions available".
 *
 * Measured, the cause was not a missing row and not a ranking bug. It was
 * `overlay.ts`'s `economyFromFeature` doing the RIGHT thing and getting the
 * wrong result. Canon's Hearthfire Manifest states two costs:
 *
 *     mechanics.manifestSummonDismiss : "Bonus Action"
 *     mechanics.cloakAction           : "Reaction"
 *
 * so `found.size === 2` and it returns `undefined` rather than picking one.
 * That refusal is correct — an app that guessed here would tell Marcus his
 * Reaction is an Action with total confidence. But `undefined` means no refile,
 * and `options.ts`'s `featureActionType` then supplies its own default of
 * 'action'. **A principled refusal that falls back to a guess is a guess.**
 *
 * The fact the refusal was groping at is that Hearthfire Manifest is not one
 * ability. It is a manifestation you summon as a Bonus Action, and a cloak you
 * raise as a Reaction. One feature, two prices, and a data model that had room
 * for one.
 *
 * ── WHY PROSE AND NOT THE `mechanics` BAG ───────────────────────────────────
 * The bag is where the two costs were FOUND, but it is not where they can be
 * split. Its keys are free-form by design (`CanonFeature.mechanics` is
 * `Record<string, unknown>`), so pairing `cloakAction` with `cloakCost` and
 * `tempHP` means reading a `cloak*` prefix convention — recognising a NAME,
 * which is the one thing this codebase does not do. `rawText` carries the same
 * facts in sentences, and canon writes those sentences cost-first:
 *
 *     "It can be summoned or dismissed AS A BONUS ACTION."
 *     "AS A REACTION, you can expend one use of your Channel Divinity …"
 *
 * So the shape is the cost phrase, and it is the same handle `feats.ts` already
 * proved on feats — match the phrasing that carries the PRICE, never the noun.
 *
 * ── WHAT IT REFUSES, AND WHY REFUSING IS THE POINT ──────────────────────────
 * Returns `[]` — never a partial answer — when a sentence names two costs, when
 * a face would carry no words, or when fewer than two faces are found. Half an
 * answer here means silently dropping one of two abilities Marcus owns, which
 * is the exact fault this phase exists to remove. An empty result leaves the
 * existing `canonEconomy` path in charge, which is at least already understood.
 *
 * The `< 2` refusal also keeps exactly ONE mechanism per case: a feature canon
 * prices once is `economyFromFeature`'s business and always was. Two mechanisms
 * answering one question is how they come to disagree.
 *
 * Held Reaction slice 1.
 */
import type { CanonFeature } from '../canon/types'
import type { EconomyFiling } from './overlay'

/** One ability inside a feature that canon prices separately. */
export interface CanonFace {
  /** The cost this face's opening sentence names. */
  economy: EconomyFiling
  /** The sentence that named the cost. Becomes the row's mechanics line, which
   *  is the first segment `triggerFor` reads — so canon's own words end up in
   *  the "WHEN" label with nothing else written. */
  opener: string
  /** `opener` plus every following sentence that names no cost of its own. */
  text: string
}

/** 2024 states a price in prose as "as a <cost>".
 *
 *  Deliberately NOT a match on the bare cost word. "Creatures provoke
 *  Opportunity Attacks from you", "the target can't take a Reaction" and "when
 *  you take the Attack action" all name a cost word while pricing nothing of
 *  yours. The preposition is what turns the noun into a price, so the
 *  preposition is what is matched — the same reasoning as `feats.ts`'s
 *  REACTION_COST, which matches the verb for the same reason.
 *
 *  Longest alternatives first: "magic action" and "bonus action" must be tried
 *  before "action" or they are read as a bare Action. */
const COST_IN_PROSE = /\bas an?\s+(magic action|bonus action|reaction|action)\b/gi

const FILING_OF: Record<string, EconomyFiling> = {
  action: 'action',
  'magic action': 'action',
  'bonus action': 'bonusAction',
  reaction: 'reaction',
}

/** Split prose into sentences.
 *
 *  No words are added and none are dropped — `sentencesOf(t).join(' ')` rebuilds
 *  `t` up to whitespace, and that is pinned in the tests. A splitter that
 *  quietly eats a clause is a splitter that edits a rule, which is `feats.ts`'s
 *  `splitTrigger` finding restated one level up. */
export function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=["'(]?[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** The DISTINCT costs this one sentence names. 0, 1, or more.
 *
 *  Distinct, so a sentence that says "as a Reaction" twice is one price and not
 *  a refusal. Two DIFFERENT prices in one sentence is a shape this splitter
 *  cannot honestly divide, and it says so by refusing rather than by picking. */
export function costsNamedIn(sentence: string): EconomyFiling[] {
  const found = new Set<EconomyFiling>()
  for (const match of sentence.matchAll(COST_IN_PROSE)) {
    const filing = FILING_OF[match[1].toLowerCase()]
    if (filing) found.add(filing)
  }
  return [...found]
}

/** Every separately-priced ability stated in this feature's prose.
 *
 *  Empty for the overwhelming majority of features, and that is the shape of
 *  the fact rather than a gap: one cost, or none, is the normal record, and
 *  those keep the `canonEconomy` refile that already handles them. */
export function facesOf(feature: CanonFeature | undefined): CanonFace[] {
  if (!feature) return []
  const raw = typeof feature.rawText === 'string' ? feature.rawText : ''
  if (!raw.trim()) return []

  const faces: CanonFace[] = []
  let opener: string | null = null
  let economy: EconomyFiling | null = null
  let parts: string[] = []

  const close = () => {
    if (opener !== null && economy !== null) {
      faces.push({ economy, opener, text: parts.join(' ') })
    }
  }

  for (const sentence of sentencesOf(raw)) {
    const costs = costsNamedIn(sentence)

    // Two prices in one sentence. There is no honest cut, so there is no cut.
    if (costs.length > 1) return []

    if (costs.length === 1) {
      close()
      opener = sentence
      economy = costs[0]
      parts = [sentence]
      continue
    }

    // A sentence naming no price continues the ability that is open. Before the
    // first face there is nothing open, and those sentences — the flavour, the
    // light radius, the leash — belong to the feature itself. Dropping them here
    // is right: the sheet's own option keeps carrying them, so nothing Marcus
    // can see today disappears.
    if (opener !== null) parts.push(sentence)
  }
  close()

  // Fewer than two faces is `economyFromFeature`'s case, not this one.
  if (faces.length < 2) return []
  // A face with no words is a row with nothing on it.
  if (faces.some(f => !f.opener.trim() || !f.text.trim())) return []

  return faces
}
