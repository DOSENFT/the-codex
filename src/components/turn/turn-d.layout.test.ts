import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/* ===========================================================================
   THE ROW THAT CARRIES AN OPEN CARD MUST STACK, NOT COLUMN.

   THIS FILE EXISTS BECAUSE A DEPLOY SHIPPED THE BUG. Combat Open Book slice 7
   wrote `.dturn .act { display: flex }` so a mark could sit beside the row's
   text. `TurnRow.tsx` has TWO shapes, and only one of them holds `ActBody`
   directly:

     <button class="act">          <ActBody/>                    ← flex, correct
     <div class="act hasx">        <.acthit><ActBody/></.acthit>
                                   <.actx>{the open card}</.actx> ← MUST STACK

   In the second shape the bare `.act` flex rule made `.acthit` and `.actx` two
   COLUMNS. The row's own words were squeezed into a ~40% gutter on the left and
   the full ①②③ card rendered in the remainder — on a phone, which is the only
   screen this app is for. Marcus's words on seeing it live: "It's messy and
   confusing… it just now pops up really weird."

   Nothing caught it. `tsc` is clean on CSS. 1883 unit tests were green. The two
   slices involved (1: the inline card, 7: the mark) never rendered together in a
   test, and there is no jsdom in this repo, so no component test can measure a
   computed style. What is left is the stylesheet's own text — weaker than a
   layout assertion and far stronger than nothing, because the exact edit that
   caused the fault is the exact edit this reads.

   IT ASSERTS THE GUARD, NOT THE WHOLE RULE. A future slice is free to change
   the gap, the alignment or the mark's size without touching this file. What it
   may not do is put an unguarded `display: flex` back on `.act`, or a
   `display: block` back on `button.acthit`, because those two are the fault.
   ========================================================================= */

const CSS = readFileSync(new URL('./turn-d.css', import.meta.url), 'utf8')

/** The declarations for one selector, with comments already stripped — so a
 *  rule QUOTED in a header comment (this stylesheet quotes its own selectors
 *  constantly) can never be mistaken for a rule in force. */
function ruleFor(selector: string): string | null {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const block of bare.split('}')) {
    const [head, body] = block.split('{')
    if (!body) continue
    if (
      head
        .split(',')
        .map(s => s.trim())
        .includes(selector)
    ) {
      return body.trim()
    }
  }
  return null
}

describe('an open inline card sits UNDER its row, never beside it', () => {
  it('never puts a bare `display: flex` on .act — that is the shipped bug', () => {
    /* THE MICRO-REVERT. Change the selector below back to `.dturn .act` and this
       goes red, which is the one-line diff that broke the live build. */
    const bare = ruleFor('.dturn .act')
    expect(
      bare === null || !/display:\s*flex/.test(bare),
      `.dturn .act declares "${bare}" — a flex row here columns .acthit against .actx`
    ).toBe(true)
  })

  it('.act.hasx is explicitly a block, so the card and the row stack', () => {
    const hasx = ruleFor('.dturn .act.hasx')
    expect(hasx, '.dturn .act.hasx has no rule at all; nothing guarantees stacking').not.toBeNull()
    expect(hasx!).toMatch(/display:\s*block/)
  })

  it('.acthit is the flex row instead, so the mark keeps its place', () => {
    /* The other half. Moving the flex off `.act` without putting it here would
       fix the columning and silently drop every mark back on top of its text —
       trading a visible bug for a quiet regression, which is worse. */
    /* Asked for by the SELECTOR and not by the whole rule head, so regrouping
       the comma list — or splitting it into two rules — is not a failure. Only
       `.acthit` losing its flex is. */
    const hit = ruleFor('.dturn .acthit')
    expect(hit, '.dturn .acthit has no flex rule; the marks are back on top').not.toBeNull()
    expect(hit!).toMatch(/display:\s*flex/)

    const unwrapped = ruleFor('.dturn .act:not(.hasx)')
    expect(unwrapped, 'a row with no extra lost its mark row').not.toBeNull()
    expect(unwrapped!).toMatch(/display:\s*flex/)
  })

  it('button.acthit does not out-specify that back to block', () => {
    /* `button.acthit` (0,2,1) outranks `.dturn .acthit` (0,2,0). This is where
       the fix was half-applied first: the columning went away and the marks
       stayed broken, because the more specific rule still said `block`. */
    const button = ruleFor('.dturn button.acthit')
    expect(button, 'the button.acthit rule vanished').not.toBeNull()
    expect(button!, 'button.acthit says block and cancels the mark row').not.toMatch(
      /display:\s*block/
    )
    expect(button!).toMatch(/display:\s*flex/)
  })

  it('reads rules in force, not rules quoted in comments', () => {
    /* The parser above strips comments FIRST. Without that step this whole file
       passes or fails on prose — and this stylesheet's headers quote `.act`,
       `.acthit` and `display: block` repeatedly, including in the comment that
       explains this very bug. A test that cannot tell code from commentary is a
       test that will eventually be green for the wrong reason. */
    expect(CSS, 'the explaining comment was removed').toContain('display: block')
    expect(ruleFor('.dturn .act.hasx.blocked')).toMatch(/opacity:\s*1/)
    expect(ruleFor('.dturn .this-selector-is-not-real')).toBeNull()
  })
})
