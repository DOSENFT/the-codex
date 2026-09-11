# THE ONE WEIRD THING — Spell Slot Sigils

**Chosen:** #3 — Spell Slot Sigils
**Acceptance test:** "A player who has never seen The Codex should describe the product to a friend by mentioning: *the spell slots are actual runes that burn to ash when you cast.*"

---

## Why This One

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Visible during combat? | 10/10 | Spell slots are displayed PERMANENTLY on the combat tab. Not a momentary event — a constant presence. |
| Brand-aligned? | 10/10 | Sigils, runes, burning out, reanimating — this IS the illuminated grimoire. |
| Works at 375px mobile? | 10/10 | Each sigil renders at 28-32px. No complex layout needed. Inline row. |
| Performant? | 9/10 | SVG + CSS transitions. No canvas, no JS animation library needed for the state change. |
| Differentiates from competitors? | 10/10 | D&D Beyond: generic dots. Roll20: checkboxes. Foundry VTT: rectangles. Nobody has sigils. |
| Describable in one sentence? | 10/10 | "The spell slots are runes that burn out when you cast." |
| Affects the most-tapped surface? | 9/10 | Spell slots are tapped every round by casters. Only martial characters don't use them. |

---

## Specification

### What It Is

Each spell level (1st through 9th) has its own unique sigil — a rune designed in the tradition of medieval grimoire diagrams, Voynich-style botanical marks, and alchemical notation. The sigil's visual complexity increases subtly with level (1st = simple single mark, 9th = intricate multi-stroke symbol).

Each sigil exists in two states:
1. **Available** — Full ink saturation. The sigil is "alive on the page." It has the character of freshly drawn quill ink: deep oxidized-iron color, with subtle stroke variation suggesting hand-drawn origin.
2. **Expended** — The sigil has burned out. A ghost-outline at ~20% opacity remains, as if the ink itself ignited and left ash residue. A single faint wisp of smoke drifts from one terminal of the mark.

### Visual Design Constraints

- **Size:** Renders at 28-32px in-app. Must pass the squint test — the level's identity (its "number-ness") must read at that size without literal numerals.
- **Style:** Quill ink linework. 1.2-2.0pt stroke weight. NOT symmetrical. NOT vector-perfect. Subtle imperfections from hand-drawing are welcome.
- **Color:** `var(--ink-primary)` for available state. `var(--ink-ghost)` for expended state. Gold is NOT the sigil color — the sigils are ink, not metallic.
- **Background:** Transparent. The sigil sits directly on whatever container holds it (the spell slot panel at `--ash-warm`).
- **The "number" is conveyed through structure, not digits:**
  - 1st = single-stroke mark (one element)
  - 2nd = paired/mirrored mark (two elements or a bilateral symbol)
  - 3rd = trefoil/triangular structure (three converging)
  - 4th = quartered/four-fold symmetry
  - 5th = pentagonal or five-pointed structure
  - ... increasing intricacy through 9th (full mandala-complexity)
- **Tradition references:** Voynich Manuscript botanical diagrams, Lindisfarne Gospel knotwork, medieval alchemical symbols, grimoire sigil charts. NOT pentagram/satanic cliché. NOT generic fantasy runes (Elder Futhark is forbidden — too literal).

### Interaction Behavior

**Tap to Expend (Available → Expended):**
1. The sigil holds position (no movement, no bounce).
2. A brief ember-glow flash originates from the center of the sigil (duration: 150ms, color: `--ember` at 40% opacity, radius: 12px blur).
3. The ink color transitions from `--ink-primary` to `--ink-ghost` over 200ms using `--ease-snap`.
4. A single smoke wisp (CSS-animated pseudo-element or lightweight SVG) drifts upward from the top terminal of the sigil over 400ms, then fades. This is the ONLY animation that exceeds the 150ms combat micro threshold — justified because it's a secondary decorative element that doesn't block interaction.
5. Optional (if Vibration API available and user hasn't disabled): 15ms vibration pulse on expend.

**Tap to Restore (Expended → Available):**
1. The sigil ink transitions from `--ink-ghost` back to `--ink-primary` over 200ms using `--ease-snap`.
2. A subtle gold luminance sweeps across the sigil left-to-right (a pseudo-element with `--gold-bright` at 30% opacity, width 4px, traversing via translateX over 300ms). As if candlelight re-illuminated the page.
3. No wisp. Restoration is quieter than expenditure.

**Long Rest (All Restore Simultaneously):**
1. All expended sigils restore in a staggered cascade — left to right, 50ms apart.
2. The gold luminance sweep runs across ALL sigils in sequence, creating a wave of rekindling.
3. Duration: ceremony tier (480ms total for the cascade).

### Technical Implementation

```
src/
  components/
    combat/
      SpellSlotSigils.tsx    — React component (replaces SpellSlotPips.tsx)
  assets/
    sigils/
      spell-slot-1st.svg     — Available state, 1st level
      spell-slot-2nd.svg     — Available state, 2nd level
      ...
      spell-slot-9th.svg     — Available state, 9th level
```

**SVG approach:**
- Each sigil is an inline SVG component (not `<img>`, not background-image). This allows CSS to control the fill color and opacity for state transitions.
- The SVG uses `currentColor` for its paths, allowing the parent to set color via `color: var(--ink-primary)` or `color: var(--ink-ghost)`.
- The smoke wisp is a `::after` pseudo-element with a CSS keyframe animation (opacity 0→0.6→0, translateY 0→-12px, over 400ms). No JS needed.
- The ember flash is a `::before` pseudo-element with radial-gradient and a brief opacity pulse.
- The restoration luminance sweep is a pseudo-element with translateX animation.

**Asset pipeline:**
- SVGs are commissioned through the ChatGPT image-gen pipeline (see ADDENDUM).
- Generated as 1024×1024 PNG, then vectorized to SVG via `vtracer` or manual trace.
- Final SVGs are hand-optimized: single `<path>` elements using `currentColor`, no embedded styles, no transforms.
- Each SVG is ~500 bytes. Total sigil weight: 9 × 500B = 4.5KB. Negligible.

### Fallback (Reduced Motion)

If `prefers-reduced-motion: reduce`:
- No smoke wisp
- No ember flash
- No luminance sweep
- State change is instant (opacity toggle, no transition)
- Sigil shapes still display — they're informational, not decorative

### Integration with Existing Logic

The `SpellSlotPips` component already has the correct interface:
```typescript
interface SpellSlotPipsProps {
  spellSlots: Record<number, { max: number; current: number }>
  onExpend: (level: number) => void
  onRestore: (level: number) => void
}
```

The new `SpellSlotSigils` component uses the IDENTICAL interface. It's a drop-in replacement. No logic changes needed.

---

## Secondary Signature Elements (Later Waves)

The Spell Slot Sigils are the PRIMARY One Weird Thing. These are secondary signature moments that share the same design language but are implemented in later waves:

| Element | Wave | Relationship to Primary |
|---------|------|------------------------|
| Action Economy Illuminated Initials (A/B/R/M) | Wave 1 | Same ink-on-vellum vocabulary, same expend/restore behavior |
| Dice Falling with Physics | Wave 3 | Same "objects have weight" philosophy, parchment-landing feel |
| Concentration Candle | Wave 2 | Same flame/ash vocabulary as sigil burn-out |
| Oracle Illuminated Drop Cap | Wave 2 | Same manuscript-art pipeline, same ink character |
| Wax-Seal Rest Buttons | Wave 1 | Same "consequential action feels like a commitment" principle |

All secondary elements are designed to feel like they come from the SAME HAND — the same scribe, the same codex, the same ink. Visual coherence across all signature elements is mandatory.

---

## The Test

After Wave 1 ships with Spell Slot Sigils integrated:

1. Show a screenshot of the Combat tab to someone who has never seen The Codex.
2. Ask: "What do you notice first?"
3. If the answer includes "the rune things" or "those symbols" or "the spell slots" — the move landed.
4. Ask: "How would you describe this app to a friend?"
5. If the answer includes something about runes, burning, or symbols — the One Weird Thing is working.
6. If the answer is "it's a dark app with gold accents" — the move failed. Iterate.
