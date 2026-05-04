import { useState } from 'react'
import { useCharacter } from './hooks/useCharacter'
import { Layout, type TabId } from './components/Layout'
import { CharacterSetup } from './components/CharacterSetup'
import { CombatHelper } from './components/CombatHelper'
import { Spellbook } from './components/Spellbook'
import { TrainingHub } from './components/TrainingHub'
import { Settings } from './components/Settings'
import type { Character } from './lib/character'

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

  const [activeTab, setActiveTab] = useState<TabId>('combat')

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
      roster={roster}
      onSwitchCharacter={switchCharacter}
    >
      {activeTab === 'combat' && (
        <CombatHelper
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
        />
      )}
      {activeTab === 'spells' && (
        <Spellbook
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
        />
      )}
      {activeTab === 'train' && (
        <TrainingHub character={character} />
      )}
      {activeTab === 'settings' && (
        <Settings
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
          onResetCharacter={resetCharacter}
          roster={roster}
          onSwitchCharacter={switchCharacter}
          onCreateNew={clearActive}
        />
      )}
    </Layout>
  )
}
