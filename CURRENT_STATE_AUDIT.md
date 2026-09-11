# CURRENT STATE AUDIT — The Codex

**Date:** 2026-05-11
**Auditor verdict:** The owner is correct. This is not a $200/month product.
**Current position occupied (accidentally):** "Dark React App with Gold CSS Borders"
**Target position:** "Illuminated Tactical Grimoire — a 14th-century scriptorium designed a Formula-1 cockpit"

---

## Section A — What Works

Credit where due. These are genuinely solid and will survive the rebuild:

1. **Architecture is excellent.** 48 components across 9 product surfaces, clean domain separation (16 lib modules), composable sub-components for combat. A future developer could onboard in 30 minutes. This doesn't need touching.

2. **Feature completeness is remarkable.** All 9 surfaces described in the product brief are implemented and functional: Combat tab with full action economy, Spellbook with search/filter/CRUD, Academy with 7 drill modes including spaced repetition, Identity system with Toy Method persona engine, Character Setup wizard with AI generation. Nothing is stubbed.

3. **Touch targets are correct.** Spell slot pips: `min-h-[44px] min-w-[44px]`. Die buttons: `44×44`. Action cards: `min-height: 44px`. Bottom nav tabs: `min-h-[48px]`. This is properly mobile-first engineering.

4. **Accessibility foundations are present.** `aria-label` on interactive elements, `aria-live="polite"` on dynamic values, `role="tablist"` on nav, `aria-selected` on tabs, `focus-visible` gold outline. Keyboard order follows DOM.

5. **Press feedback exists everywhere.** `active:scale-[0.95]` to `active:scale-[0.97]` on all interactive elements. Transitions use the custom `ease-forge` curve. This gives appropriate haptic-like feedback.

6. **The color palette is directionally correct.** `void-0: #0a0a08` (warm near-black), `forge-0: #f0e6d3` (parchment cream), `gold: #c5a55a`, `arcane: #d4a74a`. The hue family is right. The execution is flat.

7. **Font choices are appropriate.** Cinzel for display (period-correct serif), IBM Plex Sans for body (excellent legibility at small sizes), JetBrains Mono for stats/numbers. Three-font system with correct register assignment.

8. **Safe-area-inset-bottom is respected.** Bottom nav and FAB position account for iOS home indicator. `min-height: 100dvh` is used. `overscroll-behavior: none` prevents elastic scroll.

9. **The AI integration is clean.** Provider abstraction with Gemini + Ollama fallback, centralized prompts, character-aware context injection. The Oracle works.

10. **Data model is sound.** Multi-character roster in localStorage, per-character combat state, damage log with timestamps, spaced repetition SM-2 algorithm. Zero backend dependencies.

---

## Section B — What Fails

### CRITICAL (Combat Tab — where players live)

| # | Component/Path | Issue | Law Violated | Evidence | Fix |
|---|---|---|---|---|---|
| B1 | `combat/SpellSlotPips.tsx` | Spell slot pips are generic colored circles (`rounded-full bg-eldritch/30 border-2 border-eldritch/60`). Zero distinction from any other dark-mode app. A $200/month grimoire's spell slots should be SIGILS that burn out when expended. | Law 14: One Weird Thing | Purple dots with a glow box-shadow. No SVG. No custom ornament. No animation on state change. | Replace with custom sigil SVGs per level. Animate expend (burn-out) and restore (rekindle). |
| B2 | `index.css` `.hp-bar` | HP bar is a flat 4px-tall rounded rectangle with a color transition. No weight, no texture, no ink-bleed, no parchment. Functionally correct but visually generic. | Law 15: Motion Signature | `height: 4px; border-radius: 999px; transition: width 0.4s`. Standard progress bar. | Ink HP Bar: SVG/canvas mask with organic edges, ink-spread distortion on damage, quill-stroke fill on heal. Height → 8px minimum for glanceability. |
| B3 | `CombatHelper.tsx` line ~90-100 | Action Economy is text labels ("Action", "Bonus", "Reaction", "Movement") as toggle buttons with no distinction from other buttons. These are the FOUR MOST TAPPED ELEMENTS on the combat tab. | Law 16: Typography as Character | Generic `action-card` class: `padding: 0.5rem 0.625rem; border: 1px solid rgba(197, 165, 90, 0.15)`. Same treatment as everything else. | Illuminated initials (A, B, R, M) in ornate frames. Spent state inverts — the letter fills in as if marked by a quill. Each initial is visually distinct. |
| B4 | `combat/CharacterHero.tsx` | Portrait frame is triple-ring CSS borders with rotated-square "notches." It's trying to be ornate but executes as CSS decoration. Looks like a tutorial exercise in pseudo-elements, not an illuminated manuscript. | Law 13: Position Declared | Pure CSS: `.portrait-frame-outer`, `.portrait-frame-mid`, `.portrait-frame-inner` with `border: 2px solid rgba(...)`. Diamond notches are `8px` rotated squares. | Custom SVG portrait frame inspired by actual manuscript illumination. Commission through image-gen pipeline. Reduce complexity — the current triple-ring reads as over-engineered, not elegant. |
| B5 | Condition Alert Banner | Conditions display as `text-[11px] font-bold text-ember uppercase tracking-wide` text strings. No glyphs, no iconography, no severity visualization beyond color. At distance, they're unreadable. | Law 17: Awwwards Question | Font-size 11px. Pure text. No visual distinction between "Paralyzed" (catastrophic) and "Prone" (minor). | Custom condition glyphs as SVG. Size increase to 14px minimum. Severity color-coding + glow intensity. Banner ornament end-caps for premium feel. |
| B6 | Rest Management | `rest-card` is the same card treatment as everything else. Short Rest / Long Rest are the most CONSEQUENTIAL buttons on the screen (they reset the entire combat state). They don't look any more important than "Dash." | Law 8: Press Feedback | Same `border-gold/15 rounded-xl` as spell slots, actions, conditions. Confirmation state adds a glow but no ceremonial weight. | Wax-seal button treatment. These are commitments. They should feel like pressing a seal into hot wax — scale, rotation, deep-press shadow, stamped confirmation. |

### HIGH (Dice Roller — used every round)

| # | Component/Path | Issue | Law Violated | Evidence | Fix |
|---|---|---|---|---|---|
| B7 | `DiceRoller.tsx` + `DiceAnimation.tsx` | Dice animation is a CSS 3D rotation (`rotateX(720deg) rotateZ(360deg) scale(1)` in 0.4s). No physics. No weight. No settling. The "land" is a basic scale bounce. Feels mechanical, not ceremonial. | Law 15: Motion Signature | `@keyframes diceTumble { ... rotateX(720deg) ... }` — uniform rotation. Every die rolls identically. Nat 20/1 get no distinct treatment in the animation itself. | Dice as falling objects with settling physics. Varied tumble per die type. Nat 20 → golden afterglow. Nat 1 → brief ember pulse. Distinct parchment-landing "thunk" feel via scale/shadow. |
| B8 | `DiceRoller.tsx` | Die display is a `4.5rem × 4.5rem` rotated square with a border. The result sits inside at `1.75rem font-mono`. Functional but has zero codex/grimoire character. | Law 13: Position Declared | `.dice-display { width: 4.5rem; height: 4.5rem; border: 2px solid rgba(...); transform: rotate(45deg); }` — a CSS diamond shape. | Custom die face SVGs for each type (d4-d20). Actual die shapes rendered as designed objects, not rotated squares. |
| B9 | Die type selector | Die buttons are `44×44 rounded-full` circles with `font-mono text-sm`. They work, but they're generic toggle buttons. | Law 14: One Weird Thing | `rounded-full bg-gold/[0.04] text-forge-1 border border-bronze/25`. Could be from any app. | Each die button shaped like its actual polyhedron silhouette. d4 = triangle, d6 = square, d8 = diamond, d12 = pentagon, d20 = icosahedral silhouette. SVG masks. |

### HIGH (Spellbook — used every combat round)

| # | Component/Path | Issue | Law Violated | Evidence | Fix |
|---|---|---|---|---|---|
| B10 | `Spellbook.tsx` | Spell cards use `GlassCard` — the same glass-morphism treatment as every other container in the app. A grimoire's spell entries should feel like pages, not cards in a generic card list. | Law 13: Position Declared | Same `glass-card` CSS: `background: rgba(18, 17, 14, 0.92); border: 1px solid rgba(197, 165, 90, 0.2); border-radius: 1rem;` | Spell cards as parchment pages. School-of-magic sigil watermark. Drop cap on spell name. Hairline ruled margins. Each card feels like a page torn from the actual codex. |
| B11 | Spell school badges | Schools of magic are `Badge` components — colored text pills. No iconography. Evocation and Necromancy are distinguished only by hue (ember vs eldritch). | Law 14: One Weird Thing | `<Badge variant="ember">Evocation</Badge>`. A text label with a background tint. | Custom sigil per school (8 schools = 8 distinct glyphs). The glyph is the primary identifier; text is secondary. |

### HIGH (Setup Wizard — first impression)

| # | Component/Path | Issue | Law Violated | Evidence | Fix |
|---|---|---|---|---|---|
| B12 | `CharacterSetup.tsx` | The onboarding wizard is the FIRST thing a new $200/month customer experiences. If it looks like a generic form wizard, they refund. Currently uses standard inputs + the same glass-card containers. | Law 17: Awwwards Question | Standard form inputs with the same visual language as the rest of the app. No theatrical moment, no ceremony, no "this is premium." | The wizard should feel like opening a new tome. Each step = turning a page. AI generation phase = quill inscribing. The 3-8 second AI wait is a DESIGN OPPORTUNITY, not dead time. |

### MEDIUM (Global patterns that create the "generic" feeling)

| # | Component/Path | Issue | Law Violated | Evidence | Fix |
|---|---|---|---|---|---|
| B13 | `index.css` `.glass-card` | Used as the default container for everything. Creates monotonous sameness. 90% of visual surfaces are `rgba(18,17,14,0.92)` + `1px gold border` + `1rem radius`. | Law 12: No Decorative Motion (corollary: no decorative sameness) | Grep for "glass-card" or "GlassCard" — appears in virtually every component. | Develop 3-4 distinct container treatments: combat-card (dense, tactical), parchment-card (breathing, editorial), surface-panel (minimal, utility), ritual-frame (ceremonial, rare). |
| B14 | Bottom navigation | Tab nav items are 18px Lucide icons in 40×40 circles. Active state = gold border + gold fill. Standard mobile app treatment. | Law 13: Position Declared | `<Icon size={18} />` inside `w-10 h-10 rounded-full`. Active: `border-gold/50 bg-gold/10 text-gold`. Identical to any dark-themed mobile nav. | Tab bar needs brand personality: perhaps sigil-form icons instead of Lucide defaults, or the active indicator uses an ink-spread reveal instead of a simple border color swap. |
| B15 | Header treatment | "THE CODEX" title uses Cinzel at 22px with a CSS compass ornament (pseudo-elements making a cross + diamond). Trying for medieval, achieving "CSS tricks article." | Law 16: Typography as Character | `.compass-star` and `.compass-star-center` — pure CSS pseudo-element construction. Visually lightweight and generic. | Replace with a properly designed SVG wordmark/sigil. A product at this price point needs a crafted identity mark, not a CSS experiment. |
| B16 | `atmospheric-bg-*` classes | Background images (7 PNGs, ~500KB total) are AI-generated atmospheric art that fades to void within 350px. Barely visible on mobile. Pure weight with near-zero visual impact. | Performance | 7 × ~70KB PNGs loaded per page, visible for < 25% of viewport behind gradient overlay. | Remove all 7 PNGs. Replace with subtle CSS-only atmospheric treatments (radial gradients, noise, color shifts). Save 500KB+ from initial load. |
| B17 | Motion vocabulary | All animations are `0.3s ease-out` (`fadeIn`, `slideUp`) or the single `ease-forge` curve. No durational variety. No choreographic sequencing. No distinction between micro-interactions and state transitions. | Law 15: Motion Signature | Only 5 keyframes defined globally. `fadeIn`, `slideUp`, `pulseGlow`, `diceTumble`, `diceLand`. Everything else uses inline `transition-all duration-200`. | Define a 5-tier motion vocabulary: micro (80ms, snap), state (150ms, commit), transition (280ms, deliberate), ceremony (480ms, ritual), theater (800ms+, rare). Each tier has its own easing. |

---

## Section C — Aesthetic Position Drift

**What position does the build accidentally inhabit right now?**

**"shadcn/ui Dark Mode + Gold Accent Color + Cinzel Font."**

Specifically:
- The container system (GlassCard with rgba backdrop + 1px border + large radius) is indistinguishable from shadcn's Card component with a dark theme applied
- The color tokens are correct (warm void, parchment text, gold accent) but applied without texture, depth, or material quality
- Cinzel is the right serif but it's used generically — same weight, same tracking, no variation in treatment across contexts
- Every surface receives identical visual treatment regardless of its importance or emotional register (spell slots look like action cards look like rest buttons look like conditions)

**Distance from target:**

The target brand DNA — *"a 14th-century scriptorium designed a Formula-1 cockpit, then a senior product designer at Linear made sure every tap responded in 80ms"* — requires three qualities the current build lacks:

1. **Material quality.** A codex has ink, vellum, texture, ruled margins, illumination. The current build has flat rgba backgrounds. Nothing feels like it was drawn, pressed, or inscribed.

2. **Hierarchical distinction.** In a real codex, a heading commands authority through its size, ornament, and placement. A body paragraph recedes. A marginalia note whispers. Currently, everything speaks at the same volume.

3. **Ceremonial weight on consequential actions.** Casting a spell should feel like an incantation. Rolling a d20 should feel like casting bones. Currently, all interactions have identical 200ms transitions regardless of their narrative weight.

**The gap is not structural (architecture is solid) or chromatic (colors are right). The gap is material and behavioral.** The app needs to stop LOOKING LIKE a grimoire through CSS borders, and start BEHAVING LIKE a grimoire through custom ornament, weighted motion, and hierarchical distinction.

---

## Section D — Touch and Tactical Performance Audit

### Touch Targets
| Element | Size | Pass? |
|---|---|---|
| Spell slot pips | 44×44px | PASS |
| Die type buttons | 44×44px | PASS |
| Action cards | 44px min-height | PASS |
| Bottom nav tabs | 48px min-height | PASS |
| Icon-ring header buttons | 40×40px | FAIL (below 44px) |
| Condition toggle buttons | (inline text, ~32px hit area) | FAIL |
| HP damage/heal steppers | 44px buttons | PASS |
| Rest cards | 44px min-height | PASS |
| Character switcher items | 48px min-height | PASS |

**Failures:** Icon-ring buttons in header are 40px (4px below minimum). Condition toggles in the grid are too small for reliable thumb targeting.

### One-Handed Reachability (6.1" phone, right-hand thumb)
- Bottom nav: PASS — within natural thumb arc
- Dice FAB: PASS — right-aligned at bottom
- HP display during damage entry: No modal blocks it; inline steppers are used. PASS
- Action Economy toggles: Top of scrollable content — may require scroll on dense combat states. MARGINAL
- Spell slot pips: Mid-content — reachable. PASS

### Spellbook Speed Test
- Open Spellbook → see a specific spell: Filter is immediate (client-side). Estimate: **<1.5s** from tab switch to filtered spell visible. PASS
- Spell search uses standard `useMemo` filtering — no debounce needed at this dataset size (~30-60 spells). PASS

### Concentration Banner Glanceability
- Current: `text-[11px] font-bold text-ember uppercase tracking-wide` within a condition-alert card
- At arm's length (~3 feet): The 11px text is NOT readable. The amber alert styling helps locate the banner but the content is illegible.
- **FAIL** — needs minimum 14px, preferably with an icon that communicates "concentration active" without requiring reading.

### Performance (Estimated — no actual device throttle available)
- Bundle: <100KB gzipped JS (React 18 + app logic)
- CSS: ~15KB gzipped (Tailwind purged)
- Images: 500KB (background PNGs — excessive, removable)
- LCP: Likely <2s on good connection due to lightweight stack
- INP: Unknown — no heavy computation on interaction paths, all state updates are synchronous localStorage writes. Likely sub-100ms.
- CLS: Minimal — no lazy-loaded images or dynamic height content in combat tab

**Major performance issue:** 7 background PNGs (~500KB) provide near-zero visual value and should be eliminated.

---

## Section E — Signature Move Audit

**Does the current build have ANY signature move that defines it?**

**No.**

The closest candidates:
1. The portrait frame with triple rings and diamond notches — but it's CSS borders, not illustration. It reads as "developer who learned CSS pseudo-elements" not "studio that commissioned a brand mark."
2. The compass ornament in the header — but it's 12px, barely visible, and constructed from pseudo-elements. Not a signature move; a CSS garnish.
3. The dice tumble animation — but it's a uniform 720° rotation. Every die rolls identically. There's no weight, no physics, no ceremony. It's "animation exists" not "animation is a feature."
4. The atmospheric background images — but they fade out within 350px and are AI-generated generic fantasy art. They're the OPPOSITE of a signature move: they say "this developer used Midjourney once."

**The product currently has zero elements that a user would describe to a friend.** No one opens The Codex and says "you have to see how the spell slots work" or "watch what happens when you roll a nat 20." They would say "it's a D&D combat tracker with a dark theme and gold accents." That is the definition of generic.

**The honest assessment:** Strip away the gold borders and Cinzel font, and this is indistinguishable from a shadcn/ui dark-mode app with some D&D domain logic. The brand DNA — ash, archive, codex, illuminated manuscript, sacred tactical instrument — exists only in the documentation, not in the experience.

---

## Summary Verdict

| Dimension | Rating | Notes |
|---|---|---|
| Architecture & Code Quality | 9/10 | Excellent. Don't touch the bones. |
| Feature Completeness | 9/10 | All 9 surfaces built and functional. |
| Aesthetic Position | 3/10 | Correct colors, zero material quality. Generic dark-app. |
| Signature/One Weird Thing | 1/10 | Nothing memorable. Nothing worth describing. |
| Motion & Ceremony | 2/10 | Generic fadeIn/slideUp everywhere. No narrative timing. |
| Typography as Character | 4/10 | Right fonts, wrong hierarchy. No illuminated treatments. |
| Custom Ornament | 2/10 | CSS pseudo-elements pretending to be manuscript art. |
| $200/month Justification | 2/10 | A user would not pay this. They'd use D&D Beyond for free. |
| Brand DNA Fidelity | 3/10 | Right words in the docs. Wrong execution in the pixels. |

**The fix is not a rewrite.** The architecture is sound. The features work. The fix is a RESKIN — a systematic replacement of the visual and behavioral layer while preserving the logic underneath. The bones stay. The skin, motion, and ornament get rebuilt from the ground up against the chosen aesthetic position.
