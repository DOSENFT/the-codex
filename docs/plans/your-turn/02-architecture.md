# Architecture: the one "Your Turn"

> Gate 2's own rule is *read the relevant existing code before writing — never
> design against an imagined codebase.* This app's standing law is stronger:
> **a thing that models the app after the repair cannot show the fault**, so the
> code was read *and* the result was measured on the glass, on his sheet, at
> 390×844. The two disagreed, and the measurement won. Twice.

## The finding that decides this gate

**The card Gate 1 designed already exists, already runs, and Marcus has never
seen it.**

`src/App.tsx:48` defines `D_PREVIEW`, read once from `?d=1`. When it is set,
`App.tsx:145` does not render the Play tab at all — it renders `TurnLive`, which
mounts `CombatProvider` around `TurnScreenD`. The comment above the flag calls it
*"V1.0's new turn screen (direction D)"*.

It was not read about. It was opened on his real export, in combat at round 3,
nothing spent, on his phone's viewport (`_probe-d.mjs`, `_probe-d2.mjs`):

```
                                     the Play tab today        ?d=1
  furniture (permanent chrome)              429px              133px  ← no tab bar
  the window he reads through               415px              711px
  content                                  3100px             1915px
  screens of scrolling                       7.47               2.69
  places his hit points are painted             3                  1
  sets of Action/Bonus/Reaction/Move             2                  1
  boxes headed "Your turn"                       2                  1
  page errors                                    —               none
```

Nine of his options are on it, ranked, **with the dice on the row** — *The Dawn
Guardian +7 to hit · 1d10+4 Slashing*, Divine Smite *2d8 Radiant · +1d8
Fiend/Undead*, Hearthfire Manifest three times (Action, Bonus, Reaction),
**Sentinel twice**, Opportunity Attack — then a contention band, *"One of these —
your action, pick one"*, holding Bless, Burning Hands, Faerie Fire, Scorching Ray
and Warding Bond. Round 3 top-right. HP 3/67, AC 18, **Bloodied**. Both auras.
Slot pips. Undo. End turn.

That is most of `01-product.md`'s five-part card, built and running, and it is
reachable today only by typing a query string.

**So this phase does not build a card. It promotes one.**

### Why D has the layout and none of the controls

Reading the code after measuring explains the split exactly, and the explanation
is the architecture:

- `TurnScreenD` renders a `ComposedTurn` **and nothing else**. Its own header
  forbids rules logic in the file. Everything it shows comes from `src/lib/turn/`,
  which is pure and tested.
- Therefore every engine advance since it was written **arrived in it for free**.
  `feats.ts` (table-truth slice 10e) plugs into `compose.ts`, so Sentinel's two
  triggers and the opportunity attack paint on D without D knowing feats exist.
- And every *component* advance since slice 7 **did not**. Slices 10b–10f built
  the write path, the temp-HP grant, the retaliation capture and the reactions
  band into `CombatHelper`'s stack. D never received them.

Counted on the glass: D offers **16 reachable buttons** — 14 option rows, Undo,
End turn. It has **no** damage, heal or temp-HP control, no conditions, no dice
roller, no quick look-up, no reset, no end-combat, no Lay on Hands, no Channel
Divinity, no death saves, no notes, and its slot pips are display-only.

> **The one-sentence architecture.** The engine is shared and already right; the
> layout is D's and already right; the controls are `CombatHelper`'s and are the
> whole of the work. Move controls into D, mount D as the combat tab, delete the
> flag.

## Fit

### What moves, and which direction

| | today | after |
|---|---|---|
| `src/lib/turn/*` — compose, rank, reduce, feats, overlay | the engine both screens read | **untouched** |
| `components/turn/CombatProvider.tsx` | mounted twice: by `TurnLive` and by `CombatHelper` | mounted once |
| `components/turn/TurnScreenD.tsx` | presentational, behind `?d=1` | **the combat tab**, gains the control surface |
| `components/turn/TurnLive.tsx` (47 lines) | the join, behind the flag | the join, mounted by the tab |
| `components/CombatHelper.tsx` (~1540 lines) | the combat tab | the source of the controls, then retired |
| `components/TurnDeck.tsx` | 308px pinned to the glass | **gone** — see V-6 below |
| `components/combat/TurnSummary.tsx` | the "middle module" he chose | its unique controls move onto the card |
| `App.tsx` `D_PREVIEW` | a flag nobody knew about | **deleted** |

`options.ts` is pinned byte-identical to `main` by `overlay.test.ts` case 15
(table-truth finding BD). It is not touched. Nothing here needs it to be.

### The one thing that is his choice, not mine

Marcus said the module to keep is **the middle one** — round counter, Next turn,
Action/Bonus/React/Move, always-active auras, clickable details. Every one of
those is on `TurnScreenD` already, in the same order, which is why promoting D
*is* keeping the middle module rather than overruling him. What D adds is the
ranked list with dice on the row, which is the top module's job done better, and
what it must gain is the Hit Points module's controls, which is item 10.

### Four pip implementations, two of them dead — corrected from the agent report

A prior report claimed the app has `SpellSlotPips.tsx` and `SpellSlotSigils.tsx`
"with differing aria-labels" and implied Gate 3 should reuse one. Checked:

- `SpellSlotPips.tsx` — exported from `combat/index.ts`, **zero consumers**.
- `SpellSlotSigils.tsx` — not exported at all, **zero consumers**.
- Their aria-labels are **identical**, not differing: `Expend level N spell slot`.
- The two sets actually painted are **inline copies**: `TurnDeck.tsx:461` and
  `TurnSummary.tsx:441-472`. *Those* differ — `Expend level 1 spell slot` versus
  `1st slot 1: expend` — which is why the measurement's pip counter, keyed on the
  second form, saw the middle module and not the deck.

"Reuse the existing component" would have meant adopting one nobody has ever
rendered. **The card uses D's own pip row, which is on the glass and works.** The
two orphans and the two inline copies all go when their hosts go.

## Endpoints

None. This is a local-first app with no server: it has never made a call except
to Gemini, and nothing in this phase adds one.

The equivalent surface is `CombatApi` (`components/turn/CombatProvider.tsx:70`),
which is the only rules-checked write path in the app. What matters for this gate
is **what it already offers versus what any screen currently calls**:

| `CombatApi` member | purpose | wired on the Play tab | wired on `?d=1` |
|---|---|---|---|
| `turn` | the whole composed screen | yes | yes |
| `combat`, `inCombat` | the state it was composed from | yes | yes |
| `take(option) → boolean` | the rules-checked spend | yes (10c) | yes |
| `endTurn()` / `beginTurn()` | the two separate verbs | yes | yes |
| `undoLast()`, `undoLabel`, `undoEntry` | undo by shape | yes | partly |
| `refusal`, `dismissRefusal()` | the reason a tap was refused | yes | yes |
| `retaliate(amount, source) → boolean` | HEARTH-05 fire tally | yes (10f) | **no** |
| `updateCombat()` | the manual, ruleless tally | yes (the deck) | no |
| `forgetCombat()` | the encounter is over | yes | no |
| **`startEncounter()`** | begin a fight | **no** | **no** |
| **`endEncounter()`** | end a fight | **no** | **no** |

The last two close **finding BH**, carried out of table-truth slice 10f: *there
is no way to end an encounter from the Play tab* — `onEndCombat` is handed to
`TurnSummary` and never used. The verbs exist and are tested. Nothing calls them.
This phase calls them, from the card's rail, and that is also where his item 6's
"end combat" requirement lands after the deck is gone.

## Data

**No new storage, no changed shapes, no migration.** That is a hard constraint,
not an outcome: `vitals.ts` reports and never corrects, and his stored blob must
be byte-identical at the end of this phase.

| key | holds | this phase |
|---|---|---|
| `codex-character-<id>` | his sheet | **never written by this phase** |
| `codex-combat-<id>` | `CombatState` — round, `turnActions`, slots, concentration, `yourTurn?`, `retaliation?` | written only through `CombatApi`, unchanged shape |
| `codex-action-notes-<id>` | the notes he can write on an action | moves surface, same key |
| `codex-ui-<id>` | the `useCollapsible` open/closed map | **gains keys**, loses none |
| `codex-active-id`, `codex-roster` | which character | untouched |

`CombatState.retaliation` and `yourTurn` are optional and absence means zero, so
a sheet saved before this phase opens after it with the same meaning.

The band grouping needs no new field. `OptionCost.slot` is already
`'action' | 'bonusAction' | 'reaction' | 'movement' | 'free'`, and
`TurnOption.available` already carries `blockedReason`. Gate 1's *"dimmed, with
the reason written on them"* is a read of two fields that exist.

The open/closed state of the four bands is four new `useCollapsible` keys in the
existing `codex-ui-<id>` map — the same mechanism the Active Conditions fold and
the deck minimise already use, so it persists per character for free.

**One data-shaped gap, named and not designed around.** `movement` in
`turnActions` is a **boolean only**. There is no speed and no remaining distance
anywhere in the model. Gate 1's mockup screen 4 paints *"Movement · 30 ft"*, and
**the app cannot currently say 30**. The MOVEMENT band is therefore spent /
not-spent in this phase, exactly as today, and "30 ft" comes off the design. That
is a Gate 1 correction, listed below with the others.

## Flow

```
App.tsx
  └─ Layout            fixed header (56px) · <main> · tab bar (65px)
       └─ CombatTab
            └─ TurnLive                        key={character.id}
                 └─ CombatProvider             the ONE model of the turn
                      │   character + codex-combat-<id> + log
                      │   → compose() → rank() → ComposedTurn
                      └─ TurnScreenD
                           ├─ round bar        round · your turn / the moment · Next turn
                           ├─ vitals           HP (colour) · AC · Bloodied · conditions
                           │                     └─ damage / heal / temp  ← from HPTracker
                           ├─ ACTION band      ─┐
                           ├─ BONUS band        │ grouped on option.cost.slot,
                           ├─ REACTION band     │ collapsible, blocked rows dimmed
                           ├─ MOVEMENT band    ─┘ with option.blockedReason on them
                           ├─ always active    the auras, opening to details
                           └─ the rail         dice · look up · slot pips · end combat
```

One tap, end to end, unchanged from what already works:

```
row tap → OptionDetailSheet → Spend
        → CombatApi.take(option)
        → reduce()  rules-checked; returns true, or sets `refusal`
        → CombatProvider persists codex-combat-<id> BEFORE it renders
        → compose() re-runs → every band re-paints from one model
```

`CombatProvider` persists inside its dispatch handler, so a tap that is on screen
is a tap that is on disk. **There is exactly one model of the turn** — table-truth
finding BB was two components holding two, and the list read `4 → 4 → 1` across a
reload until the second was deleted. Nothing in this phase may reintroduce one.

## V-6 — the approved rule this design overrides, and how

V-6 is a V1 rule, approved, and it is *the reason `TurnDeck` is fixed*. Its text
and its intent are both on record at `docs/plans/table-truth/02-architecture.md:271-279`:

> V-6 reads: *turn-critical spend controls are always visible* … Spend **state**
> stays permanently visible, which is V-6's actual intent — **never be surprised
> by what you have already spent.**

Gate 1 deletes the deck. Measured, the card is 696px on a fresh turn inside a
721px window — so on his own turn nothing is lost. But mid-turn D measures 2144px
of content, and the moment the round bar and the economy chips scroll past, spend
state is off the glass. **V-6 bites, and it is not enough to note it.**

**Resolution: the spine, not the bar.** Precedent is table-truth slice 4, which
licensed a bounded V-6 override on exactly this reasoning — *minimise ≠ hide*.

A **~40px sticky row at the top of the scroller**, carrying the four band headers
as colour-coded state dots plus the slot pips, and **End turn**. It is not always
there: it appears only once the card's own round bar has scrolled out of view, and
it is the same four dots and the same pips the card shows, in the same colours, so
it is a *restatement* and never a second source of truth.

Spend state is permanently visible. That is V-6's stated intent, kept, at **40px
instead of the deck's 308px — 13%.**

## What may not be lost, and where each thing lands

`01-product.md`'s do-not-lose list, against the code, with its destination. This
table is the contract Gate 4's slices are graded on.

| feature | lives today in | lands on |
|---|---|---|
| round counter · Next turn | `TurnSummary` | D's round bar — **already there** |
| Action/Bonus/Reaction/Move | deck + `TurnSummary` | D's economy row — **already there**, once |
| reset action economy | deck + `TurnSummary` | the rail |
| always-active auras + details | `TurnSummary` | **already there** |
| every row opening to full details | `OptionDetailSheet` | unchanged, mounted from the bands |
| notes on an action | `CombatHelper`, `codex-action-notes-` | the detail sheet |
| quick look-up | `QuickLookup` | the rail |
| ranked options, dice and to-hit | `compose`/`rank` | **already there** |
| the count of what is ready | ~~—~~ **`TurnSummary` — it exists today** | D's *"5 ready"* — **already there** |
| HP with its colour | header + `TurnSummary` + `HPTracker` | D's vitals — **already there**, once |
| ~~Bloodied~~ **Bloodied ARRIVES** | ~~already there~~ **nowhere today** | D's vitals — **new to the app he opens** |
| damage · heal · temp HP | `HPTracker` | **new on D** — the vitals strip |
| the temp-HP **source** question | `TempHPSource` (phase 4) | **new on D** — with its damage control |
| death saves | `HPTracker` | **new on D** — the vitals strip, at 0 HP |
| conditions dropdown | ~~`ConditionsGrid`~~ **`HPTracker:669-760`, its own grid** | **new on D** — inside the vitals control (item 10) |
| armour class | `TurnSummary` | **already there** |
| spell-slot pips | deck + `TurnSummary` | D's rail — **already there**, display-only → tappable |
| start combat | ~~nothing calls it~~ **a "Start Combat" button exists out of combat today**; what nothing calls is `CombatApi.startEncounter` | the rail — same button, finally on the one verb |
| end combat | deck; `onEndCombat` never used | **new** — `endEncounter()`, closes finding BH |
| minimise | deck | **retired with the deck** — a 121px shell has nothing to minimise |
| the dice roller | `DiceControl`, adopted by the deck | the rail — **`DiceControl` already has the seam for this** |
| retaliation capture + tally + undo | `RetaliationCapture` (10f) | **new on D** — the REACTION band |
| **Lay on Hands spend controls** | deck **only**, invisible on his sheet | **new on D** — the rail, gated the same way |
| **Channel Divinity uses** | deck **only**, invisible on his sheet | **new on D** — the rail, gated the same way |

**Amended 2026-08-31 by slice 1**, which turned this table into 41 pins and ran
them against the pre-change build. Four rows above are struck through because
the glass disagreed with the code read:

- *the count of what is ready* — written here as not existing today. It does:
  `5 ready` is painted on the current combat tab. Not an arrival; a pin.
- *Bloodied* — written here as "already there". It is on `?d=1` **only**. A
  sweep of every painted element on the real combat tab finds the string
  "blood" **nowhere**. It arrives.
- *start combat* — written here as "nothing calls it". A **Start Combat** button
  is on screen today when he is out of combat. What nothing calls is the
  `CombatApi.startEncounter` **verb**. Two different claims, and only the second
  one was true.
- *conditions* — written here as `ConditionsGrid`. **`combat/ConditionsGrid.tsx`
  has zero consumers and has never been rendered.** The grid that ships is
  `HPTracker`'s own, at `HPTracker.tsx:669-760`, whose buttons carry no
  aria-label because their accessible name is the condition's own word. This is
  the SpellSlotPips mistake a second time, caught the same way, and it changes
  Gate 3 — see `03-program-design.md` §Amended by slice 1.

The last two rows below are the ones he cannot see to miss. They render only when
`character.paladinResources` is present (`TurnDeck.tsx:520,585`), and **his export
has no such key**, so they paint nothing for Nix and would vanish silently. They
are computed by `paladinResourcesFor(level)` in `rules-2024/pools.ts:145` for
sheets that carry the block. Verified, not assumed.

`DiceControl.tsx` (slice 10f-a) already implements *"a surface that already owns
fixed bottom chrome adopts the control into it"*. The deck is currently that
surface. The card's rail becomes it. This is the seam working as designed.

## What changes in Gate 1, measured

Four numbers in the approved product doc are now measured rather than modelled.
**Three hold. Two change, and one is a feature coming off the design.**

1. **Furniture 121px / window 723px — HOLDS at rest.** The mockup's chrome is
   `.hdr` 56px + `.nav` 65px = 121px, and the app's real header is 56px and its
   real tab bar 65px. Exact. But `?d=1` measures **133px** because D carries *its
   own* 68px header and a 65px Undo/End-turn footer, and has no tab bar. So the
   design decision is explicit: **D's header merges into the app header** (which
   already carries his name, class and HP), and **Undo / End turn move onto the
   card's rail**, inside the scroll. 121px stands.

   > ### ⚠ AMENDED 2026-09-01 — both halves of that decision were reversed, and
   > ### the number with them. Marcus ruled; see `04-slices.md` §"Slice 8, re-steered".
   >
   > **The header goes the other way.** D's 44px header stays and the app's 56px
   > header comes off the combat tab. It is the smaller of the two, it carries
   > the Round counter, and removing the app header removes one of the three
   > places item 10 says his hit points appear.
   >
   > **Undo / End turn do NOT move inside the scroll.** Slice 4 built the rail
   > as permanent bottom chrome and slice 7 merged the footer into it, because
   > V-6 — *turn-critical spend controls always visible* — cannot be honoured by
   > anything that scrolls. That is an approved rule outranking this paragraph's
   > convenience, and the paragraph was written before it existed.
   >
   > **So 121px does not stand, and 429 → 121 is withdrawn as this phase's
   > headline.** Measured 2026-09-01: the pinned strip alone was 233px, plus a
   > 65px tab bar = 298 before any header. The strip is now trimmed to the state
   > of this turn — four dots and End turn, **121px measured** — which predicts
   > **230px of furniture and a 614px window** against **429 / 415** today.
   > 8b measures it for real. `01-product.md`'s table is corrected there.
   >
   > *How this was missed for four slices: every furniture number since slice 4
   > was read off `?d=1`, which returns `TurnLive` INSTEAD of `<Layout>` and so
   > pays for no app chrome at all. **A measurement taken in the preview is a
   > measurement of the preview.***

2. **The V-6 spine adds 40px once scrolled — NEW.** Furniture is **121px at rest
   and 161px once the card scrolls (19.1%), window 723px → 683px.** Gate 1 quotes
   only the 121. This is the number to look at hardest, because it is the price of
   keeping an approved rule.

3. **"0 screens of scrolling" is not yet true of D — 2.69 measured.** D renders
   every option as a full expanded row: 1230px of ranked list plus 413px of
   contention. The mockup reaches 696px by **collapsing the bands**. That work is
   presentational, inside `TurnScreenD`, keyed on `option.cost.slot` which
   `compose.ts` already provides — no engine change — but it is real work and it
   is the metric, so it gets its own slice and its own before/after measurement.

4. **"Movement · 30 ft" comes off the design.** `turnActions.movement` is a
   boolean and no speed exists anywhere in the model. The band shows spent /
   not-spent. Inventing a 30 would be canon filling a silence with a default,
   which phase 4's law forbids.

5. **Out of combat, D is wrong today and must be built.** Measured, `inCombat:
   false` renders **identically to "not your turn"** — heading *"The moment"*,
   **"Round 0"**, and an offer to begin a turn in a fight that is not happening.
   Gate 1's screen 4 specifies *"Not in combat"* and one green **Start combat**.
   `startEncounter()` exists and nothing calls it.

## External

None. No third-party API, no webhook, no environment variable, no network call.

The Gemini key used by the Toybox and the Combat Advisor is untouched by this
phase, and item 1 remains open and 🟡 ASK-FIRST.

## Risks, named before they are paid for

1. **Two providers, briefly.** During the change-over, `CombatHelper` and
   `TurnLive` could both mount a `CombatProvider`. That is finding BB's exact
   shape — two models of one turn, and the one that persists wins. The tab must
   mount **one**, and the slice that switches it must measure `codex-combat-*`
   across a real reload, as slice 10b did.
2. **A capability lost silently.** Two of them are already invisible on his sheet.
   The do-not-lose table above is pinned as tests **before** anything is retired —
   which is precisely how table-truth slice 9 retired three menus and took
   reachable options from 6 of 14 to 14 of 14 instead of down.
3. **The metric passing by luck.** `measure-today.mjs` is the instrument and it
   must be run against the *pre-change* build first, so the after-number has a
   before-number taken the same way. A proof that passes on its first run is not
   evidence until it has been shown able to fail.
4. **`_probe-d.mjs` reported furniture 0 and was wrong** — it counted only
   `position: fixed|sticky`, and D's chrome is flex siblings of the scroller.
   Caught by looking at the screenshot, fixed in `_probe-d2.mjs`. Recorded because
   it is HANDOFF §4's third law live: *a probe that can see the broken case but
   not the working one reports every working case as broken.*

---

## ⚠ AMENDED 2026-09-04 — THE CONTENTION BRACKET IS REVERSED

**Backtracking rule. Raised by Marcus, reproduced before anything was changed,
ruled by him the same day.** His words:

> "I cannot see the full available list of spells and abilities under Action,
> Bonus, Reaction, etc unless and until I click on those buttons in the other box
> at the bottom of the screen. When I expend that action and it's no longer
> available, that's when I can see the full list. This is backwards."

He is right, and the cause is this gate's own defining element.

### What the screen actually does, measured

`_repro-marcus.mjs` reads the same combat tab twice on his real level-7 export,
changing exactly one thing — whether the Action is spent:

```
  Action: 2 rows available -> 7 rows when spent   <<< BACKWARDS
  mutex boxes: 1 when available -> 0 when spent
```

With the Action **open**, the Action band holds The Dawn Guardian and Hearthfire
Manifest and says **"2 ready"**. Bless, Burning Hands, Faerie Fire, Scorching Ray
and Warding Bond are not in it. They are in a box below everything else headed
*"One of these — your action · pick one"*. Spend the Action and all five return
to the band, greyed. **The band advertises 2 of the 7 things he can do, at the
one moment he can still do them.**

### Why — the mechanism, in three lines

```js
// contention.ts:52   — only AVAILABLE options are ever bracketed
if (!option.available) continue
// contention.ts:77   — and being bracketed marks them
for (const face of faces) face.contended = true
// compose.ts         — and being marked removes them from the lists bands read
const loose = everything.filter(o => !o.contended)
```

`groupBySlot` builds the bands from `ranked` + `rest`, both derived from `loose`.
So *availability is the trigger for removal*. The inversion is not a rendering
accident downstream of the rule — **it is the rule**, stated exactly once, and
the deeper the option's availability the more certainly it is hidden.

### What was right about it, and is kept

The reasoning in `contention.ts`'s header stands and is not being thrown away:
five options wanting one bonus action **is** one decision with five faces, and
listing them as five equal rows is a lie about the rules. That claim was never
the defect. **Relocation was.** The bracket answered a true question by moving
things, and moving them out of the place he looks is what made a true statement
read as a missing feature.

### The amendment — annotate in place, never relocate

**His ruling, 2026-09-04:** the bracket becomes an **annotation inside the band**.

1. **`compose.ts` stops filtering on `contended`.** The lists become `everything`.
   An option's home is its band, unconditionally and in both states.
2. **`findContention` keeps running and keeps marking.** `contended` stays on the
   option, and stays meaningful — it now means *"say so on this row"* rather than
   *"remove this row"*. The groups it returns keep their `reason`, which is the
   part that carries the teaching.
3. **The contention sentence renders at the foot of the band it belongs to**, not
   below the whole screen. The Action band's five slot-spenders sit in the Action
   band and are followed by the note that says they compete.
4. **`Mutex` as a bottom-of-screen element is retired**, and with it the last
   place on this screen where an option lives somewhere other than under the
   heading naming its price.

### What this costs, named

- **"No option is listed twice" survives, and matters more, not less.** Faces are
  annotated where they already are, so nothing is duplicated. The `compose.test.ts`
  assertion is kept; what changes is the assertion that contended options are
  ABSENT from `ranked`/`rest` — that one was encoding the defect and it goes.
- **`bands.ts`'s "NOTHING IS DROPPED" property gets stronger.** It was previously
  a claim about the two lists only, explicitly disclaiming the mutex faces (see
  its own header). After this it is a claim about **every option the engine
  composed**, which is what a reader always assumed it meant.
- **The bands get longer, and that is the point.** Gate 1 was re-ruled on
  2026-09-02 to *"I'm fine with having to scroll"*. A band that scrolls and is
  true beats a band that fits and is not.
- **`readyCount` becomes correct as a side effect.** "2 ready" on a band holding
  seven takeable things was the same bug wearing a numeral.

## ⚠ AMENDED 2026-09-04 — EXTRA ATTACK

**Second defect, raised in the same message, unrelated cause.** *"It also doesn't
allow me to take my two melee attacks."*

`demandOfWeapon()` (`rules-2024/economy.ts:95`) returns a flat `{ slot: 'action' }`
for every weapon, under a header that defers the question:

> *"the two-weapon-fighting bonus action, Extra Attack, and the Nick mastery ...
> are all questions about how many attacks one Attack action contains — that is
> contention, and it belongs to Slice 5, not to 'what slot does swinging a sword
> want'."*

Slice 5 built `rank.ts` and contention. **It never picked this up.** Nothing in
`src/` models attacks-per-action, so one swing closes the whole Action, and Nix —
a level 7 Paladin, two attacks since level 5 — gets one.

**It is derivable without touching his sheet.** His export's `features` array
lists only Divine Smite, Hearthfire Manifest and the two auras; Extra Attack is
not in it. But canon already knows it as a base Paladin feature in
`paladin-progression.json` (asserted by `lookup.test.ts:164`), and the sheet
carries `class: 'Paladin'` and `level: 7`. So the count comes from **class +
level, with the sheet's own features as an override** — homebrew keeps the right
to disagree, which is the standing rule for this app.

### The model — the Action is held, not spent

**His ruling, 2026-09-04:** taking the Attack action does not close the Action
until every attack it contains is swung.

- `attacksPerAction(character) -> number` — a new pure rule, class+level, sheet
  overrides, **defaults to 1** for anything it does not recognise.
- `CombatState` gains **`attacksUsed?: number`**, read defensively like every
  other field on it, because that object round-trips localStorage and a state
  written by today's build must load in tomorrow's.
- While `0 < attacksUsed < N` the Action slot stays **open**, and **only weapon
  attacks are legal in it**. Everything else in the Action band greys with a
  reason that names the true cause — *"You are taking the Attack action"* — not
  the false one, *"your action is spent"*, which is the failure this whole phase
  exists to end.
- When `attacksUsed` reaches N, `turnActions.action` becomes `true` and the band
  closes as it does today.
- **End turn and Undo reset it**, on the same path that resets the four booleans.

### Data

No new storage key. `codex-combat-<id>` gains one optional numeric field, absent
until the first swing of a multi-attack turn.
