# Three directions

Synthesized 2026-08-15 from `01-inspiration-catalogue.md`, judged against the nine faults in
`00-baseline-findings.md`. Step 6 of the design process: **do not one-shot.** Three directions, built,
compared, merged.

---

## The one thing all three assume

Baseline fault #3 says the app shows you everything you own, in an order that is not relevance, and
that this is the precise mechanism behind *"I forget I have it."* Every direction below therefore
**opens the turn with a ranked shortlist** — the things that are legal, affordable, and relevant right
now — with the full inventory always one tap away, never removed.

This is a behaviour change, not a skin. It is also the single biggest lever on the 15-second target.
**It is baked into all three directions, so it is the one assumption to kill now if it is wrong.**

What makes the three genuinely different is *how each one expresses rank*:

| | Direction A | Direction B | Direction C |
|---|---|---|---|
| **Rank is encoded by** | **position** — fixed zones | **illumination** — visual weight | **capacity** — a hand can't hold 18 |
| Organizing metaphor | a flight instrument | a manuscript page | objects in your hand |
| iPad becomes | a two-screen cockpit | a two-page spread | a table with a hand at its edge |
| Fails if | it feels cold | it feels slow | it feels like a card game |

They differ in kind, not in shade. Judge them on which failure you would rather risk.

---

# Direction A — THE INSTRUMENT

### Aesthetic
Everything is where it was last time. The screen is a flat field of quiet data with one loud thing in
it, and the loud thing is what you do next. No ornament, no texture, no flourish — the beauty is in
the density and the discipline. Numbers are monospaced and column-aligned so your eye lands without
reading. Gold is structure, not decoration: hairlines, rules, and zone edges. Cream carries the words.
One ember mark tells you where to act. It should feel like the instrument panel of something expensive
and dangerous that you have flown a hundred times.

### Intent — what, and why
**What:** a fixed spatial grammar applied identically to every screen and both devices. HP and AC top-left
at the largest size. Conditions and threats top-right. The ranked action zone occupies the lower-centre —
where the eye rests. Reference lives in a strip you never have to enter. Nothing ever moves between zones.

**Why:** C1 (F1) and C2 (A320) both establish the same finding — under load, experts don't *search*, they
*detect anomalies against an expected layout*. That only works if the layout is invariant. Across a whole
campaign this compounds: by session four you are not reading the screen, you are noticing what changed on
it. This is the direction with the highest ceiling on the primary metric, because it is the only one that
gets faster the more you use it.

It also directly kills fault #2 (endless scroll): a fixed grammar has a fixed height budget per zone, so
nothing is allowed to grow past the fold.

### Borrowed from
- **C2 Airbus A320 PFD** — the fixed zone grammar; amber = impending, ember = active, no other colour carries severity
- **C4 Garmin G1000** — the iPad split: left pane is *now*, right pane is *reference*, and the split is never violated
- **C6 Philips IntelliVue** — priority encoded as size, compressed to ~2.5:1 for close viewing
- **C1 F1 wheel** — urgency as chromatic isolation on a flat field
- **B8 Destiny 2** — reduced to the two tiers that survive a tablet: act-now, reference
- **B4 Divinity OS2** — slots as discrete dots
- **C3 Shearwater** — the persistent mode + next-action readout along the bottom edge

### Guardrails
- **Zones are law.** A thing may not appear outside its zone to "fit." If it doesn't fit, the zone's
  content is over budget and something must be summarized — never relocated.
- **One loud thing.** At most one ember element on screen at a time. Two ember elements means the
  hierarchy has failed, and it should be treated as a bug.
- Gold is hairlines and rules only. **Under 20% coverage** (see catalogue). No gold fills.
- **Size ratio largest:smallest ≤ 2.5:1.** C6's 6:1 ratio screams at 40cm.
- Monospace for every number that can change. Proportional for every word.
- No animation longer than 200ms anywhere. Motion is state feedback, not ceremony.
- The pre-computed to-hit line is never truncated, never behind a tap, never abbreviated.

### Risks
**It can read as cold** — this is a grimoire for a paladin, not an avionics suite, and Direction A spends
the app's romance to buy speed. The failure mode is a beautiful spreadsheet that you respect and don't love.
Secondary risk: C2's own caveat — a fixed grammar assumes study, and you may open a screen for the first
time mid-combat. Every zone must be self-labelling on first encounter, which costs some of the density
the direction is buying.

---

# Direction B — THE ILLUMINATED SPREAD

### Aesthetic
A page from a book that someone made by hand, for you, about your character. Structure comes from the
manuscript tradition and not from texture: a strict three-layer depth where the body text, the red
instruction, and the marginal note never argue because they never sit in the same place. What matters
now is *illuminated* — gold initial, heavier weight, a rubric cue in dried-blood ember; what doesn't is
plain text further down the page. On the iPad it is a true two-page spread with a real gutter. It should
feel like the object is old, the ink is still wet, and the page knows what you are about to do.

### Intent — what, and why
**What:** rank expressed as illumination. Medieval scribes did not sort a page — they made the important
thing *bigger, gilded, and marked in red*, and left everything else as body text on the same page. Applied
here: your five live options are illuminated entries at the top of the recto; your other thirteen are
plain, smaller, and still right there — visible, not hidden behind "+6 more."

**Why:** this is the only direction where the ranking mechanism and the visual identity are the *same
decision*. In A, ranking is a layout rule bolted onto an instrument. In C, it's a capacity constraint.
Here, illumination *is* rank — which means the app cannot drift back toward flat lists without visibly
ceasing to look like itself. The metaphor enforces the behaviour.

It also solves fault #1 better than anything else: a two-page spread is not a wider phone, it is a
different object. Verso holds the encounter state; recto holds your options; the gutter is the divide.
And it solves the "+6 more" problem by never hiding anything — a real advantage over both A and C.

### Borrowed from
- **D2 Très Riches Heures** — three spatial layers: core text, rubric, marginalia, never co-located
- **D4 Rubrication** — ember `#c06030` used *exclusively* for "what you do right now," never for content
- **D3 Lindisfarne** — the scale ramp inside the first line, so the drop cap is functional not decorative
- **D5 Hochuli / D6 Tschichold** — 55–65 character measure; buy room with leading, not gutters
- **A4 Golden Thread** — illustration and chrome as the same material, with the 2px stroke floor enforced
- **F4 + F2** — gold tonal elevation and a specular top edge, because you cannot shadow into black
- **E4 Notability** — lateral navigation within a persistent hierarchy; no back button

### Guardrails
- **Rubrication is absolute.** Ember means "act now" and nothing else, ever. The moment ember labels a
  piece of content, the system is dead — this is exactly how anti-pattern 3 kills a palette.
- **Gold coverage 5–15%**, Book of Kells discipline. Past ~20% the figure/ground inverts.
- **Cinzel never below 20px; Cinzel Bold below 24px.** Hairlines alias to grey at 2× and the effective
  contrast collapses to ~4:1 despite the 8.40:1 nominal.
- **No parchment texture. No noise stack. No vignette.** Anti-pattern 4 is this direction's specific
  death, and A5 is the proof. Depth comes from *tone and position*, never from filters.
- Marginalia collapses to a bottom sheet on phone. It does not shrink — it moves.
- Layers may never be co-located. If a rubric needs to sit inside the body zone, the layout is wrong.
- Transitions ≤200ms and near-subliminal (D1's caveat: over 300ms reads as lag at a table).

### Risks
**This is the direction most likely to be slower than it looks.** Every ornament is a millisecond, and
the manuscript logic wants a page to be *composed*, which is in tension with a 15-second turn. The
guardrails above are unusually strict precisely because this direction's beauty is also its failure mode.
Second risk: illumination as rank has a resolution limit — it distinguishes "important" from "not" well,
but it cannot cleanly express *five ranked things* the way position or capacity can.

---

# Direction C — THE HAND

### Aesthetic
Your options are objects, and you are holding them. A hand of cards sits along the bottom edge, always
there, always the things you can actually do this turn — lift one with your thumb and it rises, press it
and it depresses into the surface, spend it and it slides away leaving a warm trail where it was. Above
the hand is the encounter. Nothing is a list; everything is a thing with weight and edges that catches
light on its top rim. It should feel less like reading an app and more like the moment before you put a
card down on a table.

### Intent — what, and why
**What:** rank enforced by capacity. A hand physically holds five cards. The sixth cannot be in your hand
— it is in the deck, one tap away. There is no design decision to make about "how many to show," because
the metaphor already answered it, and no future session can quietly grow the list back to eighteen.

**Why:** A and B both rank by *rule*, and rules erode. C ranks by *structure*, and structure doesn't.
This is the direction most resistant to the exact regression that produced the current baseline.

It is also the strongest on the moments that make the app feel good: F5's press physics, B2's residue
trail on a spent slot, A8's single skinnable result card for dice, casts, and death saves. Slice 3 already
built a GPU dice stage; this is the only direction whose visual language the dice stage already belongs
to, which also fixes fault #5 — the violet button stops being a foreign object bolted to the corner and
becomes the natural home of the same material.

On iPad the hand runs the full lower width and fans; the encounter occupies the table above it. That is a
genuinely tablet-shaped layout rather than a stretched phone.

### Borrowed from
- **B10 Alan Wake 2** — the *hand*, extracted deliberately without the case board (see anti-pattern 6)
- **F5 objects-not-rectangles** — `scale(0.97)` + `brightness(0.88)`, 80ms in / 120ms out
- **B2 Elden Ring** — spent resources leave a residue trail rather than vanishing
- **A8 Kostevski** — one skinnable result-moment container for every outcome type, at 20% of the dwell
- **A3 Tarot** — full-viewport reveal, restricted to the *detail* view only
- **F2** — specular top edge as the light-catching rim that makes a card read as an object
- **B1 BG3** — reaction prompts reduced to name / cost / skip, **plus the effect summary BG3 omits**

### Guardrails
- **Five in hand, maximum.** Not six "just this once." The cap is the feature.
- **The deck is always one tap and never more.** Nothing is ever unreachable — the V0.9 prime law binds
  here hardest, because a hand metaphor makes hiding things feel natural, and hiding things is the fault
  we are fixing.
- **Cards carry the maths.** The pre-computed to-hit line goes on the card face, not behind a flip.
  A card you must turn over to read is a scroll with extra steps.
- **48×48pt minimum, 12pt gaps.** Cards are handled with dice in the other hand.
- **Press physics need `will-change: transform`** or the shadow repaints per frame; ship an opacity-only
  `prefers-reduced-motion` path.
- No card flip animations over 200ms. No fan-out that requires precision to target — anti-pattern 5's
  lesson applies to fanned cards exactly as it does to radials.
- **It must not become a card game.** No hand-size mechanics, no drawing, no discard rules. The hand is
  a container, not a system.

### Risks
**The metaphor can overreach.** D&D is not a card game, and a hand of cards can make a paladin's oath feel
like a deckbuilder. Second: card faces have a hard size floor — five cards across 390px is 78px each,
which is not enough for a spell name plus the to-hit line, so the phone hand must be a horizontally
scrollable strip of larger cards rather than a literal fan, which weakens the "capacity" argument it is
built on. That tension is the thing to look at hardest in the mockup.

---

## How each answers the six criteria

From `00-baseline-findings.md`. Scored on the design intent, to be re-scored against the built mockups.

| Criterion | A — Instrument | B — Spread | C — Hand |
|---|---|---|---|
| **1. Does it rank?** | by zone — strong, rule-based | by illumination — strong on important/not, weaker on ordering five | by capacity — strongest, structurally enforced |
| **2. Does it use the iPad?** | two-screen cockpit, never violated | true spread with a gutter — most *iPad-shaped* | table + full-width hand |
| **3. Above the fold?** | best — fixed height budget per zone | good, but composition wants room | good above the hand; the hand costs vertical space |
| **4. Does it press what matters?** | strongest — one loud thing, by construction | strong — rubrication is purpose-built for this | medium — needs the reaction prompt to carry it |
| **5. Maths stays visible?** | native — it is a data instrument | needs care; ornament competes | on the card face, by guardrail |
| **6. One language?** | yes, and the most enforceable | yes, and the most *identity* | yes, and the only one the dice stage already fits |

**My read, for what it is worth before you see them:** A wins the metric, B wins the identity, C wins the
feel. The merge I would expect to want is **A's zone grammar carrying B's rubrication and type, with C's
object physics on the interactive elements** — but that is a prediction, and the point of building three
is that predictions about design are usually wrong. Look at them first.

---

## What gets built

Two screens per direction, six files — the phone turn and the iPad turn spread, because that is where the
metric lives and where the language is actually decided:

| File | Direction | Screen |
|---|---|---|
| `mockups/a-instrument/01-turn.html` | A | Combat, phone 390×844 |
| `mockups/a-instrument/02-turn-spread.html` | A | Combat, iPad 1366×1024 |
| `mockups/b-spread/01-turn.html` | B | Combat, phone |
| `mockups/b-spread/02-turn-spread.html` | B | Combat, iPad |
| `mockups/c-hand/01-turn.html` | C | Combat, phone |
| `mockups/c-hand/02-turn-spread.html` | C | Combat, iPad |

All six show the same seeded state as the baseline capture — Vaelin Ashgrove, level 8 Oath of Vengeance
Paladin, 41/76 HP, 5 temp, concentrating on Bless, frightened, slots partly spent — so they are directly
comparable to `reference/baseline/` and to each other.

Grimoire, Identity, and Dice follow **after** a direction is chosen or merged. Building fifteen mockups
across three languages that have not been judged yet is the exact waste that "do not one-shot" is warning
about; the turn screen decides the language and the rest inherit it.

Mockups load fonts from the Google CDN for convenience. **The real app self-hosts** — offline at the table
is a Gate 1 guardrail (`01-product.md`), and `src/fonts/fonts.css` currently violates it.
