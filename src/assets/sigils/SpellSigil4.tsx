/** 4th Level Sigil — Quartered: four-fold symmetry, compass cross with arcs.
 *  The stable foundation mark. Four cardinal arcs. */
export function SpellSigil4({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Central cross */}
      <path
        d="M16 4v24M4 16h24"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Four arcs in quadrants */}
      <path
        d="M8 8a11.3 11.3 0 0 1 0 0Q12 12 8 8M24 8Q20 12 24 8M8 24Q12 20 8 24M24 24Q20 20 24 24"
        strokeWidth="1.2"
      />
      <path
        d="M9 9c2 2 4.5 2.5 7 2.5M23 9c-2 2-4.5 2.5-7 2.5M9 23c2-2 4.5-2.5 7-2.5M23 23c-2-2-4.5-2.5-7-2.5"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.5" strokeWidth="1.4" />
    </svg>
  )
}
