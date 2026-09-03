# Status: Toybox seed — Nix's real combos, tactics and persona plays

- Gate 1 — Product: APPROVED 2026-09-02
- Gate 2 — Architecture: APPROVED 2026-09-02 (re-approved after the Gate 3 correction to
  the party source — `backstory.relationships` only, parsed; campaign is not reachable)
- Gate 3 — Program Design: APPROVED 2026-09-02
- Gate 4 — Slice plan: APPROVED 2026-09-03

## Slices
- [ ] Slice 0 — the three sheet fixes (Marcus presses three buttons; not code)
- [x] Slice 1 — tracer: one hardcoded combo travels load → seed → persist → Combos tab
      Proved 2026-09-03: `tsc` clean · 1,480 tests pass (10 new) · build clean ·
      `prove-slice1.mjs` PASS on both cases — "Hearth Wall" painted 170×20 and topmost
      for a Paladin 7 of the Hearth, and a Wizard gets the untouched empty state with
      **nothing written to storage at all**.
      Known and scheduled: "already seeded?" is decided by an emptiness check, so
      deleting every seeded entry brings them back. Slice 3 replaces it with the
      `seededPacks` marker. Pinned by the test named `resurrects`, which must be
      REPLACED by its opposite in slice 3, not deleted.
- [x] Slice 2 — profile, party parse and templates; the numbers become the sheet's
      Proved 2026-09-03: `tsc` clean · **1,506 pass / 7 skipped / 0 fail** across 74 files
      (36 new: `party` 9, `profile` 11, `template` 16) · build clean ·
      `prove-slice2.mjs` PASS on all three cases. The SAME pack, run against two
      different sheets, paints two different turns —
      Paladin 7 CHA 16 → *"Attack ×2 — Hearthbrand" · "Reach 5 ft" · "10 temp HP
      (level 7 + Charisma +3)"*; Paladin 8 CHA 18 with a reach weapon → *"Attack ×2 —
      Emberreach Glaive" · "Reach 10 ft" · "12 temp HP (level 8 + Charisma +4)"*.
      Neither is allowed to say **11** — the doctrine's CHA-18-at-level-7 number — and
      that is asserted, not assumed. Third case: a Paladin of the Hearth with no melee
      weapon gets the entry **dropped**, not rendered vague — empty state, nothing
      written to storage.
      Also pinned: Scar's relation contains the word "party" and he is still not given
      a class (`party.test.ts`, "does not put Scar in the line of battle"), and
      `resolveText` returns `null` rather than ever leaking `{{` (9 adversarial inputs).
- [x] Slice 3 — seed-once marker, level window, forced re-seed button
      Proved 2026-09-03: `tsc` clean · **1,522 pass / 7 skipped / 0 fail** across 75 files
      (16 new) · build clean · `prove-slice3.mjs` PASS on all three cases.
      **The slice-1 bug is dead and the kill is on the glass:** seed → open the card →
      press Delete → *reload the whole app* → still gone. That run comes back red
      against slice 2, which is what makes it a proof and not a screenshot.
      Also proved: the empty state does **not** offer "Load the Hearth starter plays"
      while the combo is still sitting one tab over; it does once nothing from the pack
      remains; pressing it brings back **exactly one** copy that survives a reload with
      the marker not doubled. And the migration — the literal JSON in Marcus's browser
      today (`{combos,tactics,personaPlays}`, no marker) reads as *never seeded* and
      gets the pack.
      **The slice-1 test named `resurrects` was replaced by its opposite**, not deleted,
      exactly as its own comment required. One neighbouring test changed meaning with
      it: "leaves a Toybox that already has content alone" was only true while content
      implied seeded — it is now "appends behind what the user wrote, and never in
      front of it".
      One decision made here that is not in Gate 3: `seedToybox({force:true})` still
      re-addresses colliding copies as the design says, but **the button is only offered
      when nothing from the pack survives**, so the duplicate path is a tested safety
      net rather than a road. Consequence to know: deleting *one* of several seeded
      entries cannot be undone from the UI — only deleting all of them brings the
      offer back.
- [x] Slice 4 — cards render requirements and annotations; requirement ≠ tag
      Proved 2026-09-03: `tsc` clean · **1,537 pass / 7 skipped / 0 fail** across 77 files
      (15 new: `ComboCard` 5, `TacticCard` 6, `template` +4) · build clean ·
      `prove-slice4.mjs` PASS on all three cases.
      **The defect is dead and the kill was checked both ways.** `TacticCard` painted
      `requirements` and `tags` as two adjacent rows of identical neutral Badges — a
      search keyword and "can I even run this today" were the same object to look at.
      The falsifying test hands the card a requirement and a tag with the SAME TEXT and
      requires the markup to tell them apart, which is impossible unless the shapes
      differ; I reverted `TacticCard` to its old render and confirmed 2 of its 6 tests
      go red before restoring it. On the glass, the two shapes were then measured
      rather than assumed: requirement `radius 0px, border 0px, no background`, tag
      `radius ∞, border 1px, tinted`.
      Also proved on the glass: an annotation naming `{{wizard}}` and `{{bard}}` is
      **dropped for a character with no party while the combo, its steps, its
      requirements and its other annotation all survive** — the load-bearing /
      decorative split, which comes back red against any version that treats a note
      the way it treats a block label. And a combo Marcus wrote himself grows no
      empty row, no label and no marker.
      One decision made here that departs from Gate 3: the design said "no new
      component; three small additions to three existing renders." Slice 4 adds
      `src/components/toybox/PlayLines.tsx` and all three cards consume it. Three
      copies of a fix whose whole point is "these must look different from tags" is
      three chances to make them look different from each other. Rendering only;
      no interface changed.
      Accessibility, decided rather than defaulted: only the MARKER carries the
      category. Body text stays on `text-forge-1`, because requirement text contains
      numerals ("save DC 14") and WCAG V-3 holds numerals to 7:1 while `gold` measures
      6.28:1 — the constraint `ui/Badge.tsx` and `TABLE-READY.md §14` already record.
      Gold prints the three letters "REQ" and never a digit. Markers are distinct
      SHAPES with screen-reader labels, not distinct colours.
- [x] Slice 5 — CHECKPOINT: the mockup's 3 combos / 3 tactics / 1 persona, real
      Proved 2026-09-03: `tsc` clean · **1,553 pass / 7 skipped / 0 fail** across 78 files
      (16 new in `pack-hearth-7.test.ts`; 6 assertions in `seed.test.ts` restated) ·
      build clean · `prove-slice5.mjs` PASS on all four cases.
      The pack is now three sibling content files behind a barrel —
      `packs/hearth-7.{combos,tactics,persona}.ts` — as Gate 3 planned. The reason is
      a review one: the content files are read for RULES ACCURACY by someone holding a
      Player's Handbook; `seed.ts` is read for CORRECTNESS by someone holding the test
      file. A file that is both gets both reviews done badly.
      **`pack-hearth-7.test.ts` tests PROSE, which no compiler reads.** Its sharpest
      assertion resolves the same pack twice — once for Marcus (Paladin 7, CHA 16) and
      once for a Paladin 8 with CHA 18 — and requires the first to say
      *"10 temp HP (level 7 + Charisma +3)"*, the second to say *"12 temp HP (level 8 +
      Charisma +4)"*, and the second to contain **none** of the first's numbers. A pack
      with a hardcoded number passes every other test in the file and dies on that one.
      Induced-failure check run: misspelling `{{auraRadius}}` → `{{auraRadiusZZ}}` in
      `hearth-7.tactics.ts` turned **6 of 14 tests red**, including the silent-drop
      detector, before the token was restored.
      On the glass: all seven entries paint across all three tabs; the Tactics tab
      states **his** numbers ("10-foot radius", "+3 to every saving throw") and never
      the CHA-18 ones; and for a sheet with no `backstory.relationships`, **all seven
      entries survive while all four party names vanish** — each name checked with the
      card that would have named him open, so the claim cannot pass against a card that
      never rendered.

      **Four disclosures from this slice.**
      1. *A Gate 3 test-plan assertion was unsound and was sharpened.* The design doc
         asks that the CHA-18 resolution "does not contain `+3`". Proficiency is +3 at
         level 7 **and** at level 8, so a correct pack writing `{{prof}}` would fail it.
         The claim it was reaching for — no NIX-SPECIFIC number survives — is what is
         asserted instead, by the strings those numbers actually appear in.
      2. *"Preparing for Tomorrow" is `high`, not `critical` — a departure from the
         Gate 1 mockup*, which badged all three tactics critical. It never fires
         mid-fight; sharing a badge with the two that do makes the badge meaningless.
         **But the demotion only half-works, and that is a live finding:**
         `TacticCard.tsx` maps `critical` and `high` to the *same* `ember` Badge
         variant, so the two differ in text only — measured on the glass, both paint
         `oklab(0.735 0.071 0.115 / 0.15)`. Not fixed here: this is a content slice,
         and changing a shared Badge mapping is a rendering decision that belongs in
         its own slice with its own falsifying test. **Carry to slice 9.**
      3. *The empty-delivery guard at `seed.ts:168` is now unreachable and therefore
         untested.* With real content written, no character can empty the pack —
         three entries name a weapon and four do not, so a weaponless paladin gets a
         partial delivery and the marker is correctly written. The test that covered it
         was rewritten as a partial-delivery test rather than deleted, with the coverage
         loss recorded in `seed.test.ts`. **Slice 9 must either cover it or remove it.**
      4. *Two content defects were found on the glass and are now pinned by unit tests.*
         `PersonaPlayCard` renders `skillCheck` as a Badge in the collapsed header row
         and wraps every key phrase in `&ldquo;…&rdquo;` itself. The first draft wrote a
         40-character skill check and quoted its own phrases: on a 390px viewport the
         badge measured **251px and the play's name painted at zero width**, and the
         phrases opened with two quote marks. Fixed to `skillCheck: 'Persuasion'` with
         the numbers moved into `approach`. Confirmed both ways — the pre-fix content
         was rebuilt and `prove-slice5.mjs` came back **FAIL on `persona` and
         `orphan`** before the fix was restored.

      **A trap avoided rather than hit, worth carrying into slices 6–8.** `actions`,
      block labels, `tags`, `requirements`, `name` and `description` are LOAD-BEARING:
      one unresolvable token drops the whole entry, silently, at seed time.
      `annotations` are not. So `{{fightingStyle}}` — which Marcus has no value for
      until he presses the picker — lives in an *annotation* on "The Reaction Is Only
      One". As a fourth step it would have deleted the flagship tactic from his app
      until he answered an unrelated question. Both directions are tested. Same rule
      forbids a party token in `tags` or a block label.
      ⚠️ **That last sentence is too narrow and slice 6 corrects it** — see slice 6
      disclosure 1. Every field of a block is load-bearing, `notes` and `sourceName`
      included, not just the label.
- [x] Slice 6 — combos to full: **14**, every L1 and L2 spell that makes a turn
      Proved 2026-09-03: `tsc` clean · **1,559 pass / 7 skipped / 0 fail** across 78 files
      (5 new tests in `pack-hearth-7.test.ts`; the partial-delivery assertion in
      `seed.test.ts` restated) · build clean · `prove-slice5.mjs` still PASS on all four
      cases · new `prove-slice6.mjs` PASS on all four cases.
      Fourteen, not the "roughly twelve" of the slice plan. The number is a consequence,
      not a target: the scope is *spells*, and the cards that carry two or three related
      spells honestly ("The Smites That Aren't Damage" carries four; "Pick Them Up"
      carries Lay on Hands, Aid and Cure Wounds) landed where they landed.
      The three slice-5 combos survive **byte-identical except one addition** — "One
      Slot, Spent Right" gained a fourth annotation (the crit-sequencing rule from
      `WARFARE-DOCTRINE.md` line 82). "Hearth Wall" was not touched at all, because
      `prove-slice4.mjs` greps three of its strings.

      **What the new tests actually claim, and why they are not the obvious ones.**
      A coverage promise rots quietly, so it is written down as a list and checked. But
      the naive version of that test would have been near-worthless: slice 5's three
      combos *already said* "Bless", "Shield of Faith" and "Lay on Hands" — in warnings
      about what a smite costs you — so a search of the whole card would have reported
      nine of the spells already covered. **A spell counts as covered only when it is a
      STEP of a turn**, i.e. inside a block. The five that are genuinely covered as
      advice on somebody else's card (Command, Protection from Evil and Good, Heroism,
      Aid, Cure Wounds) are listed separately, which says out loud which spells got a
      turn and which got a sentence.
      Induced-failure check run: `combos: HEARTH_7_COMBOS.slice(0, 3)` in the barrel —
      exactly the pre-slice-6 state — turned **all five new tests red** with useful
      messages, before it was reverted.
      On the glass, the two claims a unit test structurally cannot make: **all fourteen
      names paint** (a list that capped, virtualised or dropped its tail would leave
      every unit test green and four cards unreachable), and **the five category chips
      partition them** — each chip checked both ways, keeps its own AND hides a stranger,
      because "the member is visible" is also true of a filter that does nothing.

      **Four disclosures from this slice.**
      1. *A rule stated too narrowly in slice 5 was wrong, and is corrected.* Slice 5's
         note above says a party token must not appear in `tags` or a block LABEL.
         Reading `template.ts` again: `resolveMaybe` is applied to `sourceName` and
         `notes` too, and a failure returns `{ok:false}` → `return null`. **Every field
         of a block is load-bearing.** A `{{wizard}}` in a block *note* drops the whole
         combo for a character with no party. The corrected rule is in the combos-file
         header, and `seed.test.ts` now watches the asymmetry happen: "Before the Door
         Opens" says `{{weapon}}` in an annotation and survives a weaponless sheet with
         that one note dropped.
      2. *The dice and areas are 2024 PHB constants written from general knowledge, and
         are not flagged per-card.* Marcus's files say what each spell is FOR; they are
         guides and errata, not a spellbook. 3d6 in a 15-foot cone, three rays of 2d6,
         +1d4 on a hit — none of that is in his files. It is not flagged because a
         warning on all fourteen cards is a warning on none. The three rules that ARE
         flagged (Interception, Sentinel, Graze) are flagged because his files NAME them
         and never define them, which reads as sourced when it is not.
      3. *Ten spells are deliberately absent, and slice 7 owns them.* Nine make no turn —
         the four rituals (Detect Magic, Detect Poison and Disease, Gentle Repose, Purify
         Food and Drink), Zone of Truth, Locate Object, Prayer of Healing, Protection
         from Poison, Ceremony — and a combo is a turn. Find Steed is the tenth: Faithful
         Steed makes it free and its whole value is movement doctrine. This is pinned by
         a test, so the deferral cannot silently become false: if one of them appears on
         a combo card, it goes red.
      4. *The partial-delivery test in `seed.test.ts` was sharpened, not just repaired.*
         At three combos a weaponless paladin got nothing and `toEqual([])` said
         everything; at fourteen the delivery is genuinely partial, so the five survivors
         are **named**. A bare `toHaveLength(5)` would have stayed green if one card
         started naming a weapon while another stopped — precisely the edit the test
         exists to catch.
- [x] Slice 7 — tactics to full: **12**, and the ten spells slice 6 deferred
      Proved 2026-09-03: `tsc` clean · **1,565 pass / 7 skipped / 0 fail** across 78 files
      (6 new tests in `pack-hearth-7.test.ts`; the partial-delivery assertion in
      `seed.test.ts` sharpened a second time) · build clean · `prove-slice5.mjs` and
      `prove-slice6.mjs` both still PASS on all four cases each · new `prove-slice7.mjs`
      PASS on all four cases, first run.
      Twelve, not ten: the nine new ones are reactions, concentration discipline, the
      death protocol, Luck Points, the damage-type gap, the weapon mastery correction,
      the steed, the out-of-combat spell list and the shopping list. The three slice-5
      tactics are **byte-identical** — `prove-slice5.mjs` greps strings from all three.

      **Two facts came off his actual sheet that no guide and no earlier content knew.**
      1. *He has the **Lucky** feat.* Nothing in five source files mentions it and
         nothing in the pack covered it. "Spend the Luck, You Are Hoarding It" is that
         card, and its warning says out loud that it follows the wording printed on his
         sheet (spend a point, roll an extra d20, choose) rather than the advantage-shaped
         2024 text, because his sheet is what his table agreed to.
      2. *His weapon has **Graze**, not **Topple**.* `WARFARE-DOCTRINE.md` recommends
         Topple and builds a flagship "Topple into Smite" line on it — that line does not
         exist for him. "The Mastery You Have Is Not the One You Were Told" is a card
         whose entire job is to contradict his own doctrine, and it names what it
         contradicts. Getting Topple would mean putting down a reach weapon, which is the
         better half of his character, so the card tells him not to.

      **A contradiction between his own two sources, resolved on the card.**
      `paladin_2.txt:64` says a paladin cannot Ritual cast; `CORRECTIONS.md §11` says the
      2024 rules attach Ritual casting to the *spell*, so any prepared Ritual-tagged spell
      qualifies. "The Spells That Are Not Turns" follows the corrections file — newer, and
      written to correct the other — and **says on the card that it is making that choice**,
      because "four free spells a day" is too large a claim to make silently. If his DM
      rules the older way, the card tells him what changes.

      **Three tactics are dropped for a weaponless character, and that is deliberate.**
      "The Ten Feet You Threaten", "When Fire Does Nothing" and the mastery card name the
      weapon in a *step*. Rewriting them to survive a bow would mean writing them without
      saying what they are about. `seed.test.ts` now **names the nine survivors** for the
      same reason slice 6 named the five surviving combos: `toHaveLength(9)` stays green
      if one card starts naming a weapon while another stops.

      **Induced-failure check, and an honest note about it.** `tactics:
      HEARTH_7_TACTICS.slice(0, 3)` in the barrel — exactly the pre-slice-7 state — turned
      **6 of 89** tests in the folder red, including four of the six new ones: the
      deferred-spell coverage, the Lucky coverage, the Graze card, and the category
      spread. The other two new tests (**every tactic carries an annotation**, and **not
      everything is badged critical**) stayed green under three tactics, because they are
      invariants rather than coverage claims — they cannot fail on a *smaller* pack, only
      on a *sloppier* one. That is the correct behaviour for a guard-rail and it is
      recorded here so nobody later reads them as coverage.

      **What the browser case adds that the unit tests structurally cannot.** The unit
      tests resolve twelve objects and assert what is in them. `prove-slice7.mjs` asserts
      the tab *renders* twelve by name (a count would pass if one card rendered twice),
      that the five tactic chips **partition** them — each checked both ways, keeps its
      own AND hides a stranger — and that `resolveTactic` puts **his** aura on the glass:
      "+3 on every Constitution save", with the doctrine's Charisma-18 "+4" nowhere on
      screen. Slice 6 made that token claim through `resolveCombo`; this is the first time
      it has been made through the tactic path.
- [x] Slice 8 — persona plays (1 → 5, oath-forward) — 2026-09-03
      `tsc --noEmit` clean · `vite build` clean · full suite **78 files, 1,570 passed /
      7 skipped / 0 failed** · `prove-slice8.mjs` **4/4** · `prove-slice5/6/7.mjs` still
      **4/4 each**.

      **The five are built on the oath's own three tenets**, from
      `paladin_oath_of_the_hearth.txt:19-23` — one play per tenet (*tend* → The Work
      Before the Ask, *gather* → Gather Them In, *guard* → Standing Between), plus slice
      5's door play and one for the situation the tenets create: disagreeing with your own
      party without stalling the session. The tenets are the one source that is
      legitimately *his* and not Nix's.

      **His entire backstory was deliberately excluded, and that is a decision, not an
      omission.** Selis, Rysanna, Scar, Fate, Khaonn, the Silent Druid, the pendant, the
      fire in the field — the real sheet has all of it and none of it is on a card. This
      pack is authored for a KIND of character (the ruling is in `types.ts`), and a voice
      is the thing most tempting to write from the sheet in front of you. A play naming
      them would be dead content for every other paladin and, worse, would put words about
      his dead friend in a card he did not write. `pack-hearth-7.test.ts` now asserts
      those seven names are absent, so the decision cannot drift back. **The tenets are
      shared; the grief is his.** If Marcus wants that tab to go there, it is one sentence
      from him — the changeling warning on play 1 already says so on its face.

      **The card-fit test was widened from one play to five**, which is most of the reason
      it survived the slice. Written against `personaPlays[0]` it was two assertions about
      one authored object; a rule that only guards the first entry guards nothing once
      there is a second.

      **Induced-failure check (barrel set back to `HEARTH_7_PERSONA.slice(0, 1)`): only
      2 of 6 new tests went red** — the count and the tenet-coverage test. The other four
      (*names nobody from his backstory*, *spends no part of the changeling*, *every play
      has annotations*, *every play has two phrases*) stayed green, because play 1 alone
      already satisfies all four. Same finding as slice 7 and a worse ratio: they are
      invariants, not coverage claims. Recorded so nobody later reads six as coverage.

      **⚠️ THE PROVER FOUND A REAL DEFECT AND IT IS NOT SLICE 8's — IT NEEDS MARCUS.**
      `prove-slice8.mjs` measured `scrollWidth` against `clientWidth` on each card-name
      span at 390px, which nothing had ever done, and **every card name is clipped**:

      | tab | clipped | worst |
      |---|---|---|
      | Combos | 5 of 14 | 64px — "The Smites That Aren't Damage" |
      | Tactics | **11 of 12** | **239px — "The Mastery You Have Is Not the One You Were Told"** |
      | Persona | 5 of 5 | 90px — "The Work Before the Ask" |

      `ComboCard`, `TacticCard` and `PersonaPlayCard` all put the name in a Tailwind
      `truncate` span, so an over-long name does not break the row — it silently loses its
      tail to an ellipsis and still looks fine in a screenshot. This is why slices 6 and 7
      passed: neither measured it. The unit test's `skillCheck.length <= 24` rule was a
      proxy for a layout claim **that has never been true on any tab**, including "The
      Paladin Who Asks First", which shipped in slice 5 and has been on his phone since.

      Not fixed here, deliberately. There are two candidate fixes and both are his call:
      (a) change the shared card header to wrap the name to two lines — a visual change to
      three shipped components, against his standing *"we cannot lose the visuals"*; or
      (b) shorten the names — which means rewriting approved slice-6/7 content. Meanwhile
      `prove-slice8.mjs` carries today's per-play overflow as an explicit characterization
      baseline (+2px slack), clearly labelled in the file as *a defect being carried, not
      a standard being met*. It catches a later rename that makes a name worse, and it
      goes to zero the day the layout is fixed. The `house` survey block that produced the
      table above is labelled MEASUREMENT ONLY and has no pass/fail, because a block that
      cannot fail must say so rather than pad a green count.
      **RESOLVED IN SLICE 9** — he chose (a), wrap. The table above is the *before*; the
      after is 0 of 31. Left standing here because the measurement is the point.
- [x] Slice 9 — the edges + full-pack integrity sweep · **done 2026-09-03**
      All three carried items closed. `tsc` clean · full suite **79 files / 1578 passed /
      7 skipped** · `vite build` clean · provers 5, 6, 7, 8 all 4/4.

      **(a) Three priorities now paint three tints.** `critical` and `high` were both
      `ember`, so the tier survived only in the label text — twelve tactics filed across
      three priorities precisely so the urgent ones surface first, and two of the three
      looked identical. `high` is now `gold`. The test was written first and confirmed red
      (`expected 2 to be 3`) before the component changed.
      **The gold constraint is recorded, not discovered later.** `ui/Badge.tsx` sets V-2 at
      4.5:1 for text and V-3 at 7:1 for numerals; `gold` measures 6.28:1, so it clears the
      text floor and misses the numeral floor, and there is no `--color-gold-lit` token.
      "HIGH" is a word, which is what makes this legal. A second test pins all three
      priority labels non-numeric, so the day somebody renumbers them the failure lands in
      `TacticCard.test.tsx` rather than shipping a numeral below its floor. See
      `TABLE-READY.md §14`.

      **(b) The empty-delivery guard is covered, not removed.** New file
      `src/lib/toybox-seed/seed-empty.test.ts`, 6 tests. `vi.mock` substitutes a pack whose
      every entry names `{{wizard}}` in a load-bearing field, then seeds a character with
      no wizard; the real `findPack`, `buildProfile`, all three resolvers and the real guard
      run untouched — only the CONTENT is varied, which is the one input a pack registry
      exists to vary. Separate file because `vi.mock` is per-file and mocking the pack away
      for the other twenty-one tests would quietly turn them into tests of the fixture.
      **Induced-failure check (guard deleted): 3 of 6 went red**, one of them reporting
      `seededPacks: ['hearth-7']` on a Toybox that received nothing — a permanently empty
      tab the app believes it filled. The other three assert things true with or without the
      guard. Kept rather than deleted because its correctness depends on the current
      contents of the registry: `hearth-7` always delivers *something* ("The Reaction Is
      Only One" spends no token and survives every sheet), but the second pack need not.

      **(c) The truncation Marcus decided on: wrap, and it took THREE lines, not two.**
      His call was "wrap to two lines". `line-clamp-2` on all three cards took the count
      from **21 of 31 clipped to 2** — and the two survivors ("The Mastery You Have Is Not
      the One You Were Told", and "The Work Before the Ask" squeezed to 98px by the badge
      beside it) each needed a third line: 60px of content in a 40px box. They were caught
      because the prover had just gained a **vertical** check, which is the trap this fix
      creates — `truncate` overflows horizontally, a clamp overflows vertically, and a check
      watching one axis goes green on the other. `line-clamp-3` everywhere:
      `ComboCard.tsx:192`, `TacticCard.tsx:105`, `ToyboxPanel.tsx`'s inline `PersonaPlayCard`.
      Two lines would have shipped looking fixed. Four is not needed by anything in the pack
      today and the prover fails the day it is, which is the right way round.

      | tab | before | after |
      |---|---|---|
      | Combos | 5 of 14 clipped, worst 64px | **0 of 14** |
      | Tactics | 11 of 12 clipped, worst 239px | **0 of 12** |
      | Persona | 5 of 5 clipped, worst 90px | **0 of 5** |

      The five per-play `overflow` baselines in `prove-slice8.mjs` are back to `0` and the
      `badges` case is a real standard again rather than a carried defect.

      **The other `truncate` was MEASURED, and it is not the same defect.**
      `ComboCard.tsx:98` puts `truncate` on each step's block label inside the *expanded*
      card, where the name survey cannot see it — a collapsed card has no steps in the DOM.
      It would have been easy to call it the same bug on the strength of the word. The
      `house` block now opens all 14 combos one at a time and measures: **0 of 36 block
      labels clipped.** Left alone. The label sits in a `flex-wrap` row beside a short type
      pill, so it has most of the card width, and the pack's labels are short.
      Two prover bugs were found and fixed getting that number, both of which produced a
      confident wrong answer rather than an error: a pre-captured `all()` list went stale as
      each expansion re-rendered the list (reported 3 labels as the whole tab), and
      `button[aria-expanded]` is not a Toybox selector — it also matches the turn rail
      behind the panel, so the survey ended up measuring `Action 3 ready` and `Save DC` with
      the Toybox closed. Headers are now identified by shape (a `span.font-display` name
      plus a trailing "N steps" badge) and clicked one at a time, because the tab is
      single-expand.

      **(d) The gate edges.** `seed.test.ts`'s no-pack test asked only about a Wizard, which
      exercises the class gate and says nothing about the level gate — the one that moves,
      because Nix crosses the ceiling at 9 by playing. Widened to three shapes (Wizard,
      level 3, level 9). Induced-failure check (ceiling widened to 99): **2 red**, this test
      and the `findPack` ceiling test.
- [x] Slice 10 — tsc, suite, build, prover, commit · **done 2026-09-03**
      `tsc` clean · **79 files / 1578 passed / 7 skipped** · `vite build` clean ·
      **all eight provers PASS.**

      **⚠️ THE SHIP GATE FOUND PROVERS 1, 2 AND 3 RED, AND THE FEATURE FINE.** Slices 5
      through 9 each ran their own prover and the unit suite; nobody had run 1–3 since
      slice 3. All three failed for one reason: they asserted `combos.length === 1`, which
      was true when the pack was a tracer bullet and stopped being true at slice 6.
      **`seed.test.ts` had already been rewritten for exactly this at slice 5** — its
      comment says so in as many words — so the fix was known and simply never carried to
      the browser provers. Every content assertion in them was green the whole time: the
      right numbers from the right sheet, the right drops, the right storage.

      This is the failure mode the playbook's "prove it works" step exists to catch, and it
      is worth naming: **a per-slice prover becomes a regression test the moment the next
      slice is written, and nothing was running them.** Running only the newest prover is
      how three of them rotted without a single red build.

      Fixed rather than retired, because each proves something nothing else does — slice 2
      is the only proof that the numbers come off the sheet rather than being hardcoded
      (its `chaMax` case builds a different paladin with a different weapon), and slice 3
      is the only proof that a deletion survives a reload. The counts are now named
      constants (`PACK_COMBOS = 14`) with a note on why they are literals and not `> 0`:
      **a count that accepts "something arrived" cannot see the duplicate-append bug slice
      3 was written for.** Two cases needed more than a number:

      - **slice 2 `noWeapon`** expected the "Create First" empty state and nothing in
        storage. Correct for a one-combo pack whose combo named a weapon; plainly wrong at
        fourteen, where an archer paladin still gets the five combos that never mention
        one. It now asserts the exact surviving set by id — telling him he has NOTHING
        would have been the feature failing, not passing.
      - **slice 3 `reseed`** deleted Hearth Wall to reach the empty state. The offer is
        gated on `!packPresent(...)` — nothing from the pack left **anywhere**, not just on
        the tab in front of you. In slice 3 the pack *was* one combo, so deleting it
        cleared everything by accident. **The first fix attempt deleted only the fourteen
        combos, saw no button, and would have been filed as a missing affordance.** It was
        the gate working: twelve tactics and five plays were still there. The case now
        clears all thirty-one across all three tabs, and then the button appears.

      **One doc correction shipped with it.** `hearth-7.persona.ts`'s header said the pack
      names nobody from his backstory — "no Selis, no Fate, no Scar" — while the file names
      Scar once, in the warning on play 1, and `pack-hearth-7.test.ts` explicitly skips him
      in its sweep and pins the mention. The exception was deliberate and tested; only the
      header was wrong. Corrected, because a comment that contradicts its own tests is
      worse than no comment. Found by the pre-commit secret scan, which is not what that
      scan is for and is the second time this slice that looking at something for one
      reason turned up another.

      **THREE COMMITS, BY PHASE, ON `v1` — AND `v1` IS PUSHED.**
      `e7ed5f1` the engine and the pack (`src/lib/toybox-seed/**`, `toybox.ts`) ·
      `ee2085f` the cards (`ToyboxPanel`, `ComboCard`, `TacticCard`, `PlayLines`) ·
      `136fda5` the plan docs and the eight provers. `origin/v1` was a clean
      fast-forward — `dc6a99b..136fda5`. `git status --porcelain -- src docs/plans/toybox-seed`
      is empty: nothing from the feature was left behind. A large body of unrelated
      untracked cruft from earlier phases (probes, screenshots, `preview*.log`, root
      handoffs, `.agents/`) was deliberately **not** staged.

      **THE MERGE TO `main` IS NOT DONE, AND THAT IS ON PURPOSE.** Two reasons, and the
      second one is the real one:

      1. The Bash permission classifier refused `git checkout main` twice. Per the
         recorded rule — *"this is not a puzzle to solve"* — no workaround was attempted;
         the commands were handed to Marcus instead.
      2. **`.github/workflows/deploy.yml` triggers on `push: branches: [main]` and
         publishes to GitHub Pages.** For this repo, merging to `main` *is* the deploy,
         and deploy is 🟡 ASK-FIRST. Marcus did pre-authorise "merge to main" as the ship
         scope, and he had separately asked why the live codex still looked unchanged —
         so the intent is not in doubt. But the merge and the publish being the same
         keystroke is a fact he should hold before he presses it, not after.

      `origin/main` is a strict ancestor of `v1` (0 ahead, 3 behind), so the merge is a
      fast-forward with no conflict surface. The commands are in
      **"Handing back" → "The merge, if he wants it"** below.

## Notes for a fresh session

### What Marcus asked for, verbatim
> "Can you prefill some tactics and some combos in those tabs of the app? But I don't
> want just any willy nilly preloaded stuff. I'm talking actual paladin of the oath
> hearth, really effective tactics and combos that are based off of all of the research
> that you have from the files that I provided you, those paladin files, changing files,
> oath of the hearth files, etc. Real combos that are powerful, brilliant, or etc, full
> blown tactics, positioning, etc. Keep in mind my other party members too"

### The three scoping answers he gave
1. **Charisma: 16 — write to the sheet.** Aura of Protection +3, Hearthfire cloak 10 temp
   HP, spell save DC 14, spell attack +6. `WARFARE-DOCTRINE.md` was written against CHA 18
   and every number in it that derives from CHA is therefore wrong for this character.
2. **Scope, his words:** *"Executable for the spells that are unlocked for me now, all
   level 1 and level 2 spells, even if I do not have them prepared. This will help me know
   how to prepare for each day if I know what kind of combos and tactics require what
   abilities and spells. (even though I think I can only swap one spell per long rest)"*
   — his caveat is correct and confirmed in `paladin_1.txt`: one swap per Long Rest.
3. **Sheet gaps: fix all three** — Lay on Hands + Channel Divinity tracking, the phantom
   3rd-level slots, and a fighting style (Interception).

### Standing constraint, repeated across the whole engagement
> "we cannot lose the features of the other 'your turn' modules. Nor the visuals."

### The character, verified against `codex-nix-lvl7 (2) (1).json` — not assumed
Paladin 7 / Oath of the Hearth / Changeling. STR 18, DEX 12, CON 14, INT 9, WIS 13, CHA 16.
AC 18, HP 67. Slots 1st 4/4, 2nd 3/2, **3rd 2/2 (phantom — a Paladin 7 has no 3rd-level
slots)**. Save DC 14, spell attack +6, proficiency +3, 7 prepared spells.
Prepared: Bless, Shield of Faith. Feats: **Sentinel, Lucky**. Skills: Athletics, Persuasion.
`paladinResources: null`, `resourcePools: []`, no feature carries a resource pool.
Weapon **The Dawn Guardian** — melee, STR, 1d10 slashing, Two-Handed / Reach (10 ft) /
Graze, magical; special "Radiant Swing" 3d6 radiant, DC 15, half on a miss, +1d6 fire at
dawn and dusk. `masteryProperty: null` — Graze is free text in the properties list only.

### Party (from `backstory.relationships`)
Rune Willow — Wizard, quiet, inquisitive. Ponzi — Rogue, observant, reserved.
Ketza — Ranger, young wood elf. Talon — Bard, rock gnome tinker (Doug's character).
Scar — goliath partner, not a party member; the only person outside the party who knows
Nix is a changeling.

### The prepared-spell headroom — the finding that drives his stated purpose
Oath spells (Faerie Fire, Burning Hands, Scorching Ray, Warding Bond) plus Divine Smite and
Find Steed are **always prepared and do not count against the limit of 7**. He is spending
only **2 of his 7 picks** (Bless, Shield of Faith). He has roughly **five unused picks**.

### Sourcing honesty — carried forward as a hard constraint
Grep of all four paladin files: **Interception's rules text is not in them** (`PALADIN_3.txt:90`
names the style in a recommendation and nothing more). **Graze and Topple are never defined**
— they appear only as asides in `paladin_2.txt`. Any content depending on those three is
from training data, not from Marcus's books, and must be labelled as such where it appears.

### Three sheet fixes turn out to need no code — they are buttons already shipped
- Lay on Hands + Channel Divinity → **"Upgrade to Combat-Ready"** in Settings.
  ⚠️ Side effect: it also overwrites `persona` with the built-in Astera persona.
- Phantom 3rd-level slots → **"Use the 2024 slots"** on the turn rail (shipped in slice 9).
- Fighting style → the **fighting-style gap picker** already mounted on the Combat tab.

### Running the suite — a trap that costs a false red
`src/lib/canon/bands.test.ts` calls `existsSync('src/lib/turn/detail.ts')` with a
**relative** path, so it reads `process.cwd()`, not vitest's `--root`. Invoking
`vitest run --root <repo>` from anywhere else gives 3 failures that have nothing to do
with your change. Run it as `Set-Location <repo>; .\node_modules\.bin\vitest.cmd run`.
Same for the prover: `node docs\plans\toybox-seed\prove-slice2.mjs http://localhost:4321/the-codex/`
— the `/the-codex/` suffix matters, it is the vite `base`.

### The provers are blind below the fold — found in slice 4, not yet backported
Slices 1–3 read the screen by sweeping every leaf element once and keeping the ones
that pass `document.elementFromPoint` at their own centre. **That call returns `null`
for any point outside the viewport**, so the sweep quietly answers "not painted" for
everything below the fold — on the 390×844 phone viewport those provers use, that is
most of an expanded card. Slice 4 went red on content that was demonstrably on screen,
because one extra annotation row pushed the requirement line past 844px.
`prove-slice4.mjs` fixes it by calling `scrollIntoView({block:'center'})` before
measuring; every other condition (own box, own area, topmost at its own centre) still
holds, and negative claims are unaffected. **`prove-slice1/2/3.mjs` still carry the old
helper.** Their claims were about content near the top of the card and they pass, but
they are passing partly by luck, and a false RED is the cheap failure here — a false
green is the expensive one, and this bug cannot produce one.

### A second prover trap, found in slice 6: an exact label is not a unique one
`prove-slice6.mjs` clicks the Combos tab's category chips. `has-text("Burst")` is a
substring match and would happily click a card whose body mentions burst damage — so
the chips are matched by exact accessible name. That is still not enough: **"All" is a
label the app uses in more than one place**, and the first match in the DOM is a chip on
a scroll row *underneath* the open Toybox sheet. Playwright found it, could not scroll
it into view behind the sheet, and timed out after 10s with "element is outside of the
viewport" — a failure that looks like a broken filter and is not one. The fix is to
identify the row first (`div.flex.flex-wrap` containing the one chip label nothing else
uses, `AoE`) and scope the exact match inside it. Any future prover that clicks a
generically-named control in an overlay needs the same treatment.

### Known live defect this feature sits next to
Hearthfire Manifest's Channel Divinity spend **silently no-ops**: the pool does not exist,
so the lookup returns nothing and the spend is skipped with no error shown. Even after
"Upgrade to Combat-Ready" creates the pool, the feature still has to be pointed at it.
That is a separate fix from this one, but content that says "expend Channel Divinity" is
describing something the app currently does not track.

## Handing back

### The merge, if he wants it — **this publishes the site**
`origin/main` is a strict ancestor of `v1`, so this is a fast-forward and cannot conflict.
The push on the last line is what fires `deploy.yml` and republishes GitHub Pages.

```
cd C:\Users\marcu\Documents\Powerhouse\projects\the-codex
git checkout main
git pull --ff-only origin main
git merge --ff-only v1
git push origin main
```

Backing it out afterwards means rewinding `main` to `dc6a99b` and overwriting the remote,
which is a rewrite of published history and needs its own decision. Reversible in principle;
the site will have been live in the meantime. Cheaper to be sure before, not after.

### Slice 8c — the file deletions he asked to be reminded about
🟡 ASK-FIRST, and still not done. These are the stale sources that contradict the sheet;
nothing in the shipped code reads them, so removing them changes no behaviour — it removes
the risk that a future session treats them as current. **Read the reason on each before
pressing anything.**

- `WARFARE-DOCTRINE.md` — written at **Charisma 18**, so every CHA-derived number in it is
  wrong for him at 16 (aura, cloak temp HP, save DC, spell attack). This is the file whose
  "11 temp HP" `prove-slice2.mjs` asserts against by name.
- `changling.txt` — two editions stale per `CORRECTIONS.md §15`: Fey rather than Humanoid,
  no species ASI, advantage on Charisma checks while shape-shifted.
- The root-level session handoffs superseded by `docs/plans/**` — `SESSION-HANDOFF.md` was
  already flagged stale at the top of this engagement.

The exact list and the reasoning live in the slice 8c entry above. Nothing goes without him
saying so, item by item.

### Housekeeping left running
- **`vite preview` is still up on port 4321.** Stop it when you are done looking at the app.
- `preview.log` and `preview-4220.log` are untracked and not ignored. Candidate one-liner:
  add `preview*.log` to `.gitignore`.
- A large body of unrelated untracked cruft sits in the repo from earlier phases (`.agents/`,
  `game-night.*`, screenshots, probes, root `.md` handoffs). None of it was staged. Worth a
  deliberate sweep at some point, and that sweep is his call, not a routine one.

### Slice 0 — his own, and none of it is code
Three buttons that already shipped and are waiting to be pressed. Listed above under the
sheet gaps; repeated here because the build being done is exactly when they get forgotten.
