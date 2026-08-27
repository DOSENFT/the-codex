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
  clearModelNotice,
  describeGeminiModel,
  fetchOllamaModels,
  getLastModelNotice,
  listGeminiModels,
  loadAIConfig,
  queryAI,
  queryAIStream,
  queryAIStructured,
  rankGeminiModels,
  replacementFromError,
  resolveGeminiModel,
  getLastUsedProvider,
  type AIConfig,
} from './ai'

/* ─── harness ────────────────────────────────────────────────────────────── */

/** A model id Google has never shipped.
 *
 *  Every Gemini id in this file is deliberately fictional. If a test passed
 *  because the code recognised a real model name, the code would be doing the
 *  one thing slice 3 removed — knowing model names — and the test would be
 *  certifying it. Nothing here may match by name. */
const TEST_MODEL = 'gemini-4.2-flash'

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
  geminiModel: TEST_MODEL,
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

/** localStorage, in memory.
 *
 *  Vitest runs this suite in node, where there is none, and `ai.ts` catches
 *  that and treats it as "nothing stored" — which was fine until slice 3, when
 *  the module gained a model-list cache and a persisted winner. Both are
 *  storage behaviour, and behaviour that is always swallowed is behaviour that
 *  is never tested. */
function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size },
  }
}
let store: ReturnType<typeof memoryStorage>

/** The model list, already answered and still fresh.
 *
 *  Without this, every Gemini test in this file would spend its first fetch on
 *  `GET /v1beta/models` and every call-counting assertion below would be
 *  counting the wrong thing. Seeding it is also the honest simulation of the
 *  normal case: the list is asked for once a day, not once a turn. */
function seedModelCache(models: string[] = [TEST_MODEL]) {
  store.setItem('codex-ai-models', JSON.stringify({ fetchedAt: Date.now(), models }))
}

beforeEach(() => {
  calls = []
  store = memoryStorage()
  vi.stubGlobal('localStorage', store)
  seedModelCache()
})
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
    const cfg: AIConfig = { provider: 'gemini', geminiApiKey: 'k', geminiModel: TEST_MODEL, fallbackEnabled: false }
    const pending = queryAI('sys', 'msg', cfg)
    await vi.advanceTimersByTimeAsync(AI_TIMEOUTS.retryCapMs + 50)
    expect(await pending).toBe('second time lucky')
    expect(attempt).toBe(2)
  })
})

/* ═══ Table Truth slice 3 — the model the app must not know ═══════════════════

   Marcus, 2026-08-26, with the error in hand:

       "connection failed: Gemini error (404): {"error":{"code":404,
       "message": "This model models/… is no longer available. Please update
       your code to use models/… for the latest features and improvemen…"

   Every AI feature in the app was dead, and the fix was inside the error that
   reported the death. These tests are the contract that it never happens
   twice: nothing below matches a real model name, and the one test that greps
   the tree fails the moment a name is compiled back in.
   ========================================================================== */

const NEXT_MODEL = 'gemini-5.0-flash'

/** Marcus's verbatim 404, with the two ids swapped for ones Google has never
 *  shipped. The SENTENCE is what is parsed, so the sentence is what is
 *  preserved; the ids are fictional so no test can pass by recognition. */
const retiredBody = (dead: string, live: string) => JSON.stringify({
  error: {
    code: 404,
    message: `This model models/${dead} is no longer available. Please update your code to use models/${live} for the latest features and improvements.`,
    status: 'NOT_FOUND',
  },
})

const modelList = (ids: string[]) => jsonResponse({
  models: ids.map(id => ({
    name: `models/${id}`,
    supportedGenerationMethods: ['generateContent', 'countTokens'],
  })),
})

const isListCall = (c: Call) => c.url.includes('/v1beta/models?')
const isGenerateCall = (c: Call) => c.url.includes(':generateContent')

describe('replacementFromError — the fix was in the error all along', () => {
  it('reads the REPLACEMENT, not the retired model that is named first', () => {
    // The same sentence contains both ids. A greedy match for `models/…` finds
    // the dead one and retries it forever, which is a loop that looks like a fix.
    expect(replacementFromError(retiredBody(TEST_MODEL, NEXT_MODEL))).toBe(NEXT_MODEL)
  })

  it('handles the wording without the models/ prefix', () => {
    expect(replacementFromError(`use ${NEXT_MODEL} instead`)).toBe(NEXT_MODEL)
  })

  it('is null when there is nothing to read — no guess, ever', () => {
    expect(replacementFromError(undefined)).toBeNull()
    expect(replacementFromError('')).toBeNull()
    expect(replacementFromError('{"error":{"code":429,"message":"Quota exceeded"}}')).toBeNull()
    // Names a dead model and offers no replacement: still null. Retrying the id
    // in "This model models/X is no longer available" is the loop.
    expect(replacementFromError(`This model models/${TEST_MODEL} is no longer available.`)).toBeNull()
  })
})

describe('rankGeminiModels — by shape, never by name', () => {
  it('puts the newest plain flash first, then flash-lite, then pro', () => {
    const ranked = rankGeminiModels([
      'gemini-3.0-pro',
      'gemini-4.2-flash-lite',
      'gemini-4.2-flash',
      'gemini-3.1-flash',
    ])
    expect(ranked).toEqual([
      'gemini-4.2-flash',       // newest plain flash
      'gemini-3.1-flash',       // older plain flash still beats a lite
      'gemini-4.2-flash-lite',
      'gemini-3.0-pro',
    ])
  })

  it('demotes preview and experimental builds below their stable siblings', () => {
    const ranked = rankGeminiModels(['gemini-9.9-flash-preview', 'gemini-4.2-flash'])
    expect(ranked[0]).toBe('gemini-4.2-flash')
    // Demoted, NOT dropped — a key that can only see preview builds must still
    // resolve to something. A ranking may prefer; it may not decide that
    // something does not exist.
    expect(ranked).toContain('gemini-9.9-flash-preview')
  })

  it('drops what is not a Gemini generative model at all', () => {
    expect(rankGeminiModels(['text-embedding-004', 'gemma-3-27b', 'gemini-4.2-flash']))
      .toEqual(['gemini-4.2-flash'])
  })

  it('has an answer for an unnumbered id rather than crashing on it', () => {
    expect(rankGeminiModels(['gemini-flash-latest'])).toEqual(['gemini-flash-latest'])
  })
})

describe('describeGeminiModel — a label derived, not stored', () => {
  it('titles an id a person can read', () => {
    expect(describeGeminiModel('gemini-4.2-flash').label).toBe('Gemini 4.2 Flash')
    expect(describeGeminiModel('gemini-4.2-flash-lite').label).toBe('Gemini 4.2 Flash Lite')
    expect(describeGeminiModel('gemini-1.5-flash-8b').label).toBe('Gemini 1.5 Flash 8B')
  })

  it('describes a model it has never seen before', () => {
    // The whole point: an id invented after this code shipped still gets a
    // label and a quota note, because both are functions of the id.
    const m = describeGeminiModel('gemini-11.0-flash')
    expect(m.label).toBe('Gemini 11.0 Flash')
    expect(m.description).toMatch(/free quota/i)
  })
})

describe('listGeminiModels — ask the key what it can reach', () => {
  it('keeps only what can generate content, and strips the models/ prefix', async () => {
    stubFetch(() => jsonResponse({
      models: [
        { name: `models/${TEST_MODEL}`, supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/some-counter', supportedGenerationMethods: ['countTokens'] },
      ],
    }))
    expect(await listGeminiModels('key-abc')).toEqual([TEST_MODEL])
  })

  it('sends the key in a header, never in the URL', async () => {
    stubFetch(() => modelList([TEST_MODEL]))
    await listGeminiModels('secret-key-value')
    expect(calls[0].url).not.toContain('secret-key-value')
    expect((calls[0].init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key-value')
  })
})

describe('resolveGeminiModel — 21: never a hardcoded id when the list is available', () => {
  it('picks the best from the LIVE list when the stored choice is gone', async () => {
    store.clear()
    stubFetch(() => modelList(['gemini-7.7-flash', 'gemini-7.7-pro']))
    const chosen = await resolveGeminiModel({ ...GEMINI, geminiModel: 'gemini-0.1-retired' })
    // It must be one the server named. Nothing in `src/` may supply an id.
    expect(['gemini-7.7-flash', 'gemini-7.7-pro']).toContain(chosen)
    expect(chosen).toBe('gemini-7.7-flash')
  })

  it('keeps his choice when the key can still reach it', async () => {
    store.clear()
    stubFetch(() => modelList([TEST_MODEL, 'gemini-9.0-flash']))
    // A newer one exists and is NOT chosen for him. Picking by pattern is what
    // happens when there is no answer, not an override of one he gave.
    expect(await resolveGeminiModel({ ...GEMINI, geminiModel: TEST_MODEL })).toBe(TEST_MODEL)
  })

  it('caches the list, so a turn does not cost two requests', async () => {
    store.clear()
    stubFetch(() => modelList([TEST_MODEL]))
    await resolveGeminiModel({ ...GEMINI, geminiModel: '' })
    await resolveGeminiModel({ ...GEMINI, geminiModel: '' })
    expect(calls.filter(isListCall)).toHaveLength(1)
  })

  it('falls back to the stored choice when Google cannot be asked at all', async () => {
    store.clear()
    stubFetch(() => { throw new Error('offline') })
    // His assertion beats our silence — the same rule the Ollama URL follows.
    expect(await resolveGeminiModel({ ...GEMINI, geminiModel: TEST_MODEL })).toBe(TEST_MODEL)
  })

  it('says so rather than inventing an id when there is nothing to go on', async () => {
    store.clear()
    stubFetch(() => { throw new Error('offline') })
    await expect(resolveGeminiModel({ ...GEMINI, geminiModel: '' })).rejects.toThrow(/Could not ask Google/)
  })

  it('is a config error, not an API error, with no key', async () => {
    await expect(resolveGeminiModel({ ...GEMINI, geminiApiKey: undefined }))
      .rejects.toMatchObject({ kind: 'config' })
  })
})

describe('the retirement retry — 19 and 20', () => {
  it('19 — a 404 naming a replacement retries exactly once, with that name', async () => {
    clearModelNotice()
    stubFetch((url) => {
      if (url.includes('/v1beta/models?')) return modelList([NEXT_MODEL])
      if (url.includes(`${TEST_MODEL}:generateContent`)) {
        return new Response(retiredBody(TEST_MODEL, NEXT_MODEL), { status: 404 })
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: 'back from the dead' }] } }] })
    })

    expect(await queryAI('sys', 'msg', GEMINI)).toBe('back from the dead')

    const generates = calls.filter(isGenerateCall)
    expect(generates).toHaveLength(2)                          // once, not twice, not none
    expect(generates[0].url).toContain(TEST_MODEL)
    expect(generates[1].url).toContain(NEXT_MODEL)

    // The winner is remembered, so tomorrow starts on it instead of rediscovering
    // the retirement at a table.
    expect(JSON.parse(store.getItem('codex-ai-config')!).geminiModel).toBe(NEXT_MODEL)
    // And the switch is not silent.
    expect(getLastModelNotice()).toContain(NEXT_MODEL)
  })

  it('20 — a second 404 surfaces the error and does not loop', async () => {
    stubFetch((url) => {
      if (url.includes('/v1beta/models?')) return modelList([NEXT_MODEL])
      return new Response(retiredBody(TEST_MODEL, NEXT_MODEL), { status: 404 })
    })

    await expect(queryAI('sys', 'msg', GEMINI)).rejects.toThrow(/404/)
    expect(calls.filter(isGenerateCall)).toHaveLength(2)   // the try and the one retry. No third.
  })

  it('20b — a replacement identical to the model that just failed is not retried', async () => {
    // Google naming the model that just 404'd is the loop, and it is closed by
    // the replacement being rejected rather than by a counter somewhere else.
    stubFetch((url) => {
      if (url.includes('/v1beta/models?')) return modelList([TEST_MODEL])
      return new Response(retiredBody('something-else', TEST_MODEL), { status: 404 })
    })
    await expect(queryAI('sys', 'msg', GEMINI)).rejects.toThrow(/404/)
    expect(calls.filter(isGenerateCall)).toHaveLength(1)
  })

  it('does not treat an ordinary server error as a retirement', async () => {
    stubFetch(() => jsonResponse({ error: { code: 500, message: 'Internal error' } }, 500))
    await expect(queryAI('sys', 'msg', GEMINI)).rejects.toThrow(/500/)
    // No model-list call: a 500 is not a fact about which models exist, and
    // spending a second request to re-ask would double the cost of every
    // outage.
    expect(calls.filter(isListCall)).toHaveLength(0)
    expect(calls.filter(isGenerateCall)).toHaveLength(1)
  })

  it('self-heals a 404 that names no replacement, using the live list', async () => {
    // Not every retirement is polite enough to name its successor. A 404 on a
    // model id is still a fact about that model, so the list is re-asked and
    // the ranking decides — which is the same path, without the hint.
    stubFetch((url) => {
      if (url.includes('/v1beta/models?')) return modelList([NEXT_MODEL])
      if (url.includes(`${TEST_MODEL}:generateContent`)) {
        return jsonResponse({ error: { code: 404, message: 'models/x is not supported' } }, 404)
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: 'recovered' }] } }] })
    })
    expect(await queryAI('sys', 'msg', GEMINI)).toBe('recovered')
    expect(calls.filter(isGenerateCall)[1].url).toContain(NEXT_MODEL)
  })
})

describe('22 — no model id is compiled into this app', () => {
  it('the retired id appears nowhere in src/', () => {
    // Vite's loader rather than node:fs, same as canon's frozen-boolean guard.
    const tree = import.meta.glob('../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>

    // A glob that silently matched nothing would make this a no-op, which is
    // the exact failure mode it exists to prevent.
    expect(Object.keys(tree).length).toBeGreaterThan(20)

    /* Built from parts so this test does not match its own source. The literal
       being banned is the one Google retired on 2026-08-26 — the id that was
       the app's default in six places and took every AI feature down with it. */
    const banned = new RegExp(['gemini', '2', '0', 'flash'].join('[-.]'))

    const offenders = Object.entries(tree)
      .filter(([, source]) => banned.test(source))
      .map(([path]) => path)

    expect(
      offenders,
      `a retired Gemini model id is compiled into:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
