/* Canon lookup: name normalisation and the by-name indexes.
 *
 * Pure. No React, no character knowledge, no storage. The engine calls this;
 * this calls nothing back.
 *
 * WHY BY NAME AND NOT BY ID. Canon's own cross-references use names — the oath
 * combos name their pieces, character-marcus names its spells — and only the 12
 * errata carry ids. Matching by name follows canon rather than inventing a
 * parallel keying scheme that would then have to be maintained by hand.
 *
 * THE OPEN-WORLD RULE STILL HOLDS. This is a TEXT LOOKUP, never a capability
 * gate. A miss means "canon has nothing to add", not "this does not exist" —
 * the caller keeps the sheet's own words and marks it provenance 'sheet'.
 * Nothing in this module may ever cause an option to disappear.
 *
 * Table Truth slice 1. */

import { SPELLS, CONDITIONS, OATH, CLASS_FEATURES } from '../../canon'
import type { CanonSpell, CanonCondition, CanonFeature, CanonErratum } from './types'

/** Fold a display name to a match key.
 *
 *  Lowercase, drop everything that is not a letter or a digit. That folds
 *  "Faerie Fire", "faerie fire", "Faerie  Fire!" and "Faerie-Fire" onto one
 *  key, which is what a hand-typed sheet needs. It deliberately does NOT stem
 *  or fuzzy-match: "Searing Smite" and "Seering Smite" stay different, because
 *  guessing which spell someone meant is how an app quietly shows the wrong
 *  dice at a table. A near-miss falls through to the sheet's own text, which is
 *  correct-but-plainer rather than confident-but-wrong. */
export function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function indexByName<T extends { name: string }>(records: readonly T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const record of records) {
    const key = normalizeName(record.name)
    // First wins. A collision is a canon defect, caught by lookup.test.ts at
    // build time; at runtime it must not throw and must not pick at random.
    if (!map.has(key)) map.set(key, record)
  }
  return map
}

const SPELL_INDEX: Map<string, CanonSpell> = indexByName(SPELLS)
const CONDITION_INDEX: Map<string, CanonCondition> = indexByName(CONDITIONS)
/* Oath features FIRST, so they win a name collision with a base class feature:
 * where a subclass redefines something, the subclass is what the player has. */
const FEATURE_INDEX: Map<string, CanonFeature> = indexByName([
  ...OATH.features,
  ...CLASS_FEATURES,
])

export function spellByName(name: string): CanonSpell | undefined {
  return SPELL_INDEX.get(normalizeName(name))
}

export function conditionByName(name: string): CanonCondition | undefined {
  return CONDITION_INDEX.get(normalizeName(name))
}

export function featureByName(name: string): CanonFeature | undefined {
  return FEATURE_INDEX.get(normalizeName(name))
}

/** Is this spell available to a Paladin of this level?
 *
 *  Recomputed from `unlocksAtPaladinLevel` — the rule — every time. Canon also
 *  ships `castableAtLevel7` and `lockedForMarcus`, which are that rule already
 *  answered for a level-7 character. Reading those would bake a level into the
 *  app; Nix is level 7 today, the test fixtures say 8, and his stored sheet is
 *  carrying level-9 spell slots. Three numbers, one of them wrong, and none of
 *  them worth trusting a frozen boolean about. */
export function isUnlocked(spell: CanonSpell, characterLevel: number): boolean {
  return spell.unlocksAtPaladinLevel <= characterLevel
}

/** Errata for a feature, matched on the leading name in canon's `feature`
 *  string — which reads "Smoldering Smite (level 15)", name then parenthetical. */
export function errataForFeature(featureName: string): CanonErratum[] {
  const key = normalizeName(featureName)
  return OATH.errata.filter(e => normalizeName(e.feature.replace(/\s*\(.*$/, '')) === key)
}

export function erratumById(id: string): CanonErratum | undefined {
  return OATH.errata.find(e => e.id === id)
}

/* ── Corpus counts, for the slice-1 match report ────────────────────────── */

export const CANON_COUNTS = {
  spells: SPELLS.length,
  conditions: CONDITIONS.length,
  /** Oath features plus base class features — the number the index can answer
   *  for, not the number in any one file. */
  features: FEATURE_INDEX.size,
  errata: OATH.errata.length,
  combos: OATH.combos.length,
} as const

/** Everything canon knows a name for. Used to report coverage, never to gate. */
export function knowsName(name: string): boolean {
  const key = normalizeName(name)
  return SPELL_INDEX.has(key) || FEATURE_INDEX.has(key) || CONDITION_INDEX.has(key)
}
