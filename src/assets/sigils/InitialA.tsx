/** Illuminated Initial "A" — Action.
 *  Cinzel-inspired capital A with decorative serifs and a small apex flourish.
 *  Designed to read clearly at 20-24px. */
export function InitialA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      {/* Main A strokes — left leg, right leg */}
      <path
        d="M5 20L12 4l7 16"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar */}
      <path
        d="M7.8 14h8.4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Decorative serif — left foot */}
      <path
        d="M3.5 20h3"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Decorative serif — right foot */}
      <path
        d="M17.5 20h3"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Apex flourish — small teardrop curl */}
      <path
        d="M12 4c-0.8-1.2 0-2.5 0.8-1.8 0.6 0.5-0.2 1.4-0.8 1.8"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  )
}
