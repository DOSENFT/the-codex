/* ============================================================================
   ai.coldstart.test.ts — the five point seven seconds
   ----------------------------------------------------------------------------
   Marcus, 2026-09-09: "still haveing ollama trouble, falls back to gemini, and
   gemini just sucks."

   His setup was not the problem. Measured in the same sitting, against the
   deployed site: Ollama up, one model (gemma3-27b-abliterated, 16.5 GB),
   OLLAMA_ORIGINS already set to https://dosenft.github.io, a Tailscale https
   tunnel already serving it, HTTP 200 in 0.037s, and a CORS preflight that
   answered with the right Access-Control-Allow-Origin. A real generation
   through that tunnel returned a correct D&D answer at ~37 tok/s.

   Then the model was deliberately unloaded (`keep_alive: 0`) and the first
   request timed with a stopwatch:

       TTFB 13.701s   total 14.737s   (load_duration 14.18s)

   `AI_TIMEOUTS.connectMs` was 8_000, shared by all three providers, under a
   comment asserting eight seconds "is long enough for a cold 27B model to be
   loaded off disk by the server process". It is not. The app was hanging up on
   a machine that was already answering, and handing his table Gemini instead.

   These tests are written against that number. MEASURED_COLD_TTFB_MS is a
   reading, not a preference, and every assertion here is either a fact about
   his rig or a fact about the two clocks being kept apart.
   ========================================================================== */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIError, AI_TIMEOUTS, connectMsFor, queryAI, type AIConfig } from './ai'

/** The stopwatch reading from Marcus's rig, 2026-09-09. See the header. */
const MEASURED_COLD_TTFB_MS = 13_701

const OLLAMA: AIConfig = {
  provider: 'ollama',
  ollamaUrl: 'http://ollama.test:11434',
  ollamaModel: 'gemma3-27b-abliterated:latest',
  fallbackEnabled: false,
}

const GEMINI: AIConfig = {
  provider: 'gemini',
  geminiApiKey: 'k',
  // Pinned so the call under test is the generate call, not a model-list probe.
  geminiModel: 'gemini-not-a-real-model-9.9',
  fallbackEnabled: false,
}

/** A server that accepts the connection and answers its headers `afterMs`
 *  later — which is precisely what a local model loading off disk looks like
 *  from the browser, and is NOT what a wrong address looks like. A wrong
 *  address rejects the fetch outright and never reaches a clock. */
function answersAfter(afterMs: number, body: unknown) {
  return (_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(
        () => resolve(new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })),
        afterMs,
      )
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        const err = new Error('The operation was aborted.')
        err.name = 'AbortError'
        reject(err)
      }, { once: true })
    })
}

const OLLAMA_BODY = { message: { content: 'Nix rolls a 17.' } }
const GEMINI_BODY = { candidates: [{ content: { parts: [{ text: 'Nix rolls a 17.' }] } }] }

/** Run one query on fake timers, walking the clock until it settles.
 *
 *  Stepped rather than jumped: an intervening timeout must be allowed to fire
 *  in its own order, or the test would "prove" the abort never happened by
 *  never reaching the moment it would have. `maxMs` is a stop, not a schedule
 *  — the Gemini path can retry itself once, and this walks through that too. */
async function withClock<T>(maxMs: number, run: () => Promise<T>): Promise<T> {
  let done = false
  const settled = run().finally(() => { done = true })
  for (let t = 0; t < maxMs && !done; t += 250) await vi.advanceTimersByTimeAsync(250)
  return await settled
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

/* ─── the pairing, as a pure function ────────────────────────────────────── */

describe('connectMsFor — a local model is not a cloud endpoint', () => {
  it('gives Ollama more than his measured cold load', () => {
    // THE BUG, as one line. The old shared default was 8_000 and his cold
    // start is 13_701: the app gave up 5.7 seconds before the answer.
    expect(connectMsFor('ollama', OLLAMA)).toBeGreaterThan(MEASURED_COLD_TTFB_MS)
  })

  it('leaves the cloud clock short, because a cloud front door is not loading anything', () => {
    expect(connectMsFor('gemini', GEMINI)).toBe(AI_TIMEOUTS.connectMs)
    expect(connectMsFor('openrouter', { provider: 'openrouter' })).toBe(AI_TIMEOUTS.connectMs)
    // The fix must not have been "make every clock longer". A wrong Gemini key
    // pointed at a black hole still has to fail like a blip.
    expect(AI_TIMEOUTS.connectMs).toBeLessThan(AI_TIMEOUTS.ollamaConnectMs)
  })

  it('is decided by who is being called, not by who is in the config', () => {
    // The normal fallback case: his config says ollama, this request is going
    // to Google. Reading the provider off the config would hand Gemini the
    // cold-model budget and — the half that actually bites — hand a fallback
    // Ollama the cloud one.
    expect(connectMsFor('gemini', OLLAMA)).toBe(AI_TIMEOUTS.connectMs)
    expect(connectMsFor('ollama', GEMINI)).toBe(AI_TIMEOUTS.ollamaConnectMs)
  })

  it('an explicit clock still wins, because that is how the chain stays inside its budget', () => {
    expect(connectMsFor('ollama', { ...OLLAMA, connectTimeoutMs: 60 })).toBe(60)
    expect(connectMsFor('gemini', { ...GEMINI, connectTimeoutMs: 60 })).toBe(60)
  })
})

/* ─── the same thing, through a real request ─────────────────────────────── */

describe('a cold local model gets its answer through', () => {
  it('waits out his measured 13.7s cold start instead of falling back', async () => {
    vi.stubGlobal('fetch', vi.fn(answersAfter(MEASURED_COLD_TTFB_MS, OLLAMA_BODY)))
    const text = await withClock(MEASURED_COLD_TTFB_MS + 500, () => queryAI('sys', 'msg', OLLAMA))
    expect(text).toBe('Nix rolls a 17.')
  })

  it('is still a clock, not a licence to hang', async () => {
    vi.stubGlobal('fetch', vi.fn(answersAfter(AI_TIMEOUTS.ollamaConnectMs + 5_000, OLLAMA_BODY)))
    const err = await withClock(AI_TIMEOUTS.ollamaConnectMs + 1_000,
      () => queryAI('sys', 'msg', OLLAMA).catch(e => e)) as AIError
    expect(err).toBeInstanceOf(AIError)
    expect(err.kind).toBe('timeout')
  })

  it('does not extend the same patience to a silent Google', async () => {
    // If this ever goes green, the fix leaked: the cloud clock was lengthened
    // along with the local one and a dead key now freezes the panel.
    vi.stubGlobal('fetch', vi.fn(answersAfter(MEASURED_COLD_TTFB_MS, GEMINI_BODY)))
    const err = await withClock(60_000,
      () => queryAI('sys', 'msg', GEMINI).catch(e => e)) as AIError
    expect(err).toBeInstanceOf(AIError)
    expect(err.kind).toBe('timeout')
  })
})
