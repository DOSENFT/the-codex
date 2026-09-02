import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OptionDetailBody } from './OptionDetailSheet'
import { optionDetail } from '../../lib/turn/detail'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { EconomyState, TurnOption } from '../../lib/turn/types'

/* ============================================================================
   HIS NOTE ON AN ACTION, BACK ON A SCREEN — slice 8d-3, the render half.

   HIS RULING, VERBATIM: "I'm not sure what editing strategic tip was or what it
   would allow for or what feature it's inside of/effects, but it kind of seems
   like a loss. Unless it would cause too much drift/mess/conflict to allow."

   The capability is: a line HE writes about an action, kept with that action,
   still there next session. It lived in `TurnSummary`'s expanded row; that
   component is mounted nowhere now, so the writing survives on disk and the
   reader does not. This band is the reader.

   IT IS ADDITIVE, NOT AN OVERRIDE, AND THAT IS A DELIBERATE DEPARTURE. V0.9's
   `customTip` REPLACED an auto-generated one-line `strategicTip`. This sheet has
   no such line — it paints canon's whole tactics band — so keeping the override
   would mean his one sentence hiding several paragraphs of canon. His words are
   painted BESIDE canon's, never instead of them. The stored shape is unchanged
   (`customTip`), so this is a rendering decision and not a migration.
   ========================================================================== */

const FRESH: EconomyState = {
  action: true,
  bonusAction: true,
  reaction: true,
  movement: true,
  spellSlotUsedThisTurn: false,
}

const turn = composeTurn({ character: NIX, combat: null })
const everyOption: TurnOption[] = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
const byName = (name: string) => {
  const found = everyOption.find(o => o.name === name)
  if (!found) throw new Error(`fixture has no option named ${name}`)
  return found
}

const paint = (props: { note?: string; onSaveNote?: (t: string) => void }) =>
  renderToStaticMarkup(
    <OptionDetailBody
      detail={optionDetail(byName('Divine Smite'), NIX, FRESH)}
      onClose={() => {}}
      onRoll={() => {}}
      onSpend={() => {}}
      {...props}
    />
  )

const text = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

describe('the note he wrote is on the screen again', () => {
  it('paints his own words when he has written some', () => {
    const html = paint({ note: 'Only after a crit, and only if the fight is nearly over.' })
    expect(text(html)).toContain('Only after a crit, and only if the fight is nearly over.')
  })

  it('offers the control by the name the capability has always had', () => {
    /* `Edit strategic tip` is V0.9's accessible name to the byte
       (`TurnSummary.tsx:824`), and the `action-notes` pin was written against
       that string in slice 1 — before any of this existed. A pin re-pointed at
       whatever the new code happens to say has stopped being a pin, so the app
       moves to meet the pin. */
    expect(paint({ onSaveNote: () => {} })).toContain('Edit strategic tip')
  })

  it('says so plainly when he has written nothing, rather than hiding', () => {
    // An absent band is indistinguishable from a band that lost his note.
    const html = paint({ onSaveNote: () => {} })
    expect(text(html)).toContain('No strategic tip')
  })

  it('never hides canon behind his line', () => {
    /* The departure from V0.9's override semantics, asserted rather than
       described: with a note set AND band 4 open, both are present. */
    const html = renderToStaticMarkup(
      <OptionDetailBody
        detail={optionDetail(byName('Divine Smite'), NIX, FRESH)}
        onClose={() => {}}
        note="Crit only."
        onSaveNote={() => {}}
        tacticsOpen
      />
    )
    expect(text(html)).toContain('Crit only.')
    expect(text(html)).toContain('How to use it')
    // Canon's own tactics text, still there beside his.
    expect(text(html).length).toBeGreaterThan('Crit only.'.length + 200)
  })
})

describe('a sheet that cannot save is not allowed to pretend', () => {
  it('paints his note read-only when no handler is given', () => {
    /* Same rule this file already applies to `onSpend`: a control that cannot
       do the thing is a lie, but the FACT is still worth painting. So the words
       stay and the button goes. */
    const html = paint({ note: 'Crit only.' })
    expect(text(html)).toContain('Crit only.')
    expect(html).not.toContain('Edit strategic tip')
  })

  it('paints no empty note band at all with neither note nor handler', () => {
    // The read-only inert render — what the design shoot measures — must be
    // byte-for-byte the sheet that shipped before this slice.
    const html = paint({})
    expect(text(html)).not.toContain('Your note')
    expect(text(html)).not.toContain('No strategic tip')
  })
})
