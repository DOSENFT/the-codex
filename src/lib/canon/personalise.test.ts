/* SHEET TRUTH slice 5 — the prose seam.
 *
 * Six sections, in the order the module has to be trusted in:
 *
 *   1  the six placeholders, each one resolved against a real character
 *   2  what happens when there is no answer — the segment rule
 *   3  the segment scan itself, which is the only thing standing between a
 *      dropped sentence and a dropped half-sentence
 *   4  bullets: what personaliseBullets keeps, changes and drops
 *   5  canon, as it is on disk: Bless is templated, everything else is not yet,
 *      and the rules text is untouched
 *   6  the invariant that must NOT break — `splitTactics` still finds the same
 *      four headings in a Bless whose sentence now has braces in it
 */
import { describe, expect, it } from 'vitest'
import { personalise, personaliseBullets, segmentsOf } from './personalise'
import { rejoinTactics, splitTactics } from './tactics'
import { resolveCharacter, storableOf } from '../rules-2024/derive'
import { NIX } from '../turn/fixtures/nix'
import { composeTurn } from '../turn/compose'
import { optionDetail } from '../turn/detail'
import type { EconomyState } from '../turn/types'
import type { Character, CharacterBase } from '../character'
import SPELLS from '../../canon/spells.json' with { type: 'json' }
import FEATS from '../../canon/feats.json' with { type: 'json' }

/** Marcus's real ability line. Every number this file asserts is one he can
 *  check against the sheet in his hand. */
const NIX_16: Partial<CharacterBase> = {
  level: 7,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
}

function sheet(over: Partial<CharacterBase> = {}): Character {
  return resolveCharacter({ ...storableOf(NIX), ...NIX_16, ...over } as CharacterBase)
}

const NIX7 = sheet()

const blessTactics = (() => {
  const list = (SPELLS as { spells?: unknown[] }).spells ?? (SPELLS as unknown as unknown[])
  const bless = (list as Array<{ name: string; tactics: string }>).find(s => s.name === 'Bless')
  if (!bless) throw new Error('canon has no Bless — this test is measuring the wrong file')
  return bless.tactics
})()

/** Every long-form advice string canon carries, with a name to blame. */
function everyAdviceString(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = []
  const spells = ((SPELLS as { spells?: unknown[] }).spells ?? (SPELLS as unknown as unknown[])) as Array<
    Record<string, unknown>
  >
  for (const spell of spells) {
    for (const key of ['tactics', 'paladinNote'] as const) {
      const value = spell[key]
      if (typeof value === 'string') out.push({ where: `spells.${String(spell.name)}.${key}`, text: value })
    }
  }
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`))
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'paladinNote' && typeof value === 'string') out.push({ where: `feats${path}.${key}`, text: value })
      else walk(value, `${path}.${key}`)
    }
  }
  walk(FEATS, '')
  return out
}

// ── 1 · the six placeholders ────────────────────────────────────────────────
describe('the vocabulary', () => {
  it('resolves all six against Nix as he really is', () => {
    expect(
      personalise(
        'level {level} · CHA {CHA} · mod {CHAmod} · DC {saveDC} · atk {spellAttack} · prof {prof}',
        NIX7,
      ),
    ).toBe('level 7 · CHA 16 · mod 3 · DC 14 · atk 6 · prof 3')
  })

  // Gate 3, test case 14, verbatim.
  it('substitutes his numbers into a sentence', () => {
    expect(personalise('At level {level} with Charisma {CHA} your DC is {saveDC}', NIX7)).toBe(
      'At level 7 with Charisma 16 your DC is 14',
    )
  })

  it('moves when the character moves — the same string at level 9 with CHA 18', () => {
    const nine = sheet({ level: 9, abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 18 } })
    expect(personalise('At level {level} with Charisma {CHA} your DC is {saveDC}', nine)).toBe(
      'At level 9 with Charisma 18 your DC is 16',
    )
  })

  it('leaves a string with no placeholders completely alone', () => {
    const text = 'Bless does not stack with itself. It costs a level 1 slot.'
    expect(personalise(text, NIX7)).toBe(text)
  })
})

// ── 2 · no answer means no sentence ─────────────────────────────────────────
describe('when there is no answer', () => {
  const FIGHTER = resolveCharacter({
    ...storableOf(NIX),
    ...NIX_16,
    class: 'Fighter',
    subclass: 'Champion',
  } as CharacterBase)

  it('drops the sentence a non-caster has no DC for, and keeps the rest', () => {
    const text = 'Stand in the front. Your DC is {saveDC} against a brute. Read the target before you spend.'
    expect(personalise(text, FIGHTER)).toBe('Stand in the front. Read the target before you spend.')
  })

  it('never leaves a brace, a half sentence, or an ellipsis behind', () => {
    const out = personalise('Your DC is {saveDC} and your attack is {spellAttack}. Swing anyway.', FIGHTER)
    expect(out).toBe('Swing anyway.')
    expect(out).not.toContain('{')
    expect(out).not.toContain('}')
    expect(out).not.toContain('…')
    expect(out).not.toContain('...')
  })

  it('has nothing to say about a placeholder it does not recognise', () => {
    expect(personalise('Your aura is {auraRange} feet. Cluster up.', NIX7)).toBe('Cluster up.')
  })

  it('drops a sentence whose "+" would print a minus — Charisma 8', () => {
    const weak = sheet({ abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 8 } })
    expect(personalise('That is +1d4 and +{CHAmod} to every save. Cast it anyway.', weak)).toBe(
      'Cast it anyway.',
    )
  })

  it('still answers {CHA} for that character — only the SIGNED one has no answer', () => {
    const weak = sheet({ abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 8 } })
    expect(personalise('Charisma {CHA} is not your strength.', weak)).toBe('Charisma 8 is not your strength.')
  })

  it('returns the empty string when every sentence goes', () => {
    expect(personalise('Your DC is {saveDC}. Your attack is {spellAttack}.', FIGHTER)).toBe('')
  })
})

// ── 3 · the segment scan ────────────────────────────────────────────────────
describe('segmentsOf', () => {
  it('rejoins to the original, character for character, across all of canon', () => {
    for (const { where, text } of everyAdviceString()) {
      expect(segmentsOf(text).join(''), where).toBe(text)
    }
  })

  it('does not cut a decimal in half — canon is full of them', () => {
    expect(segmentsOf('1d4 (avg 2.5) on every attack. Cast it early.')).toEqual([
      '1d4 (avg 2.5) on every attack. ',
      'Cast it early.',
    ])
  })

  it('treats a run of terminators as one ending', () => {
    expect(segmentsOf('SKIP IT... Really.')).toEqual(['SKIP IT... ', 'Really.'])
  })

  it('is one segment when there is nothing to end', () => {
    expect(segmentsOf('no terminator here')).toEqual(['no terminator here'])
    expect(segmentsOf('')).toEqual([])
  })
})

// ── 4 · bullets ─────────────────────────────────────────────────────────────
describe('personaliseBullets', () => {
  const FIGHTER = resolveCharacter({
    ...storableOf(NIX),
    ...NIX_16,
    class: 'Fighter',
    subclass: 'Champion',
  } as CharacterBase)

  it('substitutes inside a bullet body and keeps canon\'s heading', () => {
    const out = personaliseBullets([{ lead: 'STACKING', body: ': that is +{CHAmod} to every save.' }], NIX7)
    expect(out).toEqual([{ lead: 'STACKING', body: ': that is +3 to every save.' }])
  })

  it('drops a bullet whose body empties rather than printing a bare heading', () => {
    const out = personaliseBullets(
      [
        { lead: 'DC', body: ': your DC is {saveDC}.' },
        { lead: 'RISK', body: ': it is Concentration.' },
      ],
      FIGHTER,
    )
    expect(out).toEqual([{ lead: 'RISK', body: ': it is Concentration.' }])
  })

  it('drops the whole bullet when the HEADING itself cannot be resolved', () => {
    const out = personaliseBullets([{ lead: 'DC {saveDC}', body: ': read the target.' }], FIGHTER)
    expect(out).toEqual([])
  })

  it('returns the identical bullet objects when canon has no placeholders', () => {
    const bullets = splitTactics('POSITIONING: stand in front. RISK: it is Concentration.')
    const out = personaliseBullets(bullets, NIX7)
    expect(out).toHaveLength(bullets.length)
    out.forEach((bullet, i) => expect(bullet).toBe(bullets[i]))
  })
})

// ── 5 · canon on disk ───────────────────────────────────────────────────────
describe('canon as it stands after this slice', () => {
  it('Bless carries placeholders and no baked Charisma', () => {
    expect(blessTactics).toContain('At level {level} with Charisma {CHA} that is +1d4 and +{CHAmod}')
    expect(blessTactics).not.toMatch(/Charisma \d/)
  })

  it("reads Marcus's own numbers into Bless's advice", () => {
    const body = personaliseBullets(splitTactics(blessTactics), NIX7)
      .map(b => b.body)
      .join(' ')
    expect(body).toContain('At level 7 with Charisma 16 that is +1d4 and +3')
    expect(body).toContain('a level 7 Paladin can put on the table')
    expect(body).not.toContain('Charisma 18')
    expect(body).not.toContain('{')
  })

  /* THE LEDGER. Slice 5 templates exactly one string; slice 6 does the rest.
   * Naming the survivors instead of skipping the check means the list can only
   * ever SHRINK — a new baked Charisma anywhere in canon fails here on the day
   * it lands, and slice 6 crossing one off is a deliberate edit to this array. */
  const SLICE_6_OWNS = [
    'spells.Command.tactics',
    'spells.Dispel Magic.tactics',
    'spells.Heroism.tactics',
    'spells.Resistance.tactics',
    'spells.Scorching Ray.tactics',
    'spells.Aura of Purity.tactics',
    'feats.general[16].paladinNote',
  ]

  /* NOT a backlog — a decision. Circle of Power says "At level 17 with Charisma
   * 20, a party member … rolls with Advantage and +5". That is a PROJECTION: a
   * worked example of a Paladin Marcus is ten levels away from being, written
   * to show what the spell becomes. Substituting his level 7 and Charisma 16
   * into it would not correct the sentence, it would destroy its point — and
   * the spell is not castable at his level anyway. Canon is allowed to talk
   * about the future in the future's numbers. */
  const PROJECTIONS = ['spells.Circle of Power.tactics']

  it('no advice string carries a baked Charisma except the ones named here', () => {
    const baked = everyAdviceString()
      .filter(({ text }) => /Charisma \d/.test(text))
      .map(({ where }) => where)
      .sort()
    expect(baked).toEqual([...SLICE_6_OWNS, ...PROJECTIONS].sort())
  })

  it('leaves the RULES alone — a prerequisite is not advice', () => {
    expect(JSON.stringify(FEATS)).toContain('Level 4+, Charisma 13+')
  })

  it('canon carries no brace of its own, so a brace on screen can only be ours', () => {
    for (const { where, text } of everyAdviceString()) {
      const braces = text.replace(/\{(level|CHA|CHAmod|saveDC|spellAttack|prof)\}/g, '')
      expect(braces.includes('{'), where).toBe(false)
      expect(braces.includes('}'), where).toBe(false)
    }
  })
})

// ── 6 · the seam is actually connected ──────────────────────────────────────
/* THIS SECTION EXISTS BECAUSE THE MICRO-REVERT FOUND NOTHING.
 *
 * With every test above written, deleting `personaliseBullets` from
 * `detail.ts` — that is, unplugging this whole slice from the app — left the
 * suite 1080 green. Every test was aimed at the FUNCTION and none at the WIRE.
 * That is finding BI wearing a different coat: a correct module the app does
 * not call is a half-built feature running as if done, and only the browser
 * probe would have caught it.
 *
 * So the seam is pinned where it lives: at `optionDetail`, the one call site,
 * through the same path the Play tab takes. */
describe('the wire', () => {
  const FRESH: EconomyState = {
    action: true,
    bonusAction: true,
    reaction: true,
    movement: true,
    spellSlotUsedThisTurn: false,
  }

  const blessDetail = (char: Character) => {
    const turn = composeTurn({ character: char, combat: null })
    const bless = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)].find(
      o => o.name === 'Bless',
    )
    if (!bless) throw new Error('no Bless option — the fixture ships it unprepared; prepare it')
    return optionDetail(bless, char, FRESH)
  }

  /** Nix with Bless prepared, which the fixture deliberately does not do. */
  const withBless = (over: Partial<CharacterBase> = {}): Character =>
    resolveCharacter({
      ...storableOf(NIX),
      ...NIX_16,
      ...over,
      spells: (NIX.spells ?? []).map(s => (s.name === 'Bless' ? { ...s, prepared: true } : s)),
    } as CharacterBase)

  it("the Play tab's own detail carries his numbers, not the author's", () => {
    const text = blessDetail(withBless())
      .tactics.map(b => b.body)
      .join(' ')
    expect(text).toContain('At level 7 with Charisma 16 that is +1d4 and +3')
    expect(text).not.toContain('Charisma 18')
  })

  it('and moves with him — the same sheet at level 9', () => {
    const text = blessDetail(withBless({ level: 9 }))
      .tactics.map(b => b.body)
      .join(' ')
    expect(text).toContain('At level 9 with Charisma 16')
    expect(text).toContain('a level 9 Paladin can put on the table')
  })

  it('never hands a placeholder to the renderer', () => {
    for (const bullet of blessDetail(withBless()).tactics) {
      expect(bullet.body).not.toContain('{')
      expect(bullet.lead ?? '').not.toContain('{')
    }
  })
})

// ── 7 · the invariant that must stay green ──────────────────────────────────
describe('splitTactics is unharmed by the placeholders', () => {
  it("still finds canon's four headings in Bless", () => {
    expect(splitTactics(blessTactics).map(b => b.lead)).toEqual([
      null,
      'POSITIONING',
      'STACKING',
      'RISK',
    ])
  })

  it('still rejoins to canon exactly — braces and all', () => {
    expect(rejoinTactics(splitTactics(blessTactics))).toBe(blessTactics.trim())
  })

  it('{CHA} is never mistaken for a heading', () => {
    expect(splitTactics('Something. With Charisma {CHA} that is a lot.').map(b => b.lead)).toEqual([null])
  })
})
