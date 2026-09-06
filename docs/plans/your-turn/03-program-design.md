# Program Design: the one "Your Turn"

> ## Amended by slice 1 — **RE-APPROVED 2026-08-31**
>
> Slice 1 turned Gate 2's do-not-lose table into **41 pins** and ran them on the
> glass. They came back 34 KEEP green · 1 RETIRE green · 6 ARRIVE red · no page
> errors — and they corrected this document in one place that matters:
>
> **`src/components/combat/ConditionsGrid.tsx` has ZERO consumers.** Nothing has
> ever rendered it. The conditions grid that actually ships is `HPTracker`'s
> own, at `HPTracker.tsx:669-760` — collapsed by default, headed *"Active
> Conditions"*, its buttons carrying no aria-label because their accessible name
> is the condition's own word. This is the `SpellSlotPips` mistake a second time
> and it was caught the same way: by looking for the thing on the screen instead
> of in the barrel.
>
> Three consequences, all of which make this design **smaller**:
>
> 1. **`conditionsControl` comes off `TurnScreenDProps`.** The conditions
>    dropdown is *inside* `HPTracker`, so `vitalsControls` already carries it.
>    A separate slot would have been a slot for a component nothing renders.
> 2. **`ConditionsGrid.tsx` joins the deleted list** with `SpellSlotPips` and
>    `SpellSlotSigils` — same evidence, same grep, same reason.
> 3. **Least-confident decision 5 dissolves.** There are not two shipped copies
>    of the 2024 condition list. There is one shipped copy and one dead one, and
>    deleting the dead one is the whole fix. It is no longer a canon bug, no
>    longer out of scope, and no longer a decision for Marcus to make.
>
> Two further corrections landed in `02-architecture.md`'s table rather than
> here: **Bloodied** is on `?d=1` only and arrives, and **Start Combat** already
> exists as a button today — it is the `startEncounter` *verb* that nothing
> calls.

> ## Amended by slice 2 — **RE-APPROVED 2026-08-31**
>
> Three changes. The first is a decision this document got wrong; the other two
> are shapes that were built and are recorded so this document still describes
> what exists.
>
> 1. **A `'free'`-cost option gets its own fifth band, not the band of the turn
>    it is part of.** This document said "placed in the band of the turn it is
>    part of". Measured on the composer instead of assumed: `everything` is built
>    from three buckets at three fixed prices — actions at `'action'`, bonus
>    actions at `'bonusAction'`, reactions and opportunity attacks at
>    `'reaction'` (`compose.ts:655-661`). `'free'` is what **passive** features
>    demand, and passives never become options at all — they become `upon`
>    entries, which is the "always active" strip Marcus asked to keep. So nothing
>    in `ranked`/`rest` costs `'free'` today, and filing one under ACTION if it
>    ever arrived would be a lie about the economy in the one place the screen
>    exists to state the economy. **`BandSlot` gains `'free'` (label "No cost");
>    `BAND_ORDER` stays at four; the fifth band is appended only when it has
>    something in it.** On his sheet it does not render at all — proved both ways
>    (`bands.test.ts` 2 and 2b).
>
>    The same reading settled MOVEMENT: nothing is priced there either, so the
>    MOVEMENT band is **honestly empty** and says so in words rather than sitting
>    blank. It is still rendered — it is the only place the screen states whether
>    his movement is still his.
>
> 2. **`src/components/turn/TurnRow.tsx` is new and is not in the Files table
>    below.** `ActBody` and `Act` were lifted verbatim out of `TurnScreenD.tsx`
>    so the bands and the flat fallback render provably identical markup with no
>    import cycle between them. No behaviour change; it is why "no option is lost
>    between the flat list and the bands" is testable at all.
>
> 3. **The wiring is two props, not one.** `TurnScreenD` gains
>    `bandsOpen?: Record<string, boolean>` and `onToggleBand?: (slot: BandSlot) => void`.
>    `bandsOpen` is the switch: absent, the old flat list renders, which is the
>    declared revert for this slice.

> Every type and signature below was read off the files it names, not recalled.
> Where a shape turned out not to exist, it is written here as *absent* rather
> than invented — `ComposedTurn` has no `inCombat`, `turnActions.movement` is a
> boolean, and `character.paladinResources` is missing from his export. All
> three change the design, and all three are honoured below.

## The governing constraint

`TurnScreenD.tsx` opens with a law its author wrote in capitals:

> *There is **NO** rules logic in this file and there must never be any … If you
> find yourself wanting an `if` here about what the player can do, it belongs in
> `compose.ts`. That separation is the reason the 15-second metric can be
> measured at all.*

The whole of Gate 3 is arranged so that adding a damage field, a conditions
dropdown, a dice button and an end-combat control **does not break that law.**
The mechanism is the one the file already uses — *"Slice 6 made it interactive
WITHOUT making it stateful. Every handler is an optional prop"* — extended from
handlers to **slots**. The controls are composed by `TurnLive`, the 47-line join,
and handed to the screen as opaque nodes. `TurnScreenD` never learns what a
condition is, and stays shootable in isolation with no provider.

## Files

### Changed

| file | why it changes |
|---|---|
| `src/App.tsx` | delete `D_PREVIEW` (`:48`) and the branch at `:145`. The flag is the only thing keeping the new screen off his phone. |
| `src/components/turn/TurnScreenD.tsx` | the four bands replace the flat list; six slot props added; its own `<header class="chrome">` is deleted (Layout's 56px header already carries name/class/subclass); the footer's two buttons move onto the rail. |
| `src/components/turn/TurnLive.tsx` | grows from *the join* to *the composition root*: mounts every control, owns band-collapse, wires the eight `CombatApi` members D never called. |
| `src/components/CombatHelper.tsx` | ~1540 lines. **Not deleted in this phase** — reduced to the non-turn surfaces that keep their own place below the card (damage log, combat advisor, rest, persona, errata, rules flags). Its `CombatProvider` mount is removed so exactly one survives. |
| `src/components/Layout.tsx` | `<main>`'s `bottom-[…var(--turn-deck-h…)]` terms drop out with the deck; the dice-dock branch stays, because the rail becomes the adopting surface. |
| `src/components/combat/index.ts` | drop the `SpellSlotPips` export (zero consumers). |

### Created

| file | why it lives there |
|---|---|
| `src/components/turn/TurnBands.tsx` | the four bands. Presentational, beside the screen that owns them. |
| `src/components/turn/TurnSpine.tsx` | the V-6 sticky spine. Its own file because it is the one piece of this design that exists to satisfy a *rule* rather than a request, and it must be findable by that name. |
| `src/components/turn/TurnRail.tsx` | dice · look-up · slot pips · reset · start/end combat. |
| `src/components/turn/VitalsControls.tsx` | the adapter that puts `HPTracker` into the card's vitals strip. *(Built slice 3. `ConditionsGrid` is not in it — slice 1 proved it has never been rendered; the fold that ships is `HPTracker`'s own and comes with it. `HPTracker` gained a `variant?: 'card' \| 'bare'` prop, `'card'` being its unchanged self.)* |
| `src/lib/turn/bands.ts` | `groupBySlot` — pure, unit-testable without a DOM, and the only place the grouping rule lives. |
| `src/components/turn/bands.test.ts` · `TurnBands.test.tsx` · `TurnSpine.test.tsx` | per the test plan below. |
| `docs/plans/your-turn/prove-*.mjs` | one browser prover per slice, per this project's standing practice. |

### Deleted

| file | evidence it is safe |
|---|---|
| `src/components/TurnDeck.tsx` (+ its tests, rewritten against the rail) | Gate 1: 17 controls, **3 unique on his sheet**. Every one is in the do-not-lose table with a destination. |
| `src/components/combat/SpellSlotPips.tsx` | grep: exported from the barrel, **zero consumers**. |
| `src/components/combat/SpellSlotSigils.tsx` | grep: not exported, **zero consumers**. |
| `src/components/combat/ConditionsGrid.tsx` | slice 1: exported from the barrel, **zero consumers**, never rendered. The grid that ships is `HPTracker.tsx:669-760`. |
| `src/components/combat/VitalsRow.tsx` | slice 3: **zero consumers, and not even exported** from `combat/index.ts` — one step deader than the three above. It still takes a `speed` prop, from before Gate 1 withdrew movement. Not to be confused with `VitalsBand.tsx`, which **is** rendered (`CombatHelper.tsx:1291`) and is the errata notice slice 9 moves. |

**Nothing is deleted in the same slice that moves its capability.** The pin-first
order is table-truth slice 9's, which took reachable options 6-of-14 → 14-of-14
while retiring three menus.

## Types & signatures

### The grouping rule — the only new logic, and it is pure

```ts
// src/lib/turn/bands.ts
import type { TurnOption, ComposedTurn } from './types'

/** The four bands, in the order they are spent at a table. */
export type BandSlot = 'action' | 'bonusAction' | 'reaction' | 'movement'
export const BAND_ORDER: readonly BandSlot[]

export interface Band {
  slot: BandSlot
  /** 'ACTION' · 'BONUS' · 'REACTION' · 'MOVEMENT' — his words, item 5. */
  label: string
  /** Is this economy slot still his to spend? Read from `turn.economy`. */
  open: boolean
  /** Everything of that kind, available first, then blocked-with-a-reason. */
  options: TurnOption[]
  /** How many he could actually take right now. The band's "5 ready". */
  readyCount: number
}

/** `ranked` + `rest`, split on `option.cost.slot`, order preserved within each.
 *
 *  `cost.slot` may also be 'free'; a free option is placed in the band of the
 *  turn it is part of, never dropped — see the test plan, which asserts total
 *  count in equals total count out. */
export function groupBySlot(turn: ComposedTurn): Band[]
```

`OptionCost.slot` and `TurnOption.available` / `blockedReason` already exist and
carry exactly what Gate 1 asked for. **No engine change, no new field, no
migration.**

### The screen

```ts
// src/components/turn/TurnScreenD.tsx
export interface TurnScreenDProps {
  turn: ComposedTurn
  /* ── existing, unchanged ─────────────────────────────────────────── */
  onEndTurn?: () => void
  onBeginTurn?: () => void
  onUndo?: () => void
  undoLabel?: string | null
  refusal?: string | null
  onDismissRefusal?: () => void

  /* ── CHANGED: a row no longer spends ─────────────────────────────── */
  /** Opens the detail sheet. REPLACES `onTake`.
   *
   *  D's rows call `take` on tap today, so one thumb-brush spends a spell slot
   *  with no confirmation and no way to see what it does first. Gate 1 requires
   *  "every row opening to full details", the Play tab has worked this way since
   *  table-truth slice 7, and `OptionDetailBody` already owns the Spend button,
   *  the refusal line and HEARTH-04's replacement warning. Nothing is lost:
   *  spending moves one tap further away, onto a control that says what it will
   *  destroy first. */
  onOpen?: (option: TurnOption) => void

  /* ── NEW: bands ──────────────────────────────────────────────────── */
  bandsOpen?: Record<BandSlot, boolean>
  onToggleBand?: (slot: BandSlot) => void

  /* ── NEW: the encounter ──────────────────────────────────────────── */
  /** NOT on `ComposedTurn` — checked; it has `round` and `yourTurn` and no
   *  `inCombat`. Passed from `CombatApi.inCombat` rather than inferred from
   *  `round === 0`, because inferring it is how the screen currently paints
   *  "Round 0" and offers to begin a turn in a fight that is not happening. */
  inCombat?: boolean
  onStartCombat?: () => void
  onEndCombat?: () => void

  /* ── NEW: slots. Opaque nodes, composed by TurnLive ──────────────── */
  /** Damage · heal · temp HP · the temp-HP source question · death saves ·
   *  **and the conditions dropdown**, which lives inside `HPTracker` and so
   *  arrives with it. `conditionsControl` was a second slot here until slice 1
   *  proved `ConditionsGrid` has never been rendered. */
  vitalsControls?: ReactNode
  /** Dice · look up · slot pips · reset · start/end combat.
   *
   *  **It REPLACES colC's read-only `.res` strip; it never sits beside it.**
   *  Slice 4 found that `.res` already paints the same slots and the same
   *  pools, read-only — so a rail added alongside would put his 1st-level slots
   *  on screen twice, which is item 4's own fault rebuilt by the slice meant to
   *  consolidate. The card renders `{!rail && <colC/>}` and then `{rail}`. That
   *  `!rail` is what makes it impossible rather than merely intended. */
  rail?: ReactNode
  /** Rendered under one option row. Used for the retaliation capture, matched
   *  by SHAPE inside TurnLive — never by name here. */
  rowExtra?: (option: TurnOption) => ReactNode
  /** ADDED AS BUILT, slice 6. Rendered at the END of one BAND, after its rows
   *  and inside its collapse. `rowExtra` cannot do this job: a row describes an
   *  option that EXISTS, and slice 6's subject is an option he owns that the
   *  app was never told about, so it produces no option and no row. Opaque, like
   *  `rowExtra` — neither this file nor `TurnBands` learns what it holds. */
  bandNote?: (slot: BandSlot) => ReactNode
}
```

Every one is optional. Given none, this is still the read-only screen the design
shoot measures — which is what keeps `TurnScreenD.test` mountable with no
provider and no storage.

### The bands, the spine, the rail

```ts
// src/components/turn/TurnBands.tsx
export function TurnBands(props: {
  bands: Band[]
  open: Record<BandSlot, boolean>
  onToggle: (slot: BandSlot) => void
  onOpen?: (option: TurnOption) => void
  rowExtra?: (option: TurnOption) => ReactNode
  bandNote?: (slot: BandSlot) => ReactNode   // as built, slice 6
}): JSX.Element

// src/lib/prepare/fighting-style.ts — ADDED AS BUILT, slice 6
/** Three gates: does his class GRANT the choice (the catalogue holds the
 *  *Fighting Style* row), has he REACHED it (that row's `lockedUntil`, read
 *  rather than recomputed), has he ANSWERED it (`currentFightingStyle`).
 *
 *  A rules question about the sheet, so it lives beside every other Fighting
 *  Style rule rather than inline in the component that renders the prompt —
 *  which is also what makes it testable with no DOM. */
export function shouldAskFightingStyle(character: Character): boolean

// src/components/turn/FightingStyleGap.tsx — ADDED AS BUILT, slice 6
/** The note, plus a Sheet holding the EXISTING `FightingStylePicker`. It never
 *  writes: `onPick` is the sheet's one writer, handed down from `TurnLive`. */
export function FightingStyleGap(props: {
  character: Character
  onPick: (style: CanonFeat) => void
}): JSX.Element

// src/components/turn/TurnSpine.tsx
/** V-6 kept at 40px instead of 308.
 *
 *  Appears only when `watch` has scrolled out of view — an IntersectionObserver
 *  on the card's round bar, NOT a scrollTop threshold, because a threshold is a
 *  number that would need re-tuning every time the vitals strip changes height. */
export function TurnSpine(props: {
  watch: RefObject<Element>
  economy: EconomyState
  spellSlots: SpellSlotLine[]
  round: number
  yourTurn: boolean
  onEndTurn?: () => void
}): JSX.Element | null

// src/components/turn/TurnRail.tsx
export function TurnRail(props: {
  spellSlots: SpellSlotLine[]
  resources: TurnResource[]        // Lay on Hands · Channel Divinity, when present
  onExpendSlot?: (level: number) => void
  onRestoreSlot?: (level: number) => void
  onSpendResource?: (poolId: string, amount: number) => void
  onLookup?: () => void
  onReset?: () => void
  inCombat: boolean
  onStartCombat?: () => void
  onEndCombat?: () => void
}): JSX.Element
```

`TurnRail` calls `useDiceDock()` (`src/components/DiceControl.tsx:124`) — the
seam slice 10f-a built for exactly this. It returns `open` and declares the
surface as the adopter, so `Layout` stops painting the floating button and
`<main>` keeps its pixels. The turn deck is the adopter today; the rail replaces
it in that role, which is why the dice-dock branch in `Layout.tsx` stays.

### The vitals controls — an adapter, not a rewrite

```ts
// src/components/turn/VitalsControls.tsx
/** `HPTracker` and `ConditionsGrid` are shipped, tested and correct. This wraps
 *  rather than reimplements: HEARTH-04's temp-HP replacement warning, the
 *  temp-HP source question (phase 4) and the death saves all live inside
 *  HPTracker, and a second HP control would be a second writer to his sheet. */
export function VitalsControls(props: {
  character: Character
  onCharacterUpdate: (c: Character) => void
  onRetaliate?: (amount: number, source: string) => boolean
  refusal?: string | null
}): JSX.Element
```

Verified prop-for-prop against `HPTracker.tsx:40-54`.

**The duplicate `CONDITIONS` table, resolved by slice 1 rather than deferred.**
Reading the code found two hand-typed copies of the 2024 condition list —
`HPTracker.tsx:62-79` and `combat/ConditionsGrid.tsx:19-41`, with different
fields — and this section originally called it a canon bug and put it out of
scope. Measuring found the real shape: **only one of them has ever been on
screen.** `ConditionsGrid` has no consumers. So there is no rules change to make
and no duplication to reconcile; there is one dead file to delete, which is what
the Deleted table above now says. The out-of-scope note is withdrawn.

## Call stack

**Mounting the tab**

```
App.tsx                       (D_PREVIEW deleted; one path, not two)
 └─ Layout                    header 56px · <main> · tab bar 65px
     └─ CombatTab
         └─ TurnLive  key={character.id}
             └─ CombatProvider                    ← the ONE mount in the app
                 └─ Screen()  = useCombat()
                     ├─ groupBySlot(combat.turn)          → Band[]
                     ├─ useCollapsible('band:action', …)  → codex-ui-<id>
                     └─ <TurnScreenD
                          turn onOpen={setOpenOption} bandsOpen onToggleBand
                          inCombat={combat.inCombat}
                          onStartCombat={combat.startEncounter}
                          onEndCombat={combat.endEncounter}
                          vitalsControls={<VitalsControls …/>}
                          conditionsControl={<ConditionsGrid …/>}
                          rail={<TurnRail …/>}
                          rowExtra={retaliationFor} />
                     └─ <OptionDetailSheet … />           ← mounted by TurnLive
```

`startEncounter` and `endEncounter` have existed on `CombatApi` since
table-truth and **nothing has ever called them** (finding BH). This is the call.

**One tap on a row**

```
row tap  → onOpen(option)          — no longer spends
         → optionDetail(option, character, turn.economy)   src/lib/turn/detail.ts:191
         → <OptionDetailSheet>  bands: facts · what it does · rolls + Spend · tactics
Spend    → CombatApi.take(option) : boolean                CombatProvider.tsx:101
         → reduce()  rules-checked → true, or sets `refusal`
         → persists codex-combat-<id> BEFORE it renders
         → compose() re-runs → bands, spine and rail all re-paint from ONE model
```

**Recording a retaliation die** — unchanged from slice 10f, new home:

```
damage entered in VitalsControls (HPTracker)
  → activeRetaliation read BEFORE applyDamage        (temp HP is spent first)
  → RetaliationConfirm: app rolls, he can overtype
  → CombatApi.retaliate(amount, source) : boolean
  → false → the strip stays open with his number still in it
```

`rowExtra` matches the standing control to its row **by shape** — the option
whose `cost.resourcePoolId` carries a canon-marked free rider — never by the
string "Hearthfire". That is `isFreeRider`'s rule from slice 10e, and it is why
Opportunity Attack's `1d8+4` correctly gets no button.

**AMENDED AS BUILT, 2026-08-31 — shape AND slot.** Shape alone is not a match,
it is a *superset*. Measured on his export, `isFreeRider` returned **three**
rows, because "Hearthfire Manifest" is painted on the Action, Bonus-action and
Reaction rows and all three resolve to one canon feature. Raising the cloak
deals no fire damage at all, so a capture on those rows is wrong on the merits
before it is ever a duplicate — the thing the die belongs to is the reaction
that burns someone. The predicate is therefore:

```ts
option.cost.slot === 'reaction' && retaliationOf(featureByName(option.name), ctx) !== null
```

`reactions.ts:192` filters on that same slot before asking the same question, so
the two surfaces agree by construction rather than by coincidence. No string
"Hearthfire" is introduced; the open-world rule is untouched. Test 9 below is
written in **both halves** for this reason — "renders under the matching row"
would have passed on a screen that painted it three times.

## Test plan

Unit — `src/lib/turn/bands.test.ts` (no DOM):

1. `groupBySlot` puts every option in exactly one band — **count in equals count out** across `ranked` + `rest`.
2. A `'free'`-cost option is placed, not dropped.
3. Order within a band is `ranked` order, with available before blocked.
4. `readyCount` counts only `available`, and **is 0, not absent, for an empty band** — a negative marker cannot be checked by looking for it.
5. `open` mirrors `turn.economy`, all four, both values — asserted both ways.

Component — `renderToStaticMarkup` (no jsdom in this repo):

6. `TurnBands` renders four band headers with his four labels, always, even when a band is empty.
7. A blocked row paints its `blockedReason` and is `disabled`.
8. `TurnScreenD` with **no props** renders no Spend, no damage field, no dice — the read-only screen is intact.
9. `rowExtra` renders under the matching row and under **no other row**.
10. `TurnSpine` returns `null` while `watch` is in view.
11. `inCombat={false}` renders "Not in combat" and a Start combat control, and **does not** render "Round 0" or "My turn begins".

Capability pins, written **before** anything is deleted (the slice-9 order):

12. For each row in Gate 2's do-not-lose table, a test that the capability is reachable — run green against the *old* build, then kept green against the new. **Written: 41 pins** (`prove-capabilities.mjs`), not the 26 this line first claimed. The table has 23 rows and several of them bundle three capabilities into one phrase — *"damage · heal · temp HP"* is three controls, *"retaliation capture + tally + undo"* is three states. A pin per phrase would have let two of the three go missing and still read green.
13. `paladinResources` present → Lay on Hands and Channel Divinity controls paint. **Absent → they do not, and nothing throws.** Both halves, because his own sheet is the second case. **Written slice 4, and it needed a THIRD case this line did not have:** `poolsOf` resolves a pool from three homes, and `paladinResources` is only the first. NIX carries both pools as **features** with `usesMax`/`usesCurrent` — the smuggling route — so a sheet with no `paladinResources` at all can still have both. Two cases would have hidden that; the negative half is *neither route*, not *no block*.

Browser provers, at 390×844 on his real export:

14. `measure-today.mjs` re-run against the **pre-change** build first, so the after-number has a before-number taken by the same instrument.
15. The metric: the four things one turn needs, in pixels, top of the first to bottom of the last — **2,214px / 5.3 windows → 0**.
16. Furniture **121px at rest**; spine visible after scroll → **161px**; window 723 → 683. Measured as flex-siblings-of-the-scroller, not `position: fixed` — the mistake `_probe-d.mjs` made.
17. `codex-combat-<id>` and `codex-character-<id>` byte-identical across a real reload, and `setItem` recorded across a cold load = **0 writes**.
18. Exactly **one** `CombatProvider`, proved by the list reading `4 → 1 → 1` (finding BB's own measurement).
19. Every prover run against the stashed pre-change build first and shown **red on exactly the claims it should be red on** — a proof that passes on its first run is not evidence until it has been shown able to fail.

## Least confident decisions

1. **A row opens the sheet instead of spending.** I am confident this is right — it matches the Play tab, it is Gate 1's own wording, and `OptionDetailBody` already carries the Spend, the refusal and the HEARTH-04 warning. But it makes his most common action **two taps, not one**, at a table, and he asked for speed. The mitigation is that the sheet is where the dice and the "roll it" already live. **If you would rather one-tap spend the obvious rows, say so now** — it is a prop either way, and it is free to change here and expensive to change in slice 5.
2. **The spine watches the round bar with an IntersectionObserver.** A scroll threshold would be simpler and would need re-tuning every time the vitals strip changes height. I think the observer is right; it is also the only new browser API in the phase.
3. **`CombatHelper` is reduced, not deleted, this phase.** It still owns the damage log, the advisor, rest, persona and the errata band, all of which live below the card and are not this phase's subject. Deleting it would drag four unrelated surfaces into a consolidation phase. The risk is that a ~1540-line file survives with its combat parts hollowed out, which is exactly the kind of thing that quietly grows back.
4. **The MOVEMENT band shows spent / not-spent and no distance.** The model has no speed. I would rather the band say less than say 30ft it cannot check — but it does mean the fourth band is the thinnest of the four, and it may look under-built next to the other three.
5. ~~**The two condition tables are left duplicated.**~~ **Dissolved by slice 1.** There are not two shipped tables — there is one shipped and one that has never been rendered. It is a deletion, not a rules change, and it needs no ruling.
6. **The rail carries eight things on one row at 390px.** Dice, look-up, slot pips, reset, and start/end combat. Gate 1's mockup fitted it; the mockup did not have Lay on Hands or Channel Divinity in it, because his sheet does not have them. **On a sheet that does, the rail has to hold more than any screen has yet been measured holding** — and I cannot measure that against his export. It needs a synthetic sheet with `paladinResources` set, which slice 1 will build.

   **ANSWERED IN PIXELS, slice 4 — and the answer is no.** Eight things do not
   fit one 390px row. The rail **wraps**: his export takes **3 rows / 177px**,
   the synthetic sheet with both class pools takes **5 rows / 289px**, and the
   card still fits 844 with the footer at 779–844. It wraps rather than scrolls
   — `scrollWidth 390 = clientWidth 390` on both sheets, nothing painted past
   the right edge — because a turn control behind a horizontal scroller is a
   turn control he cannot see, which V-6 forbids. `flex-wrap: wrap` was already
   the CSS; what was unknown was whether it would ever be *used*, and it is,
   twice over. One consequence worth recording: the wrap is what made the V-5b
   width failure visible, because the `−1 / −5 / −10` buttons only appear on the
   sheet that needs five rows.

---

# ⚠ AMENDED 2026-09-04 — the contention reversal, and Extra Attack

Gate 2's amendment of the same date is the *what* and the *why*. This is the
*how*, at the level a reader can call wrong in one pass.

## Files

**Contention → annotation**

- **`src/lib/turn/compose.ts`** — delete `const loose = everything.filter(o => !o.contended)`
  and build `affordable` / `blocked` from `everything`. One line removed, one
  identifier changed at three call sites. `findContention(everything)` still runs
  **before** the split, unchanged, and still marks in place.
- **`src/lib/turn/types.ts`** — `ComposedTurn.ranked`'s comment *"Excludes anything
  in `mutex`"* becomes false the moment the line above is deleted, so it is
  rewritten. `mutex` itself stays on the type: the groups still carry the `reason`
  the note is written from.
- **`src/lib/turn/bands.ts`** — `groupBySlot` is untouched (it already reads
  `ranked` + `rest` and will simply receive more). Its header's disclaimer about
  mutex faces is rewritten, because after this the "NOTHING IS DROPPED" property
  covers every composed option and a stale comment here is the exact thing that
  sent the last reader looking in the wrong file.
- **`src/components/turn/TurnBands.tsx`** — one new optional prop, `contention?:
  (slot: BandSlot) => ReactNode`, rendered at the foot of the band and inside the
  collapse. It is the same shape as the existing `bandNote` and for the same
  reason: this file never learns what contention *is*.
- **`src/components/turn/TurnRow.tsx`** — a contended row gets a marker. Reading
  `o.contended`, which already exists on the type (`types.ts:108`).
- **`src/components/turn/TurnScreenD.tsx`** — the `Mutex` and `MutexFace`
  components and their render site are **deleted**; the note is supplied through
  the new prop instead.

**Extra Attack**

- **`src/lib/rules-2024/attacks.ts`** (new) — the pure rule. It lives beside
  `economy.ts` because it answers the question `economy.ts`'s header explicitly
  deferred, and a new file is honest about that being a second question rather
  than growing `demandOfWeapon` a personality.
- **`src/lib/combat-state.ts`** — `attacksUsed?: number` on `CombatState`, and the
  turn reset clears it wherever the four booleans are cleared.
- **`src/lib/turn/compose.ts`** — one more arm in the `blockedReason` chain, and
  it must sit **above** the `spent(slot)` arm so the specific true reason wins
  over the general false one.
- **`src/lib/turn/events.ts`** — `TakenOption` gains `kind?: OptionKind`, copied
  at take-time by `takenFrom`, so the reducer can recognise a swing at all.
- **`src/lib/turn/reduce.ts`** — `takeOption` increments instead of setting; the
  promotion to `action: true` happens here, where the rest of the economy writes
  already live.

> **⚠ Amended 2026-09-04, during slice R5, with Marcus's approval.**
>
> Two things in the line above were wrong, and both were found by trying to
> write the code against them.
>
> **1. `CombatProvider.spendOption` does not exist.** The component exists; that
> method does not, and nothing in the repo is named it. The real authority is
> `reduce.ts`'s `takeOption`, and this doc's own justification — *"where the rest
> of the economy writes already live"* — is a description of `reduce.ts:324`.
> The reducer is also strictly the better home: it already refuses a spend into
> a closed slot, it is a pure function two lines of a test can call, and its
> `restore: { combat: snap(combat) }` deep-clones the whole combat state, so
> `attacksUsed` is restored by **Undo for free** rather than needing an inverse
> written for it. Putting economy logic in the provider would have created a
> second authority beside the reducer.
>
> **2. The reducer cannot call `isWeaponAttack` as the signature block promises.**
> `takeOption` receives a `TakenOption` (`events.ts:38`), not a `TurnOption`, and
> `TakenOption` carries `id`, `name`, `slot` and the cost fields — **no `kind`**.
> Marcus chose to add it rather than pattern-match the id string. It is
> **optional**, for the reason every field on this type is: a `TakenOption` rides
> inside each log entry into localStorage (`CombatProvider.tsx:186`), so entries
> written by the current build must still load. Absent reads as "not a swing",
> which resolves DOWN — the same direction of error `attacks.ts` chose.
>
> `isWeaponAttack`'s parameter widens from `TurnOption` to the structural minimum
> it already reads (`kind` and `cost.slot`) so that one predicate serves both
> call sites. A full `TurnOption` is still assignable, so R4's tests are
> untouched and no caller moves.

## Types & signatures

```ts
// src/lib/rules-2024/attacks.ts

/** How many attacks ONE Attack action contains for this character.
 *
 *  Always >= 1. Unknown class, unknown level, missing data — all answer 1,
 *  because the failure that matters is claiming a swing he does not have. */
export function attacksPerAction(character: Character): number

/** Is this option a weapon attack — the thing Extra Attack multiplies?
 *  Opportunity attacks are NOT (they cost a reaction, and Extra Attack does not
 *  apply to them; `mechanics-reference.ts:93` is explicit). */
export function isWeaponAttack(option: TurnOption): boolean

/** The levels at which each class gains ANOTHER attack, 2024 PHB.
 *  Absent = never. Ascending. */
export const EXTRA_ATTACK_AT: Readonly<Record<string, readonly number[]>>
```

> **⚠ Amended 2026-09-04, during slice R4, with Marcus's approval.**
>
> This was `Readonly<Record<string, number>>` — ONE level per class. It was
> approved that way and it is wrong, and the thing that proves it is already in
> this repo: `mechanics-reference.ts` tells the player, in the app, that
> *"Fighters get the most: 2 attacks at level 5, 3 at level 11, and 4 at level
> 20."* A single number cannot hold that, so the approved shape would have had
> the turn engine contradicting the app's own rules text — a companion app
> disagreeing with itself at the table is a worse failure than the one this
> phase is fixing.
>
> The widening is one type in one new file inside the slice that introduces it,
> so nothing downstream had to move. **Least-confident decision 2 stands
> unchanged**: this still reads a single `class` string and still answers wrongly
> for a multiclassed sheet, which is a case the app cannot represent anywhere.

```ts
// src/lib/combat-state.ts  — CombatState gains exactly this

  /** Attacks already swung from THIS turn's Attack action.
   *
   *  Absent means zero. Optional and defensively read for the same reason
   *  `yourTurn` is: this object round-trips localStorage, and a state written
   *  before this field existed must load without crashing. */
  attacksUsed?: number
```

```ts
// src/lib/turn/compose.ts — the new arm, ABOVE the spent() arm

/** Mid-Attack: the action is held, not spent, and only swings are legal. */
const midAttack = attacksUsed > 0 && attacksUsed < attacksPerAction(character)
// ...
} else if (midAttack && slot === 'action' && !isWeaponAttack(option)) {
  blockedReason = `You are taking the Attack action — ${remaining} attack(s) left`
} else if (spent(slot)) {
  ...
```

```tsx
// src/components/turn/TurnBands.tsx — the one new prop

  /** The contention sentence for this band, or null. Same contract as
   *  `bandNote`: an opaque node, decided by the caller, rendered at the foot of
   *  the band and inside the collapse. */
  contention?: (slot: BandSlot) => ReactNode
```

## Call stack

**A row that is contended, on an open Action**

```
compose()
  findContention(everything)      marks face.contended = true
  affordable = sortByRank(everything.filter(o => o.available))   <- no longer filtered
  groupBySlot(turn)               shelves it under 'action' like anything else
    TurnBands
      Act (row)                   reads o.contended -> renders the marker
      contention('action')        renders the sentence under the last row
```

**The first of two swings**

```
row -> OptionDetailSheet -> Spend
  CombatProvider.spendOption(option)
    isWeaponAttack(option) && attacksPerAction(char) > 1
      ? { attacksUsed: n + 1, action: n + 1 >= N }     <- held until the last
      : { action: true }
    save 'codex-combat-<id>'
  compose() re-runs
    midAttack = true  -> every non-weapon action row greys with the TRUE reason
    the weapon row stays available
```

## Test plan

Written to fail against today's build. Named, with what each asserts:

1. **`compose.test.ts` — "a contended option is in `ranked` or `rest`, not removed from both"**. Today it is in neither. This is the assertion that inverts; the old one asserting absence is deleted, not weakened, and its deletion is the record that it encoded the defect.
2. **`compose.test.ts` — "every composed option appears in exactly one band"**. Count equality over `everything`, not over `ranked + rest`. Fails today because five of Nix's options are in neither.
3. **`bands.test.ts` — "the Action band's `readyCount` equals the number of things he can actually take"**. Reads 2 today, must read 7 on his export.
4. **`contention.test.ts` — "faces are still marked, and still grouped by reason"**. The teaching must survive the reversal; this is the test that stops the fix from becoming a deletion.
5. **`attacks.test.ts` — "a level 7 Paladin has 2 attacks; a level 4 Paladin has 1"**. The boundary is 5, and it is the whole rule.
6. **`attacks.test.ts` — "an unknown class answers 1"**. Homebrew must not manufacture a swing.
7. **`attacks.test.ts` — "a sheet listing Extra Attack overrides class+level"**. Homebrew keeps the right to disagree.
8. **`attacks.test.ts` — "an opportunity attack is not a weapon attack for this purpose"**. Guards the one case the 5e rule explicitly excludes.
9. **`compose.test.ts` — "mid-Attack, Bless is blocked and says why"**. Asserts the *reason string*, not just the boolean — the false reason is the bug.
10. **`compose.test.ts` — "mid-Attack, the weapon row is still available"**. The complaint, stated as a test.
11. **`combat-state.test.ts` — "a state saved without `attacksUsed` loads"**. The localStorage compatibility floor.
12. **`combat-state.test.ts` — "ending the turn clears `attacksUsed`"**. A held action that survives the turn would be worse than the bug.
13. **`_repro-marcus.mjs` re-run** — the instrument that found this. `Action: 2 -> 7` must become `7 -> 7`, and `mutex boxes: 1 -> 0` must become `0 -> 0`.

## Least confident decisions

1. **The contention note's wording is not yet written.** Gate 2 settled that it is a sentence at the foot of the band; it did not settle the sentence. It has to say "only one of these" without implying the others are gone, and it is read at a table mid-fight. **Worth challenging now — it is a string in one file today and a screenshot in a slice tomorrow.**
2. **`attacksPerAction` reads class + level, and Nix's `class` is a plain string.** Multiclassing is not modelled anywhere in this app, so a multiclassed sheet will answer from whatever single string it carries. I think that is acceptable and in keeping — nothing else here models it either — but it is a known wrong answer for a case the app already cannot represent.
3. **Mid-Attack blocks every non-weapon action option.** Strictly the 2024 rules let you do nothing else with an Attack action, so this is right. It will nonetheless *look* like a regression the first time it greys Bless, which is why test 9 asserts the reason string and not just the block.
4. **`Mutex` is deleted rather than left unrendered.** It is ~40 lines and its CSS block goes with it. If the note-in-band reads worse than the bracket at the table, restoring it is a `git revert` of one slice, not a rebuild — but it is a deletion and deletions are the thing this repo has been burned by. Recorded so the choice is his, not mine.
5. **`attacksUsed` is a number, not a list of what was swung.** The Codex will not be able to say *"you hit with the first and missed with the second"*. That is a damage-log question and the log lives in `CombatHelper`, outside this phase — but if two attacks are ever to be rolled separately on the row, this field is the thing that would have to grow.

# ⚠ EXTENDED 2026-09-04 — slice R6, the visible half

The amendment above designed R4 and R5 in full and said **nothing about R6**. That
was not an oversight at the time — R6 could not be designed before R5 existed,
because what the screen has to say depends on what the engine turned out to hold.
It holds `attacksUsed`, and the engine is now correct and **silent**. This section
is R6, written before its first line of code, to the same standard as the rest.

Nothing above is contradicted. This adds; it does not amend. No gate goes back.

## The fault R6 closes, stated exactly

After R5, Marcus taps his sword. The Action band does **not** close — correct — and
six other rows grey out with *"You are taking the Attack action — 1 attack left"* —
correct. But **the row he needs is the one row that says nothing**, and the band
header still reads `ACTION · 1 ready · open`, which is what it would read if the
app had simply refused his tap. The engine and the screen disagree about whether
anything happened, and the screen is the only one of the two he can see.

## Files

- **`src/lib/turn/types.ts`** — `ComposedTurn` gains `attack: { used, of }`.
  **Required, not optional**, for the reason `yourTurn` is required here and
  optional on `CombatState`: this object is computed fresh on every compose, so
  there is no stored value to be kind to and every reader is owed a straight
  answer. Nothing in the repo builds a `ComposedTurn` literal (checked: zero
  matches for `: ComposedTurn = {` and `as ComposedTurn`), so requiring it moves
  no caller.
- **`src/lib/turn/compose.ts`** — populates it from the two numbers it **already
  computes** for R5's `blockedReason` arm (`attacksInAction`, `attacksSwung`).
  Not a second calculation: the header, the row and the greyed-out reason must be
  unable to disagree about the same fight, and the only way to guarantee that is
  for all three to read one pair of numbers.
- **`src/components/turn/AttackTally.tsx`** (new) — the two sentences and the
  predicate that decides whether there is anything to say. The exact shape of
  `ContentionNote.tsx` from R3, deliberately: components that render, plus one
  pure exported predicate, so the *decision* is testable without a DOM.
- **`src/components/turn/TurnBands.tsx`** — one new optional prop, `headNote?:
  (slot: BandSlot) => ReactNode`, rendered **inside `BandHead`**. A fourth opaque
  node, and this file still never learns what Extra Attack is.
- **`src/components/turn/TurnScreenD.tsx`** — pass-through, beside `bandNote` and
  `contention`.
- **`src/components/turn/TurnLive.tsx`** — decides both: which band gets the tally
  (`action`), and which rows get the swing note (`isWeaponAttack`, the R4
  predicate, so the row that lights up is exactly the row the reducer will
  accept).
- **`src/components/turn/turn-d.css`** — `.batk` (the header chip), `.swing` /
  `.swn` / `.swv` (the row line).

## Types & signatures

```ts
// src/lib/turn/types.ts

/** The Attack action, counted.  Slice R6. */
export interface TurnAttack {
  /** Swings already taken from THIS turn's Attack action.  0 when none. */
  used: number
  /** How many swings one Attack action contains for this character.  Always >= 1. */
  of: number
}
```

```tsx
// src/components/turn/AttackTally.tsx

/** Strictly between: swung at least once, at least one swing left. */
export function midAttack(attack: TurnAttack): boolean

/** The header chip.  Null when `of <= 1` — nothing to count. */
export function AttackTally({ attack }: { attack: TurnAttack }): JSX.Element | null

/** The line under the weapon row.  Null unless `midAttack`. */
export function SwingAgain({ attack }: { attack: TurnAttack }): JSX.Element | null
```

```tsx
// src/components/turn/TurnBands.tsx — the one new prop

  /** Something to hang in the band's HEADER — decided per slot, by the caller.
   *  TEXT ONLY: the header is itself the collapse control, so a node containing
   *  a control would be a button inside a button. */
  headNote?: (slot: BandSlot) => ReactNode
```

## The two strings, and why they are these

**Header, whenever `of > 1`, including before the first swing: `{used} of {of} used`.**

Printed at zero on purpose, and the argument is already written in this very
component: `BandHead`'s own comment says *"THE COUNT IS ALWAYS PRINTED, INCLUDING
ZERO... a count that disappeared when it hit zero would leave the band looking
identical to a band whose rows are merely collapsed."* The same holds here and
harder — a chip that appeared only after the first swing would leave the screen
silent at the one moment Marcus is *deciding*, and his complaint was never "the
second attack was refused", it was **"it doesnt allow me to take my two mele
attacks"**: the app never told him it knew he had two.

**Row, only while `midAttack`: `{left} attack(s) left` + `Swing again`.**

Before the first swing the row is untouched — the header already carries the fact
and a permanent "swing again" on a swing not yet taken would be a lie. The count
is the same `of - used` the greyed rows print, from the same numbers.

## Call stack

```
compose()
  attacksInAction / attacksSwung        <- R5's numbers, now also returned
  turn.attack = { used, of }
TurnLive
  headNote('action')   -> <AttackTally attack={turn.attack} />   null if of <= 1
  rowExtra(option)     -> isWeaponAttack(option) && midAttack(turn.attack)
                            ? <SwingAgain .../> : null
TurnScreenD -> TurnBands
  BandHead   renders the chip between "N ready" and "open"/"spent"
  Act        renders the line in `.actx`, under the hit target
```

## The trap this design has to dodge, named so it cannot be "simplified" away

`Act` decides between two **different markups** on the truthiness of `extra`
(`TurnRow.tsx:105,116`) — a bare `<button class="act">` when there is none, and
`<div class="act hasx"> <button class="acthit"> + <div class="actx">` when there
is. A React element that *renders* null is still a truthy element. So `rowExtra`
must return the literal `null` itself, and must **not** delegate that decision to
a component that returns null internally: doing so would give every weapon row a
permanent empty `.actx` and the hairline rule that dresses it. That is why
`midAttack` is exported as a predicate at all, and there is a test that asserts
the pre-swing weapon row carries no `hasx`.

## Test plan

Written to fail against the build R5 shipped. Named, with what each asserts:

1. **`extra-attack.test.ts` — "the composed turn carries the count"**. `turn.attack` is `{used: 0, of: 2}` for Nix before any swing. Red today: the field does not exist.
2. **— "the count follows the swings"**. After one take of the weapon: `{used: 1, of: 2}`.
3. **— "one attack is still a count"**. A character with no Extra Attack composes `{used: 0, of: 1}` — not absent, not null.
4. **— "the screen's count and the engine's rule are the same number"**. `turn.attack.of === attacksPerAction(character)`. The anti-drift test; it is the whole reason the field is computed in compose and not in the component.
5. **— "the count clears with the turn"**. After `endTurn`, `attack.used` is 0.
6. **`AttackTally.test.tsx` — "says nothing when there is nothing to count"**. `of: 1` renders empty markup.
7. **— "prints the tally before the first swing"**. `0 of 2 used`.
8. **— "prints the tally mid-Attack"**. `1 of 2 used`.
9. **— "the row offers the second swing"**. `SwingAgain` mid-Attack contains `1 attack left` and `Swing again`.
10. **— "the row is silent before the first swing"**, and **"…and when there is only one attack"**. Both render empty.
11. **— "plurals"**. A level 11 Fighter one swing in says `2 attacks left`, not `2 attacks lefts` and not `1`.
12. **— "the header carries it, and only the band asked for"**. Through `TurnBands`: the chip is inside `.bhead` of ACTION and appears nowhere in BONUS.
13. **— "a band with no headNote is byte-identical"**. The same `TurnBands` rendered with and without the prop, compared as strings, so this slice provably moves no pixel on any other screen.
14. **— "the pre-swing weapon row carries no empty extra"**. Asserts `hasx` is absent — the trap above, as a test.
15. **`_repro-marcus.mjs` re-run** on his real export, plus a shot at 390×844 mid-Attack. The instrument that opened this phase has to close it.

## Least confident decisions

6. **The chip prints at zero.** Argued above from `BandHead`'s own law, and it is still the call most likely to be wrong at a table: every Paladin's Action band now permanently carries `0 of 2 used` at the top of every turn. The alternative — print only from the first swing — is a one-line change to `AttackTally` and no change anywhere else. **Worth challenging now.**
7. **The header chip is text inside a `<button>`.** Safe today and unenforceable tomorrow: nothing stops a future caller passing a control through `headNote` and rebuilding the nested-button fault `ReactionRow.tsx:192` was fixed for. It is documented on the prop rather than defended in code, because the only real defence is not to make it a `ReactNode` — and that would mean this file learning what an attack is.
8. **`{used} of {of} used` says "used" once and means it twice.** It reads correctly and it is short enough for a 390px header beside `7 ready` and `open`. If the measurement says otherwise the fallback is `1/2 used`, which is worse to read and certain to fit.

### ✅ RESOLVED 2026-09-04 — decision 8 measured, fallback withdrawn

`prove-sliceR6.mjs` measured the header on Marcus's own export at 390×844:
header 354px wide, `blbl` x47 w92 · `bn` x147 w55 · **`batk` x210 w86** ·
`bstate` x304 w34. That is **8px of clearance**, `scrollWidth - clientWidth = 0`,
and the chip is not ellipsised. The long wording ships; **`1/2 used` is
withdrawn.** Re-measure only if the band label, the ready count, or the state
word grows.

Decisions 6 and 7 stand as written — neither is settled by a measurement, and
both are still worth challenging.

# ⚠ EXTENDED 2026-09-05 — slice R7, the confirm rebuilt in D

Nothing above is contradicted. This restores behaviour the phase dropped; it
does not change an approved decision, so no gate goes back.

## The fault, stated exactly

`TurnRail.tsx:104` wires the `End combat` button's `onClick` straight to
`onEndCombat`, and `TurnLive.tsx:412` wires that to `combat.endEncounter`. One
tap therefore finalises the fight and rewrites `codex-combat-<id>`: measured on
his export, `inCombat true -> false` and `round 3 -> 1`, with no confirmation.
The old deck's button only ARMED — `EndCombatConfirm` was what ended the fight —
and that component still exists, still passes its 4 tests, and is mounted
nowhere. Marcus ruled: rebuild it in D rather than remount the Tailwind one.

## Files

- `src/components/turn/EndCombatD.tsx` — NEW. The strip, in D. Its own file for
  the reason `EndCombatConfirm` gives in its own header: this repo has no jsdom,
  so a strip that only exists after a tap is invisible to the node suite unless
  it is exported and renderable on its own.
- `src/components/turn/TurnRail.tsx` — `TurnVerbs` gains three props and stops
  wiring the irreversible call to the first tap.
- `src/components/turn/TurnLive.tsx` — owns the armed flag and passes it down.
- `src/components/turn/turn-d.css` — `.endc` and its parts.
- `src/components/turn/EndCombatD.test.tsx` — NEW.
- `docs/plans/your-turn/prove-sliceR7.mjs` — NEW. The two taps, on his export.

## Types & signatures

```ts
export function EndCombatD(props: {
  onKeepGoing: () => void
  onConfirm: () => void
}): JSX.Element

export interface TurnVerbsProps {
  onLookup?: () => void
  onReset?: () => void
  inCombat: boolean
  onStartCombat?: () => void
  /** THE CONFIRM, not the first tap. Called by the second door only. */
  onEndCombat?: () => void
  /** Is the confirm showing? A PROP, not state — same law as `bandsOpen`. */
  endArmed?: boolean
  /** The first tap. Absent => the button falls back to the old direct wiring,
   *  which keeps every existing caller (and the design-shoot card) working. */
  onArmEndCombat?: () => void
  onCancelEndCombat?: () => void
}
```

## Why the flag is a prop and not `useState` in `TurnVerbs`

`TurnScreenD` holds no state by law, and `bandsOpen` is a prop for exactly that
reason. `TurnVerbs` is handed to the screen through the opaque `verbs` seam, so
giving it private state would put the one piece of destructive UI in this tab
outside the only component that is allowed to own state. `TurnLive` owns it.
It also has to be cleared when the fight ends by any other route, and only
`TurnLive` can see that happen.

## The two strings, and why they are these

- **The sentence:** "End the encounter? Your damage log is saved to history, and
  the round counter, concentration and spent economy clear." Carried over
  verbatim from `EndCombatConfirm`, because it was right: it names what happens
  rather than asking "are you sure?", which moves the decision without informing
  it. The words are already pinned by 4 passing tests.
- **The doors:** `Keep going` and `End combat`. Named apart, and the SAFE one
  first in the DOM — the old suite's claim, kept.

## Colour

The destructive door is **amber**, not ember. `--d-ember` is 4.68:1 and the
token file marks it `>=16px only`; the strip's text is `--d-fs-body` (15px), so
ember text would break the contrast floor this design system sets for itself.
`.rbtn.end` is already amber for the same reason and this is the same verb.
Ember appears once, as the strip's 1px border, where contrast ratio does not
apply.

## Call stack

```
TurnLive [endArmed, setEndArmed]
  └ TurnVerbs endArmed onArmEndCombat=()=>setEndArmed(true)
              onCancelEndCombat=()=>setEndArmed(false)
              onEndCombat=()=>{ setEndArmed(false); combat.endEncounter() }
      ├ not armed -> <button aria-label="End combat" onClick={onArmEndCombat}>
      └ armed     -> <EndCombatD onKeepGoing={onCancelEndCombat}
                                 onConfirm={onEndCombat} />
```

## Test plan (`EndCombatD.test.tsx`)

1. **"the first tap arms, and does not end"** — `TurnVerbs` unarmed calls
   `onArmEndCombat`; `onEndCombat` is not the button's handler. RED today.
2. **"nothing irreversible is mounted before the tap"** — unarmed markup has no
   `End combat confirmation` and no `aria-label="End combat — confirm"`.
3. **"armed, the strip appears"** — `role="group"`, that aria-label.
4. **"it names the cost, not «are you sure»"** — damage log, round counter,
   concentration, spent economy all present.
5. **"two doors, named apart"** — `Keep going` and `End combat — confirm`.
6. **"the way OUT is first"** — index of `Keep going` < index of the confirm.
7. **"the arming button is gone while armed"** — exactly one control named
   `End combat`-ish, so the row never offers two.
8. **"both doors are thumb-sized"** — both carry `.rbtn` (48px floor).
9. **"armed is ignored out of combat"** — `inCombat: false` + `endArmed: true`
   renders `Start Combat` and no strip. A stale flag cannot paint a confirm for
   a fight that is not running.
10. **"it is D, not the old palette"** — no `red-500`, no `text-forge`, no
    `rounded-xl` in the markup.
11. **"the old caller still works"** — `onArmEndCombat` absent => the button
    falls back to calling `onEndCombat` directly, so `TurnRail.test.tsx`'s
    existing renders and the read-only design card do not change meaning.

## Least confident decisions

1. **The strip replaces the button in place** rather than appearing below the
   verb row. It keeps the row one row and puts the doors exactly where the thumb
   already is — but it does move `Look up` and `Reset` when it wraps. The
   alternative is a full-width strip on its own line, which costs 48px of the
   scroller while armed.
2. **The fallback in decision 11.** It keeps old callers working, and it also
   means a caller who forgets `onArmEndCombat` silently gets the unguarded
   one-tap behaviour back. The safer alternative — no fallback, the button
   simply does not render without an arm handler — would break the design-shoot
   card, which supplies neither handler. Worth challenging.
3. **`endArmed` is not cleared by this design when `inCombat` flips.** Test 9
   makes a stale flag harmless to LOOK at, but `TurnLive` still owns clearing
   it. If a later slice adds another route out of combat, that route must clear
   it too.

## ✅ BUILT 2026-09-05 — one amendment, and two of the three answered

**AMENDMENT: the branch is not inside `TurnVerbs`.** The design above put the
armed/unarmed choice there. During the build that turned out to make the slice's
central claim untestable: `TurnVerbs` calls `useDiceDock`, a `useContext`, so it
cannot be invoked outside a renderer — and this repo has no jsdom, so
`renderToStaticMarkup` is the whole of the node suite's reach and it emits no
handlers. The one destructive control in the tab would have been pinned by the
shape of its markup and by nothing that could press it.

So `EndCombatD.tsx` exports **two** hook-free components, and `TurnVerbs` renders
the second:

```ts
export function EndCombatD(props: {
  onKeepGoing: () => void
  onConfirm: () => void
}): JSX.Element                       // the strip — unchanged from above

export function EndCombatDoor(props: {
  armed?: boolean
  onArm?: () => void                  // absent => falls back to onConfirm
  onCancel?: () => void
  onConfirm: () => void
}): JSX.Element                       // the whole two-tap mechanism
```

`TurnVerbsProps` is exactly as specified above; only where the branch executes
moved. `EndCombatDoor(props)` is an ordinary function returning an element tree,
so `EndCombatD.test.tsx` walks that tree and calls the real `onClick`.

**Decision 1 (in place, not below) — measured and kept.** 358×135 while armed,
0px while not, and `Look up` / `Reset` survive the arming, so it reads as a strip
rather than a modal. Sentence not clipped at 390px; both doors 48px tall.

**Decision 3 — answered, not left open.** `TurnLive` runs an effect on
`combat.inCombat` that clears `endArmed` whenever the fight is not running. The
condition is the fight, not the button, so a route out of combat added by a later
slice clears it without knowing this exists.

**Decision 2 (the fallback) — left as designed, and its risk stated.** A caller
who forgets `onArmEndCombat` silently gets one-tap ending back. `TurnLive` is the
only caller that can end a real fight, and it is pinned in the browser by
`prove-sliceR7.mjs` rather than by the fallback.
