# The Codex — roadmap to 1.0

Written 2026-09-11. Status: **waiting for your approval.** Nothing here is built yet.

The finish line: **a stranger can buy it, install it, and use it at their table on Friday.**

Eleven milestones. Each is one run's work. Each names the features it touches, the thing it has
to beat with a saved picture of that thing, and the checks that decide whether it's done.

Every milestone inherits three rules that don't get restated each time:
- The safety net (15 flows, 97 checks) passes afterwards, or the work is undone.
- Nothing added to the table screen needs a network, an account, a server or a model.
- Your saved character still opens. Any change to how data is saved ships with a migration.

---

## M1 — Take it back

**You get:** you mis-tap a spell slot in the dark and one tap puts it back. Every spend, not just
reactions.

**Builds on:** the undo that already exists. `CombatProvider.tsx:293` has a working undo engine;
`TurnLive.tsx:219` narrows it to retaliations only. **Reworks:** the undo target so it covers slot
spends, action/bonus/reaction/movement spends, damage, healing and temp HP. **Adds:** nothing new —
this is wiring a built thing to the rest of the screen.

**Must beat:** a pencil and the official 2024 spell sheet — rubbing out a tick in the "Expended"
diamonds. `ref/byhand-spell-sheet.png` (source: WotC's official 2024 character sheet PDF). Ours
must be at least as fast and at least as quiet.

**Checks:**
1. Cast Bless → 1st-level slots 4→3 → Undo → back to 4, and the action economy returns with it.
2. Undo names what it will undo before you press it ("Undo Bless"), never a bare "Undo".
3. Undo works for: slot spend, action spend, bonus spend, reaction spend, damage, healing, temp HP.
4. Undo is reachable in one tap from the turn screen with no scrolling at 390×844.
5. Undoing twice walks back two steps, in order; a third undo with nothing left is disabled, not a crash.
6. Undo after an app reload still works on the step taken before the reload.
7. Time from tap to screen settled: under 100ms, measured.
8. Two fresh judges pick ours over the pencil on "take back a spent slot fast and quietly."

**Size:** one run. **Why first:** it's the thing that costs you something this Friday.

---

## M2 — Open before you look at it

**You get:** the DM says your name and the app is already showing your turn. No loading, no
hunting for the tab.

**Builds on:** the service worker and the PWA that already work. `AT-THE-TABLE.md:65-67` records a
~3 second cold start with the cause named at `sw.js:132`. **Reworks:** the cold start, and what the
app shows when it opens mid-session. **Adds:** nothing the pitch would name.

**Must beat:** a paper character sheet already lying open on the table — zero load time.
`ref/byhand-official-character-sheet.png` (WotC official 2024 sheet).

**Checks:**
1. Cold start from a killed app to a usable turn screen: under 1.0s on a phone-class throttle, measured and pasted.
2. Warm start: under 300ms, measured.
3. Opening mid-combat lands on the turn screen with your live state, not on a home screen.
4. Opening outside combat lands where you were, not at a default tab.
5. All of the above with the network fully off.
6. First paint shows real values, never a spinner or a skeleton.
7. Safety net still green.
8. Two fresh judges pick ours over the open paper sheet on "get to the one number you need."

**Size:** one run.

---

## M3 — A character you can make at the kitchen table

**You get:** you can make a character start to finish with the plane in airplane mode, and the
ability scores are the ones you chose.

**Builds on:** the character setup wizard that exists and runs all 11 steps. **Fixes what's
broken:** `CharacterSetup.tsx:452` hard-codes every ability score to 10 and the wizard never asks
for them — so every character made this way has +0 in everything. It also can't finish without a
live call to a model. **Reworks:** the wizard to ask for ability scores (standard array, point
buy, or roll) and to complete with no network. **Adds:** nothing model-backed on this path.

**Must beat:** Fifth Edition Character Sheet — a $2.99 offline app that already does this.
`ref/fifthedition-charsheet-appstore.png` (source: Apple App Store listing, 4.3★).

**Checks:**
1. Make a character with the network off, end to end, no model call. Network log shows zero outbound requests.
2. Ability scores you enter are the ability scores that get saved. Assert all six, and the derived modifiers.
3. Standard array, point buy and manual entry all work; point buy refuses to overspend and says why.
4. The new character appears in the roster and can be switched to — which also un-breaks the Switch Character button (`Settings.tsx:1129`, dead while the roster has one entry).
5. Max HP is computed from class hit die + CON, not left at a default.
6. Close the app, reopen, the character is identical. Asserted field by field.
7. Total time to a playable character: under 3 minutes, measured.
8. Safety net still green, plus these flows added to it.

**Size:** one run. **Why here:** until this works, nobody but you can use the app at all.

---

## M4 — Not just Paladins

**You get:** your friends can use it. Any class, not just Oath of the Hearth.

**Builds on:** the canon rules layer, which is real and well tested — it just holds one class.
`src/canon/index.ts:82-88`: `PROGRESSION_BY_CLASS` has exactly one key. The class dropdown offers
twelve; eleven of them steer nothing. **Adds:** progression tables, spell lists and class features
for the other eleven 2024 classes. **Reworks:** the turn composer so the character's class actually
selects which features it offers.

**Must beat:** Fight Club 5e — offline, all classes, $2.99 once, 4.7★.
`ref/fightclub5e-appstore.png` (source: Apple App Store listing).

**Checks:**
1. Make one character of each of the twelve classes; each gets the right proficiency bonus, hit die, saves and spell slots at levels 1, 5 and 11.
2. A Wizard's turn screen offers Wizard things and no Paladin things. Asserted for four classes.
3. Spell slots for full casters, half casters and pact casters each follow their own table. Assert Warlock slots recharge on a short rest.
4. Subclass features appear at the right level for one subclass per class.
5. Non-casters (Fighter, Barbarian, Monk, Rogue) get a turn screen with no empty spell rail.
6. Nix, the existing level 7 Paladin, is byte-identical after the change. Safety net proves it.
7. Every class's turn composes in under 100ms, measured.
8. Two fresh judges pick ours over Fight Club 5e on "see what this character can do right now."

**Size:** one run.

---

## M5 — The practice room remembers you

**You get:** what you write about your character actually shows up where you practise, and
practice counts toward something.

**Builds on:** the Roleplay engine, which works end to end today. **Fixes what's broken:** the
persona panel renders headings "PHYSICAL TICS" and "SCENE INSTINCTS" with nothing under them,
because the app writes `colorTraits` and reads `physicalTics` — a field mismatch with four
consumers, one of them the PLAY-tab `CombatHelper.tsx:544,550`. Spaced flashcards read the same
three dead fields. **Also fixes:** Academy XP, which is wired for quizzes only —
`recordDrill`, `recordOneShot`, `recordConversation` and `awardDrillXP` are exported and unit
tested with **zero callers**, while the bar reads "Complete quizzes and drills to earn XP."

**Must beat:** the PERSONALITY TRAITS / IDEALS / BONDS / FLAWS box on the paper sheet.
`ref/byhand-5e-sheet-personality-panel.png` (WotC official 5e fillable sheet).

**Checks:**
1. One field name, one place. Grep proves `physicalTics`/`sceneInstincts`/`quietTexture` have a writer or are gone; no consumer reads a field nothing writes.
2. Type it in the persona editor, see it in: the persona panel, the flashcards, the roleplay coach, and `CombatHelper`. All four asserted.
3. Complete a drill → XP moves. Complete a one-shot → XP moves. Complete a conversation → XP moves. The measured number pasted for each.
4. The XP bar's own words match what actually earns XP.
5. Existing saved characters migrate: a character saved before this change opens with its persona text intact. Migration shipped and checked.
6. Flashcards generate from real persona text, never from placeholder text.
7. Safety net still green, plus these flows added.
8. Two fresh judges pick ours over the paper personality box on "recall who this character is, fast."

**Size:** one run.

---

## M6 — Practice with no signal

**You get:** the Academy works on the bus, in a basement, on a plane. No key, no model, no bars.

**Builds on:** the Academy, which exists and works — but `QuizArena.tsx:155` makes every single
question a live model call, while `README.md:7` says "Works offline" flatly. Your own
`TABLE-READY.md:2465` diagnosed this and prescribed the fix; it was never built. **Adds:** a real,
authored offline bank of rules questions and drill prompts. **Reworks:** the Academy so the model
is an optional enhancement, never the load-bearing part.

**Must beat:** D&D Beyond's offline story, in its own users' words.
`ref/dndbeyond-forum-offline-access.png` (source: D&D Beyond forums).

**Checks:**
1. Network off, no API key: complete a full quiz run of 10 questions. Zero outbound requests in the network log.
2. Network off: complete a drill and a conversation drill.
3. The bank covers the 2024 rules the turn screen already models: action economy, spell slots, concentration, reactions, death saves, conditions. Question count per area pasted.
4. Every question's answer is checkable against the canon already in `src/canon/` — no question whose answer the app can't justify.
5. No repeated question inside a single run; across ten runs, repeat rate measured and pasted.
6. With a model available, it adds questions but never blocks; kill the model mid-run and the run finishes.
7. `README.md`'s "works offline" claim is now true, and the run proves it.
8. Safety net still green.

**Size:** one run.

---

## M7 — Rehearse the voice

**You get:** twenty minutes on Thursday and you are not fumbling on Friday. This is the thing
nobody else sells.

**Builds on:** Accent Forge, which has four working tabs and six accents. **Adds:** the drill
loop that was specified file by file and never written — `AccentDrill.tsx`, `accent-drills.ts`,
`accent-progression.ts` (`ACCENT-FORGE-ROADMAP.md:309-332, 473-502`): a prompt, you say it out
loud, you rate yourself, it comes back on a schedule, and it feeds the Academy XP that M5 wired.
**Reworks:** nothing that works today.

**Must beat:** Mike Shea's handwritten 3×5 NPC cards — how a prepared person does this now.
`ref/byhand-index-card-npc.png` (source: slyflourish.com/3x5_campaign_design.html).

**Checks:**
1. Run a full drill offline: prompt shown, self-rating recorded, XP awarded, scheduled to return.
2. The schedule is real spaced repetition — a thing rated badly comes back sooner. Assert the interval maths on three ratings.
3. Drills are generated from YOUR character's persona (M5's fields), not from generic samples.
4. Six accents each produce drills; each drill is speakable in under 15 seconds, measured.
5. Progress is visible and honest: what you have practised, what is due, no invented mastery percentage.
6. Nothing on this path requires a microphone, a model or a network. Any of those that exist are optional and degrade silently.
7. Safety net still green, plus the drill loop added.
8. Two fresh judges pick ours over the index cards on "get a voice ready for Friday."

**Size:** one run.

---

## M8 — A log nobody can rewrite

**You get:** what happened at your table is yours, permanently, and nothing — including us — can
quietly change it. This is the answer to "why doesn't this die like Sigil."

**Builds on:** the session timeline and the character export that already work. **Adds:** the
append-only log pattern the vault already proves out, where undo is a compensating entry rather
than a deletion (`.codex-owner/notes/vault.md`). **Reworks:** the export so a session log leaves
the app in a form that opens without the app.

**Must beat:** Sigil's ending — "content created within Sigil will no longer be accessible."
`ref/sigil-sunset-faq.png` (source: D&D Beyond's own Sigil sunset FAQ).

**Checks:**
1. Every table action writes one entry; nothing ever deletes one. Assert after 50 actions including 10 undos: 60 entries, 0 removals.
2. An undo appears in the log as a reversal with its own timestamp, not as a hole.
3. Export a session; the file opens in a text editor and reads as English, with no app installed.
4. Re-import an exported log and get identical state back. Round trip asserted field by field.
5. The log survives an app update: write with the old build, read with the new one.
6. Size of a 4-hour session's log, measured, and the storage cap behaviour when the browser runs low.
7. Writing a log entry costs under 5ms and never blocks the turn screen, measured.
8. Safety net still green.

**Size:** one run.

---

## M9 — A stranger can install it

**You get:** somebody who has never met you opens it and is playing in five minutes.

**Builds on:** the PWA, which works. **Adds:** a real first run — a clear way in that isn't
"import a JSON file", an "add to home screen" nudge and an update prompt
(`docs/plans/codex-v1/00-status.md:108`, deferred). **Reworks:** the empty-state welcome screen,
which currently assumes you already have a character file.

**Must beat:** the first run of D&D Beyond's player app.
`ref/dndbeyond-player-app-page.png` (source: D&D Beyond's own player app page).

**Checks:**
1. A person who has never seen it reaches a playable turn screen in under 5 minutes, timed, with no instructions from us.
2. Install to home screen offered at the right moment, dismissible, never nagging. Assert it appears once.
3. An update prompt appears when a new build is waiting, and never loses unsaved state.
4. First run works with the network off after the first load.
5. No empty screen anywhere in the first run has a dead end — every one offers the next step.
6. Every first-run screen passes the design critique and the audit, at 390×844 and 1280×800.
7. No screen mentions a model, a key, or a provider on the first run.
8. Two fresh judges pick ours over D&D Beyond's first run on "get to playing."

**Size:** one run.

---

## M10 — Take money from four strangers *(by hand — yours)*

**You get:** proof the thing sells, before we build anything else for scale. The riskiest
assumption in the whole plan is that a *player* will pay, and this is the cheapest test of it.

Nothing to build. Step by step, what you do:

1. **Price it at $29, one time.** Not a subscription — the reasons are in `notes/product.md`.
2. **Pick the storefront.** Itch.io takes a PWA and a one-time price with no app-store review and
   no cut beyond what you set. Decide between itch.io and a direct Stripe payment link. *(This is
   the only step where you may need to spend money — I will not open an account or spend anything.)*
3. **Write the store page from `notes/product.md` §"The one sentence".** Do not name a model,
   a provider, or AI anywhere on it. Sell the outcome: *you'll be good at the table on Friday.*
4. **Record one 40-second video**: the DM says your name, you're already talking; then your turn,
   six seconds, head back up. No voiceover about features.
5. **Post once** to r/dndnext or r/DMAcademy — as a player who built a thing for his own table,
   with the video. Not an ad. Answer every reply for 48 hours.
6. **Stop at four sales or four weeks, whichever comes first.** Write down: how many people saw
   it, how many bought, and every reason anybody gave for not buying.

**Must beat:** $116/month. The arithmetic: `$29 × 4 = $116`.

**Checks:** four sales, or a written record of why not. The reasons matter more than the money.

**Size:** one run of yours, spread over up to four weeks.

---

## M11 — Put it in front of real tables and real reviewers *(by hand — yours)*

**You get:** people who aren't you, using it at tables that aren't yours, and someone with an
audience saying so.

Step by step:

1. **Five tables that aren't yours.** Ask five people you actually know who play. Give it free.
   Ask exactly one question after their session: *did you look down less, or more?*
2. **Watch one session you are not in.** Ask to sit in on one, say nothing, and write down every
   time somebody looked down and why. That list becomes the next roadmap.
3. **Three reviewers, in this order** — smallest first, so you learn before the big one:
   - A D&D blog that reviews tools (Sly Flourish's site is where the index-card comparator came
     from; start there).
   - A mid-size YouTube channel about running games, not about playing them.
   - Then, and only then, a larger outlet.
   For each: one email, three sentences, the 40-second video, a free copy, no follow-up beyond one
   reminder after two weeks.
4. **Ask every reviewer one thing**: what would stop you recommending this? Write the answers into
   `STATE.md`.

**Must beat:** the current situation — zero users, zero reviews, zero posts (`notes/studio.md`).

**Checks:** five tables used it. One session observed. Three reviewers contacted. Every answer
written down.

**Size:** one run of yours.

---

## Candidates — noticed, not scheduled

Real, found in the code or the documents, deliberately not in the eleven. Promote them only by
replacing something above.

- **Level Up raises the level without recomputing max HP.** A genuine bug (`KNOWN-BROKEN.md`). Small.
- **Accessibility fault:** the Dice Roller and Mechanics Reference are permanently mounted
  off-screen with `aria-modal="true"`, so a screen-reader user can't reach the tab bar
  (`docs/plans/HANDOFF.md:349-352`).
- **Nested `<button>`** at `GrimoireCard.tsx:68`.
- **`CharacterFeat.abilityIncrease`** is declared and never applied (`character.ts:237`).
- **Campaign context reaches 3 of ~44 model call sites**, not "every prompt" as `README.md:319` claims.
- **Mobs** — eight goblins as one entry with eight pips (`docs/plans/codex-v1/01-product.md:107-110`).
- **Readied actions** — needs a trigger the app can hold and re-offer (`00-status.md:102`).
- **Vault link-up.** A working 499-line importer exists with no npm script and no caller, and its
  default path points at a stale 16-session snapshot while the vault has 20
  (`notes/vault.md`). It also throws away all 354 timecodes and all 195 open threads.
- **Voice analysis and the Performance Science tab** — Accent Forge phases 4–5, specified file by
  file, never written.
- **Tauri desktop shell** (`docs/plans/codex-v1/00-status.md:29`).
- **Practice content as the repeat purchase** — accent packs and scene banks sold one-time. This is
  the business model from `notes/product.md`, and it should not be built until M10 shows somebody
  will pay for the app at all.
