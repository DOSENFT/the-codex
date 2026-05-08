import { type ReactNode, useState, useEffect } from 'react'
import { Swords, BookOpen, Theater, GraduationCap, Settings, Dices, ChevronDown, Users, HelpCircle } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character, RosterEntry } from '../lib/character'
import { Badge } from './ui/Badge'
import { DiceRoller } from './DiceRoller'
import { CharacterSheet } from './CharacterSheet'
import { MechanicsDrawer } from './MechanicsDrawer'

export type TabId = 'combat' | 'spells' | 'identity' | 'academy' | 'settings'

interface LayoutProps {
  children: ReactNode
  character: Character
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  roster: RosterEntry[]
  onSwitchCharacter: (id: string) => void
  onUpdateCharacter: (char: Character) => void
  dicePrefill?: { notation: string; label: string } | null
  onClearDicePrefill?: () => void
}

const TABS: { id: TabId; label: string; icon: typeof Swords }[] = [
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'identity', label: 'Identity', icon: Theater },
  { id: 'academy', label: 'Academy', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const TAB_LABELS: Record<TabId, string> = {
  combat: 'Combat',
  spells: 'Spellbook',
  identity: 'Identity',
  academy: 'Academy',
  settings: 'Settings',
}

/**
 * App shell with a fixed header, scrollable main content area, and fixed
 * bottom tab navigation. Grand centered header with character info and
 * ornate bottom nav with circular icon frames.
 */
export function Layout({ children, character, activeTab, onTabChange, roster, onSwitchCharacter, onUpdateCharacter, dicePrefill, onClearDicePrefill }: LayoutProps) {
  const [diceOpen, setDiceOpen] = useState(false)

  // Auto-open dice roller when a prefill is provided
  useEffect(() => {
    if (dicePrefill) {
      setDiceOpen(true)
    }
  }, [dicePrefill])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mechanicsOpen, setMechanicsOpen] = useState(false)

  const hpPercent = character.hitPoints.max > 0
    ? (character.hitPoints.current / character.hitPoints.max) * 100
    : 0

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-void-0">
      {/* ─── Fixed Header ─── */}
      <header className="fixed top-0 inset-x-0 z-40 flex flex-col items-center bg-void-0/95 border-b border-gold/15">
        {/* Top row: hamburger, title, character info */}
        <div className="w-full h-14 flex items-center justify-between px-4">
          <button
            onClick={() => setMechanicsOpen(true)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-xl text-forge-2 hover:text-gold hover:bg-gold/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
            aria-label="Open mechanics reference"
          >
            <HelpCircle size={18} aria-hidden />
          </button>

          {/* Center: THE CODEX title */}
          <div className="flex flex-col items-center">
            <h1 className="font-display text-lg font-bold text-forge-0 tracking-[0.15em] uppercase">
              The Codex
            </h1>
          </div>

          {/* Right: character info */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Open character sheet"
            >
              <span className="text-sm text-forge-1 truncate max-w-[100px]">
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
        </div>

        {/* Sub row: page title + HP */}
        <div className="w-full flex items-center justify-center gap-3 pb-2 px-4">
          <div
            className="flex-1 h-px opacity-30"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold))' }}
            aria-hidden
          />
          <span className="font-display text-xs tracking-[0.2em] uppercase text-gold/80">
            {TAB_LABELS[activeTab]}
          </span>
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
              <span className="text-gold ml-1">+{character.tempHP}</span>
            )}
          </span>
          <div
            className="flex-1 h-px opacity-30"
            style={{ background: 'linear-gradient(90deg, var(--color-gold), transparent)' }}
            aria-hidden
          />
        </div>
      </header>

      {/* Character Switcher Dropdown */}
      {switcherOpen && roster.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-[45]"
            onClick={() => setSwitcherOpen(false)}
            aria-hidden
          />
          <div className="fixed top-[4.5rem] right-4 z-50 w-64 p-2 rounded-xl bg-void-1/95 backdrop-blur-lg border border-gold/15 shadow-xl animate-fade-in">
            {roster.filter(e => e.id !== character.id).map((entry) => (
              <button
                key={entry.id}
                onClick={() => { onSwitchCharacter(entry.id); setSwitcherOpen(false) }}
                className={cn(
                  'flex items-center justify-between w-full min-h-[48px] px-3 py-2 rounded-lg text-left',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-gold/[0.06]',
                  'active:scale-[0.98]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
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
          </div>
        </>
      )}

      {/* ─── Scrollable Content Area ─── */}
      <main className="flex-1 overflow-y-auto pt-[5.5rem] pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        <div className={cn('px-4 py-4 min-h-full', `atmospheric-bg-${activeTab}`)}>
          {children}
        </div>
      </main>

      {/* ─── Floating Dice Button ─── */}
      <button
        onClick={() => setDiceOpen(true)}
        className={cn(
          'fixed z-50 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
          'w-14 h-14 rounded-2xl',
          'bg-gradient-to-br from-gold to-arcane text-void-0 shadow-lg shadow-gold/20',
          'flex items-center justify-center',
          'transition-all duration-200 ease-forge',
          'hover:shadow-gold/35 hover:scale-105',
          'active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
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

      {/* ─── Fixed Bottom Tab Navigation ─── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-void-0/95 border-t border-gold/15 safe-bottom"
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch h-[4.5rem]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => onTabChange(id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1',
                  'min-h-[48px] select-none',
                  'transition-all duration-200 ease-forge',
                  'active:scale-95',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'border transition-all duration-200',
                    isActive
                      ? 'border-gold/50 bg-gold/10 text-gold shadow-[0_0_12px_-2px_rgba(197,165,90,0.3)]'
                      : 'border-bronze/20 bg-transparent text-forge-2 hover:text-forge-1 hover:border-bronze/35',
                  )}
                >
                  <Icon size={18} aria-hidden />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none',
                    isActive ? 'text-gold' : 'text-forge-2',
                  )}
                >
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
