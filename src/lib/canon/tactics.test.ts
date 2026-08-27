import { describe, expect, it } from 'vitest'
import { SPELLS } from '../../canon'
import { rejoinTactics, splitTactics } from './tactics'

/* ============================================================================
   THE SPLITTER THAT IS NOT ALLOWED TO BE A TRUNCATOR — Table Truth slice 7.

   This whole phase exists because text was being cut and the cut was hidden
   behind a "…". A function that breaks a 2,000-character paragraph into
   headings is the same hazard wearing better clothes: if its regex misses the
   tail, the tail is simply gone and the screen still looks correct.

   So test 1 is not a spot check. It rejoins every bullet from every one of the
   71 records and requires the result to equal the input character for
   character, whitespace aside. If a future edit to the heading pattern drops a
   sentence anywhere in the corpus, this fails.
   ========================================================================= */

const squash = (s: string) => s.replace(/\s+/g, '')

describe('splitTactics — the no-loss invariant', () => {
  it('LOSES NOTHING across all 71 canon spells', () => {
    const damaged: string[] = []
    for (const spell of SPELLS) {
      const rejoined = rejoinTactics(splitTactics(spell.tactics))
      if (squash(rejoined) !== squash(spell.tactics)) damaged.push(spell.name)
    }
    expect(damaged, 'these records lost or gained characters').toEqual([])
  })

  it('INVENTS NOTHING — every bullet is a substring of the original', () => {
    for (const spell of SPELLS) {
      const flat = squash(spell.tactics)
      for (const bullet of splitTactics(spell.tactics)) {
        if (bullet.lead) expect(flat).toContain(squash(bullet.lead))
        expect(flat).toContain(squash(bullet.body))
      }
    }
  })

  it('never emits an ellipsis, in any record', () => {
    for (const spell of SPELLS) {
      for (const bullet of splitTactics(spell.tactics)) {
        expect(bullet.body).not.toContain('…')
        expect(bullet.body).not.toMatch(/\.\.\.$/)
      }
    }
  })
})

describe('splitTactics — reading the structure canon already wrote', () => {
  it("finds Divine Smite's eight headings, in canon's own words", () => {
    const smite = SPELLS.find(s => s.id === 'divine-smite')!
    const leads = splitTactics(smite.tactics)
      .map(b => b.lead)
      .filter((l): l is string => l !== null)

    expect(leads).toContain('THE MOST IMPORTANT RULE IN YOUR ENTIRE KIT, AND THE ONE APPS GET WRONG')
    expect(leads).toContain('SMITE AFTER YOU SEE THE ROLL')
    expect(leads).toContain('CRITICAL HITS DOUBLE THE SMITE DICE')
    expect(leads.length).toBe(8)
  })

  it('keeps the mark canon used — a colon stays a colon, a dash stays a dash', () => {
    /* Canon writes both "HEADING: text" and "HEADING — text". Printing a colon
       back in place of a dash would be the app editing punctuation to suit its
       own template; it is a small lie, and small lies are how "…" got here. */
    const smite = SPELLS.find(s => s.id === 'divine-smite')!
    const withLead = splitTactics(smite.tactics).filter(b => b.lead)
    expect(withLead.every(b => /^[:—]/.test(b.body))).toBe(true)
  })

  it('keeps the opening paragraph as its own lead-less bullet', () => {
    const flame = SPELLS.find(s => s.id === 'sacred-flame')!
    const bullets = splitTactics(flame.tactics)
    expect(bullets[0].lead).toBeNull()
    expect(bullets[0].body.startsWith('The standard ranged answer')).toBe(true)
  })

  it('does not split on a shouted single word — "RAW" is not a heading', () => {
    const text = 'Thrown weapons are a genuine RAW: dispute. Ask your DM.'
    expect(splitTactics(text)).toEqual([{ lead: null, body: text }])
  })

  it('does not split mid-sentence — a heading must start a sentence', () => {
    const text = 'This spell is good because IT IGNORES COVER: which matters.'
    const bullets = splitTactics(text)
    /* The all-caps run is real, but it is not at a sentence boundary, so it is
       emphasis inside a thought rather than a new one. Splitting there would
       leave "This spell is good because" standing alone as a bullet. */
    expect(bullets).toEqual([{ lead: null, body: text }])
  })

  it('a record with no headings at all is one bullet, not zero', () => {
    /* Mending is the one record of 71 that uses no headings. It is four
       sentences long. An empty band would read as "canon has nothing", which
       is false — the open-world rule cuts both ways. */
    const mending = SPELLS.find(s => s.name === 'Mending')!
    const bullets = splitTactics(mending.tactics)
    expect(bullets.length).toBe(1)
    expect(bullets[0].lead).toBeNull()
    expect(squash(bullets[0].body)).toBe(squash(mending.tactics))
  })

  it('reads a SINGLE-word heading — Bless has four bands, not one wall', () => {
    /* REGRESSION PIN. The first version of isHeading demanded two capitalised
       words, so every one-word heading in canon was ignored: VERDICT,
       POSITIONING, STACKING, RISK, WEAKNESS, PRACTICAL, SCALING, TIMING,
       PETRIFIED, CONCENTRATION. Bless and Command lost four headings each.

       Note what kind of bug this was. Nothing was deleted — the no-loss test
       above passed throughout — so the rendered text was complete and merely
       shapeless. No assertion about text could have caught it. Counting the
       output against the corpus did. */
    const bless = SPELLS.find(s => s.name === 'Bless')!
    expect(splitTactics(bless.tactics).map(b => b.lead)).toEqual([
      null,
      'POSITIONING',
      'STACKING',
      'RISK',
    ])
  })

  it('does not promote inline emphasis — Command keeps HALT in its sentence', () => {
    /* Command shouts HALT, DROP, GROVEL and FLEE, but each is followed by prose
       rather than ':' or '—'. They are emphasis inside a thought. Promoting them
       would invent four empty sections. Only POSITIONING and WEAKNESS carry the
       mark, so only they are headings. */
    const command = SPELLS.find(s => s.name === 'Command')!
    const bullets = splitTactics(command.tactics)
    expect(bullets.map(b => b.lead)).toEqual([null, 'POSITIONING', 'WEAKNESS'])
    expect(bullets.some(b => b.body.includes('HALT on the enemy'))).toBe(true)
  })

  it('every lead in the corpus is shaped like a heading, not like prose', () => {
    /* The counterweight to relaxing the guard. If a future edit to the pattern
       starts admitting sentence fragments, this fails on the whole corpus at
       once rather than on whichever record someone happened to spot-check. */
    const wrong: string[] = []
    for (const spell of SPELLS)
      for (const bullet of splitTactics(spell.tactics))
        if (bullet.lead && !/^[A-Z][A-Z0-9'’+\-/(),& ]*[A-Z0-9)]$/.test(bullet.lead))
          wrong.push(`${spell.name}: ${bullet.lead}`)
    expect(wrong, 'these leads contain something that is not a heading').toEqual([])
  })

  it('70 of the 71 records split into more than one bullet', () => {
    /* Stated as a measured number rather than "most", so that a regression in
       the heading pattern shows up as a number moving instead of a vibe. This
       number caught the single-word-heading bug: it read 68. */
    const split = SPELLS.filter(s => splitTactics(s.tactics).length > 1)
    expect(split.length).toBe(70)
    expect(SPELLS.filter(s => splitTactics(s.tactics).length === 1)).toHaveLength(1)
  })

  it('empty input is an empty band, not a bullet containing nothing', () => {
    expect(splitTactics('')).toEqual([])
    expect(splitTactics('   ')).toEqual([])
  })
})
