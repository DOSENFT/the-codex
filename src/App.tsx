import { useState, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING_SETTLE } from './lib/motion-utils'
import { useCharacter } from './hooks/useCharacter'
import { Layout, type TabId, type AppMode } from './components/Layout'
import { CharacterSetup } from './components/CharacterSetup'
import { CombatHelper } from './components/CombatHelper'
import { Spellbook } from './components/Spellbook'
import { GrimoirePage } from './components/GrimoirePage'
import { IdentityPage } from './components/IdentityPage'
import { AcademyPage } from './components/AcademyPage'
import { Settings } from './components/Settings'
import { SessionCockpit } from './components/session'
import { CharacterPage } from './components/CharacterPage'
import type { Character } from './lib/character'

const MODE_STORAGE_KEY = 'codex-app-mode'

function loadMode(): AppMode {
  const saved = localStorage.getItem(MODE_STORAGE_KEY)
  return saved === 'prep' ? 'prep' : 'session'
}

const SESSION_DEFAULT_TAB: TabId = 'combat'
const PREP_DEFAULT_TAB: TabId = 'character'

/* Tab order per mode — page transitions slide from the direction of travel
   so navigation reads as movement through one continuous space */
const TAB_ORDER: Record<AppMode, TabId[]> = {
  session: ['combat', 'grimoire', 'roleplay'],
  prep: ['character', 'grimoire', 'persona', 'academy'],
}

export default function App() {
  const {
    character,
    roster,
    ready,
    setCharacter,
    createCharacter,
    switchCharacter,
    clearActive,
    resetCharacter,
    useSlot,
    restoreSlot,
    doLongRest,
    doShortRest,
    togglePrepared,
  } = useCharacter()

  const [appMode, setAppMode] = useState<AppMode>(loadMode)
  const [activeTab, setActiveTab] = useState<TabId>(appMode === 'session' ? SESSION_DEFAULT_TAB : PREP_DEFAULT_TAB)
  const [dicePrefill, setDicePrefill] = useState<{ notation: string; label: string } | null>(null)

  const reducedMotion = useReducedMotion()
  const prevView = useRef<{ mode: AppMode; tab: TabId } | null>(null)
  const prev = prevView.current
  const modeChanged = prev !== null && prev.mode !== appMode
  const travelDir = prev && !modeChanged
    ? Math.sign(TAB_ORDER[appMode].indexOf(activeTab) - TAB_ORDER[appMode].indexOf(prev.tab))
    : 0
  prevView.current = { mode: appMode, tab: activeTab }

  const pageEnter = reducedMotion
    ? { opacity: 0 }
    : modeChanged
      ? { opacity: 0, y: 14, scale: 0.99 }
      : { opacity: 0, x: travelDir * 24, y: travelDir === 0 ? 8 : 0 }

  // Persist mode changes
  const handleModeChange = useCallback((mode: AppMode) => {
    setAppMode(mode)
    localStorage.setItem(MODE_STORAGE_KEY, mode)
    setActiveTab(mode === 'session' ? SESSION_DEFAULT_TAB : PREP_DEFAULT_TAB)
  }, [])

  // Don't render until boot sequence completes (migration + roster load)
  if (!ready) return null

  // No active character → show setup/selector
  if (!character) {
    return (
      <CharacterSetup
        onComplete={createCharacter}
        roster={roster}
        onSelectCharacter={switchCharacter}
      />
    )
  }

  const handleCharacterUpdate = (updated: Character) => {
    setCharacter(updated)
  }

  return (
    <Layout
      character={character}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      appMode={appMode}
      onModeChange={handleModeChange}
      roster={roster}
      onSwitchCharacter={switchCharacter}
      onUpdateCharacter={handleCharacterUpdate}
      onResetCharacter={resetCharacter}
      onCreateNew={clearActive}
      dicePrefill={dicePrefill}
      onClearDicePrefill={() => setDicePrefill(null)}
      onRequestDice={setDicePrefill}
    >
      <motion.div
        key={`${appMode}:${activeTab}`}
        initial={pageEnter}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={SPRING_SETTLE}
      >
      {/* ─── Session Mode Tabs ─── */}
      {appMode === 'session' && activeTab === 'combat' && (
        <CombatHelper
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
          onOpenDiceRoller={setDicePrefill}
        />
      )}
      {appMode === 'session' && activeTab === 'grimoire' && (
        <GrimoirePage
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
          mode="session"
          onOpenDiceRoller={setDicePrefill}
        />
      )}
      {appMode === 'session' && activeTab === 'roleplay' && (
        <SessionCockpit
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
        />
      )}

      {/* ─── Prep Mode Tabs ─── */}
      {appMode === 'prep' && activeTab === 'character' && (
        <CharacterPage
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
        />
      )}
      {appMode === 'prep' && activeTab === 'grimoire' && (
        <GrimoirePage
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
          mode="prep"
          onOpenDiceRoller={setDicePrefill}
        />
      )}
      {appMode === 'prep' && activeTab === 'persona' && (
        <IdentityPage character={character} onCharacterUpdate={handleCharacterUpdate} />
      )}
      {appMode === 'prep' && activeTab === 'academy' && (
        <AcademyPage character={character} onCharacterUpdate={handleCharacterUpdate} />
      )}
      </motion.div>
    </Layout>
  )
}
