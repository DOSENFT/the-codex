import { describe, it, expect } from 'vitest'
import { splitTriggerLead, triggerFor, canonSuggestedTrigger, ruledTrigger } from './trigger'
import { featureByName, errataForFeature, erratumById } from '../canon/lookup'
import { setRuling, type ErratumRulings } from '../errata-rulings'
import { OATH } from '../../canon'
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

/* ============================================================================
   SLICE 8b — the ruling reaches the point of use.

   Slice 6 ended this module's header with "until he makes it the row says so
   out loud". These are the tests for him having made it. The law they enforce:

       A RULING CHANGES WHAT THE APP SAYS. IT NEVER CHANGES WHAT THE APP
       COMPUTES — and it never arrives unattributed.

   Fed from the REAL corpus. A hand-built erratum would let `canonSuggestedTrigger`
   pass against a string this file invented, which is the tautology finding AP
   was about.
   ========================================================================= */

const HEARTH = (id: string) => erratumById(id)!
const CLOAK = 'Flaming Cloak'

/** Every erratum id, READ FROM CANON rather than typed out here. A hand-typed
 *  list of twelve would go stale the day canon grows a thirteenth, and the test
 *  below — "takes NOTHING from the eleven that quoted no trigger" — would go on
 *  passing while a new record went unchecked. */
const OATH_ERRATA_IDS = OATH.errata.map(e => e.id)

/** A fixed clock. `setRuling` takes `now` as a parameter precisely so a test
 *  never has to freeze the real one. */
const AT = new Date('2026-08-27T12:00:00.000Z')

describe('canonSuggestedTrigger — canon quoted it, or nobody did', () => {
  it('finds the clause canon put in quotation marks for the gap it flagged', () => {
    expect(canonSuggestedTrigger(HEARTH('HEARTH-03'))).toBe('when you take damage')
  })

  it('takes NOTHING from the eleven errata that quoted no trigger', () => {
    /* Measured by `_probe-trigger.mjs`: 14 quoted spans across the twelve
       records, exactly one trigger-shaped. If a future canon edit makes a second
       record yield a clause, this test fails and someone reads it — which is the
       point. Silent scope creep in a rules app is how a table argument starts. */
    const yielding = OATH_ERRATA_IDS.filter(id => canonSuggestedTrigger(HEARTH(id)) !== null)
    expect(yielding).toEqual(['HEARTH-03'])
  })

  it('refuses a quoted DAMAGE RIDER that merely opens with a similar word', () => {
    /* HEARTH-01 quotes "Whenever you cast a spell whose name includes Smite,
       add 1d8 Fire damage". Adopting that as the cloak's trigger would tell
       Marcus his Reaction fires when he casts a Smite. The `\b` in TRIGGER_LEAD
       is the only thing standing between him and that sentence. */
    const h01 = HEARTH('HEARTH-01')
    expect(h01.recommendedFix).toMatch(/Whenever you cast a spell/)
    expect(canonSuggestedTrigger(h01)).toBeNull()
  })
})

describe('ruledTrigger — which erratum answers is decided by SHAPE, not by id', () => {
  const errata = errataForFeature('Hearthfire Manifest')

  it('takes the DM at his word, verbatim', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'dm', 'When you or an ally within 30 feet takes damage', AT)
    expect(ruledTrigger(errata, rulings)).toEqual({
      when: 'When you or an ally within 30 feet takes damage',
      erratumId: 'HEARTH-03',
      via: 'dm',
    })
  })

  it('uses canon’s quoted clause when he chose canon’s fix', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, AT)
    expect(ruledTrigger(errata, rulings)).toEqual({
      when: 'when you take damage',
      erratumId: 'HEARTH-03',
      via: 'canon',
    })
  })

  it('contributes NOTHING from a ruling that is not a trigger, however firm', () => {
    /* HEARTH-04 is about temp HP stacking. A DM ruling on it is a real ruling —
       slice 8's band goes on showing it — but it is not an answer to "when can
       I use this", and pasting it into the WHEN line would be the app putting
       words in his DM's mouth. This is the test that would fail if anyone ever
       replaced the shape check with `if (id === 'HEARTH-03')`. */
    const rulings = setRuling({}, 'HEARTH-04', 'dm', 'temp HP does not stack, my call', AT)
    expect(ruledTrigger(errata, rulings)).toBeNull()
  })

  it('does not treat an UNANSWERED flag as an answer', () => {
    expect(ruledTrigger(errata, {})).toBeNull()
    expect(ruledTrigger(errata, setRuling({}, 'HEARTH-03', 'unasked', undefined, AT))).toBeNull()
  })

  it('ignores an empty or whitespace DM wording rather than painting a blank trigger', () => {
    const rulings: ErratumRulings = { 'HEARTH-03': { status: 'dm', dmWording: '   ' } }
    expect(ruledTrigger(errata, rulings)).toBeNull()
  })

  it('is null for a feature canon holds no errata on', () => {
    expect(ruledTrigger([], setRuling({}, 'HEARTH-03', 'canon', undefined, AT))).toBeNull()
  })
})

describe('triggerFor — a ruled trigger outranks every other source', () => {
  const ruled = { when: 'When you take damage', erratumId: 'HEARTH-03', via: 'dm' } as const

  it('beats a trigger the SHEET declared, and drops the superseded one', () => {
    /* Two different "when"s on one row is a row you have to argue with. The old
       wording is not lost — it is on the sheet and in the detail sheet, which is
       where a superseded rule belongs. */
    const reading = triggerFor({ detail: OPPORTUNITY }, undefined, ruled)
    expect(reading.when).toBe('When you take damage')
    expect(reading.source).toBe('ruled')
    expect(reading.body).not.toMatch(/leaves your reach/)
    expect(reading.body).toContain('1d8+4 Slashing')   // the rest survives whole
  })

  it('beats a trigger CANON states in a structured field', () => {
    const spell = { trigger: 'When a creature you can see is hit' } as unknown as CanonSpell
    expect(triggerFor({ detail: 'x' }, { spell }, ruled).source).toBe('ruled')
  })

  it('carries the attribution, so the row can never paint an anonymous rule', () => {
    expect(triggerFor({ detail: 'x' }, undefined, ruled).ruling).toEqual(ruled)
  })

  it('keeps the whole body when the sheet declared no trigger', () => {
    const reading = triggerFor({ detail: '1d10 Fire · recharges on short rest' }, undefined, ruled)
    expect(reading.body).toBe('1d10 Fire · recharges on short rest')
  })

  it('is byte-identical to the slice 6 reading when nothing is ruled', () => {
    /* The compatibility claim the optional parameter rests on. `null` and
       `undefined` must both mean "nothing recorded", or a caller that passes
       through a missing ruling changes what the sheet says. */
    const base = triggerFor({ detail: OPPORTUNITY })
    expect(triggerFor({ detail: OPPORTUNITY }, undefined, null)).toEqual(base)
    expect(triggerFor({ detail: OPPORTUNITY }, undefined, undefined)).toEqual(base)
    expect(base.ruling).toBeUndefined()
  })
})

describe('the end-to-end shape: Nix’s cloak, from unstated to ruled', () => {
  it('says nobody stated one until he answers, then says his answer', () => {
    /* The single claim slice 8b exists for, run through the real feature record
       rather than a literal: canon genuinely states no trigger for the cloak. */
    const feature = featureByName(CLOAK)
    const errata = errataForFeature('Hearthfire Manifest')
    const option = { detail: '1d10 Fire · recharges on short rest' }

    const before = triggerFor(option, { feature }, ruledTrigger(errata, {}))
    expect(before.when).toBeNull()
    expect(before.source).toBe('unstated')

    const rulings = setRuling({}, 'HEARTH-03', 'canon', undefined, AT)
    const after = triggerFor(option, { feature }, ruledTrigger(errata, rulings))
    expect(after.when).toBe('when you take damage')
    expect(after.source).toBe('ruled')
    expect(after.ruling?.via).toBe('canon')
  })
})
