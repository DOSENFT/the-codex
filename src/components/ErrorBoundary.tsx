import { Component, type ErrorInfo, type ReactNode } from 'react'

/* ============================================================================
   ErrorBoundary
   ----------------------------------------------------------------------------
   There was no error boundary anywhere in the trunk, which means one throw in
   the Toybox white-screened the whole app — mid-combat, at the table, with
   five people waiting.  That is guardrail #2 in the product doc: "times the
   app showed a blank screen or lost state mid-session: target 0."

   One boundary per top-level surface, so a surface can fail alone.  The
   fallback is deliberately plain and depends on no design token, because the
   one situation it renders in is the situation where something is broken.
   ========================================================================== */

interface Props {
  /** Named in the fallback so Marcus can tell us which surface died. */
  surface: string
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console rather than sent anywhere — the app is local-first
    // and there is nowhere to send it to.
    console.error(`[Codex] ${this.props.surface} crashed`, error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          margin: '24px auto',
          maxWidth: 560,
          padding: 22,
          borderRadius: 10,
          background: '#12110e',
          border: '1px solid #3a3327',
          color: '#f0e6d3',
          fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        <div
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 22,
            color: '#c5a55a',
            marginBottom: 10,
          }}
        >
          {this.props.surface} stopped
        </div>
        <p style={{ margin: '0 0 14px' }}>
          The rest of the app is still running — your character and this encounter are
          saved. Try this screen again, or switch tabs and come back.
        </p>
        <pre
          style={{
            margin: '0 0 16px',
            padding: 11,
            borderRadius: 6,
            background: '#0a0a08',
            color: '#8b8578',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message || String(error)}
        </pre>
        <button
          onClick={this.reset}
          style={{
            minHeight: 48,
            padding: '0 22px',
            borderRadius: 6,
            border: '1px solid #c5a55a',
            background: 'transparent',
            color: '#c5a55a',
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
