# Program Design: Sheet Truth

## A finding that changes the prose half — read this first

Gate 2 said "9 advice strings bake a Charisma he doesn't have". Scanning the *rendered*
field (`tactics`) for **every** kind of baked derived number, not just Charisma, found
45 hits across 34 of the 71 spells. **Almost all of them are correct and must not be
touched.**

```
Sacred Flame    "at level 5"        ← a RULE. The spell improves at 5. True forever.
Fireball        "AT LEVEL 13"       ← a RULE.
Divine Smite    "DC 10"             ← a RULE. Concentration saves are DC 10.
Bless           "At level 7 with Charisma 18 that is +1d4 and +4"   ← HIS SHEET. Wrong.
Circle of Power "At level 17 with Charisma 20 your DC is 17"        ← a PROJECTION.
```

Three different kinds of sentence, indistinguishable by pattern. A find-and-replace
over "Charisma \d+" or "at level \d+" would silently rewrite rulebook facts into
nonsense — turning "this spell improves at level 5" into "this spell improves at level
7". That is a far worse bug than the one being fixed, and it would look fine.

**So the canon edits are done by hand, one string at a time, each one classified before
it is touched.** Not a script. The candidate set is the 7 spell strings below plus the
one feat note — everything that asserts something about *his current sheet*:

| Spell / feat | Kind | Action |
|---|---|---|
| Bless — "At level 7 with Charisma 18 that is +1d4 and +4 to every save" | his sheet | templated |
| Command — "At level 7 with Charisma 18 your DC is 15" | his sheet | templated |
| Heroism — "At Charisma 18 that is 4 temp HP" | his sheet | templated |
| Scorching Ray — "At level 7 with Charisma 18 that is +7" | his sheet | templated |
| Dispel Magic — "at Charisma 18 you have +4" · "DC 15" | his sheet | templated |
| Aura of Purity — "At Charisma 18 that is Advantage plus +4" · "DC 15" | his sheet | templated |
| Resistance — "+4 at Charisma 18, permanently" | his sheet | templated |
| **Circle of Power — "At level 17 with Charisma 20 your DC is 17"** | **projection** | **LEFT ALONE** |
| **Sacred Flame, Fireball, Toll the Dead, … (~30 more)** | **rules** | **LEFT ALONE** |
| **`feats.json` `prerequisite` — "Charisma 13+"** | **rules** | **LEFT ALONE** |

Circle of Power is deliberately kept: it is advice about a level he has not reached,
and rewriting it to his current numbers would destroy the thing it is for.

**One correction to Gate 2's count.** `paladinNote` (the Inspiring Leader string) has
**no production reader** — `grep paladinNote src/` finds only the type declaration at
`canon/types.ts:127`. It is data-only, like `tempHPWithCha18`. So **7 strings are
reachable on a screen, 1 is not.** All 8 get templated; only 7 change what he sees.

## Files

| File | Why here |
|---|---|
| `src/lib/rules-2024/derive.ts` **new** | Every formula, once. The only producer of a `Character`. |
| `src/lib/rules-2024/derive.test.ts` **new** | The formulas, the clamp, idempotence, the open-world cases. |
| `src/lib/rules-2024/propagation.test.ts` **new** | The bug itself, as a test: edit → save → reload → is it right? |
| `src/lib/canon/personalise.ts` **new** | Placeholder substitution. Character in, prose out. |
| `src/lib/canon/personalise.test.ts` **new** | Substitution, segment-dropping, and the no-baked-numbers guard. |
| `src/lib/character.ts` | Type split; `loadCharacter` resolves, `saveCharacter` strips; migration. |
| `src/lib/rules-2024/vitals.ts` | `tableVitals` reads derived; three discrepancy cases retire. |
| `src/lib/turn/detail.ts` | Personalise the tactics bullets at the one seam (line 284). |
| `src/hooks/useCharacter.ts` | State set from `saveCharacter`'s return, not from its argument. |
| `src/components/Settings.tsx` | `handleLevelUp` stops doing arithmetic; the 4th proficiency formula dies. |
| `src/canon/spells.json`, `feats.json` | 8 hand-edited strings. |
| `src/lib/turn/options.ts` | **UNTOUCHED.** The pin holds. |

## Types & signatures

### `src/lib/character.ts` — the split

```ts
/** What is written to disk. Contains no number the rules can work out. */
export interface CharacterBase {
  id: string
  level: number
  class: string
  spellcastingAbility: string
  abilityScores: AbilityScores
  armorClass: number                    // stays: depends on gear
  hitPoints: { max: number; current: number }   // stays: depends on his dice
  // … every other field unchanged …

  /** ONLY meaningful when the app has no casting rule for this class.
   *  Named so it cannot be mistaken for the answer. */
  spellSaveDCOverride?: number
  spellAttackBonusOverride?: number

  /** DEVIATION FROM THIS GATE, recorded rather than slipped in. Gate 3 named two
   *  overrides; slice 3 shipped three. Canon ships a levels table for Paladin and
   *  for NO other class, so `maxPreparedSpells` is derivable for Marcus and for
   *  nobody else. Retiring the stored field without an escape hatch would have
   *  silently zeroed the prepared-spell count of every Cleric, Druid and Wizard
   *  the app has ever saved. Pinned by `derive.test.ts` — "a Cleric saved before
   *  slice 3 does not lose their prepared count". */
  maxPreparedSpellsOverride?: number

  /** Same shape as today. `.max` fields are overwritten by resolve() when canon
   *  has a table for the class; `.current` is his and is never raised. */
  paladinResources?: PaladinResources
}

/** What the app holds. Produced ONLY by resolveCharacter(). */
export type Character = CharacterBase & DerivedNumbers
```

`Character` keeps every property name every consumer already reads, so no call site
changes and `options.ts` stays byte-identical.

### `src/lib/rules-2024/derive.ts`

```ts
export interface DerivedNumbers {
  proficiencyBonus: number
  spellSaveDC: number
  spellAttackBonus: number
  maxPreparedSpells: number
}

/** A row of src/canon/paladin-progression.json, or null when canon has no table
 *  for this class. Open-world: null means "nothing to add", never "you are wrong". */
export function progressionRow(className: string, level: number): ProgressionRow | null

export function proficiencyFor(level: number): number
export function castingAbilityOf(base: CharacterBase): AbilityKey | null

/** THE one producer of a Character. Pure. Idempotent: resolve(resolve(x)) === resolve(x). */
export function resolveCharacter(base: CharacterBase): Character

/** The inverse. Everything that goes to disk goes through this. */
export function storableOf(char: Character): CharacterBase
```

`derive.ts` imports from `character.ts` with `import type` only, so the module cycle is
erased at compile time and there is no runtime cycle.

### `src/lib/canon/personalise.ts`

```ts
/** The whole vocabulary. Deliberately six, all character-derived. */
export type Placeholder = 'level' | 'CHA' | 'CHAmod' | 'saveDC' | 'spellAttack' | 'prof'

/** Substitute his numbers into one string.
 *  A placeholder with no answer for this character makes the SEGMENT it sits in
 *  unresolvable — the caller drops that segment whole. Never a half sentence,
 *  never an ellipsis. */
export function personalise(text: string, char: Character): string

/** Bullets in, bullets out, unresolvable ones dropped. Applied AFTER splitTactics
 *  so heading detection still runs on unmodified canon text. */
export function personaliseBullets(bullets: TacticsBullet[], char: Character): TacticsBullet[]
```

### `src/lib/character.ts` — the storage boundary

```ts
/** Now carries the resolved character, so callers never put back what they handed in. */
export type CharacterSaveOutcome =
  | { ok: true; character: Character }
  | { ok: false; reason: string; stale?: true }

export function saveCharacter(character: Character, opts?: { replacing?: boolean }): CharacterSaveOutcome
export function loadCharacter(id: string): Character | null
```

> **AMENDED during slice 2 — a new type, not a widened one.** This block originally
> added `character` to the EXISTING `SaveOutcome`. Reading the code first showed why
> that is wrong: `SaveOutcome` is also the return type of `put`, `saveOrAnnounce`,
> `setActiveId` and `updateRosterEntry`, none of which has a character to hand back.
> Widening it would have forced four unrelated functions to invent a field or lie about
> having one. `CharacterSaveOutcome` is therefore a separate type; `SaveOutcome` is
> untouched and still means "the write landed, or here is why it did not". Recorded here
> rather than left in a code comment, because it changes a signature this gate approved.

## Call stack

**Boot / switch**
```
useCharacter → loadCharacter(id)
  → localStorage.getItem → JSON.parse
  → normalizeCharacter(parsed)        defaults + repair log (unchanged)
  → migrateDerived(parsed)            spellSaveDC → Override, or discarded
  → resolveCharacter(base)            ← the one producer
```

**Any edit — this is the propagation fix**
```
CharacterPage.handleScoreConfirm
  → onCharacterUpdate({ ...character, abilityScores })     ← stale derived still attached
  → useCharacter.update(char)
  → saveCharacter(char)
       → resolveCharacter(storableOf(char))                 recompute from scores + level
       → put(key, JSON.stringify(storableOf(resolved)))     derived keys never reach disk
       → return { ok: true, character: resolved }
  → setCharacterState(outcome.character)                    ← NOT the argument
```

**A spell's advice**
```
OptionDetailSheet → buildDetail(option, character)
  → splitTactics(spell.tactics)             canon text, unmodified — headings found first
  → personaliseBullets(bullets, character)  ← the one prose seam
```

## Test plan

Every one of these fails against today's code except where marked.

**The bug itself**
1. `edit CHA 18→16, save, reload from storage → spellSaveDC is 14` — the test that would have caught this. **Fails today (reads 15).**
2. `edit CHA, then read tableVitals() → 14 / +6`.
3. `save a character → the raw localStorage JSON has no spellSaveDC key`. **Fails today.**
4. `level up 8→9 → all of prof, DC, attack, prepared, Lay on Hands are level-9 values`. **Fails today (4 stay at level 8).**

**The formulas**
5. Paladin 7, CHA 16 → prof +3, DC 14, attack +6, prepared 7, LoH 35, CD 2, aura 10 ft.
6. Paladin 11 → CD 3. Paladin 18 → aura 30 ft. Boundaries, not just the happy level.
7. `resolveCharacter` is idempotent.
8. Spell slots are **not** touched by resolve, at any level.
9. Open world: a class canon has no table for keeps its stored `maxPreparedSpells` and
   gets no paladin pools, and `discrepancies()` stays silent about it.
10. Non-caster: a Fighter with `spellSaveDCOverride: 12` resolves to 12 — the app
    invents nothing.
11. Migration: a stored Paladin blob with `spellSaveDC: 15` **discards** the 15 and
    resolves to 14; a stored Fighter blob **keeps** it as an override.

**The clamp**
12. LoH `current` 20, max 40 → 45: current stays **20**. A level-up never refills.
13. LoH `current` 44, max 45 → 35: current clamps to **35**.

**The prose**
14. `personalise("At level {level} with Charisma {CHA} your DC is {saveDC}", nix16)`
    → `"At level 7 with Charisma 16 your DC is 14"`.
15. An unresolvable placeholder drops the whole segment — the output contains no `{`,
    no half sentence, and **no ellipsis**.
16. Every `tactics` and `paladinNote` string is free of a bare `Charisma <digits>`,
    **except** an explicit allow-list naming Circle of Power. Adding a new baked number
    fails the test.
17. `feats.json` `prerequisite` still reads `"Charisma 13+"` — the rules are untouched.
18. The existing `tactics.test.ts` rejoin invariant still passes for all 71 records with
    placeholders in the data. *(This one must stay green, not go red.)*

**Structural — forbids the fault rather than sampling for it (finding BG)**
19. A source scan asserting the proficiency formula appears in exactly **one** file.
    Today it appears in four. **Fails today.**
20. A source scan asserting no file under `src/components/` or `src/lib/` outside
    `derive.ts` writes `spellSaveDC`, `spellAttackBonus` or `proficiencyBonus`.

**Browser (geometric / structural, per finding Q)**
21. `_probe-baseline.mjs` reports **0** disagreements.
22. A new `_probe-follow.mjs` drives the **Prep UI** — taps CHA, types 16, confirms —
    then navigates to Play and reads the vitals band structurally. Proves the number
    *follows the edit*, not merely that it happens to be right on a seeded sheet.
23. `_probe-tactics.mjs` opens a spell's detail and its tactics fold and reads the
    Charisma sentence. Proves the prose seam on a real screen.

## Least confident decisions

1. **Discarding a caster's stored `spellSaveDC` at migration.** It is the stale number
   this phase exists to kill, and it is recomputable — but it is still a one-way delete
   of persisted data on first load. Mitigation: `normalizeCharacter` already has a
   repair log; the discard writes a plain-language line into it. Should he see that line?
2. **`SaveOutcome` gaining a `character` field.** Four call sites bypass the hook and
   destructure this. They compile unchanged (a new field breaks nothing) but they will
   keep setting state from their own argument, so they keep a one-render stale value
   until each is updated. Do we fix all four in the same slice, or leave them and prove
   which surfaces are affected?

   > **ANSWERED by re-grepping, before slice 2 was built. It was not four — it was
   > three production callers in two files:** `useCharacter.ts:60`, `useCharacter.ts:80`,
   > and `character.ts:1093` (`migrateFromLegacy`). Only the first two need the return;
   > the migration writes and discards. All three were handled inside slice 2, so the
   > "leave them and prove which surfaces are affected" branch never had to be taken.
   > The `AMENDMENT A-19` comment in `useCharacter.ts` that said "three components and
   > one migration" describes a PAST state of the code — **it is history, not a current
   > map**, and reading it as a map is what produced the wrong count here.
3. **Hand-editing 8 canon strings instead of scripting it.** Slower and it is my
   judgement on each one. The scan above is the argument: a script cannot tell a rule
   from a claim about his sheet, and getting it wrong rewrites the rulebook.
4. **Circle of Power's projection stays baked at Charisma 20 / level 17.** Alternative:
   make projections dynamic too ("at level 17 you would have…"). That is a bigger idea
   and probably a later phase.
5. **Deleting three `discrepancies()` cases vs. keeping them as provably-unreachable.**
   Deleting is cleaner; keeping means a test can assert they never fire, which is
   evidence the invariant holds rather than an absence of evidence.
