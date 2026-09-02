/* Build the catalogue: everything this character can do, and everything they
 * are going to be able to do.
 *
 * Open Book slice 1. Pure — canon plus the sheet in, an array out, no storage
 * touched and no write caused. `GrimoirePage` held eleven items because
 * `GrimoirePage.tsx:106` iterated `character.spells`; for Nix this holds 84.
 *
 * THREE RULES THIS MODULE OBEYS, in the order they matter:
 *
 *  1. THE OPEN-WORLD RULE. `lookup.ts` says it plainly — "nothing in this
 *     module may ever cause an option to disappear". The second pass here is
 *     what honours it: anything on the sheet that canon has never heard of is
 *     added with its own words and `provenance: 'sheet'`. Canon widens the
 *     list; it never gates it.
 *
 *  2. RESOLVE BOTH WAYS ROUND, AND DEDUPE ON THE NAME ALONE. Canon files
 *     Divine Smite as a level 1 spell. Marcus's sheet files it as a class
 *     feature. Deduping on name-plus-kind would put it in the catalogue twice.
 *     The key is `normalizeName(name)` and nothing else.
 *
 *  3. COMPUTE THE LOCK, NEVER READ IT. Canon ships `castableAtLevel7` and
 *     `lockedForMarcus` — that rule already answered, frozen at a level Nix
 *     will not stay. `isUnlocked(spell, character.level)` recomputes it. He
 *     levels; a boolean does not. */

import { SPELLS, CLASS_FEATURES, OATH } from '../../canon'
import type { CanonSpell, CanonFeature, CanonFeat } from '../canon/types'
import {
  normalizeName,
  spellByName,
  featureByName,
  featByName,
  isUnlocked,
} from '../canon/lookup'
import type { Character, Spell, ClassFeature } from '../character'
import type { CatalogueEntry, TurnCost } from './types'

/* ── Which of canon's 71 spells belong to THIS character ──────────────────── */

/** Canon's spells for this character. 62 for Nix.
 *
 *  `onPaladinList` is the 53 he chooses from; `always_prepared` adds the 9 the
 *  Hearth grants him off-list. The other 9 records are the Blessed Warrior
 *  cantrip menu — a menu of nine that ONE Fighting Style lets you pick two
 *  from. They are not things he can do, they are things he could have chosen,
 *  which is word for word why the other 74 feats are absent too.
 *
 *  The style is READ OFF THE SHEET rather than hard-coded against nine names:
 *  the day he records Blessed Warrior the cantrips arrive without this function
 *  being edited, and `build.test.ts` proves that with a second sheet rather
 *  than trusting the sentence. */
export function catalogueSpells(character: Character): readonly CanonSpell[] {
  const blessedWarrior = hasFightingStyle(character, 'Blessed Warrior')
  return SPELLS.filter(spell => {
    if (spell.onPaladinList) return true
    if (spell.availability === 'always_prepared') return true
    // Canon names the granting style inside `grantedBy`. Matched by that
    // string, not by the nine spell names, for the reason above.
    if (blessedWarrior && /fighting style/i.test(spell.grantedBy ?? '')) return true
    return false
  })
}

/** Does the sheet record this Fighting Style, under either heading?
 *
 *  A style can land on `feats` (where `prepare/fighting-style.ts` will put it
 *  in slice 6) or on `features` (where a hand-typed sheet might). Both are
 *  checked, because refusing to look in the second place would make the answer
 *  depend on how he typed it. */
function hasFightingStyle(character: Character, styleName: string): boolean {
  const want = normalizeName(styleName)
  const feats = Array.isArray(character.feats) ? character.feats : []
  if (feats.some(f => normalizeName(f.name) === want)) return true
  return character.features.some(f => normalizeName(f.name) === want)
}

/* ── Turn cost ────────────────────────────────────────────────────────────── */

/* Canon's own cost vocabulary. Matched as whole phrases so that "you can take
 * a Reaction to…" inside a feat's effects reads as a Reaction, while a
 * sentence merely containing the word "action" does not. Reaction is tested
 * first: a feature that costs a Reaction often describes what it interrupts
 * using the word "action". */
const REACTION_PHRASE = /\b(?:take|use|as)\s+(?:a|your)\s+Reaction\b|^Reaction\b/i
const BONUS_PHRASE = /\bBonus Action\b/i
const ACTION_PHRASE = /\b(?:as an|take an|Magic)\s*Action\b|^Action\b/i

function costFromPhrase(text: string): TurnCost | null {
  if (!text) return null
  if (REACTION_PHRASE.test(text)) return 'reaction'
  if (BONUS_PHRASE.test(text)) return 'bonus'
  if (ACTION_PHRASE.test(text)) return 'action'
  return null
}

function spellTurnCost(spell: CanonSpell): TurnCost {
  switch (spell.castingTimeType) {
    case 'action':
      return 'action'
    case 'bonus_action':
      return 'bonus'
    case 'reaction':
      return 'reaction'
    default:
      // 'long' — a 1-minute, 10-minute, 1-hour or 24-hour cast. It costs him
      // nothing ON HIS TURN, and calling it an Action would be a lie told in
      // the one band he reads mid-fight.
      return 'other'
  }
}

function featureTurnCost(feature: CanonFeature): TurnCost {
  // Canon states the cost outright on 3 of the 16 class features, in its own
  // `action` field. Prefer the statement to the parse, every time.
  const stated = typeof feature.action === 'string' ? costFromPhrase(feature.action) : null
  if (stated) return stated
  return costFromPhrase(String(feature.rawText ?? '')) ?? 'other'
}

function featTurnCost(feat: CanonFeat): TurnCost {
  for (const effect of feat.effects ?? []) {
    const cost = costFromPhrase(effect)
    if (cost) return cost
  }
  return 'other'
}

/** The sheet's own `actionType`, used ONLY as a fallback when canon said
 *  nothing. Canon wins the words; this is what happens when canon has no
 *  words to win with. */
function sheetTurnCost(feature: ClassFeature): TurnCost | null {
  switch (feature.actionType) {
    case 'bonusAction':
      return 'bonus'
    case 'reaction':
      return 'reaction'
    case 'passive':
      return 'passive'
    case 'action':
      return 'action'
    default:
      return null
  }
}

/* ── Origin ───────────────────────────────────────────────────────────────── */

function spellOrigin(spell: CanonSpell): string {
  if (spell.onPaladinList) return 'Paladin'
  const granted = spell.grantedBy ?? ''
  if (/oath of the hearth/i.test(granted)) return 'Oath of the Hearth'
  if (/fighting style/i.test(granted)) return 'Fighting Style'
  return 'Paladin'
}

/* ── The sheet side ───────────────────────────────────────────────────────── */

interface SheetMatch {
  onSheet: boolean
  prepared: boolean
  sheetText: string | null
  sheetFeature: ClassFeature | null
}

function sheetIndex(character: Character): Map<string, SheetMatch> {
  const map = new Map<string, SheetMatch>()
  for (const spell of character.spells) {
    map.set(normalizeName(spell.name), {
      onSheet: true,
      // A cantrip is always prepared; the sheet's flag on one means nothing.
      prepared: spell.prepared || spell.level === 0,
      sheetText: spell.description || null,
      sheetFeature: null,
    })
  }
  for (const feature of character.features) {
    const key = normalizeName(feature.name)
    // First wins, and spells were added first — so Divine Smite keeps canon's
    // spell record and his feature row supplies only the sheet state.
    if (map.has(key)) {
      const existing = map.get(key)!
      map.set(key, { ...existing, sheetFeature: feature })
      continue
    }
    map.set(key, {
      onSheet: true,
      prepared: true, // a feature you have is a feature you have
      sheetText: feature.description || null,
      sheetFeature: feature,
    })
  }
  const feats = Array.isArray(character.feats) ? character.feats : []
  for (const feat of feats) {
    const key = normalizeName(feat.name)
    if (map.has(key)) continue
    map.set(key, {
      onSheet: true,
      prepared: true,
      sheetText: feat.description || null,
      sheetFeature: null,
    })
  }
  return map
}

/* ── The build ────────────────────────────────────────────────────────────── */

export function buildCatalogue(character: Character): CatalogueEntry[] {
  const sheet = sheetIndex(character)
  const byKey = new Map<string, CatalogueEntry>()

  const add = (entry: CatalogueEntry) => {
    // Rule 2. First writer wins on the NAME alone, so a thing canon knows as a
    // spell is never re-added as a feature, whatever the sheet calls it.
    if (!byKey.has(entry.key)) byKey.set(entry.key, entry)
  }

  /* Spells. */
  for (const spell of catalogueSpells(character)) {
    const key = normalizeName(spell.name)
    const match = sheet.get(key)
    const locked = isUnlocked(spell, character.level) ? null : spell.unlocksAtPaladinLevel
    const alwaysPrepared = spell.alwaysPrepared
    add({
      key,
      name: spell.name,
      kind: 'spell',
      provenance: 'canon',
      lockedUntil: locked,
      spellLevel: spell.level,
      turnCost: spellTurnCost(spell),
      origin: spellOrigin(spell),
      prepared:
        locked !== null
          ? false
          : alwaysPrepared || spell.level === 0 || (match?.prepared ?? false),
      alwaysPrepared,
      preparable: locked === null && spell.level > 0 && !alwaysPrepared,
      onSheet: match?.onSheet ?? false,
      sheetText: match?.sheetText ?? null,
      canonSpell: spell,
      canonFeature: null,
      canonFeat: null,
    })
  }

  /* Features. Oath first, so a subclass that redefines a base feature wins —
   * the same precedence `lookup.ts:49` sets for the feature index. */
  for (const [feature, origin] of [
    ...OATH.features.map(f => [f, 'Oath of the Hearth'] as const),
    ...CLASS_FEATURES.map(f => [f, 'Paladin'] as const),
  ]) {
    const key = normalizeName(feature.name)
    const match = sheet.get(key)
    const canonCost = featureTurnCost(feature)
    add({
      key,
      name: feature.name,
      kind: 'feature',
      provenance: 'canon',
      lockedUntil: feature.level > character.level ? feature.level : null,
      spellLevel: null,
      turnCost:
        canonCost === 'other' && match?.sheetFeature
          ? sheetTurnCost(match.sheetFeature) ?? 'other'
          : canonCost,
      origin,
      prepared: feature.level <= character.level,
      alwaysPrepared: false,
      preparable: false,
      onSheet: match?.onSheet ?? false,
      sheetText: match?.sheetText ?? null,
      canonSpell: null,
      canonFeature: feature,
      canonFeat: null,
    })
  }

  /* Feats — only the ones he actually has. A feat he has not taken is not a
   * thing he can do, it is a thing he could have chosen, and 74 of those is
   * the clutter he warned about. (Gate 1, `01-product.md`.) */
  const feats = Array.isArray(character.feats) ? character.feats : []
  for (const feat of feats) {
    const key = normalizeName(feat.name)
    const canon = featByName(feat.name)
    add({
      key,
      name: canon?.name ?? feat.name,
      kind: 'feat',
      provenance: canon ? 'canon' : 'sheet',
      lockedUntil: null,
      spellLevel: null,
      turnCost: canon ? featTurnCost(canon) : costFromPhrase(feat.description) ?? 'other',
      origin: 'Feat',
      prepared: true,
      alwaysPrepared: false,
      preparable: false,
      onSheet: true,
      sheetText: feat.description || null,
      canonSpell: null,
      canonFeature: null,
      canonFeat: canon ?? null,
    })
  }

  /* THE SECOND PASS — rule 1. Everything on his sheet that the four canon
   * sources above did not already account for. Resolved BOTH WAYS ROUND
   * (`spellByName` then `featureByName`) before being called homebrew, so a
   * sheet feature that canon files as a spell is recognised rather than
   * duplicated. */
  for (const spell of character.spells) add(sheetSpellEntry(spell))
  for (const feature of character.features) add(sheetFeatureEntry(feature, character))

  return [...byKey.values()]
}

function sheetSpellEntry(spell: Spell): CatalogueEntry {
  const key = normalizeName(spell.name)
  const canon = spellByName(spell.name) ?? null
  const feature = canon ? null : featureByName(spell.name) ?? null
  return {
    key,
    name: spell.name,
    kind: 'spell',
    provenance: canon || feature ? 'canon' : 'sheet',
    lockedUntil: null,
    spellLevel: spell.level,
    turnCost: costFromPhrase(spell.castingTime) ?? 'other',
    origin: 'Your sheet',
    prepared: spell.prepared || spell.level === 0,
    alwaysPrepared: false,
    preparable: spell.level > 0,
    onSheet: true,
    sheetText: spell.description || null,
    canonSpell: canon,
    canonFeature: feature,
    canonFeat: null,
  }
}

function sheetFeatureEntry(feature: ClassFeature, character: Character): CatalogueEntry {
  const key = normalizeName(feature.name)
  const canonFeature = featureByName(feature.name) ?? null
  const canonSpell = canonFeature ? null : spellByName(feature.name) ?? null
  return {
    key,
    name: feature.name,
    kind: 'feature',
    provenance: canonFeature || canonSpell ? 'canon' : 'sheet',
    lockedUntil: null,
    spellLevel: canonSpell ? canonSpell.level : null,
    turnCost: sheetTurnCost(feature) ?? costFromPhrase(feature.description) ?? 'other',
    origin: 'Your sheet',
    prepared: feature.level <= character.level,
    alwaysPrepared: false,
    preparable: false,
    onSheet: true,
    sheetText: feature.description || null,
    canonSpell,
    canonFeature,
    canonFeat: null,
  }
}
