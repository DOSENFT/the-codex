# The Codex — owner feature inventory

Audit date: 2026-09-11. Branch `owner/build`, no source modified.
App driven at `http://localhost:5191/the-codex/` (base path `vite.config.ts:7`), Playwright,
service worker disabled via `localStorage['codex-sw-off']` in every context.
Character used: **Nix**, Changeling Paladin (Oath of the Hearth) level 7 — imported through the
app's own JSON import from a COPY of `public/_seed.json`
(copy at `.codex-owner/notes/_probe/seed-copy.json`; the original was never opened for writing).

Captures: `docs/owner-plan/captures/` — 390x844 @2x unless the name ends `-1280`
(1280x800 @2x). Every claim below is either a `path:line` I opened or a capture I took.

AI provider used for every AI claim: **Ollama, `gemma3-27b-abliterated:latest`, running locally
on this machine** (confirmed live: `GET http://localhost:11434/api/tags` returns the model,
27.0B / Q4_K_M / 16.5 GB). `fallbackEnabled: false` so nothing could silently substitute.

---

## Flows that work end-to-end

Every sentence below is a flow I personally drove in the browser, start to finish, and saw succeed.
Button/label names are exactly as they appear in the accessible name.

**Character intake**

1. From the empty-state welcome screen I clicked **Import Character**, the app opened a file
   picker, I gave it a copy of `public/_seed.json`, and the app parsed it, reported the repairs it
   made, I clicked **Use This Character**, and Nix loaded into PLAY / Combat.
   (`setup-welcome-390.png` → `setup-import-result-390.png` → `play-combat-after-import-390.png`)
2. After importing, I reloaded the page (F5 equivalent, `page.reload`) and Nix came back with HP
   still at 3/67 and the same tab selected — `codex-active-id` survived the reload.
   (`reopen-after-reload-390.png`)
3. From PREP / Character I clicked **Export Character** and the browser downloaded
   `codex-nix-lvl7.json`. (`prep-character-export-character-390.png`)

**Combat / the turn screen (PLAY → Combat)**

4. I clicked **Start Combat**; the screen went to "Round 1 / YOUR TURN / 14 ready" and the four
   economy pills (ACTION / BONUS / REACTION / MOVEMENT) appeared.
   (`play-combat-started-390.png`)
5. I opened the ACTION band, tapped the **Bless** option card, and clicked
   **Spend ACTION · 1ST-LEVEL SLOT**. The 1st-level slot count went 4→3 in localStorage, ACTION
   flipped to SPENT, and BONUS dropped from "3 ready" to "2 ready" because the 2024
   one-levelled-spell-per-turn rule now blocks Shield of Faith.
   (`play-option-card-390.png` → `play-slot-spent-390.png` → `play-bonus-spent-390.png`)
6. I clicked **Undo**; BONUS went back to "2 ready" and only the last step was reversed — the
   earlier slot spend stayed spent. (`play-undo-390.png`)
7. I clicked **Spend ACTION** on **The Dawn Guardian** and got "ACTION 1 ready · 1 of 2 used ·
   1 attack left · SWING AGAIN"; clicking it again gave "0 ready · 2 of 2 used · SPENT".
   Extra Attack is really counted. (`play-action-1of2-390.png`, `play-action-2of2-390.png`)
8. With the Action spent I tried to cast **Bless** again and the button was genuinely `disabled`
   with class `act blocked` — the action economy is enforced, not decorative.
9. I clicked **End turn**; the screen went to Round 2 and "Someone else is acting / Your Reaction
   is the one thing that is yours right now / THE MOMENT", and every on-turn option was annotated
   "It is not your turn". (`play-off-turn-390.png`, `play-round2-390.png`)
10. I clicked **Apply damage**, typed 2, and HP went 3→1; then damage 5 took it to 0 and the
    DEATH SAVES panel appeared with Success / Failure / **Reset Death Saves**.
    (`play-damage-pad-390.png`, `play-damage-applied-390.png`, `play-death-saves-390.png`)
11. I clicked **Apply healing**, typed 20, and HP went 0→20. (`play-heal-applied-390.png`)
12. I clicked **Set temporary hit points**, typed 10, and the app asked
    "GRANTED BY: DON'T KNOW / HEARTHFIRE MANIFEST" before applying it.
    (`play-temphp-pad-390.png`, `play-temphp-source-390.png`)
13. I opened the **Open dice roller** drawer, clicked **Set up d20**, typed 17 into "The number
    your 1d20 showed", clicked the button whose visible text is **Log it** but whose accessible
    name is **Write this roll down** (`src/components/RollCapture.tsx:395-397` — the `aria-label`
    overrides the text, so `getByRole('button', { name: 'Log it' })` will NOT find it), and the
    roll appeared under "Recent Rolls — 1d20 = 17".
    (`chrome-dice-roller-filled-390.png` → `chrome-dice-logged-390.png`)
14. I opened **Open mechanics reference**, typed "concentration" into "Search mechanics...", and
    it filtered to the concentration card. (`chrome-mechanics-search-390.png`)
15. I opened **Open settings**, clicked **Long Rest** then **Confirm Long Rest**; HP went 3→67 and
    2nd-level slots went 2/3→3/3 in localStorage.
    (`chrome-settings-long-rest-390.png` → `chrome-settings-after-long-rest-390.png`)
15b. In the same drawer I clicked **Short Rest** (single click — there is deliberately no confirm)
    and the drawer showed "Short rest complete. Short-rest features restored." Nothing changed in
    localStorage, correctly, because the seed character has no short-rest features, no
    `paladinResources` and no `resourcePools`.
    (`chrome-settings-short-rest-feedback-390.png`)

15d. In PLAY / Combat I opened **Your sheet and the 2024 rules disagree on 1 thing** and clicked the
    single adopt button, whose own label spells out the change —
    **"Use the 2024 slots 1ST ×4 · 2ND ×3 · 3RD ×2 → 1ST ×4 · 2ND ×3"**. The `"3"` key vanished from
    `spellSlots` in localStorage and the whole band removed itself.
    (`play-rules-flags-open-390.png` → `play-rules-flag-adopted-390.png`)
15e. In PLAY / Combat I opened the **RULES FLAGS** band ("6 · 6 unanswered") and, for each of
    HEARTH-03 through HEARTH-08, clicked **CANON'S FIX** inside that erratum's
    `[role=group][aria-label="Ruling for HEARTH-0N"]`. The counter stepped
    6 · 6 unanswered → 5 → 4 → 3 → 2 → 1 → **6 · all answered**, the six rulings were written to
    `codex-errata-<id>`, and the counter still read "6 · all answered" after a page reload.
    (`play-errata-band-open-390.png` → `play-errata-all-answered-390.png`)
15c. In PLAY / Combat I clicked the "ONE REACTION IS MISSING" band (query it as
    `[data-fighting-style-gap]` — it has no aria-label), the "PICK YOUR FIGHTING STYLE" sheet opened
    with all 11 styles, I clicked `[data-style-option="Interception"]`, and three things happened at
    once: `feats` gained "Interception" in localStorage, the REACTION band went **4 ready → 5
    ready**, and the gap band deleted itself.
    (`play-fighting-style-picker-390.png` → `play-fighting-style-picked-390.png`)

**Roleplay / the Play cockpit (PLAY → Roleplay)**

16. I clicked **Start the scene**, filled "Around the campfire, first night out" with
    "A crowded riverside tavern, rain outside" and "Everyone is still being polite..." with
    "Tense. Scar is watching the door.", clicked **That's the scene**, and the app generated an
    opening beat in 7.1 s. (`play-roleplay-scene-form-390.png` → `play-roleplay-opening-beat-390.png`)
17. I clicked **Give me a beat** and got a beat naming Scar and the tavern, with
    USE IT WHEN / THE MOVE (DO / SAY / ASK) / WHAT IT'S FOR / IF THEY BITE, in 15.6 s.
    (`play-roleplay-give-me-a-beat-390.png`)
18. Same for **Raise the stakes** (16.6 s) and **Pull someone in** (15.6 s) — distinct, in-fiction,
    character-aware beats each time.
    (`play-roleplay-raise-the-stakes-390.png`, `play-roleplay-pull-someone-in-390.png`)
19. **React** and **Land the moment** also produced fresh beats (11–12 s each).
    (`play-roleplay-react-390.png`, `play-roleplay-land-the-moment-390.png`)
19b. With the scene running I typed "Brenna" into **Add a player**, clicked **Add player**, and she
    appeared as "Brenna — not yet tonight". I clicked **Aim a beat** on her row and got a beat
    written at her by name, referencing both her and Scar and the tavern, in 13.2 s.
    (`play-roleplay-table-add-player-390.png` → `play-roleplay-aim-a-beat-390.png`)
19c. I clicked **I played it** on that beat and three things moved at once: the Session Timeline
    went "0 moments" → **"1 moment"** with "react · 100%" and the moment's text; Brenna's row
    flipped from NOT YET TONIGHT to **JUST NOW**; and her stored record became
    `lastSpotlightAt: <ts>, beatsAimed: 1`.
    (`play-roleplay-i-played-it-390.png` → `play-roleplay-timeline-1-moment-390.png`)
19d. After playing three beats ("3 moments") I clicked **End Session** and the timeline reset to
    "0 moments / Your RP timeline builds as you play".
    (`play-roleplay-end-session-result-390.png`)
20. I opened the **Perform**, **Impulse**, **Recall** and **Engage** panels and each showed real,
    character-derived content (13 / 8 / 28 / 19 items, drawn from Nix's relationships and traits).
    (`play-roleplay-perform-390.png`, `-impulse-`, `-recall-`, `-engage-`)

**Prep**

21. In PREP / Character I tapped the Acrobatics bonus three times and it cycled
    not proficient → proficient → expertise → not proficient, and the roster JSON in localStorage
    still held the correct `skillProficiencies` afterwards. (`prep-character-skill-cycled-390.png`)
22. I clicked **Study Strength** and got a full explainer (what STR is used for, how to increase it).
    (`prep-character-study-strength-390.png`)
23. I opened **Add Weapon**, **Add Feat**, **+ New pool** and **+ New condition** and each opened a
    complete, labelled editor form with its own validation copy.
    (`prep-character-add-weapon-390.png`, `-add-feat-`, `-new-pool-`, `-new-condition-`)
24. In PLAY / Grimoire I clicked **The rules** and got the five 2024 preparation rules; I clicked
    the **Bless** row and got a full detail card (AT A GLANCE / CONCENTRATION / SLOT /
    FULL TEXT / CAST WITH A HIGHER SLOT / HOW TO USE IT).
    (`play-grimoire-the-rules-390.png`, `play-grimoire-spell-detail-390.png`)
25. In PREP / Persona I clicked **AI Suggest Traits** and got five new, Nix-specific traits
    appended in 10.6 s; **AI Suggest (combat)** added three new combat lines in 6.0 s (13→16).
    (`prep-persona-ai-traits-390.png`, `prep-persona-ai-dialogue-390.png`)
25b. In PREP / Persona I expanded the **Betrayal** row of SCENE RESPONSES, typed into
    "How does Nix react to betrayal?", clicked **Add a betrayal response**, and the row went
    "0 responses" → "1 response" with the line quoted back and a "Last edited" date, saved to
    `sceneResponses` in localStorage. (`prep-persona-scene-response-added-390.png`)
26. In PREP / Academy → Training I clicked **Generate Scene** and got a full in-fiction scene in
    12.1 s; **Start Drill** gave an improv prompt with "What does your character SAY / DO" and a
    **Grade Me** button in 9.1 s.
    (`prep-academy-scene-coach-390.png`, `prep-academy-improv-drill-390.png`)
27. In PREP / Academy → Quizzes I clicked **Generate Question** and got a correct 4-option
    multiple-choice question about Bless's duration in 12.1 s; **Start Drill** (Condition Drill)
    produced a Faerie Fire condition question in 9.0 s.
    (`prep-academy-quiz-question-390.png`, `prep-academy-condition-drill-390.png`)
27b. In PREP / Academy → Quizzes I clicked **Generate New Question** and then the correct lettered
    option, and the header went **0 XP → 10 XP**, the streak went to "1 · Best: 1", ACCURACY BY
    CATEGORY appeared showing "Spells 100%", and `codex-training-<id>` was created.
    (`prep-academy-quiz-xp-awarded-390.png`)
28. In PREP / Academy → Training → **Start One-Shot Adventure** → **Begin One-Shot** I got
    "Turn 1/10 — THE ADVENTURE BEGINS" with three numbered choices and "Do Something Else",
    in 12.1 s. (`prep-academy-oneshot-390.png`)
29. In PREP / Academy → Training → **Conversation** I picked **Tavern Keeper**, clicked
    **Start Conversation**, and an NPC ("Old Man Tiber") opened the scene with
    "Exchange 1 of 10", in 9.1 s. (`prep-academy-conversation-390.png`)
30. In PLAY / Combat I opened **COMBAT ADVISOR**, typed "Surrounded by 3 goblins, what should I
    do?" and clicked **Send combat question**; it returned a ranked, character-specific plan
    (named The Dawn Guardian, the +7 to hit, Scar) — 3 of 3 trials succeeded.
    (`play-combat-advisor-answer-390.png`)
31. I opened **Open The Toybox** and each of **Combos / Tactics / Persona** was populated with
    hand-written, Nix-specific content; opening the "Hearth Wall" combo gave a 3-step turn script
    with positioning advice and a temp-HP-doesn't-stack warning.
    (`chrome-toybox-combos-390.png`, `-tactics-`, `-persona-`, `chrome-toybox-combo-open-390.png`)
32. Still in the Toybox, on each of Combos / Tactics / Persona I clicked the header button whose
    visible text is **Suggest** but whose accessible name is **AI Suggest**
    (`src/components/ToyboxPanel.tsx:668` — `getByRole('button', { name: 'Suggest' })` will NOT
    match it), and each returned an "AI SUGGESTIONS" card set with per-item **Add** and a
    **Dismiss**: 3 combos in 25.7 s, 4 tactics in 25.7 s, 3 persona plays in 16.6 s — one of which
    ("The Guilt-Driven Helper") cited Selis from Nix's backstory.
    (`chrome-toybox-ai-suggest-combos-390.png`, `-tactics-`, `-persona-`)
33. In the settings drawer I clicked **New Character** and the app routed to the welcome screen
    showing **Create New Character**, **Import Character** and a "Your Characters" list containing
    Nix ("Paladin (Oath of the Hearth) · Lvl 7") — the roster and `codex-active-id` were both
    preserved. (`chrome-new-character-390.png`)

**What I could NOT drive end-to-end**

- **Create a character from scratch.** See BROKEN below. The wizard never completed once.
- Anything needing a microphone (Accent Coach recording, Improv speech recognition) — headless
  Chromium has no audio input device and I did not fake one.
- Printing the character record (`window.print()` / Ctrl+P) — cannot be observed headlessly.

---

## Feature inventory

### Shell, navigation and persistence

**Two-mode shell (PLAY / PREP) with per-mode tabs** — WORKS WELL. Capture: `play-turn-390.png`
(PLAY/Combat) and `prep-character-390.png` (PREP/Character). Two modes, seven tabs
(session: Combat/Grimoire/Roleplay; prep: Character/Grimoire/Persona/Academy); the mode is
remembered in `codex-app-mode` and each mode has its own default tab. Every surface is a static
import behind its own `<ErrorBoundary surface=...>`, a deliberate rejection of `React.lazy`.
Code: `src/App.tsx:43,65-73,129-256`; `src/components/Layout.tsx:17,39-48`.
Takes: nothing — small.

**localStorage persistence + reopen** — WORKS WELL. Capture: `reopen-after-reload-390.png` (PLAY/Combat
after reload). Character, roster, active id, combat state, combat log, toybox and training state all
persist under separate keys and survive a reload with HP and tab intact. Code:
`src/lib/character.ts:491-494`. Takes: nothing — small.

**Save failure alarm (`SaveAlarm`)** — WORKS WELL (by inspection; not triggerable without filling
the quota). It is mounted outside `<Layout>` so a save error can never be hidden by a crashed
surface. Code: `src/App.tsx:262`; `src/components/SaveAlarm.tsx`. Takes: nothing — small.

**Character switcher / roster** — HALF-BUILT, with one dead button. Captures:
`chrome-settings-390.png`, `chrome-switch-character-390.png`, `chrome-new-character-390.png`
(any route, settings drawer). The storage layer is genuinely multi-character (`codex-roster`,
`codex-character-<id>`) and **New Character** works — it routes to the welcome screen, which shows
"Your Characters" with Nix listed as "Paladin (Oath of the Hearth) · Lvl 7", and leaves the roster
and `codex-active-id` intact. But **Switch Character** is a **dead button with one character**: it
is rendered enabled and unconditionally, while the panel it toggles is gated on
`showSwitcher && roster.length > 1` (`src/components/Settings.tsx:1140`). I clicked it and the page
text did not change by a single line. Since the create wizard is broken (below), import is the only
way to reach `roster.length > 1`, so for a new user this button can never do anything.
Code: `src/components/Settings.tsx:1130` (button), `:1140-1158` (gated panel),
`src/lib/character.ts:491-494`. Takes: disable-or-hide the button when `roster.length < 2`, or make
it route to the welcome roster the way New Character already does — small.

**Import character (JSON)** — WORKS WELL. Capture: `setup-import-result-390.png` (welcome route).
Accepts `.json/.txt`, parses, reports every repair and warning it had to make, and asks before
accepting. This is the only working way to get a character into the app. Code:
`src/components/CharacterSetup.tsx:152-184`; `src/lib/character.ts` (normalisers, ~line 805 on).
Takes: nothing — small.

**Export character (JSON)** — WORKS WELL. Capture: `prep-character-export-character-390.png`
(PREP/Character). Downloads `codex-nix-lvl7.json`. Also reachable from the settings drawer.
Code: `src/components/CampaignEditor.tsx` (Export Character at the foot of PREP/Character);
`src/components/Settings.tsx`. Takes: nothing — small.

**Settings drawer** — WORKS WELL. Capture: `chrome-settings-390.png` (any route). Table Covenant
(Line/Veil safety tools), AI configuration, character info, level up, backstory copy/paste transfer,
character management, rest management, SRD 5.2.1 attribution. Code: `src/components/Settings.tsx`
(1338 lines). Takes: nothing — small.

**Long Rest / Short Rest** — WORKS WELL (Long) / WORKS WELL but vacuous on this character (Short).
Captures: `chrome-settings-long-rest-390.png` (confirm dialog), `chrome-settings-after-long-rest-390.png`,
`chrome-settings-short-rest-feedback-390.png` (settings drawer). Long Rest has a confirm step
("Confirm Long Rest") and really restores HP (3→67) and slots (2nd 2/3→3/3). Short Rest is a single
click with **no** confirm step; it fires and reports "Short rest complete. Short-rest features
restored.", and `shortRest()` restores short-rest feature uses, +1 Channel Divinity and short-rest
pools — but it changed nothing measurable for Nix because the seed character has
`featuresWithUses: 0`, `paladinResources: false`, `resourcePools: 0` (read back out of localStorage
after the click). So the code path is real and the button is honest; the *seed data* has no
short-rest resource for it to act on. Code: `src/components/Settings.tsx:1213-1223` (button + copy),
`src/lib/character.ts:1350-1383` (`shortRest`). Takes: give the seed character its Channel Divinity
and Lay on Hands pools so the button has something to do — small.

**Level Up** — HALF-BUILT. Capture: `chrome-settings-level-up-390.png` (settings drawer).
"Level Up to 8" increments `level` (7→8→9 across two clicks) but max HP stayed at 67 and no
hit-die roll or HP prompt appeared. The level number moves; the sheet does not follow it.
Code: `src/components/Settings.tsx:864`. Takes: hook level-up into the vitals recompute and ask for
the hit-die roll — medium.

### Combat / the turn screen

**Turn screen with enforced 2024 action economy** — WORKS WELL. This is the best thing in the app.
Capture: `play-turn-390.png`, `play-turn-1280.png` (PLAY/Combat). Four bands (ACTION / BONUS /
REACTION / MOVEMENT) with live counts; spending a levelled slot correctly closes the other levelled
options for that turn; blocked options render `disabled`; Undo reverses exactly one step.
Code: `src/components/turn/TurnLive.tsx`, `src/components/turn/TurnBands.tsx`,
`src/components/turn/TurnRow.tsx`, `src/components/combat/InlineOptionCard.tsx`; mounted at
`src/App.tsx:202`. Takes: nothing — small.

**Extra Attack tally** — WORKS WELL. Capture: `play-action-1of2-390.png`, `play-action-2of2-390.png`
(PLAY/Combat). "1 of 2 used / 1 attack left / SWING AGAIN" then "2 of 2 used / SPENT".
Code: `src/components/turn/AttackTally.tsx`. Takes: nothing — small.

**Off-turn / reaction mode** — WORKS WELL. Capture: `play-off-turn-390.png` (PLAY/Combat, after
End turn). The screen rewrites itself to "Someone else is acting — your Reaction is the one thing
that is yours right now", and every on-turn option is labelled "It is not your turn".
Code: `src/components/turn/TurnBands.tsx`, `src/components/combat/ReactionsBand.tsx`.
Takes: nothing — small.

**Contention / concentration warnings** — WORKS WELL. Capture: `play-option-card-390.png`
(PLAY/Combat). Concentration competitors are marked "competes", and once Bless is up every rival
spell says "Would drop Bless". Code: `src/components/combat/ContentionBand.tsx`,
`src/components/turn/ContentionNote.tsx`. Takes: nothing — small.

**HP / damage / healing / temp HP tracker** — WORKS WELL. Captures: `play-damage-pad-390.png`,
`play-heal-applied-390.png`, `play-temphp-source-390.png` (PLAY/Combat). Numeric pad with quick
values; temp HP asks which feature granted it; the "temp HP does not stack" rule is surfaced live.
Code: `src/components/HPTracker.tsx:~432-500`; `src/components/combat/TempHPSource.tsx`.
Takes: nothing — small.

**Death saves** — WORKS WELL. Capture: `play-death-saves-390.png` (PLAY/Combat at 0 HP).
Appears automatically at 0 HP with Success / Failure / Reset Death Saves.
Code: `src/components/combat/VitalsBand.tsx`, `src/components/turn/VitalsControls.tsx`.
Takes: nothing — small.

**"Your sheet and the 2024 rules disagree" band + one-tap adopt** — WORKS WELL. Captures:
`play-errata-band-390.png`, `play-rules-flags-open-390.png`, `play-rules-flag-adopted-390.png`
(PLAY/Combat). The header reads "Your sheet and the 2024 rules disagree on 1 thing"; opening it
shows the disagreement side by side — `YOUR SHEET 1st ×4 · 2nd ×3 · 3rd ×2` vs
`2024 RULES 1st ×4 · 2nd ×3` — with the reason ("A level 7 Paladin is a half-caster. Feats, items or
your DM can legitimately change this — the app has no way to know") and the reassurance "Nothing has
been changed." The fix is a single button that **spells the change out on itself**:
"Use the 2024 slots — 1ST ×4 · 2ND ×3 · 3RD ×2 → 1ST ×4 · 2ND ×3". I clicked it; `spellSlots` in
localStorage lost its `"3"` key and the whole band removed itself (`section.ruleflag` count 1 → 0).
This is the app's best single design decision: it never silently overwrites imported numbers, and
the one control it offers cannot be misread. Code: `src/components/combat/SheetRuleFlags.tsx:85-135`;
`src/lib/rules-2024/derive.ts:150-165`. Takes: nothing — small.
**Trap for anyone automating this:** the section is `section.ruleflag`; the adopt button is the
*second* button inside it (the first is the collapse header).

**Rules flags ("6 · 6 unanswered") + per-erratum table rulings** — WORKS WELL, and it ticks down.
Captures: `play-extras-rules-flags-390.png`, `play-errata-band-open-390.png`,
`play-errata-all-answered-390.png` (PLAY/Combat, RULES FLAGS band). Canon flags six places where
Oath of the Hearth does not work as written (HEARTH-03 … HEARTH-08), each with the fault stated in
full and a "▸ what canon says to do about it" expander. Each one carries a three-way
**How your table ruled it** control — `NOT ASKED YET` / `CANON'S FIX` / `MY DM RULED` — and choosing
`MY DM RULED` reveals an "In your DM's words" textarea. I answered all six in turn and watched the
header counter go **6 · 6 unanswered → 6 · 5 → 6 · 4 → 6 · 3 → 6 · 2 → 6 · 1 → 6 · all answered**,
written to `codex-errata-<id>` as `{"HEARTH-03":{"status":"canon","decidedAt":"…"}, …}` and still
reading "6 · all answered" after a full page reload. Nothing is enforced or silently changed — the
band records the ruling, which is the correct behaviour for errata.
Code: `src/components/combat/ErrataBand.tsx:108-165` (`RulingControl`), `:209,227` (the counter),
`:301-343` (the read-only "N more arrive as you level" list), `src/lib/errata-rulings.ts:141`
(`unansweredCount`). Takes: nothing — small.
**Correction:** an earlier pass of this audit filed this as HALF-BUILT ("a to-do list with no way to
tick items off"). That was wrong — I had not scrolled to the `RulingControl` under each row.
**Trap for anyone automating this:** the rulings live behind two collapsed headers (open "Your sheet
and the 2024 rules disagree on N things", then the "N · N unanswered" band) and the controls are
`[role=group][aria-label^="Ruling for "]`; the first choice in each group is the *default*
`NOT ASKED YET`, so clicking index 0 does not decrement the counter.

**"ONE REACTION IS MISSING" → Fighting Style picker → REACTION band updates** — WORKS WELL, and it
closes its own loop. Captures: `play-turn-390.png` (the band), `play-fighting-style-picker-390.png`
(the sheet), `play-fighting-style-picked-390.png` (after) — all PLAY/Combat, REACTION band. The band
refuses to guess ("You chose a Fighting Style at level 2 and this app has never been told which. If
it is Interception, it is a Reaction — and it belongs in this band. Tell it which →"). **The band is
itself a button**: tapping it opens a "PICK YOUR FIGHTING STYLE" sheet listing all **11** styles
(Archery, Blind Fighting, Defense, Dueling, Great Weapon Fighting, Interception, Protection, Thrown
Weapon Fighting, Two-Weapon Fighting, Unarmed Fighting, Blessed Warrior), each with full rules text
and, for the ones that matter to a Paladin, a plain-English judgement ("Defense — the safe default";
"Dueling — +2 on every hit with Extra Attack is +4 a round, every round, forever"; "Interception —
THE HEARTH FIGHTING STYLE"). I picked **Interception**: `feats` went
`["Sentinel","Lucky"]` → `["Sentinel","Lucky","Interception"]` in localStorage, the REACTION band went
**4 ready → 5 ready**, and the gap band **removed itself** (`[data-fighting-style-gap]` count 1 → 0).
Code: `src/components/turn/FightingStyleGap.tsx:64-101` (band + sheet),
`src/components/grimoire/FightingStylePicker.tsx:53-134`, mounted at
`src/components/turn/TurnLive.tsx:393` and `src/components/GrimoirePage.tsx:657`.
Takes: nothing — small.
**Trap for anyone automating this:** the band has no `aria-label`, so its accessible name is the
whole three-paragraph blurb; and the style options are `<button data-style-option="Interception">`
with no role name you would guess. Use the `data-` markers the author deliberately left
(`[data-fighting-style-gap]`, `[data-style-option="…"]`, `[data-fighting-style-picker]`) — the
comment at `FightingStyleGap.tsx:69-70` says they exist for exactly this purpose.

**Damage log / damage tracker** — WORKS WELL. Capture: `play-extras-damage-log-390.png`,
`play-damage-tracker-390.png` (PLAY/Combat). Nested collapsible; records what hit you.
Code: `src/components/DamageTracker.tsx` (727 lines). Takes: nothing — small.

**End combat** — WORKS WELL. Capture: `play-end-combat-confirm-390.png` (PLAY/Combat).
Confirms before discarding round state. Code: `src/components/combat/EndCombatConfirm.tsx`,
`src/components/turn/EndCombatD.tsx` (both have tests). Takes: nothing — small.

**Quick lookup / "Look up" and "Roll" chips on the turn screen** — WORKS WELL. Capture:
`play-turn-390.png` (PLAY/Combat). Code: `src/components/combat/QuickLookup.tsx`.
Takes: nothing — small.

### Grimoire

**Spell + feature catalogue with grouping and preparation rules** — WORKS WELL. Captures:
`play-grimoire-list-390.png`, `play-grimoire-1280.png`, `play-grimoire-the-rules-390.png`
(PLAY/Grimoire). 84 entries (62 spells + 22 features) for Nix, grouped by Level/Source/Turn
cost/Ready, with "2 OF 7 USED / 5 FREE TO PREPARE / 4 GRANTED FREE" accounting that correctly
excludes always-prepared subclass spells, plus the five 2024 preparation rules in plain English.
Code: `src/components/GrimoirePage.tsx`; `src/lib/catalogue/build.ts`, `group.ts`, `detail.ts`;
`src/lib/prepare/toggle.ts`. Takes: nothing — small.

**Spell detail card** — WORKS WELL. Capture: `play-grimoire-spell-detail-390.png` (PLAY/Grimoire).
AT A GLANCE / CONCENTRATION / SLOT / FULL TEXT / CAST WITH A HIGHER SLOT / HOW TO USE IT, written
for a person at a table rather than copied from a stat block.
Code: `src/lib/catalogue/detail.ts`; `src/components/grimoire/CatalogueRow.tsx`.
Takes: nothing — small.

**Slot pips (expend / restore)** — WORKS WELL. Capture: `play-grimoire-list-390.png` (PLAY/Grimoire).
Every pip is a labelled button ("Expend 1st slot", "Restore 2nd slot"), and the state is the same
state the turn screen spends. Code: `src/components/grimoire/LoadoutPanel.tsx`.
Takes: nothing — small.

**Spell / feature editors** — WORKS WELL (by inspection, 577 + 439 lines with their own forms).
Code: `src/components/SpellEditor.tsx`, `src/components/FeatureEditor.tsx`.
Takes: nothing — small.

**Fighting Style picker (Grimoire copy)** — WORKS WELL. The same component is mounted twice, once
here (`src/components/GrimoirePage.tsx:657`) and once inside the combat-tab gap band
(`src/components/turn/TurnLive.tsx:393`) — see "ONE REACTION IS MISSING" above, where I drove it
end-to-end. Code: `src/components/grimoire/FightingStylePicker.tsx`;
`src/lib/prepare/fighting-style.ts`. Takes: nothing — small.

### PREP / Character

**Character page (scores, skills, weapons, equipment, resources, conditions, feats)** — WORKS WELL.
Captures: `prep-character-full-390.png`, `prep-character-1280.png` (PREP/Character). Everything is
editable in place: tap a skill bonus to cycle none→proficient→expertise, tap the name to study it,
edit or add weapons and feats, define spendable pools and table-invented conditions.
Code: `src/components/CharacterPage.tsx` (2185 lines). Takes: nothing — small.

**Character Insight** — WORKS WELL. Capture: `prep-character-character-insight-390.png`
(PREP/Character). Derived read-out: combat profile (melee-focused, best attack +7, top damage
1d10+4), skill clusters with a named Gap, and "Vulnerable saves: Intelligence. Consider Resilient
or ability increases." Code: `src/components/CharacterPage.tsx`. Takes: nothing — small.

**Weapon editor / feat editor** — WORKS WELL. Captures: `prep-character-add-weapon-390.png`,
`prep-character-add-feat-390.png` (PREP/Character). The weapon form knows all the 2024 mastery
properties (Nick, Topple, Vex, Cleave, Push, Slow, Sap, Graze). Code:
`src/components/CharacterPage.tsx`; `src/canon/weapon-mastery.json`. Takes: nothing — small.

**Resource pools and custom conditions** — WORKS WELL. Captures: `prep-character-new-pool-390.png`,
`prep-character-new-condition-390.png` (PREP/Character). A custom condition can actually refuse an
action/bonus/reaction/move at the table ("Anything chosen here really is refused while the
condition is on you") — it is enforced, not a note. Code: `src/components/CharacterPage.tsx`;
`src/components/resources/`. Takes: nothing — small.

**Campaign & World editor** — HALF-BUILT. Capture: `prep-character-campaign-editor-390.png`
(PREP/Character, bottom). The whole section exists — Party Members / Add Party Member, Current
Quest, Notable NPCs, Session Notes, World Details, Campaign Basics — but it reads
"0 in the party · 0 NPCs · 0 sessions recorded" and nothing else in the app writes to it. Nix's
real relationships (Scar, Fate, Selis) live in the Persona model instead, so the party data is
entered twice or not at all. Code: `src/components/CampaignEditor.tsx:415,442,536,647`; mounted at
`src/components/CharacterPage.tsx:2174`. Takes: populate from persona relationships and feed the
Roleplay "The table" panel from the same store — medium.

**Print character record** — UNVERIFIED. It is mounted outside `<Layout>` specifically so `Ctrl+P`
produces a clean sheet, but a print preview cannot be observed headlessly, so I am not claiming it
works. Code: `src/App.tsx:155`; `src/components/print/`. Takes: nothing to build; needs a human to
press Ctrl+P once — small.

### PLAY / Roleplay (the session cockpit)

**Scene setup + AI beat generation** — WORKS WELL. Captures: `play-roleplay-scene-form-390.png`,
`play-roleplay-opening-beat-390.png`, `play-roleplay-give-me-a-beat-390.png` (PLAY/Roleplay).
Five intents (Give me a beat / React / Raise the stakes / Land the moment / Pull someone in), each
returning a card structured as USE IT WHEN / THE MOVE (DO, SAY, ASK) / WHAT IT'S FOR / IF THEY BITE.
The output named Nix's companions and the scene I typed. 7/7 requests returned a usable card.
Code: `src/components/session/AskBar.tsx:60-130`; `src/components/session/BeatCard.tsx`;
`src/lib/rp/engine.ts`; `src/lib/rp/types.ts:19-23`. Takes: nothing — small.

**Offline beat bank** — WORKS WELL, and is the single smartest piece of engineering in the app.
Capture: `play-roleplay-react-390.png` (PLAY/Roleplay). When the model is slow or unreachable the
card is drawn from a hand-written bank of ~557 lines of beats and is labelled honestly:
"Written offline, so this one is not tailored to tonight — but it works. Tap Another to try live
again." I saw this fire once for real, mid-session, with the model running. Code:
`src/lib/rp/bank.ts`; the banner at `src/components/session/BeatCard.tsx:68`; tests at
`src/lib/rp/bank.test.ts` (asserts >=5 beats per intent and that no banked beat mentions a
specific campaign). Takes: nothing — small.

**Perform / Impulse / Recall / Engage panels** — WORKS WELL. Captures:
`play-roleplay-perform-390.png`, `-impulse-`, `-recall-`, `-engage-` (PLAY/Roleplay). 13 / 8 / 28 /
19 items, all generated from Nix's actual traits and relationships (e.g. "Bring up Scar — what do
they mean to you now?", "*Your hands move instinctively, remembering Selis and the Pendant*"),
filterable by All/Combat/Social/Discovery/Emotional and by ASK/OBSERVE/CONNECT/OFFER/MUSE.
Code: `src/components/session/PerformPanel.tsx`, `ImpulseEngine.tsx`, `EngageCard.tsx`.
Takes: nothing — small.

**"The table" / party strip → Aim a beat → spotlight clock** — WORKS WELL. Captures:
`play-roleplay-cockpit-390.png`, `play-roleplay-table-add-player-390.png`,
`play-roleplay-aim-a-beat-390.png` (PLAY/Roleplay). I typed "Brenna" into **Add a player**, clicked
**Add player**, and she appeared as "Brenna — not yet tonight" with a **Aim a beat** button and a
NOT YET TONIGHT badge, written to `codex-rp-table-<id>` alongside the scene and mood. **Aim a beat**
generated, in 13.2 s, a beat explicitly aimed at her and at the scene I had typed — "Brenna seems a
little withdrawn, and you want to draw her into the immediate tension of Scar watching the door" —
with a physical move, a line of dialogue, a follow-up, tone chips (Wider — Mystery / Warmer —
Connection / Darker — Threat), an out if it lands flat, and an "aim at the whole table instead"
escape. After I then clicked **I played it**, her row flipped to "Brenna — just now / JUST NOW" and
her record became `lastSpotlightAt: <ts>, beatsAimed: 1`. The whole "who has been quiet longest"
mechanic is real and closes.
Code: `src/components/session/TableCard.tsx:84-185`; `src/lib/rp/table.ts:72-131`
(`markSpotlight`, `quietFor`, `nextToAim`, `quietLabel`);
`src/components/session/RoleplayEngine.tsx:105-118`. Takes: nothing — small.
*The one real gap here is duplication, not brokenness:* this is a second party list — the Campaign
editor has its own "Add Party Member" (`src/components/CampaignEditor.tsx:415`) and the persona
relationships are a third — and nothing joins them. Takes: pick one store — medium.
**Correction:** an earlier pass filed this HALF-BUILT. That was wrong; I had not started a scene, so
the table card was not mounted yet.

**Session Timeline / End Session** — WORKS WELL. Captures: `play-roleplay-i-played-it-390.png`,
`play-roleplay-timeline-1-moment-390.png`, `play-roleplay-end-session-result-390.png`
(PLAY/Roleplay). **The timeline is fed by the "I played it" button on the beat card, not by
generating a beat** — which is the correct design (an unplayed beat is not a moment). I clicked
**I played it** and the timeline went "0 moments" → **"1 moment"** with a type breakdown
("react · 100%"), the moment's own text ("Brenna — Reach across the t…") and a relative timestamp
("now"). Three played beats gave "3 moments". **End Session** then cleared it back to "0 moments /
Your RP timeline builds as you play" and the log persisted to `codex-session-log-<id>`.
Code: `src/components/session/BeatCard.tsx:130-145` (the button),
`src/components/session/RoleplayEngine.tsx:111-129` (`played` → `onMomentLogged`);
`src/components/session/SessionTimeline.tsx`; `src/lib/session-log.ts`. Takes: nothing to make it
work — but End Session *discards* rather than *recaps*, so a session's moments are gone the moment
you end it; a written recap is the obvious next thing — medium.
**Correction:** an earlier pass filed both of these HALF-BUILT on the evidence that the counter
stayed at 0 after five generated beats and End Session "did nothing". Both observations were true
and both conclusions were wrong: I had never pressed **I played it**, so there was nothing to count
and nothing to end.

### PREP / Persona

**Persona Engine (traits, wants, fears, pressure response, relationships, decision tree)** —
WORKS WELL. Captures: `prep-persona-top-390.png`, `prep-persona-1280.png` (PREP/Persona).
Every entry is individually removable and addable; Nix's five relationships carry real prose.
Code: `src/components/PersonaEngine.tsx`; `src/components/IdentityPage.tsx:111`;
`src/lib/character.ts:164-177` (the persona shape). Takes: nothing — small.

**AI Suggest Traits / AI Suggest (combat)** — WORKS WELL. Captures: `prep-persona-ai-traits-390.png`,
`prep-persona-ai-dialogue-390.png` (PREP/Persona). Appended five new traits and three new combat
lines, both in character and both referencing Nix's actual backstory (Selis, the Vä dialect).
Code: `src/components/PersonaEngine.tsx`; `src/components/DialogueBank.tsx`.
Takes: nothing — small.

**Dialogue Bank (Library / Practice / Quick-Draw / Rehearsal / Warmup / Journal)** — WORKS WELL.
Captures: `prep-persona-library-390.png`, `-practice-`, `-quick-draw-`, `-rehearsal-`, `-warmup-`,
`-journal-` (PREP/Persona). 13 lines across Combat/Social/Discovery/Emotional/Quiet, a tap-to-copy
quick access strip, a three-level rehearsal ladder (Guided/Solo/Improv), a five-step pre-session
warmup, and a journal with usage stats, streaks and eight badges.
Code: `src/components/DialogueBank.tsx` (2334 lines — the largest component in the app).
Takes: nothing — small.

**Scene Responses** — HALF-BUILT: the editor works, the bank ships empty and has no generator.
Captures: `prep-persona-top-390.png`, `prep-persona-scene-response-added-390.png` (PREP/Persona).
Eight situation categories (Betrayal, Victory, Loss, Discovery, Confrontation, Mercy, Fear, Joy),
every one reading "0 responses" against a "Banked 0" header. **The manual path works**: I expanded
Betrayal, typed into "How does Nix react to betrayal?", clicked **Add a betrayal response**, and the
row went to "1 response" with the quoted line and a "Last edited" stamp, persisted as
`sceneResponses: [{"situation":"Betrayal","responses":["…"]}]`. Rows also have Edit / Remove.
The gap is that **this is the only bank in the app with no AI suggest and no seeded content** — the
Dialogue Bank sitting directly above it has 13 lines and an AI Suggest button, Story has 27, the
Toybox has 23 combos and 18 tactics. So the feature reads as broken when it is merely unfilled, and
nothing in the UI invites you to fill it. Code: `src/components/SceneResponseBank.tsx:28,63-78`
(categories), `:152` (expand), `:293-299` (`Add a {situation} response`), `:216-250` (edit/remove).
Takes: add an AI-suggest per situation reusing the dialogue-bank prompt, or seed a few from the
backstory — small.

**Backstory Builder** — WORKS WELL (structure verified; AI generate not individually timed).
Capture: `prep-persona-story-390.png` (PREP/Persona). Origin, 8 Key Memories, 10 Unresolved
Threads, 10 Personality Seeds, plus **AI Generate Backstory**.
Code: `src/components/BackstoryBuilder.tsx` (880 lines). Takes: nothing — small.

**Accent library (Persona → Voice)** — WORKS WELL as a reference. Capture:
`prep-persona-voice-390.png` (PREP/Persona). Seven-plus accents, each with 6 rules, a named anchor
sound and a character-note. Code: `src/components/AccentCoach.tsx`;
`src/components/accent-forge/AccentLibrary.tsx`. Takes: nothing — small.

**Accent recording / self-assessment** — UNVERIFIABLE HERE. The component guards on
`navigator.mediaDevices.getUserMedia` and `MediaRecorder`; headless Chromium has no audio input, so
I did not exercise it and I am not guessing whether it works.
Code: `src/components/AccentCoach.tsx:48-49,84,177-179`.
Takes: a human with a microphone to confirm — small.

### PREP / Academy

**Academy shell + XP/level tracking** — HALF-BUILT, but for a narrower and much more fixable reason
than I first recorded. Captures: `prep-academy-top-390.png`, `prep-academy-quiz-answered-390.png`,
`prep-academy-quiz-xp-awarded-390.png` (PREP/Academy). Three tabs (Training / Quizzes / Accent) and a
progress header reading "Level 1 · 0 XP / 100 XP · Best: 0 · 0 sessions".

**Quizzes do award XP and I watched it happen.** Answering a generated question *correctly* took the
header from **0 XP → 10 XP**, set the streak to "1 · Best: 1", created `codex-training-<id>`, and
populated ACCURACY BY CATEGORY ("Spells 100%"). Answering *incorrectly* correctly awards nothing but
still records the attempt and resets the streak (`src/lib/training.ts:185-189`).

**The real gap: only quizzes are wired.** `AcademyPage` passes exactly one recorder —
`onQuizAnswer={recordQuiz}` (`src/components/AcademyPage.tsx:119`) — to `QuizArena`. The Training tab
renders `<RoleplayCoach character={character} />` (`:112`) with **no** recorder prop at all. And
`recordDrill`, `recordOneShot`, `recordConversation` and `awardDrillXP` all exist, are exported from
`src/lib/training.ts:206,396,425` and are unit-tested — but have **zero** callers anywhere under
`src/components/`. So improv drills, the interactive one-shot and the conversation drill award
nothing, while the progress bar underneath them reads "Complete quizzes **and drills** to earn XP and
track progress". The bar promises a loop that only half exists.
Code: `src/components/AcademyPage.tsx:17,45-57,106-133`; `src/components/TrainingProgress.tsx`;
`src/hooks/useTraining.ts:47-62,140-141` (the hook already exposes `recordDrill` — `AcademyPage` just
never destructures it). Takes: pass the existing `recordDrill` / `recordOneShot` down into
`RoleplayCoach` and call them where each drill finishes — small.
**Correction:** an earlier pass said "I never saw XP move". That was true but misleading — I had
answered the question wrong, which is supposed to award nothing.

**Roleplay Coach — Scene Coach (Generate Scene → respond → coached)** — WORKS WELL. Capture:
`prep-academy-scene-coach-390.png` (PREP/Academy → Training). Generated a fully realised scene with
named NPCs in 12.1 s. Code: `src/components/RoleplayCoach.tsx:374-388`. Takes: nothing — small.

**Roleplay Coach — Persona Quick Reference (Study / In-Session)** — BROKEN for imported characters.
Capture: `prep-academy-top-390.png` (PREP/Academy → Training). The panel renders the headings
"PHYSICAL TICS" and "SCENE INSTINCTS" with nothing under them, because it reads
`persona.physicalTics` / `persona.sceneInstincts` / `persona.quietTexture` while the Persona screen
writes `colorTraits` / `coreTraits`. Nix's own saved file has `colorTraits: 2, coreTraits: 2` and
`physicalTics: 0, sceneInstincts: 0, quietTexture: 0`, so these panels are permanently empty for
the owner's real character. The seed's persona has these exact keys: `defaultState, decisionTree,
physicalTics, sceneInstincts, quietTexture, patron, colorTraits, coreTraits, wants, fears,
pressureResponse, lastEditedAt, dialogueBank, relationships` — the three dead ones are *present and
empty*, which is why nothing warns. `catchphrases` is absent entirely and `patron` is
`{name:"", domains:[], symbol:"", rpNotes:""}`.

**This is one bug with four consumers, not two.** Readers of the dead fields:
`src/components/AcademyPage.tsx:61-63` (flashcard seeding), `src/components/SpacedFlashcards.tsx:47`,
`src/components/RoleplayCoach.tsx:85,307`, and **`src/components/CombatHelper.tsx:544,550`** (the
Combat Advisor's own persona panel — a PLAY-tab screen, not just a PREP one). The only writer is
`src/components/PersonaEngine.tsx:193-202,263-270`, which writes `colorTraits`/`coreTraits`
exclusively; `PersonaEngine.tsx:35` even initialises `physicalTics: []` and then never appends to it.
`src/lib/character.ts:805-825` carries a comment naming this exact class of failure as a past
two-screen outage.
Takes: read both shapes at the four read sites, or migrate on import — small.

**Spaced flashcards** — BROKEN, same root cause. Capture: `prep-academy-flashcards-390.png`
(PREP/Academy → Quizzes). Shows "Add persona traits (physical tics, scene instincts, quiet texture)
to Nix to generate flashcards" even though Nix has a full persona — because it reads the same three
dead fields. Code: `src/components/SpacedFlashcards.tsx:40,47-70,151`;
`src/components/AcademyPage.tsx:61-63`. Takes: same one-line fix as above — small.

**Quiz Arena** — WORKS WELL. Capture: `prep-academy-quiz-question-390.png` (PREP/Academy → Quizzes).
Five modes (Spell Knowledge / Combat Tactics / Rules Mastery / Class Features / Dice Rolls);
**Generate Question** produced a genuinely correct Bless question using Nix's own spell list.
Code: `src/components/QuizArena.tsx`. Takes: nothing — small.

**Condition Drill** — WORKS WELL. Capture: `prep-academy-condition-drill-390.png`
(PREP/Academy → Quizzes). Built a Faerie Fire scenario from Nix's actual spells and asked a
four-option condition question. Code: `src/components/ConditionDrill.tsx`;
`src/canon/conditions.json`. Takes: nothing — small.

**Improv Drills (Apprentice / Journeyman / Master)** — WORKS WELL. Capture:
`prep-academy-improv-drill-390.png` (PREP/Academy → Training). Generated a moral-dilemma scene,
then asked "What does your character SAY? / What does your character DO?" with a **Grade Me**
button. Code: `src/components/ImprovDrillEnhanced.tsx`. Takes: nothing — small.
(Speech input is guarded behind `window.SpeechRecognition` — `ImprovDrillEnhanced.tsx:78-129` —
and was not exercised, no microphone.)

**Conversation Drill** — WORKS WELL. Capture: `prep-academy-conversation-390.png`
(PREP/Academy → Training). Seven NPC archetypes; picking Tavern Keeper and clicking
**Start Conversation** produced a named NPC with a bio and an opening line, "Exchange 1 of 10".
Code: `src/components/ConversationDrill.tsx`. Takes: nothing — small.

**Interactive One-Shot** — WORKS WELL. Capture: `prep-academy-oneshot-390.png`
(PREP/Academy → Training). Ten-turn branching adventure with three numbered choices plus
"Do Something Else", XP awarded on characterisation. Code:
`src/components/InteractiveOneShot.tsx`. Takes: nothing — small.
(Note: the button reads "Start One-Shot Adventure" but only opens the panel; the actual start is a
second button, **Begin One-Shot**. Minor.)

**Accent Forge (Library / Rapid / Forge / Train)** — HALF-BUILT. Capture:
`prep-academy-accent-390.png` (PREP/Academy → Accent). The Library tab is rich (accents tagged
Fantasy/Real-World, Beginner/Advanced, with anchor sounds). Rapid/Forge/Train exist as tabs but
their value depends on the microphone path I could not exercise.
Code: `src/components/accent-forge/AccentForge.tsx:187`, `AccentDetailView.tsx` (1176 lines),
`DMRapidMode.tsx`, `VoiceForge.tsx`, `AccentTraining.tsx`.
Takes: a human with a microphone to say whether the loop closes — medium.

### The Toybox

**Toybox: Combos / Tactics / Persona** — WORKS WELL, and is startlingly good. Captures:
`chrome-toybox-combos-390.png`, `chrome-toybox-tactics-390.png`, `chrome-toybox-persona-390.png`,
`chrome-toybox-combo-open-390.png` (any route, floating button). 23 named turn-combos
("Hearth Wall", "The Sentinel Gate", "One Silver Piece of Fire") each with numbered steps, a
"when to use this" sentence, positioning advice naming Nix's actual party members, and a
"Heads up" caveat; 18 tactics graded CRITICAL/HIGH/NORMAL including blunt ones like
"Your Doctrine's Best Trick Does Not Work" and "Five Prepared Spells You Are Not Using"; and
10 social plays with the roll each one needs. Every combo has Deploy / Edit / Delete.
Code: `src/components/ToyboxPanel.tsx` (1659 lines); `src/components/toybox/ComboCard.tsx`,
`TacticDiagram.tsx`, `DeployView.tsx`; `src/lib/toybox.ts` (+ `toybox.test.ts`).
Takes: nothing — small. One cosmetic defect: React logs
`validateDOMNesting: <button> cannot appear as a descendant of <button>` from
`src/components/toybox/ComboCard.tsx:158` on every open — small.

**Toybox "Suggest" (AI) + Add-to-library** — WORKS WELL. Captures:
`chrome-toybox-ai-suggest-combos-390.png`, `chrome-toybox-ai-suggest-tactics-390.png`,
`chrome-toybox-ai-suggest-persona-390.png` (any route, floating Toybox button). "Suggest" is **not**
a tab — it is a header action that generates suggestions *for whichever tab is open*, each rendered
as a card with an **Add** button that writes it into the library, plus **Dismiss**. All three
branches returned usable, character-specific results: Combos → "Hearthfire Burst / Protective Warmth
/ Warding Assault" (25.7 s); Tactics → four `When:`-gated plays including "Cornered — Low HP
Protocol" (25.7 s); Persona → "The Guilt-Driven Helper — when offering assistance, especially to
those who remind him of Selis" (16.6 s), which is drawn from Nix's own backstory.
Code: `src/components/ToyboxPanel.tsx:497-522` (`handleAISuggest`, three prompt branches),
`:524-578` (`adoptComboSuggestion` / `adoptTacticSuggestion` / `adoptPersonaSuggestion`),
`:663-676` (the button). Takes: nothing — small.
**Trap for anyone automating this:** the visible text is "Suggest" but `aria-label="AI Suggest"`
(`:668`), so `getByRole('button', { name: 'Suggest' })` does not find it. An earlier probe of mine
reported this feature MISSING for exactly that reason; it is not missing.

### Global chrome

**Dice roller / Roll Capture** — WORKS WELL. Captures: `chrome-dice-roller-390.png`,
`chrome-dice-logged-390.png` (any route). It does not roll for you — it captures the number your
real die showed, which is the correct design for a table companion. Quick Set d20/1d8/2d6,
character presets (Attacks / Saving Throws / Damage), die type, count, modifier, Normal/Advantage/
Disadvantage, and a Recent Rolls log. Code: `src/components/RollCapture.tsx` (1124 lines,
22 tests in `RollCapture.test.tsx`); mounted at `src/components/Layout.tsx:521`.
Takes: nothing — small.

**Mechanics reference drawer** — WORKS WELL. Capture: `chrome-mechanics-search-390.png`
(any route). ~25 plain-English rule cards, filterable by category and searchable.
Code: `src/components/MechanicsDrawer.tsx`; mounted at `src/components/Layout.tsx:532`.
Takes: nothing — small.

**Table Covenant (Lines & Veils safety tool)** — WORKS WELL, and it keeps its privacy promise.
Captures: `chrome-settings-390.png`, `chrome-table-covenant-added-390.png` (any route, settings
drawer). Starts at "Nothing written down yet" under the framing "Agreed once, changed any time."
I typed "No harm to animals on screen", left the kind selector on **Line — never happens**, pressed
add, and it appeared tagged "Line"; I then selected **Veil — happens off-screen**, typed "Torture"
and added that, and it appeared tagged "Veil". Both persisted to `codex-covenant` as
`{"entries":[{"id":…,"kind":"line","text":…},{"id":…,"kind":"veil","text":…}],"note":"","updatedAt":…}`.
Entries can be toggled line↔veil and removed individually, and there is a free-text
"Anything else the table should know" note. The screen claims "Saved on this device only. Never
exported, never sent anywhere, never shown to the advisor" — **I checked, and it is true**: after
adding both entries, `codex-character-<id>` contained no match for /covenant/i, so the covenant is
genuinely absent from the character export.
Code: `src/components/safety/TableCovenant.tsx:43-48,66-69,87-180`; `src/lib/covenant.ts:43`
(`COVENANT_KEY = 'codex-covenant'`), `:116,137-140`. Takes: nothing — small.
*One unverified claim in its own copy:* "The Veil button in the corner of every screen works whether
or not anything is written here." I found no button named Veil outside this panel at 390 px. Either
it is desktop-only or the sentence is stale — worth one look. Takes: small.
**Trap for anyone automating this:** the "Line — never happens" / "Veil — happens off-screen"
buttons only set the *kind*; the control that actually adds is icon-only (a `<Plus>`) with
`aria-label="Add to the covenant"` (`TableCovenant.tsx:172`), and the text field is an
`aria-label`led input, not a placeholder — `getByPlaceholder(/A new line or veil/)` fails,
`getByRole('textbox', { name: /A new line or veil/ })` works.

**PWA / offline install** — UNVERIFIED BY DESIGN. There is a hand-written service worker with a
build-ID precache of `dist/assets/*` and `public/marks/*.svg` (deliberately excluding the 88 MB of
backgrounds), plus a `codex-sw-off` kill switch. I disabled it in every context per the brief, so I
did not test offline install. Code: `vite.config.ts:32-100`; `src/pwa/sw.js`.
Takes: one production build and an airplane-mode test — small.

### Character creation

**Create a character from scratch** — BROKEN. Captures: `setup-create-step0-390.png` …
`setup-create-s11-390.png`, `setup-create-forge-390.png`, `setup-forge-fail-390.png`
(welcome route). `play-turn-wizard-390.png` is the FAILED screen — it is evidence of this defect,
not a working feature.

The wizard walks 12 steps and collects name, class, subclass, species, level and an AI provider,
then the final **Forge Character** button hands the whole job to a language model:
`forgeCharacter` blocks on `queryStructured<AICharacterResponse>(SYSTEM_PROMPTS.characterSetup, …)`
and takes `spellSlots`, `spells` and `features` from the reply. There is no non-AI path.

Three separate failures, all reproduced:
1. With no provider key at all it hangs and then shows "Ollama did not answer in time. Combat is
   unaffected — check the address in Settings." After 40 s `codex-active-id` was still NONE —
   nothing was saved. (`setup-forge-fail-390.png`)
2. **Test Connection** reported "Connection successful — ready to forge" and the very next action
   failed. It is a false positive. (`setup-ai-test-fail-390.png`)
3. Even when it does return, the wizard hardcodes `abilityScores` to all 10s and leaves
   `weapons: []`, `feats: []`, `skillProficiencies: []`. The file says so itself: *"Wart, logged not
   fixed: step 6 still asks a Paladin for a number it will ignore, and the wizard sets every
   ability score to 10, so the computed DC is a placeholder until he edits his scores in Prep.
   Fixing the wizard is not in this phase."*

Code: `src/components/CharacterSetup.tsx:352-470` (`forgeCharacter`), the wart comment in the same
function; `src/lib/ai.ts:129-134` (`idleMs: 30_000`).
Takes: add a deterministic, offline "build from canon" path that fills slots/features from the
progression tables and only uses the model for flavour — **large** (this is the single most
important gap in the product).

**Provider choice in the wizard** — HALF-BUILT. Capture: `setup-create-s11-390.png` (welcome route).
Step 11 offers only "Gemini (Free)" and "Ollama (Local)" although OpenRouter is a first-class
provider everywhere else, with its own model picker.
Code: `src/lib/ai.ts:48`; `src/components/OpenRouterModelPicker.tsx`;
`src/components/CharacterSetup.tsx`. Takes: add the third radio — small.

### Non-Paladin support

**Any class other than Paladin** — PROMISED-BUT-MISSING. Capture: `setup-create-s2-390.png`
(welcome route) shows all twelve classes in the dropdown, and `src/lib/dnd-data.ts:4-29` lists
twelve classes with four-plus subclasses each. But:

- `PROGRESSION_BY_CLASS` contains exactly one key, `Paladin` — `src/canon/index.ts:82-88`.
- `src/canon/` holds `paladin-progression.json`, `oath-of-the-hearth.json`, `smite-rules.json` and
  `character-marcus.json`; a grep for `"Wizard"`, `"Rogue"`, `"Cleric"`, `"Barbarian"`, `"Bard"`,
  `"Druid"`, `"Monk"`, `"Ranger"`, `"Sorcerer"`, `"Warlock"`, `"Fighter"` across every file in
  `src/canon/*.json` returns **zero** hits; `"Paladin"` returns 3.
- `src/canon/spells.json` is 71 spells. `Magic Missile`, `Eldritch Blast`, `Sneak Attack` and
  `Rage` are all absent; `Fireball` is present only because Oath of the Hearth grants it.
- `derive.ts` is honest about it: *"Paladin has a table; Cleric and Wizard do not, yet."*
  (`src/lib/rules-2024/derive.ts:160`) and the storage tests say the stored table is right
  *"for Paladin and for nothing else"* (`src/lib/rules-2024/storable.test.ts:219`).

Spell-slot maths IS general (`src/lib/rules-2024/vitals.ts:161-162` covers full casters, and
`vitals.test.ts:219-232` asserts all 13 classes) and Extra Attack is class-aware
(`src/lib/rules-2024/attacks.ts:40`). So the *engine* generalises; the *content* does not.
I could not prove this in the browser because the create wizard never completed for a Wizard —
`play-turn-wizard-390.png` is that failure.
Takes: author a progression table + feature set per class (12 × the Paladin effort) —
**large**. Realistically this app is a one-character app and should probably say so.

---

## Language-model dependency (item 6)

**Which screens use it.** 27 source files import `src/lib/ai.ts` or `src/hooks/useAI.ts`:

AccentCoach, accent-forge/{AccentDetailView, AccentTraining, AIScenePartner, VoiceForgePreview},
BackstoryBuilder, **CharacterSetup**, CombatHelper, ConditionDrill, ConversationDrill, DialogueBank,
GeminiModelPicker, ImprovDrillEnhanced, InteractiveOneShot, OpenRouterModelPicker, PersonaEngine,
QuizArena, RoleplayCoach, session/{AIAssistPanel, EngageCard, ImpulseEngine, PerformPanel,
RoleplayEngine}, Settings, ToyboxPanel, hooks/useAI.ts, plus `src/lib/rp/engine.ts`.

By route: PLAY/Combat (Combat Advisor), PLAY/Roleplay (every beat), PREP/Persona (trait suggest,
dialogue suggest, backstory generate), PREP/Academy (scene coach, quiz, condition drill, improv,
conversation, one-shot, accent scene partner), Settings (model pickers, Test Connection), and the
character-create wizard.

**Providers wired.** Three: `'gemini' | 'ollama' | 'openrouter'` (`src/lib/ai.ts:48`). Defaults:
Ollama at `http://localhost:11434`, model `gemma3-27b-abliterated:latest`, `fallbackEnabled: true`
(`src/lib/ai.ts:381-393`). Config in `localStorage['codex-ai-config']` (`ai.ts:379`), model lists
cached in `codex-ai-models` (`ai.ts:969`). Dev-server proxy `/ollama → localhost:11434`
(`vite.config.ts:141-147`). Timeouts: connect 8 s (30 s for Ollama), idle 30 s, retry cap 20 s
(`ai.ts:129-134`); fallback budget 20 s (`ai.ts:166`); temperature 0.3 structured / 0.9 prose
(`ai.ts:191`). The settings drawer offers Gemini and OpenRouter as ordered fallbacks behind Ollama
and explains why ("two free tiers do not run out at the same moment" — `ai.ts:50-52`).

**Does it work with no network.** Partly, and the app is honest about which parts.
- I set `context.setOffline(true)` and asked the Combat Advisor a question. In **1.07 s** it showed
  **"Could not reach Ollama. Failed to fetch"** — a clean, named, fast failure, not a hang.
  (`play-combat-advisor-offline-390.png`, PLAY/Combat)
- The **Roleplay beats degrade gracefully** rather than failing: they fall back to a hand-written
  offline bank and label the card "Written offline, so this one is not tailored to tonight — but it
  works." (`src/lib/rp/bank.ts`, banner at `src/components/session/BeatCard.tsx:68`.) I saw this
  happen live.
- Everything else AI-driven — Combat Advisor, Persona suggest, Backstory generate, all six Academy
  generators, and **character creation** — simply cannot run without a model.
- The non-AI 80% of the app (turn screen, HP, Grimoire, Toybox, Character page, dice, mechanics
  reference, persona editing) has no network dependency at all.

**How often it returns a usable result.** Measured against the owner's own local
`gemma3-27b-abliterated:latest`, no API keys, no fallback:

| Surface | Trials | Usable | Latency |
|---|---|---|---|
| Combat Advisor (PLAY/Combat) | 3 | 3 | 1.1 s, 3.2 s, 6.2 s to first text; ~15 s to complete |
| Roleplay beats (5 intents + opening) | 6 | 6 | 7.1 / 15.6 / 16.6 / 15.6 / 12.2 / 11.4 s |
| Persona AI Suggest Traits | 1 | 1 | 10.6 s |
| Persona AI Suggest (combat) | 1 | 1 | 6.0 s |
| Academy Generate Scene | 1 | 1 | 12.1 s |
| Academy Generate Question | 1 | 1 | 12.1 s |
| Academy Start Drill (improv) | 1 | 1 | 9.1 s |
| Academy Condition Drill | 1 | 1 | 9.0 s |
| Academy Begin One-Shot | 1 | 1 | 12.1 s |
| Academy Conversation (Tavern Keeper) | 1 | 1 | 9.1 s |
| Toybox AI Suggest — Combos | 1 | 1 | 25.7 s |
| Toybox AI Suggest — Tactics | 1 | 1 | 25.7 s |
| Toybox AI Suggest — Persona | 1 | 1 | 16.6 s |
| Roleplay "Aim a beat" at a named player | 1 | 1 | 13.2 s |
| **Total (excluding character creation)** | **21** | **21** | 6–26 s |
| **Character creation (Forge Character)** | **2** | **0** | timed out past `idleMs: 30 s`, saved nothing |

So: **21 of 21 in-app AI features returned a usable, in-character, character-aware result. The one
that failed, twice, is the one that gates every new user.**

One accuracy caveat worth the owner's attention: in Combat Advisor trial 3 the model said
"Burning Hands … Roll 2d6 + your spell attack bonus (+6)". Burning Hands is a DEX save, not an
attack roll. The advisor's output is not rule-checked against the canon the rest of the app uses —
the Grimoire card for the same spell is correct. (`play-combat-advisor-answer-390.png`.)

---

## Health of the codebase

`npx vitest run`: **107 test files, 2093 passed, 7 skipped, 0 failed, 13.4 s.** The tests are
unusually good — they assert behaviour and intent, not snapshots (e.g. `bank.test.ts` asserts no
banked beat names a specific campaign; `derive.test.ts:186` warns that a naive change "would
silently zero every Cleric, Druid and Wizard").

### Warning for whoever automates against this list: 39 buttons whose label you can see is not the label you can query

`aria-label` **replaces** the visible text in the accessible name. This app sets an `aria-label`
that differs from the button's own text in **39** places, so `getByRole('button', { name: <what the
user sees> })` silently finds nothing. This is not a theoretical hazard — it cost me two wrong
verdicts in this very audit: I first filed "Log it" and the Toybox "Suggest" feature as MISSING,
and both are fully working. Sweep script: `.codex-owner/notes/_probe/p36-arialabels.mjs`.

The ones most likely to bite a test author:

| Visible text | Must be queried as | Code |
|---|---|---|
| Play / Prep | `Switch to session mode` / `Switch to prep mode` | `src/components/Layout.tsx:170,191` |
| Damage / Heal / Temp HP | `Apply damage` / `Apply healing` / `Set temporary hit points` | `src/components/HPTracker.tsx:432,443,454` |
| Roll | `Open dice roller` | `src/components/turn/TurnRail.tsx:101` |
| Reset | `Reset action economy` | `src/components/turn/TurnRail.tsx:111` |
| Log it | `Write this roll down` | `src/components/RollCapture.tsx:395` |
| Suggest | `AI Suggest` | `src/components/ToyboxPanel.tsx:668` |
| End combat (in the confirm) | `End combat — confirm` (em dash) | `src/components/turn/EndCombatD.tsx:67`, `src/components/combat/EndCombatConfirm.tsx:70` |
| Keep going | `Keep fighting` | `src/components/turn/EndCombatD.tsx:60` |
| Deploy / Edit / Delete | `Deploy combo` / `Edit combo` / `Delete combo` | `src/components/toybox/ComboCard.tsx:258,268,279` |
| Edit / Delete (tactics) | `Edit tactic` / `Delete tactic` | `src/components/toybox/TacticCard.tsx:192,203` |
| Regenerate / Retry | `Regenerate dialogue lines` / `Retry dialogue generation` | `src/components/accent-forge/VoiceForgePreview.tsx:237,284` |
| Reset (quiz) | `Reset score` | `src/components/QuizArena.tsx:311` |
| Reset (drill) | `Reset drill scores` | `src/components/ImprovDrillEnhanced.tsx:296` |
| − / + (level) | `Decrease level` / `Increase level` | `src/components/CharacterSetup.tsx:638,649` |
| (icon only, a `+`) | `Add to the covenant` | `src/components/safety/TableCovenant.tsx:172` |

Two more shapes of the same hazard, both of which also cost me a wrong verdict:
- **`aria-label` on inputs instead of `placeholder`.** The covenant's text field is
  `<Input aria-label="A new line or veil" placeholder="Harm to children">`
  (`src/components/safety/TableCovenant.tsx:160-165`), so `getByPlaceholder(/A new line or veil/)`
  finds nothing while `getByRole('textbox', { name: /A new line or veil/ })` works.
- **Elements with no accessible name at all, but a deliberate `data-` marker.** The
  "ONE REACTION IS MISSING" band's accessible name is its entire three-paragraph body. The author
  left `data-` hooks for exactly this and says so in a comment
  (`src/components/turn/FightingStyleGap.tsx:69-70`): use `[data-fighting-style-gap]`,
  `[data-style-option="…"]`, `[data-fighting-style-picker]`, and `section.ruleflag`.

Takes: either drop the redundant `aria-label`s where the visible text already says the same thing,
or standardise on querying by `aria-label` in every test — small, but do it before writing the
checks, not after.

Two console warnings observed at runtime, both cosmetic:
- `validateDOMNesting: <button> cannot appear as a descendant of <button>` —
  `src/components/toybox/ComboCard.tsx:158`, fires on every Toybox open.
- `useLayoutEffect does nothing on the server` from `src/components/TurnDeck.tsx:36` — SSR-only,
  test environment.

---

## PROMISED-BUT-MISSING (from the owner's own planning documents)

Rule for this section: a promise only lands here if (a) I can quote the promising document at a
line I read, and (b) I ran a grep that proves the thing is absent from `src/` or unreachable in the
running app. Where the promising document itself already says "unbuilt", I say so rather than
pretending I discovered it. Statements the docs make that turned out to be *true* are not listed.

### A. Accent Forge — Phases 4 and 5 were specified file-by-file and never written

`ACCENT-FORGE-ROADMAP.md` lays out an exact file manifest. Four of its twelve components and three
of its five libraries do not exist. `ls src/components/accent-forge/` returns eight `.tsx` files;
`AccentDrill.tsx`, `VoiceAnalyzer.tsx`, `PerformanceScience.tsx` and `AccentProgressBar.tsx` are
not among them.

**Science tab / performance-science reference browser** — PROMISED-BUT-MISSING. Promised at
`ACCENT-FORGE-ROADMAP.md:104` ("Segmented control: [Library] [Rapid] [Forge] [Train] [Science]") and
`:110`, `:137`, `:414`. The shipped segmented control has four tabs, not five:
`src/components/accent-forge/AccentForge.tsx:26` declares
`type TabId = 'library' | 'rapid' | 'forge' | 'train'`. Verified-absent-by: `grep -rn
"PerformanceScience" src/` → 0 matches. Takes: a content authoring job (prosody, phonology, vowel
space, sociolects) plus one tab — **large**, and mostly writing rather than code.

**Voice analysis (pitch / volume / pacing)** — PROMISED-BUT-MISSING. Promised at
`ACCENT-FORGE-ROADMAP.md:118` (`src/lib/voice-analysis.ts -- NEW: Web Audio API wrapper for
pitch/volume/pacing`), `:135`, `:389-408`, `:433-436`. Verified-absent-by: `grep -rn
"VoiceAnalyzer\|voice-analysis" src/` → 0 matches; `src/lib/` contains `voice-forge.ts` but no
`voice-analysis.ts`. Note this is the one Accent Forge gap that is *not* only labour: it needs a
microphone, which is also why I could not exercise the existing `AccentCoach` recorder here.
Takes: Web Audio capture + an analyser node + a canvas — **medium**.

**Individual drill execution (`AccentDrill.tsx`)** — PROMISED-BUT-MISSING. Promised at
`ACCENT-FORGE-ROADMAP.md:134` ("Individual drill execution (phrase practice, recording, analysis)")
and `:315`, `:346`. Verified-absent-by: `grep -rn "AccentDrill" src/` → 0 matches;
`src/lib/accent-drills.ts` promised at `:117` and `:343` is likewise absent. `AccentTraining.tsx`
(598 lines) ships as the Train tab, but the per-drill runner beneath it was never built — which is
why the Train tab reads as a menu in `prep-academy-accent-390.png`.

**Accent progression: mastery ranks, streaks, achievements** — PROMISED-BUT-MISSING. Promised at
`ACCENT-FORGE-ROADMAP.md:120` (`accent-progression.ts -- NEW: XP, mastery ranks, achievements
(extends useTraining)`), `:138` (`AccentProgressBar.tsx -- XP/mastery/streak display`), `:335`,
`:471-498`, `:528`. Verified-absent-by: `grep -rn "accent-progression\|AccentProgressBar\|
AchievementToast" src/` → 0 matches; `grep -rni "achievement" src/` → 0 matches. Takes: it is
specified down to the named achievements, so it is a build, not a design — **medium**.

The roadmap is honest about what it deliberately excluded, and I am not counting these as gaps:
speech-to-text / accent recognition (`:78`), text-to-speech (`:79`), video / face tracking (`:80`),
multiplayer (`:81`), an accent marketplace (`:82`, "Future feature") and audio export (`:83`).

### B. The Academy has no offline question bank — the document says so, and it is still true

**Offline / character-derived quiz questions** — PROMISED-BUT-MISSING. `TABLE-READY.md:2465` heads
the item "The Academy has no questions in it. Every single one is a live model call, and § 1 says
'sometimes no wifi'", and `:2497-2505` prescribes the fix (generate the bank from the save file:
spell levels, ranges, components, durations, weapon dice, uses-per-rest). Verified-absent-by:
`grep -n "useAI\|queryStructured\|BANK\|fallback" src/components/QuizArena.tsx` → the only question
source is `queryStructured<QuizQuestion>` at `QuizArena.tsx:155` via `useAI()` at `:111`; there is
no static bank and no fallback branch. This matches what I measured live: with the network cut, the
Quizzes tab produces an error card, not a question (see the AI section above). It is also the
sharpest promise/reality gap in the app, because `README.md:7` says "Works offline" without
qualification and `README.md:229` sells "Adaptive D&D 2024 rules testing focused on YOUR class and
spells". Takes: a deterministic generator over the character's own data — **medium**.

### C. Combat: an undo stack for resource spends

**Undo on the combat screen** — PROMISED-BUT-MISSING. `TABLE-READY.md:2253` heads the item "There is
no undo on the combat screen. S-4 is UNPROVEN for that reason, not because it is slow", and
`:2256-2261` prices it ("an undo stack for resource spends, small… a ring buffer of the last N
mutations"). A general undo *engine* exists — `src/components/turn/CombatProvider.tsx:293`
(`undoLast`), `:122` (`undoLabel`), `:136` (`undoEntry`) — but the only surface that offers it is
deliberately narrowed to retaliations: `src/components/turn/TurnLive.tsx:219` reads
`const undoable = combat.undoEntry?.event.type === 'retaliate' ? combat.undoEntry : null`, and
`RetaliationCapture.tsx:91` documents the narrowing on purpose. Verified-absent-by: `grep -rn
"undoLast\|undoLabel" src/components/ --include=*.tsx` → consumers are only `ReactionRow`,
`ReactionsBand`, `RetaliationCapture` and `TurnLive`. So a mis-tapped spell slot or Channel Divinity
pip cannot be taken back from the turn screen. Takes: the engine is already there; this is a button
and a guard — **small**.

### D. Combat slices the plan marks open

`docs/plans/codex-v1/00-status.md` carries an unchecked master list. Three entries name features:

**Readied actions** — PROMISED-BUT-MISSING. `docs/plans/codex-v1/00-status.md:102`: "- [ ] 7b —
readied actions ('I ready an attack for when he opens the door'), which need a *trigger* the app can
hold and re-offer". Verified-absent-by: `grep -rni "readied\|readyAction\|readyTrigger" src/` → one
unrelated prose match in `src/lib/mechanics-reference.ts:676`, no mechanic. Takes: a held trigger
that survives turn boundaries — **medium**.

**Mobs (8 goblins, 8 pips)** — PROMISED-BUT-MISSING. `docs/plans/codex-v1/00-status.md:104`:
"- [ ] 9 — mobs (8 goblins, 8 pips)". Verified-absent-by: `grep -rni "\bmob\b\|mobCount" src/
--include=*.tsx` → 0 matches. Takes: **medium**.

**Install ergonomics — "Add to Home Screen" nudge and update prompt** — PROMISED-BUT-MISSING.
`docs/plans/codex-v1/00-status.md:108`: "- [ ] 10a — install ergonomics: an 'Add to Home Screen'
nudge and an update prompt when a new build is waiting *(deferred deliberately)*". Verified-absent-by:
`grep -rn "beforeinstallprompt\|Add to Home" src/` → 0 matches. This one bites hardest on the
stated use case — the app is mobile-first and the service worker is hand-written, but nothing tells
the phone to install it. Takes: **small**.

Note that `- [ ] 8 — concentration surfacing + Bloodied edge detection` at
`docs/plans/codex-v1/00-status.md:103` is **stale**: Bloodied does ship on the live combat screen —
`src/components/turn/TurnScreenD.tsx:293-294` renders a `Bloodied` / `Bloodied at N` label and `:285`
puts it in the `aria-valuetext`. I am recording that rather than listing it as a gap.

Two more, from the Grimoire plan's own "Open — known, not fixed" list:

**Party-aware tactics** — PROMISED-BUT-MISSING, deferred on the record.
`docs/plans/grimoire/00-status.md:187-189`: "Party-aware tactics are deferred to their own slice.
Canon has no party text and `PartyMember` has no mechanical fields, so this is the one thing on his
list that cannot be built by wiring up data that already exists." What ships is canon's
character-aware `tactics`, which I did see on the Grimoire cards. Takes: new canon content plus
mechanical fields on `PartyMember` — **large**.

**Sentinel (and other feat) reactions never reach the turn screen** — HALF-BUILT, known.
`docs/plans/grimoire/00-status.md:126-129`: "`featReactionOptions(nix)` returns 0 rows. His importer
wrote audience bullets into `feats[].effects`, and the sheet's words outrank canon's, so Sentinel
produces nothing… needs its own slice on text provenance in `turn/feats.ts`." The wire is real —
`src/lib/turn/feats.ts:226` exports it and `src/lib/turn/compose.ts:410` spreads its result into the
reaction options — so this is a data-provenance bug, not a missing feature. `src/lib/prepare/
fighting-style.ts:41,89` records the same 0-row result in a second place. Takes: decide whether
canon or the sheet wins per field — **medium**.

### E. Radiant Swing — a class feature the app never learned

**Radiant Swing** — PROMISED-BUT-MISSING. `docs/plans/combat-open-book/00-status.md:196-198`: "Radiant
Swing does not exist anywhere in the app. Grepped `src/**`, zero hits. Needs three mechanics the
engine has never had: a cost priced in *one attack*, a cone area, and a pool that recharges *at
dawn*." Verified-absent-by: my own `grep -rni "RadiantSwing\|radiant.*swing" src/` → still 0 matches.
Takes: three new engine primitives — **large**.

### F. Things the README sells that the running app does not deliver

**"Create multiple characters"** — PROMISED-BUT-MISSING in practice. `README.md:259-260` heads a
section "Multi-Character Roster" with "- Create multiple characters" and `:261` "Switch between them
instantly from the header dropdown". The roster machinery is real (`src/lib/character.ts:491-494`),
but the only two routes to a second character are both broken or dead in this build: the create
wizard (filed BROKEN above) and `Settings.tsx:1130`'s **Switch Character** button, whose panel is
gated at `Settings.tsx:1140` on `roster.length > 1` — so with one character the button renders and
does nothing. Import of a second JSON is the only working path, and it replaces rather than adds in
the flow I drove. Takes: fix the wizard, then either hide or repurpose the dead button — **medium**.

**"Training progress, XP, and streaks are tracked per character"** — HALF-TRUE. `README.md:233`.
Only the quiz path awards XP. `src/lib/training.ts` exports `awardDrillXP` (`:206-213`),
`recordDrill` (`:425`), `recordOneShot` (`:396`) and `recordConversation`, all unit-tested, but
`src/components/AcademyPage.tsx:113` renders `<RoleplayCoach character={character} />` with no
recorder props at all, while `:119` does pass `onQuizAnswer={recordQuiz}`. Verified-absent-by:
`grep -rn "recordDrill\|recordOneShot\|recordConversation\|awardDrillXP" src/components/` → zero
callers. The progress bar still reads "Complete quizzes **and drills** to earn XP". Takes: pass four
callbacks that already exist — **small**.

### G. Overclaims the owner's own baseline already retracted

`V0.9-CAPABILITY-BASELINE.md` has a table of claims it labels "Never shipped". I re-checked each
against *this* tree, and in two cases the situation is now worse than the baseline describes — the
dead components it cites have since been deleted, so the features are not merely unwired, they are
gone:

**Initiative tracker (add/remove/reorder NPCs)** — PROMISED-BUT-MISSING. Claimed at
`V0.9-CAPABILITY-BASELINE.md:37`; retracted at `:105` ("`InitiativeTracker.tsx` (332 lines, complete)
exists at `798a922`… and rendered by **nothing**"). Verified-absent-by: `grep -rn "InitiativeTracker"
src/` → **0 matches** — the file itself is no longer in the tree. Takes: rebuild — **medium**.

**Grimoire advanced filters + per-spell AI "Explain" / "Tactics"** — PROMISED-BUT-MISSING. Claimed at
`V0.9-CAPABILITY-BASELINE.md:38`; retracted at `:106` ("Those features live in `Spellbook.tsx`
(1,223 lines)… renders **`GrimoirePage`**… without ever rendering it"). Verified-absent-by: `grep -rn
"Spellbook" src/ --include=*.ts --include=*.tsx` → one comment in `src/components/ui/Sheet.tsx:162`
and nothing else; the component is gone. What ships instead is the catalogue I captured in
`play-grimoire-390.png`, which has grouping but not the concentration / ritual / casting-time /
damage-type / range-band filters. Takes: **medium**.

**Campaign context injected into every AI prompt** — PROMISED-BUT-MISSING. Claimed at
`V0.9-CAPABILITY-BASELINE.md:39`-ish and retracted at `:107` ("wired for 3 of ~44 callsites").
Verified-still-true-by: `grep -rn "combatAdvisor(" src/` → the single callsite
`src/components/CombatHelper.tsx:878` passes `combatAdvisor(character)` with no campaign, exactly as
the baseline says. `grep -rln "campaign" src/components/` returns eight files, of which only
`CampaignEditor.tsx`, `session/AIAssistPanel.tsx` and `session/EngageCard.tsx` feed one to a prompt.
So the campaign the owner types into the Campaign editor does not reach the combat advisor. Takes:
thread one optional argument through the prompt callsites — **small** per site, **medium** overall.

**Typography / polish promises** — `V0.9-CAPABILITY-BASELINE.md:78` claims "Cinzel Decorative /
Alegreya / Cinzel" and `:108` retracts Alegreya, drop caps, the animated `codex-ritual` border and
gold text selection as "Never existed. Aspirational." I did not re-verify these; they are cosmetic
and the document already withdraws them.

### H. Deliberately out of scope — recorded so nobody re-files them as bugs

- **Party / multiplayer / shared sessions.** `ACCENT-FORGE-ROADMAP.md:81` ("Out of scope for this
  plan"). `partyMembers` exists on the character shape and is read by `CampaignEditor`, but there is
  no multi-character session mode. The docs treat campaign memory as belonging to a separate product.
- **DM-facing tools.** No DM screen exists; the one DM-adjacent surface that ships is the Accent
  Forge "Rapid" tab (`src/components/accent-forge/DMRapidMode.tsx`).
- **Non-Paladin classes.** The character shape is class-agnostic and the app loaded a Paladin
  cleanly, but every canon table I read under `src/lib/canon/` and `src/canon/*.json` is Paladin
  content. I did not build a non-Paladin save file, so I am **not** claiming other classes are
  broken — I am recording that I did not test one, which is the honest state. See "What I could NOT
  drive end-to-end" above.

### What I did not mine

I read `README.md`, `TABLE-READY.md` (structure first, then §9 in full), `ACCENT-FORGE-ROADMAP.md`,
`V0.9-CAPABILITY-BASELINE.md`, `docs/plans/codex-v1/00-status.md`,
`docs/plans/combat-open-book/00-status.md` and `docs/plans/grimoire/00-status.md`. I sampled but did
not read in full `docs/plans/sheet-truth/`, `docs/plans/roleplay-engine/`, `docs/plans/table-truth/`,
`docs/plans/your-turn/`, `docs/plans/reactions/`, `docs/plans/toybox-*/`, `docs/plans/slot-truth/`,
`docs/plans/dawn-guardian/` and `docs/plans/HANDOFF.md`; every feature they name that I checked was
present in `src/`. I did **not** exhaustively read `THE-CODEX-COMPLETE-HANDOFF.md` (1259
lines), `CLAUDE-DESIGN-PROMPT.md`, `AESTHETIC_POSITION.md`, `THE_ONE_WEIRD_THING.md`,
`AUDIT_BASELINE.md` or `STACK_DELTA.md` line-by-line — they are narrative, aesthetic or
stack-inventory documents rather than feature manifests, and nothing I sampled from them named a
feature the other documents had not already named. If a promise lives only in one of those, this
section does not have it.

---

## Method and reproducibility

Driver scripts: `.codex-owner/notes/_probe/` (p1–p31 plus `_pw.mjs` / `_boot.mjs` helpers).
`_boot.mjs` replays the exact localStorage the real UI import produced (`ls-seed.json`) so every
probe starts with Nix loaded without re-driving the file picker. Playwright resolves from the npx
cache using the repo's established preamble
(`docs/plans/codex-v1/reference/_shot-import.mjs:1-9`). Nothing under `src/` was modified; no
branch was created; nothing was committed.
