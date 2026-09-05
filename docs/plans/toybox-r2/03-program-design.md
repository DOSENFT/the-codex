# Program Design: Toybox round two (`hearth-7-r2`)

## Files

**Changed — the engine, five files, all small**

| File | Why it changes |
|---|---|
| `src/lib/toybox-seed/types.ts` | `SeedNeeds`; the three `Seed*` aliases gain `needs?`; the scoped exception to the "authored for a KIND of character" ruling is written here, next to the ruling, because a licence recorded anywhere else is a licence the next author never reads. |
| `src/lib/toybox-seed/profile.ts` | `weaponProperties: Set<string>` — the primary melee weapon's properties, lowercased, exactly as `feats` already is. |
| `src/lib/toybox-seed/template.ts` | `meetsNeeds`, and one call at the top of each of the three resolvers. Also the strip that keeps `needs` out of stored data. |
| `src/lib/toybox-seed/seed.ts` | `findPack` → `findPacks`; the apply loop; `SeedResult.packId` → `packIds`; `force` becomes a list of ids. |
| `src/lib/toybox-seed/index.ts` | Export surface follows: `findPacks`, `type SeedNeeds`. |
| `src/components/ToyboxPanel.tsx` | The reseed button computes which packs are missing and forces those. ~8 lines. |

**New — the content, four files, mirroring round one's split**

| File | Why it lives there |
|---|---|
| `packs/hearth-7-r2.ts` | Meta and gate only. Read by someone checking the seeder. |
| `packs/hearth-7-r2.combos.ts` | Ten. Read by someone holding a Player's Handbook. |
| `packs/hearth-7-r2.tactics.ts` | Eight. |
| `packs/hearth-7-r2.persona.ts` | Six. Read by Marcus, and by nobody else, ever. |
| `pack-hearth-7-r2.test.ts` | Round one's discipline, plus two claims round one could not make. |

**Changed — tests and provers**

`seed.test.ts`, `seed-empty.test.ts`, `template.test.ts`, `profile.test.ts` (new cases and
the `force` signature), and the eight `prove-slice*.mjs` probes in
`docs/plans/toybox-seed/`, whose hard-coded counts and id lists move. `pack-hearth-7.test.ts`
is **not** changed — it imports `HEARTH_7` and resolves it directly, so it was already
scoped to round one.

## Types & signatures

```ts
// types.ts — NEW
/** What a character must HAVE, as opposed to what the text must be able to SAY.
 *
 *  Round one had one way to be wrong for a character — the text could not be
 *  written — and dropping was the answer. This is the second way: the text
 *  writes perfectly and the character cannot do it. Same answer, same code path.
 *
 *  PERMANENT FACTS ONLY. Never inventory, never prepared spells. Four combos
 *  want a flask of oil and his supplies are empty; gating on that would hide
 *  the cards whose job is to tell him to buy one. */
export interface SeedNeeds {
  /** Feat names. Matched case-insensitively against the sheet. */
  feats?: string[]
  /** Properties the primary melee weapon must carry — 'Reach', 'Two-Handed'. */
  weaponProperties?: string[]
}

export type SeedCombo = Omit<ToyboxCombo, 'favorite' | 'createdAt'> & { needs?: SeedNeeds }
export type SeedTactic = Omit<ToyboxTactic, 'favorite' | 'createdAt'> & { needs?: SeedNeeds }
export type SeedPersonaPlay = Omit<ToyboxPersonaPlay, 'favorite' | 'createdAt'> & { needs?: SeedNeeds }
```

```ts
// profile.ts — one added field
export interface SeedProfile {
  // …unchanged…
  /** Lowercased, so a lookup is `weaponProperties.has('reach')`. Empty for a
   *  character with no melee weapon — which is why `needs.weaponProperties`
   *  drops such an entry for free, without a null check at the call site. */
  weaponProperties: Set<string>
}
```

```ts
// template.ts — NEW, and the only new logic in the whole engine change
/** Does the character HAVE what this entry needs? Absent needs → yes. */
export function meetsNeeds(needs: SeedNeeds | undefined, profile: SeedProfile): boolean

// The three resolvers keep their signatures exactly. Each gains, as its first
// statement:  if (!meetsNeeds(entry.needs, profile)) return null
//
// And each changes its return spread from `{ ...combo, … }` to a spread that
// EXCLUDES `needs`. This is not tidiness. `resolveCombo` returns the object
// that is written to localStorage and lives there for as long as the character
// does; letting an authoring-time field ride into user data means every future
// reader of a stored combo has to know what `needs` was and why it is stale.
export function resolveCombo(c: SeedCombo, p: SeedProfile, at: number): ToyboxCombo | null
export function resolveTactic(t: SeedTactic, p: SeedProfile, at: number): ToyboxTactic | null
export function resolvePersonaPlay(x: SeedPersonaPlay, p: SeedProfile, at: number): ToyboxPersonaPlay | null
```

```ts
// seed.ts — plural
/** Every pack whose gate this character satisfies, in `PACKS` order.
 *  An empty array is a normal answer and means the same as today's `null`. */
export function findPacks(character: Character): SeedPack[]

/** Unchanged. Already takes a pack id; already right. */
export function packPresent(data: ToyboxData, packId: string): boolean

export interface SeedResult {
  data: ToyboxData
  /** True if ANY pack contributed at least one entry. */
  changed: boolean
  /** Every pack that MATCHED, applied or not. Was `packId: string | null`. */
  packIds: string[]
}

export function seedToybox(
  data: ToyboxData,
  character: Character,
  createdAt: number,
  /** Pack ids to apply AGAIN despite their marker. Was `{ force?: boolean }`,
   *  which with two packs cannot say which one is missing — and forcing both
   *  appends a `~2` duplicate of the one still on the screen. */
  opts?: { force?: string[] },
): SeedResult
```

```ts
// packs/hearth-7-r2.ts
export const HEARTH_7_R2: SeedPack = {
  id: 'hearth-7-r2',
  label: 'Load the round two plays',
  gate: { class: 'Paladin', subclass: 'Oath of the Hearth', minLevel: 5, maxLevel: 8 },
  combos: HEARTH_7_R2_COMBOS,
  tactics: HEARTH_7_R2_TACTICS,
  personaPlays: HEARTH_7_R2_PERSONA,
}

// seed.ts
const PACKS: readonly SeedPack[] = [HEARTH_7, HEARTH_7_R2]   // order = card order
```

## Call stack

**Mount — the path Marcus's next open of the Toybox takes**

```
ToyboxPanel useEffect [character.id]
└─ loadToybox('nix')                    → { …31 entries…, seededPacks: ['hearth-7'] }
└─ seedToybox(data, character, now)
   ├─ findPacks(character)              → [HEARTH_7, HEARTH_7_R2]
   ├─ buildProfile(character)           → once, reused by every entry of every pack
   ├─ pack HEARTH_7
   │  └─ marked, not forced             → skipped, contributes nothing
   ├─ pack HEARTH_7_R2
   │  ├─ resolveCombo × 10
   │  │  ├─ meetsNeeds(needs, profile)  → false → null  (no Sentinel, no reach)
   │  │  ├─ resolveText per field       → null on any unresolvable token
   │  │  └─ strip `needs`, add favorite:false, createdAt
   │  ├─ resolveTactic × 8, resolvePersonaPlay × 6
   │  ├─ survivors === 0 ?              → skip, and DO NOT mark   (round one's rule)
   │  └─ readdress + claim ids against `taken`, which already holds all 31
   └─ → { data: {…31 + survivors…, seededPacks: ['hearth-7','hearth-7-r2'] },
          changed: true, packIds: ['hearth-7','hearth-7-r2'] }
└─ persist(data)                        → one write, one render
```

`taken` is seeded from the incoming Toybox and added to as each entry lands, so an id
clash between the two packs is impossible by construction rather than by convention.

**The reseed button**

```
render
└─ packs   = findPacks(character)
└─ missing = packs.filter(p => marked(p) && !packPresent(data, p.id))    useMemo
└─ seedProps = missing.length === 0 ? {} : {
      onSeed:    () => persist(seedToybox(data, ch, now, { force: missing.map(p => p.id) }).data),
      seedLabel: missing.length === 1 ? missing[0].label : 'Reload the seeded plays',
   }
```

One button. If both batches are gone, one press brings both back. A batch still on the
screen is never in `missing`, so it is never forced, so it is never duplicated — the
guarantee round one's comment made in prose is now made by the argument.

## Test plan

Every case below fails against today's code. That is the entry requirement.

**`template.test.ts` — the `needs` gate**

- `an entry needing a feat the character lacks resolves to null` — a combo with
  `needs: { feats: ['Sentinel'] }` against the fixture, which has no feats.
- `the same entry survives for a character who has the feat` — the pair, so the test
  proves a gate rather than a blanket refusal.
- `feat matching ignores case and surrounding space` — `'  sentinel '` on the sheet.
- **`an entry needing a Reach weapon is dropped for a five-foot weapon`** — the case that
  matters most, because `{{weaponReach}}` resolves to `5` rather than failing, so today
  this entry would paint "Reach 5 ft" on a glaive combo and look merely odd.
- `an entry needing a weapon property is dropped for a character with no melee weapon`
- **`needs never reaches the resolved entry`** — `'needs' in resolved` is `false` for all
  three resolvers. Guards the localStorage leak; fails today because `{ ...combo }` spreads it.

**`profile.test.ts`**

- `weaponProperties comes from the primary melee weapon, lowercased`
- `weaponProperties is empty for a character carrying only a bow`

**`seed.test.ts` — multi-pack**

- **`a Toybox already marked hearth-7 receives hearth-7-r2 and nothing else`** — the exact
  scenario on Marcus's phone. Asserts: round-two ids present, **no round-one id appears
  twice**, no `~2` id anywhere, `seededPacks` is `['hearth-7','hearth-7-r2']`.
- `a fresh Toybox receives both packs in one call, round one first`
- `entries are appended, so anything the user wrote keeps the top of the list` — round
  one's guarantee, re-asserted now that two packs append in sequence.
- `force names one pack and re-applies only that one` — round two present, round one
  restored, and **no `~2` anywhere**, which is the duplication bug the signature change exists
  to make unrepresentable.
- `force on a pack whose entries are still present re-addresses rather than collides` —
  keeps `readdressCombo` reachable and tested; it is a safety net, not a road.
- `findPacks returns an empty array for a Wizard, and seedToybox writes nothing`

**`seed-empty.test.ts`**

- `a pack whose every entry drops is not marked, and the pack after it still seeds` — round
  one proved the first half with one pack. The second half is new and is the multi-pack
  failure mode: one bad pack must not abort the loop.

**`pack-hearth-7-r2.test.ts` — new file. Round one's discipline plus three new claims**

Carried from round one, unchanged in spirit:

- every entry's id starts `seed:hearth-7-r2:`, all unique, **and none collides with a
  `hearth-7` id**
- no derived number is written literally — resolve the pack against two different sheets
  and require the numbers to differ
- no party token anywhere outside `annotations`
- every `skillCheck` is ≤ 24 characters
- no `keyPhrases` entry contains a quotation mark
- every combo and every tactic carries a non-empty `requirements`
- every entry that names Sentinel, Graze, Interception, Searing Smite's concentration, or a
  flask of oil's fire damage carries a `warning` annotation — the rule is that a claim his
  own files name but never define must say so

New, and each one is a Gate 1 ruling made mechanical:

- **`every combo is one turn`** — at most one `action` block, at most one `bonus`, at most
  one `reaction`. This is the combo/tactic line as an assertion. Without it the line is a
  paragraph in a doc that the next author does not read.
- **`every tactic is not one turn`** — at least two `actions`, and no tactic's text is a
  numbered action-economy sequence (no `actions` entry begins `ACTION` / `BONUS` /
  `REACTION`).
- **`the backstory is named on purpose`** — the exact inverse of round one's
  `names nobody from his backstory`. At least one persona play names Fate, and at least one
  names Scar. A test that asserts the exception is used is the only thing that stops the
  exception being quietly re-tightened by someone who read round one's test and not this doc.

**Provers** — `prove-slice2.mjs` and its seven siblings. Their `PACK_COMBOS = 14` and their
exact id lists move to the round-two totals. **The literal is updated to the new true
number and never loosened to `>=`.**

## Least confident decisions

1. **`force: string[]` rather than keeping `force: boolean` and adding `only: string[]`.**
   The list is one concept instead of two, but it changes every existing call site. If the
   churn in `seed.test.ts` reads badly, the alternative is one line different.

2. **`needs` deliberately does not cover prepared spells.** Three combos want Compelled
   Duel and one wants Searing Smite, and he has neither prepared today. Same reasoning as
   consumables: the tactic that tells him to prepare them is the point, and a combo hidden
   until he prepares the spell can never be the reason he prepares it. But this is the
   judgement most likely to be wrong — it means four cards on his phone are, today, not
   runnable, and their `requirements` line is the only thing that says so.

3. **`needs` is stripped before storage.** The alternative — let it ride — costs nothing at
   runtime and would leave a record of why the entry was dealt. I think a stored entry
   should describe the play and nothing about the machinery that chose it, but this is a
   taste call, not a correctness one.

4. **At most one `action` block per combo.** A turn genuinely can have two `free` blocks and
   the test permits that, but a turn can also, legitimately, contain an Action and then a
   second Action from a rare effect. If any of the ten combos needs an exception, the test
   is wrong and not the combo.

5. **`maxLevel: 8`, matching round one.** At level 9 both packs stop matching and he gets
   nothing new. That is correct — third-level slots change every one of these — but it
   means the Toybox goes quiet at exactly the level he is heading for.

6. **`PACKS` order decides card order.** Round one's 31 stay on top and round two appends
   below, which means his best new content is furthest from his thumb. Favourites do not
   sort. Reversing the order would put round two first for a *new* character too, which is
   wrong. Worth flagging: the real fix is sorting favourites to the top, and that is a
   separate piece of work he has not asked for.
