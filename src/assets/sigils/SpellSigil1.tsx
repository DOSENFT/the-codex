/** 1st Level Sigil — Single stroke: a quill mark with an eye/loop at top.
 *  The simplest mark. One element. Prima materia. */
export function SpellSigil1({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" className={className} aria-hidden>
      <path
        d="M16 4c-1.5 2-2.5 4-2.5 6a2.5 2.5 0 0 0 5 0c0-2-1-4-2.5-6ZM16 14v14"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
