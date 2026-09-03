# Architecture: Toybox seed

## Fit

Four existing pieces, one new folder.

- **`src/lib/toybox.ts`** — owns the three entry types, `ToyboxData`, load/save against
  `codex-toybox-{characterId}`, and the pure CRUD helpers. Gains three optional fields and
  one new exported type. Nothing existing changes shape, so every stored Toybox in
  localStorage today still parses.
- **`src/components/ToyboxPanel.tsx`** — owns the tabs, the forms, the AI path and the
  `persist()` helper. Gains one mount-time call and one button in the empty state. Its
  1,568 lines are otherwise untouched.
- **`src/components/toybox/ComboCard.tsx` / `TacticCard.tsx`** and the inline
  `PersonaPlayCard` — render the entries. Each gains an annotations block; ComboCard also
  gains a requirements block. `TacticCard` already renders `requirements`, but as neutral
  badges **visually identical to its tags** — a requirement and a tag look the same today,
  which defeats the whole prep-index purpose. That rendering gets fixed, not extended.
- **`src/lib/character.ts`** — read only. Source of the numbers the content is written
  against, and of the party.

**New: `src/lib/toybox-seed/`.** Kept out of `toybox.ts` on purpose — the content is
hundreds of lines of prose data and would swamp the 120-line module that owns the types.

### The decision that shapes everything else: templates, not strings

The obvious build is to write "10 temporary hit points" into the content. That is wrong the
moment Nix hits level 8, and wrong today for anyone else. Instead, seeded strings carry
`{{tokens}}` — `{{cloakTempHp}}`, `{{auraBonus}}`, `{{saveDC}}`, `{{weapon}}`, `{{wizard}}` —
and are resolved against a **profile** computed from the live character sheet at the moment
of seeding. Roughly thirty lines of substitution buys correctness across levels and ability
changes, and it makes the strongest test in the plan possible: *no `{{` may survive into
stored content.*

A token that cannot be resolved is not rendered as a blank or left raw. The annotation or
entry that needs it is **dropped**. A play that says "call it out to Rune" when there is no
wizard in the party is exactly the "willy nilly" content Gate 1 forbids.

### The other decision: the pack is gated, and it says so

The pack declares `class: 'Paladin'`, `subclass: 'Oath of the Hearth'`, `minLevel: 5`
(Extra Attack — several combos assume it), `maxLevel: 8`. A character outside that gate
gets **nothing**, and the empty state stays exactly as it is today. There is no generic
paladin fallback, because generic content is the failure mode Gate 1 named.

## Endpoints

None. No server, no network. Everything is local and synchronous.

## Data

### Stored shape — `codex-toybox-{characterId}` in localStorage

Three additive, optional fields. Old data loads unchanged; new data is readable by old
code (the extra keys are ignored).

| Field | On | Why |
|---|---|---|
| `annotations?: PlayNote[]` | combo, tactic, persona play | The positioning / party / warning lines Gate 1's mockup introduced. One field with a `kind`, not three fields. |
| `requirements?: string[]` | combo *(tactic already has it)* | The success metric is "each prepared pick traceable to a named entry." That only works if the requirement is structured on both kinds of entry, not buried in prose. |
| `seededPacks?: string[]` | `ToyboxData` | Records which packs have already been applied to this character, so a pack is injected **once** and deleted entries never resurrect. |

`PlayNote` is `{ kind: 'positioning' | 'party' | 'warning'; text: string }`.

### Queries against it

There is no database, but there are three reads that matter:

1. **Seed check, on panel mount** — does `data.seededPacks` contain this pack's id? If yes,
   do nothing, ever again. This is the entire migration story.
2. **Requirement roll-up** — not built in this feature, but the reason `requirements` is a
   structured array rather than prose: `[...combos, ...tactics].flatMap(e => e.requirements)`
   is the "what should I prepare tomorrow" list, one line of code away whenever he wants it.
3. **Existing filters** — untouched. Seeded entries carry `category` and `tags` so they sort
   into the burst / defensive / core / control buckets the tabs already filter by.

### The pack itself is not stored — it is code

Content ships in the bundle as typed literals and is copied into localStorage at seed time.
Editing a seeded entry edits the copy. There is no live link back to the pack, and no
concept of "updating" a seeded entry — that keeps a whole class of sync bugs from existing.

## Flow

**Seeding, once per character:**

1. `ToyboxPanel` mounts, or `character.id` changes. Existing effect calls `loadToybox`.
2. New: the result is passed through `seedToybox(data, character)` — **pure**, no storage,
   no clock, no randomness.
3. `seedToybox` selects a pack by class / subclass / level. No match, or the pack id is
   already in `seededPacks` → returns `{ data, changed: false }` and the flow ends.
4. Match → build the **profile** from the sheet: ability modifiers, aura bonus and radius,
   cloak temporary HP, save DC, spell attack, weapon name / dice / reach, feats held,
   fighting style, and party members resolved to roles.

   > **CORRECTION, made at Gate 3 rather than discovered in code.** This step originally
   > read "reads `campaign.partyMembers` first, falls back to `backstory.relationships`."
   > That is not reachable. `partyMembers` lives on `CampaignData`; `CharacterBase` holds
   > only a `campaignId`; and `ToyboxPanel` has no campaign in scope at all — the word
   > does not appear in the file. The party therefore comes from **`backstory.relationships`
   > only**, which is where Nix's four actually are.
   >
   > That source is free text (`relation: "Party member (Wizard) — quiet, inquisitive…"`),
   > so role resolution is a parse, and a parse that is wrong is worse than no party
   > annotation at all. It requires **both** the word "party" in the relation **and** a
   > class name in parentheses. A cousin named "(Baker)" does not become a wizard, and
   > Scar — "goliath. Partner, moral compass" — is correctly not a party member.
   >
   > No unused `campaign` parameter is added for a future that may not come. When a caller
   > can supply a campaign, it is one argument away.
5. Resolve every template string against the profile. Entries or annotations with an
   unresolvable token are dropped.
6. Return `{ data: withSeedAndMarker, changed: true }`.
7. The panel calls the existing `persist()`. One write, through the path every other Toybox
   mutation already uses.

**Manual re-load, any time after:** the empty state grows a second button next to
"Create First" — offered only when a pack matches this character. Pressing it runs the same
`seedToybox` with the marker check bypassed, appending a fresh copy. This is what makes step
3's "never again" safe: automatic seeding never resurrects, and if he wants them back he
presses a button.

**Rendering:** unchanged for anything that has no annotations or requirements. Where they
exist, the cards render them as distinct rows with their own icon and colour — a requirement
must not look like a tag.

**Ids and time:** seeded entries need stable ids, and `createdAt` must not come from
`Date.now()` inside a pure function. Ids are authored into the pack (`seed:hearth:hearth-wall`),
namespaced so they can never collide with the `crypto.randomUUID()` ids the forms generate.
`createdAt` is passed into `seedToybox` by the caller. Both choices exist so the seeder can
be tested by value, without stubbing globals.

## External

None. No third-party APIs, no env vars, no webhooks. This feature does not touch the AI
path — the "AI suggestion failed" defect is out of scope and stays broken until it is fixed
on its own terms.

## Consequences worth naming now

- **The pack is opinion, checked into the repo.** It will go stale when Nix levels. The
  `maxLevel: 8` gate means it stops offering itself rather than silently lying, and the
  templates mean it stays numerically correct until then.
- **The unsourced three** — Interception, Sentinel, Graze — are carried as `warning`
  annotations *in the content itself*, not just in this doc. Marcus checks them once against
  his book and deletes the warnings. That is a content decision the architecture has to
  support, which is the third reason `PlayNote` has a `kind`.
- **Persona, resolved.** Gate 1 left it open and the approval did not settle it, so the
  default stands and is recorded here: the persona tab **is** seeded, oath-forward, and no
  play spends the changeling secret. `changling.txt` is two editions stale and the secret is
  Scar's and the party's as much as Nix's. Say the word and it changes; until then, silence
  on it is the deliberate choice, not an oversight.
