import { useState, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING_SETTLE } from './lib/motion-utils'
import { useCharacter } from './hooks/useCharacter'
import { Layout, type TabId, type AppMode } from './components/Layout'
import { CombatHelper } from './components/CombatHelper'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SaveAlarm } from './components/SaveAlarm'
import type { Character } from './lib/character'
import { saveOrAnnounce } from './lib/character'

/* ── Every surface is a static import, and that is deliberate ────────────────
   These ten were briefly React.lazy(), to cut the 1056kB entry chunk down to
   466kB for S-1 (cold launch <=2000ms). It bought 119ms — 3115 to 2996 — on a
   criterion that still failed by a full second, and it cost this:

     offline, no service worker, tap PREP
     → "Character stopped. The rest of the app is still running."

   A chunk that cannot be fetched is a thrown promise, and a thrown promise
   reaches the surface's ErrorBoundary, which renders a calm notice where the
   screen should be. That is the failure this project has shipped three times
   and the reason TABLE-READY exists: a polite boundary instead of the thing,
   with the checks green. It cost D-7 too — his export button lives on that
   screen, and export is his only backup at the table.

   N-1 passes with the worker warm, so precache does cover the chunks. It does
   not cover the window before the worker installs, the case where he turned it
   off, or a cache the browser has evicted. The entry chunk is the only thing
   guaranteed to be in memory once the app has painted, so every screen he can
   reach lives in it. S-1's real cause is sw.js:132 — see TABLE-READY § 9.8.
   Reproduced by docs/plans/codex-v1/reference/table/_d7.mjs. */
import { CharacterSetup } from './components/CharacterSetup'
import { GrimoirePage } from './components/GrimoirePage'
import { IdentityPage } from './components/IdentityPage'
import { AcademyPage } from './components/AcademyPage'
import { SessionCockpit } from './components/session'
import { CharacterPage } from './components/CharacterPage'
import { TurnLive } from './components/turn/TurnLive'
import { CharacterRecord } from './components/print/CharacterRecord'

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
    // Guarded. Unguarded, this line threw on a full device and the
    // `setActiveTab` below it never ran: PLAY/PREP flipped but the default tab
    // did not follow, once per switch, with an uncaught QuotaExceededError each
    // time and nothing on screen to say so. Remembering which mode you were in
    // is a convenience; landing on the right tab is the navigation itself.
    saveOrAnnounce(MODE_STORAGE_KEY, mode)
    setActiveTab(mode === 'session' ? SESSION_DEFAULT_TAB : PREP_DEFAULT_TAB)
  }, [])

  // Don't render until boot sequence completes (migration + roster load)
  if (!ready) return null

  // No active character → show setup/selector
  if (!character) {
    return (
      <>
        <ErrorBoundary surface="Character setup">
          <CharacterSetup
            onComplete={createCharacter}
            roster={roster}
            onSelectCharacter={switchCharacter}
          />
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
          <TurnLive character={character} onCharacterUpdate={setCharacter} />
        </ErrorBoundary>
        <CharacterRecord character={character} />
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
    <CharacterRecord character={character} />
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
    {/* Outside <Layout> on purpose, like CharacterRecord: a write that did not
        happen must be visible on every tab, in every mode, and must not be a
        child of the surface whose error boundary might be what caught it. */}
    <SaveAlarm reason={saveError} onDismiss={dismissSaveError} />
    </>
  )
}
