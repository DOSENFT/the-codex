/* ============================================================================
   FINDING BH — the encounter you could start and never finish.

   `onEndCombat` had been a prop of `TurnSummary` since the component was
   written, wired to a complete handler in `CombatHelper`, and destructured and
   then never called. Combat could be started from the deck and never ended: the
   round counter climbed, concentration never cleared, and the damage-log save
   that writes the encounter into history never ran. Not a missing feature so
   much as a feature with no door.

   WHY THE DOOR IS IN THE DECK. The first attempt put it in `TurnSummary`'s
   header, which reads as the natural home. The browser disagreed: at 390×844
   that header paints at y=1297 inside a scroller whose visible window ends at
   478, so the control sat some 800px below anything Marcus can see, while
   «Start Combat» was one thumb-fall away in the fixed deck. The tests below
   therefore pin the SLOT as much as the button — a door nobody can reach is the
   same fault wearing a square icon.

   Rendered with `renderToStaticMarkup` for the reason `ReactionsBand.test.tsx`
   gives at length: this repo has no jsdom. That is also why the confirm strip
   is its own exported component — a strip that only exists after a tap is
   invisible to this suite, and it is the half that holds the irreversible
   button. The taps themselves are driven for real by
   docs/plans/table-truth/prove-bh-bj.mjs.

   Every one of these went red against the pre-change code, which is the whole
   reason to write them.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../../lib/turn/fixtures/nix'
import { TurnDeck, type ActionEconomy } from '../TurnDeck'
import { EndCombatConfirm } from './EndCombatConfirm'

/** Tags removed, NOTHING put in their place — what `textContent` reports.
 *  Finding AY: a stripper that substitutes a space is more generous than the
 *  DOM, and an assertion about glued words would pass over the fault. */
const domText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim()

const ECONOMY: ActionEconomy = { action: false, bonusAction: false, reaction: false, movement: false }
const noop = () => {}

const deck = (inCombat: boolean) =>
  renderToStaticMarkup(
    <TurnDeck
      character={NIX}
      inCombat={inCombat}
      onStartCombat={noop}
      onEndCombat={noop}
      economy={ECONOMY}
      onToggleEconomy={noop}
      onResetEconomy={noop}
      onExpendSlot={noop}
      onRestoreSlot={noop}
      onExpendLayOnHands={noop}
      onExpendChannelDivinity={noop}
      onRestoreChannelDivinity={noop}
    />,
  )

describe('finding BH — combat can be ended from the surface that never scrolls', () => {
  const fighting = deck(true)
  const resting = deck(false)

  it('offers a control named «End combat» while a fight is running', () => {
    /* The name is the assertion. A screen reader and Marcus's thumb both find
       this control by those words, and an icon-only button with no accessible
       name is the same missing door wearing a square. */
    expect(fighting).toContain('aria-label="End combat"')
    expect(domText(fighting)).toContain('End Combat')
  })

  it('does not offer it when there is no fight to end', () => {
    expect(resting).not.toContain('aria-label="End combat"')
    expect(domText(resting)).toContain('Start Combat')
  })

  it('shares ONE slot with «Start Combat» — never both at once', () => {
    /* Exclusivity is the claim, and it is NOT the same claim as "free": the
       slot was empty during a fight before this, so the deck does grow 302→368
       mid-combat and the option list above loses 66px. What exclusivity buys is
       that it grows once and no further — if both ever rendered together the
       deck would take a second 56px band for every round of every fight. The
       66px itself is measured in prove-bh-bj.mjs and stated there. */
    expect(domText(fighting)).not.toContain('Start Combat')
    expect(resting).not.toContain('aria-label="End combat"')
  })

  it('is the same 56px band as its counterpart, not a 48px afterthought', () => {
    /* 56px because this is pressed while someone at the table is talking to
       you — the deck's own rule for «Start Combat», and ending is the same
       moment in reverse. */
    expect(fighting).toMatch(/aria-label="End combat"/)
    const slot = fighting.slice(0, fighting.indexOf('aria-label="End combat"'))
    expect(slot.slice(-600)).toContain('min-h-[56px]')
  })

  it('does NOT end the fight on the first tap — nothing irreversible is mounted', () => {
    /* The half that matters. `handleEndCombat` finalises the damage log and
       calls `forgetCombat`, which removes `codex-combat-${id}` from disk: a
       single mis-tap mid-fight would take the round, the spent economy and the
       concentration with it. So nothing about the irreversible button may be
       present in the resting render. */
    expect(fighting).not.toContain('End combat confirmation')
    expect(fighting).not.toContain('aria-label="End combat — confirm"')
    expect(domText(fighting)).not.toContain('End the encounter?')
  })
})

describe('finding BH — the second tap says what it will cost before it costs it', () => {
  const html = renderToStaticMarkup(<EndCombatConfirm onKeepGoing={noop} onConfirm={noop} />)
  const text = domText(html)

  it('names the consequences in the words of what actually happens', () => {
    /* A confirm that only asks "are you sure?" moves the decision without
       informing it. Each of these is a real effect of `handleEndCombat`: the
       log is saved by `endCombatLog`/`saveDamageLogs`, and `endCombat` clears
       the round, the concentration and the spent economy. */
    expect(text).toContain('End the encounter?')
    expect(text).toContain('damage log is saved')
    expect(text).toContain('round')
    expect(text).toContain('concentration')
  })

  it('offers BOTH doors, and names them apart', () => {
    /* Finding BJ's lesson applied here: two controls that read the same are one
       control as far as a screen reader is concerned. */
    expect(html).toContain('aria-label="Keep fighting"')
    expect(html).toContain('aria-label="End combat — confirm"')
    expect(text).toContain('Keep going')
    expect(text).toContain('End combat')
  })

  it('puts the way OUT first — the safe door is the one under the thumb', () => {
    expect(html.indexOf('aria-label="Keep fighting"')).toBeLessThan(
      html.indexOf('aria-label="End combat — confirm"'),
    )
  })

  it('never ellipsises, and both doors stay thumb-sized', () => {
    expect(text).not.toContain('…')
    expect(text).not.toContain('...')
    expect(html.match(/min-h-\[44px\]/g)?.length).toBe(2)
  })
})
