# Architecture: Toybox round two (`hearth-7-r2`)

## Fit

Round two is **content**, and content is not where the work is. The work is that the
seeder was built to deliver **one pack, once**, and round two needs a **second pack
delivered to a Toybox that has already been seeded**. Everything below follows from that
one sentence.

Touched:

- `src/lib/toybox-seed/seed.ts` — one pack becomes many.
- `src/lib/toybox-seed/types.ts` — `SeedNeeds`, and the scoped exception on the
  "authored for a KIND of character" rule.
- `src/lib/toybox-seed/template.ts` — the `needs` gate, checked where tokens are.
- `src/lib/toybox-seed/profile.ts` — `weaponProperties`; `feats` finally gets a consumer.
- `src/lib/toybox-seed/index.ts` — `findPacks` replaces `findPack` on the public surface.
- `src/components/ToyboxPanel.tsx` — the reseed button learns which pack is missing.
- `src/lib/toybox-seed/packs/hearth-7-r2*.ts` — new, four files, the content.

Untouched, and deliberately: `ComboCard`, `TacticCard`, `PersonaPlayCard`, the tabs, the
Deploy sheet, storage, and every one of round one's 31 entries.

### The five decisions

**1. A NEW PACK, NOT AN EDIT OF `hearth-7`.** Adding 24 entries to the existing pack would
reach nobody who matters. `data.seededPacks` already contains `hearth-7` for Marcus's
character, and the seeder skips a marked pack — so the new content would sit in the repo
and never appear on his phone. A new pack id is the only thing that reaches an
already-seeded Toybox. It also happens to be the honest model: round one is a finished,
shipped artefact, and this is a second one next to it.

**2. THE SEEDER BECOMES MULTI-PACK.** `findPack` returns the *first* match and
`seedToybox` applies exactly it. Both become plural. A character now collects every pack
whose gate it satisfies, each delivered once, each marked separately. This is a genuine
generalisation rather than a special case for two — the third pack costs one line.

**3. `force` STOPS BEING A BOOLEAN AND BECOMES A LIST OF PACK IDS.** Today's reseed button
means "the pack is gone, put it back", and it is safe because there is one pack and the UI
checks it is absent. With two packs a boolean cannot say *which* one is missing, and
forcing both would append a duplicate of the one that is still on the screen — re-addressed
to `~2`, so it would look like a rendering bug. `{ force: ['hearth-7'] }` says which.
The `readdressCombo` collision path stays exactly as reachable as it is now, and stays
tested.

**4. A PER-ENTRY `needs` GATE, CHECKED WHERE THE TOKENS ARE.** Round one had one way for an
entry to be wrong for a character: *it cannot be written* — no melee weapon to name, no
wizard to call out to — and one response: drop it. Round two adds entries that can be
written perfectly and are still wrong. **"The Sentinel Gate" is a lie for a paladin without
Sentinel.** Worse, `{{weaponReach}}` resolves to `5` for a non-reach weapon rather than
failing, so a glaive combo would paint "Reach 5 ft" and read as merely odd instead of
absent.

So an entry may declare what the character must *have*:

```
needs: { feats: ['Sentinel'], weaponProperties: ['Reach'] }
```

Unmet → the entry is dropped, by the same code path and with the same consequences as an
unresolvable token. This is not a new mechanism; it is the existing one told a second kind
of fact. `SeedProfile.feats` has existed and been tested since round one and **has never
had a single consumer** — this is the job it was built for.

**5. `needs` IS FOR PERMANENT FACTS ONLY — NEVER FOR THINGS HE CAN BUY.** Four of the new
combos want ball bearings, caltrops or a flask of oil, and his `supplies` array is empty.
Gating them on inventory would hide exactly the cards whose purpose is to tell him what to
buy, and would make the shopping-list tactic point at nothing. Consumables live in
`requirements`, which is text he reads, not a condition the machine enforces. Feats and
weapon properties are not shoppable between now and Tuesday; that is the line.

## Endpoints

None. No network call, no model call, no cost. Seeding is a pure function over the
character sheet and `localStorage`.

## Data

**No schema change.** `ToyboxData.seededPacks` is already `string[]` and already tolerates
a second entry; `loadToybox` already defaults it. A Toybox seeded before this change reads
back as `seededPacks: ['hearth-7']`, matches the new pack, does not match the old one, and
receives round two on the next mount. **That is the whole migration, and it is a no-op.**

New in-memory shapes only:

```
SeedNeeds        { feats?: string[]; weaponProperties?: string[] }
SeedProfile      + weaponProperties: Set<string>     (lowercased, like feats)
SeedResult       packId: string | null  →  packIds: string[]
```

`packIds` is every pack that MATCHED this character, applied or not — the same meaning
`packId` had, made plural. The UI does not read it; the tests do.

## Flow

**On mount, once per character** (`ToyboxPanel` effect, unchanged in shape):

```
loadToybox(id)
  → seedToybox(data, character, Date.now())
      → findPacks(character)                    every gate that matches, in PACKS order
      → for each unmarked pack:
            buildProfile(character)             once, reused
            resolveCombo / Tactic / PersonaPlay each entry, or null
              → needs unmet?      → null
              → token unresolved? → null
            append survivors, claim ids
            add pack.id to seededPacks
      → changed:false if nothing survived anywhere      (round one's rule, per pack)
  → persist on changed, setData otherwise
```

Marcus's next open of the Toybox runs exactly this: `hearth-7` is marked and skipped,
`hearth-7-r2` is not and is applied, his 31 keep their positions, the new entries append
below them.

**On the reseed button:** the panel computes the packs that are marked *and* whose contents
are gone, and forces precisely those. One missing pack → its own label on the button. More
than one → one button, one press, all of them back.

## External

None. No third-party API, no env var, no webhook. Round two spends nothing.

## Consequences worth stating out loud

**Round one's provers will go red, and that is them working.** `prove-slice2.mjs` asserts
`PACK_COMBOS = 14` and an exact five-id list for the weaponless paladin; the same literals
appear across the eight probes. Round two changes those counts. Updating the literals is
the honest fix and round one already did it once at slice 10 — **but the literal must be
updated to the new true number, never loosened to `>=`.** A count assertion that cannot
fail is the thing this project has already decided not to ship.

**The pack is personal, and nothing in the code can enforce that it stays his.** Gate 1
lifted the "authored for a KIND of character" rule for `hearth-7-r2`, so its persona plays
name Fate, Scar, Selis and the Hidden Kingdom. `SeedGate` can express class, subclass and
level — it cannot express "is Nix". A different Oath of the Hearth paladin at level 5–8
would be handed another man's dead friend. **No mechanical gate is added for this**, because
a name check would be a lie of precision: it would still be the wrong content for a
different Nix, and the real safeguard is that this app has one user. It is recorded as a
scoped exception in `types.ts` and in the pack header. `pack-hearth-7.test.ts`'s
backstory-name sweep needs **no change at all** — it imports `HEARTH_7` directly and
resolves it, so it was already scoped to round one by construction. Round one's ban still
binds round one, and round two gets its own test file with the opposite claim.
