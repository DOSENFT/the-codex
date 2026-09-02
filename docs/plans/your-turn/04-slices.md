# Slices: the one "Your Turn"

Nine slices. Each ends in something that runs, on his real export, at 390×844.

**The order is pin-first and flag-last.** The `?d=1` flag stays on until slice 8,
so every slice up to it is built on a screen he can open and I can measure while
his working combat tab keeps working. Nothing is deleted in the same slice that
moves its capability — table-truth slice 9's order, which took reachable options
6-of-14 → 14-of-14 while retiring three menus.

**Every slice pre-declares its micro-revert before it is written.** A slice whose
revert is not one named command is not ready to start.

---

## Slice 1 — the instrument, and proof it can fail

The tracer bullet is not a feature here; it is the measuring rig, run end to end
through the real app on his real sheet. Everything after this slice is judged by
what this one builds.

- Re-run `measure-today.mjs` against the **pre-change** build and record the
  before-numbers in this folder. The after-number must be taken by the same
  instrument or it is not a comparison.
- Write the capability pins (test plan 12) from Gate 2's do-not-lose table and
  get them **green against the old build**. A pin that is red now is a pin that
  is wrong now. *Written: **41**, not the 26 first planned — the table's 23 rows
  bundle: "damage · heal · temp HP" is three controls, "retaliation capture +
  tally + undo" is three states, and a pin per phrase would let two of three go
  missing and still read green.*
- Build the **synthetic sheet with `paladinResources` set** (test plan 13). His
  export does not carry one, so Lay on Hands and Channel Divinity cannot be seen
  on his screen at all — this fixture is the only way that half of the do-not-lose
  table can be checked, ever.
- Show at least three pins **red on demand** by stubbing out the capability they
  name. A proof that passes on its first run is not evidence until it has been
  shown able to fail.

**Proved, 2026-08-31, on the pre-change build:**
`34 KEEP green / 34 · 1 RETIRE green · 6 ARRIVE red / 6 · PAGE ERRORS: none · exit 0`
plus the HP-colour relation across two sheets — `oklch(0.637 0.237 25.331)` at
3/67 against `rgb(57, 217, 138)` at 67/67, **DIFFERENT**. Before-numbers on
record in `_baseline-before.txt` (429 furniture / 415 window / 3100 content /
7.47 screens — identical to Gate 1's, so the instrument is stable). Full pin
run in `_pins-before.txt`.
**Revert:** delete the new test files. No `src/` change in this slice at all.

---

## Slice 2 — the four bands

`src/lib/turn/bands.ts` + `TurnBands.tsx`, wired into `TurnScreenD` behind `?d=1`.

ACTION · BONUS · REACTION · MOVEMENT, each with its ready-count, each collapsible,
blocked rows dimmed **with the reason written on them** instead of hidden under
"everything else". This is item 5 — *"a very apparent and masterful organisation
visually"* — and it is also the slice that finally reduces D's 2.69 screens.

**Proves:** unit tests 1–5; component tests 6–7; and the scroll measurement on
`?d=1` before and after collapse.
**Revert:** `git checkout` is blocked here, so: the wiring is one prop on one
line in `TurnScreenD` — remove that line and the flat list is back.

### DONE 2026-08-31 — proved

Built: `src/lib/turn/bands.ts` (the pure rule), `src/components/turn/TurnRow.tsx`
(extraction — see the Gate 3 slice-2 amendment), `TurnBands.tsx`, plus edits to
`TurnScreenD.tsx`, `TurnLive.tsx` and `turn-d.css`.

| proof | result |
|---|---|
| `src/lib/turn/bands.test.ts` — plan items 1–5 | **12 green** |
| `src/components/turn/TurnBands.test.tsx` — items 6–7 + the fallback | **11 green** |
| `docs/plans/your-turn/prove-slice2.mjs` — on the glass, his export, 390×844 | **27/27 green** |
| `prove-capabilities.mjs --after` — regression | **34/34 KEEP green**, 6/6 ARRIVE still red |
| `tsc --noEmit` | clean |

Measured, nothing spent: **ACTION 2 ready · BONUS 3 · REACTION 4 · MOVEMENT 0.**
Every header **48px** (V-5b), label **Cinzel 20px** (V-4), count in `--d-tally`
(V-3), state in words as well as colour. Collapsing all four:
**2268px → 964px, 3.19 screens → 1.36.**

Measured with action and bonus spent: **10 blocked rows painted, 10 carrying
their reason**, spent bands read `0 ready · spent` with a dim pip while REACTION
stays amber. No option leaves the screen across the two states —
**9 rows + 5 mutex faces = 14 → 14 rows + 0 faces = 14.**

Shown able to fail: three mutations against the built app — strip the row's
reason (red), drop empty bands (4 red), grey the live pip (red, *after* the check
that missed it was fixed). The reds are written up in `00-status.md` §"What slice
2 corrected"; one corrected Gate 3 and three corrected the proof itself.

The 6 ARRIVE pins stay red on purpose: they measure the **default** combat tab,
not `?d=1`. They arrive at slice 8, when the flag comes off.

---

## Slice 3 — his body comes into the card

`VitalsControls.tsx` — the adapter, not a rewrite. `HPTracker` and
`ConditionsGrid` mounted into the card's vitals strip: hit points **in the colour
they already change to** (his 3/67 is the red pulsing state and it stays exactly
as it looks), armour class, damage · heal · temp HP behind one tap, the temp-HP
source question, death saves, and the conditions dropdown on the same line.

Items 10 and part of 11. No second writer to his sheet — that is the whole reason
this wraps `HPTracker` instead of reimplementing it.

**Proves:** HP painted **once** on `?d=1`; `codex-character-<id>` byte-identical
across a cold load with 0 writes (test 17); damage applied lands and the tracker
turns.
**Revert:** remove the `vitalsControls` prop from the `TurnLive` call site — and
after the slice-1 amendment it is **one** line, not two: `conditionsControl` came
off the props when slice 1 proved `ConditionsGrid` has never been rendered. The
conditions dropdown that ships is `HPTracker`'s own, so it arrives with the rest
of the tracker through that same single prop.

### DONE 2026-08-31 — proved

Built as a **`variant` seam on `HPTracker`**, which is the one decision here worth
reading twice. `'card'` is what `CombatHelper` has always rendered, unchanged;
`'bare'` is the same component with the card, the heading, the number and the bar
suppressed — controls only. The alternatives were a second writer to
`codex-character-<id>` or losing D's bloodied mark. Neither was acceptable, and
`vitals.ts` reports and never corrects.

| what | measured |
|---|---|
| his hit points on `?d=1` | **1 place** — D's own readout @79:16 |
| the same probe, legacy screen | **4 places** (the half that says it isn't blind) |
| damage · heal · temp HP | painted, **48 · 48 · 48px** |
| the controls' home | inside `.vitals` — 142–275 within 68–286 |
| conditions fold | painted, **closed**, 48px, reads "None" |
| one tap | **15 cells**, 48px min, `aria-expanded="true"` |
| death saves | **0** buttons at 3 HP · **6** at 0 HP |
| 35 damage | 67 → **32**, `--d-gold` → `--d-ember`, "Bloodied at 33" → "Bloodied", stored sheet **32** |
| test 17 | cold load: **0 writes**, sheet byte-identical |
| regression | `--after` 34/34 KEEP · 6/6 ARRIVE still red · 1377 tests · tsc 0 |

`prove-slice3.mjs` 22/22. Mutations: M1 (the revert) → 14 red; M2
(`bare`→`card`) → 2 red, and only those 2; M3 (bloodied bar painted amber) →
**green, and it should not have been.** The colour check was rewritten to resolve
`--d-gold` and `--d-ember` independently, and M3 then went red. See
`00-status.md` §What slice 3 corrected.

---

## Slice 4 — the rail

`TurnRail.tsx`: dice · look up · slot pips · reset · start/end combat, plus Lay
on Hands and Channel Divinity **when the sheet carries them**. `useDiceDock()`
declares the rail as the adopting surface, so `Layout` stops painting the
floating button.

This is where least-confident decision 6 gets answered instead of assumed: the
rail is measured at 390px **on the synthetic sheet from slice 1**, the one that
has more on it than his own. If it does not fit, it wraps to two rows here, in a
slice that is about the rail, rather than in slice 8 when the flag is already off.

Also the call that closes finding BH: `startEncounter` / `endEncounter` have
existed on `CombatApi` since table-truth and nothing has ever called them.

**Proves:** test 13, both halves — `paladinResources` present → the controls
paint; **absent → they do not, and nothing throws**; the rail measured at 390 on
both sheets; the dice open from the rail.
**Revert:** remove the `rail` prop; `Layout`'s floating dice button returns
because the dock seam is unchanged.

### DONE 2026-08-31 — what was measured

Reading the code to build it turned up the thing the plan did not have: **colC's
read-only `.res` strip already paints the same slots and pools.** A rail added
*beside* it would have put his 1st-level slots on screen twice — item 4's fault,
rebuilt by the slice meant to consolidate. `TurnScreenD` therefore renders
`{!rail && <colC/>}` and `{rail}`: one or the other, never both, enforced by the
code rather than by intention. Test 13 also gained a third case the plan did not
have — `poolsOf` resolves a pool from **three** homes, and his sheet uses the
`features[].usesMax` route, not `paladinResources`. The rail must draw pools
there too or the open-world rule is broken in the file that most needs it.

| what | measured |
|---|---|
| the rail, his export | **602–779**, 177px, **3 rows**, 390px wide |
| where it sits | body ends 602 · rail 602–779 · footer starts 779 |
| scrolled to the list's end | top **602 → 602** — it does not move |
| the fuller sheet | **490–779**, 289px, **5 rows**, card still fits 844 |
| decision 6, answered | `scrollWidth 390 = clientWidth 390` on **both**; nothing past the right edge; **it wraps, it does not scroll** |
| V-5b | **12 controls his / 17 synthetic, 0 under 48×48** — after the `min-width` fix |
| the strip | **no `.res`, no `colC`** · `has-rail` present |
| slot tiers | `1=1st@683:16 · 2=2nd@739:16 · 3=3rd@739:199` — **one place each** |
| his slots | **9 controls for 9 slots**; the 3rd tier is **shown**, not hidden |
| pools, synthetic | Lay on Hands · Channel Divinity · readout **35/35** (the block's, not the feature's 15/40) |
| pools, neither route | **0 controls**, rail still 177px, no error boundary |
| Reset | all four spent → all four open |
| a pip | 1st level **4 → 3** in the stored sheet |
| a points spend | Lay on Hands **35 → 30** |
| a uses press | Channel Divinity **2 → 1** |
| End combat | `inCombat true → false`, button becomes "Start Combat", never both |
| Look up | closed → **open** |
| dice on `?d=1` | **0 — correct.** `App.tsx`'s preview branch mounts `TurnLive` *outside* `Layout`, and `Layout` owns the dice provider, so `useDiceDock()` returns null and the rail declines to paint a button that could open nothing. The same probe finds **1** on the legacy tab and 9 slot controls there, which is the half that says it is not blind. The dock arrives on the glass at **slice 8**. |
| regression | `prove-capabilities.mjs` KEEP **34/34** · 1388 tests · tsc 0 |

`prove-slice4.mjs` **33/33**. `TurnRail.test.tsx` **11/11**. Mutations: M1 (the
revert) → **27 red**, the three probe-is-not-blind checks correctly green;
M2+M3 together (duplication fault + no-op pool handler) → **exactly 4 red**,
their disjoint sets and nothing else; Mu-A (`disabled={false}`) → 1 red; Mu-B
(the `points` split inverted) → 2 red. Two real weaknesses were found **outside**
the mutations — a V-5b width failure the prover caught on its first run, and a
**wrong fixture** (`channelDivinity` 3, which is level *eleven's* number) that
made the harness accuse the code. See `00-status.md` §What slice 4 corrected.

**Open, for slice 8 to rule on:** the deck's Lay-on-Hands drawer has an "Exact"
number field and a "Cure Poison (5)" preset. Neither is in Gate 2's do-not-lose
table and neither is coming to the rail; `−1 / −5 / −10` covers fine-grained
spending. This is named here so its removal is a decision on record rather than
a silence.

---

## Slice 5 — a row opens, the sheet spends

`onOpen` replaces `onTake`. `OptionDetailSheet` is mounted by `TurnLive`;
`optionDetail(option, character, economy)` fills it; the Spend button inside it
calls `CombatApi.take`.

And `rowExtra` — the retaliation capture rendered under **the matching row and no
other**, matched by shape (`isFreeRider`, slice 10e), never by the string
"Hearthfire". This is **item 7**: he does not think Hearthfire Manifest's
retaliation works. After this slice it is on the row, in the band, where the
reaction is.

**Proves:** component test 9; a real spend persisting `codex-combat-<id>` before
it renders; a refused spend leaving the strip open with his number still in it;
and Opportunity Attack's `1d8+4` correctly getting **no** retaliation button.
**Revert:** `onOpen` and `onTake` are both props — restore the one-line handler
that passed `combat.take` and the old behaviour is back with no other change.

### As built — DONE 2026-08-31, with one amendment to the plan above

**The shape match was not sufficient on its own.** `isFreeRider` alone returned
**three** captures on his export, because "Hearthfire Manifest" is painted on the
Action, Bonus-action and Reaction rows and all three resolve to the same canon
feature. Raising the cloak deals no fire damage, so a capture there is wrong on
the merits before it is ever a duplicate. The predicate is therefore shape **and
slot** — `cost.slot === 'reaction'`, the same predicate `reactions.ts:192` uses,
so the two surfaces agree by construction rather than by coincidence. Still no
string "Hearthfire" anywhere: the open-world rule holds.

**One structural change the plan did not anticipate.** `Act` rendered the whole
card as a `<button>`, so hanging a control inside it would have nested a button
in a button — invalid HTML, resolved by browsers dropping the inner one, giving
a control that paints perfectly and does nothing when pressed. A card with an
extra is now a `<div>` + `button.acthit` + `.actx`. `disabled` rides the hit
target, never the card, because the reaction is most often blocked *because it
was spent* — which is exactly the moment there is a hit to record.

**Proved:** `prove-slice5.mjs` **26/26**, `TurnRow.test.tsx` **8/8**, suite 1396,
`tsc` clean. Five mutations, all five killed. Findings in `00-status.md`.

---

## Slice 6 — Interception, and the question nobody ever asked

**Item 8.** Phase 3 shipped the fighting-style picker and the wire; nothing has
ever asked him which style he took, so his combat tab has never offered
Interception. It is a reaction, and this is the phase that rebuilds reactions.

Ask the question once, store the answer, and let the REACTION band carry all four:
Hearthfire Manifest, Sentinel's two triggers, the opportunity attack, Interception.

**Proves:** the REACTION band shows four on his sheet where it shows three today —
counted on the glass, not in the model (Finding Q: painted geometry, not `textContent`).
**Revert:** the prompt is one component and the style is one stored field; remove
the prompt and the band returns to three.

> **CORRECTED BY MEASUREMENT — 2026-08-31.** "Four where it shows three today"
> is wrong arithmetic, and a proof written against it would pass **before
> Interception is added at all**. Measured on his export, the Reaction band has
> **four rows today**:
>
>     Hearthfire Manifest · Sentinel · Sentinel · Opportunity Attack — The Dawn Guardian
>
> **The two Sentinels are correct and must both survive this slice.** One feat,
> two reactions, two different triggers — `compose.ts:483`, and slice 10e minted
> unique ids precisely so the second would stop vanishing into the first. Their
> triggers differ on the glass: *takes the Disengage action* versus *attacks a
> target other than you*. Any slice-6 check that asserts distinct names, or that
> no name repeats, would **revert a deliberate fix**. (An earlier draft of this
> note said exactly that. It was wrong; see `00-status.md`.)
>
> So slice 6 proves **five rows, by trigger and not by name**: the four above
> plus Interception. Two halves, because the count alone cannot tell an added
> Interception from a duplicated Sentinel —
>
> 1. a row whose trigger is Interception's shape (*a creature you can see hits
>    someone else within 5 ft* → reduce the damage) is on the glass, and was not
>    there before; **and**
> 2. all four rows above are **still** on the glass, both Sentinels included,
>    each still carrying its own distinct trigger text.

### As built — 2026-08-31

**The measurement came before the code, and it changed what the slice was.**
`prove-slice6.mjs` was written first as a measurement: seed his export twice,
once as he exports it and once with Interception recorded exactly as
`fightingStyleFeat()` writes it. Four painted rows became five, with the right
trigger, with nothing else on the screen different. **Nothing was broken.** The
engine, `FightingStylePicker` and the write path all already existed — the only
missing thing was the question — so the slice shipped an ASK, not a repair.

- **`TurnBands.tsx` / `TurnScreenD.tsx`** — one new opaque prop, `bandNote?:
  (slot: BandSlot) => ReactNode`, rendered **after** the rows and **inside** the
  collapse. Per band rather than per row, because slice 5's `rowExtra` cannot
  reach this: an option he has never recorded produces no option, so the gap is
  invisible to every row-shaped mechanism here by construction. Neither file
  learns what a Fighting Style is.
- **`FightingStyleGap.tsx`** (new) — the note, and a `Sheet` holding the
  **existing** `FightingStylePicker`. Reused, not re-listed: two lists of styles
  that can disagree is finding BB rebuilt by hand.
- **`shouldAskFightingStyle(character)`** in `prepare/fighting-style.ts` — three
  gates (granted · reached · answered). Reads `build.ts`'s own `lockedUntil`,
  the same field `GrimoirePage:660` hands the picker, so no second copy of
  "level 2" exists. It was inline in `TurnLive` first; moving it out is what made
  it testable without a DOM.
- **`TurnLive.tsx`** — the write is `onCharacterUpdate(toggleFightingStyle(...))`,
  byte-for-byte what `GrimoirePage:245` does, through the writer it already
  holds. No new plumbing, and still one writer.
- **`turn-d.css`** — one `.bnote` block; dashed border, not solid, because it is
  a question and not a control he owns.

**Proved:** `prove-slice6.mjs` **33/33**, driving the real prompt on his real
sheet — press the note, press Interception, five rows by trigger, both Sentinels
alive with distinct triggers, the note gone, and **the pick survives a reload**
(it reached his sheet, not a `useState`). Plus a level-1 control in which the
band paints and nothing is asked. Unit: `fighting-style.test.ts` 43/43,
`TurnBands.test.tsx` 17/17. **Five mutations, all five killed** — and two of
them, a note that cannot be collapsed and a note nested inside a button, were
**invisible to the browser prover and caught only by the static-markup tests**.
Full detail in `00-status.md` § "What slice 6 corrected".

**Revert as built:** delete the `bandNote={bandNote}` line in `TurnLive.tsx`.
The bands are then byte-for-byte what slice 5 shipped — asserted, not assumed
(`TurnBands.test.tsx`, "without a bandNote…").

---

## Slice 7 — the spine (V-6)

`TurnSpine.tsx`. Four band state-dots · slot pips · End turn, ~40px, appearing
only once the round bar scrolls out of view, on an IntersectionObserver watching
the bar itself rather than a scrollTop number that would need re-tuning every
time the vitals strip changes height.

V-6 is an approved V1 rule — *turn-critical spend controls are always visible*,
intent *never be surprised by what you have already spent*. This keeps that
intent at **13% of the deck's 308px**.

**Proves:** component test 10 (`null` while the bar is in view); furniture
measured **121px at rest, 161px scrolled**, window 723 → 683.
**Revert:** the spine is one component rendered by `TurnLive`; delete the mount.

### ⛔ MEASURED 2026-08-31, BEFORE ANY CODE — the slice above cannot be built

`_probe7.mjs`, his real export, 390×844, in combat. Every number above describes
a screen that no longer exists: they were taken before slice 4 gave the D screen
its rail, and were carried forward without re-measuring. The standing law says
measure the app, not the document about it. Measured:

```
.dturn  is a fixed-height column, and only ONE of its four children scrolls
  0..68    (68px)   header.chrome   scrolls=false   ← "Round 3" lives HERE
  68..602  (534px)  div.body        scrolls=true    ← 2596px of content
  602..779 (177px)  section.rail    scrolls=false
  779..844 (65px)   footer.edge     scrolls=false
```

**1. The trigger can never fire.** The spine appears "once the round bar scrolls
out of view". The round bar is in `header.chrome`, *outside* the scroller. At
scrollTop 0 and at scrollTop 2062 (the maximum) it is painted at 11..38 — the
same pixels. An IntersectionObserver on it would report "in view" forever and
`TurnSpine` would render `null` forever. Worse, **test 10 would pass** — it
asserts `null` while the bar is in view, and the bar is always in view. A probe
that can only see the case that never fails is not evidence.

**2. V-6 is already satisfied — structurally, by slice 4's rail.** Painted at
BOTH scroll extremes: End turn, Undo, End combat, Look up, Reset, and all
**12 slot pips**. Not by `position: fixed` — there is none anywhere in the D
screen — but because they live outside the only scrolling element. Per Finding
BG that is the stronger claim: the rail does not *happen* not to scroll away,
it *cannot*, and no future CSS edit to the list can change that.

**3. Building it would rebuild item 6.** A 40px bar carrying slot pips and End
turn, mounted while a 177px rail already carries slot pips and End turn, is one
thing in two places — the exact fault this phase exists to delete, recreated by
the slice meant to consolidate.

**4. The furniture numbers are inverted from the plan's worry.** Furniture is
**310px, constant** (68 + 177 + 65), not 121→161; the reading window is
**534px, constant**, not 723→683. 37% of his screen is permanently chrome. The
plan feared too little pinned; the measurement says too much.

**5. The one real gap is the four economy state-dots.** They are the only
turn-critical thing that does leave: `.colA .econ` sits at 416..432 at rest and
at **−1646** scrolled. So while he reads down to the Reaction band — deep in a
2596px list — he cannot see which of Action / Bonus / Reaction / Move he has
already spent. That is precisely V-6's stated intent, *never be surprised by
what you have already spent*, and it is unmet for exactly one of the three
things the spine was going to carry. The other two are already handled.

**6. Incidental, found while reading the rail:** `TurnRail` renders its Roll
button only when given `openDice`, and `TurnLive.tsx:271` never passes it — so
the dice control named in slice 4 and in his item 6 is not on the screen. Not
this slice's business; recorded so slice 8 cannot retire the old bar while
believing that feature moved.

### Slice 7, re-steered — the dots move in, and the screen is paid for

**His ruling, 2026-08-31:** move the economy dots into the always-visible region
**and** go after the 310px of permanent chrome, because 534px of reading window
on a phone is the measurement's real finding. Also ruled: **the dice button
stays off** — he rolls physical dice at the table (his item 9), so its absence
becomes deliberate and recorded rather than a gap slice 8 has to close.

Not a new bar. The four `EconSlot` controls *move* — the count of places showing
them stays at **one**, and the thing he cannot see becomes the thing he always
can.

#### What the 310px is made of — measured, not estimated

```
header.chrome    68px   pad 11/12 · .who 44px ("Nix" + "Changeling Paladin 7 · Oath…")
                        · .round 27px ("Round 3"), side by side
section.rail    177px   pad 9/8 · gap 8 · .rverbs 48px (Look up · Reset · End combat)
                        · .rslots 104px (1st on one line; 2nd + 3rd share the next)
footer.edge      65px   pad 9/8 · Undo · End turn, both 48px
.econ (moving)   50px   four .eslot, 48px tall, 97px wide — 388px of the 390 width,
                        so it needs a line of its own; it cannot join an existing row
```

#### The budget

**APPROVED 2026-08-31, including the `.rverbs` row.**

*The first budget written here said −53px and it was wrong: it credited the
`footer.edge` merge with saving both its padding **and** a gap, when merging
into one region still needs a gap between the rail's content and the buttons.
Redone below from the construction rather than from differences, because a
threshold you cannot hit is a proof you will later be tempted to relax.*

The pinned region after the move, built from its parts:

```
border-top   the rule under the scroller      1
padding                                       8
.econ        four 48px slots                 48   ← moved in from .colA
gap                                           8
.rslots      1st / 2nd+3rd                  104   ← unchanged
gap                                           8
Undo · End turn                              48   ← was footer.edge, merged in
padding                                       8
                                            ---
                                            233
header.chrome  8 + 27 + 8 + 1px rule          44
                                            ---
furniture                                   277
```

| | px |
|---|---|
| controls: `.rverbs` (48) out, `.econ` (48) in | **0** |
| two padded regions become one — 17 + 17 → 8 + 8 | **−18** |
| one more internal gap, because there is one more row | **+8** |
| `header.chrome` 68 → 44, one line instead of two | **−24** |
| the 1px rule under `.pinned`, which the first budget forgot | **+1** |
| **net** | **−33** |

Furniture **310 → 277px**; reading window **534 → 567px, +6.2%**.

*Both figures above are the corrected ones. **Written first as 272/572, measured
as 277/567, and the doc changed rather than the threshold relaxed.** Two errors,
both the same kind — a number assumed instead of measured:*

1. *The header was budgeted at 40px by assuming a line height. It is 44: "Round
   3" is `--d-fs-title` display type, whose line box measures **27px**, and V-4
   forbids Cinzel under 20px — so 27 is a floor, not a choice. The padding
   around it was fair game and was taken (`--d-s3` → `--d-s2`, −6px); that is
   the whole of what was left, and it is why this lands at 277 and not lower.*
2. *Neither region's 1px rule was counted. The header's border-bottom and
   `.pinned`'s border-top are 2px of the 5px miss.*

*The next person hunting for pixels on this screen should start with the 104px
of slot rows, not the header — the header has 27px of unshrinkable type and 16
of padding left.*

**The one real trade, stated rather than buried:** the last row costs him
one-tap End combat / Reset / Look up while he is scrolled deep in the list.
Without it the budget is **+3px** — the dots become always-visible and the
screen does not grow. That row is the whole of the "reclaim", and it is the only
part of this slice that takes something away from where it is now.

#### Proves

1. The four economy labels painted at scrollTop 0 **and** at max scroll — the
   exact measurement that just failed, re-run. `_probe7.mjs` is the prover.
2. `.colA .econ` gone: the dots are in **one** place, not two. A count, so it
   cannot pass by looking at the right one.
3. Furniture ≤ 280px and reading window ≥ 564px, on his export at 390×844 —
   the construction says 277/567 and the threshold allows 3px of rounding, not
   a second row. *(Was ≤275/≥569 against a construction of 272/572; corrected
   above after measurement, with both arithmetic errors named. The 3px of slack
   is unchanged — the threshold moved because the construction did, not to let
   a measurement through.)*
4. V-5b's 48px floor held in **both** dimensions by every control that moved —
   the dots are 97×48 today and must not be squeezed to buy the budget.
5. End turn, Undo and all slot pips still painted at both scroll extremes: the
   reorganisation must not cost what the rail already guarantees.
6. A static-markup test that the moved `.econ` is a child of the rail and not of
   `.colA` — the browser can see where a thing is painted, but a structural
   claim is what forbids it coming back (Finding BG).

**Revert:** the moves are parent changes, not rewrites — move each back.

#### The header, and the one visual not to lose

`turn-d.css:84` records a decision: *"The subclass is the character, and Nix's
is homebrew — 'Oath of the He…' is not an acceptable way to render the thing
Marcus wrote himself. It wraps."* His standing instruction for this whole phase
is **do not lose features, nor the visuals**. So the 28px does **not** come from
deleting his subclass. It comes from deleting **"Changeling Paladin 7"** —
species, class and level, which cannot change mid-combat and are on the
character tab — and putting name · subclass · Round on one line.

If that line does not fit in 40px on his sheet, the fallback is padding only
(68 → 58, −10 instead of −28) and the subclass stays. **Measurement decides,
not this paragraph.** `flex-wrap` means a longer name than "Nix" degrades to
two lines and a taller header rather than to a truncation — the budget is
softer for such a character, and that is the correct direction to fail.

#### Fix on the way past

`TurnRail.tsx:122-126` asserts *"a level 7 paladin gets 1st and 2nd and NOT the
empty 3rd row item 4 is about."* **Measurement says there are three rows** — his
stored sheet really carries `3rd ×2`, the app paints it, and that is correct and
already ruled on (see `00-status.md` §"Not a bug — item 4"). The comment's
conclusion is right and its factual claim is wrong, which is worse than saying
nothing: a future session reading it would go hunting for a bug that is a
deliberate ruling. Correct the wording; change no behaviour.

*This section supersedes the slice definition above it. Gate 4 is back to
in progress for slice 7 only — slices 1–6 shipped and are untouched.*

---

## Slice 8 — the flag comes off, the duplicates go

### ⛔ MEASURED 2026-09-01, BEFORE ANY DELETION — two approved decisions conflict

`_probe8.mjs`, his export, 390×844, in combat, both URLs off the same build:

```
TODAY   /the-codex/        header 56 · main 56..471 (415px) · deck 471..779 · nav 779..844
                           READING WINDOW 415px   FURNITURE 429px
SLICE 7 /the-codex/?d=1    .dturn 0..844 — header 44 · body 44..611 (567px) · pinned 611..844
                           READING WINDOW 567px   FURNITURE 277px
```

**The first line is the promise this phase was sold on** (`01-product.md`:
furniture 429 → **121**, window 415 → **723**). The second is the screen slice 7
shipped. They do not compose, and the reason is not arithmetic:

1. **`?d=1` is not a preview of the combat tab. It is a different app.**
   `App.tsx:145` returns `TurnLive` *instead of* `<Layout>` — no app header, no
   tab bar, no other tabs. So "delete `D_PREVIEW` and the branch — one path, not
   two" is not a deletion. It is a **mount**, and the mount is where the cost is.
   Every furniture number this phase has taken since slice 4 was read off a
   screen that owns the whole viewport and pays for none of the app's chrome.
2. **The floor is already above the target.** `.pinned` is **233px** and the tab
   bar is **65px**. 233 + 65 = **298**, before a single pixel of header, against
   a promised 121. No composition of the pieces as built reaches the number.
3. **Gate 2 already ruled the other way, and slices 4 and 7 went past it.**
   `02-architecture.md` §"What changes in Gate 1, measured", item 1, approved:
   *"D's header merges into the app header … and **Undo / End turn move onto the
   card's rail, inside the scroll**. 121px stands."* Inside the scroll. Slice 4
   built the rail as permanent bottom chrome and slice 7 merged the footer into
   it and moved the economy dots in — 233px of it, outside the scroll. That is
   what makes V-6 structural rather than observed, and it is the direct cause of
   the miss.
4. **Slice 7's spine was struck for a reason that only holds in the preview.**
   The `IntersectionObserver` could never fire because `.dturn` is `100dvh` with
   its own inner scroller, so the round bar never leaves. **Inside `Layout`,
   `<main>` is the scroller and D's header would scroll out of view — the
   trigger fires.** The spine was not a bad idea; it was measured in the one
   geometry where it cannot work.

**This is the backtracking rule.** Gate 2's item 1 and Gates 4/slices 4+7 cannot
both stand. The choice between them is a product decision — *how much permanent
chrome is always-visible spend state worth?* — so it goes to Marcus, not to the
implementer. Slice 8 does not start until it is made.

*The miss is mine and worth naming: slice 7 reported furniture 310 → 277 as a
win and never checked it against the 121 the phase promised, because the screen
it measured has no Layout in it. **A measurement taken in the preview is a
measurement of the preview.** That is the same class of error as trusting a
document about the app — the model that cannot show the fault, one layer up.*

### Slice 8, re-steered — HIS RULING, 2026-09-01

**Trim the strip to the state of this turn; drop the app header on the combat
tab.** The four economy dots and End turn stay pinned. The slot pips and the
class pools go back inside the scroller — they answer *what do I still have*,
and the list answers that in place on every row that costs one, so pinning
twelve pips buys a duplicate at 104px of permanent frame. The Round counter
survives because D's own 44px header is the one that stays; the app's 56px
header goes on this tab, which also removes one of the three places item 10
says his hit points appear.

The slice splits in three, because one of the three is a deletion and deletions
go last and alone:

| | what | measured on |
|---|---|---|
| **8a** | the strip is narrowed; the rail moves into the scroller | `?d=1` |
| **8b** | the mount: `TurnLive` becomes the combat tab, `D_PREVIEW` deleted, the app header goes, `CombatHelper`'s survivors ride inside the card's scroller | the real tab |
| **8c** | the deletions: deck, duplicate modules, second provider, `--turn-deck-h` | the real tab |

**AMENDED 2026-09-01 — a fourth part, `8d`, and it goes BEFORE `8c`.** The
backtracking rule: 8b's `--after` run left **six** pins red, and adjudicating
each one on the glass found that three were not probe faults but real
capabilities the mount dropped. Marcus reviewed all three and put the ordering
question back to me. The answer is that **8d comes first**, for one reason:
`TurnDeck.tsx` and `CombatHelper` are what 8c deletes, and they hold the working
reference implementation of all three restorations. Deleting first means
rebuilding from memory of code removed an hour ago — the exact failure mode this
phase has already paid for three times.

| | what | flips | measured on |
|---|---|---|---|
| **8d-1** | the four economy slots are a manual tally again | `chip-action/bonus/reaction/move` | the real tab |
| **8d-2** | the auras become disclosures — name and one line always, the full text one tap away, closed by default | `aura-details-tap` | the real tab |
| **8d-3** | the tip/notes editor returns, in the detail sheet, on the store his existing notes are already in | `action-notes` | the real tab |

#### 8a — DONE 2026-09-01

`.pinned` = 1px rule + 8 + 48 (dots) + 8 + 48 (Undo · End turn) + 8 = **121px**
by construction, and **121px** measured. `?d=1` furniture **277 → 165**, window
**567 → 679**. Slot pips now read `at rest painted=12 · scrolled painted=0`,
which is the ruling working: they are in the scroll and they scroll.

Inside `Layout` that predicts 44 + 121 + 65 = **230px furniture, 614px window**,
against **429 / 415** today. 8b measures it rather than predicting it.

**Proves:** three new markup tests — the rail is inside `.body` and not in
`.pinned`; its seven slot pips came with it (counted on the accessible name, not
on `class="pip-tap"`, because a pool measured in *uses* draws pips too and the
class read 15 where the sheet has 7); and the pinned strip holds exactly two
buttons, Undo and End turn, plus the four labelled dots. **Two mutations, five
kills** — the rail put back in `.pinned` killed all three; a rail that relocates
without its pips killed the second and three older ones with it.

#### 8b — the mount, and the one thing it forces

`TurnScreenD` is `height: 100dvh` with `.body` as its only scroller. A page that
scrolls cannot be stacked underneath it — that is two scrollers in one tab and
neither can reach the other's content. So `CombatHelper`'s survivors (damage
log, advisor, rest, persona, errata, rules flags) **ride inside the card's
scroller**, below the list, handed in as one more opaque `ReactNode`. This is
forced by construction, not chosen: the alternative is the card not owning the
viewport, and then nothing is pinned and V-6 has no enforcement at all.

#### 8d-1 — the four slots are a manual tally again. DONE 2026-09-01

**What was lost, stated exactly — because the first write-up of it was wrong and
Marcus caught it.** The legacy deck's four chips were a *spend toggle*, not a
filter: `onToggleEconomy`, `aria-pressed`, the name `"Action: used"`. They are
how he says *I did something this app has no row for — my action is gone.* At a
real table half of what Nix does has no row (a shove, a grapple, an item the
sheet has never heard of), and a strip that cannot be corrected by hand drifts
away from the fight within two rounds and is then worse than absent.

What Marcus *remembered* as "press Action and see what I can do with it" is a
different capability wearing the same four words — **the four named bands**, and
those were never lost; `four-bands` has been green since 8b. Saying so was the
correction he was owed, and it is why this slice is small.

`EconSlot` renders a `<div>` given no handler and a `<button>` given one, which
keeps `TurnScreenD`'s standing law intact: no handlers, and it is exactly the
read-only screen the design shoot measures. The name is the legacy deck's **to
the byte** (`TurnDeck.tsx:346`) because the four `chip-*` pins were written
against that string in slice 1, before any of this existed — a pin re-pointed at
whatever the new code happens to say has stopped being a pin, so the app moved to
meet it. The write goes through `updateCombat`, **not** `combat.take`: `take` is
the reducer and the reducer can refuse, which is right for a row and wrong here,
since the whole reason this control exists is the things the app has no row for.

Two polarities meet in one function and they are opposites — `economy.action ===
true` means *still his*, `turnActions.action === true` means *spent* — so the
flip (`used = !open`) is written on one line rather than inlined four times.

**Proves:** five markup tests, four of which fail against the pre-change code
(the fifth is the guard that the inert form is untouched, and it must pass on
both sides). On the glass at 390×844 on his export: strip **390×48** and slots
**96.8×48** — unchanged, with `border 0px / padding 0px`, so no user-agent button
styling leaked in and the `.econ` 1px hairlines still read; pressing Action turns
the dot to the spent colour, writes `{"action":true,…}` to `codex-combat-<id>`,
and pressing it again un-spends it. No page errors. Prover **KEEP 29 → 33/35**,
the four `chip-*` pins green, nothing else moved.
**Revert:** delete the `onToggleEconomy=` line at the `TurnScreenD` call site in
`TurnLive.tsx`. The slots go back to inert `<div>`s, unchanged.

#### 8d-2 — the auras open onto their whole paragraph. DONE 2026-09-02

**His ruling, verbatim:** *"So long as the necessary details of the auras, so I
can always know what they do exactly, and are neat and don't take up room (this
is where drop downs or something are very very preferable)."*

**What was actually missing was not a control. It was a sentence.** `.upon`
already named both auras and summarised each — but the summary comes from
`featureSummary` (`options.ts:85`), which cuts at 77 characters and appends
`...`. Measured on his sheet: Aura of Protection ends *"…gain a bonus to saving
throw..."*, and canon knows three further facts about it that appeared **nowhere
on the combat tab** — the bonus has a **minimum of +1**, it is **inactive while
he is Incapacitated**, and **only one Aura of Protection applies at a time**.
Aura of Solace ends *"…Fire, Cold, ..."*, so **Psychic** — a resistance he
actually has — was cut off mid-list. He could not "always know what they do
exactly" because the app was not telling him.

Two halves. The composer gained `UponYou.detail?: string`, filled by
`fullTextOfPassive` — **canon first, his sheet second**, which is not a new rule
but the order `canonBands` already applies (`canon/bands.ts:198`), reused rather
than restated. It is left `undefined` when the full text would add nothing, so a
condition that says its whole effect in one line grows no control at all: a
disclosure that opens onto the sentence already showing is furniture pretending
to be a feature.

The screen renders a native `<details>` **rather than a button with state**, and
that is the law at the top of `TurnScreenD` deciding it, not taste. That screen
holds no state — `bandsOpen` is a *prop* precisely so the caller owns the
persisting — and a `useState` here would be the first crack in it, for a fold
nothing needs to remember. `<details>` is a disclosure the platform already
owns: no handler, works in the inert screen the design shoot measures, keyboard-
and screen-reader-reachable for free, and **closed it costs its `<summary>` and
nothing else** — which satisfies "don't take up room" by construction instead of
by tuning. The `<details>` *is* the pill (same `tag`/`tag good` classes); it is
not a box wrapped around one, so the visuals do not move.

**The pin was re-pointed and deliberately made harder.** The 8b version counted
`.upon button, [role="button"], a` — a question about *shape*, which any of
three implementations could answer and none would prove, and which could not
have gone green for a `<summary>` anyway. Re-pointing it at a fourth selector
would have been moving the goalposts to wherever the new code landed. It now
*clicks*, then demands text longer than the line already on screen that does not
end in `featureSummary`'s `...`. That is implementation-blind — a button, a
dialog or a disclosure all pass — and it is the only form of this pin that would
have caught the real fault.

**Proves:** eleven tests — five on the composer (`upon-detail.test.ts`), six on
the markup (`UponDisclosure.test.tsx`, which slices out the `.upon` section
first so a match elsewhere on the card cannot pass a claim about the strip).
Suite **67 files / 1435 passed / 7 skipped**, `tsc` exit 0, build ✓. On the
glass at 390×844 on his export, and this is the "don't take up room" number:
strip **390×108** closed, pills **358×44** each; opening one → strip **390×186**,
that pill **358×137**; closing it → **390×108** again, exactly reversible. The
pre-change pill, rebuilt in place as the `<span class="tag good">` it used to be
and measured under the same stylesheet, is **358×44** in a **108**-high strip —
**identical to the byte**. Zero pixels bought the three missing facts. Prover
`aura-details-tap` green with the evidence *"…it from only one Aura of
Protection at a time."*; **KEEP 33 → 34/35**, nothing else moved, no page errors.
**Revert:** two independent halves. Drop the `...(full && full !== text ? …)`
spread in `compose.ts` and `detail` is never set, so `TurnScreenD` renders the
`<span>` pill it always did — the disclosure branch is guarded on `u.detail`.

#### 8d-3 — the note he writes on an action comes back. DONE 2026-09-02

**His ruling, verbatim:** *"I'm not sure what editing strategic tip was or what
it would allow for or what feature it's inside of/effects, but it kind of seems
like a loss. Unless it would cause too much drift/mess/conflict to allow."*

**What it was, since he asked and was owed a straight answer.** A line *he*
writes about one action — his own words, kept with that action, still there next
session. Not canon, not generated: the thing the app cannot know. *"Kev rules
the d8s are rolled before the save."*

**And nothing was ever deleted. The reader was.** The editor lived in
`TurnSummary`'s expanded row; `TurnSummary` is mounted **nowhere** — grep it and
every hit outside its own file is a comment. So his notes have been sitting in
`localStorage` under `codex-action-notes-<id>`, intact, keyed to a component no
screen renders. That is the whole of the "loss" he sensed, and it is why this
slice is a re-mount rather than a feature.

His condition was *"unless it would cause too much drift/mess/conflict"*, and a
second store is exactly what drift would be. So the four declarations moved out
of `TurnSummary.tsx` into `lib/action-notes.ts` and **that file now imports what
it used to declare**. The key string exists in one place in the repo; both
surfaces call the same two functions. His existing notes appear in the new place
because it is reading the same bytes — not because anything migrated them.

**The key is the option's NAME, and that is inherited rather than chosen.** `id`
would be the better key in the abstract and would silently orphan every note he
has already written. A merely-adequate key that keeps his writing beats a better
one that loses it.

**One deliberate departure from V0.9, stated because it is a real difference.**
`customTip` used to *override* an auto-generated one-line `strategicTip` —
one line replacing one line, which is fair. This sheet has no such line; band ④
is canon's whole tactics text, thousands of characters. Inheriting the override
would mean his one sentence hiding all of it, so his words are painted **beside**
canon's as a fifth band, never instead. The stored field is still `customTip`,
so this is a decision about painting, reversible in one component.

**The pin was re-pointed — the route changed, the claim did not.** The old step
reached the control through a Tailwind class on a `TurnSummary` row, which was
already the fragile way and is now an impossible one. It walks the route he
walks: open a real option, press the control. And it demands more than before —
the old query stopped at *finding* a button named `Edit strategic tip`, which a
dead button would have satisfied; this one presses it and requires a real
`textarea` and a Save behind it. The name is unchanged, byte-for-byte V0.9,
because the name is the capability rather than the route to it.

**Proves:** sixteen tests — ten on the store (`action-notes.test.ts`, whose
central case plants a hand-written V0.9 blob and reads it, because a round trip
through my own writer would pass just as happily against an invented format),
six on the markup (`OptionNote.test.tsx`; five failed against the pre-change
code, the sixth is the guard that the inert render is untouched and must pass on
both sides). Suite **69 files / 1451 passed / 7 skipped**, `tsc` exit 0,
build ✓. Prover **KEEP 34 → 35/35 — every KEEP pin in the phase is now green**,
evidence *"editor: Your strategic tip for this action"*, no page errors. On the
glass at 390×844, the round trip no markup test can make and no pin can either,
because pins click but cannot type: a note planted in V0.9's format **before the
app boots** paints as *"Your note · Kev rules the d8s are rolled before the
save."*; typing a new one writes `{"Divine Smite":{"customTip":"Only after a
crit.","notes":[{"label":"Table","text":"keep me"}]}}` — his labelled notes, the
part this band does not render, survived the write; closing and reopening brings
it back; and a different option (`The Dawn Guardian`) shows its own empty band
rather than his Divine Smite note.
**Revert:** delete the `note=` and `onSaveNote=` lines at the `OptionDetailSheet`
call site in `OptionDetailSheetLive.tsx`. `NoteBand` returns `null` with neither,
so the sheet is byte-identical to the one that shipped before this slice, and
nothing he has written is touched.

---

The original slice 8 text, kept because 8c is still exactly this:

The only slice that removes anything, and it removes everything at once because
by now every capability it removes has a pin proving it lives somewhere else.

- Delete `D_PREVIEW` (`App.tsx:48`) and the branch at `:145`. **One path, not two.**
- Reduce `CombatHelper`: the two "Your turn" boxes, the reactions box, the
  "everything else" strip and the Hit Points module go. The damage log, advisor,
  rest, persona, errata and rules flags stay where they are.
- Remove its `CombatProvider` mount so exactly **one** survives.
- Delete `TurnDeck.tsx`, `SpellSlotPips.tsx`, `SpellSlotSigils.tsx`.
- Drop `Layout`'s `--turn-deck-h` terms from `<main>`.

**Proves:** all **34 KEEP pins still green** — the same pins, byte-identical,
that were green on the old build in slice 1 — and all **6 ARRIVE pins now
green**, run as `--after`; providers counted **4 → 1 → 1** (test 18); no
page errors; and the success metric measured with `measure-today.mjs`:
**2,214px / 5.3 windows → 0.**
**Revert:** this is the one slice whose revert is not a line. It is committed
alone, immediately before it, so the revert is that commit — and I will hand
Marcus the exact command rather than run it, because `git checkout` is blocked
here and he deploys.

---

## Slice 9 — the errata line, and the final read

### ⛔ RE-STEERED AND RE-MEASURED 2026-09-02, BEFORE A LINE WAS WRITTEN

Three things in the paragraph below were written in August and are not true of
the build that exists today. All three are recorded rather than quietly fixed,
because two of them are *his* decisions and the third is a pin that has been
measuring the wrong quantity since slice 1.

**① His ruling, unprompted, at the top of this slice:**

> "so long as you know that I don't need 'absolutely no scrolling'. I'm find with
> having to scroll, it makes it feel like there's a good amount of value and
> feature in the app. **We simply were aiming to consolidate the dublicated types
> of features and box** just like we discussed."

Gate 1's headline read *5.3 screens → **0***. It now reads **→ at most 2**, and
the 2 comes from Gate 1's own approved sentence about the all-reactions case
sitting *"one flick below"*. See `01-product.md` §Success metric for the full
amendment and for the part that did **not** move: the three duplication counters,
which are what he actually named, and which win if they and the span disagree.

**② The `one-screen` ARRIVE pin has never measured the success metric.** It
reads `scrollHeight / clientHeight` — the length of the **whole tab** — and the
metric is *"the four things one turn needs, from the top of the first to the
bottom of the last."* Those are different questions, and the difference is
exactly his ruling: a tab that is long because it carries a damage log, a rest
tracker and a persona editor fails the pin while passing the metric. It is
**re-pointed in this slice**, and the re-point is a correction and not a
convenience — the threshold was derived from an approved sentence *before* the
after-number was taken, and the before-number moves not at all under the new
rule.

**③ The 349px is no longer on screen one.** Slice 8b moved the whole extras
block below the card, so *"it costs most of screen one, every time, forever"* is
now false — measured, the notice sits at page-y **2,830** inside a **341px**
card at 2,749. What is still true, and is the half worth building, is the other
half of the Gate 1 sentence: **the pips it is about are 2,430px away.**

### What it does

The flags block comes **out of `VitalsBand`** — it does not get copied — into
`SheetRuleFlags`, mounted directly under the slot pips in the rail. One tappable
line, **closed by default**, opening onto the same report and the same one-tap
**Use the 2024 slots**. `VitalsBand` keeps its five numbers and stops carrying a
flag about slots it does not paint.

**Closed by default reverses a decision `VitalsBand` argues for out loud** — *"a
dismissed warning that stays dismissed is a warning that gets dismissed once and
never seen again"* — and the reversal is earned, not assumed. That reasoning was
written when the flag had **no answer button** (one was added 2026-08-28) and sat
2,430px from the pips it described. Both premises are gone: it will be answerable
in one tap and physically touching the nine dots it is complaining about. It is a
label on the thing, not a warning shouted across the tab.

Then the whole measurement, once, on the shipped build.

**Proves:** the five counters — boxes about his turn 3+bar → **1**; places
showing hit points 3 → **2** *(the second is the app header, his ruling of
2026-09-01)*; furniture 429 → **286**; window 415 → **558**; controls existing
twice 4 kinds → **0**. Plus the metric itself, mechanised for the first time:
**the span of one turn 2,082px / 5.02 screens → measured after.**

> ⚠ **The numbers this line used to carry — furniture 429 → 121/161, window
> 415 → 723/683 — were struck 2026-09-02 and replaced above.** They were read
> off `?d=1`, which returned the turn screen *instead of* the app shell and so
> paid for neither the 56px app header nor the 65px tab bar, and the sticky
> spine the 161/683 pair assumed was struck by measurement in slice 7. The
> replacements are 8b's, taken inside `Layout` on the tab he actually opens.
> `00-status.md` required this rewrite before the slice was built; this is it.

**Revert:** two lines. Delete the `<SheetRuleFlags>` element from `TurnLive`'s
`rail` prop and put `VitalsBand`'s flags block back — the component is a move,
not a rewrite, so the block is byte-identical apart from its props.

### ✅ BUILT AND MEASURED 2026-09-02

**The distance the slice existed to close.** Same instrument, same seeded sheet,
390×844, in combat:

| | before | after |
|---|---|---|
| the notice ↔ the nine slot pips | **2,430px apart** | **112px apart** |
| the card the notice sits in | 341px, at page-y 2,749 | **56px**, at page-y 512 |
| open on load | yes | **no** (`aria-expanded="false"`) |
| the whole combat tab | 3,498px | **3,286px** |

The pips are at 400 and the line is at 512 — it is the next thing under them,
which is the whole claim.

**The success metric, mechanised, both builds under one function:**

**2,082px / 5.02 screens → 490px / 0.88 screens.** From `Apply damage` at 151 to
the `Action` band heading at 641; six kinds of thing found; window 558.

Two honest notes on that number, because both cut against the build:

- **It is 56px WORSE than the same measurement taken before this slice built
  anything** (434px / 0.78). The flag now sits above the list, so the bands begin
  56px lower. The slice traded 56px of span for 2,318px of proximity — a trade
  worth naming rather than a number worth rounding.
- **The before-number is 2,082, not the 2,214 in `01-product.md`'s headline.**
  The headline was hand-derived off `measure-today.mjs`'s stack and took the top
  of a *section* and the bottom of a *module*; this takes the first and last
  controls. Both say five screens. Only one of them can be re-run, and it is the
  smaller — so the before is flattered, not the after.

**The five counters, re-read on the shipped build** — unchanged by this slice,
which is why they were re-read: boxes about his turn **1** (`one-your-turn`),
places showing hit points **2**, one in the surface and one in the app header per
his ruling of 2026-09-01 (`hp-painted-once`), furniture **286px**, window
**558px**, controls existing twice **0**.

**Green:** `tsc --noEmit` clean · **1,460 vitest tests, 0 failing** · `npm run
build` clean · `prove-capabilities.mjs --after` **42/42 — 35 KEEP, 1 RETIRE, 6
ARRIVE, 0 page errors.**

**The pin was re-pointed and renamed**: `one-screen` → **`one-turn-span`**, with
`$turnSpan()` lifted out of the throwaway diag into the prover's own helpers so
the metric outlives the diag. It carries a `kinds < 4` guard: if the anchors ever
stop matching, the span collapses to a very green 0, and an instrument that finds
nothing must report red rather than a pass.

**Three of this slice's tests were wrong before the component was.**
`SheetRuleFlags.test.tsx`'s first run failed four ways and every failure was the
test's fault: the fixture trips **three** rule checks at level 7, not one — its
stored save DC and spell attack are a level *eight* paladin's;
`not.toContain('2024 rules')` failed against a correct component because the
section's `aria-label` *is* "Your sheet and the 2024 rules", so the assertion was
satisfiable by a component that rendered the landmark and dropped the report; and
the source scan requiring `VitalsBand` no longer to say `2024 rules disagree`
failed on the header comment explaining that it no longer says it. That last is
repaired by stripping comments before scanning, **not** by rewording the comment:
a source scan a comment can break is a source scan that gets "fixed" by deleting
the paragraph telling the next reader where the flag went.

---

## What this plan does not do

- ~~**The two duplicated `CONDITIONS` tables stay duplicated.**~~ **Withdrawn by
  slice 1.** `ConditionsGrid.tsx` has never been rendered. There is one shipped
  table and one dead file, so it is a deletion in slice 8, not a canon bug and
  not a decision.
- **`CombatHelper` survives at reduced size.** Gate 3 decision 3 names the risk
  out loud: a ~1540-line file with its combat parts hollowed out is exactly the
  kind of thing that quietly grows back.
- **The two temp-HP badges are not re-measured until temp HP is set.** None
  painted at 0 temp, so the duplicate is not visible on this run and cannot
  honestly be called fixed or broken yet.
- **Items 1, 2, 3 and 9 are other phases.** Toybox AI, the grimoire's full spell
  and feature list, the definition layout, and the damage log. This phase is
  items 5, 6, 7, 8, 10 and 11.
