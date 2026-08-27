/* ============================================================================
   THE REACTIONS BAND, AS PAINTED — Table Truth slice 6.

   `reactions.test.ts` proves the DATA. This proves the MARKUP: that the two
   questions reach the screen in the right order, that the unstated trigger is
   rendered rather than papered over, and that no ellipsis survives the trip.

   Rendered with `renderToStaticMarkup` for the reason given at length in
   turn/storage-safety.test.tsx: the repo has no jsdom, and the band was
   deliberately written to take plain props — no `useCombat`, no
   `useCollapsible` — so it renders in node exactly as it does in Chrome. The
   hooks live in `ReactionsBandLive`, and the real paint is measured in a real
   browser by docs/plans/table-truth/prove-slice6.mjs.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { ReactionsBand } from './ReactionsBand'

const turn = composeTurn({ character: NIX, combat: null })

const render = (isOpen = true) =>
  renderToStaticMarkup(
    <ReactionsBand turn={turn} character={NIX} isOpen={isOpen} onToggle={() => {}} />
  )

/** Markup with tags stripped and entities unescaped — what a reader sees. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('ReactionsBand — what reaches the screen', () => {
  it('names itself and counts what it holds', () => {
    const seen = text(render())
    expect(seen).toContain('Your reactions')
    expect(seen).toContain('2')
  })

  it('paints both of Nix\'s reactions', () => {
    const seen = text(render())
    expect(seen).toContain('Opportunity Attack')
    expect(seen).toContain('Flaming Cloak')
  })

  it('answers "what does it do" with canon\'s numbers, computed for HIM', () => {
    // The row this replaces read "1d10 Fire · recharges on short rest" — the
    // retaliation only, which reads as though the cloak deals 1d10 on use, and
    // never mentioned the temp HP that are the entire point of taking it.
    const seen = text(render())
    expect(seen).toContain('12 temp HP')
    expect(seen).toContain('1d10 Fire retaliation')
    expect(seen).not.toContain('11 temp HP')
  })

  it('answers "when can I use it" ABOVE what it does', () => {
    const html = render()
    /* The clause is painted in two pieces — its own lead word as the label,
       then the remainder — so the needle is the remainder. See
       splitTriggerLead: the first browser run measured «WHEN When a creature
       you can see leaves your reach», the label and the clause saying the same
       word twice. */
    const when = html.indexOf('a creature you can see leaves your reach')
    const body = html.indexOf('1d8+4 Slashing')
    expect(when).toBeGreaterThan(-1)
    expect(body).toBeGreaterThan(-1)
    expect(when, 'the trigger must be painted before the damage').toBeLessThan(body)
  })

  it('labels the trigger with its OWN lead word, and says it only once', () => {
    const seen = text(render())
    expect(seen).toContain('WHEN a creature you can see leaves your reach')
    // The bug this replaced: a fixed "WHEN" chip bolted in front of a clause
    // that already began "When".
    expect(seen).not.toMatch(/WHEN\s+When\b/)
  })

  it('says out loud that the cloak has no stated trigger', () => {
    const seen = text(render())
    expect(seen).toContain('not stated')
    expect(seen).toContain('agree a trigger with your DM')
  })

  it('does not invent one — no default trigger text anywhere', () => {
    /* Canon's appAction for HEARTH-03 suggests defaulting to "when you take
       damage". A suggestion to a DM is not a rule, and an app that quietly
       adopts it puts words in the book's mouth. Slice 8 records Marcus's
       choice; until then the row is honest about the gap. */
    const seen = text(render()).toLowerCase()
    expect(seen).not.toContain('when you take damage')
    expect(seen).not.toContain('when you are hit by a melee attack')
  })

  it('flags the errata canon holds, with a count and no false door', () => {
    const seen = text(render())
    expect(seen).toContain('Canon lists 4 errata on this feature')
    // No "tap for more": the detail sheet is slice 7 and a control that opens
    // nothing is a half-built feature running as if done.
    expect(seen.toLowerCase()).not.toContain('tap')
  })

  it('NEVER ELLIPSISES — the thing this phase exists to kill', () => {
    const html = render()
    expect(html).not.toContain('…')
    expect(html).not.toContain('&hellip;')
    expect(html).not.toMatch(/\.\.\./)
  })

  it('collapses to its header, and the header still says how many', () => {
    const closed = text(render(false))
    expect(closed).toContain('Your reactions')
    expect(closed).toContain('2')
    expect(closed).not.toContain('Flaming Cloak')
    expect(closed).not.toContain('12 temp HP')
  })

  it('carries the collapse state into aria, not just into the pixels', () => {
    expect(render(true)).toContain('aria-expanded="true"')
    expect(render(false)).toContain('aria-expanded="false"')
  })

  it('renders a real list inside a labelled region, so the prover can ask it', () => {
    const html = render()
    expect(html).toContain('aria-label="Your reactions"')
    expect(html).toContain('<ul')
    expect((html.match(/<li/g) ?? []).length).toBe(2)
  })
})

describe('ReactionsBand — the open-world rule', () => {
  it('a sheet with no reactions still renders the band, and says so', () => {
    const bare = { ...NIX, features: [], weapons: [], spells: [] }
    const html = renderToStaticMarkup(
      <ReactionsBand
        turn={composeTurn({ character: bare, combat: null })}
        character={bare}
        isOpen
        onToggle={() => {}}
      />
    )
    expect(text(html)).toContain('Nothing on this sheet costs a Reaction')
  })
})
