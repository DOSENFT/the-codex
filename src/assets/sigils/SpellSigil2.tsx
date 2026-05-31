/** 2nd Level Sigil — Paired/mirrored mark: two curves crossing, bilateral.
 *  The duality mark. Two arcs converging. */
export function SpellSigil2({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      <path
        d="M10 6c0 8 6 10 6 14M22 6c0 8-6 10-6 14M10 20c2-1 4-1 6 0s4 1 6 0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
