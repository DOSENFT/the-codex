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
   ========================================================================== */

export type SeedCombo = Omit<ToyboxCombo, 'favorite' | 'createdAt'>
export type SeedTactic = Omit<ToyboxTactic, 'favorite' | 'createdAt'>
export type SeedPersonaPlay = Omit<ToyboxPersonaPlay, 'favorite' | 'createdAt'>

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
