# Program Design: Combat Open Book

## Files

### New

| File | Why here |
|---|---|
| `src/lib/canon/promote.ts` | The four promotions, moved out of `catalogue/detail.ts:237-338`. In `canon/` because both callers are canon readers and neither owns the other. |
| `src/lib/canon/promote.test.ts` | |
| `src/lib/rules-2024/reach.ts` | `primaryWeapon` + `weaponReach`, moved from `toybox-seed/profile.ts:63,73`, plus `reachFor`. In `rules-2024/` because reach is a rule, and the Toybox is one reader of it, not its owner. |
| `src/lib/rules-2024/reach.test.ts` | |
| `src/lib/canon/marks.ts` | Ability name → mark slug. A table, not a component: it must be testable without a DOM and assertable for coverage. |
| `src/components/canon/EntryDetailPanel.tsx` | Moved from `grimoire/`. Two screens draw it now, so it cannot live under one of them. |
| `src/components/combat/TurnCardActions.tsx` | The four `OptionDetail` fields that are about a TURN — rolls, spend, ruleBox, spendWarning — lifted out of `OptionDetailSheet.tsx` so that file can be deleted without losing them. |
| `src/components/combat/InlineOptionCard.tsx` | `EntryDetailPanel` + `TurnCardActions`. The single thing `rowExtra` returns. |
| `src/components/combat/InlineOptionCard.test.tsx` | |
| `public/marks/*.webp` | ~20, 96×96, ≈6KB each. Not compiled, so invisible to the bundle budget. |
| `docs/external/marks.md` | The exact generation prompt per mark, so a lost file is regenerable and nobody has to guess the art direction a year from now. |

### Changed

| File | Change |
|---|---|
| `canon/format.ts` | Add `statBlockFor(spell, ctx)` **beside** `statBlock`, which keeps its signature and its tests. |
| `canon/personalise.ts` | `{token\|fallback}` syntax · a 7th token `{dice}` · `personaliseText` (non-dropping). |
| `canon/bands.ts` | `statBlockFor` at `:180` · personalise bands 1 and 2 · a `feature?.paladinNote` branch at `:209` · the reach fact. |
| `catalogue/detail.ts` | `:324-338` become one `promoteBands` call. |
| `turn/detail.ts` | `:212` gains `panel`. |
| `turn/types.ts` | `TurnOption.markSlug?: string` — set by the composer, absent for anything unmapped. |
| `components/turn/TurnLive.tsx` | `:335` → `openId` toggle · `:338` `rowExtra` returns the card · `:485` unmounted. |
| `components/turn/TurnRow.tsx` | `ActBody` gains the 34px mark. **The only change to this file**, and it is not the expand mechanism. |
| `toybox-seed/profile.ts` | `:63,73` become re-exports. Zero behaviour change; `profile.test.ts` keeps passing untouched. |
| `catalogue/build.ts` | `:298` `onSheet: true` → `false` for feats. |
| `components/GrimoirePage.tsx` | `:635-650` Edit/Delete render only when the row is actually editable. |
| `vite.config.ts` | `public/marks/*` joins the precache list. |
| `canon/spells.json`, `canon/feats.json`, `canon/paladin-progression.json`, `canon/oath-of-the-hearth.json` | Content only. |

### Deleted — last slice only

`components/combat/OptionDetailSheet.tsx`, `OptionDetailSheetLive.tsx`.
**Their tests are not deleted.** `OptionDetailSheet.test.tsx` (414 lines) and
`OptionNote.test.tsx` are re-pointed at `InlineOptionCard`. Every assertion survives —
the errata cases at `:256-286`, the single-owner ruling case at `:314`, the spend-null
case. Deleting a test to make a refactor green is the one thing this plan will not do.

## Types & signatures

```ts
// ── canon/promote.ts ───────────────────────────────────────────────────────
/** The four promotions band 1 makes. Pure over bands; no entry, no option. */
export interface Promotions {
  cost: HeroCost | null
  hero: HeroDice | null
  higherLevel: string | null
  source: string | null
  consumed: readonly string[]
}

/** `fallbackSlot` is where the cost word comes from when canon stated no
 *  Casting Time. `'other'` yields no hero line at all — canon did not price it,
 *  and a hero line is the largest type on the screen. */
export function promoteBands(
  facts: readonly BandFact[],
  bands: CanonBands,
  fallbackSlot: 'action' | 'bonus' | 'reaction' | 'passive' | 'other',
): Promotions
```

```ts
// ── rules-2024/reach.ts ────────────────────────────────────────────────────
export function primaryWeapon(character: Character): Weapon | null   // moved
export function weaponReach(weapon: Weapon): number                  // moved

export interface Reach {
  feet: number
  /** The weapon's own name — "The Dawn Guardian". Printed every time. */
  source: string
}

/** The abilities whose stated distance follows the weapon.
 *
 *  Two RAW, two by Marcus's table ruling (approved at Gate 2): Sentinel and
 *  Interception both print "within 5 feet of you" as a flat distance, not as
 *  "your reach". The list is explicit and short so that adding to it is a
 *  decision somebody makes, not a regex that quietly widens. */
export const REACH_EXTENDED: readonly string[]

/** Null when the character wields nothing with Reach, when the ability is not
 *  in the list, or when the answer would be the default 5 — a fact that says
 *  "your reach: 5 ft, Longsword" is a row he reads to learn nothing. */
export function reachFor(abilityName: string, character: Character): Reach | null
```

```ts
// ── canon/personalise.ts ───────────────────────────────────────────────────
/** `{CHAmod|your Charisma modifier}` — the half after the pipe is canon's own
 *  words, used verbatim when the token has no answer for this character. */
export type Placeholder =
  | 'level' | 'CHA' | 'CHAmod' | 'saveDC' | 'spellAttack' | 'prof'
  /** NEW, and the only spell-aware one: this spell's damage or healing,
   *  scaled for level and with the ability modifier resolved. Null when the
   *  spell has neither, which is most of them. */
  | 'dice'

export interface PersonaliseContext {
  character: Character
  /** Present only where a spell is in scope. `{dice}` is unresolvable without it. */
  spell?: CanonSpell | null
}

/** BANDS 1 AND 2 — NON-DROPPING. An unresolvable token falls back to canon's
 *  own words; with no fallback written, the token's whole sentence is kept
 *  UNCHANGED rather than dropped. Band 2 is the rules text: a sentence removed
 *  from it is a rule Marcus no longer has. */
export function personaliseText(text: string, ctx: PersonaliseContext): string

/** BAND 3 — unchanged, still drops. Advice with a hole in it is worse than no
 *  advice, and that asymmetry is the whole reason there are two functions. */
export function personaliseBullets(b: TacticsBullet[], c: Character): TacticsBullet[]
```

```ts
// ── canon/format.ts ────────────────────────────────────────────────────────
/** `statBlock` with the caster in scope. Two rows differ and no others:
 *
 *    Damage   `scaleDice(...)` — Sacred Flame is "1d8 (2d8 at character
 *             level 5, …)" in canon and prints as 1d8 today. At level 8 the
 *             answer is 2d8, and the ROW already says 2d8 via `mechanicsLine`
 *             — so the app currently disagrees with itself two taps apart.
 *    Healing  canon's `mod: "spellcasting ability modifier"` resolves to the
 *             number: "2d8 + 4", the same way `renderHealing` already does.
 *
 *  `statBlock` stays exported and unchanged; `format.test.ts:210-241` is
 *  untouched and becomes the proof that this is an addition. */
export function statBlockFor(
  spell: CanonSpell,
  ctx: CasterContext,
): Array<{ label: string; value: string }>
```

```ts
// ── canon/bands.ts ─────────────────────────────────────────────────────────
export interface BandInput {
  name: string
  spell: CanonSpell | null
  feature: CanonFeature | null
  feat: CanonFeat | null
  fallbackText: string
  fallbackFacts: BandFact[]
}
// CanonBands is UNCHANGED. Personalisation happens to the values inside it,
// and the reach fact joins `facts` — no new field, so no caller has to learn
// anything.
```

```ts
// ── canon/marks.ts ─────────────────────────────────────────────────────────
/** Normalised ability name → file slug under /marks. A name that is not in
 *  the table renders NO mark and NO empty box — the same open-world rule as
 *  everything else here, and the reason a homebrew ability is not visibly
 *  second class. */
export function markFor(name: string): string | null
```

```ts
// ── turn/detail.ts ─────────────────────────────────────────────────────────
export interface OptionDetail {
  /* …every existing field, unchanged… */
  /** What `EntryDetailPanel` eats. Built from the SAME `canonBands()` call
   *  above — nothing is recomputed. */
  panel: EntryDetail
}
```

```ts
// ── components/combat/InlineOptionCard.tsx ─────────────────────────────────
export interface InlineOptionCardProps {
  detail: OptionDetail
  rulings?: ErratumRulings
  onRollDice?: (prefill: { notation: string; label: string }) => void
  onSpend?: () => void
  onClose: () => void
}
```

## Call stack

**Opening a card:**

```
Act.onClick                              TurnRow.tsx:118  (unchanged)
 └ TurnLive.onOpen(o)
     └ setOpenId(id => id === o.id ? null : o.id)
 └ TurnLive.rowExtra(o)                  TurnLive.tsx:338  (already wired)
     ├ <RetaliationCapture/>             (existing)
     └ openId === o.id
         └ optionDetail(o, character, economy)          turn/detail.ts:187
             ├ resolve(o)                                        :100
             ├ canonBands(input, character)              canon/bands.ts:172
             │   ├ statBlockFor(spell, casterContextOf(char))     ← was statBlock
             │   ├ withSaveDC(facts, character)                   :110  unchanged
             │   ├ reachFor(input.name, character)        ← appends "Your reach"
             │   ├ facts.map(personaliseText)             ← band 1
             │   ├ personaliseText(whatItDoes, {char, spell})     ← band 2
             │   └ personaliseBullets(splitTactics(...))          :209  unchanged
             ├ promoteBands(facts, bands, o.cost.slot)   canon/promote.ts
             ├ rollOffers(...)  spendFor(...)  ruleBoxFor(...)    unchanged
             └ → OptionDetail { …, panel }
         └ <InlineOptionCard>
             ├ <EntryDetailPanel detail={detail.panel} rulings={rulings}/>
             └ <TurnCardActions rolls spend ruleBox spendWarning/>
```

**The Grimoire, after the move — the same words by the same route:**

```
entryDetail(entry, character)            catalogue/detail.ts:303
 ├ canonBands(...)                       (identical call, now personalised)
 ├ slotFact(entry, character)                     :196   unchanged
 └ promoteBands(facts, bands, entry.turnCost)     ← replaces :324-338
```

## Test plan

**`promote.test.ts` — the move must not move a pixel**
1. `promoteBands` over every catalogue entry returns byte-identical `cost` / `hero` / `higherLevel` / `source` / `consumed` to `entryDetail`'s output on `main`. Snapshot captured **before** the change; this is the whole safety of the refactor.
2. `fallbackSlot: 'other'` → `cost === null`. A hero line is the biggest type on screen and canon did not price it.
3. Prayer of Healing → `cost.tone === 'time'`, not `'action'`. Pins the 2026-08-29 fix.

**`reach.test.ts`**
4. `weaponReach` — the three cases from `profile.test.ts:112-114` still pass, from the new module.
5. `reachFor('Sentinel', nixWithDawnGuardian)` → `{ feet: 10, source: 'The Dawn Guardian' }`.
6. `reachFor('Sentinel', nixWithLongsword)` → `null`. **Not `{feet: 5}`** — "your reach: 5 ft" is a row read to learn nothing.
7. `reachFor('Cure Wounds', nix)` → `null`. Not every ability is a reach ability.
8. Every name in `REACH_EXTENDED` resolves to a real canon record or a real synthetic option. A list with a typo in it is a silently dead entry.

**`personalise.test.ts` — additions**
9. `personaliseText('restore {dice|2d8 + your Charisma modifier} HP', {nix, cureWounds})` → `'restore 2d8 + 4 HP'`.
10. Same call for a Fighter (no casting ability) → `'restore 2d8 + your Charisma modifier HP'`. **The sentence survives.** This is the test the whole fallback syntax exists for.
11. A token with **no** fallback and no answer → the sentence is kept verbatim, `{token}` and all is NOT printed, and nothing is dropped. Distinguishes `personaliseText` from `personaliseBullets` in one assertion.
12. `personaliseBullets` still drops. The existing suite must pass unmodified.
13. Over all 71 spells and all feats: no rendered band-1 or band-2 string contains `{` or `}`. The failure mode that would put `{saveDC}` on his screen mid-fight.

**`format.test.ts` — additions**
14. `statBlockFor(sacredFlame, nixCtx)` Damage row → `2d8 Radiant`. `statBlock(sacredFlame)` still → `1d8 (2d8 at character level 5, …)`. Both, in one test, because the point is that one is an addition.
15. `statBlockFor(cureWounds, nixCtx)` Healing → `2d8 + 4`.
16. **Agreement:** for every spell, `statBlockFor`'s Damage dice equals the dice `mechanicsLine` puts on the row. The bug this feature was reported for, as a property over the whole corpus rather than one example.

**`bands.test.ts` — additions**
17. Band 2 for Sacred Flame at level 8 contains `2d8`, not `1d8`.
18. Band 2 for a level-1 caster contains `1d8`. Scaling is computed, never a constant.
19. Sentinel's band 1 has a `Your reach` fact reading `10 ft — The Dawn Guardian`, and band 2 **still says "within 5 feet"**. Canon's paragraph is not rewritten. Gate 2's decision, pinned.
20. The structural test at `:268` still forbids `statBlock`/`splitTactics`/`personaliseBullets`/`featureFacts` outside this module — **`statBlockFor` and `personaliseText` are added to `FORBIDDEN`**. A new function outside the guard list is the guard quietly getting weaker.

**`InlineOptionCard.test.tsx`** — every assertion re-pointed from `OptionDetailSheet.test.tsx`, plus:
21. Band 3 "How to use it" is **present and open** with no interaction. Combat's version of `OptionDetailSheet.tsx:405-438`, inverted.
22. An option canon has never heard of renders in its own words with the sheet-provenance line, and no band is empty-but-headed.
23. Roll and Spend are reachable and fire — the button-inside-a-button fault (`TurnRow.tsx:84-95`) is exactly what this layout risks reintroducing, and it does not throw, it silently does nothing. A test is the only way this is caught.

**`TurnLive` integration**
24. Tapping a row expands it; tapping it again collapses it; tapping a second row moves the open state. One card open at a time.
25. **No bottom sheet is mounted** on any path. Proves the old surface is gone rather than merely unused.

**Marks**
26. Every `markFor` slug has a file in `public/marks/`. A mapping to a missing file is a broken image at the table.
27. An unmapped name renders no `<img>` and no reserved gap.

**Budget** — `scripts/bundle-budget.mjs` unchanged and passing. `public/` is not compiled, so a regression here would mean something got imported that should have been a file.

## Least confident decisions

1. **`{dice}`, the 7th token.** `personalise.ts:17-22` says a seventh "is a decision to take at a gate, not a regex to widen". This is that gate, and I am widening it. It is the only token that needs a spell in scope, which is the seam where a template language starts growing. **The alternative I rejected:** leave band 2 saying `1d8` and let band 1 carry `2d8` — rejected because "the numbers aren't his" is the actual complaint, and band 2 is the band he reads.

2. **Sentinel and Interception at 10 ft.** Approved at Gate 2, and still the one place the app makes a claim his DM could disagree with. Mitigated by naming The Dawn Guardian on the line every time, never silently. Reverting is deleting two strings from `REACH_EXTENDED`.

3. **Personalising band 1's fact values as well as band 2.** Costs a pass over every fact on every render. Cheap, but it means a canon fact can now differ from what canon literally prints, in a band whose whole promise is "canon's fields as printed, nothing compacted" (`format.ts:355-357`). The narrower option is band 2 only.

4. **`rowExtra` carrying the card.** Elegant — zero changes to `TurnRow`/`TurnBands` — but it means one prop now carries two unrelated things, and `.actx`'s styling was written for a small capture strip, not a 600px card. If the CSS fights, the fallback is a dedicated `rowOpen` prop and a real change to `TurnRow`.

5. **Deleting `OptionDetailSheet` in the last slice.** `QuickLookup` and the legacy `CombatHelper` tab may still mount it (`CombatHelper.tsx:1123`). If the legacy tab still ships, the sheet stays and the two surfaces diverge — which is the exact drift `bands.ts:9-16` was written to prevent. **Verify before the last slice, not during it.**

6. **Band 3 for features.** `CanonFeature` has no advice field, so Hearthfire Manifest, Lay On Hands, Aura of Protection and Channel Divinity get **no "How to use it"** — four of his most-used abilities, on the screen this feature is about. Adding one means *authoring* tactical advice and presenting it as canon's. Scoped to its own last slice, clearly marked, for Marcus to read before it ships.
