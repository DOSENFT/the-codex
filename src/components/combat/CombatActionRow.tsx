import { motion, useReducedMotion } from 'motion/react'
import { BrassButton, BrassText } from '../brass'
import { gridVariants, panelVariants } from '../../lib/motion-utils'

interface CombatActionRowProps {
  onDamage: () => void
  onHeal: () => void
  onTempHP: () => void
}

export function CombatActionRow({ onDamage, onHeal, onTempHP }: CombatActionRowProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className="grid grid-cols-3 gap-3"
      variants={gridVariants}
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      animate="visible"
    >
      <motion.div variants={panelVariants}>
        <BrassButton variant="damage" onClick={onDamage} aria-label="Apply damage">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-5 h-5 text-[oklch(0.55_0.18_25)]" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <BrassText weight="display" size="caption" tone="ivory" className="text-[oklch(0.55_0.18_25)]">
            Damage
          </BrassText>
        </BrassButton>
      </motion.div>

      <motion.div variants={panelVariants}>
        <BrassButton variant="heal" onClick={onHeal} aria-label="Apply healing">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[oklch(0.65_0.12_155)]" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <BrassText weight="display" size="caption" tone="ivory" className="text-[oklch(0.65_0.12_155)]">
            Heal
          </BrassText>
        </BrassButton>
      </motion.div>

      <motion.div variants={panelVariants}>
        <BrassButton variant="temp" onClick={onTempHP} aria-label="Set temporary HP">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-5 h-5 text-[oklch(0.55_0.14_290)]" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <BrassText weight="display" size="caption" tone="ivory" className="text-[oklch(0.55_0.14_290)]">
            Temp HP
          </BrassText>
        </BrassButton>
      </motion.div>
    </motion.div>
  )
}
