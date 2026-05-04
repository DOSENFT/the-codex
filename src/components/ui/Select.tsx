import { forwardRef, type SelectHTMLAttributes, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text rendered above the select */
  label?: string
  /** Array of options to render */
  options: SelectOption[]
}

/**
 * Native <select> themed for the dark glass aesthetic.
 * ChevronDown icon overlays the right side. 44px min height for touch targets.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, id, ...rest }, ref) => {
    const autoId = useId()
    const selectId = id ?? autoId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-forge-1 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Layout
              'min-h-[44px] w-full rounded-xl',
              // Appearance — remove native arrow
              'appearance-none',
              'bg-void-2/60 text-forge-0',
              'border border-white/10',
              'font-body text-sm',
              // Padding — room for chevron on right
              'pl-4 pr-10',
              // Transitions
              'transition-all duration-200 ease-forge',
              // Focus
              'focus:border-arcane/60 focus:bg-void-2/80',
              'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
              'focus:outline-none',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Cursor
              'cursor-pointer',
              className,
            )}
            {...rest}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron indicator */}
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-forge-2"
            aria-hidden
          />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
