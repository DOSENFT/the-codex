Now I have all the data I need. Let me compile the complete exhaustive inventory.

---

# THE CODEX -- COMPLETE PRODUCT HANDOFF INVENTORY

## Project Overview

**Project:** The Codex -- D&D 2024 Combat Companion
**Location:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\`
**GitHub:** `DOSENFT/the-codex`
**Total Lines of Code:** 24,273 across all `.ts`, `.tsx`, and `.css` files
**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Framer Motion (`motion/react`)
**AI Providers:** Google Gemini (via `@google/generative-ai`) + local Ollama (REST API), automatic fallback
**Fonts:** Cinzel Decorative (display, `.font-display`), Alegreya (body, `.font-body`), Cinzel (lore, `.font-lore`)
**Aesthetic:** Dark-fantasy grimoire -- gold/ember/arcane/eldritch/verdant/ash palette

---

## 1. CONFIGURATION FILES

### `package.json`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\package.json`
- **name:** `the-codex`
- **Scripts:** `dev` (vite), `build` (tsc -b && vite build), `lint` (eslint), `preview` (vite preview)
- **Dependencies:** react 19.1.0, react-dom 19.1.0, `@google/generative-ai` 0.24.0, `motion` 12.7.3, lucide-react 0.477.0, clsx 2.1.1, tailwind-merge 3.2.0
- **Dev Dependencies:** vite 6.3.5, typescript 5.8.3, tailwindcss 4.1.4, `@tailwindcss/vite` 4.1.4, `@types/react` 19.1.2, eslint 9.25.0

### `vite.config.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\vite.config.ts`
- Plugins: react (via `@vitejs/plugin-react`), tailwindcss (via `@tailwindcss/vite`)

### `tsconfig.json`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\tsconfig.json`
- Strict mode, ES2020 target, bundler module resolution
- Path alias: `@/*` -> `./src/*`

### `index.html`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\index.html`
- Title: "The Codex"
- `<meta name="theme-color" content="#1a1613">` (ash-deep)
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- Preconnects to Google Fonts (Cinzel Decorative, Alegreya)

---

## 2. ENTRY POINTS

### `src/main.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\main.tsx`
- `createRoot(document.getElementById('root')!)` with `<StrictMode>` wrapping `<App />`

### `src/App.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\App.tsx`
- **Exports:** `export default function App()`
- **State:** `activeCharacterId` (string | null), `diceRollerOpen` (boolean), `diceRollerPrefill` ({notation, label} | null)
- **Hook:** `useCharacter(activeCharacterId)` returns `{ character, updateCharacter, deleteCharacter, allCharacters, setActiveCharacter, addCharacter }`
- **Tabs (via Layout):** Combat, Spells, Identity, Academy, Campaign, Settings
- **Tab type:** `'combat' | 'spells' | 'identity' | 'academy' | 'campaign' | 'settings'`
- **Conditional routing:** If no character selected, shows `CharacterSetup`; otherwise shows tab content
- **Tab content mapping:**
  - `combat` -> `CombatHelper`
  - `spells` -> `Spellbook`
  - `identity` -> `IdentityPage`
  - `academy` -> `AcademyPage`
  - `campaign` -> `CampaignEditor`
  - `settings` -> `Settings` + `CharacterSheet`
- **Dice roller overlay:** `DiceRoller` rendered as a modal with Framer Motion `AnimatePresence`
- **Page transitions:** All tab content wrapped in `<motion.div>` with fade + translateY animation

### `src/index.css`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\index.css`
- Imports Tailwind v4 via `@import "tailwindcss"`
- **CSS Custom Properties (design tokens):**
  - `--color-ash-deep: #1a1613`, `--color-ash-warm: #231f1b`, `--color-ash-mid: #2d2824`
  - `--color-gold: #c5a55a`, `--color-gold-dim: #937b3d`, `--color-bronze: #a38d5e`
  - `--color-ember: #f4b545`, `--color-arcane: #7ca1d4`, `--color-eldritch: #b28fd0`, `--color-verdant: #39d98a`
  - `--color-ink-primary: #eee6d6`, `--color-ink-secondary: #b8ad9e`, `--color-ink-muted: #7a7168`
  - `--font-display: 'Cinzel Decorative'`, `--font-body: 'Alegreya'`, `--font-lore: 'Cinzel'`
  - `--ease-snap: cubic-bezier(0.22, 1, 0.36, 1)`
- **@theme blocks:** Tailwind v4 theme extensions for colors, fonts, animation timings
- **Component Classes:**
  - `.codex-card` -- Warm radial gradient background with gold glow on hover
  - `.stat-frame` -- Mini stats display with gold border accents
  - `.combat-card` -- Semi-transparent bordered card for combat context
  - `.parchment-card` -- Radial gradient + corner flourishes via ::before and ::after
  - `.parchment-corner--tl/tr/bl/br` -- Rotated pseudo-element corners
  - `.codex-ritual` -- Animated gradient border for AI advisor section
  - `.ornate-divider` -- Horizontal line with centered text and fade gradients
  - `.condition-alert` -- Left-bordered alert strip for active conditions
  - `.gold-gradient-text` -- Gold gradient text via `background-clip: text`
  - `.drop-cap` -- First-letter large Cinzel styling
  - `.combat-canvas` -- Full-width background container
- **Animations:** `@keyframes fade-in`, `@keyframes slide-up`, `@keyframes pulse-gold`
- **Utility classes:** `.scrollbar-none`, `.animate-fade-in`, `.animate-slide-up`, `.animate-pulse-gold`
- **Selection styling:** Gold-tinted text selection
- **Safe area:** `padding-bottom: env(safe-area-inset-bottom)` on body

---

## 3. LIBRARY FILES (`src/lib/`)

### `src/lib/cn.ts` (4 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\cn.ts`
- **Export:** `cn(...inputs: ClassValue[]): string` -- Merges clsx + tailwind-merge

### `src/lib/character.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\character.ts`
- **Types exported:**
  - `Spell` -- name, level, school, castingTime, range, components, duration, concentration, ritual, description, higherLevels, alwaysPrepared, source, damageType, damageDice, saveType, areaOfEffect, tacticalNote, prepared
  - `Feature` -- name, description, level, usesPerRest, usesMax, usesCurrent
  - `SpellSlot` -- max, current (per level)
  - `HitPoints` -- max, current
  - `DeathSaves` -- successes, failures
  - `PaladinResources` -- layOnHands {max, current}, channelDivinity {max, current}, auraRange
  - `Weapon` -- name, damageDice, damageType, abilityMod (key of AbilityScores), magical, bonusToHit, bonusDamage
  - `AbilityScores` -- str, dex, con, int, wis, cha (all number)
  - `CharacterPersona` -- defaultState, decisionTree, physicalTics[], sceneInstincts[], quietTexture[], patron {name, domains[], symbol, rpNotes}, voiceNotes?, catchphrases?, colorTraits?, coreTraits?, wants?, fears?, relationships?, dialogueBank?, sceneResponses?, lastEditedAt?
  - `DialogueLine` -- text, context ('combat'|'social'|'discovery'|'emotional'|'quiet'), favorite, scenario?, deliveryNotes?
  - `BackstoryMemory` -- title, description, emotionalCore, npcInvolved?
  - `BackstoryRelationship` -- name, relation, status ('alive'|'dead'|'unknown'|'estranged')
  - `CharacterBackstory` -- origin, keyMemories[], relationships[], unresolvedThreads[]
  - `Character` -- id, name, class, subclass, race, level, hitPoints, tempHP, armorClass, spellSaveDC, spellAttackBonus, proficiencyBonus, spellSlots, spells[], features[], conditions[], deathSaves, canPrepareSpells, maxPreparedSpells, homebrewNotes?, paladinResources?, persona?, abilityScores, skillProficiencies[], skillExpertise[], weapons[], gender?, pronouns?, equipment?, supplies?, backstory?, campaignId?
- **Functions exported:**
  - `generateId()` -- `crypto.randomUUID()`
  - `createDefaultCharacter()` -- Returns Character with sensible defaults
  - `saveCharacter(char)` -- localStorage key `codex-character-${id}`
  - `loadCharacter(id)` -- Retrieves from localStorage
  - `deleteCharacterData(id)` -- Removes from localStorage
  - `getAllCharacterIds()` -- Reads `codex-character-ids` key, returns array
  - `saveCharacterIds(ids)` -- Persists array to localStorage
  - `expendSpellSlot(char, level)` -- Returns updated character
  - `restoreSpellSlot(char, level)` -- Returns updated character
  - `shortRest(char)` -- Restores features with usesPerRest = 'short'
  - `longRest(char)` -- Restores all spell slots, all features, full HP, resets death saves
  - `expendLayOnHands(char, amount)` -- Subtracts from pool
  - `expendChannelDivinity(char)` -- Decrements current
  - `toggleCondition(char, condition)` -- Toggles condition in/out of array
  - `addDeathSaveSuccess(char)` -- Increments success count
  - `addDeathSaveFailure(char)` -- Increments failure count
  - `getPreparedSpells(char)` -- Returns spells where prepared || alwaysPrepared || cantrip
  - `toggleSpellPrepared(char, name)` -- Flips prepared flag
  - `removeSpell(char, name)` -- Filters out spell by name
  - `abilityModifier(score)` -- `Math.floor((score - 10) / 2)`
  - `skillBonus(char, skill)` -- Proficiency bonus + ability modifier + expertise
  - `attackBonus(char, weapon)` -- Ability modifier + proficiency + bonus

### `src/lib/combat-state.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\combat-state.ts`
- **Types:**
  - `InitiativeEntry` -- id, name, initiative, hp?, ac?, isPC
  - `CombatState` -- inCombat, round, turnActions {action, bonusAction, reaction, movement}, concentrating, initiativeOrder[], currentTurnIndex
- **Functions:**
  - `createCombatState(char)` -- Default off-combat state
  - `startCombat(char)` -- Sets inCombat=true, round=1
  - `endCombat(char)` -- Resets everything
  - `nextTurn(state)` -- Increments round, resets turnActions
  - `useAction(state, type)` -- Marks action as used
  - `setConcentration(state, spellName | null)` -- Sets concentrating field
  - `saveCombatState(charId, state)` -- localStorage `codex-combat-${charId}`
  - `loadCombatState(charId)` -- Retrieves from localStorage
  - `clearCombatState(charId)` -- Removes from localStorage

### `src/lib/damage-log.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\damage-log.ts`
- **Types:**
  - `DamageEntry` -- amount, type ('damage'|'healing'|'temp_hp'), damageType?, source?, timestamp
  - `CombatLog` -- id, entries[], startedAt, endedAt?
- **Functions:**
  - `createCombatLog()` -- New empty log with timestamp
  - `logDamage(log, entry)` -- Appends entry with timestamp
  - `endCombatLog(log)` -- Sets endedAt
  - `saveDamageLogs(charId, logs)` -- localStorage `codex-damage-${charId}`
  - `loadDamageLogs(charId)` -- Retrieves from localStorage

### `src/lib/dice.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\dice.ts`
- **Types:**
  - `DiceResult` -- notation, rolls[] (per die group with sides, count, results[]), modifier, total, label?
- **Functions:**
  - `rollDice(notation, label?)` -- Parses notation like "2d6+3", uses `crypto.getRandomValues()` for cryptographic randomness, returns DiceResult
  - `parseNotation(notation)` -- Regex-based dice notation parser supporting patterns like `NdS+M`, `NdS-M`, etc.

### `src/lib/dnd-data.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\dnd-data.ts`
- **Constants:**
  - `D20_CONDITIONS` -- Array of 15 D&D 2024 condition names: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Exhaustion
  - `BASIC_ACTIONS` -- Array of ActionChoice objects: Attack, Dodge, Dash, Disengage, Help, Hide, Ready, Search, Use Object, Grapple, Shove
  - `PALADIN_ACTIONS` -- Array of Paladin-specific ActionChoice objects: Divine Smite, Lay on Hands
  - `RACE_CONTENT` -- Record mapping race names to 2024 species rules text (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling, Aasimar, Goliath, Orc)

### `src/lib/dnd-rules.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\dnd-rules.ts`
- **Constants:**
  - `ALL_ABILITIES` -- ['str', 'dex', 'con', 'int', 'wis', 'cha']
  - `ABILITY_NAMES` -- Mapping: str->"Strength", dex->"Dexterity", etc.
  - `ALL_SKILLS` -- Array of 18 D&D skills with their associated ability score
  - `SKILL_ABILITY_MAP` -- Record<skillName, abilityKey>
  - `CLASS_DATA` -- Per-class data: savingThrows, spellcasting (ability, type), hitDie, subclasses[]
  - `ARMOR_TYPES` -- Array of armor with name, baseAC, dexCap, stealthDisadvantage
  - `REST_RULES` -- Short rest and long rest rule text
  - `CONDITION_RULES` -- Detailed condition rule text per condition name

### `src/lib/ai.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\ai.ts`
- **Types:**
  - `AIProvider` -- 'gemini' | 'ollama'
  - `AIConfig` -- provider, geminiApiKey?, ollamaUrl?, ollamaModel?
  - `AIResponse` -- text: string
- **Constants:**
  - `AI_CONFIG_KEY = 'codex-ai-config'`
  - `DEFAULT_CONFIG` -- provider: 'gemini', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3'
- **Functions:**
  - `saveAIConfig(config)` -- localStorage
  - `loadAIConfig()` -- localStorage with defaults
  - `queryAI(systemPrompt, message, config?)` -- Routes to Gemini or Ollama
  - `queryGemini(systemPrompt, message, apiKey)` -- Uses `@google/generative-ai` SDK, model `gemini-2.0-flash`, temperature 0.7, topP 0.95, maxOutputTokens 2048, safety settings all set to BLOCK_NONE
  - `queryOllama(systemPrompt, message, url, model)` -- REST POST to `${url}/api/generate`
  - `testAIConnection(config)` -- Sends test query, returns boolean

### `src/lib/prompts.ts` (771 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\prompts.ts`
- **Helper Function:** `characterContext(char, campaign?)` -- Builds comprehensive text context string containing: name, gender, pronouns, class, subclass, race, level, AC, HP, spell save DC, spell attack bonus, proficiency bonus, ability scores with modifiers, skill proficiencies with bonuses and expertise markers, weapons with to-hit and damage calculations, equipment, supplies, prepared spells with concentration/damage/save details, spell slots per level, class features with usage tracking, paladin resources, persona data (defaultState, decisionTree, patron), backstory data (origin, memories, relationships, threads), race-specific rules, homebrew notes, campaign context
- **Constant:** `BASE_PROMPT` -- "You are an expert D&D 2024 (5th Edition 2024 revision, NOT the 2014 version) rules advisor..."
- **Exported Object:** `SYSTEM_PROMPTS` containing 22 prompt generator functions:
  1. `base` -- BASE_PROMPT string
  2. `combatAdvisor(char, campaign?)` -- Combat strategist, ranks options, warns about concentration
  3. `spellExplainer(char, campaign?)` -- Plain-English spell explanation with 2024 changes
  4. `spellTactician(char, campaign?)` -- Tactical spell usage advice with combos
  5. `quizMaster(char, recentTopics?, recentQA?, campaign?)` -- Quiz generation with dedup enforcement, answer-first generation, tactical rubric. JSON output: question, correctAnswer, distractors[], explanation, difficulty, category, topic
  6. `sceneCoach(char, campaign?)` -- Roleplay coaching: tics, instincts, dialogue, body language, patron's shadow
  7. `sceneGenerator(char, campaign?)` -- Generates immersive 4-6 sentence scenes ending at decision points
  8. `sceneResponseGrader(char, scene, say, do, campaign?)` -- 5-dimension scoring (persona, emotion, physical, decision, patron), JSON output with scores, strengths, improvements, coachNote
  9. `sceneReferenceReaction(char, scene, campaign?)` -- AI plays the character in a scene for reference
  10. `improvGrader(char, campaign?)` -- Grades improv responses for persona consistency, JSON: score, strengths, improvements, suggestion
  11. `combatSimScenario(char, campaign?)` -- Generates tactical combat training scenarios with enemies, terrain, objectives, hints
  12. `combatSimEvaluator(char, campaign?)` -- Evaluates tactical decisions with rating, strengths, improvements, optimal play, rules check
  13. `characterSetup` -- Full character setup with spell list generation, spell slots, class features. Handles homebrew subclass content
  14. `personaBuilder(char, campaign?)` -- Toy Method persona traits: colorTraits, coreTraits, wants, fears, pressureResponse
  15. `backstoryHelper(char, campaign?)` -- Generates origin, key memories with emotional cores, relationships
  16. `backstoryDrill(char, memory, campaign?)` -- Scene prompt reliving a specific backstory memory
  17. `dialogueSuggestion(char, context, campaign?)` -- Generates 3 in-character dialogue lines
  18. `conversationDrill(char, npcType, previousExchanges[], campaign?)` -- NPC conversation with per-turn coaching (voiceConsistency, vocabularyMatch, emotionalRegister). Different JSON for first vs subsequent messages
  19. `conversationSummary(char, campaign?)` -- Conversation session summary: overallScore, bestMoment, improvementTip
  20. `interactiveOneShot(char, previousTurns[], campaign?)` -- Dual DM + Coach, branching narrative with green/amber/red coaching. Auto-wraps at turn 7-9
  21. `dialogueDeliveryCoach(char, campaign?)` -- Juilliard-trained acting coach: tone, pacing, emotion, bodyLanguage, vocalDynamics, variant
  22. `dialoguePractice(char, context, campaign?)` -- Scenario generation for dialogue practice
  23. `dialogueEvaluate(char, context, campaign?)` -- Evaluates dialogue choice: score, fit, voiceMatch, suggestion
  24. `dialogueQuickDraw(char, context, campaign?)` -- One-sentence timed scenario prompt
  25. `dialogueQuickDrawEval(char, context, campaign?)` -- Quick-draw evaluation: voiceMatch, contextFit, creativity (1-5 each)
  26. `conditionDrillGenerator(char, campaign?)` -- D&D condition quiz question using character's spells
  27. `accentPhraseGenerator(char, accentName, accentRules, campaign?)` -- 5 in-character practice phrases exercising accent rules

### `src/lib/campaign.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\campaign.ts`
- **Types:**
  - `CampaignData` -- id, name, setting, worldDetails, currentQuest, partyMembers[], notableNPCs[], sessionNotes[]
  - `PartyMember` -- name, class, race, personality, relationshipToPC
  - `CampaignNPC` -- name, role, notes
  - `SessionNote` -- id, date, summary
- **Functions:**
  - `createDefaultCampaign()` -- Empty campaign with generated ID
  - `saveCampaign(campaign)` -- localStorage `codex-campaign-${id}`
  - `loadCampaign(id)` -- Retrieves from localStorage
  - `campaignContext(campaign)` -- Builds text summary for AI prompts

### `src/lib/identity.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\identity.ts`
- **Types:**
  - `IdentityProfile` -- id, label, persona, backstory, isActive
- **Functions:**
  - `saveIdentities(charId, profiles)` -- localStorage
  - `loadIdentities(charId)` -- localStorage
  - (Placeholder for multi-identity switching -- not yet fully implemented)

### `src/lib/mechanics-reference.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\mechanics-reference.ts`
- **Types:**
  - `MechanicsEntry` -- title, category, content, tags[]
- **Constants:**
  - `MECHANICS_REFERENCE` -- Array of MechanicsEntry covering D&D 2024 rules: actions, bonus actions, reactions, movement, conditions, cover, saving throws, death saves, resting, concentration, opportunity attacks, etc.

### `src/lib/training.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\training.ts`
- **Types:**
  - `QuizRecord` -- category, difficulty, correct, timestamp
  - `DrillRecord` -- type, score, timestamp
  - `FlashcardProgress` -- cardId, interval, easeFactor, nextReview, reviewCount
  - `TrainingProfile` -- characterId, level, totalXP, quizHistory[], drillHistory[], flashcardProgress[], quizStreaks {current, best}, totalSessions, weakCategories[]
- **Functions:**
  - `xpForLevel(level)` -- XP thresholds: 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500
  - `createTrainingProfile(charId)` -- Default profile at level 1, 0 XP
  - `saveTrainingProfile(profile)` -- localStorage `codex-training-${charId}`
  - `loadTrainingProfile(charId)` -- localStorage
  - `addQuizResult(profile, record)` -- Updates XP, streak, weak categories, returns updated profile
  - `addDrillResult(profile, record)` -- Adds XP based on score
  - `initFlashcardProgress(profile, cardId)` -- Creates card with interval=1, easeFactor=2.5
  - `reviewFlashcard(profile, cardId, rating)` -- SM-2 algorithm: rating 1=Again, 2=Hard, 3=Good, 4=Easy. Adjusts interval and ease factor
  - `getDueFlashcards(progress[])` -- Returns cards where nextReview <= now
  - `computeWeakCategories(history[])` -- Categories with accuracy < 60%
  - `suggestDifficulty(profile)` -- apprentice < level 3, journeyman < level 6, master >= 6

### `src/lib/accent-data.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\accent-data.ts`
- **Types:**
  - `AccentProfile` -- name, description, rules[], examples[], tips[]
- **Constants:**
  - `ACCENT_LIBRARY` -- Array of 12 accent profiles: Scottish, Cockney, Irish, French, Russian, German, Southern US, Pirate, Nordic/Scandinavian, Japanese-inflected, Arabic-inflected, Elvish (Fantasy)
  - Each profile has 4-7 phonetic rules, 3-4 example phrases, and 3-5 tips

### `src/lib/motion-utils.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\lib\motion-utils.ts`
- **Exports:**
  - `staggerContainer` -- Framer Motion variants with staggerChildren: 0.06
  - `staggerChild` -- opacity + y transition for children
  - `block1Variants` -- Stagger parent for Block 1 combat layout
  - `surfaceVariants` -- Individual surface entry animation

---

## 4. HOOKS (`src/hooks/`)

### `src/hooks/useAI.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\hooks\useAI.ts`
- **Returns:** `{ response, loading, error, query, queryStructured, clearResponse }`
- **State:** response (string|null), loading (boolean), error (string|null)
- **`query(systemPrompt, message)`** -- Calls `queryAI()`, sets response/error
- **`queryStructured<T>(systemPrompt, message)`** -- Calls `queryAI()`, parses JSON response, strips markdown code fences. Returns typed result
- **`clearResponse()`** -- Resets all state

### `src/hooks/useCharacter.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\hooks\useCharacter.ts`
- **Returns:** `{ character, updateCharacter, deleteCharacter, allCharacters, setActiveCharacter, addCharacter }`
- **State:** `activeId` (string|null), `characterMap` (Map<string, Character>)
- **localStorage keys:** `codex-active-character`, `codex-character-ids`, `codex-character-${id}`
- **Loads all characters on mount** from stored IDs
- **`addCharacter(char)`** -- Saves to map + localStorage, sets as active
- **`deleteCharacter(id)`** -- Removes from map + localStorage, clears active if deleted
- **`setActiveCharacter(id)`** -- Updates activeId and persists

### `src/hooks/useTraining.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\hooks\useTraining.ts`
- **Returns:** `{ profile, recordQuiz, recordDrill, reviewCard, getDueCards, suggestedDifficulty, weakCategories, initFlashcard }`
- **State:** `profile` (TrainingProfile | null)
- **`recordQuiz(category, difficulty, correct)`** -- Updates profile with quiz result, adds XP
- **`recordDrill(type, score)`** -- Updates profile with drill result
- **`reviewCard(cardId, rating)`** -- SM-2 review of flashcard
- **`getDueCards()`** -- Returns due flashcard IDs
- **`suggestedDifficulty()`** -- Returns recommended difficulty based on level
- **`weakCategories`** -- Categories with < 60% accuracy

---

## 5. UI PRIMITIVES (`src/components/ui/`)

### `Badge.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\Badge.tsx`
- **Props:** children, variant ('arcane'|'eldritch'|'ember'|'verdant'|'neutral'), className
- 5 color variants with matching bg/text/border

### `Button.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\Button.tsx`
- **Props:** variant ('primary'|'secondary'|'ghost'), size ('sm'|'md'|'lg'), loading, disabled, children, className, onClick
- Min height 44px for touch targets
- Loading spinner (Loader2) replaces children when loading
- Press feedback: `active:scale-[0.97]`
- Primary: gold gradient background

### `GlassCard.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\GlassCard.tsx`
- **Props:** children, className
- Semi-transparent dark card with gold border accents

### `HexFrame.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\HexFrame.tsx`
- **Props:** value (number|string), label, className
- CSS `clip-path: polygon(...)` hexagonal shape
- Used for ability scores and score displays

### `Input.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\Input.tsx`
- **Props:** extends InputHTMLAttributes, plus: icon (LucideIcon), label (string), error (string)
- 44px min height, auto-generated ID via useId()
- Error state: red border, red shadow, error message with role="alert"
- `aria-invalid`, `aria-describedby` for accessibility

### `Select.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\Select.tsx`
- **Props:** extends SelectHTMLAttributes, plus: label, options (SelectOption[])
- Native `<select>` with `appearance-none` and custom ChevronDown overlay
- 44px min height

### `OrnateHeader.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\OrnateHeader.tsx`
- **Props:** children, className
- Centered Cinzel serif text with gold gradient divider lines on both sides

### `ParchmentCard.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\ParchmentCard.tsx`
- **Props:** children, className
- Dark-fantasy card with corner flourishes via `.parchment-corner` pseudo-elements

### `ui/index.ts`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ui\index.ts`
- Barrel export of all UI primitives

---

## 6. LAYOUT & NAVIGATION

### `Layout.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\Layout.tsx`
- **Props:** children, activeTab, onTabChange, characterName, allCharacters[], activeCharacterId, onSwitchCharacter
- **Bottom navigation bar** with 6 tab icons (Sword, BookOpen, Theater, GraduationCap, Globe, SlidersHorizontal)
- **Character switcher dropdown** in the header
- **Tab labels:** Combat, Spells, Identity, Academy, Campaign, Settings
- Safe area bottom padding for mobile
- Active tab has gold indicator + text color

---

## 7. MAJOR COMPONENTS

### `CharacterSetup.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\CharacterSetup.tsx`
- **Props:** onCharacterCreated(char), existingCharacters[], onSelectCharacter(id)
- **Flow:** Step 1 (class/race/subclass/level) -> Step 2 (AI generates spell list, features, slots) -> Step 3 (review + confirm)
- **State:** step (1|2|3), formData, generatedData, editedSpells
- **AI call:** `SYSTEM_PROMPTS.characterSetup` to generate full spell list, features, spell slots
- **Features:** Class dropdown (all D&D 2024 classes), dynamic subclass list from CLASS_DATA, level 1-20, race list
- Existing character list with switch capability
- Homebrew notes textarea for custom subclass rules

### `CharacterSheet.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\CharacterSheet.tsx`
- **Props:** character, onCharacterUpdate, onOpenDiceRoller?
- **Sections (each collapsible):**
  - Identity: Name, Class, Subclass, Race, Level, Gender, Pronouns
  - Combat Stats: AC, Spell Save DC, Spell Attack Bonus, Proficiency Bonus
  - Hit Points: Max HP
  - Ability Scores: 6-hexagon grid with HexFrame, modifier display
  - Skills: All 18 skills with proficiency/expertise toggles
  - Weapons: CRUD for weapons with ability mod selector
  - Equipment & Supplies: Editable lists
  - Features: Name, description, uses tracking (usesPerRest: 'short'|'long'|null)
  - Homebrew Notes: Freeform textarea for subclass homebrew
  - Persona Upgrade: "Upgrade" button to generate persona data via AI (`SYSTEM_PROMPTS.personaBuilder`)
  - Danger Zone: Delete character with confirmation

### `Settings.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\Settings.tsx`
- **Props:** character, onCharacterUpdate
- **AI Configuration:** Provider selector (Gemini/Ollama), API key input for Gemini, URL + model inputs for Ollama
- **Test Connection button:** Sends test query to validate AI setup
- **Character Management:** Export/import character as JSON
- **Data Management:** Clear all data with confirmation
- **About section:** Version info

### `DiceRoller.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\DiceRoller.tsx`
- **Props:** isOpen, onClose, prefill?
- **State:** notation (string), label (string), results (DiceResult[])
- **Features:** Dice notation input, roll history (last 10), quick buttons for common rolls (d20, d4-d12, 2d6)
- **Keyboard:** Enter to roll
- Uses `rollDice()` from `src/lib/dice.ts`

### `DiceAnimation.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\DiceAnimation.tsx`
- **Props:** result (DiceResult), animate (boolean)
- Animated dice result display with cascading number reveal
- Framer Motion stagger animation on individual die results

### `ConditionReminder.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ConditionReminder.tsx`
- **Props:** conditions (string[])
- Displays active condition effects as reminders
- References `CONDITION_RULES` for detailed rule text

### `MechanicsDrawer.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\MechanicsDrawer.tsx`
- **Props:** isOpen, onClose
- Searchable drawer of all D&D 2024 mechanics from `MECHANICS_REFERENCE`
- Category filter chips
- Keyboard: Escape to close

### `InlineExplainer.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\InlineExplainer.tsx`
- **Props:** term (string), explanation (string)
- Tooltip-style inline rules explainer
- Click to expand, click outside to close

### `SpellEditor.tsx` (557 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\SpellEditor.tsx`
- **Props:** isOpen, onClose, character, onCharacterUpdate, editSpell?
- Modal form for adding/editing spells
- **Fields:** name, level (0-9), school (8 schools), castingTime, range, components, duration, concentration toggle, ritual toggle, description, higherLevels, damageType, damageDice, saveType, areaOfEffect, tacticalNote, alwaysPrepared toggle
- Edit mode: pre-fills from existing spell
- Add mode: blank form
- Escape to close, prevents body scroll

### `HPTracker.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\HPTracker.tsx`
- **Props:** character, onCharacterUpdate
- Damage/heal/temp HP input with +/- buttons
- HP bar visualization with color coding (green > 50%, amber > 25%, red <= 25%)
- Death saves tracker when HP = 0

### `ActionMenu.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ActionMenu.tsx`
- **Types:** `ActionChoice` -- name, description, type ('action'|'bonus'|'reaction'|'movement'|'free'), category, slotLevel?, rollNotation?, rollLabel?
- **Props:** isOpen, onClose, onSelect(action), character, combatState
- Slide-up overlay menu listing all available actions
- Categories: Basic Actions, Spells (by slot level), Class Features, Paladin Actions (conditional)
- Spell slot availability indicators
- Groups spells by casting time (Action, Bonus Action, Reaction)

### `DamageTracker.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\DamageTracker.tsx`
- **Props:** damageLog (CombatLog | null), character
- Displays real-time damage/healing log during combat
- Per-entry display with timestamp, amount, type, source
- Running totals for damage dealt and healing received

---

## 8. COMBAT SYSTEM (`CombatHelper.tsx` + `src/components/combat/`)

### `CombatHelper.tsx` (1289 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\CombatHelper.tsx`

**Props:**
- `character: Character`
- `onCharacterUpdate: (character: Character) => void`
- `onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void`

**Types:**
- `ActionEconomy` -- action, bonusAction, reaction, movement (all boolean)
- `InputMode` -- 'damage' | 'heal' | 'temp' | null

**Constants:**
- `LEVEL_LABELS` -- Ordinal labels for spell slot levels
- `CONDITION_EFFECTS` -- Record of 15 conditions with summary text and reminder strings
- `SLOW_RACES` -- Set of Dwarf, Gnome, Halfling (speed 25ft)

**Helper Functions:**
- `formatAIResponse(text)` -- Parses **bold** markdown in AI text, returns JSX array with styled `<strong>` tags and `.drop-cap` on first paragraph
- `countAvailableSlots(spellSlots)` -- Sums all current slot counts
- `deriveSpeed(race)` -- Returns 25 or 30 based on race

**Inline Sub-Components:**

1. **`ConditionAlertBanner`** -- Expandable banner when conditions are active
   - Props: character, onOpenDiceRoller
   - State: expanded
   - Shows condition names, expands to show summaries and reminders
   - "Roll CON Save" button for Concentration condition

2. **`CombatControls`** -- Start/End combat, round counter, Next Turn, Action button
   - Props: inCombat, round, economy, onStartCombat/EndCombat/NextTurn/ToggleEconomy/ResetEconomy/OpenActionMenu
   - Out of combat: full-width "Start Combat" button with gold gradient
   - In combat: End button, Round badge, Next button, Action button, ActionEconomyStrip

3. **`PaladinResourceTracker`** -- Lay on Hands pool + Channel Divinity charges + Aura range
   - Props: resources, spellSlots, handlers
   - Lay on Hands: HP bar, Heal 5/10/Cure(5) buttons, custom amount input
   - Channel Divinity: Circle pips (clickable to expend/restore)
   - Aura badge showing range

4. **`ConcentrationTracker`** -- Track active concentration spell
   - Props: concentrationSpell, availableSpells, onSet/onDrop
   - Shows current concentration spell or list of available concentration spells to activate
   - Drop concentration button (X)

5. **`AICombatAdvisor`** -- AI chat interface for combat advice
   - Props: character, response, loading, error, onQuery, onClear
   - Input with Sword icon, Send button
   - Loading state: "Analyzing the battlefield..."
   - Response display with `formatAIResponse()`
   - Enter to submit, auto-scroll on response

6. **`PersonaCard`** -- Collapsible persona quick reference in combat
   - Props: persona
   - Random catchphrase from `useMemo`
   - Shows: defaultState, physicalTics as pills, sceneInstincts as list, patron, catchphrase, voiceNotes

**Main Component State:**
- `inputMode` (InputMode) -- Controls damage/heal/temp panel visibility
- `combatState` (CombatState) -- Persisted via `loadCombatState/saveCombatState`
- `actionMenuOpen` (boolean) -- Action Menu slide-up
- `concWarning` ({ newSpell, action } | null) -- Concentration switch confirmation dialog
- `currentDamageLog` (CombatLog | null) -- Active combat damage tracking

**Derived State:**
- `economy` -- From combatState.turnActions
- `concentrationSpell` -- From combatState.concentrating

**AI Hook:** `useAI()` for combat advisor

**Handlers (16 total):**
- `handleStartCombat` -- Creates combat state, auto-adds PC to initiative
- `handleEndCombat` -- Saves damage log to history, clears combat state
- `handleNextTurn` -- Advances round, cycles initiative index
- `toggleEconomy(key)` -- Toggles action/bonus/reaction/movement
- `resetEconomy` -- Resets all to false
- `handleAddInitiative(entry)` -- Adds + sorts by initiative descending
- `handleRemoveInitiative(id)` -- Removes from order
- `handleReorderInitiative(entries)` -- Direct set
- `applyAction(action)` -- Uses action economy, expends spell slot, sets concentration, opens dice roller
- `handleUseAction(action)` -- Checks concentration conflicts before applying
- `handleConfirmConcentrationSwitch` -- Applies action after concentration warning
- `handleExpendSlot/handleRestoreSlot` -- Spell slot management
- `handleExpendLayOnHands/handleExpendChannelDivinity/handleRestoreChannelDivinity` -- Paladin resources
- `handleSetConcentration/handleDropConcentration` -- Concentration tracking
- `handleToggleCondition` -- Adds/removes conditions
- `handleAIQuery(message)` -- Sends to combat advisor
- `handleQuickAction(name, desc)` -- Pre-formats AI query for action
- `handleLogDamage(entry)` -- Appends to current damage log
- `handleShortRest/handleLongRest` -- Rest management
- `handleOpenFullRoller` -- Opens dice roller with default d20

**Render Structure (editorial manuscript layout):**
- Block 1: CharacterCard + VitalsRow + CombatActionRow + StatsBar (conditional) + StatusRow
- Ornate Divider: "Arsenal"
- Section C: ActionEconomyStrip + SpellSlotSigils
- Ornate Divider: "Combat"
- Section D: CombatControls (in/out of combat)
  - In combat: ConditionAlertBanner, ConditionsGrid, ConcentrationTracker, InlineDiceSection, InitiativeTracker, SmartActionsGrid
  - Out of combat: ConditionsGrid, ConcentrationTracker, SmartActionsGrid
- Ornate Divider: "Counsel"
- AICombatAdvisor (codex-ritual frame)
- RestManagement
- PersonaCard (conditional on character.persona)
- PaladinResourceTracker (conditional on character.paladinResources)
- DamageTracker
- ActionMenu overlay (conditional)
- Concentration Warning Dialog (conditional)
- Framer Motion stagger animations on all sections

### Combat Sub-Components (17 files, 2988 lines total)

| File | Lines | Purpose |
|------|-------|---------|
| `CharacterCard.tsx` | 140 | Character identity card (name, class, race, level) |
| `CharacterHero.tsx` | 84 | Hero-style character display |
| `VitalsRow.tsx` | 168 | HP bar, AC shield, Speed display |
| `CombatActionRow.tsx` | 55 | Damage/Heal/TempHP action buttons |
| `StatusRow.tsx` | 137 | Spell Save DC, concentration indicator, death saves |
| `StatsBar.tsx` | 564 | Inline damage/heal/temp HP input panel |
| `ActionEconomyStrip.tsx` | 210 | Visual action/bonus/reaction/movement toggles |
| `SpellSlotSigils.tsx` | 287 | Spell slot sigil display (expend/restore per level) |
| `SpellSlotPips.tsx` | 97 | Alternative pip-style spell slot display |
| `ConditionsGrid.tsx` | 125 | Grid of condition toggle buttons |
| `InitiativeTracker.tsx` | 332 | Initiative order manager with add/remove/reorder |
| `InlineDiceSection.tsx` | 240 | Quick dice roller embedded in combat view |
| `SmartActionsGrid.tsx` | 147 | Context-aware action suggestions |
| `RestManagement.tsx` | 200 | Short rest / Long rest buttons and confirmation |
| `CodexHeader.tsx` | 145 | Styled section header for combat |
| `Block1Skeleton.tsx` | 30 | Loading skeleton for Block 1 |
| `Block1Empty.tsx` | 27 | Empty state for Block 1 |

---

## 9. SPELLBOOK SYSTEM (`Spellbook.tsx`, 1223 lines)

**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\Spellbook.tsx`

**Props:** character, onCharacterUpdate

**Types:**
- `SchoolName` -- 8 D&D spell schools
- `BadgeVariant` -- arcane, eldritch, ember, verdant, neutral
- `CastingTimeFilter` -- Action, Bonus Action, Reaction, Other
- `DamageTypeFilter` -- 10 damage types (Fire, Cold, Lightning, etc.)
- `RangeFilter` -- Self, Touch, 30ft+, 60ft+, 120ft+
- `AdvancedFilters` -- concentration (bool|null), ritual (bool|null), castingTimes[], damageTypes[], ranges[]

**Helper Functions:**
- `schoolVariant(school)` -- Maps school to badge color
- `actionBadge(castingTime)` -- Maps casting time to badge
- `levelLabel(level)` -- "Cantrip" or "1st", "2nd", etc.
- `filterTabLabel(level)` -- Tab label for level filter
- `countActiveAdvancedFilters(filters)` -- Count of active filters
- `matchesCastingTime(spellCastingTime, filter)` -- Filter matching
- `extractFeet(range)` -- Regex extraction of range in feet
- `matchesRange(spellRange, filter)` -- Range filter matching
- `useDebouncedValue<T>(value, delay)` -- Custom debounce hook (250ms for search)

**Sub-Components:**
- `ComponentPills` -- Renders V, S, M as tiny pills with material description tooltip
- `SpellCard` -- Individual spell card with:
  - Header: name, school badge, action type badge, concentration badge, ritual badge
  - Stats row: casting time, range, duration
  - Attack/damage info: DC + save type or attack bonus, damage dice + type, area of effect
  - Tactical note with lightbulb icon
  - Component pills (V/S/M)
  - Expand/collapse toggle for full details
  - Edit button, Delete button (with 3s auto-dismiss confirmation), Prepared toggle (star)
  - AI buttons: Explain (Sparkles icon), Tactics (Swords icon)
  - State: expanded, confirmDelete
- `AIResponseModal` -- Bottom sheet modal for AI spell explanations/tactics
  - Escape to close, prevents body scroll
  - Loading/error/response states
  - `role="dialog"`, `aria-modal="true"`
- `EmptyState` -- Different messages for "no spells match filters" vs "no spells in spellbook"

**Main Component State:**
- `searchRaw` (string) -- Raw search input
- `searchQuery` -- Debounced (250ms) search value
- `activeLevel` (number | null) -- Level filter (null = All)
- `preparedOnly` (boolean) -- Filter to prepared spells only
- `advancedOpen` (boolean) -- Advanced filter panel toggle
- `advancedFilters` (AdvancedFilters) -- All advanced filter state
- `aiModal` ({ spell, mode } | null) -- AI response modal
- `spellEditorOpen` (boolean) -- Add/Edit spell modal
- `editingSpell` (Spell | null) -- Spell being edited

**Derived Data:**
- `availableLevels` -- Sorted unique levels from spell list
- `preparedCount` -- Count of non-cantrip prepared spells
- `advancedFilterCount` -- Number of active advanced filters
- `filteredSpells` -- Full pipeline: level -> prepared -> search -> concentration -> ritual -> castingTime -> damageType -> range -> sort by level then name
- `hasActiveFilters` -- Boolean for empty state messaging

**Render Structure:**
- Search input (debounced 250ms)
- Level filter tabs (horizontal scroll, snap)
- Advanced Filters panel (collapsible): Concentration (Any/Yes/No), Ritual (Any/Yes/No), Casting Time chips, Damage Type chips (10), Range chips (5), Clear All button
- Prepared Only toggle with prepared count
- Spell list with level dividers (ornate-divider)
- Add Spell button (opens SpellEditor)
- SpellEditor modal
- AIResponseModal

---

## 10. IDENTITY SYSTEM

### `IdentityPage.tsx` (115 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\IdentityPage.tsx`
- **Props:** character, onCharacterUpdate
- **Sub-modes:** 5 modes via horizontal chip selector:
  1. `persona` -> PersonaEngine
  2. `backstory` -> BackstoryBuilder
  3. `dialogue` -> DialogueBank
  4. `accent` -> AccentCoach
  5. `identities` -> Placeholder ("Coming soon")
- Snap scrolling on mobile for mode chips

### `PersonaEngine.tsx` (~500 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\PersonaEngine.tsx`

**Props:** character, onUpdate
**Types:** PersonaTab ('builder' | 'rp_aid'), RPAidMode ('study' | 'in_session')

**Sub-Component: EditableList**
- Generic list with add/remove for persona traits
- Enter key to add, Trash2 button to remove
- Supports 5 color variants (arcane, eldritch, ember, verdant, neutral)
- 44px min height touch targets

**Helper:** `ensurePersona(char)` -- Returns default empty persona if none exists

**State:** activeTab, rpMode, copiedPhrase, suggestAI (useAI)

**AI Feature:** "AI Suggest Traits" button uses `SYSTEM_PROMPTS.personaBuilder()` to generate colorTraits, coreTraits, wants, fears, pressureResponse. Merges with existing traits.

**Builder Tab Content:**
- AI Suggest Traits button
- EditableList for: colorTraits, coreTraits, wants, fears, relationships
- Textareas for: pressureResponse, decisionTree, defaultState
- Embedded DialogueBank component
- Embedded SceneResponseBank component

**RP Aid (Study Mode):**
- Read-only display of persona data in ParchmentCards
- DefaultState, CoreTraits (Badge ember), ColorTraits (Badge arcane)
- Wants (verdant border), Fears (eldritch)
- `copyCatchphrase()` with clipboard API + 1.5s feedback timer

### `BackstoryBuilder.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\BackstoryBuilder.tsx`
- **Props:** character, onUpdate
- **AI Feature:** "Generate Backstory" button uses `SYSTEM_PROMPTS.backstoryHelper()` to create origin, key memories with emotional cores, relationships
- **Sections:** Origin (textarea), Key Memories (cards with title, description, emotionalCore, npcInvolved), Relationships (name, relation, status), Unresolved Threads (list)
- CRUD for memories, relationships, threads
- Emotional core badges color-coded by type
- Memory cards can trigger backstory drills in ImprovDrillEnhanced

### `DialogueBank.tsx` (1242 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\DialogueBank.tsx`

**Props:** character, onUpdate

**Constants:**
- `CONTEXTS` -- 5 dialogue contexts: combat, social, discovery, emotional, quiet
- `CONTEXT_COLORS` -- Maps contexts to badge variants
- `BankMode` -- 4 modes: library, practice, quickdraw, delivery
- `MODE_CONFIG` -- Label + icon per mode

**Types:**
- `DeliveryCoaching` -- tone, pacing, emotion, bodyLanguage, vocalDynamics, variant
- `PracticeScenario` -- scenario, idealTone
- `PracticeEvaluation` -- score, fit, voiceMatch, suggestion
- `QuickDrawEvaluation` -- voiceMatch (1-5), contextFit (1-5), creativity (1-5), note

**State (26 state variables):**
- Mode: activeContext, activeMode
- Library: newText, editingIdx, editText, editScenario, copiedIdx, scenarioFilter
- Practice: practiceScenario, practiceSelected, practiceCustom, practiceEval
- Quick-Draw: qdPrompt, qdInput, qdTimeLeft, qdRunning, qdEval, qdStreak, qdShowResult, qdTimerRef, qdInputRef
- Delivery Coach: coachingIdx, coaching

**AI Hooks (4):** suggestAI, practiceAI, quickDrawAI, deliveryAI

**Functions:**
- `getFilteredLines()` -- Filters by context + scenario tag
- `getFavoriteLines()` -- Context + favorite filter
- `updateBank(newBank)` -- Saves with lastEditedAt
- `handleAdd/handleRemove/handleToggleFavorite/startEdit/saveEdit/cancelEdit/handleCopy`
- `handleSuggest` -- AI generates 3 dialogue lines (`SYSTEM_PROMPTS.dialogueSuggestion`)

**4 Modes:**

1. **Library Mode:**
   - AI Suggest button
   - Scenario tag filter
   - Quick Access (favorited lines, tap to copy)
   - All lines with: quote display, favorite star, copy, edit, delete buttons
   - Add new line textarea (Enter to add, Shift+Enter for newline)

2. **Practice Mode:**
   - Generate Scenario button (`SYSTEM_PROMPTS.dialoguePractice`)
   - Scenario display with ideal tone
   - Radio-select from existing dialogue lines
   - Custom response textarea
   - Submit for evaluation (`SYSTEM_PROMPTS.dialogueEvaluate`)
   - Evaluation display: score/10, fit, voiceMatch, suggestion

3. **Quick-Draw Mode:**
   - 10-second countdown timer (100ms interval)
   - Timer bar with red color when <= 3s, pulses
   - Scenario prompt from AI (`SYSTEM_PROMPTS.dialogueQuickDraw`)
   - Timed response input (Enter to submit)
   - Auto-submit when time runs out
   - Evaluation: voiceMatch, contextFit, creativity as star ratings
   - Streak counter (avg >= 3 to maintain streak)
   - Next Round button

4. **Delivery Coach Mode:**
   - Lists all dialogue lines with "Get Coaching" button
   - AI coaching (`SYSTEM_PROMPTS.dialogueDeliveryCoach`): tone, pacing, emotion, bodyLanguage, vocalDynamics, variant (rewritten line with delivery marks)
   - Saves delivery notes back to dialogue line

**Render:** Context tabs + Mode selector + divider + mode-specific content

### `SceneResponseBank.tsx` (300 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\SceneResponseBank.tsx`
- **Props:** character, onUpdate
- **8 Situation Types:** Betrayal, Victory, Loss, Discovery, Confrontation, Mercy, Fear, Joy
- 2-column grid, expands to full-width on selection
- CRUD for pre-written responses per situation
- Inline editing with save/cancel
- Enter key to add response
- Updates persona.sceneResponses with lastEditedAt

### `AccentCoach.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\AccentCoach.tsx`
- **Props:** character
- **Features:**
  - Accent library selector (12 accents from `ACCENT_LIBRARY`)
  - Accent rules display with examples and tips
  - AI-generated practice phrases (`SYSTEM_PROMPTS.accentPhraseGenerator`)
  - MediaRecorder API for audio recording of practice
  - Playback of recorded audio with `<audio>` element
  - Record/stop/playback controls

### `IdentityManager.tsx`
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\IdentityManager.tsx`
- Placeholder/future component for multi-identity switching
- Referenced in IdentityPage but shows "Coming soon" state

---

## 11. ACADEMY / TRAINING SYSTEM

### `AcademyPage.tsx` (145 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\AcademyPage.tsx`
- **Props:** character, onCharacterUpdate
- **Tabs:** Training (RoleplayCoach) | Quizzes (QuizArena + ConditionDrill + SpacedFlashcards)
- TrainingProgress bar above tabs
- Due flashcard count badge on Quizzes tab
- Initializes flashcards from persona traits on mount

### `TrainingProgress.tsx` (218 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\TrainingProgress.tsx`
- **Props:** profile (TrainingProfile)
- **Displays:** Level badge, XP progress bar, current streak, best streak, total sessions, due cards count
- **Category accuracy bars:** Per-category (spells, combat, rules, tactics, class_features) with color coding (gold >= 60%, red < 60%)
- **Weakness callouts:** Badge list of weak categories
- **Empty state:** "Complete quizzes and drills to earn XP"
- **Helper:** `computeCategoryStats(profile)` -- Aggregates quiz history into per-category accuracy

### `QuizArena.tsx` (596 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\QuizArena.tsx`
- **Props:** character, onQuizAnswer?, suggestedDifficulty?, weakCategories?
- **Quiz Modes (5):** Spell Knowledge, Combat Tactics, Rules Mastery, Class Features, Dice Rolls
- **Question Types:** multiple_choice, true_false, open_ended, scenario
- **Difficulty Levels:** apprentice (verdant), journeyman (ember), master (eldritch)
- **State:** mode, question, selectedAnswer, openAnswer, hasAnswered, score {correct, total}, practiceWeakMode, recentTopics (dedup, last 10), recentQA (context, last 3)
- **AI:** Uses `SYSTEM_PROMPTS.quizMaster()` with recent topics/QA for dedup
- **Fisher-Yates shuffle** for option randomization when distractors format is used
- **Features:**
  - Mode chip selector with weak-category indicator dots
  - Scoreboard with percentage
  - Practice Weaknesses button
  - Question card with difficulty/category/type badges
  - Multiple choice: A/B/C/D buttons with correct (green) / incorrect (red) coloring
  - True/False: 2-column buttons
  - Open-ended: text input with Enter to submit
  - Result panel: Correct/Incorrect with explanation
  - Next Question button
  - Reports results to training system via `onQuizAnswer` callback

### `ConditionDrill.tsx` (379 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ConditionDrill.tsx`
- **Props:** character
- **AI:** Uses `SYSTEM_PROMPTS.conditionDrillGenerator()` to generate scenario-based condition questions using character's actual spells
- **State:** state (idle|loading|answering|feedback), currentQuestion, shuffledOptions, selectedAnswer, isCorrect, streak, bestStreak, totalAnswered, totalCorrect
- **Fisher-Yates shuffle** for answer option randomization
- **Auto-advance timer:** 3s on correct, 5s on incorrect
- **2x2 answer grid** with green/red feedback
- Streak counter with fire icon

### `SpacedFlashcards.tsx` (357 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\SpacedFlashcards.tsx`
- **Props:** character, profile (TrainingProfile), onReviewCard(cardId, rating)
- **SM-2 Algorithm Ratings:**
  - Again (rating 1): interval = 1 day
  - Hard (rating 2): interval * 1.2
  - Good (rating 3): interval * easeFactor
  - Easy (rating 4): interval * easeFactor * 1.3
- **Helper:** `buildFlashcardDeck(character)` -- Generates front/back cards from: physicalTics, sceneInstincts, quietTexture, catchphrases
- **Helper:** `getOverdueDays(card)` -- Days since nextReview
- **Features:** Tap-to-flip card, skip button, overdue badge, progress bar, completion state, empty state (no persona traits)

### `RoleplayCoach.tsx` (758 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\RoleplayCoach.tsx`
- **Props:** character
- **Modes:** Study | In-Session (segmented control)
- **State:** mode, drillType, personaOpen, catchphrase, generatedScene, sayInput, doInput, coaching (SceneCoaching), referenceReaction, showReference, flashcardIndex
- **AI Hooks (3):** sceneGenAI, sceneGradeAI, sceneRefAI
- **SceneCoaching Type:** scores {persona, emotion, physical, decision, patron} (each 1-10), overall, strengths[], improvements[], coachNote

**Sections:**

1. **Persona Quick Reference** (collapsible ParchmentCard)
   - Default state quote, physical tics badges, scene instincts (study only), patron info, catchphrase roller
   - In-Session: collapsed essential view (defaultState badge + catchphrase count)

2. **Scene Coach** (Study mode only)
   - Step 1: "Generate Scene" button (`SYSTEM_PROMPTS.sceneGenerator`)
   - Step 2: Scene display + SAY/DO textareas + "Get Coaching" button
   - Step 3: Coaching Results -- 5 dimension scores as badges (green >= 8, arcane >= 5, ember < 5), strengths badges, improvements badges, coach note
   - Reference Reaction toggle: Shows AI-generated "what character would do" (`SYSTEM_PROMPTS.sceneReferenceReaction`)
   - Next Scene button

3. **Drill Type Selector:** Improv Drills | Conversation
   - Improv: Embeds `ImprovDrillEnhanced` in ParchmentCard
   - Conversation: Embeds `ConversationDrill`

4. **Mannerism Flashcards** (verdant theme)
   - Cycles through physicalTics, sceneInstincts, quietTexture
   - Type badge (eldritch for Physical Tic, arcane for Scene Instinct, verdant for Quiet Texture)
   - Counter (X / total), Next button
   - Study mode: motivational text

**Empty State:** When no persona data exists, shows instruction to use "Upgrade" button

### `ImprovDrillEnhanced.tsx` (592 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ImprovDrillEnhanced.tsx`
- **Props:** character, onDrillComplete?, onOneShotComplete?, backstoryMemory?
- **Difficulty Levels:** apprentice, journeyman, master (with different prompt instructions)
- **Web Speech API:** SpeechRecognition/webkitSpeechRecognition for voice-to-text
- **AI Hooks (2):** sceneAI, gradeAI
- **State:** showOneShot, difficulty, drillScene, sayInput, doInput, grade, history (DrillRecord[]), isListening, activeField
- **ImprovGrade Type:** score (1-10), strengths[], improvements[], suggestion
- **Features:**
  - Difficulty selector (3 levels)
  - AI scene generation (`SYSTEM_PROMPTS.sceneCoach` or `backstoryDrill`)
  - Voice-to-text toggle for SAY and DO fields
  - AI grading (`SYSTEM_PROMPTS.improvGrader`)
  - Grade display: HexFrame score, strengths/improvements in ParchmentCard
  - Session history with average score
  - One-Shot mode toggle (renders InteractiveOneShot)
  - Auto-starts drill when backstoryMemory prop changes

### `ConversationDrill.tsx` (764 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\ConversationDrill.tsx`
- **Props:** character, onComplete(score), onBack
- **NPC Types (7):** Tavern Keeper, Noble, Rival Adventurer, Deity, Scared Child, Merchant, Villain
- **Constants:** MAX_EXCHANGES = 10, MIN_EXCHANGES_TO_END = 6
- **AI Hooks (2):** conversationAI, summaryAI
- **State:** selectedNpcType, conversation (ConversationState), userInput, currentNpcMessage, summaryData
- **ConversationState:** npcName, npcType, npcPersonality, exchanges[], phase (setup|active|done), overallScore
- **Coaching Metrics (per exchange):** voiceConsistency, vocabularyMatch, emotionalRegister (1-5 each)
- **3 Phases:**
  1. Setup: NPC type selection grid (7 buttons with color avatars)
  2. Active: Chat UI with NPC messages, user input, coaching dots (5-dot scale), exchange count
  3. Summary: HexFrame overall score, metric averages, best moment, improvement tip, XP award (score * 5)
- **Keyboard:** Enter to send, Shift+Enter for newline
- Auto-scroll on new messages, input re-population on error

### `InteractiveOneShot.tsx` (685 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\InteractiveOneShot.tsx`
- **Props:** character, onComplete(score), onBack
- **Constants:** MAX_TURNS = 10, MIN_TURNS_FOR_CONCLUDE = 5
- **AI Hook:** ai (useAI)
- **Types:** OneShotCoaching (rating: green|amber|red, note), OneShotTurn, OneShotSummary
- **Sub-Component:** CoachingDot -- Expandable green/amber/red coaching indicator dot
- **3 Phases:**
  1. Idle: "Begin Adventure" button
  2. Playing: AI narration + 3 choice options + freeform input + conclude button (after turn 5)
  3. Concluded: Score in HexFrame, strengths[], improvements[], highlight, turn-by-turn coaching review (collapsible)
- Previous turns collapsible/expandable via expandedTurns Set
- Auto-scroll on new narration
- Enter to submit freeform
- XP: score * 5

### `TrainingHub.tsx` (482 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\TrainingHub.tsx`
- Container/router for training features
- May be legacy -- superseded by AcademyPage

---

## 12. CAMPAIGN SYSTEM

### `CampaignEditor.tsx` (833 lines)
**Path:** `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\src\components\CampaignEditor.tsx`

**Props:** character, onCharacterUpdate

**Sub-Components:**
- `Section` -- Accordion section with icon, title, count badge, expand/collapse
- `PartyMemberForm` -- 2-column grid form: name, class, race, relationship, personality. Add/Save/Cancel buttons
- `NPCForm` -- 2-column grid form: name, role, notes. Add/Save/Cancel buttons

**State:** campaign, openSections (6 keys), newPartyMember, showPartyForm, editingPartyIdx, newNPC, showNPCForm, editingNPCIdx, newSession, showSessionForm, deletePartyIdx, deleteNPCIdx, deleteSessionId, saveTimerRef

**Auto-save:** Debounced save to localStorage (600ms)
**Auto-create:** Creates new campaign if character has no campaignId

**6 Accordion Sections:**
1. **Campaign Basics** -- Name + Setting inputs
2. **World Details** -- Freeform worldDetails textarea
3. **Current Quest** -- Active quest/objective textarea
4. **Party Members** -- CRUD with inline edit/delete, PartyMemberForm, delete confirmation dialog
5. **Notable NPCs** -- CRUD with inline edit/delete, NPCForm, delete confirmation. Role badge (eldritch)
6. **Session Notes** -- Add with date+summary, delete confirmation, newest-first ordering, capped at 20 entries

---

## 13. localStorage KEYS

| Key Pattern | Purpose |
|-------------|---------|
| `codex-character-ids` | Array of all character IDs |
| `codex-character-${id}` | Individual character data |
| `codex-active-character` | Currently active character ID |
| `codex-combat-${charId}` | Persisted combat state |
| `codex-damage-${charId}` | Damage log history |
| `codex-ai-config` | AI provider configuration |
| `codex-campaign-${id}` | Campaign data |
| `codex-training-${charId}` | Training profile (XP, quiz history, flashcards) |
| `codex-identities-${charId}` | Identity profiles (future feature) |

---

## 14. AI INTERACTIONS SUMMARY

The app makes AI calls in these contexts:

| Feature | Prompt Function | AI Hook | Response Type |
|---------|----------------|---------|---------------|
| Combat Advisor | `combatAdvisor()` | Single useAI | Free text |
| Spell Explain | `spellExplainer()` | Single useAI | Free text |
| Spell Tactics | `spellTactician()` | Single useAI | Free text |
| Character Setup | `characterSetup` | Single useAI | JSON (spells, features, slots) |
| Quiz Generation | `quizMaster()` | Single useAI | JSON (question, options, answer) |
| Scene Generation | `sceneGenerator()` | sceneGenAI | Free text |
| Scene Grading | `sceneResponseGrader()` | sceneGradeAI | JSON (5 scores, strengths, improvements) |
| Reference Reaction | `sceneReferenceReaction()` | sceneRefAI | Free text |
| Improv Scene | `sceneCoach()` or `backstoryDrill()` | sceneAI | Free text |
| Improv Grading | `improvGrader()` | gradeAI | JSON (score, strengths, improvements) |
| Conversation NPC | `conversationDrill()` | conversationAI | JSON (npcReply, coaching) |
| Conversation Summary | `conversationSummary()` | summaryAI | JSON (overallScore, bestMoment, tip) |
| Interactive One-Shot | `interactiveOneShot()` | ai | JSON (narration, coaching, options) |
| Persona Suggest | `personaBuilder()` | suggestAI | JSON (traits) |
| Backstory Generate | `backstoryHelper()` | useAI | JSON (origin, memories, relationships) |
| Dialogue Suggest | `dialogueSuggestion()` | suggestAI | JSON (lines[]) |
| Dialogue Practice | `dialoguePractice()` | practiceAI | JSON (scenario, idealTone) |
| Dialogue Evaluate | `dialogueEvaluate()` | practiceAI | JSON (score, fit, voiceMatch) |
| Quick-Draw Scenario | `dialogueQuickDraw()` | quickDrawAI | JSON (prompt) |
| Quick-Draw Eval | `dialogueQuickDrawEval()` | quickDrawAI | JSON (3 scores, note) |
| Delivery Coach | `dialogueDeliveryCoach()` | deliveryAI | JSON (6 coaching fields) |
| Condition Quiz | `conditionDrillGenerator()` | useAI | JSON (scenario, question, answers) |
| Accent Phrases | `accentPhraseGenerator()` | useAI | JSON (phrases[]) |

---

## 15. KEYBOARD SHORTCUTS

| Context | Shortcut | Action |
|---------|----------|--------|
| AI Combat Advisor | Enter | Submit query |
| Spellbook Search | Any key | Debounced search (250ms) |
| AI Modal (Spellbook) | Escape | Close modal |
| Dice Roller | Enter | Roll dice |
| Dialogue Bank (Library) | Enter (no Shift) | Add new line |
| Dialogue Bank (Quick-Draw) | Enter | Submit response |
| Conversation Drill | Enter | Send message |
| Conversation Drill | Shift+Enter | Newline |
| Interactive One-Shot | Enter | Submit freeform response |
| Quiz Arena (Open-ended) | Enter | Submit answer |
| Paladin Resource (Custom) | Enter | Expend custom LoH amount |
| EditableList (PersonaEngine) | Enter | Add item |
| Mechanics Drawer | Escape | Close drawer |

---

## 16. ACCESSIBILITY FEATURES

- All interactive elements have `min-h-[44px]` (touch target compliance)
- `aria-label` on all icon-only buttons
- `aria-expanded` on collapsible sections
- `aria-pressed` on toggle buttons (filters, conditions)
- `aria-modal="true"` + `role="dialog"` on modals
- `aria-hidden` on all decorative icons and dividers
- `aria-invalid` + `aria-describedby` on error inputs
- `role="alert"` on error messages
- `role="tablist"` + `role="tab"` + `aria-selected` on tab navigation
- `role="list"` + `role="listitem"` on spell list
- `focus-visible:outline-2 focus-visible:outline-gold` on all interactive elements
- Screen reader labels for spell slot levels (ordinal: "1st", "2nd", etc.)
- `select-none` on labels to prevent accidental selection

---

## 17. ANIMATIONS & TRANSITIONS

- **Page transitions:** Framer Motion `opacity + y` with `ease: [0.22, 1, 0.36, 1]`
- **Stagger animations:** `staggerChildren: 0.06` for combat layout blocks
- **Button press:** `active:scale-[0.97]` or `active:scale-[0.95]` or `active:scale-[0.92]`
- **Framer Motion whileTap:** `scale: 0.97` on start combat button
- **CSS animations:** `animate-fade-in` (opacity 300ms), `animate-slide-up` (y + opacity 300ms), `animate-pulse-gold` (box-shadow pulse)
- **Transition easing:** `ease-snap` = `cubic-bezier(0.22, 1, 0.36, 1)`
- **Duration defaults:** 200ms for interactions, 300ms for state changes, 500ms for progress bars
- **Reduced motion:** `useReducedMotion()` hook respects `prefers-reduced-motion`
- **AnimatePresence:** Used for DiceRoller modal enter/exit
- **Conditional class:** `animate-pulse` on Quick-Draw timer when <= 3s

---

## 18. FILE MANIFEST (ALL SOURCE FILES)

```
src/
  main.tsx                          (7 lines)
  App.tsx                           (~200 lines)
  index.css                         (~300 lines)
  fonts/fonts.css                   (61 lines)
  lib/
    cn.ts                           (4 lines)
    character.ts                    (~400 lines)
    combat-state.ts                 (~150 lines)
    damage-log.ts                   (~80 lines)
    dice.ts                         (~80 lines)
    dnd-data.ts                     (~300 lines)
    dnd-rules.ts                    (~400 lines)
    ai.ts                           (~120 lines)
    prompts.ts                      (771 lines)
    campaign.ts                     (~100 lines)
    identity.ts                     (~60 lines)
    mechanics-reference.ts          (~200 lines)
    training.ts                     (~200 lines)
    accent-data.ts                  (~300 lines)
    motion-utils.ts                 (~40 lines)
  hooks/
    useAI.ts                        (~60 lines)
    useCharacter.ts                 (~100 lines)
    useTraining.ts                  (~80 lines)
  components/
    Layout.tsx                      (~200 lines)
    CharacterSetup.tsx              (~400 lines)
    CharacterSheet.tsx              (~500 lines)
    Settings.tsx                    (~200 lines)
    CombatHelper.tsx                (1289 lines)
    Spellbook.tsx                   (1223 lines)
    SpellEditor.tsx                 (557 lines)
    IdentityPage.tsx                (115 lines)
    PersonaEngine.tsx               (~500 lines)
    BackstoryBuilder.tsx            (~400 lines)
    DialogueBank.tsx                (1242 lines)
    SceneResponseBank.tsx           (300 lines)
    AccentCoach.tsx                 (~300 lines)
    IdentityManager.tsx             (~50 lines)
    AcademyPage.tsx                 (145 lines)
    TrainingProgress.tsx            (218 lines)
    TrainingHub.tsx                 (482 lines)
    QuizArena.tsx                   (596 lines)
    ConditionDrill.tsx              (379 lines)
    SpacedFlashcards.tsx            (357 lines)
    RoleplayCoach.tsx               (758 lines)
    ImprovDrillEnhanced.tsx         (592 lines)
    InteractiveOneShot.tsx          (685 lines)
    ConversationDrill.tsx           (764 lines)
    CampaignEditor.tsx              (833 lines)
    DiceRoller.tsx                  (~200 lines)
    DiceAnimation.tsx               (~100 lines)
    DamageTracker.tsx               (~150 lines)
    HPTracker.tsx                   (~150 lines)
    ActionMenu.tsx                  (~300 lines)
    ConditionReminder.tsx           (~100 lines)
    MechanicsDrawer.tsx             (~200 lines)
    InlineExplainer.tsx             (~80 lines)
    ui/
      Badge.tsx                     (~40 lines)
      Button.tsx                    (~80 lines)
      GlassCard.tsx                 (~20 lines)
      HexFrame.tsx                  (~40 lines)
      Input.tsx                     (93 lines)
      Select.tsx                    (85 lines)
      OrnateHeader.tsx              (45 lines)
      ParchmentCard.tsx             (32 lines)
      index.ts                      (barrel export)
    combat/
      CharacterCard.tsx             (140 lines)
      CharacterHero.tsx             (84 lines)
      VitalsRow.tsx                 (168 lines)
      CombatActionRow.tsx           (55 lines)
      StatusRow.tsx                 (137 lines)
      StatsBar.tsx                  (564 lines)
      ActionEconomyStrip.tsx        (210 lines)
      SpellSlotSigils.tsx           (287 lines)
      SpellSlotPips.tsx             (97 lines)
      ConditionsGrid.tsx            (125 lines)
      InitiativeTracker.tsx         (332 lines)
      InlineDiceSection.tsx         (240 lines)
      SmartActionsGrid.tsx          (147 lines)
      RestManagement.tsx            (200 lines)
      CodexHeader.tsx               (145 lines)
      Block1Skeleton.tsx            (30 lines)
      Block1Empty.tsx               (27 lines)
```

**Total: 24,273 lines across ~70 source files**

---

This completes the exhaustive inventory of The Codex application. Every exported function, component, prop, interface, state variable, handler, conditional render, computation, AI prompt template, localStorage key, D&D data constant, animation, keyboard shortcut, and accessibility attribute has been documented.