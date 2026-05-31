# The Codex

**Your D&D brain, at the table and between sessions.**

The Codex is a mobile-first companion app for D&D 2024 (5th Edition revised) that actually understands how you play. It splits into two modes — **Play** for the table, **Prep** for everything between sessions — so you never scroll past 14 sections trying to find Divine Sense mid-combat again.

40K+ lines of TypeScript. Zero backend. Works offline. Runs on your phone.

---

## Two Modes, One App

The Codex is built around a single insight: **what you need at the table is not what you need between sessions.** A mode toggle in the header switches the entire interface.

### Play Mode (at the table)

Three tabs. Speed-first. Every tap counts.

| Tab | What it does |
|-----|-------------|
| **Combat** | Turn-centric tracker with a "My Turn" summary card, collapsible sections, HP management, action economy, spell slots, AI tactical advisor |
| **Grimoire** | Read-only, instant-search lookup of ALL your abilities — spells and class features unified, with tap-to-roll dice and resource tracking |
| **Roleplay** | Session cockpit for live RP — persona quick-access, dialogue picker, scene context filter, AI coaching |

### Prep Mode (between sessions)

Four tabs. Depth-first. Build your character properly.

| Tab | What it does |
|-----|-------------|
| **Character** | Ability scores, weapons, equipment, skills, class resources — everything about your character's mechanics in one place |
| **Grimoire** | Same unified view, but now editable — add/edit/delete spells and features with guided input |
| **Persona** | Identity engine, backstory builder, dialogue bank, accent coach, scene response bank |
| **Academy** | Training drills, quizzes, flashcards, improv exercises, interactive one-shots |

Settings lives in the header (gear icon) — accessible from both modes.

---

## Quick Start

```bash
git clone https://github.com/DOSENFT/the-codex.git
cd the-codex
npm install
npm run dev
```

Opens at `http://localhost:5173`. Accessible on your local network (phone, tablet) automatically.

### First Launch

1. **Create your character** — name, class, race, level, ability scores
2. **Set up AI** — tap the gear icon, configure Gemini (free) or Ollama (local)
3. **Add your spells** — switch to Prep mode, open the Grimoire, tap "+ Spell"
4. **Add class features** — same page, tap "+ Feature" — fill in Divine Sense, Lay on Hands, etc.
5. **Switch to Play mode** — you're ready for the table

---

## The Grimoire

This is the core innovation. At the table, players don't think "is this a spell or a feature?" — they think **"what can my character DO?"**

The Grimoire unifies spells + class features + racial abilities into one searchable, filterable view.

### How to use it

**Searching:** Type anything in the search bar. It searches names AND descriptions — so typing "divine" finds Divine Sense even if you forgot the exact name.

**Filtering:**
- **Type:** All | Spells | Features (with count badges)
- **Action type:** Action | Bonus | Reaction | Passive (tap "Filters" to reveal)
- **Prepared:** Toggle to show only prepared spells + always-available features

**Cards show everything at a glance:**
- Name + type badge (Spell/Feature) + action cost + range
- Damage dice + damage type + save DC
- Resource pips (spell slots or feature uses) — tappable to expend/restore
- Concentration and ritual flags

**Tap a card to expand** — full description, duration, components, higher levels, tactical tips, source reference.

**Actions on expanded cards:**
- **Roll** — opens the dice roller pre-filled with the correct notation
- **Copy** — copies the rules text to clipboard
- **Prepare** — toggles spell preparation (spells only)
- **Edit / Delete** — available in Prep mode only

### Spell Slots (Play mode)

A compact spell slot tracker sits above the card list. Tap a filled pip to expend a slot, tap an empty one to restore it.

---

## Combat

### Before combat

You see a simple "Start Combat" button and your HP tracker. Everything else is collapsed.

### During combat

**The Turn Summary card** appears at the top — this is your at-a-glance "what can I do NOW?" panel:

- **Round counter** + Next Turn button
- **Quick stats:** HP, AC, temp HP, active concentration, conditions
- **Available actions** categorized by type:
  - Actions: your weapons (with attack bonus + damage), prepared action spells, class features
  - Bonus Actions: bonus action spells and features
  - Reactions: reaction spells, opportunity attacks
  - Movement status
- **Spell slot pips** across all levels
- **Class resources** (Lay on Hands pool, Channel Divinity charges)
- **Quick Lookup** button — search the Grimoire without leaving combat

Tap any action option to open the dice roller with the correct roll pre-filled.

### Collapsible sections

Below the Turn Summary, everything is organized into collapsible sections that **remember their state per character**:

- Action Economy (manual toggle for action/bonus/reaction/movement)
- Spell Slots (full-size interactive pips)
- Class Resources (Lay on Hands with quick-spend buttons, Channel Divinity)
- Concentration (set/drop with spell picker)
- Damage Log (per-combat damage tracking)
- Combat Advisor (AI tactical chat)
- Actions Reference (full categorized action menu)
- Rest Management (short/long rest)

Collapse what you don't need. The sections you keep open persist between sessions.

### The Action Menu

Tap the Action/Bonus/Reaction buttons in the Action Economy section to open a full slide-up panel categorized by:
- Your weapons (with attack rolls)
- Cantrips
- Leveled spells (grouped by level, showing available slots)
- Class features
- Standard D&D actions (Dash, Dodge, Disengage, Help, Hide, Ready)

Selecting an action marks it as used, expends the slot if needed, sets concentration if applicable, and opens the dice roller.

### HP Tracking

- Damage: enter amount, tap Apply — temp HP absorbs first, then current HP
- Healing: same flow, capped at max
- Temp HP: set directly (doesn't stack per 2024 rules)
- Death saves: tracked automatically, reset when healed from 0

---

## Character Page (Prep Mode)

Your character's mechanical identity, all in one place.

### Ability Scores
A 3-column grid of your six scores with modifiers. **Tap any score to edit inline** — type the new value and press Enter. Saving throw proficiencies are flagged with a badge.

Below the grid: Passive Perception, Spell DC, Spell Attack Bonus.

### Skills
Full skill list with proficiency markers (* for proficient, ** for expertise) and calculated bonuses.

### Weapons
Each weapon shows attack bonus, damage notation, damage type, and properties. Magical weapons are flagged.

### Equipment & Supplies
Badge-style display of your inventory. Quick reference at the table.

### Class Resources
Visual trackers for Lay on Hands (progress bar with HP pool), Channel Divinity (pip tracker), and Aura Range.

### Export
Download your character as a JSON file for backup or transfer between devices.

---

## Persona & Identity (Prep Mode)

Four accordion sections for deep character work:

### Identity (Persona Engine)
The Toy Method character builder — define core traits, color traits, wants, fears, pressure response, and relationships. This feeds into AI coaching during sessions.

### Dialogue
- **Dialogue Bank** — save lines for different contexts (combat, social, discovery, emotional)
- **Scene Response Bank** — pre-written reactions to specific situations (confrontation, victory, fear, betrayal, mercy, joy, loss, discovery)

### Story (Backstory Builder)
AI-assisted backstory creation with key memories (each tagged with an emotional core), NPC relationships, unresolved threads, and personality seeds.

### Voice (Accent Coach)
Phonetic rule sets for fantasy accents, AI-generated practice phrases, and catchphrase management.

### Identity Manager
Multi-persona system for Changelings, disguises, Wild Shape, or any character who isn't always the same person. Each identity has its own appearance, accent, mannerisms, voice notes, dialogue lines, and social context.

---

## Roleplay Tab (Play Mode)

The Session Cockpit — promoted from a sub-view to a top-level tab because RP tools should be one tap away, not buried three levels deep.

- **Persona Strip** — your active persona at a glance
- **Identity Switcher** — swap personas mid-scene
- **Scene Context Filter** — filter your dialogue bank by what's happening (combat, social, discovery, emotional)
- **Action Cards** — quick-draw dialogue with one-tap copy
- **AI Assist** — "What would [character] do?" coaching

---

## Academy (Prep Mode)

Deliberate practice between sessions. Every drill knows your character.

| Drill | Description |
|-------|-------------|
| **Scene Coach** | AI generates a scene. You respond with SAY + DO. AI grades your persona consistency. |
| **Improv Drills** | Scenario-based roleplay scored against your defined traits |
| **Conversation Drill** | NPC dialogue training with per-exchange voice coaching |
| **Interactive One-Shots** | AI-narrated mini-adventures with real-time characterization feedback |
| **Rules Quiz** | Adaptive D&D 2024 rules testing focused on YOUR class and spells |
| **Spaced Flashcards** | SM-2 algorithm for long-term retention of rules and persona traits |
| **Condition Drill** | Rapid-fire condition mechanics quiz using your actual spells |

Training progress, XP, and streaks are tracked per character.

---

## AI Configuration

The Codex supports two AI backends. Configure via the gear icon in the header.

### Google Gemini (recommended)
- Free tier with `gemini-2.0-flash` (multiple model options available)
- Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Multiple models available — switch if one is rate-limited

### Ollama (local inference)
- Point to any Ollama instance on your network
- Automatic model discovery
- Works great with `gemma3` or any capable model

### Auto-Fallback
Enable auto-fallback to seamlessly switch between providers. If Ollama is unreachable (away from home WiFi), the app falls back to Gemini transparently.

**Test your connection** with the built-in test button before a session.

---

## Multi-Character Roster

- Create multiple characters
- Switch between them instantly from the header dropdown
- Each character has independent:
  - Stats, spells, features, equipment
  - Persona, backstory, dialogue
  - Combat state, spell slot tracking
  - Training progress and flashcard scheduling
  - UI preferences (which sections are collapsed)
- Import/export characters as JSON for backup or device transfer

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| AI | Gemini Flash / Ollama with automatic fallback |
| Storage | localStorage (offline-first, zero backend) |
| Hosting | Static deploy (Vercel, Netlify, or any CDN) |

---

## Architecture

```
src/
├── App.tsx                    # Mode state, tab routing, character state
├── components/
│   ├── Layout.tsx             # App shell, mode toggle, dynamic tabs, settings drawer
│   ├── CombatHelper.tsx       # Combat tab: TurnSummary, collapsible sections, action menu
│   ├── GrimoirePage.tsx       # Unified spell + feature reference (session + prep)
│   ├── CharacterPage.tsx      # Prep mode character management
│   ├── IdentityPage.tsx       # Persona tab (prep mode)
│   ├── AcademyPage.tsx        # Training drills + quizzes
│   ├── FeatureEditor.tsx      # Class feature CRUD form
│   ├── SpellEditor.tsx        # Spell CRUD form
│   ├── combat/
│   │   ├── TurnSummary.tsx    # Turn-centric "what can I do NOW?" card
│   │   ├── QuickLookup.tsx    # In-combat Grimoire search panel
│   │   └── ...                # 15+ combat sub-components
│   ├── grimoire/
│   │   └── GrimoireCard.tsx   # Unified ability card (spell or feature)
│   ├── session/
│   │   └── SessionCockpit.tsx # Live session RP tools
│   ├── ui/                    # Design system (Button, GlassCard, Badge, Input, etc.)
│   └── ...                    # 30+ additional components
├── hooks/
│   ├── useCharacter.ts        # Character CRUD, roster, slot/rest operations
│   ├── useCollapsible.ts      # Persisted collapse state per character
│   ├── useAI.ts               # AI query abstraction
│   └── useTraining.ts         # XP, streaks, spaced repetition
└── lib/
    ├── character.ts           # Core data models + persistence
    ├── combat-state.ts        # Turn-level action economy tracking
    ├── ai.ts                  # Gemini + Ollama provider abstraction
    ├── prompts.ts             # 20+ specialized AI system prompts
    └── ...                    # Dice, rules, training, campaign, identity
```

### Design System

Custom dark fantasy aesthetic ("Arcane Glass"):

- **Palette:** True black base (`void`), white text hierarchy (`forge`), accent colors — `arcane` (cyan), `ember` (gold), `eldritch` (purple), `verdant` (green)
- **Components:** Frosted glass cards, parchment cards for narrative content, pip trackers, badge system
- **Accessibility:** 44px+ touch targets, 4.5:1+ contrast, ARIA labels, keyboard navigation, works at 375px

### Data Persistence

All data in `localStorage` — zero backend, works offline:

```
codex-character-{id}    # Character data (stats, spells, persona, features)
codex-roster            # Character list metadata
codex-app-mode          # Current mode (session/prep)
codex-ui-{id}           # Per-character UI state (collapsed sections)
codex-combat-{id}       # Combat state (round, actions, concentration)
codex-training-{id}     # Training progress, XP, flashcards
codex-ai-config         # AI provider settings
codex-campaign-{id}     # Campaign data
```

---

## Production Build

```bash
npm run build     # TypeScript check + Vite build
npm run preview   # Preview the production build locally
```

Deploy the `dist/` folder to any static host.

---

## Offline-First

Core functionality works completely offline:
- Character management
- Spellbook and Grimoire
- Combat tracking
- Dice rolling
- All UI state

AI features require either a Gemini API key (internet) or a local Ollama instance (LAN).

---

## Contributing

This is an active personal project. If you want to contribute, open an issue first to discuss the change.

---

## License

MIT
