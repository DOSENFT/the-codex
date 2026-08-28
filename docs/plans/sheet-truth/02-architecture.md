# Architecture: Sheet Truth

## Fit

Six seams. Five are edited; one is deliberately not.

| Module | Role after this phase |
|---|---|
| **`src/lib/rules-2024/derive.ts`** *(new)* | The single home of every formula. Absorbs `computeSpellSaveDC` / `computeSpellAttackBonus` (`character.ts:376,383`), `proficiencyForLevel` (`vitals.ts:84`), `computePaladinResources` (`character.ts:1273`) and the inline fourth copy at `Settings.tsx:353`. After this, **each formula exists exactly once.** |
| **`src/lib/character.ts`** | The type split, and the storage boundary that enforces it. `loadCharacter` resolves; `saveCharacter` strips. |
| **`src/lib/rules-2024/vitals.ts`** | `tableVitals()` reads the resolved character. `discrepancies()` loses three of its four cases — they become unreachable — and keeps spell slots. |
| **`src/lib/canon/personalise.ts`** *(new)* | Substitutes his numbers into canon's advice. One function, tiny vocabulary. |
| **`src/canon/spells.json`, `feats.json`** | 9 advice strings get placeholders instead of a baked Charisma 18. |
| **`src/lib/turn/options.ts`** | **NOT TOUCHED.** See below — this constrains the whole design. |

### The constraint that shapes everything: `options.ts` is pinned

`overlay.test.ts` case 15 asserts `options.ts` is byte-identical to `main`. It reads
`character.spellSaveDC` in four places and prints `` `DC ${character.spellSaveDC}` ``
directly. So the design must satisfy: **the property `character.spellSaveDC` still
exists, is still a plain `number`, and is now always right.** Any design that removes
the property, or makes it nullable, breaks a pinned file.

That is a good constraint, not an obstacle. It forces the fix into the *producer*
rather than scattering guards across 14 consumers.

## Data — the type split

```
CharacterBase    what is written to disk. Contains ability scores and level.
                 Contains NO spellSaveDC, spellAttackBonus or proficiencyBonus.

DerivedNumbers   proficiencyBonus · spellSaveDC · spellAttackBonus · maxPreparedSpells

Character        = CharacterBase & DerivedNumbers
                 what every component and every lib function already takes.
                 Produced ONLY by resolve().
```

Every one of the ~200 existing `character.spellSaveDC` style reads keeps compiling and
starts being correct. Nothing threads a new prop. `options.ts` stays byte-identical.

**The structural guarantee is the name.** The stale field names cease to exist in
anything that touches storage. `grep spellSaveDC src/lib/character.ts` returns only the
migration that removes it. There is no stale copy to read because there is no stale
copy.

### The open-world escape hatch, named honestly

Three formulas are universal (proficiency from level; save DC and spell attack from
proficiency + casting ability). But `CASTING_ABILITY` has no entry for, say, a Fighter —
and for that character the app genuinely has nothing to say.

Rather than invent a number or return `null` (which would print "DC null" through the
pinned file), `CharacterBase` carries **explicitly-named overrides**:

```
spellSaveDCOverride?: number
spellAttackBonusOverride?: number
```

`resolve()` prefers the rule and falls back to the override. The migration moves an old
stored `spellSaveDC` into `spellSaveDCOverride` **only if the class has no casting
ability**; for a caster the old value is discarded, because it is the stale number this
whole phase exists to kill.

The point of the rename: a field called `spellSaveDCOverride` cannot be mistaken for the
answer. Today's `spellSaveDC` on disk is read by fourteen places that each believe it is
the truth.

### `paladinResources` — half derived, half live play

You cannot `Omit` half an object. `layOnHands.max`, `channelDivinity.max` and
`auraRange` come from the canon table; `.current` is what he has spent. So `resolve()`
overwrites the maxes in place and **clamps `current` down to the new max, never up.**
Levelling from 8 to 9 raises the Lay on Hands pool from 40 to 45 and leaves his spent
20 exactly where it is. A level-up must never silently refill a resource.

### The table that already exists

`src/canon/paladin-progression.json` — `"ruleset": "D&D 2024 (5.5e) Player's Handbook"`,
20 level rows, each with `proficiencyBonus`, `preparedSpells`, `spellSlots`,
`layOnHandsPool`, `channelDivinityUses`. Today production reads only the feature
descriptions out of it (`src/canon/index.ts:17`). `derive.ts` reads the `levels[]` rows.

**It is the only class progression in canon.** Open-world rule, same as `lookup.ts`: a
class with no table gets no derivation for the table-only numbers
(`maxPreparedSpells`, the paladin pools) and keeps its stored value. Silence means "I
have nothing to add", never "you are wrong".

**Spell slots stay stored and stay reported.** Product decision, re-affirmed here:
`derive.ts` will not touch them.

## Flow

```
BOOT / SWITCH
  localStorage → normalizeCharacter → migrate stale keys → resolve() → Character

ANY EDIT (Prep score · Level Up · import · long rest · spend)
  component builds { ...character, level: n+1 }        ← may carry stale derived values
      ↓
  saveCharacter(char)
      ├─ resolve()            recompute every derived number from scores + level
      ├─ strip()              drop the derived keys — they never reach disk
      ├─ write localStorage
      └─ return the RESOLVED character
      ↓
  caller sets React state from the RETURNED value, not from its argument
```

That last line is the whole propagation fix. `useCharacter.update` currently does
`setCharacterState(char)` — it puts back exactly what the component handed it, stale
fields and all. Taking the return value instead means a stale spread cannot survive even
one render.

**Why the storage boundary and not the hook.** `useCharacter.ts:23-32` records that
*"three components and one migration call `saveCharacter` without ever passing through
here"* — a previous bug caused by assuming the hook was the only writer. It is not.
`saveCharacter` / `loadCharacter` are. The enforcement goes where the writes actually
converge.

## Canon prose — the personalisation seam

**One seam.** `detail.ts:284` is the only place spell tactics enter the app
(`tactics: spell ? splitTactics(spell.tactics) : []`), and that function already holds
the character — it calls `withSaveDC(facts, character)` twelve lines away. The feat
`paladinNote` seam is its equivalent and gets the same treatment.

**Placeholders in the data, not pattern-matching on the screen.** Canon's advice becomes:

```
"At level {level} with Charisma {CHA} your DC is {saveDC}."
```

Vocabulary, deliberately tiny: `{level}` `{CHA}` `{CHAmod}` `{saveDC}` `{spellAttack}`
`{prof}`.

The rejected alternative was rewriting numbers at render time by matching shapes —
finding "Charisma 18" and recomputing the "+4" near it. That requires guessing which
`+4` is the Charisma modifier and which is something else, and a wrong guess produces a
confidently wrong number with no way to notice. Placeholders make the intent explicit
and auditable.

**This makes canon *more* character-agnostic, not less.** The rule was that canon prose
is rendered verbatim and contains no character. A baked "Charisma 18" violates that rule
today — it has one specific character's old sheet welded into it. A `{CHA}` slot has
none; the renderer supplies one.

**`rawText` is never touched.** Only the advice fields — `tactics`, `paladinNote`.

**Two safety rules:**

1. **Feat prerequisites are off limits.** `feats.json` contains three strings like
   `"Level 4+, Charisma 13+"`. Those are entry requirements, not his numbers. A blanket
   find-and-replace over "Charisma \d+" would corrupt them into nonsense. The
   substitution touches only `tactics` and `paladinNote`; a test asserts `prerequisite`
   still reads `Charisma 13+`.
2. **Unresolvable placeholder → drop the whole segment.** If a character has no
   Charisma-based casting, `{saveDC}` has no answer. The existing open-world rule
   applies unchanged: *drop whole segments, never characters, never an ellipsis.* A
   half-sentence is worse than a missing one.

## Endpoints

None. Local-first app, no server.

## External

None. No new dependency, no API, no env var.

## What this deliberately does not do

- Apply `CharacterFeat.abilityIncrease` (recorded and ignored today — a real bug,
  logged in `_audit.md`, out of scope).
- Touch armour class, max hit points, weapon magic bonuses or homebrew pools.
- Auto-correct spell slots.
- Add a "recalculate my sheet" button. If one were ever needed, the design would have
  failed.

## Least confident calls

1. **Retiring three of the four `discrepancies()` cases.** `vitals.ts:38-41` chose
   stored-plus-report on purpose. The premise was that a stored value might encode
   something real the app cannot see. For a caster's save DC it does not — it encodes an
   old Charisma. The override field preserves the escape hatch for the case where the
   premise *is* true. Still worth challenging now rather than after it is built.
2. **`saveCharacter` gaining a resolve step and a new return value.** It already carries
   stale-write detection and a failure announcer; this makes a load-bearing function
   heavier. The alternative — resolving in `useCharacter` — is provably wrong, by that
   function's own comment.
3. **Editing canon JSON at all.** These files have been treated as inviolable. The
   argument is that a baked "Charisma 18" is already a violation of what makes them
   inviolable. If that argument is wrong, the whole prose half of this phase changes
   shape.
