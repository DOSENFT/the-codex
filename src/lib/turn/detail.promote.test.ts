import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { optionDetail } from './detail'
import { NIX } from './fixtures/nix'
import type { EconomyState, TurnOption } from './types'

/* ===========================================================================
   THE PROMOTIONS, ON THE COMBAT SIDE — Combat Open Book slice 2.

   `promote.snapshot.test.ts` proves the Grimoire did not move. This file proves
   the combat page ARRIVED — every assertion below fails against the pre-change
   code, where `optionDetail` hard-coded all four promotions to `null`.

   The last test is the one worth having. Preferring canon's casting time over
   the row's own label is a decision that can only go wrong one way: the card
   printing a different cost from the row three inches above it, which is this
   whole feature's stated fault wearing a new hat. So it is measured across
   every option on his sheet rather than reasoned about.
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
const panelOf = (name: string) => optionDetail(byName(name), NIX, FRESH).panel

describe('the combat card now promotes what the Grimoire card promotes', () => {
  it('gives Sacred Flame the 34px numeral it has had on the other tab all along', () => {
    /* ── THE NUMBER CHANGED IN SLICE 4, AND THAT WAS SLICE 4 ─────────────────
       Slice 2 froze this as `1d8` with canon's scaling clause hanging off it,
       which is what band ① said while the row three inches above said `2d8`.
       `statBlockFor` does the arithmetic now, so the numeral is his: at level 8
       Sacred Flame is 2d8, the clause that listed the other tiers is gone
       because it was the same fact stated twice with one of them true, and the
       note is the damage TYPE, which is the half he still needs. */
    const panel = panelOf('Sacred Flame')
    expect(panel.hero).toEqual({
      dice: '2d8',
      note: 'Radiant',
      tone: 'damage',
    })
    /* Promoted OUT of the grid, not copied beside it. Without this the card
       shows the same number twice, which is how a promotion that "works" still
       makes the card longer instead of clearer. */
    expect(panel.consumed).toContain('Damage')
  })

  it('promotes the upcast box and the book line for a levelled spell', () => {
    const panel = panelOf('Cure Wounds')
    expect(panel.hero?.tone).toBe('healing')
    expect(panel.higherLevel).not.toBeNull()
    expect(panel.source).not.toBeNull()
    expect(panel.consumed).toEqual(expect.arrayContaining(['Higher Level', 'Source']))
  })

  it('keeps canon occasion that no row has ever had room for', () => {
    /* Divine Smite's casting time is "Bonus Action, taken immediately after
       hitting a target with a Melee weapon". The row can fit the first half.
       This is the half the combat card gains that nothing on the tab had. */
    const cost = panelOf('Divine Smite').cost
    expect(cost?.when).toBeTruthy()
    expect(cost?.when).toContain('immediately after hitting')
  })

  it('never says movement or a free rider costs an Action, a Bonus Action or a Reaction', () => {
    /* The three slot colours are a promise the thing is reachable on a turn as
       one of the three (`EntryDetailPanel.tsx:61-65`). Movement and free riders
       are neither, and a wrong colour on the largest word on the card is a
       claim he could act on at a table. */
    for (const option of everyOption) {
      if (option.cost.slot !== 'movement' && option.cost.slot !== 'free') continue
      const panel = optionDetail(option, NIX, FRESH).panel
      if (panel.consumed.includes('Casting Time')) continue // canon priced it; canon's word stands
      expect(panel.cost?.tone).not.toBe('action')
      expect(panel.cost?.tone).not.toBe('bonus')
      expect(panel.cost?.tone).not.toBe('reaction')
    }
  })

  it('the card and the row never print two different costs, for EVERY option on his sheet', () => {
    /* THE TEST THIS FILE EXISTS FOR, and the one that caught the bug.

       Written first as "the card may say MORE than the row", on the assumption
       canon's casting time is the richer string. It went red in nine places and
       the diff said the opposite — the ROW is richer, because it names the slot
       level the cast will spend and canon cannot know that. Letting canon win
       would have quietly deleted "· 1st-level slot" from the largest word on
       the combat card. See `combatCost` for the fix.

       So the invariant is now the strong one: the card quotes the row exactly,
       and contradiction is impossible by construction rather than by luck. The
       assertion is kept anyway — the construction is one line, and one line is
       exactly the size of thing a later slice edits without noticing. */
    const contradictions: string[] = []
    for (const option of everyOption) {
      const word = optionDetail(option, NIX, FRESH).panel.cost?.word
      if (word !== option.cost.label) {
        contradictions.push(`${option.name}: card "${word}" vs row "${option.cost.label}"`)
      }
    }
    expect(contradictions).toEqual([])
  })
})
