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
