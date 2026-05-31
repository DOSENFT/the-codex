/** 5th Level Sigil — Pentagonal: five radiating strokes from center, organic star.
 *  The quincunx mark. Five-fold botanical structure. */
export function SpellSigil5({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      {/* Five radiating lines */}
      <path
        d="M16 16l0-12M16 16l-11.4 3.5M16 16l-7 9.7M16 16l7 9.7M16 16l11.4 3.5"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Inner pentagon */}
      <path
        d="M16 8l-7.6 5.5 2.9 8.5h9.4l2.9-8.5Z"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Terminal marks */}
      <circle cx="16" cy="4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="29.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="23" cy="29.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="27.4" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  )
}
