/** Illuminated Initial "R" — Reaction.
 *  Cinzel-inspired capital R with a small swash on the leg.
 *  Designed to read clearly at 20-24px. */
export function InitialR({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      {/* Vertical stem */}
      <path
        d="M7 4v16"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Bowl */}
      <path
        d="M7 4h5c2.8 0 4.8 1.8 4.8 4.5S14.8 13 12 13H7"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leg with swash tail */}
      <path
        d="M12.5 13l5 7c0.4 0.5 0.8 0.8 1.2 0.6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top serif */}
      <path
        d="M5.5 4h2"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Bottom serif */}
      <path
        d="M5.5 20h2"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
