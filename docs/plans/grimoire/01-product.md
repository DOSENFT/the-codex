# Product: Open Book — the Grimoire holds everything

## Problem

Nix can do 84 things. His Grimoire shows him 11.

> "I says theres only 7 spells and 4 features that i have. But I would like to see
> all spells for my class/subclass/race, and features, really well orginized."
>
> "The documents just have SO much golden information that i want access to and
> have it actually in app as powerful… idk what it should be without cluttering
> things."
>
> — Marcus, 2026-08-28

Everything else is on his phone already and has been for weeks. All 53 Paladin
spells are there. So are the 9 the Hearth grants him off-list, all 16 Paladin
class features, all 4 Oath of the Hearth features, every erratum, all six combos,
the preparation rules he half-remembered, and — for every single spell — a long
passage on when to cast it that was written for *his* character, naming *his*
subclass. None of it is reachable from the Grimoire. The screen only shows the
handful of items that happen to be typed onto his character sheet.

So at the table he does the thing the app was built to stop: he puts the phone
down and opens a document. And the three questions he actually asks mid-fight —
*what does this cost me, what does it do, when is it worth it* — take three
different sources to answer, none of which is this app.

Two smaller wounds from the same cause:

- **Interception has no home — and no record.** He named it as one of his three
  Reactions. It is not on his sheet: his stored feats are **Sentinel and Lucky**,
  and there is no Fighting Style on the character at all. So this is worse than a
  missing screen — the app does not know he has it. Canon holds all 11 Fighting
  Styles with full text; the character has nowhere that says which is his.
  See "The Fighting Style hole" below.
- **Preparation is unexplained and unenforced.** He can prepare 7. Nothing stops
  him preparing 9, and nothing has ever told him that a Long Rest lets him swap
  one out.

## Success metric

**The number of things Nix can do that his Grimoire will show him: 11 today → 84.**

Measured by a browser probe that counts the ability cards actually painted on the
Grimoire screen — geometrically, the way `docs/plans/slot-truth/prove-slots.mjs`
counts slot pips: a card is only counted if it has a box with area and is the
topmost thing at its own centre. Not by counting records in a JSON file, which
proves the data and not the screen.

The 84, itemised, so the number can be argued with:

| | count | of which locked at level 7 |
|---|---|---|
| Paladin-list spells (`onPaladinList`) | 53 | 24 |
| Off-list spells the Hearth grants him, always prepared | 9 | 6 |
| Paladin class features (levels 1–19) | 16 | 6 |
| Oath of the Hearth features (levels 3, 7, 15, 20) | 4 | 2 |
| Feats on his sheet — Sentinel, Lucky | 2 | 0 |
| **Total** | **84** | **38** |

The 11 today: 7 spells and 4 features, read straight off his export.

### Why it is 84 and not 94 — a correction, made before Gate 2

The first draft of this doc said 94, counting all 71 spell records in canon. Ten
of those are not his:

- **Nine are Blessed Warrior cantrips** — Guidance, Light, Mending, Resistance,
  Sacred Flame, Spare the Dying, Thaumaturgy, Toll the Dead, Word of Radiance.
  Canon files them as `cantrip_option_via_blessed_warrior`: a menu of nine from
  which *Blessed Warrior* lets you pick **two**. Blessed Warrior is a Fighting
  Style, a Paladin gets one Fighting Style, and his is Interception. He has no
  cantrips on his sheet. **These are not things he can do; they are things he
  could have chosen** — which is word for word the argument this doc already
  makes for not showing him the other 73 feats. Counting them was inconsistent
  with its own rule.
- **The tenth is Interception**, which was counted as a feat he has. It is not on
  his character at all.

The locked count is unchanged at 38, because all nine cantrips unlock at level 2.
The correction is honest in the unhelpful direction: the number went down.

### The locked split was wrong too — corrected during slice 1, 2026-08-28

The table above first read **27 paladin-list + 3 off-list**. Both were written
from an estimate, not a count. Measured against his export by the builder that
now paints the screen, it is **24 + 6**. The row totals, the 30 locked spells,
the 38 locked overall and the 84 are all unaffected — the error was entirely in
how the 30 divided between the two rows, which is why the totals never caught it.

**No decision in this doc rests on that split**, so Gate 1 was not reopened for
it; the numbers are corrected in place and the fact is recorded here rather than
quietly fixed. `build.test.ts` now asserts the itemised split, not just the
total, because a total alone survives two errors that cancel — and these two did
exactly that.

### The Fighting Style hole — found while checking the count

His stored feats are Sentinel and Lucky. There is **no Fighting Style anywhere on
the character**, and Fighting Style is a Paladin level 2 feature he has certainly
taken. Canon holds all 11 with full rules text. So Interception cannot simply be
"given a home" — the app has to be told it is his.

The catalogue makes this cheap rather than expensive: *Fighting Style* is already
one of the 16 class features it will show, at level 2. Opening it can list canon's
11 and let him mark which one he took. That is one screen, it uses data already on
disk, and it fixes the same hole for every future style. **This is a Gate 1 scope
addition and needs his yes.**

**The number behind the number,** which is the one that actually matters and
cannot be measured by a probe: he stops opening a document at the table. If the
84 lands and he still reaches for the PDF, this phase failed at something the
count could not see, and the next conversation is about what it was.

**A guardrail, not a metric.** 84 cards where there were 11 is also a description
of clutter, and he named that risk himself. So: **the number of taps to answer
"what does this cost me" must not go up.** It is 2 today (open Grimoire, expand
the card). It must still be 2, and the answer must be legible without scrolling
the card.

## Announcement — the blog post before the feature

**Your Grimoire now holds everything you can do — and everything you're going to
be able to do.**

All 53 Paladin spells are in there, plus the 9 the Hearth grants you off-list,
every class feature from Lay on Hands to Aura Expansion, all four Oath features,
and your feats. The 38 you haven't earned yet are marked with a lock and can't be
prepared — but you can open every one of them and read it in full, because knowing
what's coming at level 9 is how you decide what to do at level 7.

Your Fighting Style is in there too, for the first time. Open *Fighting Style* and
pick the one you took — all 11 are listed with full rules — and Interception starts
showing up everywhere it should.

Open anything and you get the same three bands in the same order, every time.
**At a glance** is the dice and the cost — Bonus Action, 1d6 Fire, CON save,
no Concentration — sized to be read at arm's length across a table. **Full text**
is the complete rules text and what happens when you upcast it. **How to use it**
is the tactics, written for a Hearth Paladin: not "deals fire damage" but *why
Searing Smite beats Divine Smite against an enemy caster, and why it doesn't
against a Troll.*

Sort the whole thing four ways depending on what you're doing: by what it costs on
your turn when you're in a fight, by where it comes from when you're learning your
character, by spell level when you're working off the sheet, or ready-first when
you're about to play.

And preparation finally works like the rule works. Seven means seven — the eighth
is refused, and the app tells you which rule refused it and that a Long Rest lets
you swap one.

## Screens

Mockups in `./mockups/` — plain HTML, open them in a browser, throwaway by design.

| file | screen |
|---|---|
| `01-list.html` | The Grimoire list, with the four-mode grouping switcher live. Click the modes. |
| `02-detail.html` | One ability open: the three bands. Shows an available spell, a locked spell, and a Fighting Style, so the bands can be judged against all three shapes. |
| `03-prep.html` | Preparing spells: the hard cap refusing an eighth, and the rules card that teaches it. |

### What the screens must get right

1. **A lock is not a hiding place.** Locked items are visibly locked, cannot be
   prepared, and open to full detail exactly like anything else. This was explicit:
   *"the ones that my level doesnt have access to should be locked from being
   prepared, and visually locked, but still provide me the ability to see them and
   their details."*
2. **The three bands are always in that order.** Dice and cost, then full text,
   then tactics. He described the order himself and it is the order of the
   questions he asks.
3. **Band 1 fits without scrolling.** It is the mid-combat band. If it needs a
   scroll it has failed, whatever it contains.
4. **The grouping switcher changes grouping only.** Same 94 items, same locks,
   same everything — it does not filter. Filtering is the separate row it already
   has.
5. **Nothing is invented.** Every word on these screens comes from canon or from
   his sheet. Where canon is silent the screen is silent — there is no "no tactics
   available" filler, the band simply is not drawn.

### Not in this phase, and why

- **Party-aware tactics.** He asked for tactics based on his character *and the
  party he's in*. The character half ships here. The party half has nothing to
  build on: canon contains no party text, and a party member is stored as
  `{name, class, race, personality, relationshipToPC}` with nothing mechanical in
  it. Doing it properly is either an AI slice or a data-entry job, and neither
  should hold up the 53 spells. **His call, at Gate 1: ship canon tactics now.**
- **Putting the three reactions on the combat tab** (his item 8). This phase gives
  Hearthfire Manifest, Sentinel and Interception a home and full detail. Getting
  them onto the Play screen is the next phase, with the "Your Turn" consolidation.
- **Changeling traits and equipment.** Offered and not taken. Changeling canon is
  thin and equipment is not structured, so both would render sparse.
- **All 76 feats in canon.** Only the ones he has are shown. Spells and class
  features are shown complete-with-locks because he *will* get them by levelling;
  a feat he has not taken is not a thing he can do, it is a thing he could have
  chosen, and putting 74 of those in front of him is the clutter he warned about.
  **The one exception is the 11 Fighting Styles**, and only inside the *Fighting
  Style* feature card, because that card exists to ask him which one he took —
  the list is the question, not clutter.
- **The 9 Blessed Warrior cantrips**, for the reason directly above. If he ever
  retrains into Blessed Warrior they arrive automatically, because the catalogue
  reads the Fighting Style off the sheet rather than hard-coding nine names.
