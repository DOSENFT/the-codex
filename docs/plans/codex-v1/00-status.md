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
- [ ] 3 — `rules-2024/` economy + mastery + conditions, pure, tested *(team: fan out + adversarial refute pass)*
- [ ] 4 — the extraction: real `composeTurn()`; Slice 2's tests must stay green *(single author, deliberately)*
- [ ] 5 — `rank.ts` + `contention.ts`: the shortlist is genuinely ranked, the mutex renders
- [ ] 6 — 🚩 `CombatProvider` + reducer + event log → **Undo**; spell-slot reconciliation; both combat components halved *(team: fan out on verification)*

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
