# Product: Combat Open Book

## Problem

Mid-fight, Marcus taps a spell on the Combat page and gets a thin summary. To
actually understand what the spell does — the full text, and the paragraph of
tactical advice that tells him *when* to use it — he has to leave the fight, go to
the Grimoire, find the spell again, read it, and come back. He does this repeatedly
in a single session. By the time he's back, the table has moved on.

The Grimoire card is the one he trusts. It opens right there on the row, it leads
with the number he needs, and it tells him how to use the thing without being asked.
The Combat card doesn't do any of that, and Combat is the screen he's on when it
matters.

Two things make it worse:

**The numbers aren't his.** The Grimoire tells a level-8 Paladin that Sacred Flame
deals `1d8` — the level-1 die — while the Combat row, two taps away, says `2d8`. Cure
Wounds says it restores "2d8 + your Charisma modifier" instead of `2d8 + 4`.
Interception says it reduces damage by "1d10 plus your Proficiency Bonus" instead of
`1d10 + 3`. He is doing arithmetic the app already knows the answer to, under time
pressure, and in at least one place the app states a number about his own character
that is simply false (Summon Celestial claims his spell attack is +7; it's +8).

**He can't tell his abilities apart at a glance.** Every row is the same shape: a
name in the same font, a line of grey text. Recognising "the fire one" or "the
healing one" means reading, every time.

He also can't fix the wording he disagrees with — but he doesn't want an editor. He
wants to tell us, and have it fixed properly.

## Success metric

**Tab-switches from Combat to Grimoire during an encounter: currently several per
session, target zero.**

Measured by Marcus at the table across one full session. The Grimoire is still there
for prep; if he never needs it *mid-fight*, the feature worked. A secondary read: he
should never have to compute a die, a modifier, or a save DC in his head — every
number on the Combat screen is already the number he says out loud.

## Announcement — the blog post before the feature

**The Combat page stops being a summary.**

Tap any spell or ability during a fight and it opens right there on the row into the
full card you already know from the Grimoire — what it costs and what it rolls, the
complete rules text, and the tactical read on when to actually use it, open by
default. No more leaving the fight to go look something up.

Every number on that card is now *your* number. Sacred Flame shows the die you roll
at your level, not the one on page 279. Cure Wounds shows `2d8 + 4`. Interception
shows `1d10 + 3`. Where the book says "your Charisma modifier," the card says `4`.

And your combat kit now has faces. Each ability carries its own mark — so you find
the one you're looking for by recognising it, not by reading twenty names.

## Screens

- `mockups/combat-card-collapsed.html` — the Combat page as it is today, for
  reference: the row shape, the band headers, the compete notices.
- `mockups/combat-card-expanded.html` — the same page with one card opened inline
  into the full ①②③ treatment, with the roll and spend controls kept. **This is the
  screen the feature is.**
- `mockups/icon-set.html` — the ~20 combat-kit marks laid out at row size and at
  card size, to check they read at a glance and don't fight the page.

## Explicitly out of scope

- **Editing.** No spell editor, no override layer. Marcus reports wrong wording; it
  gets fixed in `src/canon/*.json`. The existing Edit affordances that *look* like
  they work and don't will be removed rather than repaired.
- The Grimoire's own card. It is the reference implementation and does not change,
  except to gain the same corrected numbers.
- Art for all 86 grimoire entries. Combat kit only (~20) for now.
