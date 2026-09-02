import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { NIX } from './fixtures/nix'
import { optionDetail } from './detail'
import { reduce, takenFrom } from './reduce'
import { createCombatState, type CombatState } from '../combat-state'
import type { Character } from '../character'
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

describe('optionDetail — the spend affordance, widened in slice 10c', () => {
  /* Slices 7-10b built a Spend button, a `detail.spend` to feed it and a
     reducer to honour it, and then offered it on 2 of the 14 options Nix owns,
     because `spendFor` only recognised a spell slot or a resource pool as a
     cost. At a table the Action IS the cost. These tests fix the widened rule
     in place; the first of them fails against every build before 10c. */

  it('offers a spend on an option whose only cost is the Action', () => {
    // Sacred Flame is a cantrip: no slot, no pool, and taking it still ends
    // your Action. Before 10c this was `null` and the button was not painted,
    // so the most-used row on the screen had no way to be spent.
    const d = optionDetail(byName('Sacred Flame'), NIX, FRESH)
    expect(d.spend).not.toBeNull()
    expect(d.spend!.label).toBe(byName('Sacred Flame').cost.label)
  })

  it('offers a spend on EVERY available option, and names each cost in its own words', () => {
    /* The general form of the claim above. `cost.label` is the string whoever
       declared the option wrote, so a homebrew cost the engine cannot parse
       still names itself on the button rather than falling back to "Spend". */
    for (const option of everyOption.filter(o => o.available)) {
      const spend = optionDetail(option, NIX, FRESH).spend
      expect(spend, `${option.name} offers no way to spend it`).not.toBeNull()
      expect(spend!.label).toBe(option.cost.label)
    }
  })

  it('offers NO spend on a blocked option — the button would only ever refuse', () => {
    /* The counterweight, and the reason this is not simply "always non-null".
       `OptionDetailBodyProps.onSpend` states the law: a Spend control that
       cannot spend is purely a lie. The row already carries `blockedReason`. */
    const blocked: TurnOption = { ...byName('Sacred Flame'), available: false, blockedReason: 'no' }
    expect(optionDetail(blocked, NIX, FRESH).spend).toBeNull()
  })

  it('still names a slot or a pool exactly as it did before the widening', () => {
    // The pre-10c behaviour is a subset of the new one, not a casualty of it.
    const levelled = everyOption.find(o => (o.cost.spellSlotLevel ?? 0) >= 1 && o.available)
    if (levelled) expect(optionDetail(levelled, NIX, FRESH).spend).toEqual({ label: levelled.cost.label })
    const pooled = everyOption.find(o => o.cost.resourcePoolId && o.available)
    if (pooled) expect(optionDetail(pooled, NIX, FRESH).spend).toEqual({ label: pooled.cost.label })
    expect(levelled || pooled, 'fixture has neither a slot nor a pool option').toBeTruthy()
  })
})

describe('the Spend button never lies — the affordance and the reducer agree', () => {
  /* THE CLAIM THAT MAKES 10c SAFE, and the reason the refusal band below it is
     a guard rather than a workflow.

     Two independent implementations of the same rules decide whether an option
     can be taken: `composeTurn` sets `available`, which is what `spendFor` now
     keys the button off; and `reduce` refuses at the moment of the tap. They
     were written slices apart and nothing has ever compared them. If they ever
     disagree, the app paints a button that produces only an error message —
     which is exactly what `OptionDetailBodyProps.onSpend` calls a lie.

     This runs the real reducer over every option the real composer offers. It
     is cheap, it is exhaustive over the fixture, and it is the assertion that
     goes red the day someone tightens one rule engine and not the other. */

  /* The out-of-combat session is `createCombatState`, NOT null. That is what
     `CombatProvider` actually holds when nobody has pressed Start Combat — and
     it matters: `reduce` reads `combat.round` unconditionally, so handing it a
     null combat throws rather than refusing. The live path can never do that
     (the provider's initialiser always produces a state), and stating the real
     shape here keeps this test a test of the app instead of a test of a
     situation the app cannot be in. */
  const sessions: { what: string; combat: CombatState }[] = [
    { what: 'out of combat', combat: createCombatState(NIX) },
    {
      what: 'in combat, your turn, nothing spent',
      combat: {
        inCombat: true,
        round: 3,
        yourTurn: true,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
        concentrating: null,
      } as CombatState,
    },
    {
      what: 'in combat, the Action already spent',
      combat: {
        inCombat: true,
        round: 3,
        yourTurn: true,
        turnActions: { action: true, bonusAction: false, reaction: false, movement: false },
        spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
        concentrating: null,
      } as CombatState,
    },
  ]

  for (const { what, combat } of sessions) {
    it(`offers no spend the reducer would refuse — ${what}`, () => {
      const composed = composeTurn({ character: NIX, combat })
      const all = [...composed.ranked, ...composed.rest, ...composed.mutex.flatMap(g => g.faces)]
      expect(all.length, 'nothing composed, so nothing was graded').toBeGreaterThan(0)

      let offered = 0
      for (const option of all) {
        if (optionDetail(option, NIX, composed.economy).spend === null) continue
        offered++
        const applied = reduce(
          { character: NIX, combat },
          { type: 'takeOption', option: takenFrom(option) },
          []
        )
        expect(
          applied.refused,
          `the sheet offers "Spend ${option.cost.label}" on ${option.name}, and the reducer ` +
            `refuses it: ${applied.refused}`
        ).toBeFalsy()
      }
      expect(offered, 'no option offered a spend at all, so nothing was graded').toBeGreaterThan(0)
    })
  }
})

/* ===========================================================================
   WHOSE WORDS THESE ARE — Held Reaction slice 5b.

   Slice 6 opened all four rows of his reactions band with a browser and read
   the tag off each one (`measure-slice6b.mjs`, 2026-08-31). Both Sentinel
   sheets said **"your own"** over text slice 2 had imported out of the book.

   `overlay.ts:427` had already named that exact failure as the reason this
   phase exists: "the book's words, over a mark that says they are his… the
   reason Marcus could quote a rule at his DM believing he had written it."
   Slice 2 fixed it on the ROW. Nothing had fixed it on the sheet the row
   opens — which is the surface he would actually read before quoting.

   ── WHY NOT THE `NIX` FIXTURE ──────────────────────────────────────────────

   Because it carries `feats: []`, so it composes no feat row, so it cannot
   reach the branch that was broken. This phase's standing rule, from
   `04-slices.md`: proved against his real exported sheet, never the fixture —
   the fixture is the reason a prior session recorded a finding it had not
   measured. Skipped, never silently passed, when the export is absent.

   ── AND IT IS NOT "TURN THE TAG OFF" ───────────────────────────────────────

   The third case is the one that keeps this honest. Opportunity Attack is
   built out of HIS weapon, The Dawn Guardian, and canon holds no record of
   that name. Those words really are his sheet's, the tag really does belong on
   it, and a fix that merely stopped painting the tag would pass the first two
   cases and fail this one.
   ========================================================================= */
describe("the tag says whose words they are, and it is asked once", () => {
  const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
  let real: Character | null = null
  try {
    real = JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    real = null
  }

  const composed = real ? composeTurn({ character: real, combat: null }) : null
  const reactions = composed
    ? [...composed.ranked, ...composed.rest, ...composed.mutex.flatMap(g => g.faces)].filter(
        o => o.cost.slot === 'reaction'
      )
    : []
  /* EVERY option of that name, not the first. The two Sentinel rows are two
     OPTIONS both named "Sentinel" — the "· takes the Disengage action" suffix
     Marcus sees is built by the row model in `reactions.ts` out of the trigger,
     and is not on the option at all. The first version of this block asserted
     against the screen's names and threw; the precondition below is what caught
     it, which is the entire reason a precondition is written first. Returning
     the whole list also means "one of the two was fixed" cannot read as a pass. */
  const provenanceOfAll = (name: string) => {
    const found = reactions.filter(o => o.name === name)
    if (found.length === 0) {
      throw new Error(`no reaction option named ${name} — options: ${reactions.map(o => o.name).join(' | ')}`)
    }
    return found.map(o => optionDetail(o, real!, composed!.economy).provenance)
  }

  it.skipIf(!real)('his band composes the four reactions this claim is about', () => {
    // The precondition, measured rather than assumed. Without it a rename
    // upstream would turn every assertion below into a thrown lookup that
    // still reads like a failure of the tag.
    expect(reactions.map(o => o.name).sort()).toEqual(
      [
        'Hearthfire Manifest',
        'Opportunity Attack — The Dawn Guardian',
        'Sentinel',
        'Sentinel',
      ].sort()
    )
  })

  it.skipIf(!real)('canon wrote both Sentinel rows, so neither sheet claims he did', () => {
    // THE REGRESSION. Both said 'sheet' before slice 5b — canon's own text
    // under a tag reading "your own".
    expect(provenanceOfAll('Sentinel')).toEqual(['canon', 'canon'])
  })

  it.skipIf(!real)('a canon FEATURE was already right, and stays right', () => {
    expect(provenanceOfAll('Hearthfire Manifest')).toEqual(['canon'])
  })

  it.skipIf(!real)('his own weapon is still his own — the tag was not merely switched off', () => {
    expect(provenanceOfAll('Opportunity Attack — The Dawn Guardian')).toEqual(['sheet'])
  })

  it('an option carrying no provenance at all gets the answer it always got', () => {
    // Every pre-overlay caller, and every test written against a bare
    // `TurnOption`. The new read is optional and falls back to `canonBands`,
    // so a name canon has never heard of is still, correctly, his own.
    const invented: TurnOption = {
      id: 'x', name: 'Kettle Mastery', kind: 'feature',
      detail: 'You are good with kettles.',
      cost: { slot: 'action', label: 'Action' },
      available: true, score: 0,
    }
    expect('provenance' in invented).toBe(false)
    expect(optionDetail(invented, NIX, FRESH).provenance).toBe('sheet')
  })
})
