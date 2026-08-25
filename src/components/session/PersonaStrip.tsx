import { User, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import { GlassCard } from '../ui/GlassCard'
import { Badge } from '../ui/Badge'
import type { Character } from '../../lib/character'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonaStripProps {
  character: Character
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Always-visible hero card at the top of Session mode. Surfaces the character's
 * name, default state one-liner, core trait pills, active identity badge, and
 * accent/voice hint -- all at a glance.
 *
 * Compact: targets ~100px height at 375px width.
 */
export function PersonaStrip({ character }: PersonaStripProps) {
  const { persona, identities, activeIdentityId } = character

  // Resolve active identity (if any)
  const activeIdentity = activeIdentityId
    ? identities?.find((id) => id.id === activeIdentityId)
    : undefined

  const hasActiveIdentity = !!activeIdentity

  // Core traits: first 5 + overflow count
  const coreTraits = persona?.coreTraits ?? []
  const visibleTraits = coreTraits.slice(0, 5)
  const overflowCount = Math.max(0, coreTraits.length - 5)

  // Accent / voice hint
  const accentHint = activeIdentity?.accent
    ?? (persona?.voiceNotes ? persona.voiceNotes.slice(0, 40) : undefined)

  return (
    <GlassCard
      className={cn(
        'animate-fade-in',
        'border-l-[3px]',
        hasActiveIdentity ? 'border-l-eldritch' : 'border-l-arcane',
        // Compact padding for the strip
        '!p-3',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon glyph */}
        <span
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-9 h-9 rounded-lg',
            hasActiveIdentity ? 'bg-eldritch/10' : 'bg-arcane/10',
          )}
        >
          {hasActiveIdentity ? (
            <Sparkles
              size={18}
              className="text-eldritch"
              aria-hidden
            />
          ) : (
            <User
              size={18}
              className="text-arcane"
              aria-hidden
            />
          )}
        </span>

        {/* Content stack */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: Name + active identity badge */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-display text-xl font-semibold text-forge-0 truncate">
              {character.name}
            </h2>

            {activeIdentity && (
              <Badge variant="eldritch" className="shrink-0">
                {activeIdentity.name}
              </Badge>
            )}
          </div>

          {/* Row 2: Default state one-liner */}
          {persona?.defaultState && (
            <p className="text-sm text-forge-2 italic truncate leading-snug">
              {persona.defaultState}
            </p>
          )}

          {/* Row 3: Core trait pills + accent hint */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleTraits.map((trait) => (
              <Badge key={trait.text} variant="neutral" className="text-xs">
                {trait.text}
              </Badge>
            ))}

            {overflowCount > 0 && (
              <Badge variant="neutral" className="text-xs">
                +{overflowCount}
              </Badge>
            )}

            {/* Accent / voice hint (separated by a dot) */}
            {accentHint && visibleTraits.length > 0 && (
              <span className="text-forge-2 text-xs select-none" aria-hidden>
                &middot;
              </span>
            )}
            {accentHint && (
              <span className="text-xs text-forge-2 truncate max-w-[140px]">
                {accentHint}
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
