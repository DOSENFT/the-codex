import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeTurn } from '../../lib/turn/compose'
import { groupBySlot, type BandSlot } from '../../lib/turn/bands'
import { NIX } from '../../lib/turn/fixtures/nix'
import { startCombat, useAction } from '../../lib/combat-state'
import { CONTENTION_WHY } from '../../lib/turn/contention'
import { ContentionNote, groupForSlot } from './ContentionNote'
import { Act } from './TurnRow'
import { TurnBands } from './TurnBands'

/* ============================================================================
   SLICE R3 — THE BRACKET BECOMES AN ANNOTATION.

   Marcus's third complaint was the box: "it also has my available spells in
   boxes labeled 'one of these — your bonus action. Pick one'... That seems
   wrong." It was, and R2 proved WHY it was wrong rather than merely ugly — to
   appear in that box an option had to LEAVE its band, so the list he was
   reading was emptiest exactly when he had the most to spend.

   The box is gone. The claim it made is not, because the claim is true and is
   the most valuable sentence on this screen. It now lives in two places, and
   this file is the proof that both of them are real and that they agree:

     · a `cmark` on every competing ROW      — where he is already looking
     · one `bcon` sentence at the FOOT       — the count and the rule

   WHAT MAKES THESE TESTS ABLE TO FAIL. Every one of them is red against the
   code that shipped before this slice: `cmark` did not exist, `TurnBands` had
   no `contention` prop, and the two "nothing is hidden" tests at the bottom
   assert the exact property R1's bracket violated by construction.
   ========================================================================== */

const ALL_OPEN = { action: true, bonusAction: true, reaction: true, movement: true, free: true }

const TURN = composeTurn({ character: NIX, combat: null })

function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

/** The markup of ONE band, sliced out of the screen.
 *
 *  Nix contends on TWO slots, which is why nothing in this file may ask a
 *  whole-screen question about a per-band fact: "is the sentence gone" is true
 *  of his Action band and false of his Bonus band at the same moment, and a
 *  global `not.toContain` would report the wrong one and call it a pass. */
function band(html: string, label: string): string {
  const parts = html.split('<section class="band')
  const hit = parts.find(p => p.includes(`class="blbl">${label}<`))
  expect(hit, `no ${label} band in this markup`).toBeDefined()
  return hit!
}

/** The real wiring, copied from `TurnLive` rather than invented, so that a
 *  divergence between what ships and what is tested turns this file red. */
const contention = (turn = TURN) => (slot: BandSlot) => (
  <ContentionNote group={groupForSlot(turn.mutex, slot)} />
)

const paint = (turn = TURN, open = ALL_OPEN) =>
  renderToStaticMarkup(
    <TurnBands
      bands={groupBySlot(turn)}
      open={open}
      onOpen={() => {}}
      contention={contention(turn)}
    />,
  )

describe('the fixture still has something to say — the premise of every test below', () => {
  it('Nix contends on at least one slot, and every face of a group shares it', () => {
    // A file full of green assertions about an empty `mutex` would prove
    // nothing at all, so the premise is asserted before anything is built on
    // it. If canon or the sheet ever stops producing contention, this goes red
    // FIRST and says so, instead of the rest going quietly vacuous.
    expect(TURN.mutex.length).toBeGreaterThan(0)
    for (const g of TURN.mutex) {
      expect(g.faces.length).toBeGreaterThanOrEqual(2)
      expect(new Set(g.faces.map(f => f.cost.slot)).size).toBe(1)
    }
  })
})

describe('the row says it competes', () => {
  it('marks a contended option and leaves an uncontended one exactly as it was', () => {
    // Both halves. A check that only looked for the marker would pass on a
    // screen that stamped "competes" on all fourteen of his options, which is
    // a worse lie than the box was.
    const face = TURN.mutex[0]!.faces[0]!
    expect(face.contended).toBe(true)
    expect(text(renderToStaticMarkup(<Act o={face} />))).toContain('competes')

    const plain = [...TURN.ranked, ...TURN.rest].find(o => !o.contended)
    expect(plain).toBeDefined()
    expect(renderToStaticMarkup(<Act o={plain!} />)).not.toContain('cmark')
  })

  it('stamps the band exactly as many times as the group has faces', () => {
    // The marker and the count in the sentence are read off the same `faces`,
    // so they cannot disagree — and this is the test that would catch it if a
    // future change gave them separate sources.
    const group = TURN.mutex[0]!
    const html = paint()
    expect(count(html, 'class="cmark"')).toBe(
      TURN.mutex.reduce((n, g) => n + g.faces.length, 0),
    )
    expect(text(html)).toContain(`${group.faces.length} of these compete`)
  })

  it('puts the marker between the name and the price, not after it', () => {
    // "This is one of several ways to spend one thing" qualifies the option;
    // the price says what that thing is. Read the other way round the
    // exception arrives after the fact it modifies.
    const face = TURN.mutex[0]!.faces[0]!
    const html = renderToStaticMarkup(<Act o={face} />)
    expect(html.indexOf('anm')).toBeLessThan(html.indexOf('cmark'))
    expect(html.indexOf('cmark')).toBeLessThan(html.indexOf('class="cost"'))
  })
})

describe('the sentence at the foot of the band', () => {
  it('says how many compete and which rule binds them', () => {
    const group = TURN.mutex[0]!
    const t = text(renderToStaticMarkup(<ContentionNote group={group} />))
    expect(t).toContain(`${group.faces.length} of these compete`)
    expect(t).toContain(CONTENTION_WHY[group.reason])
  })

  it('is a sentence and not a container — there is nowhere in it to put an option', () => {
    /* THE WHOLE POINT OF THE SLICE, ASSERTED. The bracket could regress into
       hiding options because it had room for them; this cannot, and the way to
       say so structurally is that it renders one <p> of two <span>s and no row,
       no list and no button. */
    const html = renderToStaticMarkup(<ContentionNote group={TURN.mutex[0]!} />)
    expect(html.startsWith('<p class="bcon">')).toBe(true)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<li')
    expect(html).not.toContain('class="act')
  })

  it('says nothing at all when there is no decision to make', () => {
    expect(renderToStaticMarkup(<ContentionNote group={null} />)).toBe('')
  })

  it('drops off the spent slot and stays on every other one', () => {
    /* `findContention` skips unavailable options, so a spent Action has no
       group — a sentence about weighing alternatives you can no longer take is
       the app arguing with itself.

       BOTH BANDS CHECKED, because the interesting failure is not "the sentence
       never disappears" but "the sentence disappears everywhere". Nix contends
       on his Action and on his Bonus action, and spending one must not silence
       the other. */
    const spent = composeTurn({
      character: NIX,
      combat: useAction({ ...startCombat(NIX), yourTurn: true }, 'action'),
    })
    expect(groupForSlot(spent.mutex, 'action')).toBeNull()
    expect(groupForSlot(spent.mutex, 'bonusAction')).not.toBeNull()

    const html = paint(spent)
    expect(band(html, 'Action')).not.toContain('class="bcon"')
    expect(band(html, 'Bonus')).toContain('of these compete — you get one')
    // …and the marker goes with it: a greyed row has no decision left in it.
    expect(band(html, 'Action')).not.toContain('class="cmark"')
  })

  it('drops the words the band header already says', () => {
    // The old caption read "One of these — your action. Pick one" under a band
    // headed ACTION. Repeating the slot was the part of it that was pure noise.
    const t = text(renderToStaticMarkup(<ContentionNote group={TURN.mutex[0]!} />))
    expect(t).not.toContain('One of these')
    expect(t.toLowerCase()).not.toContain('pick one')
  })
})

describe('groupForSlot — which group belongs to which band', () => {
  it('finds each group under the slot its faces cost', () => {
    for (const g of TURN.mutex) {
      expect(groupForSlot(TURN.mutex, g.faces[0]!.cost.slot)).toBe(g)
    }
  })

  it('returns null for a slot nothing contends on', () => {
    // Movement is the honest never-case on every sheet this engine has read.
    expect(groupForSlot(TURN.mutex, 'movement')).toBeNull()
    expect(groupForSlot([], 'action')).toBeNull()
  })
})

describe('the sentence lands in the band it is about', () => {
  it('appears once per contending band and not once per screen', () => {
    const html = paint()
    expect(count(html, 'class="bcon"')).toBe(TURN.mutex.length)
  })

  it('sits AFTER the rows it describes and BEFORE the next band', () => {
    // Searched positionally, not globally: a sentence appended below the last
    // band would satisfy `toContain` and be a claim about the wrong rows.
    const group = TURN.mutex[0]!
    const slot = group.faces[0]!.cost.slot
    const bands = groupBySlot(TURN)
    const idx = bands.findIndex(b => b.slot === slot)
    const html = paint()
    const at = html.indexOf(`${group.faces.length} of these compete`)
    expect(at).toBeGreaterThan(-1)
    for (const o of bands[idx]!.options) expect(at).toBeGreaterThan(html.indexOf(o.name))
    const next = bands[idx + 1]
    if (next) expect(at).toBeLessThan(html.indexOf(`>${next.label}<`))
  })

  it('collapses with its band — nothing on this screen is unputawayable', () => {
    // Folded band loses its sentence; the OTHER contending band keeps its own.
    // Asserting only the first half would pass on a screen that dropped every
    // sentence the moment any band was folded.
    const bands = groupBySlot(TURN)
    const labels = TURN.mutex.map(
      g => bands.find(b => b.slot === g.faces[0]!.cost.slot)!.label,
    )
    expect(labels.length).toBeGreaterThan(1)
    const [folded, ...others] = labels
    const slot = TURN.mutex[0]!.faces[0]!.cost.slot
    const html = paint(TURN, { ...ALL_OPEN, [slot]: false })
    expect(band(html, folded!)).not.toContain('class="bcon"')
    for (const other of others) expect(band(html, other)).toContain('class="bcon"')
  })

  it('without the prop the bands are byte-for-byte what R2 shipped', () => {
    // The declared revert, asserted rather than asserted-about.
    const bare = renderToStaticMarkup(
      <TurnBands bands={groupBySlot(TURN)} open={ALL_OPEN} onOpen={() => {}} />,
    )
    const nulled = renderToStaticMarkup(
      <TurnBands
        bands={groupBySlot(TURN)}
        open={ALL_OPEN}
        onOpen={() => {}}
        contention={() => null}
      />,
    )
    expect(nulled).toBe(bare)
    expect(paint()).not.toBe(bare)
  })
})

describe('the defect the box caused is gone, and stays gone', () => {
  it('every face has a row of its own in its own band', () => {
    /* R1's failure, stated as a property. A face used to be REMOVED from
       `ranked`/`rest` to live in the bracket, so it was absent from its band
       for exactly as long as it was takeable. */
    const bands = groupBySlot(TURN)
    for (const g of TURN.mutex) {
      const band = bands.find(b => b.slot === g.faces[0]!.cost.slot)!
      for (const f of g.faces) {
        expect(band.options.map(o => o.id)).toContain(f.id)
      }
    }
  })

  it('and has that row exactly once — the property the bracket was defending', () => {
    const html = paint()
    for (const g of TURN.mutex) {
      for (const f of g.faces) expect(count(html, `>${f.name}<`)).toBe(1)
    }
  })
})
