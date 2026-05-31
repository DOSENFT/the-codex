/** 8th Level Sigil — Eight-fold pattern: octagonal mandala with nested geometry.
 *  The threshold mark. Complex but ordered, approaching divine. */
export function SpellSigil8({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Outer octagon */}
      <path
        d="M12.3 2.7l7.4 0 5.3 5.3 0 7.4-5.3 5.3-7.4 0-5.3-5.3 0-7.4Z"
        strokeWidth="1.1"
        transform="translate(0 4.6)"
      />
      {/* Diagonal cross */}
      <path d="M6 6l20 20M26 6L6 26" strokeWidth="1.0" strokeLinecap="round" />
      {/* Cardinal cross */}
      <path d="M16 2v28M2 16h28" strokeWidth="1.0" strokeLinecap="round" />
      {/* Inner circle with ring */}
      <circle cx="16" cy="16" r="5.5" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="3" strokeWidth="1.0" />
      {/* Eight terminal dots */}
      <circle cx="16" cy="2" r="1" fill="currentColor" stroke="none" />
      <circle cx="25.9" cy="6.1" r="1" fill="currentColor" stroke="none" />
      <circle cx="30" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="25.9" cy="25.9" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="30" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.1" cy="25.9" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.1" cy="6.1" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
