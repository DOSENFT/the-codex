# Slices: Sheet Truth

**Proof after every slice** (binding process rule carried from phase 1, debt item 2 —
do not ask Marcus to read a diff): (a) before/after screenshots of the surfaces that
changed, (b) plain-language "what moved and why" in terms of app behaviour, (c) the
measured numbers. Then: "Continue to slice N+1, or re-steer?"

## Two Gate 3 questions, answered before building

Gate 3 was approved without these being settled. Deciding them here rather than
mid-implementation is the whole point of the gate, so:

**#1 — the discarded stored DC.** The migration writes a plain-language line into the
existing `normalizeCharacter` repair log: *"Your spell save DC is now worked out from
your Charisma and level (14). The 15 stored on your sheet was left over from Charisma
18."* It is **not** a modal and not a prompt. He is never asked to approve arithmetic,
but if he goes looking for why a number moved, the answer is there in words.

**#2 — the call sites, re-counted.** Gate 3 said four and feared a scattered fix.
`grep saveCharacter src/` finds **three production callers, in two files**:

| Site | Needs the return? |
|---|---|
| `useCharacter.ts:60` `update` | **yes** — this is the reported bug |
| `useCharacter.ts:80` `createCharacter` | **yes** — same one-render staleness |
| `character.ts:1093` `migrateFromLegacy` | no — it returns a boolean and boot re-reads via `loadCharacter` |

So all of it lands inside slice 2. The A-19 comment's "three components call
`saveCharacter`" describes the state that caused a past bug; those call sites are gone
today. **The comment is history, not a current map** — worth knowing before trusting it
again.

**A consequence Gate 3 did not name.** `character.save.test.ts` asserts
`expect(saveCharacter(nix())).toEqual({ ok: true })` in **eight** places. `toEqual` is
exact, so adding `character` to the success shape turns all eight red. They will be
updated to `toEqual({ ok: true, character: expect.any(Object) })` — which still fails if
the write is refused. Softening them to `toMatchObject` would be weakening a test to get
to green, and is not on the table.

## Build order

Each slice ends with the app running and something visibly different.

- [ ] **Slice 1 — tracer bullet: the formulas exist once, and boot uses them.**
      New `derive.ts` (`proficiencyFor`, `castingAbilityOf`, `progressionRow`,
      `resolveCharacter`, `storableOf`) + its tests. Wire exactly one seam:
      `loadCharacter` resolves before returning. Nothing else changes — no type split,
      no strip, no prose.
      *Visible:* a sheet on disk carrying CHA 16 with a stale stored 15 boots showing
      **Save DC 14**, because every consumer reads `character.spellSaveDC` and that
      property now holds the computed answer. `vitals.ts` and `options.ts` are not
      touched and do not need to be.
      *Proof:* `_probe-baseline.mjs` 3 → 0 on a fresh load.

- [ ] **Slice 2 — the bug he reported: an edit propagates.**
      `saveCharacter` resolves, and returns `{ ok: true, character }`. `useCharacter`
      `update` and `createCharacter` set state from the **return**, not the argument.
      The eight `toEqual` assertions updated.
      *Visible:* change Charisma in Prep, go to Play, the save DC has already moved — no
      reload.
      *Proof:* `_probe-follow.mjs` drives the real Prep UI (tap CHA, type 16, confirm),
      navigates to Play, reads the vitals band structurally. This is the first proof that
      the number **follows the edit** rather than merely being right on a seeded sheet.

- [ ] **Slice 3 — there is no second copy.**
      The type split (`CharacterBase` / `DerivedNumbers` / `Character`), `storableOf` on
      write, the migration, and the `spellSaveDCOverride` / `spellAttackBonusOverride`
      escape hatch for classes the app has no casting rule for.
      *Visible:* nothing, deliberately. Slices 1–2 made the numbers right; this one makes
      them **unable to go wrong**.
      *Proof:* the raw localStorage JSON has no `spellSaveDC` key (fails today); a source
      scan asserting no file outside `derive.ts` writes the three derived fields; the
      proficiency formula found in exactly one file, down from four (finding BG — a claim
      that forbids the fault, not one that failed to observe it).

- [ ] **Slice 4 — Level Up moves everything.**
      `Settings.handleLevelUp` stops doing arithmetic; the paladin pools, prepared count
      and the clamp-down-never-up rule come from `paladin-progression.json`. The toast
      says what actually moved.
      *Visible:* `mockups/level-up.html`'s right-hand column, for real. 8 → 9 takes
      proficiency, DC, attack, prepared spells and Lay on Hands with it, and leaves spent
      Lay on Hands exactly where it was.
      *Proof:* 2 of 7 → **7 of 7** correct immediately after the tap; spell slots
      untouched and still reported as his call.

- [ ] **Slice 5 — the prose seam, proved on one string.**
      New `personalise.ts` + tests, wired at `detail.ts:284` (after `splitTactics`, so
      heading detection still runs on unmodified canon). Exactly **one** canon string
      templated: Bless.
      *Visible:* Bless's advice reads "At level 7 with Charisma 16 that is +1d4 and +3."
      *Proof:* `_probe-tactics.mjs` opens Bless's detail and its tactics fold and reads
      the sentence off a real screen. Doing one string first means the mechanism is
      proved before six more edits ride on it.

- [ ] **Slice 6 — the remaining canon strings, by hand.**
      Command, Heroism, Scorching Ray, Dispel Magic, Aura of Purity, Resistance, and the
      unrendered `paladinNote`. Each classified before it is touched. Circle of Power's
      projection, the ~30 rules statements and the three `prerequisite` strings are
      **left alone**, and a test says so.
      *Proof:* the advice metric 9 → 0; `prerequisite` still reads `"Charisma 13+"`;
      `tactics.test.ts`'s rejoin invariant still green across all 71 records **with**
      placeholders in the data.

- [ ] **Slice 7 — retire the discrepancy, and close.**
      Three of `discrepancies()`'s four cases become unreachable. Per Gate 3's
      least-confident #5 they are **kept and asserted never to fire** rather than
      deleted — an invariant with evidence beats an absence of evidence. Spell slots keep
      reporting, forever, by design.
      *Visible:* the banner *"Your sheet and the 2024 rules disagree on 2 things"* is
      gone from under his save DC — because there is nothing left to disagree, not
      because it was hidden.
      *Proof:* full suite, full probe set, before/after of the Play tab. Then phase close.

## Not in this phase

Unchanged from Gate 1: `CharacterFeat.abilityIncrease` (recorded and ignored today — a
real bug, logged in `_audit.md`), armour class, max HP, equipment, and the phase-1 carry
list (finding BC, finding AZ/HEARTH-08, VAL-13, finding AT, the cloak-teleport clause
still waiting on his DM).
