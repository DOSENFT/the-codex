import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { HPTracker } from '../HPTracker'
import { VitalsControls } from './VitalsControls'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   HIS BODY, INSIDE THE CARD — slice 3.

   The claim this slice has to prove is a NEGATIVE — his hit points are painted
   ONCE — and HANDOFF.md §4 says a negative marker cannot be checked by looking
   for it. So every test below asserts both halves: the readout is gone from the
   `bare` variant AND still present in the `card` variant that CombatHelper
   renders, the controls arrive AND the number does not.

   The markers are `HPTracker`'s own accessible names, not its class names or its
   prose:

     · the readout   aria-label="{n} of {max} hit points"
     · the bar       role="progressbar" aria-label="Hit points"

   Those are the two things that would duplicate D's own vitals row, and they are
   named by the component itself rather than by this test, so a restyle cannot
   make this test quietly stop looking at anything.

   ONE AMENDMENT, 8b: `role="progressbar" aria-label="Hit points"` is no longer
   HPTracker's alone — D's own bar wears it now, because it had no accessible
   name before and that was a bug, not a fingerprint. Where this file used to
   ask "is a progressbar absent?" it now asks "is there exactly one, and is it
   D's?". The readout marker is still uniquely HPTracker's and still carries the
   negative on its own.
   ========================================================================== */

const noop = () => {}
const turn = composeTurn({ character: NIX, combat: null })

const html = (variant: 'card' | 'bare') =>
  renderToStaticMarkup(
    <HPTracker variant={variant} character={NIX} onCharacterUpdate={noop} />,
  )

function text(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const READOUT = `${NIX.hitPoints.current} of ${NIX.hitPoints.max} hit points`

describe('the bare variant drops the readout and keeps every control', () => {
  it('the card variant paints the readout — the half that must stay true', () => {
    // If this ever goes red, CombatHelper's Hit Points module has lost its
    // number and the test below is passing for the wrong reason.
    const card = html('card')
    expect(card).toContain(READOUT)
    expect(card).toContain('role="progressbar"')
    expect(text(card)).toContain('Hit Points')
  })

  it('the bare variant paints neither the number nor the bar', () => {
    const bare = html('bare')
    expect(bare).not.toContain(READOUT)
    expect(bare).not.toContain('role="progressbar"')
  })

  it('the bare variant drops the "Hit Points" heading too', () => {
    // Item 10 rolls this INTO a module that is already headed "Your turn". A
    // second heading inside it is the duplication being removed.
    expect(text(html('bare'))).not.toContain('Hit Points')
  })

  it('every control he named survives the move', () => {
    // His words: "the damage, heal, and temp health buttons, and the conditions
    // drop down". Checked by accessible name, and checked against the card
    // variant too so that a control missing from BOTH cannot read as a pass.
    const bare = html('bare')
    const card = html('card')
    // Read off the component, not recalled: `Heal` is "Apply healing" and temp
    // HP is "Set temporary hit points". The first draft of this test guessed
    // both and the card-variant half is what caught it.
    for (const label of ['Apply damage', 'Apply healing', 'Set temporary hit points']) {
      expect(card).toContain(label)
      expect(bare).toContain(label)
    }
    expect(text(bare)).toContain('Active Conditions')
  })

  it('the conditions fold is still closed by default', () => {
    expect(html('bare')).toContain('aria-expanded="false"')
  })
})

describe('the card paints his hit points exactly once', () => {
  it('with the controls mounted, only D’s own readout is on screen', () => {
    const withControls = renderToStaticMarkup(
      <TurnScreenD
        turn={turn}
        vitalsControls={<VitalsControls character={NIX} onCharacterUpdate={noop} />}
      />,
    )
    // D's readout is there…
    expect(text(withControls)).toContain(`${turn.vitals.hp}`)
    // …and the tracker's is not, so there is one number and not two.
    expect(withControls).not.toContain(READOUT)

    /* THE BAR FINGERPRINT CHANGED IN 8b, AND HERE IS WHY.
       Until 8b this line read `not.toContain('role="progressbar"')`, which was
       a sound fingerprint for "HPTracker's card bar leaked in" only because D's
       own bar was an unnamed, unroled `<div class="track">`. That was a real
       a11y hole — the prover found D's bar had no accessible name at all — and
       8b closed it. D now owns a progressbar of its own, so absence is the
       wrong question; the right one is COUNT. One is the claim of this slice.
       Two would mean the tracker's bar came back beside D's. */
    const bars = withControls.match(/role="progressbar"/g) ?? []
    expect(bars).toHaveLength(1)
    // …and the one that survived is D's `.track`, not HPTracker's card bar.
    expect(withControls).toContain('class="track" role="progressbar"')
  })

  it('the controls really did arrive — not merely "nothing is duplicated"', () => {
    // The test above would also pass if `vitalsControls` were dropped on the
    // floor. This is the half that says it was rendered.
    const withControls = renderToStaticMarkup(
      <TurnScreenD
        turn={turn}
        vitalsControls={<VitalsControls character={NIX} onCharacterUpdate={noop} />}
      />,
    )
    expect(withControls).toContain('Apply damage')
    expect(withControls).toContain('class="vctl"')
  })

  it('the controls sit INSIDE the vitals section, not in a box of their own', () => {
    // Item 10 asked for them "rolled into" the module. Rendered as a sibling
    // section they would be a fourth place his hit points are discussed.
    const withControls = renderToStaticMarkup(
      <TurnScreenD
        turn={turn}
        vitalsControls={<VitalsControls character={NIX} onCharacterUpdate={noop} />}
      />,
    )
    const vitals = withControls.indexOf('class="vitals"')
    const vctl = withControls.indexOf('class="vctl"')
    const upon = withControls.indexOf('class="upon"')
    expect(vitals).toBeGreaterThanOrEqual(0)
    expect(vctl).toBeGreaterThan(vitals)
    if (upon >= 0) expect(vctl).toBeLessThan(upon)
  })
})

describe('the screen is read-only without the prop — that is the revert', () => {
  it('no vitalsControls, no controls, and nothing throws', () => {
    const bareScreen = renderToStaticMarkup(<TurnScreenD turn={turn} />)
    expect(bareScreen).not.toContain('Apply damage')
    expect(bareScreen).not.toContain('class="vctl"')
    // The readout it always had is untouched.
    expect(text(bareScreen)).toContain('AC')
  })
})
