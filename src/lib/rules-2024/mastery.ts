// ---------------------------------------------------------------------------
// Weapon Mastery — D&D 2024
// ---------------------------------------------------------------------------
//
// `masteryProperty` has been declared on Weapon (character.ts:96) and printed
// on screen ("Mastery: Sap") since V0.9, but nothing has ever acted on it.
// This is the file that makes it mean something.
//
// The expiry window is the whole reason this is a type and not a string. Sap
// and Vex are the two masteries everyone plays wrong, and they are wrong in
// opposite directions:
//
//     Sap   ends before the START of your next turn
//     Vex   ends before the END   of your next turn
//
// Vex's window strictly contains Sap's. Get them the same way round and the
// app confidently tells Marcus he has advantage he does not have.
//
// Verified 2026-08-16 by a research pass plus an adversarial refute pass with
// sources. Every claim below was put to a fact-checker instructed to refute
// it; all twelve mastery claims came back CONFIRMED.

import type { Weapon } from '../character'

export type MasteryProperty =
  | 'Cleave' | 'Graze' | 'Nick' | 'Push' | 'Sap' | 'Slow' | 'Topple' | 'Vex'

/** When a rider stops applying.
 *
 *  NOTE — this union is wider than `03-program-design.md` specified. Gate 3
 *  assumed Sap expired at the end of the TARGET's next turn. It does not: the
 *  printed text is "before the start of your next turn". Both Sap and Slow are
 *  keyed to your turn, not the target's, so 'endOfTargetNextTurn' describes no
 *  mastery in the game and 'startOfYourNextTurn' was missing. The doc has been
 *  corrected. This is the exact error the slice existed to catch. */
export type RiderExpiry =
  | 'startOfYourNextTurn'
  | 'endOfYourNextTurn'
  | 'immediate'

export interface MasteryRider {
  property: MasteryProperty
  /** Table-ready sentence. Rendered as-is — no further formatting at the table. */
  text: string
  /** True if it simply happens. Topple is the only one gated on a save. */
  automatic: boolean
  save?: { ability: 'STR' | 'CON' | 'DEX'; dc: 'weaponAttackDC' }
  expires: RiderExpiry
  /** What must happen for the rider to apply at all. Sap and Vex differ here
   *  as well as on expiry: Vex requires the hit to DEAL DAMAGE, Sap does not. */
  trigger: 'onHit' | 'onHitDealingDamage' | 'onMiss' | 'onLightExtraAttack'
}

const RIDERS: Record<MasteryProperty, MasteryRider> = {
  Sap: {
    property: 'Sap',
    text: 'the target has disadvantage on its next attack roll',
    automatic: true,
    expires: 'startOfYourNextTurn',
    trigger: 'onHit',
  },
  Vex: {
    property: 'Vex',
    text: 'you have advantage on your next attack against it',
    automatic: true,
    expires: 'endOfYourNextTurn',
    // Vex requires damage; Sap does not. Encoding both as 'onHit' is a
    // documented common bug.
    trigger: 'onHitDealingDamage',
  },
  Slow: {
    property: 'Slow',
    text: "the target's speed drops by 10 ft — it does not stack",
    automatic: true,
    expires: 'startOfYourNextTurn',
    trigger: 'onHitDealingDamage',
  },
  Topple: {
    property: 'Topple',
    text: 'the target makes a CON save or falls prone',
    automatic: false,
    save: { ability: 'CON', dc: 'weaponAttackDC' },
    // The rider resolves at once. The Prone it may cause is a condition with
    // its own lifetime and is not this rider's business.
    expires: 'immediate',
    trigger: 'onHit',
  },
  Push: {
    property: 'Push',
    text: 'push the target up to 10 ft straight away from you (Large or smaller)',
    automatic: true,
    expires: 'immediate',
    trigger: 'onHit',
  },
  Graze: {
    property: 'Graze',
    text: 'on a MISS, still deal damage equal to your ability modifier',
    automatic: true,
    expires: 'immediate',
    trigger: 'onMiss',
  },
  Cleave: {
    property: 'Cleave',
    text: 'attack a second creature within 5 ft of the first, once per turn',
    automatic: true,
    expires: 'immediate',
    trigger: 'onHit',
  },
  Nick: {
    property: 'Nick',
    text: 'make the Light extra attack as part of the Attack action — bonus action stays free',
    automatic: true,
    expires: 'immediate',
    trigger: 'onLightExtraAttack',
  },
}

/** The 2024 weapon table. Used to fill in a mastery for a weapon that names a
 *  real weapon but never had `masteryProperty` set — every character saved
 *  before this file existed is in that state. */
const WEAPON_MASTERY: Record<string, MasteryProperty> = {
  // Simple melee
  club: 'Slow', dagger: 'Nick', greatclub: 'Push', handaxe: 'Vex',
  javelin: 'Slow', 'light hammer': 'Nick', mace: 'Sap', quarterstaff: 'Topple',
  sickle: 'Nick', spear: 'Sap',
  // Simple ranged
  dart: 'Vex', 'light crossbow': 'Slow', shortbow: 'Vex', sling: 'Slow',
  // Martial melee
  battleaxe: 'Topple', flail: 'Sap', glaive: 'Graze', greataxe: 'Cleave',
  greatsword: 'Graze', halberd: 'Cleave', lance: 'Topple', longsword: 'Sap',
  maul: 'Topple', morningstar: 'Sap', pike: 'Push', rapier: 'Vex',
  scimitar: 'Nick', shortsword: 'Vex', trident: 'Topple', 'war pick': 'Sap',
  warhammer: 'Push', whip: 'Slow',
  // Martial ranged
  blowgun: 'Vex', 'hand crossbow': 'Vex', 'heavy crossbow': 'Push',
  longbow: 'Slow', musket: 'Slow', pistol: 'Vex',
}

const CANONICAL = new Map<string, MasteryProperty>(
  (Object.keys(RIDERS) as MasteryProperty[]).map(p => [p.toLowerCase(), p]),
)

/** `masteryProperty` is free text on saved characters (character.ts:96) — it
 *  came from a text input, so it may be any casing, padded, or nonsense.
 *  Unrecognised values return null. This NEVER throws: a typo in one weapon
 *  must not be able to take down the turn screen mid-combat. */
export function coerceMastery(raw: string | undefined | null): MasteryProperty | null {
  if (typeof raw !== 'string') return null
  // Tolerates "Mastery: Sap", "sap ", "SAP" — all of which exist in the wild
  // because this field has been hand-typed since V0.9.
  const cleaned = raw.replace(/^mastery\s*:\s*/i, '').trim().toLowerCase()
  if (!cleaned) return null
  return CANONICAL.get(cleaned) ?? null
}

/** The mastery a weapon of this name has in the 2024 table, if it is a
 *  standard weapon. Homebrew names simply return null — the character's own
 *  `masteryProperty` is always authoritative over this table. */
export function masteryForWeaponName(name: string | undefined | null): MasteryProperty | null {
  if (typeof name !== 'string') return null
  return WEAPON_MASTERY[name.trim().toLowerCase()] ?? null
}

/** The rider this weapon applies, or null if it has no mastery.
 *
 *  Explicit `masteryProperty` wins over the weapon-name table, always. Marcus
 *  can hand a Longsword any mastery he likes and the app will believe him —
 *  homebrew is the main case here, not an edge case. The table is only a
 *  fallback for weapons saved before this file existed. */
export function riderFor(weapon: Weapon): MasteryRider | null {
  const declared = coerceMastery(weapon.masteryProperty)
  const property = declared ?? masteryForWeaponName(weapon.name)
  return property ? RIDERS[property] : null
}

/** Every rider, for the editor and for tests. */
export function allRiders(): MasteryRider[] {
  return Object.values(RIDERS)
}
