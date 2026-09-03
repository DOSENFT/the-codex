# Program Design: Toybox seed

## Files

**Changed — four, all additively.**

| File | Change |
|---|---|
| `src/lib/toybox.ts` | `PlayNote` type; `annotations?` on all three entry types; `requirements?` on `ToyboxCombo`; `seededPacks?` on `ToyboxData` and its default in `loadToybox`. Types live here because this is the module that owns them and the one every consumer already imports. |
| `src/components/toybox/ComboCard.tsx` | Renders requirements and annotations. |
| `src/components/toybox/TacticCard.tsx` | Renders annotations; **re-renders requirements** so they stop looking exactly like tags. |
| `src/components/ToyboxPanel.tsx` | Seeds on mount; passes an optional second button to `EmptyState`; `PersonaPlayCard` renders annotations. |

**New — `src/lib/toybox-seed/`.** Split so no file is both logic and content: content
files are read for *rules accuracy*, logic files for *correctness*, and mixing them makes
both reviews worse.

| File | Why it exists |
|---|---|
| `types.ts` | `SeedPack`, `SeedProfile`, `PartyRole`, and the three template entry types. |
| `profile.ts` | `buildProfile` — the only place a rule number is computed from the sheet. |
| `party.ts` | The `backstory.relationships` parse, alone, because it is the one piece of guessing in the feature and it deserves its own tests. |
| `template.ts` | The token table and resolution. The only place a `{{token}}` is understood. |
| `seed.ts` | `findPack`, `seedToybox`. Pure. |
| `packs/hearth-7.ts` | Pack meta + gate, and the barrel that assembles the three content files. |
| `packs/hearth-7.combos.ts` | ~12 combos. |
| `packs/hearth-7.tactics.ts` | ~10 tactics. |
| `packs/hearth-7.persona.ts` | ~5 persona plays. |
| `index.ts` | Barrel — `seedToybox`, `findPack`, and nothing else. The packs are not exported; nothing outside this folder may reach a raw template. |

**New tests — seven.** Listed with their assertions under Test Plan.

## Types & signatures

### `src/lib/toybox.ts` — additions only

```ts
/** A line under an entry that is not a step: where to stand, who to call out to,
 *  or what the app is not sure about. One field with a kind, not three fields —
 *  the three render identically apart from an icon and a colour. */
export type PlayNoteKind = 'positioning' | 'party' | 'warning'

export interface PlayNote {
  kind: PlayNoteKind
  text: string
}

// ToyboxCombo       += requirements?: string[]
// ToyboxCombo       += annotations?: PlayNote[]
// ToyboxTactic      += annotations?: PlayNote[]
// ToyboxPersonaPlay += annotations?: PlayNote[]
// ToyboxData        += seededPacks?: string[]
```

`loadToybox` gains exactly one line: `seededPacks: parsed.seededPacks ?? []`. Every
Toybox in localStorage today keeps parsing, and its first read reports "nothing seeded
yet" — which is true.

### `src/lib/toybox-seed/types.ts`

```ts
export type PartyRole =
  | 'barbarian' | 'bard' | 'cleric' | 'druid' | 'fighter' | 'monk'
  | 'paladin' | 'ranger' | 'rogue' | 'sorcerer' | 'warlock' | 'wizard'

/** Every number and name the content is allowed to speak. Nothing else may be
 *  written into a seeded string, which is what makes the "no hardcoded numbers"
 *  test possible. */
export interface SeedProfile {
  level: number
  proficiency: number
  strMod: number
  chaMod: number
  auraBonus: number        // max(1, chaMod) — canon's floor
  auraRadius: number       // 10, or 30 from level 18
  cloakTempHp: number      // level + chaMod
  saveDC: number
  spellAttack: number
  weaponName: string
  weaponDice: string
  weaponReach: number
  fightingStyle: string | null
  feats: Set<string>       // lowercased names, for `has('sentinel')`
  party: Partial<Record<PartyRole, string>>
}

/** The three entry templates: the stored type minus the two fields that are
 *  facts about the user rather than about the play. */
export type SeedCombo       = Omit<ToyboxCombo, 'favorite' | 'createdAt'>
export type SeedTactic      = Omit<ToyboxTactic, 'favorite' | 'createdAt'>
export type SeedPersonaPlay = Omit<ToyboxPersonaPlay, 'favorite' | 'createdAt'>

export interface SeedPack {
  id: string               // 'hearth-7'
  label: string            // shown on the empty-state button
  gate: {
    class: string
    subclass: string
    minLevel: number
    maxLevel: number
  }
  combos: SeedCombo[]
  tactics: SeedTactic[]
  personaPlays: SeedPersonaPlay[]
}
```

### `src/lib/toybox-seed/party.ts`

```ts
/** Reads the party out of free text, and refuses to guess.
 *
 *  A relation qualifies only if it says "party" AND names a class in
 *  parentheses. Scar — "goliath. Partner, moral compass" — fails both. First
 *  match per role wins; a second wizard is ignored rather than overwriting. */
export function resolveParty(character: Character): Partial<Record<PartyRole, string>>
```

### `src/lib/toybox-seed/profile.ts`

```ts
export function buildProfile(character: Character): SeedProfile
```

### `src/lib/toybox-seed/template.ts`

```ts
/** Every token the content may use. A token absent from this table is a typo,
 *  and a typo must not ship as visible braces. */
export const TOKENS: Record<string, (p: SeedProfile) => string | null>

/** Resolves every `{{token}}`. Returns null if ANY token is unknown or resolves
 *  to null — the caller then drops what the text belonged to. Never returns a
 *  string containing braces. */
export function resolveText(text: string, p: SeedProfile): string | null

/** Drops an annotation whose text cannot resolve; keeps the rest. */
export function resolveNotes(notes: PlayNote[] | undefined, p: SeedProfile): PlayNote[] | undefined

/** Null when a load-bearing field cannot resolve — name, description, any block
 *  label, any tactic action, any key phrase. Annotations are not load-bearing. */
export function resolveCombo(c: SeedCombo, p: SeedProfile, createdAt: number): ToyboxCombo | null
export function resolveTactic(t: SeedTactic, p: SeedProfile, createdAt: number): ToyboxTactic | null
export function resolvePersonaPlay(x: SeedPersonaPlay, p: SeedProfile, createdAt: number): ToyboxPersonaPlay | null
```

The token table, concretely — signed where the game writes it signed:

```
{{level}} 7    {{prof}} +3       {{auraBonus}} +3   {{auraRadius}} 10
{{saveDC}} 14  {{spellAttack}} +6 {{cloakTempHp}} 10 {{weapon}} The Dawn Guardian
{{weaponDice}} 1d10  {{weaponReach}} 10  {{strMod}} +4
{{wizard}} Rune Willow   {{rogue}} Ponzi   {{ranger}} Ketza   {{bard}} Talon
```

### `src/lib/toybox-seed/seed.ts`

```ts
export interface SeedResult {
  data: ToyboxData
  changed: boolean
  packId: string | null    // the pack that matched, whether or not it was applied
}

export function findPack(character: Character): SeedPack | null

/** Pure. No clock, no randomness, no storage, and it does not mutate `data`.
 *  `force` is the empty-state button: seed again even though the marker is set. */
export function seedToybox(
  data: ToyboxData,
  character: Character,
  createdAt: number,
  opts?: { force?: boolean },
): SeedResult
```

### `EmptyState` — one optional pair of props

```ts
// added to the existing prop type:
//   onSeed?: () => void
//   seedLabel?: string
// Rendered as a secondary button beside "Create First", only when both are given.
```

## Call stack

**Seeding (mount, and on character change)**

```
ToyboxPanel effect [character.id]
└─ loadToybox(character.id)                       existing, unchanged but for seededPacks
└─ seedToybox(data, character, Date.now())        pure
   ├─ findPack(character)                         class · subclass · level window
   ├─ seededPacks.includes(pack.id) → { changed:false }   ← the whole migration story
   ├─ buildProfile(character)
   │  └─ resolveParty(character)                  backstory.relationships parse
   ├─ pack.combos.map(resolveCombo).filter(Boolean)
   ├─ pack.tactics.map(resolveTactic).filter(Boolean)
   └─ pack.personaPlays.map(resolvePersonaPlay).filter(Boolean)
└─ changed ? persist(result.data) : setData(result.data)
   └─ persist = setData + saveToybox                     existing helper, untouched
```

`seedToybox` is called from the effect, never from the `useState` initialiser at line 111
— seeding is a side effect and must not run during render. The initialiser keeps calling
`loadToybox`; the effect runs immediately after and seeds. One extra render, on mount, once.

**Manual re-load**

```
EmptyState "Load the starter plays" press
└─ seedToybox(data, character, Date.now(), { force: true })
└─ persist(result.data)
```

**Rendering** — `ComboCard` / `TacticCard` / `PersonaPlayCard` each gain one
`{entry.annotations?.map(...)}` block and, for the two that need it, a requirements block
with its own label. No new component; three small additions to three existing renders.

## Test plan

Seven files. Every assertion below fails against the code as it stands today — the ones
that could be written to pass trivially are called out and sharpened.

**`template.test.ts`**
- resolves a known token to the profile's number, signed where the table says signed
- returns `null` for an unknown token — never a raw `{{`, never an empty string
- returns `null` when a party token has no member in that role
- returns text unchanged when it contains no tokens
- `resolveNotes` drops only the unresolvable note and keeps its siblings
- `resolveCombo` returns `null` when a **block label** cannot resolve, but survives an
  unresolvable **annotation** — the load-bearing/decorative split, asserted directly

**`party.test.ts`**
- reads Nix's four out of the real relationship strings, by role
- **refuses Scar** — "Partner, moral compass", no class, no "party"
- refuses a relation with a parenthesis that is not a class ("(Baker)")
- refuses a class in parentheses with no "party" word ("Rival (Wizard) who hunts him")
- first match per role wins; a second bard does not overwrite the first

**`profile.test.ts`**
- aura bonus is the Charisma modifier — **+3 at CHA 16**, and Gate 1's whole reason for
  existing: the doctrine's +4 is wrong for this character
- aura bonus floors at +1 for a CHA 8 paladin, and does not go negative
- cloak temp HP is level + CHA mod — 10 at level 7, **12 at level 8 with CHA 18**
- aura radius is 10, and 30 from level 18
- finds Sentinel and Lucky on the sheet; reports a feat that is absent as absent

**`seed.test.ts`**
- seeds a matching Paladin of the Hearth, and records `hearth-7` in `seededPacks`
- seeds nothing for a Wizard — `changed: false`, `packId: null`, data identical
- seeds nothing for a Paladin 3 (below the floor) or a Paladin 9 (above the ceiling)
- **does not seed twice**: feeding the result back in changes nothing
- **does not resurrect**: seed, delete one entry, seed again — it stays deleted
- `force: true` seeds through the marker, and gives the new copies ids that do not
  collide with the ones already present
- entries the user wrote are preserved, and seeded entries are appended after them
- **purity**: identical inputs give deeply-equal outputs, and the input object is
  unchanged afterwards (asserted against a structured clone taken before the call)

**`pack-hearth-7.test.ts`** — the content tests, and the sharpest in the plan
- **no `{{` survives** into any string of any resolved entry, at any depth
- every id starts `seed:hearth-7:` and every id is unique
- every combo and every tactic carries at least one requirement — the prep-index
  promise, enforced rather than hoped for
- every `category` is one the tabs can actually filter by, and every `priority` is valid
- **the unsourced three are labelled**: any entry whose text mentions Interception,
  Sentinel or Graze must carry a `kind: 'warning'` annotation. This is Gate 2's
  honesty requirement, as a test.
- **numbers are not hardcoded**: the same pack resolved for a CHA 18 Paladin 8 states
  `+4` and `12`, and does not contain `+3` or the Nix-specific `10 temp`. A hardcoded
  string passes every other test in this file and fails this one.
- a character with no resolvable party gets the pack **without** its party annotations,
  and with every other entry intact

**`ComboCard.test.tsx`** (`renderToStaticMarkup`, no DOM — repo convention)
- renders requirement text, under its own heading
- renders one row per annotation, and a different marker per kind
- a combo with neither renders markup **identical** to the pre-change card for the same
  combo — the guarantee that this addition costs nothing to everything he already wrote

**`TacticCard.test.tsx`**
- **a requirement no longer renders as a bare neutral badge** — today `requirements` and
  `tags` both render as `<Badge variant="neutral">` and are indistinguishable in the
  markup. The test renders a tactic whose requirement and tag have the *same text* and
  requires the two to be told apart. Against today's component that is impossible.
- annotations render, by kind
- a tactic with no annotations is unchanged

## Least confident decisions

1. **Auto-seed on mount at all.** The alternative is button-only, which is simpler and
   surprises nobody. He asked to "prefill," which reads as auto — but auto means the
   first thing he sees after this ships is content he did not ask for at that moment.
   The marker makes it a one-time event, so the blast radius is one mount. Still the
   call most worth challenging.
2. **Dropping an entry whose token fails, rather than degrading the sentence.** A combo
   that vanishes silently is invisible; a combo that says "call it out to your wizard"
   is merely vaguer. I chose silence because Gate 1's failure signal is "content a
   paladin who isn't me could use," and generic phrasing *is* that content. Reversible.
3. **`annotations` as one field with a `kind`** rather than `positioning?: string`,
   `partyNote?: string`, `warning?: string`. One field means ordering is authored and
   the renderer is a single map; three fields mean the type says what each is for.
4. **`maxLevel: 8`.** At level 9 the pack stops offering itself and already-seeded
   entries stay put and go quietly stale — Aura of Solace and the slot table both change.
   The alternative is to keep offering with a staleness banner. Vanishing is the honest
   default but it does mean the app stops helping exactly when he levels.
5. **Authored ids, and what `force` does with them.** Namespaced ids make the
   never-resurrect test easy, but a forced re-seed would create duplicates. The plan
   suffixes collisions (`…:hearth-wall~2`). An alternative — fresh UUIDs at seed time —
   removes the collision but makes "is this entry seeded?" unanswerable.
6. **No `seeded: true` flag on entries.** So there is no way to bulk-remove the pack, and
   after he edits one, no way to tell his work from mine. Cheap to add later; adding it
   now touches three interfaces and every write path.
7. **The requirement roll-up is not built.** `requirements` is structured specifically so
   that "what should I prepare tomorrow" is one `flatMap` away, and the *Preparing for
   Tomorrow* tactic is the hand-written stand-in for it. Whether that stand-in is enough
   is the thing I would most like to be wrong about cheaply.
8. **~27 entries is a guess.** Gate 1 says eight he trusts beats thirty he scrolls past.
   The slice plan should let him see the first few and call the volume before the rest
   are written.
