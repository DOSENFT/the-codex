# Product

<!-- impeccable:product-schema 1 -->

Written 2026-09-11 during the takeover run. Nothing here was asked of the owner: the
takeover brief directs that this file be written from the run's own findings instead of an
interview. Every fact below traces to `.codex-owner/notes/` (inventory, vault, studio, field,
product) or to a file in this repo, and each line says which. Facts the owner has not yet
confirmed are marked **OWNER-DECISION OPEN** and are the questions on
`docs/owner-plan/index.html` §8.

## Platform

web

(Vite 6 + React 18 + Tailwind 4 single-page app, installable and offline-capable via a
hand-written service worker — `vite.config.ts`, `package.json`. No native app exists.)

## Users

**Primary: the D&D player who knows the rules and freezes at the roleplay.** He is sitting at
a physical table with four or five other people, phone in hand, waiting for his turn.

Decided from evidence, not preference (`.codex-owner/notes/product.md:37-53`):

- The app is already a player's instrument and good at it — 48 of 59 features work well, and
  the turn screen enforces the 2024 action economy rather than decorating it
  (`.codex-owner/notes/inventory.md`).
- The market gap is on the player's side: D&D Beyond's own August 2026 roadmap promises an
  in-person player app "likely early 2027" and lists no roleplay feature of any kind.
- The owner is this player; the app was built for one Changeling Paladin.

**The counter-evidence is strong and is recorded, not hidden:** spending in this hobby
concentrates in the dungeon master — Wizards' then-president told investors most purchases come
from DMs, who are "only 20% of the game's overall user base"
(`.codex-owner/notes/field.md`). Three competitors price one payer per table. Whether a player
pays to *improve* (rather than to own content) is untested by anyone.
**OWNER-DECISION OPEN** — §8 question 3.

**Secondary: the dungeon master** is a user of the same app but not the person it is designed
or priced for. Nothing in the roadmap is DM-first.

## Product Purpose

Two surfaces, one law: **the physical table is the experience; the screen is an accent.**

- **PLAY (at the table):** a fast, quiet instrument. It shows what you can do *this second* —
  spend a slot and the mark burns, undo a mis-tap, six seconds, head back up. Anything that
  makes a player look down while another person is talking is a failure, however good it is.
- **PREP (between sessions):** a practice room. Rules drill, improv and scene work, voice and
  accent practice, rehearsing dialogue, recall.

Success, in the owner's terms: a stranger can buy, install and use it at his table; sales over
$100/month and growing; the player is visibly better on Friday.

## Positioning

**Every other D&D tool remembers your character for you. The Codex is the only one that
rehearses you into him — a practice room between sessions, and a six-second instrument at the
table.**

Checked, not assumed: of the five products named in the brief plus the two that actually hold
this job, none has a roleplay, voice or improv feature
(`.codex-owner/notes/field.md`, `.codex-owner/notes/product.md:14-31`). The real incumbent is
not D&D Beyond — it is **Fight Club 5e**, a $2.99 offline character-sheet app at 4.7★ that is
already on the phone.

## Operating Context

- A real table: paper, dice, other people talking, one phone held low. Often a basement with
  no signal.
- One-handed, in dim light, under social pressure, in bursts of a few seconds.
- 390×844 is the design case; 1280×800 is the secondary.
- PREP happens at home, at leisure, with both hands and attention available — the only place a
  longer interaction is allowed.

## Capabilities and Constraints

Confirmed by running the app and reading the code this run (`.codex-owner/notes/inventory.md`):

- **48 features work well, 8 are half-built, 3 are broken.** Broken: making a character from
  scratch (blocks on a network model and timed out 2 of 2, saving nothing), the Persona quick
  reference (written under one field name, read back under another), spaced flashcards.
- **Import is currently the only way in.** The app has exactly one possible user today.
- **No backend and near-zero cost per user.** There is no server in this repo; storage is the
  browser's; the service worker is ~20 lines of hand-written caching (`vite.config.ts`).
- **Not a virtual tabletop.** No map, grid, token or shared canvas exists anywhere in `src/`.
  The screen is never the table.
- **Base path is `/the-codex/`** — the app does not serve at root.
- **Safety net:** 15 browser flows / 97 checks plus 5 saved-data checks, all passing on
  untouched code; `npm test` is 108 files, 2,098 passing.
- **Nothing at the table may need a network, an account, a server or a generative model.**
  Model-backed features live only in PREP, are optional, work offline or fail gracefully, and
  are never named in the pitch (owner's standing rule; the hobby's institutions are recorded in
  `.codex-owner/notes/field.md`).
- **Price: $29, paid once, no subscription** — recommended from comparables, not yet approved.
  **OWNER-DECISION OPEN** — §8 question 2.
- **Name:** the app is "The Codex"; the Studio documents call the business "Ash & Archive".
  **OWNER-DECISION OPEN** — §8 question 4.

## Brand Commitments

- Name: **The Codex**. Repo: `the-codex`.
- The app's own design language, already built and to be preserved (`src/index.css`): warm
  near-black grounds (`--color-void-0/1/2`), gold `--color-arcane` as the single accent, ember
  and verdant for state, Cinzel for display, IBM Plex Sans for text, JetBrains Mono for
  numbers.
- Voice: plain English. Never "unleash", "elevate", "seamless", "game-changing".
- Standing bans from the owner: purple or blue-violet gradients, rows of three icon cards,
  parchment textures, dragons or dice as decoration, emoji, fake testimonials, stock fantasy
  clichés. (`--color-eldritch: #8b5cf6` exists in the app but is excluded from anything new.)
- **Never lead with a model.** The pitch sells the outcome: you'll be good at the table on
  Friday.

## Evidence on Hand

- `.codex-owner/notes/inventory.md` — every feature, sorted, with a capture and a code path.
- `.codex-owner/notes/field.md` and `.codex-owner/ref/` — competitor research with saved
  captures and a `SOURCES.md` listing every URL and fetch date.
- `.codex-owner/notes/vault.md` — the dwk-vault clone: 20 real sessions of the owner's game,
  and a 499-line importer that has no caller. Read-only.
- `.codex-owner/notes/studio.md` — the Studio business documents, which contradict each other
  and the app on price and on who the customer is.
- `docs/owner-plan/` — the owner's page and its captures.

**Absences that must never be fabricated:** revenue to date is **$0**, stated in the owner's
own acquisition memo (`.codex-owner/notes/studio.md`). Users, installs and signups: **none
found** — one GitHub star per repo. There are no customers, no reviews, no press and no
testimonials. Every projection must show its arithmetic.

## Product Principles

1. **The table is the experience; the screen is an accent.** Six seconds and the head comes
   back up. Cost in attention outranks any feature's merit.
2. **What works now stays working.** The safety net passes after every commit; a commit that
   breaks it is undone. Saved data always reopens.
3. **It must survive what killed Sigil:** no backend, near-zero cost per user, local-first,
   never a virtual tabletop, and a log nobody — including us — can rewrite.
4. **Nothing at the table asks a model anything.** Model use is PREP-only, optional, degrades
   to an offline path, and is never in the pitch.
5. **Sell the instrument once; sell the practice repeatedly.** No rent for a house we don't
   heat.

## Accessibility & Inclusion

- One-handed use in dim light at a real table is the design case: large touch targets, no
  interaction that needs two hands or fine aim.
- `aria-label` currently overrides visible text in 39 places, so screen-reader output and the
  visible label disagree (table in `.codex-owner/notes/inventory.md`). Recorded as a defect to
  fix, not a decision.
- The app must remain fully usable offline; no feature may require an account.
