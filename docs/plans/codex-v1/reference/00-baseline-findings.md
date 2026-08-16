# V0.9 baseline — observed, not remembered

Captured 2026-08-15 against `localhost:5173/the-codex/` with a seeded level-8 Oath of Vengeance
Paladin mid-fight (41/76 HP, 5 temp, concentrating, frightened, slots partly spent).
Fixture: `seed-character.mjs` · capture: `shoot-baseline.mjs` · images: `baseline/`.
Three viewports (phone 390×844, iPad 1024×1366, iPad 1366×1024) × two modes × every tab.

**This file exists so the redesign argues with reality instead of with memory.**

---

## What is already good — and is therefore protected

Judged against real D&D tools, several of these are genuinely uncommon. None may be lost.

- **The action-economy strip** (Action · Bonus · React · Move) sits at the top of combat and is the
  single best idea in the app. Most tools do not model the economy at all.
- **Attack maths are pre-computed and shown**: `+8 to hit (STR +4 + prof +1 magic) · 1d8+5 Slashing · 5 ft`.
  The player never does arithmetic. This is the difference between a sheet and a companion.
- **"Always Active" passives are surfaced** — Aura of Protection, Extra Attack, Fey Ancestry pinned
  where you can see them. Passives are the most-forgotten capability in 5e and the app already knows it.
- **Actions are grouped by economy** (ACTION / BONUS ACTION / REACTION), not by source. Correct instinct.
- **Spell slots render as sigil pips** with per-level counts — readable at a glance, no counting.
- **Round number + YOUR TURN + Next Turn** are unambiguous.
- **It boots clean and fast**, with zero runtime errors on any surface at any viewport.

## What is actually wrong

Ordered by impact on the primary metric (turn latency).

### 1. The iPad is a stretched phone — the single biggest miss
`ipad-landscape--session--combat.png` · `ipad-landscape--session--grimoire.png`

At 1366×1024 the content sits in a narrow centred column with a nav rail on the left and
**roughly a third of the screen simply empty**. Every tab, both modes. The layout is byte-similar to
the 390px phone with more margin. Slice 5a shipped the rail; 5b — the actual side-by-side — never landed.

This is pure, free screen real estate on the primary device. The Grimoire could live beside Combat.
Nothing needs to be invented to fix it; the surfaces already exist.

### 2. Everything is a scroll, and scrolling is the metric
Measured `document.scrollHeight` on phone: **Combat 2,942px** (3.5 screens) · Character 3,532px ·
Persona 2,998px · Grimoire 2,529px · Academy 2,074px.

On your turn, with five people watching, the thing you need is below the fold roughly two thirds of
the time. Every one of those pixels is turn latency.

### 3. Nothing is ranked — the app shows you everything you own
`phone--session--combat.png`

The ACTION list runs Oathkeeper, Javelin, Divine Smite, Bless, then **"+6 more"** behind a tap.
The order is not relevance; the hidden six are not the worst six. The Grimoire is worse: 18 entries
in flat alphabetical order — Aura of Protection, Abjure Enemy, Vow of Enmity, Divine Sense, Extra
Attack, Fey Ancestry, Lay on Hands, Relentless Avenger, Sacred Flame…

The stated problem in `01-product.md` is *"I forget I have it."* An alphabetical list of everything
you own is the precise mechanism that causes it. **This is the highest-leverage change in V1.0.**

### 4. Concentration whispers when it should shout
The character is concentrating and frightened. The app renders `⚠ Concentrating, Frightened` as small
red text on one line — it does not say **what** is being concentrated on, or that taking damage
threatens it. Concentration is the most commonly dropped rule at real tables, and the app knows the
state but does not press it.

### 5. The dice button is off-palette and covers content
A violet (`eldritch #8b5cf6`) circular button floats bottom-right on **every screen at every
viewport**, overlapping content. It is the one element in the app that does not belong to the
gold-on-ash language, and it sits on top of the resource pips at the bottom of the combat surface.
Slice 3 built a genuinely beautiful GPU dice stage behind it; the door to it is the ugliest object
on screen.

### 6. The header is crowded and the character loses their name
Phone header: PLAY/PREP toggle · `41/76 +5` pill · three icon buttons · `Vael…` truncated.
Six controls competing above the fold on the smallest screen, and the one piece of identity —
the character's name — is the thing that gets cut.

### 7. Type does not scale with the device
Body text is the same size on a 1366px iPad as on a 390px phone. At tablet distance — the iPad flat
on a table, read at arm's length, in bad light — the secondary text (`1st-level · +8 to hit · 2d8 Radiant`)
is materially harder to read than it is on the phone held close.

### 8. A real DOM bug: nested buttons
`src/components/grimoire/GrimoireCard.tsx:68` renders a `<button>` inside a `<button>`, which React
flags on every Grimoire render at every viewport:
`validateDOMNesting: <button> cannot appear as a descendant of <button>`.
Invalid HTML with genuinely undefined tap behaviour on touch — the exact device this is used on.
Fix regardless of what the redesign decides.

### 9. Two visual languages coexist
`glass-card` / `parchment-card` (12 tokens in `src/index.css @theme`) and a separate `brass/`
subsystem of 7 components. Both ship. Neither is documented as the winner.

---

## What this means for the three directions

Every direction must be judged against these, in this order:

1. **Does it rank?** Does the turn open with the right five things, or with everything?
2. **Does it use the iPad?** Two-page spread, or a wider phone?
3. **Does it fit above the fold?** How much of the turn is visible without a scroll?
4. **Does it press what matters?** Concentration, reactions owed, resources about to be wasted.
5. **Does it keep the maths visible?** The pre-computed to-hit line is non-negotiable.
6. **Is it one language?** One card system, one accent logic, one home for the dice.
