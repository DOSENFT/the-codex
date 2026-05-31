import { cn } from '../../lib/cn'
import { BrassText, BrassBadge } from '../brass'
import type { Character } from '../../lib/character'

interface CharacterCardProps {
  character: Character
}

const PORTRAIT_FRAME = '/the-codex/asset-inbox/bonus-frames/portrait-frame-arched-bright.png'

export function CharacterCard({ character }: CharacterCardProps) {
  const initial = character.name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center text-center py-3 gap-4 md:flex-row md:text-left md:items-start md:gap-6">
      {/* Portrait Medallion — hero scale: 140px mobile / 180px tablet */}
      <div className="character-portrait relative shrink-0 w-[140px] h-[170px] md:w-[180px] md:h-[220px]">
        {/* Inner: letter avatar fallback (or portrait image) */}
        <div
          className="absolute rounded-xl"
          style={{
            inset: '12% 18%',
            backgroundColor: 'oklch(0.10 0.015 245)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <span
            className="font-[family-name:var(--font-display)] select-none"
            style={{
              fontWeight: 700,
              fontSize: 'clamp(64px, 10vw, 96px)',
              lineHeight: 1,
              background: 'linear-gradient(180deg, oklch(0.92 0.08 82), oklch(0.82 0.10 80), oklch(0.72 0.10 75), oklch(0.52 0.08 70))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
            }}
          >
            {initial}
          </span>
        </div>

        {/* Frame overlay — background-image + mix-blend-mode: screen kills white halos */}
        <div
          className="absolute inset-0 pointer-events-none z-10 mix-blend-screen"
          style={{
            backgroundImage: `url('${PORTRAIT_FRAME}')`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
          aria-hidden
        />

        {/* Portrait shimmer sweep — periodic brass light across frame */}
        <div
          className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-xl"
          aria-hidden
        >
          <div
            className="absolute inset-0 frame-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, oklch(0.85 0.10 80 / 0.08) 50%, transparent 100%)',
              animation: 'frameShimmer 4s ease-in-out 2s infinite',
              width: '50%',
            }}
          />
        </div>

        {/* Level badge — lower-right overlap */}
        <div className="absolute bottom-1 right-3 z-20">
          <BrassBadge variant="level">
            <BrassText weight="mono" size="caption" tone="ivory">
              {character.level}
            </BrassText>
          </BrassBadge>
        </div>
      </div>

      {/* Identity Text Stack */}
      <div className="flex flex-col gap-1.5 md:pt-3">
        {/* Name — hero display with clamp() */}
        <BrassText
          as="h1"
          weight="display"
          size="display"
          tone="brass"
          className="tracking-[-0.02em] uppercase md:text-[clamp(40px,8vw,56px)]"
        >
          {character.name}
        </BrassText>

        {/* Level . Race . Class */}
        <div className="flex items-center justify-center md:justify-start gap-0 flex-wrap mt-1">
          <BrassText weight="body" size="caption" tone="muted">
            Level {character.level}
          </BrassText>
          <Dot />
          <BrassText weight="body" size="caption" tone="muted">
            {character.race}
          </BrassText>
          <Dot />
          <BrassText weight="body" size="caption" tone="muted">
            {character.class}
          </BrassText>
        </div>

        {/* Subclass Badge */}
        {character.subclass && (
          <div className="flex justify-center md:justify-start mt-1.5">
            <BrassBadge variant="oath">
              <span
                className="inline-block w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-[oklch(0.92_0.08_82)] to-[oklch(0.52_0.08_70)] shrink-0 oath-star-spin"
                style={{ animation: 'slowSpin 12s linear infinite' }}
                aria-hidden
              />
              <BrassText weight="body" size="caption" tone="brass">
                {character.subclass}
              </BrassText>
            </BrassBadge>
          </div>
        )}
      </div>
    </div>
  )
}

function Dot() {
  return (
    <span className="mx-1.5 text-[oklch(0.50_0.015_60_/_0.5)] select-none text-[13px]">
      &middot;
    </span>
  )
}
