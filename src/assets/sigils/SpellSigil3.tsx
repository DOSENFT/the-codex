/** 3rd Level Sigil — Trefoil: three converging strokes meeting at center.
 *  A simplified triskele with terminal dots. */
export function SpellSigil3({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      <path
        d="M16 5v11M16 16l-9.5 5.5M16 16l9.5 5.5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 5c-1 0-1.8.8-1.8 1.8S15 8.6 16 8.6s1.8-.8 1.8-1.8S17 5 16 5Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="6.5" cy="21.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="25.5" cy="21.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="2" strokeWidth="1.4" />
    </svg>
  )
}
