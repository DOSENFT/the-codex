# Status: Toybox round two (`hearth-7-r2`)

- Gate 1 — Product: **APPROVED 2026-09-04**
- Gate 2 — Architecture: **APPROVED 2026-09-04**
- Gate 3 — Program Design: **APPROVED 2026-09-04**
- Gate 4 — Slice plan: **APPROVED 2026-09-04**

Round one (`docs/plans/toybox-seed/`) is COMPLETE, shipped and live. Its 31 entries are
**not** being changed. Marcus: *"Keep them though and build from them."*

## Slices — full detail in `04-slices.md`

- [x] Slice 1 — TRACER: the whole engine change (multi-pack, `needs`, `force: string[]`)
      plus exactly one combo, The Sentinel Gate. Proved on three sheets: his, one without
      Sentinel, one with a 5-ft weapon. **DONE 2026-09-04** — see "Slice 1, proved" below.
- [x] Slice 2 — the four combos needing no new research + the one-turn test.
      **DONE 2026-09-04** — see "Slice 2, proved" below.
- [x] Slice 3 — the equipment combos + the shopping-list tactic they depend on.
      **DONE 2026-09-04** — see "Slice 3, proved" below.
- [x] Slice 4 — the last combo, The Caster Killer; **all ten on the glass**.
      **DONE 2026-09-05** — see "Slice 4, proved" below.
- [x] Slice 5 — the eight tactics + the not-one-turn test.
      **DONE 2026-09-05** — see "Slice 5, proved" below.
- [x] Slice 6 — the six persona plays + the `types.ts` scoped exception + its test.
      **DONE 2026-09-05** — see "Slice 6, proved" below.
- [x] Slice 7 — tsc, suite, build, all provers (round one's eight AND round two's), ship
      **DONE 2026-09-05** — see "Slice 7, shipped" below.

Every slice updates round one's prover literals to the new TRUE total. Never to `>=`.

**Slice 1 found that no update was needed, and this is worth knowing before slice 2 goes
looking for one.** Gate 2 predicted round one's eight provers would go red. They did not,
and the reason is not luck: all eight drive `loadNix()`, which is the shared fixture — no
feats, and a five-foot Hearthbrand. `hearth-7-r2`'s only entry needs Sentinel and a reach
weapon, so it delivers **nothing** to that character, is therefore not marked, and
`PACK_COMBOS = 14` is still the literal truth for the sheet those provers actually run.

That will stop being true the moment round two ships an entry with no `needs` — the first
one is due in slice 2. When it does, the literals move to the new true number and are
still never softened to `>=`.

**It happened exactly there.** Slice 2's three ungated combos reach `loadNix()`, and
seventeen tests plus four provers went red against a `seed.ts` that was perfectly correct.
Every literal moved to the new true value; nothing was softened. Details below.

## Slice 7, shipped

Round two is committed and pushed. **It is not live.** Publishing is a push to `main`,
which is what `.github/workflows/deploy.yml` listens for, and that press is Marcus's.

### The branch, and why there is one

The plan inherited from round one assumed this checkout sat on `v1`, with the merge to
`main` as Marcus's separate step. **It did not — `git branch --show-current` returned
`main`, in sync with `origin/main`.** Committing here and pushing would have published
round two the instant it left the machine, with no press in between. `deploy.yml` triggers
on `push: branches: [main]`, so the publish button is the *push*, not the commit.

So round two went onto a new branch, `toybox-r2`, cut from `main` at the shipped round-one
commit and pushed to `origin`. Nothing about the live site changed. `the-codex` is **not**
enrolled in `ops/save-all.repos`, so no auto-checkpoint can push `main` behind his back —
that was checked, not assumed.

### Four commits, by phase

| commit | what |
|---|---|
| `c4d802b` | the plan — the four gate docs and this status file |
| `591053e` | machinery — `types.ts` (incl. the scoped exception), `template.ts`, `profile.ts`, `seed.ts`, `index.ts`, `ToyboxPanel.tsx` |
| `bc10922` | the content — the `hearth-7-r2` pack, its 48 tests, and the round-one/round-two count split in `seed.test.ts` |
| `ea88a9d` | the provers, and the throwaway probes that proved the provers |

### Staged one path at a time — never the whole tree at once

The working tree holds another session's unfinished "your turn" work (`src/lib/turn/*`,
`src/components/turn/*`, `src/components/combat/*`, `docs/plans/your-turn/*`) plus scratch
files and screenshots — roughly 38 modified and 230 untracked paths that must not ship
inside a Toybox commit. Every path was named explicitly at each commit. Afterwards,
`git diff --name-only main..toybox-r2` returns **36 files, all of them Toybox**. Nothing
foreign went in; `git status` for the Toybox scope came back empty, so nothing of round two
was left behind either.

### Proved on the committed state, not just the working tree

A green working tree proves nothing about a commit when a second session's uncommitted work
is sitting in the same tree — round two could have been leaning on code that was never
staged. So the branch tip was checked out into a **separate worktree** and everything was
re-run there:

- `npx tsc --noEmit` — clean
- suite — **80 files, 1642 passed, 7 skipped, 0 failed**. Fewer files than the working
  tree's 85/1753 **on purpose**: the missing five files are the other session's uncommitted
  tests, correctly absent from this branch.
- `npm run build` — clean
- all **fourteen** provers against a preview served from that isolated build — PASS

The working tree was green too, at 85 files / 1753 passed / 7 skipped.

### What is still Marcus's to press

    git checkout main
    git merge toybox-r2
    git push origin main

The last line is the publish. Round one went out the same way, by his hand, on 2026-09-03.

Two housekeeping items, both 🟡 ASK-FIRST and both still open: the throwaway probes listed
below, and a scratch worktree at `C:/tmp-r2-check` that could not be removed because a
preview server still holds the directory.

## Slice 6, proved

**The third tab is full, and the pack stopped being shareable on purpose.** Round one's
persona plays are written under the `types.ts` ruling that a pack belongs to a *kind* of
character — no Selis, no Fate, no Scar, no pendant — and `pack-hearth-7.test.ts` enforces
that name by name. Marcus lifted it for this pack on 2026-09-04 in three words: **"Use all
of it."** So round two's six name Selis, Fate, Scar, Rysanna, Khaonn and the Hidden Kingdom,
and they cannot be handed to another player. That is the cost, it was authorised, and it is
now visible in behaviour rather than asserted in a comment.

| # | Card | Badge | What it changes |
|---|---|---|---|
| 1 | Fate Wants to Do Something Stupid | No roll — play it | Fate as a creature with an appetite, not a mood ring. One want per session, acted on at the worst moment, costing *him* something small |
| 2 | Ask Scar | No roll — ask Scar | Hand the ambiguous oath call to the goliath *before* rationalising it. Turns a private agonise into a two-line scene |
| 3 | The Eyes You Never Change | Deception (untrained) | Decide the answer once and never improvise it again — plus the two changeling facts his own file gets wrong |
| 4 | While the Nations War | Persuasion | The Hidden Kingdom, recruited one person at a time, pitched only after they have watched him pay |
| 5 | Two Sentences About the Fire | No roll | The grief, in the only version four other people can respond to |
| 6 | The Face That Opens the Door | Persuasion, adv. | Shape-Shifter priced correctly: an **Action**, out of sight *and* out of the plate, for advantage on the best social roll at the table |

### The exception is asserted in the direction that can actually rot

A rule that merely *permits* the names is invisible. A future author reads round one's
`names nobody from his backstory`, takes it for the house style, and edits round two back
into anonymity — and every test in the repo stays green while the thing Marcus asked for
disappears. So the licence lives in `types.ts` beside the ruling it excepts, and
`pack-hearth-7-r2.test.ts` asserts the names are **used**: `the backstory is named on
purpose` checks all six proper nouns are present, that the changeling round one deliberately
left alone is now spent, and — per play, not per pack — that every one of the six has
something licensed to be about. Delete the licence and the suite goes red.

### Where the facts came from

Every changeling rule is `CORRECTIONS.md §15`, which is Marcus-supplied canon, and **not**
`changling.txt`, which is a pre-2024 blog scrape that gets the action type, the ability
score increase and the creature type all wrong. Both cards that lean on it say so on the
card, because a card that says "your file is wrong" without naming the page to read instead
is a card he cannot act on. Play 4 quotes his own sheet verbatim — *"While the nations war
for power, we build what comes after."*

### Two things went red on the glass, and both were real

**1 — Five of six plays were silently missing a note.** The first prover run reported 13 of
18 annotations painted, and the missing one was the `party` note every time.
`docs/plans/codex-v1/reference/nix-seed.mjs` **has no `backstory` key at all**, so
`resolveParty` correctly returned nothing and `resolveNotes` dropped each `{{wizard}}`-style
note one at a time — shipping a play that *looked* whole. The behaviour is right; the sheet
was wrong. His real `codex-nix-lvl7 (2) (1).json` names four party members, so the prover
now carries them verbatim, Scar included — Scar is the case `party.ts` was written against
(his relation contains the word "party" and no parenthesised class, so he must **not** be
recruited into the line of battle). The prover now checks both halves: the four names are
present where expected and absent where they are not.

*Worth carrying forward:* every prover in this folder from slice 2 onward drives that same
partyless fixture, so the party annotations on round two's combos and tactics have never
been seen painted either. Nothing they assert is false — none of them counts notes — but
slice 6's is the only run that has proved a party token resolving to a person.

**2 — Two card names were clipped, and the character ceiling did not catch them.**
`ToyboxPanel.tsx:1568` paints `skillCheck` as a badge that does **not** truncate, beside a
name that is `line-clamp-3` and does. "When Someone Asks About the Fire" behind a 153px
"No roll — two sentences" badge measured 100px into a 60px box — five lines of title in a
three-line clamp. "The Face That Opens the Door" behind "Persuasion, advantage" measured 80
into 60. **Both badges were already under the 24-character ceiling.** The ceiling is
necessary and not sufficient: what clips a name is the badge's *width* beside that name's
*length*, and only a browser knows either. The ceiling stays in the unit test because it is
cheap and catches the gross case; the prover is what catches the real one.

Fixed by moving the technique into the name where it reads first — **"Two Sentences About
the Fire"**, badge **"No roll"** — and abbreviating the other to **"Persuasion, adv."**,
which keeps *advantage* on the badge because advantage is the entire play. Neither id moved:
an id is a storage key, not a title, and renaming one is how a card becomes two on a sheet
that already holds the old one.

### Proved

- `npx tsc --noEmit` — clean.
- Full suite — **85 files, 1753 passed, 7 skipped.**
- `npm run build` — clean.
- **All fourteen provers PASS** (round one's eight, round two's six).
- `prove-r2-slice6.mjs` — six cards painted at 390px: no Deploy button and no action-economy
  pills on any of them (same two detectors slice 5 proved against a real combo card), every
  name unclipped, every badge exact, **18 of 18 annotations painted**, every key phrase
  quoted exactly once by the component, and every party token resolved to a named person.
- `probe-slice6-tests.mjs` (throwaway) — **9 of 9 mutations killed the test named for them.**
  It prints every test each mutation took down, not just the named one, because slice 6's
  tests are deliberately nested claims and that overlap is better shown than hidden. One
  mutation had to carry *two* edits: five of the six plays are licensed twice over (a name
  in a phrase *and* a `changeling` tag), so a single edit correctly leaves the test green.

### Where the tests moved

| File | Change |
|---|---|
| `packs/hearth-7-r2.persona.ts` | `[]` → **six plays**; two renamed after the glass measured them |
| `types.ts` | the scoped exception, written beside the ruling it excepts |
| `pack-hearth-7-r2.test.ts` | `toHaveLength(0)` → `(6)`; +8 tests across three new blocks |
| `seed.test.ts` | new `R2_PERSONA` (six, ungated); both persona counts split round-one/round-two |
| `prove-r2-slice1.mjs` | `R2_PERSONA = []` → the six, with the comment inverted |
| `prove-r2-slice6.mjs` | **new** — the persona tab, and the party fixture that exposed the missing notes |
| `01-product.md` | row 5 renamed with the measurement recorded; the skills defect written up |

### Throwaway files to delete (🟡 ASK-FIRST, not done)

- `docs/plans/toybox-r2/probe-slice6-tests.mjs` — its answer (9/9) is above.

It joins the list already waiting at the bottom of this file. Nothing has been deleted.

## Slice 5, proved

**The tactics tab is full: eight cards, and not one of them is a turn.** Slice 5 wrote the
seven that were still missing and, with them, the answer to the thing Marcus actually asked
for — *"we really need to make more of a distinction between combos and tactics."*

- `npx tsc --noEmit` clean; full suite **84 files, 1730 passed, 7 skipped**; `npm run build`
  clean. **All thirteen provers PASS** — round one's eight and round two's five.
- New file: `prove-r2-slice5.mjs`, the tactics-tab prover. New tests: four in
  `pack-hearth-7-r2.test.ts`'s distinction block, plus a three-test block on attribution.

### The eight, in the order they paint

| # | Card | Priority | Category | Gated on |
|---|---|---|---|---|
| 1 | Five Prepared Spells You Are Not Using | CRITICAL | Core | — |
| 2 | Your Doctrine's Best Trick Does Not Work | HIGH | Core | — |
| 3 | You Are a Glaive, Not a Sword and Board | HIGH | Core | a Two-Handed weapon |
| 4 | The Shopping List That Is Not Spell Components | HIGH | Support | — *(shipped slice 3)* |
| 5 | Sentinel Is a Prison, Not a Damage Feat | HIGH | Control | the Sentinel feat |
| 6 | Your Sheet Has No Saving Throw Proficiencies | CRITICAL | Survival | — |
| 7 | Ask Your DM These Five Questions | HIGH | Support | — |
| 8 | Your Plate Cannot Sneak, but Your Face Can | NORMAL | Support | — |

### Three cards overrule a document Marcus supplied, and each names which

A card that says "you are wrong" without saying which page it read is a card he cannot
check. So three of them cite:

1. **The doctrine trick resolves on casting time, not on slots.** `WARFARE-DOCTRINE.md:57`
   says to cast a slotted spell with the Action and free-cast Divine Smite with the Bonus
   Action. His own `CORRECTIONS.md` §1 *permits* that on the slot rule — the 2024 rule
   restricts **expending**, and the free Smite expends nothing. What actually forbids it is
   §2: Divine Smite's casting time is *"Bonus Action, taken immediately after hitting a
   target with a Melee weapon or an Unarmed Strike."* If the Action was a spell, nothing was
   hit, so there is no trigger. A third annotation adds that even CORRECTIONS.md overstates
   the fix — at level 7 he has no second casting window, so the honest version of the trick
   is **two turns, not one**.
2. **His saving-throw line is empty and should not be.** `paladin_1.txt:12` —
   *"Saving Throw Proficiencies — Wisdom and Charisma."* His sheet's
   `savingThrowProficiencies` is `[]`. That is +3 missing on exactly the saves his aura is
   already boosting.
3. **Radiant Swing is asked about, never answered.** He said *"I'm not sure"* what it does,
   so the card is five questions for his DM — `Skip 1 attack`, `Miss = half damage`,
   `DC = 15`, `Dawn / Dusk = +1d6 fire` — and a test asserts that **no combo anywhere in
   round two is built on it.** That is the Gate 1 ruling, asserted where it can break.

### Two arithmetic corrections, both against his actual sheet

- **`01-product.md` row 1 said "3 of 7 picks spent, four empty". Wrong.** `Cure Wounds` sits
  on his list with `prepared: false`, so it occupies no pick: he is spending **2 of 7 and
  five are empty**. The card was renamed to match — a card named for a count has to carry
  the right count. The **id did not move** (`...:four-prepared-spells`), because an id is a
  storage key and renaming one is how a card becomes two. Product doc records both.
  Two of the five it names are not optional: **"The Caster Killer" needs Searing Smite
  prepared and "Three People Stand Up" needs Aid** — until he prepares them, those two combo
  cards are fiction.
- **The Hearthfire Manifest reading was corrected off his sheet.** The Reaction cost is on
  *transforming* the manifest into the cloak; the 1d10 Fire retaliation is automatic while
  the cloak is up. Card 5 now says so.

### The distinction, held on the glass and not only in the data

The unit tests hold the data half — no numbered sequences, no step opening with
`Action:`/`Bonus:`. Both guards are proved against specimens they must catch (`1. Swing`,
`Step 3: cast`, `First, attack`, `Bonus Action: Divine Smite.`), because a pattern that
matches nothing is a test that cannot fail. `prove-r2-slice5.mjs` holds the visual half:
**no Deploy button** (checked by `aria-label` *and* by any button reading "Deploy") and
**no ACTION/BONUS/REACTION/MOVEMENT/FREE pills**.

`probe-slice5.mjs` — throwaway — ran those same two detectors against a *combo* card and got
`deploy: true, pills: [MOVEMENT, ACTION, REACTION]`, then against a tactic and got
`deploy: false, pills: []`. The detectors can tell the difference; the PASS means something.

**And the seven new unit tests can genuinely fail: 7 of 7.** `probe-slice5-tests.mjs` —
throwaway — breaks the content one literal at a time and checks the test **named for that
literal** goes red, not merely that something did: number a step, open a step with
`Action:`, take a category away, un-gate the Sentinel tactic, stop naming
`WARFARE-DOCTRINE.md`, stop naming `paladin_1.txt`, drop a Radiant Swing quote. Seven for
seven, and the file hashes match before and after.

### Two things went red, and both were real

1. **A clipped card name.** The first run reported card 8 —
   "Plate Has Disadvantage on Stealth, and You Are the Infiltrator" — needing 80px of a 60px
   box. `TacticCard.tsx:105` is `line-clamp-3`, so the second half of that title, the half
   that mattered, was silently eaten by an ellipsis on a 390px phone. Renamed to **"Your
   Plate Cannot Sneak, but Your Face Can"**. Measured, not counted: no character limit was
   invented, because a 46-character label once measured as fitting while a 44-character one
   did not.
2. **Two gates that looked like one.** `prove-r2-slice1.mjs` was updated to expect the two
   new gated tactics, and its first draft keyed "Sentinel Is a Prison" off the same flag as
   the combo "The Sentinel Gate". It went red on the short-sword sheet, correctly: the
   **combo** needs Sentinel *and* a reach weapon, because it is a turn taken with a ten-foot
   blade; the **tactic** needs only the **feat**, because where to spend a Reaction is a
   decision you make holding anything. Now `expectSentinelFeat`, and the file carries the
   reasoning so nobody re-merges them.

### Where the tests moved

| File | What changed |
|---|---|
| `packs/hearth-7-r2.tactics.ts` | 1 tactic → **8**; header rewritten to list them and name the two gates |
| `pack-hearth-7-r2.test.ts` | `toHaveLength(1)` → `(8)`; +4 distinction tests; +3 attribution tests |
| `seed.test.ts` | new `R2_TACTICS_UNGATED` (six); both affected assertions moved to it |
| `prove-r2-slice1.mjs` | `R2_TACTICS` constant → `r2Tactics(c)`; new `expectSentinelFeat` |
| `01-product.md` | row 1 arithmetic corrected; row 8 renamed, with the old name recorded |

### Throwaway files to delete (🟡 ASK-FIRST, not done)

- `docs/plans/toybox-r2/probe-slice5.mjs` — its answer (both detectors real) is above.
- `docs/plans/toybox-r2/probe-slice5-tests.mjs` — its answer (7/7) is above.

They join the list already waiting at the bottom of this file. Nothing has been deleted; the
list only grows until Marcus says the word.

## Slice 4, proved

**Round two's combo slate is closed at ten.** Slice 4 shipped one card and then re-measured
the whole set, which is the difference between "the new one works" and "the slate holds".

- `npx tsc --noEmit` clean; full suite **84 files, 1723 passed, 7 skipped**; `npm run build`
  clean. **All twelve provers PASS** — round one's eight and round two's four.
- `prove-slice8.mjs` independently re-measured the whole Toybox: **0 of 57 block labels
  clipped across 21 combos**, 0 of 21 combo names, 0 of 13 tactics, 0 of 5 persona plays.

### The card: The Caster Killer (`sustained`, gated on nothing)

Movement → Action → Bonus. Walk to reach and no further, swing twice, and spend the Bonus
Action on **Searing Smite, not Divine Smite**. That inversion is the whole card, and it
rests on one number: **the enemy's Concentration save is a flat DC 10**, or half the damage
taken if that is higher. So a 3-point burn and a 9-point smite make it roll exactly the
same number, and only a hit over twenty damage moves the DC at all. Against Concentration
you win by making it roll OFTEN, not by hitting HARD — Divine Smite forces one save,
Searing Smite forces one at the start of every one of its turns for up to a minute.

It names `{{weapon}}` and `{{weaponReach}}` in load-bearing fields **on purpose**. Slice 3
proved the rule negatively (do not name the weapon when the weapon is not the point); this
applies it positively — a weaponless paladin genuinely cannot run this turn, so the card
deleting itself on an archer's sheet is the card being honest. `prove-slice2.mjs` holds
that refusal on the glass and says so in a comment; every other prover holds the arrival.

### It is the worst-sourced card in the pack, and says so three times

Three of its five annotations are attributed `warning`s rather than assertions:

1. The flat DC 10 is **in no file Marcus gave the app**. The card says that outright and
   tells him to check it once and then trust it.
2. **Whether Searing Smite takes Concentration is still open** (Gate 1, open question 2).
   `WARFARE-DOCTRINE.md:97` says it does not — and that is the same file that gets Prone
   backwards. The card names the file, says what changes if the answer is yes (no Bless, no
   Compelled Duel alongside it, and every hit he takes threatens his own fire), and hands
   the question to his DM.
3. The burn numbers come from `paladin_2.txt`, an opinion column, which also mentions a
   saving throw that would end the fire early. The spell that IS his in writing is Searing
   Smite itself — `paladin_1.txt:83` recommends it to him by name at level 1.

A `positioning` note adds the part nobody expects: **Graze forces the Concentration save
too.** Damage is damage. A miss cannot pay for a smite, but it can still break a spell — so
against a caster his bad rolls stop being bad rolls.

### Two tests went red and the test was fixed, not the card

Both times the content was right and the assertion was wrong, which is the opposite of the
usual direction and worth recording:

- **The attribution check split the card's text on sentence punctuation.** Tags and
  requirements carry no full stop, so they glued themselves onto the front of the first
  warning and produced a "sentence" that mentioned concentration and `not` while denying
  nothing. Sentence boundaries are not real in this data; **field** boundaries are. Rewritten
  per-field.
- **The prover compared case-sensitively.** The card shouts "A FLAT DC 10" in capitals, so
  `includes('flat DC 10')` reported the sentence missing when it was in front of it. Case is
  a typographic decision the card may change; the claim is that the number is stated at all.

The second half of the attribution check is a guard that nothing matches today, so **the
regex is proved against a specimen first** — a guard whose pattern cannot recognise the
thing it guards against is a test that cannot fail.

### One ordering trap, hit twice

"The Caster Killer" is **ungated** and sorts **last** — behind the gated "Drop the Glaive".
Two expected-set literals were built as `[gated, ...ungated, gated]`, which was a true
description of the order right up until slice 4 and is compared with `toEqual` /
`JSON.stringify`, where order is the point. Both were rewritten to spell the order out:
`seed.test.ts`'s `R2_FOR_NIX_R2`, and `prove-r2-slice1.mjs`'s `expectR2`.

### Every literal that moved, and to what

| file | literal | 3 → 4 |
|---|---|---|
| `pack-hearth-7-r2.test.ts` | `combos` length | 9 → **10** |
| `pack-hearth-7-r2.test.ts` | "keeps the **six**…" | six → **seven** ungated |
| `seed.test.ts` | `R2_UNGATED` | 6 → **7** |
| `seed.test.ts` | `R2_FOR_NIX_R2` | spliced → **spelled out**, 9 → **10** |
| `seed.test.ts` | `R2_UNARMED` | **unchanged at 4** — the new card names a weapon |
| `prove-slice1/2/3.mjs` | `PACK_COMBOS` | `14 + 6` → **`14 + 7`** |
| `prove-slice2.mjs` | archer's `comboIds` | **unchanged at 9** — and the absence is the assertion |
| `prove-r2-slice1.mjs` | `expectR2` | + **`KILLER_ID`**, appended last |
| `prove-r2-slice2.mjs` | `STORED_EXPECTED` | 9 → **10** |

Still never `>=`. Three moves in three slices is what a literal costs, and every time it
went red the same day the content changed and named the reason.

### New this slice

- **`docs/plans/toybox-r2/prove-r2-slice4.mjs`** — deliberately not a slice-4 prover in the
  way its three predecessors were. It drives his real Dawn Guardian sheet **owning no gear**
  and asserts: all ten stored **in exact pack order** (a length of ten cannot tell a
  re-ordering from a replacement); each card painted, opened, Deploy offered, no unresolved
  `{{`; the pill sequence per card, which is the turn order; **all thirty step labels
  measured geometrically at 390×844, none clipped**, with the measured-count guard from
  slice 3 (`30 of 30` — a run that finds nothing to measure must not look like a run that
  finds nothing wrong); and, on the new card only, that "flat DC 10" and "Ask your DM"
  survived to the glass while his own resolved `DC 14` is absent.
- **`docs/plans/toybox-r2/probe-slice4.mjs`** — a throwaway mutation probe, **6 of 6
  mutations caught by the test named for each**: sending the enemy against his own save DC,
  stating the Concentration denial as the app's own claim, dropping the "ask your DM", 
  swapping the Bonus Action back to Divine Smite, gating the card off his sheet, and moving
  it out of pack order.

### Throwaway file to delete (🟡 ASK-FIRST, not done)

- `docs/plans/toybox-r2/probe-slice4.mjs` — its answer (6/6) is recorded above.

## Slice 3, proved

- `npx tsc --noEmit` clean; full suite **84 files, 1718 passed, 7 skipped**; `npm run build`
  clean. **All eleven provers PASS** — round one's eight and round two's three.

**What shipped.** Four combos built on equipment rather than on spell slots — *Bearings and
the Backward Walk*, *One Silver Piece of Fire*, *The Shield Round*, *Drop the Glaive* — and
round two's **first tactic**, *The Shopping List That Is Not Spell Components*, which is the
card that tells him what to buy so the other four can be used. Round two now stands at nine
combos and one tactic.

**The gear ruling, and it is the one to remember.** Gear lives in `requirements`, never in
`needs`. `needs` **deletes a card forever** for a character who fails it, and that is right
for a feat or a weapon property — facts about who you permanently are. It is wrong for a
2 gp bag of ball bearings, which is a thing you can go and buy. So all four cards arrive on
a sheet owning none of the gear, ask for it on their face, and the tactic tells him where to
get it. `prove-r2-slice3.mjs` drives exactly that sheet and three new tests hold the line,
including one that fails if anybody ever gates a combo on a shopping trip.

**The combo/tactic distinction, measured on the glass for the first time.** This was Marcus's
actual complaint. `prove-r2-slice3.mjs` opens the tactic and requires it to carry a priority
badge, a "When:" trigger and six un-typed decisions, and to have **no Deploy button and no
action-economy pills** — the two things that say "this is one turn" on a combo card. Four
unit tests assert the same split from the data side.

**The label measurement, carried forward as slice 2 required.** Twelve step labels across the
four new combos, measured geometrically in a real Chrome at 390×844: **0 clipped**. Round
one's `prove-slice8.mjs` independently confirms **0 of 54 across all 20 combos**.

- It passed on the first run, which is the one case where a measurement that found NOTHING
  TO MEASURE looks identical to a measurement that found nothing wrong. The prover now
  **counts and reports** the labels it measured and fails if that count is not three per
  combo. A wrapper span added inside a step row would silently break the lookup otherwise.

**Three times a test went red and the content was fixed instead of the test.**

1. `storable.test.ts` caught a save-DC formula spelled out in a `Drop the Glaive` annotation.
   Adding the pack to that test's exemption list was the easy route and was **refused**; the
   annotation now cites `CORRECTIONS.md §6` and points at the step above for the number.
2. A gear test caught "a flask of oil" against "five flasks of oil". The card's prose was
   right; the test's literal was too narrow. It became a regex — the claim kept its strength.
3. The Compelled Duel guard, as first written, **could not fail** the way it mattered: it
   only forbade drag verbs in sentences that named the spell, so deleting the correction
   entirely would have gone green. Split into a positive assertion (the denial must be
   printed on the card) and the negative one.

**A test file that crashed instead of reporting.** Found by the mutation probe. `resolvePack`
returns `null` for a refused card and the test used `c!.id` inside a `describe` body — so
gating a combo threw at collection time and vitest reported "Failed Suites 1 … no tests",
naming no card and pointing at no assertion, while **disabling the very test written to catch
a dropped card**. Fixed with `.filter(Boolean)` and `?.`, and the reason is recorded in the
file.

**The new tests can genuinely fail: 10 of 10.** `probe-slice3.mjs` breaks the content on
purpose, one named mutation at a time, and requires the test named for it to go red — un-gate
Drop the Glaive, gate Bearings on owning bearings, delete the Compelled Duel correction,
reintroduce the drag as fact, restore his files' backwards Prone rule, strip gear from
`requirements`, ship the gear combos with no shopping list, drop every warning, remove the
trigger, name the rogue in a load-bearing field. All ten caught. Both pack files restored
byte-exact.

**A new authoring rule, learned the hard way.** Name `{{weapon}}` in a load-bearing field
**only when the weapon is the point**. The first draft of Bearings read "no attacks this
turn, no `{{weapon}}`, nothing" — true, and it would have cost the card its audience, because
a load-bearing token that cannot resolve drops the whole entry. A card *about not using the
weapon* that names the weapon is hidden from every paladin who carries none. Recorded in the
pack header.

**Prover literals that moved, and each one moved for a stated reason.** `PACK_COMBOS`
`14 + 3` → `14 + 6` in `prove-slice1/2/3.mjs`; `prove-slice2.mjs`'s archer case gained two
cards; `prove-r2-slice1.mjs` grew its named id set and gained a separate `expectTwoHanded`
flag, because the Gate and Drop the Glaive are refused for **different** reasons and one flag
could not tell them apart; `prove-r2-slice2.mjs` now asserts the whole nine-card round-two
set in storage. **Nothing was softened to `>=`.**

- `prove-r2-slice1.mjs`'s round-one check was **split rather than bumped**. Round two's first
  tactic made `tactics.length === 12` false on all three sheets, and a bare total cannot say
  whether a tactic was added or one of round one's was lost. Round one's twelve are now
  counted and round two's are listed, independently. `R2_PERSONA` is asserted **empty** — a
  true claim until slice 6, and the one that catches a persona play authored into the wrong
  file.

### Two rules corrections Marcus must be told about in plain language

Both come from his own strategy documents, and both would cost him at the table.

1. **Compelled Duel does NOT drag an enemy toward you.** `HEARTH-ERRATA.md` and
   `WARFARE-DOCTRINE.md` imply it does. It stops the target moving away from you and gives it
   Disadvantage on attacks against anyone else. The denial is now printed on the card itself,
   and a test fails if it is ever removed.
2. **Knocking an enemy Prone makes it HARDER for him to hit, not easier.** The rule gives
   Advantage only to attackers **within 5 feet**. His glaive reaches 10, so from where he
   normally stands, Prone gives him **Disadvantage**. His two files say the opposite. The
   card states the 5-foot condition explicitly and names both files.

`01-product.md` was corrected in four places for these and for two others found in research —
Searing Smite replaces Burning Hands as the oil igniter, and Grapple in 2024 is a **saving
throw** the target chooses Strength or Dexterity for, per `CORRECTIONS.md §6`, not an opposed
Athletics check. Following the slice-2 Divine Sense precedent, the doc was corrected and
**Gate 1 was not reset**: no shipping decision changed.

### Throwaway file to delete (🟡 ASK-FIRST, not done)

- `docs/plans/toybox-r2/probe-slice3.mjs` — its answer (10/10) is recorded above.

## Slice 2, proved

- `npx tsc --noEmit` clean; full suite **82 files, 1651 passed, 7 skipped**; `npm run build`
  clean. All eight round-one provers and both round-two provers **PASS**.

**The four new combos, on the glass.** `prove-r2-slice2.mjs` drives Marcus's real sheet —
The Dawn Guardian, Strength 18, Sentinel, Lucky — the only sheet in the repo that earns all
five round-two combos, and the first time "The Second Swing Is Not Wasted" has ever been
rendered, because nothing else carries Graze. All five painted, pills in the right order,
Deploy offered, no unresolved `{{` anywhere.

**IT FOUND A REAL DEFECT ON ITS FIRST RUN, and this is the headline of the slice.** All five
cards failed: every one carried a step whose text was **cut off** on a 390-pixel phone.
`ComboCard.tsx:98` paints a step label with `truncate` — one line, ellipsis, no wrap, about
287 pixels. Slice 2 had written step labels as sentences; the longest needed 444.

No unit test could ever have seen this. The string is perfect in memory and the loss happens
in CSS at a width the test never has.

- **The fix was content, and that was measured rather than assumed.** Counting characters in
  the pack source said round one had two labels over the same budget — which would have made
  this a pre-existing renderer bug and `truncate` the thing to change. Opening all nineteen
  combo cards and measuring said the opposite: **round one clips nothing.** The count lies,
  because `{{weaponReach}}` resolves shorter than it reads and em dashes are wide. Round two
  had drifted off a convention round one kept, so the convention was restored.
- Five labels were cut back to the action they name; the clause each lost was moved into — or
  was already in — that step's `notes`, which are a plain `<p>` that wraps freely. No word
  Marcus reads was lost.
- The rule is recorded at the top of `hearth-7-r2.combos.ts`, next to the content, because
  slices 3 and 4 add six more combos to that same file. **It must not be enforced with a
  character count** — a 46-character label fit while a 44-character one did not. The only
  honest check is the geometric one, and slices 3 and 4's provers must carry it.
- `ComboCard.tsx` was left alone, which also keeps slice 2 inside the file list Gate 3
  approved. No gate was reset.

**The predicted literal move, and exactly where.** `PACK_COMBOS = 14` → `14 + 3` in
`prove-slice1/2/3.mjs`; `prove-slice2.mjs`'s `noWeapon` case gained the two round-two combos
an archer earns; `prove-slice4.mjs` case 3 now marks both packs; `prove-r2-slice1.mjs`
replaced counts with named id sets.

**Two tests moved rather than weakened.** `seed.test.ts`'s "the pack that cannot reach this
character is not marked as delivered" and "an undeliverable pack does not abort the packs
behind it" both need a real in-gate character who earns nothing from round two, and after
slice 2 no such character exists. Both claims are now asserted in `seed-empty.test.ts`
against **mocked** packs — because that file's subject is the guard, not the content, and a
test about the guard must not be able to fail because somebody wrote a good combo.

**A reseed-button label change nobody had noticed.** `ToyboxPanel.tsx:239-246` uses the
pack's own label when exactly one pack is missing and "Reload the seeded plays" when more
than one is. With two packs the old literal could never be found. `prove-slice3.mjs` now
names both and asserts the plural is offered **and** the singular is not.

**The new tests can genuinely fail.** Two mutation probes on `hearth-7-r2.combos.ts`: a
second `action` block produced "spends the Action twice" across three tests; removing
`needs: { weaponProperties: ['Graze'] }` produced a wrong-set failure across two. The file
was restored byte-exact and re-confirmed at 16/16.

### Open question for Marcus — a pack is applied once and never tops up

Surfaced by `prove-r2-slice1.mjs`, and it is a product decision rather than a bug. A pack is
applied once per character and marked; it is never revisited. So a paladin who opens the
Toybox **without** Sentinel gets round two marked as delivered, and if he takes Sentinel at
level 8 "The Sentinel Gate" will never appear. The same was already true in round one for
every weapon combo an archer could not resolve — this is inherited, not introduced.

**It does not affect Marcus.** His sheet carries Sentinel and Graze today, so he earns
everything on first open. Left unfixed and recorded here deliberately; fixing it means packs
top up rather than apply once, which is a change to a Gate 2 decision and its own slice.

### Gate 1 correction, carried from slice 2's research

`01-product.md` said Divine Sense "is a Bonus Action lasting 10 minutes… nobody uses it".
`paladin_1.txt:109-116` is clear that in 2024 it is a **Channel Divinity option**, and at
level 7 there are only **two** of those — the same two the Hearthfire cloak spends. The doc
has been corrected. The decision to ship the combo did not change, so Gate 1 was **not** reset.

### Throwaway files to delete (🟡 ASK-FIRST, not done)

- `docs/plans/toybox-r2/measure-labels.mjs`
- `docs/plans/toybox-r2/measure-clipping.mjs`

Both are measurements, not provers; they assert nothing. Their answers are recorded above.

## Slice 1, proved

- `npx tsc --noEmit` clean; full suite **1615 passed, 7 skipped**; `npm run build` clean.
- `docs/plans/toybox-r2/prove-r2-slice1.mjs` — **PASS, all three sheets**, in a real Chrome
  at 390×844:
  - `arrives` — a Toybox holding round one and already marked `["hearth-7"]` grew to
    **15 combos**, markers `["hearth-7","hearth-7-r2"]`, round one intact (14/12/5), no
    duplicates, round two **appended after** round one, and "The Sentinel Gate" painted
    topmost. This is the state of Marcus's phone.
  - `no-feat` and `short-sword` — the Gate is absent from the screen AND from storage, and
    `hearth-7-r2` is **not** marked, so those characters can still receive it later.

> **Both bullets above were true at slice 1 and are no longer true.** Slice 2 read as
> follows: `arrives` grows to **18 combos**, not 15, because the ungated three come with the
> Gate; and `no-feat`/`short-sword` **are** now marked, because they earn those same three.
> The second bullet's closing clause — "so those characters can still receive it later" — is
> the one that has actually reversed, and it is the top-up gap written up under "Slice 2,
> proved". Left standing rather than edited so the change is visible.
- Round one's eight provers re-run: all **PASS** (see the note above for why).
- Two probe defects were found and fixed in the new prover, both recorded in its comments:
  `addInitScript` re-runs on reload and was putting the pre-upgrade sheet back; and the
  fifteenth card sits below a phone fold, so the geometric check now scrolls first and
  still requires the card to be topmost afterwards.

## Decisions taken at Gate 1

**THE COMBO/TACTIC LINE.** A combo is ONE TURN and has a Deploy button. A tactic is
everything that is not one turn and has a priority badge. Written to the grain of what
`ComboCard` and `TacticCard` already render. Full statement in `01-product.md`.

**THE QUALITY BAR.** A combo must contain a surprise; a tactic must change a decision he
would otherwise get wrong. Accurate-but-obvious does not ship. This is the rule round one
did not have, and its absence is why he starred nothing.

**BACKSTORY IS PERMITTED.** He answered "Use all of it" on 2026-09-04, lifting the
`types.ts` rule that the pack is authored for a KIND of character. That rule still binds
`hearth-7`; `hearth-7-r2` is explicitly a personal pack. **This must be recorded in
`types.ts` as a scoped exception, not a repeal** — otherwise the next pack author inherits
a licence nobody granted them.

## What his real sheet says — round one did not have this

Round one was authored against the test fixture. The fixture is not him.

| | Fixture (`nix-seed.mjs`) | **His actual sheet** |
|---|---|---|
| Weapon | Hearthbrand, 1d8 versatile, 5 ft | **The Dawn Guardian — 1d10 slashing, Two-Handed, Reach 10 ft, Graze** |
| Strength | 16 | **18** (so Graze chips 4, not 3) |
| Feats | none | **Sentinel, Lucky** |
| Armour | chain mail + shield | **plate, AC 18, no shield needed** |
| Skills | Persuasion, Insight | **Athletics, Persuasion** (Grapple/Shove DC 15) |
| CHA | 18 | **16** — DC 14, spell attack +6, aura +3, cloak 10 temp HP |
| Supplies | 2 healing potions | **empty** |

Charisma was already corrected in round one. **The weapon was not**, and it is the bigger
error: every positioning line in round one is sword-and-board thinking written for a man
holding a glaive.

### Live defects on his sheet, found while reading it

1. `savingThrowProficiencies: []` — Paladins get **Wisdom and Charisma**.
2. `spellSlots` still contains `"3": {max: 2}` — the phantom 3rd-level slots he reported
   are still in the file, so the "Use the 2024 slots" button has not been pressed or did
   not take.
3. `resourcePools: []` — the known Channel Divinity no-op, already logged in round one.
4. Only **2** of his 7 prepared-spell picks are used, so **five are empty** — `Cure Wounds`
   is on the list with `prepared: false` and therefore occupies none of them. *(This line
   said "3 of 7" until slice 5 counted it against the sheet rather than against the list.)*
   See `01-product.md`, Tactics 1. Both prepared spells also need Concentration, and he can
   only hold one, so the second is dead weight the moment the first is up.
5. **`skills` holds only `Athletics` and `Persuasion`.** `CORRECTIONS.md §15` gives the
   changeling **two social skills of its own** (Deception, Insight, Intimidation,
   Performance, Persuasion) and a 2024 background grants **two more** on top of the class
   picks. Two is short by roughly two. Found in slice 6: persona play 3 is the card that
   would use Deception, and it is currently a flat **+3** with no proficiency behind it —
   so the card says so in a warning rather than assuming a proficiency he does not have.

## Notes for a fresh session

- Marcus has **no coding experience.** Do not summarise in git/test/file jargon. End with:
  what can he do now that he could not, is it live yet, and what does he have to do.
  He said so directly on 2026-09-03.
- His sources are NOT all primary. `paladin_1.txt` is the PHB 2024 Paladin chapter and is
  trustworthy. `paladin_2.txt` and `PALADIN_3.txt` are third-party opinion columns with no
  stat blocks. `changling.txt` is a pre-2024 blog scrape — `CORRECTIONS.md §15` is right
  about it and understates it. **The weapon mastery table and full spell stat blocks are
  in none of his files**, so anything asserting them needs a `warning` annotation, which
  is the pattern round one already set for Sentinel, Interception and Graze.
- Deploying = merging to `main`, which fires `.github/workflows/deploy.yml`. He pushed
  round one himself on 2026-09-03.
- **THE WORKING TREE IS NOT CLEAN, AND NONE OF THAT IS ROUND TWO.** `src/lib/turn/*`,
  `src/components/turn/*` and `docs/plans/your-turn/*` carry uncommitted work from the
  "your turn" plan that was already there before round two started. The full suite is
  green with it, so it is not in the way — but **slice 7 must stage round two's files by
  path, one at a time, and must never stage the whole tree at once**, or an unfinished,
  unreviewed feature ships inside a Toybox commit. Round two's paths are:
  `src/lib/toybox-seed/**`, `src/components/ToyboxPanel.tsx`, `docs/plans/toybox-r2/**`.
- `preview-r2.log` in the repo root is mine, from `vite preview` on port 4321. It is
  untracked and must stay that way; the repo already has two others like it and the
  `.gitignore` still does not cover them.
