import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { groupBySlot, type BandSlot } from '../../lib/turn/bands'
import { NIX } from '../../lib/turn/fixtures/nix'
import { isWeaponAttack } from '../../lib/rules-2024/attacks'
import { reconcile, reduce, takenFrom } from '../../lib/turn/reduce'
import type { CombatState } from '../../lib/combat-state'
import type { TurnAttack, TurnOption } from '../../lib/turn/types'
import { AttackTally, SwingAgain, midAttack } from './AttackTally'
import { Act } from './TurnRow'
import { TurnBands } from './TurnBands'

/* ============================================================================
   SLICE R6 — THE HELD ACTION BECOMES VISIBLE.

   Marcus, 2026-09-04: "It also doesnt allow me to take my two mele attacks."

   R5 made the second swing REAL and made none of it VISIBLE. After his first
   tap the engine holds the Action open, the weapon row stays live and six other
   rows grey with the true reason — and the one row he needs is the only row on
   the screen that says nothing, under a header still reading `ACTION · open`.
   An app that is right and silent is indistinguishable, at a table under a six
   second clock, from an app that ignored the tap.

   So the count leaves the engine and lands in two places:

     · a chip in the band HEADER   — "1 of 2 used", where he looks first
     · a line on the WEAPON ROW    — "1 attack left · Swing again"

   WHAT MAKES THESE TESTS ABLE TO FAIL. Every one is red against the build R5
   shipped: `AttackTally.tsx` did not exist, `TurnBands` had no `headNote` prop,
   and `ComposedTurn` had no `attack` field to read.
   ========================================================================== */

const ALL_OPEN = { action: true, bonusAction: true, reaction: true, movement: true, free: true }

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
  concentrating: null,
}

const WEAPON = 'Hearthbrand'

function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The markup of ONE band. Per-band facts must be asked per band: mid-Attack the
 *  chip is in ACTION and must be nowhere near BONUS, and a whole-screen
 *  `toContain` cannot tell those two apart. Lifted from
 *  `ContentionNote.test.tsx`, which needed it for the same reason. */
function band(html: string, label: string): string {
  const parts = html.split('<section class="band')
  const hit = parts.find(p => p.includes(`class="blbl">${label}<`))
  expect(hit, `no ${label} band in this markup`).toBeDefined()
  return hit!
}

/** The screen BEFORE any swing, and the screen one swing in — composed the long
 *  way round, through the real reducer, so that "mid-Attack" here means the same
 *  thing it means in his browser rather than a hand-set number that happens to
 *  agree with it today. */
const BEFORE = composeTurn({ character: NIX, combat: FIGHTING })

const MID = (() => {
  const start = reconcile({ character: NIX, combat: FIGHTING })
  const swing = [...BEFORE.ranked, ...BEFORE.rest].find(o => o.name === WEAPON)
  expect(swing, `no option named ${WEAPON} on the fixture`).toBeDefined()
  const after = reduce(start, { type: 'takeOption', option: takenFrom(swing!) }, [])
  expect(after.refused, `the reducer refused the first swing: ${after.refused}`).toBeUndefined()
  return composeTurn({ character: after.state.character, combat: after.state.combat })
})()

/** The real wiring, copied from `TurnLive` rather than invented, so that a
 *  divergence between what ships and what is tested turns this file red. */
const headNote = (turn = MID) => (slot: BandSlot) =>
  slot === 'action' ? <AttackTally attack={turn.attack} /> : null

const rowExtra = (turn = MID) => (option: TurnOption) =>
  isWeaponAttack(option) && midAttack(turn.attack) ? <SwingAgain attack={turn.attack} /> : null

const paint = (turn = MID, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <TurnBands
      bands={groupBySlot(turn)}
      open={ALL_OPEN}
      onOpen={() => {}}
      headNote={headNote(turn)}
      {...props}
    />,
  )

// ---------------------------------------------------------------------------
// 1. the premise
// ---------------------------------------------------------------------------

describe('the fixture is actually mid-Attack — the premise of everything below', () => {
  it('two attacks, one of them taken', () => {
    // A file of green assertions about `{used: 0, of: 1}` would prove nothing,
    // so the premise is asserted before anything is built on it.
    expect(BEFORE.attack).toStrictEqual({ used: 0, of: 2 })
    expect(MID.attack).toStrictEqual({ used: 1, of: 2 })
  })

  it('and the weapon row is still his to press', () => {
    const swing = [...MID.ranked, ...MID.rest].find(o => o.name === WEAPON)
    expect(swing?.available).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. the predicate
// ---------------------------------------------------------------------------

describe('midAttack is strictly between', () => {
  it('is false at both ends and true in the middle', () => {
    expect(midAttack({ used: 0, of: 2 })).toBe(false)
    expect(midAttack({ used: 1, of: 2 })).toBe(true)
    expect(midAttack({ used: 2, of: 2 })).toBe(false)
  })

  it('is false for anyone with one attack, at any count', () => {
    expect(midAttack({ used: 0, of: 1 })).toBe(false)
    expect(midAttack({ used: 1, of: 1 })).toBe(false)
  })

  it('holds through the middle of a Fighter’s three', () => {
    expect(midAttack({ used: 1, of: 3 })).toBe(true)
    expect(midAttack({ used: 2, of: 3 })).toBe(true)
    expect(midAttack({ used: 3, of: 3 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. the header chip
// ---------------------------------------------------------------------------

describe('the tally in the band header', () => {
  it('says nothing when there is nothing to count', () => {
    // A Cleric's Action band must be exactly what it was before this slice.
    expect(renderToStaticMarkup(<AttackTally attack={{ used: 0, of: 1 }} />)).toBe('')
  })

  it('prints BEFORE the first swing, at zero', () => {
    /* THE DECISION MOST WORTH CHALLENGING, ASSERTED SO IT IS A DECISION.
       `BandHead` already prints "0 ready" and says why in its own comment: a
       count that disappeared at zero leaves the band looking identical to one
       that has no such rule at all. That is the whole of Marcus's complaint —
       the app never told him it knew he had two attacks — so the chip has to be
       on the screen he is READING, not only the one he reaches after tapping. */
    expect(text(renderToStaticMarkup(<AttackTally attack={{ used: 0, of: 2 }} />))).toBe(
      '0 of 2 used',
    )
  })

  it('counts up as he swings', () => {
    expect(text(renderToStaticMarkup(<AttackTally attack={MID.attack} />))).toBe('1 of 2 used')
    expect(text(renderToStaticMarkup(<AttackTally attack={{ used: 2, of: 2 }} />))).toBe(
      '2 of 2 used',
    )
  })

  it('holds a number bigger than two without special-casing it', () => {
    // Fighters reach three at 11 and four at 20, and `EXTRA_ATTACK_AT` exists in
    // the shape it does precisely so the engine can say so. The chip must not
    // be the place that quietly assumes everyone is a Paladin.
    expect(text(renderToStaticMarkup(<AttackTally attack={{ used: 2, of: 4 }} />))).toBe(
      '2 of 4 used',
    )
  })
})

// ---------------------------------------------------------------------------
// 4. the line on the weapon row
// ---------------------------------------------------------------------------

describe('the row offers the second swing', () => {
  it('says how many are left, and what to do about it', () => {
    const t = text(renderToStaticMarkup(<SwingAgain attack={MID.attack} />))
    expect(t).toContain('1 attack left')
    expect(t).toContain('Swing again')
  })

  it('is silent before the first swing — a "swing again" on a swing not yet taken is a lie', () => {
    expect(renderToStaticMarkup(<SwingAgain attack={{ used: 0, of: 2 }} />)).toBe('')
  })

  it('is silent once the action is genuinely spent', () => {
    expect(renderToStaticMarkup(<SwingAgain attack={{ used: 2, of: 2 }} />)).toBe('')
  })

  it('is silent for a character with one attack', () => {
    expect(renderToStaticMarkup(<SwingAgain attack={{ used: 0, of: 1 }} />)).toBe('')
  })

  it('counts in plural when a Fighter has two left', () => {
    const t = text(renderToStaticMarkup(<SwingAgain attack={{ used: 1, of: 3 }} />))
    expect(t).toContain('2 attacks left')
    expect(t).not.toContain('2 attack left')
  })

  it('agrees with the number the greyed rows print', () => {
    /* ONE PAIR OF NUMBERS, TWO SENTENCES. The composer writes "1 attack left"
       into every blocked action row's reason; this row says the same thing to
       the one option that is NOT blocked. They are read off the same
       `turn.attack`, and this is the test that would catch it if a later change
       gave them separate sources. */
    const blocked = [...MID.ranked, ...MID.rest].find(o => o.blockedReason?.includes('attack'))
    expect(blocked, 'nothing is blocked mid-Attack, so this test proves nothing').toBeDefined()
    const left = MID.attack.of - MID.attack.used
    expect(blocked!.blockedReason).toContain(`${left} attack`)
    expect(text(renderToStaticMarkup(<SwingAgain attack={MID.attack} />))).toContain(
      `${left} attack`,
    )
  })
})

// ---------------------------------------------------------------------------
// 5. through the bands, where he actually sees it
// ---------------------------------------------------------------------------

describe('the header carries it, and only the band it is about', () => {
  it('puts the chip inside the ACTION header', () => {
    const head = band(paint(), 'Action').split('</button>')[0]!
    expect(head).toContain('batk')
    expect(text(head)).toContain('1 of 2 used')
  })

  it('and leaves BONUS, REACTION and MOVEMENT untouched', () => {
    // Extra Attack is a rule about the Action. A tally on the Bonus band would
    // be furniture at best and a wrong rule at worst.
    const html = paint()
    for (const label of ['Bonus', 'Reaction', 'Movement']) {
      expect(band(html, label)).not.toContain('batk')
    }
  })

  it('sits between the ready count and the open/spent word', () => {
    // Two counts belong beside each other; the state word and the caret are the
    // header's furniture and stay at its end.
    const head = band(paint(), 'Action').split('</button>')[0]!
    expect(head.indexOf('class="bn"')).toBeLessThan(head.indexOf('batk'))
    expect(head.indexOf('batk')).toBeLessThan(head.indexOf('bstate'))
  })

  it('a band given no headNote is BYTE-IDENTICAL to one rendered without the prop', () => {
    /* THIS SLICE MOVES NO PIXEL ON ANY SCREEN IT IS NOT ABOUT, and that is a
       claim a string comparison can settle. Every other tab, and every band but
       Action, renders through this same component. */
    const bands = groupBySlot(BEFORE)
    const withProp = renderToStaticMarkup(
      <TurnBands bands={bands} open={ALL_OPEN} onOpen={() => {}} headNote={() => null} />,
    )
    const without = renderToStaticMarkup(
      <TurnBands bands={bands} open={ALL_OPEN} onOpen={() => {}} />,
    )
    expect(withProp).toBe(without)
  })
})

// ---------------------------------------------------------------------------
// 6. the trap
// ---------------------------------------------------------------------------

describe('a row with nothing to add is not a row with an empty box', () => {
  /* `Act` chooses between two DIFFERENT markups on the truthiness of `extra`
     (TurnRow.tsx:105) — a bare `button.act`, or `div.act.hasx` holding
     `button.acthit` plus `div.actx` with a hairline above it. A React element
     that RENDERS null is still a truthy element, so a `rowExtra` that returned
     `<SwingAgain/>` unconditionally would give every weapon attack in the app a
     permanent empty box under it, on every turn, forever — and it would look
     like a styling bug rather than like this. That is why `midAttack` is an
     exported predicate at all, and why `TurnLive` calls it BEFORE building the
     node. These two tests are what keep it from being tidied away. */

  const swingRow = (turn: typeof MID) =>
    [...turn.ranked, ...turn.rest].find(o => o.name === WEAPON)!

  it('the weapon row before the first swing has no extra at all', () => {
    const o = swingRow(BEFORE)
    const html = renderToStaticMarkup(<Act o={o} extra={rowExtra(BEFORE)(o)} />)
    expect(html).not.toContain('hasx')
    expect(html).not.toContain('actx')
  })

  it('and mid-Attack it has one, with the offer in it', () => {
    const o = swingRow(MID)
    const html = renderToStaticMarkup(<Act o={o} extra={rowExtra(MID)(o)} />)
    expect(html).toContain('hasx')
    expect(text(html)).toContain('Swing again')
  })

  it('a spell row gets nothing, mid-Attack or not', () => {
    // The offer is for the thing Extra Attack multiplies and for nothing else.
    // Decided by `isWeaponAttack` — the same predicate the reducer uses — so the
    // row that lights up is exactly the row the reducer will accept.
    const spell = [...MID.ranked, ...MID.rest].find(o => o.kind === 'spell')
    expect(spell).toBeDefined()
    expect(rowExtra(MID)(spell!)).toBeNull()
  })

  it('an opportunity attack gets nothing either, because it is not the Attack action', () => {
    const opportunity = [...MID.ranked, ...MID.rest].find(
      o => o.kind === 'attack' && o.cost.slot === 'reaction',
    )
    expect(opportunity, 'the fixture has no reaction attack, so this proves nothing').toBeDefined()
    expect(rowExtra(MID)(opportunity!)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 7. the type, as a contract
// ---------------------------------------------------------------------------

describe('the chip reads the turn and computes nothing', () => {
  it('renders whatever the engine says, including a count it disagrees with', () => {
    /* THE COMPONENT HAS NO OPINION, and that is the property worth pinning. If
       it ever recomputed `of` from the character it would become a second
       authority on Extra Attack, and the day the two drifted the header would
       contradict the rows underneath it while looking entirely confident. Hand
       it a shape no Paladin has and it prints that shape. */
    const impossible: TurnAttack = { used: 5, of: 9 }
    expect(text(renderToStaticMarkup(<AttackTally attack={impossible} />))).toBe('5 of 9 used')
  })
})
