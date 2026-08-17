/* ============================================================================
   ai.test.ts — the first tests this module has ever had
   ----------------------------------------------------------------------------
   `lib/ai.ts` was the only load-bearing module in the app with no test file,
   and it is where the fallback switch quietly stopped working: a `A && B && C
   ? x : y` that reads correctly and parses as `(A && B && C) ? x : y`, so
   `fallbackEnabled: false` selected the truthy branch and called Gemini anyway.
   Nobody caught it by reading it. The first test below catches it.

   Everything here drives real code through a stubbed `fetch`. No mock of the
   module under test, and no test that would pass against the old version:
   `canFallBack` did not exist, the clocks did not exist, and the key was in
   the query string.

   Timeouts are set per-config in milliseconds rather than faked, so the clock
   tests exercise the same `setTimeout` path production does. The one exception
   is the 429 retry cap, which is twenty seconds by design.
   ========================================================================== */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AIError,
  AI_TIMEOUTS,
  canFallBack,
  fetchOllamaModels,
  loadAIConfig,
  queryAI,
  queryAIStream,
  queryAIStructured,
  getLastUsedProvider,
  type AIConfig,
} from './ai'

/* ─── harness ────────────────────────────────────────────────────────────── */

const OLLAMA: AIConfig = {
  provider: 'ollama',
  ollamaUrl: 'http://ollama.test:11434',
  ollamaModel: 'test-model',
  fallbackEnabled: false,
  connectTimeoutMs: 60,
  idleTimeoutMs: 80,
}

const GEMINI: AIConfig = {
  provider: 'gemini',
  geminiApiKey: 'test-key-abc123',
  geminiModel: 'gemini-2.0-flash',
  fallbackEnabled: false,
  connectTimeoutMs: 60,
  idleTimeoutMs: 80,
}

interface Call { url: string; init: RequestInit }
let calls: Call[] = []

/** Install a fetch stub. The handler gets the URL and returns a Response, or a
 *  promise that never settles — which is the interesting case, because that is
 *  a model host that accepted the connection and then said nothing. */
function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    calls.push({ url, init })
    const signal = init.signal
    // A real fetch rejects with an AbortError when its signal fires. A stub
    // that ignores the signal would make every timeout test pass for the wrong
    // reason — it would be the test's own clock, not the module's.
    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }))
      if (signal?.aborted) return onAbort()
      signal?.addEventListener('abort', onAbort, { once: true })
      Promise.resolve(handler(url, init)).then(resolve, reject)
    })
  })
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ollamaSaid = (text: string) => jsonResponse({ message: { content: text } })

/** An NDJSON body whose chunks arrive on a schedule, so the idle clock has
 *  something real to be restarted by. */
function trickle(chunks: string[], gapMs: number): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      for (const c of chunks) {
        await new Promise(r => setTimeout(r, gapMs))
        controller.enqueue(enc.encode(JSON.stringify({ message: { content: c } }) + '\n'))
      }
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

const never = () => new Promise<Response>(() => {})

beforeEach(() => { calls = [] })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

/* ─── the fallback decision ──────────────────────────────────────────────── */

describe('canFallBack — the switch that did not switch', () => {
  const configured: AIConfig = { ...OLLAMA, geminiApiKey: 'k', fallbackEnabled: false }

  it('obeys fallbackEnabled:false even when the other provider is fully configured', () => {
    // THE BUG. The old expression evaluated this to true, so turning fallback
    // off in Settings did nothing and a "local only" setup silently phoned
    // Google. Everything else in this describe is the behaviour that made the
    // bug invisible: with fallback ON, all of these are true.
    expect(canFallBack(configured, new AIError('network', 'dead'))).toBe(false)
    expect(canFallBack(configured, new AIError('timeout', 'slow'))).toBe(false)
    expect(canFallBack(configured, new Error('anything at all'))).toBe(false)
  })

  it('falls back on a dead host, a timeout, a 429 and a 500', () => {
    const on = { ...configured, fallbackEnabled: true }
    expect(canFallBack(on, new AIError('network', 'refused'))).toBe(true)
    expect(canFallBack(on, new AIError('timeout', 'silent'))).toBe(true)
    expect(canFallBack(on, new AIError('api', 'rate limited', 429))).toBe(true)
    expect(canFallBack(on, new AIError('api', 'server error', 500))).toBe(true)
  })

  it('never falls back on a cancel or a missing credential', () => {
    const on = { ...configured, fallbackEnabled: true }
    // A cancel is a decision. Routing around it would restart the very thing
    // the user just stopped, on the other provider, at their expense.
    expect(canFallBack(on, new AIError('cancelled', 'Stopped.'))).toBe(false)
    expect(canFallBack(on, new AIError('config', 'no key'))).toBe(false)
  })

  it('will not fall back to a provider that is not configured', () => {
    expect(canFallBack({ ...OLLAMA, fallbackEnabled: true }, new AIError('network', 'x'))).toBe(false)
    expect(canFallBack({ ...GEMINI, fallbackEnabled: true }, new AIError('network', 'x'))).toBe(false)
    expect(canFallBack({ ...GEMINI, fallbackEnabled: true, ollamaUrl: 'http://x' }, new AIError('network', 'x')))
      .toBe(false) // a URL with no model is not a configured provider
  })
})

/* ─── the clocks ─────────────────────────────────────────────────────────── */

describe('the clocks — nothing waits forever', () => {
  it('gives up on a host that accepts the connection and says nothing', async () => {
    stubFetch(never)
    const started = Date.now()
    const err = await queryAI('sys', 'msg', OLLAMA).catch(e => e)
    expect(err).toBeInstanceOf(AIError)
    expect((err as AIError).kind).toBe('timeout')
    // The bound is what ended it, not the test giving up.
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('says so in words a person at a table can act on', async () => {
    stubFetch(never)
    const err = await queryAI('sys', 'msg', OLLAMA).catch(e => e) as AIError
    expect(err.message).toContain('Combat is unaffected')
  })

  it('does NOT cut off a slow model that is still producing words', async () => {
    // Six chunks, 30ms apart: 180ms total, well past both the 60ms connect
    // clock and the 80ms idle clock. A single total-budget timeout would kill
    // this — which is exactly what a 27B model writing three paragraphs looks
    // like. Silence is the failure; slowness is not.
    stubFetch(() => trickle(['a', 'b', 'c', 'd', 'e', 'f'], 30))
    const seen: string[] = []
    const result = await queryAIStream('sys', 'msg', t => seen.push(t), OLLAMA)
    expect(result).toBe('abcdef')
    expect(seen.length).toBe(6)
  })

  it('an external cancel beats the clock and is reported as a cancel', async () => {
    stubFetch(never)
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)
    const err = await queryAI('sys', 'msg', OLLAMA, controller.signal).catch(e => e) as AIError
    expect(err.kind).toBe('cancelled')
  })

  it('bounds the model-list probe too, so typing a URL cannot hang Settings', async () => {
    stubFetch(never)
    const err = await fetchOllamaModels('http://nowhere.test:11434', undefined, 60).catch(e => e) as AIError
    expect(err.kind).toBe('timeout')
  })
})

/* ─── credentials ────────────────────────────────────────────────────────── */

describe('credentials', () => {
  it('refuses before it reaches the network, not after Google says 400', async () => {
    stubFetch(() => jsonResponse({}))
    const err = await queryAI('sys', 'msg', { ...GEMINI, geminiApiKey: undefined }).catch(e => e) as AIError
    expect(err.kind).toBe('config')
    expect(err.message).toContain('Settings')
    expect(calls).toHaveLength(0) // the old code sent `?key=undefined`
  })

  it('puts the Gemini key in a header and NEVER in the URL', async () => {
    stubFetch(() => jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
    await queryAI('sys', 'msg', GEMINI)
    expect(calls).toHaveLength(1)
    // Browser history, proxy logs, Referer headers and screenshots of a network
    // tab all record URLs. None of them may record this.
    expect(calls[0].url).not.toContain('key=')
    expect(calls[0].url).not.toContain(GEMINI.geminiApiKey!)
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('test-key-abc123')
  })

  it('keeps the key out of the streaming URL as well', async () => {
    stubFetch(() => new Response('data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}\n\n', { status: 200 }))
    await queryAIStream('sys', 'msg', () => {}, GEMINI)
    expect(calls[0].url).not.toContain('key=')
    expect((calls[0].init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key-abc123')
  })
})

/* ─── fallback, end to end ───────────────────────────────────────────────── */

describe('fallback in practice', () => {
  it('switches providers when the primary is dead, and reports who answered', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? Promise.reject(new TypeError('fetch failed'))
        : jsonResponse({ candidates: [{ content: { parts: [{ text: 'gemini answered' }] } }] }))
    const cfg: AIConfig = { ...OLLAMA, geminiApiKey: 'k', fallbackEnabled: true }
    expect(await queryAI('sys', 'msg', cfg)).toBe('gemini answered')
    expect(getLastUsedProvider()).toBe('gemini')
  })

  it('does not switch when the switch is off — it fails honestly instead', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? Promise.reject(new TypeError('fetch failed'))
        : jsonResponse({ candidates: [{ content: { parts: [{ text: 'should never be read' }] } }] }))
    const cfg: AIConfig = { ...OLLAMA, geminiApiKey: 'k', fallbackEnabled: false }
    const err = await queryAI('sys', 'msg', cfg).catch(e => e) as AIError
    expect(err.kind).toBe('network')
    expect(calls.every(c => c.url.includes('ollama.test'))).toBe(true)
  })

  it('reports the PRIMARY failure when the fallback fails too', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')))
    const cfg: AIConfig = { ...OLLAMA, geminiApiKey: 'k', fallbackEnabled: true }
    const err = await queryAI('sys', 'msg', cfg).catch(e => e) as AIError
    expect(err.message).toContain('Ollama')
  })
})

/* ─── streaming ──────────────────────────────────────────────────────────── */

describe('streaming', () => {
  it('re-throws a cancel instead of quietly restarting non-streamed', async () => {
    // The stream falls back to the non-streaming pipeline when nothing arrived.
    // A cancel arrives as "nothing arrived", so without the guard, pressing
    // Stop started the whole request again on the slow path.
    stubFetch(never)
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)
    const err = await queryAIStream('sys', 'msg', () => {}, OLLAMA, controller.signal).catch(e => e) as AIError
    expect(err.kind).toBe('cancelled')
    expect(calls).toHaveLength(1) // one attempt. Not two.
  })

  it('falls back to the non-streaming path when the gateway refuses to stream', async () => {
    // The realistic shape of this: a proxy in front of Ollama that answers the
    // chat endpoint fine but 400s a `"stream": true` body, or strips the
    // chunked response. That is a fact about streaming, not about the host, so
    // the plain endpoint is worth trying.
    stubFetch((_url, init) => {
      const streaming = JSON.parse(String(init.body)).stream === true
      return streaming ? jsonResponse({ error: 'streaming unsupported' }, 400) : ollamaSaid('the slow path answered')
    })
    const out = await queryAIStream('sys', 'msg', () => {}, OLLAMA)
    expect(out).toBe('the slow path answered')
    expect(calls).toHaveLength(2)
  })

  it('a dead host costs ONE clock, not two', async () => {
    // Before this, a timed-out stream was handed to the non-streaming path,
    // which put a second full bound on the same dead address. Eight seconds of
    // promised patience became sixteen seconds of a frozen panel.
    stubFetch(never)
    const started = Date.now()
    const err = await queryAIStream('sys', 'msg', () => {}, OLLAMA).catch(e => e) as AIError
    expect(err.kind).toBe('timeout')
    expect(calls).toHaveLength(1)
    expect(Date.now() - started).toBeLessThan(OLLAMA.connectTimeoutMs! * 2)
  })

  it('...but a dead host DOES still reach the other provider when one is set', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? never()
        : jsonResponse({ candidates: [{ content: { parts: [{ text: 'gemini caught it' }] } }] }))
    const seen: string[] = []
    const out = await queryAIStream('sys', 'msg', t => seen.push(t), { ...OLLAMA, geminiApiKey: 'k', fallbackEnabled: true })
    expect(out).toBe('gemini caught it')
    expect(seen).toEqual(['gemini caught it']) // the panel is painted, not left blank
  })
})

/* ─── structured output ──────────────────────────────────────────────────── */

describe('queryAIStructured', () => {
  it('reads JSON wrapped in a markdown fence', async () => {
    stubFetch(() => ollamaSaid('```json\n{"hp": 12}\n```'))
    expect(await queryAIStructured<{ hp: number }>('sys', 'msg', OLLAMA)).toEqual({ hp: 12 })
  })

  it('turns a chatty model into a named error, not a raw SyntaxError', async () => {
    stubFetch(() => ollamaSaid('Sure! Here is what I think about your character...'))
    const err = await queryAIStructured('sys', 'msg', OLLAMA).catch(e => e)
    expect(err).toBeInstanceOf(AIError)
    expect((err as AIError).kind).toBe('api')
    expect((err as AIError).message).toContain('Sure!')
  })
})

/* ─── config ─────────────────────────────────────────────────────────────── */

describe('loadAIConfig', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    })
  })

  it('survives a config truncated by a browser killed mid-write', () => {
    // Several components call this during render. A SyntaxError here used to
    // be a blank screen, over a stored *preference*.
    store.set('codex-ai-config', '{"provider":"ollama","ollamaUr')
    expect(() => loadAIConfig()).not.toThrow()
    expect(loadAIConfig().provider).toBe('ollama')
  })

  it('survives a config that is valid JSON but not an object', () => {
    store.set('codex-ai-config', '"gemini"')
    expect(loadAIConfig().provider).toBe('ollama')
  })

  it('leaves a URL Marcus typed exactly as he typed it', () => {
    store.set('codex-ai-config', JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://tailscale-box:11434' }))
    expect(loadAIConfig().ollamaUrl).toBe('http://tailscale-box:11434')
  })

  it('defaults fallback on for a config saved before the setting existed', () => {
    store.set('codex-ai-config', JSON.stringify({ provider: 'ollama' }))
    expect(loadAIConfig().fallbackEnabled).toBe(true)
  })
})

/* ─── the rate-limit retry ───────────────────────────────────────────────── */

describe('the 429 retry', () => {
  it('clamps an upstream that asks to be retried in an hour', async () => {
    // Gemini's advice about how long to wait arrives over the network. An
    // upstream that says "3600s" must not be able to park the panel for an
    // hour, so it is clamped to retryCapMs before it is obeyed.
    vi.useFakeTimers()
    let attempt = 0
    stubFetch(() => {
      attempt++
      if (attempt === 1) {
        return jsonResponse({ error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3600s' }] } }, 429)
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: 'second time lucky' }] } }] })
    })
    // Timeouts are left at the real defaults here: the point is the retry
    // delay, and the 30s idle clock must not be what ends the wait.
    const cfg: AIConfig = { provider: 'gemini', geminiApiKey: 'k', geminiModel: 'gemini-2.0-flash', fallbackEnabled: false }
    const pending = queryAI('sys', 'msg', cfg)
    await vi.advanceTimersByTimeAsync(AI_TIMEOUTS.retryCapMs + 50)
    expect(await pending).toBe('second time lucky')
    expect(attempt).toBe(2)
  })
})
