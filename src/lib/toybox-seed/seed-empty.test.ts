/* ============================================================================
   THE PACK THAT DELIVERS NOTHING — slice 9.

   `seed.ts` ends with a guard that no test could reach:

     if (combos.length === 0 && tactics.length === 0 && personaPlays.length === 0)
       return { data, changed: false, packId: pack.id }

   ROUND TWO MOVED THAT GUARD BUT NOT ITS ARGUMENT. The seeder now walks a list
   of packs, so the `return` became a `continue` and `packId` became `packIds` —
   see the header of `seed.ts`. The guard still decides the same thing, and it
   now decides it once per pack, which makes it MORE load-bearing rather than
   less: an undeliverable pack must not abort the packs queued behind it. The
   last test in this file is the one that pins that, and it is the only test
   here that could not have been written in round one.

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
   test: the real `findPacks`, the real `buildProfile`, the real three resolvers
   and the real guard all run. Only the CONTENT is substituted — which is the
   one input a pack registry is supposed to vary.

   BOTH PACKS ARE MOCKED, AND SLICE 2 IS WHY. Slice 1 left `hearth-7-r2` real,
   because its one entry needed Sentinel and a reach weapon and the `NIX`
   fixture has neither — so it delivered nothing to `ALONE` on its own merits
   and the file's premise held for free. Slice 2 shipped three entries with no
   `needs` at all, `ALONE` earned them, and five tests in this file went red
   while `seed.ts` was still perfectly correct.

   That is the tell. This file is about the GUARD, and a test about the guard
   must not be able to fail because somebody wrote a good combo. Mocking the
   second pack too moves the "delivers nothing" condition out of the content and
   into the fixture, where this file can state it and keep it. The mocked
   `hearth-7-r2` below carries exactly one entry, gated on Sentinel and Reach,
   which is the SHAPE slice 1's real entry had — so the last test still proves
   what it was written to prove, and now goes on proving it through every
   content slice that follows.

   This file is separate from `seed.test.ts` deliberately: `vi.mock` is
   per-file, and mocking the pack away for the other twenty-one tests would
   silently turn them into tests of this fixture instead of tests of the pack.
   ========================================================================== */

import { describe, expect, it, vi } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character, CharacterFeat } from '../character'
import type { ToyboxData } from '../toybox'
import type { SeedPack } from './types'
import { findPacks, seedToybox } from './index'

/* Gated identically to the real pack, so `findPacks` matches exactly as it does
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

/* The second pack, reduced to the one property this file needs from it: a
   single entry that a bare `NIX` cannot earn. `needs` is checked against the
   sheet rather than against a token, so unlike the pack above this one drops
   its entry for a reason that has nothing to do with the party — which is the
   honest way to have two packs deliver nothing for two different reasons. */
vi.mock('./packs/hearth-7-r2', () => {
  const GATED_PACK: SeedPack = {
    id: 'hearth-7-r2',
    label: 'Load the round two plays',
    gate: { class: 'Paladin', subclass: 'Oath of the Hearth', minLevel: 5, maxLevel: 8 },
    combos: [{
      id: 'seed:hearth-7-r2:the-sentinel-gate',
      name: 'The Sentinel Gate',
      description: 'Nothing gets past you.',
      needs: { feats: ['Sentinel'], weaponProperties: ['Reach'] },
      blocks: [{
        id: 'seed:hearth-7-r2:the-sentinel-gate:1',
        type: 'reaction',
        label: 'Opportunity Attack with {{weapon}}',
        source: 'feature',
        sourceName: 'Sentinel',
      }],
      tags: ['control'],
      requirements: ['Sentinel', 'a reach weapon'],
      category: 'defensive',
    }],
    tactics: [],
    personaPlays: [],
  }
  return { HEARTH_7_R2: GATED_PACK }
})

/* `vi.mock` is hoisted above these imports by the transform, so `./index` —
   which reaches `./packs/hearth-7` through `seed.ts` — sees the fixture rather
   than the real pack. Static imports are correct here; a dynamic `await import`
   would work too and would only obscure that. */

const AT = 1_700_000_000_000

/** Level 7, and nobody in the party — the `NIX` fixture already has no
 *  `backstory.relationships`, which is what makes `{{wizard}}` unresolvable.
 *  It also has no feats and a five-foot weapon, which is what makes the gated
 *  second pack drop its one entry. Both of those are properties of the shared
 *  fixture, so if a later author gives `NIX` a party or the Sentinel feat, this
 *  whole file goes red rather than quietly passing for the wrong reason. */
const ALONE: Character = { ...NIX, level: 7 }

const EMPTY: ToyboxData = { combos: [], tactics: [], personaPlays: [], seededPacks: [] }

describe('a pack that delivers nothing is not a delivery', () => {
  it('still matches the packs — the gate is about the character, not the content', () => {
    expect(
      findPacks(ALONE).map(p => p.id),
      'both gates matched, so the guard is what runs next — twice',
    ).toEqual(['hearth-7', 'hearth-7-r2'])
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

  it('still names the packs it matched, which is what the empty state needs', () => {
    /* `packIds` is deliberately NOT empty here. The tab has to tell "there is
       content for you and none of it could be written" apart from "there is no
       content for a character like you" — the first is worth a button, the
       second is worth a sentence. Round two only made that distinction matter
       more: the answer is now a list, and a list of two packs that both wrote
       nothing is still not the same as no pack at all. */
    expect(seedToybox(EMPTY, ALONE, AT).packIds).toEqual(['hearth-7', 'hearth-7-r2'])
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

/* ---------------------------------------------------------------------------
   THE TEST ROUND ONE COULD NOT HAVE WRITTEN.

   With one pack, "the guard returns" and "the guard continues" are the same
   observable behaviour, so nothing distinguished them. With two, they are
   opposites: a `return` on the empty first pack would swallow the second, and
   Marcus's Toybox would be empty with both markers absent and no button
   offered to fix it — the exact failure this whole file exists to prevent,
   arriving by a new road.

   The character below has Sentinel and a reach weapon but still has nobody in
   the party. So the first pack writes nothing (every entry names a wizard) and
   the second writes its one entry. If the guard is ever changed back to a
   `return`, this is the test that goes red.
   ------------------------------------------------------------------------- */

const SENTINEL: CharacterFeat = {
  name: 'Sentinel', description: '', isHomebrew: false, effects: [],
}

/** `ALONE`, but able to earn round two's one entry. */
const ARMED_ALONE: Character = {
  ...ALONE,
  feats: [SENTINEL],
  weapons: NIX.weapons.map(w =>
    w.attackType === 'melee'
      ? { ...w, properties: [...(w.properties ?? []), 'Reach', 'Two-Handed'] }
      : w),
}

describe('a pack that delivers nothing does not silence the packs behind it', () => {
  it('delivers the second pack even though the first wrote nothing', () => {
    const result = seedToybox(EMPTY, ARMED_ALONE, AT)

    expect(result.changed, 'the second pack wrote, so there is something to store').toBe(true)
    expect(result.data.combos.map(c => c.id)).toEqual([
      'seed:hearth-7-r2:the-sentinel-gate',
    ])
  })

  it('marks only the pack that actually delivered', () => {
    /* The empty one stays unmarked so it can still be delivered the day its
       content stops depending on a party member Marcus does not have. */
    expect(seedToybox(EMPTY, ARMED_ALONE, AT).data.seededPacks)
      .toEqual(['hearth-7-r2'])
  })
})
