# Slices: Combat Open Book

Nine slices, in build order. Every one ends in a state you can open on your phone and
look at. Nothing here is "half a layer" — there is no slice whose result is a module
with no screen behind it.

Line numbers verified against `main` @ `274d947`.

---

## Slice 1 — tracer bullet: tap a Combat row, the Grimoire card opens in place

The thinnest end-to-end wire. `EntryDetailPanel` moves to `components/canon/` (re-export
left at the old path), `OptionDetail` gains `panel: EntryDetail` built from the
`canonBands()` call `optionDetail` already makes at `turn/detail.ts:198`, and `TurnLive`
switches `onOpen` from "mount the sheet" to "toggle `openId`", feeding the panel through
`rowExtra` — the prop it already passes at `TurnLive.tsx:338`.

**Deliberately still wrong at the end of this slice**, and that is the point of a tracer:
promotions are `null` (no hero die, no cost chip), there is no Roll or Spend button inside
the card, band ① still prints the book's numbers, and there are no marks.

`OptionDetailSheet.tsx` and `OptionDetailSheetLive` stay on disk, unmounted. The revert is
one line.

**Prove it:** dev server, Nix loaded, Combat tab — tap Sacred Flame. The ①②③ card
unrolls under the row. Tap again, it closes. Tap a different row, the first one closes.
Screenshot both states.

**Tests:** #21 (panel mounts inline, not in a portal), #22 (one card open at a time),
#25 (no bottom sheet mounted on the Combat path).

---

## Slice 2 — `promoteBands()`: the hero die, cost chip, higher-level and source

The move. `heroCostFor` (`catalogue/detail.ts:237`), `heroDiceFor` (`:274`) and the
`consumed` list (`:333`) become one pure function in `canon/promote.ts` taking
`(facts, bands, fallbackSlot)`. `entryDetail` and `optionDetail` both call it —
`optionDetail` passes `o.cost.slot`, which `TurnOption` already carries
(`turn/types.ts:37-50`).

**The Grimoire must not move a pixel.** Test #1 is a snapshot of the promoted output for
all 71 spells + every feature, captured and committed **before** this slice's code
changes, then asserted byte-identical after. That snapshot is the whole safety of the
refactor; it is written first or the slice does not start.

**Prove it:** the same Combat card as slice 1, now with the 34px hero die and the cost
chip. Side-by-side screenshot with the Grimoire card for the same spell.

**Tests:** #1 (byte-identical promotion snapshot), #2–#5 (`promoteBands` unit: cost from
slot, dice parse via `DICE`, `consumed` correctness, null-safety when there is no cost).

---

## Slice 3 — `TurnCardActions`: Roll and Spend live inside the open card

The four `OptionDetail` fields that are about a *turn* rather than a *spell* — `rolls`,
`spend`, `ruleBox`, `spendWarning` — lift out of `OptionDetailSheet` into
`components/combat/TurnCardActions.tsx`, rendered under the panel inside the card.

This is the slice where the button-inside-a-button fault would silently reappear.
`TurnRow.tsx:84-95` documents why the `hasx`/`acthit`/`actx` shape exists; the card sits
in `actx`, outside the hit button, and test #23 fires the handlers to prove the browser
did not drop them.

**Prove it:** tap Sacred Flame, hit Roll from inside the open card, dice tray opens with
the right notation. Tap Lay On Hands, hit Spend, the pool decrements. Recording, not a
screenshot — this is a two-step interaction.

**Tests:** #23 (Roll and Spend actually fire from inside the card), #24 (spend warning
renders for temp-HP overwrite).

---

## Slice 4 — `statBlockFor()`: band ① stops disagreeing with the row

`statBlock(spell)` becomes `statBlockFor(spell, ctx)` in `canon/format.ts` — the same
`CasterContext` `mechanicsLine` and `renderHealing` already take. Damage runs through
`scaleDice`, healing's `mod` resolves to a signed number. One production caller to change
(`bands.ts:180`).

This is the slice that fixes most of "the wording doesn't include my actual data", and
it fixes it without touching a single word of canon.

**Prove it:** Sacred Flame band ① reads `2d8` — the same number the collapsed row reads,
which today says `2d8` while the card two taps away says
`1d8 (2d8 at character level 5, 3d8 at 11, 4d8 at 17)`. Cure Wounds band ① reads
`2d8 + 4`, not "2d8 + spellcasting ability modifier". Screenshot row and card together.

**Tests:** #16 (`statBlockFor` Damage agrees with `mechanicsLine` for **every** spell in
canon — the self-contradiction test), #17 (healing mod is a signed numeral), #18
(cantrip scaling at levels 1/5/11/17), #20 (`statBlockFor` added to the
`bands.test.ts:268` FORBIDDEN list so nothing reaches past the seam again).

---

## Slice 5 — personalise bands ① and ②, non-dropping, + 3 canon strings

`personaliseText()` lands in `canon/personalise.ts` alongside the existing dropping
`personalise()`, and the `{token|canon's own words}` fallback syntax with it. Band ③ keeps
the dropping behaviour — advice with a hole in it is worse than no advice — and bands ①
and ② get the fallback, because losing the sentence that says what the spell *does* is
the catastrophic failure.

Three canon strings gain tokens: Cure Wounds `spells.json:563-572`, Summon Celestial
`:2923` (which currently states a **false** `+7`; yours is `+8`), Interception
`feats.json:722-732`. Plus the `mechanics` key on the four paladin features at
`paladin-progression.json:426,456,478,491`, which render nothing at all today.

The `{dice}` seventh token lands here, and `personalise.ts:17-22` gets its comment updated
to say six became seven at a gate — not quietly.

**Prove it:** Summon Celestial says `+8`. Cure Wounds says `+ 4`. And the fallback
test in reverse: load a character with no Charisma bonus and confirm the sentence is
still there, saying what the book says.

**Tests:** #10 (a Fighter's Cure Wounds sentence **survives** — the test the fallback
syntax exists for), #11–#12 (fallback parse, nested-brace rejection), #13 (no `{` or `}`
survives into any rendered band ① or ② across all 71 spells and every feat), #14 (band ③
still drops), #15 (`{dice}` resolves and is documented).

---

## Slice 6 — reach: `rules-2024/reach.ts`, the Dawn Guardian's 10 ft

`primaryWeapon` and `weaponReach` move out of `toybox-seed/profile.ts:63,73` — where they
are already pure and already tested — into `rules-2024/reach.ts`, joined by `reachFor()`
and the short explicit `REACH_EXTENDED` list. `profile.ts` keeps re-exports so
`profile.test.ts:112-114` keeps passing at its current path.

Band ① gains `Your reach · 10 ft — The Dawn Guardian`. The collapsed row's why-line says
`Dawn Guardian extends your reach`. **Band ② is untouched** — Sentinel still says "within
5 feet of you", because that is what the book says.

The item is named on the line every single time it applies. That is the whole mitigation
for the ruling being a ruling: your DM can read it and disagree with it, which he cannot
do if the app just prints 10.

**Prove it:** Sentinel's card — band ① says `10 ft — The Dawn Guardian`, band ② says
"within 5 feet". Both visible in one screenshot, which is the point.

**Tests:** #6–#8 (`reachFor`: extended ability returns 10 with source, non-extended
returns null, no reach weapon returns 5), #9 (a character without the Dawn Guardian gets
no reach fact at all — no empty row, no gap), #19 (band ① and band ② disagree on purpose,
asserted).

---

## Slice 7 — ~20 marks, generated once, committed as WebP

One batch through `generate_image_batch`, run by hand, outputs converted to 96×96 WebP in
`public/marks/`, ≈6KB each. `canon/marks.ts` maps normalised ability name → file, and
**a missing key renders no mark and no gap.** The app never calls an image API; it reads
files that are in the repo.

`vite.config.ts` adds `public/marks/*` to precache — 120KB — because a mark that needs a
network round-trip is useless in a basement.

`docs/external/marks.md` records the prompts and the art-direction rules from the Gate 1
mockup, so the 21st mark six months from now matches the first twenty.

**Prove it:** the Combat list with marks down the left edge, and the same screen with
`public/marks/` renamed away — proving the fallback is a clean layout, not a broken-image
icon.

**Tests:** #26 (`markFor` returns null for an unknown name and the component renders
nothing), #27 (every key in `marks.ts` has a file on disk — the test that catches a typo'd
slug shipping as an invisible hole).

---

## Slice 8 — cleanup: delete the sheet, remove the dead pencils

`OptionDetailSheet.tsx` and `OptionDetailSheetLive` are deleted — **after** grepping every
mount, including `CombatHelper.tsx:1123` and `QuickLookup`. If either still mounts it, the
sheet stays and this slice reports that instead of forcing it.

Their tests are **re-pointed at the inline card, not deleted.** Deleting a test to make a
refactor green is the one thing this plan will not do.

Also: `catalogue/build.ts:298` stops hardcoding `onSheet: true` for feats, so
`GrimoirePage.tsx:635-650` stops drawing an Edit and a Delete pencil on every feat row —
two buttons that have never done anything and will bite the moment you pick a Fighting
Style.

**Prove it:** full test suite green, `npm run build` under budget, bundle-budget report
before/after, and a feat row in the Grimoire with no phantom pencils.

---

## Slice 9 — OPTIONAL, and you read it before it ships: band ③ for features

`CanonFeature` (`canon/types.ts`) has no advice field, so Hearthfire Manifest, Lay On
Hands, Aura of Protection and Channel Divinity get **no "How to use it"** — four of your
most-used abilities, on the screen this whole feature is about. `bands.ts:209-213` has a
`spell` branch and a `feat` branch and no `feature` branch.

Closing it means **I write tactical advice and the card presents it in canon's voice.**
That is a different kind of act from everything above, all of which only re-arranges words
that already existed or resolves numbers that were already yours.

So this slice ships as a diff you read first. Four abilities, three bullets each, and if
any of it is wrong or not how you play, it does not go in.

**Prove it:** the four cards, side by side with what they show today.

---

## Rules holding across all nine

- **Real tests only.** No test that passes against the pre-change code. Nothing skipped,
  commented out, or weakened to reach green.
- **Every slice ends runnable.** If a slice cannot be demonstrated on the Combat screen,
  it is the wrong slice and gets split differently.
- **Nothing may disappear quietly.** Missing mark, missing reach, unresolvable token,
  unknown ability — every one of them degrades to exactly what the app shows today.
- After each slice: proof, tick the box in `00-status.md`, then
  "Continue to slice N+1, or re-steer?"
