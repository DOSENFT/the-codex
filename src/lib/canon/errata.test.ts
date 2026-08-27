/* Slice 8. The errata layer.
 *
 * Two kinds of test here, and the mix is deliberate:
 *
 *   · SHAPE tests, against hand-built fixtures, which pin the rules — what gets
 *     dropped, what order things come in, which source wins a level.
 *   · CORPUS tests, against the real twelve, which pin the FACTS this slice was
 *     scoped on. Finding AA came from measuring the corpus; if the corpus moves
 *     under the scope, these go red and the scope gets revisited rather than
 *     silently invalidated. That is the point of asserting a number I could
 *     have just written in a comment.
 */
import { describe, it, expect } from 'vitest'
import {
  erratumBlocks,
  erratumFeatureName,
  erratumCanonLevel,
  scopeErrata,
  liveErrata,
  laterErrata,
} from './errata'
import { OATH } from '../../canon'
import type { CanonErratum } from './types'

const base = (over: Partial<CanonErratum> = {}): CanonErratum => ({
  id: 'HEARTH-99',
  severity: 'MEDIUM',
  feature: 'Test Feature (level 3)',
  problem: 'the fault',
  recommendedFix: 'the fix',
  appAction: 'what the app does',
  ...over,
})

describe('erratumBlocks — the shape every erratum renders in', () => {
  it('always yields the three blocks every record carries, in reading order', () => {
    const blocks = erratumBlocks(base())
    expect(blocks.map(b => b.kind)).toEqual(['problem', 'recommendedFix', 'appAction'])
  })

  it('drops absent fields rather than painting an empty headed block', () => {
    /* The whole reason this function exists. A component reading
       `e.narrowerAlternative` directly would render a heading over `undefined`
       on eleven of the twelve. */
    const blocks = erratumBlocks(base())
    expect(blocks.some(b => b.kind === 'narrowerAlternative')).toBe(false)
    expect(blocks.every(b => b.text.length > 0)).toBe(true)
  })

  it('treats a whitespace-only field as absent', () => {
    // Canon is hand-authored JSON; " " is a thing a human types.
    const blocks = erratumBlocks(base({ cause: '   ' }))
    expect(blocks.some(b => b.kind === 'cause')).toBe(false)
  })

  it('puts the narrower fix beside the recommended one, not after the app note', () => {
    /* Order is a claim about how it READS: both are fixes, so they belong
       together, and "what the app does" is the conclusion that follows both. */
    const kinds = erratumBlocks(base({ narrowerAlternative: 'a smaller fix' })).map(b => b.kind)
    expect(kinds).toEqual(['problem', 'recommendedFix', 'narrowerAlternative', 'appAction'])
  })

  it('gives every block a plain-English label, never the field name', () => {
    const blocks = erratumBlocks(base({ mitigatingFactor: 'it is rare' }))
    const mit = blocks.find(b => b.kind === 'mitigatingFactor')
    expect(mit?.label).toBe('What makes it less bad')
    expect(blocks.every(b => !/[a-z][A-Z]/.test(b.label))).toBe(true)
  })
})

describe('erratumFeatureName — canon writes the field three ways', () => {
  it('cuts at the parenthesis', () => {
    expect(erratumFeatureName(base({ feature: 'Smoldering Smite (level 15)' })))
      .toBe('Smoldering Smite')
  })

  it('drops a trailing sub-part, which only the level-20 records carry', () => {
    expect(erratumFeatureName(base({ feature: 'Hearth Warden (level 20) - Punishing Flame' })))
      .toBe('Hearth Warden')
  })

  it('leaves a bare name alone', () => {
    expect(erratumFeatureName(base({ feature: 'Oath Spells' }))).toBe('Oath Spells')
  })
})

describe('erratumCanonLevel', () => {
  it('reads the parenthetical', () => {
    expect(erratumCanonLevel(base({ feature: 'Aura of Solace (level 7)' }))).toBe(7)
  })

  it('returns null rather than 0 when canon wrote no level', () => {
    // 0 would be a level, and `0 <= characterLevel` is always true.
    expect(erratumCanonLevel(base({ feature: 'Oath Spells' }))).toBeNull()
  })
})

describe('scopeErrata — which errata bite today', () => {
  const sheet = [
    { name: 'Hearthfire Manifest', level: 3 },
    { name: 'Smoldering Smite', level: 15 },
  ]

  it('asks the sheet first', () => {
    const [s] = scopeErrata(sheet, 8, [base({ feature: 'Smoldering Smite (level 15)' })])
    expect(s.levelSource).toBe('sheet')
    expect(s.live).toBe(false)
  })

  it('lets the sheet OVERRIDE canon, which is the case that matters', () => {
    /* If Marcus's DM granted a feature early, the sheet says so and the app
       must agree with the sheet. Canon's "(level 15)" is the general rule; the
       sheet is this character. A test that used a feature where the two agree
       would pass either way and prove nothing. */
    const early = [{ name: 'Smoldering Smite', level: 5 }]
    const [s] = scopeErrata(early, 8, [base({ feature: 'Smoldering Smite (level 15)' })])
    expect(s.levelSource).toBe('sheet')
    expect(s.featureLevel).toBe(5)
    expect(s.live).toBe(true)
  })

  it('falls back to canon when the sheet has no such row', () => {
    // "Oath Spells" is a category, not a feature. HEARTH-08 would be homeless.
    const [s] = scopeErrata(sheet, 8, [base({ feature: 'Oath Spells (level 5)' })])
    expect(s.levelSource).toBe('canon')
    expect(s.live).toBe(true)
  })

  it('shows the erratum when NEITHER source knows a level', () => {
    /* The asymmetry, pinned. Hiding a rules problem for want of data is the
       failure this phase exists to kill. */
    const [s] = scopeErrata([], 1, [base({ feature: 'Something Unmatched' })])
    expect(s.levelSource).toBe('unknown')
    expect(s.live).toBe(true)
  })

  it('matches the sheet case- and space-insensitively', () => {
    const messy = [{ name: '  hearthfire   MANIFEST ', level: 3 }]
    const [s] = scopeErrata(messy, 8, [base({ feature: 'Hearthfire Manifest (level 3)' })])
    expect(s.levelSource).toBe('sheet')
  })

  it('is live exactly at the level the feature is gained, not one after', () => {
    const [at] = scopeErrata([], 7, [base({ feature: 'Aura of Solace (level 7)' })])
    const [before] = scopeErrata([], 6, [base({ feature: 'Aura of Solace (level 7)' })])
    expect(at.live).toBe(true)
    expect(before.live).toBe(false)
  })
})

describe('ordering', () => {
  const errata = [
    base({ id: 'HEARTH-B', severity: 'LOW', feature: 'F (level 1)' }),
    base({ id: 'HEARTH-A', severity: 'BREAKING', feature: 'F (level 1)' }),
    base({ id: 'HEARTH-C', severity: 'LOW', feature: 'F (level 1)' }),
  ]

  it('sorts live errata worst-first, then by id so the order is stable', () => {
    expect(liveErrata([], 5, errata).map(s => s.erratum.id))
      .toEqual(['HEARTH-A', 'HEARTH-B', 'HEARTH-C'])
  })

  it('sorts later errata soonest-first — the list answers "what do I get next"', () => {
    const future = [
      base({ id: 'HEARTH-20', feature: 'Late (level 20)' }),
      base({ id: 'HEARTH-15', feature: 'Mid (level 15)' }),
    ]
    expect(laterErrata([], 8, future).map(s => s.featureLevel)).toEqual([15, 20])
  })
})

describe('the real corpus — the facts slice 8 was scoped on', () => {
  const NIX_FEATURES = [
    { name: 'Lay on Hands', level: 1 },
    { name: 'Divine Sense', level: 1 },
    { name: 'Channel Divinity: Sacred Weapon', level: 3 },
    { name: 'Hearthfire Manifest', level: 3 },
    { name: 'Flaming Cloak', level: 3 },
    { name: 'Aura of Protection', level: 6 },
    { name: 'Aura of Solace', level: 7 },
    { name: 'Smoldering Smite', level: 15 },
    { name: 'Hearth Warden', level: 20 },
  ]

  it('still holds exactly twelve errata', () => {
    expect(OATH.errata).toHaveLength(12)
  })

  it('every one of the twelve states the fault and what the app does', () => {
    /* The two real universals, and the pair the band's layout depends on. The
       re-scope sentence originally claimed THREE — this test caught that on its
       first run (HEARTH-11 has no `recommendedFix`) and the scope was corrected
       to match the corpus rather than the corpus assumed to match the scope. */
    for (const e of OATH.errata) {
      const kinds = erratumBlocks(e).map(b => b.kind)
      expect(kinds, e.id).toContain('problem')
      expect(kinds, e.id).toContain('appAction')
    }
  })

  it('has a recommended fix on 11 of 12, and the exception is not a data gap', () => {
    /* HEARTH-11 carries no `recommendedFix` because canon judged Swift Flame
       "strong but defensible" — there is nothing it wants changed. It supplies
       `mitigatingFactor` and `assessment` instead, which is canon SAYING SO
       rather than falling silent. The band must therefore never assume a fix
       block exists, and this test is what stops someone re-introducing that
       assumption. */
    const withFix = OATH.errata.filter(e =>
      erratumBlocks(e).some(b => b.kind === 'recommendedFix'))
    expect(withFix).toHaveLength(11)

    const h11 = OATH.errata.find(e => e.id === 'HEARTH-11')!
    const kinds = erratumBlocks(h11).map(b => b.kind)
    expect(kinds).not.toContain('recommendedFix')
    expect(kinds).toContain('mitigatingFactor')
    expect(kinds).toContain('assessment')
  })

  it('still has exactly ONE narrower alternative — finding AA, pinned', () => {
    /* Gate 1 promised three readings. Eleven records cannot supply one. If
       canon is ever revised to add them, this goes red and the promise becomes
       keepable again — which is a decision for Marcus, not a silent upgrade. */
    const withNarrower = OATH.errata.filter(e => erratumBlocks(e)
      .some(b => b.kind === 'narrowerAlternative'))
    expect(withNarrower.map(e => e.id)).toEqual(['HEARTH-01'])
  })

  it('splits 6 live / 6 later for Nix at level 8', () => {
    const live = liveErrata(NIX_FEATURES, 8)
    const later = laterErrata(NIX_FEATURES, 8)
    expect(live).toHaveLength(6)
    expect(later).toHaveLength(6)
    expect(live.map(s => s.erratum.id).sort())
      .toEqual(['HEARTH-03', 'HEARTH-04', 'HEARTH-05', 'HEARTH-06', 'HEARTH-07', 'HEARTH-08'])
  })

  it('puts every level-15 and level-20 erratum in "later" at level 8', () => {
    const later = laterErrata(NIX_FEATURES, 8)
    expect(later.every(s => (s.featureLevel ?? 0) > 8)).toBe(true)
  })

  it('routes HEARTH-08 through canon, because "Oath Spells" is on no sheet row', () => {
    /* The routing gap found before building, not after — the finding-AB lesson.
       If this ever reports 'sheet', someone has added an "Oath Spells" feature
       row and the fallback is no longer carrying this erratum. */
    const s = scopeErrata(NIX_FEATURES, 8).find(x => x.erratum.id === 'HEARTH-08')
    expect(s?.levelSource).toBe('canon')
    expect(s?.live).toBe(true)
  })

  it('gives Nix all four Hearthfire Manifest errata as live', () => {
    const live = liveErrata(NIX_FEATURES, 8)
      .filter(s => erratumFeatureName(s.erratum) === 'Hearthfire Manifest')
    expect(live).toHaveLength(4)
  })

  it('leads with the worst live erratum, and at level 8 that is a HIGH', () => {
    /* There is no live BREAKING one: all three BREAKING records are Smoldering
       Smite at level 15. Worth pinning, because "show only BREAKING" was a real
       option at the re-scope and it would have shown Marcus nothing he owns. */
    const live = liveErrata(NIX_FEATURES, 8)
    expect(live[0].erratum.severity).toBe('HIGH')
    expect(live.some(s => s.erratum.severity === 'BREAKING')).toBe(false)
  })
})
