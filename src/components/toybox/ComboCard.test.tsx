import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComboCard } from './ComboCard'
import type { ToyboxCombo } from '../../lib/toybox'

/* ============================================================================
   THE COMBO CARD LEARNS TWO ROWS — slice 4.

   `ComboCard` painted neither field: `requirements` had been on `ToyboxCombo`
   since slice 2 and reached the glass nowhere, and `annotations` did not exist.
   Every test in the first block below therefore fails against the pre-change
   component for the plainest reason available — the text was not on screen.

   The last test is the one that matters to Marcus rather than to the feature.
   Everything already in his Toybox has neither field, and the promise is that
   this addition costs those cards NOTHING: no empty row, no stray label, no
   border with nothing under it.
   ========================================================================== */

const noop = () => {}

const BASE: ToyboxCombo = {
  id: 'c1',
  name: 'Hearth Wall',
  blocks: [
    { id: 'c1:1', type: 'bonus', label: 'Manifest the Hearthfire', source: 'feature' },
  ],
  tags: ['hearthfire'],
  favorite: false,
  createdAt: 1,
}

const paint = (combo: ToyboxCombo) =>
  renderToStaticMarkup(
    <ComboCard
      combo={combo}
      expanded
      onToggleExpand={noop}
      onToggleFavorite={noop}
      onEdit={noop}
      onDelete={noop}
      onDeploy={noop}
    />,
  )

describe('the two new rows', () => {
  it('paints the requirements, under a label of their own', () => {
    const markup = paint({ ...BASE, requirements: ['Hearthfire Manifest', 'Channel Divinity'] })
    expect(markup).toContain('REQ')
    expect(markup).toContain('Hearthfire Manifest · Channel Divinity')
  })

  it('paints an annotation of each kind, named', () => {
    const markup = paint({
      ...BASE,
      annotations: [
        { kind: 'positioning', text: 'Stand so the 10-ft aura covers Rune and Talon.' },
        { kind: 'party', text: 'Say it out loud before you cast.' },
        { kind: 'warning', text: 'Temporary hit points never stack.' },
      ],
    })
    expect(markup).toContain('Stand so the 10-ft aura covers Rune and Talon.')
    expect(markup).toContain('Say it out loud before you cast.')
    expect(markup).toContain('Temporary hit points never stack.')
    expect(markup).toContain('Positioning')
    expect(markup).toContain('Party')
    expect(markup).toContain('Heads up')
  })

  it('keeps the numerals off the coloured ink', () => {
    /* `ui/Badge.tsx` records why: `gold` measures 6.28:1, which clears WCAG
       V-2 for text and misses V-3's 7:1 floor for numerals, and the token to
       fix that does not exist yet. So gold prints the three letters REQ and
       the digits print on `forge-1`. If someone later tints the body, the
       requirement text moves off `text-forge-1` and this fails. */
    const markup = paint({ ...BASE, requirements: ['Save DC 14'] })
    expect(markup).toContain('text-gold')
    expect(markup).toMatch(/text-forge-1[^>]*">Save DC 14</)
  })
})

describe('a combo written before either field existed', () => {
  it('grows no empty rows, no labels, and no markers', () => {
    const markup = paint(BASE)
    expect(markup).not.toContain('REQ')
    expect(markup).not.toContain('Positioning')
    expect(markup).not.toContain('Party')
    expect(markup).not.toContain('Heads up')
  })

  it('still paints everything it painted before', () => {
    /* Guards the guard above: all four `not.toContain`s would pass against a
       card that had stopped rendering entirely. */
    const markup = paint(BASE)
    expect(markup).toContain('Hearth Wall')
    expect(markup).toContain('Manifest the Hearthfire')
    expect(markup).toContain('hearthfire')
  })
})
