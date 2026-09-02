# Slices: Open Book — the Grimoire holds everything

Gate 3 approved 2026-08-28. Seven slices, in build order. Each one ends in a state
that runs, that Marcus can open on his phone, and that has a proof attached.

The rule the order obeys: **the thing most likely to be wrong is built first and
shown first.** The count is the thing most likely to be wrong.

---

## Slice 1 — tracer bullet: the 84 appear

Real data, stub presentation.

- `src/lib/catalogue/types.ts` — `CatalogueEntry`, `EntryKind`, `TurnCost`.
- `src/lib/catalogue/build.ts` — `catalogueSpells`, `buildCatalogue`: the union,
  the both-ways-round resolution, the dedup on `normalizeName`, the locks.
- `src/lib/catalogue/build.test.ts` — the ten cases from Gate 3, against his real
  export.
- `GrimoirePage.tsx:103–115` stops reading `character.spells`/`.features`.
- **A temporary adapter** `CatalogueEntry → AbilityItem`, so the existing
  `GrimoireCard` renders them unchanged. This is the mock. It is deleted in
  slice 3, and slice 3 is not done until it is gone.

**Visible after this slice:** 84 cards where there were 11, with the lock state
already correct, rendered in the old card's clothes.

**Proof:** `build.test.ts` green · browser checks **A** (84 cards, geometric) and
**B** (38 lock chips).

**Micro-revert:** drop the second pass that adds sheet-only items → the
open-world test (`nothing on his sheet is missing`) must go red.

---

## Slice 2 — the extraction, with nothing to show for it

The one slice with no visible change, taken on its own so that if the combat sheet
moves a millimetre it is unmistakably this slice that moved it.

- `src/lib/canon/bands.ts` + `bands.test.ts`, including the **structural** test
  that forbids either caller importing `statBlock`, `splitTactics`,
  `personaliseBullets` or `featureFacts` directly.
- `src/lib/turn/detail.ts` loses its canon core and calls `canonBands`. Its
  existing suite is **not edited**.

**Visible after this slice:** nothing. That is the claim being made.

**Proof:** the whole repo green with `turn/detail`'s tests untouched ·
`tsc -b --noEmit` clean · the combat detail sheet opened in a browser and its
bands compared against a screenshot taken before the slice.

**Micro-revert:** put the private `withSaveDC`/`factsFromFeature` back in
`turn/detail.ts` → the structural test must go red. **If it does not go red, the
extraction was cosmetic and the guarantee is fake** — stop and say so.

---

## Slice 3 — the three bands, and the old card dies

The big diff, isolated so it can be reviewed alone (Gate 3 decision 6).

- `src/lib/catalogue/detail.ts` + test — `entryDetail`, the lock notice, errata.
- `src/components/grimoire/CatalogueRow.tsx` — one row, locked or not.
- `src/components/grimoire/EntryDetailPanel.tsx` — the band-1 **layout**, and the
  fall-through rule: an unrecognised label lands in the grid rather than being
  dropped, pinned by a test that hands it an invented label.
- Slice 1's adapter is deleted. `GrimoireCard.tsx` is deleted.

**Visible after this slice:** open anything — including anything locked — and get
At a glance / Full text / How to use it, matching `mockups/02-detail.html`.

**Proof:** browser checks **C** (a locked card opens to all three bands) and
**F** ("what does this cost me" is still 2 taps, band 1 needs no scroll at
390×844 — the Gate 1 guardrail).

**Micro-revert:** make the panel drop unrecognised labels → the invented-label
test must go red.

---

## Slice 4 — the switcher

- `src/lib/catalogue/group.ts` + test — four modes.
- `src/components/grimoire/GroupSwitcher.tsx`.
- **The measurement Gate 3 deferred:** count how many of the 84 land in
  `turnCost: 'other'`. More than ~15 and the default mode becomes Source, not
  Turn cost. The number goes in `00-status.md` either way.

**Visible after this slice:** `mockups/01-list.html`, live.

**Proof:** browser check **D** — each of the four chips still yields 84. The
switcher groups; it never filters (Gate 1 rule 4).

**Micro-revert:** drop locked entries from one mode → `locked entries are not
hidden in any mode` must go red.

---

## Slice 5 — preparation that works like the rule works

- `src/lib/prepare/toggle.ts` + test — the cap, the two refusals, the converter,
  and **the wire**: preparing a canon spell must make `composeTurn` produce a row
  for it (finding BM — a test aimed at the reducer is not aimed at the wire).
- `src/components/grimoire/PrepareRefusal.tsx`,
  `src/components/grimoire/PreparationRules.tsx` — canon's five rules verbatim
  plus his four numbers.
- `LoadoutPanel.tsx` — the count it shows becomes the count the cap enforces.

**Visible after this slice:** the eighth spell is refused, and the refusal names
the rule that refused it and says a Long Rest lets him swap.

**Proof:** browser check **E** — refused on screen, rule text geometrically
visible.

**Micro-revert:** remove the cap check → `an eighth prepared spell is refused`
must go red.

---

## Slice 6 — the app learns he has Interception

- `src/lib/prepare/fighting-style.ts` + test.
- `src/components/grimoire/FightingStylePicker.tsx`, inside the *Fighting Style*
  class-feature card only.

**Visible after this slice:** he opens Fighting Style, picks Interception, and it
appears as a Reaction on the combat tab — because `src/lib/turn/feats.ts` already
reads `character.feats`. Half of item 8 closes for free.

**Proof:** `composeTurn` produces the Reaction row (asserted through the engine,
not by reading the sheet back) · confirmed in the browser on the combat tab.

**Micro-revert:** stop writing the `CharacterFeat` → the combat-tab test must go
red.

---

## Slice 7 — the phase proof

- `docs/plans/grimoire/prove-catalogue.mjs` run whole: **A–G**, including **G**,
  a clean console.
- Whole repo suite, `tsc -b --noEmit`, `npm run build`.
- `00-status.md` compacted so a fresh session could continue from the docs alone.

**Visible after this slice:** nothing new — this is the slice that says the six
before it are true at the same time, on one build, on one screen size.

---

## Not in these seven, on purpose

Party-aware tactics · putting Hearthfire Manifest and Sentinel on the combat tab
(the *other* half of item 8) · the "Your Turn" consolidation (items 5, 6, 10, 11)
· the damage log (items 7, 9). All named in `01-product.md` under "Not in this
phase", all still on the list.
