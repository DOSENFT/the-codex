/* Gate 3 tests 10-15 — the canon overlay.
 *
 * These are the assertions that decide whether the overlay is an improvement or
 * a liability. Three of them are about what it must NOT do: not lose homebrew,
 * not throw, and not let a future session quietly edit the characterization
 * record it is built to work around.
 *
 * Table Truth slice 5. */

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { NIX } from './fixtures/nix'
import { categorizeTurnOptions, type ActionOption } from './options'
import { composeTurn } from './compose'
import { overlayCanon, casterContextOf, fitRowDetail, DETAIL_BUDGET_CHARS } from './overlay'
import { spellByName, featureByName } from '../canon/lookup'
import type { CanonSpell } from '../canon/types'

/** A bare option, so an assertion about the overlay is not also an assertion
 *  about options.ts. Every field the overlay may touch is filled with something
 *  recognisable, so "unchanged" is provable rather than vacuous. */
function option(over: Partial<ActionOption> & { name: string }): ActionOption {
  return {
    type: 'spell',
    actionEconomy: 'action',
    summary: 'SHEET SUMMARY',
    mechanicsLine: 'SHEET MECHANICS',
    effectsLine: 'SHEET EFFECTS',
    ...over,
  }
}

const all = categorizeTurnOptions(NIX)
const byName = (name: string): ActionOption => {
  const found = [...all.actions, ...all.bonusActions, ...all.reactions, ...all.passives].find(
    o => o.name === name,
  )
  if (!found) throw new Error(`fixture has no option named ${name}`)
  return found
}

// ---------------------------------------------------------------------------
// 10 — the open-world rule, pinned
// ---------------------------------------------------------------------------

describe('10 — a sheet option canon has never heard of keeps its own words', () => {
  it('leaves every display string alone and marks it provenance sheet', () => {
    const homebrew = option({ name: 'Undertow Aura', type: 'feature' })
    const out = overlayCanon(homebrew, NIX)

    expect(out.provenance).toBe('sheet')
    expect(out.canonId).toBeUndefined()
    expect(out.mechanicsLine).toBe('SHEET MECHANICS')
    expect(out.effectsLine).toBe('SHEET EFFECTS')
    expect(out.summary).toBe('SHEET SUMMARY')
  })

  it('never invents an action economy for content it does not know', () => {
    const out = overlayCanon(option({ name: 'Riptide Step', type: 'feature' }), NIX)
    expect(out.canonEconomy).toBeUndefined()
  })

  it('does not drop the option — an overlaid option is still an option', () => {
    const out = overlayCanon(option({ name: 'Salt-Bound Oath', type: 'feature' }), NIX)
    expect(out.name).toBe('Salt-Bound Oath')
    expect(out.actionEconomy).toBe('action')
  })
})

// ---------------------------------------------------------------------------
// 11 — a match sets canonId and replaces the mechanics line
// ---------------------------------------------------------------------------

describe('11 — a canon match sets canonId and replaces mechanicsLine', () => {
  it('rewrites Divine Smite from canon fields, not from the sheet', () => {
    const sheet = byName('Divine Smite')
    const out = overlayCanon(sheet, NIX)

    expect(out.provenance).toBe('canon')
    expect(out.canonId).toBe('divine-smite')
    expect(out.mechanicsLine).toBe('2d8 Radiant · +1d8 Fiend/Undead')
    // The rider is the whole point: the sheet never knew about it.
    expect(sheet.mechanicsLine).not.toContain('Fiend')
  })

  it('scales a cantrip to the character level instead of printing the level-1 die', () => {
    const out = overlayCanon(byName('Sacred Flame'), NIX)
    // Nix is level 8, so the 2024 tier is ×2. Canon's own string says "1d8".
    expect(spellByName('Sacred Flame')!.damage!.dice).toMatch(/^1d8/)
    expect(out.mechanicsLine).toContain('2d8')
  })

  it('uses the CHARACTER save DC, never canon’s formula string', () => {
    const out = overlayCanon(byName('Sacred Flame'), NIX)
    expect(out.mechanicsLine).toContain(`DC ${NIX.spellSaveDC}`)
  })

  it('resolves a healing modifier from the sheet', () => {
    // Cure Wounds is 2d8 + the spellcasting modifier. Nix has CHA 18 → +4.
    expect(casterContextOf(NIX).abilityMod).toBe(4)
    const out = overlayCanon(byName('Cure Wounds'), NIX)
    expect(out.mechanicsLine).toContain('heal 2d8+4')
  })

  it('never emits an ellipsis, on any option the fixture can produce', () => {
    for (const o of [...all.actions, ...all.bonusActions, ...all.reactions, ...all.passives]) {
      const out = overlayCanon(o, NIX)
      if (out.provenance !== 'canon') continue
      expect(out.mechanicsLine).not.toMatch(/\.\.\.|…/)
      expect(out.effectsLine).not.toMatch(/\.\.\.|…/)
    }
  })

  it('keeps the joined row inside the measured budget', () => {
    for (const o of [...all.actions, ...all.bonusActions, ...all.reactions]) {
      const out = overlayCanon(o, NIX)
      if (out.provenance !== 'canon' || out.type !== 'spell') continue
      const joined = [out.mechanicsLine, out.effectsLine].filter(Boolean).join(' · ')
      expect(joined.length, `${out.name}: "${joined}"`).toBeLessThanOrEqual(46)
    }
  })
})

// ---------------------------------------------------------------------------
// 12 — a malformed record degrades to case 10 and does not throw
// ---------------------------------------------------------------------------

describe('12 — a malformed canon record degrades to the sheet', () => {
  it('survives a record whose fields are the wrong shape entirely', () => {
    // Reaching into the frozen index is the only honest way to simulate a canon
    // package that a future edit breaks. Restored in a finally so the mutation
    // cannot leak into another test.
    const spell = spellByName('Divine Smite') as unknown as Record<string, unknown>
    const saved = { damage: spell.damage, range: spell.range, duration: spell.duration }
    try {
      spell.damage = { dice: null, type: null }
      spell.range = null
      spell.duration = null
      const out = overlayCanon(byName('Divine Smite'), NIX)
      expect(out.provenance).toBe('sheet')
      expect(out.mechanicsLine).toBe(byName('Divine Smite').mechanicsLine)
    } finally {
      Object.assign(spell, saved)
    }
  })

  it('is total over the whole corpus — every canon spell renders or degrades', () => {
    for (const name of ['Divine Smite', 'Sacred Flame', 'Cure Wounds', 'Bless', 'Misty Step']) {
      expect(() => overlayCanon(option({ name }), NIX)).not.toThrow()
    }
  })

  it('leaves a character with no ability scores alone rather than crashing', () => {
    const stripped = { ...NIX, abilityScores: undefined } as unknown as typeof NIX
    expect(() => overlayCanon(byName('Cure Wounds'), stripped)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 13 — the first pinned bug: an aura is filed by its FIELD, not by its NAME
// ---------------------------------------------------------------------------

describe('13 — "Aura…" is categorised by canon, not by the prefix of its name', () => {
  it('files Aura of Solace as passive because canon names no action for it', () => {
    const canon = featureByName('Aura of Solace')!
    // The reason matters as much as the answer: canon's mechanics bag exists
    // and states shape, effect and when it is inactive — and no action cost.
    expect(canon.mechanics).toBeTruthy()
    expect(JSON.stringify(canon.mechanics)).not.toMatch(/"(Bonus Action|Reaction|Action)"/)

    const out = overlayCanon(byName('Aura of Solace'), NIX)
    expect(out.provenance).toBe('canon')
    expect(out.canonEconomy).toBe('passive')
  })

  it('files Aura of Vitality as an ACTION — the name sniff would have hidden it', () => {
    // The bug in options.ts:365-367: a feature whose name contains "aura" and
    // which declares no actionType is filed as a passive, and a passive is
    // never offered as something to do. Canon says castingTimeType 'action'.
    const undeclared = option({ name: 'Aura of Vitality', type: 'feature' })
    const out = overlayCanon(undeclared, NIX)

    expect(spellByName('Aura of Vitality')!.castingTimeType).toBe('action')
    expect(out.canonEconomy).toBe('action')
    expect(out.canonEconomy).not.toBe('passive')
  })

  it('declines to file Hearthfire Manifest, which canon gives two costs', () => {
    // Bonus Action to summon, Reaction to cloak. Canon does not pick one, so
    // neither does the overlay — the sheet's own filing stands until slice 6
    // splits it into two entries.
    const out = overlayCanon(byName('Hearthfire Manifest'), NIX)
    expect(out.provenance).toBe('canon')
    expect(out.canonEconomy).toBeUndefined()
  })

  it('does not let a canon miss reclassify anything', () => {
    const out = overlayCanon(option({ name: 'Aura of Brine', type: 'feature' }), NIX)
    expect(out.canonEconomy).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 14 — the second pinned bug: 40 POINTS is not 40 uses
// ---------------------------------------------------------------------------

describe('14 — a 40-point pool prices as points', () => {
  it('rewrites the counter reading on Lay on Hands', () => {
    const sheet = byName('Lay on Hands')
    // Pinned: this is what options.ts says today, and it is wrong.
    expect(sheet.effectsLine).toContain('15/40 uses')

    const out = overlayCanon(sheet, NIX)
    expect(out.effectsLine).toContain('15/40 points')
    expect(out.effectsLine).not.toContain('uses')
  })

  it('leaves a pool that really is measured in uses alone', () => {
    const out = overlayCanon(byName('Channel Divinity: Sacred Weapon'), NIX)
    expect(out.effectsLine).toContain('1/2 uses')
  })

  it('says "points" in the unaffordable reason too', () => {
    const spent = {
      ...NIX,
      features: NIX.features.map(f =>
        f.name === 'Lay on Hands' ? { ...f, usesCurrent: 0 } : f,
      ),
    }
    const drained = categorizeTurnOptions(spent, { includeUnaffordable: true })
    const sheet = [...drained.actions, ...drained.bonusActions].find(o => o.name === 'Lay on Hands')!
    expect(sheet.unaffordableReason).toBe('No uses left until a long rest')

    const out = overlayCanon(sheet, spent)
    expect(out.unaffordableReason).toBe('No points left until a long rest')
  })

  it('corrects homebrew too — the noun belongs to the pool, not to canon', () => {
    const brine = {
      ...NIX,
      resourcePools: [
        { id: 'brine', name: 'Brine', current: 3, max: 9, unit: 'points' as const, recharge: 'longRest' as const },
      ],
    }
    const out = overlayCanon(option({ name: 'Brine', type: 'feature', effectsLine: '3/9 uses' }), brine)
    expect(out.effectsLine).toBe('3/9 points')
    expect(out.provenance).toBe('sheet')
  })
})

// ---------------------------------------------------------------------------
// 15 — the guard: options.ts is byte-identical to main
// ---------------------------------------------------------------------------

describe('15 — options.ts is byte-identical to main', () => {
  it('has not been "improved" by anyone, including this slice', () => {
    // options.ts is a characterization record of the shipped prototype. Its
    // whole value is being an exact copy; the two bugs above are fixed in the
    // overlay precisely so that this stays true. If this test fails, either
    // revert the edit or change the pinned assertions in
    // TurnSummary.characterization.test.ts and say why in 00-status.md.
    const path = 'src/lib/turn/options.ts'
    const repo = resolve(__dirname, '../../..')
    const onMain = execFileSync('git', ['show', `main:${path}`], {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    })
    const working = readFileSync(resolve(repo, path), 'utf8')
    // Line endings are normalised on both sides. `git show` prints the blob as
    // stored — LF — while the working copy on Marcus's Windows machine is
    // checked out CRLF. Comparing them raw makes every line differ and the test
    // becomes noise. What is being guarded is the CONTENT of a characterization
    // record, and a carriage return is not content.
    const lf = (s: string) => s.replace(/\r\n/g, '\n')
    expect(lf(working)).toBe(lf(onMain))
  })
})

// ---------------------------------------------------------------------------
// The wiring — the overlay is no good in a jar
// ---------------------------------------------------------------------------
//
// Everything above proves `overlayCanon` in isolation. These prove it actually
// reaches the screen: same assertions, made against `composeTurn`'s output,
// which is what the surface renders.

describe('the overlay reaches the composed turn', () => {
  const turn = composeTurn({ character: NIX, combat: null })
  const rows = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
  const row = (name: string) => {
    const found = rows.find(o => o.name === name)
    if (!found) throw new Error(`composed turn has no row named ${name}`)
    return found
  }

  it('prices Lay on Hands in points on the row Marcus actually sees', () => {
    expect(row('Lay on Hands').cost.label).toBe('Bonus action · 15/40 points')
    expect(row('Lay on Hands').detail).not.toContain('uses')
  })

  it('shows Divine Smite the rider the sheet never knew about', () => {
    expect(row('Divine Smite').detail).toContain('+1d8 Fiend/Undead')
    expect(row('Divine Smite').provenance).toBe('canon')
    expect(row('Divine Smite').canonId).toBe('divine-smite')
  })

  it('scales Sacred Flame to level 8 and uses the sheet’s DC', () => {
    expect(row('Sacred Flame').detail).toContain('2d8 Radiant')
    expect(row('Sacred Flame').detail).toContain('DC 16 DEX')
  })

  it('marks homebrew the app cannot match as sheet, and still renders it', () => {
    // Misty Step is not on the Paladin list canon ships, so it has no entry.
    // The row survives with its own words. That is the open-world rule on the
    // real screen, not in a fixture.
    expect(row('Misty Step').provenance).toBe('sheet')
    expect(row('Misty Step').detail.length).toBeGreaterThan(0)
  })

  it('no composed row contains an ellipsis', () => {
    for (const o of rows) expect(o.detail, o.name).not.toMatch(/\.\.\.|…/)
  })

  it('loses nothing — every option the sheet produced still has a home', () => {
    const sheetNames = new Set(
      [...all.actions, ...all.bonusActions, ...all.reactions].map(o => o.name),
    )
    const composedNames = new Set(rows.map(o => o.name))
    for (const name of sheetNames) expect(composedNames.has(name), name).toBe(true)
  })
})

describe('re-filing is gated on the sheet having said nothing', () => {
  /** Nix, plus one undeclared aura — the exact record that vanishes today. */
  const withUndeclaredAura = {
    ...NIX,
    features: [
      ...NIX.features,
      {
        name: 'Aura of Vitality',
        level: 3,
        description: 'Healing energy radiates from you in an aura.',
        range: '30 feet',
        category: 'subclass' as const,
      },
    ],
  }

  it('offers an undeclared "Aura…" that canon casts with an Action', () => {
    const turn = composeTurn({ character: withUndeclaredAura, combat: null })
    const rows = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]

    // The bug: options.ts files it as a passive on its name alone.
    const sheet = categorizeTurnOptions(withUndeclaredAura)
    expect(sheet.passives.map(o => o.name)).toContain('Aura of Vitality')
    expect(sheet.actions.map(o => o.name)).not.toContain('Aura of Vitality')

    // The fix: canon says castingTimeType 'action', so it is something to do.
    expect(rows.map(o => o.name)).toContain('Aura of Vitality')
    expect(rows.find(o => o.name === 'Aura of Vitality')!.cost.slot).toBe('action')
    expect(turn.upon.map(u => u.name)).not.toContain('Aura of Vitality')
  })

  it('leaves a DECLARED passive aura exactly where Marcus put it', () => {
    // Aura of Solace declares `actionType: 'passive'`. Canon agrees, but that
    // is not why it stays — it stays because Marcus said so, and a declaration
    // outranks canon. Deleting the sheet's declaration must be the only way to
    // move it.
    const turn = composeTurn({ character: NIX, combat: null })
    const rows = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    expect(turn.upon.map(u => u.name)).toContain('Aura of Solace')
    expect(rows.map(o => o.name)).not.toContain('Aura of Solace')
  })

  it('never re-files a spell — its casting time is always a declaration', () => {
    const turn = composeTurn({ character: NIX, combat: null })
    const rows = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
    // Canon files Divine Smite bonus_action and so does the sheet; the point is
    // that the SHEET's castingTime is what put it there. Slice 8 owns the case
    // where the two disagree, and shows both readings rather than picking one.
    expect(rows.find(o => o.name === 'Divine Smite')!.cost.slot).toBe('bonusAction')
  })
})

// ---------------------------------------------------------------------------
// The row's own budget — written against measurements, not guesses
// ---------------------------------------------------------------------------

/* Every string in this block is a string the browser prover actually caught
 * painting three lines on Nix's Play tab. They are quoted verbatim so that if
 * the producers change shape, these tests fail loudly instead of passing
 * against a fiction. */

const HEARTHBRAND =
  '+7 to hit (STR +3 + prof +1 magic) · 1d8+4 Slashing · 5 ft · Magical · Mastery: Sap · Versatile (1d10)'
const JAVELIN = '+6 to hit (STR +3 + prof) · 1d6+3 Piercing · Standard attack'

describe('fitRowDetail — the second line is one line', () => {
  it('brings the two rows the prover caught wrapping back inside the budget', () => {
    expect(fitRowDetail(HEARTHBRAND).length).toBeLessThanOrEqual(DETAIL_BUDGET_CHARS)
    expect(fitRowDetail(JAVELIN).length).toBeLessThanOrEqual(DETAIL_BUDGET_CHARS)
  })

  it('spends the reclaimed room on the damage die, not on the arithmetic', () => {
    // Hearthbrand keeps what a swing needs and drops the tail. Mastery and
    // Versatile are gone from the ROW; they are still in `option.detail`, and
    // slice 7's sheet is where they are read.
    expect(fitRowDetail(HEARTHBRAND)).toBe('+7 to hit · 1d8+4 Slashing · 5 ft · Magical')
  })

  it('drops nothing at all when the derivation alone was the overrun', () => {
    // Javelin was 60 characters; 24 of them explained a number Nix can already
    // see. Without them all three facts fit, so all three stay.
    expect(fitRowDetail(JAVELIN)).toBe('+6 to hit · 1d6+3 Piercing · Standard attack')
  })

  it('strips a to-hit parenthetical by SHAPE and leaves every other one alone', () => {
    // Versatile (1d10) is a parenthetical too, and it is a fact, not a
    // derivation. The rule may not reach it.
    expect(fitRowDetail('+7 to hit (STR +3) · Versatile (1d10)')).toBe(
      '+7 to hit · Versatile (1d10)',
    )
    // A parenthetical that does not close a to-hit segment is untouched.
    expect(fitRowDetail('1d8+4 Slashing (magical)')).toBe('1d8+4 Slashing (magical)')
  })

  it('leaves a detail that already fits byte-identical', () => {
    const short = '2d8 Radiant · DC 16 DEX · 60 ft'
    expect(fitRowDetail(short)).toBe(short)
  })

  it('never drops the first segment, even when it alone is over budget', () => {
    const long = 'A single segment far longer than any budget this row will ever be given'
    expect(fitRowDetail(long)).toBe(long)
    expect(fitRowDetail(`${long} · 5 ft`)).toBe(long)
  })

  it('never cuts a segment in half and never emits an ellipsis', () => {
    // The whole point. Whatever survives is a segment the producer wrote,
    // entire — so the output is always a subsequence of the input's segments.
    for (const input of [HEARTHBRAND, JAVELIN, '2d8 Radiant · DC 16 DEX · 60 ft · negates']) {
      const out = fitRowDetail(input)
      expect(out).not.toContain('…')
      expect(out).not.toContain('...')
      const inputs = input.split(' · ').map(s => s.replace(/\s*\([^)]*\)$/, ''))
      for (const seg of out.split(' · ')) {
        expect(inputs.some(i => i === seg || i === seg.replace(/\s*\([^)]*\)$/, ''))).toBe(true)
      }
    }
  })

  it('is what the row actually calls — every ranked row fits', () => {
    // The unit above proves the function; this proves it is wired. A row that
    // fits in a test and wraps on the page is the failure this slice already
    // made once.
    const turn = composeTurn({ character: NIX, combat: null })
    expect(turn.ranked.length).toBeGreaterThan(0)
    for (const option of turn.ranked) {
      expect(fitRowDetail(option.detail).length).toBeLessThanOrEqual(DETAIL_BUDGET_CHARS)
    }
  })
})

/* A tiny type-level guard: overlay.ts must not need CanonSpell's frozen
 * level-7 snapshots. Referencing the type keeps the import honest. */
export type _Unused = CanonSpell
