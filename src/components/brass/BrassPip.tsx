import { motion } from 'motion/react'
import { cn } from '../../lib/cn'

type BrassPipProps = {
  type: 'success' | 'failure'
  filled: boolean
  onClick?: () => void
  disabled?: boolean
  index: number
}

const ASSET_MAP = {
  'success-empty': '/the-codex/asset-inbox/wave-2-vitals/death-save-success-empty.png',
  'success-filled': '/the-codex/asset-inbox/wave-2-vitals/death-save-success-filled.png',
  'failure-empty': '/the-codex/asset-inbox/wave-2-vitals/death-save-failure-empty.png',
  'failure-filled': '/the-codex/asset-inbox/wave-2-vitals/death-save-failure-filled.png',
} as const

/** Glow color per pip type */
const GLOW_GRADIENT = {
  success: 'radial-gradient(circle, oklch(0.85 0.10 80 / 0.4), transparent)',
  failure: 'radial-gradient(circle, oklch(0.55 0.18 25 / 0.4), transparent)',
} as const

export function BrassPip({ type, filled, onClick, disabled, index }: BrassPipProps) {
  const key = `${type}-${filled ? 'filled' : 'empty'}` as keyof typeof ASSET_MAP
  const src = ASSET_MAP[key]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-11 h-11 rounded-full p-0',  // 44px touch target
        'flex items-center justify-center',
        'transition-all duration-[120ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.85_0.10_80)]',
        !disabled && !filled && 'cursor-pointer hover:scale-110 active:scale-90',
        disabled && filled && 'cursor-default',
      )}
      aria-label={`Death save ${type} ${index + 1}, ${filled ? 'filled' : 'empty'}`}
    >
      {/* Glow burst — fires once when pip becomes filled */}
      {filled && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: GLOW_GRADIENT[type] }}
          aria-hidden
        />
      )}

      <div
        className="w-7 h-7 rounded-full mix-blend-screen"  // 28px visual pip
        style={{
          backgroundImage: `url('${src}')`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
        aria-hidden
      />
    </button>
  )
}
