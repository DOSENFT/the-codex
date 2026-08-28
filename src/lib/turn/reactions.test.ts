import { describe, it, expect } from 'vitest'
import { composeTurn } from './compose'
import { reactionRows, type ReactionRow } from './reactions'
import { NIX } from './fixtures/nix'
import { DETAIL_BUDGET_CHARS } from './overlay'
import { setRuling } from '../errata-rulings'

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
       it, and never mentions the temp HP that are the entire point.

       Slice 10e adds "(free)". Marcus, sending his real sheet on 2026-08-27:
       Hearthfire Manifest is "a bonus action, then it's a reaction 1d10 damage
       if I get hit". Canon's own paragraph says the ACTIVATION is the Reaction
       and then "the creature takes 1d10 Fire damage in retaliation" — every
       hit, no cap, nothing to decide, nothing to pay. He was holding a reaction
       in reserve for something that was already his. The row said "1d10 Fire
       retaliation" and left the price blank, and blank reads as expensive.

       Still 12, still 1d10, still one row: 8b's law holds. */
    const row = rowsOn().find(r => r.name === 'Flaming Cloak')!
    expect(row.body).toBe('12 temp HP · 1d10 Fire retaliation (free)')
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

/* ============================================================================
   SLICE 8b — the ruling reaches the row.

   The law, and every test below is one half of it:

       A RULING CHANGES WHAT THE APP SAYS. IT NEVER CHANGES WHAT THE APP
       COMPUTES.

   So: the WHEN line moves and names its source (the "says" half), and the temp
   HP, the retaliation die, the cost line, the uses and the availability are
   asserted BYTE-IDENTICAL either side of the ruling (the "computes" half). The
   second half is the one worth having — an app that quietly recomputes a number
   because a flag got answered is the failure mode canon's HEARTH-01 names in as
   many words.
   ========================================================================= */

const AT = new Date('2026-08-27T12:00:00.000Z')
const cloakOf = (rows: ReactionRow[]) => rows.find(r => r.name === 'Flaming Cloak')!
const oaOf = (rows: ReactionRow[]) => rows.find(r => r.name.startsWith('Opportunity'))!

describe('reactionRows — a recorded ruling answers "when can I use it?"', () => {
  it('omitting the rulings reproduces the slice 6 row exactly', () => {
    /* The compatibility claim the optional third parameter rests on. Every
       caller written before 8b — and `ReactionsBand` without the prop — must
       still get the row that says nobody stated a trigger. */
    expect(reactionRows(turnWith(true), NIX, {})).toEqual(reactionRows(turnWith(true), NIX))
    expect(cloakOf(reactionRows(turnWith(true), NIX, {})).when).toBeNull()
  })

  it('canon’s printed fix, once chosen, becomes the cloak’s trigger', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, AT)
    const row = cloakOf(reactionRows(turnWith(true), NIX, rulings))
    expect(row.when).toBe('when you take damage')
    expect(row.whenSource).toBe('ruled')
    expect(row.whenRuling).toEqual({
      when: 'when you take damage',
      erratumId: 'HEARTH-03',
      via: 'canon',
    })
  })

  it('the DM’s own words outrank canon’s, and arrive verbatim', () => {
    const wording = 'When you or an ally within 30 feet takes Fire damage'
    const rulings = setRuling({}, 'HEARTH-03', 'dm', wording, AT)
    const row = cloakOf(reactionRows(turnWith(true), NIX, rulings))
    expect(row.when).toBe(wording)
    expect(row.whenRuling?.via).toBe('dm')
  })

  it('NEVER arrives without saying whose ruling it is', () => {
    /* An unattributed clause on this row is indistinguishable from the invented
       trigger slice 6 refused to ship. If `when` moved off `unstated`, the
       attribution is mandatory. */
    for (const rulings of [
      setRuling({}, 'HEARTH-03', 'canon', undefined, AT),
      setRuling({}, 'HEARTH-03', 'dm', 'When you take damage', AT),
    ]) {
      const row = cloakOf(reactionRows(turnWith(true), NIX, rulings))
      expect(row.whenSource).toBe('ruled')
      expect(row.whenRuling?.erratumId).toBe('HEARTH-03')
    }
  })

  it('leaves the row alone for a ruling that is not a trigger', () => {
    /* HEARTH-04 is about temp HP stacking. Answering it is a real decision and
       slice 8's band goes on showing it — but it is not an answer to "when", and
       putting it on the WHEN line would be the app putting words in the DM's
       mouth. */
    const rulings = setRuling({}, 'HEARTH-04', 'dm', 'temp HP does not stack, my call', AT)
    expect(cloakOf(reactionRows(turnWith(true), NIX, rulings)))
      .toEqual(cloakOf(reactionRows(turnWith(true), NIX)))
  })

  it('an unanswered flag is not quietly an answer', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'unasked', undefined, AT)
    expect(cloakOf(reactionRows(turnWith(true), NIX, rulings)).when).toBeNull()
  })

  it('does not reach a row canon holds no errata on', () => {
    /* Opportunity Attack is the sheet's, not canon's. A ruling recorded against
       a Hearthfire erratum must not leak onto it — the errata are fetched PER
       ROW, from the feature that row matched. */
    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, AT)
    const row = oaOf(reactionRows(turnWith(true), NIX, rulings))
    expect(row.errataIds).toEqual([])
    expect(row.whenSource).toBe('declared')
    expect(row).toEqual(oaOf(reactionRows(turnWith(true), NIX)))
  })
})

describe('reactionRows — a ruling changes what it SAYS, never what it COMPUTES', () => {
  const before = cloakOf(reactionRows(turnWith(true), NIX))
  const after = cloakOf(
    reactionRows(turnWith(true), NIX, setRuling({}, 'HEARTH-03', 'canon', undefined, AT))
  )

  it('moves the WHEN line, and only the WHEN line', () => {
    const said = ({ when: _w, whenSource: _s, whenRuling: _r, ...rest }: ReactionRow) => rest
    expect(said(after)).toEqual(said(before))
  })

  it('does not touch a single number: temp HP, die, cost, uses', () => {
    // "(free)" arrived in slice 10e and is not a number — see the pin in
    // "question two" above for why the price is now stated. What this test
    // guards is unchanged and still holds: a RULING moves neither.
    expect(after.body).toBe('12 temp HP · 1d10 Fire retaliation (free)')
    expect(after.body).toBe(before.body)
    expect(after.cost).toBe('Reaction · 1/2 uses')
    expect(after.cost).toBe(before.cost)
  })

  it('does not unblock or block anything', () => {
    expect(after.available).toBe(before.available)
    expect(after.blockedReason).toBe(before.blockedReason)
  })

  it('does not change what canon is flagged as holding', () => {
    /* Answering one of the four errata does not make it stop existing. The
       ⚑ count is what canon HOLDS, not what is outstanding — the outstanding
       count is the Rules-flags band's job, and it is a different number. */
    expect(after.errataIds).toEqual(before.errataIds)
    expect(after.errataIds.length).toBe(4)
  })

  it('does not alter the option the detail sheet opens on', () => {
    expect(after.option).toEqual(before.option)
  })

  it('is still ellipsis-free and still inside the row budget', () => {
    expect(after.body.length).toBeLessThanOrEqual(DETAIL_BUDGET_CHARS)
    expect(after.when!.length).toBeGreaterThan(0)
    expect(`${after.when} ${after.body}`).not.toMatch(/…|\.\.\./)
  })
})
