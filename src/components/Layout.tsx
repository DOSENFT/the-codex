import { type ReactNode, useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Swords, BookOpen, Theater, GraduationCap, Settings as SettingsIcon, Dices, ChevronDown, Users, HelpCircle, Puzzle, User, Flame, Compass } from 'lucide-react'
import { cn } from '../lib/cn'
import { SPRING_SNAP } from '../lib/motion-utils'
import { Sheet } from './ui/Sheet'
import type { Character, RosterEntry } from '../lib/character'
import { Badge } from './ui/Badge'
import { DiceRoller } from './DiceRoller'
import { CharacterSheet } from './CharacterSheet'
import { MechanicsDrawer } from './MechanicsDrawer'
import { ToyboxPanel } from './ToyboxPanel'
import { Settings } from './Settings'

export type AppMode = 'session' | 'prep'
export type TabId = 'combat' | 'grimoire' | 'roleplay' | 'character' | 'persona' | 'academy'

interface LayoutProps {
  children: ReactNode
  character: Character
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  appMode: AppMode
  onModeChange: (mode: AppMode) => void
  roster: RosterEntry[]
  onSwitchCharacter: (id: string) => void
  onUpdateCharacter: (char: Character) => void
  onResetCharacter: () => void
  onCreateNew: () => void
  dicePrefill?: { notation: string; label: string } | null
  onClearDicePrefill?: () => void
  onRequestDice?: (prefill: { notation: string; label: string }) => void
}

interface TabDef { id: TabId; label: string; icon: typeof Swords }

const SESSION_TABS: TabDef[] = [
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'grimoire', label: 'Grimoire', icon: BookOpen },
  { id: 'roleplay', label: 'Roleplay', icon: Theater },
]

const PREP_TABS: TabDef[] = [
  { id: 'character', label: 'Character', icon: User },
  { id: 'grimoire', label: 'Grimoire', icon: BookOpen },
  { id: 'persona', label: 'Persona', icon: Theater },
  { id: 'academy', label: 'Academy', icon: GraduationCap },
]

export function Layout({
  children,
  character,
  activeTab,
  onTabChange,
  appMode,
  onModeChange,
  roster,
  onSwitchCharacter,
  onUpdateCharacter,
  onResetCharacter,
  onCreateNew,
  dicePrefill,
  onClearDicePrefill,
  onRequestDice,
}: LayoutProps) {
  const [diceOpen, setDiceOpen] = useState(false)
  const [toyboxOpen, setToyboxOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Auto-open dice roller when a prefill is provided
  useEffect(() => {
    if (dicePrefill) {
      setDiceOpen(true)
    }
  }, [dicePrefill])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mechanicsOpen, setMechanicsOpen] = useState(false)

  // Each surface opens at its own top — never inherit another tab's scroll position
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeTab, appMode])

  const hpPercent = character.hitPoints.max > 0
    ? (character.hitPoints.current / character.hitPoints.max) * 100
    : 0

  const tabs = appMode === 'session' ? SESSION_TABS : PREP_TABS

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-void-0">
      {/* ─── Fixed Header ─── */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-3 bg-void-0/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          {/* h-11 (44px), not h-8. This is the most-pressed control in the app —
              it switches the whole machine between play and prep — and it was
              30px tall, which is under even WCAG 2.2 AA's 24px floor once you
              account for the icon eating the middle. The header is h-14 (56px),
              so this grows honestly rather than faking a hit area the way the
              spell pips have to. */}
          <div className="flex rounded-lg overflow-hidden border border-white/10 h-[46px]">
            <button
              type="button"
              onClick={() => onModeChange('session')}
              className={cn(
                'px-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider',
                'flex items-center gap-1',
                'transition-all duration-200 ease-forge',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                appMode === 'session'
                  ? 'bg-ember/15 text-ember'
                  : 'bg-white/[0.02] text-forge-2 hover:text-forge-1',
              )}
              aria-label="Switch to session mode"
            >
              <Flame size={12} aria-hidden />
              Play
            </button>
            <button
              type="button"
              onClick={() => onModeChange('prep')}
              className={cn(
                'px-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider',
                'flex items-center gap-1',
                'transition-all duration-200 ease-forge',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                appMode === 'prep'
                  ? 'bg-arcane/15 text-arcane'
                  : 'bg-white/[0.02] text-forge-2 hover:text-forge-1',
              )}
              aria-label="Switch to prep mode"
            >
              <Compass size={12} aria-hidden />
              Prep
            </button>
          </div>

          {/* Persistent HP display */}
          <span
            className={cn(
              'text-xs font-mono font-medium px-2 py-0.5 rounded-md border',
              hpPercent > 75 && 'text-verdant border-verdant/20 bg-verdant/8',
              hpPercent > 25 && hpPercent <= 75 && 'text-ember border-ember/20 bg-ember/8',
              hpPercent <= 25 && hpPercent > 0 && 'text-red-400 border-red-400/20 bg-red-400/8',
              hpPercent === 0 && 'text-red-400 border-red-400/30 bg-red-400/10 animate-pulse',
            )}
            aria-label={`Hit points: ${character.hitPoints.current} of ${character.hitPoints.max}`}
          >
            {character.hitPoints.current}/{character.hitPoints.max}
            {character.tempHP > 0 && (
              <span className="text-arcane ml-1">+{character.tempHP}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-xl text-forge-2 hover:text-forge-1 hover:bg-white/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Open settings"
          >
            <SettingsIcon size={18} aria-hidden />
          </button>
          <button
            onClick={() => setToyboxOpen(true)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-xl text-forge-2 hover:text-ember hover:bg-white/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Open The Toybox"
          >
            <Puzzle size={18} aria-hidden />
          </button>
          <button
            onClick={() => setMechanicsOpen(true)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-xl text-forge-2 hover:text-arcane hover:bg-white/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Open mechanics reference"
          >
            <HelpCircle size={18} aria-hidden />
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 min-h-[44px] cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Open character sheet"
          >
            <span className="text-sm text-forge-1 truncate max-w-[80px]">
              {character.name}
            </span>
            <Badge variant="eldritch">
              {character.class}
            </Badge>
          </button>
          {roster.length > 1 && (
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-forge-2 hover:text-forge-1 transition-colors"
              aria-label="Switch character"
            >
              <ChevronDown size={14} className={cn('transition-transform duration-200', switcherOpen && 'rotate-180')} aria-hidden />
            </button>
          )}
        </div>
      </header>

      {/* Character Switcher Dropdown */}
      <AnimatePresence>
      {switcherOpen && roster.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-[45]"
            onClick={() => setSwitcherOpen(false)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.14 } }}
            transition={SPRING_SNAP}
            className="fixed top-14 right-4 z-50 w-64 p-2 rounded-xl bg-void-1/95 backdrop-blur-lg border border-white/[0.08] shadow-xl origin-top-right">
            {roster.filter(e => e.id !== character.id).map((entry) => (
              <button
                key={entry.id}
                onClick={() => { onSwitchCharacter(entry.id); setSwitcherOpen(false) }}
                className={cn(
                  'flex items-center justify-between w-full min-h-[48px] px-3 py-2 rounded-lg text-left',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.06]',
                  'active:scale-[0.98]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-forge-0">{entry.name}</span>
                  <span className="text-xs text-forge-2">
                    {entry.class}{entry.subclass ? ` · ${entry.subclass}` : ''} · Lvl {entry.level}
                  </span>
                </div>
                <Users size={14} className="text-forge-2 shrink-0" aria-hidden />
              </button>
            ))}
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* ─── Scrollable Content Area ───
           The bottom padding is the space the fixed tab bar occupies, and it has
           to be at least as tall as the bar actually is. It was 4rem = 64px; the
           bar measures 65. One pixel, and the last control on the longest screen
           (Roleplay, scrolled to the end) sat under it with nowhere left to
           scroll — TABLE-READY V-6b, which exists for exactly this and found
           exactly this. 5rem is not a tighter guess, it is deliberate slack: the
           next change to the tab bar should not be able to silently re-bury the
           last thing on the page. */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pt-14 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pl-52 lg:pb-8">
        <div className="px-4 py-4 mx-auto w-full max-w-3xl lg:px-8 lg:py-6">
          {children}
        </div>
      </main>

      {/* ─── Floating Dice Button ─── */}
      <button
        onClick={() => setDiceOpen(true)}
        className={cn(
          'fixed z-50 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:right-8 lg:bottom-8',
          'w-14 h-14 rounded-2xl',
          'bg-eldritch/90 text-white shadow-lg shadow-eldritch/25',
          'flex items-center justify-center',
          'transition-all duration-200 ease-forge',
          'hover:bg-eldritch hover:shadow-eldritch/40 hover:scale-105',
          'active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
        aria-label="Open dice roller"
      >
        <Dices size={24} aria-hidden />
      </button>

      {/* ─── Dice Roller Panel ─── */}
      <DiceRoller
        isOpen={diceOpen}
        onClose={() => { setDiceOpen(false); onClearDicePrefill?.() }}
        character={character}
        prefill={dicePrefill}
      />

      {/* ─── Character Sheet Panel ─── */}
      <CharacterSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} character={character} onUpdate={onUpdateCharacter} />

      {/* ─── Mechanics Drawer Panel ─── */}
      <MechanicsDrawer isOpen={mechanicsOpen} onClose={() => setMechanicsOpen(false)} />

      {/* ─── Toybox Panel ─── */}
      <ToyboxPanel
        isOpen={toyboxOpen}
        onClose={() => setToyboxOpen(false)}
        character={character}
        onOpenDice={onRequestDice}
      />

      {/* ─── Settings Drawer ─── */}
      <Sheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        label="Settings"
        side="right"
        z={55}
        backdropClassName="bg-void-0/60 backdrop-blur-sm"
      >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] sticky top-0 bg-void-1/90 backdrop-blur-md z-10">
              <h2 className="font-display text-lg font-semibold text-forge-0">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center',
                  'rounded-xl text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
                  'transition-colors duration-200',
                  'active:scale-95',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                )}
                aria-label="Close settings"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <div className="p-4">
              <Settings
                character={character}
                onCharacterUpdate={onUpdateCharacter}
                onResetCharacter={onResetCharacter}
                roster={roster}
                onSwitchCharacter={onSwitchCharacter}
                onCreateNew={onCreateNew}
              />
            </div>
      </Sheet>

      {/* ─── Fixed Bottom Tab Navigation ─── */}
      <nav
        className={cn(
          'fixed bottom-0 inset-x-0 z-40 bg-void-0/90 backdrop-blur-md border-t border-white/[0.06] safe-bottom',
          // Desktop: the phone tab bar becomes a workshop rail
          'lg:inset-x-auto lg:left-0 lg:top-14 lg:w-52 lg:border-t-0 lg:border-r lg:border-white/[0.06]',
        )}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch h-16 lg:flex-col lg:h-auto lg:gap-1 lg:p-3">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => onTabChange(id)}
                className={cn(
                  'relative flex-1 flex flex-col items-center justify-center gap-0.5',
                  'min-h-[48px] select-none',
                  'transition-colors duration-200 ease-forge',
                  'active:scale-95',
                  'lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:min-h-[44px] lg:rounded-xl',
                  isActive
                    ? 'text-arcane lg:bg-gold/[0.08]'
                    : 'text-forge-2 hover:text-forge-1 lg:hover:bg-white/[0.04]',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-indicator"
                    className="absolute top-0 left-0 right-0 mx-auto h-[2px] w-10 rounded-full bg-arcane shadow-[0_0_12px_rgba(212,167,74,0.55)] lg:hidden"
                    transition={SPRING_SNAP}
                    aria-hidden
                  />
                )}
                <Icon size={20} aria-hidden />
                <span className="text-xs font-medium leading-none lg:text-sm">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
