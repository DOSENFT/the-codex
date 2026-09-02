# Status: Open Book — the Grimoire holds everything

Phase 3 of the Codex work. Phase 1 was `docs/plans/table-truth/` (closed, deployed),
phase 2 `docs/plans/sheet-truth/` (closed, deployed). Two standalone repairs off
Marcus's list of eleven are also closed: `docs/plans/toybox-ai/` (item 1) and
`docs/plans/slot-truth/` (item 4).

**The folder is `grimoire/` and the phase is called Open Book.** The folder name is
what a future session will search for; the phase name is what the work is about.
The earlier phases were "Truth" because they were about numbers disagreeing. This
one is not — every number is already right and every word is already on disk. This
phase is about a locked cabinet.

- Gate 1 — Product: **APPROVED 2026-08-28** (approved, reopened over a wrong
  count, corrected, re-approved the same day — see "The count was wrong" below)
- Gate 2 — Architecture: **APPROVED 2026-08-28**
- Gate 3 — Program Design: **APPROVED 2026-08-28**, amended twice on **2026-08-29**.
  - *During slice 4:* least-confident decision 2 backtracked. Its deferred rule
    chose the wrong default; Marcus ruled **Level**. The doc carries the four
    measured distributions. Re-approval was not re-requested as a gate, because
    the decision the amendment turns on is the one Marcus made himself, on the
    numbers.
  - *During slice 5:* `PrepareRefusal` grew from three codes to five, `'cap'`
    grew a `swapRule` field, and the prepare call stack was **reordered** —
    the approved order would have silently unprepared his Oath grants. Recorded
    in `03-program-design.md` under *Amendment — the two refusals this design did
    not anticipate*. Re-approval not requested as a gate: none of the four
    changes an outcome Marcus chose, and each is deferred to an assertion that
    was shown able to go red.
- Gate 4 — Slice plan: **APPROVED 2026-08-28** — `04-slices.md`

---

# RESUME HERE — the whole phase on one screen

*Written at slice 7 close, 2026-08-30. Everything below this heading is what a
fresh session needs before it touches anything. The slice-by-slice records
further down are the evidence, not the briefing; read one only when a question
points at it.*

## State

**All seven slices closed. The phase is proved and NOT deployed** — branch `v1`,
nothing pushed to `main`. Marcus deploys.

## The phase's whole footprint in `src/`

| file | what it is |
|---|---|
| `lib/catalogue/types.ts` · `build.ts` | the 84 — canon merged with his sheet, by key |
| `lib/catalogue/detail.ts` | one entry → the three bands |
| `lib/canon/bands.ts` | bands 1–3 + errata, shared with the combat detail sheet |
| `lib/catalogue/group.ts` | the four grouping modes |
| `lib/prepare/toggle.ts` | the prepared-spell rule and its five refusals |
| `lib/prepare/fighting-style.ts` | canon's eleven styles ⇄ `character.feats` |
| `components/GrimoirePage.tsx` | the page; owns every write |
| `components/grimoire/CatalogueRow.tsx` · `EntryDetailPanel.tsx` · `GroupSwitcher.tsx` · `PreparationRules.tsx` · `PrepareRefusal.tsx` · `FightingStylePicker.tsx` | the screen |

## How to run every proof

```
npx tsc -b --noEmit
npx vitest run
npx vite build
node docs/plans/grimoire/prove-catalogue.mjs "http://[::1]:4321/the-codex/"
```

Four things about that last line, each of which cost time to learn:

- **The URL is IPv6 and the base path is not `/`.** The preview server listens on
  `::` only, so `curl localhost:4321` returns empty and reads as "server down".
  The app is served under `/the-codex/`.
- **A preview server was already running on :4321** and hot-picks up a fresh
  `dist/`. It was not started by an assistant, and the permission classifier
  **denied** starting one (`vite preview`) on both shells. If it is gone, ask
  Marcus to start it.
- **Playwright is not a dependency of this repo.** `prove-catalogue.mjs` resolves
  it out of `C:/Users/marcu/AppData/Local/npm-cache/_npx/*/node_modules` and must
  destructure `pw.chromium ?? pw.default?.chromium`.
- **Always confirm the served bundle hash equals the fresh `dist/` one** before
  believing a browser result. Slice 2 records a before/after pixel proof that had
  to be thrown away because its provenance could not be established.

Two measurement scripts answer questions about the corpus without a model:
`measure-scope.mjs` (what the 84 are made of) and `measure-reactions.mjs` (what
the turn engine produces from his real feats). Run with `npx vite-node <path>` —
**a file path, `-e` is not supported, and the file must live inside the repo.**

## The numbers this phase pinned

| | |
|---|---|
| catalogue | **84** = 62 spells + 20 features + 2 feats · **85** once a Fighting Style is picked |
| provenance | 53 Paladin-list spells + 9 Oath of the Hearth grants + 16 Paladin features + 4 Oath features + Sentinel and Lucky. **Zero rows from another oath.** The 9 Blessed Warrior cantrips are excluded, and the exclusion is enforced |
| locked | **38** ahead of him (spells 12@L9, 8@L13, 10@L17; features one each at L9 L10 L11 L14 L15 L18 L19 L20) · **46** usable now |
| turn cost | action 46 · bonus 16 · reaction 2 · passive 0 · **other 20** |
| preparation | cap **7**, granted **4**, so the screen opens **2 used / 5 free** |
| suite | **1272 passed / 7 skipped / 56 files** · bundle `index-DfEq3dpu.js` |
| probe | 390×844 @2× — the phone Gate 1 named, declared once as `VIEWPORT` |

`prove-catalogue.mjs` checks **A–H**; G prints last because it is the catch-all,
so the letters are not alphabetical in the output.

## The corpus is already ingested — there is no research phase

Marcus's eight source documents are fully in `src/canon/`. Verified by direct
count, not by a summary: **71 spells** (53 `onPaladinList`, 18 granted off-list;
paladin list by level `{1:17, 2:12, 3:10, 4:6, 5:8}`; 41 castable at level 7),
**16** entries in `paladin-progression.json → classFeatureDetails`, **4** features
in `oath-of-the-hearth.json`, and `feats.json` holding **five arrays** (`origin`
10, `general` 43, `fightingStyle` 11, `epicBoon` 12, plus `changesFrom2014` 8) —
*not* one flat list, total **76**.

> Three subagents were asked for that count and all three got it wrong: one read
> the wrong array and said "8", one said "85", and one produced the right total
> with every per-category number wrong. **One of them was wrong while looking
> right.** Count it yourself.

**62 spells reach the catalogue, not 71** — `onPaladinList` (53) plus off-list
`always_prepared` (9). `spells.json → tactics` is populated on all 71 and now
renders in band 3 as well as in `combat/OptionDetailSheet.tsx:303`.
`feats.json → paladinNote` was displayed **nowhere** until slice 6 put it on the
six fighting styles that have one; it is `null` on the other five and on most
other feats, so most of it is still unshown — a cheap win for a later slice.

## Open — known, not fixed

1. **`featReactionOptions(nix)` returns 0 rows.** His importer wrote audience
   bullets into `feats[].effects`, and the sheet's words outrank canon's, so
   Sentinel produces nothing. The other half of item 8; needs its own slice on
   text provenance in `turn/feats.ts`. Full write-up under "Slice 6, closed".
2. **`vitals.ts:195` `const expected = table[character.level] ?? {}`** — the
   reporting-only twin of the slot-truth bug. Reported, never fixed.
3. **The phantom 3rd-level slot pips** are still in every screenshot. That is
   correct: slot-truth built a door (`onAdopt` on `VitalsBand.tsx`), not a
   mutation, and nothing in the app insists he presses it. **Worth one sentence
   to Marcus.**
4. **Party-aware tactics** — canon contains no party-interaction text at all, so
   the party half of item 3 is deferred by Marcus's own Gate 1 ruling.
5. **The sticky group-heading question** raised at slice 4's close is unanswered.
6. **The real cause of his AI failure is unconfirmed** — diagnosing it needs his
   live Gemini key, which is 🟡 ASK-FIRST under Command's guardrails.
7. **Scratch artefacts left on disk, deliberately** (deleting is ASK-FIRST):
   `_snap/detail-BEFORE.json`, `_snap/detail-snapshot.json`,
   `_snap/detail-new.ts.bak`, and `_shots/_revert/` (the M3 falsification run).

## Not this phase, still on his list

The "Your Turn" consolidation (items 5, 6, 10, 11 — a layout problem, not a
content one) · Hearthfire retaliation (7) · the damage log and fast entry for
physical dice (9) · the Sentinel half of item 8.

---

## Slices

- [x] Slice 1 — tracer bullet: `buildCatalogue` real, adapted into the old card, 84 paint
      **DONE 2026-08-28** — see "Slice 1, closed" below
- [x] Slice 2 — extract `bands.ts` out of `turn/detail.ts`; no visible change, structural test
      **DONE 2026-08-29** — see "Slice 2, closed" below
- [x] Slice 3 — `CatalogueRow` + `EntryDetailPanel`, the three bands; `GrimoireCard` deleted
      **DONE 2026-08-29** — see "Slice 3, closed" below
- [x] Slice 4 — the four-mode grouping switcher, and the `'other'` measurement
      **DONE 2026-08-29** — see "Slice 4, closed" below
- [x] Slice 5 — preparation: hard cap, refusals that name the rule, the write-through wire
      **DONE 2026-08-29** — see "Slice 5, closed" below
- [x] Slice 6 — Fighting Style picker → Interception appears on the combat tab
      **DONE 2026-08-29** — see "Slice 6, closed" below
- [x] Slice 7 — the phase proof: `prove-catalogue.mjs` A–H, full suite, build, compaction
      **DONE 2026-08-30** — see "Slice 7, closed" below

## Covers these of Marcus's eleven

| item | his words, short | in scope here |
|---|---|---|
| 2 | all spells / features / abilities, well organised, level-locked | yes — the whole of it |
| 3 | mechanics at a glance → full details → tactics | yes, first two bands and the character half of the third |
| 8 | combat lacks Hearthfire Manifest, Sentinel, Interception | partly — this phase gives all three a **home**; putting them on the combat tab is phase 4 |
| — | "the app should teach me on preparing spells" | yes |
| — | Interception needs somewhere to live | yes |

Items 5, 6, 10 and 11 — the three "Your Turn" modules and the HP card — are a
layout problem, not a content one, and are deliberately **not** in this phase.
Items 7 and 9 (Hearthfire retaliation, the damage log) are separate again.

## Decisions taken at Gate 1, with Marcus, 2026-08-28

1. **Party-aware tactics are deferred to their own slice.** Canon has no party text
   and `PartyMember` has no mechanical fields, so this is the one thing on his list
   that cannot be built by wiring up data that already exists. Band 3 ships with
   canon's character-aware `tactics`, which is already written and substantial.
2. **The prepared-spell cap is hard, and says why.** Not advisory as today.
3. **Scope is "everything you can do":** all 71 spells, all 16 Paladin class
   features, all 4 Oath features, and the feats/styles he actually has.
4. **The grouping is a switcher, not a fixed choice** — his answer, verbatim:
   *"Multiple organization options, like a filter"*. Four modes, one control.

## The count was wrong — Gate 1 reopened 2026-08-28

Gate 1 was approved with the metric **11 → 94**. Before writing Gate 2 I read
Marcus's actual export instead of canon's totals, and the number is **11 → 84**.
Ten of the 94 are not his:

- **Nine Blessed Warrior cantrips.** Canon marks them
  `availability: "cantrip_option_via_blessed_warrior"` — a menu of nine that the
  *Blessed Warrior* Fighting Style lets you pick two from. His Fighting Style is
  Interception, and his sheet has no cantrips. The product doc's own rule for
  feats ("a thing he could have chosen is not a thing he can do") kills these
  too; counting them was inconsistent with the rule beside them.
- **Interception**, counted as a feat he has. It is not on his character.

**What the export actually says** (`C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json`):
level 7 Paladin, Oath of the Hearth, Changeling · 7 spells (Bless, Burning Hands,
Cure Wounds, Faerie Fire, Shield of Faith, Scorching Ray, Warding Bond) ·
4 features (Divine Smite, Hearthfire Manifest, Aura of Protection, Aura of Solace) ·
**feats: Sentinel and Lucky only** · spellSlots still carrying `3: {max:2}`, the
row the slot-truth door removes when he presses it.

**There is no Fighting Style on the character at all.** That is a hole the
catalogue can close cheaply — the *Fighting Style* class feature is already one
of the 16 it will render, at level 2, and opening it can list canon's 11 and let
him mark his. Added to `01-product.md` as a scope addition needing his yes.

Locked stays 38 (24 paladin-list spells + 6 oath spells + 6 class features +
2 oath features); all nine cantrips unlock at level 2 so removing them changed
nothing there. *(The spell split read 27+3 until slice 1 measured it at 24+6.
The 30, the 38 and the 84 were right throughout.)*

## Slice 1, closed 2026-08-28

**What was built.** `src/lib/catalogue/types.ts`, `src/lib/catalogue/build.ts`
(`buildCatalogue` + `catalogueSpells`), `src/lib/catalogue/build.test.ts` (12
tests, seeded from his real export). `GrimoirePage.tsx`'s `allItems` now calls
`buildCatalogue(character)` instead of iterating `character.spells` — the one
line that was the whole of item 2. A **temporary** `adaptEntry` adapter feeds the
old `GrimoireCard`; both are deleted in slice 3, and slice 3 is not done until
they are gone.

**Proof.** `build.test.ts` 12 green · whole repo **1137 passed / 50 files / 7
skipped** (was 1125/49 — +12, no regressions) · `tsc -b --noEmit` exit 0 ·
`npm run build` clean · browser probe `prove-catalogue.mjs` **A, B, G all PASS**
against the served build on `:4321`, verified byte-identical to the fresh
`dist/` and containing both markers before the probe was trusted.

```
PASS A  84 painted · 84 distinct keys      (geometric, not textContent)
PASS B  38 lock chips, none malformed      (each chip measured on its OWN box)
PASS G  clean console
```

**Micro-reverts, both restored.** R1 deleted the second pass (the open-world
sweep) and turned only the *homebrew* test red — the "nothing on his sheet is
missing" test stayed green, because canon has a record for all eleven of his
items. That is finding BG in miniature: a test that fails to observe a fault does
not forbid it. The test was strengthened to run against a homebrewed sheet as
well, and R2 then turned **both** red (2 failed / 10 passed) before restoring to
12 green.

**Gate 3's deferred measurement, now measured.** Turn-cost buckets across the 84:
**action 46 · bonus 16 · reaction 2 · passive 0 · other 20.** Gate 3 wrote the
threshold down before the number was known — more than ~15 in `'other'` and the
default grouping mode changes. It is 20, so **slice 4 defaults to Source, not
Turn cost.** The `'other'` list is not a weak parser: Spellcasting, Weapon
Mastery, Fighting Style, Extra Attack, the four auras and the long-cast rituals
have no turn cost because they are things he *is*, not things he *does*. Pinned
by assertion in `build.test.ts`, not left as a log line.

**`01-product.md`'s locked split was wrong: 27+3 published, 24+6 measured.**
Totals (30 locked spells, 38 locked, 84 items) unaffected. Corrected in place;
Gate 1 not reopened because no decision rested on it. See that doc.

**Observed, not a regression — the phantom 3rd-level slot row is still on the
Grimoire tab in the probe's screenshots.** That is correct: the slot-truth repair
is a *door he presses*, not an automatic mutation, and the probe seeds his raw
export and never presses it. Worth recording anyway: `GrimoirePage.tsx:518-532`
is a **third** surface drawing that row, where `slot-truth/00-status.md` says
"TWO SURFACES DRAW THAT ROW, not one". This third one is safe — it iterates
`Object.entries(character.spellSlots)`, so the adoption that deletes the
ungranted key clears this row too — but the "two" in that doc is now wrong, and
anyone counting surfaces from it will undercount.

## Slice 2, closed 2026-08-29

**What was built.** `src/lib/canon/bands.ts` — bands 1, 2 and 3 plus the errata,
assembled once for both screens. `turn/detail.ts` rewired to call it (**31
insertions, 85 deletions** against HEAD); its private `withSaveDC` and
`factsFromFeature` moved out, `DetailFact` kept as an alias of `BandFact` so the
combat sheet and its tests are untouched. Everything that is about a *turn* —
rolls, spend, rule box, temp-HP warning — deliberately stayed behind.

**Visible after this slice: nothing. That was the claim, and it is the whole
difficulty of proving it.** Made in four independent ways, none of which
subsumes another:

| | claim | result |
|---|---|---|
| existing suite | `turn/detail`'s own tests, **not edited** | green |
| model | `optionDetail` dumped for every option × 2 sheets × 3 economy states, 244592 bytes, hashed before and after | `CDB82E56…B6F6` **identical** |
| pixels | nine detail sheets photographed in a real browser on both builds | all nine **hash-identical** |
| structure | `bands.test.ts` — 17 tests, incl. the grep that forbids either caller reaching past the module | green, and red under revert |

Whole repo **1155 passed / 52 files / 7 skipped** (was 1137/50 at slice 1 close)
· `tsc -b --noEmit` exit 0 · `npm run build` clean.

**The pixel proof had to be redone, because its provenance could not be
established.** The first `detail-before` run was taken while `bands.ts` already
existed on disk, and nothing on disk could say whether the *bundle* it was shot
against predated the extraction. A before-shot that might have been taken after
the change proves nothing at all. So it was rebuilt from scratch: revert
`turn/detail.ts` to HEAD → `npm run build` → confirm the served bundle on `:4321`
hashes equal to the fresh `dist/` → shoot → restore byte-identical → rebuild →
confirm again → shoot. The two builds are genuinely different artefacts
(`index-BuGzJYZ5.js` → `index-COSzmF4b.js`); the nine PNGs off them are byte for
byte the same. The redone before-run also reproduced the first run's hashes
exactly, so the shoot itself is deterministic.

**The micro-revert produced a FALSE PASS, twice, and that is the finding.**
Reverting `detail.ts` and re-running left `bands.test.ts` at 17 green when the
slice plan demands red. Two causes, stacked:

1. **`git` is unusable from the PowerShell tool.** It resolves to
   `C:\WINDOWS\system32\git`, a *document*, not an executable — "Cannot run a
   document in the middle of a pipeline". Every git command issued through
   PowerShell this session was a silent no-op, and `git show … > file` truncated
   the file to **0 bytes** before failing to run. **Use the Bash tool for git.**
2. **A structural absence-claim that cannot tell "the symbol is absent" from "I
   read nothing" is not a claim.** `not.toContain` passes perfectly against an
   empty string, and an empty string is exactly what an unreadable, truncated or
   mis-encoded file looks like from inside the test. `bands.test.ts` now asserts
   it found import lines *before* it asserts what is not among them.

Redone through Bash, the revert went red on exactly one test — `src/lib/turn/detail.ts
imports none of statBlock, splitTactics, personaliseBullets, featureFacts` — 1
failed / 16 passed, then restored byte-identical (`diff -q`).

**Left standing, deliberately.** `src/lib/turn/__snapshot-detail.test.ts` (the
model dump — asserts nothing, writes a file) and `docs/plans/grimoire/_snap/peek.mjs`
(a throwaway DOM lister) are still in the tree. Deleting files is ASK-FIRST under
Command's guardrails, so they were not removed unilaterally. **Slice 3 is not
done until both are gone** — the dump runs on every `vitest run` and writes into
`docs/`, which is not a thing a test suite should do.

## Slice 3, closed 2026-08-29

Marcus's item 2 and item 3, on screen. `entryDetail` in `src/lib/catalogue/detail.ts`
turns a `CatalogueEntry` into the three bands; `EntryDetailPanel.tsx` lays them
out; `CatalogueRow.tsx` is the row, locked or not. Slice 1's 70-line adapter is
gone — a tombstone comment stands where it was.

### What was proved

| claim | how | result |
|---|---|---|
| model | `detail.test.ts` | 29 tests, incl. a whole-catalogue invariant over all 84 |
| layout | `EntryDetailPanel.test.tsx` | 13 tests, 8 synthetic + 5 against his real export |
| whole repo | `vitest run` | **1201 passed / 7 skipped**, 54 files |
| types | `tsc -b --noEmit` | clean |
| bundle | `npm run build` | clean → `index-BwofqKRS.js` |
| **C** | probe, swept over all 38 locked rows | 38 opened whole; ~~9~~ **30** also had canon's advice |

> **The 9 was wrong, and slice 4 found out why.** The real number is 30 of 38.
> The probe's visibility helper hit-tested a single point 6px below each band's
> top edge, and for a band taller than the fold that point lands off-screen or
> behind the app's fixed header. It reported occlusion as absence. The claim C
> makes — *every locked row opens to its lock strip, band 1 and band 2* — was
> never affected; band 3 is **counted, not required**, which is exactly why an
> under-count could sit there unnoticed. Corrected in `prove-catalogue.mjs` and
> cross-checked independently by `_snap/band3.mjs`. See "Slice 4, closed".
| **F** | probe, swept over all 84 rows | band 1 tallest **494px of 844**; 69 priced, all shown |
| combat untouched | `shoot-detail.mjs slice3` vs. slice 2's nine | **all nine hash-identical** |

### THE FAULT THIS SLICE FOUND — a default that was usually right

`heroCostFor` chose its tone "bonus, else reaction, else **action**". Canon prices
Prayer of Healing at "10 minutes". The word printed was canon's and correct; the
*colour* said Action — a claim Marcus could act on at a table, sending him to look
for it in his Action list mid-fight where it does not exist.

It was not found by reading the branch. It was found by measuring the parse across
all 84 entries at once (`_snap/probe-promo.mjs`). **A default that is usually right
is only ever caught by measuring the whole corpus, not by reading the code.** The
fix adds a fifth tone, `'time'`, deliberately painted in no slot colour, and makes
`'action'` require canon to say the word. Micro-reverted → 2 red, restored.

### The micro-revert the slice plan named

Made the band-1 grid an allowlist (`KNOWN.includes(fact.label)`) instead of
subtracting what the model declared `consumed`. Red on exactly two: the invented
label `Sympathetic Resonance`, and the label-less fact. Restored.

**Note what stayed GREEN under that revert: all five tests against his real sheet.**
Canon's own labels are all recognised, so no amount of real data can catch this
fault — only a label canon does not contain can. That is the entire reason the
fixture in `EntryDetailPanel.test.tsx` is hand-built rather than derived.

### Checks C and F were shown able to fail

Both passed on the first run, which is not evidence. Re-run at a 390×**420**
viewport: C failed (14 of 38 opened whole) and F failed naming the three tallest
band 1s with real pixel numbers (`hearthfiremanifest=494px`). Restored to 844.
That run also exposed a hardcoded `844` in F's own report string — a true FAIL
printed over a false denominator — now read back from one `VIEWPORT` constant.

### The four deletions, authorised by Marcus 2026-08-29

`src/components/grimoire/GrimoireCard.tsx` (dead, replaced by `CatalogueRow`) ·
`src/lib/turn/__snapshot-detail.test.ts` (asserted nothing and wrote a file into
`docs/` on every `vitest run`) · `docs/plans/grimoire/_snap/peek.mjs` ·
`docs/plans/grimoire/_snap/probe-promo.mjs` (the scratch probe that found the
tone fault; what it measured is recorded above, so the file is not the record).

After: **53 files / 1200 tests**, down exactly one file and one test — the
snapshot dump and nothing else. `tsc -b --noEmit` clean.

Deleting files is ASK-FIRST under Command's guardrails and the environment gates
it as well, so these waited two slices for Marcus's explicit word rather than
being cleared away as housekeeping. That is the intended cost of the rule.

## Slice 4, closed 2026-08-29

The four-mode grouping switcher. Gate 1, asked to pick one organising principle,
Marcus declined all four and answered *"Multiple organization options, like a
filter."* The word is filter; the requirement is not — a chip that hid seventy of
the eighty-four would be item 2 wearing a new hat. So the module's one law is
**grouping never loses an entry**, which is the fall-through rule from
`EntryDetailPanel.tsx` moved one level up: there a FACT the layout does not
recognise must still be drawn, here an ENTRY whose bucket the module does not
recognise must still be grouped.

| what | how | result |
|---|---|---|
| `group.ts` + 16 tests | `vitest run src/lib/catalogue/group.test.ts` | 16 passed |
| whole repo | `vitest run` | **1216 passed / 7 skipped**, 54 files |
| types | `tsc -b --noEmit` | clean |
| bundle | `npm run build` | clean → `index-DB9pP743.js` |
| **D** | probe, all four chips pressed, rows re-counted geometrically each time | 84 rows under every chip; headings sum to 84 under every chip |
| **A B C F G** | re-run unchanged | all pass; C now reports **30** (below) |

### The default was chosen by measurement, and the first measurement was mine and wrong

Gate 3's least-confident decision 2 deferred the default to a rule: *"if more
than ~15 of the 84 land in `'other'`, the default mode should be Source, not Turn
cost."* Twenty do, so the rule fired — and I told Marcus that settled it as
Source. **It did not.** The rule only ever compared two of the four modes: it
ruled *out* Turn cost and then assumed Source. Measured properly:

| mode | groups | biggest | distribution |
|---|---|---|---|
| turn | 4 | **46** | Action 46 · Bonus 16 · Reaction 2 · Not a turn slot 20 |
| source | 3 | **69** | Paladin 69 · Oath of the Hearth 13 · Feat 2 |
| level | 6 | **22** | L1 19 · L2 13 · L3 12 · L4 8 · L5 10 · Features & feats 22 |
| ready | 3 | **38** | Ready now 22 · Known, not prepared 24 · Locked 38 |

Source's largest heading holds **69 of 84** — opening on it would have shown him
one undifferentiated list with the word "Paladin" over it. **Marcus was shown all
four and chose Level.** Gate 3 was backtracked in `03-program-design.md` per the
workflow's backtracking rule rather than left to be outgrown.

The wrong default did not ship because the guard was written as a live assertion
instead of as prose: `and the default is genuinely better — no group swallows the
list` failed with *"biggest group holds 69 of 84: expected 69 to be less than
42"* the first time the suite ran. **A deferred decision should be deferred to an
assertion, not to a paragraph.** A paragraph cannot fail, and that one was
believed for two gates.

### The micro-revert, and the same lesson as slice 3

`source` mode given a permitted-origins list — the one thing the file's header
says it will never do. **3 red**, on the invented origin, the empty origin, and
the stable-order test.

**All five conservation tests against Nix's real 84 stayed green**, exactly as in
slice 3. Canon's own origin strings are all recognised, so no volume of real data
can catch an open-world fault; only a hand-built fixture carrying a value canon
does not contain. That is why `entryOf` in `group.test.ts` is hand-written, and
it is now the second independent confirmation of the rule.

### The proof was under-reporting, and had been since slice 3

C's "also had canon's advice" count moved from 9 to 3 with nothing in slice 4
aimed at band 3. It was neither: the truth is **30 of 38**.

`prove-catalogue.mjs`'s visibility helper hit-tested **one** point, 6px below an
element's top edge, and failed the element if that point was off-screen or
covered. For a band taller than the fold, `scrollIntoView({block:'center'})`
cannot centre it, so the point landed at y = -63, -95, -109. Others were behind
the app's own `header.fixed.top-0.h-14` (pre-existing) or behind slice 4's new
sticky group heading. Occlusion was being reported as absence.

Rewritten to intersect the element with the viewport and sample five points down
the visible strip — stricter evidence, not looser, and it stops confusing "behind
the chrome" with "not there". `_snap/band3.mjs` is **kept** as the independent
cross-check: it reaches 30 by asking only "is it in the DOM", never "is it
visible", so the two numbers do not share a method. Band 3 is *counted, not
required*, so nothing can make C go red over this number — an independent second
measurement is the only thing that can keep it honest.

**This is the general shape of the fault this phase keeps finding: a number in a
proof that nothing could falsify.** It is the same shape as Gate 3's paragraph.

### D was falsified before it was believed

D passed on its first run, which is not evidence. `groups` was given
`.filter(g => g.id !== 'other')` — a chip made into a filter, the exact fault D
exists to forbid — rebuilt, and re-run:

```
FAIL  D · turn: 64 rows · 3 headings summing 64 · 20 KEYS DIFFER
```

Reverted; the rebuild produced `index-DB9pP743.js`, the same hash as before the
falsification, so the revert was exact rather than approximately exact.

### Open question for Marcus, deliberately not decided here

The group heading is **sticky** — it pins to the top of the list so he always
knows which pile he is in, which matters at 390px with 84 rows. The cost is that
it covers the top ~30px of whatever scrolls under it, and the diagnostic above
shows the app's own fixed header already does this. Nothing is unreadable, but it
is a papercut this slice introduced. Raised rather than silently redesigned.

---

## Slice 5, closed 2026-08-29

Preparation that works the way the rule works. The slice was scoped as "a hard
cap plus a message"; what it actually found is that **the app has been telling
Marcus the wrong number, and the number was not close.**

### The finding: 6 of 7, when the rule says 2 of 7

Every prepared-count in this app was `spells.filter(s => s.prepared && s.level >
0)`. For a Paladin of the Hearth all of them are wrong. Four of Nix's six ticked
spells — **Burning Hands, Faerie Fire, Scorching Ray, Warding Bond** — are Oath
grants, and canon's rule 4 says in as many words that they *"do NOT count against
the Prepared Spells number"*. The app counted them.

So it showed him **6 of 7**, one place left. The rule says **2 of 7**. He has had
**five free places all along** and the app talked him out of four of them.

Six call sites computed it. Five now route through `preparedCount`
(`LoadoutPanel.tsx`, `SessionReadyCard.tsx` ×2, `GrimoirePage.tsx`,
`PreparationRules.tsx`); `character.ts:1374` `getPreparedSpells` is deliberately
untouched — it returns a spell *list* for other consumers, not a cap count.

`SessionReadyCard`'s readiness verdict is `nonCantripPrepared >=
maxPreparedSpells`, so under the old arithmetic it drew a green "Ready for
Battle" tick at 6 of 7 while five of his seven places were empty. **A readiness
check computed from the wrong number is worse than none: it is a green tick over
a gap.**

### Canon had already shipped the answer as data

`countsAgainstPreparedLimit` is on all 71 spell records and partitions them
exactly — 50 true, 12 always-prepared false, 9 Blessed Warrior cantrips false. So
`toggle.ts` reads canon's field instead of re-deriving `alwaysPrepared || level
=== 0`, and a test pins the agreement across all 71. Two derivations of one fact
is one derivation more than can be kept in step.

### Proof

| what | how | result |
|---|---|---|
| `toggle.ts` + 21 tests | `vitest run src/lib/prepare/toggle.test.ts` | 21 passed |
| whole repo | `vitest run` | **1237 passed / 7 skipped**, 55 files (was 1216/54 — +21, no regressions) |
| types | `tsc -b --noEmit` | clean |
| bundle | `npm run build` | clean → `index-BKXO1SNt.js` |
| **E** | probe drives the cap by pressing Prepare on real rows | opens 2 used / 5 free / 4 granted → **5 accepted** → refused `cap` → 7 used / 0 free / 84 rows |
| **A B C D F G** | re-run unchanged | all pass |

Screens: `_shots/prepare-card-before.png` (2 OF 7 USED · 5 FREE TO PREPARE · 4
GRANTED FREE · 7 PALADIN LEVEL) and `_shots/cap-refused.png` (the refusal,
canon's rule 1 beneath it, and *"You are not stuck:"* + canon's rule 3).

### Check E is driven, not posed

The cheap version of E seeds a sheet with seven prepared spells and photographs
the refusal. That proves a card renders. It cannot prove the thing this slice is
about. So the probe **presses Prepare on real rows until the app refuses**, and
the number of presses that succeed is itself the evidence: five, then the wall.
That number cannot be arranged — it is a consequence of the arithmetic under
test.

E also asserts what preparing must *not* do: the label on each accepted row must
flip, the refused row's button must **not** tick anyway, and the catalogue must
still paint 84 rows with no duplicate — five of those presses put a spell on the
sheet that `build.ts` then has to merge back against canon by key, and a merge
that missed would double a row silently.

### E failed its first run, and could not say why

First run printed `FAIL` under a paragraph in which every stated fact was true.
The failing clause was one the narrative did not mention: the rules card was
hit-tested wherever the previous check had left the page, and got a false
negative. **The same fault shape this phase keeps finding — a verdict nothing
could explain.** Rewritten so `got` and `ok` are read from one list of *named*
clauses, which cannot drift from the verdict because they are the verdict. The
probe's `seen()` helper also moved into `addInitScript`, so the sweep and E share
one definition rather than two copies that could diverge.

### Two micro-reverts, both red in the browser

| revert | what was changed | what the browser then said |
|---|---|---|
| **B1** | `countsAgainstCap` returns `spell.level > 0` — the app's old arithmetic | `FAIL E · 6 of 7 used · 1 free · 0 granted → 1 accepted` |
| **B2** | the cap check disabled | `FAIL E · 2 of 7 used · 5 free → 24 accepted → NEVER REFUSED → 26 used` |

**B1 is the bug photographed.** Those are the exact numbers Marcus has been
looking at, produced by the current UI under the old arithmetic. Restoring it
rebuilt to `index-BKXO1SNt.js` — the same hash as before the falsification, so
the restore was exact rather than approximately exact.

Three unit micro-reverts were run earlier the same day: disabling the cap check
(3 red), moving the unprepare branch above the `granted` checks (1 red — *an Oath
grant is refused rather than silently UNPREPARED*), and disabling the
`not-a-spell` guard (1 red).

### Real data cannot catch an open-world fault — the third confirmation

`'no-slots'` is **structurally unreachable for Nix**: canon's
`unlocksAtPaladinLevel` tracks slot availability, so `locked` always fires first.
It can only fire when the *sheet* has fewer tiers than canon grants — Gate 3
decision 4's "the sheet wins the state". Proved with a hand-built fixture rather
than left unproved. Same lesson as slices 3 and 4, now on a third module.

### Observed, not fixed

`prepare-card-before.png` shows the Spell Slots module drawing **3RD ●● 2/2** for
a level-7 Paladin, who has no third-tier slots.

**This is not a slice-5 regression and not an unfixed bug.** Item 4 closed in
`docs/plans/slot-truth/`, which deliberately did not overwrite his sheet — the
law there is *it reports, it never corrects* — and instead built **a door**: an
`onAdopt` control on `VitalsBand.tsx` that removes the phantom tier in one press.
The pips are still on this screenshot because the probe seeds Nix's raw export
and has never pressed it, which is also the state Marcus's own app is in if he
has not pressed it either.

Worth one sentence to him: the fix exists and is one tap, but it is a tap he has
to take, and nothing in the app is currently insisting.

## Slice 6, closed 2026-08-29

Marcus, item 8: *"in the combat tab, it doesnt seem to have all of my available
reactions available. I should have the hearthfire manifest, sentinal, and
interception."* And in his second message: *"Interception is indeed a fighting
style. That should be placed somewhere in app so i can read details, and also in
combat."*

**Nothing in this slice built a reaction row.** `turn/feats.ts` has always been
able to make one from any `CharacterFeat` whose text costs a Reaction, and
`catalogue/build.ts:66` already named `prepare/fighting-style.ts` in a comment
written in slice 1. What did not exist was **anyone asking him which style he
took.** This slice is that question and its answer, and it is deliberately small:
a picker that needed a hundred lines would have meant the seam was wrong.

### What shipped

| file | what |
|---|---|
| `src/lib/prepare/fighting-style.ts` | new — the module. Canon's menu by category, canon record → `CharacterFeat`, record/clear/toggle |
| `src/lib/prepare/fighting-style.test.ts` | new — 35 tests |
| `src/components/grimoire/FightingStylePicker.tsx` | new — eleven rows, canon's rules text on each, canon's Paladin advice on the 6 that have it |
| `src/components/grimoire/CatalogueRow.tsx` | `extra?: ReactNode` slot, rendered **below** the action strip |
| `src/components/GrimoirePage.tsx` | `handlePickFightingStyle`, and the `extra=` wiring on the one row keyed `fightingstyle` |
| `src/lib/canon/types.ts` | `CanonFeat.paladinNote` retyped `string \| null` |
| `docs/plans/grimoire/prove-catalogue.mjs` | check **H**, and `settle()` gained a page parameter |

The picker lives **inside the Fighting Style class-feature row**, under the three
bands that explain what a Fighting Style is — choice and explanation one tap
apart. It takes a `CanonFeat`, never a name, so "a style canon has never heard
of" is unrepresentable rather than handled (finding BG). The level gate is not
duplicated: it is the row's existing `lockedUntil`, passed down.

### Proof

| what | how | result |
|---|---|---|
| the module | `vitest run src/lib/prepare/fighting-style.test.ts` | **35 passed** |
| whole repo | `vitest run` | **1272 passed / 7 skipped**, 56 files (was 1237/55 — +35, no regressions) |
| types | `tsc -b --noEmit` | clean |
| bundle | `npm run build` | clean → `index-DfEq3dpu.js` |
| **H** | probe picks Interception in the Grimoire, then walks to the combat tab | 84 rows → 11 styles, **all 11 readable** → pressed → 85 rows → reactions band **2 rows: Interception, Opportunity Attack** |
| **A B C D E F G** | re-run unchanged | all pass |

Screens: `_shots/fighting-style-picker.png`, `_shots/fighting-style-chosen.png`
(Interception ticked, canon's rules text and canon's Paladin note beneath it),
`_shots/interception-in-combat.png` (the row on the combat tab: *WHEN a creature
you can see hits another creature within 5 feet of you with an attack* /
*reduce that damage by 1d10 plus your Proficiency Bonus*).

### Check H runs on a second page, and that is load-bearing

`ctx.addInitScript` writes the sheet **unconditionally** on every navigation, so
a new page is a fresh sheet. H therefore starts from his export exactly as A did,
and E's five prepares are gone. Continuing on the first page would have made
"84 rows before the pick" — the number the 85 afterwards is only meaningful
against — a number about E.

The picker is the **only** thing H writes. Everything after the tap is read back
through a screen he can look at (the catalogue re-counted, the reaction re-read
on the combat tab), never out of the storage the picker wrote — finding BM.

### Three bugs the proofs caught

1. **`fightingStyles()` returned 10, not 11.** Canon files Blessed Warrior under
   `category: "Fighting Style (Paladin-only alternative)"`, so `=== 'Fighting
   Style'` dropped the only Paladin-exclusive style. The serious half:
   `isFightingStyleFeat` asked the same question, so a Blessed Warrior already on
   the sheet would not have been recognised as a style, and picking Interception
   would have left him holding **both** — the app inventing an ability. Fixed
   with an anchored prefix regex behind `isFightingStyleCategory()`, used by both.
2. **`paladinNote` is `null` for 5 of the 11** (Archery, Blind Fighting, Great
   Weapon Fighting, Two-Weapon Fighting, Unarmed Fighting). The type said
   `?: string`, so it could not describe its own data, and a caller trusting it
   renders the word "null" as advice. Retyped; the picker shows advice where
   canon has it and **nothing** where canon is silent.
3. **The probe navigated by `hasText: 'Combat'`** — a case-insensitive substring
   match over the whole subtree — and by that point eleven style buttons carrying
   canon's paragraphs were open, several containing the word "combat". Playwright
   clicked one of them, which **silently changed his fighting style while
   claiming to navigate**, and check G still reported "clean": a click that lands
   on the wrong *visible* element is a successful click. Now
   `[role="tab"][aria-label="Combat"]`, plus a clause asserting the Combat tab is
   the tab he is on — the clause that would have caught it on the first run.

### Micro-reverts

| revert | what was changed | what then went red |
|---|---|---|
| **M1** (unit) | `recordFightingStyle` stops writing the `CharacterFeat` | **12 failed / 21 passed** — the whole WIRE group, the replace group, the un-pick group, both Grimoire-consequence tests |
| **M2** (unit) | `isFightingStyleCategory` reverts to `category === 'Fighting Style'` | **3 failed / 30 passed** — eleven styles, Blessed Warrior in the menu, Blessed Warrior's nine cantrips |
| **M3** (browser) | the `extra=` wiring removed from `GrimoirePage` | **FAIL H, 15 named clauses**, and the reactions band drops to **1 row (Opportunity Attack)**. A–G unaffected |

M3 restored rebuilt to `index-DfEq3dpu.js` — the same hash as before the
falsification, so the restore was exact.

A weaker falsifier was considered and rejected: emptying `effects` in
`fightingStyleFeat`. It would **not** have gone red — `effectSentencesOf`
(`turn/feats.ts:133`) falls back to canon when the sheet carries no usable text,
so the reaction survives a sheet with no words at all. Worth knowing as a
robustness fact; useless as a proof.

### Finding: `featReactionOptions(nix)` returns **0 rows**

Measured on his real sheet by `docs/plans/grimoire/measure-reactions.mjs`. He has
Sentinel, canon knows Sentinel, canon's Sentinel has two reaction-shaped
sentences — and the engine produces nothing, because `effectSentencesOf` gives
the **sheet's** words priority and the importer that built his sheet filled
`effects` with three audience bullets:

> "Polearm Master (OA when enemies enter your 10 ft reach)"
> "Reach weapons (Glaive, Halberd) for a massive control zone"
> "Fighters, Paladins, and other frontliners who want to lock enemies down"

Those are notes about *who should take the feat*. None costs a Reaction, so none
is reaction-shaped, so canon's real text never gets a turn.

**This is the other half of item 8** and `04-slices.md` puts it outside these
seven slices on purpose: it is a fix to *text provenance* in `turn/feats.ts`, and
it deserves its own slice and its own micro-revert. The contrast is the useful
evidence — same file, same rule, two outcomes. **Interception works because the
picker writes real rules text; Sentinel fails because his importer wrote
bullets. The fault is in the words, not the engine.**

### Marcus's scope constraint, measured — no code change

> *"we do NOT need to include spells and abilities my character will never be
> able to use, I.e spells and abilities from other oaths and such"*

Answered by looking, not by believing: `docs/plans/grimoire/measure-scope.mjs`.
The 84 are **53 general Paladin spells + 9 Oath of the Hearth grants + 16 general
Paladin class features + 4 Oath of the Hearth features + 2 feats already on his
sheet** (Sentinel, Lucky). **Zero rows come from another oath** — Channel
Divinity's only subclass option is Hearthfire Manifest. The one genuinely
out-of-scope block, the 9 Blessed Warrior Cleric cantrips, is already excluded
*and the exclusion is enforced* (`build.test.ts:211` pins 62 for his sheet,
`:228` pins 71 for a sheet that has the style).

Nothing in the 84 is "never usable": **46 usable now, 38 locked ahead on his own
progression** — spells 12@L9, 8@L13, 10@L17; features one each at L9, L10, L11,
L14, L15, L18, L19, L20.

**No Gate 1 backtrack. The 84 stands, and checks A, B and D stay pinned to it.**
(H asserts **85** after the pick, because the pick adds Interception.)

## Slice 7, closed 2026-08-30

Nothing new is visible. This is the slice that says the six before it are true
**at the same time, on one build, on one screen size** — which is a different
claim from six slices that each passed on the day they were written, against six
different bundles.

### The phase proof

One tree, one `vite build`, one served bundle, one 390×844 viewport.

| | |
|---|---|
| `npx tsc -b --noEmit` | exit 0 |
| `npx vitest run` | **1272 passed / 7 skipped · 56 files** |
| `npx vite build` | clean → `index-DfEq3dpu.js` + `index-BaDeFW9d.css` |
| served on `:4321` | confirmed serving **that exact pair** before the probe was trusted |
| `prove-catalogue.mjs` | **A B C D E F H G — all PASS** |

```
A  84 painted · 84 distinct keys
B  38 lock chips, none malformed
C  38 locked · 38 opened whole · 30 also had canon's advice
D  level 84/6 headings · source 84/3 · turn 84/4 · ready 84/3 — same keys under all four
E  2 of 7 used · 5 free · 4 granted → 5 accepted → REFUSED "cap" → 7 used · 0 free · 84 rows
F  84/84 opened · band 1 tallest 494px of 844 · 69 priced, all shown
H  84 rows → 11 styles, 11 readable → pressed Interception → 85 rows
   → reactions band: Interception, Opportunity Attack
G  clean console
```

Every one of those has been shown able to fail, in the browser, on this app:
C and F at a 420px viewport (slice 3), E under both halves of the old prepared
arithmetic (slice 5), H with the picker's wiring removed (slice 6). **A proof
that has only ever passed is not evidence.**

### The compaction

`00-status.md` grew to ~700 lines across six slices, and its "Notes for a fresh
session" had ended up in the *middle* — after slices 1–3, before slices 4–6. A
new session reading top-down met three slice post-mortems before it met the
briefing.

So the file now opens with **RESUME HERE**: state, the phase's whole footprint in
`src/`, the four commands that re-run every proof and the four environment facts
each of them needs, the pinned numbers, what the corpus actually contains, and a
numbered list of what is open. The per-slice records stay below it, unedited, as
evidence rather than briefing.

`docs/plans/HANDOFF.md` was stale in one load-bearing way — it still said *"there
is no phase 3 yet"* — and has been brought current in five places: §1 gained the
phase-3 row and a paragraph on what Open Book delivered, §3 gained four
environment facts (vite-node needs a real file **inside the repo**; the IPv6 URL,
the `/the-codex/` base and the classifier's refusal to start a preview server;
resolving Playwright out of the npx cache; confirming the served hash), §4 gained
the five laws below, §5's test-surface count moved 1099/47 → 1272/56, and §6
gained the Sentinel provenance fault and the `vitals.ts:195` twin.

### The laws this phase produced, now in HANDOFF §4

Each was paid for by a proof that looked green while measuring nothing.

| law | what it cost |
|---|---|
| the printed narrative and the verdict must come from **one** list of named clauses | a check whose sentence and whose `ok` had drifted apart |
| a deferred decision must be deferred to an **assertion**, not a paragraph | the recurring shape: *a number in a proof that nothing could falsify* |
| a `hasText` locator can click the **wrong visible element** and nothing throws | check H clicked a fighting-style card, silently changed his style, and the clean-console check still said clean |
| a proof that has only ever passed is **not evidence** | every micro-revert in this phase |
| a screenshot after a scrolling probe photographs where the **probe** finished | paid for twice — check E's `cap-refused`, check H's `fighting-style-chosen` |

### Left on disk on purpose

`_snap/detail-BEFORE.json`, `_snap/detail-snapshot.json`, `_snap/detail-new.ts.bak`
and `_shots/_revert/`. All are scratch or falsification evidence; none is read by
anything. Deleting files is ASK-FIRST under Command's guardrails, so they are
**listed** for Marcus rather than cleared away — the same rule that made slice 2's
two dead test files wait two slices for his word.
