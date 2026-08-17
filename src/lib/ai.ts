/* ============================================================================
   THE AI TRANSPORT — Slice 11
   ----------------------------------------------------------------------------
   Everything in this file exists to serve one sentence: THE AI MAY NEVER BLOCK
   COMBAT. It is a companion, not a dependency. Nix's turn is computed by
   `composeTurn` out of local state and does not consult a model at all; this
   layer only ever adds commentary. So every single thing it does is bounded,
   cancellable, and allowed to fail without taking a screen down with it.

   What was here before, and what each one did at a table:

   1.  NOT ONE TIMEOUT.  Nine `fetch` calls, no AbortController anywhere. When
       the machine running Ollama was asleep — the normal state of a desktop at
       10pm — the fetch did not fail, it HUNG, for as long as the OS takes to
       give up on a dead TCP connect. `useAI` holds `loading` for the whole of
       that, and `CombatHelper` disables its input and five buttons on
       `loading`. That is the AI panel dead, mid-fight, for a minute or more,
       with a spinner claiming it is thinking. This is the defect the slice is
       named for and it is fixed by `bound()` below.

   2.  A HARD-CODED LAN ADDRESS.  `http://192.168.1.174:11434` was compiled into
       the app as the default Ollama URL. It is Marcus's desktop, on the lease
       his router happened to give it. A reboot, a new router, a friend's house
       — and the "configurable" base URL was a constant in a bundle. Gone; the
       default is now derived from where the app is actually being served.

   3.  A PRECEDENCE BUG THAT DISABLED THE OFF SWITCH.  The old fallback test
       read `A && B && C ? x : y`, which JavaScript parses as `(A && B && C) ?
       x : y` — so setting `fallbackEnabled: false` made the condition falsy and
       selected the ELSE branch, `!!cfg.ollamaUrl`, which is TRUE. Turning
       fallback off turned fallback on. Verified by running it, not by reading
       it. `canFallBack` below is a named, exported, unit-tested function for
       exactly this reason: the expression was too clever to be checked by eye.

   ONE DELIBERATE DIVERGENCE FROM THE OLD COMMENT.  It said "only fallback on
   network errors, not API errors (rate limits, bad keys)". The old CODE fell
   back on nearly everything, and that is the behaviour Marcus actually lived
   with. At a table a working answer beats an accurate error, and a Gemini quota
   that ran out at 9pm is precisely when the local model should take over. So
   the rule is now: fall back on anything EXCEPT a user cancel or a missing
   credential — and `fallbackEnabled: false` is obeyed absolutely. The provider
   that actually answered is reported by `getLastUsedProvider()`, so the switch
   is never silent.
   ========================================================================== */

export type AIProvider = 'gemini' | 'ollama'

// Available Gemini models (each has its own separate free-tier quota)
export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fastest, best quality' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Lightweight, separate quota' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Stable, separate quota' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', description: 'Smallest, highest limits' },
] as const

/** The three clocks, in milliseconds.
 *
 *  CONNECT is short and unforgiving: a machine that is going to answer answers
 *  its headers fast, and a machine that is asleep never answers at all. Eight
 *  seconds is long enough for a cold 27B model to be loaded off disk by the
 *  server process and short enough that a wrong URL is a blip rather than an
 *  outage.
 *
 *  IDLE is generous, and it is an IDLE clock rather than a total one on
 *  purpose: a long answer is a feature, silence is the failure. It restarts on
 *  every byte, so a model that is genuinely producing tokens is never cut off
 *  no matter how much it has to say.
 *
 *  RETRY_CAP bounds Gemini's own "retry after N seconds" advice, which arrives
 *  from the network and must not be trusted with the app's responsiveness. */
export const AI_TIMEOUTS = { connectMs: 8_000, idleMs: 30_000, retryCapMs: 20_000 } as const

export interface AIConfig {
  provider: AIProvider
  geminiApiKey?: string
  geminiModel?: string
  ollamaUrl?: string
  ollamaModel?: string
  /** When true, if the primary provider fails, try the other */
  fallbackEnabled?: boolean
  /** Overrides for AI_TIMEOUTS. Present so a slow model on a slow LAN can be
   *  accommodated without editing code — the one thing the old hard-coded URL
   *  taught is that anything site-specific belongs in config. */
  connectTimeoutMs?: number
  idleTimeoutMs?: number
}

/** Why a request ended, when it did not end with an answer.
 *
 *  `kind` exists so the fallback decision is made on a FACT rather than on a
 *  substring search of an error message, which is what the old `isNetworkError`
 *  did and which quietly classified any model whose text happened to contain
 *  the word "timeout" as a connection failure. */
export type AIFailure = 'timeout' | 'cancelled' | 'config' | 'network' | 'api'

export class AIError extends Error {
  readonly kind: AIFailure
  /** HTTP status, when there was a response at all. */
  readonly status?: number
  constructor(kind: AIFailure, message: string, status?: number) {
    super(message)
    this.name = 'AIError'
    this.kind = kind
    this.status = status
  }
}

/** Resolve the Ollama URL from where the app is actually being served.
 *
 *  No address is compiled in any more. On the desktop that runs the model,
 *  localhost. Everywhere else — the phone, the iPad, whatever host name the
 *  cloudflared tunnel invented this evening — the same-origin `/ollama` proxy,
 *  which is the only option that needs neither a CORS grant nor a LAN address
 *  that changes with the DHCP lease. Marcus can still type anything he likes
 *  into Settings; this is only what he gets before he does. */
export function getDefaultOllamaUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:11434'
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:11434'
  return `${window.location.origin}/ollama`
}

const CONFIG_KEY = 'codex-ai-config'

function defaultConfig(): AIConfig {
  return {
    provider: 'ollama',
    geminiModel: 'gemini-2.0-flash',
    ollamaUrl: getDefaultOllamaUrl(),
    ollamaModel: 'gemma3-27b-abliterated:latest',
    fallbackEnabled: true,
  }
}

/** Load the saved config. NEVER THROWS.
 *
 *  This is called during render by several components, so a `codex-ai-config`
 *  that got truncated by a browser killed mid-write used to throw a SyntaxError
 *  out of `JSON.parse` and take a screen with it — a corrupted AI *preference*
 *  is not worth a blank page, ever. A value that cannot be read is a value that
 *  was never set. */
export function loadAIConfig(): AIConfig {
  let parsed: Partial<AIConfig> | null = null
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      const candidate: unknown = JSON.parse(saved)
      if (candidate && typeof candidate === 'object') parsed = candidate as Partial<AIConfig>
    }
  } catch {
    parsed = null
  }
  if (!parsed) return defaultConfig()

  const config = { ...defaultConfig(), ...parsed } as AIConfig
  // Migration: default fallback to true
  if (parsed.fallbackEnabled === undefined) config.fallbackEnabled = true
  // Migration: swap a saved LAN address for the proxy when accessed remotely.
  // Marcus's saved URL is otherwise left exactly as he typed it — this slice
  // removed the baked-in address, it does not get to overwrite his.
  if (config.ollamaUrl?.includes('192.168.') && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
      config.ollamaUrl = `${window.location.origin}/ollama`
    }
  }
  return config
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

/* ─── The clocks ─────────────────────────────────────────────────────────── */

interface Bound {
  readonly signal: AbortSignal
  /** Bytes arrived. Restart the idle clock. */
  touch(): void
  /** Turn the clock off. Safe to call twice; always call it. */
  done(): void
  /** Translate a caught error into the reason this bound actually ended. */
  explain(err: unknown, what: string): AIError
}

/** Put a hard clock on one request, joined to any signal the caller supplied.
 *
 *  Two clocks in sequence, not one total budget: `connectMs` until the headers
 *  arrive, then `idleMs` restarted on every chunk of body. A 27B model writing
 *  three paragraphs is not a failure and must not be cut off at some arbitrary
 *  total; silence is the failure, and silence is what is measured. */
function bound(cfg: AIConfig, external?: AbortSignal): Bound {
  const controller = new AbortController()
  const connectMs = cfg.connectTimeoutMs ?? AI_TIMEOUTS.connectMs
  const idleMs = cfg.idleTimeoutMs ?? AI_TIMEOUTS.idleMs
  let ended: 'timeout' | 'cancelled' | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const arm = (ms: number) => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      ended = 'timeout'
      controller.abort()
    }, ms)
  }
  const onExternal = () => {
    ended = 'cancelled'
    controller.abort()
  }

  if (external?.aborted) onExternal()
  else external?.addEventListener('abort', onExternal)
  arm(connectMs)

  return {
    signal: controller.signal,
    touch: () => { if (ended === null) arm(idleMs) },
    done: () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      external?.removeEventListener('abort', onExternal)
    },
    explain: (err, what) => {
      if (err instanceof AIError) return err
      if (ended === 'cancelled') return new AIError('cancelled', 'Stopped.')
      if (ended === 'timeout') {
        return new AIError(
          'timeout',
          `${what} did not answer in time. Combat is unaffected — check the address in Settings.`,
        )
      }
      // A fetch that rejects without an abort is a connection failure: wrong
      // port, refused, DNS, offline.
      const detail = err instanceof Error ? err.message : String(err)
      return new AIError('network', `Could not reach ${what}. ${detail}`)
    },
  }
}

/** Was this failure worth trying the other provider for?
 *
 *  A cancel is the user's decision and is final. A missing credential is a
 *  fact about configuration that a second attempt cannot change. Everything
 *  else — dead host, timeout, exhausted quota, a 500 from Google — is exactly
 *  the case the second provider exists for. */
function isWorthFallingBackFrom(err: unknown): boolean {
  if (err instanceof AIError) return err.kind !== 'cancelled' && err.kind !== 'config'
  return true
}

/** The whole fallback decision, in one named place.
 *
 *  Exported because the expression it replaces was a precedence bug that no
 *  amount of reading caught and one unit test would have. Do not inline it. */
export function canFallBack(cfg: AIConfig, err: unknown): boolean {
  if (cfg.fallbackEnabled === false) return false
  if (!isWorthFallingBackFrom(err)) return false
  return cfg.provider === 'ollama'
    ? !!cfg.geminiApiKey
    : !!cfg.ollamaUrl && !!cfg.ollamaModel
}

/** The credentials each provider cannot work without, checked BEFORE any
 *  request. The old code passed `cfg.geminiApiKey!` straight into a URL, so a
 *  missing key produced `?key=undefined` and a 400 from Google that read like a
 *  Google problem. It is not a Google problem. */
function requireCredentials(cfg: AIConfig, provider: AIProvider): void {
  if (provider === 'gemini' && !cfg.geminiApiKey) {
    throw new AIError('config', 'No Gemini API key set. Add one in Settings, or switch to Ollama.')
  }
  if (provider === 'ollama' && (!cfg.ollamaUrl || !cfg.ollamaModel)) {
    throw new AIError('config', 'No Ollama address or model set. Check Settings.')
  }
}

/* ─── Ollama ─────────────────────────────────────────────────────────────── */

// Fetch available models from an Ollama instance
export async function fetchOllamaModels(
  url: string,
  signal?: AbortSignal,
  timeoutMs: number = AI_TIMEOUTS.connectMs,
): Promise<Array<{ name: string; size: string; family: string }>> {
  // Settings re-runs this as the URL is typed, so an unbounded version left a
  // hanging request per keystroke.
  //
  // The clock is a parameter with a sane default rather than a constant, for
  // one reason: a constant is a clock no test can watch tick. Callers leave it
  // alone — listing tags is instant on a reachable host, and the default is
  // generous on purpose because "reachable" over a tunnel on cellular is not
  // the same as reachable on the desk.
  const b = bound({ provider: 'ollama', connectTimeoutMs: timeoutMs, idleTimeoutMs: timeoutMs }, signal)
  try {
    const response = await fetch(`${url}/api/tags`, { signal: b.signal })
    b.touch()
    if (!response.ok) throw new AIError('api', `Ollama error: ${response.status}`, response.status)
    const data = await response.json()
    return (data.models ?? []).map((m: { name: string; size: number; details?: { family?: string; parameter_size?: string } }) => ({
      name: m.name,
      size: m.details?.parameter_size ?? `${Math.round(m.size / 1024 / 1024 / 1024)}GB`,
      family: m.details?.family ?? 'unknown',
    }))
  } catch (err) {
    throw b.explain(err, 'Ollama')
  } finally {
    b.done()
  }
}

async function queryOllama(cfg: AIConfig, systemPrompt: string, userMessage: string, signal?: AbortSignal): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(`${cfg.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: b.signal,
      body: JSON.stringify({
        model: cfg.ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0.3 },
      }),
    })
    b.touch()
    if (!response.ok) throw new AIError('api', `Ollama error: ${response.status}`, response.status)
    const data = await response.json()
    return data.message?.content || 'No response generated'
  } catch (err) {
    throw b.explain(err, 'Ollama')
  } finally {
    b.done()
  }
}

/* ─── Gemini ─────────────────────────────────────────────────────────────── */

/** The key goes in a HEADER, never in the URL.
 *
 *  It used to be `?key=${apiKey}`, which puts a live credential into anything
 *  that records a URL: browser history, a proxy log, a Referer, a screenshot of
 *  the network tab. `x-goog-api-key` is what the API documents and costs
 *  nothing to use. */
const geminiHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'x-goog-api-key': apiKey,
})

const geminiBody = (systemPrompt: string, userMessage: string) => JSON.stringify({
  system_instruction: { parts: [{ text: systemPrompt }] },
  contents: [{ parts: [{ text: userMessage }] }],
  generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
})

/** Turn a non-OK Gemini response into something a person can act on. */
async function geminiError(response: Response, model: string): Promise<AIError> {
  const errText = await response.text().catch(() => '')
  if (response.status === 429) {
    return new AIError('api',
      `Rate limited on ${model}. Your free-tier quota is exhausted. Try switching to a different model in Settings — each model has its own quota.`,
      429)
  }
  if (response.status === 400 && errText.includes('API_KEY_INVALID')) {
    return new AIError('api', 'Invalid API key. Check your key at aistudio.google.com/apikey', 400)
  }
  if (response.status === 403) {
    return new AIError('api', 'API key does not have permission. Make sure the Generative Language API is enabled.', 403)
  }
  return new AIError('api', `Gemini error (${response.status}): ${errText.slice(0, 200)}`, response.status)
}

// Gemini implementation with auto-retry on rate limits
async function queryGemini(
  cfg: AIConfig,
  model: string,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal,
  attempt = 0,
): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers: geminiHeaders(cfg.geminiApiKey!), signal: b.signal, body: geminiBody(systemPrompt, userMessage) },
    )
    b.touch()

    if (response.status === 429 && attempt < 2) {
      // Gemini's advice about how long to wait arrives over the network, so it
      // is clamped before it is obeyed: an upstream that says "retry in 3600
      // seconds" must not be able to park the app for an hour.
      let waitMs = 15_000
      try {
        const errData = await response.json()
        const retryInfo = errData.error?.details?.find((d: { '@type': string }) => d['@type']?.includes('RetryInfo'))
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay, 10)
          if (seconds > 0) waitMs = seconds * 1000
        }
      } catch { /* use default */ }
      waitMs = Math.min(waitMs, AI_TIMEOUTS.retryCapMs)

      // And the wait itself is interruptible. A sleep that ignores the signal
      // is the same bug as a fetch that ignores it, wearing a different hat.
      await sleep(waitMs, signal)
      return queryGemini(cfg, model, systemPrompt, userMessage, signal, attempt + 1)
    }

    if (!response.ok) throw await geminiError(response, model)

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
  } catch (err) {
    throw b.explain(err, 'Gemini')
  } finally {
    b.done()
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AIError('cancelled', 'Stopped.'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new AIError('cancelled', 'Stopped.'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/* ─── The public surface ─────────────────────────────────────────────────── */

/** Track which provider actually served the last request (for UI feedback). */
let _lastUsedProvider: AIProvider | null = null
export function getLastUsedProvider(): AIProvider | null { return _lastUsedProvider }

const ask = (cfg: AIConfig, provider: AIProvider, systemPrompt: string, userMessage: string, signal?: AbortSignal) => {
  requireCredentials(cfg, provider)
  return provider === 'gemini'
    ? queryGemini(cfg, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage, signal)
    : queryOllama(cfg, systemPrompt, userMessage, signal)
}

// Main query function — with automatic fallback
export async function queryAI(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig,
  signal?: AbortSignal,
): Promise<string> {
  const cfg = config || loadAIConfig()
  try {
    const result = await ask(cfg, cfg.provider, systemPrompt, userMessage, signal)
    _lastUsedProvider = cfg.provider
    return result
  } catch (primaryErr) {
    if (!canFallBack(cfg, primaryErr)) throw primaryErr
    const other: AIProvider = cfg.provider === 'gemini' ? 'ollama' : 'gemini'
    try {
      const result = await ask(cfg, other, systemPrompt, userMessage, signal)
      _lastUsedProvider = other
      return result
    } catch {
      // Fallback also failed — throw the original error (more useful to the user)
      throw primaryErr
    }
  }
}

/* ─── Streaming ───
   Words arrive as they're thought. The stream carries the same prompts and
   the same fallback doctrine as queryAI: if nothing has arrived yet and the
   primary path dies, we fall back to the full non-streaming pipeline (which
   already knows how to switch providers, retry rate limits, and speak
   human-readable errors). If a stream dies mid-sentence, we surface it. */

/** Read an NDJSON or SSE body, restarting the idle clock on every chunk. */
async function pump(
  response: Response,
  b: Bound,
  extract: (line: string) => string | undefined,
  onText: (fullText: string) => void,
): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // A byte is a sign of life, whether or not it parses into a token.
    b.touch()
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const delta = extract(line)
      if (delta) {
        full += delta
        onText(full)
      }
    }
  }
  return full || 'No response generated'
}

const ollamaDelta = (line: string): string | undefined => {
  if (!line.trim()) return undefined
  try { return JSON.parse(line).message?.content } catch { return undefined }
}

const geminiDelta = (line: string): string | undefined => {
  if (!line.startsWith('data:')) return undefined
  const payload = line.slice(5).trim()
  if (!payload || payload === '[DONE]') return undefined
  try { return JSON.parse(payload).candidates?.[0]?.content?.parts?.[0]?.text } catch { return undefined }
}

async function streamOllama(cfg: AIConfig, systemPrompt: string, userMessage: string, onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(`${cfg.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: b.signal,
      body: JSON.stringify({
        model: cfg.ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        options: { temperature: 0.3 },
      }),
    })
    b.touch()
    if (!response.ok || !response.body) throw new AIError('api', `Ollama error: ${response.status}`, response.status)
    return await pump(response, b, ollamaDelta, onText)
  } catch (err) {
    throw b.explain(err, 'Ollama')
  } finally {
    b.done()
  }
}

async function streamGemini(cfg: AIConfig, model: string, systemPrompt: string, userMessage: string, onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      { method: 'POST', headers: geminiHeaders(cfg.geminiApiKey!), signal: b.signal, body: geminiBody(systemPrompt, userMessage) },
    )
    b.touch()
    if (!response.ok || !response.body) throw await geminiError(response, model)
    return await pump(response, b, geminiDelta, onText)
  } catch (err) {
    throw b.explain(err, 'Gemini')
  } finally {
    b.done()
  }
}

/**
 * Streaming query. Calls onText with the accumulated text as it grows.
 * Falls back to the full non-streaming pipeline if the stream fails
 * before any text has arrived.
 */
export async function queryAIStream(
  systemPrompt: string,
  userMessage: string,
  onText: (fullText: string) => void,
  config?: AIConfig,
  signal?: AbortSignal,
): Promise<string> {
  const cfg = config || loadAIConfig()
  let received = false
  const guardedOnText = (text: string) => {
    received = true
    onText(text)
  }

  try {
    requireCredentials(cfg, cfg.provider)
    const result = cfg.provider === 'gemini'
      ? await streamGemini(cfg, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage, guardedOnText, signal)
      : await streamOllama(cfg, systemPrompt, userMessage, guardedOnText, signal)
    _lastUsedProvider = cfg.provider
    return result
  } catch (err) {
    if (received) throw err // died mid-sentence — surface it honestly
    // A cancel is not a failure to route around: the user asked it to stop, and
    // quietly restarting the whole thing non-streamed would be the opposite of
    // what they pressed.
    if (err instanceof AIError && err.kind === 'cancelled') throw err

    // NOTHING ARRIVED — and what to do about that depends on what nothing meant.
    //
    // A host that timed out, or that could not be reached at all, is not going
    // to answer the non-streaming endpoint either. Handing this straight to
    // queryAI puts a SECOND full clock on the same dead address, so the bound
    // that promises eight seconds quietly costs sixteen — which is the exact
    // failure this slice is named after, wearing the costume of a retry. For
    // those two, go to the OTHER provider if there is one, and otherwise stop.
    if (err instanceof AIError && (err.kind === 'timeout' || err.kind === 'network')) {
      if (!canFallBack(cfg, err)) throw err
      const other: AIProvider = cfg.provider === 'gemini' ? 'ollama' : 'gemini'
      try {
        const result = await ask(cfg, other, systemPrompt, userMessage, signal)
        _lastUsedProvider = other
        onText(result)
        return result
      } catch {
        throw err // the original failure is the useful one
      }
    }

    // Anything else — a gateway that 404s the SSE endpoint, a proxy that
    // strips a chunked body — is a fact about STREAMING, not about the host.
    // The non-streaming path is exactly the right thing to try, and it brings
    // the provider fallback with it.
    const result = await queryAI(systemPrompt, userMessage, cfg, signal)
    onText(result)
    return result
  }
}

// Structured query that parses JSON response
export async function queryAIStructured<T>(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig,
  signal?: AbortSignal,
): Promise<T> {
  const result = await queryAI(
    systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the JSON object/array.',
    userMessage,
    config,
    signal,
  )

  // Strip markdown code blocks if AI includes them anyway
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // A model that decided to chat instead of answering is not a crash. The
    // caller gets a named failure it can show, with the first of what it said
    // so the misbehaviour is diagnosable rather than mysterious.
    throw new AIError('api', `The model did not return JSON. It said: ${cleaned.slice(0, 120)}`)
  }
}
