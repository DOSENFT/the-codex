import { describe, it, expect } from 'vitest'
import { splitTriggerLead, triggerFor } from './trigger'
import { featureByName } from '../canon/lookup'
import type { CanonSpell } from '../canon/types'

/* ============================================================================
   SLICE 6 — "when can I use it?"

   A Reaction with no stated trigger is the single most common way a table
   argument starts. These tests pin the three honest answers and, more
   importantly, pin the ONE answer the app must never give: a trigger it
   scraped out of a paragraph that was describing something else.
   ========================================================================= */

const OPPORTUNITY =
  'When a creature you can see leaves your reach · +7 to hit (STR +3 + prof +1 magic) · 1d8+4 Slashing · 5 ft · Magical'

describe('triggerFor — a trigger the sheet already declared', () => {
  it('reads the leading "When …" clause and calls it declared', () => {
    const reading = triggerFor({ detail: OPPORTUNITY })
    expect(reading.source).toBe('declared')
    expect(reading.when).toBe('When a creature you can see leaves your reach')
  })

  it('REMOVES it from the body, so the row never says it twice', () => {
    const reading = triggerFor({ detail: OPPORTUNITY })
    expect(reading.body).not.toContain('When a creature')
    expect(reading.body.startsWith('+7 to hit')).toBe(true)
  })

  it('reads an "If …" clause the same way', () => {
    const reading = triggerFor({ detail: 'If you are reduced to 0 HP · 1 use' })
    expect(reading.source).toBe('declared')
    expect(reading.when).toBe('If you are reduced to 0 HP')
    expect(reading.body).toBe('1 use')
  })

  it('a trigger that is the ONLY segment leaves an empty body, not a repeat', () => {
    const reading = triggerFor({ detail: 'When you are hit by an attack' })
    expect(reading.when).toBe('When you are hit by an attack')
    expect(reading.body).toBe('')
  })

  it('only the FIRST segment counts — a "when" in the middle is prose', () => {
    // "…lasts until the start of your next turn, when it ends" is description.
    const reading = triggerFor({ detail: '1d10 Fire · when the cloak ends, it fades' })
    expect(reading.source).toBe('unstated')
    expect(reading.body).toBe('1d10 Fire · when the cloak ends, it fades')
  })
})

describe('triggerFor — a trigger canon states in a STRUCTURED field', () => {
  it("uses CanonSpell.trigger when the sheet's detail declared none", () => {
    const spell = { trigger: 'when you are hit by an attack' } as CanonSpell
    const reading = triggerFor({ detail: '+5 AC · 1 round' }, { spell })
    expect(reading.source).toBe('canon')
    expect(reading.when).toBe('when you are hit by an attack')
    expect(reading.body).toBe('+5 AC · 1 round')
  })

  it('a null CanonSpell.trigger is not a trigger', () => {
    const spell = { trigger: null } as CanonSpell
    expect(triggerFor({ detail: 'x' }, { spell }).source).toBe('unstated')
  })

  it('the sheet wins over canon — a declared clause is the one being played', () => {
    const spell = { trigger: 'when canon says so' } as CanonSpell
    expect(triggerFor({ detail: OPPORTUNITY }, { spell }).source).toBe('declared')
  })

  it('finds a mechanics entry WRITTEN as a trigger, whatever it is called', () => {
    // The shape is the handle, not the key: if a future canon package adds
    // `cloakTrigger`, this picks it up with no edit here.
    const feature = {
      level: 3,
      name: 'Invented',
      rawText: '',
      mechanics: { cloakCost: '1 use', somethingElse: 'When you take damage' },
    }
    const reading = triggerFor({ detail: 'body' }, { feature })
    expect(reading.source).toBe('canon')
    expect(reading.when).toBe('When you take damage')
  })
})

describe('triggerFor — the gap canon itself flagged', () => {
  /* HEARTH-03, severity HIGH: the cloak is "As a Reaction" with no trigger
     defined, and 2024 requires one. Canon's own appAction is "require the
     player to record a chosen trigger with DM approval". That is a DECISION,
     and slice 8 collects it. Slice 6's job is to stop the app pretending
     otherwise. */
  it('Hearthfire Manifest resolves to unstated — canon states no trigger', () => {
    const feature = featureByName('Hearthfire Manifest')
    expect(feature).toBeDefined()
    const reading = triggerFor({ detail: '1d10 Fire · recharges on short rest' }, { feature })
    expect(reading.source).toBe('unstated')
    expect(reading.when).toBeNull()
  })

  it('DOES NOT scrape the retaliation sentence out of the paragraph', () => {
    /* rawText contains "When you are hit by a melee attack, the creature takes
       1d10 Fire damage in retaliation". That is the trigger for the RETALIATION.
       A prose scraper would lift it and Marcus would arrive at a table believing
       he can only cloak up AFTER being hit — which is the opposite of what the
       cloak is for. */
    const feature = featureByName('Hearthfire Manifest')!
    expect(feature.rawText).toContain('When you are hit by a melee attack')
    expect(triggerFor({ detail: 'x' }, { feature }).when).toBeNull()
  })

  it('an empty detail and no canon is unstated, not a throw', () => {
    expect(triggerFor({ detail: '' })).toEqual({ when: null, source: 'unstated', body: '' })
    expect(triggerFor({ detail: '' }, {})).toEqual({ when: null, source: 'unstated', body: '' })
  })
})

describe('splitTriggerLead — the label is the clause\'s own first word', () => {
  it('gives the lead word to the label and the remainder to the clause', () => {
    expect(splitTriggerLead('When a creature you can see leaves your reach')).toEqual({
      lead: 'WHEN',
      rest: 'a creature you can see leaves your reach',
    })
  })

  it('NEVER RELABELS AN "IF" AS A "WHEN"', () => {
    /* They are different conditions. An app that flattens both into "WHEN" is
       editing a rule so it fits the app's own layout. */
    expect(splitTriggerLead('If you are hit while raging')).toEqual({
      lead: 'IF',
      rest: 'you are hit while raging',
    })
  })

  it('adds no words and drops none — the pieces rejoin to the original', () => {
    for (const clause of [
      'When a creature you can see leaves your reach',
      'If you are hit while raging',
      'when, at the start of your turn, you are burning',
    ]) {
      const { lead, rest } = splitTriggerLead(clause)
      expect(`${lead} ${rest}`.toLowerCase().replace(/[,:]/g, '')).toBe(
        clause.toLowerCase().replace(/[,:]/g, '')
      )
    }
  })

  it('a clause that does not open with when/if keeps every word it has', () => {
    const odd = 'Immediately after an ally drops to 0 HP'
    expect(splitTriggerLead(odd)).toEqual({ lead: 'WHEN', rest: odd })
  })

  it('a clause that is NOTHING but its lead word is not stripped to nothing', () => {
    expect(splitTriggerLead('When')).toEqual({ lead: 'WHEN', rest: 'When' })
  })
})
