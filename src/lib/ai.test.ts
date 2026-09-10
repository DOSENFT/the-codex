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
  aiErrorMessage,
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
  retryDelayMs,
  retryAfterSecondsFrom,
  geminiErrorFrom,
  getLastUsedProvider,
  AI_TEMPERATURE,
  AI_FALLBACK_BUDGET_MS,
  fallbackChain,
  isProviderConfigured,
  listOpenRouterModels,
  openrouterErrorFrom,
  rankOpenRouterModels,
  describeOpenRouterModel,
  retryAfterHeaderSeconds,
  saveAIConfig,
  updateAIConfig,
  type AIConfig,
  type OpenRouterModel,
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

/* ═══ THE SAVE THAT DELETED THE OTHER PROVIDERS ═══════════════════════════════

   `saveAIConfig` writes the WHOLE config — by design, and that design is kept.
   The bug was in what the forms handed it. Both call sites in `CharacterSetup`
   built the object out of the currently-selected provider alone:

       { provider, geminiApiKey: p === 'gemini' ? key : undefined,
                   ollamaUrl:    p === 'ollama' ? url : undefined }

   — no OpenRouter fields at all. So finishing first-run setup on Gemini wrote
   a config in which the OpenRouter key Marcus had pasted the day before simply
   did not exist. Nothing on screen said so. The three-provider fallback chain
   he built specifically so a 429 could not end a session had collapsed back to
   one provider, which is the single point of failure the third provider was
   added to remove — and it collapsed at the only moment it mattered, at a
   table, hours after the save that did it.

   `updateAIConfig` is the fix: name a field to change it, leave it out to keep
   it. Every test below fails against the old call sites, and the last two pin
   the two things that must NOT change — that `provider` really does switch,
   and that a key can still be deliberately deleted.
   ========================================================================== */

describe('updateAIConfig — a patch, not an overwrite', () => {
  // Obviously fictional. Nothing here is or resembles a real credential.
  const FAKE_GEMINI = 'AIza-not-a-real-key-0000'
  const FAKE_OPENROUTER = 'sk-or-v1-not-a-real-key-0000'

  const seedAll = () => {
    store.setItem('codex-ai-config', JSON.stringify({
      provider: 'gemini',
      geminiApiKey: FAKE_GEMINI,
      geminiModel: TEST_MODEL,
      ollamaUrl: 'http://ollama.test:11434',
      ollamaModel: 'test-model',
      openrouterApiKey: FAKE_OPENROUTER,
      openrouterModel: 'vendor/fictional-free',
      fallbackEnabled: true,
    }))
  }
  const stored = (): AIConfig => JSON.parse(store.getItem('codex-ai-config')!) as AIConfig

  it('keeps a saved OpenRouter key when a Gemini config is saved', () => {
    // THE BUG, in the shape the setup wizard wrote it: a Gemini-only form
    // submission. The old code deleted the OpenRouter key here.
    seedAll()
    updateAIConfig({ provider: 'gemini', geminiApiKey: FAKE_GEMINI, geminiModel: TEST_MODEL })
    expect(stored().openrouterApiKey).toBe(FAKE_OPENROUTER)
    expect(stored().openrouterModel).toBe('vendor/fictional-free')
  })

  it('keeps a saved Gemini key when an Ollama config is saved', () => {
    seedAll()
    updateAIConfig({ provider: 'ollama', ollamaUrl: 'http://desk.test:11434', ollamaModel: 'other-model' })
    expect(stored().geminiApiKey).toBe(FAKE_GEMINI)
    expect(stored().openrouterApiKey).toBe(FAKE_OPENROUTER)
    expect(stored().ollamaUrl).toBe('http://desk.test:11434')
  })

  it('treats an explicit `undefined` as “not editing this”, not as “delete this”', () => {
    // The literal defective object the forms used to build. A plain spread
    // merge would NOT have fixed it: `{...base, ...{k: undefined}}` still
    // copies the key over as undefined. Skipping undefined is the fix.
    seedAll()
    updateAIConfig({
      provider: 'gemini',
      geminiApiKey: FAKE_GEMINI,
      ollamaUrl: undefined,
      ollamaModel: undefined,
    })
    expect(stored().ollamaUrl).toBe('http://ollama.test:11434')
    expect(stored().ollamaModel).toBe('test-model')
    expect(stored().openrouterApiKey).toBe(FAKE_OPENROUTER)
  })

  it('leaves fields no form has an input for alone', () => {
    // Settings has no timeout boxes, so a whole-config write from that screen
    // silently dropped a LAN-tuned timeout every time Save was pressed.
    store.setItem('codex-ai-config', JSON.stringify({
      provider: 'gemini', geminiApiKey: FAKE_GEMINI, connectTimeoutMs: 45_000, idleTimeoutMs: 90_000,
    }))
    updateAIConfig({ provider: 'gemini', geminiApiKey: FAKE_GEMINI })
    expect(stored().connectTimeoutMs).toBe(45_000)
    expect(stored().idleTimeoutMs).toBe(90_000)
  })

  it('still switches the active provider — that is the one thing it MUST change', () => {
    seedAll()
    expect(updateAIConfig({ provider: 'openrouter' }).provider).toBe('openrouter')
    expect(stored().provider).toBe('openrouter')
    expect(loadAIConfig().provider).toBe('openrouter')
    // …without that switch costing the provider he switched away from.
    expect(stored().geminiApiKey).toBe(FAKE_GEMINI)
  })

  it('still deletes a key the user deliberately blanked', () => {
    // A merge must not make removal impossible. '' is a field he cleared and
    // saved; it is a different statement from a field he never touched.
    seedAll()
    updateAIConfig({ geminiApiKey: '' })
    expect(stored().geminiApiKey).toBeUndefined()
    expect('geminiApiKey' in stored()).toBe(false)   // absent, not stored as ''
    expect(isProviderConfigured(loadAIConfig(), 'gemini')).toBe(false)
    // and only that field
    expect(stored().openrouterApiKey).toBe(FAKE_OPENROUTER)
  })

  it('blanking the model box means Automatic, not a model literally named ""', () => {
    seedAll()
    updateAIConfig({ geminiModel: '' })
    expect('geminiModel' in stored()).toBe(false)
    expect(loadAIConfig().geminiModel).toBeUndefined()
  })

  it('keeps `fallbackEnabled: false` — false is a value, not a blank', () => {
    seedAll()
    updateAIConfig({ fallbackEnabled: false })
    expect(stored().fallbackEnabled).toBe(false)
    expect(loadAIConfig().fallbackEnabled).toBe(false)
  })

  it('is what the provider forms actually call — no whole-config write left in one', async () => {
    /* The unit tests above prove the function. This proves the wiring, which is
       where the bug lived: `updateAIConfig` existing changes nothing if a form
       still hands its one-provider object to `saveAIConfig`. Source-scanned in
       the idiom of B1/B2 above, because a button click is not reachable from
       `renderToStaticMarkup` — and this is the check that stops a FOURTH call
       site from quietly reintroducing it. Comments come out first so the essay
       explaining the fault does not read as the fault. */
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const file of ['CharacterSetup.tsx', 'Settings.tsx']) {
      const code = readFileSync(resolve(__dirname, `../components/${file}`), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      expect([...code.matchAll(/\bsaveAIConfig\s*\(/g)], `${file} writes the WHOLE config from one provider's fields`).toEqual([])
      expect(code, `${file} does not patch the config`).toMatch(/\bupdateAIConfig\s*\(/)
    }
  })

  it('leaves saveAIConfig’s overwrite semantics exactly as they were', () => {
    // The wholesale write is still needed — a reset means a reset — so this
    // pins it rather than quietly softening it under the fix above.
    seedAll()
    saveAIConfig({ provider: 'ollama' })
    expect('geminiApiKey' in stored()).toBe(false)
    expect('openrouterApiKey' in stored()).toBe(false)
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

/* ═══ THE 503 THAT DIED IN HIS FACE ═══════════════════════════════════════════

   Marcus, 2026-09-07, mid-session, screenshot in hand:

       Gemini error (503): { "error": { "code": 503, "message": "This model is
       currently experiencing high demand. Spikes in demand are usually
       temporary. Please try again later.", "status": "UNAVAILABLE" } }

   Google said *temporary* and *try again*; the app did neither. Only 429 was
   ever retried, so a quota problem recovered silently while an overload died
   as raw JSON in the middle of a roleplay card — which at a table reads as
   "the AI works randomly", his exact words.

   NONE OF THESE CAN PASS AGAINST THE OLD CODE. The three functions did not
   exist (the import alone fails), and the two end-to-end tests assert a second
   request that the old code never made.
   ========================================================================== */

describe('retryDelayMs — which failures are about WHEN you asked', () => {
  it('retries the overload family, and only that family', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(retryDelayMs(status, 0, null), `${status} should be retried`).not.toBeNull()
    }
    // A bad key, a retired model, a malformed request: all fail identically the
    // second time, so retrying them only makes him wait longer for the same news.
    for (const status of [400, 401, 403, 404, 422]) {
      expect(retryDelayMs(status, 0, null), `${status} must NOT be retried`).toBeNull()
    }
  })

  it('stops after two retries instead of looping at the table', () => {
    expect(retryDelayMs(503, 0, null)).not.toBeNull()
    expect(retryDelayMs(503, 1, null)).not.toBeNull()
    expect(retryDelayMs(503, 2, null)).toBeNull()
  })

  it('waits a short beat for a spike and a long one for a quota', () => {
    // A 5xx is Google having a bad minute — a second usually clears it. A 429
    // with no advice is quota, where pounding it immediately is what caused it.
    expect(retryDelayMs(503, 0, null)).toBeLessThan(retryDelayMs(429, 0, null)!)
    expect(retryDelayMs(503, 0, null)).toBeLessThanOrEqual(retryDelayMs(503, 1, null)!)
  })

  it('clamps advice that would park the app for an hour', () => {
    expect(retryDelayMs(503, 0, 3600, 20_000)).toBe(20_000)
    expect(retryDelayMs(503, 0, 2, 20_000)).toBe(2000)   // sensible advice is obeyed
  })
})

describe('retryAfterSecondsFrom — never a second error', () => {
  it('reads Google’s own RetryInfo', () => {
    expect(retryAfterSecondsFrom(JSON.stringify({
      error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7s' }] },
    }))).toBe(7)
  })

  it('returns null for a body that is not JSON, without throwing', () => {
    // An overloaded frontend often returns an HTML error page. Parsing that must
    // not turn a retryable failure into a crash.
    expect(retryAfterSecondsFrom('<html>503 Service Unavailable</html>')).toBeNull()
    expect(retryAfterSecondsFrom('')).toBeNull()
    expect(retryAfterSecondsFrom('{"error":{"code":503}}')).toBeNull()
  })
})

describe('geminiErrorFrom — what he is allowed to be shown', () => {
  const body503 = JSON.stringify({
    error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' },
  })

  it('never pastes the JSON blob from the screenshot into the message', () => {
    /* THE ASSERTION THAT IS THE WHOLE BUG. The old message was
       `Gemini error (503): ${errText.slice(0, 200)}` — the literal blob. */
    const err = geminiErrorFrom(503, body503, TEST_MODEL)
    expect(err.message).not.toContain('{')
    expect(err.message).not.toContain('UNAVAILABLE')
    expect(err.message).not.toContain('"error"')
  })

  it('still says which model and which code, so it stays debuggable', () => {
    const err = geminiErrorFrom(503, body503, TEST_MODEL)
    expect(err.message).toContain(TEST_MODEL)
    expect(err.message).toMatch(/503/)
    expect(err.status).toBe(503)
    // The blob is kept for the console and the retirement parser, just not shown.
    expect(err.body).toBe(body503)
  })

  it('tells him what still works, because at a table that is the useful half', () => {
    expect(geminiErrorFrom(503, body503, TEST_MODEL).message.toLowerCase()).toContain('dice')
  })

  it('keeps the 404 body, which is the one that carries its own fix', () => {
    // Slice 3's retirement recovery reads this. Suppressing it would re-break
    // the thing `replacementFromError` exists to fix.
    const err = geminiErrorFrom(404, retiredBody(TEST_MODEL, 'gemini-9.9-flash'), TEST_MODEL)
    expect(err.message).toContain('gemini-9.9-flash')
  })
})

describe('the overload retry, end to end', () => {
  it('recovers from a 503 without the table ever seeing it', async () => {
    vi.useFakeTimers()
    let n = 0
    stubFetch(() => {
      n++
      return n === 1
        ? jsonResponse({ error: { code: 503, message: 'high demand' } }, 503)
        : jsonResponse({ candidates: [{ content: { parts: [{ text: 'the line he needed' }] } }] })
    })
    const pending = queryAI('sys', 'msg', GEMINI)
    await vi.advanceTimersByTimeAsync(AI_TIMEOUTS.retryCapMs)
    expect(await pending).toBe('the line he needed')
    expect(n).toBe(2)
  })

  it('retries the STREAMING path too — that is the one the roleplay card uses', async () => {
    /* The blocking path and the streaming path are separate functions, and a
       fix applied to one of them is a fix he only gets on some screens. It is
       safe to retry here because nothing has been emitted yet: the response was
       never OK, so `pump` never ran and no text can double up. */
    vi.useFakeTimers()
    let n = 0
    stubFetch(() => {
      n++
      return n === 1
        ? jsonResponse({ error: { code: 503, message: 'high demand' } }, 503)
        : new Response('data: {"candidates":[{"content":{"parts":[{"text":"streamed"}]}}]}\n\n', { status: 200 })
    })
    const seen: string[] = []
    const pending = queryAIStream('sys', 'msg', t => seen.push(t), GEMINI)
    await vi.advanceTimersByTimeAsync(AI_TIMEOUTS.retryCapMs)
    expect(await pending).toContain('streamed')
    expect(seen.join('')).toBe('streamed')   // once, not twice
    expect(n).toBe(2)
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
    /* AMENDED 2026-09-07 WITH THE OVERLOAD FIX. This test used to assert ONE
       generate call, because a 5xx was not retried at all — which is the bug
       Marcus hit mid-session as a raw 503 JSON blob in a roleplay card. The
       count is now three, and that change is the feature.
       Its actual subject is unchanged and is the line below about the LIST:
       a 500 is not a fact about which models exist. */
    vi.useFakeTimers()
    stubFetch(() => jsonResponse({ error: { code: 500, message: 'Internal error' } }, 500))
    const pending = queryAI('sys', 'msg', GEMINI)
    const settled = expect(pending).rejects.toThrow(/500/)
    await vi.advanceTimersByTimeAsync(AI_TIMEOUTS.retryCapMs * 2)
    await settled
    // No model-list call: a 500 is not a fact about which models exist, and
    // spending a second request to re-ask would double the cost of every
    // outage.
    expect(calls.filter(isListCall)).toHaveLength(0)
    expect(calls.filter(isGenerateCall)).toHaveLength(3)   // the try and two retries
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

/* ═══════════════════════════════════════════════════════════════════════════
   THE SWALLOWED ERROR — the Toybox AI's "check your AI settings"
   ---------------------------------------------------------------------------
   Marcus reported the Toybox AI failing on all three tabs with "AI suggestion
   failed. Check your AI settings and try again." while the combat advisor
   worked. That sentence was not a diagnosis, it was the ABSENCE of one:
   `ToyboxPanel.handleAISuggest` ended in a bare `catch {}` that discarded the
   AIError and printed a fixed string. The advice it gave was wrong for every
   cause except a missing key, and the cause could not be recovered afterwards
   by anyone — user or session.

   Section A aims at the function; per finding BM that is NOT enough on its own,
   because a correct function the component does not call is a half-built
   feature running as if done. Section B aims at the WIRE, by source scan
   (finding BG: forbid the fault rather than fail to observe it), because this
   repo has no jsdom and an async catch handler cannot be driven through
   `renderToStaticMarkup`. The taps themselves are driven for real by
   docs/plans/toybox-ai/prove-ai-error.mjs.
   ═════════════════════════════════════════════════════════════════════════ */
describe('aiErrorMessage — what a failure is allowed to say', () => {
  /* ─── A. the function ─────────────────────────────────────────────────── */

  it('A1 — keeps what a chatty model actually said, rather than blaming Settings', () => {
    // The real message queryAIStructured builds. It names the true fault: the
    // key worked, the model answered, and the answer was not JSON.
    const err = new AIError('api', 'The model did not return JSON. It said: Sure! Here are some combo ideas')
    expect(aiErrorMessage(err)).toBe(
      'The model did not return JSON. It said: Sure! Here are some combo ideas',
    )
    expect(aiErrorMessage(err)).not.toContain('Check your AI settings')
  })

  it('A2 — keeps a retired-model 404, which carries its own fix', () => {
    const err = new AIError(
      'api',
      'models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-2.5-flash',
      404,
      '{"error":{"message":"…"}}',
    )
    expect(aiErrorMessage(err)).toContain('gemini-2.5-flash')
  })

  it('A3 — a cancelled request says NOTHING, because it is a decision not a fault', () => {
    // Not "" and not a generic sentence: null is the signal the caller needs to
    // paint no red text at all. useAI.ts:103 makes the same distinction.
    expect(aiErrorMessage(new AIError('cancelled', 'Aborted'))).toBeNull()
  })

  it('A4 — a config failure still names the provider it is talking about', () => {
    const err = new AIError('config', 'No Gemini API key set. Add one in Settings, or switch to Ollama.')
    expect(aiErrorMessage(err)).toContain('Gemini')
    expect(aiErrorMessage(err)).toContain('Ollama')
  })

  it('A5 — a plain Error keeps its message; only a non-Error gets the generic sentence', () => {
    expect(aiErrorMessage(new Error('fetch failed'))).toBe('fetch failed')
    // A thrown string has genuinely told us nothing, so the fallback is honest.
    expect(aiErrorMessage('boom')).toBe('AI suggestion failed. Check your AI settings and try again.')
    expect(aiErrorMessage(new Error('   '))).toBe('AI suggestion failed. Check your AI settings and try again.')
  })

  /* ─── B. the wire ─────────────────────────────────────────────────────── */

  it('B1 — ToyboxPanel does not swallow its AI error', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(
      resolve(__dirname, '../components/ToyboxPanel.tsx'),
      'utf8',
    )

    // The exact shape of the fault, which is what actually shipped.
    expect(
      src.includes("catch {\n      setAiError('AI suggestion failed"),
      'the bare catch that discarded the AIError is back',
    ).toBe(false)

    // And the positive claim: the handler routes through the one function that
    // decides what a failure may say. A `catch (err)` that ignored `err` would
    // pass the check above and fail this one.
    expect(src, 'ToyboxPanel no longer calls aiErrorMessage').toContain('setAiError(aiErrorMessage(err))')
    expect(src, 'ToyboxPanel does not import aiErrorMessage').toMatch(
      /import \{ aiErrorMessage \} from '\.\.\/lib\/ai'/,
    )
  })

  it('B2 — no bare catch remains anywhere in ToyboxPanel', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(__dirname, '../components/ToyboxPanel.tsx'), 'utf8')
    /* Comments come out FIRST. The fix's own comment quotes the fault it
       describes, so a scan of the raw text finds a bare catch in the very
       sentence explaining why there is no longer one — and a check that cries
       wolf at prose is a check somebody deletes. Scan the code, not the essay. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    // `catch {` with no binding cannot inspect what it caught. Finding BG: this
    // forbids the whole class, not just the one instance that was reported.
    const bare = [...code.matchAll(/\bcatch\s*\{/g)]
    expect(bare.map(m => code.slice(m.index, m.index + 60)), 'a bare catch is back').toEqual([])
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   THE THIRD PROVIDER, THE CHAIN, AND THE TWO NUMBERS — 2026-09-09
   ---------------------------------------------------------------------------
   Marcus, in one week, on one free tier:

       "429 quota exhausted" · "503 the model is overloaded" · "503 this model
       is currently experiencing high demand"

   Three different sentences for one fact: a single free tier is a single point
   of failure, and the second provider the app already had is Ollama — which the
   phone he actually plays on cannot reach, because an https page may not open
   http://localhost. So the fallback "pair" had, at a table, exactly one member.

   Everything below drives real code through the same stubbed `fetch` as the
   rest of this file. None of it can pass against the previous version:
   OpenRouter did not exist, fallback went to "the other one" rather than along
   a chain, `num_ctx` was never sent, and every request in the app — prose and
   JSON alike — went out at temperature 0.3.
   ═════════════════════════════════════════════════════════════════════════ */

/** An OpenRouter id no vendor has ever published.
 *
 *  Same rule as TEST_MODEL above, and it matters more here: OpenRouter
 *  withdraws free models WEEKLY. A test that passed because the code
 *  recognised a real slug would be certifying the one behaviour
 *  `rankOpenRouterModels` exists to prevent. */
const OR_MODEL = 'testvendor/fictional-scribe:free'

const OPENROUTER: AIConfig = {
  provider: 'openrouter',
  openrouterApiKey: 'or-test-key-abc123',
  openrouterModel: OR_MODEL,
  fallbackEnabled: false,
  connectTimeoutMs: 60,
  idleTimeoutMs: 80,
}

/** Every provider configured at once — the config Settings now writes, because
 *  a key typed on one tab has to still be there when another provider 429s. */
const ALL_THREE: AIConfig = {
  ...GEMINI,
  ...OPENROUTER,
  ...OLLAMA,
  provider: 'gemini',
  fallbackEnabled: true,
  connectTimeoutMs: 60,
  idleTimeoutMs: 80,
}

/** OpenRouter's list, already answered — the exact counterpart of
 *  `seedModelCache`, and needed for the same reason: without it every
 *  OpenRouter test below would spend its first fetch on `GET /models` and
 *  every call-counting assertion would be counting the wrong thing. */
function seedOpenRouterCache(models: OpenRouterModel[] = [describeOpenRouterModel(OR_MODEL, true, 128_000)]) {
  store.setItem('codex-openrouter-models', JSON.stringify({ fetchedAt: Date.now(), models }))
}

const openrouterSaid = (text: string) => jsonResponse({ choices: [{ message: { content: text } }] })

/** An SSE body, already complete. `\n`-terminated because `pump` splits on it. */
const sse = (lines: string[]) => new Response(lines.join('\n') + '\n', { status: 200 })

const bodyOf = (c: Call) => JSON.parse(String(c.init.body))

/** Which provider a recorded call went to, by address rather than by order. */
const providerOf = (c: Call) =>
  c.url.includes('openrouter.ai') ? 'openrouter'
    : c.url.includes('ollama.test') ? 'ollama'
      : 'gemini'

/* ─── OpenRouter: the request ────────────────────────────────────────────── */

describe('OpenRouter — the second free tier', () => {
  beforeEach(() => { seedOpenRouterCache() })

  it('asks the OpenAI-compatible endpoint and reads the answer out of it', async () => {
    stubFetch(() => openrouterSaid('the hook he asked for'))
    expect(await queryAI('sys', 'msg', OPENROUTER)).toBe('the hook he asked for')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(bodyOf(calls[0]).model).toBe(OR_MODEL)
    expect(bodyOf(calls[0]).messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'msg' },
    ])
    expect(getLastUsedProvider()).toBe('openrouter')
  })

  it('sends the key as a Bearer header and NEVER in the URL', async () => {
    // Same law as the Gemini test above, and it is not inherited — this is a
    // second provider with a second header convention, verified against
    // openrouter.ai/docs/api-reference/overview on 2026-09-09.
    stubFetch(() => openrouterSaid('ok'))
    await queryAI('sys', 'msg', OPENROUTER)
    expect(calls[0].url).not.toContain(OPENROUTER.openrouterApiKey!)
    expect(calls[0].url).not.toContain('key=')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer or-test-key-abc123')
  })

  it('refuses before it reaches the network when there is no key', async () => {
    stubFetch(() => openrouterSaid('should never be read'))
    const err = await queryAI('sys', 'msg', { ...OPENROUTER, openrouterApiKey: undefined }).catch(e => e) as AIError
    expect(err.kind).toBe('config')
    expect(err.message).toContain('Settings')
    expect(calls).toHaveLength(0)
  })

  it('names a 200 that carries an error object instead of a choice', async () => {
    // OpenRouter answers 200 with `{error:…}` when the upstream provider dies
    // after the response is committed. Reading `content` off that is undefined,
    // and the old `|| 'No response generated'` idiom would report a working
    // request that happened to say nothing.
    stubFetch(() => jsonResponse({ error: { code: 502, message: 'upstream exploded' } }))
    const err = await queryAI('sys', 'msg', OPENROUTER).catch(e => e) as AIError
    expect(err).toBeInstanceOf(AIError)
    expect(err.status).toBe(502)
    expect(err.message).not.toBe('No response generated')
  })
})

/* ─── OpenRouter: streaming ──────────────────────────────────────────────── */

describe('OpenRouter streaming', () => {
  beforeEach(() => { seedOpenRouterCache() })

  it('reads OpenAI-style SSE deltas and paints them as they arrive', async () => {
    stubFetch(() => sse([
      'data: {"choices":[{"delta":{"content":"Nix "}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"draws steel."}}]}',
      '',
      'data: [DONE]',
    ]))
    const seen: string[] = []
    const out = await queryAIStream('sys', 'msg', t => seen.push(t), OPENROUTER)
    expect(out).toBe('Nix draws steel.')
    // Accumulated, not per-token: the panel is repainted with the whole line.
    expect(seen).toEqual(['Nix ', 'Nix draws steel.'])
    expect(bodyOf(calls[0]).stream).toBe(true)
  })

  it('ignores the keepalive comment lines rather than printing them', async () => {
    /* OpenRouter emits `: OPENROUTER PROCESSING` as an SSE comment while it
       waits for an upstream provider to start. It is a sign of life for the
       idle clock and nothing else — a stream that pasted it into the roleplay
       card would be the 503-blob defect wearing a new costume. */
    stubFetch(() => sse([
      ': OPENROUTER PROCESSING',
      'data: {"choices":[{"delta":{"content":"clean"}}]}',
      'data: [DONE]',
    ]))
    const seen: string[] = []
    const out = await queryAIStream('sys', 'msg', t => seen.push(t), OPENROUTER)
    expect(out).toBe('clean')
    expect(seen).toEqual(['clean'])
    expect(out).not.toContain('PROCESSING')
  })
})

/* ─── OpenRouter: what a failure is allowed to say ───────────────────────── */

describe('openrouterErrorFrom — every status says whose fault it is', () => {
  const blob = JSON.stringify({ error: { code: 429, message: 'rate limit', metadata: { provider: 'x' } } })

  it('401 is auth, not api — a rejected key is terminal', () => {
    // The kind is the load-bearing part: `auth` is what stops the chain from
    // burning the other two providers over a credential neither can mend.
    const err = openrouterErrorFrom(401, blob, OR_MODEL)
    expect(err.kind).toBe('auth')
    expect(err.message).toContain('openrouter.ai/keys')
  })

  it('402 explains that the model was not free, which is what it actually means', () => {
    const err = openrouterErrorFrom(402, blob, OR_MODEL)
    expect(err.status).toBe(402)
    expect(err.message).toContain(OR_MODEL)
    expect(err.message.toLowerCase()).toContain('free')
  })

  it('403 says moderation, and says it is not the key and not the quota', () => {
    const err = openrouterErrorFrom(403, blob, OR_MODEL)
    expect(err.message.toLowerCase()).toContain('moderation')
    expect(err.message.toLowerCase()).toContain('dice')
  })

  it('404 says the free model was withdrawn, and names the setting that fixes it', () => {
    // Not an emergency here the way it is on Gemini: OpenRouter's free list
    // turns over weekly, so this is the ordinary case.
    const err = openrouterErrorFrom(404, blob, OR_MODEL)
    expect(err.message).toContain(OR_MODEL)
    expect(err.message).toContain('Automatic')
  })

  it('429 says the allowance is per model, which is the fix he can act on', () => {
    const err = openrouterErrorFrom(429, blob, OR_MODEL)
    expect(err.message.toLowerCase()).toContain('rate limited')
    expect(err.message.toLowerCase()).toContain('different free model')
  })

  it('502 and 503 are somebody else\'s afternoon, and say how many times we tried', () => {
    for (const status of [502, 503]) {
      const err = openrouterErrorFrom(status, blob, OR_MODEL)
      expect(err.message).toContain(String(status))
      expect(err.message).toMatch(/Tried \d+ times/)
      expect(err.message.toLowerCase()).toContain('dice')
    }
  })

  it('never pastes the JSON blob into the sentence — the 503 lesson, applied', () => {
    for (const status of [401, 402, 403, 404, 429, 500, 502, 503, 418]) {
      const message = openrouterErrorFrom(status, blob, OR_MODEL).message
      expect(message, `status ${status} leaked the body`).not.toContain('{')
      expect(message, `status ${status} leaked the body`).not.toContain('"error"')
    }
    // …but the blob is still CARRIED, for the console and for any parser.
    expect(openrouterErrorFrom(429, blob, OR_MODEL).body).toBe(blob)
  })

  it('an unrecognised status still gets a sentence, not a stack trace', () => {
    const err = openrouterErrorFrom(418, blob, OR_MODEL)
    expect(err.message).toContain('418')
    expect(err.message).toContain('Settings')
    expect(err.message).not.toContain('An error occurred')
  })

  it('reads Retry-After off the response, because OpenRouter sends it as a header', () => {
    // Google puts its advice in the BODY; OpenRouter puts it in a header. Two
    // providers, two dialects of the same sentence, one retry policy.
    expect(retryAfterHeaderSeconds(new Response('', { headers: { 'Retry-After': '7' } }))).toBe(7)
    expect(retryAfterHeaderSeconds(new Response(''))).toBeNull()
    // A header that is not a number must never become a NaN-millisecond wait.
    expect(retryAfterHeaderSeconds(new Response('', { headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } })))
      .toBeNull()
  })
})

/* ─── OpenRouter: the model list, and free first ─────────────────────────── */

describe('rankOpenRouterModels — free first, and nothing outranks it', () => {
  const m = (id: string, free: boolean, ctx: number) => describeOpenRouterModel(id, free, ctx)

  it('puts every free model above every paid one, however big the paid one is', () => {
    /* THE ASSERTION THAT IS THE WHOLE FEATURE. Marcus is not paying for any of
       this. An automatic pick that lands on a paid model does not fail
       politely — it either 402s mid-scene or, worse, works and spends money. */
    const ranked = rankOpenRouterModels([
      m('paid/enormous', false, 2_000_000),
      m('testvendor/small-free:free', true, 8_000),
      m('paid/modest', false, 8_000),
      m('testvendor/roomy-free:free', true, 128_000),
    ])
    expect(ranked.map(x => x.id)).toEqual([
      'testvendor/roomy-free:free',   // free, and the roomiest of the free ones
      'testvendor/small-free:free',
      'paid/enormous',
      'paid/modest',
    ])
  })

  it('breaks a tie on the id, so Automatic does not change model between turns', () => {
    // Two answers in one scene that disagree about who Nix is, because the
    // ranking reshuffled, is worse than either answer alone.
    const twice = () => rankOpenRouterModels([
      m('b/model', true, 8_000),
      m('a/model', true, 8_000),
    ]).map(x => x.id)
    expect(twice()).toEqual(['a/model', 'b/model'])
    expect(twice()).toEqual(twice())
  })

  it('does not mutate the array it was handed', () => {
    const input = [m('b/model', false, 1), m('a/model', true, 1)]
    rankOpenRouterModels(input)
    expect(input.map(x => x.id)).toEqual(['b/model', 'a/model'])
  })
})

describe('listOpenRouterModels — free is decided by PRICE, never by the suffix', () => {
  const raw = (id: string, prompt: string, completion: string, extra: object = {}) =>
    ({ id, context_length: 32_000, pricing: { prompt, completion }, ...extra })

  it('reads a zero price out of the STRING the API actually sends', async () => {
    /* Verified against the live endpoint on 2026-09-09: prices arrive as
       strings ("0.00000004", "0"). And 21 models priced at zero, of which only
       18 carried `:free` — so a check on the suffix would have hidden three
       free models from a man who is not paying for any of this. */
    stubFetch(() => jsonResponse({
      data: [
        raw('testvendor/free-without-the-suffix', '0', '0'),
        raw('testvendor/cheap-but-not-free', '0.00000004', '0'),
      ],
    }))
    const found = await listOpenRouterModels()
    expect(found.find(x => x.id === 'testvendor/free-without-the-suffix')!.free).toBe(true)
    expect(found.find(x => x.id === 'testvendor/cheap-but-not-free')!.free).toBe(false)
  })

  it('needs no key, because the list is public and the question comes first', async () => {
    // "Is there anything free on this thing?" is asked BEFORE "here is my
    // credential", and the picker in Settings has to be able to answer it.
    stubFetch(() => jsonResponse({ data: [raw('testvendor/anything', '0', '0')] }))
    await listOpenRouterModels()
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/models')
  })

  it('drops models that answer in something other than text', async () => {
    // The same list carries music models, and some of them are free. Asking one
    // for a roleplay hook returns audio.
    stubFetch(() => jsonResponse({
      data: [
        raw('testvendor/writes-words', '0', '0', { architecture: { output_modalities: ['text'] } }),
        raw('testvendor/sings-instead', '0', '0', { architecture: { output_modalities: ['text', 'audio'] } }),
        raw('testvendor/declares-nothing', '0', '0'),
      ],
    }))
    const ids = (await listOpenRouterModels()).map(x => x.id)
    expect(ids).toContain('testvendor/writes-words')
    expect(ids).not.toContain('testvendor/sings-instead')
    // Open-world rule: a filter may prefer, it may not decide that an
    // unfamiliar thing does not exist.
    expect(ids).toContain('testvendor/declares-nothing')
  })

  it('describes a model from its id and its price, not from the API\'s marketing copy', () => {
    const described = describeOpenRouterModel('testvendor/fictional-scribe:free', true, 128_000)
    expect(described.label).toBe('Testvendor · Fictional Scribe')
    expect(described.description).toBe('Free · 128K context')
    expect(describeOpenRouterModel('paid/thing', false, 8_000).description).toBe('Paid · 8K context')
  })
})

/* ─── the fallback CHAIN ─────────────────────────────────────────────────── */

describe('the fallback chain — three providers, walked in order', () => {
  beforeEach(() => { seedOpenRouterCache() })

  it('names the order, skipping the one that is primary', () => {
    expect(fallbackChain(ALL_THREE, new AIError('network', 'x'))).toEqual(['openrouter', 'ollama'])
    expect(fallbackChain({ ...ALL_THREE, provider: 'ollama' }, new AIError('network', 'x')))
      .toEqual(['gemini', 'openrouter'])
  })

  it('leaves out a provider that is not configured, rather than attempting it', () => {
    // "Unconfigured" is not "failed". An unconfigured provider must never cost
    // a clock, and must never be the thing the sentence at the table is about.
    expect(fallbackChain({ ...ALL_THREE, openrouterApiKey: undefined }, new AIError('network', 'x')))
      .toEqual(['ollama'])
    expect(isProviderConfigured(ALL_THREE, 'openrouter')).toBe(true)
    expect(isProviderConfigured({ ...ALL_THREE, openrouterApiKey: undefined }, 'openrouter')).toBe(false)
    // A URL with no model is still not a configured Ollama.
    expect(isProviderConfigured({ ...ALL_THREE, ollamaModel: undefined }, 'ollama')).toBe(false)
  })

  it('walks PAST a failing second provider to reach the third', async () => {
    /* THE DEFECT THIS SLICE IS NAMED AFTER. Before the chain, "fall back" meant
       "try the other one" — so a rate-limited Gemini fell through to an Ollama
       the phone cannot reach and stopped, while a working OpenRouter key sat in
       the same config, never tried. */
    stubFetch(url =>
      url.includes('ollama.test') ? ollamaSaid('the third one answered')
        : Promise.reject(new TypeError('fetch failed')))

    const started = Date.now()
    expect(await queryAI('sys', 'msg', ALL_THREE)).toBe('the third one answered')
    expect(calls.map(providerOf)).toEqual(['gemini', 'openrouter', 'ollama'])
    expect(getLastUsedProvider()).toBe('ollama')

    /* And the clocks did not multiply without bound. The documented worst case
       is the primary's own clock plus AI_FALLBACK_BUDGET_MS plus one idle
       clock — the budget gates STARTING an attempt, it never interrupts one. */
    expect(Date.now() - started).toBeLessThan(
      ALL_THREE.connectTimeoutMs! + AI_FALLBACK_BUDGET_MS + ALL_THREE.idleTimeoutMs!,
    )
  })

  it('never contacts a provider that is not configured', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? ollamaSaid('ollama caught it')
        : Promise.reject(new TypeError('fetch failed')))
    const cfg: AIConfig = { ...ALL_THREE, openrouterApiKey: undefined }
    expect(await queryAI('sys', 'msg', cfg)).toBe('ollama caught it')
    expect(calls.some(c => c.url.includes('openrouter.ai')), 'an unconfigured provider was called').toBe(false)
    expect(calls.map(providerOf)).toEqual(['gemini', 'ollama'])
  })

  it('does not walk the chain on a cancel — he pressed Stop, and Stop means stop', async () => {
    // Continuing would restart, on his data allowance and on two more
    // providers, the precise thing he just stopped.
    stubFetch(never)
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)
    const err = await queryAI('sys', 'msg', ALL_THREE, controller.signal).catch(e => e) as AIError
    expect(err.kind).toBe('cancelled')
    expect(calls).toHaveLength(1)
  })

  it('does not walk the chain on a key the provider has actively REJECTED', async () => {
    /* A rejected key is a broken credential wearing an HTTP status. The other
       two providers cannot mend it, and routing silently around it is how a
       dead key stays dead for a month while nothing on screen says "key". */
    stubFetch(url =>
      url.includes('generativelanguage')
        ? jsonResponse({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API_KEY_INVALID' } }, 400)
        : openrouterSaid('should never be read'))
    const err = await queryAI('sys', 'msg', ALL_THREE).catch(e => e) as AIError
    expect(err.kind).toBe('auth')
    expect(err.message).toContain('aistudio.google.com/apikey')
    expect(calls.map(providerOf)).toEqual(['gemini'])
  })

  it('does not walk the chain on a missing credential', async () => {
    stubFetch(() => openrouterSaid('should never be read'))
    const err = await queryAI('sys', 'msg', { ...ALL_THREE, geminiApiKey: undefined }).catch(e => e) as AIError
    expect(err.kind).toBe('config')
    expect(calls).toHaveLength(0)
  })

  it('surfaces the FIRST provider\'s error when the whole chain is dead, never the last', async () => {
    /* He chose Gemini. If everything is dead, the sentence he reads has to be
       about the provider he chose — "OpenRouter no longer offers …" is an
       incomprehensible thing to be told by an app you had set to Gemini, and it
       sends him to fix a setting that was never wrong. */
    stubFetch(url => {
      if (url.includes('generativelanguage')) return jsonResponse({ error: { code: 404, message: 'gone' } }, 404)
      if (url.includes('openrouter.ai')) return jsonResponse({ error: { code: 404, message: 'gone' } }, 404)
      return Promise.reject(new TypeError('fetch failed'))
    })
    const err = await queryAI('sys', 'msg', ALL_THREE).catch(e => e) as AIError
    expect(err.status).toBe(404)
    expect(err.message).toContain('Gemini')
    expect(err.message).not.toContain('OpenRouter')
    expect(err.message).not.toContain('Ollama')
    // All three were genuinely tried — the first error is chosen, not the only one.
    expect(calls.map(providerOf)).toEqual(['gemini', 'openrouter', 'ollama'])
  })

  it('brings the whole chain to the streaming path too', async () => {
    // The blocking path and the streaming path are separate functions, and a
    // fix applied to one of them is a fix he only gets on some screens.
    stubFetch(url =>
      url.includes('ollama.test') ? ollamaSaid('ollama finished the sentence')
        : Promise.reject(new TypeError('fetch failed')))
    const seen: string[] = []
    const out = await queryAIStream('sys', 'msg', t => seen.push(t), ALL_THREE)
    expect(out).toBe('ollama finished the sentence')
    expect(seen).toEqual(['ollama finished the sentence']) // painted, not left blank
    expect(calls.map(providerOf)).toEqual(['gemini', 'openrouter', 'ollama'])
  })
})

/* ─── num_ctx: the truncation that never reported itself ─────────────────── */

describe('Ollama num_ctx — the silent truncation', () => {
  it('states the context window in the request body, on the blocking path', async () => {
    /* OLLAMA'S DEFAULT IS 4096 TOKENS AND IT DROPS THE OVERFLOW WITHOUT AN
       ERROR. Nothing fails; the model simply never saw the front of the prompt,
       which is where the character's backstory is. "The AI keeps forgetting who
       my character is" is what that looks like from a table. */
    stubFetch(() => ollamaSaid('ok'))
    await queryAI('sys', 'msg', OLLAMA)
    expect(bodyOf(calls[0]).options.num_ctx).toBe(32768)
  })

  it('states it on the streaming path as well', async () => {
    stubFetch(() => trickle(['streamed'], 1))
    await queryAIStream('sys', 'msg', () => {}, OLLAMA)
    expect(bodyOf(calls[0]).stream).toBe(true)
    expect(bodyOf(calls[0]).options.num_ctx).toBe(32768)
  })

  it('is in the API CALL, not left to an environment variable on the box', async () => {
    // OLLAMA_NUM_CTX on the desktop would be invisible here, unversioned, and
    // absent on any other machine. This is the one place it can be verified.
    stubFetch(() => ollamaSaid('ok'))
    await queryAIStructured('sys', 'msg', OLLAMA).catch(() => {})
    expect(bodyOf(calls[0]).options).toHaveProperty('num_ctx')
  })
})

/* ─── keep_alive: the wait that only happens when play slows down ─────────── */

describe('Ollama keep_alive — the four-and-a-half minute reload', () => {
  it('asks the server to hold the model, on the blocking path', async () => {
    /* Ollama evicts after five minutes idle and reloading the 27B off the
       external drive takes 4m30s (measured). Five minutes is shorter than a
       turn of play, so the wait lands exactly when a scene slows down — which
       reads as "the AI is flaky", the complaint that caused this whole change. */
    stubFetch(() => ollamaSaid('ok'))
    await queryAI('sys', 'msg', OLLAMA)
    expect(bodyOf(calls[0]).keep_alive).toBe('1h')
  })

  it('asks on the streaming path as well', async () => {
    // The roleplay card streams. A fix on only one path is a fix he gets on
    // some screens, which is indistinguishable from the bug still being there.
    stubFetch(() => trickle(['streamed'], 1))
    await queryAIStream('sys', 'msg', () => {}, OLLAMA)
    expect(bodyOf(calls[0]).stream).toBe(true)
    expect(bodyOf(calls[0]).keep_alive).toBe('1h')
  })

  it('does not pin the card forever', async () => {
    /* `-1` would mean "never unload", and this model holds 18.7 GB of a 24 GB
       card. His GPU would be permanently half-gone, and the next game would
       stutter for a reason nobody could trace back to a closed D&D app. It has
       to be a duration that expires on its own. */
    stubFetch(() => ollamaSaid('ok'))
    await queryAI('sys', 'msg', OLLAMA)
    const ka = bodyOf(calls[0]).keep_alive
    expect(ka).not.toBe(-1)
    expect(ka).not.toBe(0)
    expect(String(ka)).toMatch(/^\d+[smh]$/)
  })

  it('is in the API CALL, not left to OLLAMA_KEEP_ALIVE on the box', async () => {
    // Same argument as num_ctx: a server env var exists on one desktop and is
    // silently absent on any other host the app is ever pointed at.
    stubFetch(() => ollamaSaid('ok'))
    await queryAIStructured('sys', 'msg', OLLAMA).catch(() => {})
    expect(bodyOf(calls[0])).toHaveProperty('keep_alive')
  })
})

/* ─── temperature: two settings, because there are two audiences ─────────── */

describe('temperature — a parser reads one of these, a person reads the other', () => {
  beforeEach(() => { seedOpenRouterCache() })

  it('has a creative prose band and a low structured one, and they are not the same', () => {
    /* Every call in this app used to go out at 0.3 — an extraction setting,
       applied to roleplay hooks. Raising it globally was never an option:
       most call sites arrive at `queryAIStructured` and a model asked to be
       creative garnishes JSON with a sentence of preamble. */
    expect(AI_TEMPERATURE.structured).toBe(0.3)
    expect(AI_TEMPERATURE.prose).toBeGreaterThan(AI_TEMPERATURE.structured)
    expect(AI_TEMPERATURE.prose).toBeGreaterThanOrEqual(0.85)
    expect(AI_TEMPERATURE.prose).toBeLessThanOrEqual(1.0)
  })

  it('sends the prose value on every provider, by default', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? ollamaSaid('ok')
        : url.includes('openrouter.ai') ? openrouterSaid('ok')
          : jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))

    /* Asserted against the LITERAL as well as the constant. A test that only
       compared each body to `AI_TEMPERATURE.prose` would still pass if that
       constant were quietly set back to the extraction value, which is the
       exact regression this is here to catch. */
    await queryAI('sys', 'msg', OLLAMA)
    expect(bodyOf(calls[0]).options.temperature).toBe(AI_TEMPERATURE.prose)
    expect(bodyOf(calls[0]).options.temperature).toBeGreaterThan(0.3)

    calls = []
    await queryAI('sys', 'msg', GEMINI)
    expect(bodyOf(calls[0]).generationConfig.temperature).toBe(AI_TEMPERATURE.prose)
    expect(bodyOf(calls[0]).generationConfig.temperature).toBeGreaterThan(0.3)

    calls = []
    await queryAI('sys', 'msg', OPENROUTER)
    expect(bodyOf(calls[0]).temperature).toBe(AI_TEMPERATURE.prose)
    expect(bodyOf(calls[0]).temperature).toBeGreaterThan(0.3)
  })

  it('sends the structured value on every provider when a parser is waiting', async () => {
    stubFetch(url =>
      url.includes('ollama.test') ? ollamaSaid('{"ok":1}')
        : url.includes('openrouter.ai') ? openrouterSaid('{"ok":1}')
          : jsonResponse({ candidates: [{ content: { parts: [{ text: '{"ok":1}' }] } }] }))

    await queryAIStructured('sys', 'msg', OLLAMA)
    expect(bodyOf(calls[0]).options.temperature).toBe(AI_TEMPERATURE.structured)

    calls = []
    await queryAIStructured('sys', 'msg', GEMINI)
    expect(bodyOf(calls[0]).generationConfig.temperature).toBe(AI_TEMPERATURE.structured)

    calls = []
    await queryAIStructured('sys', 'msg', OPENROUTER)
    expect(bodyOf(calls[0]).temperature).toBe(AI_TEMPERATURE.structured)
  })

  it('streams at the prose value too — that is the path the roleplay card uses', async () => {
    stubFetch(() => trickle(['a hook'], 1))
    await queryAIStream('sys', 'msg', () => {}, OLLAMA)
    expect(bodyOf(calls[0]).options.temperature).toBe(AI_TEMPERATURE.prose)
    expect(bodyOf(calls[0]).options.temperature).toBeGreaterThan(0.3)
  })

  it('carries an explicit value through the chain rather than resetting it', async () => {
    // The fallback provider answers the same question, so it answers it at the
    // same temperature. A chain that silently re-defaulted would make the
    // second provider's prose measurably flatter than the first's.
    stubFetch(url =>
      url.includes('openrouter.ai') ? openrouterSaid('{"ok":1}')
        : Promise.reject(new TypeError('fetch failed')))
    await queryAIStructured('sys', 'msg', { ...ALL_THREE, ollamaUrl: undefined, ollamaModel: undefined })
    const orCall = calls.find(c => providerOf(c) === 'openrouter')!
    expect(bodyOf(orCall).temperature).toBe(AI_TEMPERATURE.structured)
  })
})
