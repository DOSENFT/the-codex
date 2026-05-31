/** 9th Level Sigil — Full mandala: nine-fold, most intricate, all strokes converge.
 *  The apex mark. The highest arcane power. Every line is earned. */
export function SpellSigil9({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Outer circle */}
      <circle cx="16" cy="16" r="14" strokeWidth="1.0" />
      {/* Nine radiating lines */}
      <path
        d="M16 2v5.5M24.7 4.2l-2.7 4.9M30.4 11l-5.1 2.2M30.4 21l-5.1-2.2M24.7 27.8l-2.7-4.9M16 30v-5.5M7.3 27.8l2.7-4.9M1.6 21l5.1-2.2M1.6 11l5.1 2.2M7.3 4.2l2.7 4.9"
        strokeWidth="1.0"
        strokeLinecap="round"
      />
      {/* Middle nonagon (9-sided) */}
      <path
        d="M16 7.5l5.7 2.5 3.5 5.2-.3 6.1-4.2 4.5-5.7 1-5.3-2-3.2-5.2.7-6L11 9Z"
        strokeWidth="1.0"
        strokeLinejoin="round"
      />
      {/* Inner ring */}
      <circle cx="16" cy="16" r="4.5" strokeWidth="1.0" />
      {/* Inner nonagon, tighter */}
      <path
        d="M16 12l2.8 1.2 1.7 2.6-.1 3-2.1 2.2-2.8.5-2.6-1-1.6-2.6.3-3L13.8 13Z"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Center: triple nested dots */}
      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      {/* Nine terminal marks on outer circle */}
      <circle cx="16" cy="2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="24.7" cy="4.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="30.4" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="30.4" cy="21" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="24.7" cy="27.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="30" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="7.3" cy="27.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="1.6" cy="21" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="1.6" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
