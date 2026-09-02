/* ============================================================================
   THE VITALS BAND IS FIVE NUMBERS — "Your Turn" slice 9.

   ── WHAT THIS FILE USED TO BE, AND WHERE THAT WENT ──────────────────────────
   Until this slice these tests guarded the band's ONE DOOR: the sheet-vs-2024
   flag and the one press that adopts the 2024 slot table. That capability has
   not been dropped — it MOVED, to `combat/SheetRuleFlags`, mounted in D's rail
   directly under the nine slot dots it is about (measured 2,430px away from
   them before the move, `_diag9.mjs`). Its four tests went with it, verbatim,
   into `SheetRuleFlags.test.tsx`, because a moved capability whose tests do not
   follow it is an untested capability with a good story.

   So nothing below is a weakened version of what was here. The assertions that
   used to live at these line numbers still exist, still say the same words,
   and still run — one file over.

   ── WHAT IS LEFT TO GUARD, AND WHY IT IS NOT NOTHING ────────────────────────
   Two claims, and both of them can fail:

     1. The five numbers survived the extraction. Save DC, AC, initiative,
        proficiency and spell attack are the whole reason this band exists
        (Table Truth slice 2 — three of them were absent from this surface
        entirely and two lived only in a component with zero importers). A
        cut-down that took a number with it would be item 11's standing
        instruction broken: "we cannot lose the features of the other modules.
        Nor the visuals."

     2. The flag is GONE from here, not hidden here. `noUnusedLocals` is off in
        this repo, so a leftover render — or a leftover `useState(false)` fold
        that renders its contents anyway — compiles, ships, and costs him the
        pixels this slice exists to reclaim while reporting one disagreement
        twice. Test 2 renders the exact sheet that used to make the flag appear
        and requires that it does not.

   Test 3 is the sharpest of the three: the band's markup must be IDENTICAL for
   a sheet that disagrees with the 2024 table and one that does not. Against the
   pre-change component every one of these three fails.

   The source-scan style of `the wire` is unchanged and so is its reason: this
   repo has no jsdom — see the note in ReactionsBand.test.tsx.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { Character } from '../../lib/character'
import { VitalsBand } from './VitalsBand'

/** His complaint, as a sheet: a Paladin 7 carrying 3rd-level slots. This is the
 *  fixture that USED to make this component grow a flag, kept here on purpose —
 *  the point of test 2 is that the input which produced the flag no longer
 *  produces one from this band. */
const WITH_PHANTOM_SLOTS: Character = {
  ...NIX,
  class: 'Paladin',
  level: 7,
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 }, 3: { max: 2, current: 2 } },
}

const MATCHING: Character = {
  ...WITH_PHANTOM_SLOTS,
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 2 } },
}

const render = (character: Character) => renderToStaticMarkup(<VitalsBand character={character} />)

describe('the five numbers', () => {
  it('states every one of them, with its word', () => {
    const html = render(WITH_PHANTOM_SLOTS)
    /* Values hardcoded rather than read back through `tableVitals`: asserting a
       function against itself proves the render calls it, not that the right
       number reaches the screen. These are Nix's sheet — AC 19, save DC 16,
       spell attack +8, proficiency +3, and DEX 10 so initiative is a checked
       zero rather than a blank. */
    expect(html).toContain('Save DC')
    expect(html).toContain('16')
    expect(html).toContain('AC')
    expect(html).toContain('19')
    expect(html).toContain('Init')
    expect(html).toContain('+0')
    expect(html).toContain('Prof')
    expect(html).toContain('+3')
    expect(html).toContain('Sp Atk')
    expect(html).toContain('+8')
  })
})

describe('and only the five numbers', () => {
  it('grows no flag from the very sheet that used to grow one', () => {
    const html = render(WITH_PHANTOM_SLOTS)
    expect(html, 'the notice moved to SheetRuleFlags').not.toContain('disagree')
    expect(html, 'the report moved with it').not.toContain('2024 rules')
    expect(html, 'and so did the door').not.toContain('Use the 2024 slots')
    /* A fold left behind — closed, but still mounted — would leave this
       attribute in the markup while claiming the flag is gone. */
    expect(html, 'no fold was left behind either').not.toContain('aria-expanded')
  })

  it('renders the same band whether or not the sheet agrees with the table', () => {
    /* The strongest form of "the rules check left this component": if any
       branch here still reads `discrepancies`, these two sheets — which differ
       only in whether they carry a phantom 3rd-level slot tier — cannot paint
       the same markup. */
    expect(render(WITH_PHANTOM_SLOTS)).toBe(render(MATCHING))
  })
})

/** Source with comments removed — the same helper, for the same reason, as
 *  `SheetRuleFlags.test.tsx`. Both files below carry long headers explaining
 *  that the flag left, and those headers necessarily name the very props and
 *  phrases these tests require to be absent. Scan the code; keep the paragraph
 *  that tells the next reader where it went. */
const code = (url: URL) =>
  readFileSync(url, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('the wire', () => {
  const helper = code(new URL('../CombatHelper.tsx', import.meta.url))
  const band = code(new URL('./VitalsBand.tsx', import.meta.url))

  it('CombatExtras mounts it read-only — there is no write to hand it any more', () => {
    /* The inverse of the test this replaces, and deliberately matched on the
       ELEMENT rather than on the file: `CombatHelper.tsx` still contains the
       word `onCharacterUpdate` many times over, because everything else in the
       extras block still writes. What must be true is that none of it arrives
       here. */
    expect(helper).toMatch(/<VitalsBand[^>]*\/>/)
    expect(helper).not.toMatch(/<VitalsBand[^>]*onAdopt/)
  })

  it('and the component cannot be handed one by accident', () => {
    /* A component that still ACCEPTS `onAdopt` would take the prop from any
       future call site and silently drop it — the quietest possible way to
       rebuild the duplicate. The prop is gone from the interface, so `tsc`
       refuses the call site instead of the reviewer having to catch it. */
    expect(band).not.toContain('onAdopt')
  })
})
