# Program Design: Table Truth (Codex Phase 1)

The decisions that would otherwise get made silently, mid-implementation.
Read `02-architecture.md` first — including its **amendment** at §Fit seam 2.

---

## Files

### New — the canon layer

| File | Why it lives there |
|---|---|
| `src/canon/*.json` (13 files) | The canon package's `data/` copied **byte-for-byte**. Verbatim so it stays diffable against what Marcus was handed — that is what makes "the JSON wins" auditable. |
| `src/canon/README.md` | Source, build date, the precedence rule, and the standing instruction: **never hand-edit these; replace the whole file from a new canon package.** |
| `src/canon/index.ts` | The only module that `import`s the JSON. Types the raw shapes and re-exports frozen arrays. Nothing else in `src/` touches a `.json` path. |
| `src/lib/canon/types.ts` | The canon record interfaces (`CanonSpell`, `CanonFeature`, `CanonErratum`, …). Mirrors the JSON exactly; no invention. |
| `src/lib/canon/lookup.ts` | Name normalisation + the by-name indexes. Pure, no React, no character knowledge. |
| `src/lib/canon/format.ts` | Canon fields → the two display strings (mechanics row line, stat-block rows). The only place a `·`-joined line is authored. |
| `src/lib/canon/errata.ts` | Errata lookup + the player's per-erratum reading choice. Owns `codex-errata-${id}`. |
| `src/lib/canon/validate.test.ts` | Canon's own `VAL-01`..`VAL-15` rules run as assertions against the app's derived numbers. This is the answer to "are the rules accurate?" |

### Changed — the engine seam

| File | Change |
|---|---|
| `src/lib/turn/types.ts` | `TurnVitals` +4 optional fields. `TurnOption` +`canonId?`, +`provenance?`. Additive only. |
| `src/lib/turn/compose.ts` | New `overlayCanon()` step between `categorizeTurnOptions()` (`:152`) and `build()` (`:159`); vitals block (`:369-376`) widened. |
| `src/lib/turn/options.ts` | **NOT TOUCHED.** Pinned characterization record (`:155-158`). Its 80-char truncation stays, because `TurnSummary.tsx` still consumes it. |

### Changed — the surface

| File | Change |
|---|---|
| `src/components/CombatHelper.tsx` | Splits into a shell + `CombatHelperInner`. Gains the vitals band, the reactions band, one ranked list; loses "Actions Reference". |
| `src/components/combat/VitalsBand.tsx` | **New.** Absorbs the number layout from the unimported `combat/StatsBar.tsx:254-279` rather than rewriting it. |
| `src/components/combat/TurnOptionRow.tsx` | **New.** The two-line row. One component, used by both the turn list and the reactions band. |
| `src/components/combat/OptionDetailSheet.tsx` | **New.** The four fixed bands + roll strip + live rule box + folded tactics + errata flag. |
| `src/components/HPTracker.tsx` | Conditions block (`:477-547`) wrapped in the existing `useCollapsible`. ~6 lines. |
| `src/components/TurnDeck.tsx` | Gains a minimised spine. The one place V-6 is overridden. |
| `src/components/turn/TurnLive.tsx` | Stops owning `CombatProvider`; it moves up. `?d=1` keeps working. |
| `src/lib/ai.ts` | Model discovery + self-healing resolution. |
| `src/components/Settings.tsx`, `CharacterSetup.tsx` | Model dropdowns read the live list instead of a frozen array. |
| `vite.config.ts` | `canon` added to `manualChunks`; first bundle-size budget. |

### Not created

No new storage module, no migration, no `schemaVersion`, no server, no build-time codegen.

---

## Types & signatures

### Canon records — mirror the JSON, invent nothing

```ts
// src/lib/canon/types.ts
export interface CanonComponents {
  v: boolean; s: boolean; m: boolean
  materialText: string | null
  materialCostGp: number
  materialConsumed: boolean
  focusAllowed: boolean
}

export interface CanonDamage { dice: string; type: string; bonus?: string }
export interface CanonSave   { ability: string; effect: string }

export interface CanonSpell {
  id: string                     // kebab-case, e.g. 'divine-smite'
  name: string
  level: number
  school: string
  castingTime: string
  castingTimeType: string        // 'bonus_action' | 'action' | 'reaction' | …
  trigger: string | null         // e.g. 'melee_hit'
  range: string
  components: CanonComponents
  duration: string
  concentration: boolean
  ritual: boolean
  source: string                 // 'PHB 2024'
  coreList: boolean
  damage: CanonDamage | null
  healing: CanonDamage | null
  save: CanonSave | null
  attackRoll: string | null
  higherLevel: string | null
  onPaladinList: boolean
  grantedBy: string | null
  summary: string                // the prose. Mean 230 chars — DETAIL SHEET ONLY.
  tactics: string                // long. Folded band only.
  unlocksAtPaladinLevel: number  // ← the RULE. Safe to read.
  castableAtLevel7: boolean      // ← a level-7 SNAPSHOT. Never read. See below.
  lockedForMarcus: boolean       // ← ditto.
  alwaysPrepared: boolean
  countsAgainstPreparedLimit: boolean
  availability: string
}

export interface CanonErratum {
  id: string                     // 'HEARTH-01'
  severity: 'BREAKING' | 'HIGH' | 'MEDIUM' | 'LOW'
  feature: string                // 'Smoldering Smite (level 15)'
  problem: string
  cause: string
  recommendedFix: string
  narrowerAlternative: string
  appAction: string
}

export type ErratumReading = 'recommended' | 'narrower' | 'asWritten'
```

**`castableAtLevel7` and `lockedForMarcus` are never read.** They are canon's own answers
*for a level-7 character*, and the app runs Nix at level 8. A lint rule in
`canon/validate.test.ts` asserts neither identifier appears anywhere in `src/` outside
`types.ts`. Availability is always recomputed:

```ts
// src/lib/canon/lookup.ts
export function normalizeName(raw: string): string
// lowercase, strip non-alphanumerics, collapse whitespace.
// Canon cross-references use NAMES; only the 12 errata carry ids.

export function spellByName(name: string): CanonSpell | undefined
export function featureByName(name: string): CanonFeature | undefined
export function isUnlocked(spell: CanonSpell, characterLevel: number): boolean
//   → spell.unlocksAtPaladinLevel <= characterLevel        ← the rule, recomputed
```

### Formatting — canon fields → the row line

```ts
// src/lib/canon/format.ts

/** The row's line 2. Structured facts only, ' · '-joined, never prose.
 *  Order is FIXED so the eye learns it: to-hit → dice → save → area → range → rider.
 *  Every segment is omitted when its field is null; nothing is invented and
 *  nothing is truncated, because no segment is a sentence. */
export function mechanicsLine(spell: CanonSpell, ctx: CasterContext): string

/** The detail sheet's stat block, as ordered label/value pairs. */
export function statBlock(spell: CanonSpell): Array<{ label: string; value: string }>

export interface CasterContext {
  spellSaveDC: number        // from the CHARACTER — canon's is the string
  spellAttackBonus: number   //   "8 + 3 + Charisma modifier" and cannot be used
  characterLevel: number
  abilityMod: number
}
```

Worked example, Divine Smite → `2d8 Radiant · +1d8 Fiend/Undead` — every character of
which comes from `damage.dice`, `damage.type`, `damage.bonus`. No author, no clamp.

### The overlay — the one new step in the engine

```ts
// src/lib/turn/compose.ts  (new, unexported except for its test)

/** Rewrites an ActionOption's display strings from canon, in place of the
 *  hand-assembled ones. Runs AFTER categorizeTurnOptions() and BEFORE
 *  detailOf(), which is the seam that already owns the joined row (see the
 *  comment at compose.ts:421-424). options.ts itself is never edited. */
function overlayCanon(option: ActionOption, character: Character): ActionOption
```

Contract, in four lines:

1. **No canon match → return the option unchanged.** The open-world rule. Homebrew keeps
   its words; the row still renders; `provenance: 'sheet'`.
2. **Match → replace `mechanicsLine` and `effectsLine` from canon fields**, set
   `canonId`, set `provenance: 'canon'`. `summary` is left alone — it feeds `rank.ts`'s
   `prose` (`compose.ts:242`) and riders (`:347`), not the row.
3. **Fix the two pinned bugs here, not in `options.ts`:** an `Aura…` feature with a canon
   `castingTimeType` is filed by that field, not by its name; a pool with `points`
   semantics is priced in points, not "uses".
4. **Never throws.** A malformed canon record degrades to case 1.

### Type widenings — additive, all optional

```ts
// src/lib/turn/types.ts
export interface TurnVitals {
  hp: number; maxHp: number; tempHp: number; ac: number
  bloodied: boolean; bloodiedAt: number
  saveDC?: number         // character.spellSaveDC
  spellAttack?: number    // character.spellAttackBonus
  proficiency?: number    // character.proficiencyBonus
  initiativeMod?: number  // DERIVED from DEX. Not stored. See least-confident #3.
}

export interface TurnOption {
  /* …unchanged… */
  canonId?: string
  provenance?: 'canon' | 'sheet'
}
```

`source?: string` is left alone — it already means "which feature/book granted this"
(`types.ts:110`, assigned at `compose.ts:224`).

### Errata

```ts
// src/lib/canon/errata.ts
export function errataFor(featureName: string): CanonErratum[]
export function loadReadings(characterId: string): Record<string, ErratumReading>
export function setReading(characterId: string, id: string, r: ErratumReading): void
export function readingFor(characterId: string, id: string): ErratumReading
//   → absent means 'recommended'. Gate 1 decision 3: default to the fix, flag it visibly.

/** The exact sentence the player takes to the DM. Assembled from the erratum's
 *  own `problem` + `recommendedFix`; never generated by a model. */
export function dmWording(e: CanonErratum): string
```

### Gemini

```ts
// src/lib/ai.ts
interface ModelCache { fetchedAt: number; models: string[] }   // key: codex-ai-models

/** GET /v1beta/models, keep those whose supportedGenerationMethods
 *  includes 'generateContent'. Throws on network/auth failure. */
export async function listGeminiModels(apiKey: string): Promise<string[]>

/** Configured id if the live list still has it; otherwise the best match by
 *  PATTERN, never by a hardcoded id: newest *flash → *flash-lite → *pro. */
export async function resolveGeminiModel(cfg: AIConfig): Promise<string>

/** Google's 404 body names its own replacement ("Please update your code to
 *  use models/X"). Parsed as the first-choice hint. */
function replacementFromError(body: string): string | null
```

Retry contract: **once**, only on a 404 whose body matches `/no longer available/i`, and
the winning id is persisted to `codex-ai-config` with a one-line user-visible notice. A
second 404 surfaces the error — no loops.

### The surface

```tsx
// CombatHelper.tsx becomes a shell — this is what removes the two-writers hazard
export function CombatHelper(props: CombatHelperProps) // renders:
//   <CombatProvider key={character.id} …><CombatHelperInner {...props} /></CombatProvider>

// src/components/combat/TurnOptionRow.tsx
interface TurnOptionRowProps { option: TurnOption; onOpen: (o: TurnOption) => void }
//   Line 1: name · economy badge · price     Line 2: option.detail · '▸'
//   No prose. No ellipsis. Exactly two lines. Affordance is a chevron — words
//   cost ~100px and wrapped the first row to three lines (measured, Gate 1).

// src/components/TurnDeck.tsx
interface TurnDeckProps { /* …unchanged… */ }
// + const deck = useCollapsible('turn-deck', character.id, true)
// Collapsed spine KEEPS the four economy state dots and the slot pips.
// Only labels, Lay on Hands and Channel Divinity fold. V-6 override, scoped.
```

---

## Call stack

### Cold render

```
App.tsx (tab 'combat')
 └ CombatHelper
    └ CombatProvider  key={character.id}
       │ loadCombatState('codex-combat-'+id)  ·  loadLog(id)
       └ composeTurn({ character, combat, log })          compose.ts:104
          ├ categorizeTurnOptions(character, {includeUnaffordable:true})   :152   [UNCHANGED]
          ├ overlayCanon(option, character)                               [NEW]
          │    └ spellByName(normalizeName(o.name))       lookup.ts
          │    └ mechanicsLine(canon, casterContext)      format.ts
          ├ build(option, slot) → TurnOption              :159
          │    └ detailOf(option, cost.label)             :450   [UNCHANGED — already the row line]
          ├ rank / contention / mutex                     [UNCHANGED]
          └ vitals { …, saveDC, spellAttack, proficiency, initiativeMod }  :369  [WIDENED]
    └ CombatHelperInner   →  useCombat()
       ├ <VitalsBand vitals={turn.vitals} />
       ├ <HPTracker />                       conditions now collapsible
       ├ Your Turn       turn.ranked.filter(o => o.cost.slot !== 'reaction')
       ├ Your Reactions  turn.ranked.filter(o => o.cost.slot === 'reaction')
       └ <TurnDeck />                        minimisable
```

### Row tap

```
TurnOptionRow.onOpen(option)
 └ OptionDetailSheet
    ├ spellByName / featureByName → statBlock()       band 1  stat block
    ├ canon.summary                                   band 2  what it does  ← the prose
    ├ option.rollNotation → existing dice roller      band 3  roll strip
    ├ turn.economy.spellSlotUsedThisTurn              band 3b live rule box
    ├ errataFor(name) → readingFor() → dmWording()    band 3c errata flag
    └ canon.tactics                                   band 4  how to use it — FOLDED
```

Bands 1, 2 and 4 come from a file shipped in the bundle. **No model call, no network.**

### Gemini 404

```
ask(prompt) → resolveGeminiModel(cfg)
  └ cache fresh? use it : listGeminiModels(key)
POST …:generateContent
  └ 404 /no longer available/
       ├ replacementFromError(body)   → first choice
       ├ listGeminiModels(key)        → refresh cache
       ├ resolveGeminiModel()         → by pattern
       ├ retry ONCE
       └ persist + notify
```

---

## Test plan

Names first, assertions stated, none of them exist yet. Every one of these fails against
today's code.

### `src/lib/canon/lookup.test.ts`
1. `normalizeName` matches "Faerie Fire" / "faerie fire" / "Faerie  Fire!" to one key.
2. All 71 canon spells have unique normalised names — **no silent collisions**.
3. `isUnlocked(divineSmite, 8)` is true; `isUnlocked(<level-9 spell>, 8)` is false.
4. **`castableAtLevel7` and `lockedForMarcus` appear nowhere in `src/` except `types.ts`** —
   greps the tree. This is the level-7/level-8 trap, made unpassable rather than remembered.

### `src/lib/canon/format.test.ts`
5. Divine Smite's row line is exactly `2d8 Radiant · +1d8 Fiend/Undead`.
6. A save spell renders `DC {n} {ABILITY}` using the **character's** DC, never canon's
   `"8 + 3 + Charisma modifier"` string.
7. **No row line contains `…`, `...`, or ends mid-word** — asserted across all 71 spells.
8. **No row line exceeds the measured 390px budget** — asserted across all 71 spells as a
   character-count proxy. This is the promise "always two lines" made enforceable.
9. A spell with `damage: null, save: null, attackRoll: null` still produces a non-empty line
   (falls back to casting time + range), never an empty row.

### `src/lib/turn/overlay.test.ts`
10. A sheet spell with **no** canon entry keeps its own `description` and gets
    `provenance: 'sheet'` — the open-world rule, pinned.
11. A canon match sets `canonId` and replaces `mechanicsLine`.
12. A malformed canon record degrades to case 10 and does not throw.
13. `Aura of Solace` is categorised by its `castingTimeType`, **not** by its name starting
    with "Aura" — the first pinned bug, fixed in the overlay, `options.ts` untouched.
14. A 40-point pool prices as points, not "40 uses" — the second pinned bug.
15. **`options.ts` is byte-identical to `main`** — a guard test, so a future session cannot
    quietly "improve" the characterization record.

### `src/lib/canon/validate.test.ts`
16. Each of canon's `VAL-01`..`VAL-15` runs as a named assertion against the app's derived
    numbers. Any that cannot be mechanised is skipped **with its id and reason printed**,
    so the gap is visible rather than absent.
17. Only one spell slot may be expended per turn (2024) — canon's own headline rule.
18. Divine Smite is a level 1 Evocation spell cast as a **Bonus Action**, not a class
    feature and not a Magic action.

### `src/lib/ai.test.ts` (additions)
19. A 404 body naming a replacement triggers exactly **one** retry with that model.
20. A second 404 surfaces the error and does **not** loop.
21. `resolveGeminiModel` never returns a hardcoded id when the live list is available.
22. **No `gemini-2.0-flash` literal remains in `src/`** — greps the tree.

### `src/lib/turn/compose.equivalence.test.ts` (existing, extended)
23. Widened `TurnVitals` does not change any existing assertion.
24. `vitals.saveDC` equals `character.spellSaveDC`.

### Storage safety — the one that protects real data
25. **`codex-combat-${id}` is byte-identical before and after a full render** of the new
    surface with no user interaction. Proves the read-only tracer bullet does not write.
26. Loading a character, rendering, and unmounting leaves `codex-character-${id}`
    byte-identical. Canon never writes back.

### Bundle
27. `dist/assets` total stays under the declared budget; the `canon` chunk is separate from
    the app chunk.

---

## Least confident decisions

**1. Does `CombatProvider`'s reducer cover everything `CombatHelper.setCombatState` does
today?** The biggest unknown in the phase. If it does not, moving the write path grows from
one slice to several. Mitigation: the tracer bullet mounts the provider **read-only**, and
test 25 proves it writes nothing. Worth challenging now: *should the write path move at all
in Phase 1, or should Phase 1 ship read-only and leave `CombatHelper` as the writer?*

**2. Matching by normalised name.** Canon's own cross-references use names, so this follows
canon. But a rename on the sheet silently drops to `provenance: 'sheet'` — the row still
works, quietly, with worse text. Test 2 catches canon-internal collisions; nothing catches a
user typo. Alternative considered and rejected: storing `canonId` on the character — that is
a schema change to real data, which is exactly the risk this phase is built to avoid.
**Mitigation to decide: report the unmatched count out loud on first run** rather than let
it be invisible.

**3. Initiative.** Showing the derived **modifier** costs nothing and stores nothing.
Showing the **rolled** value needs a field on `CombatState` and the 332 unimported lines of
`InitiativeTracker.tsx`. `codex-v1` calls wiring it "the cheapest large win in the app" —
but it is a separate concern from "the definitions trail off", and it is the single easiest
thing to cut if Phase 1 runs long.

**4. Removing "Actions Reference".** The prime law forbids reducing capability. I believe
`SmartActionsPanel` is fully subsumed by the ranked list, but *believe* is not *proved*.
Its unique capabilities get enumerated and pinned **before** it is removed, and if any
survives, it stays. `ActionMenu`'s roll-from-the-sheet is already known to be a real
capability and moves into the detail sheet's roll strip.

**5. The row line budget (test 8) is a character count, not a real measurement.** Fonts do
not measure in characters. A Playwright pass over all 71 rows would be truthful; a character
proxy is cheap and runs in CI. Proposal: proxy in Vitest, one Playwright audit at the end of
the phase against the real font — reusing `reference/shoot-app.mjs`, not a new harness.

**6. Errata default.** Marcus chose "default to the fix". That means the app runs a house
ruling his DM has not agreed to yet, on 12 features. The flag is always visible and the DM
wording is one tap away, which is the mitigation — but it is worth him knowing plainly that
the app will be playing the fixed version from the moment this ships.
