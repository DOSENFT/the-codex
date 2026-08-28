import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveCharacter, storableOf, DERIVED_KEYS } from './derive'
import { saveCharacter, loadCharacter, normalizeCharacter, migrateFromLegacy } from '../character'

/* ============================================================================
   SHEET TRUTH slice 3 — THERE IS NO SECOND COPY.

   Slices 1 and 2 made the numbers right: `loadCharacter` resolves on the way
   off the disk, `saveCharacter` resolves on the way onto it, and `useCharacter`
   sets React state from the return rather than the argument. Every one of those
   is a correction applied at a moment. This slice removes the thing that needed
   correcting.

   The distinction matters, and finding BG is the name for it: a test that
   samples the app and fails to observe a stale number is weaker than a test
   that makes a stale number impossible to represent. The first block below is
   the second kind. There is no `spellSaveDC` on disk to go stale, so no future
   edit path — one nobody has written yet, one that skips `useCharacter`
   entirely — can reintroduce Marcus's bug by forgetting to resolve.

   MEASURED, one line at a time. Slice 2 turned up a test that could not fail —
   it read a field name that did not exist, mapped to `undefined`, and passed
   against anything — and the only reason it was caught is that the slice was
   actually reverted. So rather than claim these fail against "the pre-slice
   code", each was pinned to the specific line it guards, by putting that line
   back and running this file. Three micro-reverts, three results:

     revert `JSON.stringify(storableOf(character))` -> `JSON.stringify(character)`
        red: "carries none of the four" · "scrubs a sheet an older build wrote"
     revert the demotion in `normalizeInner` (`?? parsed.spellSaveDC` dropped)
        red: "demotes the discarded number to the override"
     revert `proficiencyForLevel` in `vitals.ts` to its own arithmetic
        red: "nothing outside derive.ts works out a proficiency bonus"

   So 4 of the 11 below are pinned to a line of this slice and go red when it
   goes. THE OTHER SEVEN CANNOT FAIL AGAINST THE OLD CODE, and are labelled here
   rather than left to look like evidence they are not:

     • "the sheet that comes back out is right, not merely empty" passes on
       slice 1 alone, because `loadCharacter` already resolved. It is here to
       stop "delete the four numbers" from being a way to reach green on the
       assertion above it, and as a slice-1 regression guard.
     • the three round-trip laws test `storableOf` and `DERIVED_KEYS`, which did
       not exist before this slice. There is no old code for them to fail against.
     • the three remaining source scans pass today and are meant to. They are
       finding BG applied: a claim that FORBIDS the fault returning, not a
       sampling that failed to observe it. A guard that is green on the day it
       is written is doing its job; one that was never red is only a problem when
       it is offered as proof that something was broken.

   The first thing the scans found, on their first run, was that `vitals.ts` still
   held a copy of the proficiency formula that slice 1's comments claim it
   replaced — and that the two copies had already drifted on the clamp. Nobody
   read that; the scan did.
   ========================================================================== */

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

/** Tests under `rules-2024/` run in the NODE environment — there is no
 *  `localStorage` unless one is installed. */
function fakeStorage() {
  const store: Record<string, string> = {}
  const api = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    get length() { return Object.keys(store).length },
  } as unknown as Storage
  Object.defineProperty(globalThis, 'localStorage', { value: api, configurable: true, writable: true })
  return store
}

/** Marcus's sheet, as an older build of this app would have left it on disk:
 *  Charisma 16 beside the Charisma-18 numbers. This is the exact file that
 *  produced "in combat my spell definitions are claiming that my charisma is
 *  18, when in fact it's 16". */
const staleOnDisk = (id: string) => JSON.stringify({
  id,
  name: 'Nix',
  class: 'Paladin',
  subclass: 'Oath of the Hearth',
  race: 'Changeling',
  level: 7,
  spellcastingAbility: 'Charisma',
  spellSaveDC: 15,
  spellAttackBonus: 7,
  proficiencyBonus: 3,
  maxPreparedSpells: 5,
  armorClass: 18,
  hitPoints: { max: 67, current: 67 },
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  updatedAt: '2026-08-01T00:00:00.000Z',
})

describe('what reaches the disk', () => {
  let store: Record<string, string>
  beforeEach(() => { store = fakeStorage() })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true })
  })

  it('carries none of the four worked-out numbers', () => {
    /* THE SLICE, in one assertion. Not "the number on disk is right" — there is
       no number on disk. A key that does not exist cannot disagree with
       anything. */
    const c = resolveCharacter(normalizeCharacter({ name: 'Nix', class: 'Paladin', level: 7 }, 's3-a'))
    expect(saveCharacter(c).ok).toBe(true)

    const written = JSON.parse(store['codex-character-s3-a']) as Record<string, unknown>
    for (const key of DERIVED_KEYS) expect(Object.keys(written)).not.toContain(key)
  })

  it('scrubs a sheet an older build already wrote — the first save IS the migration', () => {
    /* No migration script, no version stamp, no one-time flag to get wrong. The
       stale keys arrive through `normalizeInner`'s `...parsed`, survive as far as
       `storableOf`, and are subtracted there. Every character Marcus has is
       migrated the next time anything at all is saved. */
    store['codex-character-s3-b'] = staleOnDisk('s3-b')
    expect(store['codex-character-s3-b']).toContain('"spellSaveDC":15')

    const loaded = loadCharacter('s3-b')!
    expect(saveCharacter(loaded).ok).toBe(true)

    /* KEYS, not `toContain`. The first draft of this asserted the serialised
       string did not contain "spellSaveDC" and failed — on `spellSaveDCOverride`,
       which contains it as a prefix. That is finding Q exactly, committed inside
       the tool meant to enforce it: a substring scan matching its neighbour. The
       claim is about the shape of the record, so it is made against the record. */
    const after = JSON.parse(store['codex-character-s3-b']) as Record<string, unknown>
    for (const key of DERIVED_KEYS) expect(Object.keys(after)).not.toContain(key)
  })

  it('and the sheet that comes back out of it is right, not merely empty', () => {
    /* The other half. Deleting the numbers would satisfy the test above on its
       own; this is what stops that from being the way to green. Charisma 16,
       proficiency +3: DC 14 and +6, which are the numbers on the sheet Marcus
       photographed. */
    store['codex-character-s3-c'] = staleOnDisk('s3-c')
    saveCharacter(loadCharacter('s3-c')!)

    const back = loadCharacter('s3-c')!
    expect(back.spellSaveDC).toBe(14)
    expect(back.spellAttackBonus).toBe(6)
    expect(back.proficiencyBonus).toBe(3)
  })

  it('demotes the discarded number to the override, and honours it only where there is no rule', () => {
    /* The stored 15 is not deleted, it is DEMOTED — kept as the answer for a
       class the app has no casting rule for, ignored for one it has. Both halves
       asserted, because the first without the second is how a stale copy comes
       back wearing a new name. */
    store['codex-character-s3-d'] = staleOnDisk('s3-d')
    saveCharacter(loadCharacter('s3-d')!)
    const paladin = JSON.parse(store['codex-character-s3-d']) as Record<string, unknown>
    expect(paladin.spellSaveDCOverride).toBe(15)     // kept on the file …
    expect(loadCharacter('s3-d')!.spellSaveDC).toBe(14)  // … and not believed

    const fighter = resolveCharacter(normalizeCharacter(
      { name: 'A Fighter', class: 'Fighter', level: 7, spellSaveDC: 12 }, 's3-e',
    ))
    expect(fighter.spellSaveDC).toBe(12)             // no rule, so it stands
  })

  it('the one-time legacy migration demotes too, instead of destroying', () => {
    /* FOUND BY THE BROWSER PROBE, NOT BY THIS FILE. Every test above was green
       while `migrateFromLegacy` spread the old record straight into
       `saveCharacter` without normalising it. `storableOf` then deleted
       `spellSaveDC` on the way to disk — so the number was not retired, it was
       destroyed, and the demotion that every other read path performs never ran.
       `_probe-disk.mjs` reported `overrides kept: (none)` against a real Chrome.

       A unit test only ever checks the paths it calls, and this suite called
       `saveCharacter` and `loadCharacter` and never this. The lesson is the
       slice's own: a claim about "every write path" has to be made against
       something that enumerates them, or made in the browser.

       A Fighter on purpose. For Marcus's Paladin the loss is invisible, because
       the app can work the DC out again — which is exactly why this survived. For
       a class it has no casting rule for, the override is the only place that
       number can live, so destroying it is destroying the answer. */
    localStorage.setItem('codex-character', JSON.stringify({
      /* Carries an `id` of its own, deliberately — the single-character format
         did, and it is what makes the active-id assertion below able to fail. */
      id: 'a-legacy-id-of-its-own',
      name: 'A Fighter', class: 'Fighter', level: 7,
      spellSaveDC: 12, spellAttackBonus: 4,
      abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 },
    }))
    expect(migrateFromLegacy()).toBe(true)

    const key = Object.keys(store).find(k => k.startsWith('codex-character-'))!
    const written = JSON.parse(store[key]) as Record<string, unknown>
    for (const k of DERIVED_KEYS) expect(Object.keys(written)).not.toContain(k)
    expect(written.spellSaveDCOverride).toBe(12)

    /* The migrated sheet is the one the app opens. Asserted because the first
       attempt at this fix broke exactly here: a legacy record carrying its own
       `id` was filed under that id while the active id pointed at a freshly
       minted one, so the app booted to the roster picker instead of Marcus's
       sheet. Finding the record by scanning for the prefix — which is what the
       lines above do — cannot see that, because the record IS there. It is just
       not the one anybody asked for. */
    expect(localStorage.getItem('codex-active-id')).toBe(key.slice('codex-character-'.length))
    expect(written.id).toBe(localStorage.getItem('codex-active-id'))

    // And the behaviour, not just the shape: the number still comes back.
    const back = loadCharacter(key.slice('codex-character-'.length))!
    expect(back.spellSaveDC).toBe(12)
    expect(back.spellAttackBonus).toBe(4)
  })

  it('a Cleric carried through the legacy migration keeps their prepared count', () => {
    /* The wider blast radius of the same fault. Canon ships a levels table for
       Paladin and for nothing else, so for a Cleric, Druid or Wizard the stored
       `maxPreparedSpells` is the only source there is. The old migration deleted
       it with no line in the repair log to say so. */
    localStorage.setItem('codex-character', JSON.stringify({
      name: 'A Cleric', class: 'Cleric', level: 7, maxPreparedSpells: 9,
      abilityScores: { STR: 10, DEX: 12, CON: 14, INT: 10, WIS: 18, CHA: 10 },
    }))
    expect(migrateFromLegacy()).toBe(true)

    const key = Object.keys(store).find(k => k.startsWith('codex-character-'))!
    expect(loadCharacter(key.slice('codex-character-'.length))!.maxPreparedSpells).toBe(9)
  })
})

describe('resolve and storable are inverses', () => {
  it('storableOf removes exactly the derived keys and nothing else', () => {
    const base = normalizeCharacter({ name: 'Nix', class: 'Paladin', level: 7 }, 'inv-1')
    const back = storableOf(resolveCharacter(base))
    expect(new Set(Object.keys(back))).toEqual(new Set(Object.keys(base)))
    expect(back).toEqual(base)
  })

  it('DERIVED_KEYS names every key resolving actually adds — checked at runtime, not only by the compiler', () => {
    /* `derive.ts` has a compile-time assertion that no key of `DerivedNumbers`
       is missing from `DERIVED_KEYS`. That guards the LIST against the
       INTERFACE. This guards the interface against the FUNCTION: a fifth number
       added to `resolveCharacter`'s return without being added to the interface
       would slip past the compiler's `...base` spread and land on disk. */
    const base = normalizeCharacter({ name: 'Nix', class: 'Paladin', level: 7 }, 'inv-2')
    const resolved = resolveCharacter(base) as unknown as Record<string, unknown>
    const added = Object.keys(resolved).filter(k => !(k in (base as unknown as Record<string, unknown>)))
    expect(new Set(added)).toEqual(new Set(DERIVED_KEYS))
  })

  it('resolving twice changes nothing', () => {
    const once = resolveCharacter(normalizeCharacter({ name: 'Nix', class: 'Paladin', level: 7 }, 'inv-3'))
    expect(resolveCharacter(once)).toEqual(once)
  })
})

/* ---------------------------------------------------------------------------
   THE SOURCE SCANS.

   Everything above is about one character on one run. These are about the whole
   repository, and they are the claims that make the phrase "there is no second
   copy" mean something checkable rather than something I believe.
   ------------------------------------------------------------------------ */

const SRC = join(__dirname, '..', '..')

/** Every production TypeScript file: no tests, no fixtures, and not `derive.ts`
 *  itself, which is the one place all of this is allowed to live. */
function productionFiles(dir = SRC, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'fixtures') productionFiles(path, out); continue }
    if (!/\.tsx?$/.test(entry.name)) continue
    if (/\.test\.tsx?$/.test(entry.name)) continue
    if (entry.name === 'derive.ts' && dir.endsWith('rules-2024')) continue
    out.push(path)
  }
  return out
}

/** Source with comments blanked out. Without this the scans read their own
 *  explanations back and report the fault they were written to forbid — the
 *  comment in `Settings.tsx` quoting the deleted formula does exactly that. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const lines = (file: string) => stripComments(readFileSync(file, 'utf8')).split('\n')

describe('the formulas exist once', () => {
  it('nothing outside derive.ts works out a proficiency bonus', () => {
    /* There were FIVE copies in four spellings: `vitals.ts`, `Settings.tsx`,
       `CharacterSetup.tsx`, canon's own rows, and the defaults in
       `character.ts`. They all agreed, and nothing made them agree. This is what
       replaces luck. */
    const found: string[] = []
    for (const file of productionFiles()) {
      lines(file).forEach((line, i) => {
        if (/Math\.(ceil|floor)\(.*\/\s*4/.test(line)) found.push(`${file}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(found).toEqual([])
  })

  it('nothing outside derive.ts computes a save DC or a spell attack', () => {
    const found: string[] = []
    for (const file of productionFiles()) {
      // `mechanics-reference.ts` is the rulebook the app shows the player. It
      // says "8 + proficiency bonus + spellcasting ability modifier" in English,
      // on purpose, and must keep saying it.
      if (file.endsWith('mechanics-reference.ts')) continue
      lines(file).forEach((line, i) => {
        if (/\b8\s*\+\s*[A-Za-z_$]/.test(line)) found.push(`${file}:${i + 1}  ${line.trim()}`)
      })
    }
    // `vitals.ts` builds the sentence that explains a disagreement to Marcus and
    // interpolates the numbers into it; it does not compute the DC, it prints
    // the working. Slice 7 revisits that file.
    expect(found.filter(f => !f.includes('vitals.ts'))).toEqual([])
  })
})

describe('the derived numbers have one producer', () => {
  it('no production file assigns one of them from anything but an identical field', () => {
    /* The forbidding claim. `KEY:` appears in production source in exactly two
       innocent shapes and this insists on both of them:

         KEY: number          — a type declaration. Says nothing, computes nothing.
         KEY: something.KEY   — a verbatim carry, as `turn/overlay.ts` does when it
                                copies an already-resolved character into its own
                                struct. Copying a correct number cannot make it wrong.

       Anything else — arithmetic, a literal, a `??` chain, a call — is a second
       producer, and a second producer is the whole of the bug this phase exists
       to kill. It fails here with the file and the line, not at Marcus's table. */
    const offenders: string[] = []
    const KEYS = DERIVED_KEYS.join('|')
    const declaration = new RegExp(`\\b(${KEYS})\\s*:\\s*(number|string)\\s*[;,]?\\s*$`)
    const carry = new RegExp(`\\b(${KEYS})\\s*:\\s*[A-Za-z_$][\\w$]*(\\.[\\w$]+)*\\.\\1\\s*,?\\s*$`)

    for (const file of productionFiles()) {
      lines(file).forEach((line, i) => {
        if (!new RegExp(`(^|[^.\\w$])(${KEYS})\\s*:`).test(line)) return
        if (declaration.test(line) || carry.test(line)) return
        offenders.push(`${file.slice(SRC.length + 1)}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it('the escape-hatch overrides are read in exactly one place', () => {
    /* An override read anywhere but `resolveCharacter` is the stale stored copy
       under a new name, which would undo this slice while looking like it
       respects it. `character.ts` is allowed one read — `normalizeInner`
       demoting the old stored key into the override — and that is the migration,
       not a use. No screen, no combat surface, no turn builder may touch these. */
    const readers = new Set<string>()
    const access = new RegExp(`\\.\\s*(${DERIVED_KEYS.map(k => k + 'Override').join('|')})\\b`)
    for (const file of productionFiles()) {
      if (lines(file).some(l => access.test(l))) readers.add(file.slice(SRC.length + 1).replace(/\\/g, '/'))
    }
    expect([...readers].sort()).toEqual(['lib/character.ts'])
  })
})
