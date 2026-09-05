import type { ToyboxCombo, ToyboxTactic, ToyboxPersonaPlay } from '../toybox'

/* ==========================================================================
   TOYBOX SEED — the shapes

   A "pack" is authored content that belongs to a kind of character rather
   than to a person: a Paladin of the Hearth between levels 5 and 8. It is
   copied into a character's Toybox once, and from that moment the copy is
   his — editable, deletable, and with no live link back to here.

   THE TEMPLATE TYPES ARE THE STORED TYPES MINUS TWO FIELDS. `favorite` and
   `createdAt` are facts about the user, not about the play, so a pack cannot
   express them and cannot get them wrong. Everything else — including the
   tags and categories the tabs filter by — is authored, which is why these
   are `Omit<>`s of the real interfaces rather than parallel definitions that
   would drift out of step with them.

   ONE SCOPED EXCEPTION, AND IT IS NAMED HERE SO IT CANNOT BE MISTAKEN FOR A
   DRIFT. Round one's persona plays name nobody: no Selis, no Fate, no Scar,
   no Hidden Kingdom. That was correct for a pack authored for a KIND of
   character — every proper noun in a play is a person the next Paladin of
   the Hearth has never met, and a play he cannot use is worse than no play.
   `pack-hearth-7.test.ts` still enforces it, under `names nobody from his
   backstory`, and that test is not being relaxed.

   On 2026-09-04 Marcus was asked whether round two could use his backstory
   and answered "Use all of it". So `hearth-7-r2` — AND NO OTHER PACK — may
   name the people on his sheet. The exception buys something specific: a
   persona play that says "ask Scar" changes what he does at a table, where
   "ask a trusted companion" is a greeting card. The cost is that this pack
   is his and cannot be handed to another player, which is a cost round two
   was authorised to pay and round one was not.

   The exception is enforced in the direction that can actually rot. A rule
   that merely PERMITS the names is invisible to a future author, who will
   read round one's test, assume it is the house style, and quietly write
   round two back into anonymity. So `pack-hearth-7-r2.test.ts` asserts under
   `the backstory is named on purpose` that the names are PRESENT — Selis,
   Fate, Scar, Rysanna, Khaonn, the Hidden Kingdom — and that every play in
   the pack names at least one of them. Deleting the licence now costs a red
   test, which is the only kind of documentation that survives.
   ========================================================================== */

/** What the character must HAVE, as opposed to what the text must be able to SAY.
 *
 *  ROUND ONE HAD ONE WAY FOR AN ENTRY TO BE WRONG and one answer to it: the
 *  text could not be written — no melee weapon to name, no wizard to call out
 *  to — so the entry was dropped. Round two has entries that write perfectly
 *  and are still wrong. "The Sentinel Gate" is a lie for a paladin without
 *  Sentinel, and it is a lie that reads as true.
 *
 *  Worse for the weapon case: `{{weaponReach}}` resolves to 5 for a
 *  short sword rather than failing, so a glaive combo would paint "Reach 5 ft"
 *  and look like an odd card instead of an absent one. Nothing in the token
 *  vocabulary can catch that, because nothing is unresolvable about it.
 *
 *  Unmet needs drop the entry by the same code path and with the same
 *  consequences as an unresolvable token. This is not a new mechanism; it is
 *  the existing one told a second kind of fact.
 *
 *  PERMANENT FACTS ONLY — never inventory, never prepared spells. Four of round
 *  two's combos want a flask of oil or a bag of ball bearings and his supplies
 *  are empty; gating on that would hide exactly the cards whose job is to tell
 *  him to buy one, and a card that stays hidden until he owns the thing can
 *  never be the reason he buys it. Consumables belong in `requirements`, which
 *  is text he reads, not a condition the machine enforces. */
export interface SeedNeeds {
  /** Feat names. Matched case-insensitively; see `SeedProfile.feats`. */
  feats?: string[]
  /** Properties the primary melee weapon must carry — 'Reach', 'Two-Handed'.
   *  Empty for a character with no melee weapon, so such an entry drops for
   *  free without a null check at the call site. */
  weaponProperties?: string[]
}

/* `needs` is AUTHORING-TIME ONLY and never reaches the stored entry — see the
   strip in `template.ts`. A resolved combo is written to localStorage and lives
   there as long as the character does; letting the field ride would mean every
   future reader of a stored play has to know what `needs` was and why it is
   stale. The play describes the play. Nothing about the machinery that chose
   it belongs in it. */
export type SeedCombo = Omit<ToyboxCombo, 'favorite' | 'createdAt'> & { needs?: SeedNeeds }
export type SeedTactic = Omit<ToyboxTactic, 'favorite' | 'createdAt'> & { needs?: SeedNeeds }
export type SeedPersonaPlay = Omit<ToyboxPersonaPlay, 'favorite' | 'createdAt'> & {
  needs?: SeedNeeds
}

/** Who a pack is for.
 *
 *  All four bounds are required and there is deliberately no wildcard. A pack
 *  that could match "any Paladin" would be the generic content Gate 1 rules
 *  out by name; a pack with no level ceiling would keep offering level-7 advice
 *  to a level-15 character. Not matching is a valid and useful outcome. */
export interface SeedGate {
  class: string
  subclass: string
  minLevel: number
  maxLevel: number
}

export interface SeedPack {
  /** Stable, short, and recorded in `ToyboxData.seededPacks` once applied.
   *  Never change one — a changed id re-seeds every character that had it. */
  id: string
  /** Shown on the empty-state button that loads the pack by hand. */
  label: string
  gate: SeedGate
  combos: SeedCombo[]
  tactics: SeedTactic[]
  personaPlays: SeedPersonaPlay[]
}
