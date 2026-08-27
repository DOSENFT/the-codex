# Slices: Table Truth (Codex Phase 1)

Branch `v1`. **Never `main`** — every push to `main` is a live public deploy to
https://dosenft.github.io/the-codex/.

**Proof after every slice** (binding process rule carried from V1, debt item 2 — *do not ask
Marcus to read a diff*): (a) before/after screenshots of the surfaces that changed, (b)
plain-language "what moved and why" in terms of app behaviour, (c) the measured numbers.
Then: *"Continue to slice N+1, or re-steer?"*

Build order is chosen so the four confidence-building wins land **before** the one slice
that carries real risk (slice 5).

---

## The slices

**1 — Tracer bullet: canon lands, and tells the truth about itself.**
The 13 JSON files copied verbatim into `src/canon/`, plus `index.ts`, `lookup.ts`,
`format.ts` and their tests. On screen: one temporary strip on the Play tab reading
*"Canon · 71 spells · 12 errata · matched N of M things on your sheet"*, listing what did
not match. Almost no feature — but it runs, it is visible, and it answers the question the
whole phase rests on: **does name matching actually work against Nix's real sheet?** The
strip is removed in slice 9.

**2 — The vitals band, and the spell-slot discrepancy surfaced.**
Save DC · AC · Init · Prof · Spell Atk in one card at the top, reusing the number layout
from `combat/StatsBar.tsx:254-279` (332 lines that have never rendered) rather than
rewriting it. Initiative is the derived **modifier**; nothing new is stored. Ships with a
flag: *"Your sheet has 2 third-level slots. A level 7 Paladin has none (canon:
`{1:4, 2:3}`). Recompute, or keep?"* — **shown, never auto-applied.**

**3 — Gemini works again.**
Model discovery via `GET /v1beta/models`, resolution by pattern instead of hardcoded ids,
one retry on a 404 that names its own replacement, the winner persisted. All six
`gemini-2.0-flash` literals deleted. Placed early on purpose: it is fully isolated (one lib
+ two dropdowns), it is **100% broken today**, and it unblocks Character Forging — which is
the one AI feature that genuinely cannot degrade. Early also means it cannot get squeezed
out at the end of the phase.

**4 — The two minimise controls.**
"Active Conditions" (`HPTracker.tsx:477-547`) folds, and its header states its own state so
a folded section still says *none*. The TurnDeck gains a minimised spine — **V-6 scoped, not
broken**: the four economy state dots and the slot pips stay permanently visible; only
labels, Lay on Hands and Channel Divinity fold. Both reuse the existing `useCollapsible`
hook and the existing `codex-ui-${id}` key. Smallest slice in the phase, and the two things
Marcus asked for by name.

**5 — The engine reaches the table. One ranked list. (The risky one.)**
`CombatProvider` mounts inside `CombatHelper`, **read-only** — it persists only inside its
dispatch handler, so if nothing dispatches, nothing writes. "Your Turn" becomes one ranked
list from `turn.ranked`, rows fed by `overlayCanon()`, each exactly two lines and never an
ellipsis. Existing surfaces stay put; nothing is removed yet. Guarded by the storage-safety
test: `codex-combat-${id}` byte-identical before and after a full render.

**6 — Your Reactions.**
The band that answers *"hearthfire manifest — what does it do and when can I use it"*. Every
row states **WHEN** before what. Sits below the turn list (measured at Gate 1: above it,
every turn option fell off the screen), and the deck's Reaction chip opens it in place.

*Added after slice 1 (see `00-status.md` Finding D):* **this slice must index Channel Divinity
`options[]` as first-class lookup entries.** Nix's sheet names the *option* ("Flaming Cloak",
"Channel Divinity: Sacred Weapon"); canon names the *parent* ("Channel Divinity", "Hearthfire
Manifest"). Matching only on parent names is why the app currently shows Marcus his own thin
wording for the exact feature he asked about — while canon holds its full text **and four of the
twelve errata**. Done means `featureByName('Flaming Cloak')` reaches Hearthfire Manifest.

**7 — The option detail sheet. This is where the "..." dies.**
One tap, four bands, always the same four in the same order: stat block → what it does →
the rolls → how to use it. Full canon text, the live one-slot-per-turn rule box reading the
actual turn, tactics folded by default. `ActionMenu`'s roll-from-the-sheet moves here — it
is a capability, not a duplicate. Works with the AI off and the wifi off.

**8 — Errata: readable, level-aware, and answerable.**
*Re-scoped 2026-08-27 with Marcus, after finding AA. The original text is quoted below rather
than quietly overwritten.*

All 12 `HEARTH-##` errata become readable, and each one becomes a question you can answer.

- **The shape is fault → canon's recommended fix → what the app is doing about it.** `problem`
  and `appAction` are on all twelve; `recommendedFix` is on eleven. *(Corrected 2026-08-27 during
  the build — the first draft of this line claimed all three were universal and `errata.test.ts`
  went red on it. **HEARTH-11 has no recommended fix because canon judged Swift Flame "strong but
  defensible" and wants nothing changed**, offering `mitigatingFactor` and `assessment` instead.
  That is canon saying so, not a data gap, so nothing may assume a fix block exists.)*
  HEARTH-01's `narrowerAlternative` shows **because it is there**, not because the layout reserved
  a hole for it. Canon's reasoning fields (`cause` 1, `note` 1, `comparison` 1, `assessment` 4,
  `mitigatingFactor` 1) render when present. This replaces Gate 1 decision 3's "three readings",
  which eleven of the twelve cannot supply.
- **Live vs later is computed, never hardcoded.** An erratum is live when the feature it names is
  on the sheet at a level the character has reached — `feature.level <= character.level`, read
  from the sheet's own field. At level 8 Nix gets six: four on Hearthfire Manifest, one on Aura
  of Solace, one on Oath Spells. The other six (Smoldering Smite L15, Hearth Warden L20) sit
  behind a fold and arrive on their own when he levels.
- **Each erratum stores how the table ruled it**, in `codex-errata-${characterId}`: not asked yet
  / following canon's recommended fix / your DM ruled otherwise, in your own words. That is the
  artifact — a flag you cannot answer is a flag you re-read every session.
- **~~Two~~ FOUR of the six live errata reach no turn option** — corrected 2026-08-27 from the
  measurement, see finding AT. Of the fourteen options `composeTurn` builds for Nix, exactly **one**
  (Hearthfire Manifest) reaches any erratum at all; it reaches four. Aura of Solace composes no
  option and "Oath Spells" is not a feature name any row carries, so HEARTH-07 and HEARTH-08 have no
  route through the sheet — and neither do the two features they concern. This is finding AB's shape
  again, worse than estimated, and it is designed for up front: the band is the home, the sheet is
  the shortcut. Pinned by a test so the number cannot drift silently.
- **Nothing is silently changed and nothing is enforced.** See 8b.

**8b — The four errata that ask the app to ACT.** *(new, split out of 8)*
Canon's `appAction` on four records asks for behaviour, not text: HEARTH-04's mandatory temp-HP
warning, HEARTH-03's record-and-enforce trigger, HEARTH-08's Warding Bond de-duplication,
HEARTH-07's Incapacitated inheritance on Aura of Solace. Two touch the combat write path, which
slice 10 owns. **Scoped after Marcus has read the twelve in slice 8 and recorded his DM's
rulings** — the app must not enforce a house rule before the house has ruled.

> *Original slice 8 text, superseded 2026-08-27:* "Errata: show both, default to the fix. All 12
> `HEARTH-##` flags inline and expanded, each with the as-written text, the fault, the cause, the
> three readings, and one-tap DM wording. Stored per character in `codex-errata-${id}`. Nothing
> silently changed."

**9 — Retire the competing menus.**
Only now, and only after each one's unique capabilities are enumerated and **pinned as
tests first**. "Actions Reference" goes; the top "Action" slide-up goes; the deck's chips
stay and become the filter. Anything that turns out not to be subsumed **stays**. The prime
law forbids reducing capability, so this slice is allowed to end with something surviving.
Slice 1's diagnostic strip is removed here.

**10 — The rules answer, and the write path.**
Canon's `VAL-01`..`VAL-15` run as a named Vitest suite — any rule that cannot be mechanised
is skipped **with its id and reason printed**, so a gap is visible rather than absent. Then
the decision deferred from Gate 3 least-confident #1: move the combat write path into
`CombatProvider`, or ship Phase 1 read-only. Deciding it here, with nine slices of evidence,
is cheaper than guessing it now.

---

## What is deliberately NOT in Phase 1

- **Wiring `InitiativeTracker.tsx`.** 332 unimported lines, called "the cheapest large win"
  in `codex-v1/00-status.md:1855-1870` — but it needs a field on `CombatState`, and the
  vitals band already delivers the *number* Marcus asked for. First thing to cut, already cut.
- **Deleting the three dead components** (`combat/StatsBar.tsx`, `Block1Empty.tsx`,
  `Block1Skeleton.tsx`). Deleting files is 🟡 ASK-FIRST. Slice 2 *reuses* StatsBar's layout;
  nothing is removed without asking.
- **Fixing Nix's stored spell slots.** Surfaced in slice 2, decided by Marcus, never
  auto-applied.
- **Grimoire, Roleplay, Character Forging's flow, the Vault boundary, campaign memory.**
  Untouched.

---

## Definition of done for the phase

1. No definition anywhere on the Play tab ends in `…` — asserted across all 71 canon spells.
2. Every turn option row is exactly two lines, and the full text is one tap away.
3. Spell save DC, AC, initiative and proficiency are visible without scrolling.
4. A reaction list exists, states its trigger first, and is reachable from the deck.
5. Conditions and the deck both minimise; spend state stays visible when the deck is folded.
6. Gemini connects, and survives Google retiring a model without a code change.
7. `npm test` green, including the storage-safety tests proving no stored key changed shape.
8. Nix's `codex-character-${id}` is byte-identical to what it was before Phase 1 started,
   except for anything Marcus himself chose to change.
