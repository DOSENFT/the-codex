/** Illuminated Initial "B" — Bonus Action.
 *  Cinzel-inspired capital B with a curl ornament at the junction.
 *  Designed to read clearly at 20-24px. */
export function InitialB({ className }: { className?: string }) {
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
      {/* Top bowl */}
      <path
        d="M7 4h5c2.5 0 4.5 1.5 4.5 4s-2 4-4.5 4"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom bowl (slightly wider) */}
      <path
        d="M7 12h5.5c3 0 5 1.5 5 4.5S15.5 20 12.5 20H7"
        strokeWidth="1.6"
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
      {/* Curl ornament at the junction */}
      <circle
        cx="7"
        cy="12"
        r="1.2"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  )
}
