/* ============================================================================
   READING THE PARTY OUT OF FREE TEXT — slice 2.

   These are the strings off Marcus's own export, verbatim, because the parse
   only has to work on real sentences and inventing tidier ones would prove
   nothing. The four party members are here, and so is Scar — who is not one,
   whose relation contains the word "party", and who is the reason this file
   exists as its own module with its own tests.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { resolveParty } from './party'

/** Verbatim from `codex-nix-lvl7 (2) (1).json` → `backstory.relationships`. */
const REAL = [
  { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet, inquisitive, knowledge-hungry. A calming presence.', status: 'alive' },
  { name: 'Ponzi', relation: "Party member (Rogue) — observant, reserved. Recognized Scar's voice as someone named 'Hopscotch'.", status: 'alive' },
  { name: 'Ketza', relation: 'Party member (Ranger) — young wood elf. Searching for her missing father in the Drinkswood.', status: 'alive' },
  { name: 'Talon', relation: "Party member (Bard) — rock gnome with cowboy aesthetic, tinker. Doug's character.", status: 'alive' },
  { name: 'Scar', relation: 'A goliath. Partner, moral compass. Only person besides the party who knows Nix is a changeling.', status: 'alive' },
]

const withRelations = (
  relationships: { name: string; relation: string; status: string }[],
): Character => ({
  ...NIX,
  backstory: {
    origin: '',
    keyMemories: [],
    relationships,
    unresolvedThreads: [],
    personalitySeeds: [],
  },
})

describe('the party, off the real sheet', () => {
  const party = resolveParty(withRelations(REAL))

  it('finds all four, by the role each one plays', () => {
    expect(party).toEqual({
      wizard: 'Rune Willow',
      rogue: 'Ponzi',
      ranger: 'Ketza',
      bard: 'Talon',
    })
  })

  it('does not put Scar in the line of battle', () => {
    /* THE TEST THIS MODULE EXISTS FOR. Scar's relation contains the word
       "party" — "the only person besides the party who knows Nix is a
       changeling" — so a rule that matched on that word alone would hand him
       a class he does not have and write him into combat advice. He names no
       class in parentheses, and his "party" comes after no parenthesis at all.
       He is not in the result at any role. */
    expect(Object.values(party)).not.toContain('Scar')
  })
})

describe('what it refuses', () => {
  it('a parenthesis that is not a class', () => {
    const party = resolveParty(withRelations([
      { name: 'Aunt Merrow', relation: 'Party member (Baker) — brought the pies.', status: 'alive' },
    ]))
    expect(party).toEqual({})
  })

  it('a class in parentheses with no party word before it', () => {
    /* An enemy caster is not a teammate, and "call it out to your wizard" is
       a catastrophic thing to say about one. */
    const party = resolveParty(withRelations([
      { name: 'Vaunt', relation: 'Rival (Wizard) who has hunted him since Aldmoor.', status: 'alive' },
    ]))
    expect(party).toEqual({})
  })

  it('a party word that arrives only AFTER the class', () => {
    const party = resolveParty(withRelations([
      { name: 'Someone', relation: '(Wizard) — later joined the party.', status: 'alive' },
    ]))
    expect(party).toEqual({})
  })

  it('an entry with no name', () => {
    const party = resolveParty(withRelations([
      { name: '   ', relation: 'Party member (Cleric)', status: 'alive' },
    ]))
    expect(party).toEqual({})
  })

  it('a character with no backstory at all', () => {
    expect(resolveParty({ ...NIX, backstory: undefined })).toEqual({})
  })
})

describe('when two people fill one role', () => {
  it('keeps the first and does not overwrite', () => {
    /* Not because the first is more important, but because overwriting makes
       the answer depend on the order of a list nobody thinks of as ordered. */
    const party = resolveParty(withRelations([
      { name: 'Talon', relation: 'Party member (Bard) — rock gnome.', status: 'alive' },
      { name: 'Second Bard', relation: 'Party member (Bard) — newer.', status: 'alive' },
    ]))
    expect(party.bard).toBe('Talon')
  })
})

describe('case', () => {
  it('reads a lowercase class and an uppercase PARTY the same way', () => {
    const party = resolveParty(withRelations([
      { name: 'Ketza', relation: 'PARTY member (ranger) — wood elf.', status: 'alive' },
    ]))
    expect(party.ranger).toBe('Ketza')
  })
})
