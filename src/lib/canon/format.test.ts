import { describe, it, expect } from 'vitest'
import { SPELLS } from '../../canon'
import { spellByName } from './lookup'
import { mechanicsLine, statBlock, cantripTier, ROW_BUDGET_CHARS, type CasterContext } from './format'

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
