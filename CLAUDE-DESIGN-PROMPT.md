# THE CODEX v3 — Claude Design Mega-Prompt

## COPY EVERYTHING BELOW THIS LINE INTO CLAUDE DESIGN

---

Design a complete, psychologically addictive mobile-first D&D 2024 companion app called "The Codex" — the flagship product of the Ash & Archive platform. This is not a utility app. This is a magical artifact. Every screen should feel like opening an ancient grimoire that pulses with quiet power.

## DESIGN PHILOSOPHY

**Psychological Addictiveness Principles:**
- Every interaction should deliver a micro-reward (satisfying haptic feel, subtle glow, gentle sound implication through visual cues)
- Variable reward schedule: AI responses are never the same, dice rolls create anticipation, streak counters build commitment
- Progress visibility everywhere: XP bars, streak flames, mastery badges — the user should always feel like they're growing
- Collection mechanics: Toys are collectible, combinable, and shareable — triggering the "gotta catch 'em all" instinct
- Identity investment: The deeper you build your character's persona, the more the app feels like YOURS
- One-handed operation: Everything reachable with a thumb at a game table in dim lighting

**The Toy Method (Core Differentiator):**
Modular, reusable building blocks that players collect, create, and combine. Like LEGO for D&D strategy and roleplay. Each Toy is a card you can snap together with other Toys to create combat strategies, persona moments, or tactical playbooks. The dopamine hit comes from creating a new combination and seeing it work at the table.

## VISUAL IDENTITY — "THE GRIMOIRE AESTHETIC"

Study the attached reference images carefully. The visual language is:

**Atmosphere over cleanliness.** Every screen has depth — subtle texture, atmospheric grain, the feeling of ancient parchment behind glass. NOT flat material design. NOT sterile dark mode. Think: a sword in a stone with glowing runes. A map on weathered parchment behind frosted glass. Character portraits in ornate hexagonal frames with Celtic knotwork.

**Color Palette (exact hex values):**
- Void-0: #070B10 (deepest background — near-black with blue undertone)
- Void-1: #0C1220 (card backgrounds — dark navy)
- Void-2: #1A2434 (elevated surfaces — dark steel blue)
- Forge-0: #F7E8C8 (primary text — warm parchment white, NOT pure white)
- Forge-1: #C9A86C (secondary text — aged gold)
- Forge-2: #8B7855 (tertiary text — bronze muted)
- Arcane: #3DD2FF (cyan — primary actions, world features, active states)
- Eldritch: #8B5CF6 (purple — magic, toys, class features, mystery)
- Ember: #F4B545 (amber gold — warnings, fire, concentration, warmth)
- Verdant: #39D98A (emerald — healing, success, growth, training)
- Blood: #EF4444 (danger, death saves, critical failures)

**Typography:**
- Display/Headers: Elegant serif or semi-serif (like the "Rise of the Merlin" or "The Cymry of Caer Dyvi" styling) — commanding, ancient, authoritative
- Body: Clean sans-serif — readable in dim lighting at arm's length
- Stats/Numbers: Monospace — precise, tactical, data-dense

**Card Treatment:**
- Glass cards with frosted backdrop blur over atmospheric dark backgrounds
- Subtle warm border glow (not harsh lines — think candlelight on glass)
- Cards should feel like they're floating slightly above the surface
- When tapped/active, cards should feel like they illuminate from within

**Texture & Depth:**
- Subtle grain/noise overlay across backgrounds (like aged paper or stone)
- Layered shadows creating true depth (not flat drop shadows)
- Ambient glow effects around accent-colored elements
- Ornate but subtle decorative elements (thin rule lines, small rune-like symbols as dividers)

## SCREEN DESIGNS — 390px Mobile Viewport

### SCREEN 1: THE PERSISTENT SHELL (Header + Bottom Nav)

**Header Bar (always visible, every screen):**
- Left: "The Codex" in elegant serif/display font — small, confident, not shouting
- Center: HP Bar — THE most important element. Large "47/52" number with a horizontal bar behind it. Verdant fill that depletes to blood-red as HP drops. Tappable — opens HP controls overlay. When HP is below 50%, the bar subtly pulses. When at 0, death save mode activates automatically.
- Right: Character hexagon portrait (32px, ornate thin border like the Cymry character frames) with a small level badge overlay "5"

**Bottom Navigation (5 tabs):**
Tab bar sits on a frosted glass strip with very subtle warm top-edge highlight.
- Combat (crossed swords icon) — arcane cyan when active
- Spells (open book icon) — eldritch purple when active
- Toys (puzzle/blocks icon) — eldritch purple when active
- Train (flame/brain icon) — verdant green when active
- More (three dots or gear) — forge-1 gold when active

Active tab: icon glows with its accent color + thin underline bar. Inactive: forge-2 muted.
Labels: 11px minimum, forge-2 color, visible but quiet.
The entire nav area must be 64px + safe area inset.

### SCREEN 2: COMBAT TAB — "The War Table"

This is the hero screen. The screen a player stares at for 4 hours during a session. It must be scannable in 2 seconds, interactable with one thumb, and feel like a medieval command center.

**Scrollable sections, top to bottom:**

**2A. Action Economy Strip**
Horizontal row of 4 chunky toggle chips: Action | Bonus | Reaction | Move
- Available state: filled with arcane cyan background, icon + label
- Spent state: dimmed to void-2, strikethrough-like opacity, icon muted
- Reset button (circular arrow) on the far right
- The whole strip feels like flipping brass switches on a control panel

**2B. HP Command Center**
This is the damage/heal interface (since the header shows current HP):
- Large central HP number "47/52" with +/- stepper buttons on each side (chunky 48px round buttons)
- "Temp HP" pill badge next to the number (when active, shows in arcane cyan: "+8 Temp")
- Below: Death Save tracker — 3 success circles (verdant) and 3 failure circles (blood) in a row. Clean, stark, unmissable. Only visible when HP = 0.
- Below: Quick buttons row: "Heal 5" | "Damage" (opens numpad) | "Temp HP" (opens input)

**2C. Paladin Resources (conditional — only for Paladins)**
Glass card with warm ember edge-glow:
- **Lay on Hands Pool:** Verdant progress bar with "15/25 HP" label. Below it: pill buttons "Heal 5" | "Heal 10" | "Cure Poison (5)" | Custom input
- **Channel Divinity:** 2 ember-colored pip circles (filled = available, empty = spent). Below: "Hearthfire Manifest" as the option label
- **Aura of Protection:** Small badge — shield icon + "10ft" in arcane

**2D. Spell Slot Pips**
Each spell level is a row:
- Level label (monospace, forge-2): "1st", "2nd", "3rd"
- Filled circles = available (eldritch purple with inner glow), empty circles = spent (void-2 with thin border)
- Tap filled to expend, tap empty to restore
- Pips should feel like magical orbs — not flat UI dots

**2E. Concentration Tracker**
When concentrating: ember-bordered card showing spell name with pulsing ember glow
When not: compact row of concentration spell buttons to quick-set

**2F. Smart Actions Panel**
Three collapsible sections with thin ornamental dividers between them:

Section 1 — "Class Actions" (expanded by default, header in ember):
Three action cards for Paladin: Divine Smite | Lay on Hands | Channel Divinity
Each shows: name, brief description, resource remaining (e.g., "2 slots" / "15 HP" / "1 use")
Tapping asks AI for tactical advice

Section 2 — "Quick Cast" (expanded by default, header in eldritch):
Prepared spells grouped into sub-sections: "Actions" | "Bonus Actions" | "Reactions"
Each spell pill shows: name + level badge. Concentration spells have a tiny ember dot.
Tapping asks AI for tactical use.

Section 3 — "Basic Actions" (collapsed by default, header in forge-1):
Grid of standard actions (Attack, Dash, Dodge, etc.) — compact, accessible but not dominant.

**2G. AI Combat Advisor — "The Oracle"**
Glass card with arcane edge-glow:
- Header: "The Oracle" with sparkle icon
- Input: "Describe the situation..." with a send button
- Response area: glass card with formatted tactical advice
- Loading state: subtle rune-circle spinning animation (NOT a generic spinner)
- The AI response should feel like receiving wisdom from an ancient source

**2H. Dice Roller — "The Bones"**
Compact horizontal strip:
- 6 dice buttons in a row: d4, d6, d8, d10, d12, d20 — each shaped slightly like their die
- Roll result: large number display that "tumbles" into place
- Last 3 rolls visible as small history below
- Advantage/Disadvantage toggle (2d20 keep high/low)

**2I. Rest Buttons**
Two buttons side by side: "Short Rest" (moon icon) | "Long Rest" (sunrise icon)
Secondary style, understated — these are end-of-encounter actions, not the main UI.

### SCREEN 3: SPELLBOOK TAB — "The Grimoire"

**3A. Search + Filters**
- Search bar with magnifying glass icon, placeholder "Search the grimoire..."
- Horizontal scrollable level tabs: All | Cantrips | 1st | 2nd | 3rd...
- Prepared filter toggle: star icon + "Prepared" with count badge "7/9"

**3B. Spell Cards (show 3 examples)**
Each spell card is a glass card with rich detail:

**Example Card 1 — Burning Hands (prepared, expanded):**
- If concentration: ember left-border stripe (2px)
- Spell name in display font, bold
- Badge row: "1st - Evocation" (ember badge) | "Action" (neutral badge) | NO concentration badge needed here
- Combat stats row: "3d6 Fire | DEX Save | 15ft cone" — ember numbers, arcane save, forge-2 area
- Tactical note: lightbulb icon + "Best against grouped enemies in narrow spaces" in italic forge-2
- Star toggle (top right) — filled ember star = prepared
- Expand/collapse chevron
- When expanded: full description text, "At Higher Levels" card, "Roll Damage" button (rolls 3d6 in the dice roller), "Explain" and "Tactics" AI buttons
- Unprepared spells: 50% opacity, visually receded

**Example Card 2 — Shield of Faith (concentration, bonus action):**
- Ember left-border stripe
- "1st - Abjuration" badge | "Bonus" (ember badge since bonus action)
- "+2 AC | 10 min | Concentration"
- Tactical note: "Cast before combat when possible. Doesn't cost your action."

**Example Card 3 — Divine Smite (special, always prepared):**
- "2d8 Radiant (+1d8/slot) | Melee hit"
- "Always Prepared" badge in verdant

### SCREEN 4: TOYS TAB — "The Toybox" (THE DISRUPTOR FEATURE)

This is what makes The Codex unlike any D&D app ever built. Make it feel special, collectible, playful yet powerful.

**Header:** "The Toybox" in display font with puzzle icon in eldritch purple

**Sub-navigation:** 3 chip tabs: "Combos" | "Tactics" | "Persona"

**4A. SPELL COMBOS View:**
Cards that look like strategy blueprints — think war room planning cards:

**Combo Card: "The Fortress"** (3-turn strategy)
- Card with eldritch left-border and subtle glow
- Title in display font
- 3 turn steps shown as a vertical timeline:
  - Turn 1: Shield of Faith icon + "Shield of Faith (Bonus)" — thin connecting line down
  - Turn 2: Spirit Guardians icon + "Spirit Guardians (Action)" — thin connecting line down
  - Turn 3: Dodge icon + "Dodge (Action)"
- Tag pills below: "Defensive" | "AoE" | "Concentration"
- Resource cost summary: "1st + 3rd level slots"
- "Deploy" button (eldritch, activates tracking in combat tab)
- "Edit" button (ghost)

**Combo Card: "Holy Nova"** (burst damage)
- "Attack + Divine Smite x2"
- "Potential: 4d8+2d6+STR x2 damage"
- Tags: "Burst" | "Resource Heavy" | "Boss Killer"

**Floating Action Button:** "+ Create Toy" in eldritch purple, bottom right, circular, glowing

**4B. TACTICS View:**
Visual tactic cards with simple top-down positional diagrams:

**Tactic Card: "Flanking Smite"**
- Simple overhead diagram: two ally tokens flanking an enemy token, arrows showing movement
- "Advantage from flanking + Divine Smite = devastating"
- "When to use: Boss fights with melee allies"

**Tactic Card: "Retreat & Heal"**
- Diagram: token moving away with arrow, then heal symbol at destination
- "Disengage (Action) -> Move 30ft -> Lay on Hands next turn"

**4C. PERSONA View:**
Your character's soul, laid out as modular personality blocks:

- **Default State:** Large italic quote — "Still, warm, watchful — like a banked coal."
- **Physical Tics:** Row of tappable pills that glow briefly when tapped (tactile fidget toy feeling):
  "Adjusts gear" | "Stands in front" | "Touches ember" | "Rolls coin" | "Checks exits"
- **Scene Instincts:** Checklist items with small ornate bullet points:
  "Walk the perimeter" | "Feed people first" | "Check allies before self"
- **Voice Notes:** "Low and even. Rarely raises voice." in italic
- **Active Catchphrase:** "That'll hold." — tappable to cycle through all catchphrases
- **Patron Card:** Ornate small card — "Aesis the Shepherd" with domain icons (flame, shield, gathering hands)

### SCREEN 5: TRAIN TAB — "The Forge"

**Header:** "The Forge" with flame icon in verdant. Subtitle: "Become the player your party deserves."

**Mastery Stats Bar:**
- Training streak: flame icon + "7 Day Streak" in ember
- XP bar: progress toward next rank
- Current rank badge: "Apprentice" / "Journeyman" / "Master"

**Sub-navigation:** 3 mode chips: "Rules Quiz" | "Roleplay Coach" | "Combat Sims"

**5A. RULES QUIZ:**
- Score badge: "7/10 — 70%" with difficulty selector
- Question card: glass card with question text, 4 answer options as chunky buttons
- After answering: verdant flash for correct, blood flash for wrong, explanation card slides up
- "Next Question" button
- Streak counter visible (fire icons)

**5B. ROLEPLAY COACH:**
- Scene prompt card (atmospheric, storytelling feel):
  "Your party has just defeated a group of bandits. One surrenders, begging for mercy. The rest of the party wants to execute them."
- "How does your character respond?" — text input area
- AI feedback card: "Persona Consistency: 8/10" with specific suggestions
- Persona reference pills visible for quick reference

**5C. COMBAT SIMS:**
- Scenario card with tactical situation description
- Visual representation of the scenario (simple icons showing positions)
- "What do you do?" input
- AI evaluation: "Tactical Score: 7/10" with optimal play comparison
- "Your play vs Optimal" side-by-side breakdown

### SCREEN 6: CHARACTER SHEET OVERLAY

Triggered by tapping the character portrait hexagon in the header. Slides up as a bottom sheet covering 90% of the screen.

**Character Identity:**
- Large hexagonal portrait frame (ornate border, like the Cymry reference)
- Name: "Astera" in display font
- Class/Level badge: "Paladin 5" in eldritch
- Race badge: "Changeling" in arcane
- Subclass: "Oath of the Hearth" in ember

**Ability Scores:**
6 boxes in a 3x2 grid, each showing:
- Ability abbreviation (STR, DEX, etc.) in small caps
- Score number (large, monospace): 16
- Modifier (in parentheses): (+3)
- Proficient saves get a verdant dot indicator

**Quick Stats Row:**
AC: 18 (shield icon) | Speed: 30ft (boot icon) | Initiative: +0 (lightning icon)

**Conditions:**
Empty state: "No active conditions" with + button to add
When active: condition badges (Frightened, Poisoned, etc.) with X to remove

**Equipment Summary:**
Compact list: "Longsword, Shield, Chain Mail, Holy Symbol"

**Proficiencies:**
Skills listed with proficiency dots, saving throw proficiencies highlighted

Close button (X) in top right or swipe down to dismiss.

### SCREEN 7: DICE ROLLER EXPANDED

Triggered by tapping the compact dice strip in Combat, or from spell card "Roll" buttons.
Slides up as a bottom sheet.

**The Rolling Surface:**
- Large result display area — number appears with a satisfying "tumble" animation
- Result number is HUGE (48px+), centered, with the roll expression below it ("2d8 + 4 = 14")

**Dice Buttons:**
- 6 large dice buttons in a grid: d4, d6, d8, d10, d12, d20
- Each button subtly shaped or colored to suggest the die
- d20 is the largest/most prominent

**Roll Modifiers:**
- Advantage/Disadvantage toggle (only for d20)
- Modifier input: +/- stepper with number
- Custom expression input: "2d8 + 3d6 + 5"

**Roll History:**
- Scrollable list of last 10 rolls
- Each entry: "Divine Smite: 2d8 = 14" with timestamp
- Critical hits (nat 20) highlighted in ember with subtle glow
- Critical fails (nat 1) highlighted in blood

### SCREEN 8: SETTINGS / MORE TAB

Clean, organized settings:
- AI Configuration (provider, API key, model)
- Character Management (export, import, delete, level up)
- Upgrade to Combat-Ready (for Paladin resource activation)
- Rest Management
- About: "The Codex v3.0 — Part of Ash & Archive"
- Design should match the grimoire aesthetic but be functional/scannable

## CRITICAL DESIGN REQUIREMENTS

1. **Every interactive element: 44px minimum touch target.** No exceptions.
2. **Works at 375px width.** Nothing breaks, nothing overflows.
3. **Readable in dim lighting.** Forge-0 text on void-0 backgrounds. Nothing below 11px except decorative elements.
4. **One-handed usability.** Bottom nav is thumb-reachable. Key actions in lower 60% of screen.
5. **Loading, error, and empty states** for every data-driven section.
6. **No emoji.** Use icons (Lucide-style line icons) exclusively.
7. **Motion:** Smooth 200ms transitions. Cards fade/slide in. Dice tumble. Spell slots discharge with a subtle particle effect. All animation respects reduced-motion preference.
8. **The app should feel alive** — subtle ambient animations (floating ember particles near fire elements, gentle pulse on active concentration, breath-like glow on the HP bar when low).

## THE FEELING

When a player opens this app at the table, their friends should lean over and say "What IS that?" It should feel like they're holding a piece of the game world in their hands. Not an app. An artifact.

The benchmark is not D&D Beyond. The benchmark is: would a concept artist at Wizards of the Coast be impressed by this UI?

Make it unforgettable.
