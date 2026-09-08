/* Reach — how far "within 5 feet of you" actually is, for this character.
 *
 * Combat Open Book slice 6. `docs/plans/combat-open-book/04-slices.md`.
 *
 * ── THE COMPLAINT THIS ANSWERS ──────────────────────────────────────────────
 * Marcus, 2026-09-07: "for sentinel, or for interception, etc, I have a reach of
 * 10 ft via my Dawn Guardian which has a feature that extends the reach and
 * range of those abilities." His DM's own text, transcribed in
 * `reference/dawn-guardian.md`: "Martial abilities with this weapon are
 * effective up to 10ft."
 *
 * Canon prints "within 5 feet of you" as a flat distance. For him that number
 * is wrong by half, on the two feats he built his character around.
 *
 * ── WHY THIS FILE IS A MOVE, NOT A BUILD ────────────────────────────────────
 * The 00-status note that opened this feature claimed the app had no mechanism
 * for reach and that this was net-new architecture. That was wrong, and it was
 * wrong because it was reasoned from `Character.equipment` instead of measured.
 * `primaryWeapon` and `weaponReach` have existed and been tested since the
 * Toybox seeding work — they were simply buried in `toybox-seed/profile.ts`,
 * where the combat and grimoire layers could not see them.
 *
 * So two functions move up here UNCHANGED, `profile.ts` re-exports them so its
 * own tests keep passing at their current path, and the only new code is the
 * short list and the lookup. A rule that two layers need does not belong to
 * whichever layer happened to need it first.
 *
 * ── THE RULING IS A RULING, AND SAYS SO ─────────────────────────────────────
 * Opportunity Attack extending with a Reach weapon is RAW — `glossary.json:127`
 * quotes it: the property "adds 5 feet to your reach when you attack with it,
 * including for Opportunity Attacks". Sentinel and Interception are NOT. Both
 * print a flat five feet (`feats.json:511`, `:729`), and extending them is
 * Marcus's table ruling, approved at Gate 2 and confirmed by his DM for
 * Interception specifically on 2026-09-08: "Interception is 10ft with the
 * Glaive doing the blocking where the shield would have."
 *
 * THE MITIGATION IS THAT THE ITEM IS NAMED EVERY SINGLE TIME. `Reach.source`
 * is not decoration and is never optional: the card says "10 ft — The Dawn
 * Guardian", so his DM can read the line and disagree with it. He cannot do
 * that if the app just prints 10. Reverting the ruling is deleting two strings
 * from `REACH_EXTENDED` below. */

import type { Character, Weapon } from '../character'

/** What extended reach is, when there is any. Both fields required — a reach
 *  without a source is the app making a claim it will not attribute. */
export interface Reach {
  feet: number
  /** The weapon's own name — "The Dawn Guardian". Printed every time. */
  source: string
}

/** The weapon the content means when it says "your weapon".
 *
 *  MOVED VERBATIM from `toybox-seed/profile.ts:63`. Its comment, unedited:
 *
 *  A magical melee weapon first, then any melee weapon, then nothing. Nothing
 *  is a real answer: a character with only a bow gets no weapon tokens, and
 *  every combo that names a weapon is dropped rather than told to swing a bow
 *  in melee. Ranged weapons are deliberately never chosen — this pack is
 *  written for a paladin standing in the way of something. */
export function primaryWeapon(character: Character): Weapon | null {
  const melee = (character.weapons ?? []).filter(w => w.attackType === 'melee')
  return melee.find(w => w.magical) ?? melee[0] ?? null
}

/** Reach in feet: the property first, then the stated range, then 5.
 *
 *  MOVED VERBATIM from `toybox-seed/profile.ts:73`. Its comment, unedited:
 *
 *  The property wins over `range` because a Reach weapon whose range field
 *  still says "5 ft" is a data entry slip, not a five-foot glaive, and the
 *  positioning advice that hangs off this number is wrong at 5. */
export function weaponReach(weapon: Weapon): number {
  if (weapon.properties?.some(p => /reach/i.test(p))) return 10
  const stated = /(\d+)\s*ft/i.exec(weapon.range ?? '')
  return stated ? Number(stated[1]) : 5
}

/** The abilities whose stated distance follows the weapon.
 *
 *  ONE RAW, TWO BY RULING — and the file header says which is which, because a
 *  reader six months from now needs to know that deleting entries 2 and 3
 *  reverts a table decision while deleting entry 1 breaks the rules.
 *
 *  EXPLICIT AND SHORT ON PURPOSE. The tempting version of this is a regex over
 *  canon for "within 5 feet of you", which would silently swallow every future
 *  feat, spell and monster ability carrying that phrase — including the ones
 *  where the five feet is an aura, a burst, or somebody else's reach. Widening
 *  this list is a decision somebody makes and signs; it is not a pattern that
 *  quietly grows. `reach.test.ts` asserts every name here resolves to a real
 *  canon record or a real synthetic option, so a typo cannot ship as a silently
 *  dead entry. */
export const REACH_EXTENDED: readonly string[] = [
  // RAW. `glossary.json:127` — the Reach property applies to Opportunity Attacks.
  'Opportunity Attack',
  // Marcus's table ruling, approved at Gate 2.
  'Sentinel',
  // Marcus's table ruling; confirmed by his DM 2026-09-08.
  'Interception',
]

/** This character's reach for this ability, or null when there is nothing worth
 *  saying.
 *
 *  NULL IS THE COMMON ANSWER AND IS NOT A FAILURE. Three ways to get it:
 *
 *    · the ability is not one whose distance follows the weapon — most are not;
 *    · the character wields nothing with Reach;
 *    · the answer would be the plain default of 5 feet.
 *
 *  That last one is the interesting case, and it is deliberate: a row reading
 *  "Your reach · 5 ft — Longsword" is a line Marcus reads to learn exactly
 *  nothing, and band 1 is a grid where every row costs him a glance. The fact
 *  appears ONLY when it changes what he would otherwise have believed.
 *
 *  Matched case-insensitively but not fuzzily. `normalizeName` in `canon/lookup`
 *  is not used here because it is canon's resolver and this list contains a
 *  synthetic option the composer builds; the comparison is deliberately dumber
 *  than canon resolution and the test pins both halves against reality. */
export function reachFor(abilityName: string, character: Character): Reach | null {
  const wanted = abilityName.trim().toLowerCase()
  if (!REACH_EXTENDED.some(n => n.toLowerCase() === wanted)) return null

  const weapon = primaryWeapon(character)
  if (!weapon) return null

  const feet = weaponReach(weapon)
  if (feet <= 5) return null

  return { feet, source: weapon.name }
}
