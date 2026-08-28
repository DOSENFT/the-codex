# Product: Sheet Truth — the sheet is the only sheet

## Problem

In Marcus's words:

> "In combat my spell definitions, and probably a lot of other things, are claiming
> that my charisma is 18, when in fact it's 16. The prep tab, which was connected it
> seemed, seems to not be at all connected with the combat module directly. **What I
> change in the prep screen must directly effect and be used app wide.**"

What that looks like at the table, measured on a real screen:

He sets Charisma to 16 in Prep. The number changes. Everything that *depends* on it
does not. His Play tab keeps showing **Save DC 15** in the largest, brightest type on
the screen when the true answer is 14, and **+7 to hit** when it is +6. Spell advice
keeps telling him "at Charisma 18 your DC is 15."

And here is the part that makes it worse than a plain bug: **the app already knows.**
Directly under that wrong 15, it prints *"Your sheet and the 2024 rules disagree on 2
things"* and lists both values. It noticed, told him, and then printed the wrong one
anyway — in bigger type than the warning.

So at the table he is asked to do arithmetic mid-turn, against his own app, to work
out which of two numbers it is showing him is real. That is the opposite of the job.
He is also, right now, running a monster's saving throw at the wrong difficulty every
time he casts, and has no way to know which spells he has been playing wrong.

Underneath: several numbers on the sheet are **typed in once and remembered**, when
they should be **worked out fresh every time from the numbers he actually edits.** So
they drift. Editing an ability score is one place this happens. Levelling up is
another, and a worse one — the level-up button raises his level and his proficiency
and quietly leaves his spell slots, Lay on Hands pool, Channel Divinity uses and
prepared-spell count at last level's values.

## What we're doing

**Ability scores and level become the only things he sets. Everything the rules can
work out, the app works out — every time it draws the screen, everywhere.** The
remembered copies are removed entirely, so there is nothing left to go stale. There is
no "refresh" button and no "fix my sheet" prompt, because there is never anything to
fix.

Seven numbers move from remembered to worked-out:

- Spell save DC
- Spell attack bonus
- Proficiency bonus
- How many spells he can prepare
- Lay on Hands pool
- Channel Divinity uses
- Aura range

Four numbers **stay** as things he types in, on purpose, because no rule can know
them: **armour class** (depends on his gear and his DM), **max hit points** (depends
on dice he actually rolled), **magic weapon bonuses**, and **any homebrew resource he
invented**. The app has no business guessing at those, and won't.

Spell advice stops quoting a Charisma he doesn't have. Where canon says "at Charisma
18 that is +4", the app puts *his* numbers in: "at Charisma 16 that is +3." If his
Charisma changes again, the advice changes with it.

One thing stays exactly as it is: **spell slots.** His sheet carries slots his level
doesn't grant. That may well be his DM, or an item, and silently deleting a resource
he is playing with would be the app overruling his table. So slots keep being
*reported* as a disagreement and never corrected — he decides.

## Success metric

**Zero.** The count of places on the Play tab, in combat, showing a number that
disagrees with the ability scores on his sheet.

Measured, not asserted, by `_probe-baseline.mjs`: seed a sheet at Charisma 16, open the
Play tab in a real phone-sized browser, read every number structurally. Today that probe
reports **3 disagreements** — Save DC 15, Sp Atk +7, and one option row reading "DC 15".
Done when it reports 0, and a second probe proves the number *follows* an edit rather
than merely happening to be right once.

> **Correction, recorded rather than quietly fixed.** This section first said 5. The
> earlier probe ran a `DC \d+` search across the whole page's text, where a newline
> counts as a space — so the label "SAVE **DC**" followed by the AC stat's "**18**"
> beside it scored as a phantom "DC 18". A false positive produced by my own probe, by
> exactly the mechanism finding Q exists to forbid. The real count is 3.

Third metric, the advice: **9.** Canon advice strings that quote a Charisma score
Marcus does not have (8 spell `tactics`, 1 feat `paladinNote`). Counted from the data,
not sampled off a screen, because they sit behind a fold and a screen probe would
under-count them. Done at 0. **Three further strings — feat prerequisites like
"Charisma 13+" — must be left exactly alone**; they are entry requirements, not his
numbers, and a careless find-and-replace would corrupt them.

Second metric, the level-up one: **7 of 7.** Numbers that are correct immediately
after tapping Level Up. Today it is 2 of 7 (level and proficiency).

## Announcement — the blog post before the feature

> **Your sheet is now the only sheet.**
>
> Change your Charisma in Prep and your spell save DC changes in combat. Not after a
> reload, not after a prompt asking whether you'd like to fix it — immediately,
> everywhere, because there is no longer a second copy to disagree with. The same goes
> for your spell attack bonus, your proficiency, your prepared-spell count, and your
> Lay on Hands and Channel Divinity pools. Tap Level Up and all of it moves at once.
>
> Spell advice now speaks your numbers too. Where it used to say "at Charisma 18 your
> DC is 15", it says what's true for you.
>
> Your armour class, your max HP, your magic weapon bonuses and anything homebrew stay
> yours to set. Those depend on your gear, your dice and your DM, and the app doesn't
> pretend to know them. Your spell slots stay yours too — if your sheet and the rulebook
> disagree there, we'll still say so and still leave it alone. That one's your table's
> call, not ours.

## Screens

- `mockups/play-vitals.html` — the Play tab vitals row, before and after. The
  disagreement banner disappears not because it was hidden but because there is
  nothing left to disagree.
- `mockups/spell-detail.html` — a spell's advice text, before and after, showing his
  numbers in place of the baked-in Charisma 18.
- `mockups/level-up.html` — what Level Up reports now that it moves everything.

## Explicitly not in this phase

- Applying feats that grant an ability increase (the app records those and ignores
  them today — a separate, real bug, written down in `_audit.md` so it isn't
  rediscovered as a mystery).
- Anything about armour class, hit point maximums, or equipment.
- The open items carried from phase 1: finding BC, finding AZ/HEARTH-08, VAL-13,
  finding AT, the cloak-teleport clause (still waiting on his DM).
