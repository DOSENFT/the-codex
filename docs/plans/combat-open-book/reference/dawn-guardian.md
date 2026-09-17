# The Dawn Guardian — the DM's own words

> **STATUS 2026-09-17 — ITEMS 2 AND 3 ARE NOW ON THE SHEET.** Everything below was
> written when the sheet carried neither. It is kept unedited as the record of what
> was missing and why; read [§ What was written in, and the rulings that shaped
> it](#what-was-written-in-2026-09-17) at the foot of this file for the current state.

Given by Marcus 2026-09-08, transcribed verbatim before any interpretation:

> Dawn Guardian Glaive: 1d10, 2h, graze, reach. +1, +2 dawn to dusk.
>
> Guardian: Martial abilities with this weapon are effective up to 10ft.
>
> Radiang swing: when you take the attack action, you may forgo one attack to
> send a wave of brilliant light (15ft cone). DC 15 Dex save. 3d6 Radiant, + 1d6
> fire between dawn/Dusk (pyreling) . Half on save. Can do once per day at dawn

**This is homebrew, and it is his DM's, not canon's.** Everything below is read off
that text. Where the text is ambiguous it is marked as a question rather than
answered, because the whole failure mode this feature exists to remove is the app
stating a number it inferred as though the book had said it.

---

## What the app already has

`toybox-seed/pack-hearth-7-r2.test.ts:58-68`, transcribed from his own export
`codex-nix-lvl7 (2) (1).json`:

```
name: 'The Dawn Guardian'
damageDice: '1d10'
damageType: 'Slashing'
properties: ['Two-Handed', 'Reach', 'Graze']
range: '10 ft'
magical: true
```

So of the five things the DM's text describes, the export carries **two**: the die
and the weapon properties. Three are missing entirely.

---

## 1 · Reach — SETTLED, and it settles the one open question in the plan

Gate 2 recorded exactly one genuinely open item: Sentinel and Interception print
"within 5 feet of you" as a flat distance (`feats.json:504-516`, `:722-732`), so
reading them at 10 ft was **a table ruling, not RAW**, and the plan hedged by
naming the item on the line every time it applied.

The hedge is no longer needed. *"Martial abilities with this weapon are effective
up to 10ft"* is the DM writing the ruling down. `REACH_EXTENDED` stops being a
list I chose and becomes a list his item dictates.

**But the item's wording is NARROWER than the plan's, in a way that matters.**
"With this weapon" is a condition. Interception is not a weapon ability at all —
it reduces damage to someone else and needs only a free hand or a shield. Whether
his DM means "all your martial abilities, since you are holding the glaive" or
"abilities that use the glaive" is the one thing the sentence does not settle.

**ANSWERED by Marcus 2026-09-08, in his own words:**

> Interception is 10ft with the Glaive doing the blocking where the shield would
> have.

So the question is closed and closed the wide way: Interception is in
`REACH_EXTENDED`. The reasoning is worth keeping because it is what makes the rule
*generalisable* rather than a special case — the glaive is physically doing the
interposing that the feat's shield-or-free-hand normally does, so the ability is
"with this weapon" in exactly the sense the item means.

`REACH_EXTENDED` for slice 6 is therefore: **Opportunity Attack, Sentinel,
Interception**, and the fact line names The Dawn Guardian every time it applies —
not as a hedge any more, but because a number without its source is a number he
cannot defend at the table.

## 2 · `+1`, and `+2` from dawn to dusk — MISSING from the sheet

The export has `magical: true` and no bonus at all, so his attack and damage
numbers are **currently short by 1 or 2 everywhere they appear.**

This is not a display bug. It is the sheet not carrying a fact, and it is the
worst-shaped kind of wrong for this app: silently low numbers look exactly like
correct numbers.

**And the app has no concept of time of day.** A bonus that changes at dawn cannot
be computed; it can only be *asked*. Anything else is the app inventing a fact
about the sun.

Not in this feature's scope, and it should not be quietly bolted on to slice 6
either — it changes attack rolls, which is a different blast radius from changing
a sentence. Recorded here so it is not lost.

## 3 · Radiant Swing — DOES NOT EXIST ANYWHERE IN THE APP

Grepped 2026-09-08 across `src/**`: zero hits. (Every hit for "Graze" is the 2024
weapon-mastery table, which is a different thing.)

So this is an **ability he owns and the Combat tab has never once offered him** —
which is a larger version of the exact complaint that opened this whole phase.
What it needs:

| Fact from the DM | What the app needs |
|---|---|
| taken as part of the Attack action, forgoing one attack | a turn option whose cost is *an attack*, which is a cost shape the economy does not have today (`AttackTally` counts swings; nothing spends one) |
| 15 ft cone | an area fact — band ① has nowhere to put it and no other option on his sheet has one |
| DC 15 Dex save, half on save | fine — canon spells already carry save + effect-on-save |
| 3d6 Radiant, +1d6 fire between dawn and dusk | the same time-of-day problem as the +2 |
| once per day, recharges **at dawn** | a resource pool with a recharge the app has never modelled — it knows short rest and long rest, not sunrise |

Three of those six are net-new mechanics. **This is a feature in its own right, not
a slice of this one**, and folding it in is how "combat open book" turns into the
half-built project Marcus's own guardrails name.

---

## The recommendation

Slice 6 uses the reach sentence and nothing else. Items 2 and 3 get written up as
their own piece of work with their own Gate 1, because both of them are about the
sheet carrying facts it does not carry — and neither is fixed by giving the combat
page a better card.

---

## What was written in (2026-09-17)

Marcus supplied the DM's text again, fuller than the 09-08 transcription:

> +1 attack, +2 between dawn and dusk.
> Guardian: Martial abilities with this weapon are effective up to 10ft
>
> Radiant swing (once a day): when you take the attack action, you may forgo one
> attack to send a wave brilliant light, 15ft cone. DC 15 Dex save, 3d6 Radiant
> (+ 1d6 fire damage between dawn and dusk (the pyrilings), 1/2 damage on save.

Two new facts this version settles that the first did not: the bonus is **to
attack**, and the half-damage is **on the save**. It also spells the creatures
**pyrilings**; the 09-08 note wrote "pyreling". His spelling is used.

### An error was found, not just a gap

The sheet's Radiant Swing read **`Miss = half damage`**. That is an attack-roll
reading of a saving throw. There is no miss on a DC 15 Dex save — the half applies
when the target *succeeds*. Corrected, and stated explicitly in the effect text so
the wrong reading cannot be re-derived from the new one.

### Rulings Marcus gave, because neither was the app's to infer

**The +1 is to attack rolls only.** `bonusToHit: 1`, `bonusDamage` left unset. This
**contradicts an assumption already written into this repo**:
`src/lib/character.weapons.test.ts:12-20` says *"his Dawn Guardian glaive is a +1
weapon… '1d10+4' where they say 1d10+5"*, i.e. it read the +1 as hitting damage
too. That comment is now known to be wrong about his damage. The test itself is
unaffected — it sets `bonusToHit`/`bonusDamage` explicitly to exercise
`upsertWeapon`, and asserts nothing about his real sheet — but the prose should not
be trusted as a statement about the item.

His attack goes **+7 → +8**. His damage stays **1d10+4**.

**The field carries the +1 floor, not the daytime +2.** The app still has no
concept of time of day, and §2 above is still the reason why. Rather than invent a
clock, the number the sheet computes is the one that is never too high, and the
dawn-to-dusk +2 is written in the weapon description where he reads it and adds it
himself. A number that is silently low is bad; a number that is silently *high* is
worse, because it is the one he cannot notice at the table.

### Where it landed

Both copies, because they drift otherwise:

- **his live sheet** — `localStorage['codex-character-b4816f64…']`, the save the
  app actually opens. Verified after a reload: Combat tab prints `+8 to hit (STR +4
  + prof +1 magic) · 1d10+4 Slashing`, and both abilities render.
- **`public/_seed.json`** — the repo's copy of that save.

`tests/safety-net/fixtures/nix-lvl7.json` was **deliberately not touched.** It is
the frozen byte-record of what a saved character meant on 2026-09-11, and freezing
is its entire job. 27 tests across the safety net, weapons and reach still pass.

### Still not modelled, and still deliberately so

`Guardian` and `Radiant Swing` are on the weapon as **text he reads**, not as
mechanics the app runs. Radiant Swing does not appear as a turn option in the
Action list, because the three net-new mechanics named in §3 — an ability whose
cost is *an attack*, a cone on a weapon, and a pool that recharges *at dawn* — are
still unbuilt. The sheet now carries the fact; the economy still does not model it.
That remains its own piece of work.
