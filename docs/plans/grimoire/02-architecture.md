# Architecture: Open Book — the Grimoire holds everything

Gate 1 approved 2026-08-28 (reopened and re-approved the same day; see
`00-status.md`). Written after reading the code, not against an imagined one —
every claim below cites the file it was read from.

## The one-sentence shape

**A new pure layer builds the catalogue from canon plus the sheet, and the only
write it ever causes is the one that already exists.** Nothing about canon is
copied into storage; the 84 are computed on every render, the same posture
`derive.ts` already holds for proficiency bonus and slot tables.

## Fit

### What is already right, and is therefore not rebuilt

| | |
|---|---|
| `src/canon/index.ts` | The **only** module in the app that imports a `.json` path — it says so in its header and it is true. All 13 files, typed at one seam. Nothing in this phase adds a second. |
| `src/lib/canon/lookup.ts` | Name-normalised indexes, the alias layer (`Flaming Cloak` → `Hearthfire Manifest`), the Channel-Divinity menu-prefix retry, and **`isUnlocked(spell, level)` already computes the lock** from `unlocksAtPaladinLevel` (`lookup.ts:154`). The lock rule exists; nothing on screen asks it. |
| `src/lib/canon/format.ts` | `statBlock(spell)` — band 1 for a spell, already written (`format.ts:350`). |
| `src/lib/canon/feature.ts` | `featureFacts(feature, ctx)` — band 1 for a feature, classified, with computed facts that show their working. |
| `src/lib/canon/tactics.ts` + `personalise.ts` | `splitTactics` finds canon's own ALL-CAPS lead-ins and `personaliseBullets` substitutes his numbers. **The band-3 formatting Marcus approved at Gate 1 is not new code — it already exists and is already shipping on the combat detail sheet.** |
| `src/lib/turn/feats.ts` | Turns `character.feats` into turn options by recognising the 2024 cost phrase ("you can take a Reaction to…") — by **shape, never by name**. Load-bearing below. |

### What is wrong, in one line each

| | |
|---|---|
| `src/components/GrimoirePage.tsx:103–115` | Builds its list from `character.spells` and `character.features`. Canon is never opened. This is the whole of item 2. |
| `src/lib/character.ts:1361` | `toggleSpellPrepared` flips a boolean. **No cap, no reason, no refusal.** `maxPreparedSpells` is read in `LoadoutPanel` and `SessionReadyCard` to *display* a count and to mark a session "not ready" — never to stop anything. |
| `src/lib/turn/detail.ts:238` | `optionDetail()` builds the three bands correctly — and takes a `TurnOption` and an `EconomyState`, so no screen outside combat can call it. |
| the character | Has no Fighting Style field, no Fighting Style feat, and therefore no Interception. |

### The three new things

```
src/lib/canon/bands.ts        the three bands, pure over (canon record, character)
src/lib/catalogue/            build the 84; group them; compute the locks
src/lib/prepare/              the cap, the refusals, and the one write
```

## Endpoints

**None.** This is a local-first React app with no server. The only network call
in the codebase is the Gemini AI config (`codex-ai-config`), which this phase
does not touch.

## Data

### Read-only, at build time

`src/canon/*.json`, verbatim, through `src/canon/index.ts`. **Not modified by
this phase.** The catalogue reads:

| field | from | used for |
|---|---|---|
| `onPaladinList`, `availability` | `spells.json` | which of the 71 records are his 62 |
| `unlocksAtPaladinLevel` | `spells.json` | the lock, via `isUnlocked` |
| `alwaysPrepared`, `countsAgainstPreparedLimit` | `spells.json` | the "free" group and the cap arithmetic |
| `classFeatureDetails` (16) | `paladin-progression.json` | class features, `level` gives the lock |
| `features` (4) | `oath-of-the-hearth.json` | oath features, same |
| `levels[level-1].preparedSpells` | `paladin-progression.json` | the cap number — **already surfaced as `character.maxPreparedSpells` by `derive.ts`**, so the cap is not a new derivation |
| `levels[level-1].spellSlots` | `paladin-progression.json` | refusal reason 2 — "no 3rd-level slots" |
| `preparedSpellRules` (5 strings) | `paladin-progression.json` | the teaching card, verbatim |
| `fightingStyle` (11) | `feats.json` | the Fighting Style picker |

**Two fields stay dead on purpose.** `castableAtLevel7` and `lockedForMarcus`
are the lock rule already answered for a level-7 character. `lookup.ts:141–153`
explains why they are never read, and `lookup.test.ts:95–120` greps the tree to
prove it. **The catalogue must not become the first reader.** He levels; the
boolean does not.

### Read-write

`localStorage` only, and **no new key**:

| key | what changes |
|---|---|
| `codex-character-<id>` | `spells[]` gains entries when he prepares from canon; `feats[]` gains one when he names his Fighting Style. Both are existing arrays in their existing shapes. |
| `codex-ui-<id>` | the chosen grouping mode, through the existing `useCollapsible` prefix (`hooks/useCollapsible.ts:4`). Marcus asked for fewer things, not more. |

**No schema change to `Character`.** That is a deliberate constraint, not an
accident — `CharacterBase` is what goes to disk, and adding a field to it means
every stored sheet in the world is now a migration.

## Flow

### Painting the Grimoire

```
GrimoirePage(character, mode)
  └─ buildCatalogue(character)                    src/lib/catalogue/build.ts
       ├─ SPELLS.filter(his 62)        → CatalogueEntry{kind:'spell'}
       ├─ CLASS_FEATURES (16)          → CatalogueEntry{kind:'feature'}
       ├─ OATH.features (4)            → CatalogueEntry{kind:'feature'}
       ├─ character.feats (2)          → CatalogueEntry{kind:'feat'}
       ├─ lock:  isUnlocked(spell, character.level)  |  feature.level <= level
       ├─ state: character.spells.find(normalizeName match) → prepared? on-sheet?
       └─ UNION with anything on the sheet canon has never heard of
                                       → CatalogueEntry{provenance:'sheet'}
  └─ groupCatalogue(entries, mode)                src/lib/catalogue/group.ts
  └─ <CatalogueRow> × 84
```

`buildCatalogue` is pure: `(Character) => CatalogueEntry[]`. No hooks, no clock,
no storage, no fetch. It renders identically with the wifi off, which is the
requirement every table-facing surface in this app is scoped around.

### Opening one

```
CatalogueRow onExpand
  └─ entryDetail(entry, character)                src/lib/catalogue/detail.ts
       └─ canonBands(record, character)           src/lib/canon/bands.ts   ← SHARED
            ├─ band 1  statBlock(spell) + withSaveDC   |  featureFacts(feature)
            ├─ band 2  spell.summary | feature.rawText | sheet's own description
            └─ band 3  personaliseBullets(splitTactics(spell.tactics), character)
```

### Preparing one

```
CatalogueRow onPrepare
  └─ togglePrepared(character, name)              src/lib/prepare/toggle.ts
       ├─ unprepare  → always allowed, never refused
       ├─ refuse if  prepared count === character.maxPreparedSpells   (rule 1)
       ├─ refuse if  no slots at that spell level                     (rule 2)
       └─ allow      → if the spell is not on the sheet yet,
                       canonSpellToSheet(canonSpell) and push it
  └─ {ok:false, reason} → the refusal card names the rule
  └─ {ok:true, next}    → onCharacterUpdate(next) → existing persistence
```

### Naming his Fighting Style

```
CatalogueRow "Fighting Style" (class feature, level 2) onExpand
  └─ band 2 lists FEAT_LIST.filter(category === 'Fighting Style')   ← 11
  └─ onPick(style)
       └─ character.feats.push({ name, description: effects.join(' '),
                                 effects, isHomebrew: false, ... })
```

**And then Interception is on the combat tab, with no combat-tab code written.**
`src/lib/turn/feats.ts` already reads `character.feats` and already recognises a
Reaction by canon's own cost phrasing — "you can take a Reaction to reduce that
damage" is exactly the shape it cuts on. Its header records why it was built that
way: Marcus said *"I have Sentinel and interception"* and the app showed neither,
because `character.feats` was read by nothing. Sentinel was fixed then;
Interception could not be, because it is not on the sheet. **Recording it is the
missing half, and the wire is already live.** That closes the second half of his
item 8 as a side effect of Gate 1's scope addition, and this phase must prove it
rather than assume it — a test aimed at the picker is not aimed at the combat row
(finding BM).

## The decisions worth challenging

**1 · The bands are extracted, not duplicated.** `turn/detail.ts` keeps its
combat-only bands (the one-slot-per-turn rule box, the Spend button, the temp-HP
warning, the roll offers) and loses the canon core to `canon/bands.ts`. The
Grimoire calls the same function.

The alternative — write a second band-builder for the Grimoire — is less risky
today and wrong forever: the same spell would then have two sets of words in one
app, and the first time canon changes, one of them is stale. `detail.ts`'s own
header already argues this about a smaller case: *"one rule worded two ways is
two rules as far as the player is concerned."*

Guarded structurally, not by sampling (finding BG): a test greps both callers and
asserts **neither** imports `statBlock`, `splitTactics` or `featureFacts`
directly. That forbids divergence; a test that renders one spell on both screens
and compares only fails to observe it.

`turn/detail.ts` is **not** one of the byte-pinned files — only
`src/lib/turn/options.ts` is, guarded by `overlay.test.ts:258`. Confirmed by
reading the test. `options.ts` is not touched by this phase.

**2 · Preparing writes through to `character.spells`.** Not to a parallel list of
prepared names.

Because the turn engine reads `character.spells`. If a spell he prepares from the
catalogue does not land there, it never reaches the combat tab — and his item 5 is
*"it doesnt at all have all avaible things i can do"*. A Grimoire that let him
prepare 84 spells the Play screen could not see would make item 5 **worse**, while
looking like a win on the count this phase is measured by. The cost is that his
sheet grows toward 53 spell records over his career, which localStorage does not
notice.

**3 · The catalogue is derived and never stored.** Same law as `derive.ts`:
`storableOf` strips derived numbers on write so a stale copy cannot outlive the
rule that made it. Storing the 84 would put a build artefact in his sheet that
goes wrong the next time the canon package is replaced.

**4 · The open-world rule holds at the catalogue boundary.** The catalogue is a
**union**, not a canon list. Anything on his sheet that canon has never heard of
survives with `provenance: 'sheet'` and its own words. A homebrew spell he adds
tomorrow must not vanish the moment canon becomes the spine. `lookup.ts:11–14`
states this as law: *"Nothing in this module may ever cause an option to
disappear."* Building a screen that starts from canon is the first thing in the
app that could break it.

**4a · The union must be resolved BOTH WAYS ROUND, or Divine Smite appears
twice.** Ran the check rather than assuming it. All 7 of his spells resolve, both
his feats resolve, 3 of his 4 features resolve — and the fourth is **Divine
Smite**, which his sheet files as a class feature and canon files as a level 1
spell (`alwaysPrepared: true`, unlocks at Paladin 2).

So `featureByName('Divine Smite')` misses. A union that folds canon-by-kind and
then adds "sheet items canon has never heard of" would put Divine Smite in the
catalogue **twice**: once from the 62 spells with canon's full text and tactics,
and once as an unmatched sheet feature carrying his own thin wording. Two cards,
same name, different words, on the screen whose entire purpose is to be the one
place to look.

`turn/detail.ts:96–114` already solved this and its comment names this exact
spell: *"Divine Smite is a level 1 spell that half the world still files as a
class feature."* The catalogue's matcher must use the same both-ways-round
resolution, and the dedup key is `normalizeName`, **not** name-plus-kind.

Pinned by a test that runs against his real export, not a fixture — the same
discipline `slot-truth/adopt.test.ts` used, and for the same reason: a
hand-built fixture is me writing down what I believe his sheet says and then
testing my belief.

**5 · No new storage key, no new `Character` field.** Both the spell write and
the Fighting Style write use arrays that already exist in shapes that already
exist. The grouping mode joins the `codex-ui-<id>` map every other fold uses.

## External

**None.** No third-party API, no webhook, no env var. The AI config the app does
hold (`codex-ai-config`, Gemini) is untouched — Marcus's item 1 was closed in
`docs/plans/toybox-ai/` and the cause of *his* particular failure is still
unconfirmed because confirming it means spending against his live key, which is
ASK-FIRST.

## What this phase deliberately does not touch

`src/lib/turn/options.ts` (byte-pinned) · `CombatHelper.tsx` and the three "Your
Turn" surfaces (items 5, 6, 10, 11 — a layout phase, next) · the damage log
(item 9) · Hearthfire retaliation (item 7) · `vitals.ts:195`, the open `?? {}`
twin logged in `slot-truth/00-status.md`.
