import { useState, useCallback } from 'react'
import {
  Library,
  Zap,
  Hammer,
  GraduationCap,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import type { VoiceParams } from '../../lib/voice-forge'
import { AccentLibrary } from './AccentLibrary'
import { DMRapidMode } from './DMRapidMode'
import { AccentDetailView } from './AccentDetailView'
import { VoiceForge } from './VoiceForge'
import { VoiceForgePreview } from './VoiceForgePreview'
import { AccentTraining } from './AccentTraining'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccentForgeProps {
  character: Character
}

type TabId = 'library' | 'rapid' | 'forge' | 'train'

interface TabDef {
  id: TabId
  label: string
  icon: typeof Library
  disabled: boolean
  tooltip?: string
}

const TABS: TabDef[] = [
  { id: 'library', label: 'Library', icon: Library, disabled: false },
  { id: 'rapid', label: 'Rapid', icon: Zap, disabled: false },
  { id: 'forge', label: 'Forge', icon: Hammer, disabled: false },
  { id: 'train', label: 'Train', icon: GraduationCap, disabled: false },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * AccentForge — top-level container for the accent system.
 * Replaces the old AccentCoach with a tabbed interface:
 *   - Library: searchable/filterable accent browser
 *   - Rapid: DM quick-reference mode for live sessions
 *   - Forge: character voice builder with AI preview
 *   - Train: accent translator, scene partner, and technique drills
 *
 * Selected accent persists across tab switches so context is never lost.
 */
export function AccentForge({ character }: AccentForgeProps) {
  const [activeTab, setActiveTab] = useState<TabId>('library')
  const [selectedAccentId, setSelectedAccentId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Voice Forge state — persists across tab switches
  const [forgeParams, setForgeParams] = useState<VoiceParams | null>(null)
  const [forgeDescription, setForgeDescription] = useState<string>('')

  /* ------ Handlers ------ */

  const handleSelectAccent = useCallback((id: string) => {
    setSelectedAccentId(id)
    setShowDetail(true)
  }, [])

  const handleBackFromDetail = useCallback(() => {
    setShowDetail(false)
  }, [])

  const handleTabChange = useCallback((tabId: TabId) => {
    const tab = TABS.find((t) => t.id === tabId)
    if (tab?.disabled) return
    setActiveTab(tabId)
    // Close detail view when switching tabs — accent selection persists
    setShowDetail(false)
  }, [])

  const handleGenerate = useCallback((params: VoiceParams, description: string) => {
    setForgeParams(params)
    setForgeDescription(description)
  }, [])

  /* ------ Detail View Overlay ------ */

  if (showDetail && selectedAccentId) {
    return (
      <section
        className="flex flex-col gap-4 animate-fade-in"
        aria-label="Accent Detail"
      >
        <AccentDetailView
          accentId={selectedAccentId}
          onBack={handleBackFromDetail}
          character={character}
        />
      </section>
    )
  }

  /* ------ Main Layout ------ */

  return (
    <section
      className="flex flex-col gap-4 animate-fade-in"
      aria-label="Accent Forge"
    >
      {/* ─── Tab Bar ─── */}
      <nav
        className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1"
        role="tablist"
        aria-label="Accent Forge tabs"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDisabled = tab.disabled

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              title={isDisabled ? tab.tooltip : undefined}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                // Base
                'relative inline-flex items-center justify-center gap-2',
                'min-h-[44px] min-w-[44px] px-4 shrink-0',
                'rounded-xl border text-sm font-medium',
                'transition-all duration-200 ease-forge select-none',
                // Focus ring
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                // States
                isActive && [
                  'bg-arcane/15 border-arcane/30 text-arcane',
                  'shadow-[0_0_12px_-4px_rgba(61,210,255,0.2)]',
                ],
                !isActive && !isDisabled && [
                  'bg-white/[0.03] border-white/8 text-forge-2',
                  'hover:bg-white/[0.06] hover:text-forge-1 hover:border-white/12',
                  'active:scale-[0.97]',
                ],
                isDisabled && [
                  'bg-white/[0.03] border-white/8 text-forge-2',
                  'opacity-40 cursor-not-allowed',
                ],
              )}
            >
              <Icon size={16} aria-hidden />
              {tab.label}

              {/* Coming Soon tooltip indicator */}
              {isDisabled && tab.tooltip && (
                <span
                  className={cn(
                    'absolute -top-2 -right-1',
                    'px-1.5 py-0.5 rounded-full',
                    'bg-eldritch/20 border border-eldritch/30',
                    'text-[9px] font-semibold text-eldritch uppercase tracking-wider',
                    'whitespace-nowrap pointer-events-none',
                  )}
                >
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ─── Tab Content ─── */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === 'library' && (
          <AccentLibrary onSelectAccent={handleSelectAccent} />
        )}
        {activeTab === 'rapid' && (
          <DMRapidMode onSelectAccent={handleSelectAccent} />
        )}
        {activeTab === 'forge' && (
          <div className="flex flex-col gap-6">
            <VoiceForge
              character={character}
              onGenerate={handleGenerate}
            />
            {forgeParams && (
              <VoiceForgePreview
                params={forgeParams}
                voiceDescription={forgeDescription}
                character={character}
              />
            )}
          </div>
        )}
        {activeTab === 'train' && (
          <AccentTraining
            character={character}
            onSelectAccent={handleSelectAccent}
          />
        )}
      </div>
    </section>
  )
}
