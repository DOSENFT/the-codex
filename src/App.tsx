import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING_SETTLE } from './lib/motion-utils'
import { useCharacter } from './hooks/useCharacter'
import { Layout, type TabId, type AppMode } from './components/Layout'
import { CombatHelper } from './components/CombatHelper'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SaveAlarm } from './components/SaveAlarm'
import type { Character } from './lib/character'

/* ── The cold path is one screen ─────────────────────────────────────────────
   TABLE-READY S-1 budgets 2000ms from a dead origin at 4x CPU to the moment his
   name is painted, and this was measuring 3115ms. The cause was not slow code;
   it was that the launch parsed all of it. Every surface below was a static
   import, so booting into play/Combat also paid for the Academy (which pulls
   the 2329-line DialogueBank and four drills), the 2095-line CharacterPage,
   Settings, the Spellbook and the print record: a 1056kB entry chunk to render
   one screen.

   CombatHelper stays eager and stays above this comment, because it IS the cold
   path — he opens the app in combat. Everything else is fetched when he first
   goes there, and sw.js precaches `assets/*`, so "when he first goes there" is
   a read from local cache even with the origin dead. S-2 (tab switch <=400ms)
   and N-2 (every screen offline) are the two criteria that would catch this
   trade going wrong, and they are both graded on every run.

   The fallback is `null`, deliberately. A spinner would be a new visible state
   in an app whose behaviour is sealed; nothing here should announce that a
   boundary exists. From precache these resolve inside a frame or two. */
const CharacterSetup  = lazy(() => import('./components/CharacterSetup').then(m => ({ default: m.CharacterSetup })))
const Spellbook       = lazy(() => import('./components/Spellbook').then(m => ({ default: m.Spellbook })))
const GrimoirePage    = lazy(() => import('./components/GrimoirePage').then(m => ({ default: m.GrimoirePage })))
const IdentityPage    = lazy(() => import('./components/IdentityPage').then(m => ({ default: m.IdentityPage })))
const AcademyPage     = lazy(() => import('./components/AcademyPage').then(m => ({ default: m.AcademyPage })))
const Settings        = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })))
const SessionCockpit  = lazy(() => import('./components/session').then(m => ({ default: m.SessionCockpit })))
const CharacterPage   = lazy(() => import('./components/CharacterPage').then(m => ({ default: m.CharacterPage })))
const TurnLive        = lazy(() => import('./components/turn/TurnLive').then(m => ({ default: m.TurnLive })))
const CharacterRecord = lazy(() => import('./components/print/CharacterRecord').then(m => ({ default: m.CharacterRecord })))

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
    saveError,
    dismissSaveError,
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
      <>
        <ErrorBoundary surface="Character setup">
          <Suspense fallback={null}>
          <CharacterSetup
            onComplete={createCharacter}
            roster={roster}
            onSelectCharacter={switchCharacter}
          />
          </Suspense>
        </ErrorBoundary>
        <SaveAlarm reason={saveError} onDismiss={dismissSaveError} />
      </>
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
      <>
        <ErrorBoundary surface="Turn (preview)">
          <Suspense fallback={null}>
            <TurnLive character={character} onCharacterUpdate={setCharacter} />
          </Suspense>
        </ErrorBoundary>
        <Suspense fallback={null}><CharacterRecord character={character} /></Suspense>
        <SaveAlarm reason={saveError} onDismiss={dismissSaveError} />
      </>
    )
  }

  const handleCharacterUpdate = (updated: Character) => {
    setCharacter(updated)
  }

  return (
    <>
    {/* Slice 14 — the paper fallback, and it is OUTSIDE <Layout> on purpose.
        Inside it, the print stylesheet's "hide the app shell" rule would hide
        the record along with everything else. Out here it is a sibling of the
        shell, so Ctrl+P from any tab prints the whole character rather than
        whichever tab happened to be mounted. See design/print.css. */}
    <Suspense fallback={null}><CharacterRecord character={character} /></Suspense>
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
          others. Combat in particular must survive anything else failing.

          One Suspense for all of them, not one each: exactly one surface is
          mounted at a time, so nine boundaries would be nine ways to write the
          same thing. It sits INSIDE the ErrorBoundaries' scope rather than
          outside, because a chunk that fails to load is an error and should
          reach the surface's own boundary, not blank the shell. */}
      <Suspense fallback={null}>
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
      </Suspense>
      </motion.div>
    </Layout>
    {/* Outside <Layout> on purpose, like CharacterRecord: a write that did not
        happen must be visible on every tab, in every mode, and must not be a
        child of the surface whose error boundary might be what caught it. */}
    <SaveAlarm reason={saveError} onDismiss={dismissSaveError} />
    </>
  )
}
