import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'
import { optionDetail } from './detail'
import type { EconomyState, TurnOption } from './types'

/* ============================================================================
   THE ASSEMBLER — four bands, always four, always the same order.

   This is the module that makes the "…" retirable. Every assertion below is
   really one of two claims:

     1. the FULL text arrives (band 2 is canon's paragraph, not a slice of it),
     2. and every band has a defined answer even when canon has never heard of
        the option, because canon lookup is a text lookup and not a gate.
   ========================================================================= */

const FRESH: EconomyState = {
  action: true,
  bonusAction: true,
  reaction: true,
  movement: true,
  spellSlotUsedThisTurn: false,
}
const SPENT: EconomyState = { ...FRESH, spellSlotUsedThisTurn: true }

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

describe('optionDetail — band 2 is where the "…" dies', () => {
  it('gives the WHOLE canon paragraph, not the 80 characters a row had room for', () => {
    /* ActionMenu.tsx renders `description.slice(0, 80) + '…'`. That is the
       behaviour this slice exists to make unnecessary: not by shortening the
       text, but by building somewhere the long text can go. */
    const detail = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(detail.whatItDoes.length).toBeGreaterThan(80)
    expect(detail.whatItDoes).not.toContain('…')
    expect(detail.whatItDoes.endsWith('...')).toBe(false)
  })

  it('emits no ellipsis in ANY band, for EVERY option on the fixture', () => {
    /* The corpus-wide form of the claim. A spot check on one spell would not
       have caught a truncation applied in a fallback branch. */
    const guilty: string[] = []
    for (const option of everyOption) {
      const d = optionDetail(option, NIX, FRESH)
      const text = [
        d.title,
        d.subtitle,
        d.whatItDoes,
        ...d.facts.map(f => `${f.label ?? ''} ${f.value}`),
        ...d.rolls.map(r => `${r.label} ${r.notation}`),
        ...d.tactics.map(t => `${t.lead ?? ''} ${t.body}`),
        d.ruleBox?.text ?? '',
      ].join(' ')
      if (text.includes('…') || /\.\.\./.test(text)) guilty.push(option.name)
    }
    expect(guilty, 'these options still truncate somewhere').toEqual([])
  })

  it('never leaves band 2 empty — every option says what it does', () => {
    for (const option of everyOption) {
      const d = optionDetail(option, NIX, FRESH)
      expect(d.whatItDoes.trim().length, `${option.name} has no description`).toBeGreaterThan(0)
    }
  })
})

describe('optionDetail — the open world, at the last boundary', () => {
  it('a name canon has never heard of still fills every band it can', () => {
    const homebrew: TurnOption = {
      id: 'hb-1',
      name: 'Emberwright Stance',
      kind: 'feature',
      detail: '+2 AC · 1d6 Fire retaliation · until the end of your next turn',
      cost: { slot: 'bonusAction', label: '1 Hearth point', resourcePoolId: 'hearth' },
      available: true,
      score: 0,
      source: "Marcus's own",
      homebrew: true,
    }

    const d = optionDetail(homebrew, NIX, FRESH)
    expect(d.provenance).toBe('sheet')
    expect(d.title).toBe('Emberwright Stance')
    // Band 1 falls back to the sheet's own facts, segments kept WHOLE.
    expect(d.facts.map(f => f.value)).toContain('+2 AC')
    expect(d.facts.map(f => f.value)).toContain('1d6 Fire retaliation')
    // Band 2 is the option's own words, entire.
    expect(d.whatItDoes).toBe(homebrew.detail)
    // Band 3 read the shape and found the roll.
    expect(d.rolls.map(r => r.notation)).toEqual(['1d6'])
    expect(d.spend).toEqual({ label: '1 Hearth point' })
    // Band 4 is empty, and empty is honest — canon has no advice to give.
    expect(d.tactics).toEqual([])
  })

  it('canon missing does not remove a single band from the shape', () => {
    /* The regression that would hurt most: a fallback path that returns a
       smaller object, so the sheet silently renders three bands for homebrew
       and four for canon. Same keys, always. */
    const canon = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    const sheet = optionDetail(
      {
        ...byName('Sacred Flame'),
        name: 'Nothing Canon Knows',
        kind: 'other',
      },
      NIX,
      FRESH
    )
    expect(Object.keys(sheet).sort()).toEqual(Object.keys(canon).sort())
  })
})

describe('optionDetail — the rule box reads the ACTUAL turn', () => {
  const levelled = () => {
    const found = everyOption.find(o => (o.cost.spellSlotLevel ?? 0) >= 1)
    if (!found) throw new Error('fixture has no levelled-slot option')
    return found
  }

  it('warns before the slot is spent', () => {
    const d = optionDetail(levelled(), NIX, FRESH)
    expect(d.ruleBox?.tone).toBe('notice')
    expect(d.ruleBox?.text).toContain('one levelled spell slot for the turn')
  })

  it('BLOCKS after the slot is spent — the same option, a different turn', () => {
    /* The box is worth building only because it changes. A static "remember,
       one slot per turn" note is true on every turn and therefore read on
       none. */
    const d = optionDetail(levelled(), NIX, SPENT)
    expect(d.ruleBox?.tone).toBe('blocked')
    expect(d.ruleBox?.text).toContain('already spent')
  })

  it('says nothing at all about slots for an option that spends none', () => {
    // Sacred Flame is a cantrip. A slot rule beside it is noise, and noise
    // beside a real rule is how real rules stop being read.
    const d = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(d.ruleBox).toBeNull()
    expect(optionDetail(byName('Sacred Flame'), NIX, SPENT).ruleBox).toBeNull()
  })
})

describe('optionDetail — bands 1 and 4 from canon', () => {
  it('band 1 shows a computed feature fact WITH its working', () => {
    /* "12 temp HP" asks to be trusted. "12 temp HP (Paladin level + Charisma
       modifier)" can be checked against the sheet in two seconds, which is what
       Marcus actually needs when the number looks wrong at a table. */
    const d = optionDetail(byName('Hearthfire Manifest'), NIX, FRESH)
    expect(d.facts).toContainEqual({
      label: 'temp HP',
      value: '12 temp HP (Paladin level + Charisma modifier)',
    })
  })

  it('rolls a canon FEATURE’s dice — being known must not cost you a button', () => {
    /* Found by probing, not by reasoning. Hearthfire Manifest matched canon,
       so band 3 took the canon path — and canon's feature records have no
       structured roll fields at all, only a free-form mechanics bag. The
       result was zero roll buttons on an option whose retaliation die was
       printed in the band directly above it.

       An unknown homebrew option would have got the button, because the
       fallback reads shapes. Being RECOGNISED made the option worse, which is
       the open-world rule failing backwards. */
    const d = optionDetail(byName('Hearthfire Manifest'), NIX, FRESH)
    expect(d.rolls.map(r => r.notation)).toContain('1d10')
    expect(d.rolls.find(r => r.notation === '1d10')!.label).toBe('roll Fire')
    // No attack roll is involved in retaliation, so no crit is offered.
    expect(d.rolls.some(r => r.kind === 'crit')).toBe(false)
  })

  it('never offers the same roll twice', () => {
    /* The sheet's detail line and canon's mechanics bag frequently name the
       same die. Two identical buttons is not a second roll. */
    for (const option of everyOption) {
      const keys = optionDetail(option, NIX, FRESH).rolls.map(r => `${r.kind}:${r.notation}`)
      expect(new Set(keys).size, `${option.name} offers a duplicate roll`).toBe(keys.length)
    }
  })

  it('band 4 carries canon’s advice, split at canon’s own headings', () => {
    const d = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(d.tactics.length).toBeGreaterThan(1)
    expect(d.tactics.some(b => b.lead !== null)).toBe(true)
  })

  it('is pure — same inputs, same output, no clock and no network', () => {
    const a = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    const b = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(a).toEqual(b)
  })
})
