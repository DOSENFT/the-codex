import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { featureContextOf } from '../../lib/turn/overlay'
import { featureByName } from '../../lib/canon/lookup'
import { retaliationOf } from '../../lib/turn/retaliation'
import type { TurnOption } from '../../lib/turn/types'
import { Act } from './TurnRow'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   SLICE 5 — a row opens, and one row carries its own control.
   Program-design test 9: "`rowExtra` renders under the matching row and under
   NO OTHER row."

   BOTH HALVES, AND THE SECOND ONE IS THE TEST. A check that only looked for
   the capture would pass on a screen that painted it on all fourteen options —
   which is precisely the failure this file caught during the slice: two of
   Nix's options resolve to the same canon feature, so the naive predicate
   returned a die for the bonus action that RAISES the cloak as well as for the
   reaction that IS the cloak burning someone. It painted twice and looked
   right both times.

   Markers below are accessible names and element structure, never class names
   and never prose, so a restyle cannot make this stop looking at anything.
   ========================================================================== */

const TURN = composeTurn({ character: NIX, combat: null })
const CTX = featureContextOf(NIX)

const ALL_OPEN = { action: true, bonusAction: true, reaction: true, movement: true, free: true }

/** Every option the screen can paint, in the same three places `reactions.ts`
 *  looks. Written out here rather than imported so this file does not depend
 *  on a helper that could change what it considers an option. */
const OPTIONS: TurnOption[] = [
  ...TURN.ranked,
  ...TURN.rest,
  ...TURN.mutex.flatMap(g => g.faces),
]

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

/** THE REAL PREDICATE, not a stand-in. `TurnLive` decides which row gets the
 *  capture with exactly these two lines; copying them keeps the claim about
 *  the thing that ships. Diverge and the test goes red, which is the point. */
const carriesRetaliation = (o: TurnOption) =>
  o.cost.slot === 'reaction' && retaliationOf(featureByName(o.name), CTX) !== null

describe('slice 5 — the row that carries a control', () => {
  it('exactly one of Nix’s options qualifies, and it is a reaction', () => {
    const carrying = OPTIONS.filter(carriesRetaliation)
    expect(carrying).toHaveLength(1)
    expect(carrying[0]!.cost.slot).toBe('reaction')
  })

  it('the ungated question would have said two — which is why the gate exists', () => {
    // The negative marker cannot be checked by looking for it: this asserts the
    // FAULT is still reachable, so the gate above is doing work rather than
    // agreeing with a predicate that never had anything to reject.
    const ungated = OPTIONS.filter(o => retaliationOf(featureByName(o.name), CTX) !== null)
    expect(ungated.length).toBeGreaterThan(1)
    expect(ungated.filter(o => o.cost.slot !== 'reaction').length).toBeGreaterThan(0)
  })

  it('the attack that rolls its own dice gets NOTHING', () => {
    // Opportunity Attack's 1d8+4 is the price of the hit, not a free rider.
    // The whole open-world claim rests on this staying null: if damage dice
    // alone earned a capture, every weapon row would grow one.
    const attack = OPTIONS.find(o => o.name.startsWith('Opportunity Attack'))
    expect(attack).toBeDefined()
    expect(carriesRetaliation(attack!)).toBe(false)
  })

  it('renders the extra under the matching row and under no other', () => {
    const html = renderToStaticMarkup(
      <TurnScreenD
        turn={TURN}
        bandsOpen={ALL_OPEN}
        onOpen={() => {}}
        rowExtra={o => (carriesRetaliation(o) ? <b>RETAL-MARK</b> : null)}
      />,
    )
    expect(count(html, 'RETAL-MARK')).toBe(1)
    expect(count(html, 'class="actx"')).toBe(1)
  })

  it('a row with no extra is the button it has always been', () => {
    const plain = OPTIONS.find(o => !carriesRetaliation(o))!
    const html = renderToStaticMarkup(<Act o={plain} onOpen={() => {}} />)
    expect(html.startsWith('<button')).toBe(true)
    expect(html).not.toContain('acthit')
    expect(html).not.toContain('actx')
  })

  it('never nests a button inside a button', () => {
    /* THE FAULT THIS SHAPE EXISTS TO PREVENT, and it is invisible in a
       screenshot: a button inside a button is invalid HTML, browsers resolve
       it by dropping the inner one, and the capture would have painted
       perfectly and done nothing when pressed. ReactionRow.tsx:192 records the
       same fault found on the legacy tab.

       Counted, not eyeballed: the extra here IS a button, so if `Act` had kept
       wrapping the whole card the markup would read `<button ... <button`. */
    const carrying = OPTIONS.find(carriesRetaliation)!
    const html = renderToStaticMarkup(
      <Act o={carrying} onOpen={() => {}} extra={<button type="button">x</button>} />,
    )
    expect(html.startsWith('<div')).toBe(true)
    const opens = [...html.matchAll(/<button/g)].map(m => m.index!)
    const closes = [...html.matchAll(/<\/button>/g)].map(m => m.index!)
    expect(opens).toHaveLength(2)
    // The first button must CLOSE before the second one opens.
    expect(closes[0]!).toBeLessThan(opens[1]!)
  })

  it('a blocked row keeps its extra pressable', () => {
    /* Hearthfire Manifest is most often blocked BECAUSE the reaction is spent
       — and the moment it is spent is the moment there is a hit to record. The
       `disabled` therefore rides the hit target, never the card, or the one
       control that still works would be dead at the one moment it is needed. */
    const carrying = OPTIONS.find(carriesRetaliation)!
    const blocked: TurnOption = { ...carrying, available: false, blockedReason: 'Reaction spent.' }
    const html = renderToStaticMarkup(
      <Act o={blocked} onOpen={() => {}} extra={<button type="button">x</button>} />,
    )
    const hit = html.slice(html.indexOf('acthit'), html.indexOf('</button>'))
    expect(hit).toContain('disabled')
    // and the extra, which comes after that close tag, does not.
    expect(html.slice(html.indexOf('actx'))).not.toContain('disabled')
  })

  it('the read-only screen is unchanged when no extra is supplied', () => {
    // The design shoot measures this form. Slice 5 must not have moved it.
    const bare = renderToStaticMarkup(<TurnScreenD turn={TURN} bandsOpen={ALL_OPEN} />)
    expect(bare).not.toContain('acthit')
    expect(bare).not.toContain('actx')
  })
})
