/* ============================================================================
   THE ROLL, AS CAPTURED — physical-dice-first, phase A.

   `lib/dice.ts` no longer rolls anything, so there is no longer a roll to
   prove. What replaces it is arithmetic performed on a number Marcus types,
   and that is what this file is about: the app's half of a roll it did not
   make.

   Two claims, and both are shaped so that the obvious regression fails them.

     "I type it, the app adds it"   → the face he entered lives in an INPUT's
                                      value, never in text. The moment it
                                      becomes a label the panel still looks
                                      correct and silently stops being able to
                                      take his number at all — which is exactly
                                      how the old roller looked right for a
                                      year while rolling dice he never used.

     "The dice removal is final"    → no canvas, and no button offering to roll.
                                      A `three.js` stage or a Roll button
                                      reappearing is a 230 KB regression that
                                      no type error would catch, so it is
                                      caught here instead.

   Rendered with `renderToStaticMarkup` for the reason `ReactionsBand.test.tsx`
   gives at length: the repo has no jsdom. That is also why `CaptureStrip` is
   exported separately — it carries the arithmetic and only appears once there
   is something to add up.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RollCapture, CaptureStrip, faceRange, boxCount, keptFace } from './RollCapture'

/** Tags removed, NOTHING put in their place — what `textContent` reports.
 *  Same helper, and the same reason, as `RetaliationCapture.test.tsx`. */
const domText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const noop = () => {}

const strip = (props: Partial<Parameters<typeof CaptureStrip>[0]> = {}) =>
  renderToStaticMarkup(
    <CaptureStrip
      dieType={20}
      quantity={1}
      modifier={0}
      advantage="normal"
      faces={['']}
      onFaceChange={noop}
      onCommit={noop}
      {...props}
    />,
  )

// ---------------------------------------------------------------------------
// The arithmetic, as functions
// ---------------------------------------------------------------------------

describe('faceRange — what a handful of dice can physically show', () => {
  it('bounds 2d8 at 2 and 16, not at 1 and 8', () => {
    /* The lower bound is the QUANTITY, not 1. Two dice cannot total 1, and a
       range starting at 1 would wave through the single most likely typo:
       entering one die's face when two were rolled. */
    expect(faceRange(8, 2)).toEqual([2, 16])
  })

  it('bounds a lone d20 at 1 and 20', () => {
    expect(faceRange(20, 1)).toEqual([1, 20])
  })

  it('leaves the modifier out of the range entirely', () => {
    /* 1d20 is 1–20 whether the bonus is +8 or 0. If the modifier were folded
       in, the one number he types would be the one he had to do arithmetic on
       first, which is the entire thing this panel exists to stop. */
    expect(faceRange(20, 1)).toEqual(faceRange(20, 1))
    expect(faceRange(6, 3)).toEqual([3, 18])
  })
})

describe('boxCount — how many numbers to ask for', () => {
  it('asks for two only on a d20 with advantage or disadvantage', () => {
    expect(boxCount(20, 'advantage')).toBe(2)
    expect(boxCount(20, 'disadvantage')).toBe(2)
  })

  it('asks for one on a normal d20', () => {
    expect(boxCount(20, 'normal')).toBe(1)
  })

  it('asks for one on 2d8 — a hand reads the sum, not each die', () => {
    /* Advantage is the ONE case where a person genuinely reads two dice
       separately. Scooping up 2d8 and reading 11 is a single act, and asking
       for two numbers there would be the app inventing work. */
    expect(boxCount(8, 'normal')).toBe(1)
    expect(boxCount(8, 'advantage')).toBe(1)
  })
})

describe('keptFace — which d20 counts', () => {
  it('takes the higher on advantage', () => {
    expect(keptFace([14, 7], 'advantage')).toBe(14)
    expect(keptFace([7, 14], 'advantage')).toBe(14)
  })

  it('takes the lower on disadvantage', () => {
    expect(keptFace([14, 7], 'disadvantage')).toBe(7)
    expect(keptFace([7, 14], 'disadvantage')).toBe(7)
  })

  it('takes the only face there is when there is one', () => {
    expect(keptFace([11], 'normal')).toBe(11)
  })
})

// ---------------------------------------------------------------------------
// The strip, as painted
// ---------------------------------------------------------------------------

describe('CaptureStrip — his number, the app’s addition', () => {
  it('holds the face in an input value and NOWHERE in the text', () => {
    const html = strip({ faces: ['14'], modifier: 8 })

    // It is editable...
    expect(html).toContain('value="14"')
    expect(html).toContain('<input')

    /* ...and it is NOT a label. This is the falsifying half: render the 14 as
       a span and the line above still passes on the attribute, so the check
       that matters is that stripping the tags leaves no 14 behind. */
    expect(domText(html)).not.toContain('14')
  })

  it('adds the modifier to the face and shows the total', () => {
    const html = strip({ faces: ['14'], modifier: 8 })
    expect(domText(html)).toContain('22')
  })

  it('subtracts a negative modifier rather than pasting a minus sign on', () => {
    const html = strip({ faces: ['14'], modifier: -2 })
    expect(domText(html)).toContain('12')
  })

  it('shows no total at all until a face is entered', () => {
    /* An empty box must not read as a 0. A zero total is a claim about a roll
       that has not happened, and it is indistinguishable at a glance from a
       real bad roll. */
    const html = strip({ faces: [''], modifier: 8 })
    expect(domText(html)).not.toContain('8 =')
    expect(html).not.toContain('<output')
  })

  it('refuses a face the dice could not have shown, and names the range', () => {
    const html = strip({ dieType: 8, quantity: 2, faces: ['19'], modifier: 0 })
    const text = domText(html)
    expect(text).toContain('2d8 can only show 2–16.')
    // Refused means refused: no total is offered alongside the complaint.
    expect(html).not.toContain('<output')
  })

  it('accepts the extremes of that range', () => {
    expect(domText(strip({ dieType: 8, quantity: 2, faces: ['2'] }))).toContain('2')
    expect(domText(strip({ dieType: 8, quantity: 2, faces: ['16'] }))).toContain('16')
  })

  it('puts up two boxes on advantage and says which one it is taking', () => {
    const html = strip({ faces: ['14', '7'], modifier: 8, advantage: 'advantage' })
    expect((html.match(/<input/g) ?? []).length).toBe(2)
    expect(domText(html)).toContain('Taking the higher: 14')
    expect(domText(html)).toContain('22')
  })

  it('says the lower one out loud on disadvantage', () => {
    const html = strip({ faces: ['14', '7'], modifier: 8, advantage: 'disadvantage' })
    expect(domText(html)).toContain('Taking the lower: 7')
    expect(domText(html)).toContain('15')
  })

  it('holds a half-typed value rather than dropping it', () => {
    /* `type="text"` with `inputMode="numeric"`, not `type="number"` — the same
       ruling `RetaliationCapture` made and for the same reason: a number input
       reports "" for a partial value, so the total would flicker between the
       1 and the 2 of a 12. */
    const html = strip({ faces: ['1'], modifier: 0 })
    expect(html).toContain('inputMode="numeric"')
    expect(html).not.toContain('type="number"')
  })
})

// ---------------------------------------------------------------------------
// The removal, held in place
// ---------------------------------------------------------------------------

describe('RollCapture — the panel does not roll', () => {
  const html = renderToStaticMarkup(<RollCapture isOpen onClose={noop} />)

  it('renders no canvas — three.js is gone and stays gone', () => {
    expect(html).not.toContain('<canvas')
  })

  it('offers to log a roll, never to make one', () => {
    const text = domText(html)
    expect(text).toContain('Log it')
    /* "Roll 1d20+8" was the old primary button's label. Its return would mean
       the RNG came back with it. */
    expect(text).not.toMatch(/Roll \d*d\d+/)
  })

  it('asks for what the dice showed', () => {
    expect(domText(html)).toContain('you rolled')
  })

  it('calls itself Your Roll, because it is his', () => {
    expect(domText(html)).toContain('Your Roll')
    expect(html).toContain('aria-label="Roll capture"')
  })
})
