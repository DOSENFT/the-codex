/** Illuminated Initial "M" — Movement.
 *  Cinzel-inspired capital M with slightly flared terminals.
 *  Designed to read clearly at 20-24px. */
export function InitialM({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      {/* Left stem */}
      <path
        d="M4 20V5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Left diagonal down to valley */}
      <path
        d="M4 5l8 10"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right diagonal up from valley */}
      <path
        d="M12 15L20 5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right stem */}
      <path
        d="M20 5v15"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Left flared terminal */}
      <path
        d="M2.5 20h3"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Right flared terminal */}
      <path
        d="M18.5 20h3"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Left top flare */}
      <path
        d="M2.8 5h2.4"
        strokeWidth="1.0"
        strokeLinecap="round"
      />
      {/* Right top flare */}
      <path
        d="M18.8 5h2.4"
        strokeWidth="1.0"
        strokeLinecap="round"
      />
    </svg>
  )
}
