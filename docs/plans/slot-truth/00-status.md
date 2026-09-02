# Status: Slot Truth — the level-3 slots he does not have

A **standalone repair**, not a phase. The four gates were deliberately skipped:
the problem was named exactly by Marcus, the fix is one new 105-line module plus
one prop, and there was nothing to discover that a Gate 1 doc would have held.
It is item 4 of the eleven-item list he opened this session with.

**Done and proved 2026-08-28.** Not yet deployed to `main`.

> "It has level 3 spells slots visualized and unlocked, even though my character
> is currently a level 7 paladin of the oath and shouldnt have access to level 3
> spells yet. So right now its just confusing and taking up screen space."
> — Marcus, 2026-08-28
>
> "The level 3 spell slots should only appear in app when i reach a level that
> unlocks them." — Marcus, same day, clarifying

---

## The decision that supersedes an earlier one — read this before changing it

Sheet Truth established a law in `src/lib/rules-2024/vitals.ts`, written into
the file itself: **it reports, it never corrects.** That is why `Discrepancy`
has a `sheet` field and a `rule` field and no `correct` field. The reasoning
was right and still is: the app does not know which side is true for his table.
Feats, items and a DM can all legitimately put slots on a sheet the general
table does not grant.

What that law produced in practice was a permanent notice he could not answer.
The band said "Your sheet and the 2024 rules disagree", then said "Nothing has
been changed… that is yours and your DM's call" — a call he was given no way to
make. So it reopened on every load, forever, by design, and the only way to act
on it was to hand-edit JSON. **A notice you cannot answer stops being
information and becomes furniture**, which is what "confusing and taking up
screen space" looks like from the player's chair.

**The law is not reversed. It is completed.** `discrepancies()` is unchanged —
same fields, same silence, and `adopt.test.ts` scans `vitals.ts` structurally to
prove no function in it returns a `Character` (finding BG: a structural claim
that forbids the fault beats a sample that failed to observe it). The missing
piece was never a correction; **it was a door**. A separate module builds the
sheet, and nothing runs on load, on import, on level-up, or from any path that
is not a person pressing a labelled button.

**Why it returns a descriptor and not a `Character`.** The caller has to be able
to show what the press will do *before* it happens, or the button is "trust me"
and he is back to not owning the understanding. The control on screen reads:

```
Use the 2024 slots
1st ×4 · 2nd ×3 · 3rd ×2  →  1st ×4 · 2nd ×3
```

---

## What changed

| File | |
|---|---|
| `src/lib/rules-2024/adopt.ts` | **new**, ~105 lines. `slotAdoption(character): Adoption \| null` |
| `src/lib/rules-2024/adopt.test.ts` | **new**, 13 tests |
| `src/lib/rules-2024/vitals.ts` | `SLOT_TABLE` and `describeSlots` exported; header paragraph recording why |
| `src/components/combat/VitalsBand.tsx` | optional `onAdopt` prop; the one control; header corrected, not left to rot |
| `src/components/combat/VitalsBand.test.tsx` | **new**, 6 tests |
| `src/components/CombatHelper.tsx:1267` | `<VitalsBand character={character} onAdopt={onCharacterUpdate} />` |
| `docs/plans/slot-truth/prove-slots.mjs` | **new**, the browser proof |

Two rules the module holds that are easy to lose in a later edit, both pinned by
tests:

- **`current` is clamped, never raised.** Handing him back an expended slot is
  the app inventing a rest he did not take, and a wrong resource in the generous
  direction is still a wrong resource at the table.
- **Ungranted levels are deleted, not zeroed.** A `{max: 0, current: 0}` left on
  the sheet is a key every other reader of `spellSlots` has to remember to skip,
  and the whole complaint was that an empty row took up space.

`spellSlots` is **not** in `DERIVED_KEYS`, so `storableOf` does not strip it and
what the press hands up is what reaches storage. That is the whole persistence
story; there is no second write path.

---

## Proof

**Unit — 19 tests, all green.** `adopt.test.ts` (13) uses **his actual export**,
`C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json`, read from disk and
`skipIf`-skipped rather than silently passed if absent. A hand-built fixture
would be me writing down what I believe his sheet says and then testing my
belief; `nix-seed.mjs`, which every other probe uses, is a **level 8 with no
3rd-level slots at all** and cannot reproduce this at any level of care.
`VitalsBand.test.tsx` (6) covers the markup and scans the wire, because
finding BM is explicit that a test aimed at a function is not aimed at the wire.

**Whole repo:** 1125 passed / 49 files / 7 skipped · `tsc -b --noEmit` exit 0 ·
`npm run build` clean.

**Browser — `prove-slots.mjs`, all six checks pass.** Run it with a preview
server up:

```
npm run build && npx vite preview --port 4321 --host
node docs/plans/slot-truth/prove-slots.mjs http://localhost:4321/the-codex/
```

```
PASS A  the 3rd-level pips are on his screen, in BOTH surfaces that draw them
PASS B  the door says what it will do, so it can be refused before it is pressed
PASS C1 one press and no 3rd-level pip is left in either surface
PASS C2 and the slots he DOES have are untouched — 2nd still spent to 2
PASS D  it reached storage, so the row is still gone after a reload
PASS E  clean console
```

**TWO SURFACES DRAW THAT ROW, not one.** `combat/TurnSummary.tsx` names its pips
`"<Nth> slot <i>: expend"`; the sticky bar in `TurnDeck.tsx` names its own
`"Expend <Nth> level spell slot"`. Counting only the first would have let the
repair pass while the phantom row sat at the bottom of his screen — the surface
he sees *without scrolling at all*. The probe counts both, separately, and
reports them per surface rather than summed.

### What the reverts actually caught

Every micro-revert below was applied to a working tree, run, and restored
byte-identical (`diff -q` clean).

| | reverted | went red on |
|---|---|---|
| R1 | `onAdopt={onCharacterUpdate}` removed from `CombatHelper.tsx` | exactly 1 — `the wire › CombatHelper gives the band something to write with` |
| R2 | `nextSlots` seeded from `{...character.spellSlots}` | 2 — the drop, and the flag failing to settle |
| R3 | `current: max` instead of `Math.min(held?.current ?? max, max)` | 2 — both "do not hand him back a spent slot" tests |
| R4 | R1 again, but **rebuilt and put through the browser probe** | A, B, C1 and D all FAIL; C2 passes, correctly, because the untouched slots really are untouched |

**A real destructive bug, caught by a test written expecting silence.** The
first draft read `table[character.level] ?? {}` — the same idiom `vitals.ts`
uses. `level` is a free number on the sheet and nothing in the app prevents 24.
Reading a missing row as `{}` makes "the table has no opinion" and "the table
grants nothing" the same value, and here they could not be further apart: the
second one **offers to delete every slot he owns**. The level-30 test was
written to assert silence and got an offer to empty the sheet instead. Now:
`const expected = table[character.level]; if (!expected) return null`.

**Two probe faults found by the probe failing.** Both were the measurement, not
the app, and both are written into the file so the next reader does not
rediscover them: the pips sit ~1700px down inside `main`'s own scroller and the
first run reported "(none)" for *every* level; and reading the door after the
pip sweep found it at y=-1150 and called it not-topmost, which was a true
statement about where the probe had left the page and a false one about the app.
Both readers now scroll the element into view before measuring, and still
require a viewport-contained rect plus an `elementFromPoint` topmost check, so a
control parked in a closed drawer still fails.

---

## Correction, added 2026-08-28 — there is a THIRD surface

"TWO SURFACES DRAW THAT ROW, not one" is wrong: `GrimoirePage.tsx:518-532` draws
it as well, found while proving the Open Book catalogue. It is **harmless** — it
iterates `Object.entries(character.spellSlots)`, so the adoption that deletes the
ungranted key removes this row too, and the repair works there without knowing it
exists. But the count in the paragraph below is a fact someone will lean on, and
leaning on it would undercount. Three, not two.

## Open — found here, deliberately not fixed here

**`src/lib/rules-2024/vitals.ts:195` carries the twin of the bug R-caught above:**

```ts
const expected = table[character.level] ?? {}
```

For a level past the end of the table this reports "the 2024 rules give you no
spell slots" — a manufactured claim, where silence is the honest answer. It is
**reporting-only and cannot destroy anything**, which is why it was left rather
than folded into a slot-adoption repair. Fixing it is a two-line change plus a
test; it belongs to whoever next opens `vitals.ts`, and this paragraph is the
worklist entry.

---

## Where this sits in the eleven

Item 4 of Marcus's list, closed. Item 1 (Toybox AI swallowing its errors) closed
earlier the same day — see `docs/plans/toybox-ai/prove-ai-error.mjs`; note that
the *cause of his particular failure* is still unconfirmed, because confirming
it means using his live API key, which is ASK-FIRST.

**Items 2, 3, 4 and 8 were one shape, and item 4 was the cheap corner of it.**
The eight source documents he supplied are **already fully ingested** into
`src/canon/` — 53 paladin spells (`onPaladinList: true`), 18 more granted
off-list, Interception with real mechanical `effects` under
`category: "Fighting Style"`, all twelve HEARTH errata, all six combos, the
prepared-spell rules including the long-rest swap he half-remembered, and a
level-7 row that already says `3rd: 0`. Nothing is missing. **The problem is
that nothing on screen asks for it**: `GrimoirePage.tsx:106` iterates
`character.spells` and never opens canon. That is the next piece of work and it
is large enough to want the gates.
