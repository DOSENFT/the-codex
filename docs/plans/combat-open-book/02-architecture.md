# Architecture: Combat Open Book

All line numbers verified against `main` @ `274d947`, 2026-09-07.

## Fit

Five seams, in the order the data flows.

**1 · The promotions move out of the catalogue.**
`catalogue/detail.ts` owns `heroCostFor` (`:237`), `heroDiceFor` (`:274`) and the
`consumed` list (`:333`) — the four promotions that turn a flat `CanonBands` into the
card Marcus likes. They currently take a `CatalogueEntry`, which is why the Combat
page cannot have them: the turn layer has a `TurnOption`, not an entry.

The only thing `heroCostFor` actually needs from an entry is `entry.turnCost`
(`'action' | 'bonus' | 'reaction' | 'passive' | 'other'`), and `TurnOption` already
carries the same fact as `cost.slot` (`turn/types.ts:37-50`). So the promotions become
a pure function of `(CanonBands, facts, fallbackSlot)` in a new `canon/promote.ts`, and
both `entryDetail` and `optionDetail` call it. **No behaviour change on the Grimoire** —
this is a move, and `EntryDetailPanel.test.tsx` is the pin that proves it.

**2 · `optionDetail` gains a `panel`.**
`OptionDetail` (`turn/detail.ts:55-89`) keeps every field it has today — the combat
sheet's tests are written against them and slices 5/10c/10d are documented in that
file's comments. It gains one field:

```
panel: EntryDetail
```

built from the same `canonBands()` call the function already makes (`:198`). Nothing is
recomputed and nothing is duplicated. That field is what `EntryDetailPanel` eats.

**3 · The Combat page reuses `EntryDetailPanel` unchanged.**
`grimoire/EntryDetailPanel.tsx:40-46` takes `{ detail, rulings? }` and has no state, no
effects and no character. It is pure Tailwind — no Grimoire stylesheet to carry across.
It moves to `components/canon/EntryDetailPanel.tsx` (a re-export keeps the old path
alive for one slice) and Combat renders it inline.

**4 · Inline expand rides the row mechanism that already exists.**
`TurnRow.tsx:96-145` already solves this exact problem. A row with an `extra` becomes
`<div class="act hasx">` + `<button class="acthit">` + `<div class="actx">{extra}</div>`
— precisely because the retaliation capture contains buttons and a button inside a
button is silently dropped by the browser (`TurnRow.tsx:84-95`). The expanded card also
contains buttons. So the panel goes through `rowExtra`, which `TurnLive` already
supplies (`TurnLive.tsx:338`), and **`TurnRow.tsx` and `TurnBands.tsx` are not touched
at all.**

`TurnLive.tsx:335` changes from `onOpen={setOpenOption}` (which mounts the bottom sheet)
to a toggle of `openId`. `OptionDetailSheetLive` (`:485-491`) is unmounted. Its file and
`OptionDetailSheet.tsx` stay on disk until the last slice, so the revert is one line.

**5 · Reach already has an answer; it is in the wrong layer.**
`toybox-seed/profile.ts:73` is `weaponReach(weapon)`: the `Reach` property wins, then a
parsed `range`, then 5. `primaryWeapon` (`:63`) picks the magical melee weapon first.
Both are pure, both are tested (`profile.test.ts:112-114`), and both are buried in the
Toybox seeding layer where combat cannot see them.

**The Dawn Guardian is not a new mechanic — it is a weapon Marcus already owns.** His
export gives it `properties: ['Two-Handed', 'Reach', 'Graze']`, `range: '10 ft'`,
`damageDice: '1d10'`, `magical: true` (transcribed at
`toybox-seed/pack-hearth-7-r2.test.ts:58-68` from `codex-nix-lvl7 (2) (1).json`). So
there is no magic-item model to build and no character migration to write. The two
functions move to `rules-2024/reach.ts` and the combat layer calls them.

## Endpoints

None. Offline-first PWA, no server, no network on any path this feature touches.

## Data

**No storage schema changes. Nothing new is written to localStorage.** Every key in
`character.ts:479-482` is untouched, `saveCharacter`'s optimistic-concurrency guard
(`:714-722`) is not on any path here, and the feature is read-only with respect to the
sheet. That is a direct consequence of the Gate 1 decision to drop the editor.

Four content changes, all in `src/canon/*.json`, all pure text:

| File | Change |
|---|---|
| `spells.json` | Cure Wounds `:563-572` — "2d8 + your Charisma modifier" → `2d8 + {CHAmod\|your Charisma modifier}` |
| `spells.json` | Summon Celestial `:2923` — the hardcoded `+7` → `{spellAttack}` (it is +8 for Nix; the app currently states a false number) |
| `feats.json` | Interception `:722-732` — "1d10 plus your Proficiency Bonus" → `1d10 + {prof\|your Proficiency Bonus}` |
| `paladin-progression.json` | Lay On Hands `:426`, Channel Divinity `:456-458`, Aura of Protection `:478-479`, Abjure Foes `:491` — add the `mechanics` key. **These four render nothing today**, because `featureFacts` (`canon/feature.ts:219-251`) reads `feature.mechanics` and nothing else. |

**The fallback syntax `{token|canon's own words}` is new**, and it is the one piece of
this design that widens an existing rule. `personalise.ts` today drops any *sentence*
containing an unresolvable placeholder (`:166-173`). That policy is right for band 3 —
advice with a hole in it is worse than no advice — and **catastrophic for band 2**,
which is the full rules text: a Fighter opening Cure Wounds would lose the sentence that
says what the spell does. The fallback makes band 2 safe by construction — worst case it
prints exactly what canon prints today. Vocabulary stays six tokens; only the *failure
mode* is new.

**Art.** ~20 marks as 96×96 WebP in `public/marks/<slug>.webp`, ≈6KB each, ≈120KB total.
`public/` is not compiled, so **the JS bundle budgets are structurally untouched** —
canon 70KB, total JS 700KB, CSS 40KB all unmoved, and `scripts/bundle-budget.mjs` cannot
see these files. `vite.config.ts:26` records that `public/` art is runtime-cached rather
than precached, which is right for 88MB of backgrounds and wrong for these: a mark that
needs a network round-trip is useless at a table in a basement. `public/marks/*` is added
to the precache list — 120KB against a precache already in the hundreds of KB.

The mapping from ability → mark is a table in `src/lib/canon/marks.ts`, keyed by
normalised name, **and a missing key renders no mark and no gap** — same open-world rule
as everything else here. Nix's Dawn Guardian, which canon has never heard of, gets a mark
by name like anything else.

## Flow

**Opening a card, end to end:**

```
tap a row
  └ TurnScreenD → TurnBands → Act (unchanged)
      └ TurnLive.onOpen(o)  →  setOpenId(o.id === openId ? null : o.id)
          └ TurnLive.rowExtra(o)  — already wired, TurnLive.tsx:338
              ├ RetaliationCapture         (existing, unchanged)
              └ o.id === openId
                  └ optionDetail(o, character, economy)      turn/detail.ts:187
                      ├ resolve(o)                            :100  spell/feature by name
                      ├ canonBands({...}, character)          canon/bands.ts:172
                      │   ├ personaliseFacts(facts, char)     NEW — band 1
                      │   ├ personaliseFullText(text, char)   NEW — band 2, non-dropping
                      │   ├ personaliseBullets(tactics, char) :209  existing — band 3
                      │   └ reachFor(name, character)         NEW — rules-2024/reach.ts
                      └ promoteBands(bands, facts, o.cost.slot)   NEW — canon/promote.ts
                          → { cost, hero, higherLevel, source, consumed }
                  └ <EntryDetailPanel detail={detail.panel} rulings={rulings} />
                  └ <TurnCardActions>   rolls · spend · ruleBox · spendWarning
```

`TurnCardActions` is the only genuinely new component: the four `OptionDetail` fields
that are about a *turn* rather than about a *spell*, lifted out of `OptionDetailSheet`
so the sheet can be deleted without losing them.

**One card open at a time.** `openId` is a single string, not a set. A second tap on an
open row closes it; a tap on a different row moves the open state. Rationale is the
15-second metric — two open cards means scrolling to compare, which is the behaviour this
feature exists to remove.

**Reach, end to end:**

```
reachFor(name, character)                      rules-2024/reach.ts   NEW
  ├ primaryWeapon(character)                   moved from toybox-seed/profile.ts:63
  ├ weaponReach(weapon)                        moved from toybox-seed/profile.ts:73
  └ REACH_EXTENDED: readonly string[]           which abilities read your reach
      → { feet: 10, source: 'The Dawn Guardian' } | null
```

Consumed in exactly two places, and **not in band 2**:

- **Band 1** gains a `Your reach` fact — `10 ft — The Dawn Guardian`.
- **The collapsed row's detail line** prints `10 ft` with the why-line
  `Dawn Guardian extends your reach` (`TurnOption.why`, which the row already renders at
  `TurnRow.tsx:47`).

**Band 2 keeps canon's "within 5 feet" verbatim.** The book says 5; rewriting the book's
paragraph to say 10 is the app lying about a rule, which is the failure
`overlay.ts:431` names — "the book's words, over a mark that says they are his… the
reason Marcus could quote a rule at his DM believing he had written it." The app states
*his* reach as a fact with attribution and leaves *the rule* alone.

**Which abilities.** `Opportunity Attack` and the weapon's own attack are unambiguous —
the 2024 Reach property extends both, RAW. **Sentinel and Interception are not.** Both
print "within 5 feet of you" as a flat distance, not as "your reach"
(`feats.json:504-516`, `:722-732`). Reading them at 10 ft is a table ruling, not the
rules as written, so `REACH_EXTENDED` is a short explicit list and the fact line names
the item every time it is applied. See "Least confident" in Gate 3 — this is the one
place the app would be making a claim Marcus's DM could disagree with.

## External

**Image generation.** `mcp__claude_ai_Command_Claude__generate_image_batch` (Higgsfield-
backed), one batch of ~20, run **once, by hand, at build time — never by the app.** The
outputs are committed as static files. The app has no API key, makes no call, and works
with the wifi off; that is not a nicety, it is what `turn/detail.ts:184-186` already
promises ("renders identically with the AI off and the wifi off").

No env vars. No webhooks. No third-party runtime dependency.
