# Status: Sheet Truth — one source for every number

Phase 2 of the Codex tightening. Phase 1 was `docs/plans/table-truth/` (closed,
deployed to `main` at `ea28aad`, live).

- Gate 1 — Product: **APPROVED 2026-08-28**
- Gate 2 — Architecture: **APPROVED 2026-08-28**
- Gate 3 — Program Design: **APPROVED 2026-08-28**
- Gate 4 — Slice plan: **APPROVED 2026-08-28**

## Slices
_Full detail and per-slice proof in `04-slices.md`._

- [x] **Slice 1 — tracer: `derive.ts` holds every formula once; `loadCharacter` resolves.** Done 2026-08-28.
      Files: `src/lib/rules-2024/derive.ts` + `derive.test.ts` (new, 19 tests);
      `src/canon/index.ts` gains `PROGRESSION_BY_CLASS`; `src/lib/canon/types.ts` gains
      `CanonProgressionLevel`; `src/lib/character.ts` — `loadCharacter` resolves.
      **Measured:** probe 3 → 0. Vitals card **348px → 75px** tall — the disagreement
      banner collapsed because there is nothing left to disagree. Full suite 1009 green,
      including the `options.ts` byte-identical pin. Shots in `shots/slice1-*.png`.
      **The proficiency formula had FIVE copies, not four** — `CharacterSetup.tsx:395`
      (`Math.ceil(level / 4) + 1`) was missed by the Gate 2 audit. `derive.test.ts` now
      pins the one copy against all 20 of canon's rows.
- [x] **Slice 2 — the reported bug: an edit in Prep reaches Combat.** Done 2026-08-28.
      Files: `src/lib/character.ts` — new `CharacterSaveOutcome`, `saveCharacter` resolves and
      returns the resolved character; `src/hooks/useCharacter.ts` — `update` and
      `createCharacter` set React state from the RETURN, not the argument;
      `src/lib/rules-2024/propagation.test.ts` (new, 7 tests);
      `src/lib/character.save.test.ts` — 8 assertions tightened, 1 rewritten, 1 added.
      **Measured, by building a slice-1-only variant and probing both:** `_probe-follow.mjs`
      drives the real Prep UI (tap CHA, type 16, Enter), returns to Combat **without a
      reload**, and reads the vitals band structurally. Reverted build: **2 disagreements**
      (Save DC 15, Sp Atk +7). Slice-2 build: **0**. Stage A (before the edit) and stage C
      (after a reload) pass on BOTH — the fault is isolated to exactly the one path slice 2
      changed. Full suite **1017 green** / 44 files / 7 skipped. Shots:
      `shots/slice2-c-combat-no-reload-{reverted,after}.png`.

#### Three things slice 2 turned up that were not in the plan

1. **A test that could not fail.** `propagation.test.ts`'s discrepancy case read `d.label`
   on a type whose field is `title`, so it mapped to `[undefined, undefined]` and both
   assertions passed no matter what the code did. Found by actually reverting the slice
   instead of asserting it would fail. Now reads `d.id`, a typed union — a rename becomes
   a compile error. **The revert is the only reason it was caught.**
2. **The header overstated the result.** It claimed all 7 tests fail against pre-slice code.
   Measured: **5 of 7.** The two passers are now labelled for what they are — one is a
   slice-1 regression guard, one is an overreach guard that cannot fail by construction.
3. **FINDING BH — finding BC is an accessibility fault, not a layout curiosity.** The Dice
   Roller and the Mechanics Reference are both mounted at all times, both carry
   `aria-modal="true"`, and both are parked at y=844, one viewport below the fold. Two
   simultaneous modals corrupt the accessibility tree: `getByRole('button', {name:'Character'})`
   resolves to **zero** elements while `button[aria-label="Character"]` resolves to one
   that is visible, enabled and 97×64. **A screen-reader user cannot reach the tab bar.**
   Not in this phase's scope; nothing here fixes it. Logged so it cannot be forgotten.
- [ ] Slice 3 — the type split, strip-on-write, migration, overrides. No second copy can exist.
- [ ] Slice 4 — Level Up moves all seven numbers; pools clamp down, never up.
- [ ] Slice 5 — `personalise.ts` wired at `detail.ts:284`, proved on one string (Bless).
- [ ] Slice 6 — the remaining 7 canon strings, hand-edited and classified.
- [ ] Slice 7 — discrepancy cases kept but asserted unreachable; phase close.

### Two Gate 3 questions, answered in `04-slices.md`
- The discarded stored DC writes a plain-language line into the existing repair log. Not a modal, not a prompt.
- The call sites re-counted: **three production callers in two files**, not four — `useCharacter.ts:60` and `:80` need the return, `character.ts:1093` (`migrateFromLegacy`) does not. All inside slice 2. The A-19 comment's "three components" describes a past state; **it is history, not a current map.**
- Consequence Gate 3 missed: `character.save.test.ts` asserts `toEqual({ ok: true })` in **eight** places; adding `character` to the success shape turns all eight red. They get `expect.any(Object)`, not `toMatchObject` — softening them would be weakening a test to reach green.

## Notes for a fresh session

### What Marcus reported
> "in combat my spell definitions, and probably a lot of other things, are claiming
> that my charisma is 18, when in fact it's 16. The prep tab, which was connected it
> seemed, seems to not be at all connected with the combat module directly. **What I
> change in the prep screen must directly effect and be used app wide**"

### What the measurement found (`_probe-paint.mjs`, Chrome 390×844)
Seeded a sheet with CHA 16 beside the CHA-18 stored values, exactly what an edit
in Prep leaves behind today:

```
=== VITALS BAND, as painted ===
{ "AC": "18", "Prof": "+3", "Init": "+1", "Save DC": "15", "Sp Atk": "+7" }
truth for CHA 16 / prof +3 :  Save DC 14   Sp Atk +6
=== WHAT THE OPTION ROWS SAY ===
{ "dcMentions": ["DC\n18","DC 15","DC 10"], "hitMentions": ["+8 to hit","+7 to hit"] }
discrepancy surfaced to the user on this screen: true
```

(Re-measured 2026-08-28, byte-identical. The `true` on the last line is the app's
existing discrepancy reporter noticing the mismatch — it *tells* him the numbers
disagree, but every surface still *paints the wrong one*.)

His diagnosis was substantially right and my first instinct ("it's just frozen
prose") was wrong. **Two independent faults:**

1. **Stale stored numbers (dominant).** `spellSaveDC`, `spellAttackBonus` and
   `proficiencyBonus` are STORED fields on `Character`. `CharacterPage.tsx:208-214`
   (`handleScoreConfirm`) writes `abilityScores` and never touches them.
   **14 production sites read the stored value — including every combat surface.
   2 read the computed one.**
2. **Canon prose with baked numbers.** 9 sites in `src/lib/canon/data/*.json` bake
   "Charisma 18" and its derived numbers into `tactics` text. The canon layer is
   100% character-agnostic and has **no interpolation mechanism** — one must be built.

**Ruled out, do not re-investigate:** `src/lib/turn/fixtures/nix.ts:59` has `CHA: 18`
but is test-only (no non-test importers). `oath-of-the-hearth.json:75-78`
`atLevel7.tempHPWithCha18` is never read by production code — the live field is the
formula `"tempHP": "Paladin level + Charisma modifier"`.

### Gate 1 answers already collected from Marcus (2026-08-26)
1. **Source of truth → "Always compute; retire stored."** Ability scores become the
   single source of truth. **The stored fields stop existing**, so they can never go
   stale. *This deliberately REVERSES the decision recorded at `vitals.ts:38-41`,
   which chose stored-plus-discrepancy-report on purpose.*
2. **Canon prose → "Replace numbers with your live ones."** The app substitutes his
   real numbers into canon advice as it renders. Collides with the standing rule that
   canon prose is rendered verbatim — Gate 2 must resolve that.
3. **Scope → all three options selected:** spell save DC + spell attack · proficiency
   bonus · **audit every derived number and report before changing anything**.

### The audit he asked for
Done, before any code changed. Full findings in `_audit.md` in this folder.

### The corrected measurement
`_probe-paint.mjs` is superseded by **`_probe-baseline.mjs`**. The old probe ran a
`DC \d+` regex over `document.body.innerText`, where `\s` matches a newline — so the
label "SAVE **DC**" plus the neighbouring AC stat's "**18**" scored as a phantom
"DC 18". That inflated the metric from 3 to 5, by exactly the mechanism finding Q
exists to forbid, in my own measuring tool. `_probe-baseline.mjs` reads vitals as
label→value pairs, excludes the vitals subtree, and uses a `TreeWalker` so `DC n` must
sit in a single text node. **True baseline: 3 disagreements** (Save DC 15, Sp Atk +7,
one option row "DC 15"). The correction is recorded in `01-product.md` rather than
quietly swapped.

### Gate 3's finding — canon is edited by hand, never scripted
Scanning `tactics` for **every** baked derived number (not just Charisma) found 45 hits
across 34 of 71 spells. Three indistinguishable kinds: **rules** ("Sacred Flame improves
at level 5", "Concentration DC 10"), a **projection** (Circle of Power, "at level 17
with Charisma 20"), and **claims about his sheet** (Bless, "at Charisma 18 that is +4").
A find-and-replace would rewrite rulebook facts into nonsense and look fine. Only the
8 sheet-claim strings are templated, by hand, each classified first. Also: `paladinNote`
has no production reader (`grep` finds only `canon/types.ts:127`), so **7 of the 8 are
reachable on a screen**. `feats.json` `prerequisite` strings ("Charisma 13+") are entry
requirements and are explicitly off limits.

### Carried rules from phase 1 (still binding)
- **Proof after every slice:** before/after screenshots, plain-language "what moved
  and why", the measured numbers. Then "Continue to slice N+1, or re-steer?"
- **Finding Q:** reading `textContent` proves the model, not the screen. Browser
  claims must be geometric or structural (label→value pairs), never innerText regex —
  an innerText scrape in `_probe-propagation.mjs` mis-read "SAVE DC 18" by matching
  the number belonging to the next stat over.
- **Finding BG:** prefer a structural claim that *forbids* a fault to a sampled claim
  that *failed to observe* it.
- **Finding BD:** `src/lib/turn/options.ts` is pinned BYTE-IDENTICAL to `main` by
  `overlay.test.ts` case 15. Never edit it.
- Canon matching goes through `featureByName(option.name)` — `option.name` must never
  be renamed.
- **Real tests only.** A test that passes against the pre-change code tests nothing.

### Environment gotchas
- The Bash tool resets cwd to `Documents\Command` after every call. `cd` first.
- Source files have MIXED line endings. Detect before writing.
- `npx vite preview --port N` silently falls through to the next free port. Read the
  background task's output file for the real port.
- Playwright: `const pw = await import(...); const chromium = pw.chromium ?? pw.default?.chromium`.
  Destructuring `{ chromium }` yields undefined.
- Storage keys: `codex-character-<id>` is real; `codex-character` is LEGACY and is
  migrated away on boot (a probe that seeds it then reads it back gets null).
- The permission classifier blocks `git push` to main and `git checkout`. **Marcus
  runs deploys himself**, and a deploy is confirmed by reading `git ls-remote` and
  curling the live bundle — never by reading push output.
