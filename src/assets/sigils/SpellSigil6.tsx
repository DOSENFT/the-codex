/** 6th Level Sigil — Hexagonal lattice: six-fold pattern with interconnecting arcs.
 *  The harmony mark. Alchemical hexagon with curved connectors. */
export function SpellSigil6({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Outer hexagon */}
      <path
        d="M16 3l11.3 6.5v13L16 29 4.7 22.5v-13Z"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Inner hexagon, rotated */}
      <path
        d="M16 8l6.9 4v8L16 24l-6.9-4v-8Z"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Six radial connectors */}
      <path
        d="M16 3v5M27.3 9.5l-4.4 2.5M27.3 22.5l-4.4-2.5M16 29v-5M4.7 22.5l4.4-2.5M4.7 9.5l4.4 2.5"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2" strokeWidth="1.3" />
    </svg>
  )
}
