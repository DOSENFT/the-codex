import type { SeedPack } from '../types'
import { HEARTH_7_COMBOS } from './hearth-7.combos'
import { HEARTH_7_TACTICS } from './hearth-7.tactics'
import { HEARTH_7_PERSONA } from './hearth-7.persona'

/* ==========================================================================
   PACK: hearth-7 — Oath of the Hearth, levels 5 to 8

   THE META AND THE GATE LIVE HERE; THE CONTENT DOES NOT. Slice 5 split the
   entries into three sibling files, as Gate 3 planned. The reason is a review
   one: `hearth-7.combos.ts` is read for RULES ACCURACY by someone holding a
   Player's Handbook, and `seed.ts` is read for CORRECTNESS by someone holding
   the test file. A file that is both gets both reviews done badly.

   Every number and every name in those three files is a `{{token}}`, resolved
   against the character's own sheet at the moment of seeding — see
   `../template.ts` for the vocabulary and `../profile.ts` for the answers.
   Writing "10 temporary hit points" would be wrong the moment Nix reaches
   level 8, and wrong today for anyone else; `{{cloakTempHp}}` is right for
   both. Nothing in this pack may state a derived number literally, and
   `../pack-hearth-7.test.ts` enforces that by resolving the pack twice
   against two different sheets and requiring the answers to differ.

   WHY THE LEVEL WINDOW IS 5 TO 8. Five, because several combos in the finished
   pack spend Extra Attack and read as nonsense without it. Eight, because at
   nine the slot table grows a third tier and the Oath's own spell list changes,
   at which point this content is no longer true and should stop offering itself
   rather than lie quietly.
   ========================================================================== */

export const HEARTH_7: SeedPack = {
  id: 'hearth-7',
  label: 'Load the Hearth starter plays',
  gate: {
    class: 'Paladin',
    subclass: 'Oath of the Hearth',
    minLevel: 5,
    maxLevel: 8,
  },

  combos: HEARTH_7_COMBOS,
  tactics: HEARTH_7_TACTICS,
  personaPlays: HEARTH_7_PERSONA,
}
