import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   THE AURAS BECOME DISCLOSURES — slice 8d-2, the screen half.

   HIS RULING, VERBATIM: "So long as the necessary details of the auras, so I
   can always know what they do exactly, and are neat and don't take up room
   (this is where drop downs or something are very very preferable)."

   Three constraints, and each one is a test below: the full text is REACHABLE,
   it costs NO ROOM until asked for, and the strip still looks like the strip.

   WHY `<details>` AND NOT A BUTTON WITH STATE. `TurnScreenD` has a standing
   law — it is presentational, and given no handlers it is exactly the read-only
   screen slices 1-5 built. `bandsOpen` is a PROP for that reason: the collapse
   state of a band is persisted by the caller and this screen never learns how
   to persist anything. A `useState` here would be the first crack in that, for
   a fold that nothing needs to remember. `<details>` is a disclosure the
   platform already owns: no state, no handler, works in the inert screen the
   design shoot measures, and keyboard- and screen-reader-accessible for free.

   AND WHERE THERE IS NOTHING BEHIND IT, THERE IS NO CONTROL. A condition says
   its whole effect on one line, so it stays the plain pill it has always been.
   A disclosure that opens onto the sentence already showing is furniture
   pretending to be a feature.
   ========================================================================== */

const turn = composeTurn({ character: NIX, combat: null })
const html = renderToStaticMarkup(<TurnScreenD turn={turn} />)

/** The `.upon` strip, on its own — the rest of the card must not be searched
 *  for these words, or a match in the ranked list would pass a claim about the
 *  aura strip. */
function upon(markup: string): string {
  const open = markup.indexOf('<section class="upon"')
  expect(open).toBeGreaterThan(-1)
  return markup.slice(open, markup.indexOf('</section>', open))
}

describe('an always-active aura opens onto its whole paragraph', () => {
  it('the full text is on the card, not just the truncated line', () => {
    const strip = upon(html)
    // The summary he has today…
    expect(strip).toContain('Aura of Protection')
    // …and the three facts that were nowhere on this tab before.
    expect(strip).toContain('minimum +1')
    expect(strip).toContain('Incapacitated')
    expect(strip).toContain('only one Aura of Protection at a time')
    // The resistance that was cut off mid-list.
    expect(strip).toContain('Psychic')
  })

  it('it is a disclosure, and it is CLOSED — "don’t take up room"', () => {
    const strip = upon(html)
    expect(strip).toContain('<details')
    // `open` is what a browser paints an expanded <details> from. Its absence
    // is the whole of "costs no room at rest", so it is asserted directly
    // rather than inferred from the markup looking small.
    expect(strip).not.toContain('<details open')
    expect(strip).not.toContain('open=""')
    // Two auras on his sheet, two disclosures.
    expect([...strip.matchAll(/<details/g)]).toHaveLength(2)
  })

  it('closed, it still shows the name and the one-line summary', () => {
    /* The disclosure must not hide what the strip shows TODAY — that would be
       trading one loss for another. Everything visible while closed lives in
       the <summary>, so this reads that element rather than the whole tag. */
    const strip = upon(html)
    const heads = [...strip.matchAll(/<summary[^>]*>(.*?)<\/summary>/gs)].map(m => m[1])
    expect(heads).toHaveLength(2)
    expect(heads[0]).toContain('Aura of Protection')
    expect(heads[0]).toContain('gain a bonus to saving throw')
  })

  it('carries the pill’s own classes, so the visuals do not move', () => {
    // Marcus's standing constraint for this whole phase is "nor the visuals".
    // The <details> IS the tag — same class, same tone modifier — rather than a
    // new box wrapped around one.
    const strip = upon(html)
    expect(strip).toContain('<details class="tag good"')
  })

  it('names itself for a screen reader, since the pill’s text is now split', () => {
    const strip = upon(html)
    expect(strip).toContain('aria-label="Aura of Protection — full text"')
  })
})

describe('a plain pill stays a plain pill', () => {
  it('a condition, which says everything in one line, grows no control', () => {
    const cursed = composeTurn({ character: { ...NIX, conditions: ['Prone'] }, combat: null })
    const strip = upon(renderToStaticMarkup(<TurnScreenD turn={cursed} />))
    expect(strip).toContain('Prone')
    // Two auras have disclosures; Prone must not be a third.
    expect([...strip.matchAll(/<details/g)]).toHaveLength(2)
    // And it is still rendered as the <span> pill it has always been.
    expect(strip).toMatch(/<span class="tag"><span class="k">Prone<\/span>/)
  })
})
