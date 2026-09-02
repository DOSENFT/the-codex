import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { groupBySlot } from '../../lib/turn/bands'
import { NIX } from '../../lib/turn/fixtures/nix'
import { startCombat, useAction } from '../../lib/combat-state'
import { TurnBands } from './TurnBands'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   THE BANDS, AS PAINTED — test plan items 6 and 7.

   `bands.test.ts` proves the SHELVING. This proves the MARKUP: that all four
   labels reach the screen whether or not they have anything in them, and that
   a blocked row still carries the sentence saying why.

   `renderToStaticMarkup` because this repo has no jsdom — the reasoning is set
   out at length in storage-safety.test.tsx. The real paint, at 390x844 on his
   own export, is measured by the browser prover beside this file's slice.
   ========================================================================== */

const ALL_OPEN = { action: true, bonusAction: true, reaction: true, movement: true, free: true }

const render = (turn = composeTurn({ character: NIX, combat: null }), open = ALL_OPEN) =>
  renderToStaticMarkup(<TurnBands bands={groupBySlot(turn)} open={open} onOpen={() => {}} />)

function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('6. the four bands are always there', () => {
  it('renders his four labels, in the order they are spent', () => {
    const t = text(render())
    const at = (label: string) => t.indexOf(label)
    for (const label of ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT']) {
      expect(t.toUpperCase()).toContain(label)
    }
    const order = ['Action', 'Bonus', 'Reaction', 'Movement'].map(at)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order[0]).toBeGreaterThanOrEqual(0)
  })

  it('renders the MOVEMENT band even though nothing is priced in movement', () => {
    // The band with nothing in it is the one a "tidy" refactor deletes, and
    // deleting it would take with it the one place the screen says whether his
    // movement is still his.
    const html = render()
    expect(html).toContain('Movement')
    expect(text(html)).toContain('Nothing on your sheet costs your movement')
  })

  it('an empty band says WHICH KIND of empty it is', () => {
    // Spent and having-nothing are different facts and they look identical if
    // the box is merely blank. Both halves asserted, because a negative marker
    // cannot be checked by looking for it.
    const spent = useAction({ ...startCombat(NIX), yourTurn: true }, 'movement')
    const t = text(render(composeTurn({ character: NIX, combat: spent })))
    expect(t).toContain('Your movement is spent')
    expect(t).not.toContain('Nothing on your sheet costs your movement')
  })

  it('every band prints a count, including the zero', () => {
    const t = text(render())
    expect(t).toContain('0 ready')
    // …and it is not ONLY zeros, or the count is not being read from the band.
    expect(/[1-9]\d* ready/.test(t)).toBe(true)
  })

  it('the header states open/spent in WORDS, not only in colour', () => {
    const open = text(render())
    expect(open).toMatch(/\bopen\b/)
    const spent = useAction({ ...startCombat(NIX), yourTurn: true }, 'action')
    expect(text(render(composeTurn({ character: NIX, combat: spent })))).toMatch(/\bspent\b/)
  })
})

describe('7. a blocked row keeps its reason and is not pressable', () => {
  it('paints blockedReason and disables the button', () => {
    // Off-turn: every action, bonus action and movement row is blocked with
    // "It is not your turn", which is a reason compose.ts writes and which the
    // old screen hid under "everything else".
    const combat = { ...startCombat(NIX), yourTurn: false }
    const turn = composeTurn({ character: NIX, combat })
    const blocked = [...turn.ranked, ...turn.rest].filter(o => !o.available)
    expect(blocked.length).toBeGreaterThan(0)

    const html = render(turn)
    for (const o of blocked.slice(0, 5)) {
      expect(text(html)).toContain(o.blockedReason)
    }
    expect(html).toContain('class="act blocked"')
    expect(html).toContain('disabled=""')
  })

  it('a blocked row is still ON SCREEN — D greys, it never hides', () => {
    const combat = { ...startCombat(NIX), yourTurn: false }
    const turn = composeTurn({ character: NIX, combat })
    const t = text(render(turn))
    for (const o of [...turn.ranked, ...turn.rest]) expect(t).toContain(o.name)
  })
})

describe('the screen falls back, and that is the revert', () => {
  const turn = composeTurn({ character: NIX, combat: null })

  it('without bandsOpen, TurnScreenD renders the old flat list', () => {
    const html = renderToStaticMarkup(<TurnScreenD turn={turn} />)
    expect(text(html)).toContain('Everything else')
    expect(html).not.toContain('class="bands"')
  })

  it('with bandsOpen, the fold is gone and the bands are there', () => {
    const html = renderToStaticMarkup(<TurnScreenD turn={turn} bandsOpen={ALL_OPEN} />)
    expect(html).toContain('class="bands"')
    expect(text(html)).not.toContain('Everything else')
  })

  it('the card’s own count is the sum of the bands, not the shortlist', () => {
    // Two numbers about the same thing on one screen is the fault this phase
    // exists to remove, so the caption cannot go on saying "5 ready" while the
    // bands below it add up to more.
    const total = groupBySlot(turn).reduce((n, b) => n + b.readyCount, 0)
    const html = renderToStaticMarkup(<TurnScreenD turn={turn} bandsOpen={ALL_OPEN} />)
    expect(total).not.toBe(turn.ranked.length)
    expect(text(html)).toContain(`${total} ready`)
  })

  it('no option is lost between the flat list and the bands', () => {
    const flat = text(renderToStaticMarkup(<TurnScreenD turn={turn} />))
    const banded = text(renderToStaticMarkup(<TurnScreenD turn={turn} bandsOpen={ALL_OPEN} />))
    for (const o of [...turn.ranked, ...turn.rest]) {
      if (!flat.includes(o.name)) continue
      expect(banded).toContain(o.name)
    }
  })
})

/* ============================================================================
   THE BAND NOTE — slice 6, item 8.

   A row can only describe an option that EXISTS, so the one thing slice 6 is
   about — a reaction he owns that the app was never told about — is invisible to
   every row-shaped mechanism on this screen. `bandNote` is the slot that can
   speak it, and these are the claims about the slot rather than about its
   contents; the real note, on his real sheet, is driven end to end by
   `prove-slice6.mjs`.

   ── THE HALF THE BROWSER CANNOT SEE ─────────────────────────────────────────

   Slice 5's finding: React builds the DOM node by node, so the HTML parser's
   "a <button> closes the open <button>" rule never fires and a button nested
   inside a button looks perfectly fine in Playwright. It is only visible to a
   real HTML serialiser — which is this file. The note is a button and the band
   header is a button, so this is exactly the shape that fault takes.
   ========================================================================== */
describe('the band note — the slot for what is missing', () => {
  const turn = composeTurn({ character: NIX, combat: null })
  const NOTE = 'ONE-REACTION-IS-MISSING'
  const note = (slot: string) =>
    slot === 'reaction' ? <button type="button" data-note>{NOTE}</button> : null

  const withNote = (open = ALL_OPEN) =>
    renderToStaticMarkup(
      <TurnBands bands={groupBySlot(turn)} open={open} onOpen={() => {}} bandNote={note} />,
    )

  /** The deepest <button> nesting in this markup. Anything above 1 is invalid
   *  HTML and a control the browser will reparent out from under its band. */
  function deepestButton(html: string): number {
    let depth = 0
    let worst = 0
    for (const tag of html.match(/<\/?button\b/g) ?? []) {
      if (tag === '<button') worst = Math.max(worst, ++depth)
      else depth--
    }
    return worst
  }

  it('hangs where the caller said and nowhere else', () => {
    const html = withNote()
    expect(html).toContain(NOTE)
    // ONE note, not one per band. `bandNote` is called for all four.
    expect(html.split(NOTE).length - 1).toBe(1)
  })

  it('lands inside the REACTION band, not merely somewhere on the screen', () => {
    // Sliced between the band labels rather than searched for globally: a note
    // appended after the last band would satisfy `toContain` and be wrong.
    const html = withNote()
    const at = (label: string) => html.indexOf(`>${label}<`)
    expect(at('Reaction')).toBeGreaterThan(-1)
    expect(at('Movement')).toBeGreaterThan(at('Reaction'))
    expect(html.indexOf(NOTE)).toBeGreaterThan(at('Reaction'))
    expect(html.indexOf(NOTE)).toBeLessThan(at('Movement'))
  })

  it('comes AFTER the rows — what he has, then what he is missing', () => {
    const html = withNote()
    const reaction = groupBySlot(turn).find(b => b.slot === 'reaction')!
    expect(reaction.options.length).toBeGreaterThan(0)
    for (const o of reaction.options) {
      expect(html.indexOf(NOTE)).toBeGreaterThan(html.indexOf(o.name))
    }
  })

  it('collapses with its band — nothing on this screen is unputawayable', () => {
    expect(withNote({ ...ALL_OPEN, reaction: false })).not.toContain(NOTE)
  })

  it('is NOT nested inside the band header button', () => {
    // The failure this catches never reaches a screenshot: Chrome silently
    // hoists the inner button out, so the note still paints and still clicks,
    // and the bug is invisible until a keyboard or a screen reader meets it.
    expect(deepestButton(withNote())).toBe(1)
  })

  it('without a bandNote the bands are byte-for-byte what slice 5 shipped', () => {
    // The declared revert, asserted rather than asserted-about: one prop off and
    // the markup is the previous slice's, exactly.
    const bare = renderToStaticMarkup(
      <TurnBands bands={groupBySlot(turn)} open={ALL_OPEN} onOpen={() => {}} />,
    )
    const nulled = renderToStaticMarkup(
      <TurnBands bands={groupBySlot(turn)} open={ALL_OPEN} onOpen={() => {}} bandNote={() => null} />,
    )
    expect(nulled).toBe(bare)
    expect(withNote()).not.toBe(bare)
  })
})
