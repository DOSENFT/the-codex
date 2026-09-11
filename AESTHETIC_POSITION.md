# AESTHETIC POSITION — The Codex

**Position:** Tactical Grimoire
**One sentence:** A 14th-century illuminated codex rebuilt as a sub-100ms tactical instrument.
**Brand DNA:** A scriptorium scribe designed a Formula-1 cockpit, then a senior product designer at Linear made sure every tap responded in 80ms.

---

## Typography

### The System (3 fonts, 3 registers)

| Role | Font | Register | Usage |
|------|------|----------|-------|
| **Display** | Cinzel (already installed) | Authority, ceremony, gravitas | Section headers, character name, "The Codex" wordmark, drop caps, illuminated initials |
| **Body** | IBM Plex Sans (already installed) | Clarity, legibility, precision | Spell descriptions, AI responses, condition text, all readable content |
| **Numeric/Code** | JetBrains Mono (already installed) | Technical truth, tabular data | HP values, ability scores, AC, damage rolls, spell slots counts, all numbers |

### Typographic Hierarchy (Mobile-First at 375px)

| Level | Font | Size | Weight | Tracking | Usage |
|-------|------|------|--------|----------|-------|
| Display Hero | Cinzel | 28-32px | 700 | 0.06em | Character name on combat tab |
| Section Title | Cinzel | 14-16px | 600 | 0.12em uppercase | "Spell Slots", "Smart Actions", section labels |
| Body Large | IBM Plex Sans | 16px | 400 | 0 | Spell descriptions, AI oracle responses |
| Body | IBM Plex Sans | 14px | 400 | 0.01em | General content, condition effects |
| Caption | IBM Plex Sans | 12px | 500 | 0.02em | Metadata, subtitles, secondary info |
| Micro | IBM Plex Sans | 10-11px | 600 | 0.08em uppercase | Tab labels, pip counts, timestamps |
| Stat Value | JetBrains Mono | 20-28px | 700 | -0.02em | HP number, AC, ability scores |
| Stat Label | JetBrains Mono | 10px | 500 | 0.15em uppercase | "HP", "AC", "SPD", slot counts |

### Typographic Rules
1. **Tabular figures everywhere numbers appear.** HP, AC, damage, spell slots, ability scores — all JetBrains Mono with `font-variant-numeric: tabular-nums`.
2. **Display font is NEVER used for body text.** Cinzel at small sizes is illegible. 14px minimum.
3. **Drop caps for Oracle responses.** First letter of AI text → illuminated initial at 2.5× body size, Cinzel 700.
4. **No bold body text for emphasis.** Use gold color or weight 600 sparingly. Bold walls are the anti-pattern.
5. **Section headers always uppercase + tracked.** Creates manuscript chapter-heading cadence.

---

## Color System (OKLCH)

### Canvas & Surface (Warm Ash Dark — NOT cool blue/grey)

| Token | Value | Hex Approx | Usage |
|-------|-------|-----------|-------|
| `--ash-deep` | `oklch(0.12 0.01 60)` | #0a0a08 | App canvas, deepest background |
| `--ash-warm` | `oklch(0.16 0.01 60)` | #12110e | Card backgrounds, elevated surfaces |
| `--ash-mid` | `oklch(0.20 0.01 55)` | #1c1a15 | Hover states, nested containers |
| `--ash-light` | `oklch(0.25 0.012 55)` | #262320 | Borders visible on ash-warm |

### Text (Parchment Cream — never pure white)

| Token | Value | Hex Approx | Usage |
|-------|-------|-----------|-------|
| `--ink-primary` | `oklch(0.92 0.02 80)` | #f0e6d3 | Primary text, headings |
| `--ink-secondary` | `oklch(0.75 0.02 70)` | #bfb5a0 | Secondary text, descriptions |
| `--ink-muted` | `oklch(0.50 0.015 60)` | #7a7265 | Tertiary, timestamps, disabled |
| `--ink-ghost` | `oklch(0.35 0.01 60)` | #4a4540 | Placeholder, expended state |

### Accent — Gold Metallic (The Single Precious Color)

| Token | Value | Hex Approx | Usage |
|-------|-------|-----------|-------|
| `--gold` | `oklch(0.72 0.10 80)` | #c5a55a | Primary accent — active states, CTA |
| `--gold-bright` | `oklch(0.80 0.12 80)` | #d4b76a | Hover, highlight, illumination |
| `--gold-dim` | `oklch(0.55 0.07 75)` | #8b7355 | Borders, subtle ornament, inactive |
| `--gold-ghost` | `oklch(0.35 0.04 75)` | #5a4f3d | Expended states, ghost outlines |

### Semantic (Functional Colors — Thematic Names)

| Token | Value | Hex Approx | Semantic | Usage |
|-------|-------|-----------|----------|-------|
| `--blood` | `oklch(0.50 0.18 25)` | #c53030 | Danger/Critical | Low HP, death saves failed, critical failures |
| `--ember` | `oklch(0.65 0.15 55)` | #e8924a | Warning/Attention | Conditions active, concentration threatened |
| `--verdant` | `oklch(0.60 0.14 155)` | #39d98a | Success/Healing | Healing, HP restored, saves succeeded |
| `--arcane` | `oklch(0.55 0.14 290)` | #8b5cf6 | Magic/Spell | Spell slots available, arcane school |
| `--radiant` | `oklch(0.75 0.10 90)` | #d4a74a | Divine/Holy | Paladin features, Channel Divinity |

### Color Rules
1. **Gold is the ONLY accent on default surfaces.** Arcane purple appears ONLY on spell-related elements. Ember ONLY on warnings. Blood ONLY on critical danger.
2. **Never more than 2 non-neutral colors visible simultaneously** within a single card/section.
3. **Dark mode is NOT a theme option — it is the ONLY mode.** The ash canvas IS the brand. Light mode is not planned.
4. **Border color is always `--gold-dim` at 15-30% opacity.** Never full-strength gold borders. They burn hot and lose elegance.
5. **Backgrounds always use the warm hue (60-80 on OKLCH hue axis).** Never shift to cool blue/grey. Even at 12% lightness, the warmth must be perceptible.

---

## Motion Vocabulary

### Easing Curves

| Name | Value | Character | Usage |
|------|-------|-----------|-------|
| `--ease-snap` | `cubic-bezier(0.2, 0, 0, 1)` | Instant commit, like a stamp pressing | Toggles, pip taps, action economy marks |
| `--ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | Gravitational landing | Elements arriving, dice landing, cards appearing |
| `--ease-ceremony` | `cubic-bezier(0.65, 0, 0.35, 1)` | Controlled, deliberate, ritual | Rest confirmation, spell casting, state transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Quick departure | Dismissals, menu close, element exit |

### Duration Tiers

| Tier | Duration | Character | Usage |
|------|----------|-----------|-------|
| **Micro** | 80ms | Sub-perceptual commit | Toggle states, press feedback, pip fill |
| **State** | 150ms | Acknowledged | Hover, focus, active state changes |
| **Transition** | 280ms | Deliberate | Panel open/close, tab switch, card entrance |
| **Ceremony** | 480ms | Ritual weight | Spell cast confirmation, rest completion, level up |
| **Theater** | 800ms+ | Rare narrative moment | First load, character creation reveal, nat 20 celebration |

### Motion Rules
1. **Combat interactions are ALWAYS micro (80ms) or state (150ms).** A player mid-combat cannot wait 480ms for a toggle. Speed is respect.
2. **Ceremony tier is reserved for CONSEQUENTIAL actions:** casting a spell, completing a rest, confirming a permanent state change. These moments EARN the weight.
3. **Theater tier appears at most once per session.** The cinematic loader. The character reveal. The nat 20. If everything is theatrical, nothing is.
4. **No spring physics.** Springs feel iOS-casual. This is a codex. Controlled easing only.
5. **No bounce.** Elements arrive and stop. They don't overshoot. A quill doesn't bounce off parchment.
6. **Scale feedback is always DOWN (0.95-0.97), never up.** Pressing into the page, not popping off it.
7. **Opacity transitions pair with transform.** Nothing fades without also moving. Pure opacity fade = lazy.

---

## Composition Rules

### Layout Principles
1. **Full-width cards on mobile (375px).** No horizontal padding gaps between card and screen edge — the card IS the canvas section. Padding lives INSIDE the card.
2. **Vertical rhythm uses 8px base grid.** All spacing divisible by 8: 8, 16, 24, 32, 48, 64.
3. **Section headers are ALWAYS preceded by a hairline divider.** The divider IS the section boundary. No naked headers floating in space.
4. **Dense combat information left-aligns.** Stats, HP, slots — flush left for scan speed. Only brand/title elements center.
5. **Touch targets are 44px minimum. Combat-critical targets are 48px.** The HP stepper, action economy, spell slots — these are hit in adrenaline. Oversizing is correct.

### Container Hierarchy (4 levels, not 1)
1. **Surface** — `ash-warm` background, no border. The ambient layer. Used for: spell list items in browse mode, settings rows, accordion content.
2. **Card** — `ash-warm` bg + `gold-dim/15` border + 12px radius. The standard container. Used for: action cards, spell cards, condition pills.
3. **Panel** — `ash-mid` bg + `gold-dim/25` border + 16px radius. Elevated container. Used for: spell slot section, action economy section, smart actions grid.
4. **Ritual Frame** — `ash-warm` bg + `gold/30` border + ornate corner marks + 12px radius. The ceremonial container. Used for: Oracle response, rest confirmation, character reveal. RARE.

### Ornament Rules
1. **Hairline dividers use the gold gradient:** `linear-gradient(90deg, transparent, var(--gold-dim), transparent)` at `opacity: 0.4`.
2. **Corner marks (parchment corners) appear ONLY on Ritual Frame containers.** Not on cards, not on panels. Overuse destroys their ceremony.
3. **Drop caps appear in exactly two places:** Oracle AI responses and the Setup Wizard character reveal.
4. **Marginalia** (small aside text in the gutter) appears in the post-combat summary and the mechanics reference. Nowhere else.
5. **Ornament is ALWAYS functional.** It marks a section boundary (divider), signals rarity (corner marks), establishes voice (drop cap), or provides context (marginalia). Never decorative.

---

## Imagery Rules

### What IS present:
- Custom SVG sigils (spell slots, conditions, damage types, schools of magic)
- Custom SVG illuminated initials (A, B, R, M for action economy; Oracle drop caps)
- Inline SVG ornaments (dividers, corner marks, header decorations)
- Class crests (commissioned per class, hero-sized)

### What is NOT present:
- No photographic imagery
- No AI-generated atmospheric art (the 7 bg PNGs are removed)
- No illustration beyond sigils and initials
- No textures as background-image (all texture is implied through color layering)
- No gradients that simulate 3D form (no glossy buttons, no pseudo-depth)

### The principle:
Everything visual is either **typography** or **a drawn mark** (sigil, glyph, initial). The app's visual world is the world of ink on vellum — marks made by a hand with a quill. This limits the vocabulary to: lines, strokes, fills, letter-forms, and ruled margins. NOTHING else.

---

## The Forbidden List

These are the specific failure modes this position prohibits. Any of these appearing in the build is a regression:

1. **Generic Lucide icons used decoratively.** Lucide is permitted for navigation (tabs) and utility (close, chevron, search). It is FORBIDDEN for signature elements (spell slots, conditions, damage types, action economy). Those get custom sigils.
2. **Purple/blue gradient highlights.** The arcane purple appears ONLY on spell-related fills. Never as a gradient. Never as a highlight. Never on borders.
3. **Bouncy spring physics.** No overshoot. No wobble. No iOS-casual spring feel.
4. **border-radius > 16px.** No pill shapes. No 999px radii on containers. This is a codex with ruled edges, not an iOS app with lozenges.
5. **Box-shadow used for "depth."** Shadows are permitted ONLY for: the dice roller panel (overlay), the character sheet (overlay), and the FAB. Cards do NOT have box-shadow in their resting state.
6. **Backdrop-blur (glassmorphism).** Remove all `backdrop-blur`. Glass is a material of modernity. Vellum is opaque.
7. **Multiple colors on a single interactive element.** A button is gold OR neutral. A badge is one semantic color. No rainbow. No multi-accent.
8. **Comic/fantasy cliché imagery.** No dragons, no dungeons, no swords-crossed icons used decoratively. The brand is the BOOK, not the adventure.
9. **Animation on idle elements.** `pulseGlow` infinite animation is removed. Nothing pulses when not being interacted with. The page is STILL until the player acts.
10. **Large-radius rounded containers with backdrop-blur and 1px gold border.** This is the specific "shadcn dark mode with gold accent" look that defined the old build. Eliminated.
