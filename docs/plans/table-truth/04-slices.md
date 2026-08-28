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
  from the sheet's own field. **Nix is level 7** *(confirmed by Marcus 2026-08-27; this line read
  "level 8" until then — the number came from the test fixture, not from him)*, and at level 7 he
  gets six: four on Hearthfire Manifest (L3), one on Aura of Solace (L7), one on Oath Spells (L5).
  The count is unchanged by the correction — Aura of Solace lands exactly on 7 — which is precisely
  why the wrong level survived this long with nothing going red. The other six (Smoldering Smite L15, Hearth Warden L20) sit
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

**8b — The ruling reaches the point of use.** *(new, split out of 8)*
**NARROWED 2026-08-27, from four errata to one claim.** Marcus delegated the design decision
("idk, whatever you think is absolutely best"), so no re-approval was needed — but the narrowing
has to be visible, and so does the law it settled on:

> **A ruling changes what the app SAYS. It never changes what the app COMPUTES.**

That is the answer to "should a recorded ruling *change* anything?". Canon's HEARTH-01 forbids the
silent version in as many words — *"Do not silently implement either version. Present the conflict
to the player"* — and the operative word is **silently**. A clause that is attributed, reversible
and visible **is** the conflict being presented. So a ruling may put words on the screen; it may
never move a number.

**What 8b ships:** the cloak's WHEN line. Recorded → the reaction row reads the ruled trigger and
names its source (`your DM's ruling · HEARTH-03` / `canon's suggested fix · HEARTH-03`). Not
recorded → the row goes on admitting the gap, and now says *where* to close it.

*Why this one and not the other three, in order of weight:*
1. It is literally Marcus's original ask — "my reactions (like hearth fire manifest and what it
   does or **when i can use it**)". The other three are canon's asks.
2. Slice 6 pre-wrote the hook in both `trigger.ts` and `ReactionRow.tsx` and said so in the code.
3. It is **text**, not arithmetic — zero risk of silently changing a number, which is the law above.
4. HEARTH-04's mandatory warning and HEARTH-05's damage tally both need the **combat write path**,
   which slice 10 owns. Building them now means building them twice. **Deferred to 10, explicitly.**
5. HEARTH-08's de-duplication is a **Prep/Grimoire-tab** concern, not a Play-tab one — and the
   measurement (finding AZ) found the app's bug is *larger* than canon's erratum, which makes it
   its own piece of work rather than a rider on this one. **Deferred, with the measurement recorded.**
6. HEARTH-07 reaches no turn option at all (finding AT), so there is no point of use to reach.

*How a trigger is chosen: by **shape**, never by id.* An erratum contributes a trigger only when
the operative text reads as one (`/^(?:when|if)\b/i`). So a DM ruling on HEARTH-04 — "temp HP does
not stack, my call" — correctly contributes nothing. Measured across the whole corpus by
`_probe-trigger.mjs`: of the quoted spans in the twelve records, exactly **one** is trigger-shaped.
`if (id === 'HEARTH-03')` would have worked today and been wrong the moment canon grew a
thirteenth record; a test guards against anyone reintroducing it.

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

**SPLIT 2026-08-27 into 10a and 10b**, on the slice-8/8b precedent and for the same reason:
the measurement came back bigger than the estimate. `_probe-val.mjs` graded all fifteen rules
against the real functions before a line of suite was written, and found **four the app
violates** and **five it cannot express at all**. Nine rules with something to say is a full
reviewable diff on its own; bolting the write path onto it would produce exactly the diff the
binding process rule exists to prevent.

**10a — The rules answer.** The suite, and nothing else. Three states, never a weakened
assertion:

- `it(…)` — the app obeys. The assertion is canon's rule, green.
- `it.fails(…)` — the app **violates**. The body asserts canon's rule *written straight*;
  `it.fails` records that it does not hold today and goes **RED the day someone fixes the
  app**, at which point they flip it to `it`. This is not weakening a test — a skipped test
  is silence, and this is a pin that shouts when the bug dies. A `describe.skip` around a
  violation would have been the weakening; this is its opposite.
- `it.skip('VAL-XX — NOT MECHANISABLE: <reason>')` — **the id and the reason are in the test
  name**, so `npm test` prints the gap on every run. Each skip is paired with a **gap pin**: a
  live `it()` asserting the *absence itself* (the field does not exist, no row composes), so
  the day the app grows the missing shape, the pin goes red and someone must revisit the skip.
  A gap with no pin is a gap that stays.

Ids are read from `CANON_CHAR.validationRules`, never hand-typed — the `OATH_ERRATA_IDS`
lesson from 8b. A meta-test asserts the ledger covers all fifteen and that every severity
matches canon's, so canon growing a `VAL-16` turns the suite red instead of quietly ignoring it.

*What the probe measured, which is what the suite pins:*

| | rules | why |
|---|---|---|
| **ENFORCED** (4) | VAL-02, VAL-05, VAL-11, VAL-14 | `it()`, green |
| **VIOLATED** (4) | VAL-01, VAL-06, VAL-13, VAL-15 | `it.fails()`, pinned |
| **PARTIAL** (2) | VAL-04, VAL-12 | the mechanisable half asserted, the rest skipped |
| **NOT MECHANISABLE** (5) | VAL-03, VAL-07, VAL-08, VAL-09, VAL-10 | `it.skip` + a gap pin |

**10b — The write path. DONE 2026-08-27.** Gate 3 least-confident #1 — *should the write path
move at all in Phase 1, or should Phase 1 ship read-only?* — carried unanswered since before a
line of this phase existed, on the grounds that nine slices of evidence would beat a guess.

**Answered, and not the way the mitigation assumed: read-only was never a safe resting place,
because the read-only mount was already putting wrong information on the glass.**
`prove-slice10b.mjs` measured it in Chrome:

| | options the list offers |
|---|---|
| on arrival | **4** — Hearthbrand, Javelin, Sacred Flame, Hearthfire Manifest |
| after spending the Action on the deck | **4** — *identical rows* |
| after a reload, nothing else changed | **1** — Hearthfire Manifest |

Three of those four cost the Action Marcus had just spent. Nothing threw, nothing logged; the
app was simply one turn behind, silently, until the tab was reloaded — which at a table nobody
does. That is **finding BB**: two components held two models of the same turn and diverged on
the first tap.

**The fix is a deletion, not an addition.** `CombatProvider` was already the right owner —
persist-inside-the-handler, no effects, bound to one character by `key`. `CombatHelperInner`'s
parallel `useState<CombatState>` and its saving `useEffect` were removed and the eleven writers
routed through the provider's own `updateCombat` / `forgetCombat`. One owner, one engine
reading it. Post-fix: **4 → 1 → 1**, and the reload is a no-op.

**Finding AR closed with it, both halves.** The two unconditional mount writes are gone —
`CombatHelper`'s `saveCombatState` effect with the state it owned, and `TurnSummary`'s
`saveActionNotes` effect by moving the write into `updateActionNote`. Measured, not asserted:
case E records `Storage.prototype.setItem` and counts **0 writes on load** (pre-fix it named
`codex-combat-nix-fixture` and `codex-action-notes-nix-fixture`).

**Deferred out of 10b, deliberately.** HEARTH-04's mandatory warning, HEARTH-05's damage tally,
and wiring the ranked rows to `take()` are all *new spend paths*. 10b removes a divergence and
adds no way to spend, so the fix is provable by the numbers above and nothing else. Those three
were assigned to **slice 10c**; 10c shipped the first and **split the other two into 10d** —
see below, and note that the split is a decision, not an omission.

**10c — The rows become takeable. DONE 2026-08-27.** 10b gave the Play tab one honest model of
the turn. 10c gives it a way to *change* that model through the rules, which until this slice it
did not have anywhere Marcus could reach.

**What was actually wrong is smaller and worse than "a button is missing".** `CombatApi.take` —
the rules-checked spend, which refuses an illegal one and can put it back — was written in slice
5, tested since, and reachable **only** from `TurnScreenD` behind the `D_PREVIEW` flag. On the
real Play tab it was dead code. `OptionDetailBody` already had an `onSpend` prop and already
rendered a Spend button gated on `detail.spend && onSpend` — and **both halves of that gate were
shut**: `OptionDetailSheetLive` never passed `onSpend`, and `spendFor` returned null unless the
option burned a slot or a pool. So at a table Marcus read the option on the sheet and then went
and darkened the deck chip by hand, through `updateCombat`, which applies no rules at all.

Three changes, in weight order:

1. **`spendFor` widened.** It returned a label only for a slot or a pool, on the reading that an
   Action is not "spent". At a table the Action is the scarcest thing you own and the entire deck
   exists to track it. Under the old rule Sacred Flame and Javelin — two of the four rows Nix sees
   on a fresh turn — got no Spend button, so the one path built to take an option could not take
   most options. It now returns `cost.label` for any **available** option, and null for an
   unavailable one: the row already carries `blockedReason`, and a Spend control that cannot spend
   is a lie. The label is `cost.label` because that string is always populated by whoever declared
   the option, so a homebrew cost the engine cannot parse still names itself on the button.
2. **`CombatApi.take` returns a boolean.** The smallest load-bearing part of the slice. The sheet
   has to close on a spend and stay open on a refusal, and the only other way to know which
   happened is to watch `refusal` change on a later render — which cannot tell "refused now" from
   "was already refused", nor a refusal from a spend that legitimately changed nothing. The
   reducer already knows, synchronously; `dispatch` just stops throwing the answer away. Every
   pre-10c caller ignores the value and still may.
3. **The refusal is painted under the button that produced it**, in band ③, `role="alert"` so it
   is announced rather than merely drawn — the button does not visibly change on a refusal, and a
   screen that looks identical after a press is the exact failure the sentence prevents. The
   refusal is read from the **provider**, not a local `useState`: a second model of one fact is
   finding BB, one slice old. Safe here because this component is the tab's sole caller of `take`,
   and `close` clears it, so a refusal can never outlive the sheet that produced it.

**The refusal band is a guard, not a workflow — and that is stated rather than papered over.**
Because `spendFor` gates on availability, a refusal is *not reachable by tapping*, which
`detail.test.ts` now pins by running the real reducer over every option the real composer offers,
across three sessions (out of combat, in combat with nothing spent, in combat with the Action
already gone) and asserting the affordance and the reducer never disagree. So the band is proved
by render test, not by the browser prover. A prover that faked one would be grading itself.

**Finding BC, established here and not fixed here.** The prover's first run reported "no Spend
button" on a sheet that had one, because `querySelector('[role="dialog"]')` returned the *Dice
Roller*. `DiceRoller` and `MechanicsDrawer` are hand-rolled overlays — they do not use `Sheet`,
which unmounts when closed — so they sit in the DOM permanently, each declaring `role="dialog"
aria-modal="true"`, parked at `y=844` on an 844-tall viewport with `pointer-events: none`.
`checkVisibility({checkOpacity:true, checkVisibilityCSS:true})` returns **TRUE** for both: only a
transform keeps them off the glass. To a screen reader this app has two open modal dialogs at all
times. Pre-existing, older than this phase, and out of 10c's scope; the prover works around it by
deciding which dialog is open **geometrically** (top edge above the fold), which is the
finding-Q standard set in slice 4.

*Measured in Chrome, `prove-slice10c.mjs`, 9/9 — and the prover was proved first by running it
against the stashed source, where it went **5/9**, red on exactly the four spend claims and
nothing else:*

| | |
|---|---|
| A · arrival | 4 ready — Hearthbrand, Javelin, Sacred Flame, Hearthfire Manifest; deck and disk both say nothing spent |
| B · tap Sacred Flame | the sheet opens on the tapped option, one dialog on the glass, **and it offers a Spend reading `Action · no slot`** ← the slice |
| C · press it | sheet closed · deck Action=used · disk `action:true` · list re-ranked 4 → 1 |
| D · reload | 1 — the reload is a no-op, 10b's guarantee holding through a write path 10b did not have |
| E | clean console |

**10d — HEARTH-04: the grant, and the warning before it destroys a pool. DONE 2026-08-27.**
*(Split out of 10c 2026-08-27, on the 8→8b and 10→10a/10b precedent, and for the same reason: 10c
came back bigger than the estimate once `take` turned out to be unreachable rather than merely
unwired.)* It needs the write path 10c built, and it is **arithmetic on a spend**, not an
affordance — a different kind of risk, in its own reviewable diff.

- **HEARTH-04** — the mandatory replacement warning: *"Accepting these Temporary Hit Points will
  replace your Hearthfire cloak pool and end the cloak. Continue?"* This is the same underlying
  gap as **VAL-06**, pinned `it.fails` in 10a, where `setTempHP(11 → 5)` yields 5. Canon requires
  the warning; the app overwrote silently.
- **And the half nobody had written down:** taking the cloak granted *nothing*. `_probe10d.mjs`
  ran the real reducer — `tempHP` 0 before, 0 after — while the detail sheet displayed the number
  computed from canon's own formula. The app did the arithmetic and then made Marcus type the
  answer into a different screen by hand. A warning about replacing a pool the app never grants
  is a warning about nothing, so the grant shipped in the same slice.

| case (measured, `prove-slice10d.mjs`, 14/14) | what the app did |
|---|---|
| A · arrival | tempHP 0, no badge, no warning — the quiet state |
| B · type 5 over nothing | **one** press, no prompt, disk `{tempHP:5, tempHPSource:null}` — the app says it does not know the source rather than guessing |
| C · type 3 over that 5 | the warning is painted **and has a box inside the viewport**; first press changes nothing; the button re-reads **"Replace 5 with 3"**; second press is obeyed ← the slice |
| D · open Flaming Cloak | the sheet carries the same sentence, naming "the 3 temporary hit points you already have", painted in the **same frame** as the Spend button and ordered before it |
| E · press Spend | 3 → **11**, `tempHPSource: "Flaming Cloak"` — canon's formula at level 7 with Charisma 18, which is canon's own worked example |
| F | clean console |

**Split again, at the end of 10d.** The heading above originally read "HEARTH-04's mandatory
warning **and HEARTH-05's damage tally**". HEARTH-05 was moved out on 2026-08-27, for a reason
only visible from inside 10d: it needs a mechanism that does not exist.

**Re-scoped 2026-08-27, by Marcus, from his own character sheet.** He sent a screenshot of the real
Nix and a list of what he actually has. Four things came out of checking it against the app, and
they reorder the queue — HEARTH-05 moves to **10f**, and **10e becomes the reactions the app never
knew he had**.

- **His Charisma is 16, not 18.** The cloak therefore grants him **10** at level 7, not 11. The app
  is right (it computes from the formula), but the **fixture is a synthetic**: level 8, STR 16,
  CHA 18, AC 19, and a weapon called "Hearthbrand" that Marcus has never seen because it was
  *invented* to exercise every code path at once (`fixtures/nix.ts:10-34` says so, deliberately).
  So every number published in a proof doc so far is the fixture's, not his. **Fix: the browser
  provers seed his real scores; the unit fixture stays an instrument.** The two must stop being
  confused for each other in the write-ups.
- **He believes the 1d10 retaliation costs his Reaction. It does not.** Canon's `rawText` makes the
  *activation* the Reaction ("As a Reaction, you can expend one use of your Channel Divinity");
  the retaliation is a separate, free, uncapped clause — "When you are hit by a melee attack, the
  creature takes 1d10 Fire damage in retaliation." That is precisely why HEARTH-05 exists and rates
  the frequency a problem. **The app models this correctly; the app has never SAID it.** Slice 8b's
  law applies — this changes what the app says, never what it computes.
- **Sentinel and Interception reach nothing.** Both are Reactions he owns, both are in
  `src/canon/feats.json` with full rules text, and his reactions band renders **2** rows where it
  should render more. Root cause, measured: **`character.feats` is read by nothing in the turn
  engine** — zero references across `src/lib/turn/` and `src/lib/canon/`. `options.ts` builds from
  weapons, spells and features only. This is **finding AT** with names on it.
- **There is no "teleport the cloak to an ally" anywhere in canon.** Marcus believes he can; he
  does not know the cost or the effect and is asking his DM. **OPEN, pending that answer. Nothing
  is added to his sheet until it comes back** — inventing a rule onto a character sheet is the one
  thing slice 6 refused to ship.

**10e — the reactions band tells the truth about every reaction he owns. DONE 2026-08-27.**
Gate green: tsc clean, **914 passed + 7 skipped across 38 files**, build ✓, `prove-slice10e.mjs`
**18/18 in Chrome** and **8/18** against the stashed pre-change build. The band went from **2 rows
to 5** on Marcus's real sheet. Full write-up, the measured table and findings **BD / BE / BF** in
`00-status.md` §Slice 10e. Two things below did not survive contact and are recorded there rather
than quietly edited here: the option source landed in **`compose.ts`, not `options.ts`** (finding BD
— `options.ts` is byte-pinned to `main` by `overlay.test.ts` case 15, and slice 6 had already ruled
on this exact question), and wiring it exposed **finding BE**, that option ids were never unique, so
Sentinel's two reactions collapsed into one row. **Finding BF is open**: at five rows the band now
runs under the dice FAB and the sticky deck. A vertical slice through a path that did not exist:
feats reach the turn engine, become reaction options, and inherit every surface already built for
reactions.

- **`character.feats` becomes an option source**, the third one after weapons/spells/features.
- **A feat is a Reaction by SHAPE, never by name** — the open-world rule, non-negotiable. The
  handle is 2024's own cost phrasing in the effect text ("you can take a Reaction to…", "as a
  Reaction", "take an Opportunity Attack"). Sentinel and Interception are found by that rule, and
  so is a feat the app has never seen. Matching `"Sentinel"` would be the bug this rule exists to
  prevent.
- **One row per reaction-shaped effect, not per feat.** Sentinel carries *two* different triggers
  (a creature Disengages; a creature attacks someone other than you) plus a passive rider. "When
  can I use it" is the whole question Marcus asked, and two triggers collapsed into one row answers
  it wrongly.
- **The trigger costs nothing to build.** Both feats' canon text *begins* "When a creature…", and
  `triggerFor` already lifts a leading trigger clause out of `option.detail` and leaves the rest as
  the body. Feed the effect sentence in as `detail` and the existing machinery does the work — no
  new trigger code, and `whenSource` comes out `'declared'` honestly.
- **The canon bridge.** `src/canon/feats.json` (76 feats) is imported by `src/canon/index.ts` but
  **exported as `unknown` and indexed by nothing** — `lookup.ts` never reads it. A stored feat with
  a thin description would otherwise produce a row with no trigger and no body, which is worse than
  no row. `featByName` is added on the `featureByName` precedent, and the sheet's own words still
  win when it has some.
- **And the cloak row must say the retaliation is free.** The one-line correction that changes how
  he plays every round.

**10f-a — finding BF: the dice control gets a home that is not on top of the page. DONE
2026-08-27.** *(Inserted ahead of 10f on Marcus's instruction, 2026-08-27: "fix it first." The
reason it could not wait is that 10f adds a sixth row to the same band — building more content
under a button that covers content is building the complaint.)*

Gate green: tsc clean, **922 passed + 7 skipped across 39 files**, build ✓, `prove-slice10f-a.mjs`
all claims hold at 390×844 on three surfaces, run against the stashed pre-change build first for
the baseline. Full numbers, the corrected finding, and **finding BG** are in `00-status.md`
§Slice 10f-a. Two things worth carrying forward from it:

- **Half of finding BF was wrong.** The deck was never covering anything — `<main>` already ends
  1px above it, and rows 4–5 were scrolled out of their own container, not hidden. A finding
  recorded from a screenshot is a hypothesis; this one named the wrong culprit and the measurement
  cleared it. The dice FAB was the defect, in **both** deck states, because its `bottom` is
  written in terms of `--turn-deck-h` and it travels with the deck.
- **The fix was already in the codebase as a sentence.** `Layout.tsx` states "the scroll region is
  BOUNDED, not padded" and then applies it to one of the two fixed overlays in that corner. No new
  principle was needed — a surface with its own fixed bottom chrome adopts the control (`TurnDeck`
  does, onto 165px of dead width on the slot-pip row, costing zero deck height); everywhere else
  the button floats and `<main>` is finally bounded against it, at the 71px the header comment had
  already budgeted.

**10f — HEARTH-05: total retaliation damage per encounter. DONE 2026-08-27.** *(Was 10e; deferred
twice, both times for a measured reason.)* Gate green: tsc clean, **968 passed + 7 skipped across 41
files**, build ✓, `prove-slice10f.mjs` **21/21** in Chrome at 390×844 and **3/21** against the
stashed pre-change build. Both suspicions below were confirmed and both are why the tally lives in
`CombatState` rather than in the log. Full write-up, Marcus's two capture decisions, the two
structural faults found while building it, and **finding BH** (there is no way to END an encounter
from the Play tab) are in `00-status.md` §Slice 10f. The cloak deals 1d10 Fire to whoever hits Nix in melee, and canon's
`appAction` asks for it verbatim: *"Implement as written but display the total retaliation damage
dealt per encounter so the DM can see the real numbers."* Every number the app shows today is
*computed* from the sheet; this is the first that must be **captured**. Two things must exist before
the display is even meaningful:

1. **Roll-result capture.** `DiceRoller` throws a number and forgets it. Nothing persists a
   result, so nothing can be summed.
2. **A per-encounter accumulator that is not the undo log.** The obvious shortcut — summing
   retaliations out of the session log — is **silently wrong**: `LOG_DEPTH = 25`. Past 25 entries
   the earliest retaliations fall off the end and the total quietly shrinks. A wrong total that
   looks right is worse at the table than no total, so the tally gets its own store.

And it depends on 10e being right first: the tally counts an **uncapped automatic** trigger, so a
model that thinks the retaliation costs a Reaction would count at most one per round.

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
