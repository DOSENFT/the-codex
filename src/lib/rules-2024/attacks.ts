// ---------------------------------------------------------------------------
// Extra Attack — how many swings one Attack action contains
// ---------------------------------------------------------------------------
//
// Marcus, 2026-09-04: "It also doesnt allow me to take my two mele attacks."
//
// He is a level 7 Paladin. Under the 2024 rules his Attack action contains two
// attacks, and The Codex has never known that — swinging Hearthbrand spent his
// Action outright and the second swing was simply not offered. This file is the
// rule, alone, with no state and no UI: R5 makes the Action hold and R6 makes
// the holding visible, and both of them ask this file the question.
//
// WHY A NEW FILE AND NOT A LINE IN economy.ts. `demandOfWeapon` answers "what
// does one swing cost" and answers it with a constant, deliberately. "How many
// swings are in the action you just paid for" is a DIFFERENT question — it is
// about the character, not the weapon — and growing `demandOfWeapon` a
// character parameter to answer it would make the cheapest function in the
// economy the one that needs the whole sheet. economy.ts's header says it
// states the law; this states a different law, next door.
//
// THE DIRECTION OF ERROR IS CHOSEN, NOT DEFAULTED. Every unknown here answers
// ONE. An app that offers a swing you do not have gets you killed at the table
// and gets the DM to stop trusting the screen; an app that offers one too few
// costs you a sentence to your DM. So unknown class, unreadable level, missing
// data and homebrew the table has never seen all resolve down, never up.

import type { Character, ClassFeature } from '../character'
import type { TurnOption } from '../turn/types'

/** The levels at which each class gains ANOTHER attack, 2024 PHB.
 *
 *  Ascending, and a LIST rather than a single level because the Fighter's
 *  progression is the reason this table exists in the shape it does: the app
 *  already tells the player, in `mechanics-reference.ts`, that a Fighter has
 *  "2 attacks at level 5, 3 at level 11, and 4 at level 20". A one-number
 *  table could not hold that, and an engine that contradicts the reference
 *  text shipped beside it is worse than one that is merely incomplete.
 *
 *  ABSENT MEANS NEVER, and the absences are as deliberate as the entries.
 *  Rogue, Cleric, Druid, Bard, Sorcerer, Warlock and Wizard gain no Extra
 *  Attack from their class. Some gain one from a SUBCLASS (College of Valour,
 *  College of Swords) or an invocation (Thirsting Blade), and those are not
 *  here on purpose — they are not a function of class and level, so they
 *  cannot be answered by this table. They are answered instead by the sheet:
 *  a character who has one has the feature written down, and `attacksPerAction`
 *  reads that. See `sheetGrantsExtraAttack` below.
 *
 *  Keys are normalised — lowercase, no punctuation — because `character.class`
 *  is free text a human typed. */
export const EXTRA_ATTACK_AT: Readonly<Record<string, readonly number[]>> = {
  barbarian: [5],
  fighter: [5, 11, 20],
  monk: [5],
  paladin: [5],
  ranger: [5],
}

/** The name a sheet uses when it declares this itself. */
const EXTRA_ATTACK = 'extra attack'

/** Lowercase, punctuation-stripped, single-spaced.
 *
 *  Local rather than borrowed from `canon/lookup`: this file is a rules module
 *  and canon is a content module, and the day canon's normaliser starts doing
 *  something canon-specific is not a day the Attack action should change. */
function normalise(raw: unknown): string {
  return typeof raw === 'string'
    ? raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    : ''
}

/** Which known class this sheet is, or null.
 *
 *  A SCAN, NOT A LOOKUP, because `character.class` is whatever Marcus typed:
 *  "Paladin", "paladin", "Paladin (Oath of the Hearth)", "Homebrew Fighter" all
 *  have to land on the right row, and none of them is an exact key.
 *
 *  KNOWN WRONG FOR MULTICLASSING, and recorded as least-confident decision 2 in
 *  the Gate 3 doc rather than papered over. "Fighter 5 / Rogue 2" answers
 *  "fighter" and is told it has two attacks, which is right for the fighter
 *  levels and wrong for the character. Multiclassing is not modelled anywhere
 *  in this app — there is one `class` string and one `level` number — so this
 *  is a wrong answer to a question the data cannot ask correctly, not a bug
 *  this file can fix. */
function classKey(character: Character): string | null {
  const words = new Set(normalise(character?.class).split(' '))
  for (const key of Object.keys(EXTRA_ATTACK_AT)) if (words.has(key)) return key
  return null
}

/** Does the sheet itself say this character has Extra Attack?
 *
 *  THE OPEN-WORLD ARM, and the only way a Valour Bard, a Bladelock or anything
 *  Marcus invented can ever get a second swing: those grants are not functions
 *  of class and level, so the table above is structurally unable to know about
 *  them. What it CAN do is believe the sheet.
 *
 *  Gated on the declared level, when the sheet declares one. A feature listed
 *  at level 5 on a level 3 character has not been gained yet — the sheet is
 *  saying WHEN, and taking it as WHETHER would manufacture a swing out of the
 *  character builder's own forward planning. A feature with no level is taken
 *  at its word, because that is a sheet asserting possession and nothing else. */
function sheetGrantsExtraAttack(character: Character): boolean {
  const level = typeof character?.level === 'number' ? character.level : 0
  const features: ClassFeature[] = Array.isArray(character?.features) ? character.features : []
  return features.some(f => {
    if (normalise(f?.name) !== EXTRA_ATTACK) return false
    return typeof f?.level === 'number' ? f.level <= level : true
  })
}

/** How many attacks ONE Attack action contains for this character.
 *
 *  Always >= 1. Unknown class, unknown level, missing data — all answer 1,
 *  because the failure that matters is claiming a swing he does not have.
 *
 *  THE TWO SOURCES COMBINE BY MAX, and that is the whole of the arbitration.
 *  The class table can only ever be too small — it does not know about
 *  subclasses, invocations or homebrew — and the sheet's own declaration can
 *  only ever be too coarse, since a feature line says "you have Extra Attack"
 *  and never "you have three of them". Taking the larger lets each source fix
 *  the other's blind spot, and makes it impossible for one of them to TAKE
 *  AWAY a swing the other correctly granted. A level 11 Fighter who also has
 *  the feature written down still gets three, not two. */
export function attacksPerAction(character: Character): number {
  const level = typeof character?.level === 'number' && Number.isFinite(character.level)
    ? character.level
    : 0

  const key = classKey(character)
  const tiers = key ? EXTRA_ATTACK_AT[key]! : []
  // Each tier reached is one MORE attack on top of the base one.
  const fromClass = 1 + tiers.filter(at => level >= at).length

  return Math.max(fromClass, sheetGrantsExtraAttack(character) ? 2 : 1)
}

/** The least an option has to be for the question below to have an answer.
 *
 *  Slice R5 widened the parameter from `TurnOption` to this. The reducer asks
 *  the same question the composer does, but it holds a `TakenOption` — the
 *  flattened thing that rides into the log — and the composer asks BEFORE the
 *  `TurnOption` has been built. Rather than let each of them re-implement
 *  "what is a weapon attack" against the shape it happens to have, the
 *  predicate takes the two fields it actually reads. A whole `TurnOption` is
 *  still assignable, so nothing that called this before had to move. */
export interface AttackShape {
  readonly kind?: TurnOption['kind']
  readonly cost?: { readonly slot?: TurnOption['cost']['slot'] }
}

/** Is this option a weapon attack — the thing Extra Attack multiplies?
 *
 *  TWO CONDITIONS, AND THE SECOND ONE IS THE RULE. `kind === 'attack'` is not
 *  enough, because the Opportunity Attack the composer synthesises is also
 *  `kind: 'attack'` — it is built from the same weapon option with a different
 *  price (`compose.ts:626`). Extra Attack applies only when you take the ATTACK
 *  ACTION, and `mechanics-reference.ts` says so in the app's own words: "It
 *  does not apply to opportunity attacks, bonus action attacks, or reaction
 *  attacks unless a feature specifically says so."
 *
 *  So the slot is what decides. Without it, spending a reaction on an
 *  opportunity attack would start a two-swing Attack action Marcus never took,
 *  and hold his Action open on someone else's turn.
 *
 *  Reads `kind` and `cost.slot` and nothing else — in particular not `name`,
 *  not `source` and not `synthetic`. A rule that pattern-matched the string
 *  "Opportunity Attack" would be defeated by the first homebrew reaction called
 *  something else. */
/* The `| TurnOption` arm is not redundant, though it reads that way: a
   `TurnOption` is already assignable to `AttackShape`. It is there for
   TypeScript's excess-property check, which fires only on FRESH OBJECT
   LITERALS — `isWeaponAttack({ ...someOption, name: 'Tidal Rebuke' })` is
   exactly the call a test makes to prove this function ignores the name, and
   against the narrow shape alone that call becomes a compile error. Naming
   both arms lets a caller hand over either a whole option or the two fields
   this reads, and keeps the widening invisible to everything that came
   before it. */
export function isWeaponAttack(option: AttackShape | TurnOption | null | undefined): boolean {
  return option?.kind === 'attack' && option?.cost?.slot === 'action'
}
