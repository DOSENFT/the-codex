import { useState, useCallback, useEffect } from 'react'
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
    </Layout>
  )
}
