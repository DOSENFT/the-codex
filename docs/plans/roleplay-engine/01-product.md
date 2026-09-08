# Product: The Roleplay Engine

## Problem

Marcus is the social engine at his table. He is the one who starts scenes, pulls
quiet players in, and decides whether a night is "we rolled dice" or "we were
*there*". Tonight there is a campfire scene and two brand-new players, and he
opened the Roleplay tab and did not believe it would carry him.

Three separate things are wrong, and only one of them is the AI.

**1. It hands him fragments, not moves.** He taps "Ambush!" and gets one or two
lines. In his words: *"Idk when I'd actually use what it suggested."* A line with
no situation attached to it is a line he has to invent a situation for — which is
the hard part he opened the app to get help with. A professional improviser does
not think in lines. They think in **beats**: an offer, a target, a direction it
can escalate toward, and a way to hand the scene to someone else. The app gives
him the first quarter of that and stops.

**2. It does not know there is a table.** Everything on the page is about Nix.
But the thing Marcus actually does — the thing he is uniquely good at and wants
to get better at — is *aim* a moment at another human being. There are two people
at that table tonight who have never played before, and nothing in this app knows
they exist or helps him pull them in.

**3. It fails in his face.** The screenshots show a raw Gemini JSON error blob
sitting inside a roleplay card, mid-session. At a table, an app that works four
times out of five is not an app that works 80% of the time — it is an app he
stops reaching for, because he cannot risk the dead air.

And underneath all three: the page is seven stacked modules with no spine. There
is no answer to the only question he actually has in the moment, which is *"it's
my turn to talk — what do I do?"*

## What we are building instead

**A beat, not a line.** Every single thing this page produces — the custom "what
would I say", the impulse buttons, the scene starters — produces the same
complete unit:

- **The move** — the actual thing to do. A line in Nix's voice, or an action, or
  a question aimed at a named person. Often more than one, because a good beat
  is usually *do this while saying that*.
- **Who it's aimed at** — a player at the table, the DM, or the room.
- **What it's for** — the goal. What this beat is trying to accomplish in the
  story, so he knows *when* to use it. This is the direct answer to *"Idk when
  I'd actually use what it suggested."*
- **Where it can go** — two or three directions the scene can escalate toward
  after the offer lands, so the beat has a future instead of a full stop.
- **If they bite** — the follow-up move, ready before he needs it.
- **The out** — how to hand the scene off gracefully if it lands flat. Improv's
  most useful and least taught skill, and the one that makes him safe to take
  the risk in the first place.

**A page that knows who's at the table.** He names the players once. From then
on, every beat can be aimed at somebody by name, and the page quietly tracks who
has had the spotlight and who has not — so "pull Sarah in, she hasn't spoken in
twenty minutes" is something the app can tell him instead of something he has to
track while also playing.

**A page that never goes blank.** Live AI stays, because live is what makes it
about *this* scene. But every beat type also has a bank of real, pre-written
professional beats on the device. If the model is slow, overloaded or gone, the
card fills from the bank and says so quietly. He never sees an error where a
scene should be.

## Success metric

**Zero visible AI failures, and every player named at least once, across
tonight's session.**

Measured from the session log the app already writes: at the End Session screen,
the count of beats that rendered an error instead of content (target: 0), and the
count of distinct table members that a used beat was aimed at (target: all of
them, including both new players).

The honest human version of the same number, which is the one that decides
whether this was worth building: **he reaches for the tab during a scene instead
of after it.**

## Screens

- `mockups/roleplay.html` — the whole tab, one screen, three zones: **the scene**
  (where we are, who's here), **the beat** (the hero card, one full improv beat),
  and **the table** (spotlight tracker + who to aim at next).
- `mockups/beat-card.html` — the beat card alone, in all four of its states:
  live-generated, filling from the bank, aimed at a named new player, and the
  campfire scene-starter variant.
