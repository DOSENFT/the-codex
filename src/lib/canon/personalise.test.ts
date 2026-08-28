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
import { auraRangeFor, levelOfClassFeature } from '../rules-2024/pools'
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

/** One spell's advice as canon stores it. Throws rather than returning '' — a
 *  renamed spell must fail loudly here, not quietly assert about nothing. */
function tacticsOf(name: string): string {
  const list = ((SPELLS as { spells?: unknown[] }).spells ?? (SPELLS as unknown as unknown[])) as Array<{
    name: string
    tactics?: string
  }>
  const found = list.find(s => s.name === name)
  if (!found?.tactics) throw new Error(`canon has no tactics for ${name} — measuring the wrong file`)
  return found.tactics
}

/** What a character actually reads: canon split into bullets, then personalised
 *  — the same two calls, in the same order, that `detail.ts` makes. */
function advice(name: string, char: Character): string {
  return personaliseBullets(splitTactics(tacticsOf(name)), char)
    .map(b => b.body)
    .join(' ')
}

const blessTactics = tacticsOf('Bless')

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

  /* THE LEDGER, AND IT IS NOW EMPTY. Slice 5 templated one string and named the
   * seven survivors here so the list could only ever shrink. Slice 6 crossed off
   * all seven. The array stays rather than the check being deleted: an empty
   * list that must stay empty is a stronger statement than no list at all, and a
   * new baked Charisma anywhere in canon still fails on the day it lands. */
  const SLICE_6_OWNS: string[] = []

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

  /* WHERE A PLACEHOLDER IS ALLOWED TO LIVE — the rule slice 6 discovered.
   *
   * `personalise` has exactly one call site: `detail.ts` runs it on a spell's
   * `tactics`. NOTHING in the app reads `paladinNote` — outside canon itself the
   * only mention in the whole of `src/` is the optional field declaration in
   * `canon/types.ts`. So a placeholder written into a `paladinNote` would never
   * be resolved by anyone. It would sit in the data looking finished until the
   * day someone rendered that field, and then print a literal "{CHA}" on his
   * screen — the exact failure `personalise.ts`'s header warns about.
   *
   * That is why Inspiring Leader's false "11 Temporary Hit Points" was REMOVED
   * rather than templated. It now states the formula in words, which is true for
   * every character at every level and needs no reader to make it true. Slice 6
   * declined to template a string the app cannot personalise. */
  it('places a placeholder only in a field that has a reader to resolve it', () => {
    const templated = everyAdviceString().filter(({ text }) => /\{[A-Za-z]+\}/.test(text))
    expect(templated.length).toBeGreaterThan(0)
    for (const { where } of templated) expect(where.endsWith('.tactics'), where).toBe(true)
  })

  it('leaves no character-derived number baked into an unreadable field', () => {
    const note = everyAdviceString().find(({ where }) => where === 'feats.general[16].paladinNote')
    expect(note?.text).toContain('equal to your level plus your Charisma modifier')
    expect(note?.text).not.toMatch(/Charisma \d|level \d/)
    expect(note?.text).not.toContain('{')
  })

  /* CANON CONTRADICTED ITSELF, AND THE TABLE WINS.
   *
   * Aura of Purity's advice said "at level 7+ your Aura of Protection already
   * gives everyone within 10 feet +Charisma to saves". Canon's own progression
   * table lists Aura of Protection at level 6, and `pools.levelOfClassFeature`
   * — which the app's aura maths actually runs on — reads that table. Two
   * different levels for one feature, in one canon package.
   *
   * The clause is gone rather than corrected to 6, because "already" was always
   * doing the work: Aura of Purity is a level 4 spell, so any Paladin who can
   * cast it has had the aura for years. A level qualifier there could only ever
   * be a second place to get the number wrong. */
  it('no longer claims a level for Aura of Protection that canon\'s table denies', () => {
    const purity = tacticsOf('Aura of Purity')
    expect(purity).not.toContain('at level 7+')
    expect(purity).toContain('ABSURD: your Aura of Protection already gives')
    expect(levelOfClassFeature('Paladin', 'Aura of Protection')).toBe(6)
  })

  /* THE AURA RADIUS IS A SEVENTH DERIVED NUMBER, AND IT STAYS AS PROSE.
   *
   * Canon says "inside 10 feet of you" in four places. `pools.auraRangeFor`
   * returns 30 at level 18, so those sentences do go wrong — at level 18. They
   * are not wrong for Marcus, and slice 6's mandate is strings that lie to him
   * today. Growing the vocabulary to seven placeholders is a Gate 3 decision,
   * not a regex widened mid-slice, so the sentences stay and this test pins how
   * many of them there are: a fifth appearing is a deliberate edit, and the day
   * Marcus reaches 18 this test is the list of what must change. */
  const AURA_RADIUS_IN_PROSE = [
    "spells.Bless.tactics",
    "spells.Circle of Power.tactics",
    "spells.Crusader's Mantle.tactics",
    'spells.Aura of Purity.tactics',
    'spells.Aura of Purity.tactics',
    'spells.Aura of Purity.tactics',
    'spells.Aura of Purity.tactics',
    'spells.Resistance.tactics',
  ]
  it('states the aura radius in prose in exactly the places slice 6 left it', () => {
    const hits = everyAdviceString()
      .flatMap(({ where, text }) => [...text.matchAll(/(?:within|inside) 10 feet/g)].map(() => where))
      .sort()
    expect(hits).toEqual([...AURA_RADIUS_IN_PROSE].sort())
    expect(auraRangeFor('Paladin', 7)).toBe(10)
    expect(auraRangeFor('Paladin', 18)).toBe(30)
  })
})

// ── 5b · the six strings slice 6 templated, each read as Marcus reads it ─────
describe('slice 6, string by string', () => {
  /* Every `expected` here is a sentence Marcus can check against the sheet in
   * his hand. The `18` assertions are the ones that matter: each of these
   * strings was, until this slice, telling him a number about his own character
   * that was simply false. */
  const SLICE_6: Array<[string, string]> = [
    ['Command', 'At level 7 with Charisma 16 your DC is 14'],
    ['Dispel Magic', 'at Charisma 16 you have +3'],
    ['Heroism', 'At Charisma 16 that is 3 temp HP'],
    ['Resistance', '+3 at Charisma 16, permanently'],
    ['Scorching Ray', 'At level 7 with Charisma 16 that is +6.'],
    ['Aura of Purity', 'At Charisma 16 that is Advantage plus +3'],
  ]

  it.each(SLICE_6)('%s reads his sheet, not the author\'s', (name, expected) => {
    const body = advice(name, NIX7)
    expect(body).toContain(expected)
    expect(body).not.toContain('Charisma 18')
    expect(body).not.toContain('{')
  })

  /* NOTHING MAY PASS BY STANDING STILL (finding BG). At level 9 his proficiency
   * bonus is +4, so the save DC becomes 15 and the spell attack +7. A test that
   * only ever ran at level 7 could not tell a substitution from a constant. */
  it('and moves with him — the same strings at level 9', () => {
    const nine = sheet({ level: 9 })
    expect(advice('Command', nine)).toContain('At level 9 with Charisma 16 your DC is 15')
    expect(advice('Scorching Ray', nine)).toContain('At level 9 with Charisma 16 that is +7.')
  })

  /* THE STALE CONSEQUENCES ARE GONE, NOT RECOMPUTED. Three sentences carried
   * arithmetic DOWNSTREAM of a placeholder — 40 = 4 temp HP × 10 rounds, 50%% =
   * a +4 check against DC 15, 85%%/45%% = Advantage plus +4. The vocabulary
   * cannot do arithmetic and must not learn to, so the numbers were removed and
   * the claim they supported was kept in words. */
  const REMOVED_CONSEQUENCES = ['40 points', '50%% of the time', '85%%', '45%%', 'up to 40']
  it('carries no stale consequence of a number that has changed', () => {
    for (const stale of REMOVED_CONSEQUENCES) {
      for (const { where, text } of everyAdviceString()) {
        if (where === 'spells.Circle of Power.tactics') continue
        expect(text.includes(stale), `${where} still says "${stale}"`).toBe(false)
      }
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
