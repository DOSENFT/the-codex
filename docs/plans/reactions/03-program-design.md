# Program Design: Held Reaction

## Files

| file | new? | why it lives there |
|---|---|---|
| `src/lib/turn/faces.ts` | **new** | splitting canon prose into cost-bearing faces. Turn-layer, not canon-layer: it reads a `CanonFeature` but speaks `EconomyFiling`, which is the turn engine's vocabulary. Canon must not learn about the action economy. |
| `src/lib/turn/faces.test.ts` | **new** | |
| `src/lib/turn/overlay.ts` | edit | carries the faces onto the option; attributes a feat row's words. `economyFromFeature` is **not** changed — its refusal is correct. |
| `src/lib/turn/compose.ts` | edit | emits one option per face. The composer owns the economy (`compose.ts:389`). |
| `src/lib/turn/feats.ts` | edit | what counts as the sheet having spoken, and where the words came from. |
| `src/lib/rules-2024/temp-hp.ts` | edit | which of his features canon says grant temp HP — the list the picker offers. This file already exists to read `tempHPSource`; naming its possible values belongs beside it. |
| `src/components/combat/TempHPSource.tsx` | **new** | the picker. One control, no state of its own. |
| `src/components/HPTracker.tsx` | edit | the road he walks. Temp entry asks for a source. |
| `src/components/combat/StatsBar.tsx` | edit | the same entry point, second copy. |
| `src/lib/turn/options.ts` | **READ ONLY — PINNED** | `overlay.test.ts` case 15. |
| `src/lib/turn/retaliation.ts` | **untouched** | it was never wrong. |

## Types & signatures

### `faces.ts` — canon prose → cost-bearing faces

```ts
import type { CanonFeature } from '../canon/types'
import type { EconomyFiling } from './overlay'

/** One ability inside a feature that canon prices separately. */
export interface CanonFace {
  /** The cost this face's opening sentence names, in canon's own words. */
  economy: EconomyFiling
  /** The sentence that named the cost. Becomes the row's mechanics line. */
  opener: string
  /** `opener` plus every following sentence that names no cost of its own. */
  text: string
}

/** Every separately-priced ability stated in this feature's prose.
 *
 *  Empty for the overwhelming majority of features — one cost, or none, is the
 *  normal shape, and those keep the existing `canonEconomy` refile path. Only
 *  returns rows when canon prices two or more things in one record. */
export function facesOf(feature: CanonFeature | undefined): CanonFace[]

/** Sentences, split on terminal punctuation followed by a capital. Exported
 *  because the test pins that no words are added and none are dropped. */
export function sentencesOf(text: string): string[]

/** How many distinct costs this one sentence names. 0, 1, or ≥2. */
export function costsNamedIn(sentence: string): EconomyFiling[]
```

The cost phrase, and why this one:

```ts
/** 2024 states a cost in prose as "as a <cost>". `feats.ts` matched the cost
 *  VERB for the same reason: the phrasing that carries the price is the thing
 *  to recognise, not the noun. A bare "Reaction" appears in sentences that
 *  describe someone else's reaction, or take one away. */
const COST_IN_PROSE = /\bas an?\s+(magic action|bonus action|reaction|action)\b/gi
```

**The refusal.** `facesOf` returns `[]` — not a partial answer — when any sentence
names two costs, when a face would carry no text, or when fewer than two faces
are found. Losing one of two abilities silently is the failure this whole phase
is about; refusing whole leaves the existing behaviour, which is at least
already understood.

### `overlay.ts` — carry the faces, attribute the words

```ts
export interface OverlaidOption extends ActionOption {
  // …existing…
  /** Canon prices more than one ability in this record. Empty is the norm. */
  canonFaces?: CanonFace[]
}
```

`apply` gains two things and changes nothing else:

```ts
// in the matchedFeature branch, beside the existing `canonEconomy`:
const faces = facesOf(matchedFeature)
...(faces.length > 0 ? { canonFaces: faces } : {}),
```

```ts
/* Provenance is a claim about THE WORDS ON SCREEN, not about whether canon has
   heard of the name. A feat row built from canon's effects must say so; one
   built from his own sheet must not. `feats.ts` is the only thing that knows,
   so it is the only thing that says. */
if ((option as Partial<FeatReactionOption>).wordsFrom === 'canon') base.provenance = 'canon'
```

### `compose.ts` — one option per face

Inside the existing bucketing loop, after `overlayCanon`, before the refile:

```ts
/** A feature canon prices twice becomes two options, one per face.
 *
 *  The sheet's own option is KEPT and keeps its own economy: it carries the
 *  flavour, the light radius and the leash — everything canon states without a
 *  price — and removing it would delete a row Marcus can see today. */
function facesToOptions(option: OverlaidOption): OverlaidOption[]
```

Each emitted face option is the base option with `actionEconomy` from the face,
`mechanicsLine` = `face.opener` (which is where `triggerFor` already looks), and
`effectsLine` = `face.text`. **The name is unchanged** — no label is invented.
Two faces of one feature land in two different buckets, so they appear under two
different economy headings and never collide in one list. `reactions.ts`'s
`disambiguateHeadings` remains available if they ever do.

### `feats.ts` — silence is a missing rule, not an empty field

```ts
export type SentenceSource = 'sheet' | 'description' | 'canon'

export interface FeatSentences {
  sentences: string[]
  from: SentenceSource
}

/** ONE function returns both the words and their provenance, because two
 *  functions would be two answers that can disagree about the same row. */
export function effectSentencesOf(feat: CharacterFeat, canon?: CanonFeat): FeatSentences

export interface FeatReactionOption extends ActionOption {
  /** Whose words this row is showing. */
  wordsFrom: SentenceSource
}

export function featReactionOptions(character: Character): FeatReactionOption[]
```

The one changed line, stated as the rule rather than the diff:

```
today:  own.length > 0                    → the sheet has spoken
after:  own.some(isReactionShaped)        → the sheet has spoken
```

### `temp-hp.ts` — what may have granted this

```ts
/** The features on this character that canon says grant temporary hit points.
 *
 *  The picker's whole option list. Derived from canon's `tempHP` fact — the same
 *  fact `compose.ts` reads to size the grant — so the app can never offer a
 *  source that would then fail to arm anything. */
export function tempHPGrantors(character: Character, ctx: FeatureContext): string[]
```

### `TempHPSource.tsx`

```tsx
interface TempHPSourceProps {
  /** From `tempHPGrantors`. Empty means the question is not worth asking. */
  sources: string[]
  value: string | null
  onChange: (source: string | null) => void
}
```

`null` is a real, selectable answer — **"Don't know"** — and it is the default. A
required question at the table is a question that gets answered wrongly to make
it go away. When `sources` is empty the component renders nothing and the temp
entry behaves exactly as it does today.

## Call stack

**Hearthfire, from canon to a reaction he can take:**

```
composeTurn
 └ overlayCanon(sheetOption)                     overlay.ts:337
    └ facesOf(canonFeature)                      faces.ts        ← NEW
       → [ {bonusAction, "…summoned or dismissed as a Bonus Action."},
           {reaction,    "As a Reaction, you can expend one use…"} ]
 └ facesToOptions(option)                        compose.ts      ← NEW
    → base(action) + face(bonusAction) + face(reaction)
 └ raw['reactions'].push(face)
 └ build(option,'reaction') → costOf → TurnOption
 └ tempHPGrantOf(option, cost, character)        compose.ts:157  ← GATE REMOVED
reactionRows(turn, character)                    reactions.ts
 └ retaliationOf(featureByName('Hearthfire Manifest'), ctx) → 1d10 Fire
```

**Arming it, the road he walks:**

```
HPTracker: taps Temp, types 11
 └ tempHPGrantors(character, ctx) → ["Hearthfire Manifest"]
 └ <TempHPSource> → he picks it (or "Don't know")
 └ setTempHP(character, 11, chosen)              character.ts:1516  (unchanged)
… later, logs 6 damage taken …
 └ activeRetaliation(character, ctx) → 1d10 Fire   ← today: always null
 └ <RetaliationCapture>                            ← built, never shown
 └ reduce: addRetaliation(combat, rolled)
 └ CombatHelper:808 tally={tallyOf(combat)} → "23 Fire over 4 hits"
```

## Test plan

Named cases, and what each asserts. **Every one of these is written to fail
against today's code**; the ones that cannot are marked, because a test that
passes before the change tests nothing.

### `faces.test.ts`

| case | asserts |
|---|---|
| splits Hearthfire Manifest into exactly two faces | `facesOf` → 2, economies `['bonusAction','reaction']` |
| the cloak face carries the retaliation sentence | its `text` contains `1d10 Fire` |
| the summon face does not | its `text` contains neither `1d10` nor `Temporary Hit Points` |
| leading flavour belongs to no face | neither `text` contains `sheds Bright Light` |
| a one-cost feature yields nothing | Aura of Solace → `[]`, so the existing refile still owns it |
| a feature with no prose yields nothing | `facesOf(undefined)` → `[]` |
| **refuses** a sentence naming two costs | synthetic "as a Bonus Action or as a Reaction, you…" → `[]` |
| **refuses** rather than returning one face | a record with one cost → `[]`, never a single-face answer |
| no words invented, none dropped | `sentencesOf(t).join(' ')` reconstructs `t` |
| recognises by shape, not by name | a synthetic homebrew feature with two costs splits identically |
| does not fire on someone else's reaction | "the target can't take a Reaction" names no cost for us |

### `feats.test.ts` (extended)

| case | asserts |
|---|---|
| **his real Sentinel yields 2 reaction options** | the phase's headline. Fails today with 0. |
| three marketing bullets are not the sheet speaking | `effectSentencesOf(sentinel).from === 'canon'` |
| a sheet that DOES state a reaction still wins | homebrew Sentinel with one reaction-shaped effect → `from === 'sheet'`, canon's two never appear |
| Lucky still yields nothing | canon's Lucky is not reaction-shaped either; 0 rows, from either source |
| the words carry their provenance | `wordsFrom` on every emitted option |

### `overlay.test.ts` (extended)

| case | asserts |
|---|---|
| case 15 still passes | `options.ts` byte-identical. **Passes today — a pin, not a new claim.** |
| a canon-worded feat row reports `provenance: 'canon'` | |
| a sheet-worded feat row still reports `'sheet'` | |
| `economyFromFeature` still returns undefined for two costs | its refusal is deliberate and must not be "fixed" |

### `compose` (extended)

| case | asserts |
|---|---|
| **Hearthfire Manifest appears in the reactions bucket** | fails today |
| and still appears where it appears today | the base option is not deleted |
| the cloak face grants temp HP | `grantsTempHP === 11` at Cha 16 / level 7 |
| **with `resourcePools: []`** | the untied gate. Fails today — this is decision 1's assertion, at a level where the two answers differ. |
| a costed feature does not grant temp HP for free | decision 1's other side |
| ids stay unique across faces | the Sentinel collision, one layer up |

### `retaliation` (extended, end to end)

| case | asserts |
|---|---|
| **his real sheet + cloak taken → `activeRetaliation` non-null** | the item-7 headline |
| hand-typed temp HP with a chosen source arms it | the F3 road |
| hand-typed with "Don't know" does **not** arm it | the app must not guess |
| `tempHPGrantors` offers only what canon says grants temp HP | never a free-text list |

### Browser proof — `prove-reactions.mjs`

Geometry, never `textContent` (finding Q). Addressed by role/aria, never `hasText`
(this phase's own law from the Grimoire). One `clauses` array read by both the
printed narrative and the verdict.

| check | claim |
|---|---|
| A | the reactions band paints **4 rows**: Hearthfire Manifest, Sentinel ×2, Opportunity Attack — The Dawn Guardian |
| B | each row's trigger is on screen, in canon's words, with area, topmost at its own point |
| C | Sentinel's two rows carry two different triggers and two different detail buttons |
| D | no row whose words came from canon is tagged **"your own"** |
| E | take the cloak → temp HP appears → log damage → the retaliation prompt is **visible** |
| F | roll it → the tally reads a number → undo → the tally goes back |
| G | hand-typed temp HP with "Don't know" → logging damage offers **nothing** |
| H | clean console |

#### A and D were rewritten at slice 6, against a measurement — Gate 3 reopened

Both were written before any of this phase's code existed, and both were wrong
about the app rather than about the goal. `measure-slice6.mjs` and
`measure-slice6b.mjs`, run 2026-08-31 on his real sheet at 390×844, are the
record. Slice 1's law a fourth time: *a thing that models the app after the
repair cannot show the fault* — in slice 1 the model was `nix.ts`, in slice 5 it
was `04-slices.md`, and here it was this table.

**A — the fourth row is not Interception.** Measured, the band paints Hearthfire
Manifest, two Sentinel rows, and **Opportunity Attack — The Dawn Guardian**;
`interceptionOnTab` came back `[]`, so the word is nowhere on the combat tab at
all. This is not a regression and not a missing feature. Interception is a
Fighting Style; phase 3 shipped the picker and the wire, and
`fighting-style.test.ts` pins both halves on his real sheet — no style recorded →
no row, `recordFightingStyle(nix, INTERCEPTION)` → exactly one Reaction row
carrying canon's dice and canon's trigger. **Nothing has ever asked him which
style he took, and his stored sheet records no answer.** So A now names what his
sheet actually supports. The gap is real and it is item 8's own wording; it is
carried in `00-status.md` as an open item with the one-tap fix, and it is not
closed by rewording a check.

**D was backwards, and the app fails the corrected version.** The marker is
NEGATIVE: `OptionDetailSheet.tsx:143` paints "your own" when
`provenance === 'sheet'` and paints nothing at all when the words are canon's.
A check looking for a marker *on* the canon rows would have failed against a
correct app. Restated to what the marker means, it caught something:

| detail sheet | tagged "your own" |
|---|---|
| Hearthfire Manifest | no |
| Sentinel · takes the Disengage action | **yes** |
| Sentinel · attacks a target other than you | **yes** |
| Opportunity Attack — The Dawn Guardian | yes |

Both Sentinel sheets carry canon's own text — slice 2 put it there — under a tag
that says the words are his. That is this phase's fault verbatim, and
`overlay.ts:427` names it in as many words: *"the book's words, over a mark that
says they are his… the reason Marcus could quote a rule at his DM believing he
had written it."* Slice 2 fixed the ROW's provenance in `overlay.ts:447`. The
detail sheet never reads it — `detail.ts:198` calls `canonBands` with
`feat: null`, so a feat resolves as neither spell nor feature and falls to
`'sheet'`. The fault survives one layer below where it was fixed, on the exact
screen he would read before quoting a rule.

D is left as a check the app currently **fails**. A phase proof edited until it
goes green proves the editor, not the app.

**Resolved 2026-08-31.** Marcus ruled *fix it now*, and slice 5b did:
`detail.ts` reads `option.provenance ?? bands.provenance` rather than judging
the fact a second time. D now passes — and was **shown able to fail** by
reverting that one line on the built app, which took D down alone and left the
other eight green. The paragraph above stands as written because the order
matters: D was restated against a measurement *before* anything was fixed, and
the fix came after, not to make the check go green.

## Least confident decisions

1. **Untying `tempHPGrantOf` from `resourcePoolId`.** Pinned by two assertions
   that disagree — grant with an empty pool list, no grant for a costed effect —
   rather than by this paragraph. If both cannot be made to pass, the gate was
   load-bearing and Gate 2 must be reopened.
2. **`facesOf` refuses unless it finds ≥2 faces.** A single-face answer would
   overlap the existing `canonEconomy` refile and two mechanisms would be
   deciding one question. Refusing keeps exactly one owner per case. The cost:
   a feature canon prices once, in prose only, with no `mechanics` bag, still
   falls to the `'action'` default. **That is a remaining instance of this
   phase's own fault and it is being left in deliberately** — it is not on
   Marcus's list, and closing it means touching the pinned file.
3. **`"as a <cost>"` as the whole cost phrase.** Narrow on purpose. Canon might
   write "using your Reaction" or "for the cost of a Bonus Action". Those would
   yield no face and fall back to today's behaviour — a miss, never a wrong
   answer. Widening it is a slice, not a rewrite.
4. **The picker defaults to "Don't know."** It means a fast Enter at the table
   leaves the retaliation unarmed — exactly today's behaviour, and arguably the
   thing he was complaining about. The alternative, defaulting to the sole
   grantor, is the guess he told me not to make. Worth watching once he plays it.
