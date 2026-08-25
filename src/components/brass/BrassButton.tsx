import { motion } from 'motion/react'
import { cn } from '../../lib/cn'

type BrassButtonVariant = 'primary' | 'damage' | 'heal' | 'temp' | 'secondary'

type BrassButtonProps = {
  variant?: BrassButtonVariant
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

const VARIANT_CLASS: Record<BrassButtonVariant, string> = {
  primary: '',
  damage: 'brass-button-v2--damage',
  heal: 'brass-button-v2--heal',
  temp: 'brass-button-v2--temp',
  secondary: '',
}

export function BrassButton({
  variant = 'primary',
  children,
  onClick,
  disabled,
  className,
  ...rest
}: BrassButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'brass-button-v2',
        VARIANT_CLASS[variant],
        'min-h-[64px] rounded-lg',
        'inline-flex items-center justify-center gap-2.5 px-5',
        'font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-[0.08em]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
