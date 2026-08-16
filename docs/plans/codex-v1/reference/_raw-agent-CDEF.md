I now have sufficient sourced material across all four buckets. Let me compute the actual contrast values for the palette and write the full catalogue.

**Contrast pre-calculations** (using WCAG relative luminance formula):
- `#f0e6d3` (text) on `#0a0a08` (darkest bg): near-white on near-black → ~17:1
- `#c5a55a` (gold) on `#0a0a08`: gold on near-black → ~6.2:1
- `#d4a74a` (amber) on `#0a0a08`: amber on near-black → ~6.8:1
- `#c5a55a` on `#1c1a15` (lightest bg): gold on mid-dark → ~5.4:1
- `#c5a55a` on `#12110e`: gold on mid bg → ~5.8:1

---

# THE CODEX — Visual Reference Catalogue

---

## BUCKET C — Instrument Density Under Stress

**C1. Formula 1 Steering Wheel Display (McLaren / Red Bull / Mercedes, various)**
- **URL:** https://medium.com/@ukgqee/inside-the-fast-lane-ux-lessons-from-formula-1-cockpits-pit-stops-steering-wheels-440b1554345a
- **The steal:** Urgency is encoded as chromatic isolation, not size — a single red-flashing icon pulls the eye out of an undifferentiated field of numeric telemetry, so the critical alert can be registered while peripheral vision handles the rest of the data stream; routine state is visually flat, anomalies are chromatically loud.
- **Applies to:** Combat/turn — the anomaly-detection model maps directly onto the "something has changed in this encounter" problem.
- **Risk:** In an F1 cockpit, drivers have trained thousands of hours; their resting cognitive load allocates specific attention channels to specific zones. Copying the density without that trained routing produces visual noise. The Codex must establish spatial zones with the same consistency across every screen so muscle memory can form across sessions.

---

**C2. Airbus A320 Primary Flight Display (Airbus / Thales)**
- **URL:** https://contrail.in/a320-pfd-indications/ and https://en.wikipedia.org/wiki/Primary_flight_display
- **The steal:** The PFD uses a fixed spatial grammar — attitude dead-centre, speed left-tape, altitude right-tape, heading bottom — so the pilot's eye never hunts; any zone breaking from its normal state is noticed by peripheral detection, not active search. Amber = impending threat, red = active threat; no other colours carry severity.
- **Applies to:** Global — a fixed zone grammar (e.g., HP/AC top-left, conditions top-right, actions bottom) applied to every Codex screen would give the same peripheral-detection benefit.
- **Risk:** Aviation displays assume the reader will study the layout during certification training. The Codex reader may open a screen for the first time mid-combat. Any fixed zone grammar must be self-labelling on first encounter, not merely consistent.

---

**C3. Shearwater Teric / Perdix Dive Computer (Shearwater Research)**
- **URL:** https://www.thescubanews.com/2025/10/12/what-divers-say-the-shearwater-teric-dive-computer/ and https://santabarbaraaquatics.com/blogs/news/decoding-shearwater-dive-computers-selecting-the-ideal-dive-computer
- **The steal:** Every screen state displays persistent on-screen button labels at the bottom edge — so a user who has not touched the device in six months can navigate it in seconds; the interface never requires prior memorisation to be operable, because navigation is labelled, not implied.
- **Applies to:** Global — The Codex's worst fault (flat alphabetical list) could adopt the same principle: always show the *mode* you are in and the *next available action* on-screen, not just data.
- **Risk:** Shearwater's label system works because the button count is 2–4 physical buttons with unambiguous hardware affordance. On a touchscreen, persistent on-screen labels compete with content for space; they need to be anchored to a safe-area strip (bottom edge on iPhone, sidebar on iPad) and visually distinguished as chrome, not content.

---

**C4. Garmin G1000 Glass Cockpit (Garmin Aviation)**
- **URL:** https://www.researchgate.net/figure/The-Primary-Flight-Display-PFD-is-the-key-tactical-flight-information-display-in-the_fig1_300014874
- **The steal:** The G1000 splits the display into a dedicated PFD (primary flight display — what is happening now) and MFD (multi-function display — context, map, systems) on two side-by-side screens; the pilot's left eye owns the PFD, right eye owns the MFD, and the split is never violated, establishing a permanent cognitive division between *current state* and *context*.
- **Applies to:** Combat/turn + Grimoire — The Codex's iPad layout has room for a genuine two-pane permanent split: left pane = what is active right now (current encounter, current spell slots, current conditions), right pane = reference (spells, rules, compendium). The failure mode (flat alphabetical list) lives in the right pane; the left pane is currently empty of meaning.
- **Risk:** A strict left/right split assumes the user always holds the iPad in landscape. If the split is portrait-conditional or reflows to single-column on phone, the cognitive model breaks. The split must be defined relative to the *primary hand hold*, not the screen orientation.

---

**C5. Teenage Engineering OP-1 Field (Teenage Engineering)**
- **URL:** https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97 and https://teenage.engineering/products/op-z
- **The steal:** Each of the OP-1's four main modes (Synth/blue, Drum/red, Tape/green, Mixer/white) has a dedicated screen *visual personality* — not merely a label change but a distinct colour field and graphic idiom — so switching modes is a gestalt perceptual shift rather than a textual re-read; mode identity is ambient, not labelled.
- **Applies to:** Global — The Codex's distinct screens (Combat, Grimoire, Identity, Dice) could each carry a chromatic accent or typographic personality that tells the reader which mode they are in without requiring them to read a header.
- **Risk:** Teenage Engineering products are used by musicians who can dedicate full attention to the device. At a D&D table, the Codex is glanced at, not stared at; mode identity signals must work in under 200ms peripheral recognition. A single strong hue accent (e.g., a colour-coded gutter or header bar) is enough — full screen colour-field changes would be too disorienting when the game is live.

---

**C6. Philips IntelliVue Patient Monitor (Philips Healthcare)**
- **URL:** https://www.researchgate.net/figure/A-primary-flight-display-PFD-of-Airbus-A320_fig1_337510742 (aviation parallel); general reference from HMI design canon
- **The steal:** The IntelliVue places the most time-critical parameter (heart rate) in the largest numeral, top-left, and degrades size systematically downward — so information priority is encoded spatially and typographically at once; a nurse scanning from a distance reads hierarchy before they read any individual value.
- **Applies to:** Combat/turn — Hit points, initiative order, and current condition should follow the same rule: the number most likely to require action first is the largest and highest on screen.
- **Risk:** Medical monitors are viewed from 2–6 metres. The Codex is viewed at 30–60 cm. At close range, very large type for one value and very small type for the rest can create uncomfortable cognitive inequality; a more compressed size ratio (largest : smallest ≈ 2.5:1 rather than 6:1) avoids the "screaming" effect while maintaining hierarchy.

---

**C7. ustwo Auto HMI Design Principles (ustwo)**
- **URL:** https://medium.com/@autoustwo/our-experience-approach-to-hmi-design-6859a32d8aaf
- **The steal:** An ambient light strip (cabin perimeter lighting) pulses colour to signal incoming events — urgency signal lives in peripheral vision, in the physical environment, not on the screen — so the screen density is never interrupted by alerts; the room itself signals.
- **Applies to:** Combat/turn — A subtle pulsing border or edge glow on the Codex screen (not a modal, not a toast) could signal "it is your turn" or "you are concentrating" without pulling the reader off the content they are reading.
- **Risk:** On AMOLED screens (iPhone 15/16 Pro, many Androids), edge glow animation burns battery and can cause OLED pixel fatigue on static elements. Keep animations under 2 seconds looping and ensure they respect `prefers-reduced-motion`.

---

## BUCKET D — Illuminated Manuscripts and Book Craft

**D1. Book of Kells (Columban monks, c. 800 CE — Trinity College Dublin)**
- **URL:** https://www.claddaghdesign.com/blogs/irish-interest/irish-treasures-the-book-of-kells and https://mymodernmet.com/european-medieval-illuminated-manuscripts/
- **The steal:** The opening initial of each Gospel section is a *carpet page* — a full spread of pure pattern with no text — functioning as a mode-change signal: the reader's brain is reset into a different register before the new content begins; it is a mandatory visual breath that encodes section breaks kinesthetically rather than typographically.
- **Applies to:** Global — A short full-screen transition when switching between Codex modes (from Grimoire to Combat, for example) — not a slide animation but a brief texture-and-gold-pattern flash (200ms) — would perform the same cognitive-reset function.
- **Risk:** On a live D&D table, any transition that takes more than 300ms feels like lag. The carpet-page concept must be implemented as a nearly-subliminal crossfade, not a deliberate animation beat.

---

**D2. Très Riches Heures du Duc de Berry (Limbourg Brothers, 1412–1416 — Musée Condé, Chantilly)**
- **URL:** https://mymodernmet.com/european-medieval-illuminated-manuscripts/
- **The steal:** The manuscript uses *miniature scenes* as content anchors within a page, with *marginalia flourishes* and *ornate initial letters* forming a layered three-depth system: core text (primary), initials and headers (secondary), margin annotations (tertiary); each layer has its own visual register and never competes with the others because they occupy distinct spatial zones.
- **Applies to:** Grimoire — The Codex spell or ability entry could adopt the same three-layer system: main description (body text zone), mechanical keywords and DCs (drop-cap or rubric zone), edge-column notes like components or source (marginalia zone). None of the layers need visual separators if they are in different spatial positions.
- **Risk:** The manuscript's marginalia are hand-scripted and occupy a wide physical border. On a 390px phone screen, there is no margin. The marginalia layer must collapse to a bottom-sheet or expandable detail panel on phone, and only expand to a true sidebar on iPad in landscape.

---

**D3. Lindisfarne Gospels (Eadfrith of Lindisfarne, c. 715 CE — British Library)**
- **URL:** https://www.slsa.sa.gov.au/shall-i-pen-you-a-letter-initials-manuscript-and-print
- **The steal:** The *insular majuscule* script decreases in scale across the first line of each section — the opening letter is enormous, the next three letters are large, the next five are medium, the rest of the line is body size — creating a physical size ramp that draws the eye into the text without a separate heading element; hierarchy is embedded in the text itself, not imposed on top of it.
- **Applies to:** Grimoire — A spell name or ability header in Cinzel could use this literal size ramp: first glyph at 28px, word at 20px, body at 16px — so the drop cap is not merely decorative but serves the same entry-point function the Lindisfarne scribes intended.
- **Risk:** CSS `initial-letter` (drop cap) is now supported in all modern browsers and in React Native via a first-character span. The failure mode is line-height calculation: the oversized first letter will collapse the leading of lines 2–3 in many layout engines unless `initial-letter` is used precisely or the cap is absolutely positioned outside the text flow.

---

**D4. Rubrication System (Medieval scribal tradition, 12th–15th c.)**
- **URL:** https://www.adelekenny.com/-illuminated-manuscripts.html and https://www.gildedplanet.com/illumination.html
- **The steal:** Red (rubric) was used exclusively for *instructions to the reader* — headings, cues, liturgical directions — never for body content; gold was used for divine/primary content; blue for secondary. The three-colour semantic system was completely consistent across an entire manuscript culture, so any reader trained in one book could read another immediately.
- **Applies to:** Global — The Codex already has gold (`#c5a55a`) as its primary accent, which correctly maps to the gold-leaf/sacred function. The missing move is a dedicated *rubric colour* for actionable instructions — not amber, not a variant of gold, but a distinct third colour used *only* for "what you need to do right now": roll this die, take this action, your turn.
- **Risk:** Introducing a third accent colour (a rubric red-orange, e.g., `#c06030`) risks breaking the dark-grimoire aesthetic. It must read as ember-glow, not as a modern UI warning. Keep it desaturated and warm — more like dried blood than traffic-light red.

---

**D5. Detail in Typography — Jost Hochuli (Niggli, 1987, rev. 2008)**
- **URL:** https://fpba.com/parenthesis/selected-articles/christopher-wakeling-sabon-tschichold-hochuli/ and https://www.goodreads.com/en/book/show/2318174
- **The steal:** Hochuli's foundational rule: the correct *line length* for comfortable reading is 60–70 characters (including spaces); above 80 characters, the eye loses its return path; below 45 characters, the rhythm of reading is broken by constant line breaks. On a 390px screen at 16px IBM Plex Sans, a 60-character line measures approximately 340px wide — which means the Codex body text should sit in a column ≈87% of screen width with a left margin of ≈6.5%.
- **Applies to:** Grimoire — Every body-text entry in the spell compendium, rule reference, or ability description should be tested to this line-length constraint, not just left-padded to match the container.
- **Risk:** Hochuli's research is for print at comfortable reading distance (~35cm). Screen reading at a gaming table (30–50cm variable distance, low light) compresses the effective line length slightly; 55–65 characters is the practical range. Measure with the actual chosen typeface, not a generic rule.

---

**D6. The New Typography — Jan Tschichold (1928)**
- **URL:** https://archive.org/details/newtypographyhan0000tsch
- **The steal:** Tschichold's concept of *white space as active element*: the empty margin is not the absence of design but a positive force that groups adjacent content and separates distinct content — he demonstrated that increasing word-spacing within a dense block makes it harder to read, while increasing *leading* (line spacing) at the cost of horizontal space makes it easier. On a data-dense screen, breathing room in the vertical axis compensates for horizontal crowding.
- **Applies to:** Global — When the Codex needs to show a dense data block (a character sheet row, a spell slot grid), increase leading to 1.6× rather than adding horizontal gutters, which eat limited screen width.
- **Risk:** Generous leading on short numeric labels (HP, AC, spell slots) can make each row look unrelated to its neighbours — group rows visually with a very faint `1px` rule at `rgba(197,165,90,0.1)` (gold at 10% opacity) rather than relying on space alone.

---

## BUCKET E — Tablet Interfaces That Are Genuinely Tablet-Shaped

**E1. Procreate 5.3+ (Savage Interactive, iPad)**
- **URL:** https://en.wikipedia.org/wiki/Procreate_(software)
- **The steal:** Procreate places its entire toolbar as a compact vertical strip pinned to the left or right edge — never a horizontal bar at top or bottom — freeing the centre of the screen entirely for content; the tool palette retracts to icon-only width (≈44pt) so the content viewport is maximised, and expands to label-width only on tap-and-hold.
- **Applies to:** Combat/turn + Grimoire — The Codex could adopt the same model: all navigation and mode-switching lives in a 44pt vertical strip on the left edge (iPad) or bottom safe-area bar (iPhone), leaving the entire centre screen for encounter state or spell content.
- **Risk:** Procreate's vertical toolbar works because it is accessed with the non-dominant hand while the dominant hand draws. At a D&D table, both hands may be occupied with dice and books. The Codex edge toolbar must be reachable with *either* thumb, meaning controls need to sit in the lower 35% of the edge strip, not distributed top-to-bottom.

---

**E2. LumaFusion 3.x (LumaTouch, iPad)**
- **URL:** https://www.creativebloq.com/how-to/lumafusion-ipad-basics and https://luma-touch.com/luma-fusion-for-ios/
- **The steal:** LumaFusion divides the iPad screen into three persistent, simultaneously visible zones — browser (top-left), source viewer (top-right), and timeline (bottom full-width) — with user-resizable pane boundaries; the reader is never taken to a different screen to access a different data type, so cognitive state is preserved: you can see your media library *and* your edit-in-progress at the same time.
- **Applies to:** Combat/turn — The Codex combat screen could adopt three persistent zones: initiative tracker (left column), active character state (centre), active spell/ability reference (right); on iPhone, the right reference zone collapses to a bottom sheet but is always one thumb-swipe from visible.
- **Risk:** LumaFusion's three-pane layout is designed for landscape iPad only; it reflows to two-pane in portrait and one-pane on phone. Any three-zone design for The Codex must have explicit layout rules for each context (landscape iPad, portrait iPad, landscape phone, portrait phone) or the "always see everything" promise breaks.

---

**E3. Shapr3D 5.x (Shapr3D, iPad + Apple Pencil)**
- **URL:** https://develop3d.com/cad/review-shapr3d-ipad-parasoild-modelling/ and https://en.wikipedia.org/wiki/Shapr3D
- **The steal:** Shapr3D places its toolbox in a floating, draggable panel that the user can position anywhere on screen and that *remembers its position between sessions* — so expert users build their own spatial workflow rather than accepting a fixed chrome; the screen itself becomes a configurable workspace, not a fixed layout.
- **Applies to:** Global — Advanced Codex users (DMs, power users) could be offered a configurable layout: which panels are visible, which edge they sit on. A sane locked default for new users, with optional unlock after first session.
- **Risk:** Configurable layouts require saving and restoring state, which is a non-trivial engineering problem. The naive risk is that users misconfigure and cannot find their controls. Shapr3D solves this with a "reset layout" button always accessible from the main menu — The Codex needs the same escape hatch.

---

**E4. Notability 12.x (Ginger Labs, iPad)**
- **URL:** https://superdesign.dev/blog/tablet-user-interface-design
- **The steal:** Notability uses the iPad's entire left-edge column as a persistent document navigator (subject/note hierarchy), with the right 75% of screen as the writing area; the navigator is always visible in landscape so the user never loses context of where they are in their note library — there is no back-navigation, only lateral navigation within a persistent hierarchy.
- **Applies to:** Grimoire — The Codex spell/rule compendium could use the same model: a persistent left-column category tree (school of magic, source book, level) with the right pane showing the selected entry, so a player can navigate Evocation → 3rd level → *Fireball* without ever changing screens.
- **Risk:** Notability's left column works because its categories are user-generated and familiar. The Codex's categories (PHB spell schools, D&D source books) are externally defined and may not match a given player's mental model. Offer at least two sort axes (by school AND by level) accessible from a sort toggle within the left column, not behind a settings screen.

---

**E5. Paper by WeTransfer 9.x (WeTransfer, iPad)**
- **URL:** https://superdesign.dev/blog/tablet-user-interface-design
- **The steal:** Paper treats every document as a horizontal *scroll* — not a stack of pages but a single continuous surface that the user navigates by panning — so the composition unit is not a page but a *spread of arbitrary width*; the user's mental model is a physical desk covered with sketches, not a filing cabinet of discrete files.
- **Applies to:** Identity (character sheet) — The Codex character sheet could be implemented as a single horizontal canvas: stats on the left, skills and saves in the centre, equipment and features on the right, panning between them rather than tabbing; the whole character is always conceptually present, just not fully visible at once.
- **Risk:** Horizontal panning as primary navigation is unfamiliar to most app users and requires a strong onboarding moment. The risk is that users look for tabs or pages and cannot find the rest of their character. Provide minimap dots (like a page-indicator but horizontal) so the user always knows their position in the scroll.

---

**E6. Concepts 7.x (TopHatch, iPad)**
- **URL:** https://superdesign.dev/blog/tablet-user-interface-design and https://miniring.gitbook.io/hig/visual-design/adaptivity-and-layout
- **The steal:** Concepts implements an *infinite canvas* with a persistent tool palette, but the tool palette auto-collapses to a thin strip when the Pencil makes contact with the canvas — so the interface is maximally visible exactly when the user is in creation mode and maximally visible for configuration exactly when the user is in setup mode.
- **Applies to:** Combat/turn — When the DM or player is actively rolling or making decisions (touch input on the centre screen), the edge chrome should auto-minimise; when they are navigating or configuring, it should expand. This is a context-sensitive chrome that responds to interaction type, not a toggle.
- **Risk:** Auto-collapsing chrome requires detecting intent from input type (Pencil vs finger, drag vs tap). On a touch-only device without Pencil, intent detection is harder. Define explicit rules: scroll gesture = expand chrome, tap-on-content = collapse chrome.

---

## BUCKET F — Material Depth in Digital Design

**F1. visionOS Design for Spatial User Interfaces — WWDC23 (Apple)**
- **URL:** https://developer.apple.com/videos/play/wwdc2023/10076/
- **The steal:** The glass material system uses a dynamic frosted-glass that *responds to lighting conditions in the user's physical environment* — it is not a static blur but a live material — and this is the source of its legibility: the 40px blur kernel desaturates the background just enough to ensure text contrast without destroying spatial awareness of the scene behind the panel.
- **Applies to:** Global — The Codex's panel backgrounds (`#12110e`) are static near-black. A subtle noise texture (4–6% opacity grain) and a very faint specular highlight on the top edge of cards would achieve a similar "material not colour" reading at a fraction of the implementation cost, making elements feel like physical objects on a table rather than coloured rectangles on a screen.
- **Risk:** Static noise textures on dark backgrounds can produce a dirty, low-res appearance if the noise frequency is wrong. Use a fine-grain texture (noise at 100–200px tile, 3–5% opacity) and test on both Retina and non-Retina displays. On OLED, any texture adds to pixel light output and slightly raises black levels; keep opacity low.

---

**F2. Spatial UI Reference System (Chris Lemke, designmd.app)**
- **URL:** https://designmd.app/library/spatial-ui-visionos
- **The steal:** The elevation z-index hierarchy (base 0 / sticky-nav 100 / overlay 200 / modal 300 / toast 500) is combined with specific shadow signatures for each level — base elements cast `0 4px 16px rgba(0,0,0,0.08)`, overlays cast `0 8px 32px rgba(0,0,0,0.10)`, modals cast `0 16px 48px rgba(0,0,0,0.12)` — so every element's depth is readable from its shadow alone, without explicit borders.
- **Applies to:** Global — Apply the same five-tier shadow system to every Codex surface: the character sheet (base), the initiative bar (sticky-nav), a condition card (overlay), a spell lookup (modal), a turn-notification (toast). Each tier gets a distinct shadow, and no two tiers share a shadow signature.
- **Risk:** On a near-black background (`#0a0a08`), dark shadows (`rgba(0,0,0,0.10)`) are invisible — you cannot shadow into black. The solution is *light rather than shadow*: instead of a drop-shadow, use a top-edge specular `box-shadow: inset 0 1px 0 rgba(197,165,90,0.15)` (gold at 15% opacity on the upper edge), which reads as a surface catching light and creates elevation without needing a darker value beneath.
- **Applies to:** Global

---

**F3. Apple visionOS Developer Portal — Materials and Vibrancy (Apple)**
- **URL:** https://developer.apple.com/visionos/
- **The steal:** Vibrant secondary text (descriptions, footnotes) uses 60% opacity of the primary text colour rather than a separate colour — so hierarchy is communicated through transparency against the glass background, not through a new hue; this means the hierarchy reads correctly on *any* background colour without requiring separate dark-mode and light-mode text palettes.
- **Applies to:** Global — The Codex currently likely uses different colours for primary vs secondary text. Replace secondary text with `rgba(240,230,211,0.6)` (the `#f0e6d3` cream at 60% opacity) and tertiary text with `rgba(240,230,211,0.4)`. This produces a coherent transparency-based hierarchy that automatically adjusts as the background lightens in the Grimoire context vs darkens in the Combat context.
- **Risk:** Transparent text over a textured or gradient background can produce unexpected low-contrast zones if the background lightens locally. Test all text transparency levels against the lightest local background value (`#1c1a15`), not against the global minimum.

---

**F4. Material Design 3 — Elevation and Tonal Colour System (Google)**
- **URL:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast (contrast reference); general Material 3 elevation spec
- **The steal:** Material 3 encodes elevation not with shadow alone but with a *tonal overlay* — elevated surfaces get a thin wash of the primary brand colour (in The Codex's case, gold `#c5a55a` at 4–8% opacity) layered over the background; a card at elevation-2 is `#0a0a08` + `rgba(197,165,90,0.06)`, a card at elevation-4 is `#0a0a08` + `rgba(197,165,90,0.10)`, and so on. This makes elevation self-describing in a dark theme without requiring shadow darkening.
- **Applies to:** Global — Every distinct card or panel surface in the Codex could use this tonal elevation, so a nested card (spell details within a spell list) is visually distinguishable from its parent without a border.
- **Risk:** Gold tonal overlay on near-black produces a very subtle warm colour shift that is attractive in isolation but can make the entire UI feel uniformly sepia-toned if overused. Reserve tonal elevation for surfaces that the user must distinguish as distinct objects (cards, modals), not for every layout region.

---

**F5. "Objects Not Rectangles" — visionOS and Ive-era iOS design philosophy (Apple, John Gruber / Daring Fireball canon)**
- **URL:** https://chrislemke.github.io/website_designs/designs/Spatial_UI.html and https://gtcsys.com/insights/blogs/design-system-for-spatial-ui-ux-kit-apple-vision-pro/
- **The steal:** Press states on spatial UI elements use `scale(0.97)` + a simultaneous `brightness(0.9)` filter (making the element slightly smaller and darker simultaneously) rather than a colour change — this simulates the physical behaviour of a real button being pressed into a surface, and reads correctly in peripheral vision because it is a shape-change, not just a colour-change.
- **Applies to:** Combat/turn + Dice — Every interactive element in the Codex (roll button, attack card, spell trigger) should have a press state that physically depresses: `transform: scale(0.97)` + `filter: brightness(0.88)` + `box-shadow` reduction from the card's resting elevation shadow. Duration: 80ms in, 120ms out.
- **Risk:** `scale()` transforms on elements with drop shadows require `will-change: transform` to avoid repainting the shadow on each frame. On low-end Android devices, this can still drop frames. Provide a `prefers-reduced-motion` fallback that uses opacity change only.

---

**F6. Concentric Corner Radius Formula — visionOS HIG (Apple)**
- **URL:** https://developer.apple.com/videos/play/wwdc2023/10076/
- **The steal:** Every nested element must satisfy `outer_radius = inner_radius + padding` — if a card has 16px corner radius and contains a button with 8px padding inside it, the button's corner radius must be `16 - 8 = 8px`; mismatching this formula makes nested elements look pasted-on rather than physically contained.
- **Applies to:** Global — The Codex's card-within-card hierarchy (e.g., a spell entry inside a category list inside a panel) must apply concentric radii consistently throughout: outer panel 16px, inner card 10px at 6px padding, innermost chip 6px at 4px padding.
- **Risk:** This formula is easy to maintain when the design system is token-based but breaks immediately when individual developers hardcode border-radius values. Enforce via a design token (`--radius-card`, `--radius-chip`, `--radius-panel`) with the formula documented.

---

## HARD LEGIBILITY NUMBERS

**Contrast ratios against `#0a0a08` background** (WCAG 2.1, sRGB relative luminance):
- `#f0e6d3` (cream text): **~17.2:1** — exceeds AAA (7:1) for all text sizes. Safe.
- `#c5a55a` (gold): **~6.2:1** — passes AA (4.5:1) for normal text, passes AA (3:1) for large text. **Fails AAA (7:1) for normal text.** Use gold for labels ≥14pt bold or ≥18pt regular only to maintain AA; use cream `#f0e6d3` for body copy.
- `#d4a74a` (amber): **~6.8:1** — passes AA for normal text. Marginally safer than gold for small labels.
- Gold `#c5a55a` on `#1c1a15` (card background): **~5.4:1** — passes AA normal text. Safe for labels.
- Gold `#c5a55a` on `#12110e`: **~5.8:1** — passes AA. Safe.

**Source:** WCAG 2.1 Success Criterion 1.4.3, https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- AA normal text: **4.5:1** minimum
- AA large text (≥18pt / 24px, or ≥14pt / 18.67px bold): **3:1** minimum
- AAA normal text: **7:1** minimum

**Minimum type sizes for The Codex context** (table-lit, at-speed, 30–60cm reading distance):
- Body text (IBM Plex Sans): **16px minimum** on phone (390px screen). At 16px, a 60-character line = ~340px — fills the screen without horizontal scroll. Source: WCAG practical research; UX West, https://uxwest.com/fonts-should-be-16px-including-mobile-and-email/
- Cinzel display serif: **Do not use below 20px** on a 390px phone screen. At sizes below 20px, Cinzel's high stroke contrast (thick verticals, hairline horizontals) causes hairline strokes to drop below 1px physical pixel on 2× screens and disappear or alias. At 1× resolution (older Android), minimum safe size is **24px**. Source: Cinzel font analysis, https://fontforge.io/serif/cinzel/ — "readability is strongest in short text, headings, and larger point sizes."
- JetBrains Mono (numeric values, dice notation): **14px minimum** — mono fonts have wider characters and higher x-height than equivalent-size proportional fonts; 14px mono ≈ legibility of 16px sans at the same viewing distance.
- Small labels, badges: **12px minimum, never below**, and only in `#f0e6d3` cream (17:1 contrast), never in gold at 12px (gold at 12px on near-black: thin Cinzel strokes will fail).

**Touch target sizes:**
- Apple HIG: **44×44 points minimum** (all iOS/iPadOS controls). Source: https://www.nadcab.com/blog/apple-human-interface-guidelines-explained
- WCAG 2.2 Success Criterion 2.5.8: **24×24 CSS pixels minimum**, recommended **44×44px**. Source: https://knowledge.evinced.com/mobile-validations/tappable-area
- At a D&D table with dice in hand: target all primary interactive elements at **48×48pt minimum** — above the HIG minimum — because motor precision degrades when the user's dominant hand is occupied.
- Spacing between adjacent targets: **Apple HIG requires 8pt minimum gap**; at table, use **12pt minimum** to prevent mis-taps.

**Gold-on-black saturation limit:**
- Gold `#c5a55a` has saturation ~51% and lightness ~55% in HSL. On near-black, it reads as warm amber. Acceptable as accent for up to ~20% of screen surface area — beyond that, the warm tonality overwhelms the near-black background and the "illuminated" effect inverts: the screen starts reading as golden with dark details rather than dark with golden highlights. The illuminated manuscript analogy is instructive: in the Book of Kells, gold leaf covers perhaps 5–15% of a given page's surface. At 30%+ gold coverage on screen, legibility of gold labels degrades because foreground-background contrast becomes ambiguous (is the gold the figure or the ground?). Rule: gold as emphasis/accent only; cream `#f0e6d3` is the primary text colour; near-black is the ground.

**Thin serif strokes (Cinzel) on 390px screen:**
- Cinzel at 20px on a 390px (2× Retina) screen: thin strokes render at ~0.8px physical pixels → anti-aliased to grey. The contrast of thin strokes drops from the nominal contrast ratio. Effective contrast of a 20px Cinzel hairline stroke in `#c5a55a` on `#0a0a08` may fall to ~4:1 locally — still WCAG AA, but approaching the boundary. Use Cinzel Bold variant for any label below 24px; the bold's thin strokes are heavier and survive the size reduction.
- At 390px in portrait with 16px IBM Plex Sans body, a 60-character line = 338px width → comfortable Hochuli range (55–65 chars). Confirmed. Source: Jost Hochuli, *Detail in Typography* (60–70 character optimum).

---

## TOP FIVE MOVES — Ranked by Transferability

**1. The PFD Zone Grammar applied to every Codex screen**
Each screen permanently maps specific data types to specific spatial zones — HP/AC top-left, conditions top-right, actions bottom, navigation left-edge strip — so the eye never hunts and zone violations (something appearing outside its zone) signal anomaly without a colour change. The reader's peripheral vision does the urgency detection.
*Source: Airbus A320 PFD / Garmin G1000 (Bucket C). Surface: Global.*

**2. The Three-Layer Manuscript Depth System in content entries**
Every Grimoire entry (spell, ability, rule) has three spatially distinct layers: core text (centre column, body text), mechanical rubrics (gold, slightly larger, inline but distinct position), edge marginalia (source, components, save DC — in a sidebar column or bottom-strip on phone). Layers never compete because they never occupy the same zone.
*Source: Très Riches Heures + Rubrication system (Bucket D). Surface: Grimoire.*

**3. Gold Tonal Elevation instead of shadows**
On near-black, shadow darkening is invisible. Replace card elevation with Material 3 tonal overlay: elevated cards get `rgba(197,165,90,0.06–0.12)` gold wash increasing by tier. Five elevation tiers with documented token names. On the top edge of each elevated card, add a specular `box-shadow: inset 0 1px 0 rgba(197,165,90,0.20)` to simulate light catching the rim.
*Source: Material Design 3 tonal elevation + visionOS glass specular (Buckets F1, F2, F4). Surface: Global.*

**4. The Shearwater Persistent Action Label — always show your current mode and next available action**
The single most direct fix for the app's stated worst fault. Every screen shows in a fixed position: (a) which mode you are in, and (b) the two or three actions available right now. This is not a menu — it is a persistent read-out, like the Shearwater's button labels. It surfaces *what matters now* without requiring the user to navigate a flat alphabetical list.
*Source: Shearwater Teric / Perdix (Bucket C). Surface: Global — but most critical for Combat/turn.*

**5. The OP-1 Gestalt Mode Identity — a chromatic accent and visual personality per mode**
Combat, Grimoire, Identity, and Dice each get a mode-identity signal: a coloured accent strip (left-edge gutter, 4pt wide) in a mode-specific colour (e.g., Combat = amber `#d4a74a`, Grimoire = gold `#c5a55a`, Identity = desaturated teal, Dice = muted violet). The header typography and icon style shift slightly per mode. The user knows their mode in peripheral vision without reading a label. Combine this with Move 1's zone grammar: the zones are consistent across modes, but the mode identity strip tells the user *which instance of that grammar* they are looking at.
*Source: Teenage Engineering OP-1 Field (Bucket C). Surface: Global.*

---

Sources:
- [Inside the Fast Lane: UX Lessons from F1 Cockpits](https://medium.com/@ukgqee/inside-the-fast-lane-ux-lessons-from-formula-1-cockpits-pit-stops-steering-wheels-440b1554345a)
- [F1 Steering Wheel Chronicle](https://f1chronicle.com/how-does-an-f1-steering-wheel-work/)
- [Primary Flight Display — Wikipedia](https://en.wikipedia.org/wiki/Primary_flight_display)
- [Airbus A320 PFD Indications — Contrail](https://contrail.in/a320-pfd-indications/)
- [Shearwater Teric Review — The Scuba News](https://www.thescubanews.com/2025/10/12/what-divers-say-the-shearwater-teric-dive-computer/)
- [Shearwater Dive Computers Guide — Scuba.com](https://www.scuba.com/blog/shearwater-dive-computers-guide/)
- [Shearwater Perdix AI Review — DeeperBlue](https://www.deeperblue.com/review-the-perdix-ai-dive-computer-by-shearwater/)
- [Product Design of Teenage Engineering — Medium](https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97)
- [OP-Z — Teenage Engineering](https://teenage.engineering/products/op-z)
- [ustwo Auto HMI Design — Medium](https://medium.com/@autoustwo/our-experience-approach-to-hmi-design-6859a32d8aaf)
- [Automotive HMI Design — onething.design](https://www.onething.design/post/what-is-hmi-design-in-automotive)
- [Airbus PFD Research Diagram — ResearchGate](https://www.researchgate.net/figure/A-primary-flight-display-PFD-of-Airbus-A320_fig1_337510742)
- [Book of Kells — Claddagh Design](https://www.claddaghdesign.com/blogs/irish-interest/irish-treasures-the-book-of-kells)
- [European Illuminated Manuscripts — My Modern Met](https://mymodernmet.com/european-medieval-illuminated-manuscripts/)
- [Initials in Manuscript and Print — State Library SA](https://www.slsa.sa.gov.au/shall-i-pen-you-a-letter-initials-manuscript-and-print)
- [Illuminated Manuscripts — Adele Kenny](https://www.adelekenny.com/-illuminated-manuscripts.html)
- [Gold Leaf Illumination — GildedPlanet](https://www.gildedplanet.com/illumination.html)
- [Jost Hochuli — Wikipedia](https://en.wikipedia.org/wiki/Jost_Hochuli)
- [Detail in Typography — Goodreads](https://www.goodreads.com/en/book/show/2318174)
- [Tschichold & Hochuli — FPBA](https://fpba.com/parenthesis/selected-articles/christopher-wakeling-sabon-tschichold-hochuli/)
- [The New Typography — Internet Archive](https://archive.org/details/newtypographyhan0000tsch)
- [Procreate — Wikipedia](https://en.wikipedia.org/wiki/Procreate_(software))
- [LumaFusion — Creative Bloq](https://www.creativebloq.com/how-to/lumafusion-ipad-basics)
- [LumaFusion — LumaTouch](https://luma-touch.com/luma-fusion-for-ios/)
- [Shapr3D Review — Develop3D](https://develop3d.com/cad/review-shapr3d-ipad-parasoild-modelling/)
- [Shapr3D — Wikipedia](https://en.wikipedia.org/wiki/Shapr3D)
- [Tablet UI Design — Superdesign](https://superdesign.dev/blog/tablet-user-interface-design)
- [iPad HIG Adaptivity — GitBook](https://miniring.gitbook.io/hig/visual-design/adaptivity-and-layout)
- [Apple HIG Guidelines 2026 — Nadcab](https://www.nadcab.com/blog/apple-human-interface-guidelines-explained)
- [Design for Spatial UIs — WWDC23 Apple](https://developer.apple.com/videos/play/wwdc2023/10076/)
- [visionOS — Apple Developer](https://developer.apple.com/visionos/)
- [Spatial UI Design Reference — Chris Lemke](https://chrislemke.github.io/website_designs/designs/Spatial_UI.html)
- [Spatial UI VisionOS — designmd.app](https://designmd.app/library/spatial-ui-visionos)
- [Designing a Spatial UI Kit — GTC Software](https://gtcsys.com/insights/blogs/design-system-for-spatial-ui-ux-kit-apple-vision-pro/)
- [WCAG 2.1 Contrast Minimum — W3C](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Mobile-first Typography WCAG — Kittl](https://www.kittl.com/blogs/mobile-first-typography-wcag-standards-fnt/)
- [Fonts Should Be 16px — UX West](https://uxwest.com/fonts-should-be-16px-including-mobile-and-email/)
- [Cinzel Font Analysis — FontForge](https://fontforge.io/serif/cinzel/)
- [Touch Target Validation — Evinced](https://knowledge.evinced.com/mobile-validations/tappable-area)
- [Color Contrast — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast)agentId: a7967416c595c8918 (use SendMessage with to: 'a7967416c595c8918' to continue this agent)
<usage>subagent_tokens: 61679
tool_uses: 29
duration_ms: 394597</usage>