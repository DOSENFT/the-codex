import { describe, it, expect } from 'vitest'
import { composeTurn } from './compose'
import { reactionRows, type ReactionRow } from './reactions'
import { NIX } from './fixtures/nix'
import { DETAIL_BUDGET_CHARS } from './overlay'

/* ============================================================================
   SLICE 6 — the reaction band's data.

   Marcus's words: the combat tab "doesn't show my reactions (like hearth fire
   manifest and what it does or when i can use it)". Every test below is one of
   those two questions, or the bug that would stop them being answered.
   ========================================================================= */

function turnWith(yourTurn: boolean) {
  return composeTurn({
    character: NIX,
    combat: {
      inCombat: true,
      round: 3,
      yourTurn,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
      concentrating: null,
      conditions: [],
    } as never,
  })
}

const rowsOn = () => reactionRows(turnWith(true), NIX)
const rowsOff = () => reactionRows(turnWith(false), NIX)

describe('reactionRows — the bug Gate 3 was about to ship', () => {
  /* 03-program-design.md:285 said "Your Reactions = turn.ranked.filter(slot ===
     'reaction')". rank.ts scores a reaction at −40 ON YOUR TURN, which drops
     both of Nix's out of `ranked` and into `rest`. A band built on that line
     paints EMPTY for the whole of his turn. */
  it('finds both reactions ON your turn, when ranked does not contain them', () => {
    const ranked = turnWith(true).ranked.filter(o => o.cost.slot === 'reaction')
    expect(ranked.length, 'the premise: rank.ts demotes reactions on your turn').toBe(0)
    expect(rowsOn().map(r => r.name)).toEqual([
      'Opportunity Attack — Hearthbrand',
      'Flaming Cloak',
    ])
  })

  it('finds the same two OFF your turn', () => {
    expect(rowsOff().map(r => r.name)).toEqual(rowsOn().map(r => r.name))
  })

  it('says the same thing in both states — a reaction does not change mid-round', () => {
    /* SCOPED TO WHAT THE ROW SAYS, and the scoping is the interesting part.

       Slice 7 added `option`: the whole TurnOption the row was built from, so
       the detail sheet opens on the same object the row was made of rather
       than looking the id up a second time. That option carries rank.ts's
       verdict — `score` and `why` — and rank.ts is turn-dependent BY DESIGN: a
       reaction scores −40 on your turn and +40 off it, which is the very fact
       the first test in this file exists to pin.

       So comparing the rows whole now fails on the one field that is SUPPOSED
       to differ. Dropping `option` to get back to green would delete the tap
       target; loosening the assertion to the names would stop testing
       anything. Instead: every STATED field is still compared whole, the
       option is compared on everything the sheet reads, and the turn-dependent
       pair is then asserted to be the only difference — so a body, a trigger
       or an availability that started varying with the turn still fails. */
    const stated = ({ option: _option, ...row }: ReactionRow) => row
    expect(rowsOff().map(stated)).toEqual(rowsOn().map(stated))

    const identity = (row: ReactionRow) => {
      const { score: _score, why: _why, ...rest } = row.option
      return rest
    }
    expect(rowsOff().map(identity)).toEqual(rowsOn().map(identity))

    // The premise of the scoping above, stated so it cannot rot into a
    // comparison of two identical things.
    expect(rowsOff().map(r => r.option.score)).not.toEqual(rowsOn().map(r => r.option.score))
  })

  it('lists nothing twice, whichever bucket the engine used', () => {
    const ids = rowsOn().map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never lists a non-reaction', () => {
    const reactionIds = new Set(
      [...turnWith(true).ranked, ...turnWith(true).rest, ...turnWith(true).mutex.flatMap(g => g.faces)]
        .filter(o => o.cost.slot === 'reaction')
        .map(o => o.id)
    )
    for (const row of rowsOn()) expect(reactionIds.has(row.id)).toBe(true)
  })
})

describe('reactionRows — question one: when can I use it?', () => {
  it('Opportunity Attack states its trigger, from the sheet', () => {
    const row = rowsOn().find(r => r.name.startsWith('Opportunity'))!
    expect(row.whenSource).toBe('declared')
    expect(row.when).toBe('When a creature you can see leaves your reach')
  })

  it('and does not repeat the trigger in the body', () => {
    const row = rowsOn().find(r => r.name.startsWith('Opportunity'))!
    expect(row.body).not.toContain('When a creature')
  })

  it('Flaming Cloak states NO trigger, and the row admits it', () => {
    const row = rowsOn().find(r => r.name === 'Flaming Cloak')!
    expect(row.when).toBeNull()
    expect(row.whenSource).toBe('unstated')
  })

  it('and hands the row canon\'s four errata to point at', () => {
    const row = rowsOn().find(r => r.name === 'Flaming Cloak')!
    expect(row.errataIds).toContain('HEARTH-03')
    expect(row.errataIds.length).toBe(4)
  })
})

describe('reactionRows — question two: what does it do?', () => {
  it('the cloak states the temp HP it actually grants HIM — 12', () => {
    /* Before slice 6 this row read "1d10 Fire · recharges on short rest": the
       retaliation only, which reads as though the cloak DEALS 1d10 when you use
       it, and never mentions the temp HP that are the entire point. */
    const row = rowsOn().find(r => r.name === 'Flaming Cloak')!
    expect(row.body).toBe('12 temp HP · 1d10 Fire retaliation')
    expect(row.provenance).toBe('canon')
  })

  it('the number is computed, so canon\'s frozen 11 never reaches the screen', () => {
    const row = rowsOn().find(r => r.name === 'Flaming Cloak')!
    expect(row.body).not.toContain('11 temp HP')
    const levelled = reactionRows(
      composeTurn({ character: { ...NIX, level: 9 }, combat: null }),
      { ...NIX, level: 9 }
    ).find(r => r.name === 'Flaming Cloak')!
    expect(levelled.body).toContain('13 temp HP')
  })

  it('a row canon has no record for keeps the sheet\'s own words', () => {
    const row = rowsOn().find(r => r.name.startsWith('Opportunity'))!
    expect(row.provenance).toBe('sheet')
    expect(row.body).toContain('1d8+4 Slashing')
  })

  it('every body fits the row budget, and none of them ellipsises', () => {
    for (const row of [...rowsOn(), ...rowsOff()]) {
      expect(row.body.length, `${row.name}: ${row.body}`).toBeLessThanOrEqual(
        DETAIL_BUDGET_CHARS
      )
      expect(row.body).not.toContain('…')
      expect(row.body).not.toContain('...')
    }
  })

  it('carries the cost line the engine computed, uses and all', () => {
    const byName = new Map(rowsOn().map(r => [r.name, r]))
    expect(byName.get('Opportunity Attack — Hearthbrand')!.cost).toBe('Reaction')
    expect(byName.get('Flaming Cloak')!.cost).toBe('Reaction · 1/2 uses')
  })

  it('marks the homebrew one as homebrew and does not hide it', () => {
    expect(rowsOn().find(r => r.name === 'Flaming Cloak')!.homebrew).toBe(true)
  })
})

describe('reactionRows — the open-world rule', () => {
  it('a character with no reactions gets an empty list, never a throw', () => {
    const bare = { ...NIX, features: [], weapons: [], spells: [] }
    expect(() => reactionRows(composeTurn({ character: bare, combat: null }), bare)).not.toThrow()
  })

  it('is deterministic — the same turn produces the same rows', () => {
    expect(reactionRows(turnWith(true), NIX)).toEqual(reactionRows(turnWith(true), NIX))
  })
})
