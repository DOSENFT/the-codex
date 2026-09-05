# Product: Toybox round two — the cards he would actually star

## Problem

Marcus's words, 2026-09-03: *"I'm a bit disappointed in the combos and tactics… I just
haven't found many that I would favorite just yet. Keep them though and build from them."*

Round one shipped 31 entries and he starred none. It is not that they are wrong — they
are accurate and they paint. They are **unsurprising**, and an unsurprising card is one
he reads once and never opens again. He also named two specific asks: **more distinction
between combos and tactics**, and **more range** — *"some should be an absolute menace"* —
including mundane equipment, scenarios, and positioning.

### Why round one under-delivered — three causes, all fixable

**1. IT WAS WRITTEN AGAINST THE TEST FIXTURE, NOT HIS SHEET.** The fixture paladin carries
"Hearthbrand", a one-handed 1d8 versatile sword at 5 ft, Strength 16, no feats. **Marcus
carries The Dawn Guardian: 1d10 slashing, Two-Handed, Reach 10 ft, Graze**, and he has
**Strength 18, Athletics proficiency, Sentinel and Lucky**. The token system swapped the
NAMES in correctly, so every card renders true sentences — but the tactical *thinking*
behind them is sword-and-board thinking for a man holding a glaive. That is the single
biggest cause and it is invisible from the glass.

**2. THE COMBO/TACTIC LINE WAS NEVER DRAWN.** See below. Without it, combos drifted into
"cast a spell, then attack twice", which is not a combo, it is the rules.

**3. IT AVOIDED HIM ON PURPose.** `types.ts` rules the pack is authored for a KIND of
character, so the persona plays name no Selis, no Fate, no Scar. Correct for a shareable
pack; wrong for the only person using it. **He has now lifted that restriction
explicitly** ("Use all of it"), which unlocks Fate — a wildfire spirit companion born
from a dead girl's pendant — as roleplay material.

## Success metric

**He stars at least five of the new entries within two sessions of play.** Favourites are
already tracked per entry (`toggleComboFavorite`), so this is measurable off his own
storage without asking him. Secondary, and the one that actually matters: **he brings one
of these to the table and it works.**

## The line between a combo and a tactic — the ruling this round exists to make

> **A COMBO IS ONE TURN.** It has numbered action-economy steps and a Deploy button
> because it is a thing you press while the table waits for you. If it does not fit in
> one Action + one Bonus Action + one Reaction + your movement, **it is not a combo.**
>
> **A TACTIC IS EVERYTHING THAT IS NOT ONE TURN.** Where to stand, who to hit first, what
> to spend, what to buy, what to prepare, what to ask your DM. It has a trigger and a
> priority because it is a standing rule you check yourself against, not a sequence you
> execute.

This is not arbitrary — it is what the two cards already *render*. `ComboCard` paints
colour-coded ACTION / BONUS / REACTION / MOVEMENT / FREE pills and offers **Deploy**.
`TacticCard` paints a **priority badge**, a trigger line, and an un-typed decision list,
and offers no Deploy. Round two writes to the components' own grain instead of across it.

### And the quality bar, which is stricter than the line

**A combo must contain a surprise.** Two or more pieces that snap together into more than
their sum. "Attack twice and Smite" is Tuesday. "Spread two gold of ball bearings, then
use Compelled Duel to make crossing them the only move worth making" is a combo.

*(That sentence used to read "to make a boss walk backwards over them", which is a spell
that does not exist. Slice 3 found it. The correction is recorded on row 3 below and the
example is left standing because the combo it describes is real — the mechanism is just
incentive rather than compulsion.)*

**A tactic must change a decision he would otherwise get wrong.** Not a summary of a rule
he already knows.

Anything that clears neither does not ship, however accurate it is.

## What round two ships — 24 new entries, round one untouched

Round one's 31 stay exactly as they are. He asked for that: *"Keep them though and build
from them."* Round two is a second pack, `hearth-7-r2`, seeded alongside.

### Combos (10) — each named for the surprise in it

| # | Name | The snap |
|---|---|---|
| 1 | **The Sentinel Gate** | Reach 10 + Sentinel: anything that tries to get past you to the back line eats an Opportunity Attack, and on a hit its **Speed becomes 0**. Disengage does not save it. It is stranded in the open, ten feet from you, next to nobody. |
| 2 | **Three People Stand Up** | One **Aid** at 2nd level on three *downed* allies. It raises current HP, so 0 becomes 5 and all three are conscious and back in initiative. One Action, one slot, three turns returned to your side. |
| 3 | **Bearings and the Backward Walk** | Spread ball bearings in the corridor *before* the door. **Compelled Duel**, then walk backward. **CORRECTED IN SLICE 3, twice, and both corrections make the card better.** (a) Compelled Duel *drags nothing* — it makes the target attack everyone-but-you at Disadvantage and stops it willingly moving more than 30 ft from you. What walks a boss into the bearings is arithmetic, not a leash: it wants to reach you, it is bad at hitting anyone else, and the metal is in the only lane. (b) Prone at reach is a **penalty**: 2024 gives Advantage only within **5 feet**, Disadvantage beyond — so with a 10 ft glaive the follow-up turn is a turn you step *in*. `HEARTH-ERRATA.md:85` and `WARFARE-DOCTRINE.md:105` both tell him the opposite and both are wrong. |
| 4 | **One Silver Piece of Fire** | Flask of oil thrown, then fire. Oiled creatures take an extra 5 Fire. Your subclass is a fire dispenser and oil costs a tenth of a gold. **CORRECTED IN SLICE 3:** the igniter cannot be **Burning Hands** — throwing the flask is an attack and Burning Hands is an Action, so that pairing is *two turns* and a combo is one. The igniter is **Searing Smite**, a Bonus Action after a melee hit: swing 1 is the flask, swing 2 is the glaive, the glaive hit pays for the Smite, the Smite is fire. Burning Hands stays the right answer when more than one thing is oiled — and that is a tactic, not a combo. |
| 5 | **The Caster Killer** | **Searing Smite**'s recurring damage forces the target a fresh Constitution save *every round* — against their own Concentration, not yours. One 1st-level slot can strip three spells. |
| 6 | **The Free Crit** | Paladin's Smite is a Divine Smite that expends **no slot**, once per Long Rest. Swing 1; if it crits, spend it immediately — a crit doubles every Smite die, so the free one becomes 4d8. |
| 7 | **Through the Door** | **Divine Sense** in 2024 is a Bonus Action lasting 10 minutes: location *and type* of every Celestial, Fiend and Undead within 60 ft — the text asks for range, not line of sight — plus consecrated or desecrated ground. **CORRECTED IN SLICE 2:** it is a **Channel Divinity** effect (`paladin_1.txt:109–116`), and at level 7 there are only **two** uses, regained one per short rest — the same two the Hearthfire cloak spends. That is *why* nobody uses it, and it makes the card better: the play is not "use this free thing", it is "scouting costs you half your armour, so decide". |
| 8 | **The Shield Round** | His own answer: *"should the circumstance arise… I may switch to shield for a tanker build for a moment."* Donning a shield costs an **Action**, so this is a deliberately spent turn — AC 20, Hearthfire cloak's {{cloakTempHp}} temp HP, and 1d10 Fire back at anything that hits you. |
| 9 | **Drop the Glaive** | Grapple: DC **8 + Strength + proficiency**, and with Strength 18 that is a real number. **CLARIFIED IN SLICE 3 from his own `CORRECTIONS.md` §6:** 2024 Grapple is a *saving throw* the target makes (its choice of Strength or Dexterity), not an opposed Athletics check, and it is an option of the **Unarmed Strike inside the Attack action** — so it costs no extra action, only the free hand. Costs him the glaive that turn, so it is the desperate play — drag a thing off a downed ally and out of the doorway. |
| 10 | **The Second Swing Is Not Wasted** | Graze: a **miss** still deals Strength-modifier damage. Against high AC the second attack stops being a coin flip and becomes a floor — and that changes whether you swing or do something else. |

### Tactics (8)

| # | Name | The decision it fixes |
|---|---|---|
| 1 | **Five Prepared Spells You Are Not Using** | **CRITICAL.** Oath spells are free-prepared and do not count against his seven. So are Divine Smite and Find Steed. Names the empty picks and what to put in them. **CORRECTED IN SLICE 5, against the sheet — this row used to say "He is spending 3 of 7 picks. Four are empty," and the card used to be named "Four…":** `Cure Wounds` is on his list with `prepared: false`, so he is spending **2 of 7** and **five** picks are empty. A card named for a count has to carry the right count, so the name moved with the number. The five it names are Searing Smite, Aid, Lesser Restoration, Divine Favor and Command — and two of those are not optional: "The Caster Killer" needs Searing Smite prepared and "Three People Stand Up" needs Aid, so until he prepares them those two combo cards are fiction. |
| 2 | **Your Doctrine's Best Trick Does Not Work** | `WARFARE-DOCTRINE.md:57` says to cast a slotted spell with your Action and free-cast Divine Smite with your Bonus Action. **Divine Smite requires having hit with a melee attack that turn.** If your Action was a spell, you did not attack. The play is action-economy impossible before level 20. |
| 3 | **You Are a Glaive, Not a Sword and Board** | Plate is 18 without a shield, so nothing is lost by two-handing. Reach 10 changes where "the front" is. Polearm Master is the level 8 feat that finishes this build. |
| 4 | **The Shopping List That Is Not Spell Components** | His `supplies` array is **empty**. Ball bearings, caltrops, five flasks of oil, rope, a one-handed backup for shield rounds. Under 20 gp total and it unlocks four cards on this list. |
| 5 | **Sentinel Is a Prison, Not a Damage Feat** | Opportunity Attack target priority: spend it on the thing running *past* you, never the thing already standing next to you. |
| 6 | **Your Sheet Has No Saving Throw Proficiencies** | Paladins are proficient in **Wisdom and Charisma** saves. His `savingThrowProficiencies` is `[]`. That is +3 missing on exactly the saves his aura is already boosting. |
| 7 | **Ask Your DM These Five Questions** | Radiant Swing is undefined — "DC = 15", "Miss = half damage", "Skip 1 attack = light". **He does not know what it does either** (he answered "I'm not sure"). The card is the list of questions, not an invented answer. |
| 8 | **Your Plate Cannot Sneak, but Your Face Can** *(named "Plate Has Disadvantage on Stealth, and You Are the Infiltrator" until slice 5 measured it clipping to three lines on a 390px phone and losing its second half)* | The changeling tension, stated as a decision: Shape-Shifter gets you the face, plate takes away the approach. Out of armour you are AC 10. |

### Persona plays (6) — the backstory is now in play

He answered **"Use all of it."** These are for Nix, not for a paladin.

| # | Name | What it is |
|---|---|---|
| 1 | **Fate Wants to Do Something Stupid** | The wildfire spirit is impulsive and sometimes destructive, and it was born from Selis's burning pendant. Playing it as a character rather than a prop — and when to let it off the leash. |
| 2 | **Ask Scar** | When the oath is ambiguous, the goliath with childlike moral clarity is the answer. A play about deferring on purpose. |
| 3 | **The Eyes You Never Change** | Polished silver, claimed as a rare half-elf defect. The one lie he cannot drop, and what to do when someone notices. |
| 4 | **While the Nations War** | The Hidden Kingdom recruiting pitch. A shadow nation for outcasts — this is the long game and it has never been on a card. |
| 5 | **Two Sentences About the Fire** | The guilt, in a form that does not stall the table for twenty minutes. *(Built as "When Someone Asks About the Fire". The browser prover measured that title at five lines inside a three-line clamp, squeezed there by a 153px "No roll — two sentences" badge; the technique moved into the name and the badge shrank to "No roll".)* |
| 6 | **The Face That Opens the Door** | Shape-Shifter plus Persuasion plus advantage on Charisma checks while shifted. The most powerful social tool at the table — **and it is Scar's secret too**, which is the constraint that makes it a play instead of a cheat code. *(Badge abbreviated to "Persuasion, adv." for the same measured reason.)* |

**A live defect found while writing these.** His `skills` array holds **only Athletics and Persuasion**. `CORRECTIONS.md §15` gives the changeling **two social skills of its own** (from Deception, Insight, Intimidation, Performance, Persuasion), and a 2024 background grants **two more** on top of the class picks. Two is short. Play 3 is the card that would use Deception and right now it is a flat +3 with nothing behind it — so the card says so, in a warning, rather than quietly assuming a proficiency he does not have.

## Announcement — the blog post before the feature

> Your Toybox just learned who you actually are. Round one was written for a paladin with
> a sword and a shield; you carry a ten-foot glaive, Strength 18 and Sentinel, and these
> twenty-four cards are written for *that* fighter. There is a combo that strands a boss
> in the open with its speed set to zero. There is one that stands three unconscious
> friends up with a single spell. There is a two-gold bag of ball bearings that turns your
> own taunt into a trap. And the tactics tab now tells you the four prepared spells you
> have been leaving empty since level 5, and the one trick in your own warfare doctrine
> that cannot legally be done. Round one is still there. This is what sits next to it.

## Screens

No new UI. Round two is content into the cards slice 9 already built and measured —
three priority tints, annotations, requirements, and no clipping at 390px. Every
constraint round one proved still binds: `skillCheck` ≤ 24 characters, no quotation marks
in `keyPhrases`, party tokens in annotations only, never in a load-bearing field.

## Open — carried into Gate 2, not guessed

1. **Radiant Swing.** Unknown to him and to the sources. Tactic 7 is the honest shape:
   a list of questions for his DM. **No combo is built on it.**
2. **Is Searing Smite Concentration in 2024?** `WARFARE-DOCTRINE.md:97` says it is not;
   no primary source in his files confirms it. Combo 5 carries a `warning`.
3. **Flask of oil's 5 Fire damage** is 2024 PHB equipment, not in any file he supplied.
   Combo 4 carries a `warning`.
4. **Filling four empty prepared-spell picks vs. the one-swap-per-Long-Rest rule.**
   Replacing one spell per rest is explicit; whether *unfilled* picks can simply be filled
   is not. Tactic 1 states both readings rather than picking one.
5. **HEARTH-08:** Warding Bond is already on the standard Paladin list, so half his level
   5 oath grant is wasted. Worth an annotation, and worth him asking for Heat Metal or
   Flaming Sphere instead.
