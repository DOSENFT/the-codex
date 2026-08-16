# Inspiration catalogue — gathered, labelled, and judged

Gathered 2026-08-15 across six buckets. **34 entries**, every one with a named source, a URL, a
specific mechanic to steal, the Codex surface it serves, and the way it fails if copied naively.

This is step 1 and step 2 of the design process: *find inspo*, then *organise and label it*. It is
reference, not decision. The decisions live in `02-three-directions.md`.

**Reading rule:** an entry earns its place by naming a *mechanic*, not a vibe. "Dark fantasy game UI"
is not a steal. "Spent resources turn orange and slide left before decrementing" is a steal.

Buckets:
- **A** — design-community concepts (Dribbble / Behance / portfolios)
- **B** — real shipped game interfaces
- **C** — instrument density under stress (cockpits, dive computers, patient monitors)
- **D** — illuminated manuscripts and book craft
- **E** — tablet interfaces that are genuinely tablet-shaped
- **F** — material depth in digital design

---

## Bucket A — Design community

**A1. "Game UI/UX in Dark Fantasy Style" — Alexander Kostevski (Agnose)**
· https://www.behance.net/gallery/195149715/Game-UIUX-in-Dark-Fantasy-Style
**Steal:** one reusable card shell across all themed environments — swap a texture, recolour an accent,
and the same component serves every surface. Build the card once; Grimoire, Combat, and Identity inherit it.
**Serves:** Global. **Risk:** built for mobile-monetization LiveOps, so composition is top-heavy with
"reward visibility." Transplant it unexamined and every screen feels like it's about to offer you a gem pack.

**A2. "Dungeons of Kitsu" — Maryna Zimakina & Yurii Litovskyi**
· https://www.behance.net/gallery/220307959/Dungeons-of-Kitsu-UIUX-Design
**Steal:** a published style guide where buttons, icons, cards and bars share one token layer, so every
card *state* (default / hover / spent / locked) derives rather than being drawn. Maps straight onto spell-card states.
**Serves:** Grimoire · Global. **Risk:** built for a Telegram/crypto scrolling feed — tap targets too
small and density too high for one-handed use at a table in dim light.

**A3. "Tarot App Design" — Thao Nguyen for Onteractive**
· https://dribbble.com/shots/7696045-Tarot-App-Design
**Steal:** the reveal is one card filling the viewport, never a grid. A single focused object reads faster
under bad lighting than a cluttered grid.
**Serves:** Grimoire · Identity. **Risk:** tuned for leisurely reading. A full-bleed reveal adds navigation
depth — wrong for a two-second lookup with people waiting. Apply to the *detail* view only, never the list.

**A4. "Golden Thread Tarot Companion" — Tina Gong**
· https://dribbble.com/shots/2377027-Golden-Thread-Tarot-Companion-App
**Steal:** gold line-art sits *inside* the card frame so illustration and chrome are the same material —
the border decorates and contains at once, removing a whole layer of visual noise.
**Serves:** Grimoire · Global. **Risk:** single-weight hairline gold. At 390px under a warm bulb, hairlines
vanish. **Minimum 2px stroke, tested at real table brightness.**

**A5. "Inktober 2024 — Spellbook" — Jesse Cooke**
· https://dribbble.com/shots/25143063-Inktober-2024-Spellbook
**Steal:** the book is a physical object — page texture, spine shadow, ink bleed — and each mechanic is a
book affordance (bookmark tabs = categories, spread = detail). Zero-ambiguity metaphor.
**Serves:** Grimoire. **Risk:** at 390px the page texture reads as noise, not craft. Must be rebuilt as
clean vector; pixel rendering dies at non-integer zoom. See anti-pattern 4 — this is the canonical example.

**A6. "Digital Character Sheet Redesign" — Dan**
· https://dribbble.com/shots/16970627-Digital-Character-Sheet-Redesign
**Steal:** stats clustered by function (physical / mental / social) rather than listed alphabetically.
Spatial grouping encodes the D&D mental model so you scan by cluster, not by index.
**Serves:** Identity. **Risk:** ⚠ *Dribbble fetch was blocked — this is inferred from title and category
convention, not confirmed by pixel review.* Treat as a hypothesis, not a citation.

**A7. "DnD App Concept" — Ben Gothman** · https://www.bengothman.com/dnd-app-concept-ux-page
**Steal:** initiative and combat designed as two paired screens (DM phone / player phone) operating in one
session — the app is explicitly a multi-device system, which validates "table companion" as shared ambient
context rather than solo use.
**Serves:** Combat · Dice. **Risk:** targeted a 1980×1020 TV (10-foot UI: 24px minimum, desaturated, no pure
black). That colour rationale directly contradicts gold-on-near-black at phone distance. **Steal the
multi-surface session model only; discard the palette reasoning.**

**A8. Kostevski — event scalability pattern** *(second distinct steal from A1)*
**Steal:** an abstract "reward moment" container receives a skin without structural change. For the Codex:
one *result card* component — dice result, spell outcome, death save — architected as a skinnable moment,
not bespoke per event.
**Serves:** Dice · Combat. **Risk:** monetization moments are tuned to 3–5s dwell for dopamine. A functional
result at a real table must read in 0.5s. **Cut animation length by ~80%.**

**A9. "Wizard Legacy: Alchemy RPG"** · https://www.behance.net/search/projects/fantasy%20game%20ui
*(surfaced in search; direct gallery URL not resolvable)*
**Steal:** two-panel crafting — ingredients left, result preview right — showing the outcome *before* commit.
Maps to spell composition: components + school + level = preview before you spend the slot.
**Serves:** Grimoire. **Risk:** built for slow exploratory sessions; the typical 6×8 inventory grid is lethal at 390px.

**A10. "Dark RPG Game UI Concept"** · https://www.behance.net/search/projects/rpg%20game%20ui
*(top of search; gallery requires login)*
**Steal:** **vignette-as-state-indicator** — screen edges darken to red/amber at low health, making status
legible in peripheral vision with no bar. Directly relevant to bad-lighting table context.
**Serves:** Combat · Global. **Risk:** needs 60fps or it strobes and reads as a bug. Must be a GPU-composited
layer, not a CSS filter repaint.

---

## Bucket B — Shipped game interfaces

**B1. Baldur's Gate 3 — reaction prompts** (Larian, 2023)
· https://baldursgate3.wiki.fextralife.com/Reactions · https://www.gameuidatabase.com/gameData.php?id=1747
**Steal:** reactions surface as an interruptible, time-pressured prompt containing exactly three fields —
name, cost, skip. Proof that "which ability applies right now" needs no explanatory prose.
**Serves:** Combat. **Risk:** **BG3 shows name and cost but no effect summary** — it assumes you already know.
A video-game player has paused time to remember; a D&D player mid-combat does not. **The Codex must add the
one-line effect summary BG3 deliberately omits.** Also: BG3's slot display is colour-only glowing squares,
inaccessible without colourblind mode — do not replicate colour-only differentiation.

**B2. Elden Ring — resource residue trail** (FromSoftware, 2022)
· https://medium.com/@marcelbonzani/a-mini-deep-dive-into-elden-rings-ui-ux-9ccbc271cc9b
**Steal:** spent resources don't vanish — they turn orange and slide left as a residue trail before
decrementing, so cost registers in peripheral vision as *material loss* rather than instant subtraction.
**Serves:** Combat · Global. **Risk:** needs 60fps to read as information rather than glitch. Elden Ring also
hides bars when full — viable when health never changes in menus, wrong for an app where HP is hand-edited.

**B3. Elden Ring — status build-up indicators**
**Steal:** negative buildups get a dedicated bar below the health cluster, centre-lower — exactly where eyes
rest in combat — with hue encoding damage type before any label is read.
**Serves:** Combat. **Risk:** depends on 5–6 hues staying distinguishable under amber light. **Warm 2700K
light shifts blue/purple toward grey — anything using violet needs a shape or texture backup, not colour alone.**

**B4. Divinity: Original Sin 2 — action point dots** (Larian, 2017)
· https://divinityoriginalsin2.wiki.fextralife.com/Action+Points
**Steal:** AP as a row of discrete filled/empty circles, not a bar — the cost of the selected action shows as
dots shifting state. "This costs 2" becomes a literal count, not a number changing.
**Serves:** Combat · Dice. **Risk:** breaks past ~6 dots. **A 9th-level slot row at 9 pips is unscannable at
table distance** — high-level characters need a different encoding.

**B5. Disco Elysium — skill check feed** (ZA/UM, 2019)
· https://80.lv/articles/disco-elysium-working-on-ui-design
**Steal:** a Twitter-style tumbling column where check results push upward chronologically, so "what the dice
said" lives in scroll rather than behind a modal history screen.
**Serves:** Dice · Grimoire. **Risk:** needs 3–4 visible entries to work as a feed. Collapses to 1–2 in
landscape at 390px. **Portrait only.**

**B6. Persona 5 Royal — context palettes** (Atlus, 2019)
· https://medium.com/@marktan_98815/persona-5-a-masterclass-in-ui-design-6e0470d2020f
**Steal:** each context owns a palette and motif — green/wire-mesh for weapons, blue/spheres for medicine —
so the skin says which system you're in before you read a label. Mode legible in ~100ms.
**Serves:** Global. **Risk:** works because 6 vendors map to 6 *fully committed* palettes that never bleed.
See anti-pattern 3.

**B7. Persona 5 Royal — cut-ins** · https://megamitensei.fandom.com/wiki/Cut-in
**Steal:** a character portrait slams diagonally into frame for ~0.4s at activation, encoding "significant
action" as a *character moment* rather than a number floating up.
**Serves:** Dice · Combat. **Risk:** 24–30 frames of full-screen illustration. **Every interruption adds
~400ms of perceived latency** — against a 15-second turn target that is unaffordable. Reduce to a corner
flash, or make it optional.

**B8. Destiny 2: The Final Shape — tiered HUD** (Bungie, 2024)
· https://dotesports.com/destiny/news/destiny-2-lifts-veil-on-highly-anticipated-hud-overhaul-coming-in-the-final-shape
**Steal:** a four-tier priority system for 2,000+ buffs — activity-critical top-centre, second-to-second above
the super meter, medium-term in a side channel, passive lowest. **Position encodes urgency with no label
saying "important."** Directly serves separating "act now" from "reference later."
**Serves:** Combat · Global. **Risk:** assumes a fixed 16:9 TV. On iPad the four channels compress into one.
**Reduce to two tiers (act-now / reference) or the spatial encoding collapses.**

**B9. Destiny 2 — icon system** — Lyndon Willoughby · https://willowstration.com/project/destiny-2-ui-icons
**Steal:** icons lean on established elemental language — Prismatic is "circular forms interrupted by
triangular silhouettes." For spell schools: **a base silhouette per school plus a modifier for level**,
rather than illustrating each spell's effect. Scales to any spell count with no bespoke art.
**Serves:** Grimoire · Combat. **Risk:** designed at 64×64 minimum. **The school-shape system only works
above 48×48** — at 32×32 the modifier reads as noise.

**B10. Alan Wake 2 — the Mind Place hand** (Remedy, 2023)
· https://www.gamedeveloper.com/design/true-detective-meets-hearthstone-unlocking-the-metaphysical-mind-place-of-alan-wake-ii
**Steal:** clues collect into a Hearthstone-style *hand* at screen bottom, so the full inventory of available
moves stays visible while you decide. Maps to a persistent "reactions and active effects" hand during combat.
**Serves:** Combat. **Risk:** the board itself is a full-screen diegetic room requiring a context switch —
unaffordable mid-combat. **The hand is portable; the board is not.** See anti-pattern 6.

**B11. Frostpunk — radial anchor** (11 bit, 2018)
· https://news.xbox.com/en-us/2019/09/20/frostpunk-console-edition-radial-driven-design-of-gameplay-and-controls/
**Steal:** all navigation originates from one central point — the generator — so the visual centre and the
functional centre are the same object. The portrait or the d20 could anchor quick actions the same way.
**Serves:** Global · Combat. **Risk:** built for a gamepad radial. **Touch radials fail below 8 segments at
48px radius with shaky hands** — see anti-pattern 5.

**B12. Disco Elysium — Thought Cabinet**
**Steal:** each skill is a named, illustrated *voice* rather than a number, making systemic information feel
narrative. Argues for named entities over stat codes wherever space allows.
**Serves:** Identity · Grimoire. **Risk:** 24 bespoke illustrated panels is not an achievable asset volume
here. **The naming principle is portable; the illustration requirement is not.**

---

## Bucket C — Instrument density under stress

**C1. Formula 1 steering wheel display**
· https://medium.com/@ukgqee/inside-the-fast-lane-ux-lessons-from-formula-1-cockpits-pit-stops-steering-wheels-440b1554345a
**Steal:** urgency is **chromatic isolation, not size** — one red-flashing icon pulls the eye out of a flat
field of telemetry. Routine state is visually flat; anomalies are chromatically loud.
**Serves:** Combat. **Risk:** drivers have thousands of trained hours routing attention to fixed zones.
Copy the density without the training and you get noise. **Requires the same zone layout on every screen so
muscle memory can form across sessions.**

**C2. Airbus A320 Primary Flight Display** · https://en.wikipedia.org/wiki/Primary_flight_display
· https://contrail.in/a320-pfd-indications/
**Steal:** a fixed spatial grammar — attitude centre, speed left tape, altitude right tape, heading bottom —
so the eye never hunts and any zone departing from normal is caught by peripheral detection. **Amber =
impending threat, red = active threat, and no other colour carries severity.**
**Serves:** Global. **Risk:** pilots study the layout during certification. **A Codex user may open a screen
for the first time mid-combat — the grammar must be self-labelling on first encounter, not merely consistent.**

**C3. Shearwater Teric / Perdix dive computer**
· https://www.thescubanews.com/2025/10/12/what-divers-say-the-shearwater-teric-dive-computer/
**Steal:** every state shows persistent button labels at the bottom edge, so someone who hasn't touched the
device in six months can operate it in seconds. **Navigation is labelled, never implied.**
**Serves:** Global — **this is the most direct answer to baseline fault #3.** Always show the mode you are in
and the next available action.
**Risk:** works because it's 2–4 physical buttons with hardware affordance. On a touchscreen, persistent
labels compete with content — they must be anchored to a safe-area strip and read as chrome, not content.

**C4. Garmin G1000 glass cockpit**
**Steal:** a permanent split between PFD (*what is happening now*) and MFD (*context, map, systems*) that is
never violated, establishing a durable cognitive division between current state and reference.
**Serves:** Combat + Grimoire. **This is the argument for the iPad two-pane spread:** left = live encounter,
right = reference. Baseline fault #1 is that the left pane currently has no meaning and fault #3 lives in the right.
**Risk:** assumes landscape. **The split must be defined relative to the primary hand-hold, not the orientation**,
or it breaks on reflow.

**C5. Teenage Engineering OP-1 Field**
· https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97
**Steal:** each mode has a *visual personality* — colour field and graphic idiom, not just a label — so mode
switching is a gestalt perceptual shift. Mode identity is ambient.
**Serves:** Global. **Risk:** musicians stare; a D&D player glances. **Mode identity must land in under 200ms
of peripheral recognition — a 4pt accent gutter is enough. Full-screen colour-field changes are disorienting
when the game is live.**

**C6. Philips IntelliVue patient monitor**
**Steal:** the most time-critical parameter is the largest numeral, top-left, degrading systematically
downward — priority encoded spatially *and* typographically at once, so hierarchy is read before any value.
**Serves:** Combat. **Risk:** designed for 2–6m viewing. **At 30–60cm a 6:1 size ratio screams — compress to
about 2.5:1** to keep hierarchy without discomfort.

**C7. ustwo Auto — ambient light strip**
· https://medium.com/@autoustwo/our-experience-approach-to-hmi-design-6859a32d8aaf
**Steal:** cabin perimeter lighting pulses to signal events, so urgency lives in peripheral vision and the
screen is never interrupted by an alert. A pulsing edge glow could signal "your turn" or "concentrating"
without pulling you off the content.
**Serves:** Combat. **Risk:** on AMOLED, edge animation costs battery and risks pixel fatigue. **Keep loops
under 2s and respect `prefers-reduced-motion`.**

---

## Bucket D — Manuscripts and book craft

**D1. Book of Kells** (c. 800 CE) · https://mymodernmet.com/european-medieval-illuminated-manuscripts/
**Steal:** the *carpet page* — a full spread of pure pattern, no text — resets the reader into a new register
before new content. A mode change encoded kinesthetically rather than typographically.
**Serves:** Global. **Risk:** **anything over 300ms at a live table feels like lag.** Only viable as a
near-subliminal crossfade, never a deliberate animation beat.

**D2. Très Riches Heures du Duc de Berry** (Limbourg Brothers, 1412–16)
**Steal:** a three-depth layered system — core text, initials/headers, margin annotation — where **layers
never compete because they never share a spatial zone**, so no separators are needed.
**Serves:** Grimoire. A spell entry becomes: description (body zone), mechanics and DCs (rubric zone),
components and source (marginalia zone).
**Risk:** the manuscript has a wide physical border; **a 390px phone has no margin.** Marginalia must collapse
to a bottom sheet on phone and only become a true sidebar on iPad landscape.

**D3. Lindisfarne Gospels** (c. 715 CE)
· https://www.slsa.sa.gov.au/shall-i-pen-you-a-letter-initials-manuscript-and-print
**Steal:** insular majuscule *ramps down in scale across the first line* — enormous initial, large next few,
medium next few, then body — so hierarchy is embedded in the text rather than imposed as a separate heading.
**Serves:** Grimoire. A spell name could ramp 28px → 20px → 16px, making the drop cap functional, not decorative.
**Risk:** `initial-letter` is supported broadly now, but **an oversized first letter collapses the leading of
lines 2–3** unless positioned precisely or taken out of flow.

**D4. Rubrication** (medieval scribal tradition, 12th–15th c.)
· https://www.gildedplanet.com/illumination.html
**Steal:** red was used **exclusively for instructions to the reader** — headings, cues, directions — never
for body content. Gold carried primary/divine content, blue secondary. The system was so consistent across a
whole manuscript culture that a reader trained on one book could read any other.
**Serves:** Global. **The Codex has gold but no rubric colour.** The missing move is a third accent used
*only* for "what you must do right now": roll this, take this action, your turn.
**Risk:** a third accent can break the grimoire aesthetic. **Keep it desaturated and warm — dried blood, not
traffic-light red.** Candidate `#c06030`.

**D5. Jost Hochuli, *Detail in Typography*** (1987)
**Steal:** 60–70 characters is the comfortable line; above 80 the eye loses its return path, below 45 the
rhythm breaks. At 16px on 390px, 60 characters ≈ 340px — so body text wants ≈87% of screen width.
**Serves:** Grimoire. **Risk:** derived from print at ~35cm. **At a table (30–50cm, variable, low light) the
practical range is 55–65 characters** — and it must be measured in the actual typeface, not by generic rule.

**D6. Jan Tschichold, *The New Typography*** (1928) · https://archive.org/details/newtypographyhan0000tsch
**Steal:** white space as an active element. **Increasing leading helps a dense block; increasing word-spacing
hurts it.** On a dense screen, buy breathing room in the vertical axis, where it is cheap, rather than the
horizontal, where it is not.
**Serves:** Global. **Risk:** generous leading on short numeric labels makes rows look unrelated — group them
with a faint 1px `rgba(197,165,90,0.1)` rule rather than relying on space alone.

---

## Bucket E — Genuinely tablet-shaped interfaces

**E1. Procreate** (Savage Interactive)
**Steal:** the entire toolbar is a compact vertical strip on the left or right edge — never a horizontal bar —
retracting to ~44pt icon width so the centre is wholly content, expanding to labels only on tap-and-hold.
**Serves:** Combat + Grimoire. **Risk:** works because the non-dominant hand holds the toolbar while the
dominant hand draws. **At a table both hands may hold dice** — controls must sit in the lower 35% of the edge
strip to stay thumb-reachable, not distributed top to bottom.

**E2. LumaFusion** (LumaTouch)
**Steal:** three persistent simultaneously-visible zones — browser, source viewer, timeline — with resizable
boundaries, so **you are never taken to another screen to reach another data type** and cognitive state survives.
**Serves:** Combat. Maps to: initiative left, active character centre, active spell/ability right.
**Risk:** landscape-iPad only; reflows to two panes in portrait and one on phone. **Any three-zone design needs
explicit rules for all four contexts or the "always see everything" promise breaks.**

**E3. Shapr3D**
**Steal:** a floating draggable tool panel that **remembers its position between sessions**, letting expert
users build their own spatial workflow instead of accepting fixed chrome.
**Serves:** Global. **Risk:** real state-persistence work, and users can misconfigure themselves into a corner.
**Shapr3D always keeps a "reset layout" escape hatch — that is mandatory, not optional.**

**E4. Notability** (Ginger Labs)
**Steal:** a persistent left-edge hierarchy with the right 75% as content, so there is **no back-navigation,
only lateral movement** within a visible structure.
**Serves:** Grimoire. Evocation → 3rd level → Fireball without ever changing screens.
**Risk:** Notability's categories are user-generated and familiar; **PHB schools and source books may not match
the player's mental model.** Offer at least two sort axes (school AND level) inside the column, not behind settings.

**E5. Paper by WeTransfer**
**Steal:** a document is one continuous horizontal surface navigated by panning — the unit is a *spread of
arbitrary width*, and the mental model is a desk covered in sketches rather than a filing cabinet.
**Serves:** Identity. The whole character stays conceptually present even when not fully visible.
**Risk:** horizontal panning as primary navigation is unfamiliar and users will hunt for tabs. **Requires
position indicators (horizontal minimap dots) or people get lost.**

**E6. Concepts** (TopHatch)
**Steal:** the tool palette **auto-collapses when the Pencil touches the canvas** — chrome is minimal exactly
during creation and maximal exactly during configuration. Context-sensitive chrome driven by interaction type,
not a toggle.
**Serves:** Combat. **Risk:** intent detection is harder without a Pencil. **Define explicit rules: scroll =
expand chrome, tap-on-content = collapse.**

---

## Bucket F — Material depth

**F1. visionOS spatial UI — WWDC23** · https://developer.apple.com/videos/play/wwdc2023/10076/
**Steal:** glass is a *live* material responding to environment light; the ~40px blur desaturates the backdrop
just enough for text contrast without destroying spatial awareness. The cheap equivalent: **4–6% grain plus a
faint specular highlight on a card's top edge** reads as "material," not "coloured rectangle."
**Serves:** Global. **Risk:** wrong noise frequency looks like low-res dirt. **Fine grain, 100–200px tile,
3–5% opacity**, tested on Retina and non-Retina. On OLED any texture raises black level — keep opacity low.

**F2. Spatial UI elevation system — Chris Lemke** · https://designmd.app/library/spatial-ui-visionos
**Steal:** five z-tiers (base 0 / sticky-nav 100 / overlay 200 / modal 300 / toast 500), each with its own
shadow signature, so depth is readable without borders.
**Serves:** Global. **Risk — and this is the important one: you cannot shadow into black.** On `#0a0a08`,
`rgba(0,0,0,0.10)` is invisible. **Use light instead of shadow:** `box-shadow: inset 0 1px 0 rgba(197,165,90,0.15)`
reads as a surface catching light and produces elevation with no darker value beneath.

**F3. visionOS vibrancy**
**Steal:** secondary text is 60% opacity of the *primary* colour rather than a separate hue, so hierarchy
survives any background without a second palette.
**Serves:** Global. Secondary `rgba(240,230,211,0.6)`, tertiary `rgba(240,230,211,0.4)`.
**Risk:** transparent text over texture can drop into low-contrast pockets. **Test every level against the
lightest local background (`#1c1a15`), not the global minimum.**

**F4. Material Design 3 — tonal elevation** (Google)
**Steal:** elevation as a **tonal overlay**, not shadow — elevated surfaces take a wash of the brand colour.
Elevation-2 = `#0a0a08` + `rgba(197,165,90,0.06)`; elevation-4 = `+0.10`. Self-describing in a dark theme.
**Serves:** Global. **Risk:** overuse makes the whole UI uniformly sepia. **Reserve for surfaces that must
read as distinct objects — cards and modals — never for every layout region.**

**F5. "Objects not rectangles" — press states**
**Steal:** press is `scale(0.97)` + `brightness(0.88)` simultaneously — a *shape* change, which reads in
peripheral vision where a colour change does not. 80ms in, 120ms out.
**Serves:** Combat · Dice. **Risk:** scale on shadowed elements needs `will-change: transform` or the shadow
repaints each frame. Provide an opacity-only `prefers-reduced-motion` fallback.

**F6. Concentric corner radii — visionOS HIG**
**Steal:** `outer_radius = inner_radius + padding`. A 16px card containing an 8px-padded button requires an
8px button radius, or the nesting looks pasted on.
**Serves:** Global. Panel 16 → card 10 at 6 padding → chip 6 at 4 padding.
**Risk:** survives only as tokens (`--radius-panel/card/chip`). **The moment radii are hardcoded per component
it silently breaks.**

---

## Hard numbers

### Contrast — computed here, not quoted

⚠ **Both research agents reported wrong figures for gold** (one said 3.8:1, the other 6.2:1). Recomputed
directly from the WCAG 2.1 sRGB relative-luminance formula against the real palette values:

| Foreground | on `#0a0a08` | on `#12110e` | on `#1c1a15` |
|---|---|---|---|
| cream `#f0e6d3` | **16.01:1** | 15.25:1 | 14.04:1 |
| gold `#c5a55a` | **8.40:1** | 8.01:1 | 7.37:1 |
| amber `#d4a74a` | **8.89:1** | 8.47:1 | 7.80:1 |
| ember `#c06030` *(proposed rubric)* | **4.68:1** | 4.46:1 | 4.10:1 |
| violet `#8b5cf6` *(current dice button)* | **4.68:1** | 4.46:1 | 4.11:1 |

Thresholds: AA normal 4.5:1 · AA large (≥24px, or ≥18.7px bold) 3:1 · AAA normal 7:1.

**What this actually changes.** Gold clears **AAA on every background** — so the received wisdom that gold must
be restricted to large labels is false, and gold is available for body text. **The real constraint on gold is
not contrast. It is stroke rendering and coverage** (below). Ember and violet both land at 4.68:1: fine as
rubric and accent, but **neither may carry body text**, and ember must never be the only signal for something
critical.

### Type minimums for this context (30–60cm, low light, at speed)

- **IBM Plex Sans body: 16px minimum** on a 390px screen. 60 characters ≈ 338px — inside Hochuli's comfortable
  range, confirmed by measurement, not assumption.
- **Cinzel: never below 20px** on 390px. Its high stroke contrast puts hairlines under 1px physical on a 2×
  screen, where they alias to grey — a 20px Cinzel hairline in gold can drop to roughly **4:1 effective local
  contrast** despite the 8.40:1 nominal figure. **Use Cinzel Bold for anything under 24px.**
- **JetBrains Mono: 14px minimum** — mono's wider glyphs and higher x-height make 14px mono ≈ 16px sans.
- **Labels and badges: 12px floor, cream only.** Never gold at 12px.

### Touch

- Apple HIG minimum 44×44pt; WCAG 2.2 SC 2.5.8 minimum 24×24 CSS px, recommended 44.
- **At this table, target 48×48pt for anything primary** — above the HIG floor, because motor precision degrades
  with dice in the dominant hand.
- **12pt minimum gap** between adjacent targets (HIG says 8; 8 is not enough here).

### Gold coverage

Gold is ~51% saturation, ~55% lightness. **Keep it under roughly 20% of screen surface.** Past that the figure/ground
relationship inverts — the screen reads as gold-with-dark-details instead of dark-with-gold-highlights, and gold
labels lose their salience precisely because everything is gold. In the Book of Kells, gold leaf covers perhaps
5–15% of a page. **Cream is the primary text colour; near-black is the ground; gold is emphasis.**

---

## Anti-patterns — how this genre reliably fails

1. **Ornament that swallows the label.** Behance dark-RPG projects routinely show 12–16px filigree borders on a
   40px button — chrome eating 30–40% of the hit zone. At 390px the frame eats the tap target.
2. **Gold that disappears under table light.** Warm 2700K bulbs shift gold toward the background. The contrast
   maths says gold is safe; the *rendering* maths says hairline gold at small sizes is not. Both are true —
   see the Cinzel note above. A4 is the verified failure case.
3. **Context-palette creep.** Persona 5 works because palettes never bleed. Dark-fantasy apps add atmospheric
   violet to gold screens and ember glow to everything until all five accents appear everywhere and the
   system of meaning collapses.
4. **Beautiful static, illegible in motion.** Parchment filter + noise + grain + vignette + glow + 8 elements
   per card looks superb as a still and strobes under scroll. A5 is the canonical case.
5. **PC-scale radial menus on touch.** Copying Frostpunk's geometry without recomputing touch targets produces
   roughly 30% mis-taps in a crowded table environment.
6. **Depth without function.** Pin-and-string evidence boards communicate mystery, not speed. "Find the relevant
   condition" goes from 2 seconds to 8 because the layout encodes narrative instead of lookup priority.
7. **Reaction prompts with no effect summary.** BG3's omission is affordable in a game with pausable time and
   unaffordable at a live table.

---

## The seven moves most worth taking

Merged and re-ranked across both sweeps, judged against the nine baseline faults in `00-baseline-findings.md`.

| # | Move | Source | Fault it kills |
|---|---|---|---|
| 1 | **Persistent mode + next-action readout** — always show where you are and what you can do | C3 Shearwater | #3 nothing is ranked |
| 2 | **Two-tier urgency by position** — act-now zone vs reference zone, no labels needed | B8 Destiny 2 | #3, #4 concentration whispers |
| 3 | **Fixed zone grammar on every screen** — the eye never hunts; anomalies self-announce | C2 A320 / C4 G1000 | #1 stretched phone, #2 endless scroll |
| 4 | **Gold tonal elevation + specular top edge** — you cannot shadow into black | F4 + F2 | #9 two visual languages |
| 5 | **A rubric colour used only for "do this now"** | D4 rubrication | #4, #5 off-palette dice button |
| 6 | **Discrete dot encoding for resources** — count, don't read | B4 Divinity | #2 (with the 6-pip caveat) |
| 7 | **Three-layer entry depth** — core / rubric / marginalia, never co-located | D2 Très Riches Heures | #2, #7 type doesn't scale |

Moves deliberately **not** taken forward: full-screen cut-ins (B7 — costs 400ms against a 15s target),
the full case board (B10 — context switch mid-combat), radial menus (B11 — touch accuracy), single-card
full-viewport lists (A3 — navigation depth; kept for detail views only).
