import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdentitySwitcherProps {
  character: Character
  onSwitch: (identityId: string | undefined) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Horizontal scrollable strip for quick identity switching. Shows a "Default"
 * card first, then each identity defined on the character. Returns `undefined`
 * when the user selects the default (base) persona.
 *
 * Only renders when the character has at least one identity defined. Returns
 * null otherwise to avoid empty space.
 */
export function IdentitySwitcher({ character, onSwitch }: IdentitySwitcherProps) {
  const { identities, activeIdentityId } = character

  // Gate: don't render if no identities exist
  if (!identities || identities.length === 0) return null

  const isDefaultActive = !activeIdentityId

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 snap-x snap-mandatory"
      role="radiogroup"
      aria-label="Identity switcher"
    >
      {/* Default persona card */}
      <IdentityCard
        name="Default"
        accentHint={character.persona?.voiceNotes?.slice(0, 30)}
        isActive={isDefaultActive}
        onSelect={() => onSwitch(undefined)}
      />

      {/* Per-identity cards */}
      {identities.map((identity) => (
        <IdentityCard
          key={identity.id}
          name={identity.name}
          accentHint={identity.accent?.slice(0, 30)}
          isActive={activeIdentityId === identity.id}
          onSelect={() => onSwitch(identity.id)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inner card
// ---------------------------------------------------------------------------

interface IdentityCardProps {
  name: string
  accentHint?: string
  isActive: boolean
  onSelect: () => void
}

function IdentityCard({ name, accentHint, isActive, onSelect }: IdentityCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onSelect}
      className={cn(
        // Layout
        'inline-flex items-center gap-2.5 shrink-0',
        'min-h-[52px] px-4 rounded-xl',
        'snap-start',
        // Transition
        'transition-all duration-200 ease-forge',
        // Press feedback
        'active:scale-[0.97]',
        // Focus
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        // Selection cursor
        'select-none cursor-pointer',
        // Active vs inactive
        isActive
          ? 'bg-eldritch/10 border border-eldritch/25'
          : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06]',
      )}
    >
      {/* Active indicator dot */}
      <span
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          'transition-colors duration-200 ease-forge',
          isActive ? 'bg-eldritch' : 'bg-white/20',
        )}
        aria-hidden
      />

      {/* Text stack */}
      <span className="flex flex-col items-start min-w-0">
        <span className="text-sm font-medium text-forge-0 truncate max-w-[120px]">
          {name}
        </span>
        {accentHint && (
          <span className="text-xs text-forge-2 truncate max-w-[120px]">
            {accentHint}
          </span>
        )}
      </span>
    </button>
  )
}
