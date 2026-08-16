import { describe, it, expect } from 'vitest'
import { composeTurn } from './compose'
import { categorizeTurnOptions, type CategorizedOptions } from './options'
import { NIX } from './fixtures/nix'
import type { Character } from '../character'
import type { CombatState } from '../combat-state'
import type { TurnOption } from './types'

/* ============================================================================
   THE PROOF OF SLICE 4
   ----------------------------------------------------------------------------
   Slice 2's characterization suite proves that `categorizeTurnOptions` still
   does what the shipped app did. It cannot prove that composeTurn AGREES with
   it — and an extraction that quietly disagrees with the screen it was
   extracted from is exactly the failure this slice exists to prevent.

   So: these tests compare the two, on the same character, and assert the
   difference is precisely the one difference this slice intended.

     composeTurn's AVAILABLE options  ==  what TurnSummary offers today
     composeTurn's BLOCKED options    ==  the affordability drops, each with
                                          a reason, and nothing else

   Anything composeTurn invents, or anything it loses, fails here.
   ========================================================================== */

const census = (c: CategorizedOptions) =>
  [...c.actions, ...c.bonusActions, ...c.reactions].map(o => o.name).sort()

const listed = (t: ReturnType<typeof composeTurn>): TurnOption[] => [
  ...t.ranked,
  ...t.rest,
  ...t.mutex.flatMap(g => g.faces),
]

const fresh = (): CombatState => ({
  inCombat: true,
  round: 1,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
})

const withCharacter = (over: Partial<Character>): Character => ({ ...NIX, ...over })

describe('the default build path is untouched', () => {
  it('deep-equals the explicit includeUnaffordable:false build', () => {
    // The switch added in Slice 4 must be inert unless asked for. If these two
    // ever differ, the extraction has changed what the V0.9 screen renders.
    expect(categorizeTurnOptions(NIX)).toEqual(
      categorizeTurnOptions(NIX, { includeUnaffordable: false }),
    )
  })

  it('deep-equals a build with no options object at all', () => {
    expect(categorizeTurnOptions(NIX)).toEqual(categorizeTurnOptions(NIX, {}))
  })

  it('includeUnaffordable only ever ADDS — it never removes or edits', () => {
    const strict = categorizeTurnOptions(NIX)
    const wide = categorizeTurnOptions(NIX, { includeUnaffordable: true })
    for (const option of [...strict.actions, ...strict.bonusActions, ...strict.reactions]) {
      const twin = [...wide.actions, ...wide.bonusActions, ...wide.reactions].find(
        o => o.name === option.name,
      )
      expect(twin).toEqual(option)
    }
    expect(census(wide).length).toBeGreaterThan(census(strict).length)
  })
})

describe('composeTurn agrees with the screen it was extracted from', () => {
  const turn = composeTurn({ character: NIX, combat: fresh() })

  it('offers exactly what TurnSummary offers, when nothing is spent', () => {
    // Nix is unwounded, unconditioned, and has used nothing. Under those
    // conditions the two must be the same set — no more, no fewer.
    const available = listed(turn)
      .filter(o => o.available)
      .map(o => o.name)
      .sort()
    expect(available).toEqual(census(categorizeTurnOptions(NIX)))
  })

  it('invents nothing — every option traces to the builder', () => {
    const known = new Set(census(categorizeTurnOptions(NIX, { includeUnaffordable: true })))
    for (const option of listed(turn)) expect(known.has(option.name)).toBe(true)
  })

  it('loses nothing — the wide census is fully accounted for', () => {
    const shown = new Set(listed(turn).map(o => o.name))
    for (const name of census(categorizeTurnOptions(NIX, { includeUnaffordable: true }))) {
      expect(shown.has(name)).toBe(true)
    }
  })

  it("shows the affordability drops blocked, and that is the ONLY difference", () => {
    const strict = new Set(census(categorizeTurnOptions(NIX)))
    const extras = listed(turn)
      .filter(o => !strict.has(o.name))
      .map(o => o.name)
      .sort()
    const dropped = census(categorizeTurnOptions(NIX, { includeUnaffordable: true }))
      .filter(n => !strict.has(n))
      .sort()

    expect(extras).toEqual(dropped)
    expect(extras.length).toBeGreaterThan(0)   // else this test proves nothing
  })

  it('gives every one of those extras a reason, never a bare grey row', () => {
    const strict = new Set(census(categorizeTurnOptions(NIX)))
    for (const option of listed(turn).filter(o => !strict.has(o.name))) {
      expect(option.available).toBe(false)
      expect(option.blockedReason).toBeTruthy()
    }
  })

  it("names Divine Sense's empty pool rather than hiding the feature", () => {
    // The concrete case. Nix has 0 of 4 Divine Sense left; V0.9 dropped the row
    // silently, and D says why.
    const divineSense = listed(turn).find(o => o.name === 'Divine Sense')
    expect(divineSense?.available).toBe(false)
    expect(divineSense?.blockedReason).toBe('No uses left until a long rest')
  })

  it('still drops what is not his today: unprepared spells and absent tiers', () => {
    // Bless is known but not prepared; Fireball is prepared but a Paladin 8 has
    // no 3rd-level slots AT ALL. Neither is "yours but spent", so neither is
    // shown — showing them would be the opposite failure to hiding Divine Sense.
    const names = listed(turn).map(o => o.name)
    expect(names).not.toContain('Bless')
    expect(names).not.toContain('Fireball')
  })
})

describe('legality — what closes an option', () => {
  it('blames the condition, not the economy, when both would apply', () => {
    const stunned = withCharacter({ conditions: ['Stunned'] })
    const combat: CombatState = { ...fresh(), turnActions: { ...fresh().turnActions, action: true } }
    const turn = composeTurn({ character: stunned, combat })

    // Stunned cascades to Incapacitated, which in 2024 blocks the action, the
    // bonus action AND the reaction. Every option is closed, and the reason
    // given is the condition — telling a stunned player his action is spent is
    // technically true and useless.
    const all = listed(turn)
    expect(all.length).toBeGreaterThan(0)
    for (const option of all) {
      expect(option.available).toBe(false)
      expect(option.blockedReason).toBe('You are Incapacitated')
    }
    expect(turn.economy).toMatchObject({ action: false, bonusAction: false, reaction: false })
    // 2024 Stunned does not set Speed 0 — verified in Slice 3.
    expect(turn.economy.movement).toBe(true)
  })

  it('closes only the slot that was spent', () => {
    const combat: CombatState = {
      ...fresh(),
      turnActions: { action: false, bonusAction: true, reaction: false, movement: false },
    }
    const turn = composeTurn({ character: NIX, combat })
    const bonus = listed(turn).filter(o => o.cost.slot === 'bonusAction')
    expect(bonus.length).toBeGreaterThan(0)
    for (const option of bonus) {
      expect(option.available).toBe(false)
      // Divine Sense is out of uses as well, and that reason WINS — see the
      // precedence note in compose.ts. Everything else says the slot.
      const expected =
        option.name === 'Divine Sense'
          ? 'No uses left until a long rest'
          : 'Your bonus action is spent'
      expect(option.blockedReason).toBe(expected)
    }
    for (const option of listed(turn).filter(o => o.cost.slot === 'action')) {
      expect(option.blockedReason).not.toBe('Your bonus action is spent')
    }
    expect(turn.economy).toMatchObject({ action: true, bonusAction: false, reaction: true })
  })

  it('prefers the reason that outlives the turn', () => {
    // The precedence rule, stated as a test. Divine Sense is blocked twice
    // over: the bonus action is spent (gone at end of turn) and the pool is
    // empty (gone at a long rest). Ending the turn does not help, so the app
    // must not imply that it would.
    const combat: CombatState = {
      ...fresh(),
      turnActions: { action: false, bonusAction: true, reaction: false, movement: false },
    }
    const divineSense = listed(composeTurn({ character: NIX, combat })).find(
      o => o.name === 'Divine Sense',
    )
    expect(divineSense?.blockedReason).toBe('No uses left until a long rest')
  })

  it('enforces one spell slot per TURN, across every action type', () => {
    const turn = composeTurn({
      character: NIX,
      combat: fresh(),
      log: [{ round: 1, spellSlotLevel: 1 }],
    })
    const slotSpenders = listed(turn).filter(o => o.cost.spellSlotLevel !== undefined)
    expect(slotSpenders.length).toBeGreaterThan(0)
    for (const option of slotSpenders) {
      expect(option.blockedReason).toBe('You may expend only one spell slot on a turn')
    }
    // Cantrips expend no slot and so are untouched by the rule.
    const sacredFlame = listed(turn).find(o => o.name === 'Sacred Flame')
    expect(sacredFlame?.available).toBe(true)
    expect(turn.economy.spellSlotUsedThisTurn).toBe(true)
  })

  it('is unbothered by a slot spent in an earlier round', () => {
    const turn = composeTurn({
      character: NIX,
      combat: { ...fresh(), round: 4 },
      log: [{ round: 3, spellSlotLevel: 1 }],
    })
    expect(turn.economy.spellSlotUsedThisTurn).toBe(false)
  })
})

describe("contention — D's defining element, on real data", () => {
  const turn = composeTurn({ character: NIX, combat: fresh() })
  const bracket = (slot: string) => turn.mutex.find(g => g.faces[0].cost.slot === slot)

  it('produces brackets at all', () => {
    // The mutation sweep is why this test exists: replacing findContention's
    // input with [] SURVIVED the suite, because every other assertion about
    // mutex was written as "for each group" and a turn with no groups passes
    // them all vacuously. Nothing said the brackets must EXIST.
    expect(turn.mutex.length).toBe(2)
  })

  it("brackets Nix's five bonus actions as one decision, not five rows", () => {
    const bonus = bracket('bonusAction')
    expect(bonus?.faces.map(f => f.name).sort()).toEqual([
      'Channel Divinity: Sacred Weapon',
      'Divine Smite',
      'Lay on Hands',
      'Misty Step',
      'Shield of Faith',
    ])
    // 'both': the bonus action alone would still let him Smite next turn, but
    // the one-spell-slot rule is what stops Smite and Misty Step ever sharing
    // a turn. Two independent causes, and saying which is the whole point.
    expect(bonus?.reason).toBe('both')
    expect(bonus?.label).toBe('One of these — your bonus action')
  })

  it('brackets the two levelled Action spells as well', () => {
    expect(bracket('action')?.faces.map(f => f.name).sort()).toEqual([
      'Cure Wounds',
      'Warding Bond',
    ])
  })

  it('does not bracket things you cannot run out of', () => {
    // Hearthbrand, Javelin and Sacred Flame all want the Action, but you can
    // always swing again next turn. Bracketing them with Cure Wounds would say
    // something false.
    const faces = turn.mutex.flatMap(g => g.faces.map(f => f.name))
    for (const free of ['Hearthbrand', 'Javelin', 'Sacred Flame', 'Hearthfire Manifest']) {
      expect(faces).not.toContain(free)
    }
  })

  it('keeps every face out of the flat lists', () => {
    const flat = [...turn.ranked, ...turn.rest].map(o => o.id)
    for (const face of turn.mutex.flatMap(g => g.faces)) {
      expect(face.contended).toBe(true)
      expect(flat).not.toContain(face.id)
    }
  })

  it('stops bracketing when the decision is no longer a decision', () => {
    // Spend the bonus action and there is nothing left to agonise over: the
    // five faces are all blocked, so they are no longer five ways to spend one
    // slot. They fall back to the flat list, greyed, each with its reason.
    const spent = composeTurn({
      character: NIX,
      combat: { ...fresh(), turnActions: { ...fresh().turnActions, bonusAction: true } },
    })
    expect(spent.mutex.map(g => g.faces[0].cost.slot)).toEqual(['action'])
    const smite = [...spent.ranked, ...spent.rest].find(o => o.name === 'Divine Smite')
    expect(smite?.blockedReason).toBe('Your bonus action is spent')
  })
})

describe('what the extraction must carry across', () => {
  const turn = composeTurn({ character: NIX, combat: fresh() })

  it("renames race to species at the boundary, not in Marcus's storage", () => {
    expect(turn.actor.species).toBe('Changeling')
    expect(NIX).not.toHaveProperty('species')
    expect(NIX.race).toBe('Changeling')
  })

  it('flags the homebrew subclass without inventing a field for it', () => {
    expect(turn.actor.homebrewSubclass).toBe(true)
    expect(composeTurn({ character: withCharacter({ subclass: 'Oath of Devotion' }), combat: null })
      .actor.homebrewSubclass).toBeUndefined()
  })

  it("reads Sap off Nix's Hearthbrand with the 2024 window", () => {
    // Hearthbrand is a homebrew-NAMED longsword, so the weapon-name table
    // cannot help: the declared `masteryProperty` is the only source, and it
    // has to be enough. Sap's window closes at the START of your next turn —
    // one of the two facts Slice 3's adversarial pass corrected.
    const hearthbrand = listed(turn).find(o => o.name === 'Hearthbrand')
    expect(hearthbrand).toBeDefined()
    expect(hearthbrand?.rider).toMatchObject({
      property: 'Sap',
      known: true,
      automatic: true,
      expires: 'startOfYourNextTurn',
    })
  })

  it('reads a mastery off the weapon NAME when none is declared', () => {
    // The Javelin declares nothing; the 2024 table says Slow.
    const javelin = listed(turn).find(o => o.name === 'Javelin')
    expect(javelin?.rider).toMatchObject({ property: 'Slow', known: true })
  })

  it('passes an unrecognised mastery through with its words intact', () => {
    const homebrewWeapon = withCharacter({
      weapons: NIX.weapons.map(w =>
        w.name === 'Hearthbrand' ? { ...w, masteryProperty: 'Hearthbind' } : w,
      ),
    })
    const rider = listed(composeTurn({ character: homebrewWeapon, combat: null })).find(
      o => o.name === 'Hearthbrand',
    )?.rider
    expect(rider).toMatchObject({ property: 'Hearthbind', known: false, automatic: false })
    expect(rider?.text).toBe('Hearthbind')
    expect(rider?.expires).toBe('unspecified')
  })

  it('measures Lay on Hands in points and Channel Divinity in uses', () => {
    const pools = Object.fromEntries(turn.resources.map(r => [r.id, r]))
    expect(pools['lay-on-hands']).toMatchObject({ current: 15, max: 40, unit: 'points' })
    expect(pools['channel-divinity']).toMatchObject({ unit: 'uses', recharge: 'shortRest' })
  })

  it('lists only slot tiers he actually has — no phantom 3rd level', () => {
    expect(turn.spellSlots.map(s => s.level)).toEqual([1, 2])
    // The same must hold when a tier is PRESENT but empty at max 0, which is
    // how a levelled-down or partially-built sheet arrives. "0 of 0" is noise
    // on the one screen that can least afford it.
    const withEmptyTier = withCharacter({
      spellSlots: { ...NIX.spellSlots, 3: { max: 0, current: 0 } },
    })
    expect(
      composeTurn({ character: withEmptyTier, combat: null }).spellSlots.map(s => s.level),
    ).toEqual([1, 2])
  })

  it('folds the shortlist rather than dumping every option on the screen', () => {
    // Fifteen seconds is the metric. A list you scroll is a list you read, and
    // reading is the ninety seconds this app exists to delete.
    expect(turn.ranked.length).toBeLessThanOrEqual(5)
    expect(turn.ranked.length).toBeGreaterThan(0)
    expect(turn.rest.length).toBeGreaterThan(0)

    const two = composeTurn({ character: NIX, combat: fresh(), shortlistSize: 2 })
    expect(two.ranked.length).toBe(2)
    // Nothing is lost to the fold: what leaves `ranked` arrives in `rest`.
    expect(listed(two).map(o => o.id).sort()).toEqual(listed(turn).map(o => o.id).sort())
  })

  it('folds at FIVE by default, on a character with more than five', () => {
    // Nix has exactly five uncontended affordable options, so the default is
    // saturated but never exercised by him — the mutation sweep caught that
    // (M16 survived). A pack-rat with nine weapons proves the number is real
    // and not just "however many Nix happens to have".
    const packRat = withCharacter({
      weapons: Array.from({ length: 9 }, (_, i) => ({ ...NIX.weapons[0], name: `Blade ${i}` })),
    })
    const wide = composeTurn({ character: packRat, combat: fresh() })
    expect(wide.ranked.length).toBe(5)
    expect(wide.rest.filter(o => o.available).length).toBeGreaterThan(0)
  })

  it('never lists the same option in two places', () => {
    const ids = listed(turn).map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shows passives as things that are TRUE, never as things to do', () => {
    const doable = new Set(listed(turn).map(o => o.name))
    const passiveNames = categorizeTurnOptions(NIX).passives.map(p => p.name)
    expect(passiveNames.length).toBeGreaterThan(0)
    for (const name of passiveNames) {
      expect(doable.has(name)).toBe(false)
      expect(turn.upon.some(u => u.name === name)).toBe(true)
    }
  })

  it('puts the bloodied marker on real hit points', () => {
    const hurt = withCharacter({ hitPoints: { max: 76, current: 38 } })
    const t = composeTurn({ character: hurt, combat: null })
    expect(t.vitals).toMatchObject({ hp: 38, maxHp: 76, bloodiedAt: 38, bloodied: true })
  })
})

describe('it does not fall over on a half-built character', () => {
  it('survives a null encounter', () => {
    expect(() => composeTurn({ character: NIX, combat: null })).not.toThrow()
    expect(composeTurn({ character: NIX, combat: null }).round).toBe(1)
  })

  it('survives turnActions arriving from an older saved build', () => {
    const stale = { inCombat: true, round: 2, spellSlots: {}, concentrating: null } as CombatState
    const turn = composeTurn({ character: NIX, combat: stale })
    expect(turn.economy).toMatchObject({ action: true, bonusAction: true, reaction: true })
  })

  it('survives a condition it has never heard of, without inventing effects', () => {
    const cursed = withCharacter({ conditions: ['Hearth-Sundered'] })
    const turn = composeTurn({ character: cursed, combat: fresh() })
    const entry = turn.upon.find(u => u.name === 'Hearth-Sundered')
    expect(entry).toMatchObject({ known: false, tone: 'neutral' })
    // Unknown means unknown: it closes nothing.
    expect(turn.economy).toMatchObject({ action: true, bonusAction: true, reaction: true })
  })
})
