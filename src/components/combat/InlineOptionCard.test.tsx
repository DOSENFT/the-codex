import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { InlineOptionCard } from './InlineOptionCard'
import { TurnCardActions } from './TurnCardActions'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import { optionDetail } from '../../lib/turn/detail'
import { noteFor, withNote } from '../../lib/action-notes'
import type { EconomyState, TurnOption } from '../../lib/turn/types'

/* ===========================================================================
   THE CARD, IN THE ROW — Combat Open Book slice 1.

   No jsdom in this repo, so these render to a static string, and finding Q
   applies: reading text proves the MODEL, not the screen. Nothing here claims
   anything is visible — visibility is a browser check at 390×844, and that is
   this slice's proof.

   What a static render IS uniquely good at is STRUCTURE, and structure is where
   this slice's worst available failure lives. `TurnRow` splits a row into a hit
   button and a sibling `.actx` precisely because a button inside a button is
   silently dropped by the browser (`TurnRow.tsx:84-95`), and the card this slice
   adds is full of buttons. A nested-button check on the emitted markup catches
   that in milliseconds; a human looking at a screenshot never would, because the
   fault renders as a control that is simply missing.
   ========================================================================= */

const FRESH: EconomyState = {
  action: true,
  bonusAction: true,
  reaction: true,
  movement: true,
  spellSlotUsedThisTurn: false,
}

const turn = composeTurn({ character: NIX, combat: null })
const everyOption: TurnOption[] = [
  ...turn.ranked,
  ...turn.rest,
  ...turn.mutex.flatMap(g => g.faces),
]
const byName = (name: string) => {
  const found = everyOption.find(o => o.name === name)
  if (!found) throw new Error(`fixture has no option named ${name}`)
  return found
}

const paint = (node: React.ReactElement): string => renderToStaticMarkup(node)

/** Does any `<button …>` open before a previous one has closed?
 *
 *  Counts opens and closes across the string rather than parsing, because the
 *  claim is about NESTING DEPTH and nothing else. Depth reaching 2 is the fault;
 *  any number of siblings is fine. */
function maxButtonDepth(html: string): number {
  let depth = 0
  let max = 0
  for (const token of html.match(/<button\b|<\/button>/g) ?? []) {
    if (token === '</button>') depth -= 1
    else {
      depth += 1
      max = Math.max(max, depth)
    }
  }
  return max
}

describe('InlineOptionCard — the Grimoire card, on the combat page', () => {
  it('paints the three bands Marcus asked for, from the same panel model the Grimoire eats', () => {
    /* THE WHOLE FEATURE, AS ONE ASSERTION. Before this slice the combat page
       painted a bare fact list with band 3 folded behind a `▸`; the Grimoire
       painted ① ② ③. This fails against the pre-change code because
       `OptionDetail` had no `panel` at all. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onClose={() => {}}
      />
    )
    expect(html).toContain('data-band="1"')
    expect(html).toContain('data-band="2"')
    expect(html).toContain('data-band="3"')
    expect(html).toContain('At a glance')
    expect(html).toContain('Full text')
    expect(html).toContain('How to use it')
  })

  it('band ① and the roll button now AGREE about the damage — slice 4 inverted this', () => {
    /* ═══ THE PIN, AND ITS INVERSION ════════════════════════════════════════
       Slice 1 wrote this test to assert a BUG on purpose, and said so:

           "THIS TEST ASSERTS A BUG, ON PURPOSE, AND SLICE 4 WILL INVERT IT.
            Pinning it here means slice 4 cannot claim to have fixed it without
            this line failing, which is the only way a fix like that is ever
            proved."

       It failed, on the run that added `statBlockFor`, and this is that
       inversion. The reading was `1d8` in 34px type directly above a roll
       button that said `2d8` — same screen, same spell, two answers, because
       `statBlock` was character-blind and `mechanicsLine` was not. Both numbers
       now come from the same `cantripTier` arithmetic, so the card agrees with
       the button, with the collapsed row, and with the Grimoire.

       IT IS STILL AN EQUALITY BETWEEN TWO MEASURED PLACES, not a constant. It
       reads the hero numeral and the roll button out of the emitted markup
       exactly as before and asserts they match, so a future change that makes
       either one drift fails here again — which is what the pin was for.
       Slice 2 rewrote this test when a promotion split the string it matched;
       nothing about the bug moved then, and this time nothing but the bug did.

       The scaling clause is gone from the card because after the arithmetic it
       is the same fact stated twice with only one of them true today. Canon's
       own string is untouched — `statBlock` still prints it in full, pinned in
       `format.test.ts`. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onRollDice={() => {}}
        onClose={() => {}}
      />
    )
    const heroDice = /data-hero-dice="[^"]*"[^>]*>([^<]+)</.exec(html)?.[1]
    const rollButton = /<button[^>]*>\s*<span[^>]*>([^<]+)</.exec(html)?.[1]
    expect(heroDice).toBe('2d8')
    expect(rollButton).toBe('2d8')
    expect(heroDice).toBe(rollButton) // the fix, in one line
    expect(html).not.toContain('at character level 5')
  })

  it('renders inline — no portal, no backdrop, no fixed overlay', () => {
    /* The complaint in his own words was "switching back and forth". A sheet
       over the list is that complaint with better animation: he could read the
       spell or see his turn, never both. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onClose={() => {}}
      />
    )
    expect(html).not.toContain('fixed inset-0')
    expect(html).not.toContain('role="dialog"')
  })

  it('never nests a button inside a button, for EVERY option on his sheet', () => {
    /* THE TEST THIS FILE EXISTS FOR. Corpus-wide, not a spot check: the Spend
       control only appears on available options and the roll buttons only on
       options that roll, so one spell exercises perhaps half the markup. */
    const guilty: string[] = []
    for (const option of everyOption) {
      const html = paint(
        <InlineOptionCard
          detail={optionDetail(option, NIX, FRESH)}
          onRollDice={() => {}}
          onSpend={() => {}}
          onClose={() => {}}
        />
      )
      if (maxButtonDepth(html) > 1) guilty.push(option.name)
    }
    expect(guilty).toEqual([])
  })
})

describe('the note band — Combat Open Book slice 3', () => {
  /* THE REGRESSION SLICE 1 WROTE DOWN AND DID NOT FIX. `00-status.md`:
     "`EntryDetailPanel` has no such band, so until slice 3 his notes are not
     shown on the Combat tab. They are not deleted … but they are not visible
     either, and that is a regression for as long as it stands."

     Every assertion below fails against the pre-change card, which had no
     `note` prop to pass. */

  it('paints his own words on the card, under canon and under the rolls', () => {
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        note="Save this for the ones with a bad Dex — the Con save is the trap."
        onSaveNote={() => {}}
        onRollDice={() => {}}
        onClose={() => {}}
      />
    )
    expect(html).toContain('Your note')
    expect(html).toContain('the Con save is the trap')

    /* ORDER IS THE ASSERTION, not a nicety. The sheet put the note last on a
       stated rule — "the rolls are what he came for" — and this card sits
       INSIDE the list, so anything above the rolls pushes them further from the
       row he tapped. A refactor that floats the band up would keep both strings
       present and still lose the reason they are where they are. */
    expect(html.indexOf('Your note')).toBeGreaterThan(html.indexOf('How to use it'))
    expect(html.indexOf('Your note')).toBeGreaterThan(html.indexOf('2d8'))
  })

  it('offers the editor under V0.9\'s exact accessible name', () => {
    /* `TurnSummary.tsx:824` shipped "Edit strategic tip" and a pin was written
       against it. The band moved files in this slice; the string did not, and
       a pin re-pointed at whatever the new code says has stopped being a pin. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onSaveNote={() => {}}
        onClose={() => {}}
      />
    )
    expect(html).toContain('Edit strategic tip')
    /* No note yet, and the difference between "he wrote nothing" and "his note
       is gone" is the whole reason this placeholder exists. */
    expect(html).toContain('No strategic tip')
  })

  it('paints no band at all when there is neither a note nor a saver', () => {
    /* The card for an option he has never annotated must be byte-identical to
       the slice-2 card. A band that always renders would put an empty gold
       heading under every open row in the app — the same fault
       `TurnCardActions` guards against three tests below. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onRollDice={() => {}}
        onClose={() => {}}
      />
    )
    expect(html).not.toContain('Your note')
    expect(html).not.toContain('Edit strategic tip')
  })

  it('still shows his words read-only when nothing can save them', () => {
    /* Same rule as `onRoll`: the FACT is worth showing on a surface that cannot
       act on it. Withholding what he wrote because this caller has no writer is
       a loss of information dressed as consistency. */
    const html = paint(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        note="Radiant — the undead here resist nothing else."
        onClose={() => {}}
      />
    )
    expect(html).toContain('the undead here resist nothing else')
    expect(html).not.toContain('Edit strategic tip')
  })

  it('never nests a button inside a button WITH the band open, for every option', () => {
    /* The band adds three buttons to a card that already had several, and it is
       reached through `rowExtra` — the seam that exists because `TurnRow` would
       otherwise nest them (`TurnRow.tsx:84-95`). The corpus check is re-run
       with the note wired, because the version above renders none of this. */
    const guilty: string[] = []
    for (const option of everyOption) {
      const html = paint(
        <InlineOptionCard
          detail={optionDetail(option, NIX, FRESH)}
          note="a note"
          onSaveNote={() => {}}
          onRollDice={() => {}}
          onSpend={() => {}}
          onClose={() => {}}
        />
      )
      if (maxButtonDepth(html) > 1) guilty.push(option.name)
    }
    expect(guilty).toEqual([])
  })

  it('is keyed by the option NAME, which is the key his existing notes are under', () => {
    /* NOT a restatement of `action-notes.test.ts`. The claim being pinned is
       about the KEY THIS SCREEN PASSES: notes he has already written are filed
       by name, so keying the combat card by `option.id` would show him a blank
       band over notes that are still on disk — the exact regression this slice
       closes, wearing a fix's clothes. Measured through a real option out of
       `composeTurn` rather than a string literal. */
    const option = byName('Sacred Flame')
    const written = withNote({}, option.name, 'the Con save is the trap')
    expect(noteFor(written, option.name)).toBe('the Con save is the trap')
    expect(noteFor(written, option.id)).toBeUndefined()
    expect(option.id).not.toBe(option.name)
  })
})

describe('TurnCardActions — the half that is about a turn', () => {
  it('offers Spend only when a spend was handed to it', () => {
    /* "A Spend control that cannot spend is purely a lie" — `detail.ts:156`.
       The affordance follows the handler, not the option's own hopes. */
    const detail = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(detail.spend).not.toBeNull()
    expect(paint(<TurnCardActions detail={detail} onSpend={() => {}} />)).toContain('Spend')
    expect(paint(<TurnCardActions detail={detail} />)).not.toContain('>Spend<')
  })

  it('still PRINTS the notation when no roller is wired, just not as a button', () => {
    /* The numbers are the information; pressability is the affordance. Losing
       the first to withhold the second is the trade this branch refuses. */
    const detail = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    const offer = detail.rolls[0]
    expect(offer).toBeDefined()
    const dead = paint(<TurnCardActions detail={detail} />)
    expect(dead).toContain(offer.notation)
    const live = paint(<TurnCardActions detail={detail} onRoll={() => {}} />)
    expect(live).toContain(offer.notation)
  })

  it('renders nothing at all when there is neither a roll, a spend nor a rule', () => {
    /* `Act` chooses its markup on the truthiness of `extra`, and an element that
       renders null is still truthy — so an actions block that always returned a
       wrapper would put an empty bordered box under every open card.
       `AttackTally.test.tsx` holds the same fault for the R6 half. */
    const detail = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    const empty = { ...detail, rolls: [], spend: null, ruleBox: null }
    expect(paint(<TurnCardActions detail={empty} />)).toBe('')
  })
})
