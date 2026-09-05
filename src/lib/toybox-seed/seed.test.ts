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

   ROUND TWO, SLICE 1 — ONE PACK BECAME MANY. `findPack` is `findPacks`,
   `SeedResult.packId` is `packIds`, and `force` is a list of pack ids rather
   than a boolean. Every existing test below is the same CLAIM through a new
   signature; where a claim genuinely changed, the comment says so.

   THE FIXTURE IS WHY MOST OF THEM DID NOT MOVE — IN SLICE 1. `NIX_7` has no
   feats and carries Hearthbrand at five feet, so round two's only slice-1 entry
   needed Sentinel AND Reach and was dropped for it. Round two delivered nothing
   to this sheet, was therefore not marked, and every count here stayed put.

   ROUND TWO, SLICE 2 ENDED THAT, AND THE LITERALS MOVED. Three of slice 2's
   four combos — "Three People Stand Up", "The Free Crit" and "Through the Door"
   — are gated on nothing at all, because nothing about them is a lie for any
   paladin in the window. So `NIX_7` now earns three of round two's entries,
   `seededPacks` is `['hearth-7','hearth-7-r2']` for it, and the counts below
   are the NEW TRUE numbers. Not one of them was softened to a `>=`; a count
   that only says "something arrived" cannot see a double-delivery, which is the
   one failure this whole file was built to catch.

   AND TWO TESTS LEFT THIS FILE RATHER THAN LIE. "The pack that cannot reach
   this character is not marked" and "an undeliverable pack does not abort the
   packs behind it" both needed a real character who earns NOTHING from round
   two, and after slice 2 there is no such character inside the gate. Both
   claims still matter — a marker for a delivery that never happened is a
   permanently, silently empty tab — so both now live in `seed-empty.test.ts`,
   against a mocked pack, where the condition is a property of the fixture
   instead of an accident of the content. See that file's header.

   `NIX_R2` is the sheet round two was actually written for, and it exists here
   because nothing else in the repo has both halves of what the gate wants. It
   earns FOUR of round two's five: the fifth, "The Second Swing Is Not Wasted",
   needs the Graze mastery, which only Marcus's real weapon carries.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character, CharacterFeat } from '../character'
import type { ToyboxCombo, ToyboxData } from '../toybox'
import { findPacks, packPresent, seedToybox } from './index'

/** Marcus's actual sheet, as far as the gate is concerned. The shared `NIX`
 *  fixture is a level 8 with CHA 18 and says in its own header why it must not
 *  be changed to 7 — so the level-7 case is made here instead of there. */
const NIX_7: Character = { ...NIX, level: 7 }

const SENTINEL: CharacterFeat = {
  name: 'Sentinel', description: '', isHomebrew: false, effects: [],
}

/** The sheet round two is written for: Sentinel in hand and ten feet of reach.
 *
 *  Both halves are required and neither is in any shared fixture. Without the
 *  feat, or without the property, "The Sentinel Gate" is dropped by `needs` —
 *  which is the whole point of the gate and is asserted below in both
 *  directions. Note the weapon keeps its `range: '5 ft'`: `weaponReach` reads
 *  the PROPERTY first precisely so a stale range field cannot make a glaive
 *  five feet long. */
const NIX_R2: Character = {
  ...NIX_7,
  feats: [SENTINEL],
  weapons: NIX.weapons.map(w =>
    w.attackType === 'melee'
      ? { ...w, properties: [...(w.properties ?? []), 'Reach', 'Two-Handed'] }
      : w),
}

const EMPTY: ToyboxData = { combos: [], tactics: [], personaPlays: [], seededPacks: [] }

const AT = 1_700_000_000_000

/** One of Marcus's own, for the tests about not trampling him. */
const MINE: ToyboxCombo = {
  id: 'mine', name: 'Something I wrote', blocks: [], tags: [], favorite: true, createdAt: 1,
}

const ids = (d: ToyboxData) => d.combos.map(c => c.id)
const r1 = (id: string) => id.startsWith('seed:hearth-7:')
const r2 = (id: string) => id.startsWith('seed:hearth-7-r2:')

/* WHAT EACH FIXTURE EARNS FROM ROUND TWO, NAMED RATHER THAN COUNTED.
   A number here would stay green if one entry started gating while another
   stopped; the names cannot. They are stated once so that the day a content
   slice changes what a sheet earns, the diff is these three lists and not a
   scatter of literals through forty tests. */

/** Gated on nothing, so every paladin in the window gets these seven. Slice 3
 *  of round two added three of them and slice 4 added the last; the list is in
 *  `PACKS` order because the assertions below compare it with `toEqual` and
 *  order is load-bearing. */
const R2_UNGATED = [
  'seed:hearth-7-r2:three-people-stand-up',
  'seed:hearth-7-r2:the-free-crit',
  'seed:hearth-7-r2:through-the-door',
  'seed:hearth-7-r2:bearings-and-the-backward-walk',
  'seed:hearth-7-r2:one-silver-piece-of-fire',
  'seed:hearth-7-r2:the-shield-round',
  'seed:hearth-7-r2:the-caster-killer',
]

/** `NIX_R2` adds the Sentinel Gate, and its weapon is Two-Handed, so it also
 *  earns "Drop the Glaive". It still lacks Graze, so "The Second Swing Is Not
 *  Wasted" is dropped — the one entry no fixture in this repo earns. */
const R2_FOR_NIX_R2 = [
  'seed:hearth-7-r2:the-sentinel-gate',
  'seed:hearth-7-r2:three-people-stand-up',
  'seed:hearth-7-r2:the-free-crit',
  'seed:hearth-7-r2:through-the-door',
  'seed:hearth-7-r2:bearings-and-the-backward-walk',
  'seed:hearth-7-r2:one-silver-piece-of-fire',
  'seed:hearth-7-r2:the-shield-round',
  'seed:hearth-7-r2:drop-the-glaive',
  'seed:hearth-7-r2:the-caster-killer',
]
/* Spelled out rather than spliced around `R2_UNGATED`, which is what it used to
   be. That worked while every gated entry sorted after every ungated one. Slice
   4 ended that: "The Caster Killer" is ungated and sorts LAST, behind the gated
   "Drop the Glaive", so `[gated, ...ungated, gated]` no longer describes the
   real order — and this list is compared with `toEqual`, where order counts. */

/** With no melee weapon, the ungated entries that never say `{{weapon}}` in a
 *  load-bearing field. "The Free Crit" and "One Silver Piece of Fire" both open
 *  with an attack, so they go with the weapon. "The Shield Round" and "Bearings
 *  and the Backward Walk" are the two turns where the weapon is deliberately
 *  not used, and they name no weapon — which is why they survive here. */
const R2_UNARMED = [
  'seed:hearth-7-r2:three-people-stand-up',
  'seed:hearth-7-r2:through-the-door',
  'seed:hearth-7-r2:bearings-and-the-backward-walk',
  'seed:hearth-7-r2:the-shield-round',
]

/** ROUND TWO'S TACTICS, in pack order. Slice 5 took this from one to eight.
 *  Two of the eight are gated and the gates are the same two mechanisms the
 *  combos use — "You Are a Glaive" wants a Two-Handed weapon, "Sentinel Is a
 *  Prison" wants the feat — so `NIX_7` earns six of the eight and Marcus's own
 *  sheet earns all eight. `NIX_7` has neither, which is why the two lists below
 *  are the same list. */
const R2_TACTICS_UNGATED = [
  'seed:hearth-7-r2:four-prepared-spells',
  'seed:hearth-7-r2:the-doctrine-trick',
  'seed:hearth-7-r2:the-shopping-list',
  'seed:hearth-7-r2:no-save-proficiencies',
  'seed:hearth-7-r2:ask-your-dm',
  'seed:hearth-7-r2:plate-and-the-face',
]

/** Round two's six persona plays, and NONE of them are gated.
 *
 *  THE ONLY TAB WHERE THE TWO SHEETS AGREE. Every combo and tactic list above
 *  is shorter for `NIX_7` than for Marcus, because feats and weapon properties
 *  decide who gets what. A persona play asks for neither: it needs a face, a
 *  voice and a table, which every paladin brings. So this list is the whole of
 *  round two's persona content and it is the same list for everybody.
 *
 *  That is exactly the cost of the scoped exception, stated as a list. These
 *  six name Selis, Fate, Scar, Rysanna, Khaonn and the Hidden Kingdom — see the
 *  licence in `types.ts` — so they arrive intact for a paladin who has never
 *  met any of them. `hearth-7-r2` is Marcus's pack and is not shareable, and
 *  this is the file where that stops being a comment and becomes a behaviour. */
const R2_PERSONA = [
  'seed:hearth-7-r2:fate-wants-something-stupid',
  'seed:hearth-7-r2:ask-scar',
  'seed:hearth-7-r2:the-eyes-you-never-change',
  'seed:hearth-7-r2:while-the-nations-war',
  'seed:hearth-7-r2:when-they-ask-about-the-fire',
  'seed:hearth-7-r2:the-face-that-opens-the-door',
]

describe('finding packs', () => {
  it('matches a Paladin of the Hearth inside the level window', () => {
    /* BOTH packs, in `PACKS` order, and the order is load-bearing: it is the
       order the entries are appended in, so round one keeps the top of the
       list and round two lands beneath it. */
    expect(findPacks(NIX_7).map(p => p.id)).toEqual(['hearth-7', 'hearth-7-r2'])
    expect(findPacks(NIX).map(p => p.id), 'level 8 is the ceiling, and ceilings are inclusive')
      .toEqual(['hearth-7', 'hearth-7-r2'])
    expect(findPacks({ ...NIX, level: 5 }).map(p => p.id), 'and 5 is the floor')
      .toEqual(['hearth-7', 'hearth-7-r2'])
  })

  it('matches nobody else, and says so with an empty list rather than a fallback', () => {
    expect(findPacks({ ...NIX, class: 'Wizard' }), 'not a paladin').toEqual([])
    expect(findPacks({ ...NIX, subclass: 'Oath of Devotion' }), 'wrong oath — no cloak').toEqual([])
    expect(findPacks({ ...NIX, level: 4 }), 'below the floor').toEqual([])
    expect(findPacks({ ...NIX, level: 9 }), 'above the ceiling').toEqual([])
  })
})

describe('seeding', () => {
  it('puts the pack into an empty Toybox — all of it', () => {
    /* SLICE 5 REWROTE THE THREE COUNTS HERE. They used to read `toHaveLength(1)`,
       which was a claim about the pack rather than about the seeder and went red
       the moment content was written. The claim that was always meant is
       "nothing was dropped and nothing was duplicated", so it is now asked of
       the pack itself — and it stays true through slices 6 to 8. */
    const pack = findPacks(NIX_7)[0]
    const result = seedToybox(EMPTY, NIX_7, AT)
    expect(result.changed).toBe(true)
    expect(result.packIds).toEqual(['hearth-7', 'hearth-7-r2'])
    /* SLICE 2 OF ROUND TWO SPLIT THIS COUNT IN TWO. The claim was always
       "round one arrived and nothing was dropped or duplicated", and a bare
       total can no longer say that now a second pack contributes to it — so
       round one is counted against its own pack and round two's share is NAMED.
       A total of seventeen would go green if round one lost a card and round
       two gained one. */
    expect(result.data.combos.filter(c => r1(c.id)), 'round one, in full')
      .toHaveLength(pack.combos.length)
    expect(result.data.combos.filter(c => r2(c.id)).map(c => c.id), 'and round two’s ungated six')
      .toEqual(R2_UNGATED)
    /* SLICE 3 SPLIT THE TACTICS THE SAME WAY, for the same reason: round two
       now contributes one, and a bare total of thirteen would stay green if
       round one lost a tactic while round two gained one.

       SLICE 5 TOOK ROUND TWO'S SHARE FROM ONE TO SIX HERE, not to eight, and
       the difference is the assertion. `NIX_7` carries no feats and no
       Two-Handed weapon, so the two gated tactics are correctly absent for him
       — the same partial delivery the combos have shown since slice 2, now
       true of the tactics tab as well. */
    expect(result.data.tactics.filter(t => r1(t.id)), 'round one’s tactics, in full')
      .toHaveLength(pack.tactics.length)
    expect(result.data.tactics.filter(t => r2(t.id)).map(t => t.id), 'and round two’s ungated six')
      .toEqual(R2_TACTICS_UNGATED)
    /* SLICE 6 SPLIT THE PERSONA COUNT LAST, and it is the split that was most
       overdue: this line read `toHaveLength(pack.personaPlays.length)` while
       round two shipped none, so it was a count of round one wearing the name
       of a total. Now that round two contributes six, the same total would go
       green if round one lost a play and round two gained one. */
    expect(result.data.personaPlays.filter(p => r1(p.id)), 'round one’s five voices')
      .toHaveLength(pack.personaPlays.length)
    expect(result.data.personaPlays.filter(p => r2(p.id)).map(p => p.id), 'and round two’s six, none of them gated')
      .toEqual(R2_PERSONA)
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
      expect(result.packIds, `${why}: a pack id here would offer him a force button`).toEqual([])
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
    expect(result.data.combos.slice(1).map(c => r1(c.id) || r2(c.id))).not.toContain(false)
    /* The delivery is the SAME delivery it would make into an empty Toybox,
       plus his one. Stated that way rather than as a number, because the claim
       here is about position — that his card keeps the top — and a number would
       have to be re-typed every time a content slice ships. */
    expect(result.data.combos)
      .toHaveLength(1 + seedToybox(EMPTY, NIX_7, AT).data.combos.length)
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
      expect(combo.id).toMatch(/^seed:hearth-7(-r2)?:/)
      for (const block of combo.blocks) expect(block.id).toMatch(/^seed:hearth-7(-r2)?:/)
    }
  })
})

describe('once, and once only', () => {
  it('records the packs it applied', () => {
    /* Both, since slice 2 — round two now delivers to this sheet as well.
       "Applied", not "matched": the two lists are the same here and are
       deliberately different in `seed-empty.test.ts`, which is where the gap
       between them is the subject. */
    expect(seedToybox(EMPTY, NIX_7, AT).data.seededPacks)
      .toEqual(['hearth-7', 'hearth-7-r2'])
  })

  it('does not seed twice — feeding the result back in changes nothing', () => {
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT)
    expect(twice.changed).toBe(false)
    expect(twice.data, 'the same object, so the caller cannot even be tempted to write').toBe(once)
    expect(twice.packIds, 'it still says WHICH packs matched — the button needs that')
      .toEqual(['hearth-7', 'hearth-7-r2'])
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
       is precisely the edit this test exists to catch.

       ROUND TWO, SLICE 2 EXTENDED IT ACROSS THE PACK BOUNDARY, and that is the
       version worth having. An archer now drops entries for TWO different
       reasons at once: a `{{weapon}}` token that cannot resolve (round one's
       five survivors, and "The Free Crit", which opens with an attack) and a
       `needs` that the sheet cannot satisfy ("The Second Swing", which wants
       Graze, and "The Sentinel Gate", which wants Sentinel and Reach). Both
       mechanisms run over one character in one call here, and the survivors are
       named across both packs. */
    const unarmed: Character = { ...NIX_7, weapons: NIX.weapons.filter(w => w.attackType === 'ranged') }
    const result = seedToybox(EMPTY, unarmed, AT)
    const pack = findPacks(NIX_7)[0]

    expect(result.changed, 'something WAS delivered').toBe(true)
    expect(result.packIds).toEqual(['hearth-7', 'hearth-7-r2'])
    expect(result.data.combos.map(c => c.id), 'the combos that never name a weapon')
      .toEqual([
        'seed:hearth-7:the-cone-at-the-door',
        'seed:hearth-7:nothing-in-reach',
        'seed:hearth-7:bless-before-the-door',
        'seed:hearth-7:damage-relocation',
        'seed:hearth-7:before-the-door-opens',
        ...R2_UNARMED,
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
       starts naming a weapon while another stops.

       SLICE 3 OF ROUND TWO ADDED THE TENTH. The Shopping List names ball
       bearings, oil, caltrops, rope and a longsword and never once says
       `{{weapon}}` — the whole card is about gear he does not have yet, so
       there was nothing for it to name. It survives the bow.

       SLICE 5 ADDED FIVE MORE AND, MORE USEFULLY, DID NOT ADD TWO. Round two's
       tactics survive a bow for the same reason its combos do or fail to: five
       of the seven never say `{{weapon}}` because they are about spells, saves,
       shopping and a disguise. The two that do not appear here are gated as
       well as tokenised, so nothing about this list would change if the tokens
       were removed — and that redundancy is deliberate. A card that is wrong
       for a paladin should be absent for two independent reasons, because one
       of the two will eventually be edited. */
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
        ...R2_TACTICS_UNGATED,
      ])
    /* AND THE BOW TAKES NONE OF THEM. Round two's six never say `{{weapon}}`
       and never carry a `needs`, because a persona play is about a face and not
       a polearm — so the archer paladin who loses four combos and two tactics
       above loses nothing at all here. Split for the same reason as the line in
       the delivery test: a bare total cannot tell one round's loss from the
       other round's gain. */
    expect(result.data.personaPlays.filter(p => r1(p.id)), 'round one’s five survive the bow')
      .toHaveLength(pack.personaPlays.length)
    expect(result.data.personaPlays.filter(p => r2(p.id)).map(p => p.id), 'and so do round two’s six')
      .toEqual(R2_PERSONA)
    expect(result.data.seededPacks, 'two real deliveries are recorded')
      .toEqual(['hearth-7', 'hearth-7-r2'])
  })
})

describe('forcing it, which is the way back from a deletion', () => {
  const ONLY_R1 = { force: ['hearth-7'] }

  it('seeds straight through the marker', () => {
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const emptied: ToyboxData = { ...seeded, combos: [] }
    const forced = seedToybox(emptied, NIX_7, AT, ONLY_R1)
    expect(forced.changed).toBe(true)
    /* Their ORIGINAL ids, un-suffixed — nothing collided, because the combos
       were the thing deleted. The `~2` path is the next test's business.
       ROUND ONE'S ONLY, and slice 2 is why the filter appeared: deleting the
       combos deleted round two's three as well, and forcing `hearth-7` must NOT
       bring them back. What is named is not a licence to re-deliver the rest. */
    expect(forced.data.combos.map(c => c.id))
      .toEqual(seeded.combos.filter(c => r1(c.id)).map(c => c.id))
  })

  it('does not write the marker a second time', () => {
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const forced = seedToybox({ ...seeded, combos: [] }, NIX_7, AT, ONLY_R1)
    expect(forced.data.seededPacks).toEqual(['hearth-7', 'hearth-7-r2'])
  })

  it('forces only the packs it is named, and leaves the others alone', () => {
    /* THE REASON `force` STOPPED BEING A BOOLEAN, as a test.

       Round two on the sheet it was written for; then round one deleted; then
       the button pressed. Under a boolean the only available meaning was "all
       matching packs", which would restore round one AND append a second copy
       of round two — re-addressed to `~2`, so it would look like a rendering
       bug rather than the double delivery it is. Naming the pack makes that
       unrepresentable.

       This test fails against a boolean `force` by construction: there is no
       way to express it. */
    const both = seedToybox(EMPTY, NIX_R2, AT).data
    expect(ids(both).filter(r2), 'round two reached this sheet').toEqual(R2_FOR_NIX_R2)

    const r1Gone: ToyboxData = { ...both, combos: both.combos.filter(c => !r1(c.id)) }
    const restored = seedToybox(r1Gone, NIX_R2, AT, ONLY_R1).data

    expect(ids(restored).filter(r1), 'round one is back, original ids')
      .toEqual(ids(both).filter(r1))
    expect(ids(restored).filter(r2), 'round two was NOT touched').toEqual(R2_FOR_NIX_R2)
    expect(ids(restored).some(id => id.includes('~')), ids(restored).join(' · ')).toBe(false)
    expect(new Set(ids(restored)).size).toBe(ids(restored).length)
  })

  it('gives the copies ids that cannot collide with the originals', () => {
    /* The UI does not offer the button while the originals are present, so
       this path is a safety net. It is tested because a net nobody tests is a
       decoration: two entries sharing an id means editing one edits both, and
       two blocks sharing a key means React paints one card's steps inside the
       other's. */
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT, ONLY_R1).data
    const thrice = seedToybox(twice, NIX_7, AT, ONLY_R1).data

    const all = thrice.combos.map(c => c.id)
    /* THE ARITHMETIC IS THE ASSERTION, and slice 2 made it a better one. The
       first pass delivers both packs; the two forced passes name `hearth-7`
       only, so each adds round one AGAIN and neither touches round two. Round
       one three times, round two once. Any other total means `force` either
       skipped a pack it was told to seed or seeded one it was not. */
    expect(all.filter(r1), 'round one, once per pass')
      .toHaveLength(findPacks(NIX_7)[0].combos.length * 3)
    expect(all.filter(r2), 'round two, exactly once — it was never forced')
      .toHaveLength(R2_UNGATED.length)
    expect(new Set(all).size, all.join(' · ')).toBe(all.length)

    const blockIds = thrice.combos.flatMap(c => c.blocks.map(b => b.id))
    expect(new Set(blockIds).size, 'block keys too, not just the card').toBe(blockIds.length)
    for (const id of blockIds) expect(id).toMatch(/^seed:hearth-7(-r2)?:/)
  })

  it('leaves the originals exactly as they were', () => {
    const once = seedToybox(EMPTY, NIX_7, AT).data
    const twice = seedToybox(once, NIX_7, AT, ONLY_R1).data
    expect(twice.combos[0]).toEqual(once.combos[0])
  })

  it('ignores a pack id that does not match this character', () => {
    /* The list is what the UI asks for, not a licence. A stale id from a
       character who has since levelled past the ceiling must not resurrect a
       pack the gate has already refused. */
    const seeded = seedToybox(EMPTY, NIX_7, AT).data
    const nine = seedToybox(seeded, { ...NIX_7, level: 9 }, AT, ONLY_R1)
    expect(nine.changed).toBe(false)
    expect(nine.data).toBe(seeded)
  })
})

describe('two packs, which is the whole of round two', () => {
  it('delivers round two to a Toybox already marked with round one', () => {
    /* THE EXACT STATE OF MARCUS'S PHONE. He has round one's entries and
       `seededPacks: ['hearth-7']`, saved before round two existed. The next
       time he opens the Toybox this must run and must not disturb anything.

       This is the test the whole architecture decision was made for: adding
       entries to `hearth-7` instead of shipping a second pack would leave
       `changed` false here, forever, silently. */
    const shipped = seedToybox(EMPTY, NIX_R2, AT).data
    const asHeIsToday: ToyboxData = {
      ...shipped,
      combos: shipped.combos.filter(c => r1(c.id)),
      seededPacks: ['hearth-7'],
    }

    const next = seedToybox(asHeIsToday, NIX_R2, AT)

    expect(next.changed, 'round two must reach an already-seeded Toybox').toBe(true)
    expect(next.data.seededPacks).toEqual(['hearth-7', 'hearth-7-r2'])
    expect(ids(next.data).filter(r2), 'the new entries arrived').toEqual(R2_FOR_NIX_R2)
    expect(ids(next.data).filter(r1), 'and round one is untouched, not re-delivered')
      .toEqual(ids(asHeIsToday).filter(r1))
    expect(new Set(ids(next.data)).size, 'nothing duplicated').toBe(ids(next.data).length)
    expect(ids(next.data).some(id => id.includes('~')), 'and nothing re-addressed').toBe(false)
  })

  it('delivers both packs in one call to a fresh Toybox, round one first', () => {
    const result = seedToybox(EMPTY, NIX_R2, AT)
    expect(result.data.seededPacks).toEqual(['hearth-7', 'hearth-7-r2'])
    /* Order is the claim, not just membership: every round-one combo comes
       before every round-two one, because that is `PACKS` order and `PACKS`
       order is what the user's thumb meets. */
    const all = ids(result.data)
    const lastR1 = all.reduce((acc, id, i) => (r1(id) ? i : acc), -1)
    const firstR2 = all.findIndex(r2)
    expect(firstR2).toBeGreaterThan(lastR1)
  })

  /* TWO TESTS USED TO SIT HERE, AND WHERE THEY WENT IS WORTH WRITING DOWN.

     "The pack that cannot reach this character is not marked as delivered" and
     "an undeliverable pack does not abort the packs behind it" were both
     written in slice 1 against `NIX_7`, on the strength of a fact that was true
     for exactly one slice: round two's only entry needed Sentinel and Reach, so
     this fixture earned nothing from it. Slice 2 shipped three entries gated on
     nothing, and there is now NO character inside the gate who earns nothing
     from round two. The setup those tests needed cannot be built from real
     content any more.

     Neither claim was dropped. Both are the reason `seed-empty.test.ts` exists,
     and both are asserted there — "records NO marker, so the real delivery can
     still happen later" and "delivers the second pack even though the first
     wrote nothing" — against MOCKED packs, where "this pack delivers nothing"
     is a property the test states rather than one it inherits from whatever was
     authored last. That is where they belonged from the start; slice 1 only got
     away with keeping them here because the content had not caught up yet.

     They are not restated here as weaker versions. A test that asserts a thing
     is true of a character who cannot demonstrate it is not a test. */
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
