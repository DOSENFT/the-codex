import { describe, it, expect } from 'vitest'
import { SPELLS } from '../../canon'
import { spellByName } from './lookup'
import { mechanicsLine, statBlock, statBlockFor, cantripTier, ROW_BUDGET_CHARS, type CasterContext } from './format'

/* ============================================================================
   TESTS 5-9 of docs/plans/table-truth/03-program-design.md, plus the ones the
   real canon data forced into existence after those were written.

   THE PROMISE UNDER TEST: every row is exactly two lines, the second of which
   is structured facts. No ellipsis, no half-word, no empty row, and no die
   that is wrong for the character holding the phone.
   ========================================================================= */

/** Nix at the table: level 7, +3 proficiency, Charisma +4. The numbers come
 *  from the CHARACTER on purpose — canon's own spellSaveDC is the unusable
 *  string "8 + 3 + Charisma modifier". */
const NIX: CasterContext = {
  spellSaveDC: 15,
  spellAttackBonus: 7,
  characterLevel: 7,
  abilityMod: 4,
}

describe('5 — the worked example from the design doc', () => {
  it('Divine Smite renders exactly "2d8 Radiant · +1d8 Fiend/Undead"', () => {
    const spell = spellByName('Divine Smite')!
    expect(mechanicsLine(spell, NIX).text).toBe('2d8 Radiant · +1d8 Fiend/Undead')
  })

  it('every character of it comes from canon, not from an author', () => {
    const spell = spellByName('Divine Smite')!
    expect(spell.damage!.dice).toBe('2d8')
    expect(spell.damage!.type).toBe('Radiant')
    expect(spell.damage!.bonus).toContain('1d8')
    // Range is "Self", which is why no range segment appears.
    expect(spell.range).toBe('Self')
  })
})

describe("6 — the save DC comes from the character, never from canon's string", () => {
  it('renders DC {n} {ABILITY} with the caster\'s number', () => {
    const saveSpell = SPELLS.find(s => s.save && !s.attackRoll)!
    const line = mechanicsLine(saveSpell, NIX).text
    expect(line).toContain(`DC ${NIX.spellSaveDC} `)
    expect(line).toMatch(/DC 15 (STR|DEX|CON|INT|WIS|CHA)\b/)
  })

  it('a different caster moves the DC — it is not baked in', () => {
    const saveSpell = SPELLS.find(s => s.save)!
    const other = mechanicsLine(saveSpell, { ...NIX, spellSaveDC: 13 }).text
    expect(other).toContain('DC 13 ')
    expect(other).not.toContain('DC 15 ')
  })

  it('no rendered line ever contains canon\'s unusable DC formula', () => {
    for (const spell of SPELLS) {
      expect(mechanicsLine(spell, NIX).text).not.toContain('Charisma modifier')
    }
  })

  it('a spell attack renders the character\'s signed bonus, not the phrase', () => {
    const attackSpell = SPELLS.find(s => s.attackRoll)!
    const line = mechanicsLine(attackSpell, NIX).text
    expect(line.startsWith('+7')).toBe(true)
    expect(line).not.toContain('Ranged spell attack')
  })
})

describe('7 — nothing is ever truncated', () => {
  it('no row line contains an ellipsis, in any form, across all canon spells', () => {
    const offenders = SPELLS.filter(s => /…|\.\.\./.test(mechanicsLine(s, NIX).text)).map(s => s.name)
    expect(offenders).toEqual([])
  })

  it('no row line ends mid-word or on a dangling separator', () => {
    const offenders = SPELLS.map(s => ({ name: s.name, text: mechanicsLine(s, NIX).text }))
      .filter(r => /[·\s]$/.test(r.text) || /^[·\s]/.test(r.text))
      .map(r => `${r.name}: "${r.text}"`)
    expect(offenders).toEqual([])
  })
})

describe('8 — every row line fits the two-line budget', () => {
  it(`no line exceeds ${ROW_BUDGET_CHARS} characters`, () => {
    const over = SPELLS.map(s => ({ name: s.name, text: mechanicsLine(s, NIX).text }))
      .filter(r => r.text.length > ROW_BUDGET_CHARS)
      .map(r => `${r.name} (${r.text.length}): ${r.text}`)
    expect(over, `lines over budget:\n${over.join('\n')}`).toEqual([])
  })

  it('over-budget lines lose whole segments, never characters', () => {
    // A caster with absurd numbers cannot make the renderer cut a word in half.
    const wide = { ...NIX, spellSaveDC: 100, spellAttackBonus: 100 }
    for (const spell of SPELLS) {
      const line = mechanicsLine(spell, wide)
      expect(line.text.length).toBeLessThanOrEqual(ROW_BUDGET_CHARS)
      if (line.dropped.length > 0) expect(line.qualified).toBe(true)
    }
  })
})

describe('9 — no row is ever empty', () => {
  it('every canon spell produces a non-empty mechanics line', () => {
    const empty = SPELLS.filter(s => mechanicsLine(s, NIX).text.trim().length === 0).map(s => s.name)
    expect(empty).toEqual([])
  })

  it('a pure-utility spell falls back to range and duration', () => {
    // Bless: no damage, no healing, no save, no attack roll.
    const bless = spellByName('Bless')!
    expect(bless.damage).toBeNull()
    expect(bless.save).toBeNull()
    expect(bless.attackRoll).toBeNull()
    expect(mechanicsLine(bless, NIX).text).toBe('30 ft · Conc 1 min')
  })
})

/* ── The tests the real data forced ─────────────────────────────────────── */

describe('cantrip scaling is computed, never read off canon\'s prose', () => {
  it('the 2024 tiers step at CHARACTER levels 5, 11 and 17', () => {
    expect(cantripTier(1)).toBe(1)
    expect(cantripTier(4)).toBe(1)
    expect(cantripTier(5)).toBe(2)
    expect(cantripTier(10)).toBe(2)
    expect(cantripTier(11)).toBe(3)
    expect(cantripTier(16)).toBe(3)
    expect(cantripTier(17)).toBe(4)
  })

  it('Sacred Flame shows 2d8 at level 7, not the leading 1d8', () => {
    const spell = spellByName('Sacred Flame')!
    // Canon's own field is prose. This is the string we refuse to print.
    expect(spell.damage!.dice).toContain('(2d8 at character level 5')
    expect(mechanicsLine(spell, NIX).text).toContain('2d8 Radiant')
    expect(mechanicsLine(spell, { ...NIX, characterLevel: 4 }).text).toContain('1d8 Radiant')
    expect(mechanicsLine(spell, { ...NIX, characterLevel: 11 }).text).toContain('3d8 Radiant')
    expect(mechanicsLine(spell, { ...NIX, characterLevel: 17 }).text).toContain('4d8 Radiant')
  })

  it('Toll the Dead scales BOTH of its dice and keeps the choice visible', () => {
    const spell = spellByName('Toll the Dead')!
    const line = mechanicsLine(spell, NIX)
    expect(line.text).toContain('2d8/2d12 Necrotic')
    // The condition ("if the target is missing any Hit Points") is prose and
    // lives in the detail sheet. The row says so.
    expect(line.qualified).toBe(true)
  })

  it('Word of Radiance scales its single die', () => {
    expect(mechanicsLine(spellByName('Word of Radiance')!, NIX).text).toContain('2d6 Radiant')
  })

  it('a levelled spell is NEVER scaled by the cantrip rule', () => {
    for (const spell of SPELLS) {
      if (spell.level === 0 || !spell.damage) continue
      const atSeven = mechanicsLine(spell, NIX).text
      const atSeventeen = mechanicsLine(spell, { ...NIX, characterLevel: 17 }).text
      expect(atSeventeen).toBe(atSeven)
    }
  })

  it('no scaling parenthetical ever reaches the screen', () => {
    for (const spell of SPELLS) {
      const text = mechanicsLine(spell, NIX).text
      expect(text).not.toContain('scales at')
      expect(text).not.toContain('character level')
    }
  })
})

describe('multi-damage spells use canon\'s own connective', () => {
  it('"plus" becomes + — both dice are rolled', () => {
    const spell = spellByName('Flame Strike')!
    expect(spell.damage!.dice).toContain('plus')
    expect(mechanicsLine(spell, NIX).text).toContain('5d6+5d6')
  })

  it('Destructive Wave keeps both damage totals', () => {
    const line = mechanicsLine(spellByName('Destructive Wave')!, NIX)
    expect(line.text).toContain('5d6+5d6')
    expect(line.text.length).toBeLessThanOrEqual(ROW_BUDGET_CHARS)
  })

  it('Scorching Ray shows the per-ray die and flags the rest as qualified', () => {
    const line = mechanicsLine(spellByName('Scorching Ray')!, NIX)
    expect(line.text).toContain('2d6 Fire')
    expect(line.qualified).toBe(true) // "per ray, 3 rays" is in the detail sheet
  })
})

describe('the row never renders prose', () => {
  const PROSE = [
    ' if ', ' the ', ' your ', ' you ', ' target', ' creature', ' choice',
    'must ', 'when ', 'instead',
  ]
  it('no canon spell line contains a prose fragment', () => {
    const offenders: string[] = []
    for (const spell of SPELLS) {
      const text = mechanicsLine(spell, NIX).text.toLowerCase()
      for (const fragment of PROSE) {
        if (text.includes(fragment)) offenders.push(`${spell.name}: "${text}" (${fragment.trim()})`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('statBlock — the detail sheet, where prose is allowed', () => {
  it('gives canon back verbatim, including the strings the row dropped', () => {
    const rows = statBlock(spellByName('Toll the Dead')!)
    const damage = rows.find(r => r.label === 'Damage')!
    expect(damage.value).toContain('if the target is missing any Hit Points')
  })

  it('always carries the five fields a player reads first', () => {
    for (const spell of SPELLS) {
      const labels = statBlock(spell).map(r => r.label)
      expect(labels).toContain('Level')
      expect(labels).toContain('Casting Time')
      expect(labels).toContain('Range')
      expect(labels).toContain('Components')
      expect(labels).toContain('Duration')
    }
  })

  it('never emits an empty value', () => {
    const offenders: string[] = []
    for (const spell of SPELLS) {
      for (const row of statBlock(spell)) {
        if (!row.value || !row.value.trim()) offenders.push(`${spell.name} / ${row.label}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('labels a cantrip as a cantrip, not as "Level 0"', () => {
    const cantrip = SPELLS.find(s => s.level === 0)!
    expect(statBlock(cantrip)[0].value).toMatch(/cantrip$/)
    expect(statBlock(cantrip)[0].value).not.toContain('Level 0')
  })
})

describe('statBlockFor — band ① with the caster in scope, Open Book slice 4', () => {
  /* ===========================================================================
     "some wording of spells don't include my actual data (like prof bonus,
     range, modifiers, etc)" — Marcus, 2026-09-07.

     The sharpest instance is not an omission but a self-contradiction. At level
     7 the Sacred Flame ROW says 2d8, and band ① of the card — since Open Book
     slice 1, three inches below it on the same screen — says
     "1d8 (2d8 at character level 5, …)", because `statBlock` has no character
     and cannot do the arithmetic. `InlineOptionCard.test.tsx` has pinned that
     contradiction deliberately since slice 1. This is the slice that inverts it.
     ========================================================================= */

  const LEVEL_1: CasterContext = { ...NIX, characterLevel: 1 }

  it('does the arithmetic canon left as words, and the row already did', () => {
    const spell = spellByName('Sacred Flame')!
    const damageFor = (rows: Array<{ label: string; value: string }>) =>
      rows.find(r => r.label === 'Damage')!.value

    expect(damageFor(statBlockFor(spell, NIX))).toBe('2d8 Radiant')

    /* BOTH ASSERTIONS, IN ONE TEST, BECAUSE THE POINT IS THAT IT IS AN ADDITION.
       `statBlock` keeps its signature, its caller-blindness and its tests; if
       this line ever goes red it means the character-blind reading was quietly
       changed underneath every other caller. */
    expect(damageFor(statBlock(spell))).toBe('1d8 (2d8 at character level 5, 3d8 at 11, 4d8 at 17) Radiant')
  })

  it('resolves canon\'s "spellcasting ability modifier" to his actual modifier', () => {
    const spell = spellByName('Cure Wounds')!
    const healing = statBlockFor(spell, NIX).find(r => r.label === 'Healing')!.value
    expect(healing).toBe('2d8 + 4')
    // And the words are still the words when nobody is holding the phone.
    expect(statBlock(spell).find(r => r.label === 'Healing')!.value)
      .toBe('2d8 + spellcasting ability modifier')
  })

  it('scales in canon\'s OWN string and drops none of the qualifier', () => {
    /* THE TEST THAT DECIDED THE IMPLEMENTATION. Toll the Dead's dice field is
       "1d8, or 1d12 if the target is missing any Hit Points (scales at …)".
       Printing `scaleDice`'s expressions — which is the obvious way to write
       this function — would have rendered "2d8/2d12" and silently deleted the
       condition under which the second one applies: a rule he no longer has,
       in the band whose promise is "canon's fields as printed, nothing
       compacted". Same class of loss slice 2 caught on the cost line. */
    const rows = statBlockFor(spellByName('Toll the Dead')!, NIX)
    const damage = rows.find(r => r.label === 'Damage')!.value
    expect(damage).toBe('2d8, or 2d12 if the target is missing any Hit Points Necrotic')
    expect(damage).toContain('if the target is missing any Hit Points')
    // The clause that is now stated twice, once wrongly, is the only thing gone.
    expect(damage).not.toContain('scales at character levels')
  })

  it('is byte-identical to statBlock for EVERY spell at character level 1', () => {
    /* Tier 1 is the identity, and saying so over the corpus is what makes
       "nothing else changed" checkable rather than asserted. It also pins the
       one thing a scaling bug would break quietly: a level-1 caster reading a
       number no book contains. Healing is the exception by design and is
       excluded by name rather than by a loose matcher. */
    const drift: string[] = []
    for (const spell of SPELLS) {
      const blind = statBlock(spell)
      const seeing = statBlockFor(spell, LEVEL_1)
      for (let i = 0; i < blind.length; i++) {
        if (blind[i].label === 'Healing') continue
        if (blind[i].value !== seeing[i].value) {
          drift.push(`${spell.name} / ${blind[i].label}: "${blind[i].value}" → "${seeing[i].value}"`)
        }
      }
    }
    expect(drift).toEqual([])
  })

  it('changes exactly two labels and no others, across all 71 spells', () => {
    /* The claim in the docstring, measured. A `Range` or `Duration` that starts
       varying by character is canon being rewritten, which is the one thing
       this slice promised not to do — and it would be invisible on any screen
       Marcus looks at, because he has only ever seen one character's copy. */
    const changed = new Set<string>()
    for (const spell of SPELLS) {
      const blind = statBlock(spell)
      const seeing = statBlockFor(spell, NIX)
      expect(seeing.map(r => r.label)).toEqual(blind.map(r => r.label))
      for (let i = 0; i < blind.length; i++) {
        if (blind[i].value !== seeing[i].value) changed.add(blind[i].label)
      }
    }
    expect([...changed].sort()).toEqual(['Damage', 'Healing'])
  })

  it('THE ONE THAT MATTERS: the card and the row agree about the dice, for every spell', () => {
    /* THE BUG THIS FEATURE WAS REPORTED FOR, AS A PROPERTY OVER THE WHOLE
       CORPUS rather than as one example. `mechanicsLine` scales through
       `scaleDice`; band ① now scales through `scaledDamageDice`. They agree by
       construction — same strip, same `cantripTier`, same regex — and that is
       precisely why it is worth a corpus test: "by construction" is a claim
       about code that one edit ends, silently, on a screen where the two
       numbers are three inches apart. */
    const contradictions: string[] = []
    for (const spell of SPELLS) {
      if (!spell.damage) continue
      const row = mechanicsLine(spell, NIX).text
      const rowDice: string[] = row.match(/\b\d+d\d+\b/g) ?? []
      if (rowDice.length === 0) continue

      const card = statBlockFor(spell, NIX).find(r => r.label === 'Damage')!.value
      const cardDice: string[] = card.match(/\b\d+d\d+\b/g) ?? []

      /* Every die the ROW prints must appear on the CARD saying the same thing.
         Not set equality: the card is allowed to say MORE (a bonus die the row
         had no room for), it is not allowed to say something DIFFERENT. */
      for (const die of rowDice) {
        if (!cardDice.includes(die)) {
          contradictions.push(`${spell.name}: row "${row}" vs card "${card}"`)
          break
        }
      }
    }
    expect(contradictions).toEqual([])
  })
})
