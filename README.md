# The Codex

**D&D 2024 Combat Companion & Character Training Platform**

A mobile-first progressive web app that serves as a real-time combat assistant, spellbook manager, roleplay coach, and character training academy for Dungeons & Dragons 2024 (5th Edition revised). Built for use at the table during live sessions and between sessions for deliberate practice.

---

## Features

### Combat Assistant
- Real-time HP/Temp HP tracking with damage and healing
- Death save tracker with auto-reset on healing
- Condition management with persistent mechanical reminders
- Action menu with spell/weapon quick-access during combat
- AI-powered tactical advisor (considers your exact spell slots, positioning, and action economy)
- Floating dice roller with prefill from any combat action

### Spellbook
- Full spell database with level filtering, school badges, and advanced filters (concentration, ritual, casting time, damage type, range)
- Prepared spell management with count tracking
- Spell CRUD — add, edit, and delete spells with Quick Add or Full Edit modes
- AI spell explanations and tactical advice per spell
- Combat-ready fields: damage dice, save type, area of effect displayed inline

### Identity System
- **Persona Engine** — Toy Method character building (core traits, color traits, wants, fears, pressure response)
- **Backstory Builder** — AI-generated origin stories, key memories with emotional cores, NPC relationships
- **Dialogue Bank** — 4 modes: Library, Practice, Quick-Draw (timed drills), Delivery Coach (Juilliard-level vocal coaching)
- **Accent Coach** — Phonetic rule sets for fantasy accents with AI-generated practice phrases
- **Identity Manager** — Multi-persona system for Changelings, Wild Shape, disguises, and situational personas

### Training Academy
- **Scene Coach** — AI generates immersive scenes, you react with SAY + DO, AI coaches your persona consistency
- **Improv Drills** — Scenario-based roleplay graded against defined persona traits
- **Conversation Drill** — NPC dialogue training with per-exchange voice coaching
- **Interactive One-Shots** — AI-narrated mini-adventures with real-time characterization feedback
- **Rules Quiz** — Adaptive D&D 2024 rules testing focused on your class, spells, and features
- **Spaced Flashcards** — SM-2 algorithm for long-term retention of rules and persona traits
- **Condition Drill** — Rapid-fire condition mechanics quiz using your actual spells

### Campaign Context
- Campaign/world/party/NPC data stored per campaign
- Session notes with date tracking
- All AI features automatically incorporate your campaign context (party members, world lore, current quest, NPCs)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript (strict) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| AI | Gemini Flash (free tier) / Ollama (local) with automatic fallback |
| Storage | localStorage (offline-first, zero backend) |
| Hosting | Static deploy (Vercel, Netlify, or any CDN) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Install & Run

```bash
git clone https://github.com/DOSENFT/the-codex.git
cd the-codex
npm install
npm run dev
```

The app runs at `http://localhost:5173` (accessible on local network via `--host`).

### Production Build

```bash
npm run build
npm run preview
```

### AI Configuration

The Codex supports two AI backends (configured in the Settings tab):

1. **Google Gemini** (recommended for most users) — Free tier with `gemini-2.0-flash`. Requires a Gemini API key.
2. **Ollama** (local inference) — Point to any Ollama instance on your network. Supports model discovery.

Automatic fallback: if Ollama is unreachable, the app falls back to Gemini transparently.

---

## Architecture

```
src/
├── components/          # 34 React components
│   ├── ui/              # Design system primitives (Button, GlassCard, Badge, Input, ParchmentCard, etc.)
│   ├── CombatHelper     # Combat tab: HP, conditions, action menu, damage tracker
│   ├── Spellbook        # Spells tab: filtering, CRUD, AI explain/tactics
│   ├── IdentityPage     # Identity tab: persona, backstory, dialogue, accent, identities
│   ├── AcademyPage      # Academy tab: training drills + quizzes
│   └── Settings         # Config: AI provider, campaign editor, rest management
├── hooks/
│   ├── useAI.ts         # AI query abstraction (streaming, structured JSON, error handling)
│   ├── useCharacter.ts  # Character CRUD, roster management, slot/rest operations
│   └── useTraining.ts   # XP, streaks, spaced repetition, training progress
├── lib/
│   ├── character.ts     # Core data models, persistence, spell/HP/condition helpers
│   ├── identity.ts      # Multi-persona CRUD helpers
│   ├── campaign.ts      # Campaign storage and AI context formatting
│   ├── prompts.ts       # All AI system prompts (20+ specialized prompt builders)
│   ├── ai.ts            # AI provider abstraction (Gemini + Ollama)
│   ├── dnd-rules.ts     # D&D 2024 rules constants
│   ├── dnd-data.ts      # Race/class data
│   ├── training.ts      # Spaced repetition (SM-2), XP calculations
│   └── ...              # Dice, combat state, mechanics reference, accent data
└── App.tsx              # Root: character loading, tab routing, state management
```

### Design System

The app uses a custom dark fantasy aesthetic ("Arcane Glass"):

- **Colors**: True black base (`void-0/1/2`), white text hierarchy (`forge-0/1/2`), accent colors (`arcane` cyan, `ember` gold, `eldritch` purple, `verdant` green)
- **Typography**: Display font for headers, body font for content, monospace for stats
- **Glass Cards**: Frosted glass with subtle borders and backdrop blur
- **Parchment Cards**: Warm-toned atmospheric cards for narrative/scene content
- **Accessibility**: All touch targets 44px+, 4.5:1+ contrast ratios, ARIA labels throughout, works at 375px viewport

### Data Model

All data persists in `localStorage` with automatic migration for new fields:

- `codex-character-{id}` — Character data (stats, spells, persona, backstory, identities)
- `codex-campaign-{id}` — Campaign data (world, party, NPCs, session notes)
- `codex-roster` — Character list metadata
- `codex-training-{id}` — Training progress, XP, flashcard scheduling
- `codex-ai-config` — AI provider settings

Multi-character roster system with instant switching. Characters can share campaigns.

---

## Offline-First

The Codex has **zero backend dependencies** for core functionality. Character management, spellbook, combat tracking, and dice rolling work completely offline. AI features require network access to Gemini or a local Ollama instance.

---

## Contributing

This is a personal project. If you'd like to contribute, open an issue first to discuss the change.

---

## License

MIT
