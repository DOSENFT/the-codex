# Status: The Codex V1.0

Trunk: `C:\Users\marcu\Documents\Powerhouse\projects\the-codex` · remote `DOSENFT/the-codex` · branch `main`
Governing law: `V0.9-CAPABILITY-BASELINE.md` — never reduce capability in pursuit of elegance.
Prior ledger: `V1.0-EVOLUTION-PLAN.md` (slices 1–3 landed, 4–5 partial, 6–8 queued).

- Gate 1 — Product: **APPROVED 2026-08-15** (frame + direction D, both signed off by Marcus)
- Gate 2 — Architecture: **APPROVED 2026-08-15**
- Gate 3 — Program Design: **APPROVED 2026-08-15**
- Gate 4 — Slice plan: **APPROVED 2026-08-15** → `04-slices.md` · **amended 2026-08-16 (homebrew), awaiting re-approval of the amendment only**

## 🔒 THE CHARACTER IS NIX — OATH OF THE HEARTH (HOMEBREW). Marcus, 2026-08-16.

Not Vaelin Ashgrove, not Oath of Vengeance — that was invented demo data in the mockups and is
replaced from Slice 1 onward.

**Homebrew is the main case, not an edge case.** Marcus's own character is homebrew, so anything that
works only for book content is broken for the app's only user. His three requirements, verbatim:
*"powerfully adaptive and continuously edited and still work perfectly [with] full homebrew details
and have it fully work flawlessly."*

### THE ACCEPTANCE TEST FOR ALL OF V1.0
> Marcus enters Nix — Oath of the Hearth, custom features and custom resource pools — **entirely
> through the app's own UI**, edits it again a week later mid-campaign, and the turn screen ranks
> Nix's homebrew options correctly **without a line of code being written for them.**

### The open-world rule (Gate 3 amendment, 2026-08-16)
> **The rules engine never recognises content by name. It reads declared structure.**

This was a genuine backtrack: Gate 3 as first written assumed a closed world. A homebrew mastery
would have hit `coerceMastery() → null` and **silently lost its rider**. Corrected — `riderFor()`
never drops, unknown conditions pass through and display, and `rank.ts` scores on declared fields
only. Full amendment at the top of `03-program-design.md`.

### Verified 2026-08-16 — homebrew support is stronger than assumed
"Oath of the Hearth" is **already a known subclass** (`dnd-data.ts:23`, homebrew block `184–205`).
Full CRUD already exists for custom features (`FeatureEditor.tsx:73–360`), spells
(`SpellEditor.tsx:23–98`), weapons incl. `masteryProperty` (`CharacterPage.tsx:248–277`) and feats
(`305–326`). **No combat logic branches on the subclass name anywhere** (grep-verified) — so homebrew
loses no behaviour today. No character named "Nix" exists in the repo; the nearest is the `ASTERA`
demo template, also Oath of the Hearth.

**The one real hole:** `PaladinResources` is a hardcoded 3-field shape (`character.ts:122–126`)
derived from level (`674–680`). No custom resource pools are possible. → new **Slices 6b and 6c**.

### 🟢 SRD licensing — CLOSED, no decision needed
The SRD is published under a Creative Commons Attribution licence; the whole obligation is one credit
line, landing in Slice 15. The specific worry (Oath of Vengeance not being SRD content) evaporated —
Nix's subclass is Marcus's own homebrew, which he owns. I raised this as a blocker; it was not one.

## Slices

Work lands on branch **`v1`**, never directly on `main` — every push to `main` is a live public
deploy. `main` is merged only at wave boundaries, after Marcus has seen the work.

**Wave 0 — the floor**
- [x] 1 — TRACER: `v1` branch · Vitest · ErrorBoundary · `src/design/tokens.css` · `composeTurn()` returning hardcoded seeded data · D turn view behind `?d=1`, running on the iPad **— DONE 2026-08-16, see below**

**Wave 1 — the turn brain (the 15-second metric)**
- [x] 2 — Phase-0 characterization tests against the UNMODIFIED prototype **— DONE 2026-08-16, see below**
- [x] 3 — `rules-2024/` economy + mastery + conditions, pure, tested *(team: fan out + adversarial refute pass)* **— DONE 2026-08-16, see below**
- [x] 4 — the extraction: real `composeTurn()`; Slice 2's tests must stay green *(single author, deliberately)* **— DONE 2026-08-16, see below**
- [x] 5 — `rank.ts`: the shortlist is genuinely ranked *(`contention.ts` landed early, in Slice 4)* **— DONE 2026-08-16, see below**
- [x] 6 — 🚩 `CombatProvider` + reducer + event log → **Undo**; spell-slot reconciliation **— DONE 2026-08-16, see below**
- [ ] 6a — the shrink, split out of 6: `CombatHelper` (1,746 LOC) and `TurnSummary` re-expressed over the reducer *(deferred deliberately — see the Slice 6 section)*

**Wave 1b — homebrew is the main case** *(added 2026-08-16)*
- [ ] 6b — generic `ResourcePool` (closes the one real homebrew hole) + `ResourceEditor` + `ConditionEditor`; `paladinResources` kept and adapted, never removed
- [ ] 6c — the open-world pass: a fixture of **entirely invented content** must compose, rank, spend and undo correctly

**Wave 2 — the missing 40% of combat**
- [ ] 7 — reactions, opportunity attacks, readied actions
- [ ] 8 — concentration surfacing + Bloodied edge detection
- [ ] 9 — mobs (8 goblins, 8 pips)

**Wave 3 — the table**
- [ ] 10 — PWA: manifest, service worker, **self-hosted fonts**, offline shell
- [ ] 11 — AI hardening: config'd base URL, never blocks combat
- [ ] 12 — safety: lines, veils, consent, always-available veil

**Wave 4 — finish**
- [ ] 13 — grimoire / identity / dice as real components in D's language
- [ ] 14 — motion budget + print chronicle
- [ ] 15 — release: regression sweep vs. V0.9 baseline, licensing resolved, `v1` → `main`, one real session *(team: adversarial sweep)*

## ✅ Slice 1 — TRACER BULLET, done 2026-08-16

Branch `v1` cut from `main`. Nothing has been merged to `main` and nothing is publicly deployed.

**What exists now**

| File | What it is |
|---|---|
| `src/design/tokens.css` + `README.md` | Direction D as variables, plus the four rules it enforces and why each one exists. |
| `src/components/ErrorBoundary.tsx` | One per top-level surface (8 of them, incl. character setup). A Toybox crash can no longer take combat down. |
| `src/lib/turn/types.ts` | `ComposedTurn` and friends. **Open-world by construction** — no closed union of content the engine has heard of; every rider, cost and condition carries its own text. |
| `src/lib/turn/compose.ts` | `composeTurn()` — the real signature, a fixture body. Slice 4 replaces only the body. |
| `src/lib/turn/compose.test.ts` | 9 tests, green. They assert invariants (bloodied maths, mutex coherence, no option listed twice, every blocked option has a reason, every rider keeps its text) so they still mean something after Slice 4. |
| `src/components/turn/TurnScreenD.tsx` + `turn-d.css` | D as a real component. Zero rules logic — if an `if` about legality appears in it, it belongs in `compose.ts`. |
| `docs/plans/codex-v1/reference/shoot-app.mjs` | Shoots and audits the **running app** with the same guardrails as the mockups, and captures the V0.9 baseline in the same pass. |

**The seed is Nix, and it is real.** Recovered from `inject-nix-backstory.js` and `dnd-data.ts`:
changeling paladin 8, Oath of the Hearth, patron Aesis the Shepherd. The fixture includes
**Hearthfire Manifest** and the **Flaming Cloak** reaction (spend Channel Divinity → temp HP equal
to level + CHA, melee attackers take 1d10 fire) — actual homebrew, so the homebrew path is
exercised from slice one rather than remembered about at 6c.

**Measured, not asserted** (`docs/plans/codex-v1/_shots-app/`):

| Shot | Fits | Touch <48 | Cinzel <20 | Text <12 | Gold | Ember |
|---|---|---|---|---|---|---|
| **D turn, phone** | yes | **0** | **0** | **0** | 27.9% | 4.9% |
| **D turn, iPad** | yes | **0** | **0** | **0** | 38.0% | 8.8% |
| V0.9 combat, phone | no (2276px) | 74 | 34 | 30 | 47.2% | 6.8% |
| V0.9 combat, iPad | no (2207px) | 77 | 34 | 27 | 41.4% | 7.4% |

The V0.9 rows are the **baseline Slice 13 has to beat**, captured here so "never reduce capability"
can be checked against numbers instead of memory. V0.9 boots clean with no console errors — nothing
that worked stopped working.

### Two bugs the automated audit could not see, and one it found by accident

1. **Cards were flex-shrinking into each other.** Every box still measured over 48px so the audit
   passed, but the screenshot showed Longsword's text overlapping the card below. `min-height` is
   not a floor inside a flex column — flex-shrink beats it. Fixed with `flex: 0 0 auto`.
   *The lesson is procedural: shoot the screen and LOOK at it. The audit checks the claims you
   thought to make.*
2. **Mutex faces ellipsed to "+2d8 radia…", "Touch · r…".** A decision whose options you cannot
   read is three mystery buttons. The face is now two rows: name + price, then the detail.
3. 🐛 **A stored character missing required fields white-screened the entire app** — above every
   error boundary, before any surface rendered, because `getPreparedSpells()` reaches for
   `.spells.filter()` and StatsBar for `.hitPoints.max` during boot. `loadCharacter()` now defaults
   all 15 required fields (`character.ts:389`). Found by seeding a partial character in the shoot
   script; `thin-character-boots--phone` is now a permanent regression guard. **This one mattered:
   guardrail #2 is "zero blank screens" and this was a live way to hit one.**

### Also decided in Slice 1

- **Slice 6b is demoted, not cancelled.** Marcus confirmed Oath of the Hearth has no custom
  resource pool, so Lay on Hands + Channel Divinity already cover Nix. Generic `ResourcePool` gets
  built when something needs it — building it on schedule would be speculative generality.
- 🔒 **Nix's real data lives in Marcus's browser localStorage, not in this repo.** No slice may
  change a storage key, a field name, or a load path without a migration that preserves it. The
  shoot script writes only to a throwaway Playwright profile.

### Three decisions taken at Gate 4 rather than asked
1. **Spell-slot desync: reconcile, don't hard-switch.** Character is the source of truth, plus a one-time load reconciliation for saved states where `used + current !== max`. Uglier, but it cannot lose Marcus's live data.
2. **`v1` branch, never `main` directly.** Half-built features must never be publicly live.
3. **No more throwaway HTML mockups.** The turn screen settled the language; slices 13–14 build real components from `tokens.css`.

## ✅ Slice 2 — PHASE-0 CHARACTERIZATION, done 2026-08-16

**This is the slice that makes the working prototype count.** From here Marcus's V0.9 is not
"old code to be replaced" — it is an executable specification, and Slice 4 has to pass its exam.

### The path correction (found first, before any code)
Every planning doc pointed at `src/components/TurnSummary.tsx`. **The file is at
`src/components/combat/TurnSummary.tsx`** — same file, same 1,196 LOC, same `219–378`
composition block Gate 2 described. Wrong directory in the citation, nothing more, so no gate
was invalidated and no backtrack was needed. Paths corrected in `02-architecture.md:37` and
`03-program-design.md:187`.

### The lift — how the prototype was made testable without being modified
The composition logic lived inside a `useMemo` in the component, so it could not be called from
a test. It now lives in an exported `categorizeTurnOptions(character)` in the same file, and the
memo calls it:

```ts
const { actions, bonusActions, reactions, passives } = useMemo(
  () => categorizeTurnOptions(character), [character])
```

**The move was mechanical, not retyped.** A script sliced lines 221–377 out and reinserted them
at module scope, dedented by exactly two spaces; it refused to run unless all seven boundary
lines matched their expected text first. The trimmed before/after bodies were then `diff`ed:
**156 lines, zero content change.** That mattered — a hand-transcribed "verbatim" lift that
introduced a bug would have produced tests characterizing the *broken* version, which is the one
failure mode this slice cannot survive.

The memo body only ever closed over `character`, so the lift was safe by construction.

### Files
| File | What |
|---|---|
| `src/components/combat/TurnSummary.tsx` | Memo body lifted to exported `categorizeTurnOptions()`; `ActionOption` and new `CategorizedOptions` exported. **No behaviour change.** |
| `src/lib/turn/fixtures/nix.ts` | NEW. Nix as a real `Character` — typed, so `tsc` checks it. Reconstructed from `inject-nix-backstory.js` and `dnd-data.ts:182–206`. |
| `src/components/combat/TurnSummary.characterization.test.ts` | NEW. The seven tests. |
| `docs/plans/codex-v1/reference/shoot-app.mjs` | Two new shots of the TurnSummary surface + a `click` step. |

### The fixture reaches every branch
Paladin 8 = 4×1st, 3×2nd, **no 3rd tier**. So Fireball (an Oath of the Hearth spell at level 9)
is written on his sheet and uncastable — that is not a contrivance, it is why the "no slot tier"
branch exists. Also: a decorated weapon and a bare one, a cantrip, an unprepared spell, a feature
above level, a feature with its uses spent, and two passives.

### The seven tests, and the two bugs they pin
1. Weapons → Actions, with the exact composed mechanics line.
2. Unprepared spells and spells with no slot are dropped; cantrips skip the check.
3. Casting time decides the bucket — Divine Smite *and* Misty Step both land in bonus actions.
4. Features above level, and features with 0 uses, are dropped.
5. **BUG PINNED:** the passive test is `actionType === 'passive' || … || name.includes('aura')`,
   so *any* feature with "aura" in its name is filed as passive **even when it declares itself a
   Bonus Action**. Name a usable feature "Aura of ..." and it silently vanishes from your turn.
   → Slice 6c.
6. **BUG PINNED:** a 40-point healing *pool* is described in the same "uses" vocabulary as a
   2-use Channel Divinity. `"15/40 uses"` reads at the table as forty separate castings.
   → Slice 6.
7. A complete, non-overlapping census: 14 options, exact names, deterministic.

Both bugs are pinned rather than fixed. A characterization suite that only records the parts you
like is not a safety net, it is an opinion. When Slice 4 fixes one, the fix is a deliberate edit
to an assertion with a reason attached — which is exactly the conversation that should happen.

### The tests were mutation-tested, because green on the first run proves nothing
Eight mutants injected into the code under test; **seven killed**:

| Mutant | Result |
|---|---|
| `feature.level > level` → `>=` | killed *(after fix — see below)* |
| `slot.current <= 0` → `< 0` | killed *(after fix — see below)* |
| aura name-match removed | killed |
| mastery property dropped | killed |
| `prepared` filter removed | killed |
| exhausted-uses filter removed | killed |
| proficiency dropped from `attackBonus` | killed |
| `abilityModifier` floor → round | **survived — equivalent mutant.** All six of Nix's ability scores are even, so `floor` and `round` agree. Out of scope for the turn composer; noted, not chased. |

**The first pass killed only five.** The two survivors were not equivalent — they exposed real
holes: Nix has no feature at *exactly* level 8, and no slot tier at *exactly* zero. Both are
boundaries that matter (the ability you just levelled up for; the ordinary out-of-slots state
late in a fight). Boundary cases were added to tests 2 and 4 and both mutants then died.
**The mutation sweep, not the test run, is what made this suite worth having.**

### Proof
- `npm test` — **16/16 green** (9 Slice 1 invariants + 7 characterization), against a body of
  code whose content was not changed.
- `npm run build` — `tsc -b` clean, Vite build clean.
- Five Slice 1 shots re-run: **numbers identical to the baseline**, no console errors.

### The audit was auditing a screen that did not contain the component
`v0.9-combat--*` stops at the pre-combat "Start Combat" screen — **TurnSummary only mounts once
combat is running.** The suite had been reporting "no errors" about a component it never
rendered. Two shots (`v0.9-turnsummary--phone` / `--ipad`, a `RICH` seed plus a `click` step)
now cover the surface Slices 4–5 rewrite. The screenshot shows the pinned strings on glass —
`+7 to hit (STR +3 + prof +1 magic) · 1d8+4 Slashing`, Divine Smite and Misty Step both under
BONUS ACTION, Aura of Solace under ALWAYS ACTIVE — so the characterization is confirmed against
the rendered UI, not just the unit boundary.

This is the Slice 1 lesson landing twice: **the audit only checks the claims you thought to
make.** First time it passed a visibly broken screen; this time it passed a screen that was
missing the thing under test.

### Baseline for Slice 13 (TurnSummary surface, V0.9)
| Shot | Fits | Touch <48px | Cinzel <20px | Text <12px | Gold |
|---|---|---|---|---|---|
| `v0.9-turnsummary--phone` | NO (2651px) | 87 | 32 | 56 | 33.6% |
| `v0.9-turnsummary--ipad` | NO (2635px) | 90 | 32 | 53 | 30.9% |

## ✅ Slice 3 — `rules-2024/`, done 2026-08-16

The rules exist in code for the first time. Three pure modules, no React, no UI change,
no existing file's behaviour altered. `character.conditions` has been a bare `string[]`
since V0.9 with nothing reading it; `masteryProperty` has been printed on screen since
V0.9 with nothing acting on it; Bloodied was absent from `src/` entirely. All three now
have a tested answer.

### What was written

| File | LOC | What it holds |
|---|---|---|
| `src/lib/rules-2024/mastery.ts` | 180 | The 8 riders, their expiry windows and damage triggers, the 2024 weapon→mastery table (~40 names), and a `coerceMastery()` that never throws |
| `src/lib/rules-2024/economy.ts` | 137 | `EconomySlot`, `demandOfSpell/Feature/Weapon`, `slotAvailable()`, `spellSlotSpentThisTurn()` |
| `src/lib/rules-2024/conditions.ts` | 258 | All 15 conditions with the Incapacitated cascade, homebrew pass-through, and Bloodied as a derived threshold |
| `…/{mastery,economy,conditions}.test.ts` | — | 45 tests |

### How the rules were established

Rules errors are the kind that survive review by sounding right, so they were not written
from memory. Three research subagents ran in parallel (mastery / conditions + Bloodied /
action economy), then **two adversarial refuters** were told to *refute* each claim and to
default to REFUTED or UNCERTAIN when unsure. **38 of 40 claims came back CONFIRMED with
sources.** The two that did not are recorded below, because both were errors in our own
approved Gate 3 doc.

### 🚩 Two corrections to `03-program-design.md` (Marcus should know these)

1. **`MasteryRider.expires` had a value that describes nothing in the game.** Gate 3 wrote
   `'endOfTargetNextTurn'` for Sap. The printed text is *"before the start of your next
   turn"* — Sap and Slow are keyed to YOUR turn, not the target's. So `'startOfYourNextTurn'`
   was missing and one member was fictional. Vex's window (`endOfYourNextTurn`) strictly
   **contains** Sap's; had they gone in the same way round, the app would have promised
   Marcus advantage that expired a turn earlier.
2. **The one-spell-slot rule is scoped to the TURN, not to Action + Bonus Action.** The
   refuter materially REFUTED our narrower reading. The rule is *"on a turn, you can expend
   only one spell slot to cast a spell"* — every action type at once. Action Surge does not
   buy a second levelled spell; a levelled Reaction spell on your own turn after spending a
   slot is illegal.

Neither is a Gate 3 backtrack: the *purpose* of both fields is vindicated — carrying the
window in the type is exactly what caught the error. The doc has been corrected in place
with `CORRECTED IN SLICE 3` notes at both sites.

### One additive extension, flagged

`ConditionEffect` as designed had only `yourAttacksHaveDisadvantage` and
`attacksAgainstYouHaveAdvantage`. That shape cannot express **Invisible**, which runs the
other way — it would have rendered as "no effect". Four fields were added and none removed:
`yourAttacksHaveAdvantage`, `attacksAgainstYouHaveDisadvantage`, an optional `note` (for the
caveats a boolean cannot carry — Prone's axis is *distance*, Grappled exempts the grappler),
and `known` (homebrew pass-through, which the doc's own risk table required).

### Facts now encoded that the app previously had wrong or absent

- **Incapacitated blocks the bonus action** — new in 2024; 2014 took only the action and
  reaction. It does **not** block movement.
- **2024 Stunned does not set Speed 0.** 2014 did. A model reaching for the familiar
  wording will add it back; there is a test whose only job is to stop that.
- **Bloodied is inclusive and has no floor.** 38 of 76 IS bloodied; 38 of 75 is not; a
  creature at 0 HP is still bloodied. No inherent penalty — it is a trigger and a display.
- **Sap fires on a hit; Vex requires the hit to deal damage.** Two independent differences
  between the pair, pinned by two separate tests so fixing one cannot mask the other.
- **Topple is the only rider carrying a save** (CON, DC 8 + attack mod + PB).
- **A declared `masteryProperty` always beats the weapon-name table.** Homebrew is the main
  case; the table exists only for characters saved before this file did.

### Proof

- `npx vitest run` — **61/61 green** (45 new + the 16 from Slices 1–2, all still passing).
- `npx tsc -b` clean, `npx vite build` clean.
- **Mutation sweep: 15 deliberate bugs injected, 15 killed on the first pass.** Every sed
  was guarded with a `cmp` so a mutation that failed to apply reports INVALID rather than
  passing itself off as a survivor — that guard was added after M7 in Slice 2 "survived"
  vacuously. Mutants included: cantrips consuming slots, `slotAvailable()` inverted, the
  one-slot rule ignoring the round, Sap and Vex sharing a window, the weapon table beating
  the declaration, Incapacitated permitting a bonus action, the Bloodied boundary made
  exclusive, the cascade never running, homebrew claimed as known, and 2014's Speed-0
  Stunned restored.

### Two Slice 1 files updated to match

- `src/lib/turn/types.ts` — `OptionRider.expires` gained `'startOfYourNextTurn'`.
  `'endOfTargetNextTurn'` was **kept**: no printed mastery uses it, but a homebrew rider may
  declare any window it likes, and this union stays open-world. Only the mastery table is closed.
- `src/lib/turn/compose.ts` — the Slice 1 Sap seed said `endOfYourNextTurn`. Corrected.

### Not done here, deliberately

Nothing consumes these modules yet. `demandOfWeapon()` is flat (`action`) — Extra Attack,
two-weapon fighting and Nick's free extra attack are questions about how many attacks one
Attack action contains, which is **contention** and belongs to Slice 5. Exhaustion levels
are not tracked; condition *state* is Slice 7. `LoggedEvent` does not exist until Slice 6,
so `spellSlotSpentThisTurn()` takes the structural minimum that `LoggedEvent` will satisfy.

---

## ✅ Slice 4 — THE EXTRACTION, done 2026-08-16

`composeTurn()` stopped returning a fixture and started reading Nix. **97 tests green · `tsc -b`
clean · `vite build` clean · 22/22 mutants killed.**

### The move was mechanical, not transcribed

283 lines went from `TurnSummary.tsx:94-376` to `src/lib/turn/options.ts` **by script**
(`C:/tmp/lift-options.mjs`), and the extracted range was `diff`ed against the destination:
**IDENTICAL — 283 lines moved, zero content change.** "Verbatim" is the entire proof of this
slice, and a human retyping 283 lines cannot claim it.

TurnSummary now re-exports `categorizeTurnOptions` / `ActionOption` / `CategorizedOptions` from
that module, so Slice 2's seven characterization tests import from the path they always imported
from and did not change by one character. There is now **one** implementation of "what can this
character do", and both the V0.9 screen and the composer call it. Two copies would have drifted,
and the drift would have been invisible because both would have looked "working".

### What landed

| File | What it is |
|---|---|
| `src/lib/turn/options.ts` | The moved logic + a 44-line header + the `includeUnaffordable` build switch. |
| `src/lib/turn/compose.ts` | The real composer. Reads character + `CombatState`, returns `ComposedTurn`. 380 LOC, no fixture. |
| `src/lib/turn/contention.ts` | Pulled forward from Slice 5 — contention is **legality**, which is this slice's remit; ranking is wisdom, which is Slice 5's. |
| `src/lib/turn/compose.equivalence.test.ts` | 36 tests. The proof: composeTurn's *available* set **equals** what TurnSummary offers, and the only difference is the affordability drops. |
| `docs/plans/codex-v1/reference/nix-seed.mjs` | Derives the screenshot seed from the unit-test fixture via esbuild. One Nix, not two. |
| `src/lib/turn/types.ts` · `TurnScreenD.tsx` · `App.tsx` | `seeded?` deleted, exactly as its own doc comment promised. |

### The distinction that resolved Slice 2 vs D

Slice 2 pinned "drop unaffordable options". D says "grey with a reason, never hide". Both are right
about different things, and the split is:

- **Not yours today** — unprepared spell, feature above your level, a spell tier you do not possess
  at all (a Paladin 8 has no 3rd). **Still dropped.** Bless and Fireball do not appear.
- **Yours, but unaffordable right now** — the tier exists and is spent, the pool is at 0.
  **Shown, greyed, with the reason.** Divine Sense reads *"No uses left until a long rest"*.

That is why `options.ts` gained a build switch rather than having its filter deleted: the default
path is provably byte-identical (`categorizeTurnOptions(c)` deep-equals
`categorizeTurnOptions(c, {includeUnaffordable:false})`, asserted), so V0.9 is untouched.

### Blocked-reason precedence: say the reason that OUTLIVES THE TURN

An option can be blocked several times over and one sentence fits on the row. Order:
**condition → empty pool → spent slot → one-slot rule.** A condition lasts until removed; a pool
until a rest; a spent slot evaporates in six seconds. Leading with a transient reason implies
"wait a turn and this works", which for Divine Sense at 0 of 4 is false. The economy strip already
shows the whole slot closed, so repeating it per row is the redundant half of the message.

### What the screen actually shows now, from Nix's real sheet

Five ranked (Hearthbrand · Javelin · Sacred Flame · Hearthfire Manifest · Flaming Cloak), then
*Everything else* (Divine Sense, greyed, with its reason), then **two brackets**: the bonus action
with five faces (Divine Smite · Shield of Faith · Misty Step · Lay on Hands · Channel Divinity)
reason `both`, and the action with two (Cure Wounds · Warding Bond). Hearthbrand's declared **Sap**
survives on a homebrew-named weapon; Javelin picks up **Slow** from the 2024 name table.

### 🩹 A regression this slice CAUSED, and fixed inside it

Raising the option count from the fixture's 3+3 to the real 5+7 starved the layout. `.list` was the
only flexing zone and the brackets were `flex: 0 0 auto`, so on the **phone the ranked list
collapsed to ZERO HEIGHT — Marcus would have opened the app at the table and seen none of his
attacks.** On the iPad two options and the whole *Everything else* band were scrolled out of an
invisible inner scroll region.

Screenshot-verified, not theorised, and fixed in `turn-d.css`: the phone stack and (≥900px) the
middle column each became **one scroll surface**. Pinning the brackets was always a nicety;
showing the attacks is the product. Both viewports re-audit **fits viewport: yes · errors: none ·
touch < 48px: 0 · Cinzel < 20px: 0 · text < 12px: 0**.

### Mutation sweep — 22/22 killed

Every sed `cmp`-guarded, so a sed that fails to apply reports INVALID rather than posing as a
survivor. **Two genuinely survived on the first pass and both were real coverage holes**, not
equivalent mutants:

- **M16** `DEFAULT_SHORTLIST = 500` survived: Nix has *exactly* five uncontended affordable
  options, so the default was saturated but never exercised. Closed with a nine-weapon character.
- **M17** `findContention([])` survived: every mutex assertion was written "for each group", and a
  turn with **no** groups passes them all vacuously. Nothing said the brackets must EXIST — for
  D's defining element. Closed with six tests that name the faces, the reason and the caption.

M19 reported **INVALID** because I pointed it at the wrong file; the guard caught it rather than
letting it read as a pass. Retargeted, it kills.

### Deliberately NOT done here

No ranking — every `score` is 0 and the shortlist is the first five in build order. Slice 5 owns
`rank.ts`. `log` is accepted and empty, so the one-slot-per-turn rule is stated correctly and
inert until Slice 6 builds the event log; wiring it is one argument, not a redesign.

**Noted for Slice 6b:** the fixture gives *Flaming Cloak* its own `usesMax: 2` although its text
says it spends a **Channel Divinity** use, so it shows as a separate pool. That is character-data
modelling, not composer logic, and it belongs to the resource-pool slice.

---

## ✅ Slice 5 — RANKING, done 2026-08-16

Slice 4 left every `score` at 0 and the shortlist was the first five options off the sheet.
It is now ordered, and the order is defensible out loud — which was the bar, because a list
that claims to know best and does not is worse than a list that claims nothing.

### What ranking is, and what it refuses to be

`src/lib/turn/rank.ts` is **not a tactical adviser**. There is no board until Slice 9, so
nothing here knows where the goblin stands or who acts next. What it is: a **reading order**,
built from the only two things the app honestly knows — what each option **costs**, and what
is **true of Nix right now**.

| Factor | Weight | The claim it makes |
| --- | --- | --- |
| action / bonus action | +20 / +10 | the action is the main event of a turn |
| reaction | −40 | a reaction happens on someone **else's** turn |
| spell slot, by tier | −6 −6/level | the app does not spend his resources for him |
| resource pool / bare uses | −8 | same, for Lay on Hands, Channel Divinity, homebrew |
| rider (mastery or homebrew) | +4 | free value is still value |
| healing, and he is hurt | up to +50, scaled | a paladin at half health should see Lay on Hands |
| healing, and he is not | −20 | healing at full is noise |
| would break concentration | −45 | almost always a mistake, always worth saying |

### The screen speaks only when it has something to say

`TurnOption.why` is set **only** by a factor worth stating — "You are hurt", "Not on your
turn", "Would drop Bless". The cost and the dice are printed an inch away on the same row, so
repeating them as a reason would be chatter. Most rows carry no note at all, and that silence
is the design. `why` is distinct from `blockedReason`: ember says *you cannot*, dim cream
says *consider*. Both the flat rows and the mutex faces render it, because the bracket is now
ordered too and owes the same explanation.

### 🔴 The finding that changed the design: there is no damage factor

The obvious factor — rank the big hit above the small one — was written, and then **deleted
after reading the real numbers back off Nix's sheet**:

```
Hearthbrand     41.5   dice=1d20+7     <- the TO-HIT roll, averaged as if it were damage
Javelin         40.5   dice=1d20+6
Sacred Flame    29     dice=2d8        <- actual damage, so it scored LOWER
Shield of Faith 16.5   dice=1d20+8     <- a buff dealing nothing, beating…
Divine Smite     7     dice=2d8        <- …the paladin's signature move
```

`rollNotation` is whatever die the row invites you to roll — for a weapon that is the
**attack**, not the damage. Weapon damage exists only inside authored prose ("1d8+4
Slashing"). So the term rewarded options for having an attack bonus and punished them for
being honest about damage. Including it for the spells that expose damage and not for weapons
would bias the whole list toward spells: **half a signal is worse than none.** The damage is
printed on every row anyway, and Marcus reads 1d8+4 against 2d8 faster than the app can guess.
Three tests now exist purely to stop that factor coming back by accident.
*When the content model carries damage as data rather than prose, this is the first factor to
add back.*

### Two behaviour changes beyond ordering

1. **Reactions leave the shortlist.** The section is headed "Your turn"; Flaming Cloak was
   riding into the top five on a technicality and telling Nix to do something he cannot do
   yet. It is **not hidden** — D never hides — it drops to the fold with "Not on your turn".
   Slice 7 gives reactions a home of their own. The header now reads *4 ready*, not 5.
2. **Ranking reads the full authored prose, not the rendered row.** Lay on Hands proved why:
   its one-line detail reads "Touch · 15/40 uses · recharges on long rest" and never says
   *heal*, while its description says "restore hit points" plainly. Ranking off the
   truncation silently failed to raise the heal on a dying paladin — the exact moment the
   feature exists for. `RankHints` carries the prose and any structural flag (`isConcentration`)
   the model actually has.

### Open-world by construction

Nothing in `rank.ts` matches a name against a list of book features. The situational factors
read **the author's own words about their own option**, so a homebrew ability whose text says
it restores hit points participates in the hurt factor with no code written. An option the
module cannot characterise simply gets no situational adjustment — never dropped, never
broken. Three tests assert exactly that against invented content, ahead of Slice 6c.

### Proof

- **132/132 tests green** (17 conditions · 17 economy · 11 mastery · 9 compose · 36 compose
  equivalence · 7 TurnSummary characterization · 35 rank), `tsc -b` exit 0, `vite build` clean.
- **30/30 mutants killed** (`C:	mpmutate-slice5.sh`, every sed `cmp`-guarded). Four
  survived the first sweep and all four were real holes:
  - **N25 — the shortlist sort could be deleted with nothing failing.** Nix's sheet happens to
    list his best weapon first, so "sorted" passed for free. Closed by hanging a masteryless
    *Bent Spoon* off the front of the pack so sheet order fights score.
  - **N24 — nothing asserted the greyed list was sorted at all.**
  - **N29 — the hp fraction was unclamped**, so a sheet holding a negative current hp paid a
    bigger and bigger healing bonus the deeper the number went.
  - **N30 — a 0-max sheet divided by zero**, producing a NaN score that sorts into an
    arbitrary position and silently scrambles the list.
- **Shoot audit clean on both viewports**: fits viewport · no errors · 0 touch targets under
  48px · 0 Cinzel under 20px · 0 text under 12px.

### Noted, not fixed

- **iPad gold density is 38.3% of lit ink** (phone 17.9%). The CSS comment in `turn-d.css`
  names 38.5% as the fault D was built to drop from direction C, so the iPad is sitting right
  on that line. It was 39.2% *before* this slice and no change here caused it. Worth a pass in
  Slice 14, or sooner if Marcus wants it.
- **Divine Smite ranks below Channel Divinity** in the bonus-action bracket, because a slot
  costs more than a use. Defensible, and low-stakes since the bracket shows every face — but
  it is an editorial call worth Marcus's eye.

## ✅ Slice 6 — STATE, REDUCER AND UNDO, done 2026-08-16

Slices 1–5 built a screen that could *read* a turn perfectly and could not change one. Slice 6
made it write. Every tap now goes through one pure function, lands in localStorage before the
pixel moves, and can be taken back.

### The shape
| File | What it is |
| --- | --- |
| `src/lib/turn/events.ts` | the persisted wire format — `CombatEvent`, `LogEntry`, `Restore`, `LOG_DEPTH = 25` |
| `src/lib/turn/ids.ts` | the ONE place a feature name becomes a pool id, so `compose` prices what `reduce` pays |
| `src/lib/turn/reduce.ts` | pure · never throws · reversible. The whole of the slice's thinking |
| `src/lib/turn/reduce.test.ts` | 51 tests, led by a round-trip proof |
| `src/components/turn/CombatProvider.tsx` | the only place in the app that writes during a turn |
| `src/components/turn/TurnLive.tsx` | the join — provider + screen, mounted `key={character.id}` |
| `TurnScreenD.tsx` / `turn-d.css` | rows became `<button>`s **without becoming stateful** |

### Three decisions worth challenging later
1. **Undo is a RESTORATION, not an inverse.** Every clamp (a slot at 0, a pool at max) destroys
   the information an inverse event would need to run backwards. So each log entry carries a
   snapshot of exactly what it is about to touch, and Undo puts those bytes back. It costs
   ~200 bytes an entry and it is the only version that is correct at the edges.
2. **The combat spell-slot mirror was demoted to derived state.** `character.spellSlots` is
   `{max,current}`; `combat.spellSlots` is `{used,max}` — two writers, opposite polarity, both
   already living in Marcus's browser. Deleting one risks his slots mid-campaign, so instead
   `reconcile()` recomputes the combat copy from the sheet on every reduce and on load. **The
   storage shape did not change; the drift became unrepresentable.**
3. **The screen stayed presentational.** Every handler on `TurnScreenD` is an optional prop.
   Given none, it is byte-for-byte the read-only screen the design shoot measures.

### Three real bugs the tests found — none of them by design review
- **A half-declared counter was being treated as empty.** The app's own rule (`GrimoireCard:132`,
  `LoadoutPanel:168`) is that a counter is tracked only when `usesMax` **and** `usesCurrent` are
  present. `reduce` and `compose` both read `?? 0`, so a homebrew ability with a max and no
  current showed as *0/2* and refused to fire. Fixed in both, with the trunk cited in comments.
- **A no-op was logging an undoable entry.** A free option that costs nothing changed nothing and
  still offered "Undo" — the 🔴 half-built-feature rule in miniature. `reduce` now returns
  `entry: null` unless something was genuinely touched, which is what its own doc always claimed.
- **`startCombat` silently dropped concentration.** Inherited from `combat-state.ts`; the reducer
  preserves it and only `endCombat` clears it.

Consequence of the first fix: `Restore.featureUses` could no longer be absent, so the
`| null` branch was **deleted** rather than kept — an untestable safety net is not a safety net.

### Verification
- `npx tsc -b` clean · `npx vite build` clean · **183/183 vitest across 8 files**
- **Mutation sweep: 40 mutants across `reduce.ts`/`compose.ts`/`ids.ts` — 40 killed, 0 survivors,
  0 invalid.** Every sed `cmp`-guarded, so a mutation that failed to apply reports INVALID
  instead of posing as a survivor.
- **Browser proof `live6.mjs` — 33/33 checks, console clean.** Real Chromium, real build, real
  localStorage: tap Divine Smite → the slot goes on the *sheet* and the mirror agrees → **reload
  (the iPad-suspend case) and it is still spent** → a blocked row changes nothing → Undo restores
  screen *and* sheet and empties the log → Lay on Hands, then End turn, and the heal is **not**
  handed back → the one-slot-per-turn rule lifts with the turn.
  Shots: `_shots-app/slice6-phone.png`, `_shots-app/slice6-ipad.png`.

Two harness bugs were found and fixed along the way, both of which had accused the app falsely:
the fixture was seeded under an id the sheet does not carry, and `addInitScript` re-seeded the
pristine character on the very reload that was supposed to prove persistence.

### 🚩 Re-scope, declared: "both combat components halved" is now Slice 6a
The plan line asked for `CombatHelper` 1,746 → <400 LOC in the same slice. That is a rewrite of
the surface Marcus actually played on, and doing it in the same breath as the state core is how
capability gets lost quietly (V0.9 prime law). Slice 6 therefore delivers **the state core and a
genuinely live D screen**; the shrink is Slice 6a, to be done against the reducer that now exists
and against Slice 2's characterization tests. Nothing was dropped — it was moved and named.

---

## 🔒 Standing instruction — the prototype is not scratch (Marcus, 2026-08-15)

Verbatim: *"we are not starting from scratch. I previously had a fully working prototype. Make that
count for something."*

Enforced mechanically, not as a sentiment:
- Every file in `03-program-design.md` is marked **NEW / EXTRACT / EXTEND**. Of 14, **5 are EXTRACT
  and 4 are EXTEND** — two thirds of V1.0's combat brain is code that already runs at the table.
- **Phase-0 characterization tests are written before any extraction**, asserting what the prototype
  does *today*, bugs included. The working prototype becomes the specification. If an extraction
  changes an output, the test fails and the change must be justified, not discovered mid-fight.
- Existing helpers are **called, not reimplemented**: `spellActionType()` / `featureActionType()`
  (`combat-state.ts:10,18`), `useAction()`, `useSlot()`, `nextTurn()`, `expendSpellSlot()`,
  `spendLayOnHands()`, `spendChannelDivinity()`.

## ⚠ Hazard found at Gate 3 — spell slots are stored twice, in two shapes

`Character.spellSlots` is `{max, current}` (counts down, `character.ts:188`);
`CombatState.spellSlots` is `{used, max}` (counts up, `combat-state.ts:46`). Nothing syncs them and
`createCombatState()` snapshots only `max`. Two writers, one truth — this presents at the table as
"the app says I have a slot and I don't." Gate 3 makes the character the single source of truth and
`CombatState.spellSlots` derived-only. **Listed as Least Confident #1 — it touches live saved data.**

## Gate 2 recon — the two findings that shaped the architecture (2026-08-15)

1. **The ranked shortlist already half-exists.** `TurnSummary.tsx:219–378` filters by legality and
   affordability today (prepared-only, skip if `slot.current <= 0`, skip features above level or out
   of uses). What is missing is relevance, ranking and testability — it is 160 lines inside a
   1,196-line component's `useMemo`. V1.0 **extracts and completes** it as `src/lib/turn/compose.ts`,
   a pure function. It does not invent it.
2. **Combat state is already persisted per character** (`combat-state.ts:50`). Undo needs a reducer,
   not a new persistence story.

Other facts worth not re-discovering: enemies are freeform entries with an HP **string** and no
monster model (no mobs) · Reactions exist only as an economy flag; opportunity attacks and Ready are
absent · `masteryProperty` is declared and displayed but never consumed · the Ollama base URL is a
hardcoded LAN IP in `src/lib/ai.ts` · fonts load from `fonts.gstatic.com` at runtime with no local
`.woff2` in the repo · **every push to `main` is a live GitHub Pages deploy**
(`.github/workflows/deploy.yml`).

## Where the design phase actually is (2026-08-15)

Marcus's 7-step front-end process, step by step:

1. **Find inspo** — done. Two parallel research agents; raw output preserved verbatim in
   `reference/_raw-agent-AB.md` and `reference/_raw-agent-CDEF.md`.
2. **Organise and label it** — done. `reference/01-inspiration-catalogue.md`: 34 entries across six
   buckets, each with source, URL, "the steal" (a *mechanic*, not a vibe), surface served, and
   failure mode. ⚠ Both agents reported the gold-on-black contrast ratio wrong (3.8:1 and 6.2:1);
   computed from the WCAG 2.1 sRGB formula it is **8.40:1**. Gold passes AAA and is safe for body
   text. The real limits are Cinzel's stroke weight at small sizes and the ~20% coverage ceiling.
3. **Skills** — available locally, listed below. Applied as reference, not invoked as generators.
4. **MCP for assets** — Higgsfield is not connected; `Command Claude` covers the same need. Not yet
   used; no generated imagery exists in any mockup (all six are pure CSS, deliberately).
5. **21st.dev component prompts** — server not connected. Component prompts will be authored directly
   at Gate 3, in the format Marcus specified (aesthetic 5–8 liner · reference shot · intent · guardrails).
6. **Build phase, do not one-shot** — three full directions built, not one. Six mockups:
   `mockups/{a-instrument,b-spread,c-hand}/{01-turn,02-turn-spread}.html`, phone + iPad each, all
   showing the identical seeded mid-fight state so they are directly comparable to each other and to
   `reference/baseline/`. **Scope decision: the turn screen only, 6 files not 15** — the turn screen is
   where the 15-second metric lives and where the visual language is decided. Grimoire / identity /
   dice get built in the winning language only, after the pick. Building 15 mockups across three
   unjudged languages is the exact waste "do not one-shot" warns about.
   → Rendered and audited: `mockups/00-render-verification.md`. All six render clean, fit their
   viewport, and hold anti-pattern 4. Three shared faults found (Cinzel used as a label face at
   11–16px; text under the 12px floor; "End turn" under the 48px touch minimum in all three).
   These are language-level, not direction-level — they do not change which direction wins.
   → **Then iterated, per Marcus's "iterate over favourites and favourite aspects of each, then
   compare and finalise":** direction **D** merges all three and removes all four shared faults.
   `mockups/d-merged/{01-turn,02-turn-spread}.html`. It is the current candidate.
7. **Prompt format** — `reference/02-three-directions.md` follows it exactly for each direction.
   D's brief lives in its own stylesheet header, in the same format.

## Marcus's ruling, 2026-08-15 — direction D and the 2024 rules

Verbatim: *"I really like them all. Perhaps the best of all while doing away with what fails on all.
I like the ranked short list I think. So long as the entire thing we are building is built with the
newest 5e rules. Continue"*

Three things settled by that:

1. **The ranked shortlist is CONFIRMED.** It was the blocking question behind all three directions —
   the turn opens with the few things that are legal, affordable and relevant now, everything else one
   tap away. It is a behaviour change, not a skin, and it is the single biggest lever on the 15-second
   target. It is now a premise, not a proposal.
2. **Merge, don't pick.** Built as `mockups/d-merged/` — A's zone grammar, B's illumination and
   rubrication, C's object physics, with the four faults common to all three removed. D is the only
   one that reads **0 / 0 / 0** on touch-under-48px, Cinzel-under-20px and text-under-12px.
   Full account: `mockups/00-render-verification.md` § *Direction D*.
3. **🔒 HARD CONSTRAINT — D&D 2024 rules (SRD 5.2.1) throughout.** Applies to every gate from here,
   not just the mockups. Delta and evidence: `reference/03-rules-2024.md`.

### What the 2024 constraint actually cost — much less than feared

Audit finding: **the trunk is already 2024.** `dnd-data.ts:1`, `prompts.ts:181` (the model is told
explicitly "NOT the 2014 version"), all 8 Weapon Mastery properties in `skill-guide.ts:504-519`,
`masteryProperty` on the character type, no Half-Elf/Half-Orc, Ranger prepared-caster, Channel
Divinity 3 uses at L11. **The mockups were the thing that was wrong**, and they are now corrected.
This turned a feared 10–15 hour migration into a mockup fix.

Two real trunk gaps remain and are queued regardless of the design outcome:
- **"Bloodied" is not implemented** — zero occurrences in `src/`. It is `hp <= floor(max/2)`, not a condition, and needs edge detection to be useful.
- The field is named `race` (`character.ts:216`); 2024 says **species**.

### ⚠ ASK-FIRST, awaiting Marcus — SRD licensing

The app is publicly deployed (https://dosenft.github.io/the-codex/). SRD 5.2.1 requires an exact,
version-specific attribution string, and **Oath of Vengeance is not SRD content**. Flagged, not acted
on. Governance-adjacent, so it is Marcus's call, not mine.

### The one design decision the 2024 rules forced

Divine Smite is now a **Bonus Action** spell and Lay on Hands is now a **Bonus Action**. With Misty
Step also wanting the bonus action, and one-spell-slot-per-turn excluding it twice over, those three
are **one decision with three faces, not three list rows.** D draws them as a bracketed mutex and
marks the BONUS economy cell contested (`3 want it`). Rendering them as a list would misrepresent the
rules. The re-ranked shortlist is therefore: 1 Vow of Enmity (free — and it cancels the Frightened
disadvantage) · 2 Oathkeeper ×2 (Action) · 3–5 the bonus-action mutex.

## Notes for a fresh session

### Recon findings (2026-08-14) — these correct several standing assumptions

1. **There is exactly one live Codex.** `Powerhouse\projects\the-codex` — 23 commits, ~46,360 LOC in
   `src/`, 147 source files, 99 components. Deployed at https://dosenft.github.io/the-codex/.
2. **The rivals are dead, and none is a "mini world."** `the-codex-aaa` (~20K LOC, last touched
   2026-06-19, no independent remote) and `codex-combat-fresh` (0 LOC — design briefs only,
   "Direction B" approved on paper). No diorama/3D-world Codex exists anywhere on this machine;
   that memory has no artifact. `_Archive\Codex` is Anthropic API documentation, unrelated.
3. **The table connection is Cloudflare, not Tailscale.** `game-night.ps1` restarts Ollama bound to
   `0.0.0.0:11434` with CORS open, starts Vite on 5173, opens a `cloudflared.exe` quick tunnel, and
   copies the phone URL to the clipboard. Ephemeral URL, changes every run. No Tailscale, no ngrok.
4. **Stack truth: React 18.3.1**, not 19. Vite 6.4.2, TypeScript 5.6.3 (strict), Tailwind 4.2.4 via
   `@tailwindcss/vite`, motion 12.40.0, three 0.185.1, @react-three/fiber 8.18.0, lucide-react 0.468.0.
   The "React 19" claim in older handoffs is wrong. A React 19 upgrade is its own slice, not a premise.
5. **V1.0 is already underway.** Slices 1 (material foundation), 2 (Held Object overlay pass), and
   3 (GPU dice stage) landed 2026-07-19. Slice 4 (streaming AI) is core-done, display wiring left.
   Slice 5 (desktop rail) is half-done, true side-by-side left. This is not a fresh start.
6. **GENESIS v2.0 is a rewrite doctrine, not an upgrade plan.** 12 chapters + a five-seat council pass
   (~120 findings) at `Documents\Ash & Archive\GENESIS\` (mirrored in `Ash & Archive\studio-repo\
   products\the-codex\GENESIS\`). It proposes replacing the storage model (event-sourced Ash/Archive
   on SQLite-WASM + OPFS), the navigation model (three Stances vs. Play/Prep + tabs), the UI
   composition (Ledger/folios), and the AI surface (margin pencil vs. panel). Under the V0.9 prime
   law most of that is a capability removal. **GENESIS is an idea quarry — mine it, don't obey it.**
   Its purely-additive material is genuinely excellent and is where the value is (see Gate 1).

### Tooling reality for the design phase
- **Chrome browser automation is NOT available** (corrected — an earlier note here claimed it was).
  `tabs_context_mcp` returns "Browser extension is not connected." Visual QA runs through **Playwright
  headless** instead: `reference/shoot-baseline.mjs` (the live V0.9 app, needs `npm run dev` first) and
  `reference/shoot-mockups.mjs` (the Gate-1 mockups, no server needed). Playwright is resolved from the
  npx cache at runtime and is deliberately **not** a trunk dependency.
- **No MCP server named Higgsfield is connected.** The connected image/video/3D generation server is
  `Command Claude` (generate_image / generate_image_batch / generate_video / generate_3d /
  upscale_image / outpaint_image / remove_background). It covers the same need.
- **21st.dev / Magic MCP is not connected.** Component prompts must be authored directly, or the
  server added first.
- Design skills present locally: `frontend-design`, `ui-ux-pro-max`, `design-system`, `ui-styling`,
  `web-design-guidelines`, `composition-patterns`, `brand`, `react-best-practices`.

### Health gaps found in the trunk (upgrade targets, all real)
- **0 tests, 0 test runner, 0 lint config, 0 error boundaries** — a single component throw white-screens
  the whole app mid-combat.
- **15 files over 800 LOC**; `DialogueBank.tsx` 2,163 · `CharacterPage.tsx` 1,962 · `CombatHelper.tsx`
  1,602 · `ToyboxPanel.tsx` 1,440 · `Spellbook.tsx` 1,120 · `TurnSummary.tsx` 1,105.
- **Deep prop drilling** through 99 components; no context providers. State is `useCharacter()` + props.
- **No PWA manifest, no service worker** — cannot be installed to an iPad home screen, no offline shell.
- **Two competing visual languages coexist**: `glass-card`/`parchment-card` and the `brass/` subsystem
  (7 components). Tokens live inline in `src/index.css` `@theme`; there is no design-system directory.
- **Fonts load from the Google Fonts API at runtime** (`src/fonts/fonts.css:2` TODO) — a hard dependency
  on internet at a table that may not have it.
- Only 1 `any` in the whole codebase; TypeScript strictness is genuinely good. Type safety is a strength.
