# The Codex — cross-phase handoff

**What this file is.** The state of the work, the discipline that produced it, and the
things that cost real time to discover. It is written so a new session can start here and
be useful in one read, without re-deriving what is already known.

**What this file is not.** It is not the plan for the next phase, and it does not say what
should be built next. That is Marcus's call and it has not been made.

**Read order for a new session:** this file → `docs/plans/<current-phase>/00-status.md` →
the other docs in that phase folder. Do not read phase folders that are closed unless a
question actually points at one.

---

## 1. Where the work is right now

**Two phases closed, both deployed, both verified on the live site.**

| | phase | folder | state |
|---|---|---|---|
| 1 | Table Truth | `docs/plans/table-truth/` | closed, deployed |
| 2 | Sheet Truth | `docs/plans/sheet-truth/` | closed, deployed 2026-08-28 |
| 3 | **Open Book** | `docs/plans/grimoire/` | **closed 2026-08-30, NOT deployed** |
| 4 | **Held Reaction** | `docs/plans/reactions/` | **closed 2026-08-31, NOT deployed** |

**Plus two standalone repairs off Marcus's list of eleven, both done 2026-08-28, neither
deployed.** They ran without the four gates on purpose — each was one named fault with one
small fix, and a Gate 1 doc would have held nothing that was not already in his sentence.

| | repair | folder | his item |
|---|---|---|---|
| — | Toybox AI stops swallowing the model's own error | `docs/plans/toybox-ai/` | 1 |
| — | Slot Truth: the level-3 slots he does not have | `docs/plans/slot-truth/` | 4 |

- Repo: `C:\Users\marcu\Documents\Powerhouse\projects\the-codex` · remote `DOSENFT/the-codex`
- Working branch is **`v1`**. `main` is the deploy branch.
- `origin/main` = `8b8a9c8`. `v1` = `6a9c609` (1 commit ahead — docs + a probe only, nothing in `src/`).
- Deploy is `.github/workflows/deploy.yml`, triggered `on: push: branches: [main]` → GitHub Pages at `https://dosenft.github.io/the-codex/`.
- Live bundle at time of writing: `assets/index-BdvvtPEw.js`.

**Phase 3, Open Book, is closed and undeployed.** Seven slices, 2026-08-28 → 30. It is
Marcus's item 2 in full, item 3's first two bands and its character half, and one of the
three reactions in item 8. His Grimoire went from **11 rows to 84** — every spell, class
feature and Oath feature he can ever use, the 38 he cannot use yet visibly locked but fully
readable, four ways to organise them, a prepared-spell cap that refuses in canon's own
words, and a **Fighting Style picker** through which Interception reaches his combat tab.
Start at `docs/plans/grimoire/00-status.md` — it opens with a **RESUME HERE** block written
for exactly that read.

> **Corrected 2026-08-31 by measurement.** This paragraph used to claim phase 3 put
> "Interception on his combat tab". It did not, and the difference is the whole of the
> remaining gap. Phase 3 shipped the **picker and the wire** — both pinned on his real sheet
> by `fighting-style.test.ts`, and `recordFightingStyle(nix, INTERCEPTION)` produces a
> correct row on demand. What is missing is **the answer**: nothing has ever asked him which
> style he took, so his sheet records none and the word appears nowhere on the tab
> (`measure-slice6.mjs`: `interceptionOnTab: []`). One prompt, one tap. Marcus ruled on
> 2026-08-31 that it waits for the "Your Turn" consolidation.

**Phase 4, Held Reaction, is closed and undeployed.** Six slices plus an unplanned 5b,
2026-08-30 → 31. It is Marcus's **item 7 in full** and **two-thirds of item 8**: the
Hearthfire cloak is a Reaction that grants temp HP and arms a 1d10 retaliation on both the
engine road and the road he actually walks (hand-typed numbers, physical dice), the tally
totals and can be taken back in front of the DM, and **Sentinel is playable** — two rows,
two triggers, in canon's words, because the rule is not on his sheet at all. One cause
underneath all three: *the app filled the sheet's silences with defaults instead of with
canon.* Proved by `prove-reactions.mjs`, S · A–H green, falsified at both ends.

**The eleven are all diagnosed.** Marcus handed over the list on 2026-08-28. Items 1, 2, 4
and 7 are closed; item 3 and item 8 are partly closed. The diagnosis of the rest —
including the finding that collapses four of them into one shape — is in
`docs/plans/slot-truth/00-status.md` § "Where this sits in the eleven". Still open in his
own words: the **"Your Turn" consolidation (5, 6, 10, 11) — which is next**, the damage log
and fast physical-dice entry (9), and the Interception third of 8.

**The headline of that diagnosis, so nobody re-runs the research:** the eight source
documents he supplied are **already fully ingested** into `src/canon/`. All 53 paladin
spells are there, so are the errata, the combos, the prepared-spell rules and Interception
with real mechanics. Nothing is missing. `GrimoirePage.tsx:106` iterates
`character.spells` and never opens canon — the information exists and no screen asks for
it. There is **no research phase** for the rest of this work.

That file also records one decision a future session must not silently reverse:
`vitals.ts`'s "report, never correct" law now has a door beside it, and the reasoning is
written out there rather than left to be re-argued.

### What phase 2 actually fixed

Marcus's report: *"in combat my spell definitions, and probably a lot of other things, are
claiming that my charisma is 18, when in fact it's 16 … **What I change in the prep screen
must directly effect and be used app wide**"*.

It was not a spell-text bug. The sheet **stored** its derived numbers (save DC, spell
attack, proficiency bonus, prepared-spell max), so editing Charisma in Prep left the stored
copies stale, and every surface that read them painted the old number. Canon prose had the
same numbers *typed into it as literals* ("At Charisma 18 your DC is 15").

The fix, in seven slices: `resolveCharacter` in `src/lib/rules-2024/derive.ts` is now **the
one producer** of every derived number, it runs on the way out of storage, and
`storableOf` **deletes** those four fields on the way in — so a stale copy cannot exist to
go wrong. Canon prose gained a six-word placeholder vocabulary resolved per-character.

Measured, same storage blob into both builds:

| painted on the Play tab | pre-phase | live now |
|---|---|---|
| Save DC | 15 | **14** |
| Sp Atk | +7 | **+6** |
| disagreement panel | "disagree on 2 things" | **none** |

---

## 2. How this work was run, and why it worked

The **software-factory** skill (`~/.claude/skills/software-factory`): four gates —
Product → Architecture → Program Design → Slices — each needing explicit approval before
the next, then one vertical slice at a time. Marcus approved all four gates for phase 2 and
approved each slice individually.

Two rules from it that mattered more than the rest:

**Proof after every slice**, in three parts: before/after screenshots of the surfaces that
changed, plain-language "what moved and why" in terms of app behaviour, and the measured
numbers. Then ask: *"Continue to slice N+1, or re-steer?"*

**Real tests only.** Never write a test that passes against the pre-change code. Never
comment out, skip, or weaken a test to reach green.

### The micro-revert discipline — the single highest-value practice here

After each slice, put back the line the slice removed and confirm the tests actually go
red. This is not ceremony. It changed the outcome repeatedly:

- Slice 2: a test read `d.label` on a type whose field is `title`, so it compared
  `undefined` to `undefined` and passed no matter what the code did.
- Slice 5/6: deleting `personaliseBullets` from `detail.ts` — unplugging the entire slice
  from the app — left the suite **green**. Every test aimed at the function, none at the
  wire.

**A revert that does not go red is information, not a formality.** But see finding BQ: work
out *why* before concluding the test is weak.

---

## 3. Environment and tooling — the expensive-to-rediscover list

- **The Bash tool resets cwd to `C:\Users\marcu\Documents\Command` after every call.**
  Always `cd /c/Users/marcu/Documents/Powerhouse/projects/the-codex` first, in the same command.
- **Line endings are mixed per file.** `character.ts` and `src/lib/turn/detail.ts` are CRLF;
  `src/lib/canon/personalise.ts`, `src/canon/*.json`, the plan docs are LF. Git's
  "LF will be replaced by CRLF" warning on staging is harmless.
- **Backticks inside a double-quoted bash string get executed.** Cost a mangled comment once.
- **`npx vite-node -e "…"` does not work** — there is no `-e` flag. Write a real file, and
  write it **inside the repo**: vite-node cannot load a script from outside the project root.
- **The dev/preview server listens on IPv6 `::` only, and the app is served under
  `/the-codex/`.** So `curl localhost:4321` returns empty and reads as "server down". The
  URL that works is `http://[::1]:4321/the-codex/`. A preview server has been running on
  :4321 across sessions and hot-picks up a fresh `dist/`; **the permission classifier
  refuses to start one**, on either shell, so if it dies ask Marcus to start it.
- **Playwright is not a dependency of this repo.** The probes resolve it through
  `createRequire` against `C:/Users/marcu/AppData/Local/npm-cache/_npx/*/node_modules`, and
  must destructure `pw.chromium ?? pw.default?.chromium` — the npx copy exports it under
  `default` in some versions and not others.
- **Confirm the served bundle hash equals the fresh `dist/` hash before believing any
  browser result.** Slice 2 of phase 3 had to throw away a complete before/after pixel
  proof because nothing on disk could establish which bundle the "before" was shot against.
- **Node ESM on Windows:** a relative import from a script in `/tmp` resolves against
  `/tmp`, and a bare `C:/…` specifier throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Use
  `file:///C:/…`, and absolute paths for `require()` of repo JSON.
- **Long Playwright commands auto-background.** Redirect to a file and read it, or wait for
  the task notification. Do not start new work on a background notification.
- **vitest ANSI:** strip with `sed 's/\x1b\[[0-9;]*m//g'`, use `--reporter=basic`, filter
  with `grep -E "Tests +[0-9]"`.

### Permissions — things the assistant cannot do, that Marcus must run

- **Pushing to `main` is blocked** by the permission classifier. Marcus runs deploys.
- **`git checkout` is blocked.**
- **Recursive directory deletion is blocked on both shells** — Bash by the Atlas guard hook
  (`.claude/hooks/guard.sh`), PowerShell by the classifier. Hand Marcus a pasteable
  Command Prompt line instead.
- **The Atlas guard also blocks** the blanket all-files and whole-directory forms of
  `git add`. **Stage files individually, always.**
- **The guard hook inspects file CONTENT on write, not just commands.** A doc that quotes a
  forbidden command verbatim will itself be blocked. Describe such commands rather than
  quoting them — that is why this section names them in words.

### The revert helper

Never trust a revert that might have silently matched nothing. `/tmp/_revert.js`:

```js
// Swap `needle` -> `rep` exactly once, or exit 1. Never a silent no-op.
const fs = require('fs')
const [file, needle, rep] = process.argv.slice(2)
const t = fs.readFileSync(file, 'utf8')
const n = t.split(needle).length - 1
if (n !== 1) { console.log(`DID NOT LAND — needle found ${n} times in ${file}`); process.exit(1) }
fs.writeFileSync(file, t.replace(needle, rep))
console.log('landed')
```

### Verifying a deploy

A green Actions run **is not proof that anything shipped**. Commit `0d8920e` records this
exact pipeline printing success while deploying nothing, twice. Check the live bundle hash
changed, then measure the live site:

```
node docs/plans/sheet-truth/_probe-phase-close.mjs https://dosenft.github.io/the-codex/
```

---

## 4. Findings ledger — laws that outlived their slice

Referenced by letter throughout `00-status.md` files. The ones that generalise:

- **The open-world rule.** Recognise a *shape*, never a name. Compute scaling, never read
  it. Drop whole segments, never characters. **Never an ellipsis.** A null result means "I
  have nothing to add", never "you are wrong". A class the app has no table for produces
  no output rather than a guess.
- **Finding Q — a probe that reads `textContent`/`innerText` proves the model, not the
  screen.** Real proofs measure painted geometry: a Range around the candidate, rects with
  area, inside the container's own box, topmost at its own centre via `elementFromPoint`.
- **Finding BG — a number that passes by standing still proves nothing.** Test at a level
  where the value must move.
- **Finding BJ — a comment asserting an invariant is not the invariant.** `derive.ts`
  claimed to hold "the only copy" of the proficiency formula while a second copy sat in
  `vitals.ts`. A source scan found it; reading did not.
- **Finding BL — a probe that matches by proximity must check the anchor it matched.**
  Paid for twice. Most recently a document-wide search for the label `Prof` found a
  different `Prof` elsewhere on the page and reported the real one missing.
- **Finding BM — a test aimed at a function is not aimed at the wire.** Deleting the
  slice's function from its call site left the whole suite green.
- **Finding BP — a placeholder may only live in a field that has a reader.** `personalise`
  has exactly one call site (`detail.ts:284`, on `spell.tactics`). Nothing reads
  `paladinNote`, so a template there would render as literal braces.
- **Finding BQ — a revert through `??` on a field nothing supplies is a no-op, not a weak
  test.** `storableOf` deletes the four `DERIVED_KEYS`, so `base.proficiencyBonus ??
  computed` always took the computed branch. Break the **producer**, not a fallback with an
  empty left-hand side.
- **Finding BR — a check that compares a value against the function that produced it
  cannot be broken by changing that function.** `computeSpellSaveDC` *is*
  `resolveCharacter(char).spellSaveDC`. Only breaking **idempotence** trips it.

Phase 3 added four more. They are stated in general terms because each was paid for by a
proof that looked green while measuring nothing.

- **The printed narrative and the pass/fail verdict must come from ONE list of named
  clauses.** Wherever a check prints a human sentence and separately computes `ok`, the two
  drift, and the sentence is what a reader believes. `prove-catalogue.mjs` now builds a
  `clauses` array of `[name, boolean]` per check; `got` renders it and `ok` filters it, so a
  failure names itself and a clause cannot be described without being asserted.
- **A deferred decision must be deferred to an assertion, not to a paragraph.** "We will
  handle X later" written in a doc is invisible to every future run. Written as a clause
  that currently passes trivially, it announces itself the moment it stops being true. The
  recurring fault shape this phase kept finding is **a number in a proof that nothing could
  falsify.**
- **A text-matching locator can click the wrong visible element and nothing throws.**
  Playwright's `hasText` is a case-insensitive substring match over the whole subtree.
  Check H's first run clicked `button` with text `Combat` and hit an open Fighting Style
  card whose canon paragraph contains the word — **silently changing his fighting style
  while claiming to navigate** — and the clean-console check still said clean, because a
  click that lands on the wrong *visible* thing is a successful click. Address controls by
  role and aria: `[role="tab"][aria-label="Combat"]`. Then assert you arrived
  (`aria-selected === 'true'`), because the click succeeding is not the claim.
- **A proof that has only ever passed is not evidence.** It becomes evidence the first time
  it is shown able to fail. This is the micro-revert discipline stated as a property of the
  proof rather than a step in the process: every check in `prove-catalogue.mjs` has a
  recorded revert that turned it red, logged per slice in the phase's `00-status.md`.
- **A screenshot taken after a probe that scrolls photographs where the probe finished.**
  Paid for twice — check E's `cap-refused` shot and check H's `fighting-style-chosen`, which
  came out as a picture of the last eight rows of a different section. Shoot between the
  reads, not after them.

Phase 4 (`docs/plans/reactions/`) added three, and the first one it paid for three
separate times inside one phase.

- **A thing that models the app AFTER the repair cannot show the fault — so measure the
  app before trusting any document about it.** Slice 1: the `nix.ts` fixture carries a
  hand-split feature his real export does not have, and 14 assertions broke because the
  fixture had already done by hand what the slice was building. Slice 5: `04-slices.md`
  predicted "no new code expected" from green unit tests, and the feature was missing from
  the only screen Marcus opens. Slice 6: `03-program-design.md`'s own browser checks named
  a row that does not exist and looked for a marker on the rows that never carry it. Three
  of six slices re-scoped by a measurement that contradicted an approved document. **Open
  every slice by measuring, and measure against his real export, never the fixture.**
- **A negative marker cannot be checked by looking for it.** "your own" is painted only on
  *sheet*-worded rows, so a check that looked for a mark on the canon rows could never have
  failed. Assert both halves — absent where it must be absent, **present where it must be
  present** — or the check proves nothing. Restated that way it immediately caught a live
  fault.
- **A probe that can see the broken case but not the working one reports every working case
  as broken.** `measure-slice6.mjs` walked to leaf elements; a *stated* trigger renders its
  text as a bare text node inside the `<p>` and was invisible, while the *unstated* case
  renders a `<span>` and would have been seen. First run: "no trigger on any row" — a total
  fabrication. Before believing a probe's failure, check that the probe can see a case you
  know is good.

### Two pins that must not be disturbed

- **`src/lib/turn/options.ts` is pinned BYTE-IDENTICAL to `main`** by `overlay.test.ts`
  case 15. Do not edit it (finding BD).
- **`PROJECTIONS = ['spells.Circle of Power.tactics']`** in `personalise.test.ts` — a
  permanent, decided exception. Not a TODO.

---

## 5. Architecture worth knowing before touching numbers or prose

- **`src/lib/rules-2024/derive.ts`** — `resolveCharacter` is the one producer of every
  derived number; `storableOf` is the subtraction that keeps them off disk; `proficiencyFor`
  is the only copy of the proficiency formula (there were five, in four spellings).
- **`src/lib/rules-2024/vitals.ts`** — `tableVitals` and `discrepancies`. **It reports, it
  never corrects.** `Discrepancy` deliberately has no `correct` field, because the app does
  not have the answer: Marcus's sheet reflects his DM, his items, his homebrew oath.
  Three of its four checks are now unreachable through the app's own door and are **kept on
  purpose**, swept by 2,990 generated characters in `vitals.test.ts` §slice 7.
  **Spell slots are the deliberate exception** and report forever — his sheet carries slots
  his level does not grant, and deleting a resource he plays with would be the app
  overruling his table.
- **Canon prose placeholders** — a **six-word** vocabulary resolved by
  `src/lib/canon/personalise.ts`. Adding a seventh word is a Gate 3 decision, not a slice.
- **`character.spellSlots` gates the turn list.** `options.ts:253` drops a prepared spell
  whose tier is absent from that map. A seeded fixture at level 8 will not show 3rd-level
  spells no matter how high you set `level`.

### Test surface

Full suite at the close of phase 3: **1272 passed / 56 files / 7 skipped**, `tsc -b
--noEmit` exit 0. (It was 1099 / 47 at the close of phase 2.)
Browser probes live in `docs/plans/sheet-truth/*.mjs`; `_probe-phase-close.mjs` takes a URL.
Phase 3's is `docs/plans/grimoire/prove-catalogue.mjs` — checks **A–H**, run against the
preview server, one 390×844 viewport.

---

## 6. Open — known, logged, not fixed

Nothing below was in phase 1, 2 or 3's scope. Items 9 and 10 are diagnosed; the rest are
not.

1. **Gemini / in-app AI does not work.** Marcus's key from Google AI Studio returns
   `404: models/gemini-2.0-flash is no longer available`. He has said it must be **free and
   reliable**, and has raised Ollama as the alternative he used before. **Untouched by both
   phases. This is the one still costing him something every session.**
   *Note: verifying his key against a live endpoint is 🟡 ASK-FIRST (spend / API cap).*
2. **Finding BH — an accessibility fault.** The Dice Roller and the Mechanics Reference are
   both permanently mounted, both carry `aria-modal="true"`, both parked at y=844, one
   viewport below the fold. Two simultaneous modals corrupt the accessibility tree:
   `getByRole('button', {name:'Character'})` resolves to **zero** elements while
   `button[aria-label="Character"]` resolves to one that is visible, enabled and 97×64.
   **A screen-reader user cannot reach the tab bar.**
3. **The aura-radius fork — deferred by Marcus 2026-08-28.** Canon states the Aura of
   Protection radius as prose in **eight places across five strings**, pinned by name in
   `AURA_RADIUS_IN_PROSE` in `personalise.test.ts`. Correct until **level 18**, when the
   aura widens 10ft → 30ft. That pinned list is the worklist if it reopens.
4. **Finding AZ / HEARTH-08, VAL-13, finding AT** — see `table-truth/00-status.md`.
5. **The cloak-teleport clause** — pending a ruling from Marcus's DM. Not an app decision.
6. **`CharacterFeat.abilityIncrease` (`character.ts:224`) is declared and never applied.**
7. **Stale scratch files:** `docs/plans/sheet-truth/_diag-tmp.mjs`, `_dbg.mjs`,
   `_diag-loh.mjs`; three untagged `shots/slice2-*.png`; a `/tmp/codex-before` worktree.
8. **`SESSION-HANDOFF.md` at repo root is stale (May 30) and untracked.** It frames the
   assistant as an "elite 6-person dev studio" and instructs it to use subagents
   aggressively and "build in parallel waves" — which is not how phases 1 and 2 were run,
   and contradicts the slice-at-a-time discipline that produced them. **Superseded by this
   file.** Ignore it, or delete it (🟡 ASK-FIRST).
9. **Sentinel is missing from his reactions for a text-provenance reason, not a missing-feat
   reason.** Found while proving phase 3 slice 6, out of that slice's scope, left alone.
   `featReactionOptions(nix)` returns **zero** rows. His importer wrote *audience bullets*
   into `feats[].effects` on the sheet — lines addressed to the reader rather than
   describing a trigger — and `effectSentencesOf` (`src/lib/turn/feats.ts:115-134`) prefers
   the **sheet's** words over canon's, falling back to canon only when the sheet carries no
   usable sentence at all. So Sentinel is on the sheet, its canon text is correct in
   `src/canon/feats.json`, and the reaction still never appears. This is the other half of
   Marcus's item 8 and it is a **data-provenance** fix, not a rendering one: decide whether
   a sheet sentence that is not trigger-shaped should outrank canon. Note the same fallback
   is why emptying `effects` is a **useless falsifier** — canon rescues it and the revert
   stays green.
10. **`vitals.ts:195` — `const expected = table[character.level] ?? {}` is a twin of the
    `?? {}` fault phase 3 fixed elsewhere.** An absent level silently becomes "expected
    nothing", so a character at a level the table does not cover produces no discrepancy
    instead of an honest refusal. Same shape as finding BQ: a fallback with an empty
    left-hand side that no test can distinguish from success. Not touched because
    `vitals.ts` is phase 2's territory and changing it needs its own proof.

---

## 7. Standing guardrails (from `CLAUDE.md`, abbreviated)

- 🟢 **ALWAYS:** read/search, draft, build and run code in the sandbox.
- 🟡 **ASK FIRST:** new remote / first publish · message a real person · spend money or
  exceed an API cap · **delete files** · **deploy** · edit governance files · buy hardware.
- 🔴 **NEVER:** impersonate Marcus to people he loves · commit secrets or personal data ·
  weaponize anything personal · build engagement/attention loops · **leave half-built
  features running as if done.**

`C:\Users\marcu\Documents\Command` is a thin markdown-and-pointers layer — never an app,
never a build. **It does not constrain this repo**, which is separate and does have a build.

---

## 8. Marcus — how he works, and what he asked for

- He owns the understanding; the assistant owns the execution. Extract the goal, don't
  assume it. Verify against reality, not against your assumption of it.
- His self-named failure mode is **"another half-built project."** A feature that looks
  done but is not is the specific thing to avoid.
- He asks for fixes that are **permanent and effective**, not patches. Phase 2 is the
  template: the bug was not fixed where it showed, it was fixed where it was caused, and
  then made structurally impossible to recur.
- He reads the proof. Show measured numbers and real screenshots, not claims.
- **He wants deploys handed to him as pasteable commands** (the classifier blocks them
  anyway).

### Intake note for the incoming list

Marcus has a list of separate in-app problems with screenshots, and asked whether to
deliver them one at a time or all at once.

**The evidence from phase 2 is that the full list should be visible before any of it is
fixed, and then fixed one at a time.** He originally reported "my spell definitions are
claiming Charisma 18" — one symptom. It turned out to be one architectural fault with
roughly eight surfaces. Had each surface been reported and patched in isolation, each would
have been corrected locally in prose and the stored-derived-number cause would never have
been found. Seeing the whole list is what makes a shared root cause visible.

So: **take the whole list up front, classify it for shared causes, then work one item per
slice with proof after each.** Screenshots are best attached per item as that item comes
up, since they are expensive in context and are rarely needed until the item is in hand.
