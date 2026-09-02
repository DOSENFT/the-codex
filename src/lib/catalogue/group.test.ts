import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  groupCatalogue,
  GROUP_MODES,
  DEFAULT_GROUP_MODE,
  type GroupMode,
} from './group'
import { buildCatalogue } from './build'
import type { CatalogueEntry } from './types'
import type { Character } from '../character'

/* ===========================================================================
   THE FOUR VIEWS — Open Book slice 4.

   Marcus, at Gate 1, declined all four proposed organising principles and said:
   "Multiple organization options, like a filter." These tests hold the app to
   the half of that sentence he did not have to say — that switching the view
   never costs him a row.

   THE CENTRAL CLAIM IS A CONSERVATION LAW, and it is asserted per-mode over his
   real 84 rather than on a fixture: whatever `groupCatalogue` returns, flattened,
   is exactly what went in. Not "the same length" — the same KEYS. A mode that
   dropped one entry and duplicated another would pass a length check.
   ========================================================================= */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

function nixOrNull(): Character | null {
  try {
    return JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    return null
  }
}

const nix = nixOrNull()
const catalogue = nix ? buildCatalogue(nix) : []
const ALL_MODES: GroupMode[] = ['turn', 'source', 'level', 'ready']

const flatten = (mode: GroupMode, entries: readonly CatalogueEntry[] = catalogue) =>
  groupCatalogue(entries, mode).flatMap(g => g.entries)

describe.skipIf(!nix)('groupCatalogue — grouping never loses an entry', () => {
  it('every mode returns every one of the 84, by key, not by count', () => {
    const went_in = catalogue.map(e => e.key).sort()
    expect(went_in.length, 'the fixture is his real 84').toBe(84)

    for (const mode of ALL_MODES) {
      const came_out = flatten(mode).map(e => e.key).sort()
      expect(came_out, `mode '${mode}' changed the set`).toEqual(went_in)
    }
  })

  it('and no entry is in two groups at once', () => {
    for (const mode of ALL_MODES) {
      const out = flatten(mode).map(e => e.key)
      expect(new Set(out).size, `mode '${mode}' duplicated an entry`).toBe(out.length)
    }
  })

  it('all 38 locked entries survive every mode — locked is not hidden', () => {
    /* Marcus: the locked ones should be "locked from being prepared, and
     * visually locked, but still provide me the ability to see them". A
     * grouping that quietly tidied them away would undo slice 3 from above. */
    const locked = catalogue.filter(e => e.lockedUntil !== null).map(e => e.key).sort()
    expect(locked.length).toBe(38)
    for (const mode of ALL_MODES) {
      const out = flatten(mode).filter(e => e.lockedUntil !== null).map(e => e.key).sort()
      expect(out, `mode '${mode}' lost a locked entry`).toEqual(locked)
    }
  })

  it('no group is empty — a heading always has something under it', () => {
    for (const mode of ALL_MODES) {
      for (const group of groupCatalogue(catalogue, mode)) {
        expect(group.entries.length, `${mode} · '${group.label}' is an empty heading`)
          .toBeGreaterThan(0)
      }
    }
  })

  it('group ids are unique within a mode, so React keys cannot collide', () => {
    for (const mode of ALL_MODES) {
      const ids = groupCatalogue(catalogue, mode).map(g => g.id)
      expect(new Set(ids).size, `mode '${mode}' emitted a duplicate group id`).toBe(ids.length)
    }
  })
})

describe('groupCatalogue — the open world', () => {
  /** Deliberately hand-built. The point below is a value canon does not
   *  contain, and a fixture derived from canon could never express it. */
  function entryOf(over: Partial<CatalogueEntry> = {}): CatalogueEntry {
    return {
      key: 'x', name: 'X', kind: 'spell', provenance: 'canon',
      lockedUntil: null, spellLevel: 1, turnCost: 'action', origin: 'Paladin',
      prepared: false, alwaysPrepared: false, preparable: true, onSheet: false,
      sheetText: null, canonSpell: null, canonFeature: null, canonFeat: null,
      ...over,
    }
  }

  it('AN ORIGIN NOBODY HAS WRITTEN YET GETS ITS OWN GROUP', () => {
    /* THE MICRO-REVERT FOR THIS SLICE. Give `source` mode a list of permitted
     * origins — or make it skip what it does not rank — and this goes red.
     *
     * Marcus is a Changeling, and slice 6 adds Fighting Style; both arrive as
     * origin strings this file has never seen. So does anything he writes
     * himself. The mode must not have opinions about which sources exist. */
    const groups = groupCatalogue(
      [
        entryOf({ key: 'a', origin: 'Paladin' }),
        entryOf({ key: 'b', origin: 'Whispers of the Unbuilt Hearth' }),
      ],
      'source',
    )
    const invented = groups.find(g => g.label === 'Whispers of the Unbuilt Hearth')
    expect(invented, 'the unknown origin got no group at all').toBeDefined()
    expect(invented!.entries.map(e => e.key)).toEqual(['b'])
    // And it sorts AFTER what the module knows, rather than jumbling in.
    expect(groups.map(g => g.label)).toEqual(['Paladin', 'Whispers of the Unbuilt Hearth'])
  })

  it('a turn cost from a future canon revision is grouped, not swallowed', () => {
    // `turnCost` is typed, but it arrives from JSON and the type stops there.
    const groups = groupCatalogue(
      [entryOf({ key: 'a' }), entryOf({ key: 'b', turnCost: 'ritual' as never })],
      'turn',
    )
    expect(groups.flatMap(g => g.entries).map(e => e.key).sort()).toEqual(['a', 'b'])
    expect(groups.map(g => g.label)).toEqual(['Action', 'ritual'])
  })

  it('an empty origin string still lands somewhere named', () => {
    const groups = groupCatalogue([entryOf({ origin: '' })], 'source')
    expect(groups).toHaveLength(1)
    expect(groups[0]!.label).toBe('Unattributed')
    expect(groups[0]!.id).not.toBe('src-')
  })

  it('two unknown groups keep a stable order between calls', () => {
    // Same rank, so the tiebreak decides — and it has to be deterministic or
    // the list reshuffles under him on every render.
    const entries = [
      entryOf({ key: 'a', origin: 'Zephyr Pact' }),
      entryOf({ key: 'b', origin: 'Ashen Covenant' }),
    ]
    const once = groupCatalogue(entries, 'source').map(g => g.label)
    const twice = groupCatalogue([...entries].reverse(), 'source').map(g => g.label)
    expect(once).toEqual(['Ashen Covenant', 'Zephyr Pact'])
    expect(twice).toEqual(once)
  })
})

describe('groupCatalogue — the order of the headings', () => {
  it('turn cost runs in the order a turn is actually spent', () => {
    const one = (turnCost: CatalogueEntry['turnCost'], key: string) =>
      ({ turnCost, key }) as CatalogueEntry
    const entries = ['other', 'passive', 'reaction', 'bonus', 'action']
      .map((c, i) => one(c as CatalogueEntry['turnCost'], `k${i}`))
    expect(groupCatalogue(entries, 'turn').map(g => g.label)).toEqual([
      'Action', 'Bonus Action', 'Reaction', 'Always active', 'Not a turn slot',
    ])
  })

  it('"Ready now" comes first and locked comes last', () => {
    const e = (over: Partial<CatalogueEntry>) => over as CatalogueEntry
    const groups = groupCatalogue(
      [
        e({ key: 'l', lockedUntil: 9, prepared: true }),
        e({ key: 'n', lockedUntil: null, prepared: false, alwaysPrepared: false }),
        e({ key: 'r', lockedUntil: null, prepared: true }),
      ],
      'ready',
    )
    expect(groups.map(g => g.label)).toEqual([
      'Ready now', 'Known, not prepared', 'Locked at your level',
    ])
  })

  it('a locked entry is never called "Ready now", even when it reads as prepared', () => {
    /* `alwaysPrepared` is a property of the SPELL — the oath grants it whenever
     * he gets it — and it is true on entries he cannot cast for six more levels.
     * Reading it before the lock is how "Ready now" starts lying. */
    const groups = groupCatalogue(
      [{ key: 'x', lockedUntil: 9, alwaysPrepared: true, prepared: true } as CatalogueEntry],
      'ready',
    )
    expect(groups.map(g => g.label)).toEqual(['Locked at your level'])
  })

  it('levels run cantrips → 1 → 5, with features after the spells', () => {
    const e = (spellLevel: number | null, key: string) => ({ spellLevel, key }) as CatalogueEntry
    const groups = groupCatalogue(
      [e(null, 'f'), e(3, 'c'), e(0, 'a'), e(1, 'b')],
      'level',
    )
    expect(groups.map(g => g.label)).toEqual([
      'Cantrips', 'Level 1 spells', 'Level 3 spells', 'Features & feats',
    ])
  })
})

/* ── THE MEASUREMENT GATE 3 DEFERRED ─────────────────────────────────────── */

describe.skipIf(!nix)('the default mode is a measurement, not a preference', () => {
  it("counts how many of the 84 canon does not price in one of his turn slots", () => {
    /* Gate 3, least-confident decision 2, verbatim: "if more than ~15 of the 84
     * land in 'other', the default mode should be Source, not Turn cost."
     *
     * THE COUNT IS 20, so that rule fired — and taking it at its word would have
     * shipped the wrong default, because the rule only ever compared two of the
     * four modes. It ruled OUT 'turn'. It did not establish 'source'. */
    const other = catalogue.filter(e => e.turnCost === 'other')
    expect(other.length, `'other' holds ${other.length} of ${catalogue.length}`)
      .toBeGreaterThan(15)
    expect(DEFAULT_GROUP_MODE).toBe('level')
  })

  it('and the default is genuinely better — no group swallows the list', () => {
    /* THIS IS THE TEST THAT CAUGHT IT. Under `DEFAULT_GROUP_MODE = 'source'` it
     * failed with "biggest group holds 69 of 84" — Source's largest heading is
     * "Paladin", i.e. one undifferentiated list with a word on top of it, which
     * is the complaint that started this whole phase. Measured over his real 84
     * on 2026-08-29, and this comment is the record:
     *
     *     turn    4 groups, biggest 46   Action 46 · Bonus 16 · Reaction 2 · other 20
     *     source  3 groups, biggest 69   Paladin 69 · Oath of the Hearth 13 · Feat 2
     *     level   6 groups, biggest 22   L1 19 · L2 13 · L3 12 · L4 8 · L5 10 · F&f 22
     *     ready   3 groups, biggest 38   Ready 22 · Known 24 · Locked 38
     *
     * Marcus was shown those four and chose Level. The assertion stays because
     * the catalogue grows — at level 20 these distributions all move, and a
     * default that stopped organising should say so rather than persist. */
    const groups = groupCatalogue(catalogue, DEFAULT_GROUP_MODE)
    const biggest = Math.max(...groups.map(g => g.entries.length))
    expect(biggest, `biggest group holds ${biggest} of ${catalogue.length}`)
      .toBeLessThan(catalogue.length / 2)
    expect(groups.length, 'a default that made one group is not a grouping')
      .toBeGreaterThan(2)
  })

  it('every mode is offered exactly once by the chips, and the default is among them', () => {
    expect(GROUP_MODES.map(m => m.mode).sort()).toEqual([...ALL_MODES].sort())
    expect(GROUP_MODES.map(m => m.mode)).toContain(DEFAULT_GROUP_MODE)
    expect(GROUP_MODES[0]!.mode, 'the default should be the first chip').toBe(DEFAULT_GROUP_MODE)
  })
})
