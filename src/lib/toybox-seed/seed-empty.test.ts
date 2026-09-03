/* ============================================================================
   THE PACK THAT DELIVERS NOTHING — slice 9.

   `seed.ts` ends with a guard that no test could reach:

     if (combos.length === 0 && tactics.length === 0 && personaPlays.length === 0)
       return { data, changed: false, packId: pack.id }

   Its comment is the whole argument for it — reporting `changed: true` there
   would write an unchanged Toybox to storage AND record a marker saying content
   had been delivered that never was, after which the marker would keep the real
   delivery from ever happening. A wrong `true` is not a cosmetic bug; it is a
   permanent, silent empty tab.

   IT WAS UNREACHABLE FOR A GOOD REASON, WHICH IS WHY IT LIVED THIS LONG
   UNTESTED. `hearth-7` always delivers something: three of its twelve tactics
   name a weapon and drop for an archer, its party call-outs drop for a
   character with nobody, but "The Reaction Is Only One" spends no token at all
   and survives every sheet. There is no character who gets nothing. Slice 5
   recorded the gap and slice 9 was told to cover it or remove it.

   COVERED, NOT REMOVED, and the choice matters. The condition the guard defends
   against is not "impossible" — it is "impossible with the ONE pack that exists
   today". The second pack, written for some other subclass, may be all
   party-facing content, and the day it is, this guard is the only thing between
   Marcus and a tab that records itself as delivered while empty. A guard whose
   correctness depends on the current contents of a registry is exactly the kind
   that should be pinned before the registry changes.

   HOW IT IS REACHED, AND WHY THAT IS HONEST. `vi.mock` replaces the pack module
   with a pack whose every entry names `{{wizard}}`, then seeds a character with
   no wizard. Nothing in `seed.ts` is stubbed, softened or re-exported for the
   test: the real `findPack`, the real `buildProfile`, the real three resolvers
   and the real guard all run. Only the CONTENT is substituted — which is the
   one input a pack registry is supposed to vary.

   This file is separate from `seed.test.ts` deliberately: `vi.mock` is
   per-file, and mocking the pack away for the other twenty-one tests would
   silently turn them into tests of this fixture instead of tests of the pack.
   ========================================================================== */

import { describe, expect, it, vi } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { ToyboxData } from '../toybox'
import type { SeedPack } from './types'
import { findPack, seedToybox } from './index'

/* Gated identically to the real pack, so `findPack` matches exactly as it does
   in production — the gate is not what is being varied here. Every entry names
   `{{wizard}}` in a LOAD-BEARING field: a block's label, a tactic's action, a
   play's key phrase. An unresolvable token in any of those drops the whole
   entry (see the header of `template.ts`), so a character with no wizard in
   `backstory.relationships` gets all three dropped and the pack delivers
   nothing at all. */
vi.mock('./packs/hearth-7', () => {
  const EMPTY_PACK: SeedPack = {
    id: 'hearth-7',
    label: 'Load the Hearth starter plays',
    gate: { class: 'Paladin', subclass: 'Oath of the Hearth', minLevel: 5, maxLevel: 8 },
    combos: [{
      id: 'seed:hearth-7:only-combo',
      name: 'Only Combo',
      description: 'Everything in this pack waits on somebody who is not here.',
      blocks: [{
        id: 'seed:hearth-7:only-combo:1',
        type: 'action',
        label: 'Wait for {{wizard}}',
        source: 'feature',
        sourceName: 'Held Action',
        notes: 'Nothing happens until they go.',
      }],
      tags: ['party'],
      requirements: ['a wizard'],
      category: 'utility',
    }],
    tactics: [{
      id: 'seed:hearth-7:only-tactic',
      name: 'Only Tactic',
      trigger: 'the party has a wizard',
      actions: ['Stand where {{wizard}} can see you.'],
      priority: 'normal',
      tags: ['party'],
      requirements: ['a wizard'],
      category: 'core',
    }],
    personaPlays: [{
      id: 'seed:hearth-7:only-play',
      name: 'Only Play',
      situation: 'somebody has to do the talking',
      approach: 'Let the clever one open.',
      keyPhrases: ['{{wizard}} will explain it better than I can.'],
      tags: ['social'],
    }],
  }
  return { HEARTH_7: EMPTY_PACK }
})

/* `vi.mock` is hoisted above these imports by the transform, so `./index` —
   which reaches `./packs/hearth-7` through `seed.ts` — sees the fixture rather
   than the real pack. Static imports are correct here; a dynamic `await import`
   would work too and would only obscure that. */

const AT = 1_700_000_000_000

/** Level 7, and nobody in the party — the `NIX` fixture already has no
 *  `backstory.relationships`, which is what makes `{{wizard}}` unresolvable. */
const ALONE = { ...NIX, level: 7 }

const EMPTY: ToyboxData = { combos: [], tactics: [], personaPlays: [], seededPacks: [] }

describe('a pack that delivers nothing is not a delivery', () => {
  it('still matches the pack — the gate is about the character, not the content', () => {
    expect(findPack(ALONE)?.id, 'the gate matched, so the guard is what runs next').toBe('hearth-7')
  })

  it('drops every entry, because every entry names somebody who is not there', () => {
    const result = seedToybox(EMPTY, ALONE, AT)
    expect(result.data.combos).toHaveLength(0)
    expect(result.data.tactics).toHaveLength(0)
    expect(result.data.personaPlays).toHaveLength(0)
  })

  it('reports no change, so the caller writes nothing to storage', () => {
    const result = seedToybox(EMPTY, ALONE, AT)
    expect(result.changed, 'a write here costs a storage round-trip for nothing').toBe(false)
    expect(result.data, 'and it must be the same object, not a copy').toBe(EMPTY)
  })

  it('records NO marker, so the real delivery can still happen later', () => {
    /* THE POINT OF THE WHOLE FILE. `seededPacks` is the one-way door: once
       'hearth-7' is in it, `seedToybox` returns early forever and the only way
       back is the force button, which is offered only when nothing from the
       pack survives — and nothing ever did. Marcus would have an empty tab that
       the app believed it had filled. */
    const result = seedToybox(EMPTY, ALONE, AT)
    expect(result.data.seededPacks, 'a marker here is a permanently empty tab').toEqual([])
  })

  it('still names the pack it matched, which is what the empty state needs', () => {
    /* `packId` is deliberately NOT null here. The tab has to tell "there is
       content for you and none of it could be written" apart from "there is no
       content for a character like you" — the first is worth a button, the
       second is worth a sentence. */
    expect(seedToybox(EMPTY, ALONE, AT).packId).toBe('hearth-7')
  })

  it('leaves whatever Marcus already wrote exactly where it was', () => {
    const mine: ToyboxData = {
      combos: [{ id: 'mine', name: 'Something I wrote', blocks: [], tags: [], favorite: true, createdAt: 1 }],
      tactics: [],
      personaPlays: [],
      seededPacks: [],
    }
    const result = seedToybox(mine, ALONE, AT)
    expect(result.data).toBe(mine)
    expect(result.changed).toBe(false)
  })
})
