/* ============================================================================
   TOYBOX SEED — the seeder, through slice 3.

   Everything here fails against the pre-change tree for the simplest possible
   reason: `seedToybox` did not exist, and an empty Toybox stayed empty forever.
   The tests that matter later are the ones that pin behaviour the finished
   feature must keep — that a non-matching character gets NOTHING, and that the
   seeder does not mutate what it is handed.

   SLICE 3 KEPT ITS APPOINTMENT. Slice 1 shipped with a test called `resurrects`
   which asserted the bug the temporary emptiness rule allowed: delete every
   seeded entry and the next mount put them back. Its own comment said it must
   be REPLACED by its opposite rather than deleted when the marker landed. It
   has been — see "does not resurrect a deleted entry", below, which asserts
   the exact inverse of what `resurrects` asserted, against the same setup.

   One other test changed meaning with it. "Leaves a Toybox that already has
   content alone" was only ever true because content implied seeded; under the
   marker, a Toybox full of Marcus's own combos and no marker is an UNSEEDED
   one, and it gets the pack — appended after his, never in front of it.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import type { ToyboxCombo, ToyboxData } from '../toybox'
import { findPack, packPresent, seedToybox } from './index'

/** Marcus's actual sheet, as far as the gate is concerned. The shared `NIX`
 *  fixture is a level 8 with CHA 18 and says in its own header why it must not
 *  be changed to 7 — so the level-7 case is made here instead of there. */
const NIX_7: Character = { ...NIX, level: 7 }

const EMPTY: ToyboxData = { combos: [], tactics: [], personaPlays: [], seededPacks: [] }

const AT = 1_700_000_000_000

/** One of Marcus's own, for the tests about not trampling him. */
const MINE: ToyboxCombo = {
  id: 'mine', name: 'Something I wrote', blocks: [], tags: [], favorite: true, createdAt: 1,
}

describe('finding a pack', () => {
  it('matches a Paladin of the Hearth inside the level window', () => {
    expect(findPack(NIX_7)?.id).toBe('hearth-7')
    expect(findPack(NIX)?.id, 'level 8 is the ceiling, and ceilings are inclusive').toBe('hearth-7')
    expect(findPack({ ...NIX, level: 5 })?.id, 'and 5 is the floor').toBe('hearth-7')
  })

  it('matches nobody else, and says so with null rather than a fallback', () => {
    expect(findPack({ ...NIX, class: 'Wizard' }), 'not a paladin').toBeNull()
    expect(findPack({ ...NIX, subclass: 'Oath of Devotion' }), 'wrong oath — no cloak').toBeNull()
    expect(findPack({ ...NIX, level: 4 }), 'below the floor').toBeNull()
    expect(findPack({ ...NIX, level: 9 }), 'above the ceiling').toBeNull()
  })
})

describe('seeding', () => {
  it('puts the pack into an empty Toybox — all of it', () => {
    /* SLICE 5 REWROTE THE THREE COUNTS HERE. They used to read `toHaveLength(1)`,
       which was a claim about the pack rather than about the seeder and went red
       the moment content was written. The claim that was always meant is
       "nothing was dropped and nothing was duplicated", so it is now asked of
       the pack itself — and it stays true through slices 6 to 8. */
    const pack = findPack(NIX_7)!
    const result = seedToybox(EMPTY, NIX_7, AT)
    expect(result.changed).toBe(true)
    expect(result.packId).toBe('hearth-7')
    expect(result.data.combos).toHaveLength(pack.combos.length)
    expect(result.data.tactics).toHaveLength(pack.tactics.length)
    expect(result.data.personaPlays).toHaveLength(pack.personaPlays.length)
    expect(result.data.combos[0].name).toBe('Hearth Wall')
  })

  it('stamps the entries with the time it was given, and favourites nothing', () => {
    /* Both are facts about the user rather than about the play, which is why a
       pack cannot express them. If `createdAt` were read from a clock inside
       the seeder this assertion could not be written at all. */
    const combo = seedToybox(EMPTY, NIX_7, AT).data.combos[0]
    expect(combo.createdAt).toBe(AT)
    expect(combo.favorite).toBe(false)
  })

  it('gives a character with no pack exactly nothing, and no write', () => {
    /* SLICE 9 WIDENED THIS FROM ONE SHAPE TO THREE. It asked only about the
       Wizard, which proves the class gate reaches this branch and says nothing
       about the level gate — and the level gate is the one that moves, because
       Nix crosses the ceiling at 9 by playing the game. The `findPack` tests
       above pin the gate itself; these pin that `seedToybox` HONOURS it rather
       than seeding anyway and letting the resolvers sort it out. Three shapes,
       one branch, and the day someone makes the level check lenient the failure
       lands here instead of in a Toybox full of plays Nix cannot run. */
    for (const [why, who] of [
      ['not a paladin', { ...NIX, class: 'Wizard' }],
      ['below the floor', { ...NIX, level: 3 }],
      ['above the ceiling', { ...NIX, level: 9 }],
    ] as const) {
      const result = seedToybox(EMPTY, who, AT)
      expect(result.changed, `${why}: false is what stops the caller touching storage`).toBe(false)
      expect(result.packId, `${why}: a pack id here would offer him a force button`).toBeNull()
      expect(result.data, `${why}: and the same object, not a copy`).toBe(EMPTY)
    }
  })

  it('appends behind what the user wrote, and never in front of it', () => {
    /* Under slice 1 this Toybox was skipped, because "has content" was the
       proxy for "already seeded". It is not the same fact: this one has never
       been seeded, so it gets the pack — and Marcus's own combo keeps the top
       of the list, which is the only position anyone actually looks at. */
    const mine: ToyboxData = { ...EMPTY, combos: [MINE] }
    const result = seedToybox(mine, NIX_7, AT)
    expect(result.changed).toBe(true)
    expect(result.data.combos[0].id, 'his combo lost the top of the list').toBe('mine')
    expect(result.data.combos.slice(1).map(c => c.id.startsWith('seed:hearth-7:')))
      .not.toContain(false)
    expect(result.data.combos).toHaveLength(1 + findPack(NIX_7)!.combos.length)
  })

  it('does not mutate what it is handed', () => {
    /* The panel holds `data` in React state and hands the same object to the
       seeder. A seeder that pushed into `data.combos` would mutate state in
       place, and React would not re-render — the entries would be in storage
       and absent from the screen until a reload. */
    const before = structuredClone(EMPTY)
    seedToybox(EMPTY, NIX_7, AT)
    expect(EMPTY).toEqual(before)
  })

  it('is a function of its arguments and nothing else', () => {
    expect(seedToybox(EMPTY, NIX_7, AT)).toEqual(seedToybox(EMPTY, NIX_7, AT))
  })

  it('ids are namespaced, so they can never collide with a hand-written entry', () => {
    /* The forms mint ids with `crypto.randomUUID()`. A seeded id containing a
       colon cannot be produced that way, which is what makes "is this one
       ours?" answerable later without a flag on the type. */
    for (const combo of seedToybox(EMPTY, NIX_7, AT).data.combos) {
      expect(combo.id).toMatch(/^seed:hearth-7:/)
      for (const block of combo.blocks) expect(block.id).toMatch(/^seed:hearth-7:/)
    }
  })
})

describe('once, and once only', () => {
  it('records the pack it applied', () => {
    expect(seedToybox(EMPTY, NIX_7, AT).data.seededPacks).toEqual(['hearth-7'])
  })

  it('does not seed twice — feeding the result back in changes nothing', () => {
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT)
    expect(twice.changed).toBe(false)
    expect(twice.data, 'the same object, so the caller cannot even be tempted to write').toBe(once)
    expect(twice.packId, 'it still says WHICH pack matched — the button needs that').toBe('hearth-7')
  })

  it('does not resurrect a deleted entry', () => {
    /* THE INVERSE OF SLICE 1's `resurrects`, against the same setup — seed,
       delete everything, seed again. That test asserted `changed` was true and
       said in its own comment that this one had to replace it. Deleting is now
       a thing that stays done. */
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const emptiedAgain: ToyboxData = { ...seeded, combos: [], tactics: [], personaPlays: [] }
    const again = seedToybox(emptiedAgain, NIX_7, AT)
    expect(again.changed).toBe(false)
    expect(again.data.combos).toEqual([])
  })

  it('treats a Toybox saved before the marker existed as never seeded', () => {
    /* Every Toybox in Marcus's browser today is this shape — no `seededPacks`
       key at all, because the field did not exist when it was written. Absent
       must read as "not yet", or the feature never reaches the one person it
       was built for. */
    const legacy = { combos: [], tactics: [], personaPlays: [] } as ToyboxData
    expect(legacy.seededPacks).toBeUndefined()
    expect(seedToybox(legacy, NIX_7, AT).changed).toBe(true)
  })

  it('delivers what it can speak and records only that', () => {
    /* THIS TEST CHANGED MEANING IN SLICE 5, AND THE CHANGE IS A LOSS WORTH
       WRITING DOWN. It used to assert the empty-delivery guard at `seed.ts:168`:
       a Paladin with no melee weapon dropped EVERY entry in a one-combo pack,
       so `changed` was false and no marker was written — which matters, because
       a marker recorded for a delivery that never happened locks him out of the
       content permanently and invisibly.
       With the real content written, no character can empty the pack any more:
       most entries name a weapon and some do not, so a weaponless paladin gets
       a partial delivery and the marker is correctly written. The guard is now
       unreachable through any sheet, and therefore untested — flagged in
       `00-status.md` for slice 9 to either cover or remove.
       What is asserted instead is the partial delivery itself, which is a real
       claim and a falsifiable one: exactly the weapon-named entries go.

       SLICE 6 SHARPENED IT AGAIN. At three combos the weaponless delivery was
       empty and `toEqual([])` said everything; at fourteen it is genuinely
       partial, so the survivors are NAMED. A bare `toHaveLength(5)` would stay
       green if one card started naming a weapon while another stopped — which
       is precisely the edit this test exists to catch. */
    const unarmed: Character = { ...NIX_7, weapons: NIX.weapons.filter(w => w.attackType === 'ranged') }
    const result = seedToybox(EMPTY, unarmed, AT)
    const pack = findPack(NIX_7)!

    expect(result.changed, 'something WAS delivered').toBe(true)
    expect(result.packId).toBe('hearth-7')
    expect(result.data.combos.map(c => c.id), 'the combos that never name a weapon')
      .toEqual([
        'seed:hearth-7:the-cone-at-the-door',
        'seed:hearth-7:nothing-in-reach',
        'seed:hearth-7:bless-before-the-door',
        'seed:hearth-7:damage-relocation',
        'seed:hearth-7:before-the-door-opens',
      ])
    /* THE BLOCK/ANNOTATION DISTINCTION, ASSERTED WHERE IT ACTUALLY BITES.
       "Before the Door Opens" survives even though it says `{{weapon}}` —
       because it says it in an ANNOTATION, and a failed annotation drops only
       itself. Every field of a BLOCK is load-bearing and would have taken the
       whole card with it. That asymmetry is the rule the entire content file is
       built on, and this is the one place a test can watch it happen. */
    const doorway = result.data.combos.find(c => c.id === 'seed:hearth-7:before-the-door-opens')!
    expect(doorway.annotations?.some(a => /Check what/.test(a.text)),
      'the weapon annotation should have been dropped on its own').toBeFalsy()
    /* One left, not two: `NIX_7` is the turn-economy fixture and has no
       `backstory.relationships` at all, so the party note goes with the weapon
       note. The positioning note names neither and stands. */
    expect(doorway.annotations, 'the note that names nothing survives').toHaveLength(1)
    /* SLICE 7 MADE THIS LINE TRUE OF THE TACTICS TOO. Until slice 7 no tactic
       named a weapon and the honest assertion was "none go". Three of the nine
       new ones are ABOUT the weapon — the ten feet it threatens, the damage
       type it covers when fire fails, and the mastery printed on it — so three
       drop, and rewriting them to survive a bow would mean writing them
       without saying what they are about. The nine that stay are named for the
       same reason the combos are: `toHaveLength(9)` stays green if one card
       starts naming a weapon while another stops. */
    expect(result.data.tactics.map(t => t.id), 'the tactics that never name a weapon')
      .toEqual([
        'seed:hearth-7:the-reaction-is-only-one',
        'seed:hearth-7:stand-where-the-aura-pays',
        'seed:hearth-7:preparing-for-tomorrow',
        'seed:hearth-7:concentration-is-the-career-choice',
        'seed:hearth-7:the-death-protocol',
        'seed:hearth-7:spend-the-luck-you-are-hoarding-it',
        'seed:hearth-7:ride-the-aura',
        'seed:hearth-7:the-spells-that-are-not-turns',
        'seed:hearth-7:buy-these-before-the-next-fight',
      ])
    expect(result.data.personaPlays).toHaveLength(pack.personaPlays.length)
    expect(result.data.seededPacks, 'a real delivery is recorded').toEqual(['hearth-7'])
  })
})

describe('forcing it, which is the way back from a deletion', () => {
  it('seeds straight through the marker', () => {
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const emptied: ToyboxData = { ...seeded, combos: [] }
    const forced = seedToybox(emptied, NIX_7, AT, { force: true })
    expect(forced.changed).toBe(true)
    /* Their ORIGINAL ids, un-suffixed — nothing collided, because the combos
       were the thing deleted. The `~2` path is the next test's business. */
    expect(forced.data.combos.map(c => c.id)).toEqual(seeded.combos.map(c => c.id))
  })

  it('does not write the marker a second time', () => {
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const forced = seedToybox({ ...seeded, combos: [] }, NIX_7, AT, { force: true })
    expect(forced.data.seededPacks).toEqual(['hearth-7'])
  })

  it('gives the copies ids that cannot collide with the originals', () => {
    /* The UI does not offer the button while the originals are present, so
       this path is a safety net. It is tested because a net nobody tests is a
       decoration: two entries sharing an id means editing one edits both, and
       two blocks sharing a key means React paints one card's steps inside the
       other's. */
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT, { force: true }).data
    const thrice = seedToybox(twice, NIX_7, AT, { force: true }).data

    const ids = thrice.combos.map(c => c.id)
    expect(ids).toHaveLength(findPack(NIX_7)!.combos.length * 3)
    expect(new Set(ids).size, ids.join(' · ')).toBe(ids.length)

    const blockIds = thrice.combos.flatMap(c => c.blocks.map(b => b.id))
    expect(new Set(blockIds).size, 'block keys too, not just the card').toBe(blockIds.length)
    for (const id of blockIds) expect(id).toMatch(/^seed:hearth-7:/)
  })

  it('leaves the originals exactly as they were', () => {
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT, { force: true }).data
    expect(twice.combos[0]).toEqual(once.combos[0])
  })
})

describe('is any of it still here?', () => {
  it('sees the pack while an entry survives, and stops seeing it when none do', () => {
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    expect(packPresent(seeded, 'hearth-7')).toBe(true)
    /* All three lists, not just the combos — `packPresent` reads tactics and
       persona plays too, and while the pack held one combo and nothing else,
       emptying `combos` alone happened to empty the pack. It no longer does,
       and the button must not offer to reload plays that are still on screen. */
    expect(packPresent({ ...seeded, combos: [] }, 'hearth-7'), 'tactics survive').toBe(true)
    expect(
      packPresent({ ...seeded, combos: [], tactics: [], personaPlays: [] }, 'hearth-7'),
    ).toBe(false)
  })

  it('counts an entry Marcus rewrote as still present', () => {
    /* He edited it; he did not lose it. Offering to "load the starter plays"
       over the top of his edit would be the app second-guessing him. */
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const edited: ToyboxData = {
      ...seeded,
      combos: seeded.combos.map(c => ({ ...c, name: 'My version of the wall' })),
    }
    expect(packPresent(edited, 'hearth-7')).toBe(true)
  })

  it('does not mistake a hand-written combo for a seeded one', () => {
    expect(packPresent({ ...EMPTY, combos: [MINE] }, 'hearth-7')).toBe(false)
  })
})
