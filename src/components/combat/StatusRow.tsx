import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/cn'
import { BrassText, BrassPanel, BrassPip } from '../brass'
import { gridVariants, panelVariants } from '../../lib/motion-utils'

interface StatusRowProps {
  spellSaveDC: number
  concentration: string | null
  deathSaves: { successes: number; failures: number }
  isDown: boolean
  onDeathSaveSuccess: () => void
  onDeathSaveFailure: () => void
}

const ASSET_BASE = '/the-codex/asset-inbox'

export function StatusRow({
  spellSaveDC,
  concentration,
  deathSaves,
  isDown,
  onDeathSaveSuccess,
  onDeathSaveFailure,
}: StatusRowProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className="grid grid-cols-3 gap-2.5 md:gap-3"
      variants={gridVariants}
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      animate="visible"
    >
      {/* SPELL SAVE DC */}
      <motion.div variants={panelVariants}>
        <BrassPanel glow="arcane" className="p-4 relative">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.16em] uppercase text-[oklch(0.50_0.015_60)] leading-tight">
            SPELL SAVE DC
          </span>
          <div className="relative mt-2">
            {/* Arcane glow behind — background-image + mix-blend-mode: screen */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen"
              style={{
                backgroundImage: `url('${ASSET_BASE}/wave-2-effects/glow-arcane-ring.png')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              aria-hidden
            />
            <BrassText weight="mono" size="chapter" tone="arcane">
              {spellSaveDC}
            </BrassText>
          </div>
        </BrassPanel>
      </motion.div>

      {/* CONCENTRATION */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.16em] uppercase text-[oklch(0.50_0.015_60)] leading-tight">
            CONCENTRATION
          </span>
          <div className="mt-2">
            {concentration ? (
              <div className="flex items-center gap-2">
                {/* Concentration icon — background-image + mix-blend-mode: screen */}
                <div
                  className={cn(
                    'w-6 h-6 shrink-0 mix-blend-screen',
                    'animate-[candle-flicker_3s_ease-in-out_infinite_alternate]',
                  )}
                  style={{
                    backgroundImage: `url('${ASSET_BASE}/wave-2-vitals/concentration-steady.png')`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}
                  aria-hidden
                />
                <BrassText
                  weight="display"
                  size="caption"
                  tone="brass"
                  className="truncate max-w-[80px]"
                >
                  {concentration}
                </BrassText>
              </div>
            ) : (
              <BrassText weight="body" size="body" tone="muted">
                None
              </BrassText>
            )}
          </div>
        </BrassPanel>
      </motion.div>

      {/* DEATH SAVES */}
      <motion.div variants={panelVariants}>
        <BrassPanel className="p-4">
          <span className="font-[family-name:var(--font-body)] text-xs font-medium tracking-[0.16em] uppercase text-[oklch(0.50_0.015_60)] leading-tight">
            DEATH SAVES
          </span>
          <div className="flex items-center gap-0 mt-2">
            {/* Success pips — 44px touch, 28px visual */}
            {[0, 1, 2].map(i => (
              <BrassPip
                key={`s-${i}`}
                type="success"
                filled={deathSaves.successes > i}
                onClick={onDeathSaveSuccess}
                disabled={deathSaves.successes > i || !isDown}
                index={i}
              />
            ))}
            {/* Brass hairline divider */}
            <div className="w-px h-5 bg-[oklch(0.32_0.05_65_/_0.4)] mx-0.5" aria-hidden />
            {/* Failure pips — 44px touch, 28px visual */}
            {[0, 1, 2].map(i => (
              <BrassPip
                key={`f-${i}`}
                type="failure"
                filled={deathSaves.failures > i}
                onClick={onDeathSaveFailure}
                disabled={deathSaves.failures > i || !isDown}
                index={i}
              />
            ))}
          </div>
        </BrassPanel>
      </motion.div>
    </motion.div>
  )
}
