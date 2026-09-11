# STACK DELTA — The Codex

**Current stack:** React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · localStorage · Gemini Flash / Ollama
**Verdict:** The stack is solid. Minimal additions needed.

---

## Changes Required

### Install

| Package | Version | Size (gzip) | Purpose | Justification |
|---------|---------|-------------|---------|---------------|
| `motion` | ^12.x | ~15KB | Layout animations, gesture recognition, AnimatePresence for panel transitions | Replaces hand-rolled CSS transitions for complex sequences (dice, rest ceremony, tab transitions). Lighter than GSAP for this use case. Not needed for micro-interactions (those stay CSS). |

**Total new JS weight:** ~15KB gzipped. Current bundle is ~60KB gzipped. New total: ~75KB. Well under the 150KB budget.

### Do NOT Install

| Package | Reason |
|---------|--------|
| GSAP + ScrollTrigger | Overkill for a mobile app. No long scroll sections. No marketing page. Motion (Framer) handles what's needed. |
| Lenis | No smooth-scroll needed. This is a mobile app with native scroll. Lenis is for marketing sites. |
| SplitType / Splitting.js | The Oracle drop cap is ONE letter — hand-coded, not library-dependent. No text-splitting needed. |
| Three.js / Matter.js | Dice physics can be achieved with CSS transforms + motion library. No 3D engine needed. Battery is sacred. |
| Tone.js / Howler | Audio is a post-launch consideration. The visual signature comes first. Sound adds complexity and permission UX. |

### Modify

| Item | Current | Target | Action |
|------|---------|--------|--------|
| Font loading | Google Fonts via `<link>` in index.html | Self-hosted woff2 with `font-display: swap` and preload on critical weights | Download Cinzel 600/700, IBM Plex Sans 400/500/600, JetBrains Mono 400/700. Add preload tags. Eliminates render-blocking external request. |
| Background images | 7 PNGs (~500KB) in `/public/` | Remove all. Replace with CSS-only atmospheric gradients. | Delete `bg-*.png` files. Rewrite `atmospheric-bg-*` classes to use radial gradients only. Save 500KB. |
| CSS architecture | Single `index.css` with `@theme` + inline component classes | Keep `@theme` for tokens. Extract component classes into organized `@layer` blocks. | Restructure for clarity but don't change the fundamental approach. Tailwind 4 `@theme` is correct. |
| Design tokens | Hex values in `@theme` | OKLCH values for perceptual uniformity (with hex fallbacks in comments) | Gradual migration. Tailwind 4 supports OKLCH natively. |
| Haptic feedback | None | `navigator.vibrate()` hook with `prefers-reduced-motion` respect | New hook: `useHaptic()` returning `{ tap: () => void, commit: () => void }`. `tap` = 10ms, `commit` = 15ms. Gated by user preference + API availability. |

### New Asset Pipeline

| Item | Details |
|------|---------|
| `src/assets/sigils/` | Custom SVG sigils (spell slots, conditions, damage types, schools) |
| `src/assets/ornaments/` | Hairline dividers, corner marks, drop cap set |
| `src/assets/brand/` | The Codex wordmark SVG, Ash & Archive identity |
| `asset-inbox/` | Staging directory for assets returned from ChatGPT image-gen pipeline |
| `ASSET_CATALOG.md` | Living manifest of all commissioned assets |
| `STYLE_BIBLE_PROMPT.md` | Canonical prompt for ChatGPT image-gen sessions |

### Performance Budgets (Enforced)

| Metric | Budget | Measurement |
|--------|--------|-------------|
| LCP | < 2.0s | Lighthouse on 4× CPU throttle, Slow 4G |
| INP | < 100ms | Combat tab interactions specifically |
| CLS | 0 | No layout shift during combat |
| JS bundle (initial) | < 150KB gzip | `vite build` output |
| Total transfer (initial) | < 250KB | No background images. Fonts preloaded. |
| Time to interactive | < 3.0s | On mid-range Android, Slow 4G simulation |

---

## Summary

One npm install (`motion`). Zero heavy libraries. Font self-hosting. Background image deletion. Haptic hook. SVG asset pipeline. That's the delta. The current stack is already lean and correct — the problem was never the tools, it was the design execution.
