import { useState } from 'react'
import { Theater, BookHeart, MessageSquare, Mic, Users } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character } from '../lib/character'
import { OrnateHeader } from './ui/OrnateHeader'
import { ParchmentCard } from './ui/ParchmentCard'
import { PersonaEngine } from './PersonaEngine'
import { BackstoryBuilder } from './BackstoryBuilder'
import { DialogueBank } from './DialogueBank'
import { AccentCoach } from './AccentCoach'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IdentityMode = 'persona' | 'backstory' | 'dialogue' | 'accent' | 'identities'

interface IdentityPageProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES: { id: IdentityMode; label: string; icon: typeof Theater }[] = [
  { id: 'persona', label: 'Persona', icon: Theater },
  { id: 'backstory', label: 'Backstory', icon: BookHeart },
  { id: 'dialogue', label: 'Dialogue', icon: MessageSquare },
  { id: 'accent', label: 'Accent', icon: Mic },
  { id: 'identities', label: 'Identities', icon: Users },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Identity tab container. Houses all character-identity related tools:
 * Persona Engine, Backstory Builder, Dialogue Bank, Accent Coach, and
 * a future Identity Manager (multi-identity switching).
 *
 * Uses a horizontal chip selector for sub-mode navigation with snap
 * scrolling on mobile.
 */
export function IdentityPage({ character, onCharacterUpdate }: IdentityPageProps) {
  const [mode, setMode] = useState<IdentityMode>('persona')

  return (
    <section className="flex flex-col gap-4 animate-fade-in" aria-label="Identity">
      {/* ─── Section Header ─── */}
      <OrnateHeader>Identity</OrnateHeader>

      {/* ─── Mode Chips ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'shrink-0 snap-start inline-flex items-center gap-2',
              'min-h-[44px] px-4 rounded-xl',
              'text-sm font-medium whitespace-nowrap select-none',
              'transition-all duration-200 ease-forge',
              'active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              mode === id
                ? 'ornate-border bg-eldritch/15 text-eldritch border border-eldritch/25'
                : 'bg-void-2/60 text-forge-2 border border-bronze/15 hover:bg-void-2/60 hover:text-forge-1',
            )}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Divider ─── */}
      <div className="ornate-divider" />

      {/* ─── Content ─── */}
      {mode === 'persona' && (
        <PersonaEngine character={character} onUpdate={onCharacterUpdate} />
      )}
      {mode === 'backstory' && (
        <BackstoryBuilder character={character} onUpdate={onCharacterUpdate} />
      )}
      {mode === 'dialogue' && (
        <DialogueBank character={character} onUpdate={onCharacterUpdate} />
      )}
      {mode === 'accent' && (
        <AccentCoach character={character} />
      )}
      {mode === 'identities' && (
        <ParchmentCard className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gold/[0.06] border border-gold/25 flex items-center justify-center">
              <Users size={28} className="text-gold" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-xs">
              <p className="text-sm font-display font-semibold text-forge-0 tracking-wide">Identity Manager</p>
              <p className="text-xs text-forge-2 leading-relaxed">
                Manage multiple identities for {character.name} — disguises,
                alternate personas, and social masks. Coming soon.
              </p>
            </div>
          </div>
        </ParchmentCard>
      )}
    </section>
  )
}
