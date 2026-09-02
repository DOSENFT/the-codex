/* ============================================================================
   THE SHEET-VS-2024 FLAG, ONCE, WHERE THE PIPS ARE — "Your Turn" slice 9.

   ── THIS FILE IS A MOVE, NOT A NEW CLAIM ────────────────────────────────────
   Four of the tests below were `VitalsBand.test.tsx`'s and are here verbatim
   except for the element they render. That matters: the flag was EXTRACTED from
   `VitalsBand`, not copied, so the tests that guarded it have to follow it or
   the guard is gone. Their assertions are untouched — `Use the 2024 slots`, the
   before/after string, the two absences — because a moved test that gets easier
   on the way is a deleted test wearing the old name.

   ── THE TWO NEW CLAIMS, AND WHY THEY ARE THE SLICE ──────────────────────────
   `VitalsBand` opened this flag by default and said out loud why: *"a dismissed
   warning that stays dismissed is a warning that gets dismissed once and never
   seen again"*. Slice 9 closes it, so the reversal needs a test, not a comment.
   The reasoning it overturns rested on two facts that are no longer true — the
   flag had no answer button (one arrived 2026-08-28) and it sat 2,430px from
   the nine slot dots it was complaining about (measured, `_diag9.mjs`). Closed
   AND beside the pips is a label on the thing; open AND across the tab was a
   warning shouted at him on every load.

   So: (1) closed, the line is still readable and still says how many; (2) closed,
   the report and the one-tap answer are genuinely NOT in the markup, because a
   fold that renders its contents anyway has hidden nothing and saved no pixels.

   `initiallyOpen` exists for the same reason `ErrataBand` takes
   `initiallyExpanded`: this repo has no DOM, and a fold that can only be opened
   by a click is a fold no static render can read.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { Character } from '../../lib/character'
import { SheetRuleFlags } from './SheetRuleFlags'

/** His complaint, as a sheet: a Paladin 7 carrying 3rd-level slots. The shared
 *  NIX fixture is level 8 with no 3rd-level slots, so it cannot show this
 *  without being bent — bending it here is the point of the test. */
const WITH_PHANTOM_SLOTS: Character = {
  ...NIX,
  class: 'Paladin',
  level: 7,
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 }, 3: { max: 2, current: 2 } },
}

/** Slots reconciled, and NOTHING else. Carried over verbatim from
 *  `VitalsBand.test.tsx` and it does exactly the job it did there: it is the
 *  sheet on which the ADOPT control has nothing left to offer. It is not a
 *  sheet that agrees with the 2024 rules — see `IN_AGREEMENT`. */
const MATCHING: Character = {
  ...WITH_PHANTOM_SLOTS,
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 } },
}

/** A level 7 Paladin the 2024 rules have no complaint about at all.
 *
 *  FOUND BY THE TEST, NOT ASSUMED BY IT. The first run of this file expected
 *  `MATCHING` to render nothing and expected the closed line to say "1 thing".
 *  Both were wrong, and usefully so: `WITH_PHANTOM_SLOTS` is Nix's sheet with
 *  the level dropped to 7, so its stored save DC (16) and spell attack (+8) are
 *  a level EIGHT paladin's and disagree with the table too. Three flags, not
 *  one. Reconciling the slots — which is all `MATCHING` does, and all the adopt
 *  button offers — leaves two.
 *
 *  At level 7: proficiency +3, Charisma 18 → +4, so the DC is 8+3+4 = 15 and
 *  the attack bonus is 3+4 = +7. Half-caster slots at 7 are 4×1st and 3×2nd.
 *  The numbers are written out rather than computed here on purpose: a fixture
 *  built by calling the same functions the component calls agrees with itself
 *  by construction. */
const IN_AGREEMENT: Character = {
  ...MATCHING,
  spellSaveDC: 15,
  spellAttackBonus: 7,
  proficiencyBonus: 3,
}

const render = (character: Character, onAdopt?: (c: Character) => void, initiallyOpen = false) =>
  renderToStaticMarkup(
    <SheetRuleFlags character={character} onAdopt={onAdopt} initiallyOpen={initiallyOpen} />,
  )

describe('one line, closed', () => {
  it('says there is a disagreement and how many, without being opened', () => {
    const html = render(WITH_PHANTOM_SLOTS, () => {})
    /* THREE, and the count is the whole point of the closed line: it is what a
       fold has to say to be worth closing. See `IN_AGREEMENT` for why this
       sheet trips three checks and not the one the slot story is about. */
    expect(html).toContain('Your sheet and the 2024 rules disagree on 3 things')
    expect(html).toContain('aria-expanded="false"')
  })

  it('keeps the report and the answer behind the tap, not merely out of sight', () => {
    const html = render(WITH_PHANTOM_SLOTS, () => {})
    /* If these are in the markup while the line reads as closed, the fold is
       decorative: it costs him the pixels it claims to save and reports one
       disagreement twice over.

       ASSERTED ON THE REPORT'S OWN STRUCTURE, NOT ON THE WORDS "2024 rules" —
       which is what the first draft of this test did, and it failed against a
       correct component, because the section's `aria-label` is *"Your sheet and
       the 2024 rules"* and a landmark name is not a rendered report. `<dl` is
       the comparison list itself: one appears per flag and none can appear
       while the fold is shut. */
    expect(html, 'no comparison rows when closed').not.toContain('<dl')
    expect(html, 'no caveat paragraph when closed').not.toContain('Nothing has been changed')
    expect(html, 'the answer must not be rendered when closed').not.toContain('Use the 2024 slots')
  })

  it('paints nothing at all when the sheet and the rules agree', () => {
    /* Not "an empty section" — nothing. An empty landmark in the rail is a
       border-top and a gap for a disagreement that does not exist. */
    expect(render(IN_AGREEMENT, () => {})).toBe('')
  })
})

describe('the adopt control', () => {
  it('is drawn when the sheet and the table disagree', () => {
    const html = render(WITH_PHANTOM_SLOTS, () => {}, true)
    expect(html).toContain('Use the 2024 slots')
  })

  it('says what it will do, so it can be refused before it is pressed', () => {
    const html = render(WITH_PHANTOM_SLOTS, () => {}, true)
    /* A button reading only "fix" asks to be trusted. This one carries the
       before and the after, in the same words the flag above it already used. */
    expect(html).toContain('1st ×4 · 2nd ×3 · 3rd ×2')
    expect(html).toContain('1st ×4 · 2nd ×3')
  })

  it('is absent when there is nothing to adopt', () => {
    expect(render(MATCHING, () => {}, true)).not.toContain('Use the 2024 slots')
  })

  it('is absent when the surface cannot write, even though the flag still shows', () => {
    const html = render(WITH_PHANTOM_SLOTS, undefined, true)
    expect(html, 'a dead button is worse than no button').not.toContain('Use the 2024 slots')
    /* STRENGTHENED ON THE WAY OVER, and that is the opposite of the usual
       direction so it is written down. In `VitalsBand` this line read
       `toContain('2024 rules')`, which was a real claim there because that
       component had no landmark carrying those words. Here the section's
       `aria-label` IS "Your sheet and the 2024 rules", so the old assertion
       would pass on a component that rendered the label and dropped the entire
       report. `<dl` is the report. */
    expect(html, 'the report itself must survive without the door').toContain('<dl')
    expect(html).toContain('Spell slots')
  })
})

/** Source with comments removed.
 *
 *  A SOURCE SCAN THAT A COMMENT CAN BREAK IS A SOURCE SCAN THAT GETS "FIXED" BY
 *  REWORDING. The first run of the last test in this file failed on
 *  `VitalsBand.tsx` — not because the band still renders the flag, but because
 *  its header now explains at length that it no longer does, and that
 *  explanation contains the phrase being searched for. The correct repair is to
 *  scan the code, not to delete the paragraph that tells the next reader where
 *  the flag went. */
const code = (url: URL) =>
  readFileSync(url, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('the wire', () => {
  const live = code(new URL('../turn/TurnLive.tsx', import.meta.url))
  const vitals = code(new URL('./VitalsBand.tsx', import.meta.url))

  it('TurnLive gives the flag something to write with', () => {
    /* Finding BM, inherited from the test this replaces: without this the
       component renders, computes a perfect `Adoption`, and offers nothing.
       Matched on the prop reaching the element, not on the word appearing
       somewhere in the file. */
    expect(live).toMatch(/<SheetRuleFlags[^>]*onAdopt=\{onCharacterUpdate\}/s)
  })

  it('mounts it in the rail, where the slot pips are', () => {
    /* The whole point of the move. `TurnRail` paints the nine dots the flag is
       about; before this slice they were 2,430px apart on his phone. If the
       element drifts to another seam this fails, and it should — "beside the
       pips" is the capability, not "somewhere on the tab". */
    const rail = /rail=\{([\s\S]*?)\n      \}/.exec(live)?.[1] ?? ''
    expect(rail).toContain('TurnRail')
    expect(rail).toContain('SheetRuleFlags')
  })

  it('and the flag has exactly one home — VitalsBand no longer carries it', () => {
    /* EXTRACTED, not copied. Two surfaces reporting one disagreement is item 6
       rebuilt by the slice meant to finish it, and the second one would be
       across the tab from the pips again. */
    expect(vitals).not.toContain('2024 rules disagree')
    expect(vitals).not.toContain('slotAdoption')
  })
})
