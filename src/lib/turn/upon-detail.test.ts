import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'
import { featureByName } from '../canon/lookup'

/* ============================================================================
   AN ALWAYS-ACTIVE AURA CARRIES ITS WHOLE PARAGRAPH — slice 8d-2.

   WHAT WAS LOST, MEASURED RATHER THAN GUESSED. `upon` entries built from
   passives take their text from `ActionOption.summary`, and `featureSummary`
   (options.ts:85) cuts the first sentence at 77 characters and appends "...".
   On Marcus's own sheet that produces:

     Aura of Protection  "…gain a bonus to saving throw..."
     Aura of Solace      "…have resistance to Fire, Cold, ..."

   The first stops mid-word. The second stops before PSYCHIC — a resistance he
   has and cannot read. And canon knows three things about Aura of Protection
   that appear nowhere on the combat tab at all: the bonus has a minimum of +1,
   the aura is INACTIVE while he has the Incapacitated condition, and only one
   Aura of Protection can benefit a creature at a time. That last one is a table
   ruling, and the app was quietly withholding it.

   His words: "So long as the necessary details of the auras, so I can always
   know what they do exactly."

   WHY CANON FIRST AND THE SHEET SECOND. This is not a new precedence — it is
   the one `canonBands` already applies to a feature (`bands.ts:198`:
   `feature?.rawText || input.fallbackText`). Two judges of one fact is how they
   come to disagree, so the aura answers to the same order the detail sheet
   does. The sheet's own words are the fallback and never the loser by default:
   an option canon has never heard of still reads in full, in Marcus's words.
   That is the open-world rule at this boundary.
   ========================================================================== */

const turn = composeTurn({ character: NIX, combat: null })
const aura = (name: string) => turn.upon.find(u => u.name === name)!

describe('an aura knows more than it shows', () => {
  it('carries the full paragraph beside the one-line summary', () => {
    const prot = aura('Aura of Protection')
    // The summary is still the summary — this slice adds, it does not replace.
    expect(prot.text).toContain('...')
    expect(prot.detail).toBeTruthy()
    expect(prot.detail!.endsWith('...')).toBe(false)
    expect(prot.detail!.length).toBeGreaterThan(prot.text.length)
  })

  it('the three facts his screen has never shown him are in it', () => {
    const prot = aura('Aura of Protection')!
    expect(prot.detail).toContain('minimum +1')
    expect(prot.detail).toContain('Incapacitated')
    expect(prot.detail).toContain('only one Aura of Protection at a time')
  })

  it('and the resistance that was cut off mid-list', () => {
    const solace = aura('Aura of Solace')
    // The bug in one assertion: the word is missing from what he reads…
    expect(solace.text).not.toContain('Psychic')
    // …and present in what he can now open.
    expect(solace.detail).toContain('Psychic')
  })

  it('is canon’s paragraph, not a longer slice of the sheet’s', () => {
    // Asserted against the canon record itself rather than against a copy of
    // its words, so this test keeps telling the truth if canon is re-imported.
    const canon = featureByName('Aura of Protection')
    expect(canon).toBeTruthy()
    expect(aura('Aura of Protection').detail).toBe(canon!.rawText)
  })

  it('says nothing extra when there is nothing extra to say', () => {
    /* A `detail` equal to the summary would put a disclosure on the screen that
       opens onto the line already showing — furniture pretending to be a
       feature, which is the 🔴 half-built rule in miniature. Conditions phrase
       their whole effect in `text` already (`describe`, compose.ts:948), so
       they must come back with no `detail` at all. */
    const cursed = composeTurn({
      character: { ...NIX, conditions: ['Prone'] },
      combat: null,
    })
    const prone = cursed.upon.find(u => u.name === 'Prone')
    expect(prone).toBeTruthy()
    expect(prone!.detail).toBeUndefined()
  })
})
