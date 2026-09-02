/* The catalogue's record shape — one row of "everything Nix can do".
 *
 * Open Book slice 1. See docs/plans/grimoire/03-program-design.md.
 *
 * Its own file so the view layer can import the type without importing the
 * builder, which pulls the whole canon corpus in behind it.
 *
 * THE INVARIANT WORTH NAMING: at most one of `canonSpell` / `canonFeature` /
 * `canonFeat` is ever non-null. Canon files Divine Smite as a level 1 SPELL and
 * half the world — including Marcus's own sheet — files it as a class feature.
 * A union that folded canon by kind and then added unmatched sheet items would
 * put Divine Smite in the catalogue twice: once with canon's paragraph, once
 * with his thin wording. Mirroring `turn/detail.ts:103`'s both-ways-round
 * resolution in the TYPE keeps that visible instead of buried in the builder. */

import type { CanonSpell, CanonFeature, CanonFeat } from '../canon/types'

export type EntryKind = 'spell' | 'feature' | 'feat'

/** What it costs on his turn.
 *
 *  `'other'` is the honest bucket for anything canon prices in words this
 *  module does not recognise — a 1-minute ritual, a feature whose text never
 *  names a cost. It is never guessed at: a feature that reads as always-on is
 *  only `'passive'` when something SAYS so, because a wrong cost on a card he
 *  reads mid-fight is worse than an unhelpful one. */
export type TurnCost = 'action' | 'bonus' | 'reaction' | 'passive' | 'other'

export interface CatalogueEntry {
  /** `normalizeName(name)`. The dedup key, the React key, the sort tiebreak. */
  key: string
  name: string
  kind: EntryKind
  /** Where the WORDS came from. 'sheet' is not a failure — it is homebrew
   *  keeping its own words, and the card says so either way. */
  provenance: 'canon' | 'sheet'

  /** null when he has it now; otherwise the level it arrives at. */
  lockedUntil: number | null
  /** 1–5 for a spell, 0 for a cantrip, null for anything that is not a spell. */
  spellLevel: number | null
  turnCost: TurnCost
  /** 'Paladin' · 'Oath of the Hearth' · 'Fighting Style' · 'Feat' · 'Your sheet'. */
  origin: string

  prepared: boolean
  /** Canon says it never counts against the prepared cap. */
  alwaysPrepared: boolean
  /** False for features, feats, cantrips, always-prepared spells and anything
   *  locked — everything, in other words, that a tap could not change. */
  preparable: boolean
  onSheet: boolean
  /** His own words, for band 2 when canon is silent. Never his words when canon
   *  is not silent — Gate 3 decision 4. */
  sheetText: string | null

  /* AT MOST ONE of these three is non-null. See the header. */
  canonSpell: CanonSpell | null
  canonFeature: CanonFeature | null
  canonFeat: CanonFeat | null
}
