/* ============================================================================
   useAI — the component-facing half of "the AI may never block combat"
   ----------------------------------------------------------------------------
   `lib/ai.ts` bounds the transport: every request now carries a connect clock
   and an idle clock, so nothing can hang forever. That is necessary and it is
   not sufficient, because the thing that actually freezes the table is this
   hook's `loading` flag — CombatHelper disables its input and five buttons on
   it. Two ways that flag used to get stuck open:

   1. NO WAY OUT.  A request that is merely SLOW is now bounded, but eight
      seconds of a disabled panel is still eight seconds. There was no cancel,
      so the only exit was to wait. `cancel()` is that exit, and the reason the
      bound isn't the whole fix.

   2. THE SECOND ASK.  Ask, wait, ask again: two requests in flight, and the
      first one to finish wins `response` while the second clears `loading`.
      You get the answer to the question you didn't ask, in a panel that says
      it is done. Every entry point now aborts the one before it, and a
      generation counter means a superseded request cannot write state at all.

   THE CANCEL IS NOT AN ERROR. A cancelled request leaves `error` null and
   `response` untouched — nothing red flashes when you change your mind or
   close a sheet. It still rejects, because a caller awaiting a string that
   will never exist has to stop; callers that surface a thrown message should
   check `err instanceof AIError && err.kind === 'cancelled'` first.

   Unmounting cancels too. A sheet closed mid-question kills the question.
   ========================================================================== */
import { useState, useCallback, useRef, useEffect } from 'react'
import { AIError, queryAI, queryAIStructured, queryAIStream } from '../lib/ai'

interface UseAIReturn {
  response: string | null
  loading: boolean
  /** True while a streamed response is still growing */
  streaming: boolean
  error: string | null
  query: (systemPrompt: string, message: string) => Promise<string>
  /** Streaming query — `response` grows token by token; `loading` clears at first token */
  queryStream: (systemPrompt: string, message: string) => Promise<string>
  queryStructured: <T>(systemPrompt: string, message: string) => Promise<T>
  /** Abandon the request in flight, if any. Safe to call when there is none. */
  cancel: () => void
  clearResponse: () => void
}

export function useAI(): UseAIReturn {
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** The controller for the request in flight. */
  const abortRef = useRef<AbortController | null>(null)
  /** Bumped by every start and every cancel. A callback holding an older
   *  number is speaking for a request nobody is waiting for any more. */
  const genRef = useRef(0)

  /** Abort whatever is running, invalidate its callbacks, and hand back the
   *  number that identifies the request about to start. */
  const supersede = useCallback((): number => {
    abortRef.current?.abort()
    abortRef.current = null
    genRef.current += 1
    return genRef.current
  }, [])

  const cancel = useCallback(() => {
    if (!abortRef.current) return
    supersede()
    // The panel is usable again immediately — not when the socket notices.
    setLoading(false)
    setStreaming(false)
  }, [supersede])

  // A closed sheet is a cancelled question.
  useEffect(() => () => { abortRef.current?.abort() }, [])

  /** Every entry point is the same six lines around a different call, so they
   *  are the same six lines exactly once. `run` owns the generation check, and
   *  no state below it is written without one. */
  const run = useCallback(
    async <T>(
      body: (signal: AbortSignal, mine: number, current: () => boolean) => Promise<T>,
      onResult: (value: T) => void,
      opts?: { stream?: boolean },
    ): Promise<T> => {
      const mine = supersede()
      const controller = new AbortController()
      abortRef.current = controller
      const current = () => genRef.current === mine
      setLoading(true)
      if (opts?.stream) { setStreaming(true); setResponse(null) }
      setError(null)
      try {
        const result = await body(controller.signal, mine, current)
        if (current()) onResult(result)
        return result
      } catch (err) {
        // A cancel is a decision, not a fault. It gets no red text — and a
        // request that has already been superseded gets none either, because
        // the newer one owns the panel now.
        const cancelled = err instanceof AIError && err.kind === 'cancelled'
        if (current() && !cancelled) {
          setError(err instanceof Error ? err.message : 'AI query failed')
        }
        throw err
      } finally {
        if (current()) {
          abortRef.current = null
          setLoading(false)
          if (opts?.stream) setStreaming(false)
        }
      }
    },
    [supersede],
  )

  const query = useCallback(
    (systemPrompt: string, message: string): Promise<string> =>
      run(signal => queryAI(systemPrompt, message, undefined, signal), setResponse),
    [run],
  )

  const queryStream = useCallback(
    (systemPrompt: string, message: string): Promise<string> =>
      run(
        (signal, _mine, current) =>
          queryAIStream(
            systemPrompt,
            message,
            text => {
              if (!current()) return // a superseded stream must not paint
              setLoading(false) // first words have arrived — stop the "consulting" state
              setResponse(text)
            },
            undefined,
            signal,
          ),
        setResponse,
        { stream: true },
      ),
    [run],
  )

  const queryStructuredFn = useCallback(
    <T,>(systemPrompt: string, message: string): Promise<T> =>
      run<T>(
        signal => queryAIStructured<T>(systemPrompt, message, undefined, signal),
        result => setResponse(JSON.stringify(result)),
      ),
    [run],
  )

  const clearResponse = useCallback(() => {
    setResponse(null)
    setError(null)
  }, [])

  return {
    response,
    loading,
    streaming,
    error,
    query,
    queryStream,
    queryStructured: queryStructuredFn,
    cancel,
    clearResponse,
  }
}
