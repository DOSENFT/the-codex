# TABLE-READY — The Codex

**Frozen 2026-08-23.** Criteria may be **added**, never softened or deleted to make something pass.
Any change to an existing criterion is logged in § Amendments with old text, new text, and reason.

One command runs the whole thing:

```
node docs/plans/codex-v1/reference/prove-table.mjs          # local build, http://localhost:4173/the-codex/
node docs/plans/codex-v1/reference/prove-table.mjs --live   # https://dosenft.github.io/the-codex/
```

---

## Amendments

**A-1 · 2026-08-23 · § 5 — two criteria ADDED (P-0.7, P-0.8).** Nothing softened, nothing removed.
P-0.1–P-0.6 were written to be calibrated against *injected* defects. While building the harness a
real known-bad build became available — `73c45d8`, the SHA deployed at the live URL right now — so
two criteria were added that calibrate against a whole real build rather than one injected screen:
**P-0.7 (sensitivity)** the harness must fail `73c45d8`, and **P-0.8 (specificity)** the same harness
must pass HEAD on the same inputs. P-0.1 and P-0.2 were additionally re-pointed at that real build
instead of a test hook — a strengthening, not a softening: the defect they are calibrated on is now
one that actually shipped. *Reason: a negative control built from a real regression is worth more
than one I wrote to be caught.*

**A-2 · 2026-08-23 · § 5 P-0.6 — count corrected, four → six.** Old text: *"Every one of the **four**
negative controls, when removed, lets a known-bad build pass … `--selftest` prints a **4-row** table."*
New text: *"Every one of the **six** controls, when removed, lets a known-bad case pass … prints a
**6-row** table."* *Reason: the instrument ended up with six controls (`pageerror`, `console`,
`rejection`, `blank`, `boundary`, `hollow`), not four. Controls were added, not removed, and the
requirement on each is unchanged. "A known-bad build" → "a known-bad case" because no single build
contains all six defect classes; each control is still proven load-bearing by deletion against a bad
case only it witnesses, and the `console` row uses the real `73c45d8` regression.*

**A-3 · 2026-08-23 · § 7 — a factual claim CORRECTED, not a criterion.** § 7 originally stated that
the deployed build "still has the Combat, Character, Persona, Roleplay and Academy screens dying on a
thin import," and that Marcus's own `codex-nix-lvl7.json` is that shape. **That was wrong**, and P-0.7
is what caught it: measured against `73c45d8`, *both* of his real export shapes — thin and full — load
clean on all seven screens. The deployed build breaks on 8 of 12 *hostile-but-legal inner shapes*
(bare spell, bare feature, object in equipment, bare identity, bare hook, bare supply, `persona: {}`,
one-of-everything), which are shapes a hand-edited or older save can have but his current files do
not. § 7 is corrected below. *Reason: I asserted it from a diff; the instrument measured it. The
measurement wins.*

**A-4 · 2026-08-23 · § 6 S-1, S-2, S-3, E-4 — grading TIGHTENED: worst sample, not median.** No
threshold moved; 2000 ms, 400 ms and 100 ms are exactly as frozen. What changed is which sample they
are applied to. Old behaviour (harness only — the document itself never said "median"): S-1 graded the
median of 5 launches, S-2 the median of 3 taps per screen, S-3 the median of the taps in a turn.
New behaviour: **the worst observed sample must clear the threshold**, with the median reported
beside it. *Reason: the criteria say "a spend registers ≤ 100 ms", not "usually". At the table the tap
that costs you the turn is the slow one; grading the median hides it by construction. This makes every
one of these harder to pass, never easier — under the old rule S-3 read 48 ms and passed, under the new
one it reads 104 ms and fails.*

**A-5 · 2026-08-23 · § 4/§ 6 — how "no wifi" is produced (S-1, N-1) CHANGED; the criteria themselves
are unchanged.** Old method: Playwright's `context.setOffline(true)`. New method: serve the build from
a server the harness owns, let the worker precache, then **kill the server** — the origin is genuinely
unreachable. *Reason: `setOffline` is a CDP flag, and it produced a result no browser produces —
`workerStart = 0` on every subresource of the reload, while the same service worker was controlling the
page and `caches.match()` resolved those exact URLs from page context in the same breath. It
manufactured a failure. With a genuinely dead origin the app boots, all seven screens stand, a spend
persists, and a second reload survives. The evidence for both readings is kept side by side in
`docs/plans/codex-v1/reference/table/probe-offline.mjs` and `probe-offline2.mjs`. Against the deployed
origin, which nobody can unplug, N-1 aborts every request at the network layer and — if the `setOffline`
signature reappears — reports **UNPROVEN**, never a pass and never a fail.*

**A-6 · 2026-08-23 · § 6 S-3, E-4 — what "registers" is measured as, made explicit.** The wall-clock
between a Playwright `click()` and two animation frames later contains the harness's own round-trip to
the browser and is not the app's number. S-3 and E-4 are now graded on the browser's own **Event Timing
`duration`** — pointer input through the next paint — with the wall-clock reported beside it, never
instead of it. *Reason: the wall-clock read 138 ms median where the app's real input-to-paint was 48 ms;
the honest failure (worst tap 104 ms) was buried under harness overhead. Neither number was allowed to
disappear.*

**A-7 · 2026-08-23 · § 6 V-6 — the IMPLEMENTATION corrected to match its own frozen text. The
criterion text is unchanged.** V-6 says, and has always said, that the controls must lie *"within the
**bottom** 60% of the viewport … One hand, lower third."* The predicate in `families.mjs` reads
`if (c.y > vh * 0.60) fail` — which fails anything in the bottom 40% and passes everything in the top
60%. It tests the exact opposite of the sentence it implements. New predicate:
`fail unless (vh * 0.40 <= y && y <= vh)`, where `y` is the control's centre in **document**
coordinates, so the same expression also enforces "on the first screen, no scrolling."
*Reason: this is the one amendment on this page that makes something easier to pass, so it gets said
plainly rather than buried. **It reclassifies the tab bar (y = 812 of 844) from fail to pass.** The tab
bar is `position: fixed` at the bottom edge of the viewport — it is not merely allowed to be at y=812,
that is the single place the criterion is asking every control to be, and an instrument that fails it
for being there is broken, not strict. Nothing that failed on the merits is rescued by this: every
control listed as a real V-6 failure — Action Economy at y=938, Heal 5/10 at y=1645, Spend at y=1697,
the Actions Reference rows out at y=3844 — is past `y > vh` and fails under the old predicate and the
new one alike. To make sure the correction bought no slack anywhere else, **V-6b is added below**
(§ 6 V), covering a failure neither predicate could ever see.*

---

## 1. What the table actually is

Everything below is derived from this and nothing else. It is not a release checklist.

- **A dim room.** Ambient light is low and warm; the screen is the brightest thing in it. Pupils are
  dilated. Nobody adjusts their glasses to read a 10px label.
- **In one hand, or propped on a table edge.** A phone, held, thumb on the lower third — or leaned
  against a dice tray at a shallow angle, seen from maybe 50–70 cm. Not a desk. Not two hands.
- **A turn resolves in about six seconds while five people wait.** That six seconds is a social
  budget, not a technical one. It is spent on *deciding*, and the app's only job is to not take any
  of it. Every millisecond the app spends is taken from the decision, in front of an audience.
- **Four hours straight.** One launch, one session. The app is not reloaded to fix it. Whatever it
  does at hour four is what it does.
- **Sometimes no wifi.** Somebody's basement. The character has to be there anyway, and so does the
  turn.
- **One character, that he typed himself.** Nix. Level 7 Paladin, Oath of the Hearth — Marcus's own
  homebrew subclass. Losing it is not a bug report, it is an evening destroyed and a year of typing
  gone. There is no server-side copy. `localStorage` is the only copy.

### What follows from that

Three things rank above everything else, in this order:

1. **The character survives.** Above features, above speed, above looks. A fast beautiful app that
   eats Nix has negative value.
2. **The screen he needs is standing.** Not the app — *the screen*. An error boundary that keeps the
   app alive while killing the combat panel has failed at the only moment that counts. A polite
   notice mid-fight is a white screen with better manners.
3. **It costs him none of the six seconds.**

Only then: it reads at arm's length, in the dark, and it looks like it was built on purpose.

---

## 2. The definition

> **The Codex is table-ready when a stranger can take the phone, in a dim room, with the wifi off,
> load Marcus's real save file onto a device that has never seen the app, play a four-hour session
> without the app costing a turn, and hand the phone back with the character intact — and can prove
> each of those with a command, a number, or a photograph, without the builder in the room.**

The load-bearing words are **stranger**, **prove**, and **without the builder in the room**. This
project's failure mode has never been the app. It has been the instrument: the same import bug
shipped three times, and all three times the checks were green, because the checks asked a question
the bug could answer. So the first criterion is not about the app at all.

---

## 3. Scope

**In:** every screen reachable without a query flag — Play/`Combat`, Play/`Grimoire`,
Play/`Roleplay`, Prep/`Character`, Prep/`Grimoire`, Prep/`Persona`, Prep/`Academy`, the welcome and
import screens — plus the turn screen behind `?d=1`, which is shipped, reachable and publicly
deployed, and therefore is not exempt.

**Out:** anything requiring a live AI endpoint to *succeed*. AI is out of scope as a feature and
firmly in scope as a hazard: it may never block, slow, or break a turn (**N-2**).

**Frozen — behaviour is sealed for this run.** Design work moves presentation, composition,
hierarchy, type, motion and rhythm. It never moves what a feature does. Behaviour changes I believe
are necessary are written up in § 9 and left **unbuilt**.

---

## 4. Grading

Each criterion is **PASS**, **FAIL**, or **UNPROVEN**. There is no fourth state and no partial
credit. **UNPROVEN** is an honest result and is written as such; a criterion whose check was
weakened to reach green is a **FAIL** whatever the check prints.

Test rig, fixed so numbers are comparable:

| | |
|---|---|
| Browser | Playwright Chromium, headless |
| Viewport | 390 × 844, `deviceScaleFactor: 3` (iPhone 14/15 class — the phone in his hand) |
| Second viewport for V-family | 834 × 1112, DPR 2 (iPad, propped) |
| CPU | 4× throttle via CDP `Emulation.setCPUThrottlingRate` for the whole S-family |
| Network | as stated per criterion; `offline` via CDP for the N-family |
| Fixtures | `codex-nix-lvl7.json`, `codex-nix-lvl7 (1).json`, `codex-nix-lvl7 (2).json`, `codex-character-data.json`, `codex-character-data (1).json` — Marcus's five real files, copied into a temp dir at run time, never mutated in place |

---

## 5. THE INSTRUMENT — criteria P-0

Graded first. **If P-0 fails, every other result on the page is void**, regardless of what it says.

| ID | Criterion | Falsified by |
|---|---|---|
| **P-0.1** | The harness fails on a **caught** React error — the boundary catches it and renders "… stopped / The rest of the app is still running", and the harness must report FAIL. *(A-1: calibrated on the real defect in `73c45d8`, `play/Combat`, rather than a test hook.)* | `prove-table.mjs --selftest` prints `calibration: FAIL-ON-CAUGHT ok`. If it prints `ok` for a page that is visibly boundaried, the instrument is broken. |
| **P-0.2** | The harness fails on a bare `console.error` with no visual symptom at all. *(A-1: calibrated on `73c45d8`, `play/Roleplay` — every marker present, not blank, not boundaried, and throwing. That screen is what "the checks were green" looked like.)* | `--selftest` prints `calibration: FAIL-ON-CONSOLE ok` |
| **P-0.3** | The harness fails on an unhandled promise rejection — including one an app swallows with `preventDefault()`, where neither `pageerror` nor the console ever sees it. | `--selftest` prints `calibration: FAIL-ON-REJECTION ok` |
| **P-0.4** | The harness fails on a blank body, **without needing to know the screen** — the one control that still works on a screen nobody has written markers for. | `--selftest` prints `calibration: FAIL-ON-BLANK ok` |
| **P-0.5** | The harness fails when a screen renders but is **empty of the thing it exists to show** — the combat screen with no actions on it is a dead screen even though it has text and threw nothing. | `--selftest` prints `calibration: FAIL-ON-HOLLOW ok` |
| **P-0.6** | Every one of the six controls, when **removed**, lets a known-bad case pass. That is the point: each control is load-bearing, proven by deletion, not by assertion. *(A-2)* | `--selftest` prints a 6-row table; every row reads `caught ✓ / passes-without ✓` |
| **P-0.7** *(added, A-1)* | **Sensitivity against a whole real build.** The harness must FAIL `73c45d8` — the SHA deployed at the live URL — on the input shapes that break it. An instrument that has never been shown to fail on a build known to be broken has proven nothing. | `--selftest` reports the count of the 12 hostile shapes it caught; must be > 0 |
| **P-0.8** *(added, A-1)* | **Specificity.** The same harness, same inputs, must PASS HEAD on every shape it just failed `73c45d8` on. A check that is always red is as useless as one that is always green. | `--selftest` P-0.8 row |

**Standing rule for all families below:** a criterion cannot pass while any of these is true at any
point during its run — a caught React error, a `console.error`, an unhandled rejection, a `pageerror`,
or error-boundary text on screen. These are not separate criteria. They are a floor under all of them.

---

## 6. The criteria

### F — FUNCTION: the screen he needs is standing

| ID | Criterion | Falsified by |
|---|---|---|
| **F-1** | Marcus's full real export (`codex-nix-lvl7 (1).json`) imports onto a device with empty storage, and **all seven** default-reachable screens render their own content. Not "not blank" — each screen must show a named artefact of its own (Combat: an action; Grimoire: a spell; Character: an ability score; etc.). | `prove-table.mjs` § F-1, seven rows |
| **F-2** | The **thin** real export (`codex-nix-lvl7.json`, 19 keys, no `abilityScores`/`weapons`/`equipment`) is accepted through the gate and leaves all seven screens standing. This is the file shape that shipped broken three times. | `prove-table.mjs` § F-2 |
| **F-3** | Twelve hostile-but-legal inner shapes — a spell with no `description`, an object in `equipment`, `persona: {}`, an identity with no arrays, a hook with no `text`, a weapon with no `properties`, a feat with no `effects`, a bare pool, a bare condition, a bare supply, a bare feature, and one export carrying several at once — each imported alone, reloaded, then **walked across all seven screens**. Zero dead screens, zero errors. | `prove-table.mjs` § F-3, 12 × 7 = 84 rows |
| **F-4** | The `?d=1` turn screen renders Nix's real sheet, shows a ranked shortlist with at least one action in it, and spends a real resource. | `prove-table.mjs` § F-4 |
| **F-5** | The veil / safety exit is present and operable on **every** screen, in both modes, including mid-import and behind an error boundary. It is the one control that may never be missing. | `prove-table.mjs` § F-5, seven rows |
| **F-6** | No screen requires horizontal scrolling at 390 px. `scrollWidth <= clientWidth + 1` on every screen, both modes. | `prove-table.mjs` § F-6 |

### D — DATA SAFETY: the character survives

| ID | Criterion | Falsified by |
|---|---|---|
| **D-1** | **Round-trip fidelity.** Import each real export, export it again, and every key present in the original file is present in the output with a deep-equal value. Added defaults are allowed. **Dropped or altered fields are not.** Reported per key, so a stranger can read exactly what was lost. | `prove-table.mjs` § D-1, per-file key diff |
| **D-2** | **Reload stability.** After import, three consecutive cold reloads produce a byte-identical stored character. No drift, no re-normalisation churn, no `updatedAt` thrash rewriting the record on every boot. | `prove-table.mjs` § D-2 |
| **D-3** | **Nothing is saved on a refusal.** For every rejected or cancelled import, `Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length` is unchanged. An import that half-lands is worse than one that fails. | `prove-table.mjs` § D-3 |
| **D-4** | **A second tab cannot clobber the first.** Two contexts on the same origin, both with the character loaded, one writes; the other must not overwrite the write with stale state on its next save. | `prove-table.mjs` § D-4 |
| **D-5** | **A full disk does not eat the character.** With `localStorage.setItem` forced to throw `QuotaExceededError`, the app tells him the save failed and the previously stored character is still readable and intact. Silent write-failure is the worst possible outcome and must not occur. | `prove-table.mjs` § D-5 |
| **D-6** | **No destructive act without a confirm.** Every control that clears, resets or replaces a character requires a second, explicitly-labelled confirmation naming what is about to be lost. | `prove-table.mjs` § D-6 + screenshot |
| **D-7** | **Export is reachable in under three taps from the default screen**, offline, and produces a file that satisfies D-1. His only backup is the one he can take at the table. | `prove-table.mjs` § D-7 |

### S — SPEED: it costs none of the six seconds

All S-criteria measured at **4× CPU throttle**, median of 5 runs, worst run also reported.

| ID | Criterion | Number |
|---|---|---|
| **S-1** | **Cold launch to his character on screen.** From `navigationStart` to the frame containing the text `Nix`, service worker warm, network offline. | **≤ 2000 ms** |
| **S-2** | **Tab switch.** Tap to the new screen's own content present. Every one of the seven. | **≤ 400 ms** each |
| **S-3** | **A spend registers.** Tap a resource → the visible state change (pip out, counter down). This is the number that lands inside the six seconds. | **≤ 100 ms** |
| **S-4** | **Reversing a spend** — Undo on the turn screen, restore on the combat screen — returns the resource. | **≤ 100 ms** |
| **S-5** | **No stall during a turn.** Across a scripted 10-action sequence, no long task exceeds 200 ms and no single frame exceeds 100 ms. A stutter mid-fight is the app taking the floor. | **0 violations** |
| **S-6** | **No layout shift under the thumb.** Cumulative layout shift during the S-5 sequence. Nothing may move between the eye choosing a target and the thumb reaching it. | **CLS ≤ 0.02** |

### R — RECOVERY: bad input, at the table, with people watching

Every row must (a) be refused or gated with a message naming *what* was wrong, (b) leave storage
untouched (D-3), (c) leave the app usable enough to try again, (d) raise zero errors.

| ID | Input | Required behaviour |
|---|---|---|
| **R-1** | `codex-character-data.json` — `{}`, a real failed export he has two of | Says the **export** failed, not the import |
| **R-2** | A `.json` containing prose | Refused as not-a-character, and says where a real export comes from |
| **R-3** | The thin real export | Gated, lists which fields are thin, offers "Import anyway" **and** "Cancel"; Cancel really cancels |
| **R-4** | Truncated JSON (valid file, cut mid-object) | Refused, named as malformed |
| **R-5** | A 12 MB JSON | Refused or handled without freezing the UI > 1 s |
| **R-6** | A JSON array at the root | Refused, not coerced |
| **R-7** | A JSON carrying `__proto__` / `constructor` / `prototype` keys | Refused or neutralised; `Object.prototype` is unpolluted afterwards |
| **R-8** | A binary file renamed `.json` | Refused, named |
| **R-9** | The **same** character imported twice in a row | No duplicate roster entry, no silent overwrite of unsaved state |

### V — THE VISUAL WORK: arm's length, bad light

Measured on rendered DOM, not on the stylesheet. Every **visible** text node and every interactive
element is walked; contrast is computed against the actual painted background behind it.

| ID | Criterion | Number |
|---|---|---|
| **V-1** | **Nothing below the reading floor.** No visible text node under **12px** computed. | **0 nodes** |
| **V-2** | **Contrast, everywhere.** Every visible text node ≥ **4.5:1** against its painted background. | **0 nodes below** |
| **V-3** | **The things he reads under pressure are AAA.** Every numeral, resource counter, HP value and primary sentence ≥ **7:1**. In a dim room at 60 cm, 4.5:1 is a squint. | **0 nodes below** |
| **V-4** | **The display face is never a label face.** Cinzel appears at **≥ 20px**, never smaller. Its root cause was fixed in Slice 13b; this proves it stayed fixed. | **0 nodes below** |
| **V-5** | **Everything tappable is reachable.** Every interactive element ≥ **44 × 44 px** hit area (WCAG 2.2 AA); every control used *during a turn* ≥ **48 × 48 px**. | **0 below** |
| **V-6** | **Thumb zone.** On 390 × 844, every control that spends a resource, and the tab bar, lies within the **bottom 60%** of the viewport. One hand, lower third. | **0 outside** |
| **V-6b** | **Nothing that is reachable on paper is unreachable in fact.** *(ADDED 2026-08-23 alongside A-7.)* At scroll-top and at scroll-bottom, on every screen, `document.elementFromPoint()` at the centre of every interactive element's hit rect must resolve to that element or a descendant of it. A control sitting under the fixed tab bar, under a sticky header, or under a full-bleed overlay has perfect geometry and cannot be pressed — the failure V-5 and V-6 are both structurally blind to, because both read `getBoundingClientRect()` and neither reads the stack above it. | **0 occluded** |
| **V-7** | **It does not look like a component-library demo.** Judged by the `impeccable` design gate, run as a named gate, verdict pasted verbatim into § 8 including anything it fails. | § 8 verdict + screenshots |
| **V-8** | **Screenshot of every screen at real device size**, phone and iPad, in `_shots-app/`, linked in § 10, at the SHA that shipped. A stranger looks at these and fails me or doesn't. | § 10 |

### N — NO WIFI

| ID | Criterion | Falsified by |
|---|---|---|
| **N-1** | **Cold boot, airplane mode.** One warm load, then network hard-off and the process restarted: the app boots from the standalone `start_url`, Nix loads, all seven screens render, a spend persists, a reload survives. | `prove-table.mjs` § N-1 |
| **N-2** | **The AI may never block combat.** With the AI endpoint black-holed (connect timeout, not refusal — the slow failure, which is the dangerous one), S-3 still holds and no screen shows a spinner that outlives the turn. | `prove-table.mjs` § N-2 |
| **N-3** | **No runtime third-party fetch.** Zero requests to any origin other than the app's own during a full cold boot and a walk of all seven screens. Fonts included. | `prove-table.mjs` § N-3, request log |
| **N-4** | **A stale cache cannot brick it.** A cached `index.html` naming bundles that no longer exist must not leave a permanently blank app; `?sw=off` must recover it. | `prove-table.mjs` § N-4 |

### E — ENDURANCE: hour four

Four hours cannot be run literally in CI, and pretending otherwise would be exactly the kind of
proof this project has been burned by. E-1/E-2 are **explicitly labelled proxies** and say so in
their output.

| ID | Criterion | Number |
|---|---|---|
| **E-1** | **200 scripted turn actions** (proxy for a four-hour session) with no reload. JS heap after forced GC at action 200 vs. action 10. | **≤ +25%** |
| **E-2** | Net DOM node growth across the same run. | **≤ +50 nodes** |
| **E-3** | **The session log is bounded.** No `localStorage` key grows without limit; the largest key after E-1 is reported, and total origin usage stays under 4 MB. | **< 4 MB** |
| **E-4** | **The 200th action is as fast as the 10th.** S-3 re-measured at the end of E-1. | **≤ 100 ms** |

### P — THE DEPLOYED THING

The whole point. Green on a laptop is not the criterion.

| ID | Criterion | Falsified by |
|---|---|---|
| **P-1** | **Deployed SHA == the SHA that passed.** The commit in the successful Pages run equals local `HEAD` equals the SHA at the top of the results table. | `gh run view <id> --json headSha` vs `git rev-parse HEAD` |
| **P-2** | **The live URL passes F, R, V and N**, run against `https://dosenft.github.io/the-codex/`, not against a local preview. | `prove-table.mjs --live` |
| **P-3** | **A fresh subagent that did not build it** opens both local and live output and verifies each criterion independently. Builders never grade themselves. | § 11 verdict |
| **P-4** | **The live URL was opened and checked after the deploy finished**, not before, and the SHA re-confirmed after. | § 11 + timestamp |

---

## 7. Where the project actually stands (2026-08-23, before any change)

| | |
|---|---|
| `origin/main` | `73c45d8` — **this is what is deployed** |
| `origin/v1`, local `main`, local `v1` | `ac2f405` — **not deployed** |
| Live URL | https://dosenft.github.io/the-codex/ |
| Last Pages run | `32089041476`, success, `headSha 73c45d8`, 2026-08-18 |

**The fix for the dead screens is not live.** `ac2f405` — the commit that defaulted `description`,
`equipment` objects, identity arrays, hook `text` and `persona: {}` in `normalizeCharacter`, and that
fixed `prove-import.mjs` to fail on caught errors — was committed to `v1` and to local `main`, and
`main` was never pushed.

**What that actually means at the table — measured, not inferred** (see amendment A-3; my first
reading of the diff was wrong). `73c45d8` was built in a worktree and driven by the same harness that
grades HEAD:

| input | on `73c45d8` (live) | on `ac2f405` (HEAD) |
|---|---|---|
| `codex-nix-lvl7 (1).json` — his real **full** export | clean, 7/7 screens | clean, 7/7 |
| `codex-nix-lvl7.json` — his real **thin** export | clean, 7/7 screens | clean, 7/7 |
| 12 hostile-but-legal inner shapes | **8 of 12 fault** — boundaried, hollowed, or throwing | 0 of 12 fault |

So the live site is **not** currently broken for the character Marcus carries; it is broken for save
shapes he could easily produce (a hand-edited file, an older export, any spell without a `level`, any
equipment entry that is an object, `persona: {}`). The severity is "a landmine under the save file",
not "it is on fire". That distinction is the difference between an emergency deploy and a normal one,
and it is exactly the kind of claim that has been asserted rather than measured on this project
before.

**What the existing checks cover:** 338 Vitest unit tests (pure logic: rules-2024, turn compose /
rank / reduce, covenant, AI, import normalisation, one characterization suite) — all green, 2.8 s.
Plus ~20 hand-written Playwright `prove-slice*.mjs` scripts and mutation scripts, run manually.
`prove-import.mjs` is genuinely good since `ac2f405`: it fails on caught errors and boundary text,
and it walks all seven screens for 12 bare shapes.

**What they miss — and this is the whole reason the bug shipped three times:**

1. **CI runs none of them.** `.github/workflows/deploy.yml` is `npm ci && npm run build` and nothing
   else. There is no `npm test` step, no Playwright step. "The checks were green" has always meant
   *the TypeScript compiled*. A push to `main` deploys unconditionally.
2. **Nothing measures a number.** Not one check asserts a millisecond, a contrast ratio, a pixel
   size, or a byte. Speed, legibility, reach and endurance have never been proven at all.
3. **Nothing runs offline** — the single condition the table most reliably produces.
4. **Nothing runs against the live site.** Every proof targets `localhost:4173`.
5. **The proofs are per-slice and manual.** There is no single command that says yes or no, so in
   practice the thing that ran before a deploy was the build.
6. **Nothing proves the instrument.** No negative control anywhere: no check has ever been shown to
   fail on a broken build. That is the root cause behind all three shipped import bugs, and it is
   now criterion **P-0**.

---

## 8. Design gate — `impeccable`

*Filled in from the gate run. Verdict pasted verbatim, including failures.*

## 9. Behaviour changes believed necessary — WRITTEN UP, LEFT UNBUILT

*Filled in as found. Nothing in this section is in the diff.*

## 10. Screenshots

*Every screen, phone and iPad, at the shipped SHA.*

## 11. Independent verification

*Fresh subagent, local and live.*

## 12. Results

*Criterion-by-criterion, PASS / FAIL / UNPROVEN.*

---

## 13. The Vault

*One paragraph. Written after reading `github.com/DOSENFT/dwk-vault`.*
