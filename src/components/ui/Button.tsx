import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
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
    'bg-gradient-to-r from-gold to-arcane text-void-0 font-semibold',
    'shadow-[0_0_16px_-4px_rgba(197,165,90,0.35)]',
    'enabled:hover:shadow-[0_0_24px_-2px_rgba(197,165,90,0.45)]',
    'enabled:hover:brightness-110',
    'disabled:from-forge-2/40 disabled:to-forge-2/40 disabled:text-forge-2 disabled:shadow-none',
  ].join(' '),

  secondary: [
    'bg-void-2/60 text-forge-0 font-medium',
    'border border-gold/20',
    'enabled:hover:bg-void-2/80 enabled:hover:border-gold/40',
    'disabled:text-forge-2 disabled:border-bronze/10 disabled:bg-transparent',
  ].join(' '),

  ghost: [
    'bg-transparent text-forge-1 font-medium',
    'enabled:hover:bg-gold/[0.06] enabled:hover:text-forge-0',
    'disabled:text-forge-2 disabled:bg-transparent',
  ].join(' '),
}

/* 48 is the floor, not 44.
   44 is WCAG 2.2 AA — the number that says a control is reachable by a person
   who is sitting still and paying attention. This app is pressed one-handed, in
   a dim room, on a turn that has to resolve in about six seconds while five
   people wait. TABLE-READY V-5b sets 48 for anything pressed during a turn, and
   on this app every screen is a turn screen, so the floor moved for all of them
   rather than being sprinkled onto the controls that happened to get measured.
   `lg` was already past it at 52 and did not move. */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[48px] px-3.5 text-sm rounded-lg gap-1.5',
  md: 'min-h-[48px] px-5 text-sm rounded-xl gap-2',
  lg: 'min-h-[52px] px-7 text-base rounded-xl gap-2.5',
}

/**
 * Multi-variant button with press feedback, loading spinner, and 48px turn-floor touch
 * targets across all sizes. Supports ref forwarding.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        // Base
        'inline-flex items-center justify-center',
        'select-none whitespace-nowrap',
        'transition-all duration-200 ease-forge',
        // Press feedback
        'enabled:active:scale-[0.97]',
        // Focus ring
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        /* Disabled cursor.
           `disabled:pointer-events-none` used to sit on this line and it was
           two defects wearing one class. It made `disabled:cursor-not-allowed`
           dead CSS — you cannot paint a cursor for an element that refuses to
           be hit-tested — so this file said one thing and did another. And it
           made a disabled button transparent to touch: the press fell THROUGH
           to whatever sat underneath, which on prep/Persona is the row
           wrapper. That is how V-6b came to report three Add buttons as
           "covered by div.flex.gap-2" — their own parent. Nothing covers them.
           They simply were not there to be hit.

           A native <button disabled> already refuses click, focus and
           activation, so removing this removes no guard and changes no
           behaviour. The `hover:`/`active:` rules that were unreachable while
           disabled are now gated on `:enabled` so they stay unreachable —
           which is why nothing on screen moves. */
        'disabled:cursor-not-allowed',
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
})
