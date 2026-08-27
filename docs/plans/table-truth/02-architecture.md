# Architecture: Table Truth (Codex Phase 1)

Written after reading the code, not from memory. Every claim below carries a `file:line`.
Governing law, inherited and still binding: `V0.9-CAPABILITY-BASELINE.md` — never reduce
capability in pursuit of elegance.

---

## The finding that shapes everything

**The engine Marcus is asking for already exists, is tested, and is switched off.**

`src/lib/turn/` is ~130KB of finished code behind 221+ green tests. Its output type
`ComposedTurn` (`src/lib/turn/types.ts`) already models:

| Marcus asked for | Already in `ComposedTurn` |
|---|---|
| "show me my reaction options" | `yourTurn: boolean` — when false, the reaction list *is* the list |
| one slot per turn (2024) | `economy.spellSlotUsedThisTurn` |
| why is this greyed out | `TurnOption.blockedReason` |
| competing choices | `MutexGroup[]` with `reason: 'economy' \| 'spellSlot' \| 'both' \| 'resource'` |
| homebrew that still works | `TurnOption.homebrew`, `rider`, `synthetic` |

It renders through `TurnLive → TurnScreenD`, reachable **only via `?d=1`**
(`src/App.tsx:44-49`). The screen that loads at the table is still `CombatHelper.tsx`
(~1,746 LOC, `App.tsx:193-201`).

So Phase 1 is **integration plus a data layer**, not invention. The three things that are
genuinely new are: canon text, errata flags, and the two minimise controls.

---

## Fit

Five seams. Nothing else in the app is touched.

**1. A new canon layer — `src/canon/` (data) + `src/lib/canon/` (access).**
Pure, dependency-free, no React. Read by the turn engine and by the detail sheet.
Nothing writes to it.

**2. `src/lib/turn/compose.ts` — canon is overlaid at the compose seam.**

> **AMENDED 2026-08-26, during Gate 3, before any code was written.** This seam originally
> read *"`options.ts` learns to ask canon first"* and proposed deleting `spellSummary()` /
> `featureSummary()` (`options.ts:77-89`). **That was wrong.** Reading the file properly
> shows `options.ts:155-158` is not merely "don't improve casually" — it is a
> **characterization record**: *"It is a record of what the app does TODAY, bugs included…
> Do not improve anything here — its whole value is being an exact record."* And
> `compose.ts:421-424` states the precedent explicitly: *"The dedupe lives HERE and not in
> options.ts on purpose: options.ts is pinned byte-identical to the legacy TurnSummary code
> it was lifted from."* Editing it would destroy the net that proves the new screen behaves
> like the old one. The amendment makes the design **smaller and safer**, not larger.

`options.ts` is therefore **not touched at all**. Its 80-char truncation stays where it is,
because the V0.9 screen (`TurnSummary.tsx`) still consumes it and must keep behaving
identically. Canon is overlaid one level up, at the same seam that already owns the join:

- `compose.ts:152` calls `categorizeTurnOptions()` → raw `ActionOption[]` (unchanged).
- A new overlay step rewrites `mechanicsLine` / `effectsLine` from canon **fields** before
  `detailOf()` runs, and attaches `canonId`.
- `detailOf()` (`compose.ts:450-477`) already produces the deduped `·`-joined line that
  Marcus's Gate 1 decision asks for. `TurnOption.detail` **is** the mechanics row line.
  Almost nothing new is needed to satisfy "numbers only in the row".

The two pinned bugs in `options.ts` — `Aura…` filed as a passive, a 40-point pool described
as "40 uses" — are likewise **not** fixed in that file. They are corrected in the overlay,
where canon supplies the structure that made them guesses, leaving the characterization
record intact.

**3. `src/lib/turn/compose.ts` — `TurnVitals` widens.**
Four optional fields added: `saveDC`, `spellAttack`, `proficiency`, `initiativeMod`.
Optional and additive, so existing assertions keep passing; new assertions cover the values.

**4. `src/components/CombatHelper.tsx` — the surface.**
Gains `CombatProvider` above it, loses three competing option surfaces in favour of one
ranked list, gains a reactions band and a vitals band, and gains two collapse controls.
Detailed below under **Flow**.

**5. `src/lib/ai.ts` — Gemini stops hardcoding model IDs.**
Self-healing resolution. No other AI behaviour changes.

**Explicitly not touched:** `Grimoire`, `Roleplay`, `CharacterSetup`'s forging flow,
the Vault boundary, campaign memory fields (frozen), any storage key's *shape*.

---

## Endpoints

**None.** The Codex has no server. One new outbound HTTP call is made to a third party —
see **External**.

---

## Data

### Nothing on disk changes shape. This is the load-bearing property of the phase.

Nix's real character lives in Marcus's browser localStorage, not in this repo. Therefore:

- **No field is added to `Character`.** No `version`, no `schemaVersion`, no canon ids.
- **No existing localStorage key changes shape.** `normalizeCharacter()`
  (`src/lib/character.ts:771`) — the one migration hook every door goes through — is not
  modified.
- **The canon merge is a read-time projection, never written back.** Canon text is joined
  onto a character at render time and discarded. If canon were deleted tomorrow, the sheet
  would be byte-identical.

That means Phase 1 ships with **zero migration risk**. It is worth saying plainly because
the alternative — folding canon into the stored character — is the obvious design and it
is the one that could destroy real data.

### Canon on disk

The 13 JSON files are copied into `src/canon/` **byte-for-byte verbatim** from the canon
package. Not transformed, not reformatted, not converted to TypeScript. The package's own
precedence rule reads *"Where a `.md` file and a `.json` file disagree, the JSON wins"* —
that rule is only auditable if the file in the repo is diffable against the file Marcus was
handed. A `README` in `src/canon/` records the source and the build date.

**Loaded eagerly and whole. No lazy split.** The measured case for splitting was that
`tactics` prose is 89,584 chars — 49% of `spells.json`. The measured case *against* it is
stronger: `vite.config.ts:32-76` precaches all of `dist/assets/*`, and lazy chunks land in
`dist/assets/`. **A lazy split therefore saves zero bytes over the wire** — the service
worker downloads it on install either way. It would only defer a parse of ~340KB of JSON,
which is single-digit milliseconds, in exchange for making the file non-verbatim. Not worth
it.

What we do instead: add `canon` to `manualChunks` (`vite.config.ts:93-98`) so it is a
separate content-hashed chunk. App code changes then ship without re-downloading 340KB.
And add the app's **first bundle-size budget** — a build-time assertion — so this cannot
silently grow.

### New localStorage keys (both additive, both safe to be absent)

| Key | Shape | Default when absent |
|---|---|---|
| `codex-errata-${characterId}` | `{ [errataId: string]: 'recommended' \| 'narrower' \| 'asWritten' }` | `'recommended'` for every errata — Marcus's Gate 1 decision 3 |
| `codex-ai-models` | `{ fetchedAt: number, models: string[] }` | refetch |

### Existing keys reused, unchanged in shape

| Key | Change |
|---|---|
| `codex-ui-${characterId}` | Two new section ids in the existing `sectionId → boolean` map (`src/hooks/useCollapsible.ts:4,28`). Nothing else. |
| `codex-combat-${characterId}` | **Ownership moves** (see Flow, risk 1). Shape identical. |
| `codex-ai-config` | `geminiModel` now holds a *resolved* id instead of a hardcoded one. Same string field. |

### The canon ↔ character join

**Canon is the rules authority. The stored character is the sheet authority.**

- Canon supplies: description, summary, tactics, dice, damage type, save ability + effect,
  range, components, duration, concentration, ritual, higher-level, source.
- The character supplies: what is *his* — prepared flags, slot counts, resource pools, HP,
  conditions, homebrew notes, custom content.

Matched by **normalised name** (lowercase, punctuation and whitespace stripped), because
canon's own cross-references use names, not ids — only the 12 errata carry ids
(`HEARTH-01`..`HEARTH-12`).

**The open-world rule holds, verbatim from V1:** *"The rules engine never recognises content
by name. It reads declared structure."* The name match is a *text lookup*, never a
capability gate. A spell on the sheet with no canon entry is **not dropped and not blanked**
— it keeps its own `description`, renders with everything the sheet knows, and is tagged
`provenance: 'sheet'`. Canon matches are tagged `provenance: 'canon'`. Homebrew keeps its
words even where the engine loses automation.

*(`provenance`, not `source`: `TurnOption.source` already exists at `types.ts:110` and holds
the granting feature's book/subclass, e.g. "Oath of the Hearth". Reusing it would overload
one field with two meanings.)*

### The level-7 / level-8 discrepancy

`character-marcus.json` is a **level 7** snapshot; the app's fixtures run Nix at level 8.
Canon carries three per-spell gating fields. Only one of them is safe to read directly:

- `unlocksAtPaladinLevel` — **a rule.** Compare against the character's actual level. Use it.
- `castableAtLevel7`, `lockedForMarcus` — **level-7 snapshots of that rule.** They would be
  wrong at level 8. Never read them; recompute from `unlocksAtPaladinLevel`.

Also: `character-marcus.json` has `abilityScores.needsInput === true` — canon does **not**
know Marcus's real ability scores, and its `spellSaveDC` is the string
`"8 + 3 + Charisma modifier"`. Save DC and spell attack therefore come from the stored
character (`Character.spellSaveDC`, `.spellAttackBonus`), not from canon. Canon's 15
`validationRules` (`VAL-01`..`VAL-15`) become a real Vitest file that asserts the app's
derived numbers against canon's stated rules — that is how "are the rules accurate?" gets
an answer instead of a promise.

---

## Flow

### A. Cold render of the Play tab

```
App.tsx (tab === 'combat')
  └ CombatHelper                     ← becomes a thin shell
      └ CombatProvider               ← MOVED here from TurnLive; key={character.id}
          │   loads codex-combat-${id} + the event log
          │   calls composeTurn({ character, combat, log })   (CombatProvider.tsx:194)
          │     └ turn/options.ts  ── asks canon for text/dice/save/range
          │     └ turn/rank.ts, contention.ts, reduce.ts  (unchanged)
          │   exposes CombatApi { turn, take, endTurn, undoLast, refusal, … }
          └ CombatHelperInner        ← today's body, now reading useCombat()
              ├ Vitals band      HP + Save DC · AC · Init · Prof · Sp Atk   [NEW]
              ├ Conditions       collapsible, header states "none"          [CHANGED]
              ├ Your Turn        ONE ranked list from turn.ranked           [REPLACES 3]
              ├ Your Reactions   from turn.ranked where cost.slot==='reaction' [NEW]
              ├ …existing collapsibles (Damage Log, AI Advisor, Rest)
              └ TurnDeck         now minimisable                            [CHANGED]
```

### B. Tapping an option → the detail sheet

```
row tap → resolveOption(name)
            ├ canon stat block   → the four fixed bands (mockup 02b)
            ├ errata for this id → flag band + the three readings + DM wording
            ├ turn.economy       → the live rule box ("you have not spent a slot this turn")
            └ tactics            → "How to use it", folded by default
        → "Spend" dispatches the existing engine verb; it does not invent a mutation
```

Nothing in that sheet is generated at the table. It works with the AI off and the wifi off.

### C. Gemini, when the model 404s

```
ask() → resolveModel(config)
          └ cached list fresh?  → use it
          └ stale/absent        → GET /v1beta/models, keep those whose
                                  supportedGenerationMethods includes generateContent
      → POST …/models/${model}:generateContent
      → 404 "no longer available"
          ├ parse the replacement Google names in its own body ("use models/X")
          ├ refetch the list, re-resolve by PATTERN not by id
          │     preference order: newest *flash → *flash-lite → *pro
          ├ retry ONCE
          └ persist the winner to codex-ai-config + one-line notice to the user
```

The four hardcoded `gemini-2.0-flash` literals (`ai.ts:52`, `:189`, `:531`, `:676`) and the
two UI copies (`Settings.tsx:66`, `CharacterSetup.tsx:185`) are removed. The model dropdowns
in Settings and CharacterSetup populate from the live list instead of a frozen array. Ollama
support stays exactly as it is (`ai.ts:363-420`, `:610-635`) — including the existing HTTPS
block message at `ai.ts:161-165`, which is *why* Gemini has to be the one that works.

---

## The three decisions this gate has to make explicitly

### 1. Two writers to one localStorage key — the real risk

`CombatHelper` owns `combatState` via `useState` + `saveCombatState()`
(`CombatHelper.tsx:914-952`). `CombatProvider` **also** owns combat state and persists to
the same key `codex-combat-${characterId}` (`CombatProvider.tsx:149`). Mounting one inside
the other naively gives two writers to one key — the way real data gets corrupted.

**Resolution, and it dictates the slice order:** `CombatProvider` becomes the sole owner.
`CombatHelper` splits into a shell (`<CombatProvider><CombatHelperInner/></CombatProvider>`)
and a body that reads `useCombat()`.

But the *first* slice mounts the provider **read-only** — render the new list from
`turn.ranked`, leave every existing write path exactly where it is. `CombatProvider` only
persists inside its dispatch handler; if nothing dispatches, nothing writes. That makes the
tracer bullet genuinely safe, and moves the write path in a later, isolated slice where a
before/after of `codex-combat-*` can be diffed.

### 2. The TurnDeck minimise overrides an approved V1 rule (V-6)

V-6 reads: *turn-critical spend controls are always visible* — which is why `TurnDeck` has
no collapse today (only a `moreOpen` drawer for a custom Lay on Hands amount). Marcus is now
asking for a minimise. That is a change to an approved rule and must not be assumed.

**Resolution: minimise ≠ hide.** The collapsed deck keeps a one-line spine showing the four
economy chips as state dots and the spell-slot pips. What folds away is the *labels*, the
Lay on Hands row and the Channel Divinity row. Spend **state** stays permanently visible,
which is V-6's actual intent — never be surprised by what you have already spent — while
returning roughly 80px of screen. Persisted per character in the existing `codex-ui-` map.
The deck's height is measured, not declared (`useDeckHeight()` → `--turn-deck-h` via
ResizeObserver), so the layout below adapts with no new constant.

### 3. Three menus collapse to one — and nothing may be lost doing it

Today there are three ways to reach an option: the top **Action** slide-up
(`ActionMenu.tsx`), the **Actions Reference** collapsible (`SmartActionsPanel`,
`CombatHelper.tsx:1333-1345`), and the deck's chips. The prime law forbids reducing
capability, so before any of them is removed, the capabilities each one uniquely provides
get enumerated and pinned as tests. `ActionMenu`'s roll-from-the-sheet, in particular, is a
capability, not a duplicate — it moves into the detail sheet's roll strip rather than
disappearing. The deck's chips stay, and become the *filter* for the one list.

---

## External

**One third-party API. No new env vars, no secrets in the repo.**

- **Google Generative Language API** — `https://generativelanguage.googleapis.com/v1beta/`
  - `GET /models` — **new**. Used to discover which models exist. Auth by
    `x-goog-api-key` header, same as the existing calls (`ai.ts:430-433`).
  - `POST /models/{model}:generateContent` — existing (`ai.ts:470`).
  - `POST /models/{model}:streamGenerateContent?alt=sse` — existing (`ai.ts:641`).
  - The API key is **user-supplied at runtime** and lives in `codex-ai-config` in the
    browser. It is never read from an env var and never enters the repo.
- **Ollama** — unchanged, `http://localhost:11434` via the dev proxy
  (`vite.config.ts:106`). Remains blocked on the deployed HTTPS page by design.
- **Playwright** — reference tooling only, resolved from the npx cache
  (`docs/plans/codex-v1/reference/shoot-app.mjs:8-30`). Never a trunk dependency.

---

## What could still be wrong (the honest list)

1. **`CombatProvider`'s reducer may not cover everything `CombatHelper.setCombatState` does
   today.** If it does not, slice 3 grows. This is the single biggest unknown and it is why
   the tracer bullet is read-only.
2. **Widening `TurnVitals` touches `compose.ts`'s pinned assertions.** Additive optional
   fields should be safe; `compose.equivalence.test.ts` (26.5KB) is the file that will say.
3. **Initiative.** The vitals band shows the derived *modifier* — no storage change. The
   *rolled* value for an encounter belongs to `CombatState` and `InitiativeTracker.tsx`
   (332 lines that have never rendered). Wiring that tracker is listed as "the cheapest
   large win in the app" in `codex-v1/00-status.md:1855-1870`, but it is a separate slice
   and may be deferred out of Phase 1.
4. **The 71-spell canon does not cover every feature on Nix's sheet.** The `source: 'sheet'`
   fallback is how that stays non-fatal, but the first run will show exactly how many rows
   fall through, and that number should be reported rather than hidden.
5. **Dead code.** `combat/StatsBar.tsx` holds the app's only Save DC + AC render
   (`:254-279`) and has zero importers — the vitals band should reuse it rather than
   rewrite it. `Block1Empty.tsx` and `Block1Skeleton.tsx` are also unimported. Deleting
   files is ASK-FIRST; nothing gets deleted without asking.
