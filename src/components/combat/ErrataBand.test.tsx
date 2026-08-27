import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ErrataBand } from './ErrataBand'
import { liveErrata, laterErrata } from '../../lib/canon/errata'
import { setRuling, type ErratumRulings } from '../../lib/errata-rulings'
import { NIX } from '../../lib/turn/fixtures/nix'

/* ============================================================================
   THE TWELVE, PAINTED — Table Truth slice 8.

   Node-environment renders, so these are claims about the MODEL reaching the
   markup; finding Q still stands and the browser prover owns the paint. What
   they prove is the part a screenshot cannot: that canon's OWN text arrives
   whole, that the level split is computed from Nix's sheet rather than written
   down, and that the ruling control is reachable without first opening a fold.

   The band is fed from the real corpus and the real fixture rather than from
   hand-built errata. A fixture band would pass with the corpus deleted.
   ========================================================================= */

const live = liveErrata(NIX.features, NIX.level)
const later = laterErrata(NIX.features, NIX.level)

const paint = ({
  isOpen = true,
  rulings = {} as ErratumRulings,
  initiallyExpanded = [] as string[],
  laterOpen = false,
} = {}) =>
  renderToStaticMarkup(
    <ErrataBand
      live={live}
      later={later}
      rulings={rulings}
      isOpen={isOpen}
      onToggle={() => {}}
      onRule={() => {}}
      initiallyExpanded={initiallyExpanded}
      laterOpen={laterOpen}
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

describe('ErrataBand — closed', () => {
  it('costs one line, and that line says what is left to DO', () => {
    /* Collapsed by default in CombatHelper, so the closed state is the one on
       screen most of the time. "6" alone is a number you learn to ignore. */
    const t = text(paint({ isOpen: false }))
    expect(t).toContain('Rules flags')
    expect(t).toContain('6 · 6 unanswered')
  })

  it('counts down as rulings are recorded', () => {
    const rulings = setRuling({}, live[0].erratum.id, 'canon', undefined, new Date('2026-08-27'))
    expect(text(paint({ isOpen: false, rulings }))).toContain('6 · 5 unanswered')
  })

  it('says "all answered" rather than "0 unanswered" when the work is done', () => {
    let rulings: ErratumRulings = {}
    for (const s of live) rulings = setRuling(rulings, s.erratum.id, 'canon', undefined, new Date('2026-08-27'))
    const t = text(paint({ isOpen: false, rulings }))
    expect(t).toContain('all answered')
    expect(t).not.toContain('unanswered')
  })

  it('paints nothing else while closed', () => {
    expect(text(paint({ isOpen: false }))).not.toContain('How your table ruled it')
  })
})

describe('ErrataBand — the live six', () => {
  it('gives each of the six a row, named one by one', () => {
    /* Counted totals hide the case where one is dropped and another appears
       twice. HEARTH-07 and HEARTH-08 are the two that reach no turn option at
       all, which is exactly why this band exists. */
    const html = paint()
    for (const id of ['HEARTH-03', 'HEARTH-04', 'HEARTH-05', 'HEARTH-06', 'HEARTH-07', 'HEARTH-08']) {
      expect(html).toContain(id)
    }
  })

  it('leads with the worst one', () => {
    const html = paint()
    const first = html.indexOf('HEARTH-03')  // HIGH
    const last = html.indexOf('HEARTH-08')   // LOW
    expect(first).toBeGreaterThan(-1)
    expect(first).toBeLessThan(last)
  })

  it('prints the fault WHOLE, cutting nothing off the end', () => {
    /* The phase's definition of done, applied to this surface. Asserted against
       canon's own string rather than a substring of it, so a clamp at any width
       fails rather than passing on the first sentence. */
    const t = text(paint())
    for (const s of live) {
      expect(t, s.erratum.id).toContain(s.erratum.problem.replace(/\s+/g, ' ').trim())
    }
    expect(t).not.toContain('…')
    expect(t).not.toMatch(/\.\.\./)
  })

  it('keeps canon’s OWN ellipsis, which is not the app cutting anything', () => {
    /* Found by the browser prover, which flagged an ellipsis and was wrong to.
       HEARTH-03's recommendedFix quotes a suggested rules sentence and elides
       its tail. Deleting that would falsify the source, so the invariant is not
       "no ellipsis on the glass" — it is "no ellipsis the APP introduced".

       This is also the honest bound on the test above: it passes partly because
       the collapsed row never reaches canon's quoted text. Open the row and an
       ellipsis appears, legitimately. Pinned so nobody later "fixes" it. */
    const fix = live.find(s => s.erratum.id === 'HEARTH-03')!.erratum.recommendedFix!
    expect(fix, 'canon changed — this test is now guarding nothing').toMatch(/\.\.\./)

    const t = text(paint({ initiallyExpanded: ['HEARTH-03'] }))
    expect(t).toContain(fix.replace(/\s+/g, ' ').trim())
    /* And the tail after the elision survives, which is what a clamp would eat. */
    expect(t).toContain('Alternatively convert to a Bonus Action')
  })

  it('names the feature and the severity on every row', () => {
    const t = text(paint())
    expect(t).toContain('Hearthfire Manifest')
    expect(t).toContain('Aura of Solace')
    expect(t).toContain('Oath Spells')
    expect(t).toContain('high')
    expect(t).toContain('low')
  })

  it('says WHERE the level came from, because the two sources can disagree', () => {
    /* Hearthfire Manifest is a row on Nix's sheet; "Oath Spells" is a category
       and only canon knows its level. A player about to argue a rule is
       entitled to know which one the app believed. */
    const t = text(paint())
    expect(t).toContain('level 3 · your sheet')
    expect(t).toContain('level 5 · canon')
  })
})

describe('ErrataBand — canon’s fix is one tap away, the answer is not', () => {
  it('holds back the fix, the app note and the reasoning until the row is tapped', () => {
    const t = text(paint())
    expect(t).not.toContain("Canon's recommended fix")
    expect(t).not.toContain('What this app does about it')
    expect(t).toContain('what canon says to do about it')   // the affordance
  })

  it('paints them whole once it is', () => {
    const h03 = live.find(s => s.erratum.id === 'HEARTH-03')!.erratum
    const t = text(paint({ initiallyExpanded: ['HEARTH-03'] }))
    expect(t).toContain("Canon's recommended fix")
    expect(t).toContain(h03.recommendedFix!.replace(/\s+/g, ' ').trim())
    expect(t).toContain('What this app does about it')
    expect(t).toContain(h03.appAction.replace(/\s+/g, ' ').trim())
  })

  it('expands only the row that was tapped', () => {
    const t = text(paint({ initiallyExpanded: ['HEARTH-03'] }))
    const h04 = live.find(s => s.erratum.id === 'HEARTH-04')!.erratum
    expect(t).not.toContain(h04.appAction.replace(/\s+/g, ' ').trim())
  })

  it('offers the ruling on every row WITHOUT a tap — the caption must be actionable', () => {
    /* If this were behind the fold, "6 still unanswered" would cost six taps
       to act on, which is a nag rather than a to-do list. */
    const html = paint()
    expect(html.match(/How your table ruled it/g)).toHaveLength(6)
    for (const id of ['HEARTH-03', 'HEARTH-08']) {
      expect(html).toContain(`aria-label="Ruling for ${id}"`)
    }
  })
})

describe('ErrataBand — the ruling control', () => {
  it('shows all three answers, with none of them pre-selected', () => {
    /* Canon's own instruction on HEARTH-01: "Do not silently implement either
       version. Present the conflict to the player." A control defaulting to
       "Canon's fix" is implementing it silently. */
    const html = paint()
    const t = text(html)
    expect(t).toContain('Not asked yet')
    expect(t).toContain("Canon's fix")
    expect(t).toContain('My DM ruled')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(6)   // the six "Not asked yet"
  })

  it('marks the recorded answer as the pressed one, on the RIGHT erratum', () => {
    /* Six identical control groups on one screen, so "a pressed Canon's fix
       exists somewhere in the markup" would pass with the ruling attached to
       the wrong row. Slice to HEARTH-03's group and read only that. */
    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, new Date('2026-08-27'))
    const html = paint({ rulings })
    const from = html.indexOf('aria-label="Ruling for HEARTH-03"')
    const to = html.indexOf('aria-label="Ruling for HEARTH-04"')
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)

    const group = html.slice(from, to)
    const pressed = /aria-pressed="true"[^>]*>([^<]*)</.exec(group)
    expect(text(pressed?.[1] ?? '')).toBe("Canon's fix")
    expect(group.match(/aria-pressed="true"/g)).toHaveLength(1)
  })

  it('opens a box for the DM’s words only when the DM has ruled', () => {
    expect(paint()).not.toContain("In your DM's words")
    const rulings = setRuling({}, 'HEARTH-04', 'dm', 'temp HP does not stack, my call', new Date('2026-08-27'))
    const html = paint({ rulings })
    expect(text(html)).toContain("In your DM's words")
    expect(html).toContain('temp HP does not stack, my call')
    expect(html).toContain('id="dm-HEARTH-04"')
  })

  it('says the DM’s wording is kept when the answer moves to canon’s fix', () => {
    /* `setRuling` carries the words rather than clearing them. Saying so beats
       Marcus wondering whether they were thrown away — the silent version of
       this is indistinguishable from data loss. */
    const ruled = setRuling({}, 'HEARTH-04', 'dm', 'temp HP does not stack', new Date('2026-08-27'))
    const switched = setRuling(ruled, 'HEARTH-04', 'canon', undefined, new Date('2026-08-28'))
    const t = text(paint({ rulings: switched }))
    expect(t).toContain("Your DM's earlier wording is kept")
    expect(t).not.toContain("In your DM's words")
  })
})

describe('ErrataBand — what arrives later', () => {
  it('folds the six that are not yours yet, and says how many', () => {
    const t = text(paint())
    expect(t).toContain('6 more arrive as you level')
    expect(t).not.toContain('Smoldering Smite')
  })

  it('lists them soonest-first with the level that brings them', () => {
    const t = text(paint({ laterOpen: true }))
    expect(t).toContain('Smoldering Smite')
    expect(t).toContain('Hearth Warden')
    expect(t.indexOf('Smoldering Smite')).toBeLessThan(t.indexOf('Hearth Warden'))
    expect(t).toContain('level 15 · your sheet')
  })

  it('gives the later ones no ruling control — there is nothing to rule on yet', () => {
    const html = paint({ laterOpen: true })
    expect(html.match(/How your table ruled it/g)).toHaveLength(6)   // still only the live six
    expect(html).not.toContain('aria-label="Ruling for HEARTH-01"')
  })

  it('prints their faults whole too', () => {
    const t = text(paint({ laterOpen: true }))
    for (const s of later) {
      expect(t, s.erratum.id).toContain(s.erratum.problem.replace(/\s+/g, ' ').trim())
    }
  })
})

describe('ErrataBand — a character canon has nothing to say about', () => {
  it('still renders, and says so rather than vanishing', () => {
    /* Same rule as the reactions band: a band that disappears leaves you
       wondering whether it disappeared or you missed it. */
    const html = renderToStaticMarkup(
      <ErrataBand
        live={[]}
        later={[]}
        rulings={{}}
        isOpen
        onToggle={() => {}}
        onRule={() => {}}
      />
    )
    expect(text(html)).toContain('Nothing canon flags applies to what you can do yet')
    expect(html).not.toContain('arrive as you level')
  })
})
