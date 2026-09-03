# Product: Toybox seed — Nix's real combos, tactics and persona plays

## Problem

Three tabs open empty. Combos, Tactics and Persona each show a blank slate and an
invitation to write something, and the one button that would fill them — the AI
suggestion — returns *"AI suggestion failed. Check your AI settings and try again."*
So the most opinionated part of the app currently asks Marcus to do the work it was
built to do for him.

Underneath the empty tabs is a sharper problem, and it is the one he actually named:

> "This will help me know how to prepare for each day if I know what kind of combos and
> tactics require what abilities and spells."

He prepares seven spells after a long rest and can swap exactly one per rest. Right now
he is spending **two** of those seven picks. He does not know what the other five are
*for*, because nothing anywhere tells him which line of play a given spell unlocks. The
decision he has to make every in-game morning is made blind.

And at the table he plays with physical dice, four other people, and a turn timer made
of social pressure. What he needs in that moment is not a spell list. It is a short,
named, already-decided line — *this trigger, these three presses, in this order, standing
here* — that he can read in five seconds and execute.

The failure mode to avoid is the obvious one, in his words: **"willy nilly preloaded
stuff."** Generic paladin advice is worse than an empty tab, because an empty tab is
honest. Every seeded entry has to be true of *this* character: Charisma 16 and the
numbers that fall out of it, a two-handed reach weapon with no mastery, Sentinel and
Lucky, an Oath of the Hearth cloak that costs a reaction, and four specific other
people standing nearby.

## Success metric

**Primary — the prep decision gets made with reasons.** After a long rest, Marcus fills
at least **5 of his 7 prepared-spell picks** (today: 2), and can say for each one which
named entry in the Tactics or Combos tab he picked it for. Measured by asking him after
the next session; the number is on his own sheet, so there is nothing to instrument.

**Secondary — the tabs get used at the table, not just admired once.** At the next
session, at least **3 turns** are played off a line that is written in these tabs rather
than improvised. Measured the same way: he tells me, or he doesn't.

**Failure signal, stated up front so it counts.** If he reads the seeded entries and says
any of them is something he already knew, or something a paladin who wasn't him could
have used, that entry failed and gets cut. Volume is not the goal. A tab with eight
entries he trusts beats a tab with thirty he scrolls past.

## Announcement — the blog post before the feature

**Your Toybox comes loaded now.**

Open Combos, Tactics or Persona and you'll find plays that were written for Nix
specifically — not for "a paladin." Every number in them is your number: the +3 from
your aura, the 10 temporary hit points your cloak grants at Charisma 16, the 10-foot
reach on the Dawn Guardian, the two feats you actually took. Every play names the
trigger that fires it, the exact presses in order, and where to be standing.

They cover every Paladin spell of 1st and 2nd level, whether or not you have it prepared
today — because that's the point. Each entry lists what it needs, so when you finish a
long rest you can read the plays you want to run and prepare backwards from them. Five
of your seven picks are currently doing nothing. This is how you spend them.

And the party is in here. Rune's control, Ponzi's need for advantage, Ketza's range,
Talon's buffs — the plays that only work because those four are standing there are
marked as such, so you know which ones to call out loud before you take your turn.

Nothing is locked. Everything seeded is editable, deletable, and favouritable like
anything you write yourself. If a play stops being true — you level, you swap a weapon,
Doug's bard finally dies — change it or throw it away.

## Screens

No new screens. The three existing Toybox tabs render this content through the cards
they already have; what changes is that they are no longer empty.

- `mockups/toybox-seeded.html` — one screen showing all three tabs' cards filled with
  real candidate content, so the *shape* of an entry can be approved before twenty more
  are written to it. Specifically it shows the three things this feature asks the
  existing cards to carry that they have not carried before: a **requirement line**
  ("needs Faerie Fire prepared"), a **positioning line**, and a **party call-out**.

## Open question for Marcus, deliberately left in this doc

The Persona tab. His request named combos and tactics; persona plays came along because
they're the third tab. Nix is a changeling with a secret that only Scar and the party
know — persona plays here are about *social* execution, and they touch his backstory in
a way combat content doesn't. Seed that tab too, or leave it for him?

## Not in scope

- Fixing the AI suggestion failure. Separate problem, separate fix.
- Wiring Channel Divinity to a resource pool so the Hearthfire reaction stops silently
  doing nothing. Separate problem — but note that seeded content *describes* that press,
  so the two meet at the table even though they don't meet in the code.
- Anything above 2nd-level spells, or any content for a level other than 7.
