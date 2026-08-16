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
import { ErrorBoundary } from './components/ErrorBoundary'
import { TurnLive } from './components/turn/TurnLive'
import type { Character } from './lib/character'

const MODE_STORAGE_KEY = 'codex-app-mode'

/* V1.0's new turn screen (direction D) rides behind ?d=1 until it is finished.
   The flag is read once at module load, not from state — it is a build-time
   switch in spirit, and nothing in the existing app should be able to observe
   that it exists. */
const D_PREVIEW =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('d') === '1'

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
      <ErrorBoundary surface="Character setup">
        <CharacterSetup
          onComplete={createCharacter}
          roster={roster}
          onSelectCharacter={switchCharacter}
        />
      </ErrorBoundary>
    )
  }

  /* Slice 1 wired this pipe with a fixture at the far end. Slice 4 removed the
     fixture: the real character and the real persisted encounter went into
     composeTurn, real rules came out, and the real component rendered them.
     Slice 6 closed the loop — the screen now WRITES. Taps spend real slots and
     real pool points through the one reducer, persist through the character's
     one existing owner, and undo by restoration.

     `setCharacter` is passed straight through: this provider deliberately has
     no save path of its own, because two writers to one localStorage key is
     the bug class V0.9 spent a year on. */
  if (D_PREVIEW) {
    return (
      <ErrorBoundary surface="Turn (preview)">
        <TurnLive character={character} onCharacterUpdate={setCharacter} />
      </ErrorBoundary>
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
      {/* One boundary per surface, so a crash in one cannot white-screen the
          others. Combat in particular must survive anything else failing. */}
      {appMode === 'session' && activeTab === 'combat' && (
        <ErrorBoundary surface="Combat">
          <CombatHelper
            character={character}
            onCharacterUpdate={handleCharacterUpdate}
            onOpenDiceRoller={setDicePrefill}
          />
        </ErrorBoundary>
      )}
      {appMode === 'session' && activeTab === 'grimoire' && (
        <ErrorBoundary surface="Grimoire">
          <GrimoirePage
            character={character}
            onCharacterUpdate={handleCharacterUpdate}
            mode="session"
            onOpenDiceRoller={setDicePrefill}
          />
        </ErrorBoundary>
      )}
      {appMode === 'session' && activeTab === 'roleplay' && (
        <ErrorBoundary surface="Roleplay">
          <SessionCockpit
            character={character}
            onCharacterUpdate={handleCharacterUpdate}
          />
        </ErrorBoundary>
      )}

      {/* ─── Prep Mode Tabs ─── */}
      {appMode === 'prep' && activeTab === 'character' && (
        <ErrorBoundary surface="Character">
          <CharacterPage
            character={character}
            onCharacterUpdate={handleCharacterUpdate}
          />
        </ErrorBoundary>
      )}
      {appMode === 'prep' && activeTab === 'grimoire' && (
        <ErrorBoundary surface="Grimoire">
          <GrimoirePage
            character={character}
            onCharacterUpdate={handleCharacterUpdate}
            mode="prep"
            onOpenDiceRoller={setDicePrefill}
          />
        </ErrorBoundary>
      )}
      {appMode === 'prep' && activeTab === 'persona' && (
        <ErrorBoundary surface="Identity">
          <IdentityPage character={character} onCharacterUpdate={handleCharacterUpdate} />
        </ErrorBoundary>
      )}
      {appMode === 'prep' && activeTab === 'academy' && (
        <ErrorBoundary surface="Academy">
          <AcademyPage character={character} onCharacterUpdate={handleCharacterUpdate} />
        </ErrorBoundary>
      )}
      </motion.div>
    </Layout>
  )
}
