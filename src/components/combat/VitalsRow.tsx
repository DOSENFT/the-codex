import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/cn'
import { BrassText, BrassPanel } from '../brass'
import { gridVariants, panelVariants } from '../../lib/motion-utils'

interface VitalsRowProps {
  currentHP: number
  maxHP: number
  tempHP: number
  armorClass: number
  speed: number
}

const ASSET_BASE = '/the-codex/asset-inbox'

export function VitalsRow({ currentHP, maxHP, tempHP, armorClass, speed }: VitalsRowProps) {
  const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 0
  const shouldReduceMotion = useReducedMotion()

  const hpColor = useMemo(() => {
    if (currentHP === 0) return 'text-[oklch(0.50_0.18_25)]'
    if (hpPercent < 25) return 'text-[oklch(0.50_0.18_25)]'
    if (hpPercent <= 75) return 'text-[oklch(0.65_0.15_55)]'
    return ''
  }, [currentHP, hpPercent])

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3"
      variants={gridVariants}
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      animate="visible"
    >
      {/* HP */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-semibold tracking-[0.12em] uppercase text-[oklch(0.50_0.015_60)]">
            HP
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1 shrink-0 text-[oklch(0.55_0.18_25)]" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <BrassText weight="mono" size="chapter" tone={currentHP === maxHP ? 'brass' : 'ivory'} className={hpColor}>
              {currentHP}
            </BrassText>
            <span className="font-[family-name:var(--font-mono)] text-[clamp(18px,3vw,24px)] text-[oklch(0.50_0.015_60)] mx-0.5 tabular-nums">/</span>
            <BrassText weight="mono" size="section" tone="muted">
              {maxHP}
            </BrassText>
          </div>
          {/* HP bar — 6px height for material weight */}
          <div
            className="relative h-1.5 mt-3 bg-[oklch(0.08_0.018_245)] rounded-sm overflow-hidden"
            role="progressbar"
            aria-valuenow={currentHP}
            aria-valuemin={0}
            aria-valuemax={maxHP}
            aria-label="Hit points"
          >
            <div
              className="absolute inset-0 rounded-sm transition-[width] duration-[280ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={{
                width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                backgroundImage: `url('${ASSET_BASE}/wave-2-vitals/hp-bar-fill.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'left center',
              }}
            />
            {tempHP > 0 && (
              <div
                className="absolute inset-0 rounded-sm opacity-70"
                style={{
                  width: `${Math.min(100, (tempHP / maxHP) * 100)}%`,
                  backgroundImage: `url('${ASSET_BASE}/wave-2-vitals/temp-hp-bar-fill.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'left center',
                  left: `${Math.max(0, Math.min(100, hpPercent))}%`,
                }}
              />
            )}
            {/* Shine sweep on HP change */}
            <div
              className="absolute top-0 left-0 w-1/4 h-full pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, oklch(0.80 0.12 80 / 0.35), transparent)',
                animation: 'hpShine 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
              }}
              key={currentHP}
            />
          </div>
        </BrassPanel>
      </motion.div>

      {/* TEMP HP */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.12em] uppercase text-[oklch(0.50_0.015_60)]">
            TEMP HP
          </span>
          <div className="mt-2">
            {tempHP > 0 ? (
              <BrassText weight="mono" size="chapter" tone="arcane">
                {tempHP}
              </BrassText>
            ) : (
              <span className="font-[family-name:var(--font-mono)] text-[clamp(28px,5vw,40px)] text-[oklch(0.35_0.01_60)] tabular-nums leading-[1.10]">&mdash;</span>
            )}
          </div>
        </BrassPanel>
      </motion.div>

      {/* ARMOR CLASS — background-image icon, no img tag */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.12em] uppercase text-[oklch(0.50_0.015_60)]">
            ARMOR CLASS
          </span>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-6 h-6 shrink-0 mix-blend-screen"
              style={{
                backgroundImage: `url('${ASSET_BASE}/top-icons/shield.png')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
              aria-hidden
            />
            <BrassText weight="mono" size="chapter" tone="brass">
              {armorClass}
            </BrassText>
          </div>
        </BrassPanel>
      </motion.div>

      {/* SPEED — background-image icon, no img tag */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.12em] uppercase text-[oklch(0.50_0.015_60)]">
            SPEED
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <div
              className="w-5 h-5 shrink-0 self-center mix-blend-screen"
              style={{
                backgroundImage: `url('${ASSET_BASE}/top-icons/speed.png')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
              aria-hidden
            />
            <BrassText weight="mono" size="chapter" tone="brass">
              {speed}
            </BrassText>
            <BrassText weight="body" size="caption" tone="muted">
              ft
            </BrassText>
          </div>
        </BrassPanel>
      </motion.div>
    </motion.div>
  )
}
