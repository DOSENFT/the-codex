import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Character } from '../../lib/character'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { DiceControlContext } from '../DiceControl'
import { TurnRail, TurnVerbs } from './TurnRail'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   THE RAIL — slice 4, and program-design test 13.

   Test 13 is written as BOTH HALVES on purpose: "`paladinResources` present →
   the controls paint; absent → they do not, and nothing throws." A test that
   only looked for the controls would pass on a rail that painted them for
   everybody, which is the fault it exists to catch — his own export is the
   second case, and two features he cannot see to miss are exactly the ones a
   one-sided check loses.

   Reading the code to write these turned up a third case the plan did not
   have, and it matters more than either: `poolsOf` resolves a pool from THREE
   places, and `paladinResources` is only the first. NIX carries "Lay on Hands"
   and "Channel Divinity: Sacred Weapon" as FEATURES with `usesMax`/
   `usesCurrent` — the smuggling route resources.ts's header describes — so a
   sheet with no `paladinResources` at all can still have both pools. The rail
   must draw them there too, or the open-world rule is broken in the one file
   that most needs it.

   Every marker below is an ACCESSIBLE NAME the component gives itself, never a
   class name and never prose, so a restyle cannot make this test quietly stop
   looking at anything.
   ========================================================================== */

const turnOf = (c: Character) => composeTurn({ character: c, combat: null })

/** NIX with the prototype's block on it — `paladinResourcesFor(7)`, written
 *  literally rather than imported, because a fixture computed by the code
 *  under test cannot show that code being wrong.
 *
 *  BOTH NUMBERS ARE COPIED OUT OF CANON, level 7: `layOnHandsPool: 35` and
 *  `channelDivinityUses: 2` (`src/canon/paladin-progression.json:179,188`).
 *  Written from memory the first time, Channel Divinity said 3 — which is level
 *  ELEVEN's row — and this file went green on it, because `renderToStaticMarkup`
 *  paints whatever it is handed and never runs `applyPoolMaxima`. The browser
 *  prover is what caught it, by watching the number drop 3 → 2 on the first
 *  write. "Written literally rather than imported" buys independence from the
 *  code; it does not buy correctness, and the source still has to be READ. */
const WITH_BLOCK: Character = {
  ...NIX,
  paladinResources: {
    layOnHands: { max: 35, current: 35 },
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  },
}

/** Neither route. No `paladinResources`, and no feature declaring both halves
 *  of a counter — which is `poolsOf`'s own definition of "not a pool". */
const NO_POOLS: Character = {
  ...NIX,
  features: NIX.features.map(f => {
    const { usesMax: _max, usesCurrent: _cur, ...rest } = f
    return rest
  }),
}

const rail = (c: Character, extra: Partial<Parameters<typeof TurnRail>[0]> = {}) => {
  const turn = turnOf(c)
  return renderToStaticMarkup(
    <TurnRail
      spellSlots={turn.spellSlots}
      resources={turn.resources}
      onExpendSlot={() => {}}
      onRestoreSlot={() => {}}
      onSpendResource={() => {}}
      {...extra}
    />,
  )
}

/** SLICE 7 — the verbs are their own component now, mounted in the scroller
 *  rather than on the pinned strip, so the tests that were about them follow
 *  them here instead of being deleted. They assert exactly what they asserted
 *  on the rail: the dice seam, and one-of-Start/End-never-both. Nothing about
 *  those two rules changed; only where the row is painted did. */
const verbs = (extra: Partial<Parameters<typeof TurnVerbs>[0]> = {}) =>
  renderToStaticMarkup(
    <TurnVerbs
      inCombat
      onLookup={() => {}}
      onReset={() => {}}
      onStartCombat={() => {}}
      onEndCombat={() => {}}
      {...extra}
    />,
  )

/** Accessible names, in document order. `aria-label` only — every control on
 *  the rail carries one except the two whose visible words ARE the name. */
const labels = (html: string): string[] =>
  [...html.matchAll(/aria-label="([^"]*)"/g)].map(m => m[1]!)

const count = (html: string, needle: string) => labels(html).filter(l => l === needle).length

describe('test 13 — the class pools, both halves', () => {
  it('paints Lay on Hands and Channel Divinity when paladinResources carries them', () => {
    const html = rail(WITH_BLOCK)
    expect(html).toContain('Lay on Hands')
    expect(html).toContain('Channel Divinity')
    // The prototype's numbers, not the same-named feature's 15 of 40. Pools are
    // deduplicated by id with the paladin block first, and this is the half of
    // that rule the SCREEN is responsible for.
    expect(html).toContain('35/35')
    expect(count(html, 'Expend Channel Divinity use')).toBe(2)
    // A points pool is spent in amounts, and every one of them is offered.
    expect(labels(html)).toContain('Spend 5 Lay on Hands')
    expect(labels(html)).toContain('Spend 10 Lay on Hands')
  })

  it('paints NO pool controls at all when the sheet carries neither route, and does not throw', () => {
    const html = rail(NO_POOLS)
    expect(html).not.toContain('Lay on Hands')
    expect(html).not.toContain('Channel Divinity')
    expect(labels(html).filter(l => /^Spend /.test(l))).toEqual([])
    expect(labels(html).filter(l => / use$/.test(l))).toEqual([])
    // The other half of "and nothing throws": the rail still rendered, with the
    // things that do not depend on a pool. This used to look for "Reset action
    // economy"; slice 7 moved that button to `TurnVerbs`, so the marker is now
    // the slots — which is the better witness anyway, being the thing the rail
    // is actually for.
    expect(count(html, 'Expend 1st level spell slot')).toBe(3)
  })

  it('paints them from a FEATURE counter too, because that is where his sheet keeps them', () => {
    // NIX as shipped: no `paladinResources`, but "Lay on Hands" and "Channel
    // Divinity: Sacred Weapon" are features with both halves declared. Shape,
    // never name — the rail asks the pool what unit it is in and draws that.
    const html = rail(NIX)
    expect(NIX.paladinResources).toBeUndefined()
    expect(html).toContain('Lay on Hands')
    expect(html).toContain('15/40')
    expect(labels(html)).toContain('Spend 5 Lay on Hands')
    // ...and the uses-measured one is pips, not buttons, from the same rule.
    expect(count(html, 'Expend Channel Divinity: Sacred Weapon use')).toBe(1)
    expect(count(html, 'Restore Channel Divinity: Sacred Weapon use')).toBe(1)
  })
})

describe('the slots', () => {
  it('gives every slot of every tier its own control, spent ones offering restore', () => {
    const html = rail(NIX)
    // NIX: 1st 3 of 4, 2nd 2 of 3.
    expect(count(html, 'Expend 1st level spell slot')).toBe(3)
    expect(count(html, 'Restore 1st level spell slot')).toBe(1)
    expect(count(html, 'Expend 2nd level spell slot')).toBe(2)
    expect(count(html, 'Restore 2nd level spell slot')).toBe(1)
    // ITEM 4, and the negative half of it: he is level 7, the sheet has no 3rd
    // tier, and no 3rd tier is drawn. The rail does not decide that — it paints
    // the lines `spellSlotsOf` gave it — but if the rail ever invented a row,
    // this is where it would show.
    expect(labels(html).filter(l => /3rd level spell slot/.test(l))).toEqual([])
  })
})

describe('the dice, and the reason there is no dead button', () => {
  it('paints no dice control when no roller is mounted', () => {
    expect(labels(verbs())).not.toContain('Open dice roller')
    // ...and the rail has none either, which is the half that would have gone
    // untested when the row moved. Slice 7 ruled the dice stays off entirely —
    // he rolls physical dice at the table — so "nowhere" is the requirement,
    // and a check of only the new home would not have said so.
    expect(labels(rail(NIX))).not.toContain('Open dice roller')
  })

  it('paints one, under its old accessible name, when a roller is mounted', () => {
    const html = renderToStaticMarkup(
      <DiceControlContext.Provider value={{ open: () => {}, setDocked: () => {} }}>
        <TurnVerbs inCombat />
      </DiceControlContext.Provider>,
    )
    expect(count(html, 'Open dice roller')).toBe(1)
  })
})

describe('start and end', () => {
  it('offers End combat in a fight and Start Combat out of one, never both', () => {
    const inFight = verbs({ inCombat: true })
    expect(labels(inFight)).toContain('End combat')
    expect(inFight).not.toContain('Start Combat')

    const outOfFight = verbs({ inCombat: false })
    expect(outOfFight).toContain('Start Combat')
    expect(labels(outOfFight)).not.toContain('End combat')
  })

  it('paints neither when neither handler is given — the read-only card', () => {
    const html = renderToStaticMarkup(<TurnVerbs inCombat={false} />)
    expect(html).not.toContain('Start Combat')
    expect(labels(html)).not.toContain('End combat')
    expect(labels(html)).not.toContain('Reset action economy')
    // Nothing is left but the empty row: a verb with no handler is not painted
    // as a dead button, which is the same 🔴 rule the dice seam enforces.
    expect(html).not.toContain('<button')
  })

  it('leaves the slots alone — they are the sheet’s, not a handler’s', () => {
    const turn = turnOf(NIX)
    const html = renderToStaticMarkup(
      <TurnRail spellSlots={turn.spellSlots} resources={turn.resources} />,
    )
    expect(count(html, 'Expend 1st level spell slot')).toBe(3)
    expect(html.split('<button').length - 1).toBe(html.split('disabled=""').length - 1)
  })
})

describe('one number, one place — the whole reason the rail replaced the strip', () => {
  const turn = turnOf(NIX)
  const screen = (withRail: boolean) =>
    renderToStaticMarkup(
      <TurnScreenD
        turn={turn}
        rail={
          withRail ? (
            <TurnRail
              spellSlots={turn.spellSlots}
              resources={turn.resources}
              onExpendSlot={() => {}}
              onRestoreSlot={() => {}}
            />
          ) : undefined
        }
      />,
    )

  it('paints the slots on the rail and NOT in the resource strip', () => {
    const html = screen(true)
    expect(count(html, 'Expend 1st level spell slot')).toBe(3)
    // `.res`'s own wording for the same fact. If both appear, his 1st-level
    // slots are on screen twice and item 4 has been rebuilt.
    expect(html).not.toContain('Level 1</span>')
    expect(html).not.toContain('class="res"')
  })

  it('paints them in the strip and NOT on a rail when no rail is supplied', () => {
    const html = screen(false)
    expect(html).toContain('class="res"')
    expect(html).toContain('Level 1</span>')
    expect(labels(html).filter(l => /spell slot/.test(l))).toEqual([])
  })

  it('marks the card so the tablet grid drops the empty third column', () => {
    expect(screen(true)).toContain('has-rail')
    expect(screen(false)).not.toContain('has-rail')
  })
})

/* ============================================================================
   SLICE 7 — where the controls LIVE, which is a different claim from whether
   they are painted.

   The browser prover can see that the economy strip is on screen at both ends
   of the scroll. It cannot see WHY, and "it happens to be visible" is a fact
   about today's content height, not a guarantee. These tests assert the
   structure that makes it impossible for the strip to scroll away: it is
   inside `.pinned`, and `.pinned` is a sibling of `.body`, and `.body` is the
   only thing on this screen that scrolls. Finding BG — prefer a claim that
   FORBIDS the fault to a check that failed to observe it.
   ========================================================================== */
describe('slice 7 — the economy strip is outside the scroller, and in one place', () => {
  const turn = turnOf(NIX)
  const screen = (extra: Partial<Parameters<typeof TurnScreenD>[0]> = {}) =>
    renderToStaticMarkup(<TurnScreenD turn={turn} {...extra} />)

  /** The markup between `<div class="body">` and its matching close. Written by
   *  depth-counting rather than a lazy regex, because `.body` contains dozens
   *  of divs and `/<div class="body">(.*?)<\/div>/` would stop at the first
   *  one and then cheerfully report that nothing is inside it. */
  const insideBody = (html: string): string => {
    const start = html.indexOf('<div class="body">')
    expect(start).toBeGreaterThan(-1)
    let depth = 0
    const re = /<(\/?)div\b[^>]*>/g
    re.lastIndex = start
    for (let m = re.exec(html); m; m = re.exec(html)) {
      depth += m[1] ? -1 : 1
      if (depth === 0) return html.slice(start, m.index)
    }
    throw new Error('unbalanced .body')
  }

  it('paints exactly one economy strip', () => {
    // A COUNT, not a lookup. "Is it in the pinned strip?" passes just as well
    // when it is in both places, which is item 6's whole fault.
    expect(screen().split('class="econ"').length - 1).toBe(1)
  })

  it('puts it in the pinned strip and NOT inside the scrolling body', () => {
    const html = screen()
    expect(html).toContain('class="pinned"')
    expect(insideBody(html)).not.toContain('class="econ"')
    // ...and the four slots came with it, rather than the container moving
    // empty. Named individually: "Reaction" is the one his item 8 is about.
    for (const slot of ['Action', 'Bonus', 'Reaction', 'Move'])
      expect(html.slice(html.indexOf('class="pinned"'))).toContain(`>${slot}<`)
  })

  it('keeps End turn in the pinned strip, where V-6 put it', () => {
    const html = screen({ onEndTurn: () => {} })
    expect(insideBody(html)).not.toContain('End turn')
    expect(html.slice(html.indexOf('class="pinned"'))).toContain('End turn')
  })

  it('puts the verbs INSIDE the scroller — the other half of the trade', () => {
    // Without this, "the econ strip is pinned" would still pass on a screen
    // that pinned everything and gave the list nothing back.
    const html = screen({ verbs: <TurnVerbs inCombat onReset={() => {}} /> })
    expect(insideBody(html)).toContain('class="rverbs"')
    expect(html.slice(html.indexOf('class="pinned"'))).not.toContain('rverbs')
  })

  it('renders no verb row at all when none is supplied — the declared revert', () => {
    expect(screen()).not.toContain('rverbs')
  })

  /* ── slice 8 ────────────────────────────────────────────────────────────
     The strip is narrowed to the state of THIS turn. The rail — slot pips and
     the class pools — goes back inside the scroller, because inside `Layout`
     the pinned strip also costs a 65px tab bar, and 233 + 65 measured 298px
     against a promised 121 (`_probe8.mjs`, 2026-09-01).

     The browser can see where a thing is painted; only markup can forbid it
     coming back. */

  const railOf = (c: Character = NIX) => {
    const t = turnOf(c)
    return <TurnRail spellSlots={t.spellSlots} resources={t.resources} />
  }

  it('slice 8 — the rail is inside the scroller, not in the pinned strip', () => {
    const html = screen({ rail: railOf() })
    expect(insideBody(html)).toContain('class="rail"')
    expect(html.slice(html.indexOf('class="pinned"'))).not.toContain('class="rail"')
  })

  it('slice 8 — the pips went with it, rather than the container moving empty', () => {
    /* The failure this forbids is a `.rail` that relocated while its contents
       were left behind or quietly dropped. Counted against the sheet.

       COUNTED ON THE ACCESSIBLE NAME, not on `class="pip-tap"`. Written that
       way first and it read 15 where the sheet has 7 slots, because a pool
       measured in `uses` draws pips too — Divine Sense 4, Channel Divinity 2,
       Flaming Cloak 2. The class is the instrument; only the label says which
       question the instrument is answering. */
    const html = screen({ rail: railOf() })
    const want = turnOf(NIX).spellSlots.reduce((n, s) => n + s.max, 0)
    expect(want).toBe(7)
    const body = insideBody(html)
    const slotPips = (body.match(/aria-label="(Expend|Restore) \w+ level spell slot"/g) ?? [])
    expect(slotPips.length).toBe(want)
  })

  it('slice 8 — the pinned strip is the four dots and End turn, and nothing else', () => {
    /* THE RULING, as one assertion. Every slice since 4 added something here by
       arguing it was turn-critical, so this COUNTS the interactive controls the
       strip holds rather than naming the ones it must not — a negative marker
       cannot be checked by looking for it. The dots are not buttons.

       TWO, not one: `.edge` has always painted Undo beside End turn, disabled
       until there is something to undo. Written as 1 first and the count caught
       it, which is the count doing its job on its own author. */
    const html = screen({
      onEndTurn: () => {},
      rail: railOf(),
      verbs: <TurnVerbs inCombat onReset={() => {}} />,
    })
    const pinned = html.slice(html.indexOf('class="pinned"'))
    expect(pinned.split('<button').length - 1).toBe(2)
    expect(pinned).toContain('End turn')
    expect(pinned).toContain('Undo')
    for (const slot of ['Action', 'Bonus', 'Reaction', 'Move'])
      expect(pinned).toContain(`>${slot}<`)
  })
})
