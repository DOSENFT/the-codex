# Status: Sheet Truth — one source for every number

Phase 2 of the Codex tightening. Phase 1 was `docs/plans/table-truth/` (closed,
deployed to `main` at `ea28aad`, live).

- Gate 1 — Product: **APPROVED 2026-08-28**
- Gate 2 — Architecture: **APPROVED 2026-08-28**
- Gate 3 — Program Design: **APPROVED 2026-08-28**
- Gate 4 — Slice plan: **APPROVED 2026-08-28**

**All seven slices done. Phase complete 2026-08-28, awaiting deploy to `main`.**

## Open, and deliberately left open

**The aura-radius fork — Marcus ruled "leave it for now" (2026-08-28).** Canon states the
Aura of Protection radius as prose in **eight places across five strings**, listed by name
in `AURA_RADIUS_IN_PROSE` in `personalise.test.ts`. They are correct at every level Marcus
will play for a long while and go wrong only at **level 18**, when the aura widens from 10
feet to 30. Templating them would mean a seventh word in the placeholder vocabulary
(`{auraRange}`), which is a Gate 3 change, not a slice. The pinned list IS the worklist for
whoever reopens this — it is a decision to defer, not an oversight.

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
- [x] **Slice 3 — there is no second copy.** Done 2026-08-28.
      Files: `src/lib/character.ts` — `Character` split into `CharacterBase & DerivedNumbers`,
      the four derived fields removed from the stored interface and replaced by
      `spellSaveDCOverride` / `spellAttackBonusOverride` / `maxPreparedSpellsOverride`;
      `saveCharacter` takes a `CharacterBase` and writes `storableOf(character)`;
      new `noteRetiredNumbers` writes a plain-language line into the existing repair log;
      `migrateFromLegacy` routed through `normalizeCharacter` (see finding BI);
      `src/lib/rules-2024/vitals.ts` — `proficiencyForLevel` delegates to `proficiencyFor`
      (finding BJ); `src/lib/import-character.ts`, `src/components/CharacterSetup.tsx`
      (a fifth copy of the proficiency formula deleted), `src/components/Settings.tsx`;
      `src/lib/rules-2024/storable.test.ts` (new, 13 tests); `derive.test.ts` +4 tests, 2 retargeted;
      `character.save.test.ts` widened to `CharacterBase`, no assertion softened.
      Full suite **1033 green** / 45 files / 7 skipped, `tsc -b --noEmit` clean.

      **Visible change: none, deliberately.** Slices 1–2 made the numbers right; this one
      makes them unable to go wrong. Both regression probes still read **0** against the
      slice-3 build (`_probe-follow.mjs`, `_probe-baseline.mjs`).

      **Measured by micro-revert, not asserted.** Each claim pinned to the line it guards by
      putting that line back; both files restored byte-identically afterwards, verified with
      `diff`:

      | line put back | tests that go red |
      |---|---|
      | `storableOf(character)` → `character` on write | 2 |
      | the demotion in `normalizeInner` | 1 |
      | `proficiencyForLevel` doing its own arithmetic | 1 |
      | `migrateFromLegacy` hand-rolling its defaults | 2 |
      | `migrateFromLegacy` passing `id` as a fallback rather than forcing it | 1 |

      So **6 of 13 are pinned to a line of the slice; 7 are forward guards** that cannot fail
      against old code and are labelled as such in the file — three exercise `storableOf` /
      `DERIVED_KEYS`, which did not exist; three are source scans (finding BG: forbid the
      fault rather than fail to observe it); one is a slice-1 regression guard that also
      stops "delete the four numbers" from being a route to green.

#### Three things slice 3 turned up that were not in the plan

1. **FINDING BI — the unit tests were green and the app was wrong.** `migrateFromLegacy`
   never called `normalizeCharacter`; it spread the legacy record straight into
   `saveCharacter`, which now deletes the four derived keys on the way to disk. So the
   stored number was not *retired*, it was *destroyed*, and the demotion every other read
   path performs never ran. Invisible for Marcus — the app can work a Paladin's DC out
   again — but for a class with no casting rule the override is the only place that number
   can live, and for a Cleric, Druid or Wizard the same is true of `maxPreparedSpells`.
   **Found by `_probe-disk.mjs` in a real Chrome, reporting `overrides kept: (none)`.**
   `storable.test.ts` was fully green at the time: a unit test only checks the write paths
   it calls, and it never called this one. This is the concrete argument for the browser
   probe existing at all.
2. **The first fix introduced a worse bug, and the same probe caught it.** Routing through
   `normalizeCharacter(parsed, id)` passes `id` as a *fallback*, and a legacy record carries
   an id of its own — so the sheet was filed under that id while `setActiveId` pointed at a
   freshly minted one. Active id named a character that did not exist and the app booted to
   the roster picker instead of Marcus's sheet. The old code's unexplained `character.id = id`
   was load-bearing. Now forced, commented, and pinned by an assertion — one that was itself
   inert until the fixture was given an id, because a prefix scan finds the record either
   way. It is just not the one anybody asked for.
3. **FINDING BJ — a comment asserting an invariant is not the invariant.** Slice 1's
   `derive.ts` claims to hold "THE ONLY COPY" of the proficiency formula and names
   `vitals.ts:84 proficiencyForLevel` among those it replaced. It had not replaced it, and
   the two copies had **already drifted**: `vitals.ts` clamped only the bottom
   (`Math.max(1, level)`), `derive.ts` clamps both. A level-24 character — nothing prevents
   one, `level` is a free number — got +7 from one and +6 from the other, so the discrepancy
   reporter would have accused the sheet using a number the app itself no longer agreed
   with. **Found by the source scan, not by reading.**
- [x] **Slice 4 — Level Up moves everything.** Done 2026-08-28.

   `src/lib/rules-2024/pools.ts` (new) is the one producer of every level-scaled pool
   maximum, read from canon's own `layOnHandsPool` and `channelDivinityUses` columns.
   `resolveCharacter` calls it, so the repair happens on every read and every write and
   **nothing special happens on level-up at all** — raising `level` and saving is the
   whole of it. `computePaladinResources` now delegates instead of holding a sixth copy
   of the rule. The toast names what moved.

   **Measured in a real Chrome (`_probe-levelup.mjs`, four boundary cases, 390×844):**

   | | before (slice 3, :4220) | after (slice 4, :4221) |
   |---|---|---|
   | correct after the tap | 23 of 29 | **29 of 29** |
   | already-spent kept | 7 of 7 | 7 of 7 |
   | spell slots untouched | yes | yes |

   What the app now says, instead of *"Update your spells and features as needed"*:
   > Leveled up to 9. Proficiency 3 → 4, Spell save DC 14 → 15, Spell attack 6 → 7,
   > Prepared spells 7 → 9, Lay on Hands 40 → 45. Spell slots are still yours to set.

   **The scope this slice was widened to cover, and why.** The plan said "derive
   `paladinResources`". Nix **has no `paladinResources`** — his Lay on Hands is a
   `features[].usesMax`, which is what the Grimoire, the loadout panel, print and the AI
   prompts all read, while `paladinResources` is read by two surfaces. Shipping the plan
   as written would have moved a number he cannot see and left the one he reads stale:
   a half-built feature running as if done. Both storage sites are now repaired by the
   same function, matched through `poolIdFor()` — the app's **existing** name→pool map,
   the one `compose.ts` already prices with and `reduce.ts` already pays with — so this
   adds no new name-recognition and cannot disagree with what the app charges.

   **21 new tests in `pools.test.ts`. Six pinned by micro-revert:**

   | line put back | tests that go red |
   |---|---|
   | `resolveCharacter` not calling `applyPoolMaxima` | 8 |
   | feature-backed pools left alone (slice 4 *as planned*) | 6 |
   | growing a pool refills it (`current = max`) | 3 |
   | `computePaladinResources` hand-typed again | 1 |
   | aura range left where it was stored | 1 |
   | the open-world gate removed (canon's column applied to any class) | 1 |

   Files restored byte-identically after every revert, verified with `diff`. Suite
   **1054 passed / 46 files / 7 skipped**, up from 1033 / 45.

   **New findings:**
   1. **FINDING BK — canon disagreed with the code about level 1, and nothing noticed.**
      `computePaladinResources` used `level >= 11 ? 3 : 2`, giving a level-1 paladin two
      uses of Channel Divinity. Canon's `channelDivinityUses` column says **0** until
      level 3, which is right — the feature is not gained until then. A sixth hand-typed
      copy of a rule canon already carried as a column, drifted at the bottom end where
      nobody plays and so nobody looked.
   2. **FINDING BL — a probe that reads by proximity must check the anchor's box too.**
      The screen reader walked up from a leaf whose text was exactly "Lay on Hands" and
      took the nearest `n/m`. It reported **76** — the hit-point bar. The permanently
      mounted print view carries its own zero-height "Lay on Hands" span, and the walk
      anchored there. Finding Q said a claim about the screen must be geometric; this is
      the corollary: *both ends* of a geometric claim need a box.
   3. **Marcus's sheet is wrong right now, today, at level 7.** It carries Lay on Hands
      at **40** points; canon's level-7 row is **35**. Slice 4 corrects it on load, with
      his 15 remaining points untouched. This is the one number in the phase that goes
      *down* — recorded here because it is a visible change to his live sheet.
   4. **`auraRange` has no canon column** — canon states it only in prose ("10-foot
      Emanation from you (30 feet at level 18)"). The two distances therefore stay
      declared in `pools.ts`, but the *levels* are read from canon's `classFeatures`
      lists, which are structured. A test asserts canon's prose still contains both
      numbers, so a canon package that reworks the aura is a red test the day it lands.
- [x] **Slice 5 — the prose seam, proved on one string.** Done 2026-08-28.

   New `src/lib/canon/personalise.ts` + `personalise.test.ts` (29 tests), wired at
   `detail.ts:288` — **after** `splitTactics`, so canon's headings are still found in
   the text its author wrote. Exactly one canon string templated: **Bless**.

   **What moved, in app behaviour.** Bless's "How to use it" band used to tell Marcus:
   *"At level 7 with Charisma 18 that is +1d4 and +4 to every save inside 10 feet of
   you."* His Charisma is 16. It now reads *"At level 7 with Charisma 16 that is +1d4
   and +3"*, and the closing line reads *"a level 7 Paladin"* at level 7 and *"a level
   9 Paladin"* at level 9. Nothing else in canon changed.

   **Measured on the real app** (`_probe-tactics.mjs`, Chrome 390×844, two seeded
   characters, each claim a Range around the substring with `getClientRects` + an
   `elementFromPoint` occlusion check — never `textContent`):

   | | before (slice 4, :4221) | after (slice 5, :4222) |
   |---|---|---|
   | claims satisfied | **14 of 24** | **24 of 24** |
   | «Charisma 18» painted at CHA 16 | yes | no |
   | «+1d4 and +4» painted at CHA 16 | yes | no |
   | «At level 9» painted at level 9 | no | yes |
   | placeholders leaked to the screen | — | none, anywhere in the document |
   | canon's 4 headings survive | yes | yes |

   Shots: `shots/slice5-bless-tactics-before-slice4.png` · `…-after-slice5.png`.

   **Micro-reverts — 7 guards put back, each verified to have landed before the result
   was believed** (the CRLF lesson from slice 4; `detail.ts` is CRLF, the other two LF):

   | line put back | tests red |
   |---|---|
   | the seam unplugged from `detail.ts` | **3** ← see below |
   | unresolvable segments printed rather than dropped | 6 |
   | canon's Bless string untemplated | 5 |
   | `saveDC` / `spellAttack` not gated on being a caster | 5 |
   | the decimal guard removed from `segmentsOf` | 1 |
   | a negative modifier printed under canon's "+" | 1 |
   | an emptied bullet rendered as a bare heading | 1 |

   All three files restored byte-identically, verified with `diff`. Suite **1083 passed
   / 47 files / 7 skipped**, up from 1054 / 46. Typecheck clean.

   **New findings:**
   1. **FINDING BM — the micro-revert found nothing, and that was the finding.** With
      all 26 tests written, deleting `personaliseBullets` from `detail.ts` — unplugging
      the entire slice from the app — left the suite **green**. Every test was aimed at
      the FUNCTION and none at the WIRE. That is finding BI in a new coat: a correct
      module the app does not call is a half-built feature running as if done, and only
      the browser probe would have caught it. Section 6 of the test file now pins the
      seam at `optionDetail`, through the same path the Play tab takes. **The reverts
      are not a formality; this one changed the slice.**
   2. **FINDING BN — canon's aura radius is a seventh derived number, and it is still
      baked.** Bless's sentence ends "…to every save inside **10 feet** of you". That
      is right at level 7 and wrong at level 18, where Aura Expansion makes it 30 —
      `pools.ts:auraRangeFor` already computes it. It is NOT templated, because the
      approved vocabulary is six placeholders and widening it is a Gate 3 decision, not
      a regex edit. **Raise at slice 6.**
   3. **One canon number was removed rather than parameterised, and it is the only one.**
      The same sentence ended "…is passing roughly 35%% more saves than one that is
      not." That figure is `(2.5 + CHAmod) / 20` — 32.5% at Charisma 18, 27.5% at 16 —
      so it is a consequence of a placeholder, and the six-word vocabulary cannot do
      arithmetic. Rather than leave a number that silently assumes Charisma 18, the
      clause now reads "…is passing saves it would otherwise fail, all fight long."
      Canon's claim is kept; canon's stale arithmetic is not.
   4. **The ledger, not a skip.** `personalise.test.ts` asserts the EXACT list of advice
      strings still carrying a baked `Charisma <digits>`: seven that slice 6 owns, plus
      **Circle of Power**, which is permanent. Circle of Power says "At level 17 with
      Charisma 20…" — a projection of a Paladin Marcus is ten levels from being, written
      to show what the spell becomes. Substituting his numbers would not correct it, it
      would destroy its point. The list can only shrink; a new baked number anywhere in
      canon fails on the day it lands.
- [x] **Slice 6 — the remaining seven canon strings, hand-edited and classified.** Done 2026-08-28.

   **What moved, and why.** Slice 5 built the mechanism and proved it on Bless. Slice 6
   is the mechanism applied: six more pieces of advice that were each telling Marcus a
   false number about his own character every time he opened them, plus a seventh that
   was fixed a different way for a reason worth writing down.

   | string | canon said, to a Charisma 18 Paladin | Marcus now reads |
   |---|---|---|
   | Command | "At level 7 with Charisma 18 your DC is 15" | **"At level 7 with Charisma 16 your DC is 14"** |
   | Scorching Ray | "At level 7 with Charisma 18 that is +7." | **"…Charisma 16 that is +6."** |
   | Resistance | "+4 at Charisma 18, permanently" | **"+3 at Charisma 16, permanently"** |
   | Heroism | "At Charisma 18 that is 4 temp HP … up to 40 points" | **"At Charisma 16 that is 3 temp HP …"** |
   | Dispel Magic | "at Charisma 18 you have +4 … you succeed 50%% of the time" | **"at Charisma 16 you have +3 …"** |
   | Aura of Purity | "at level 7+ … Advantage plus +4 … 85%% instead of 45%%" | **"…Advantage plus +3 …"** |
   | Inspiring Leader (feat) | "At level 7 with Charisma 18 that is 11 Temporary Hit Points" | **"…equal to your level plus your Charisma modifier"** |

   **The measurement** (`_probe-slice6.mjs`, real Chrome 390×844, geometry not `textContent`).
   Two cases: level 7 — his real sheet — and level 13, where every number moves and the
   two high-tier spells become castable at all.

   | | before (slice 5, :4222) | after (slice 6, :4223) |
   |---|---|---|
   | claims satisfied | **35 of 66** | **66 of 66** |
   | «Charisma 18» painted anywhere | 6 sheets | none |
   | numbers move from level 7 → 13 | no | yes (DC 14→16, atk +6→+8) |
   | placeholders leaked to the screen | — | none, in any sheet or the document |
   | ellipsis / clipping | none | none |

   Suite **1095 passed / 47 files / 7 skipped** (up from 1083). Typecheck exit 0.
   Screenshots: `shots/slice6-command-{before-slice5,after-slice6}.png` — the WEAKNESS
   bullet, "your DC is 15" → "your DC is 14", on his real level 7 sheet.

   **Seven micro-reverts, each verified to have landed before its result was believed**
   (the slice-5 lesson: a perl pattern that silently matches nothing reports all-green):

   | broken on purpose | tests that went red |
   |---|---|
   | Command untemplated | 3 |
   | Inspiring Leader's note re-baked | 2 |
   | a placeholder put in an unreadable field | 2 |
   | Aura of Purity's "at level 7+" restored | 1 |
   | the 85%%/45%% consequence restored | 1 |
   | Scorching Ray's attack frozen at his level-7 value | 1 |
   | a fifth aura-radius sentence added | 1 |

   **Four things this slice decided, not just did:**

   1. **FINDING BO — canon contradicted itself, and the table won.** Aura of Purity's
      advice said "at level 7+ your Aura of Protection already gives…". Canon's own
      progression table lists Aura of Protection at **level 6**, and
      `pools.levelOfClassFeature` — which the app's aura maths actually runs on — reads
      that table. The clause is **gone** rather than corrected to 6: "already" was always
      doing the work, since Aura of Purity is a level 4 spell and any Paladin who can cast
      it has had the aura for years. A level qualifier there could only ever be a second
      place to get the number wrong.

   2. **FINDING BP — a placeholder may only live in a field that has a reader.**
      `personalise` has exactly one call site: `detail.ts:284`, on a spell's `tactics`.
      **Nothing in the app reads `paladinNote`** — outside canon the only mention in all
      of `src/` is the optional field declaration in `canon/types.ts`. So Inspiring
      Leader's false "11 Temporary Hit Points" was **removed, not templated**: a `{CHA}`
      there would never be resolved by anyone, and would sit in the data looking finished
      until the day someone rendered that field and printed a literal brace on his screen.
      It now states the formula in words, which is true for every character at every level
      and needs no reader to make it true. A test pins the rule.

   3. **FINDING BN, decided: the vocabulary stays six words.** Canon states the aura
      radius as prose ("within 10 feet") in **eight places across five strings**, and
      `pools.auraRangeFor` returns 30 at level 18 — so those sentences do go wrong, at
      level 18. They are not wrong for Marcus, and this slice's mandate is strings that
      lie to him *today*. Growing the vocabulary is a Gate 3 decision, not a regex widened
      mid-slice. The eight are pinned by name in a test, so a ninth is a deliberate edit
      and the day he reaches 18 that test is the worklist. **This is the open fork for
      Marcus: leave them, or take it back to Gate 3 and add `{auraRange}`.**

   4. **Three stale consequences removed rather than recomputed** — 40 = 4 temp HP × 10
      rounds, 50%% = a +4 check against DC 15, 85%%/45%% = Advantage plus +4. Each was
      arithmetic *downstream* of a placeholder, which the six-word vocabulary cannot do
      and must not learn to. The numbers went; the claim each supported was kept in words.
      Same ruling as Bless's "roughly 35%% more saves" in slice 5.

   **The ledger is now empty.** `SLICE_6_OWNS` is `[]` and the test stays — an empty list
   that must stay empty is a stronger statement than a deleted check. **Circle of Power**
   remains in `PROJECTIONS`, permanently and by decision.

   **One thing the probe found that was not slice 6's fault.** `options.ts:253` drops a
   prepared spell whose tier is absent from `character.spellSlots`. The seed fixture ships
   a level 8 Nix whose stored map holds tiers 1 and 2 only, and that map survives raising
   `level` — so the first run reported no row for Dispel Magic (3) or Aura of Purity (4)
   even at level 13. That looked like a failure and was really the seed telling the truth
   about a level 8 character. The probe now takes its slot tiers from canon's progression
   table for the case's level.
- [x] **Slice 7 — the discrepancy cases kept, and proved unreachable.** Done 2026-08-28.

   **What moved, and why.** Nothing on any screen — this slice changed comments and tests
   only, and that is the point of it. Slices 1–4 retired the stored save DC, spell attack
   and proficiency bonus, which quietly made three of `discrepancies()`'s four cases
   impossible to trigger through the app's own door. Code that cannot fire and says
   nothing about it is exactly the "half-built feature running as if done" the guardrails
   forbid. So the three are **kept** (Gate 3, least-confident #5) and now carry a proof
   instead of a promise, and `vitals.ts`'s comments — which still described the stored
   numbers as the preferred truth — were rewritten rather than left to rot.

   **The sweep.** `vitals.test.ts` §slice 7 builds 13 classes × 23 levels × 10 ability
   lines = **2,990 characters**, every one of them through `resolveCharacter`, and asserts
   that not one produces a `save-dc`, `spell-attack` or `proficiency` flag. Test 20 pins
   the *reason* — resolving a resolved sheet moves nothing — so the property is explained,
   not just observed. Test 21 keeps forged sheets tripping all three. Test 22 pins spell
   slots as reporting forever, by design.

   **Suite 1099 passed / 47 files / 7 skipped. Typecheck 0.**

   **The micro-reverts, and the two that taught something.**

   | revert | red |
   |---|---|
   | R1 — `resolveCharacter` stops computing proficiency (via a `??` fallback) | **0** |
   | R1′ — `resolveCharacter` computes a *constant* proficiency | 1 |
   | R2 — stored save DC trusted again | 3 |
   | R3 — the save-dc case deleted rather than kept | 3 |
   | R4 — `resolveCharacter` overrules his spell slots | 1 |
   | R5 — the sweep stops sweeping | 2 |
   | R6 — stored spell attack trusted again (via a `??` fallback) | **0** |
   | R7 — `resolveCharacter` reads a field it writes (idempotence broken) | 6 |

   **FINDING BQ — a revert through `??` on a field nothing supplies is a no-op, not a
   weak test.** R1 and R6 both went green and both looked like finding BM all over again.
   They were not. `storableOf` (`derive.ts:226-230`) *deletes* the four `DERIVED_KEYS`, and
   `spellAttackBonusOverride` is absent from Nix — so `base.proficiencyBonus ?? computed`
   and `base.spellAttackBonusOverride ?? computed` had nothing to fall back to and took the
   computed branch every time, for all 2,990 characters. The revert has to break the
   **producer**, not a fallback with an empty left-hand side. R1′ does, and goes red.

   **FINDING BR — the save-DC and spell-attack checks cannot be broken by any change to
   the formula.** `computeSpellSaveDC` *is* `resolveCharacter(char).spellSaveDC`
   (`character.ts:439`), so the check asks a resolved character whether resolving it again
   would move it. Change the formula however you like and the answer stays no. Only
   breaking **idempotence** can trip them — which is why R7 exists and why test 20 is
   load-bearing rather than decorative. R7 makes `resolveCharacter` read a field it writes,
   and takes tests 19 *and* 20 red.

   **`VitalsBand.tsx` checked, deliberately not edited.** It is entirely count-driven
   (`flags.map`, "disagree on N things") and names none of the four ids, so nothing in it
   became false; its one specific comment already names spell slots as the case that
   survives. An edit here would have been motion, not work.

### Phase close — the headline claim, measured

`_probe-phase-close.mjs` writes **one storage blob into two builds**: Marcus's real ability
line (CHA 16) carrying the stale numbers his sheet had actually accumulated (DC 15, attack
+7). Neither build is told anything the other is not.

| painted on the Play tab | pre-phase (`main` @ `ea28aad`, :4217) | today (:4223) |
|---|---|---|
| Save DC | **15** | **14** |
| Sp Atk | **+7** | **+6** |
| Prof | +3 | +3 |
| disagreement panel | "disagree on **2 things**" — Spell save DC · Spell attack bonus | **none shown** |

Shots: `shots/phase-close-vitals-before-main.png` · `shots/phase-close-vitals-after-slice7.png`.

**Verified on the deployed site, 2026-08-28.** Pushed `ea28aad..8b8a9c8` to `main`; run
`33209588109` green in 52s. A green run is not a proof that anything shipped — commit
`0d8920e` records this same pipeline printing success while deploying nothing, twice — so
the live bundle hash was checked (`index-BdvvtPEw.js`, not the pre-phase `index-BdTx4OUs.js`)
and then the probe was re-run against `https://dosenft.github.io/the-codex/` itself:

```
Save DC painted : 14   (topmost at its own centre)
Sp Atk painted  : +6
disagreement    : none shown
```

The live bundle hash is byte-identical to the slice-6 build, which is corroboration rather
than a worry: slice 7 changed comments, tests and docs only, so it *should* compile to the
same bytes.

The warning panel is gone from the second picture not because it was suppressed but
because the drift it reported can no longer happen. That is the phase in two images, and
it is the answer to *"what I change in the prep screen must directly effect and be used
app wide"*.

**Finding BL, paid for a second time.** The probe's first run reported `Prof` as NOT FOUND
on **both** builds — which would have read as "the band lost a number". It had not:
`uppercase`/`truncate` are CSS only, so the label text really is `Prof`, and a label really
was found. It was a *different* `Prof` elsewhere on the Play tab, whose box holds no
numeral. The same sloppiness clipped the "after" screenshot to a single stat box (4KB
against the "before"'s 58KB) — two pictures of different things, which is not a
comparison. Both are now scoped to the band, located as the smallest element containing
all five of its labels.

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
