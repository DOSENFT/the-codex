import { describe, it, expect } from 'vitest'
import { SPELLS, OATH, CLASS_FEATURES, CHANNEL_DIVINITY_OPTIONS } from '../../canon'
import {
  normalizeName,
  spellByName,
  featureByName,
  isUnlocked,
  errataForFeature,
  erratumById,
  knowsName,
  CANON_COUNTS,
} from './lookup'

/* ============================================================================
   TESTS 1-4 of docs/plans/table-truth/03-program-design.md.

   These guard the two ways a lookup layer goes wrong quietly: it matches the
   wrong record (a name collision), or it bakes a moment in time into the code
   (a level-7 boolean). Neither failure announces itself at a table.
   ========================================================================= */

describe('normalizeName', () => {
  it('1 — folds case, spacing and punctuation onto one key', () => {
    const key = normalizeName('Faerie Fire')
    expect(normalizeName('faerie fire')).toBe(key)
    expect(normalizeName('Faerie  Fire!')).toBe(key)
    expect(normalizeName('Faerie-Fire')).toBe(key)
    expect(normalizeName('  FAERIE FIRE  ')).toBe(key)
  })

  it('1b — does NOT fuzzy-match near-misses', () => {
    // Guessing which spell someone meant is how an app shows the wrong dice.
    expect(normalizeName('Searing Smite')).not.toBe(normalizeName('Seering Smite'))
  })
})

describe('the canon indexes', () => {
  it('2 — every canon spell has a unique normalised name (no silent collisions)', () => {
    const seen = new Map<string, string>()
    const collisions: string[] = []
    for (const spell of SPELLS) {
      const key = normalizeName(spell.name)
      const prior = seen.get(key)
      if (prior) collisions.push(`${prior} ⟷ ${spell.name}`)
      else seen.set(key, spell.name)
    }
    expect(collisions).toEqual([])
  })

  it('2b — every spell is reachable by its own name', () => {
    for (const spell of SPELLS) {
      expect(spellByName(spell.name)?.id).toBe(spell.id)
    }
  })

  it('2c — a name canon does not have returns undefined, not a guess', () => {
    expect(spellByName('Hearthbrand Oathstrike')).toBeUndefined()
    expect(knowsName('Hearthbrand Oathstrike')).toBe(false)
  })

  it('2d — the corpus counts are what the match report will claim', () => {
    expect(CANON_COUNTS.spells).toBe(SPELLS.length)
    expect(CANON_COUNTS.spells).toBeGreaterThan(0)
    expect(CANON_COUNTS.errata).toBe(OATH.errata.length)
  })
})

describe('isUnlocked — the rule, recomputed', () => {
  it('3 — a level-2 spell is unlocked at 8, a higher-tier one is not', () => {
    const divineSmite = spellByName('Divine Smite')
    expect(divineSmite).toBeDefined()
    expect(isUnlocked(divineSmite!, 8)).toBe(true)

    const late = SPELLS.find(s => s.unlocksAtPaladinLevel === 9)
    expect(late, 'canon should carry at least one level-9 unlock').toBeDefined()
    expect(isUnlocked(late!, 8)).toBe(false)
    expect(isUnlocked(late!, 9)).toBe(true)
  })

  it('3b — the boundary is inclusive at the unlock level itself', () => {
    for (const spell of SPELLS) {
      expect(isUnlocked(spell, spell.unlocksAtPaladinLevel)).toBe(true)
      expect(isUnlocked(spell, spell.unlocksAtPaladinLevel - 1)).toBe(false)
    }
  })
})

describe('the level-7 trap', () => {
  /* Canon ships `castableAtLevel7` and `lockedForMarcus`: the unlock rule,
     already answered, for a character who is level 7 TODAY. The app's own
     fixtures say level 8 and his stored sheet carries level-9 spell slots.
     Three numbers, one of them wrong. Reading a frozen boolean would make the
     app right by accident and wrong the moment he levels — so this test greps
     the tree rather than trusting a future session to remember. */
  it('4 — castableAtLevel7 / lockedForMarcus appear nowhere in src/ but types.ts', () => {
    // Vite's own loader rather than node:fs, so this test needs no @types/node
    // and runs identically wherever vitest does.
    const tree = import.meta.glob('../../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>

    // Sanity: a glob that silently matches nothing would make this test a
    // no-op, which is the exact failure mode it exists to prevent.
    expect(Object.keys(tree).length).toBeGreaterThan(20)

    // Glob keys are relative to THIS file, so canon's own types.ts is exactly
    // './types.ts' — src/lib/turn/types.ts is '../turn/types.ts' and stays in
    // scope, which is what we want.
    const offenders = Object.entries(tree)
      .filter(([path]) => path !== './types.ts' && !path.endsWith('lookup.test.ts'))
      .filter(([, source]) => {
        // Comments are stripped first: the ban is on READING the frozen
        // booleans, not on explaining why we don't. lookup.ts documents the
        // trap at length and must be allowed to keep doing so.
        const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
        return /castableAtLevel7|lockedForMarcus/.test(code)
      })
      .map(([path]) => path)

    expect(
      offenders,
      `frozen level-7 booleans read outside types.ts:\n${offenders.join('\n')}`
    ).toEqual([])
  })
})

describe('errata lookup', () => {
  it('matches on the feature name, ignoring canon\'s "(level N)" parenthetical', () => {
    const first = OATH.errata[0]
    expect(first).toBeDefined()
    const featureName = first.feature.replace(/\s*\(.*$/, '')
    const found = errataForFeature(featureName)
    expect(found.length).toBeGreaterThan(0)
    expect(found.some(e => e.id === first.id)).toBe(true)
  })

  it('erratumById round-trips every canon erratum', () => {
    for (const e of OATH.errata) {
      expect(erratumById(e.id)?.feature).toBe(e.feature)
    }
  })

  it('an unknown feature gets an empty list, never a throw', () => {
    expect(errataForFeature('Nothing By This Name')).toEqual([])
    expect(erratumById('HEARTH-999')).toBeUndefined()
  })
})

describe('featureByName', () => {
  it('finds the oath features canon actually ships', () => {
    for (const feature of OATH.features) {
      expect(featureByName(feature.name)?.level).toBe(feature.level)
    }
  })

  /* Regression: slice 1's match report ran against the real app and listed
     "Lay on Hands", "Divine Sense" and "Aura of Protection" as things canon had
     no entry for. Canon had all three — in paladin-progression.json, which
     nothing was reading. Base class features and subclass features live in two
     different files with two different shapes for the same idea. */
  it('also finds BASE class features, which live in a different canon file', () => {
    for (const name of ['Lay on Hands', 'Divine Sense', 'Aura of Protection', 'Extra Attack']) {
      const found = featureByName(name)
      expect(found, `canon should know the base Paladin feature "${name}"`).toBeDefined()
      expect(found!.rawText.length).toBeGreaterThan(0)
    }
  })

  it("matches canon's own casing variants — canon writes \"Lay On Hands\"", () => {
    expect(featureByName('Lay on Hands')?.name).toBe(featureByName('LAY ON HANDS')?.name)
  })

  it('counts what the INDEX can answer for, not what one file contains', () => {
    expect(CANON_COUNTS.features).toBeGreaterThan(OATH.features.length)
  })
})

/* ============================================================================
   SLICE 6 — Finding D, closed.

   Canon files the cloak's full text, and four of the twelve errata, under
   "Hearthfire Manifest". Nix's sheet calls it "Flaming Cloak". These tests are
   the bridge, and — just as importantly — the fence around it.
   ========================================================================= */

describe('the Channel Divinity option parser', () => {
  it("reads canon's menu into parent / alias / source, and keeps the original", () => {
    expect(CHANNEL_DIVINITY_OPTIONS.length).toBeGreaterThan(0)
    for (const option of CHANNEL_DIVINITY_OPTIONS) {
      expect(option.parent.length).toBeGreaterThan(0)
      // The raw string is kept verbatim so a parse that goes wrong is
      // diagnosable against canon rather than against a guess.
      expect(option.raw).toContain(option.parent)
      if (option.alias !== null) expect(option.alias.length).toBeGreaterThan(0)
    }
  })

  it('files the cloak under the feature that grants it', () => {
    const cloak = CHANNEL_DIVINITY_OPTIONS.find(o => o.alias && /cloak/i.test(o.alias))
    expect(cloak, "canon's Channel Divinity menu should name the cloak").toBeDefined()
    expect(cloak!.parent).toBe('Hearthfire Manifest')
    expect(cloak!.source).toBe('Oath of the Hearth')
  })

  it('every parsed parent resolves to a real feature record', () => {
    // An alias pointing at nothing is worse than no alias: it turns a clean
    // miss into an undefined every caller then has to defend against.
    for (const option of CHANNEL_DIVINITY_OPTIONS) {
      expect(featureByName(option.parent), `unresolvable parent: ${option.raw}`).toBeDefined()
    }
  })
})

describe('featureByName — the sheet\'s names reach canon\'s records', () => {
  it("Finding D: 'Flaming Cloak' now reaches Hearthfire Manifest", () => {
    const found = featureByName('Flaming Cloak')
    expect(found?.name).toBe('Hearthfire Manifest')
    // The point of the bridge is the TEXT on the far side of it.
    expect(found!.rawText.length).toBeGreaterThan(100)
    expect(featureByName('flaming cloak')?.name).toBe('Hearthfire Manifest')
  })

  it('an alias reaches the same record object the real name does', () => {
    expect(featureByName('Flaming Cloak')).toBe(featureByName('Hearthfire Manifest'))
  })

  it('four errata ride along with the record the alias reaches', () => {
    const found = featureByName('Flaming Cloak')!
    expect(errataForFeature(found.name).length).toBeGreaterThan(0)
  })

  it('AN ALIAS NEVER SHADOWS A REAL NAME', () => {
    // Every real feature name still answers with its own record, alias layer or
    // not. If a future canon package names a feature after an existing alias,
    // the feature wins and the nickname goes quiet.
    for (const feature of [...OATH.features, ...CLASS_FEATURES]) {
      const found = featureByName(feature.name)
      expect(found, `real name stopped resolving: ${feature.name}`).toBeDefined()
      expect(found!.name).toBe(featureByName(feature.name)!.name)
    }
    for (const option of CHANNEL_DIVINITY_OPTIONS) {
      if (!option.alias) continue
      const shadowed = [...OATH.features, ...CLASS_FEATURES].find(
        f => normalizeName(f.name) === normalizeName(option.alias!)
      )
      if (shadowed) expect(featureByName(option.alias!)!.name).toBe(shadowed.name)
    }
  })

  it("a menu-path name reaches the option, never the menu's own text", () => {
    expect(featureByName('Channel Divinity: Flaming Cloak')?.name).toBe('Hearthfire Manifest')
    expect(featureByName('Channel Divinity — Flaming Cloak')?.name).toBe('Hearthfire Manifest')
    // and NOT: falling back to Channel Divinity itself, which would answer
    // every unknown pick with a menu listing and read as coverage.
    expect(featureByName('Channel Divinity: Nothing By This Name')).toBeUndefined()
  })

  it('MISSES ARE STILL MISSES — Sacred Weapon is a 2014 leftover on the sheet', () => {
    /* Nix's sheet carries a resource literally named "Channel Divinity: Sacred
       Weapon". Canon's 2024 menu does not offer it. Widening the lookup must
       not invent it: a miss here is the open-world rule working, and the caller
       keeps the sheet's own words with provenance 'sheet'. */
    expect(featureByName('Sacred Weapon')).toBeUndefined()
    expect(featureByName('Channel Divinity: Sacred Weapon')).toBeUndefined()
    expect(knowsName('Sacred Weapon')).toBe(false)
  })

  it('the alias count is reported, not folded into the feature count', () => {
    expect(CANON_COUNTS.featureAliases).toBeGreaterThan(0)
    // `features` must still be the number of RECORDS canon ships, not the
    // number of ways in — otherwise the match report would claim the alias
    // layer added text, and it added none.
    const realNames = new Set(
      [...OATH.features, ...CLASS_FEATURES].map(f => normalizeName(f.name))
    )
    expect(CANON_COUNTS.features).toBe(realNames.size)
  })
})
