/* ============================================================================
   THE CAPTURE, AS PAINTED — Table Truth slice 10f.

   `lib/turn/retaliation.test.ts` proves the number. This proves the CONTROL:
   that both of Marcus's decisions actually reached the glass.

     "App rolls, but I can correct it"  → the rolled value is in a TEXT FIELD,
                                          not in a label. If it ever becomes a
                                          label the control still looks right
                                          and quietly stops being true.
     "Cloak up, but always reachable"   → the standing button is on the row
                                          that carries the die and nowhere
                                          else, with no condition on it.

   Rendered with `renderToStaticMarkup` for the reason `ReactionsBand.test.tsx`
   gives at length: the repo has no jsdom. That is also why the confirm strip is
   exported separately — a strip that only exists after a click would be
   invisible to this suite, and it is the half that holds the number. The taps
   themselves are driven for real by docs/plans/table-truth/prove-slice10f.mjs.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { RetaliationDie } from '../../lib/turn/retaliation'
import { ReactionsBand } from './ReactionsBand'
import { RetaliationCapture, RetaliationConfirm } from './RetaliationCapture'

const DIE: RetaliationDie = {
  notation: '1d10',
  quantity: 1,
  dieType: 10,
  damageType: 'Fire',
  feature: 'Hearthfire Manifest',
}

/** Tags removed, NOTHING put in their place — what `textContent` reports.
 *  Finding AY: a stripper that substitutes a space is more generous than the
 *  DOM, and every assertion below would pass over glued words. */
const domText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim()

/** The markup cut at block boundaries, each block reduced to its own text —
 *  `ReactionsBand.test.tsx`'s helper, and the cut is a NUL ON PURPOSE. Splitting
 *  on a space splits sentences, and worse, it splits ATTRIBUTES: `viewBox="0 0
 *  24 24"` comes apart into fragments that survive tag-stripping and read as
 *  glued words, so the check fails on the chevron icon rather than on any text
 *  a human will ever see. */
const blocks = (html: string) =>
  html
    .replace(/<\/?(?:p|div|li|ul|section|h[1-6]|button|label|textarea)\b[^>]*>/g, '\0')
    .split('\0')
    .map(domText)
    .filter(b => b.length > 0)

const noop = () => true

// ---------------------------------------------------------------------------
// The standing control
// ---------------------------------------------------------------------------

describe('RetaliationCapture — the standing button', () => {
  const render = (tally?: { total: number; hits: number }) =>
    renderToStaticMarkup(
      <RetaliationCapture die={DIE} offer="button" onRecord={noop} tally={tally} />,
    )

  it('names the die canon stated, and offers to add it', () => {
    expect(domText(render())).toContain('+1d10 retaliation')
  })

  it('says "none yet" rather than a zero', () => {
    /* A zero total reads as a measurement — "the cloak has done nothing" —
       when the truth is that nothing has been recorded. At a table those are
       different facts, and only one of them is worth a shrug. */
    expect(domText(render())).toContain('none yet')
    expect(domText(render())).not.toContain('TOTAL')
  })

  it('shows the DM the total AND the hit count', () => {
    const seen = domText(render({ total: 23, hits: 4 }))
    expect(seen).toContain('TOTAL 23 Fire over 4 hits')
  })

  it('reaches the prover by name, not by pixel', () => {
    expect(render()).toContain('aria-label="Record 1d10 Fire retaliation"')
  })

  it('offers nothing to type until it has rolled', () => {
    // The strip is the SECOND step. A field standing open before the roll would
    // be a different control — one that asks Marcus for a number rather than
    // offering him one to correct.
    expect(render()).not.toContain('<input')
  })
})

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

describe('RetaliationCapture — the prompt under the HP tracker', () => {
  const html = renderToStaticMarkup(
    <RetaliationCapture die={DIE} offer="prompt" onRecord={noop} onDismiss={() => {}} />,
  )

  it('asks, in the feature’s own name, and takes yes or no', () => {
    const seen = domText(html)
    expect(seen).toContain('Hearthfire Manifest — roll 1d10 retaliation?')
    expect(seen).toContain('Yes')
    expect(seen).toContain('No')
  })

  it('does not put a running total in front of a man logging damage', () => {
    expect(domText(html)).not.toContain('TOTAL')
  })
})

// ---------------------------------------------------------------------------
// The confirm strip — Marcus's decision, on the glass
// ---------------------------------------------------------------------------

describe('RetaliationConfirm — the app rolls, and he can correct it', () => {
  const strip = (value: string) =>
    renderToStaticMarkup(
      <RetaliationConfirm
        die={DIE}
        value={value}
        onChange={() => {}}
        onAdd={() => {}}
        onCancel={() => {}}
      />,
    )

  it('puts the rolled number in an EDITABLE FIELD, not in a label', () => {
    /* THE WHOLE OF HIS ANSWER. Half the time the die that decides this is a
       real d10 on a real table and the app cannot see it. A 7 rendered as text
       would look identical and be a lie he cannot fix. */
    const html = strip('7')
    expect(html).toContain('<input')
    expect(html).toContain('value="7"')
    expect(html).toContain('aria-label="1d10 Fire retaliation damage"')
  })

  it('brings up a numeric keypad without using a number input', () => {
    // `type="number"` reports "" for a half-typed value, which would flicker
    // Add off between the 1 and the 2 of a 12.
    expect(strip('7')).toContain('inputMode="numeric"')
    expect(strip('7')).not.toContain('type="number"')
  })

  it('says what the damage is, and offers both answers', () => {
    const seen = domText(strip('7'))
    expect(seen).toContain('rolled')
    expect(seen).toContain('Fire')
    expect(seen).toContain('Add')
    expect(seen).toContain('Cancel')
  })

  it('will not add a number that is not damage', () => {
    for (const value of ['', '0', '-2', 'x']) {
      expect(strip(value), `value ${JSON.stringify(value)}`).toContain('disabled=""')
    }
    expect(strip('12')).not.toContain('disabled=""')
  })

  it('says nothing at all when there is nothing to complain about', () => {
    expect(strip('7')).not.toContain('role="status"')
  })

  it('paints the reducer’s own words when an Add is turned down', () => {
    /* THE SILENT-NO-OP GUARD. `onRecord` returning false leaves the number on
       screen — and nothing else about the strip changes, so a refused Add looks
       exactly like a dead button. The app's one refusal surface is
       `OptionDetailSheet`, which this control is not inside, so the line has to
       be here or it is nowhere. */
    const html = renderToStaticMarkup(
      <RetaliationConfirm
        die={DIE}
        value="7"
        onChange={() => {}}
        onAdd={() => {}}
        onCancel={() => {}}
        note="Start the encounter before recording retaliation damage."
      />,
    )
    expect(html).toContain('role="status"')
    expect(domText(html)).toContain('Start the encounter before recording retaliation damage.')
    // And the number he typed is still there to press Add on again.
    expect(html).toContain('value="7"')
  })

  it('separates its words with WORDS, not with margins', () => {
    // Finding AY. `gap-2` is a gap on screen and nothing at all in the text.
    expect(domText(strip('7'))).toContain('rolled Fire')
    expect(blocks(strip('7')).filter(b => /[a-z][A-Z]/.test(b))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// In the band
// ---------------------------------------------------------------------------

const turn = composeTurn({ character: NIX, combat: null })

const band = (props: Partial<Parameters<typeof ReactionsBand>[0]> = {}) =>
  renderToStaticMarkup(
    <ReactionsBand turn={turn} character={NIX} isOpen onToggle={() => {}} {...props} />,
  )

describe('ReactionsBand — the die is offered on the row that carries it', () => {
  it('gives the cloak a button and the Opportunity Attack none', () => {
    /* THE INVERSE IS THE CLAIM. Opportunity Attack carries 1d8+4 Slashing on
       this very sheet, and a recogniser that looked for dice would offer to
       tally every off-turn swing — inflating the exact number the DM asked
       for. Two reaction rows, one button. */
    const html = band({ onRetaliate: noop })
    expect((html.match(/aria-label="Record [^"]*retaliation"/g) ?? []).length).toBe(1)
    expect(html).toContain('aria-label="Record 1d10 Fire retaliation"')
  })

  it('carries the encounter’s total onto the row', () => {
    expect(domText(band({ onRetaliate: noop, tally: { total: 23, hits: 4 } }))).toContain(
      'TOTAL 23 Fire over 4 hits',
    )
  })

  it('is ALWAYS there — no condition about the cloak being up', () => {
    /* Marcus's decision: "always reachable". The prompt under the HP tracker
       is the convenience and it only fires while the cloak is up; this is the
       guarantee, and a guarantee with a condition on it is not one. `NIX` has
       no temp HP at all here — the cloak is DOWN — and the button is present. */
    expect(NIX.tempHP).toBe(0)
    expect(band({ onRetaliate: noop })).toContain('aria-label="Record 1d10 Fire retaliation"')
  })

  it('a band given no handler is the slice 8b band, byte for byte', () => {
    // Every caller that has not been wired — and every test written before this
    // slice — must get exactly what it got before.
    expect(band()).toBe(band({ tally: { total: 23, hits: 4 } }))
    expect(band()).toBe(band({ refusal: 'Start the encounter before recording retaliation damage.' }))
    expect(band()).not.toContain('retaliation?')
    expect(band()).not.toContain('aria-label="Record 1d10 Fire retaliation"')
  })

  it('still never ellipsises', () => {
    const html = band({ onRetaliate: noop, tally: { total: 23, hits: 4 } })
    expect(html).not.toContain('…')
    expect(html).not.toContain('&hellip;')
    expect(html).not.toMatch(/\.\.\./)
  })

  it('joins no two words inside any one block', () => {
    const html = band({ onRetaliate: noop, tally: { total: 23, hits: 4 } })
    const offenders = blocks(html).filter(b => /[a-z][A-Z]/.test(b))
    expect(offenders, `blocks with glued words: ${offenders.join(' | ')}`).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Taking one back — Held Reaction slice 5
// ---------------------------------------------------------------------------

/* WHY THIS IS A SLICE AND NOT A FOOTNOTE. `04-slices.md` predicted slice 5 would
   need no code: `reduce.ts` accumulates, `revert` restores a whole snapshot, and
   `retaliation.test.ts` already proves that undoing the FIRST of three leaves
   the other two intact. All true, and all of it behind a door that was not on
   his screen — `measure-slice5.mjs` found the standing button painted, the tally
   painted, and no Undo button anywhere in the document. The engine could reverse
   a mistyped 17; the table could not.

   The label is the LOG ENTRY'S OWN, not a sentence built here. `reduce.ts` sets
   `${source} — ${rolled} retaliation` and that string is what the button says,
   so the words on the button and the event behind it are one fact read once. */

const UNDO_LABEL = 'Hearthfire Manifest — 7 retaliation'

describe('the correction — a tally that cannot be corrected is not evidence', () => {
  const standing = (props: Partial<Parameters<typeof RetaliationCapture>[0]> = {}) =>
    renderToStaticMarkup(
      <RetaliationCapture
        die={DIE}
        offer="button"
        onRecord={noop}
        tally={{ total: 23, hits: 4 }}
        {...props}
      />,
    )

  it('offers to take back the last one, in the log’s own words', () => {
    /* THE AMOUNT IS THE POINT. He rolls physical dice and types the result, so
       the mistake this exists to fix is a typed 17 where the die said 7. A
       button reading only "Undo" would be asking him to remember which. */
    const seen = domText(standing({ onUndo: () => {}, undoLabel: UNDO_LABEL }))
    expect(seen).toContain(`Undo ${UNDO_LABEL}`)
  })

  it('paints nothing at all when there is nothing to take back', () => {
    /* An empty log. Not a disabled button — `TempHPSource`'s rule, and the same
       reason: a control that is present and dead teaches Marcus to distrust the
       ones that are present and live. */
    const seen = domText(standing({ onUndo: () => {}, undoLabel: null }))
    expect(seen).not.toContain('Undo')
  })

  it('paints nothing when the caller withheld the handler', () => {
    /* THE HONESTY GATE, FROM THIS END. `ReactionsBandLive` passes `onUndo` only
       when the entry at the top of the log IS a retaliation. When it is not, a
       label may still arrive; the control must stay silent rather than offer to
       undo a spell slot from beside a fire total. */
    const seen = domText(standing({ undoLabel: 'Divine Smite — 2nd-level slot' }))
    expect(seen).not.toContain('Undo')
    expect(seen).not.toContain('Divine Smite')
  })

  it('leaves the pre-slice-5 control byte for byte unchanged', () => {
    // Every caller not yet wired, and every test written before this slice.
    expect(standing()).toBe(standing({ undoLabel: null }))
    expect(standing()).not.toContain('Undo')
  })

  it('does not put an Undo in front of a man logging damage', () => {
    /* The prompt is the convenience, fired mid-damage-entry under the HP
       tracker. Correcting the PREVIOUS hit is not the question being asked
       there, and the same reasoning already keeps the tally off it. */
    const html = renderToStaticMarkup(
      <RetaliationCapture
        die={DIE}
        offer="prompt"
        onRecord={noop}
        onDismiss={() => {}}
        onUndo={() => {}}
        undoLabel={UNDO_LABEL}
      />,
    )
    expect(domText(html)).not.toContain('Undo')
  })

  it('reaches the row that carries the die, through the band', () => {
    const seen = domText(
      band({
        onRetaliate: noop,
        tally: { total: 23, hits: 4 },
        onUndo: () => {},
        undoLabel: UNDO_LABEL,
      }),
    )
    expect(seen).toContain('TOTAL 23 Fire over 4 hits')
    expect(seen).toContain(`Undo ${UNDO_LABEL}`)
  })

  it('separates its words with WORDS, here too', () => {
    // Finding AY, on the newest text on the tab.
    const html = band({
      onRetaliate: noop,
      tally: { total: 23, hits: 4 },
      onUndo: () => {},
      undoLabel: UNDO_LABEL,
    })
    const offenders = blocks(html).filter(b => /[a-z][A-Z]/.test(b))
    expect(offenders, `blocks with glued words: ${offenders.join(' | ')}`).toEqual([])
    expect(html).not.toContain('…')
  })
})
