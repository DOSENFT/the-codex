/* ============================================================================
   THE SAVED-DATA CHECK — "does yesterday's file still open?"

   Every other test in this repo starts from a fixture written in TypeScript, so
   it moves whenever the types move. That is the right thing for a unit test and
   the wrong thing for the one question this file asks:

       A real character file was saved by the app on 2026-09-11.
       If someone changes how characters are stored, does that file still open,
       with the same numbers on it?

   So the input here is not a fixture object. It is BYTES — a byte-for-byte copy
   of `public/_seed.json`, the real Nix save (Changeling Paladin, Oath of the
   Hearth, level 7), sitting at `tests/safety-net/fixtures/nix-lvl7.json`. The
   original is never opened for writing and never moved; this is a copy, and the
   copy is the frozen record of what "a saved character" meant on that date.

   TWO DOORS, BOTH REAL. A character gets into this app two ways and both are
   driven here with the app's own code, not a reimplementation of it:

     the file door     `parseCharacterFile` — exactly what the Import Character
                       button calls (`CharacterSetup.tsx:170`, `Settings.tsx:390`).

     the disk door     `saveCharacter` then `loadCharacter` — exactly what the
                       app does between one session and the next. Storage is a
                       recording `MemoryStorage`, the pattern
                       `src/components/turn/storage-safety.test.tsx` established,
                       because this repo has no jsdom.

   WHY BOTH. `saveCharacter` deliberately does NOT write every field it was
   given: the four numbers the rules can work out (`spellSaveDC`,
   `spellAttackBonus`, `maxPreparedSpells`, `proficiencyBonus`) are subtracted on
   the way to disk and recomputed on the way back — see `storableOf` and the
   SHEET TRUTH note at `src/lib/character.ts:735-745`. That is a good design and
   it is also precisely the kind of change that can quietly stop round-tripping.
   Asserting only on the import would miss it; asserting only on the round trip
   would miss a broken importer. So the same expectations are applied to both
   doors, by one function, and a regression in either is named on its own line.

   WHAT IS PINNED, AND WHY THESE VALUES. Name, level, class, subclass, species,
   HP, AC, ability scores, spell slots, prepared spells, feats, weapons and
   skills — the things a player would notice were wrong across a table. Each is
   the literal value in the file, written out, so a diff to this test is a
   deliberate statement that the saved data means something different now.
   ========================================================================== */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCharacterFile } from '../../src/lib/import-character'
import {
  loadCharacter,
  saveCharacter,
  loadRoster,
  getPreparedSpells,
  type Character,
} from '../../src/lib/character'

/** The copy, read as bytes. Never the original, and never `import ... from`,
 *  because a JSON import is resolved by the bundler and this needs to be the
 *  file on disk that the app would have been handed. */
const FIXTURE = fileURLToPath(new URL('./fixtures/nix-lvl7.json', import.meta.url))
const SAVED_BYTES = readFileSync(FIXTURE, 'utf8')

/** The character as the file records him, in the words a player would use.
 *  This is the whole contract of this file. */
const NIX_AS_SAVED = {
  name: 'Nix',
  level: 7,
  class: 'Paladin',
  subclass: 'Oath of the Hearth',
  race: 'Changeling',
  hp: { max: 67, current: 3 },
  tempHP: 0,
  armorClass: 18,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  spellSlots: {
    1: { max: 4, current: 4 },
    2: { max: 3, current: 2 },
    3: { max: 2, current: 2 },
  },
  spellCount: 7,
  prepared: ['Bless', 'Burning Hands', 'Faerie Fire', 'Shield of Faith', 'Scorching Ray', 'Warding Bond'],
  feats: ['Sentinel', 'Lucky'],
  weapons: ['The Dawn Guardian'],
  skillProficiencies: ['Athletics', 'Persuasion'],
  spellcastingAbility: 'Charisma',
  /* Worked out rather than trusted — 8 + PB 3 + CHA +3 = 14, and 3 + 3 = +6.
     The file happens to agree, which is the point: the same numbers must come
     back whether they were read or recomputed. */
  spellSaveDC: 14,
  spellAttackBonus: 6,
  proficiencyBonus: 3,
} as const

/** Storage that records, so "nothing was lost" and "nothing was scribbled over"
 *  are separate claims. Same shape as `storage-safety.test.tsx`. */
class MemoryStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = new MemoryStorage()
})

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage
})

/** Read the file the way the Import Character button reads it. */
function throughTheFileDoor(): Character {
  const result = parseCharacterFile(SAVED_BYTES)
  if (!result.ok) throw new Error(`the saved file no longer imports: ${result.error}`)
  return result.character
}

/** Every expectation, applied to whichever copy of him is handed in. Written
 *  once so the two doors cannot drift apart in what they are held to. */
function expectNixIntact(nix: Character, door: string) {
  const where = (field: string) => `${field} (via ${door})`

  expect(nix.name, where('name')).toBe(NIX_AS_SAVED.name)
  expect(nix.level, where('level')).toBe(NIX_AS_SAVED.level)
  expect(nix.class, where('class')).toBe(NIX_AS_SAVED.class)
  expect(nix.subclass, where('subclass')).toBe(NIX_AS_SAVED.subclass)
  expect(nix.race, where('race')).toBe(NIX_AS_SAVED.race)

  expect(nix.hitPoints, where('hitPoints')).toEqual(NIX_AS_SAVED.hp)
  expect(nix.tempHP, where('tempHP')).toBe(NIX_AS_SAVED.tempHP)
  expect(nix.armorClass, where('armorClass')).toBe(NIX_AS_SAVED.armorClass)

  expect(nix.abilityScores, where('abilityScores')).toEqual(NIX_AS_SAVED.abilityScores)

  /* Slots are asserted whole, not level by level. A change that dropped the
     3rd-level row entirely — which is a real hazard here, because the 2024
     rules band offers exactly that — would pass a per-level loop over the
     levels that survived. */
  expect(nix.spellSlots, where('spellSlots')).toEqual(NIX_AS_SAVED.spellSlots)
  expect(nix.spellSlots[2].current, where('2nd-level slots spent before saving')).toBe(2)

  expect(nix.spells.length, where('spell count')).toBe(NIX_AS_SAVED.spellCount)
  expect(getPreparedSpells(nix).map(s => s.name), where('prepared spells')).toEqual([
    ...NIX_AS_SAVED.prepared,
  ])
  expect(nix.canPrepareSpells, where('canPrepareSpells')).toBe(true)

  expect(nix.spellcastingAbility, where('spellcastingAbility')).toBe(NIX_AS_SAVED.spellcastingAbility)
  expect(nix.spellSaveDC, where('spellSaveDC')).toBe(NIX_AS_SAVED.spellSaveDC)
  expect(nix.spellAttackBonus, where('spellAttackBonus')).toBe(NIX_AS_SAVED.spellAttackBonus)
  expect(nix.proficiencyBonus, where('proficiencyBonus')).toBe(NIX_AS_SAVED.proficiencyBonus)

  expect(nix.feats.map(f => f.name), where('feats')).toEqual([...NIX_AS_SAVED.feats])
  expect(nix.weapons.map(w => w.name), where('weapons')).toEqual([...NIX_AS_SAVED.weapons])
  expect(nix.skillProficiencies, where('skillProficiencies')).toEqual([
    ...NIX_AS_SAVED.skillProficiencies,
  ])

  /* Four class features, each with a name — the thing that made the Grimoire's
     84 rows and the turn screen's option list. A feature that arrives nameless
     renders as a blank row rather than an error, so the name is asserted and
     not just the count. */
  expect(nix.features.length, where('feature count')).toBe(4)
  expect(nix.features.every(f => typeof f.name === 'string' && f.name.length > 0), where('feature names')).toBe(true)
}

describe("the saved file still opens — Nix, as he was saved", () => {
  it('imports through the app\'s own Import Character path', () => {
    expectNixIntact(throughTheFileDoor(), 'parseCharacterFile')
  })

  it('survives being saved to disk and reopened, unchanged', () => {
    const imported = throughTheFileDoor()

    const wrote = saveCharacter(imported)
    expect(wrote.ok, 'saveCharacter refused the imported character').toBe(true)

    const reopened = loadCharacter(imported.id)
    expect(reopened, `loadCharacter('${imported.id}') came back null`).not.toBeNull()

    expectNixIntact(reopened!, 'saveCharacter → loadCharacter')
  })

  it('keeps the same id from file to disk, so the roster can find him again', () => {
    const imported = throughTheFileDoor()
    /* The id is not cosmetic: `codex-active-id`, `codex-combat-<id>`,
       `codex-errata-<id>` and `codex-training-<id>` all hang off it. A new id on
       every import is the silent version of losing the encounter. */
    expect(imported.id).toBe('b4816f64-24a7-4df2-bc9f-9078e07af95d')

    saveCharacter(imported)
    expect(loadCharacter(imported.id)!.id).toBe(imported.id)

    const roster = loadRoster()
    expect(roster.map(e => ({ id: e.id, name: e.name, level: e.level, class: e.class }))).toEqual([
      { id: imported.id, name: 'Nix', level: 7, class: 'Paladin' },
    ])
  })

  it('tells the reader which numbers it stopped believing, rather than changing them in silence', () => {
    /* The import reports repairs in plain language. This is the sentence the
       welcome screen paints, and it is the app's only account of what it did to
       the file — if it ever stops being produced, a future change to the save
       format would alter Marcus's sheet with nothing on screen to say so. */
    const result = parseCharacterFile(SAVED_BYTES)
    if (!result.ok) throw new Error(result.error)
    expect(result.repairs.join(' ')).toContain('spell save DC (14 on the file)')
    expect(result.repairs.join(' ')).toContain('Charisma')
    /* And nothing is MISSING from this file — it carries its kit. A warning
       here would mean the fixture had been thinned out. */
    expect(result.warnings).toEqual([])
  })

  it('writes the character under the key the app reads him back from', () => {
    const imported = throughTheFileDoor()
    saveCharacter(imported)
    const key = `codex-character-${imported.id}`
    const raw = localStorage.getItem(key)
    expect(raw, `nothing was written to ${key}`).not.toBeNull()
    /* Bytes, not an object: the saved record must be JSON that names him, so a
       change that started storing some other encoding fails here rather than at
       the table. */
    expect(JSON.parse(raw!).name).toBe('Nix')
  })
})
