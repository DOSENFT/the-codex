# STATE

**roadmap waiting for approval**

Last run: 2026-09-11 — TAKEOVER (run 1). Branch: `owner/build`, cut from `main`.
`main` is unchanged and nothing has been pushed.

---

## What this run did

| Job | Output | Status |
|---|---|---|
| T1 Safety net | `tests/e2e/` (15 flows, 97 checks) + saved-data checks | done — all pass on untouched code |
| T2 Inventory | `.codex-owner/notes/inventory.md`, captures | done — 59 features: 48 work well, 8 half-built, 3 broken |
| T3 Vault & Studio | `.codex-owner/notes/vault.md`, `studio.md` | done — vault cloned on 2nd attempt, read-only |
| T4 The field | `.codex-owner/notes/field.md`, `.codex-owner/ref/` + `SOURCES.md` | done — inputs 2 and 6 WRONG, 3 and 4 CONFIRMED |
| T5 The product | `.codex-owner/notes/product.md`, `PRODUCT.md` | done |
| T6 Roadmap | `ROADMAP.md` — M1–M11 | done — **waiting for approval** |
| T7 Owner's page | `docs/owner-plan/index.html` + `captures/`, `ref/`, `fonts/` | done — 2,959 words, opens offline, 0 console messages |

**No features were built.** `git status --porcelain -- src/` was empty for the whole run: zero
lines of app source changed. The only code added is the safety net under `tests/`.

## Where things stand

- Safety net: 15 browser flows / 97 checks + 5 saved-data checks, all passing.
  `npm test` — 108 files, 2,098 passing, 7 skipped, 0 failing.
- The owner's page renders from a `file://` URL with no network: 7 images load, 4 self-hosted
  fonts load, 0 console messages, 0 page errors, 0 failed requests
  (proof capture: `docs/owner-plan/captures/owner-page-1280.png`, `owner-page-390.png`).
  No horizontal scroll and nothing past the right edge at 1280, 1080, 620, 390 or 320.
  Every colour pair clears WCAG AA on screen; the print stylesheet was a four-line stub
  that rendered 31 of 34 text combinations illegible on paper, and is now finished and
  measured (`notes/_probe/print-check.mjs`: 22 combinations, 0 failing, worst 7.46:1).
- The three broken things are recorded as broken, not fixed: making a character from scratch
  (network model required, timed out 2 of 2), the Persona quick reference (field-name
  mismatch), spaced flashcards.

## What is blocked, and on what

Everything. The roadmap is written and nothing after it can start until the owner answers the
five questions in `docs/owner-plan/index.html` §8:

1. Approve the roadmap and its order? — **yes / no / reorder**
2. $29, paid once, no subscription? — **yes / no / a number**
3. Who we build for and price to, if the evidence stays ambiguous — **player / table / master**
4. Storefront name — **Codex / Ash / other**
5. May I read the vault's 20 real sessions into the app, still without writing to it? —
   **yes / no / later**

Question 5 is the only one that changes the read-only rule on `dwk-vault`. Until it is
answered "yes", the vault stays read-only and M5 builds against the offline bank instead.

## Next run

If the owner's message approves the roadmap: record the approval here with its date and any
changes he asked for, apply those changes to `ROADMAP.md` first, then run **M1 — Take it back**
(`ROADMAP.md:17`) as a BUILD run — undo wired to slot spends, the mis-tap in the dark.

If it does not approve: make only the changes his message asks for, update the page, and stop.

## Commits on `owner/build` so far

- `bba71c4` Carry over everything that was sitting unsaved in the folder
- `2330e19` A safety net: 15 checks that drive the real app the way I do at the table
- `fbd21e7` What I found: the audit, the vault and Studio notes, the competitor research
- `36d696a` The plan: who this is for, what it costs, and eleven milestones to a 1.0
- `509b1aa` The page you read first: one file, opens by double-click, no internet
- `HEAD`&nbsp;&nbsp;&nbsp;&nbsp;Where this run stopped and what the next one does

`main` is `c43b15c` and has not moved. Nothing has been pushed.
The safety net was re-run after the last commit: 15 flows, 97 checks, all pass.
