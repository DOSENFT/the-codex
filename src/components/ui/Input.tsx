import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Lucide icon component rendered inside the input on the left */
  icon?: LucideIcon
  /** Label text rendered above the input */
  label?: string
  /** Error message rendered below the input; also triggers error styling */
  error?: string
}

/**
 * Glass-styled text input with optional leading icon, label, and error state.
 * Min height 44px for touch-target compliance. Border glows arcane on focus
 * and shifts to red on error.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, label, error, className, id, ...rest }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-forge-1 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forge-2"
              aria-hidden
            />
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              // Layout
              'min-h-[44px] w-full rounded-xl',
              // Appearance
              'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
              'border border-white/10',
              'font-body text-sm',
              // Padding — shift right when icon present
              Icon ? 'pl-10 pr-4' : 'px-4',
              // Transitions
              'transition-all duration-200 ease-forge',
              // Focus
              'focus:border-arcane/60 focus:bg-void-2/80',
              'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
              'focus:outline-none',
              // Error state
              error && [
                'border-red-500/60',
                'focus:border-red-500/80',
                'focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
              ],
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            )}
            {...rest}
          />
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-400 pl-0.5"
          >
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
