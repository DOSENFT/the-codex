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

import { SPELLS, CONDITIONS, OATH, CLASS_FEATURES, CHANNEL_DIVINITY_OPTIONS } from '../../canon'
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

/* ── The alias layer: the names a SHEET uses ────────────────────────────────
 *
 * Slice 1's Finding D, closed. Canon files the cloak's full text — and four of
 * the twelve errata — under "Hearthfire Manifest". Nix's sheet calls it
 * "Flaming Cloak". Nothing bridged the two names, so the app showed Marcus his
 * own thin wording for the exact feature he asked about while canon held the
 * paragraph.
 *
 * Two rules this layer must never break:
 *
 *  1. AN ALIAS MAY NEVER SHADOW A REAL NAME. Built after FEATURE_INDEX and
 *     skipping any key that index already holds. If a future canon package
 *     names a feature "Flaming Cloak" outright, the feature wins and this map
 *     goes quiet — which is the only direction a nickname should ever lose in.
 *  2. A MISS IS STILL A MISS. This widens what canon can answer for; it does
 *     not invent answers. "Sacred Weapon" is not in canon's option list (it is
 *     a 2014 leftover on Nix's sheet), so it misses here as it did before, and
 *     the caller keeps the sheet's own words. The open-world rule at the top of
 *     this file is not relaxed by one line. */
const FEATURE_ALIAS_INDEX: Map<string, CanonFeature> = (() => {
  const map = new Map<string, CanonFeature>()
  for (const option of CHANNEL_DIVINITY_OPTIONS) {
    if (!option.alias) continue
    const key = normalizeName(option.alias)
    if (!key || FEATURE_INDEX.has(key) || map.has(key)) continue
    // The alias is only worth an entry if the PARENT resolves — an alias that
    // points at nothing is worse than no alias, because it turns a clean miss
    // into an undefined the caller has to defend against.
    const parent = FEATURE_INDEX.get(normalizeName(option.parent))
    if (parent) map.set(key, parent)
  }
  return map
})()

/* "Channel Divinity: Sacred Weapon" is how a sheet writes a menu pick: the menu
 * name, a separator, the option. Stripping the prefix and retrying is what lets
 * a sheet that spells the whole path out reach the same record as one that
 * names the option alone. Recognised by SHAPE — a known menu name followed by a
 * separator — never by recognising the option that follows it. */
const MENU_PREFIX = /^(?:channel\s+divinity)\s*[:\-–—]\s*(.+)$/i

export function featureByName(name: string): CanonFeature | undefined {
  const key = normalizeName(name)
  const exact = FEATURE_INDEX.get(key)
  if (exact) return exact

  const alias = FEATURE_ALIAS_INDEX.get(key)
  if (alias) return alias

  const menu = MENU_PREFIX.exec(name.trim())
  if (menu) {
    const tail = normalizeName(menu[1])
    // Only the option's own name is retried, NOT the menu's. Falling back to
    // "Channel Divinity" here would answer every unknown pick with the menu's
    // text, which reads as coverage and is worth nothing at a table.
    return FEATURE_INDEX.get(tail) ?? FEATURE_ALIAS_INDEX.get(tail)
  }

  return undefined
}

/** Is this spell available to a Paladin of this level?
 *
 *  Recomputed from `unlocksAtPaladinLevel` — the rule — every time. Canon also
 *  ships `castableAtLevel7` and `lockedForMarcus`, which are that rule already
 *  answered for a level-7 character. Reading those would bake a level into the
 *  app. Three numbers were in play — the sheet, the fixture, and canon's frozen
 *  booleans — and slice 8b settled which is which. **Marcus confirmed 2026-08-27
 *  that Nix is level 7**, so canon's booleans happen to be right TODAY; the
 *  fixture's `level: 8` is a deliberate branch-coverage artifact, not a claim
 *  about his character; and the stored sheet's level-9 spell slots are the one
 *  that is simply wrong (surfaced in slice 2, his to decide, never auto-applied).
 *  "Right today" is still not worth trusting a frozen boolean about — he levels,
 *  and the boolean does not. So: compute. */
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
  /** Sheet-side nicknames that now reach a feature record. Counted separately
   *  from `features` because they are not new text — they are new ways in. */
  featureAliases: FEATURE_ALIAS_INDEX.size,
  errata: OATH.errata.length,
  combos: OATH.combos.length,
} as const

/** Everything canon knows a name for. Used to report coverage, never to gate.
 *  Goes through `featureByName` rather than the raw index so the match report
 *  counts what the app can actually resolve, aliases included. */
export function knowsName(name: string): boolean {
  const key = normalizeName(name)
  return SPELL_INDEX.has(key) || CONDITION_INDEX.has(key) || featureByName(name) !== undefined
}
