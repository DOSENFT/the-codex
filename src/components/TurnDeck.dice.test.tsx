/* ============================================================================
   THE DICE CONTROL HAS A HOME THAT IS NOT ON TOP OF THE PAGE — finding BF.

   Slice 10e closed with the reactions band at five rows and a measurement that
   named what was sitting on it (`_probe-bf.mjs`, 390×844, in combat, Marcus's
   real sheet):

       --turn-deck-h ....... 302px  ·  minimised 186px
       <main> .............. 421px  ·  minimised 537px
       dice button ......... fixed, z-50, 56×56
       overhang into main .. 71px   ·  minimised 71px   <-- unchanged

   Minimising the deck does not uncover the text. The button's `bottom` is
   written in terms of `--turn-deck-h`, so it travels with the deck; minimised,
   it stopped covering the Interception row's rules text and started covering
   the Opportunity Attack row's cost instead. One covered text run became two.

   The fix is the law this app already wrote down and applied to one overlay
   only — "the scroll region is BOUNDED, not padded" — plus the observation that
   a surface which already owns fixed bottom chrome can hold the control inside
   it for free, because the page is bounded against that chrome already.

   THIS FILE PROVES THE MARKUP HALF: the deck paints the control, it is not a
   floating overlay, and it exists for a character the deck has nothing else to
   say about. The GEOMETRIC half — that nothing fixed covers page text any more,
   and that exactly one dice control exists at a time — cannot be proved from a
   string and is measured in Chrome by prove-slice10f-a.mjs. Finding Q, slice 4:
   a proof that reads markup is a proof of the model.

   Rendered with `renderToStaticMarkup` for the reason given in
   ReactionsBand.test.tsx: this repo has no jsdom. `useCollapsible` reads
   localStorage inside a try/catch and returns its default in node, and
   `useLayoutEffect`'s ResizeObserver never runs on the server — so the deck
   renders here in its default OPEN state, which is the state V-6 grades.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../lib/turn/fixtures/nix'
import type { Character } from '../lib/character'
import { DiceControlContext } from './DiceControl'
import { TurnDeck, type ActionEconomy } from './TurnDeck'

const ECONOMY: ActionEconomy = { action: false, bonusAction: false, reaction: false, movement: false }

const deck = (character: Character) => (
  <TurnDeck
    character={character}
    inCombat
    onStartCombat={() => {}}
    economy={ECONOMY}
    onToggleEconomy={() => {}}
    onResetEconomy={() => {}}
    onExpendSlot={() => {}}
    onRestoreSlot={() => {}}
    onExpendLayOnHands={() => {}}
    onExpendChannelDivinity={() => {}}
    onRestoreChannelDivinity={() => {}}
  />
)

/** With a provider — the app's real arrangement. */
const docked = (character: Character = NIX) =>
  renderToStaticMarkup(
    <DiceControlContext.Provider value={{ open: () => {}, setDocked: () => {} }}>
      {deck(character)}
    </DiceControlContext.Provider>,
  )

/** Bare — a unit render with no Layout above it. */
const bare = (character: Character = NIX) => renderToStaticMarkup(deck(character))

/** The opening tag of every element carrying this accessible name. */
const diceTags = (html: string) =>
  html.match(/<[a-z]+[^>]*aria-label="Open dice roller"[^>]*>/g) ?? []

describe('the turn deck adopts the dice control (finding BF)', () => {
  it('paints a dice control inside the deck', () => {
    /* Pre-change this is 0: the only "Open dice roller" in the app was
       Layout's floating button, and the deck had never heard of dice. */
    expect(diceTags(docked())).toHaveLength(1)
  })

  it('paints exactly one, so the deck can never grow a second', () => {
    expect(diceTags(docked())).toHaveLength(1)
  })

  it('keeps the accessible name the floating button already had', () => {
    /* Not cosmetic. `prove-slice*.mjs` and every assistive path find this
       control by name; a control that moves AND is renamed is two changes and
       only one of them was asked for. */
    expect(docked()).toContain('aria-label="Open dice roller"')
  })

  it('is deck chrome, not another fixed overlay', () => {
    /* THE WHOLE POINT OF THE SLICE. A docked control that is still
       `position: fixed` would sit exactly where the old one did and every
       geometric claim downstream would still fail — while this file went
       green. So the absence of the offending positioning is asserted on the
       control's own tag, not on the document. */
    const [tag] = diceTags(docked())
    expect(tag).toBeDefined()
    expect(tag).not.toMatch(/\bfixed\b/)
    expect(tag).not.toMatch(/\bz-50\b/)
    expect(tag).not.toMatch(/\babsolute\b/)
  })

  it('meets the 48px tap floor the deck holds every other control to', () => {
    const [tag] = diceTags(docked())
    expect(tag).toMatch(/min-h-\[48px\]/)
    expect(tag).toMatch(/min-w-\[48px\]/)
  })

  it('exists for a character with no spell slots at all', () => {
    /* The control lives on the slot-pip row, which used to render only when
       `levels.length > 0`. A Fighter has no levels — and a Fighter still needs
       dice. This is the open-world rule in miniature: the home for a control
       may not depend on a resource that character happens to have. */
    const fighter: Character = {
      ...NIX,
      spellSlots: {},
      paladinResources: undefined,
    }
    const html = docked(fighter)
    expect(diceTags(html)).toHaveLength(1)
    /* And it really is the slotless case, not a fixture that quietly kept its
       slots — otherwise this test would pass for the wrong reason. */
    expect(html).not.toContain('Expend 1st level spell slot')
  })

  it('paints nothing when there is no provider above it', () => {
    /* The deck must stay independently renderable — that is how every other
       component in this folder is tested. With no Layout there is no roller to
       open, and a button that opens nothing is worse than no button. It also
       guarantees the docking signal is never claimed by a deck that did not
       actually replace anything. */
    expect(diceTags(bare())).toHaveLength(0)
  })

  it('leaves the four economy chips their full labels', () => {
    /* The economy row was the other candidate home and its own comment records
       why it is full: 366px of row spent down to 28px of slack, and all four
       words rendered as "A… B… R… M…" the last time something took width from
       it. The dice button went on the slot row precisely so this stays true —
       so this asserts the thing that would have broken. */
    const html = docked()
    for (const label of ['Action', 'Bonus', 'Reaction', 'Move']) {
      expect(html).toContain(`>${label}</span>`)
    }
  })
})
