import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { createCombatState } from '../../lib/combat-state'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   THE FOUR ECONOMY SLOTS ARE PRESSABLE AGAIN — slice 8d-1.

   WHAT WAS LOST, STATED EXACTLY, because the first write-up of it was wrong and
   Marcus caught it. The legacy `TurnDeck` painted four chips wired to
   `onToggleEconomy`, with `aria-pressed` and the name `"Action: used"`. They
   were a MANUAL TALLY, not a filter: a way to say *I did something this app has
   no row for — my action is gone.* When D became the combat tab in 8b the same
   four facts survived as `<div class="eslot">` dots that state the economy
   correctly and cannot be pressed, so the tally went with them.

   (What Marcus remembered as "click Action and see what I can do with it" is
   NOT this control and was never lost — that is the four named bands, which
   8b's `four-bands` pin measures. Two different capabilities wearing the same
   four words. Worth the paragraph: it is the reason this slice is small.)

   THE NAMES ARE THE LEGACY DECK'S, TO THE BYTE — `${label}: used|available`,
   from `TurnDeck.tsx:346`. Not nostalgia: `prove-capabilities.mjs`'s four
   `chip-*` pins were written against that string in slice 1, before any of this
   was built, and a pin that is re-pointed at whatever the new code happens to
   say has stopped being a pin. Here the app moves to meet the pin.

   Every test below asserts BOTH halves — the control is there when the handler
   is, and is NOT there when it is not — because `TurnScreenD`'s standing law is
   that it is a read-only screen given no handlers, and a prop that quietly made
   it interactive anyway would break every design shoot taken since slice 1.
   ========================================================================== */

const turn = composeTurn({ character: NIX, combat: null })

/* His turn, mid-fight, with the ACTION SPENT and the other three still his.
   Deliberately not a fresh turn: four identical slots cannot show that the
   markup follows the state, and slice 2 was already caught once by a fixture
   where every option happened to be available. */
const spentAction = composeTurn({
  character: NIX,
  combat: {
    ...createCombatState(NIX),
    inCombat: true,
    round: 3,
    turnActions: { action: true, bonusAction: false, reaction: false, movement: false },
  },
})

function names(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map(m => m[1])
}

describe('the four slots are a manual tally again', () => {
  it('with no handler the slots are inert — the read-only screen is untouched', () => {
    const html = renderToStaticMarkup(<TurnScreenD turn={turn} />)
    // The four facts are still stated…
    expect(html).toContain('class="econ"')
    expect(html).toContain('eslot')
    // …and none of them is a control.
    for (const label of ['Action', 'Bonus', 'Reaction', 'Move']) {
      expect(names(html)).not.toContain(`${label}: available`)
      expect(names(html)).not.toContain(`${label}: used`)
    }
    expect(html).not.toContain('aria-pressed')
  })

  it('given the handler, all four are buttons under the deck’s own names', () => {
    const html = renderToStaticMarkup(
      <TurnScreenD turn={spentAction} onToggleEconomy={() => {}} />,
    )
    const got = names(html)
    // The spent one and the three he still holds, each saying which it is.
    expect(got).toContain('Action: used')
    expect(got).toContain('Bonus: available')
    expect(got).toContain('Reaction: available')
    expect(got).toContain('Move: available')
  })

  it('the pressed state follows the turn, not the label', () => {
    // `aria-pressed` is what a screen reader announces, so it has to be read off
    // the same object the dot is painted from. Asserted on a turn where the four
    // are NOT all alike, so a component hard-coding either value fails.
    const html = renderToStaticMarkup(
      <TurnScreenD turn={spentAction} onToggleEconomy={() => {}} />,
    )
    const slots = [...html.matchAll(/aria-label="(\w+): (used|available)" aria-pressed="(true|false)"/g)]
    expect(slots).toHaveLength(4)
    for (const [, , state, pressed] of slots) {
      expect(pressed).toBe(state === 'used' ? 'true' : 'false')
    }
  })

  it('every slot clears the 48px touch floor — V-5b, in both dimensions', () => {
    /* Not measurable in static markup, so this asserts that all four became
       BUTTONS carrying the class the floor is written on, rather than pretending
       to measure pixels. Deliberately not `/class="eslot"/` on its own: the four
       divs already carry that class today, so that form of the check passes
       against the pre-change code and therefore checks nothing. The pixels
       themselves are measured on the glass by the prover. */
    const html = renderToStaticMarkup(
      <TurnScreenD turn={spentAction} onToggleEconomy={() => {}} />,
    )
    expect([...html.matchAll(/<button[^>]*class="eslot[^"]*"/g)]).toHaveLength(4)
  })
})

describe('the toggle reaches the caller with the key it was given', () => {
  it('each slot carries the CombatState key it toggles, not its display name', () => {
    /* The display names and the state keys disagree on two of four — "Bonus" is
       `bonusAction`, "Move" is `movement` — and a component that passed its
       label up would silently no-op on exactly those two. Rendered to markup
       there is no click to fire, so the wiring is asserted through the
       `data-econ` attribute the component paints beside each control, which is
       the same value it hands the handler. */
    const html = renderToStaticMarkup(
      <TurnScreenD turn={spentAction} onToggleEconomy={() => {}} />,
    )
    const keys = [...html.matchAll(/data-econ="(\w+)"/g)].map(m => m[1])
    expect(keys).toEqual(['action', 'bonusAction', 'reaction', 'movement'])
  })
})
