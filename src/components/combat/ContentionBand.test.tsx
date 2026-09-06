import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContentionBand } from './ContentionBand'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'

/* ============================================================================
   THE BRACKET, PAINTED — Table Truth slice 9.

   Node-environment renders, so these are claims about the MODEL reaching the
   markup (finding Q still stands — the browser prover owns the paint). What
   they prove is the thing slice 7 could not: that the seven options which spend
   something now have a row, and that the row says they contend.
   ========================================================================= */

const turn = composeTurn({ character: NIX, combat: null })

/* `inert: true` rather than an `onOpen = undefined` parameter ON PURPOSE. A
   default parameter fires on an explicit `undefined` too, so `paint(true,
   undefined)` handed the component a live callback and the "no affordance"
   test passed against a rendered chevron — a test that could not fail. */
const paint = ({ isOpen = true, inert = false } = {}) =>
  renderToStaticMarkup(
    <ContentionBand
      turn={turn}
      isOpen={isOpen}
      onToggle={() => {}}
      onOpen={inert ? undefined : () => {}}
    />
  )

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

describe('ContentionBand — the seven that had no row', () => {
  it('gives every slot-spender a row that opens the sheet', () => {
    /* THE HEADLINE OF THIS SLICE, and finding AB's cure. Named one by one
       rather than counted, so a regression that drops exactly one of them
       cannot pass by the total staying right. */
    const html = paint()
    for (const name of [
      'Divine Smite',
      'Shield of Faith',
      'Misty Step',
      'Lay on Hands',
      'Channel Divinity: Sacred Weapon',
      'Cure Wounds',
      'Warding Bond',
    ]) {
      expect(html).toContain(`aria-label="${name} — details"`)
    }
  })

  it('paints a bracket per contended slot, each saying "pick one"', () => {
    const seen = text(paint())
    expect(seen).toContain('One of these — your bonus action')
    expect(seen).toContain('One of these — your action')
    expect((paint().match(/pick one/g) ?? []).length).toBe(turn.mutex.length)
  })

  it('says WHICH rule binds the bracket, not just that one binds it', () => {
    /* A fence with no reason on it reads as the app being fussy. Nix's bonus
       action is contended by two independent causes at once and the sentence
       has to name the one that actually stops a second cast. */
    const seen = text(paint())
    expect(seen).toContain('only one levelled spell slot leaves your hands per turn')
  })

  it('does NOT paint contending options as a flat list', () => {
    /* The rule this band exists to avoid getting wrong. If the faces ever
       render as plain siblings of `Also yours`, the screen is telling Marcus he
       may Smite AND Misty Step on one turn. Asserted structurally: every face
       must sit inside an element that also carries the caption. */
    const html = paint()
    const bracket = html.slice(html.indexOf('One of these — your bonus action'))
    const flat = html.slice(0, html.indexOf('One of these — your bonus action'))
    expect(bracket).toContain('Divine Smite')
    expect(flat).not.toContain('Divine Smite')
  })

  it('keeps reactions out — the reactions band is the one place they live', () => {
    /* Painting a reaction twice on one screen makes a player count two
       Reactions, which is worse than painting it nowhere. `turn.rest` holds
       both of Nix's on his own turn, so this is a live branch. */
    const seen = text(paint())
    expect(seen).not.toContain('Opportunity Attack')
    expect(seen).not.toContain('Flaming Cloak')
    // …and the premise: they really are in `rest`, so the filter is doing work.
    expect(turn.rest.some(o => o.cost.slot === 'reaction')).toBe(true)
  })

  it('still lists the uncontended leftovers, under their own heading', () => {
    const seen = text(paint())
    expect(seen).toContain('Also yours')
    expect(seen).toContain('Divine Sense')
  })

  it('paints no affordance at all when there is nowhere to send the tap', () => {
    // Same promise `TurnOptionRow` makes: no destination, no chevron, no lie.
    const inert = paint({ inert: true })
    expect(inert).not.toContain('aria-label="Divine Smite — details"')
    expect(text(inert)).toContain('Divine Smite')
  })

  it('hides the rows when collapsed but keeps the count visible', () => {
    const closed = paint({ isOpen: false })
    expect(closed).toContain('aria-expanded="false"')
    expect(text(closed)).toContain('Everything else')
    expect(text(closed)).not.toContain('Divine Smite')

    /* The count is the reason to open it, so it survives the fold — and the
       count has to be the TRUTH about what is behind it, which is the part a
       literal could never say.

       This read `toContain('8')` until Slice R2, and 8 was a number copied off
       a run. It is now 9, for a reason that is correct: contended options are
       no longer deleted from the shortlist, so they compete for its five places
       and one uncontended option got pushed down here. Re-typing 9 would leave
       the same trap armed for the next person, and `toContain` on a bare digit
       is a weak claim anyway — "18" contains "8".

       So it is counted off the open band instead. Every row this card paints
       carries a details label, so the number in the closed header must equal
       how many labels the open one has. That can fail in both directions: a row
       the count forgets, and a count with no row behind it. */
    const rows = (paint().match(/ — details"/g) ?? []).length
    expect(rows).toBeGreaterThanOrEqual(8) // the seven slot-spenders, at least
    expect(text(closed)).toContain(`Everything else ${rows}`)
  })
})

describe('ContentionBand — the census it closes', () => {
  it('covers every option on the turn once the band is open', () => {
    /* Slice 7 pinned "6 of 14 reachable". With this band mounted the number is
       every one of them — proved here against the composed turn rather than
       against a hardcoded 14, so adding an option to Nix's sheet cannot make
       this pass while leaving the new option unreachable. */
    const html = paint()
    const onTurn = [...turn.rest, ...turn.mutex.flatMap(g => g.faces)].filter(
      o => o.cost.slot !== 'reaction'
    )
    const missed = onTurn.filter(o => !html.includes(`aria-label="${o.name} — details"`))
    expect(missed.map(o => o.name)).toEqual([])
    expect(onTurn.length).toBeGreaterThanOrEqual(8)
  })
})
