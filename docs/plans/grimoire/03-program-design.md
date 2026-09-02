# Program Design: Open Book — the Grimoire holds everything

Gate 2 approved 2026-08-28. This is the set of decisions that would otherwise get
made silently, mid-slice, by whoever is typing.

---

## Files

### New — the pure layer

| file | why it lives there |
|---|---|
| `src/lib/canon/bands.ts` | The three bands, pure over (canon record, character). Lives in `canon/` and not `catalogue/` because the combat detail sheet consumes it too, and the module both callers share must not live inside either one. |
| `src/lib/canon/bands.test.ts` | Including the structural test that forbids either caller reaching past it. |
| `src/lib/catalogue/types.ts` | `CatalogueEntry` and friends. Its own file so the view layer can import types without importing the builder. |
| `src/lib/catalogue/build.ts` | `buildCatalogue(character)` — the union, the locks, the dedup. |
| `src/lib/catalogue/build.test.ts` | Runs against **his real export**, not a fixture. |
| `src/lib/catalogue/group.ts` | The four grouping modes. Split from `build.ts` because grouping is re-run on every switcher press and building is not. |
| `src/lib/catalogue/group.test.ts` | |
| `src/lib/catalogue/detail.ts` | `entryDetail(entry, character)` — `bands.ts` plus the lock notice, the prepare affordance, errata, and the style picker. |
| `src/lib/catalogue/detail.test.ts` | |
| `src/lib/prepare/toggle.ts` | The cap, the two refusals, the canon→sheet converter. Its own folder rather than more lines in `character.ts`, which is 1400 lines and byte-pinned in part. |
| `src/lib/prepare/toggle.test.ts` | |
| `src/lib/prepare/fighting-style.ts` | The 11, the read, the write. |
| `src/lib/prepare/fighting-style.test.ts` | |

### New — the screen

| file | why |
|---|---|
| `src/components/grimoire/GroupSwitcher.tsx` | The four chips. |
| `src/components/grimoire/CatalogueRow.tsx` | One row, locked or not. Replaces `GrimoireCard`'s collapsed half. |
| `src/components/grimoire/EntryDetailPanel.tsx` | The three bands. **Does the band-1 layout** — see decision 3. |
| `src/components/grimoire/PrepareRefusal.tsx` | The card that names the rule. |
| `src/components/grimoire/PreparationRules.tsx` | The teaching card: canon's five rules verbatim plus his four numbers. |
| `src/components/grimoire/FightingStylePicker.tsx` | Inside the *Fighting Style* feature card only. |

### Changed

| file | change |
|---|---|
| `src/lib/turn/detail.ts` | Loses its canon core to `bands.ts`; keeps ruleBox, spend, spendWarning, rolls. `withSaveDC` and `factsFromFeature` move out. **Pure move — no behaviour change, pinned by its existing tests.** |
| `src/components/GrimoirePage.tsx` | `allItems` (line 103–115) stops reading `character.spells`/`.features` and calls `buildCatalogue`. Search and the filter chips stay and now filter the catalogue. |
| `src/components/grimoire/LoadoutPanel.tsx` | The count it displays becomes the count the cap enforces. |

### Not touched

`src/lib/turn/options.ts` (byte-pinned) · `CombatHelper.tsx` · `TurnDeck.tsx` ·
`TurnSummary.tsx` · anything under `src/canon/*.json`.

---

## Types & signatures

### `src/lib/canon/bands.ts`

```ts
export interface BandFact {
  /** null for a fact the sheet stated without naming — a bare detail segment. */
  label: string | null
  value: string
}

/** What a caller hands in. All three canon slots may be null: that is a
 *  homebrew item, and the fallbacks are what it renders from. */
export interface BandInput {
  name: string
  spell: CanonSpell | null
  feature: CanonFeature | null
  feat: CanonFeat | null
  /** Band 2 when all three above are null. */
  fallbackText: string
  /** Band 1 when all three above are null. */
  fallbackFacts: BandFact[]
}

export interface CanonBands {
  provenance: 'canon' | 'sheet'
  /** Band 1. Labelled facts, in canon's order. NOT laid out — see decision 3. */
  facts: BandFact[]
  /** Band 2. The full paragraph. Never truncated. */
  whatItDoes: string
  /** Band 3. Empty when canon has no advice, and empty is honest. */
  tactics: TacticsBullet[]
  /** Canon's recorded problems with this feature. Both screens show them. */
  errata: CanonErratum[]
  /** The classified feature facts, raw. Empty for a spell.
   *
   *  Exposed because `turn/detail.ts` rolls dice off these
   *  (`detail.ts:275`), and if it had to call `featureFacts` itself to get
   *  them, the structural test below would have nothing left to forbid. */
  featureFacts: readonly FeatureFact[]
}

export function canonBands(input: BandInput, character: Character): CanonBands

/** Exported for `turn/detail.ts` only. Prefixes canon's Save row with the
 *  caster's DC. Stays out of `format.ts` for the reason `detail.ts:180-186`
 *  gives: a pure formatter that takes a character stops being one. */
export function withSaveDC(facts: BandFact[], character: Character): BandFact[]
```

### `src/lib/catalogue/types.ts`

```ts
export type EntryKind = 'spell' | 'feature' | 'feat'

/** What it costs on his turn. 'other' is honest for things canon prices in
 *  words the parser does not recognise; it is never guessed at. */
export type TurnCost = 'action' | 'bonus' | 'reaction' | 'passive' | 'other'

export interface CatalogueEntry {
  /** normalizeName(name). The dedup key, the React key, the sort tiebreak. */
  key: string
  name: string
  kind: EntryKind
  provenance: 'canon' | 'sheet'

  /** null when he has it now; otherwise the level it arrives at. */
  lockedUntil: number | null
  /** 1–5 for a spell, 0 for a cantrip, null for anything else. */
  spellLevel: number | null
  turnCost: TurnCost
  /** 'Paladin' · 'Oath of the Hearth' · 'Feat' · 'Your sheet'. */
  origin: string

  prepared: boolean
  /** Canon says it never counts against the cap. */
  alwaysPrepared: boolean
  /** False for features, feats, cantrips and anything locked. */
  preparable: boolean
  onSheet: boolean
  /** His own words, for band 2 when canon is silent. Never his words when
   *  canon is not silent — see decision 4. */
  sheetText: string | null

  /* AT MOST ONE of these three is non-null. Mirrors `detail.ts:103` rather
   * than inventing a second way to say the same thing, and keeps the
   * both-ways-round resolution visible in the type instead of buried. */
  canonSpell: CanonSpell | null
  canonFeature: CanonFeature | null
  canonFeat: CanonFeat | null
}
```

### `src/lib/catalogue/build.ts`

```ts
export function buildCatalogue(character: Character): CatalogueEntry[]

/** Canon's spells that belong to THIS character. 62 for Nix.
 *  Reads the Fighting Style off the sheet — so if he ever records Blessed
 *  Warrior, the nine cantrips arrive without this function being edited. */
export function catalogueSpells(character: Character): readonly CanonSpell[]
```

### `src/lib/catalogue/group.ts`

```ts
export type GroupMode = 'turn' | 'source' | 'level' | 'ready'

export interface CatalogueGroup {
  id: string
  label: string
  entries: CatalogueEntry[]
}

export function groupCatalogue(
  entries: readonly CatalogueEntry[],
  mode: GroupMode,
): CatalogueGroup[]
```

### `src/lib/catalogue/detail.ts`

```ts
export interface LockNotice {
  unlocksAt: number
  /** "You get this at level 9." Plus the slot half when that is also true. */
  text: string
}

export interface EntryDetail {
  title: string
  subtitle: string
  bands: CanonBands
  lock: LockNotice | null
  /** null when this is not a thing that can be prepared at all. */
  prepare: { prepared: boolean; refusalIfPressed: PrepareRefusal | null } | null
  /** Non-null ONLY on the "Fighting Style" class feature card. */
  stylePicker: { options: readonly CanonFeat[]; chosen: CanonFeat | null } | null
}

export function entryDetail(entry: CatalogueEntry, character: Character): EntryDetail
```

### `src/lib/prepare/toggle.ts`

**AMENDED 2026-08-29, during slice 5.** Three refusals became five, `'cap'` grew a
field, and the call stack was reordered. Each change is recorded under *Amendment
— the two refusals this design did not anticipate* below.

```ts
export type PrepareRefusal =
  /** Rule 1. `rule` is canon's sentence, verbatim; `swapRule` is canon's rule 3,
   *  the way out. AMENDED: `swapRule` added. */
  | { code: 'cap'; max: number; rule: string; swapRule: string }
  /** Rule 2. */
  | { code: 'no-slots'; spellLevel: number; rule: string }
  /** ADDED. Rules 4 and 5 — there is nothing to prepare, and nothing is wrong. */
  | { code: 'granted'; why: 'always-prepared' | 'cantrip'; rule: string }
  /** Not a rule about preparing — he does not have it yet. */
  | { code: 'locked'; unlocksAt: number }
  /** ADDED. Not a spell at all. Closes the silent-no-op path. */
  | { code: 'not-a-spell'; name: string }

export type PrepareResult =
  | { ok: true; next: Character }
  | { ok: false; refusal: PrepareRefusal }

/** Unpreparing a spell that counts is never refused. Preparing is refused for
 *  exactly the five reasons above and no others. */
export function togglePrepared(character: Character, name: string): PrepareResult

/** Rule 4: always-prepared spells do not count. Cantrips do not count.
 *  Reads canon's own `countsAgainstPreparedLimit` field rather than re-deriving
 *  `alwaysPrepared || level === 0` — canon already partitions all 71 records and
 *  a second derivation is a second thing to keep in step. */
export function preparedCount(character: Character): number

/** ADDED. The per-spell predicate `preparedCount` sums, exported because
 *  `PreparationRules` counts rule 4's exclusions rather than asserting them. */
export function countsAgainstCap(spell: Spell): boolean

/** ADDED. Canon's rule 3, so the refusal card and the rules panel say one
 *  sentence rather than two that could drift. */
export const LONG_REST_SWAP_RULE: string

/** Canon record → the sheet's own `Spell` shape. Lossy on purpose: the sheet
 *  shape is what the turn engine reads and it has no field for tactics. */
export function canonSpellToSheet(spell: CanonSpell): Spell
```

### `src/lib/prepare/fighting-style.ts`

```ts
export function fightingStyles(): readonly CanonFeat[]           // the 11
export function currentFightingStyle(character: Character): CanonFeat | null
export function recordFightingStyle(character: Character, name: string): Character
```

---

## Call stack

### Paint

```
GrimoirePage
  buildCatalogue(character)
    catalogueSpells(character)      → 53 onPaladinList + 9 oath off-list
    CLASS_FEATURES                  → 16
    OATH.features                   → 4
    character.feats                 → 2
    for each: spellByName(n) ?? featureByName(n) ?? featByName(n)   ← BOTH WAYS
              isUnlocked / feature.level  → lockedUntil
              sheet match by normalizeName → prepared, onSheet, sheetText
    then: every sheet item whose key is not already in the map
                                    → provenance 'sheet'
  groupCatalogue(entries, mode)
  CatalogueRow × 84
```

### Open

```
CatalogueRow onExpand
  entryDetail(entry, character)
    canonBands({spell, feature, feat, fallbackText, fallbackFacts}, character)
      spell   → withSaveDC(statBlock(spell), character)
      feature → featureFacts(feature, featureContextOf(character))
      neither → fallbackFacts
      band 2  → spell.summary ?? feature.rawText ?? feat.effects.join ?? fallbackText
      band 3  → personaliseBullets(splitTactics(spell.tactics), character)
      errata  → errataForFeature(name)
    lockNoticeFor(entry, character)
    prepareAffordanceFor(entry, character)   → dry-runs togglePrepared
    stylePickerFor(entry, character)          → only when name === 'Fighting Style'
  EntryDetailPanel lays out bands.facts       ← decision 3
```

### Prepare

**AMENDED 2026-08-29** — the order below is not the order this doc first gave.
The original put *already prepared? → unprepare, always ok* first, and shipping
it in that order would have been a silent data loss. See the amendment note.

```
CatalogueRow onPrepare
  togglePrepared(character, name)
 1  neither canon nor sheet knows the name?  → refuse 'not-a-spell'
 2  level 0?                                 → refuse 'granted' (cantrip, rule 5)
    canon says it never counts?              → refuse 'granted' (Oath, rule 4)
 3  already prepared?                        → unprepare, always ok
 4  entry locked?                            → refuse 'locked'
 5  spellSlots has that level?               → else refuse 'no-slots'  (rule 2)
 6  preparedCount >= max?                    → refuse 'cap'            (rule 1)
 7  on the sheet?                            → flip prepared
    not on the sheet?                        → canonSpellToSheet, push, prepared: true
  ok    → onCharacterUpdate(next) → useCharacter → localStorage
  refuse → <PrepareRefusal refusal={...} />
```

### Amendment — the two refusals this design did not anticipate

Found while writing the module; both are cases where the approved design's
answer was *silently do the wrong thing* rather than *refuse*.

1. **Step 2 must run before step 3, and this doc had it the other way round.**
   Four of the six spells ticked on Nix's sheet — Burning Hands, Faerie Fire,
   Scorching Ray, Warding Bond — are Oath grants sitting there with
   `prepared: true`. Under the original order, one tap on Warding Bond would
   have fallen into *already prepared → unprepare* and removed a spell canon
   says he always has. **And the counter would not have moved**, because rule 4
   already excludes it from the count — so the app would have taken something
   away and shown him no change. Now those spells refuse with `'granted'` and
   say why they cost him nothing.

2. **`'not-a-spell'` closes a silent no-op.** `togglePrepared(character,
   'Aura of Protection')` matched nothing in canon and nothing on the sheet, and
   the design's chain fell through to *not on the sheet → push* with a null
   canon record, or to returning `ok: true` having changed nothing. A caller
   cannot tell "done" from "did nothing" and neither can Marcus.

3. **`swapRule` on `'cap'`.** Gate 1's ruling was "hard cap with a clear
   reason"; Marcus's own words were *"i think on long rests i can swap out a
   spell or something."* A cap that quotes rule 1 and stops answers the half he
   already knew. The refusal carries canon's rule 3 as well.

4. **`>=`, not `===`.** A sheet that arrived over the cap — a level-down, a hand
   edit — would be waved through by `===` and allowed to climb.

Re-approval was not requested as a gate: none of the four changes an outcome
Marcus chose. All four are deferred to assertions in `toggle.test.ts` that were
shown able to go red, per the phase's standing rule that *a deferred decision
must be deferred to an assertion, not to a paragraph*.

### Name the style

```
FightingStylePicker onPick(name)
  recordFightingStyle(character, name)
  onCharacterUpdate(next)
    → character.feats gains Interception
    → src/lib/turn/feats.ts already reads character.feats
    → composeTurn produces a Reaction row on the combat tab
```

---

## Test plan

### `bands.test.ts`

| name | asserts |
|---|---|
| `a spell's band 1 carries canon's own rows` | Searing Smite yields Level / Casting Time / Range / Components / Duration / Trigger / Damage / Save / Higher Level / Source |
| `the save row is prefixed with HIS DC` | `DC 16 Constitution — ends the ongoing damage`, not bare |
| `a feature's band 1 comes from the mechanics bag` | Hearthfire Manifest, via `featureFacts` |
| `a homebrew item still gets all three bands` | all three canon slots null → fallbacks used, `provenance: 'sheet'`, tactics **empty** |
| `band 2 is never truncated` | full `summary` string present, no `…` |
| `band 3 keeps canon's capitals` | `lead` is `HONEST MATH` not `Honest math` |
| `errata reach both screens` | Smoldering Smite yields its HEARTH errata here, not only in combat |
| **`neither caller reaches past this module`** | **structural.** Greps `src/lib/turn/detail.ts` and `src/lib/catalogue/detail.ts` and asserts neither imports `statBlock`, `splitTactics`, `personaliseBullets` or `featureFacts` |
| `turn/detail.ts still produces what it produced` | its existing suite, unchanged, green after the move |

### `build.test.ts` — against his real export

`skipIf`-skipped if the export is unreadable, never silently passed.

| name | asserts |
|---|---|
| `the catalogue is 84 for Nix` | and the itemised 53 / 9 / 16 / 4 / 2 |
| `38 of them are locked` | 27 + 3 + 6 + 2 |
| `Divine Smite appears exactly once` | **the duplicate this design nearly shipped.** One entry, `kind: 'spell'`, canon's text — not two |
| `his 7 prepared spells are marked prepared` | read off the sheet, not guessed |
| `Aura of Vitality is locked until 9 and still carries full canon text` | a lock dims, it never hides |
| `a homebrew spell on the sheet survives` | inject one canon has never heard of; it is in the 85 with `provenance: 'sheet'` |
| `the nine Blessed Warrior cantrips are absent` | he has no Blessed Warrior |
| `…and present the moment he records Blessed Warrior` | same function, different sheet — proves it reads the style rather than hard-coding |
| `no entry has two canon records` | the at-most-one invariant |
| `nothing on his sheet is missing from the catalogue` | the open-world rule, counted |

### `group.test.ts`

| name | asserts |
|---|---|
| `every mode returns every entry` | all four modes sum to the same 84. **The switcher groups, it never filters** — Gate 1 rule 4 |
| `no entry appears in two groups` | |
| `group order is stable` | turn: Action, Bonus, Reaction, Passive, Other |
| `locked entries are not hidden in any mode` | 38 locked present in all four |

### `toggle.test.ts`

| name | asserts |
|---|---|
| `an eighth prepared spell is refused` | `ok: false`, `code: 'cap'`, `max: 7` |
| `the refusal carries canon's sentence verbatim` | string-equals `preparedSpellRules[0]` |
| `a 3rd-level spell is refused for having no slots` | `code: 'no-slots'`, and canon's rule 2 |
| `unpreparing is never refused` | at 7/7, untick returns ok |
| `always-prepared spells do not count against the cap` | Warding Bond et al. — canon VAL-01 |
| `preparing a canon spell puts it on the sheet` | `character.spells` grows, shape is `Spell` |
| `…and the turn engine can then see it` | **the wire.** `composeTurn` produces a row for it. A test aimed at the reducer is not aimed at the wire (finding BM) |
| `a locked spell cannot be prepared` | `code: 'locked'` |
| `the character is never mutated` | input frozen, `next` is a new object |

### `fighting-style.test.ts`

| name | asserts |
|---|---|
| `canon offers 11 styles` | |
| `Nix has none recorded` | against the real export — the finding that reopened Gate 1 |
| `recording Interception puts a CharacterFeat on the sheet` | `effects` is canon's array, verbatim |
| **`…and Interception is then a Reaction on the combat tab`** | **`composeTurn` produces the row.** This is the claim that closes half of item 8, and it must be proved through the engine, not asserted |
| `recording a second style replaces the first` | a Paladin has one |

### Browser proof — `docs/plans/grimoire/prove-catalogue.mjs`

Same discipline as `prove-slots.mjs`: **geometric, never `textContent`** (finding
Q). Each card counted only if it has a rect with area, is inside the viewport
after being scrolled to, and is the topmost element at its own centre.

| | |
|---|---|
| A | 84 cards painted, from his real seeded sheet |
| B | 38 of them carry a visible lock chip |
| C | a locked card still opens to all three bands |
| D | the four switcher chips each still yield 84 |
| E | the eighth prepare is refused **on screen**, with the rule text visible |
| F | "what does this cost me" is still 2 taps and band 1 needs no scroll at 390×844 |
| G | clean console |

---

## Least confident decisions

**1 · Extracting `withSaveDC` and `factsFromFeature` out of `turn/detail.ts` is a
pure move — but `turn/detail.ts` has shipped and is proved.** The risk is a
silent behaviour change in the combat sheet, which Marcus did not ask to have
touched. Mitigation: the move happens in its own slice, its existing tests must
stay green untouched, and the micro-revert is to put the old private functions
back and confirm the new structural test goes red. If that revert does *not* go
red, the extraction was cosmetic and the structural guarantee is fake.

**2 · `TurnCost` for a feature is parsed, and canon does not always price things
in a parseable way.** `'other'` is the honest bucket. But the Turn-cost grouping
mode is the *default* mode, and a mode whose largest group is "Other" is a bad
default. Worth measuring before Gate 4 is finished: **if more than ~15 of the 84
land in 'other', the default mode should be Source, not Turn cost.** Recorded
here so the answer is a measurement and not a preference.

> **BACKTRACKED 2026-08-29, during slice 4 — this decision was half right, and it
> was the wrong half that would have shipped.**
>
> The count came in at **20 of 84**, so the rule fired as written. But the rule
> compared only two of the four modes: it ruled *out* Turn cost, and then simply
> assumed Source. Measured over Marcus's real 84 by `group.test.ts`:
>
> | mode | groups | biggest | distribution |
> |---|---|---|---|
> | turn | 4 | **46** | Action 46 · Bonus 16 · Reaction 2 · Not a turn slot 20 |
> | source | 3 | **69** | Paladin 69 · Oath of the Hearth 13 · Feat 2 |
> | level | 6 | **22** | L1 19 · L2 13 · L3 12 · L4 8 · L5 10 · Features & feats 22 |
> | ready | 3 | **38** | Ready now 22 · Known, not prepared 24 · Locked 38 |
>
> Source's largest heading holds **69 of 84**. Opening on it would have shown
> Marcus one undifferentiated list with the word "Paladin" over it — which is
> the complaint that started this phase, wearing a heading. Turn cost's 46 is no
> better. Level is the only mode where nothing dominates, and it is the axis his
> question is usually about ("what can I cast at 2nd?").
>
> **Marcus was shown all four distributions and chose Level.** `group.ts` now
> reads `DEFAULT_GROUP_MODE = 'level'`, and `GROUP_MODES` leads with it.
>
> Why the wrong default did not ship: the guard was written as a live assertion
> rather than as prose here. `and the default is genuinely better — no group
> swallows the list` failed with *"biggest group holds 69 of 84: expected 69 to
> be less than 42"* the first time the suite ran. **The lesson for the rest of
> this phase is that a deferred decision should be deferred to an assertion, not
> to a paragraph** — a paragraph cannot fail, and this one was believed for two
> gates. The assertion stays in place: the catalogue grows with his level, and a
> default that stops organising should go red rather than quietly persist.

**3 · Band 1 is a LAYOUT, not a dump — and this is the decision most likely to
cause a silent loss.** `statBlock` already emits `Higher Level`, `Granted by` and
`Source` as rows (`format.ts:385–388`). The combat sheet lists all of them
plainly. The mockup Marcus approved does not: it promotes Casting Time to a hero
line, Damage/Healing to a 34px hero die, puts five facts in a grid, and moves
`Higher Level` down into band 2's upcast box.

So `bands.ts` yields labelled facts in canon's order and **decides no layout**;
`EntryDetailPanel` recognises the labels it has a place for and lays them out.

**The rule that makes this safe: a fact the layout does not recognise falls
through into the grid — it is never dropped.** Otherwise the next canon package
adds a field and it silently vanishes from the Grimoire while still appearing in
combat. Pinned by a test that hands the panel a fact with an invented label and
asserts it is rendered.

**4 · When canon and the sheet disagree, canon wins the words and the sheet wins
the state.** His Divine Smite feature has thin wording; canon has the paragraph.
`sheetText` is therefore only ever used when canon is silent. The counter-argument
is real — he may have edited a description on purpose — but the whole complaint
that opened this phase is that the app shows him his own thin wording while canon
holds the paragraph. `provenance` is shown on the card either way, so he can
always see which he is reading.

**5 · Preparing from the catalogue grows `character.spells` and nothing shrinks
it.** Unprepare sets `prepared: false` and leaves the record. Over a career the
sheet reaches ~53 spell records. No pruning is designed, deliberately: deleting a
record he may have hand-edited to get a few bytes back is the wrong trade. Flagged
because it is the decision most likely to be questioned later, and the answer is
"on purpose".

**6 · Replacing `GrimoireCard` rather than bending it.** It is 532 lines built
around `AbilityItem`, the sheet-shaped pair. Bending it to take `CatalogueEntry`
would leave both shapes alive at once. Replacing it means a big diff in one slice
— which Gate 4 should isolate so it can be reviewed on its own.
