/** 7th Level Sigil — Seven-pointed web: intricate seven-fold star with inner web.
 *  The mystic mark. Approaching high complexity. */
export function SpellSigil7({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Seven-pointed star (heptagram) */}
      <path
        d="M16 2l4.3 10.8L30 10l-7.4 7.8L27.6 28 16 23.5 4.4 28l5-10.2L2 10l9.7 2.8Z"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Inner ring */}
      <circle cx="16" cy="16" r="5" strokeWidth="1.1" />
      {/* Center dot cluster */}
      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="20" cy="14" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="19" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="13" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}
