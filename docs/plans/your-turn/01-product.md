# Product: the one "Your Turn"

## Problem

In his words:

> "There are two sections labeled as 'Your turn', both with different visuals and
> features I believe. We need to consolidate both into just one, **without losing
> any features**. There is also an additional box that is locked … It seems like
> yet another 'your turn' type of feature … In my mind, this could just go away."

> "Neither of them organize between Action, bonus action, etc visually that well.
> **It should be a very apparent and masterful organization visually.**"

> "There is a 'Hit Points' module that also has conditions drop down … I'd like to
> see that all neatly and masterfully rolled into the one 'your turn' module …
> Right now, the app displays my hit points in like **3 different locations**."

> "The 'your turn' module that I want all other ones rolled into is **the middle
> module** — the one that has the round, search feature, 'next turn', action,
> bonus, react, move buttons. It has 'always active' for my auras as well as
> clickable details. **But we cannot lose the features of the other 'your turn'
> modules. Nor the visuals.**"

Measured on his phone, on his own character, in combat, this is what he is
describing:

- **Half the screen is furniture.** 429 of 844 pixels never move — a header, a bar
  pinned to the bottom, and the tab bar. He reads the whole game through a
  **415px slot**, and the page behind it is 3,100px long: **seven and a half
  screens**.
- **The pinned bar is 308px** — 36 % of his phone, three quarters the height of
  the window he reads through. On his character, exactly **three** of its
  seventeen controls exist nowhere else: end combat, minimise, and the dice.
- **The two boxes called "Your turn" are 1,138px apart** — nearly three screens of
  scrolling between two things with the same name.
- **His hit points are painted in three places.** He counted right.
- The buttons for action / bonus / reaction / move exist **twice**. So does the
  reset. So do the spell-slot dots — two sets of nine.
- And the thing he presses most, **Next Turn**, is at screen 4 of 7.5 — *below*
  his reactions, *below* a strip called "everything else", while a bar welded to
  the bottom of the glass shows a copy of that same module's own buttons.

The real cost isn't ugliness. To take **one turn** he needs four things — what he
can do, what he can react with, the round and what he has spent, and his hit
points — and today those are spread across **2,214 pixels, 5.3 screens**, at a
table, in a dim room, with people waiting.

## Success metric

**Scrolling required to take one complete turn: ~~5.3 screens today → 0~~
→ 5.3 screens today → at most 2. MEASURED AFTER SLICE 9: 0.88.**

> **The after-number, and the correction that comes with it (2026-09-02).**
> Mechanised for the first time in slice 9 and applied to both builds by one
> function — now `$turnSpan()` in `prove-capabilities.mjs`, pinned as
> `one-turn-span`:
>
> **2,082px / 5.02 screens → 490px / 0.88 screens** (window 558).
>
> The before-number is **2,082, not the 2,214 in the paragraph above.** That
> 2,214 was derived by hand off `measure-today.mjs`'s stack and measured section
> top to module bottom; this measures first control to last control. Both say
> five screens; only the mechanised one can be re-run, and it is the *smaller* of
> the two — so the change is understated, not flattered. The 2,214 is left
> standing above because it is what Gate 1 was approved on.

One turn means: read the round, see everything he can do and pick one, mark it
spent, take damage and see it land, and end the turn.

Measured the same way the number above was measured, with the same instrument,
before and after — the four things one turn needs, in pixels, from the top of the
first to the bottom of the last, divided by the height of the window he reads
through.

**⚠ THE TARGET WAS 0 AND IS NOW 2. HIS RULING, 2026-09-02**, given unprompted
before slice 9 was built, verbatim:

> "so long as you know that I don't need 'absolutely no scrolling'. I'm find with
> having to scroll, it makes it feel like there's a good amount of value and
> feature in the app. **We simply were aiming to consolidate the dublicated types
> of features and box** just like we discussed."

Read carefully, this **confirms the metric and corrects only its target.** The
quantity is still the span of the four things one turn needs — that is what he is
describing when he says a turn should not be a hunt. What he is rejecting is the
`0`, and he is right to: `0` was never his ask. It was written in as a headline
because it sounds decisive, and it turned "stop making him hunt for his own turn"
into "make the page short", which are different jobs and only one of them is
his.

**Where the 2 comes from, so it is not a number picked to match the build.** It
is taken from this document's own already-approved paragraph below — *"the card
is 696px on a fresh turn … the one case that does not is off his turn with all
five reactions open — 796px, about 75px over, so the movement band and the rail
sit one flick below."* Gate 1 approved **one screen plus at most one flick** as
acceptable on the day it was written. Two windows is that sentence as a number.
It was derived before the after-measurement was taken, and it is recorded here
rather than in the prover so it cannot later be quietly relaxed to whatever the
code turns out to do.

**What did NOT move: the three duplication counters in the table below.** *Boxes
about his turn → 1*, *places showing his hit points → 1*, *controls that exist
twice → 0*. Those are the "consolidate the duplicated types of features and box"
he just named, they are plain counts anyone can check, and none of them is
softened by this ruling. **If the span and the counters ever disagree, the
counters win** — a long page whose length is real content is the app he asked
for; a short page that still paints his hit points three times is not.

Five more counters come along, and each is a plain count anyone can check:

| | today | promised | **measured after 8b** | **re-read after 9** |
|---|---|---|---|---|
| boxes about his turn | 3 + a pinned bar | **1** | **1** | **1** |
| places showing his hit points | 3 | **1** | **2** — see the ruling below | **2** |
| pixels of permanent furniture | 429 (50.8 %) | ~~121 (14.3 %)~~ | **286 (33.9 %)** | **286** |
| the window he reads through | 415px | ~~723px (+74 %)~~ | **558px (+34.5 %)** | **558px** |
| controls that exist twice | 4 kinds | **0** | **0** | **0** |

The last column moves nowhere, and that is the reason it was taken. Slice 9 moved
one notice inside the scroller; a counter that had drifted while nobody was
counting would have said so. Read on the shipped build by
`prove-capabilities.mjs --after` — `one-your-turn`, `hp-painted-once`,
`four-bands` — 42/42 green, 0 page errors.

The furniture line is the one that pays for everything else: taking the pinned
bar away nearly doubles the amount of his phone that is actually the game.

**⚠ THE PROMISED COLUMN WAS TAKEN IN A PREVIEW. CORRECTED 2026-09-01, on the
mounted app.** Both struck numbers were read off `?d=1`, which returned the turn
screen *instead of* the app shell and so paid for neither the 56px app header nor
the 65px tab bar: **a measurement taken in the preview is a measurement of the
preview.** The corrected column is his own export at 390×844, in combat, on the
combat tab he actually opens.

Two of the three differences are a decision rather than a shortfall:

- **The app header stays — his ruling, 2026-09-01.** The plan was to suppress it
  on the combat tab, which is where 121px and "hit points in exactly 1 place"
  both came from. Suppressing it would have stranded Play/Prep, Settings,
  Toybox, the character sheet and the roster switcher on the app's default tab.
  So the header keeps its 56px and keeps showing `3/67`. **Two places, and the
  second one is the app's own chrome on every tab.** Inside the combat surface
  his hit points are painted exactly once, down from three.
- **The 65px tab bar was never in the 121.** It is not this phase's to remove.

What is left after both is the honest win: **429 → 286px of furniture, and 415 →
558px of window, +34.5%.** Not the +74% the preview promised — and it is a third
of his screen handed back, measured on the real thing.

**Where it does not quite hold, measured on the mockups.** His turn fits: the card
is 696px on a fresh turn and 668px mid-turn, inside a 721px window. The one case
that does not is *off* his turn with all five reactions open — 796px, about 75px
over, so the movement band and the rail sit one flick below. That is recorded here
rather than fixed by shortening the list, because the list is his actual
reactions. 75px against today's 2,214.

**Amended 2026-08-31 by Gate 2, on measurements of the real app.** Gate 2 found
that most of this card already exists in the codebase behind a `?d=1` flag, and
measuring it corrected three things above. They are recorded here so this doc and
`02-architecture.md` cannot drift apart:

- ~~**The furniture line still reads 121px — but only at rest.** Keeping V-6 (the
  approved rule that says he must never be surprised by what he has already
  spent) costs a ~40px sticky spine that appears once the card scrolls away.
  **121px at rest, 161px scrolled; the window 723px, and 683px scrolled.**~~
  **STRUCK 2026-09-01.** Both halves are wrong and each for its own reason. The
  numbers are preview numbers (see the box above). The sticky spine was struck by
  measurement in slice 7: `.dturn` has ONE scroller and the round bar lives
  *outside* it, so the spine's trigger could never fire — V-6 is met structurally
  by the pinned strip, and there is **no `position: fixed` or `sticky` anywhere
  on this screen.** The furniture is constant: **286px at rest and 286px
  scrolled**, window 558px at both.
- **"Movement · 30 ft" on screen 4 is withdrawn.** The app has no speed and no
  remaining distance anywhere in it — movement is a yes/no. The band shows spent
  or not spent. Painting a 30 would be the app inventing an answer.
- **Nothing else on the do-not-lose list moved**, and Gate 2 found two more items
  for it that only the code could show.

## The shape of the answer

One card, at the top of combat, built on the middle module — his choice — with
everything else folded into it. Five parts, top to bottom:

1. **The round.** Round 3 · Your turn, and **Next turn**. Never scrolls away.
2. **His body.** Hit points in the colour they already change to — his 3 of 67 is
   the red, pulsing state, and that stays exactly as it looks now — with armour
   class beside it, and damage / heal / temp behind one tap. Conditions on the
   same line, as a drop-down, the way they already work.
3. **The four bands** — the answer to *"very apparent and masterful"*. **ACTION**,
   **BONUS**, **REACTION**, **MOVEMENT**, each a named band he can find without
   reading, each showing at a glance whether it is still his to spend. Under each
   band: **everything** of that kind he can do, dice first — *+7 to hit,
   1d10+4 slashing* — with the full details one tap away. Things he cannot take
   right now sit in their own band, dimmed, **with the reason written on them**,
   instead of hidden in a strip called "everything else".
4. **Always active.** His auras, one line, opening to the details — as today.
5. **The rail.** Dice · look up · spell slots · end combat. The three things worth
   keeping from the pinned bar, plus the two from the middle module, on one row.

The rule for the whole build: **nothing on this list may go missing.**

> the round counter · next turn · action / bonus / reaction / move · reset ·
> always-active auras · every row opening to full details · the notes he can
> write on an action · quick look-up · his ranked options with dice and to-hit ·
> the count of what is ready · hit points with their colour · damage · heal ·
> temp hit points · the temp-hit-point source question · death saves ·
> conditions · armour class · spell-slot dots · start combat · end combat ·
> minimise · the dice roller · **the lay-on-hands spend controls** ·
> **the channel-divinity uses**

The last two are underlined for a reason. They live **only** in the pinned bar,
and they do not appear on his character at all — they need a resources block his
sheet does not carry. They are invisible on his screen, so removing that bar on
the evidence of the screen alone would delete two features nobody would notice
were gone until someone else's character needed them.

## Two decisions that go past his literal words

Both are his to veto here, which is what this gate is for.

**1. His reactions come into the card, and the separate reactions box goes.** He
asked to consolidate the boxes *named* "Your turn". But if the card has a
REACTION band, and a box 642px tall listing his reactions still sits below it,
this rebuild has *created* a fourth duplicate while removing three. The band
holds his reactions — Hearthfire Manifest, Sentinel's two triggers, the
opportunity attack, and Interception once the app asks him which fighting style
he took — including the retaliation prompt and its running tally.

**2. The rules disagreement moves down and gets smaller.** The top of his combat
tab spends 349px on his numbers and a notice that his sheet and the 2024 rules
disagree about third-level spell slots. The notice is *right* — a level 7 paladin
has none, his sheet says two, and the app correctly refuses to change his sheet
behind his back. But it costs most of screen one, every time, forever, for a
question he has not answered in months. It becomes one tappable line, below the
card, still offering the same one-tap fix — and the slot dots it is about are
finally in the same place as the flag about them.

## Announcement — the blog post before the feature

**One card. Your whole turn.**

Your turn used to be four places: a list at the top, a box in the middle with the
round counter, a bar welded to the bottom of the screen, and your hit points
somewhere below all of it. Now it is one card, and it is the first thing you see
when combat starts. Everything you can do is sorted into four bands you can find
without reading them — action, bonus, reaction, movement — with the dice and the
to-hit right on the row, and anything you *can't* do right now sitting in its own
band with the reason written on it, instead of hidden under "everything else".
Your hit points, your conditions, your slots and your dice are on the same card,
in the same colours they always were. The bar at the bottom is gone, and your
screen got 74 % taller.

## Screens

Mockups in `./mockups/` — plain HTML, throwaway, his phone's size, his character.

- `01-your-turn.html` — round 3, his turn, nothing spent. The card whole, and what
  is left below it.
- `02-mid-turn.html` — action spent, bonus spent, reaction held. The same card
  when the bands stop being green — this is where "apparent organisation" either
  works or doesn't.
- `03-hurt.html` — his real 3 of 67. Damage going in, the retaliation offering
  itself, conditions open, the tracker in its red state.
- `04-out-of-combat.html` — not in combat. What the card becomes when there is no
  round to count.
