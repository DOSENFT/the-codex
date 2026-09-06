// Ranking is an editorial position, so these tests are the argument for it.
//
// Every case below states a claim the shortlist makes to Marcus at the table
// — "an action beats a bonus action", "a reaction is not a move", "heal when
// you are bleeding" — and fails if the code stops making it. None of them can
// pass against Slice 4's `score: 0`, which is the point.
import { describe, it, expect } from 'vitest'
import { scoreOption, sortByRank, withRank, type RankContext } from './rank'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'
import type { CombatState } from '../combat-state'
import type { TurnOption } from './types'

const HEALTHY: RankContext = { hpFraction: 1, bloodied: false, concentratingOn: null }
const HURT: RankContext = { hpFraction: 0.5, bloodied: false, concentratingOn: null }
const DYING: RankContext = { hpFraction: 0.1, bloodied: true, concentratingOn: null }

let seq = 0
function opt(over: Partial<TurnOption> = {}): TurnOption {
  seq += 1
  const { cost, ...rest } = over
  return {
    id: `o${seq}`,
    name: `Option ${seq}`,
    kind: 'attack',
    detail: 'does a thing',
    available: true,
    score: 0,
    ...rest,
    cost: { slot: 'action', label: 'Action', ...cost },
  }
}

const score = (o: TurnOption, ctx: RankContext = HEALTHY) => scoreOption(o, ctx).score
const why = (o: TurnOption, ctx: RankContext = HEALTHY) => scoreOption(o, ctx).why

describe('the dice are not a factor, and that is load-bearing', () => {
  /* An earlier draft ranked on the average of `option.dice`. On Nix's real
     sheet that field is the TO-HIT roll for a weapon and the damage for a
     spell, so the list ranked Shield of Faith — a buff that deals nothing —
     above Divine Smite, and put Sacred Flame above the magic longsword. These
     tests exist so that factor cannot come back by accident. */

  it('ignores a to-hit roll entirely', () => {
    const bare = opt()
    const swings = opt({ dice: '1d20+8' })
    expect(score(swings)).toBe(score(bare))
  })

  it('does not let a damage roll outweigh what the option costs', () => {
    const cantrip = opt({ dice: '2d8' })
    const paid = opt({ dice: '2d8', cost: { slot: 'action', label: 'Action', spellSlotLevel: 1 } })
    expect(score(cantrip)).toBeGreaterThan(score(paid))
  })

  it('scores two options with wildly different dice identically', () => {
    expect(score(opt({ dice: '100d6+40' }))).toBe(score(opt({ dice: '1d4' })))
  })
})

describe('the structural claims', () => {
  it('ranks an action above the same thing as a bonus action', () => {
    const action = opt({ dice: '1d8+4' })
    const bonus = opt({ dice: '1d8+4', cost: { slot: 'bonusAction', label: 'Bonus action' } })
    expect(score(action)).toBeGreaterThan(score(bonus))
  })

  it('sinks a reaction below every real move, and says why', () => {
    // A reaction happens on someone ELSE's turn. It has no business in a list
    // headed "your turn", however good it is.
    const reaction = opt({ cost: { slot: 'reaction', label: 'Reaction' } })
    const feeble = opt()
    expect(score(reaction)).toBeLessThan(score(feeble))
    expect(why(reaction)).toBe('Not on your turn')
  })

  it('prefers the free swing to the one that burns a slot', () => {
    const free = opt({ dice: '1d8+4' })
    const paid = opt({ dice: '1d8+4', cost: { slot: 'action', label: 'Action', spellSlotLevel: 1 } })
    expect(score(free)).toBeGreaterThan(score(paid))
  })

  it('charges more for a higher tier', () => {
    const first = opt({ cost: { slot: 'action', label: 'Action', spellSlotLevel: 1 } })
    const third = opt({ cost: { slot: 'action', label: 'Action', spellSlotLevel: 3 } })
    expect(score(third)).toBeLessThan(score(first))
  })

  it('charges for a pool spend and for bare limited uses alike', () => {
    const plain = opt()
    const pooled = opt({ cost: { slot: 'action', label: 'Action', resourcePoolId: 'hearth' } })
    // Not every limited thing is a modelled pool yet, so the authored cost
    // label is read as a bridge. Slice 6b removes the need.
    const limited = opt({ cost: { slot: 'action', label: 'Action · 1/2 uses' } })
    expect(pooled.cost.resourcePoolId).toBe('hearth')
    expect(score(pooled)).toBeLessThan(score(plain))
    expect(score(limited)).toBeLessThan(score(plain))
  })

  it('gives a rider its due', () => {
    const bare = opt({ dice: '1d8+4' })
    const withRider = opt({
      dice: '1d8+4',
      rider: {
        known: true,
        property: 'Sap',
        text: 'disadvantage',
        automatic: true,
        expires: 'startOfYourNextTurn',
      },
    })
    expect(score(withRider)).toBeGreaterThan(score(bare))
  })
})

describe('the situational claims', () => {
  const heal = () => opt({ name: 'Mend', detail: 'restores hit points to a creature you touch' })

  it('climbs a heal when he is hurt and sinks it when he is not', () => {
    expect(score(heal(), HURT)).toBeGreaterThan(score(heal(), HEALTHY))
    expect(score(heal(), DYING)).toBeGreaterThan(score(heal(), HURT))
  })

  it('says the situation rather than repeating the price tag', () => {
    // The cost and the dice are printed an inch away on the same row. The one
    // thing the row cannot show for itself is why NOW.
    expect(why(heal(), HEALTHY)).toBe('You are at full health')
    expect(why(heal(), HURT)).toBe('You are hurt')
    expect(why(heal(), DYING)).toBe('You are bloodied')
  })

  it('scales with how hurt he is, not just whether', () => {
    const scratched = { hpFraction: 0.9, bloodied: false, concentratingOn: null }
    expect(score(heal(), scratched)).toBeLessThan(score(heal(), HURT))
  })

  it('warns before it would drop the spell he is already holding', () => {
    const holding: RankContext = { ...HEALTHY, concentratingOn: 'Shield of Faith' }
    const conc = opt({ detail: '1st-level · 60 feet · Concentration · 10 minutes · V, S' })
    expect(score(conc, holding)).toBeLessThan(score(conc, HEALTHY))
    expect(why(conc, holding)).toBe('Would drop Shield of Faith')
  })

  it('is silent about concentration when he holds nothing', () => {
    const conc = opt({ detail: '1st-level · Concentration · V, S' })
    expect(why(conc, HEALTHY)).toBeUndefined()
    expect(score(conc, HEALTHY)).toBe(score(opt({ detail: '1st-level · V, S' }), HEALTHY))
  })

  it('does not flag a spell that needs no concentration', () => {
    const holding: RankContext = { ...HEALTHY, concentratingOn: 'Bless' }
    expect(why(opt({ detail: '2nd-level · Instant · V' }), holding)).toBeUndefined()
  })

  it('lets the loudest reason speak when several apply', () => {
    // A concentration heal while hurt: -45 against +25. The clash is the
    // bigger fact and the one he would regret not being told.
    const both: RankContext = { hpFraction: 0.5, bloodied: false, concentratingOn: 'Bless' }
    const o = opt({ name: 'Warding Bond', detail: 'restores hit points · Concentration · 1 hour' })
    expect(why(o, both)).toBe('Would drop Bless')
  })
})

describe('open-world safety — content the engine has never seen', () => {
  it('says nothing about an option it cannot characterise', () => {
    const alien = opt({ name: 'Wyrdling Gambit', detail: 'the DM decides what happens' })
    expect(why(alien, DYING)).toBeUndefined()
    expect(why(alien, { ...DYING, concentratingOn: 'Bless' })).toBeUndefined()
  })

  it('still scores it, so it is ordered rather than dropped', () => {
    const alien = opt({ name: 'Wyrdling Gambit', detail: 'the DM decides what happens' })
    expect(score(alien)).toBeGreaterThan(0)
  })

  it('reads the author’s own words, not a table of book features', () => {
    // Invented name, invented mechanic, no rules-2024 entry — and it is still
    // recognised as a heal, because its author wrote what it does.
    const homebrew = opt({ name: 'Hearth Rekindled', detail: 'restores 2d6 hit points' })
    expect(why(homebrew, DYING)).toBe('You are bloodied')
  })
})

describe('sortByRank', () => {
  it('puts the highest score first', () => {
    const a = { ...opt(), score: 3 }
    const b = { ...opt(), score: 9 }
    expect(sortByRank([a, b]).map(o => o.score)).toEqual([9, 3])
  })

  it('keeps sheet order on a tie, so the list never shuffles under his thumb', () => {
    const a = { ...opt({ name: 'First' }), score: 5 }
    const b = { ...opt({ name: 'Second' }), score: 5 }
    const c = { ...opt({ name: 'Third' }), score: 5 }
    expect(sortByRank([a, b, c]).map(o => o.name)).toEqual(['First', 'Second', 'Third'])
    expect(sortByRank(sortByRank([a, b, c])).map(o => o.name)).toEqual(['First', 'Second', 'Third'])
  })

  it('does not touch the array it was given', () => {
    const list = [{ ...opt(), score: 1 }, { ...opt(), score: 8 }]
    const before = list.map(o => o.id)
    sortByRank(list)
    expect(list.map(o => o.id)).toEqual(before)
  })
})

describe('withRank', () => {
  it('returns a new option and leaves the original alone', () => {
    const original = opt({ dice: '1d8+4' })
    const out = withRank(original, HEALTHY)
    expect(original.score).toBe(0)
    expect(out.score).toBeGreaterThan(0)
    expect(out).not.toBe(original)
  })

  it('omits `why` entirely rather than setting it to undefined', () => {
    expect('why' in withRank(opt(), HEALTHY)).toBe(false)
  })
})

describe('on Nix’s real sheet', () => {
  const fresh = (over: Partial<CombatState> = {}): CombatState => ({
    inCombat: true,
    round: 1,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    spellSlots: {},
    concentrating: null,
    ...over,
  })

  /* WHOLE vs. the fixture as shipped — Slice R2, 2026-09-04.
   *
   * `NIX` sits at 41 of 76 hp, and until this slice that detail could not be
   * seen from here. rank.ts scores Cure Wounds 31 ("You are hurt") and Lay on
   * Hands 25 against Hearthbrand's 24, so on the shipped fixture rank.ts has
   * ALWAYS wanted to lead with healing. The two tests below only read
   * `ranked[0] === 'Hearthbrand'` because contention deleted rank.ts's top two
   * picks out of `ranked` before anyone could look at them — the screen has
   * never once shown the engine's actual first opinion.
   *
   * So these are not weakened to fit the new behaviour; their subject is made
   * explicit. "Leads with the weapon he actually swings" was always a claim
   * about a paladin who is FINE, and it is asserted here on a paladin who is
   * fine. The claim about a paladin who is hurt is the next test, and it is new
   * because there was previously no way to state it. */
  const WHOLE = { ...NIX, hitPoints: { ...NIX.hitPoints, current: NIX.hitPoints.max } }

  it('leads with the weapon he actually swings, when nothing is wrong with him', () => {
    const turn = composeTurn({ character: WHOLE, combat: fresh() })
    expect(turn.ranked[0].name).toBe('Hearthbrand')
  })

  it('leads with the heal instead once he is hurt, and says why', () => {
    // NIX ships at 41/76 — under the bloodied line's neighbourhood and squarely
    // in "you are hurt" territory. This is rank.ts's own long-standing opinion,
    // reaching the shortlist for the first time.
    const turn = composeTurn({ character: NIX, combat: fresh() })
    expect(turn.ranked[0].name).toBe('Cure Wounds')
    expect(turn.ranked[0].why).toBe('You are hurt')
    expect(turn.ranked[0].score).toBeGreaterThan(
      turn.ranked.find(o => o.name === 'Hearthbrand')!.score,
    )
  })

  it('orders the shortlist by score, descending', () => {
    const scores = composeTurn({ character: NIX, combat: fresh() }).ranked.map(o => o.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('keeps reactions out of the shortlist', () => {
    const turn = composeTurn({ character: NIX, combat: fresh() })
    expect(turn.ranked.every(o => o.cost.slot !== 'reaction')).toBe(true)
    // Not hidden, though — D never hides. It is down in the fold.
    const everywhere = [...turn.ranked, ...turn.rest].map(o => o.name)
    expect(everywhere).toContain('Flaming Cloak')
  })

  it('reorders the bonus-action bracket when he is bleeding', () => {
    // Lay on Hands is one face of the bonus-action decision. At full health it
    // is not what he wants; at 1 hp it is the only thing on the list.
    const healthy = composeTurn({ character: { ...NIX, hitPoints: { current: 76, max: 76 } }, combat: fresh() })
    const dying = composeTurn({ character: { ...NIX, hitPoints: { current: 1, max: 76 } }, combat: fresh() })
    const bracket = (t: ReturnType<typeof composeTurn>) =>
      t.mutex.find(g => g.faces.some(f => f.name === 'Lay on Hands'))!
    const place = (t: ReturnType<typeof composeTurn>) =>
      bracket(t).faces.findIndex(f => f.name === 'Lay on Hands')

    expect(place(dying)).toBeLessThan(place(healthy))
    expect(bracket(dying).faces[0].name).toBe('Lay on Hands')
    expect(bracket(dying).faces[0].why).toBe('You are bloodied')
  })

  it('orders every bracket by score, like every other list on the screen', () => {
    // One rule, applied everywhere. A bracket sorted differently from the list
    // above it would be the screen contradicting itself.
    for (const g of composeTurn({ character: NIX, combat: fresh() }).mutex) {
      const scores = g.faces.map(f => f.score)
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    }
  })

  it('marks a concentration face when one is already held', () => {
    const turn = composeTurn({ character: NIX, combat: fresh({ concentrating: 'Bless' }) })
    const faces = turn.mutex.flatMap(g => g.faces)
    const shield = faces.find(f => f.name === 'Shield of Faith')
    expect(shield?.why).toBe('Would drop Bless')
  })

  /* Nix's sheet lists his best weapon first, so "the shortlist is sorted"
     passes for free on his data — the mutation sweep proved it by deleting the
     sort and watching nothing fail. Hanging a plain, masteryless stick off the
     front of the pack puts sheet order in direct opposition to score, so the
     claim has to be earned. */
  const JUNK = { ...NIX.weapons[0], name: 'Bent Spoon', masteryProperty: undefined }
  const REVERSED = { ...NIX, weapons: [JUNK, ...NIX.weapons] }

  it('sorts the shortlist even when sheet order fights it', () => {
    // Built on WHOLE for the reason given above: this test is about SHEET ORDER
    // losing to score, so it must not also be about a wound. A hurt paladin
    // would put Cure Wounds on the front and the sheet-order claim would pass
    // without ever exercising the weapons against each other.
    const turn = composeTurn({ character: { ...REVERSED, hitPoints: WHOLE.hitPoints }, combat: fresh() })
    expect(turn.ranked.map(o => o.name)).toContain('Bent Spoon')
    expect(turn.ranked[0].name).toBe('Hearthbrand')
    const scores = turn.ranked.map(o => o.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('sorts the greyed list too, so the fold is not a wall of text', () => {
    // Everything spent: the whole sheet greys out at once. The thing he most
    // wishes he could do should still be the first thing he cannot do.
    const spent = fresh({ turnActions: { action: true, bonusAction: true, reaction: true, movement: true } })
    const turn = composeTurn({ character: REVERSED, combat: spent })
    const greyed = turn.rest.filter(o => !o.available)
    expect(greyed.length).toBeGreaterThan(2)
    expect(greyed.map(o => o.score)).toEqual([...greyed.map(o => o.score)].sort((a, b) => b - a))
  })

  it('does not keep rewarding a heal below zero', () => {
    // 2024 leaves you at 0 and dying, not at -5, but a sheet can hold anything
    // and an unclamped fraction would pay a bigger and bigger bonus the deeper
    // the number went. Down is down.
    const at = (current: number) => {
      const t = composeTurn({ character: { ...NIX, hitPoints: { current, max: 76 } }, combat: fresh() })
      return t.mutex.flatMap(g => g.faces).find(f => f.name === 'Lay on Hands')!.score
    }
    expect(at(-5)).toBe(at(0))
  })

  it('never produces a NaN score on a sheet with no hit points', () => {
    // A half-built character divides by zero if nobody guards it, and NaN
    // sorts into an arbitrary position — the list would silently scramble.
    const turn = composeTurn({ character: { ...NIX, hitPoints: { current: 0, max: 0 } }, combat: fresh() })
    const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    expect(all.length).toBeGreaterThan(0)
    expect(all.every(o => Number.isFinite(o.score))).toBe(true)
  })

  it('still lists every option it listed before ranking existed', () => {
    // Ranking reorders. It must never subtract — the V0.9 prime law.
    const turn = composeTurn({ character: NIX, combat: fresh() })
    const total = turn.ranked.length + turn.rest.length + turn.mutex.flatMap(g => g.faces).length
    const unranked = composeTurn({ character: NIX, combat: fresh(), shortlistSize: 999 })
    const unrankedTotal =
      unranked.ranked.length + unranked.rest.length + unranked.mutex.flatMap(g => g.faces).length
    expect(total).toBe(unrankedTotal)
  })
})

describe('the reaction weight, read twice — Slice 7', () => {
  /* One fact about the world — whose turn it is — read from both sides. The
     same weight that buries a reaction on your turn is what lifts it during
     the moment, and the tests below are the argument for the sign flip and,
     separately, for the SILENCE that goes with it. */

  const MOMENT: RankContext = { ...HEALTHY, yourTurn: false }
  const react = () => opt({ cost: { slot: 'reaction', label: 'Reaction' } })

  it('buries a reaction below a bonus action on your turn', () => {
    expect(score(react())).toBeLessThan(score(opt({ cost: { slot: 'bonusAction', label: 'Bonus' } })))
  })

  it('lifts it above an action during the moment', () => {
    // Above `action`, not merely positive: off-turn an action is not weaker
    // than a reaction, it is illegal, and the ordering has to say so.
    expect(score(react(), MOMENT)).toBeGreaterThan(score(opt(), MOMENT))
  })

  it('flips the sign rather than merely softening it', () => {
    expect(score(react())).toBeLessThan(0)
    expect(score(react(), MOMENT)).toBeGreaterThan(0)
  })

  it('says "Not on your turn" only when that is true', () => {
    expect(why(react())).toBe('Not on your turn')
    expect(why(react(), MOMENT)).toBeUndefined()
  })

  it('stays silent during the moment rather than repeating the screen', () => {
    // The band above the list already says someone else is acting. A row that
    // says it again, quieter, is the "Undertow — Undertow" fault of Slice 6c.
    // Silence here is a decision, so it is pinned like one.
    expect(scoreOption(react(), MOMENT).factors.some(f => f.phrase !== undefined)).toBe(false)
  })

  it('leaves a heal free to outrank the reaction when he is dying', () => {
    // The lift must not become a rule that a reaction always wins. Off-turn a
    // heal is blocked anyway, but the ranking is not allowed to depend on that
    // — the composer blocks rows, this file only orders them.
    const heal = opt({ detail: 'restores hit points' })
    expect(score(heal, { ...DYING, yourTurn: false })).toBeGreaterThan(score(react(), MOMENT))
  })

  it('treats an absent yourTurn exactly as it treated every caller before it', () => {
    // The field is optional so that Marcus's saved encounters, and every
    // context written before Slice 7, keep their meaning rather than silently
    // acquiring the opposite one.
    const explicit: RankContext = { ...HEALTHY, yourTurn: true }
    expect(scoreOption(react(), HEALTHY)).toStrictEqual(scoreOption(react(), explicit))
  })

  it('does not touch an action, a bonus action or a free thing', () => {
    for (const cost of [
      { slot: 'action' as const, label: 'Action' },
      { slot: 'bonusAction' as const, label: 'Bonus' },
      { slot: 'free' as const, label: 'Free' },
    ]) {
      const o = opt({ cost })
      expect(score(o, MOMENT)).toBe(score(o))
    }
  })
})
