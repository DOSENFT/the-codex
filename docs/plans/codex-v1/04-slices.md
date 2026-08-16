# Vertical Slices: The Codex V1.0

Written 2026-08-15. Gates 1–3 approved. **No implementation code exists yet** — this plan is the last
thing decided before it does.

Marcus, 2026-08-15: *"Choose the absolute best route towards a fully finished product, fully working
flawlessly. Full team on this."*

Two standing constraints shape every line below: **the prototype is the specification, not scratch**,
and **tokens are the lifespan** — so the plan is ordered by what reaches the table soonest, and the
team is spent where parallelism actually buys something.

---

## Three decisions I am making rather than asking

Marcus said choose. These were open; they are now closed and recorded.

**1. The spell-slot desync (Gate 3 Least Confident #1) — reconcile, don't switch.**
`Character.spellSlots` becomes the single source of truth *and* a one-time reconciliation runs on
load for any saved state where `used + current !== max`, taking the character's value and recording
the discrepancy to the console. A hard switch is cleaner and risks silently disagreeing with a saved
mid-fight state; reconciliation is uglier and cannot lose Marcus's data. **"Flawlessly" means the
data survives, not that the code is pretty.**

**2. Work lands on a `v1` branch, never directly on `main`.**
`.github/workflows/deploy.yml` makes every push to `main` a live deploy of a publicly-reachable app.
Half-built features must never be live — that is the named failure mode in CLAUDE.md. `main` is
merged only at wave boundaries, after Marcus has seen the slice work.

**3. Slices 13–15 build the remaining three D mockups as real components, not as HTML mockups.**
The turn screen already settled the visual language; drawing grimoire/identity/dice as throwaway HTML
first would be work done twice. Direction D's stylesheet becomes `src/design/tokens.css` at Slice 1
and every later surface is built from it directly.

---

## Definition of done — the same three questions at every slice

1. **Does it run on the real device?** Verified through `game-night.ps1` + the Playwright shots, not asserted.
2. **Did anything that worked stop working?** Characterization tests + the V0.9 baseline shots.
3. **Is it finished, or is it staged?** No half-built feature is left visible. If it is not done, it is behind a flag.

---

## The slices

### Wave 0 — the floor · *nothing is safe to build until this exists*

**Slice 1 — TRACER BULLET.** `v1` branch. Vitest installed and running with one trivial passing test.
One `ErrorBoundary` wrapped around each top-level surface. Direction D's palette and type ramp
extracted to `src/design/tokens.css`. `composeTurn()` exists and **returns hardcoded seeded data** —
Vaelin's exact mid-fight state from the mockups. A new D-styled turn view renders it behind `?d=1`.
- *Proof:* Marcus opens the app on the iPad via `game-night.ps1`, adds `?d=1`, and sees direction D
  running in the real application. Every existing screen still works untouched.
- *Almost nothing is real. That is the point — the whole pipe is wired before any logic goes in it.*

### Wave 1 — the turn brain · *this is the 15-second metric*

**Slice 2 — Phase-0 characterization.** Seven tests asserting what `TurnSummary.tsx` produces
**today**, bugs included, for the seeded state. Written against the *unmodified* prototype.
- *Proof:* all seven green against code I have not touched. This is the slice that makes the working
  prototype count — from here it is a specification with teeth.

**Slice 3 — `rules-2024/`.** `economy.ts`, `mastery.ts`, `conditions.ts` + their tests. Pure, no
React, no UI change. Bloodied and the 8 mastery riders exist in code for the first time.
- *Proof:* the rules test suite green, including `bloodiedThreshold(76) === 38` and Sap/Vex expiring
  on different windows.

**Slice 4 — the extraction.** `composeTurn()` stops returning hardcoded data and does the real work,
lifted from `TurnSummary.tsx:219–378`. Legality and affordability only — no ranking yet.
- *Proof:* **Slice 2's characterization tests still green.** The extraction is provably
  behaviour-preserving. Any difference is caught here, not at the table.

**Slice 5 — ranking and the mutex.** `rank.ts` + `contention.ts`. The shortlist becomes genuinely
ranked, and Smite / Lay on Hands / Misty Step render as one bracketed decision.
- *Proof:* the seeded turn ranks Vow of Enmity first; the three bonus-action options appear as one
  `MutexGroup` with reason `'both'`; blocked options grey with a reason rather than vanishing.

**Slice 6 — state, and Undo.** `CombatProvider` + reducer + the invertible event log. Prop drilling
dies. The spell-slot reconciliation lands here. `CombatHelper` 1,746 → <400 LOC; `TurnSummary`
1,196 → <400.
- *Proof:* every event variant round-trips (reduce → undo → deep-equal). Undo works on the iPad.
  Characterization tests still green after the largest diff in V1.0.
- 🚩 *Highest-risk slice. Marcus should look at this diff.*

### Wave 1b — homebrew is the main case *(added 2026-08-16)*

**Slice 6b — generic resource pools.** The one real homebrew hole. `ResourcePool` replaces the
hardcoded `PaladinResources` shape; `paladinResources` is **kept** and adapted, never removed.
`ResourceEditor` lets Marcus author a pool (name, max, unit, recharge) through the UI.
`ConditionEditor` does the same for a homebrew condition.
- *Proof:* Marcus creates an Oath of the Hearth resource pool in the app, spends it from the turn
  screen, and undoes the spend. No code was written for that pool.

**Slice 6c — the open-world pass.** Every rules-engine path is checked against content it has never
seen: a homebrew mastery keeps its rider text, a homebrew condition displays and is never dropped, a
homebrew bonus-action feature joins the mutex, a homebrew resource shows in the ledger.
- *Proof:* a test fixture of **entirely invented content** composes, ranks, spends and undoes
  correctly. Nothing in `rules-2024/` matches on a name.

### Wave 2 — the missing 40% of combat

**Slice 7 — reactions.** Opportunity attacks, Shield, Counterspell, readied actions. Currently
absent (`dnd-data.ts:286–290` documents them; nothing implements them). 2024: an OA can now be a
Grapple or Shove.
**Slice 8 — concentration and Bloodied.** Concentration surfaces itself when damage threatens it
(2024: DC capped at 30, breaks the moment you start another concentration spell). Bloodied crossings
announce themselves via the reducer's edge detection.
**Slice 9 — mobs.** Eight goblins are one entry with eight pips. `InitiativeEntry` gains an optional
group; freeform entry is preserved.

### Wave 3 — the table

**Slice 10 — it installs.** `vite-plugin-pwa`, manifest, service worker, **and self-hosted `.woff2`
fonts** — precaching a shell that then blocks on `fonts.gstatic.com` is not offline.
- *Proof:* iPad home-screen icon, aeroplane mode, every surface except AI still works.

**Slice 11 — AI hardening.** The hardcoded LAN IP in `src/lib/ai.ts` is replaced with same-origin →
localhost → user-configured. **The turn screen renders fully and stays usable with the model down.**
- *Proof:* kill Ollama; combat is unaffected.

**Slice 12 — safety at the table.** Lines, veils and consent captured once; a one-press veil that is
always available and can never be switched off.

### Wave 4 — finish

**Slice 13 — the rest of the app in D's language.** Grimoire, identity, dice — built as real
components from `tokens.css`. The other surfaces inherit the tokens.
**Slice 14 — motion budget + print.** Long and ceremonial for consequential moments, near-instant for
taps, nothing decorative. Print chronicle and character record.
**Slice 15 — release.** Full Playwright pass against the V0.9 baseline shots, licensing attribution
resolved (see below), merge `v1` → `main`, live deploy, and one real session at the table.

---

## Where the team gets spent

"Full team" is worth real tokens in three places and nowhere else. Everything else is one coherent
authoring job where parallelism only adds merge cost.

| Where | Shape | Why it pays |
|---|---|---|
| **Slice 3** (`rules-2024/`) | Fan out: one agent per rules area (economy / mastery / conditions), each writing module + tests, then an adversarial pass that tries to **refute** each rule against SRD 5.2.1 | Rules are independent, and a wrong rule costs Marcus a ruling at the table. This is where being right matters most and where independent verification actually catches things. |
| **Slice 6** (state + halving two components) | Fan out on verification, not authoring: one agent per invariant (undo round-trip, characterization, LOC targets, no lost behaviour) | Largest diff in V1.0. One author keeps it coherent; several skeptics keep it honest. |
| **Slice 15** (release) | Adversarial sweep: independent agents hunting for regressions against the V0.9 baseline | The prime law is "never reduce capability" — the only way to know is to go looking. |

Slices 1, 2, 4, 5 and 7–14 are single-threaded. Slice 4 in particular **must** be one author: the
whole point is that it preserves behaviour, and a committee cannot preserve a behaviour it cannot
see whole.

---

## Nothing is blocked on Marcus any more

🟢 **The SRD licensing item is closed, and it was smaller than I made it sound.** The SRD is
published under a Creative Commons Attribution licence — the entire obligation is one credit line in
the app. And the specific worry I raised (Oath of Vengeance not being SRD content) evaporated when
Marcus said his character is **Nix, Oath of the Hearth — his own homebrew, which he owns outright.**
Vengeance only ever appeared in demo data, and that is being replaced by Nix. A credits line lands in
Slice 15. No decision required.

## The seed data changes: Vaelin → Nix

Every mockup and fixture used "Vaelin Ashgrove, Oath of Vengeance" — invented demo data. From Slice 1
the real character is **Nix, Oath of the Hearth**, which the app already knows as a subclass
(`dnd-data.ts:23`, homebrew block at `184–205`). This is not cosmetic: it means every slice is
verified against the character Marcus actually plays, with the homebrew paths exercised by default
rather than as an afterthought.

---

## Explicitly deferred past V1.0

React 19 · SQLite-WASM/OPFS storage · a monster/stat-block library · splitting the other 13 files
over 800 LOC · a component library · anything from GENESIS that replaces a working capability.
