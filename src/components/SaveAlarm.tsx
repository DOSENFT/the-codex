/* ============================================================================
   SaveAlarm
   ----------------------------------------------------------------------------
   The one thing the app must never do quietly is fail to save.

   Measured 2026-08-23 under TABLE-READY D-5: with storage full, every spend
   threw an uncaught `QuotaExceededError`, the surface unwound to its error
   boundary, and Marcus was told nothing about the write. The previous save was
   intact on disk — so the character was never actually lost — but there was no
   way to know that from the table, and the obvious reading of a screen that
   keeps working is "it saved".

   Like ErrorBoundary's fallback, this depends on no design token and no
   stylesheet: the situation it renders in is the situation where the device is
   refusing to cooperate, and a banner that needs the CSS to have loaded is a
   banner that is not there when it is needed. It carries the app's own type —
   Cinzel over IBM Plex — because it is part of the app, not a browser dialog.

   It is not dismissible by tapping outside, it does not time out, and it does
   not cover the sheet: at the table Marcus keeps playing, and the alarm keeps
   standing until he acknowledges it.
   ========================================================================== */

interface Props {
  /** The player-facing reason. Null while nothing is wrong. */
  reason: string | null
  onDismiss: () => void
}

export function SaveAlarm({ reason, onDismiss }: Props) {
  if (!reason) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        zIndex: 2147483000,
        margin: '0 auto',
        maxWidth: 520,
        padding: '16px 18px 14px',
        borderRadius: 12,
        background: '#1a0f0c',
        border: '1px solid #8a3b22',
        boxShadow: '0 18px 44px rgba(0,0,0,0.62)',
        color: '#f0e6d3',
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
        fontSize: 15,
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 22,
          letterSpacing: '0.01em',
          color: '#e08a5c',
          marginBottom: 8,
        }}
      >
        Not saved
      </div>
      <p style={{ margin: '0 0 14px' }}>{reason}</p>
      <button
        onClick={onDismiss}
        style={{
          minHeight: 48,
          minWidth: 48,
          width: '100%',
          padding: '0 22px',
          borderRadius: 8,
          border: '1px solid #e08a5c',
          background: 'transparent',
          color: '#e08a5c',
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >
        I understand
      </button>
    </div>
  )
}

export default SaveAlarm
