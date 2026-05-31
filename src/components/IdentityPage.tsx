import { useState } from 'react'
import {
  Theater,
  BookHeart,
  MessageSquare,
  Mic,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character } from '../lib/character'
import { PersonaEngine } from './PersonaEngine'
import { BackstoryBuilder } from './BackstoryBuilder'
import { DialogueBank } from './DialogueBank'
import { AccentCoach } from './AccentCoach'
import { SceneResponseBank } from './SceneResponseBank'
import { IdentityManager } from './IdentityManager'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PrepSection = 'identity' | 'dialogue' | 'story' | 'voice'

interface IdentityPageProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Accordion Configuration                                            */
/* ------------------------------------------------------------------ */

const PREP_SECTIONS: {
  id: PrepSection
  label: string
  icon: typeof Theater
  countFn: (char: Character) => number
}[] = [
  {
    id: 'identity',
    label: 'Identity',
    icon: Theater,
    countFn: (c) => {
      const p = c.persona
      if (!p) return 0
      return (
        (p.coreTraits?.length ?? 0) +
        (p.colorTraits?.length ?? 0) +
        (p.wants?.length ?? 0) +
        (p.fears?.length ?? 0)
      )
    },
  },
  {
    id: 'dialogue',
    label: 'Dialogue',
    icon: MessageSquare,
    countFn: (c) => {
      const p = c.persona
      if (!p) return 0
      return (
        (p.dialogueBank?.length ?? 0) +
        (p.sceneResponses?.reduce((sum, s) => sum + s.responses.length, 0) ?? 0)
      )
    },
  },
  {
    id: 'story',
    label: 'Story',
    icon: BookHeart,
    countFn: (c) => {
      const b = c.backstory
      if (!b) return 0
      return (
        (b.keyMemories?.length ?? 0) +
        (b.relationships?.length ?? 0) +
        (b.unresolvedThreads?.length ?? 0)
      )
    },
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Mic,
    countFn: (c) => c.persona?.catchphrases?.length ?? 0,
  },
]

/* ------------------------------------------------------------------ */
/*  Section Content Mapping                                            */
/* ------------------------------------------------------------------ */

function SectionContent({
  section,
  character,
  onCharacterUpdate,
}: {
  section: PrepSection
  character: Character
  onCharacterUpdate: (char: Character) => void
}) {
  switch (section) {
    case 'identity':
      return <PersonaEngine character={character} onUpdate={onCharacterUpdate} />
    case 'dialogue':
      return (
        <div className="flex flex-col gap-4">
          <DialogueBank character={character} onUpdate={onCharacterUpdate} />
          <SceneResponseBank character={character} onUpdate={onCharacterUpdate} />
        </div>
      )
    case 'story':
      return <BackstoryBuilder character={character} onUpdate={onCharacterUpdate} />
    case 'voice':
      return <AccentCoach character={character} />
  }
}

/* ------------------------------------------------------------------ */
/*  Component — Now only renders prep mode (Persona tab)               */
/*  Session mode roleplay is handled by SessionCockpit directly        */
/* ------------------------------------------------------------------ */

export function IdentityPage({ character, onCharacterUpdate }: IdentityPageProps) {
  const [openSection, setOpenSection] = useState<PrepSection | null>('identity')

  return (
    <section className="flex flex-col gap-4 animate-fade-in" aria-label="Persona">
      {/* ─── Prep Mode Content ─── */}
      <div className="flex flex-col gap-3">
        {PREP_SECTIONS.map((section) => {
          const Icon = section.icon
          const count = section.countFn(character)
          const isOpen = openSection === section.id

          return (
            <div key={section.id} className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(isOpen ? null : section.id)
                }
                className={cn(
                  'w-full min-h-[56px] px-4 py-3 rounded-xl',
                  'flex items-center justify-between',
                  'bg-white/[0.04] border border-white/10',
                  'transition-all duration-200 ease-forge',
                  'active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  isOpen && 'bg-white/[0.06] border-white/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-forge-1" aria-hidden />
                  <span className="text-sm font-semibold text-forge-0">
                    {section.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && <Badge variant="neutral">{count}</Badge>}
                  {isOpen ? (
                    <ChevronDown size={16} className="text-forge-2" />
                  ) : (
                    <ChevronRight size={16} className="text-forge-2" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 animate-fade-in">
                  <SectionContent
                    section={section.id}
                    character={character}
                    onCharacterUpdate={onCharacterUpdate}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Identity Manager */}
        {(character.identities?.length ?? 0) > 0 && (
          <IdentityManager
            character={character}
            onCharacterUpdate={onCharacterUpdate}
          />
        )}
      </div>
    </section>
  )
}
