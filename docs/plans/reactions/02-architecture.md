# Architecture: Held Reaction

## Fit

No new module layers, no new screens, and — pleasingly — **two of the three
mechanisms this phase needs already exist and are already tested.** The work is
mostly teaching existing seams to stop accepting a default where canon has a fact.

| layer | file | role in this phase |
|---|---|---|
| sheet → options | `lib/turn/options.ts` | **PINNED BYTE-IDENTICAL** (`overlay.test.ts` case 15). Read only. |
| canon overlay | `lib/turn/overlay.ts` | where canon corrects a sheet option. **F1 and F2 both land here.** |
| composer | `lib/turn/compose.ts` | owns the action economy (ruling at `compose.ts:389`). Owns the refile and the new split. |
| feats → options | `lib/turn/feats.ts` | **F2**: what counts as the sheet "having spoken". |
| retaliation | `lib/turn/retaliation.ts` | complete. Untouched. It has only ever lacked input. |
| HP entry | `components/HPTracker.tsx`, `combat/StatsBar.tsx` | **F3**: the road he actually walks records no source. |

### The three mechanisms that already exist

Worth stating plainly, because it changes the size of this phase:

1. **The refile.** `compose.ts:301-309` already moves a feature into canon's
   bucket when the sheet declared no economy — `option.canonEconomy` drives it.
2. **One row per effect.** `feats.ts` already turns one Sentinel into two options
   with two triggers, and `reactions.ts:132` `disambiguateHeadings` already gives
   them distinct headings lifted from their own trigger text.
3. **The whole retaliation machine.** `retaliation.ts`, `RetaliationCapture.tsx`,
   the tally, the undo path in `reduce.ts:525`. Built, tested, never fed.

## The root finding, in one function

`overlay.ts` `economyFromFeature` gathers every cost canon states and returns
`undefined` when it finds more than one. Hearthfire Manifest states two:

```
mechanics.manifestSummonDismiss : "Bonus Action"   → bonusAction
mechanics.cloakAction           : "Reaction"       → reaction
found.size === 2                → return undefined
```

`undefined` means no refile, so `options.ts`'s `featureActionType` default of
`'action'` stands. **The refusal to guess was correct. What it fell back to was a
guess.** That is the phase's law in one place: a principled refusal is only worth
anything if the thing behind it is also principled.

The deeper fact the refusal was groping at: **Hearthfire Manifest is not one
ability.** It is a manifestation you summon as a Bonus Action, and a cloak you
raise as a Reaction. The data model says one feature has one cost. Canon says
otherwise, and says it in structured fields.

## Data

**No new tables, no new storage keys, no schema change to anything on disk.**
Every fix changes what the app *reads*. `vitals.ts`'s law holds: report, never
correct. Nix's stored blob is byte-identical before and after this phase, and
that is a check, not an aspiration.

One optional field is already declared and already persisted:
`CombatState.retaliation` (`combat-state.ts:85`, optional, absent reads as
`{0,0}`). This phase is the first thing that ever writes it.

## Flow

### F1 — a feature with two stated costs becomes two options

Canon's `rawText` is written cost-first, one sentence per ability:

> "It can be summoned or dismissed **as a Bonus Action**. **As a Reaction**, you
> can expend one use of your Channel Divinity … transform into a flaming cloak.
> The cloak immediately grants you Temporary Hit Points … When you are hit by a
> melee attack, the creature takes 1d10 Fire damage in retaliation."

So the split is on the same shape `feats.ts` already uses — **a sentence that
names its own cost** — applied to features instead of feats:

```
canon rawText
  → split into sentences
  → a sentence naming an economy OPENS a face, carrying that economy
  → following sentences naming no economy ATTACH to the open face
  → sentences before the first face belong to the feature's base option
```

For Hearthfire Manifest that yields exactly two faces:

| face | economy | words it carries |
|---|---|---|
| summon/dismiss | Bonus Action | "It can be summoned or dismissed as a Bonus Action." |
| the cloak | **Reaction** | the Reaction sentence + temp HP + the 1d10 retaliation |

The leading flavour, light and leash sentences name no cost and stay on the base
option, which keeps its sheet economy — so nothing he sees today disappears.

**Recognised by shape, never by name.** Nothing in this reads "Hearthfire" or
"cloak". Any canon feature whose prose states two costs splits the same way, with
no list to maintain — and a feature stating one cost keeps the existing refile
path untouched, so every current test still describes the current behaviour.

### F2 — the sheet has "spoken" only if it said something rule-shaped

`effectSentencesOf` returns the sheet's `effects` whenever the array is non-empty.
His Sentinel's array is non-empty and contains no rules. One concept changes:

```
silence  ≡  no reaction-shaped sentence      (today: an empty array)
```

so the sheet's words are kept when any of them states a reaction, and canon is
consulted when none does. A homebrew "Sentinel" that genuinely states its own
reaction still wins, which is the protection the original comment was defending.

**And the row must say whose words they are.** The overlay consults
`spellByName` and `featureByName` and has never consulted `featByName` — so a
feat-derived row reports `provenance: 'sheet'` even when every word came from the
book. The overlay learns the third index, and the band's existing provenance
marker does the rest.

### F3 — arming the retaliation, by both roads

`activeRetaliation` needs `tempHP > 0` **and** a `tempHPSource` naming a feature
with a free die. Two roads set it and neither reaches him:

**The engine road** (`reduce.ts:319`, `setTempHP(next, option.grantsTempHP, option.name)`)
works the moment F1 makes the cloak a Reaction — with one blocker.
`compose.ts:157` `tempHPGrantOf` returns `undefined` unless
`cost.resourcePoolId !== undefined`, and his sheet carries `resourcePools: []`.
So the grant is gated on owning a pool the app never recorded. **The temp-HP
grant must depend on canon stating a temp-HP fact, not on the existence of a
resource pool** — the cost and the effect are two different questions, and today
one silently suppresses the other. (Least-confident decision 1.)

**The UI road** — the Temp button in `HPTracker.tsx:213` and `StatsBar.tsx:142`,
which is the one he uses at the table with physical dice — calls
`setTempHP(character, amount)` with no source, and the app then honestly does not
know what granted it. The app must not guess. It must **ask**, cheaply: the temp
entry offers the features that canon says grant temp HP, plus "don't know".
(Least-confident decision 2.)

Once either road sets the source, everything downstream is already built:

```
log damage taken
  → HPTracker.tsx:199  activeRetaliation(character, ctx)   ← today: always null
  → RetaliationCapture                                      ← built, never shown
  → reduce.ts:525  addRetaliation(combat, rolled)
  → CombatHelper.tsx:808  tally={tallyOf(combat)}           ← today: always 0
```

## Endpoints

None. There is no server.

## External

None. No API, no key, no network call. This phase is entirely offline and does not
touch the Gemini work that is still open.

## Least confident decisions

1. **Untying the temp-HP grant from `resourcePoolId`.** The gate looks deliberate
   but reads more like an accident of the one sheet it was written against. If
   canon states a temp-HP formula, the grant is a fact about the feature; whether
   he can *pay* is a separate question the cost machinery already answers. Risk:
   a feature that grants temp HP as part of a costed effect might start granting
   it for free. Mitigation: this must be pinned by an assertion at a level where
   the two answers differ, not by a paragraph.
2. **Asking, rather than guessing, where hand-typed temp HP came from.** This is
   the only new pixel in the phase, and it costs him a tap at the table — where he
   is fastest with physical dice. The alternative is inferring the source when
   exactly one of his features grants temp HP, which is a guess that would be
   right for Nix today and wrong the moment he gains a second source. **Asking is
   the open-world answer, but it is a real cost and Marcus may prefer the guess.**
3. **Splitting a feature by sentence.** It is the same shape `feats.ts` proved on
   feats, but feature prose is longer and less regular than feat effect lines. If
   a canon package writes two costs in one sentence, this produces one face and
   loses the other — silently. The split must refuse and log rather than
   half-succeed.
