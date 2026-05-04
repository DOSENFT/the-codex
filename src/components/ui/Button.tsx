import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-arcane to-eldritch text-void-0 font-semibold',
    'shadow-[0_0_16px_-4px_rgba(61,210,255,0.35)]',
    'hover:shadow-[0_0_24px_-2px_rgba(61,210,255,0.45)]',
    'hover:brightness-110',
    'disabled:from-forge-2/40 disabled:to-forge-2/40 disabled:text-forge-2 disabled:shadow-none',
  ].join(' '),

  secondary: [
    'bg-white/[0.04] text-forge-0 font-medium',
    'border border-white/10',
    'hover:bg-white/[0.08] hover:border-white/20',
    'disabled:text-forge-2 disabled:border-white/5 disabled:bg-transparent',
  ].join(' '),

  ghost: [
    'bg-transparent text-forge-1 font-medium',
    'hover:bg-white/[0.06] hover:text-forge-0',
    'disabled:text-forge-2 disabled:bg-transparent',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3.5 text-sm rounded-lg gap-1.5',
  md: 'min-h-[44px] px-5 text-sm rounded-xl gap-2',
  lg: 'min-h-[52px] px-7 text-base rounded-xl gap-2.5',
}

/**
 * Multi-variant button with press feedback, loading spinner, and 44px+ touch
 * targets across all sizes.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        // Base
        'inline-flex items-center justify-center',
        'select-none whitespace-nowrap',
        'transition-all duration-200 ease-forge',
        // Press feedback
        'active:scale-[0.97]',
        // Focus ring
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        // Disabled cursor
        'disabled:pointer-events-none disabled:cursor-not-allowed',
        // Variant + size
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <Loader2
          className="animate-spin shrink-0"
          size={size === 'lg' ? 20 : 16}
          aria-hidden
        />
      )}
      {children}
    </button>
  )
}
