# ACCENT FORGE — Execution Roadmap

> Turn The Codex's accent coach into a world-class interactive voice performance system for Dungeon Masters.

---

## Current State Audit

### What Already Exists

| Asset | Location | Status |
|---|---|---|
| `AccentCoach.tsx` | `src/components/AccentCoach.tsx` (770 LOC) | Functional — library browse, phrase practice, recording, self-rating, AI phrase gen |
| `accent-data.ts` | `src/lib/accent-data.ts` (168 LOC) | 6 accents (Dwarven, Elvish, Orcish, Noble, Pirate, Fey) with rules/phrases/tips/rhythm |
| Training Hub integration | `TrainingHub.tsx` line 474 | AccentCoach mounted as "Accent" mode chip |
| AI infrastructure | `useAI.ts` + `ai.ts` | Gemini Flash (free) + Ollama fallback, structured JSON queries working |
| Recording infrastructure | `AccentCoach.tsx` | MediaRecorder API, record/playback/self-rate loop complete |
| Identity system | `character.ts` + `identity.ts` | Each identity already has an `accent` field + `voiceNotes` |
| Persona engine | `PersonaEngine.tsx` | Character persona with decision trees, patron, traits — available for voice linking |
| Dialogue bank | `DialogueBank.tsx` | In-character dialogue lines with tags, copy, generation |
| Design system | `index.css` + `ui/` components | void/forge/arcane/ember/eldritch tokens, GlassCard, ParchmentCard, Badge, Button, etc. |

### What Does NOT Exist

- No expanded accent data beyond 6 fantasy archetypes
- No phonetic transcription (IPA) or eye dialect representations
- No voice analysis (pitch, pacing, resonance) — only self-rating
- No character voice builder with sliders
- No progression/gamification for accent training
- No DM Rapid Mode (quick-reference accent snapshots)
- No AI scene partner / dialogue mode
- No performance science content (prosody, phonology, sociolects)

---

## Feasibility Classification

Each of the 10 requested systems, classified by what's actually needed to build it:

| # | System | Classification | Key Dependency | Effort |
|---|--------|---------------|----------------|--------|
| 1 | Accent Library | **Pure Data + UI** | Content authoring (20+ accent profiles) | Medium |
| 2 | Actor Training Academy | **Pure Data + UI** | Content authoring (curriculum modules) | Medium |
| 3 | Interactive Training Modules | **Data + AI** | Gemini Flash for drill generation | Medium |
| 4 | Live Voice Analysis | **Browser API** | Web Audio API (AnalyserNode, pitch detection) | High |
| 5 | Character Voice Forge | **UI + Data + AI** | Slider UI + AI text generation | Medium |
| 6 | Performance Science Mode | **Pure Content** | Academic content writing | Low-Med |
| 7 | DM Rapid Mode | **Pure Data + UI** | Compact card layout, subset of accent data | Low |
| 8 | Gamification + Progression | **State + UI** | localStorage persistence (useTraining pattern exists) | Medium |
| 9 | Cinematic UI/UX | **CSS + Motion** | Existing design tokens, some new animation | Incremental |
| 10 | AI Dialogue + Scene Partner | **AI + UI** | Gemini Flash conversational mode | Medium |

### Hard Constraints

- **No paid APIs.** Voice analysis must use Web Audio API (AnalyserNode, AudioContext). No Google Cloud Speech-to-Text, no Whisper API.
- **No paid AI.** All AI features use Gemini Flash free tier (or local Ollama).
- **Mobile-first.** 375px minimum. Touch targets 44px. All sliders and controls must be thumb-friendly.
- **Existing design system.** All new components use void/forge/arcane/ember/eldritch tokens, GlassCard, ParchmentCard, Button, Badge patterns.
- **No new dependencies** unless absolutely necessary (Web Audio API is browser-native).

---

## Scope Boundaries

### In Scope

- Expanding accent data to 20+ profiles with three representation systems (plain text, eye dialect, IPA)
- DM Rapid Mode (quick-reference cards)
- Interactive drills with difficulty scaling
- Browser-based voice analysis (pitch, volume, pacing — NOT speech recognition)
- Character Voice Forge with parameterized voice profiles
- AI dialogue partner for accent practice
- Progression tracking integrated with existing useTraining system
- Performance science reference content

### Out of Scope (for this plan)

- Speech-to-text / accent recognition (requires paid APIs or models too large for browser)
- Text-to-speech / AI speaking in accent (browser TTS quality is insufficient for accent work)
- Video recording / face tracking
- Multiplayer / shared sessions
- Accent marketplace / user-submitted accents (future feature)
- Audio file export / sharing

### Assumptions

- Gemini Flash free tier can handle the additional prompt load (accent drills, voice forge, scene partner)
- Web Audio API AnalyserNode provides sufficient data for useful pitch/volume/pacing visualization
- The user will author accent content with AI assistance rather than hand-writing 20+ full profiles

---

## Architecture

### Navigation Structure

The existing `TrainingHub.tsx` has an "Accent" mode chip that loads `AccentCoach.tsx`. Accent Forge replaces this with a richer sub-navigation:

```
TrainingHub > "Accent" chip
  |
  +-- AccentForge (new top-level component, replaces AccentCoach)
       |
       +-- Segmented control: [Library] [Rapid] [Forge] [Train] [Science]
       |
       +-- Library tab    -> AccentLibrary (browse/search, detail view with 3 representations)
       +-- Rapid tab      -> DMRapidMode (quick-ref cards, anchor vowels, 3-rule snapshots)
       +-- Forge tab      -> VoiceForge (slider builder, AI suggestions, preview phrases)
       +-- Train tab      -> AccentTraining (drills, AI scene partner, voice analysis, progression)
       +-- Science tab    -> PerformanceScience (reference content, prosody guides)
```

### Data Architecture

```
src/lib/accent-data.ts          -- Expanded: AccentProfile type with IPA, eye dialect, vocal params
src/lib/accent-drills.ts        -- NEW: Drill templates, difficulty scaling, scene scenarios
src/lib/voice-analysis.ts       -- NEW: Web Audio API wrapper for pitch/volume/pacing
src/lib/voice-forge.ts          -- NEW: Voice parameter types, preset generation
src/lib/accent-progression.ts   -- NEW: XP, mastery ranks, achievements (extends useTraining)
```

### Component Architecture

```
src/components/accent-forge/
  AccentForge.tsx               -- Top-level container with tab navigation
  AccentLibrary.tsx             -- Browse/search/filter, accent detail cards
  AccentDetailView.tsx          -- Single accent deep-dive (rules, IPA, eye dialect, phrases)
  DMRapidMode.tsx               -- Quick-reference cards, searchable
  VoiceForge.tsx                -- Slider builder for custom voices
  VoiceForgePreview.tsx         -- AI-generated dialogue preview for forged voice
  AccentTraining.tsx            -- Training hub: drill selector, progression bar
  AccentDrill.tsx               -- Individual drill execution (phrase practice, recording, analysis)
  VoiceAnalyzer.tsx             -- Web Audio visualization (pitch contour, volume, pacing)
  AIScenePartner.tsx            -- Conversational AI accent practice
  PerformanceScience.tsx        -- Reference content browser
  AccentProgressBar.tsx         -- XP/mastery/streak display
```

---

## Phase 1: Accent Library Expansion + DM Rapid Mode

**Goal:** Ship the two highest-impact, lowest-risk features. A DM opens The Codex and immediately has 20+ accent references with quick-access snapshots they can use at the table in 60 seconds.

**Why first:** This is pure data + UI. Zero technical risk. Immediate value. Every subsequent phase builds on this accent data.

### Tasks

1. **Define expanded `AccentProfile` type** in `accent-data.ts`
   - Add fields: `region` (real-world analog), `difficulty` (1-5), `anchorVowel`, `cadencePattern`, `eyeDialect` (stylized spelling examples), `ipa` (phonetic transcription), `dialectOrthography` (cadence/syntax notes), `vocalParams` (pitch range, resonance, pacing, breathiness — numeric 1-10), `npcArchetypes` (suggested NPC types), `emotionalRange` (what emotions this accent conveys well), `tags` (searchable)
   - Keep backward-compatible with existing `AccentGuide` interface (extend, don't replace)

2. **Author 20+ accent profiles** using AI-assisted generation
   - Real-world inspired: Scottish, Irish, Cockney, RP English, French, German, Russian, Scandinavian, Mediterranean, Arabic-inspired, East Asian-inspired, Caribbean, Appalachian, Australian
   - Fantasy archetypes: Dwarven, Elvish, Orcish, Fey, Infernal/Tiefling, Draconic, Celestial, Aberrant/Far Realm, Undead/Lich, Goblinoid
   - Each with all three representation systems (plain rules, eye dialect examples, IPA notation)
   - Each with 8+ practice phrases, 4+ tips, rhythm description, 3+ NPC archetypes

3. **Build `AccentLibrary.tsx`** — searchable/filterable accent browser
   - Search by name, tags, difficulty, region
   - Filter chips: "Fantasy", "Real-World", "Beginner", "Advanced"
   - Grid of GlassCards with accent name, difficulty badge, region badge, description
   - Click to open `AccentDetailView.tsx`

4. **Build `AccentDetailView.tsx`** — rich single-accent view
   - Three-tab representation: "Quick Rules" | "Eye Dialect" | "IPA"
   - Vocal parameter radar/bar visualization (pitch, pacing, resonance, breathiness)
   - Practice phrases carousel (carried over from existing AccentCoach)
   - NPC archetype suggestions with scenario context
   - Tips and rhythm section
   - "Practice This" button linking to Training tab

5. **Build `DMRapidMode.tsx`** — the 60-second reference
   - Compact card layout: accent name, anchor vowel, 3 key rules, 2 instant phrases, cadence cheat
   - Swipeable/scrollable horizontal carousel on mobile
   - Search bar at top
   - "Randomize" button for surprise NPC voice at the table
   - Copy-to-clipboard on any phrase
   - Absolutely minimal chrome — this is a tool for mid-session use

6. **Build `AccentForge.tsx`** container — segmented control with Library and Rapid tabs active
   - Replace `AccentCoach` import in `TrainingHub.tsx` with `AccentForge`
   - Wire up tab state, preserve selected accent across tab switches

### Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `src/lib/accent-data.ts` — expand types and data |
| Create | `src/components/accent-forge/AccentForge.tsx` |
| Create | `src/components/accent-forge/AccentLibrary.tsx` |
| Create | `src/components/accent-forge/AccentDetailView.tsx` |
| Create | `src/components/accent-forge/DMRapidMode.tsx` |
| Create | `src/components/accent-forge/index.ts` |
| Modify | `src/components/TrainingHub.tsx` — swap AccentCoach for AccentForge |

### Validation Checkpoint

- [ ] Open Training Hub > Accent tab. See AccentForge with Library and Rapid tabs.
- [ ] Library shows 20+ accents, searchable by name and tag.
- [ ] Click any accent, see detail view with Quick Rules / Eye Dialect / IPA tabs.
- [ ] Switch to Rapid tab, see compact cards. Search for "dwarf" — Dwarven card appears.
- [ ] Hit "Randomize" — a random accent card appears.
- [ ] Works at 375px width. All touch targets >= 44px. Text contrast >= 4.5:1.
- [ ] No regressions in existing AccentCoach recording/playback functionality.

### Estimated Effort

~2 focused sessions (one for data authoring, one for UI). The UI is straightforward given the existing component library.

### Dependencies

None. This is Phase 1.

### Fallback

If authoring 20+ full profiles takes too long, ship with 12 (the 6 existing + 6 most common real-world) and mark the rest as "Coming Soon" with locked cards. The architecture supports adding more profiles as pure data additions.

### Commit Point

`feat(accent-forge): accent library with 20+ profiles and DM rapid mode`

---

## Phase 2: Character Voice Forge + AI Integration

**Goal:** Let a DM build a custom voice for any NPC or character using intuitive sliders, then get AI-generated dialogue that demonstrates the voice. This is the "creative tool" phase — the part that makes DMs feel powerful.

### Tasks

1. **Define `VoiceProfile` type** in `voice-forge.ts`
   - Slider parameters (each 0-100): `gravel`, `breathiness`, `resonance` (chest vs head), `age` (young to ancient), `tension` (relaxed to tight), `nobility` (street to royal), `menace` (warm to threatening), `warmth`, `madness` (stable to unhinged), `exhaustion`, `confidence`, `intelligence`, `speed` (deliberate to rapid)
   - Derived fields: `suggestedAccent` (string), `speechPattern` (string), `vocabularyLevel` (simple/moderate/ornate), `sentenceStructure` (choppy/flowing/complex)
   - `linkedCharacterId` (optional — link to a character's identity)
   - Persistence: save to localStorage keyed by profile ID

2. **Build `VoiceForge.tsx`** — the slider builder
   - Two-column layout on desktop, single column on mobile
   - Each slider: labeled, 0-100, with descriptive endpoints ("Silk" <-> "Gravel")
   - Preset buttons: "Tavern Keeper", "Noble Villain", "Ancient Dragon", "Street Urchin", "Mad Wizard", "War General", "Fey Trickster", "Undead Horror"
   - Preset loads specific slider values
   - AI summary panel: after adjusting sliders, tap "Generate Voice Profile" to get AI description of what this voice sounds like + 3 sample dialogue lines
   - "Link to Character" dropdown to associate with an existing character identity

3. **Build `VoiceForgePreview.tsx`** — AI dialogue preview
   - Uses Gemini Flash to generate 3-5 dialogue lines matching the voice parameters
   - Shows the lines in ParchmentCard with eye-dialect hints
   - "Regenerate" button
   - "Copy All" button for use at the table
   - Prompt engineering: translate slider values into natural language voice description for the AI

4. **Integrate Voice Forge with accent data**
   - When a VoiceProfile's parameters closely match an existing accent, suggest it
   - "Suggested Accent" badge on the forge with link to that accent's library entry
   - Allow importing accent profiles as slider presets

5. **Add "Forge" tab to AccentForge.tsx** segmented control

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/voice-forge.ts` |
| Create | `src/components/accent-forge/VoiceForge.tsx` |
| Create | `src/components/accent-forge/VoiceForgePreview.tsx` |
| Modify | `src/components/accent-forge/AccentForge.tsx` — add Forge tab |
| Modify | `src/lib/prompts.ts` — add voice forge system prompts |

### Validation Checkpoint

- [ ] Open Accent Forge > Forge tab. See 13 sliders with labeled endpoints.
- [ ] Tap "Noble Villain" preset — sliders snap to values. Tap "Generate Voice Profile" — AI returns description + sample lines within 10 seconds.
- [ ] Adjust sliders manually. Regenerate. New output reflects changes.
- [ ] Link a forged voice to a character. That character's identity page shows the voice link.
- [ ] Copy All works. Lines are usable as-is at a game table.
- [ ] All sliders are thumb-friendly at 375px.

### Estimated Effort

~1.5 focused sessions.

### Dependencies

Phase 1 (accent data types must exist for suggested accent matching).

### Fallback

If Gemini Flash rate limits become a problem with frequent regeneration, add client-side debouncing (500ms after last slider change) and a "Generate" button instead of auto-generate. If the AI output quality is poor for voice descriptions, fall back to a rule-based text generator that maps slider ranges to pre-written fragments.

### Commit Point

`feat(accent-forge): character voice forge with slider builder and AI preview`

---

## Phase 3: Interactive Training + AI Scene Partner

**Goal:** Transform passive accent browsing into active practice. Guided drills with difficulty scaling, an AI scene partner that responds in character, and integration with the existing training/progression system.

### Tasks

1. **Define drill framework** in `accent-drills.ts`
   - Drill types: `phrase_repeat` (say the phrase in accent), `scene_response` (AI gives scenario, you respond in accent), `accent_switch` (switch between two accents mid-conversation), `emotion_layer` (same phrase, different emotions), `npc_encounter` (AI plays an NPC, you respond as your character in the target accent)
   - 5 difficulty tiers: Apprentice (single rules), Journeyman (combined rules), Adept (full accent + emotion), Master (accent switching), Grandmaster (improvisation)
   - Scene templates: tavern, courtroom, battlefield, interrogation, noble court, horror, marketplace, temple, prison, wilderness

2. **Build `AccentTraining.tsx`** — training hub sub-tab
   - Drill selector: choose accent + drill type + difficulty
   - Progress bar showing mastery for selected accent
   - "Quick Drill" button — random drill at your current level
   - Session tracker: drills completed today, streak display

3. **Build `AccentDrill.tsx`** — drill execution
   - Phrase display in selected representation (plain/eye dialect/IPA toggle)
   - Recording controls (carried over from existing AccentCoach)
   - Self-rating (1-5 stars, carried over)
   - AI coaching: after self-rating, option to "Get AI Feedback" which analyzes the phrase attempt context and provides targeted tips
   - Next drill / end session controls
   - XP award on completion (integrated with useTraining)

4. **Build `AIScenePartner.tsx`** — conversational accent practice
   - Scene selection: pick a scenario (tavern, court, battle, etc.)
   - Accent selection: pick which accent you're practicing
   - AI plays an NPC in the scene, responds conversationally
   - Chat-style UI (existing ConversationDrill pattern)
   - AI responses include accent coaching notes in a collapsible "Coach's Note" section
   - Modes: Freeform (open conversation), Guided (AI steers toward specific accent challenges), Challenge (AI throws curveballs requiring accent maintenance under pressure)

5. **Integrate with useTraining progression system**
   - New training categories: `accent_drill`, `accent_scene`, `accent_forge`
   - XP awards: drill completion (10-50 XP based on difficulty), scene partner exchange (5 XP per exchange), self-rating bonus (rating >= 4 adds 10 XP)
   - Accent-specific mastery tracking: each accent has its own mastery percentage
   - Unlock achievements: "First Accent Practiced", "5 Accents Attempted", "Master of Dwarven", "Accent Switcher" (completed a switch drill)

6. **Add "Train" tab to AccentForge.tsx**

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/accent-drills.ts` |
| Create | `src/lib/accent-progression.ts` |
| Create | `src/components/accent-forge/AccentTraining.tsx` |
| Create | `src/components/accent-forge/AccentDrill.tsx` |
| Create | `src/components/accent-forge/AIScenePartner.tsx` |
| Create | `src/components/accent-forge/AccentProgressBar.tsx` |
| Modify | `src/components/accent-forge/AccentForge.tsx` — add Train tab |
| Modify | `src/lib/prompts.ts` — add drill/scene partner prompts |
| Modify | `src/hooks/useTraining.ts` — add accent-specific tracking |
| Modify | `src/lib/training.ts` — add accent categories |

### Validation Checkpoint

- [ ] Open Train tab. See drill selector with accent dropdown, drill type dropdown, difficulty selector.
- [ ] Start a "Phrase Repeat" drill at Apprentice level for Dwarven. Phrase displays. Record, playback, self-rate. XP awarded.
- [ ] Start an "NPC Encounter" drill. AI generates a tavern scene. Type a response. AI responds in character with a coach's note.
- [ ] Complete 3 drills. Progress bar for Dwarven increases. XP total updates.
- [ ] Scene partner mode: select "Courtroom" + "Noble (RP English)". Have a 5-exchange conversation. Each AI response includes accent coaching.
- [ ] Training progress persists across page reloads (localStorage).

### Estimated Effort

~2 focused sessions (one for drills, one for AI scene partner).

### Dependencies

Phase 1 (accent data), Phase 2 (voice forge presets can seed drill content).

### Fallback

If AI scene partner responses are too slow for conversational flow, implement a "pre-generate" system that fetches 3 AI responses in advance while the user is reading/responding. If Gemini rate limits hit during training sessions, queue drills and show a "cooling down" state with a timer.

### Commit Point

`feat(accent-forge): interactive training drills and AI scene partner`

---

## Phase 4: Voice Analysis + Performance Science

**Goal:** Add the technically ambitious feature (browser-based voice analysis) and the academic reference content. This is the "depth" phase — it takes the tool from "useful" to "impressive."

**Why last among the core phases:** Voice analysis via Web Audio API is the highest technical risk. If it fails or produces unusable results, Phases 1-3 still deliver a complete, valuable product. Performance Science is pure content that can be authored incrementally.

### Tasks

1. **Build `voice-analysis.ts`** — Web Audio API wrapper
   - `VoiceAnalyzer` class that wraps AudioContext + AnalyserNode
   - Real-time data extraction:
     - **Volume** (RMS amplitude from `getByteTimeDomainData`) — trivial
     - **Pitch** (autocorrelation pitch detection on raw audio buffer) — moderate difficulty
     - **Pacing** (syllable rate estimation via amplitude envelope peaks) — moderate difficulty
   - Data output: arrays of timestamped values for visualization
   - NOT attempting: formant analysis, accent classification, speech-to-text (these require ML models)

2. **Build `VoiceAnalyzer.tsx`** — real-time visualization
   - Three visualization strips:
     - **Pitch contour** — line chart showing pitch over time, with target range overlay for selected accent
     - **Volume envelope** — bar/waveform showing dynamics
     - **Pacing meter** — beats-per-minute style indicator
   - Canvas-based rendering (no charting library — keep deps at zero)
   - Start/stop tied to recording controls
   - Post-recording summary: average pitch, pitch range, average volume, estimated pacing, comparison to accent's ideal parameters
   - Confidence scoring: how closely the measured values match the accent's vocal parameter targets (from accent-data.ts `vocalParams`)

3. **Integrate voice analysis into AccentDrill.tsx**
   - When recording during a drill, run VoiceAnalyzer in parallel
   - Show analysis results alongside self-rating
   - Add "Voice Analysis" collapsible section to drill results
   - Deviation markers: highlight where pitch/pacing diverged from target

4. **Build `PerformanceScience.tsx`** — reference content
   - Accordion-based content browser
   - Sections: Prosody (rhythm/stress/intonation), Phonology (sound systems), Vowel Space, Consonant Manner, Sociolects & Idiolects, Historical Linguistic Drift, Accent Blending Techniques, Code-Switching, Vocal Psychology
   - Each section: definition, D&D application, practice exercise suggestion
   - "Apply to Accent" links that jump to relevant accent library entries
   - Content authored with AI assistance, reviewed for accuracy

5. **Add "Science" tab to AccentForge.tsx**

6. **Visual polish pass**
   - Canvas visualizations use arcane/ember/eldritch color tokens
   - Pitch contour glows when in target range
   - Smooth animations on analysis results
   - Loading states for all async operations

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/voice-analysis.ts` |
| Create | `src/components/accent-forge/VoiceAnalyzer.tsx` |
| Create | `src/components/accent-forge/PerformanceScience.tsx` |
| Modify | `src/components/accent-forge/AccentDrill.tsx` — integrate voice analysis |
| Modify | `src/components/accent-forge/AccentForge.tsx` — add Science tab |

### Validation Checkpoint

- [ ] During a drill recording, real-time pitch and volume visualization renders on a canvas.
- [ ] After recording, summary shows: average pitch (Hz), pitch range, estimated pacing (syllables/sec), confidence score vs accent target.
- [ ] Pitch contour line changes color when outside accent's target range.
- [ ] Performance Science tab loads. Accordion sections expand with content. "Apply to Accent" links navigate to library.
- [ ] Voice analysis works on Chrome, Firefox, and Safari mobile (getUserMedia + AudioContext).
- [ ] Performance does not degrade — canvas rendering stays smooth at 30fps minimum.

### Estimated Effort

~2.5 focused sessions (voice analysis is the bulk — pitch detection algorithm needs tuning).

### Dependencies

Phase 3 (drill infrastructure to integrate analysis into).

### Fallback

**Critical fallback for pitch detection:** Browser autocorrelation pitch detection works well for sustained tones but can be unreliable for natural speech. If pitch detection proves too noisy to be useful:
- **Fallback A:** Show only volume envelope and pacing (both are reliable) and label the feature as "Rhythm & Energy Analysis" instead of "Voice Analysis."
- **Fallback B:** Use pitch detection only for sustained vowel exercises (where it works well) and skip it for phrase practice.
- **Fallback C:** Replace real-time pitch with a simpler "pitch range" detector that just captures min/max/average over the recording, which is more robust than frame-by-frame detection.

### Commit Point

`feat(accent-forge): voice analysis with pitch/volume/pacing and performance science reference`

---

## Phase 5: Gamification + Polish + Academy Training Integration

**Goal:** Add the progression layer that creates retention — mastery ranks, achievements, accent streaks, challenge ladders. Integrate Accent Forge into the Academy tab's training progress system. Final cinematic polish pass.

### Tasks

1. **Build accent progression system** in `accent-progression.ts`
   - Per-accent mastery: 0-100% based on drills completed, self-ratings, voice analysis scores
   - Mastery ranks: Novice (0-19%), Apprentice (20-39%), Journeyman (40-59%), Adept (60-79%), Master (80-100%)
   - Global XP: accumulated across all accent activities
   - Accent streaks: consecutive days with at least one drill
   - Achievement system:
     - **First Words** — Complete your first accent drill
     - **Polyglot** — Practice 5 different accents
     - **Dedicated Student** — Complete 10 drills in a single accent
     - **Voice Chameleon** — Complete an accent-switch drill
     - **Method Actor** — Score 5/5 self-rating 3 times in a row
     - **The Chronicler** — Create 3 custom voices in the Forge
     - **Master of [Accent]** — Reach Master rank in any accent
     - **Grand Performer** — Reach Master rank in 5 accents
     - **Iron Throat** — 7-day training streak
     - **Scene Stealer** — Complete 10 AI scene partner sessions
   - Progression tree visualization: branching paths showing which accents/skills unlock achievements

2. **Build `AccentProgressBar.tsx`** — persistent progress display
   - Shows at top of AccentForge (similar to TrainingProgress in AcademyPage)
   - Current mastery rank, XP, streak, next achievement preview
   - Tap to expand: full achievement list, mastery per accent, history

3. **Build achievement notification system**
   - Toast-style notification when achievement unlocked
   - Arcane glow animation
   - Sound effect (optional, respects user preference)

4. **Integrate with AcademyPage.tsx training progress**
   - Accent drills contribute to overall training XP in AcademyPage
   - Academy TrainingProgress bar includes accent category
   - Accent mastery visible from Academy overview

5. **Cinematic polish pass**
   - Entrance animations on tab switches (slide transitions)
   - Accent library cards: subtle parallax on hover (desktop), press feedback (mobile)
   - DM Rapid Mode: card flip animation when randomizing
   - Voice Forge sliders: smooth value interpolation, glow on active slider
   - Drill completion: burst particle animation (canvas, lightweight)
   - Achievement unlock: radial glow + scale animation
   - All animations respect `prefers-reduced-motion`

6. **Final integration + cleanup**
   - Remove old `AccentCoach.tsx` (fully replaced by AccentForge)
   - Update all imports
   - Ensure no dead code
   - Verify localStorage migration (old accent coach data -> new format)
   - Test full flow: browse library -> pick accent -> rapid reference -> forge a voice -> train with drills -> check progress

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/accent-progression.ts` |
| Create | `src/components/accent-forge/AccentProgressBar.tsx` |
| Create | `src/components/accent-forge/AchievementToast.tsx` |
| Modify | `src/components/accent-forge/AccentForge.tsx` — add progress bar, polish |
| Modify | `src/components/AcademyPage.tsx` — integrate accent progress |
| Modify | `src/hooks/useTraining.ts` — accent categories |
| Modify | `src/lib/training.ts` — accent tracking |
| Delete | `src/components/AccentCoach.tsx` (replaced) |

### Validation Checkpoint

- [ ] Complete 3 Dwarven drills. Mastery increases from 0%. XP accumulates. Rank shows "Novice" or "Apprentice."
- [ ] "First Words" achievement notification appears after first drill.
- [ ] Practice 5 different accents. "Polyglot" achievement unlocks.
- [ ] AccentProgressBar shows streak, current rank, next achievement.
- [ ] AcademyPage > Training Progress includes accent category accuracy.
- [ ] Achievement toast has arcane glow animation.
- [ ] All animations disabled when `prefers-reduced-motion` is set.
- [ ] Old AccentCoach is fully removed, no broken imports.
- [ ] Full flow works: Library -> detail -> Rapid -> Forge -> Train -> progress update.

### Estimated Effort

~2 focused sessions.

### Dependencies

Phases 1-4 (all features must exist to gamify them).

### Fallback

If the progression math feels off (too fast/slow to rank up), expose tuning constants at the top of `accent-progression.ts` for easy adjustment. If achievement toasts feel intrusive, make them opt-in via Settings.

### Commit Point

`feat(accent-forge): gamification system with mastery ranks, achievements, and polish`

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Web Audio pitch detection unreliable for speech** | Medium | High | Fallback to volume/pacing only (Phase 4 fallback plan). Pitch detection works well for sustained vowels — scope accordingly. |
| 2 | **Gemini Flash rate limits during training sessions** | Medium | Medium | Pre-generate drill content. Cache AI responses. Implement cooldown UI. Fallback to Ollama if configured. |
| 3 | **Content authoring bottleneck** (20+ accent profiles) | Medium | Medium | Use AI to draft profiles, human-review the top 12, ship the rest as "beta" quality. Architecture supports incremental improvement. |
| 4 | **Scope creep from "10 systems" spec** | High | High | This roadmap is already scoped. Each phase has a clear stopping point. Phase 1+2 alone deliver a product worth shipping. |
| 5 | **Performance issues with canvas + audio on mobile** | Low | Medium | Use requestAnimationFrame, limit canvas resolution on mobile, debounce analysis to 30fps. Profile early in Phase 4. |

### Kill Conditions

- If Web Audio API is blocked/unavailable on target browsers (unlikely — supported since 2014), drop Phase 4 voice analysis entirely. Phases 1-3 + 5 still deliver a complete product.
- If Gemini Flash free tier becomes insufficient for the AI load (scene partner + voice forge + drills), the product needs a "bring your own API key" model — but this is already built into The Codex's Settings page.

### Unknown Unknowns

- How well does autocorrelation pitch detection perform on mobile Chrome vs Safari vs Firefox? Safari's Web Audio implementation has historically been quirky. Must test early in Phase 4.
- Will users actually use IPA notation, or is it academic overhead? Ship it, measure usage, potentially hide behind an "Advanced" toggle if it clutters the UI.

---

## Plan Summary

| Field | Value |
|-------|-------|
| **Feature** | Accent Forge — Elite D&D Voice Performance System |
| **Phases** | 5 |
| **Estimated Total Effort** | 10-11 focused sessions (~20-25 hours) |
| **Highest Risk** | Web Audio pitch detection reliability for natural speech (Phase 4) |
| **First Milestone** | Phase 1 — 20+ accent library + DM Rapid Mode (immediately usable at game tables) |
| **Critical Path** | Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 |
| **Parallelizable** | Phase 4 Performance Science content can be authored in parallel with Phase 3 development |
| **Dependencies** | None external. All browser-native APIs + existing Gemini Flash integration. |
| **Ship-worthy After** | Phase 1 alone is shippable. Each subsequent phase adds a distinct value layer. |

### Phase Value Stacking

```
Phase 1: "I can look up any accent at the table"           <- USABLE
Phase 2: "I can create custom voices for my NPCs"          <- CREATIVE
Phase 3: "I can actively practice and get AI coaching"      <- TRAINING
Phase 4: "I can see how my voice actually sounds"           <- ANALYSIS
Phase 5: "I can track my growth and earn mastery"           <- RETENTION
```

Each phase is independently valuable. Stalling after Phase 2 still leaves a product that DMs will use every session.
