# Product: The Codex V1.0

**Decided 2026-08-15.** Primary device: iPad **and** phone, both first-class, neither a stretched
version of the other. Finish line: runs Marcus's campaign flawlessly — not a product for strangers.
Table access: installable and offline. Design: three full directions, merged into one.

---

## Problem

It is your turn. Five people are looking at you. You know your paladin can do something clever here —
something with Divine Smite, or that spell you prepared for exactly this, or the thing the goblin's
condition just made possible. And you are **scrolling**.

By the time you find it, the moment is gone. You say "I attack." Again.

The Codex exists because the gap between *knowing your character* and *playing your character* is
made of lookup time. Every second spent searching is a second not spent in the fiction. And the
cost compounds: the more interesting your character gets — more spells, more resources, more
conditions in play, more relationships to remember — the slower you get at using them. Complexity
you chose becomes a tax you pay in front of your friends.

Three specific failures, in Marcus's words:

- **"I forget I have it."** Lay on Hands, Channel Divinity, a reaction, a readied action. Resources
  that exist on a sheet you are not looking at do not exist at the table.
- **"I lose my voice."** The persona work — the accent, the catchphrases, the way this character
  actually talks — is done in prep and evaporates under pressure. You default to your own voice.
- **"I can't get to it."** The app needs your PC awake, a fresh tunnel URL typed in every session,
  and internet strong enough to load fonts. Any of the three fails and the tool is gone mid-session.

V0.9 already solves a great deal of this and solves it well. It has been used at a real table.
V1.0 is not a rescue. It is the difference between *a tool that works* and *a tool you reach for
without thinking.*

---

## Success metric

**Primary: turn latency — the median seconds from "it's your turn" to a declared action, measured by
the app's own turn clock. Target: under 15 seconds, with zero turns over 45 seconds.**

The app already tracks initiative, so it can time this honestly without anyone doing extra work.
First job of the build is to record the V0.9 baseline over one real session — we do not yet know
the current number, and a target without a baseline is a wish.

Three guardrail numbers that must also hold, because a fast tool that fails is worse than a slow one:

| Guardrail | Target | Today |
|---|---|---|
| Sessions where Marcus opened another app, book, or physical dice | **0** | unmeasured |
| Times the app showed a blank screen or lost state mid-session | **0** | possible — there are no error boundaries; one crash takes the whole app |
| Seconds from tapping the icon to a usable screen, with the internet off | **under 2** | ∞ — it cannot be installed and will not load offline |

**The overriding law, inherited from `V0.9-CAPABILITY-BASELINE.md` and not up for renegotiation:**
nothing in the list below gets removed, simplified away, or "replaced" by something prettier. If a
feature worked at the table, the only permitted verbs are *keep* and *improve*. A V1.0 that is more
beautiful and less capable is a failure, and we will call it one.

---

## Announcement — the blog post before the feature

> **The Codex 1.0 — your character, at the speed of the table.**
>
> The Codex is the book your character lives in. Not a character sheet you read — a companion that
> knows what you can do right now, in this fight, on this turn, and puts it one tap away.
>
> This release makes it fast enough to disappear. Your turn opens with your real options already in
> front of you, ranked by what the moment actually allows: the spell you can still cast, the resource
> you forgot you had, the reaction you're owed. Combat now understands the parts of the rules that
> tools usually skip — reactions, concentration, readied actions, and a mob of eight goblins that
> behaves like eight goblins instead of eight problems. Mistakes are one swipe from undone, so you
> can log fast and fix later instead of getting it right slowly.
>
> It lives on your home screen now. Tap the icon and it opens — no laptop, no address to type, no
> signal required. Your whole world is on the device.
>
> And it finally looks like what it is: an illuminated grimoire built to be used under bad lighting,
> at speed, with people waiting on you.

---

## What V1.0 must not lose

Twelve surfaces, all verified working in V0.9. Each one survives into V1.0 improved or unchanged —
never reduced. Full detail lives in `V0.9-CAPABILITY-BASELINE.md`.

Combat Helper · Spellbook/Grimoire · Identity · Persona Engine · Backstory Builder · Dialogue Bank ·
Accent Coach · Academy · Campaign Editor · Character Sheet & Setup · Dice Roller · Settings &
Mechanics Drawer.

Plus the crown jewels that are easy to break by accident: the 27 crafted AI prompts, the full-character
context injection that makes the AI feel like it *knows* your paladin, the Gemini↔Ollama fallback,
and every localStorage key holding a real campaign's state.

---

## What V1.0 adds

Chosen from GENESIS v2.0's council-reviewed material — **only the parts that add.** Everything GENESIS
proposed that would restructure or remove a working capability is declined and recorded as declined.

1. **The turn opens itself.** When your turn begins, the app composes what you can actually do now —
   legal, affordable, and relevant to the conditions on the board — instead of showing you everything
   you own and asking you to filter it. This is the single biggest lever on the primary metric.
2. **The missing 40% of combat: reactions, concentration, and readied actions.** Opportunity attacks,
   Shield, Counterspell, "I ready an action to…" — currently unmodeled, and the most common reason a
   player forgets a capability. Concentration surfaces itself when something threatens it.
3. **Mobs behave like mobs.** Eight goblins are one entry with eight pips, not eight rows to scroll past.
4. **Undo.** One swipe reverses a mis-logged hit, a wrong damage number, a slot spent by mistake.
   Logging is only fast if correcting is fast.
5. **It installs.** An icon on the iPad home screen and the phone home screen. Opens instantly. Works
   with the internet off — every surface except the AI, which is honest about needing the connection
   and never blocks the rest of the app while it waits.
6. **Safety at the table.** Lines, veils, and consent captured once, with a one-press veil that is
   always available and can never be switched off.
7. **Motion means something.** A strict budget: long and ceremonial for consequential moments
   (a death save, a level, binding a session), brisk for state changes, near-instant for taps.
   Nothing decorative. Nothing that costs you a second you needed.
8. **It prints.** A readable, beautiful session chronicle and character record on paper, for a table
   that isn't always looking at screens.

## The rules it plays by — non-negotiable

**The Codex is a D&D 2024 tool.** Marcus, 2026-08-15: *"So long as the entire thing we are building is
built with the newest 5e rules."* Every number the app shows, every action it offers, and every
sentence it writes follows the 2024 revision — not the 2014 one, and never a blend of the two. If a
screen would be easier to draw under the old rules, the screen changes, not the rules.

This is a product constraint, not a technical one, because at the table a wrong rule is worse than a
slow app: it costs the group a ruling, an argument, and the trust that the thing on the iPad knows
what it is talking about.

It has already changed the design once. Under 2024 both Divine Smite and Lay on Hands are Bonus
Actions, so with Misty Step they are one decision with three faces — the turn screen has to say so
instead of listing them as three separate options. Delta and evidence:
`docs/plans/codex-v1/reference/03-rules-2024.md`.

## Homebrew is not an edge case — it is the main case

Marcus, 2026-08-16: *"my character is Nix, Oath of the Hearth (homebrew). I should be able to input
[it] in software… it should be powerfully adaptive and continuously edited and still work perfectly
[with] full homebrew details and have it fully work flawlessly."*

**Marcus's own character is homebrew.** So homebrew is not a nice-to-have bolted on the side; it is
the configuration the app is actually used in, every session. Anything that works only for book
content is broken for its only user.

Three properties, in his words:

- **Inputtable** — every homebrew detail is entered through the app, by Marcus, at the table. Not handed to a developer, not hardcoded, not pasted into a file.
- **Continuously edited** — a homebrew subclass is not finished when it is created. It changes mid-campaign, and editing it must never require rebuilding anything or losing state.
- **Still works perfectly** — a homebrew feature must rank in the shortlist, respect the action economy, spend its resources, and undo correctly *exactly as* a book feature does. Degrading to "we'll just show it in a list somewhere" is a failure.

### The acceptance test for the whole of V1.0

> **Marcus enters Nix — Oath of the Hearth, with its custom features and its custom resource pools —
> entirely through the app's own UI, edits it again a week later mid-campaign, and the turn screen
> ranks Nix's homebrew options correctly without a line of code being written for them.**

If that does not work, V1.0 is not done, regardless of what else does.

### What already works (verified 2026-08-16, not assumed)

The prototype is further along here than expected, which narrows the job considerably:
- **"Oath of the Hearth" is already a known subclass** (`dnd-data.ts:23`) with a homebrew content block (`184–205`). Free-text custom subclass entry also exists (`CharacterSetup.tsx:238–262`).
- **Full CRUD on custom class features** with every combat field — `FeatureEditor.tsx:73–360`.
- **Homebrew spells** with damage, save type, casting time, concentration — `SpellEditor.tsx:23–98`.
- **Custom weapons** including `masteryProperty` and `specialAbilities` — `CharacterPage.tsx:248–277`.
- **Custom feats** with an explicit `isHomebrew` flag — `CharacterPage.tsx:305–326`.
- **No combat logic branches on the subclass name anywhere** (verified by grep). Homebrew loses no behaviour today because there is no name-gated behaviour to lose.

### The one real hole

**Resource pools are hardcoded to Paladin.** `PaladinResources` is a fixed three-field shape —
`layOnHands`, `channelDivinity`, `auraRange` (`character.ts:122–126`) — derived from level alone
(`674–680`). There is no way to declare a custom pool. Oath of the Hearth's own resources therefore
cannot be modelled at all. **This is the gap V1.0 must close**, and it gets its own slice.

## On the SRD licensing question — plainer, and much smaller than I made it sound

Marcus, 2026-08-16: *"I don't know what that means."* That was my fault for raising it as a blocker.

The short version: **the rules text the app draws on (conditions, spells, weapon mastery, class
tables) comes from Wizards' System Reference Document, which is published under a Creative Commons
Attribution licence. "Attribution" means one credit line has to appear somewhere in the app.
That is the whole obligation.** No fee, no permission to request, no restriction on the app being
public.

And the part I flagged as a problem has evaporated: I warned that *Oath of Vengeance* is not SRD
content — but **Nix is Oath of the Hearth, which is Marcus's own homebrew.** He owns it outright.
The demo data in the mockups was the only thing using Vengeance, and that is being replaced by Nix.

**So: no decision is needed from Marcus.** A credits line gets added in Slice 15. If he ever wants a
lawyer's read on it, that is his call to make, not a gate on shipping.

## What V1.0 declines, on purpose

Recorded here so no future session re-proposes them: replacing the character sheet with split folios ·
replacing Play/Prep with three "Stances" · moving the AI into margin-only pencil notes · rebuilding
storage as an event-sourced Ash/Archive pair · removing the Academy's XP, levels, and streaks ·
losing jump-anywhere navigation. Each is a real idea, argued well in GENESIS, and each trades away
something that works today. Full reasoning: `docs/plans/codex-v1/00-status.md`.

---

## Screens

The design exploration runs on the four highest-traffic surfaces — the ones that decide whether the
app feels fast. The visual language they settle becomes the standard the other eight are brought up to.

| Mockup | Screen | Why it leads |
|---|---|---|
| `mockups/01-turn.html` | **Combat — your turn**, phone | The metric lives here. Most-used screen in the app. |
| `mockups/02-turn-spread.html` | **Combat — your turn**, iPad two-page spread | Proves the tablet is its own layout, not a stretched phone. |
| `mockups/03-grimoire.html` | **Grimoire**, iPad | Densest information surface — the real test of a type and colour system. |
| `mockups/04-identity.html` | **Identity / Persona at the table**, phone | The "I lose my voice" failure. Must be reachable mid-scene in one tap. |
| `mockups/05-dice.html` | **The roll**, phone | The signature moment. Already has a GPU dice stage built; the frame around it needs to earn it. |

Each is delivered as three competing directions — the same screen designed three genuinely different
ways, built as real clickable HTML you can open on the actual iPad and phone. You pick what you like
from each; the winners merge into one finalized language before a single line of app code changes.

Directions are built from gathered reference, not from memory. Each carries a written note recording
what it is going for, what it borrowed and from where, and what it is deliberately refusing to do —
so a choice made now survives into every screen built later.
