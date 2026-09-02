# Status: Held Reaction — the reactions that never fire

Phase 4 of the Codex work. Phase 1 `docs/plans/table-truth/` (closed, deployed),
phase 2 `docs/plans/sheet-truth/` (closed, deployed), phase 3
`docs/plans/grimoire/` (closed 2026-08-30, **not** deployed). Two standalone
repairs are also closed: `docs/plans/toybox-ai/` (item 1), `docs/plans/slot-truth/`
(item 4).

**The folder is `reactions/` and the phase is called Held Reaction.** In play, a
held reaction is one you have readied and not yet released. That is precisely
what the app is doing to Marcus: he owns three reactions, the app knows all three,
and it releases none of them.

- Gate 1 — Product: **APPROVED 2026-08-30** — `01-product.md`
- Gate 2 — Architecture: **APPROVED 2026-08-30** — `02-architecture.md`
  - Marcus ruled least-confident decision 2 himself: **ask** for the source of
    hand-typed temp HP. Do not infer it, even when there is only one candidate.
- Gate 3 — Program Design: **RE-APPROVED 2026-08-31** (reopened at slice 6;
  first approved 2026-08-30) — `03-program-design.md`
  - Browser checks **A** and **D** were written against an app that did not exist
    yet, and slice 6's first act was to measure rather than to trust them. Both
    were wrong. A named Interception as the band's fourth row; the fourth row is
    **Opportunity Attack — The Dawn Guardian**, and Interception is nowhere on the
    combat tab. D looked for a provenance marker on the canon-worded rows; the
    marker is negative — "your own" appears on *sheet*-worded ones — so D as
    written could not have failed. Restated, D **failed**: both Sentinel sheets
    carried canon's text under "your own". Corrections and the measurements behind
    them are in `03-program-design.md` § "A and D were rewritten at slice 6".
  - **Marcus's rulings on the reopening, 2026-08-31.** On D: *fix it now as slice
    5b* — shipped and proved below. On Interception: *leave it as an open item
    this phase* — the picker exists and is proved; the gap is the missing prompt,
    which is a UI job belonging with the "Your Turn" consolidation, not with
    reactions plumbing. Gate 3 is approved as corrected on both counts.
- Gate 4 — Slice plan: **APPROVED 2026-08-30** — `04-slices.md`

## Slices

- [x] **Slice 1 — tracer bullet: the cloak becomes a Reaction.** Closed 2026-08-30.
- [x] **Slice 2 — Sentinel becomes playable.** Closed 2026-08-30.
- [x] **Slice 3 — the retaliation arms, by the engine road.** Closed 2026-08-30.
- [x] **Slice 4 — the road he actually walks.** Closed 2026-08-30.
- [x] **Slice 5 — the DM's number.** Closed 2026-08-31. Needed code after all.
- [x] **Slice 5b — the tag says whose words they are.** Closed 2026-08-31.
      Unplanned; opened by slice 6's measurement, ruled by Marcus.
- [x] **Slice 6 — the phase proof.** Closed 2026-08-31. **S · A–H all green.**

## Marcus's items this phase closes

| item | his words, short |
|---|---|
| 7 | "i dont think the hearthfire manifest reaction (retaliation with fire damage) is working" |
| 8 | "it doesnt seem to have all of my available reactions … hearthfire manifest, sentinal, and interception" |

**Corrected 2026-08-31 at slice 6, by measurement.** The line here used to read
"Interception was delivered in phase 3 and is already on the combat tab." The
first half is true; the second is not, and it contradicted this file's own open
item at § "Carried out of this phase". `measure-slice6.mjs` on his real sheet:
the band paints four rows and **none of them is Interception** — the word does
not appear anywhere on the combat tab.

What phase 3 delivered is the **picker and the wire**, both pinned on his real
sheet by `fighting-style.test.ts`: with no style recorded the engine offers no
Interception row, and `recordFightingStyle(nix, INTERCEPTION)` produces exactly
one, costing a Reaction, available, carrying canon's 1d10 and canon's trigger.
What is missing is the **answer**: nothing has ever asked him which Fighting
Style he took, so his stored sheet records none. Item 8 is therefore two-thirds
this phase's (Hearthfire, Sentinel) and one-third a single tap he has not been
prompted to make. That tap is an open item below, not a closed one.

This phase owes him the other two, **and it owes Sentinel as playable** — his
words on 2026-08-30: *"sentinal has to be playable, just remember. Perhaps it
is."* It is not. Measured below.

## Why this phase comes before the "Your Turn" consolidation

Items 5, 6, 10 and 11 are a layout problem: three modules and a sticky bar that
must become one. Items 7 and 8 are an engine problem. Consolidating first would
mean arranging boxes around reactions that do not work, then reopening the boxes
to fix them. Fixing the engine first means the consolidation is honest layout
work over a correct engine. **The engine fixes also survive the consolidation
untouched**, because none of them is in a component.

---

# The measurement that opened this phase

`docs/plans/reactions/measure-before.mjs`, run against **his real exported sheet**
(`codex-nix-lvl7 (2) (1).json`), not the `nix.ts` fixture. That distinction is
load-bearing and is the first thing this phase got wrong: the fixture carries
`feats: []`, so every claim about Sentinel measured against it is a claim about an
empty array. A prior session recorded "`featReactionOptions(nix)` → 0 rows" as a
finding about text provenance when it was, at that moment, a finding about a
fixture with no feats. **Both turned out to be true, but only one had been
measured.**

```
── 1. What economy does the app give each of his features?
  Divine Smite         sheet.actionType=null  → app says "action"   canon known: NO
  Hearthfire Manifest  sheet.actionType=null  → app says "action"   canon known: yes
  Aura of Protection   sheet.actionType=null  → app says "action"   canon known: yes
  Aura of Solace       sheet.actionType=null  → app says "action"   canon known: yes

── 2. The reactions band, as it paints today
  1 row(s)
   · Opportunity Attack — The Dawn Guardian  [Reaction]

── 3. Sentinel — why it produces nothing
  Sentinel:  sheet effects: 3, reaction-shaped: 0
             canon effects: 3, reaction-shaped: 2
             effectSentencesOf picked 3 sentence(s) from THE SHEET
  featReactionOptions → 0 option(s)

── 4. Hearthfire retaliation — is the die reachable at all?
  retaliationOf(canon) → {"notation":"1d10","dieType":10,"damageType":"Fire", …}
  his tempHP=0 tempHPSource=null
  activeRetaliation(him) → null

── 5. Where the cloak actually sits in his turn
   · Hearthfire Manifest  slot=action  label="Action"  grantsTempHP=none
  (turn has 10 options; 1 costs a reaction)
```

## One cause, three faces

**The app fills the sheet's silences with defaults instead of with canon.** Every
one of the three faults is a default that cannot be told apart from a real answer
— the same shape as finding BQ and the `vitals.ts:195` twin.

| # | where | the silence | what the app does with it | what canon says |
|---|---|---|---|---|
| F1 ✅ | `combat-state.ts:19` `featureActionType` | his features carry no `actionType` | **defaults to `'action'`** | the cloak is a **Reaction**; summoning is a Bonus Action |
| F2 ✅ | `turn/feats.ts` `effectSentencesOf` | his Sentinel's `effects` hold three *marketing bullets* | `own.length > 0` ⇒ "the sheet spoke", canon shut out | canon's Sentinel has **2 reaction-shaped clauses** |
| F3 ✅ | `HPTracker.tsx:213`, `StatsBar.tsx:142` | hand-typed temp HP | `setTempHP(character, amount)` — **no source** | the cloak's temp HP is what arms the 1d10 |

F3's **engine road opened in slice 3** and its **UI road** — the Temp button he
actually uses at the table — **opened in slice 4**, which asks him what granted
the pool instead of guessing. Both roads closed; all three faults fixed.

### F2 in his own data

His importer wrote a feat guide's *"who should take this"* section into the
mechanical field:

```
Sentinel.effects = [
  "Polearm Master (OA when enemies enter your 10 ft reach)",
  "Reach weapons (Glaive, Halberd) for a massive control zone",
  "Fighters, Paladins, and other frontliners who want to lock enemies down"
]
```

None of those is a rule. Worse, his `description` carries only **two** of
Sentinel's three clauses — the Opportunity-Attack rider and the Disengage rider.
**The actual reaction is not on his sheet at all.** Canon is the only place it
exists:

> *"When a creature within 5 feet of you attacks a target other than you, you can
> take a Reaction to make one melee attack against the attacker."*

So "Sentinel has to be playable" cannot be satisfied from his sheet. It can only
be satisfied by letting canon fill a silence — which is what the app already
believes it does.

### F3 has both roads closed

`activeRetaliation` needs three facts at once: `tempHP > 0`, a `tempHPSource`, and
that source naming a feature carrying a free die. There are two ways to set the
source and neither reaches him:

- The **engine** road (`reduce.ts:319`) sets it correctly — but only if the cloak
  is a reaction *option* he can take, and F1 has made it an Action with no temp-HP
  grant.
- The **UI** road (the HP tracker's Temp button, the one he actually uses at the
  table with physical dice) passes no source at all.

So the retaliation prompt is unreachable for him by construction. The engine for
it — `retaliation.ts`, `RetaliationCapture.tsx`, the tally, the undo — is complete
and tested and has never once had data.

## The law this phase is built on

> **Canon fills a silence. A silence is a missing FACT, not an empty field — and a
> default is not an answer.**

Stated as the negative, which is what the code must enforce: *nowhere may the app
substitute its own guess for a fact canon holds, in a way that a reader cannot
tell apart from the real thing.*

This does not overturn the open-world rule; it is that rule's other half.
Recognise a shape, never a name — **and when the shape is absent, say so or ask
canon, never invent.**

## What must NOT change

- **The sheet still wins where it genuinely speaks.** A homebrew feat named
  "Sentinel" that does something else must keep its own text. The fix is not
  "canon wins"; it is "an empty field and three sentences that state no rule are
  the same amount of rule."
- **`src/lib/turn/options.ts` is pinned BYTE-IDENTICAL** by `overlay.test.ts` case
  15. Reaction work goes in the composer, per the ruling at `compose.ts:389`.
- **`vitals.ts` reports and never corrects.** Nothing here may start editing his
  sheet. Every fix below changes what the app *reads*, never what it *stores*.

---

# Slice 1 — closed 2026-08-30

**What shipped.** `src/lib/turn/faces.ts` (new) splits a canon feature's prose
into the abilities canon prices separately; `overlay.ts` carries them as
`canonFaces`; `compose.ts` mints one option per face. `trigger.ts` gained one
export, `readsAsTrigger`, so the "does this read as a trigger" shape keeps one
owner. **`economyFromFeature` was not changed** — its refusal is correct, and it
is now pinned as correct rather than worked around.

**The number.** His reactions band, measured on his real export:

```
before:  1 row    · Opportunity Attack — The Dawn Guardian
after:   2 rows   · Hearthfire Manifest  [Reaction]
                    when: "When you are hit by a melee attack, the creature
                           takes 1d10 Fire damage in retaliation."
                  · Opportunity Attack — The Dawn Guardian
```

and his turn went from 10 options to 12 — Hearthfire Manifest now composes three
times: the sheet's own row (Action), the summon (Bonus Action) and the cloak
(Reaction). Section 5 of `measure-before.mjs` prints all three.

## The thing this slice found that Gate 3 did not predict

**The fixture had already done the split by hand, and that is why the first run
broke 14 assertions.** `nix.ts` carries TWO features — "Hearthfire Manifest"
declared a Bonus Action and "Flaming Cloak" declared a Reaction — and both names
resolve to the one canon record through slice 6's alias index. Emitting faces
there produced a second Reaction row for an ability that already had one: the
exact "cannot be told apart from the real thing" fault this phase exists to
remove, committed by the fix for it.

The answer is not a special case. The composer now builds, before it mints any
face, the set of *(canon id, bucket)* pairs the sheet's own rows already occupy,
and a face whose bucket is taken is not minted. Keyed on the **canon id**, never
the name — which is what makes it work on a sheet where the two halves were
given two different names by hand. All 14 assertions went green with no test
edited, which is the evidence that the rule is the real one and not a patch
shaped like the fixture.

**A law for HANDOFF §4, and it cost a day of this slice to learn:** *a fixture
that models the sheet after the repair cannot show the fault.* `nix.ts` is a
hand-split sheet; his export is not. Slice 2 onward keeps measuring against the
export.

## Proof

| what | result |
|---|---|
| `faces.test.ts` | 17 cases, green |
| `compose.faces.test.ts` | 10 cases on his sheet's shape, green |
| whole suite | **1299 passed / 58 files / 7 skipped** (was 1272 / 56) |
| `tsc -b --noEmit` | exit 0 |
| `measure-before.mjs` | band 1 → 2 rows; cloak slot `action` → `reaction` |
| `prove-slice1.mjs` — on the built app, his real export, 390×844 | **A B C D E all PASS** |

**On the glass** (`docs/plans/reactions/_shots/slice1-band.png`), the band now reads:

```
YOUR REACTIONS                                    2 ⌃
  Hearthfire Manifest                        Reaction
  WHEN you are hit by a melee attack, the creature takes
       1d10 Fire damage in retaliation.
  10 temp HP · 1d10 Fire retaliation (free)
  ⚑ Canon lists 4 errata on this feature
  [ +1D10 RETALIATION ]                      none yet
  Opportunity Attack — The Dawn Guardian     Reaction
  …
```

Two things the probe found that no unit test could. First, the row arrives with
the **retaliation button already on it** — `reactionRows` has always attached
`retaliationOf(canon)`, so the moment the row existed the button existed. Slice 3
is now only about arming it, not about building it. Second, `ReactionRow` lifts
the clause's lead word into a small-caps label, so canon's sentence reads "WHEN
you are hit…" on screen. Check C compares the WORDS, case-insensitively, and is
exact about everything else — a typographic choice made in slice 6 is not this
slice's to re-litigate, and asserting the bytes would have made the probe fail
for a reason it is not about.

**Falsified twice, both pre-declared.**

1. `facesOf`'s `faces.length < 2` refusal relaxed to `< 1` → 2 cases red
   ("refuses rather than returning one face", "does not fire on a cost word that
   prices nothing of yours"). Restored, green.
2. The slice's own micro-revert — `canonFaces` dropped at the overlay → **5
   cases red and the band back to 1 row**, measured, not assumed. Restored, green.

## Carried into slice 2

- `tempHPGrantOf`'s header comment already asserts "Hearthfire Manifest composes
  as TWO options that share one canon feature" — written against the fixture,
  true of the app only as of today. It stays until slice 3 rewrites that gate.
- `grantsTempHP` is still `none` on all three of his rows. That is slice 3, and
  it is the `resourcePoolId` gate, exactly as Gate 2 predicted.

---

# Slice 2 — closed 2026-08-30

**What shipped.** One rule changed in `src/lib/turn/feats.ts`:

```
before:  own.length > 0            → "the sheet has spoken"
after:   own.some(isReactionShaped) → "the sheet has spoken"
```

`effectSentencesOf` now returns `{ sentences, from }` instead of a bare array,
`featReactionOptions` returns `FeatReactionOption[]` carrying `wordsFrom`, and
`overlay.ts` learned the third canon index — `featByName`, which it had never
consulted — so a row whose every word came out of the book is marked
`provenance: 'canon'` instead of `'sheet'`.

**The number.** His reactions band, measured on his real export:

```
before:  2 rows   · Hearthfire Manifest
                  · Opportunity Attack — The Dawn Guardian
after:   4 rows   · Hearthfire Manifest
                  · Sentinel · takes the Disengage action
                      when: "When a creature within 5 feet of you takes the
                             Disengage action"
                  · Sentinel · attacks a target other than you
                      when: "When a creature within 5 feet of you attacks a
                             target other than you"
                  · Opportunity Attack — The Dawn Guardian
```

`featReactionOptions` went **0 → 2**, exactly as `04-slices.md` predicted, and
his turn went from 12 options to 14. **The second Sentinel row is the one that
answers his 2026-08-30 note "sentinal has to be playable"**: its rule exists in
one place in his world, and that place is not his character sheet.

## Why `own.some(isReactionShaped)` is the honest rule and not a loophole

The worry is obvious — it looks like canon getting a second chance to overrule
him. It is not, and the reason is the SCOPE of the function it lives in.
`effectSentencesOf` does not answer "what does this feat do". It answers "which
words state this feat's **reactions**". A sheet whose `effects` array holds a
buyer's guide has answered a different question, and an answer to a different
question is not an answer. Three sentences that state no reaction and an empty
array are the same amount of reaction — which is this phase's law, applied
where it was always meant to apply.

The guarantee is pinned in both directions and both are tested: one
reaction-shaped sentence among his bullets and canon is never asked, and the
whole array comes back as HIS; a hand-written Sentinel FEATURE (no `wordsFrom`
at all) still wins outright and still reads `provenance: 'sheet'`.

## Proof

| what | result |
|---|---|
| `feats.test.ts` | **46 cases** (was 29), green |
| whole suite | **1313 passed / 58 files / 7 skipped** (was 1299) |
| `tsc -b --noEmit` | exit 0 |
| `measure-before.mjs` | `featReactionOptions` **0 → 2**; band **2 → 4 rows** |
| `prove-slice2.mjs` — on the built app, his real export, 390×844 | **A B C D E all PASS** |

`prove-slice2.mjs` refuses to run three ways rather than pass weakly: no export
on disk, no `Sentinel` feat in it, or **his sheet having started to state the
attack rider itself** — in which case slice 2 has nothing to fill and should say
so instead of claiming a win. Check C strips commas from both sides and nothing
else, because cutting at its own comma is the one edit the pipeline is allowed
to make to canon's sentence; every other word must survive, in order.

**Falsified twice, and the second one is the stronger.**

1. The pre-declared micro-revert — `own.length > 0` put back → **7 cases red and
   the band measured back at 2 rows**, both Sentinels gone. Restored, green.
2. The overlay's third index inverted — `wordsFrom === 'canon'` changed to
   `=== 'sheet'` → **2 cases red in opposite directions**: the canon-worded rows
   lost their mark AND the homebrew row wrongly gained it. That is the marker
   proved to *discriminate*, not merely to be set. Restored, green.

## What this slice found, and it is a fault this slice CREATED

**The detail sheet now prints "your own" over canon's exact sentence.** Measured
on the built app, not reasoned about — open the «Sentinel · attacks a target
other than you» row and its header reads:

```
Sentinel                        your own        close ✕
```

Cause: `turn/detail.ts:205` passes `feat: null` unconditionally, so
`canon/bands.ts:194` computes `provenance: 'sheet'` — and `optionDetail` uses
`bands.provenance` rather than the option's own, which the composer has been
carrying correctly since this slice (`TurnOption.provenance`, `types.ts:135`,
set at `compose.ts:517`). Before today this branch was harmless because Sentinel
produced no rows at all; making it playable is what turned it into a lie.

It is **one line** in `turn/detail.ts:215` — prefer `option.provenance` when it
says `'canon'` — and it does **not** break the pin at `bands.test.ts:163`, which
asserts only that `detail.ts` contains exactly one `feat:` and that it is
`null`. It is nevertheless outside slice 2's approved scope, so it is recorded
here rather than smuggled in, and it is the first candidate for a re-steer.

## Carried into slice 3

- `Lucky` also now reads its sentences from canon rather than from his three
  stored bullets, and yields **0 reaction rows** — correct, and worth noting as
  the negative case measured on his real sheet rather than argued for.
- **Interception is not in his band.** His export carries two feats, Sentinel and
  Lucky; Interception reaches him as a Fighting Style through
  `src/lib/prepare/fighting-style.ts`, which is where phase 3 delivered it. Item
  8 asks for all three reactions on the combat tab. Slice 6 is the phase proof
  and this is the gap it will have to answer.
- `docs/plans/reactions/_probe-detail-tag.mjs` is a throwaway that produced the
  "your own" finding above. It joins the four phase-3 scratch artefacts awaiting
  Marcus's word before deletion.

---

# Slice 3 — closed 2026-08-30

**The retaliation arms.** Item 7 — *"i dont think the hearthfire manifest
reaction (retalition with fire damage) is working?"* — was correct, and the cause
was one line.

## What shipped

`src/lib/turn/compose.ts` · `tempHPGrantOf`

```
before   if (cost.resourcePoolId === undefined) return undefined
after    const priced = grantingFaceEconomy(featureByName(option.name))
         if (priced !== undefined && cost.slot !== priced) return undefined
```

plus the new `grantingFaceEconomy` + `GRANTS_TEMP_HP` above it. Nothing else in
`src/` changed.

## Why the old gate refused everything he owns

Slice 10d separated the rows by asking *"does this option pay a resource pool?"*.
On `nix.ts` that works, because the fixture's hand-split **Flaming Cloak**
declares `usesPerRest`/`usesMax` and so derives a pool. His real export is not
that sheet. Measured:

```
his Hearthfire Manifest record, verbatim:
  { name, level: 3, description: "<one paragraph>" }      ← no actionType, no uses
his resourcePools: []
```

So no row of his ever derived a pool → no row ever granted → `tempHPSource` was
never set → `activeRetaliation` returned null on every damage entry → the prompt
component had **never once received data**.

This is slice 1's law biting a second time: *a fixture that models the sheet
after the repair cannot show the fault.* The pool was a property of the
fixture's hand-split, not of the rule.

## Why the replacement is a shape and not a deletion

Deleting the gate outright would have been wrong. His one feature composes as
**three** rows, and all three carry the same canon record:

| row | slot | where the slot came from | grants? |
|---|---|---|---|
| Hearthfire Manifest | action | `featureActionType`'s **default** (F1's leftover) | no |
| Hearthfire Manifest | bonusAction | canon's summon face (slice 1) | no |
| Hearthfire Manifest | reaction | canon's cloak face (slice 1) | **10** |

A bare deletion grants on all three and hands him 30.

The replacement asks canon which of its own priced faces states the grant.
Exactly one of Hearthfire's two faces says *"grants you Temporary Hit Points"*;
it is the Reaction. So that face's economy is the slot a row must sit in to
carry the grant.

**Why not read the ROW's words.** Because his words say everything on every row.
His whole feature is one paragraph that restates both faces, so the base row's
own description contains *"gain Temporary HP equal to Paladin level +
spellcasting ability modifier"* — a rule keyed on the row's text would grant
there too. Canon's sentence split can tell the rows apart; his prose cannot.
`compose.temphp.test.ts` pins exactly this case.

**Why the base row is refused, stated as the phase's law.** Its Action slot is
the app's own guess. *A default is not an answer* — and a guess does not get to
be the thing that hands out hit points.

Still **shape, never a name**: nothing added says "Flaming Cloak" or
"Hearthfire". `GRANTS_TEMP_HP` matches a granting verb reaching *temporary hit
points* **inside one sentence** — which is what separates

```
"The cloak immediately GRANTS YOU Temporary Hit Points equal to …"   ← a grant
"This effect lasts until the Temporary Hit Points are depleted."     ← not one
```

both of which are in the same face. `[^.]*` cannot cross a full stop, and that
is the whole mechanism.

## The number is HIS

```
canon's formula      "Paladin level + Charisma modifier"
canon's worked example   11   (level 7, CHA 18)
the nix.ts fixture       12   (level 8, CHA 18)
MARCUS                   10   (level 7, CHA 16)
```

Ten appears nowhere in canon and nowhere in the app. It is arithmetic run
against his sheet, which is the only evidence that the formula ran at all.

## Proved by

| | what | result |
|---|---|---|
| unit | `compose.temphp.test.ts` 11 → **19 cases** | green |
| suite | whole repo | **1321 passed**, 7 skipped, 58 files |
| types | `tsc -b --noEmit` | clean |
| measured | `measure-slice3.mjs` on his export | 3 rows, `grantsTempHP` = none / none / **10** |
| browser | `prove-slice3.mjs` A–E on his export, 390×844 | **ALL PASS** |
| shot | `_shots/slice3-retaliation-prompt.png` | the prompt, on screen |

Browser checks: **A** the cloak's Reaction row offers a Spend · **B** spending it
paints `+10 temp` on the tracker · **C** logging damage taken then offers
`Hearthfire Manifest — roll 1d10 retaliation?` with Yes/No · **D** slices 1 and 2
still hold (4 rows, Sentinel twice) · **E** clean console. Rows and badges are
read **geometrically**, never by `textContent` — finding Q.

The prover **refuses to run** rather than pass vacuously if his export is
missing, if his sheet has started to declare the cloak itself, or if he is
already standing in temp HP.

## Falsifications — three, and they fail in three directions

1. **The pre-declared micro-revert** (`04-slices.md`: *"restore the
   `resourcePoolId` gate. The prompt must not appear."*). Restored it →
   **3 unit cases red**, including the item-7 end-to-end. Rebuilt and re-ran the
   browser prover: `FAIL B` (no temp HP badge) and **`FAIL C · NO PROMPT — the
   retaliation did not arm`**, exactly as the slice plan predicted. Restored.
2. **Neutralise the face constraint** (`grantingFaceEconomy` → always
   `undefined`) → **6 cases red in the OPPOSITE direction**: the free Bonus
   Action face granted, the base row granted, and the fixture's summon granted.
   The doubling bug, appearing on cue. Restored.
3. Both together are what make the rule *discriminating* rather than merely
   permissive: remove the untying and the grant vanishes; remove the shape and it
   doubles.

## Carried into slice 4

- **`grantsTempHP` still comes only from the engine road.** Marcus's own road is
  the Temp HP button, and it still passes no source — that is slice 4, and his
  own ruling stands: **ask, never infer**, even with one candidate.
- **Two `+10 temp` badges paint at once** (the prover measured both). That is
  item 10's *"the app displays my hit points in like 3 different locations"*,
  measured rather than asserted. Layout phase, not this one — recorded here so
  the consolidation has a number to work from.
- The **phantom 3rd-level spell slot pips** are visible in this slice's
  screenshot. Item 4, `docs/plans/slot-truth/` — still open, unchanged.
- Still open from slice 2, untouched: the **"your own"** detail-sheet tag (one
  line at `turn/detail.ts:215`), and **Interception absent from his band**.
- `docs/plans/reactions/measure-slice3.mjs` and `prove-slice3.mjs` are keepers —
  slice 6 re-runs the provers. `_probe-detail-tag.mjs` and the four phase-3
  scratch artefacts still await his word before deletion.

---

# Slice 4 — closed 2026-08-30

**"The road he actually walks."** Item 7's other half, and the one Marcus is
standing on.

## What shipped

| file | change |
|---|---|
| `src/lib/rules-2024/temp-hp.ts` | **new** `grantedTempHP(feature, ctx)` and `tempHPGrantors(character, ctx)` |
| `src/lib/turn/compose.ts` | `tempHPGrantOf` now calls `grantedTempHP` — one reader for one fact |
| `src/components/combat/TempHPSource.tsx` | **new.** The question, its chips, and `Don't know` |
| `src/components/HPTracker.tsx` | `tempSource` state · the picker in the temp branch · `setTempHP(character, amount, tempSource)` |
| `src/components/combat/StatsBar.tsx` | the same question on the other HP surface |
| `src/components/combat/TempHPSource.test.tsx` | **new**, 12 cases |
| `docs/plans/reactions/prove-slice4.mjs` | **new** browser prover, checks F1 · F · G · E |

Suite 1321 → **1333** (+12), 58 → 59 files, `tsc -b --noEmit` clean.

## Why there was a second road at all

Slice 3 opened the **engine** road: take the cloak from its reaction row, the
composer sizes the pool, `reduce.ts:319` writes the source, `activeRetaliation`
arms. Proved, and still true.

It is not how he plays. Item 9, his words: *"i most often use my physical dice to
roll at the table and prefer physical dice."* A player rolling his own dice types
his own numbers — Temp HP, a number, Apply — and down that road the app had an
amount and no source. `tempHPSource` is the whole of how `activeRetaliation`
knows the cloak is up, so on his road the retaliation could not arm no matter how
correct slice 3 was.

The old line said so out loud, and was honest about it:

```ts
// No source: a number typed by hand came from somewhere the app cannot
// see, and naming the wrong feature is worse than naming none.
updated = setTempHP(character, amount)
```

Both halves of that comment are still true. What was missing is that there is a
third option beside guessing and staying silent: **ask**.

## His ruling, and the test that holds it

Nix has exactly **one** feature canon says grants temporary hit points. Filling
it in automatically would pass every check that only tests the arming — and
Marcus was asked at Gate 2 for precisely this case and answered **ask, never
infer**. So the interesting assertion in this slice is not F. It is **G**:

> hand-typed temp HP with **Don't know** left alone → logging damage offers
> **nothing**.

G is the half that proves the app is not guessing, and falsification 2 below is
the design he rejected, failing exactly on G and nowhere else.

`Don't know` is the **default**, is a real selectable answer, and is true most of
the time — the 7 he typed may be a potion, an ally's Inspiring Leader, or a DM
ruling. A required question at the table is a question that gets answered wrongly
to make it go away, and a wrong answer here arms a 1d10 he does not have.

## Why the list is derived, never typed

`tempHPGrantors` returns names it has just resolved through `featureByName` —
the same call `activeRetaliation` makes on the way back out:

```
tempHPGrantors → he picks "Hearthfire Manifest"
  → setTempHP(character, 7, "Hearthfire Manifest")
    → activeRetaliation → featureByName("Hearthfire Manifest") → 1d10 Fire
```

The round trip cannot lose the answer he gave. A free-text field could, silently.

And `grantedTempHP` is now the **single reader** of canon's `tempHP` fact:
`compose.ts` calls it to SIZE the grant, `tempHPGrantors` calls it to decide what
to OFFER. Two readers would eventually disagree, and the way they would disagree
is the app offering a source that then arms nothing — a question whose answer
does not work, which is worse than not asking.

A grantor is **not** the same thing as a retaliation. Inspiring Leader grants
temp HP and carries no die; it belongs on the list anyway, because HEARTH-04's
replacement warning has to be able to NAME the pool it is about to destroy. Being
nameable is what all sources have; arming is a consequence only some have.

## The proof

`node docs/plans/reactions/prove-slice4.mjs`, his real export, 390×844, one build.

| check | what it drove | result |
|---|---|---|
| F1 | Temp HP → the question paints: chips `["Don't know","Hearthfire Manifest"]`, pressed `["Don't know"]` | PASS |
| F | pick the cloak, type **7**, Apply → `+7 temp` → log 5 damage → *"Hearthfire Manifest — roll 1d10 retaliation?"* | PASS |
| G | reload, type **7**, leave `Don't know` → `+7 temp` → log 5 damage → **nothing offered** | PASS |
| E | console clean across both runs | PASS |

**7 and not 10, on purpose.** Canon computes 10 for him (level 7 + CHA mod 3).
A prover that typed 10 could be satisfied by slice 3's engine road having run
behind its back; 7 is a number nothing in the app can produce on its own. The
prover refuses to run if `TYPED` ever equals the canon number, along with the
three refusals it inherits from slice 3.

## Falsified three ways, in three directions

1. **The pre-declared micro-revert** — drop the source argument at the call site,
   `setTempHP(character, amount)`. Rebuilt: **`FAIL F · NO OFFER — the
   hand-typed pool did not arm`**, with F1, G and E still passing. Exactly what
   `04-slices.md` predicted, and it fails alone, which is what makes F the
   assertion that carries the wiring.
2. **Infer the single candidate** — `tempSource ?? grantors[0] ?? null`, the
   design Marcus rejected. Rebuilt: **F still passes**, and **`FAIL G · OFFERED
   ANYWAY — the app guessed`**. The clever version is invisible to every check
   except the one written to catch it.
3. **`tempHPGrantors` returns `[]`** — **3 unit cases red**, and the picker
   correctly renders nothing at all, which is the empty-list behaviour proved
   green in the same file. A control that vanishes when it has nothing to say is
   right; one that vanishes when it does is this.

Together: 1 shows the answer must be *carried*, 2 shows it must be *his*, 3 shows
the list must be *found*.

## Carried into slice 5

- **Item 7 is now closed on both roads**, and F3 with it. The remaining
  retaliation work is the DM's tally — slice 5, expected to need no new code.
- **Two `+7 temp` badges paint at once**, again — the same measurement slice 3
  made, on a different number. Item 10, layout phase.
- Unchanged and still open: the **"your own"** detail-sheet tag
  (`turn/detail.ts:215`), **Interception absent from his band**, the phantom
  3rd-level slot pips (`docs/plans/slot-truth/`), and the five scratch artefacts
  awaiting his word before deletion.
- `prove-slice4.mjs` is a keeper — slice 6 re-runs every prover on one tree.

---

# Slice 5 — closed 2026-08-31

**The DM's number, and the door back out of it.**

## What the slice plan predicted, and what the screen said

`04-slices.md` wrote slice 5 as *"mostly proof — no new code expected"*, and the
reasoning was sound: `reduce.ts:507` accumulates, `revert` restores a whole
snapshot, and `retaliation.test.ts:245-265` already proved the hard case —
undoing the FIRST of three leaves the other two intact (`21 → 11, hits 2`).

`measure-slice5.mjs` measured the screen rather than trusting that, and found:

```
standing:    [{ label: "Record 1d10 Fire retaliation", text: "+1d10 retaliation" }]
tallyLines:  ["none yet", ...two false hits from the rules reference...]
undo:        []                       ← nothing. Not disabled. ABSENT.
```

`undoLast` was reachable from exactly one component, `TurnScreenD`, mounted only
behind the `D_PREVIEW` flag (`App.tsx:145`) — a screen Marcus has never opened.
So the engine could take back a mistyped 17 and the table could not.

**This is slice 1's law a third time.** *A thing that models the app after the
repair cannot show the fault.* In slice 1 it was `nix.ts`; here it was
`04-slices.md` itself. The prediction was made from the unit tests, and the unit
tests are green, and the feature was still missing from the only surface that
matters. Two of this phase's five slices have now been re-scoped by a
measurement that contradicted a document — which is an argument for measuring
first as a standing rule, not as this phase's quirk.

**Why it mattered more here than it would elsewhere on the tab.** Every other
number on the combat tab is DERIVED and can be recomputed. The tally is
EVIDENCE — a d10 came up 7 and somebody wrote it down — and Marcus types it by
hand (item 9: *"i most often use my physical dice to roll at the table and prefer
physical dice"*). A number that is typed can be mistyped, and a total whose whole
purpose is to be shown to the DM has to be correctable in front of the DM.

## What shipped

| file | change |
|---|---|
| `turn/CombatProvider.tsx` | `undoEntry: LogEntry \| null` on `CombatApi`; `undoLabel` now DERIVED from it |
| `combat/RetaliationCapture.tsx` | `onUndo` + `undoLabel` props; the control, beside the tally, standing-button only |
| `combat/ReactionRow.tsx` | passes both through |
| `combat/ReactionsBand.tsx` | passes both through |
| `CombatHelper.tsx` | `ReactionsBandLive` — the one gate that decides whether to offer it |

**One read of the log's last entry, two facts off it.** `undoLabel` used to be
`log[log.length-1]?.label`, read at the point of use. A second read for the event
type would have made it possible for the button to say *"Undo Divine Smite"*
while the gate beside it had decided the entry was a retaliation. Same discipline
as slice 4's `grantedTempHP`: one reader for one fact.

## The gate, and why it is the check this slice turns on

`undoLast` reverses the last entry of ANY kind — a spell slot, a pool point, a
turn ending. An Undo sitting beside a running fire total that silently takes back
a spell slot is **this phase's own fault in a new place**: the app showing him one
thing while it means another, in a way he cannot tell apart from the real thing.

So the band is handed the pair only when the entry at the top of the log IS a
retaliation:

```ts
const undoable = undoEntry?.event.type === 'retaliate' ? undoEntry : null
```

**By shape, never by name.** Not a search for the word "retaliation" inside
`entry.label` — the label is prose assembled from a feature name, and the
open-world rule this phase runs on says a feature name is the one thing we never
match against. `event.type` is a discriminant the reducer sets; the same fact,
held somewhere it cannot be reworded.

The falsification proved this is not a theoretical concern. With the gate
removed, the button beside the fire total read **"Undo Hearthfire Manifest"** —
the `takeOption` label — which is visually a prefix of the real one and would
have un-spent his Reaction instead of removing a hit.

## Proof — `prove-slice5.mjs`, his real export, 390×844, one build

| check | result |
|---|---|
| T1 · nothing recorded | `"none yet"` and no undo offered |
| T2 · record 7, 4, 10 | `TOTAL 21 Fire over 3 hits` |
| T3 · the undo names the last one | `Undo Hearthfire Manifest — 10 retaliation` |
| T4 · press it | `TOTAL 11 Fire over 2 hits` · now offering `— 4 retaliation` |
| T5 · record 5 | `TOTAL 16 Fire over 3 hits` — it moves BOTH ways |
| N · spend a non-retaliation | tally stands at 16; the undo withdrew |
| E · console | clean |

T4 is `retaliation.test.ts`'s undo-the-first-of-three claim, now made on glass:
the total came back to 11 over 2 hits, so the two the undo did not touch survived
it, and the label moved to the 4 rather than staying on the 10.

**The prover refuses (exit 2)** if his export is missing, if his sheet has begun
to declare the cloak, if the seeded encounter already carries a tally, or **if
the chosen amounts make any total reachable twice** — `[7,4,10] +5` passes
through 21 → 11 → 16, and the guard computes every total reachable by dropping a
different entry or by not undoing at all and refuses on a collision. Without it a
pass could not distinguish a working undo from a broken one.

`N` proves the spend LANDED (a `+10 temp` badge) before asserting the undo
withdrew. An N that passed because the Spend button did nothing would be testing
nothing at all.

## Three falsifications, three directions

1. **Pre-declared micro-revert** — drop `onUndo` at the call site:
   `FAIL T3 · no undo on the row`, `FAIL T4 · nothing to press`, and T5 giving the
   whole game away at `TOTAL 26 Fire over 4 hits` — the accumulation running
   straight through an undo that never happened. T1, N, E stayed green.
2. **Remove the honesty gate** (`undoEntry ? undoLast : undefined`): every T
   passed and **N alone failed**, `STILL OFFERING "Undo Hearthfire Manifest"`.
3. **Render on the label alone** (`{undoLabel && …}` instead of
   `{onUndo && undoLabel && …}`): the unit case *"paints nothing when the caller
   withheld the handler"* went red, 26/27.

> 1 shows the door must EXIST, 2 shows it must open onto the right room, 3 shows
> the control must refuse to paint when the caller has said there is no room.

## Measured on the way past, recorded not fixed

- Marcus's ONE feature composes as **four** buttons carrying
  `aria-label="Hearthfire Manifest — details"` — three faces in the lists above
  plus the reaction row. The prover's first N aimed at the first painted match
  and opened the wrong sheet. Not a fault (each face is a real, distinct thing he
  can do) but a fact any future prover must scope for: **band-scope the selector**.
- The two `+10 temp` badges are still there — item 10, now measured a third time.

## Carried into slice 6

Nothing is blocked. Slice 6 runs `prove-reactions.mjs` whole (A–H) on one tree,
one build, one viewport, plus the repo suite, `tsc -b --noEmit`, `npm run build`,
a served-bundle hash equal to a fresh `dist/`, and the check that **his stored
blob is byte-identical**. Suite at the close of slice 5: **1340 passing, 7
skipped, 59 files** (+7 on slice 4), `tsc` clean.

---

# Slice 5b — closed 2026-08-31

**The tag says whose words they are.** Not in the plan. Slice 6 opened by
measuring rather than by trusting `03-program-design.md`, the measurement found
check D was both wrong and hiding a live fault, and Marcus ruled: fix it now.

## The fault, as the screen showed it

`measure-slice6b.mjs` opens each of the band's four detail sheets and counts
painted `"your own"` leaves:

```
Hearthfire Manifest                          0
Sentinel · takes the Disengage action        1     ← canon's sentence, his mark
Sentinel · attacks a target other than you   1     ← canon's sentence, his mark
Opportunity Attack — The Dawn Guardian       1     ← correct; it IS his
```

The marker is **negative**: `OptionDetailSheet.tsx:143` paints "your own" only
when `provenance === 'sheet'`. So it cannot be checked by looking for it on the
canon rows — it has to be checked by its *absence* there and its *presence* on
his own weapon. Both halves, or the check proves nothing.

`overlay.ts:427` already names this exact harm, written in slice 2: *"the book's
words, over a mark that says they are his … the reason Marcus could quote a rule
at his DM believing he had written it."* Slice 2 fixed it at the row. The detail
sheet is one layer below, and that is where he actually reads the sentence
before he quotes it.

## Two judges of one fact

`overlay.ts:447` sets the ROW's provenance from `wordsFrom`. `detail.ts` never
read it — it recomputed the same fact through `canonBands`, which is handed
`feat: null` unconditionally, so a FEAT resolves as neither spell nor feature
and falls to `'sheet'`. The two judges agree on spells and features and come
apart on feats, which is the entire population of this bug.

```
before   provenance: bands.provenance
after    provenance: option.provenance ?? bands.provenance
```

**Why not pass the feat instead.** It is the obvious fix and it is wrong.
`bands.ts:194` would then take band 1 from `factsFromFeat` — Category,
Prerequisite, Ability Score — and replace the reaction's actual numbers with
feat trivia on a **combat** sheet. `bands.ts:150` says so in prose and
`bands.test.ts` pins it. The fix is to read the answer that already exists, not
to compute a third one.

`??` and not `||`: `'sheet'` is a real answer and must not fall through. An
option that carries no provenance at all — anything the open world hands us
that the overlay never touched — still gets `bands.provenance`, unchanged.

## Proof

| what | result |
|---|---|
| `detail.test.ts` | 20 → **25 cases**, green |
| whole suite | **1345 passed** / 59 files / 7 skipped (was 1340) |
| `tsc -b --noEmit` | exit 0 |
| `measure-slice6b.mjs` | Sentinel sheets **1 → 0**; the weapon still **1** |

The unit cases run against **his real export**, `it.skipIf(!real)`, and assert
`provenanceOfAll(name)` — *every* option of that name, not the first. The first
draft asserted against the screen's names and threw:

```
no reaction option named Sentinel · takes the Disengage action
  — options: Hearthfire Manifest | Sentinel | Sentinel | Opportunity Attack — …
```

The "· takes the Disengage action" suffix is built by the row model in
`reactions.ts` out of the trigger and is not on the option at all. **The
precondition case is what caught it**, which is the reason a precondition is
written first. Returning the whole list also means "one of the two Sentinels was
fixed" cannot read as a pass.

**Falsified twice, in opposite directions.**

1. The micro-revert (`provenance: bands.provenance`) → **1 case red**:
   `expected [ 'sheet', 'sheet' ] to deeply equal [ 'canon', 'canon' ]`. The
   other three stayed green — the fault is exactly where it was said to be.
2. The blanket fix (`provenance: 'canon'`) → **3 cases red**, including the
   pre-existing open-world case for a name canon has never heard of. That is the
   proof the fix is not "turn the tag off": his own weapon must keep its mark.

---

# Slice 6 — closed 2026-08-31 · the phase proof

**Nothing new is visible after this slice. It is the slice that says the six
before it are true at the same time**, on one tree, one build, one 390×844
viewport, against his real exported sheet.

## What slice 6 did before it wrote a line of prover

It measured. Two approved documents disagreed about what the proof should check,
and rather than pick one, `measure-slice6.mjs` read the screen:

```
rowCount: 4
"Hearthfire Manifest"                        WHEN you are hit by a melee attack…
"Sentinel · takes the Disengage action"      WHEN a creature within 5 feet of you…
"Sentinel · attacks a target other than you" WHEN a creature within 5 feet of you…
"Opportunity Attack — The Dawn Guardian"     WHEN a creature you can see leaves…
interceptionOnTab: []
sheet: { seeded: 1601f8ced8883a17, after: 1601f8ced8883a17, identical: true }
```

Both checks were wrong about the app. A named Interception as the fourth row;
the fourth row is the Dawn Guardian and the word Interception is nowhere on the
tab. D looked for a mark that is painted on the other kind of row. **Restated
against the measurement, D caught a live fault** — which is slice 5's lesson a
fourth time: *a thing that models the app after the repair cannot show the
fault.* Slice 1 it was `nix.ts`; slice 5 it was `04-slices.md`; here it was
`03-program-design.md` itself.

**The measurement had to be fixed before it could be trusted.** Its first run
reported no trigger text on any row. That was the measurement's fault, not the
app's: `ReactionRow` renders a stated trigger as `<p><span>WHEN</span> {rest}</p>`
where `rest` is a bare text node, and the leaf-walker skipped it — while the
*unstated* case renders `rest` as a `<span>` and would have been seen. A probe
that can see the broken case and not the working one reports every working
trigger as broken. Fixed by walking out from the lead span's parent.

## The proof — `prove-reactions.mjs`

```
PASS  S  his stored sheet is byte-identical after a full load — reported, never corrected
PASS  A  4 rows: ["Hearthfire Manifest","Sentinel · takes the Disengage action",
                  "Sentinel · attacks a target other than you",
                  "Opportunity Attack — The Dawn Guardian"]
PASS  B  all 4 triggers painted in canon's words, with area, topmost at their own point
PASS  C  2 rows, 2 distinct triggers, 2 distinct detail buttons
PASS  D  canon's words carry no "your own"; his own weapon still does — 4 sheets read
PASS  E  named the cloak for 7 temp; after damage: "Hearthfire Manifest — roll 1d10 retaliation?"
PASS  F  "none yet" → recorded 6 → "TOTAL 6 Fire over 1 hit" · offered the undo · after undo "none yet"
PASS  G  left "Don't know" alone for 7 temp; after damage: nothing offered, correctly
PASS  H  no errors or warnings
ALL PASS · shots in docs/plans/reactions/_shots/
```

| check | the item it answers |
|---|---|
| S | `vitals.ts` reports and never corrects — the whole phase's constraint |
| A B | item 8, two-thirds of it: Hearthfire and both Sentinels on the tab |
| C | *"sentinal has to be playable"* — two distinct rows, two triggers, two sheets |
| D | slice 5b: whose words he is about to quote at his DM |
| E | item 7 by **his** road — hand-typed temp HP, sourced by asking |
| F | item 9's half of the retaliation: the tally, and the door back out |
| G | the app is not guessing — the check that fails if it starts |
| H | nothing broke on the way |

**S reads localStorage after a full load and before anything is clicked.** The
claim is "opening the app does not rewrite his character" — the temp HP typed
later in E and G legitimately does change the sheet, and a check that forbade
that would be testing the wrong thing.

**The prover refuses to run (exit 2)** rather than pass weakly: no export on
disk, no Hearthfire feature, his sheet having begun to declare the cloak itself
(`actionType` or `usesMax` present), no Sentinel feat, or the clause table
lacking either kind of row — because with only canon-worded rows in it, D could
not discriminate.

**B failed on the first run, and it was the prover's fault.** All four rows
reported `topmost: false` with correct text and 10065px² of area. His band sits
at y≈882–1474 and the viewport is 844 tall, so every row was below the fold and
`elementFromPoint` returns null outside it. `readRows` now scrolls one card into
view at a time before measuring, and names what covers a row when one does.
That scrolling is not a workaround — it is the check. **Item 6's sticky bottom
bar is exactly the thing that could cover an otherwise perfectly rendered row**,
and the consolidation phase will need this probe to be able to see it.

## Falsified at both ends

A phase proof that has only ever been green proves the prover, not the app. Two
reverts, on the built app, each rebuilt and re-run whole:

1. **Slice 5b's line** (`provenance: bands.provenance`) → **D alone FAILED**,
   naming both Sentinel rows: `canon-worded, tagged "your own" ×1 (wanted ×0)`.
   S A B C E F G H all still green.
2. **Slice 2's silence rule** (`own.some(isReactionShaped)` → `own.length > 0`)
   → **A B C D all FAILED** and E F G H green. `A: 2 rows` — both Sentinels
   gone. This is stronger than predicted: reverting slice 2 does not merely
   change Sentinel's words, it **deletes the rows**, restoring item 8 exactly as
   Marcus reported it.

> 1 shows D is load-bearing and alone. 2 shows A, B and C are load-bearing
> together. Between them, every check that can fail has been seen to fail.

## The tree this was proved on

| what | result |
|---|---|
| whole suite | **1345 passed** / 59 files / 7 skipped |
| `tsc -b --noEmit` | exit 0 |
| `npm run build` | clean, 9.1s |
| served bundle vs fresh `dist/` | `assets/index-CxzM4EWl.js` · `1b4a91ef770b9f30` both sides |
| `prove-reactions.mjs` | S · A–H, ALL PASS |

The hash check is what makes "one build" a fact rather than a claim: the bundle
the prover loaded over HTTP is byte-identical to the one on disk, so no stale
`dist/` is standing behind any of the nine passes.

## Screenshots — `docs/plans/reactions/_shots/`

`reactions-band.png` (all four rows) · `reactions-sentinel-sheet.png` (canon's
clause, no "your own") · `reactions-armed.png` (the retaliation prompt) ·
`reactions-tally.png` (`TOTAL 6 Fire over 1 hit` and its undo) ·
`reactions-dont-know.png` (the pool that correctly arms nothing).

---

# Carried out of this phase

**Closed:** item 7 on both roads, item 8 for Hearthfire and both Sentinels,
Sentinel playable, and the provenance tag.

**Open, with Marcus's ruling where he has given one:**

1. **Interception is not on his combat tab.** *His ruling 2026-08-31: leave as an
   open item this phase.* Not a missing feature — phase 3 shipped the picker and
   the wire, both pinned on his real sheet by `fighting-style.test.ts`, and
   `recordFightingStyle(nix, INTERCEPTION)` produces a correct row on demand.
   **Nothing has ever asked him which Fighting Style he took**, so his sheet
   records no answer. It is one prompt and one tap, and it belongs with the
   "Your Turn" consolidation, not with reactions plumbing.
2. **Two temp-HP badges paint at once** — measured four times now (slices 3, 4,
   5, 6). Item 10's *"my hit points in like 3 different locations"*, with a
   number. Layout phase.
3. **The phantom 3rd-level spell-slot pips** — item 4, `docs/plans/slot-truth/`.
4. **A single-cost prose feature still falls to the `'action'` default** — Gate
   3's least-confident decision 2, left in deliberately and knowingly.
5. **Scratch artefacts await his word before deletion** (🟡 ASK-FIRST):
   `_probe-detail-tag.mjs`, `/tmp/probe-n.mjs`, and the four phase-3 ones. The
   measure/prove files for slices 1–6 are **keepers**.
6. **Not committed.** Phase 3's and phase 4's `src/` changes are uncommitted on
   `v1`. Marcus deploys.

**Next phase is the consolidation** — items 5, 6, 10, 11: three "Your Turn"
modules and a sticky bar become one, losing no feature and no visual, built on
the middle module. It now sits on an engine whose reactions work, which was the
whole reason this phase came first.
