# Product: Table Truth

## Problem

Marcus plays Nix — a level 7 Changeling Paladin, Oath of the Hearth — at a real table with real
people waiting on him. The Codex is supposed to be the thing he looks at instead of a rulebook.
Right now it makes him look things up somewhere else.

In his own words, four separate failures:

**1. "The definitions trail off with `...`"**
He taps a spell to find out what it does and gets two-thirds of a sentence. There is no way to see
the rest. There is also no *short* version — nothing he can read in one second and say out loud —
so the same box is simultaneously too long to scan and too short to answer the question. He wants
both: a one-line summary for speed, and a way to open the full definition with the dice, the save,
the range, the duration, and what happens on a hit.

**2. "There are so many buttons"**
Three different things claim to tell him what he can do — a dropdown called *Actions Reference*, an
*Action* sheet at the top, and the bar pinned to the bottom of the screen. He does not know which
one to open. The bottom bar is the one he actually likes, because it follows him down the page, but
it will not show him his **reactions**, and it will not get out of the way when he needs the screen.
The *Action* sheet is the one with the roll buttons and the details, and it is the least organised
of the three — the information is in there but not arranged, so it never adds up to a quick glance.

**3. The screen is missing the numbers a turn is actually made of**
His spell save DC is not on the combat screen. Neither is his initiative, nor his proficiency
bonus. His **reactions** are not listed anywhere — he cannot see that Hearthfire Manifest exists,
what it does, or when he is allowed to use it, without going hunting. Meanwhile *Active Conditions*
— fifteen buttons for things that are true maybe twice a night — takes a full screen of space
directly under his hit points and cannot be folded away.

**4. "I question whether the rules are even accurate"**
This one is the worst, because it poisons the other three. A tool he does not trust is a tool he
checks — and checking is the thing the app was built to stop. He is right to doubt it: today the
app knows only the spells he typed into it himself, in whatever words he had at the time. It has no
independent knowledge of what a spell does. His homebrew subclass has never been audited, and three
of its features are broken as written — one of them, Smoldering Smite, **cannot ever trigger**, so
a level 15 feature does nothing at all.

**And the AI has been dead for months.** He entered his Gemini key, tested it, and got a wall of
error text telling him the model no longer exists. Every AI feature in the app — the combat
advisor, the coaches, the drills — is unreachable. It must be free, and it must be reliable, and
it must work on the iPad at the table, not only at his desk.

## Success metric

**Zero trailing definitions, and every answer within two taps.**

Measured on the Play tab, with Nix loaded, on a 390×844 phone and a 1024px tablet, by the existing
screenshot-audit harness extended with two new checks:

| Check | Today | Target |
|---|---|---|
| Combat options whose text is cut off (`…`, clamped, or overflowing) | **≥14** (every spell and feature row) | **0** |
| Taps from any option to its full definition — dice, save, range, duration, effect | **∞** (no path exists) | **≤ 2** |
| Turn-critical numbers visible without scrolling: spell save DC · AC · initiative · proficiency bonus · reactions available | **0 of 5** | **5 of 5** |
| Spells the app can define without Marcus having typed them | **0** | **71** |
| Hearth features flagged with their errata and the DM wording | **0 of 12** | **12 of 12** |
| AI connection test from the deployed site | **fails (404)** | **passes, and keeps passing when Google retires a model** |

The human version of the metric, and the one that decides whether this shipped:

> **Nix's turn comes around. Marcus opens the Play tab and, without scrolling and without leaving
> the tab, can say what he is doing, what it costs, what he rolls, and what happens — including
> when someone else's turn hands him a reaction.**

## Announcement — the blog post before the feature

> **The Codex now knows the rules.**
>
> Until today, the Codex only knew what you typed into it. Every spell was your own words, cut off
> at eighty characters, and if you wanted to know what a spell actually did you looked it up
> somewhere else. That is over. The Codex now carries the full 2024 ruleset for your character —
> all 71 spells you can reach, every condition, every action, every weapon mastery — each one with
> a one-line summary you can read out loud mid-turn and a full definition one tap behind it.
>
> The Play tab has been rebuilt around the way a turn actually goes. Your save DC, your AC, your
> initiative and your proficiency bonus sit where you can see them. Your **reactions** have a home
> for the first time, so Hearthfire Manifest tells you what it does and when you may use it instead
> of waiting to be remembered. The bar at the bottom follows you down the page as it always did,
> and now it folds away when you need the screen back. Active Conditions folds too.
>
> We also audited your oath. Oath of the Hearth is sound — it sits on the official power curve and
> nothing is missing. But it has twelve text problems, and three of them break. **Smoldering Smite
> cannot trigger as written**: it fires on a Magic action, and in 2024 Divine Smite is never a Magic
> action. Every one of the twelve is now flagged in the app with the problem, the recommended
> wording, and a line you can hand your DM. The Codex plays the corrected version so the feature
> works — and shows you exactly what it changed, so nothing happens behind your back.
>
> And the AI works again. It picks a model that exists, and when one is retired it finds the next
> one instead of showing you a 404.

## Screens

One plain HTML file per screen in `./mockups/`, built from the app's own design tokens.

| File | Screen |
|---|---|
| `01-play-surface.html` | The Play tab top-to-bottom: the vitals band (HP · AC · save DC · initiative · proficiency), Active Conditions folded, the reactions band, the action list |
| `02-option-detail.html` | One option, both states: the summary row as it sits in a list, and the same option opened to its full definition — dice, save, range, duration, effect, higher levels, tactical note, roll buttons |
| `03-turn-deck.html` | The pinned bottom bar in three states: full, minimized to a single strip, and expanded to show reactions |
| `04-errata-flag.html` | How an errata'd Hearth feature presents itself — what it says, what is wrong with it, what the app is doing about it, and the wording for the DM |

### Not in this phase — named so it is a decision, not an oversight

- **Anything the Vault owns.** Campaign memory, NPCs, session log. The V1 scope boundary
  (`docs/plans/codex-v1/00-status.md`) still binds: *if the fact would still be true with the
  campaign deleted, it is the Codex's; if it exists only because a session happened, it is the
  Vault's.*
- **The Grimoire, Roleplay, Academy and Accent Forge tabs.** The canon lands underneath them and
  they will get more accurate for free, but their layout is untouched here.
- **A character other than Nix.** Everything must keep working for any character — the open-world
  rule from V1 still holds, and the audit will prove it — but only Nix is designed for.
- **The 9 open questions for the DM** in the canon. They get surfaced in the app as questions; they
  do not get answered by us.
