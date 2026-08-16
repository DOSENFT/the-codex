# Mockup render verification — 2026-08-15

Eight mockups (three competing directions plus the merge, D), rendered headless at the real device
sizes and audited against the guardrails they claim to hold. Script: `../reference/shoot-mockups.mjs`.
Raw data: `_shots/_audit.json`. Screenshots: `_shots/*.png`.

Viewports match the baseline capture exactly, so these are directly comparable to
`../reference/baseline/`:
- phone — 390×844 @ dsf 3, touch
- iPad landscape — 1366×1024 @ dsf 2, touch

## Result summary

| Mockup | JS errors | Fits viewport | Touch <48px | Cinzel <20px | Text <12px | Gold % of lit ink | Ember % |
|---|---|---|---|---|---|---|---|
| A instrument · phone | none | yes | 2 | 6 | 33 | 22.5% | 8.6% |
| A instrument · iPad | none | yes | 9 | 15 | 66 | 29.6% | 7.2% |
| B spread · phone | none | yes | 2 | 12 | 40 | 25.4% | 24.3% |
| B spread · iPad | none | yes | 5 | 19 | 24 | 32.4% | 17.1% |
| C hand · phone | none | yes | 3 | 9 | 32 | 48.7% | 11.6% |
| C hand · iPad | none | yes | 9 | 13 | 38 | 30.1% | 11.0% |
| **D merged · phone** | none | yes | **0** | **0** | **0** | 36.0% | 14.0% |
| **D merged · iPad** | none | yes | **0** | **0** | **0** | 37.7% | 14.1% |

Zero horizontal overflow, zero textured/noise elements (anti-pattern 4 held), zero console errors,
and **every direction fits its viewport with no page scroll** — which is the headline. Baseline V0.9
phone Combat is 2,942px of scroll against an 844px screen. All directions put the turn on one
screen. Finding #2 is answered by all of them.

**D is the only one that reads zero across all three legibility guardrails.** That is the whole
point of the merge: A, B and C were competing on layout while all three failed the same three
type-and-touch rules, so those failures were never direction-deciding and are simply gone in D.

### On the gold-coverage number

The catalogue's guardrail is "gold under ~20% of screen or figure/ground inverts." Two figures are
reported because the naive one is misleading. `% of screen` counts every pixel including the vast
near-black field, so all of them score 1–4% and trivially "pass" — a meaningless result.
`% of lit ink` counts gold against *the pixels that are actually carrying signal*, which is what the
eye compares. On that measure **C phone at 48.7% is the one that genuinely risks inversion** — gold
has stopped being emphasis and become the body colour.

Gold and ember are counted **separately, by hue**, because they are different signals: gold is the
emphasis tier, ember is the deliberate loud thing (rubric and danger) and has its own small budget.
An earlier revision lumped them, which inflated every gold figure by up to 20 points. An even
earlier one estimated coverage from the DOM and returned 72%, which is impossible; it double-counted
nested boxes and scored low-alpha fills at full weight. The figures above are counted off the
rendered pixels, once each, alpha already flattened.

D sits at 36–38% — higher than A, well under C. Two thirds of that is structural and intended: D
carries *two* rank-1 illuminated cards with 24px gold Cinzel names, where A carries one. During the
build D briefly hit 38.5% because two full rider lines were set in gold; those were the same fault
as C (gold as body copy) and were corrected to cream with only the named mechanic — *Sap*,
*Cancels* — in gold. That rule is now written into D's stylesheet as a comment so it cannot drift
back.

## Faults found — all three directions, all fixable, none direction-deciding

These are **language-level faults, not direction-level ones.** They appear in all three because all
three inherit the same type ramp and control sizing. Fixing them does not change which direction
wins, so the comparison below is still valid — but they must be fixed in whichever wins.

**1. Cinzel is being used as a label face, at 11–16px, everywhere.** Direct violation of the
catalogue's own rule (Cinzel never below 20px). The offenders are the tracked small-caps labels —
`OPEN`, `30 FT`, `BEARING UPON YOU`, the nav words `Fight / Book / Voice`, and in B even the
character's name at 15px. Cinzel's hairline serifs disintegrate at that size; it reads as texture,
not as words. **Fix: Cinzel is reserved for item names, the character name, and numerals. Every
label, tab, and chip moves to IBM Plex Sans, tracked +0.08em, small-caps.** Systemic, one pass.

**2. Text below the 12px floor, in all six.** Range 8.5–11px; the worst are B phone and C phone at
8.5px. The floor exists because this is read at arm's length on a lit table, not at desk distance.

**3. "End turn" fails the touch minimum in every single direction** — 32px tall on A phone, 32px on
B phone, 36–40px on the iPads, against a 48px minimum. It is the most consequential control on the
screen and it is the smallest. The `d20` button also fails everywhere (38–46px).

**4. A's iPad is the metric winner and the legibility loser.** It fits everything Vaelin owns on one
1366px screen with nothing hidden — and it does that by running its two reference columns at
9.5–11px. 66 sub-12px strings, the worst of the six. This is the real cost of A's "everything
present, ranked" promise, and it is now visible rather than theoretical. It is fixable only by
giving something up: fewer columns, or a scroll returns to the right-hand pane.

**5. C's iPad has a dead band** of roughly 250px between the initiative row and the hand — the
three-column upper region does not fill its height. C phone, by contrast, is the tightest of the six.

## What did not go wrong

- No parchment, noise, vignette, or glow anywhere (anti-pattern 4 held in all six).
- No horizontal overflow at any size — the iPad layouts are genuinely designed for 1366, not
  stretched from 390. Finding #1 is answered.
- The ranked shortlist reads correctly in all three at a glance, with the pre-computed to-hit line
  visible without a tap. Finding #3 is answered — **pending Marcus confirming the premise.**
- C phone's known weak point (five cards across 390px) resolves as designed: the lead card is fanned
  forward at 268px carrying full maths, the rest sit at 112px. It works, at the cost of the highest
  gold saturation of the six.

---

# Direction D — the merge

Built on Marcus's instruction: *"the best of all while doing away with what fails on all… so long as
the entire thing is built with the newest 5e rules."* Files: `d-merged/01-turn.html` (phone),
`d-merged/02-turn-spread.html` (iPad).

## What it takes, and from where

| From | What | Why it survived |
|---|---|---|
| **A — Instrument** | The zone grammar. Eight zones that never move and never reflow. | Position is what tells you where an answer lives. A's metric win was real; it just cost legibility, and the cost was in the type ramp, not the grammar. |
| **B — Spread** | Illumination and rubrication. Rank is carried by tonal tier (`--e1/e2/e3`) and physical size, not by a badge. One ember instruction per screen. | It is the only mechanism that makes a shortlist *look* ranked without adding chrome. |
| **C — Hand** | Object physics. Pressable things scale and dim under the finger; spent resources leave residue (a dark pip with a faint radial ghost) rather than vanishing. | Residue is the honest way to show a spent slot — the resource existed, and its absence is information. |

## What it drops — the four faults that were in all three

1. **Cinzel as a label face at 11–16px** → Cinzel is now names and numerals only, floor 20px, verified 0 violations. Every label, tab and chip is IBM Plex Sans 12px, uppercase, tracked +0.09em.
2. **Text below the 12px floor** → 0 strings under 12px on either screen.
3. **Touch targets under 48px** → 0 violations. "End turn," the most consequential control, is now the largest thing on the edge bar.
4. **Gold as body colour** → gold is names, numerals and the rank-1 tier. Body copy is cream (`#f0e6d3`, 16.01:1).

## What the 2024 rules forced — the mutex

This is D's one genuinely new element, and it is a *rules* consequence, not a taste one.

In D&D 2024 Divine Smite is a level-1 spell cast as a **Bonus Action**, and Lay on Hands is also a
**Bonus Action**. Misty Step is a bonus-action spell too — and one-spell-slot-per-turn excludes it
twice over. So Smite, Lay on Hands and Misty Step are **not three items on a list. They are one
decision with three faces.** Drawing them as list rows would misrepresent the rules.

D draws them as a bracketed group captioned *"One of these — the bonus action · pick one"*, and marks
the BONUS cell in the economy strip as contested (`3 want it`) rather than `Open`. On the iPad the
three faces sit side by side, and `Hold Person` appears greyed in "Also yours" with the reason
spelled out: *no — you may spend only one slot this turn.*

**Structural rule, learned the hard way:** the mutex is a **sibling** of the ranked list, not a child.
In the first build it lived inside `.list`, the content overran 844px, and `overflow:hidden` silently
ate the single most important element on the screen. The bonus-action decision must never be what
gets clipped; only ranked cards may be trimmed. This is now a comment in the stylesheet.

## Other 2024 corrections carried into D

Vow of Enmity is **free** (a rider on the Attack action) and therefore ranks #1 — it also cancels the
Frightened disadvantage, which is why it leads. Longsword carries **Sap**. Channel Divinity is 2 uses.
Bloodied is shown as an approach (`Bloodied at 38 · 4 away`) with a physical tick on the HP track, not
just a state. Species is Human — Half-Elf does not exist in 2024. Full delta:
`../reference/03-rules-2024.md`.

## The vertical budget, and how it was closed

Phone is 390×844 with no scroll, so every pixel is contested. `../reference/measure-zones.mjs` reports
each zone's height and names anything rendered-but-clipped; it replaced two rounds of eyeballing.
Final: 538px of fixed zones, 299px of flexible list against 278px of need — **21px of slack, nothing
clipped.** Three cuts did most of the work, and each was a real improvement rather than a squeeze:

- **The HP bar and its Bloodied annotation became one row** instead of two stacked (−37px → −13px net). They were always one statement: here is the line, here is where Bloodied sits on it.
- **Card #1's ember rubric was deleted** because it said the same sentence as the edge bar (−62px). One instruction, one place.
- **"Lay on hands 15/40" left the resource strip.** Four groups measured 451px of content into 362px of strip and the label folded into itself. The pool is already stated as a cost on the Lay on Hands face, so the strip now carries only what nothing else on screen carries: 1st-level slots and Channel Divinity.

## What is still open on D

- Gold at 36–38% of lit ink is above A's 22–30%. It is defensible (two rank-1 cards, not one) but if Marcus reads the screen as gold-heavy, the lever is demoting card #2 from the `t1` illuminated tier to `t2`.
- The phone's ranked list shows 2 cards + the 3-face mutex = 5 of 19. Whether 5 is the right shortlist depth is a play-test question, not a design one.
- Only `01-turn` and `02-turn-spread` exist in D. Grimoire, identity and dice have not been rebuilt in the merged language yet.
