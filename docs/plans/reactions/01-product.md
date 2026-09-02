# Product: Held Reaction

## Problem

*In Marcus's words, from his list of eleven:*

> "i dont think the hearthfire manifest reaction (retaliation with fire damage) is
> working? … when i have hearthfire manifest up, and i input damage i just took
> into the damage feature, it will pop up with a retaliation option"

> "in the combat tab, it doesnt seem to have all of my available reactions
> available. I should have the hearthfire manifest, sentinal, and interception."

*And on 2026-08-30:*

> "sentinal has to be playable, just remember. Perhaps it is."

It is not. Right now his combat tab offers him **one** reaction — an Opportunity
Attack — and it is none of the three he named. Interception arrived in phase 3.
The other two are invisible.

What that costs him at the table is specific, and it is not cosmetic. Nix is a
level 7 Paladin built to stand between things and his party:

- **Sentinel's reaction** is the whole reason the build works. When something
  within 5 feet swings at somebody other than him, he gets to hit it. The app has
  never once offered him that.
- **Hearthfire Manifest's cloak** gives him temporary hit points and sets fire to
  anything that hits him in melee — 1d10, every hit, free. He has to remember it
  exists, remember it is up, remember to roll, and remember to tell the DM. The
  app was built to do all four and does none of them.

A reaction you forget you have is a reaction you never take. He is playing a
character whose defining feature is punishing other people's turns, on an app that
only ever talks to him about his own.

## Success metric

**The number of Nix's reactions the combat tab offers him: 1 today → 3.**

Measured, not eyeballed, by re-running `measure-before.mjs` against his real
exported sheet. Three named rows — Hearthfire Manifest, Sentinel, Interception —
each stating its own trigger in canon's words.

Two supporting numbers, because "a row appeared" is not the same as "it works":

| | today | after |
|---|---|---|
| reactions offered on his sheet | **1** | **3** (4 rows — Sentinel legitimately has two triggers) |
| `activeRetaliation` reachable by any road he actually walks | **no** | **yes** |
| retaliation damage the app can report to his DM | **impossible** | a running total per encounter |

The third line is canon's own request, in `HEARTH-05`: *"display the total
retaliation damage dealt per encounter so the DM can see the real numbers."*

## Announcement — the blog post before the feature

**Your reactions now show up, and one of them fights back.**

Nix has three reactions. Until now the Codex showed you one. Sentinel — the reason
you stand where you stand — never appeared at all, because the rule that makes it
work was never written on your sheet; it lives in the book. The Codex now reads
the book when your sheet has nothing to say, and tells you which of the two it is
reading from, so you always know whose words you are looking at.

Hearthfire Manifest is a Reaction again, the way the Oath wrote it. Raise the
cloak and the app knows the cloak is up. From then on, every time you log damage
you have taken, it offers you the 1d10 Fire your attacker just earned — one tap,
rolled or typed, your dice or ours. It keeps the running total for the encounter,
because your DM asked for real numbers and now there are some.

Nothing on your sheet was edited to do this. The Codex still reports; it never
corrects.

## Screens

**No new screens.** This is the unusual and pleasing part, and it is why this
phase is small: every surface already exists and has simply never been fed.

| surface | file | state today |
|---|---|---|
| the reactions band | `components/combat/ReactionsBand.tsx` · `ReactionRow.tsx` | built, renders 1 row, will render 4 |
| the retaliation prompt | `components/combat/RetaliationCapture.tsx` | built and tested, **has never received data** |
| the running tally | `CombatHelper.tsx:808` `tally={tallyOf(combat)}` | wired, always reads zero |
| the detail sheet | `components/combat/OptionDetailSheet.tsx` | already opens any reaction row |

So there are no mockups in `./mockups/`, on purpose. Adding one would mean drawing
a screen that exists, to decide a question nobody has.

**The one genuinely new pixel** is a provenance marker on a row whose words came
from canon rather than from his sheet — the app saying *"this rule is the book's,
not yours."* The band already carries a `provenance` field for exactly this and
already renders it for other rows; this phase gives it a second, honest case.

## Out of scope, deliberately

- **The "Your Turn" consolidation** (items 5, 6, 10, 11). Layout, not engine. Next.
- **Fixing his stored sheet.** Every change here is to what the app *reads*.
  `vitals.ts`'s law holds: report, never correct. If his Sentinel is missing a
  clause, the app shows him canon's and says so — it does not write to his sheet.
- **The damage log** (item 9). Related — the retaliation prompt hangs off damage
  entry — but its own problem, and its own phase.
- **Channel Divinity as a resource.** His sheet carries `resourcePools: []`, so
  the cloak's cost cannot be *spent* against a pool that does not exist. This
  phase makes the cloak a Reaction that is offered and works; it does not invent
  a resource his sheet never recorded. Logged as open, not silently defaulted.
