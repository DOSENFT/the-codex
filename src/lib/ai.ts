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

import { saveOrAnnounce } from './character'

export type AIProvider = 'gemini' | 'ollama'

/* THERE IS NO LIST OF GEMINI MODELS IN THIS FILE. There used to be — four ids
   compiled into the bundle, offered in three dropdowns, and one of them was the
   default. On 2026-08-26 Google retired the default and every AI feature in the
   app died with a 404 that said, in its own body, exactly which model to use
   instead. A shipped list of model ids is a shipped expiry date.

   What replaced it lives in the Gemini section below: `listGeminiModels()` asks
   the key what it can actually reach, `rankGeminiModels()` picks by PATTERN
   (newest flash → flash-lite → pro), and a 404 that names its own replacement
   is retried once against that name. See `resolveGeminiModel`. */

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
  /** The response body, UNTRUNCATED.
   *
   *  `message` is written for a person and clips the body at 200 characters.
   *  That was fine until a 404 body turned out to contain the fix — "Please
   *  update your code to use models/X" — and a machine needed to read it. Two
   *  audiences, two fields; the human sentence is not parsed and the raw body is
   *  not shown. */
  readonly body?: string
  constructor(kind: AIFailure, message: string, status?: number, body?: string) {
    super(message)
    this.name = 'AIError'
    this.kind = kind
    this.status = status
    this.body = body
  }
}

/** The sentence to put in front of a person when an AI call has failed.
 *
 *  `null` means SAY NOTHING, and that is why this returns a nullable rather
 *  than a string. A cancelled request is a decision, not a fault — `useAI`
 *  already refuses to paint red text for one (`useAI.ts:103`), and a component
 *  writing its own `catch` must be able to make the same distinction without
 *  re-deriving it.
 *
 *  This exists because the layer below already does the diagnostic work and the
 *  component layer was throwing it away. `queryAIStructured` builds "The model
 *  did not return JSON. It said: …" carrying the first 120 characters of what
 *  the model actually said; `geminiError` builds a 404 whose body names its own
 *  replacement model. Both were discarded by a bare `catch {}` in favour of a
 *  fixed sentence that named nothing — so no user and no future session could
 *  tell a dead key from a chatty model from a retired one. The generic sentence
 *  survives here as the LAST resort, for a thrown non-Error which has genuinely
 *  told us nothing, instead of being the only one. */
export function aiErrorMessage(err: unknown): string | null {
  if (err instanceof AIError) {
    if (err.kind === 'cancelled') return null
    return err.message
  }
  // Any other Error still knows more than the generic sentence does.
  if (err instanceof Error && err.message.trim()) return err.message
  return 'AI suggestion failed. Check your AI settings and try again.'
}

/* ─── Where the page is served from decides whether Ollama can exist ──────────

   THE DEFECT THIS BLOCK REPLACES, measured on the live site on 2026-08-22.
   Opening Settings on https://dosenft.github.io/the-codex/ fired

       GET https://dosenft.github.io/ollama/api/tags   →  404

   on every visit, and a 404 on a subresource is a console error. The old
   `getDefaultOllamaUrl` returned `${origin}/ollama` for any non-localhost host
   under the belief that a same-origin proxy would be there to catch it. That
   was true of the cloudflared tunnel it was written for. It is not true of
   GitHub Pages, which is static file hosting and cannot proxy anything, so the
   address the app invented for itself could never resolve. The app was probing
   a URL it had made up.

   And there is no address that WOULD have worked. The deployed page is https;
   a browser refuses outright to let an https page fetch `http://<lan-ip>:11434`
   or `http://localhost:11434`. Ollama is alive and well on the desktop — it
   answers 200 all day — but it is unreachable from a page served the way this
   one is served, and no amount of configuration changes that.

   So the rule is now about the ORIGIN, not about a URL: Ollama is offered when
   the page is served from the machine that could be running it, and otherwise
   the app says so in a sentence and defaults to Gemini. It probes nothing it
   has invented. Marcus can still type any address he likes into Settings — if
   he stands up a tunnel that really does proxy Ollama over https, that is his
   assertion to make and the app will use it. What the app will not do is
   fabricate one and then report its own fiction as an error.
   ------------------------------------------------------------------------- */

/** Is the page being served from this player's own machine?
 *
 *  This is the only question that decides the default, because it is the only
 *  question whose answer a browser will not override. */
export function isLocallyServed(): boolean {
  if (typeof window === 'undefined') return true   // node: tests, and the build
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
}

/** Why Ollama is not on offer here, in one sentence for a person who does not
 *  write software — or `null` when it IS on offer and there is nothing to say.
 *
 *  Two sentences rather than one because there are two genuinely different
 *  situations and telling someone the wrong one is worse than telling them
 *  nothing. A page served over https CANNOT reach a local Ollama and no typing
 *  will fix it. A page served over plain http from another machine on the LAN
 *  can, given the address — so it gets told that instead of being shut out. */
export function ollamaBlockedReason(): string | null {
  if (typeof window === 'undefined') return null
  if (isLocallyServed()) return null
  if (window.location.protocol === 'https:') {
    return 'This page is served over https, and a page served that way is not allowed to reach an Ollama server running on your own machine. On this device, use a free Gemini key instead.'
  }
  return 'This page is not being served from your own machine, so there is no Ollama address it can work out for you. Type the address of your Ollama server below, or use a free Gemini key instead.'
}

/** The provider a device gets before anyone has chosen one. */
export function getDefaultProvider(): AIProvider {
  return isLocallyServed() ? 'ollama' : 'gemini'
}

/** Resolve the Ollama URL from where the app is actually being served.
 *
 *  No address is compiled in any more, and — since the 404 above — none is
 *  invented either. Off the local machine this returns the empty string, which
 *  every caller already treats as "not configured": no URL, no probe, no
 *  request, and therefore no 404 to log. An empty string is an honest answer to
 *  "what is the Ollama address here?" when there is no way to know. */
export function getDefaultOllamaUrl(): string {
  return isLocallyServed() ? 'http://localhost:11434' : ''
}

const CONFIG_KEY = 'codex-ai-config'

function defaultConfig(): AIConfig {
  const url = getDefaultOllamaUrl()
  return {
    provider: getDefaultProvider(),
    // No default model id. Absent means "ask Google" — see resolveGeminiModel.
    // A default that names a model is a default with a shelf life.
    geminiModel: undefined,
    ollamaUrl: url || undefined,
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

  /* Migration: forget an address that cannot be reached from where we are.
   *
   * Fixing the default alone would have fixed nothing on the device that has
   * the defect. Every phone and laptop that has already opened the live site
   * has `{"provider":"ollama","ollamaUrl":"https://dosenft.github.io/ollama"}`
   * sitting in its localStorage, written by the code above this one, and a
   * saved value beats a default forever. So the stored value has to be dropped
   * too, or the 404 outlives the fix.
   *
   * The previous version of this migration did the opposite — it REWROTE a
   * saved LAN address INTO `${origin}/ollama`, manufacturing the very URL that
   * 404s. That is why it is gone rather than adjusted.
   *
   * Scope is deliberately narrow. Only two kinds of address are dropped: the
   * one the old code fabricated, and a private/loopback address that an https
   * page is simply not permitted to open. Anything else Marcus typed is left
   * exactly as he typed it — a tunnel that really does proxy Ollama is his
   * call to make, and this function does not get to second-guess it. */
  if (typeof window !== 'undefined' && !isLocallyServed()) {
    const url = config.ollamaUrl ?? ''
    const fabricated = url === `${window.location.origin}/ollama`
    const unreachable = /^https?:\/\/(?:192\.168\.|10\.|127\.|localhost\b|\[?::1\]?)/i.test(url)
    if (url && (fabricated || unreachable)) {
      config.ollamaUrl = undefined
      // A provider whose address we just dropped is not a provider. Move to
      // the one that can actually work here, so the message he gets is "add a
      // Gemini key" — which he can act on — rather than "no Ollama address",
      // which on this device he cannot.
      if (config.provider === 'ollama') config.provider = 'gemini'
    }
  }
  return config
}

export function saveAIConfig(config: AIConfig): void {
  saveOrAnnounce(CONFIG_KEY, JSON.stringify(config))
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
    return new AIError('api', 'API key does not have permission. Make sure the Generative Language API is enabled.', 403, errText)
  }
  return new AIError('api', `Gemini error (${response.status}): ${errText.slice(0, 200)}`, response.status, errText)
}

/* ─── Which model? Asked, never assumed ───────────────────────────────────────

   THE DEFECT THIS BLOCK REPLACES, reported by Marcus on 2026-08-26 with the
   error text in hand:

       Gemini error (404): {"error":{"code":404,"message":"This model
       models/<the one we shipped> is no longer available. Please update your
       code to use models/<the one that replaced it> for the latest features…

   Every AI feature in the app was dead — Character Forging included — because a
   model id had been compiled into the bundle in six places and Google retired
   it. Note what the error itself contains: the answer. The app had the fix in
   its hands and threw it away, because nothing read the body.

   (The two ids are redacted above because `ai.test.ts` greps this whole tree
   for the retired one and does not make an exception for a comment. Quoting the
   error verbatim tripped the very guard this block exists to justify — which is
   the guard working, so it stays and the quote gives way.)

   THE RULE NOW: the app never states which Gemini model exists. It asks the key
   (`listGeminiModels`), chooses by pattern rather than by name
   (`rankGeminiModels`), and when a request 404s with a replacement named in the
   body it uses that name — once — and remembers the winner.

   This is the same doctrine the Ollama block above already follows: do not
   fabricate an address and then report your own fiction as an error. A hardcoded
   model id is that same fiction with a longer fuse.
   ------------------------------------------------------------------------- */

/** One model as a picker wants it. Assembled from the id — no second API shape
 *  to depend on, and the same id always describes the same way. */
export interface GeminiModel {
  id: string
  label: string
  description: string
}

const MODEL_CACHE_KEY = 'codex-ai-models'
/** A day. Google retires models on the scale of months; asking more often than
 *  this spends a request on a question whose answer almost never changes, and
 *  asking less often is a day of 404s. The 404 path refreshes it immediately
 *  regardless, so this bound is about the quiet case only. */
export const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface ModelCache { fetchedAt: number; models: string[] }

function readModelCache(): ModelCache | null {
  try {
    const raw = localStorage.getItem(MODEL_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const c = parsed as Partial<ModelCache>
    if (!Array.isArray(c.models) || typeof c.fetchedAt !== 'number') return null
    return { fetchedAt: c.fetchedAt, models: c.models.filter(m => typeof m === 'string') }
  } catch {
    return null
  }
}

function writeModelCache(models: string[]): void {
  try {
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), models }))
  } catch {
    /* A cache that cannot be written is a cache miss, not a failure. Private
       browsing and a full quota both land here and neither is worth an error. */
  }
}

/** Ask the key what it can actually reach.
 *
 *  Only models that advertise `generateContent` survive the filter — the same
 *  list carries embedding and token-counting endpoints that would 400 if asked
 *  to write a sentence. Throws on network or auth failure; the caller decides
 *  whether that is fatal. */
export async function listGeminiModels(
  apiKey: string,
  signal?: AbortSignal,
  timeoutMs: number = AI_TIMEOUTS.connectMs,
): Promise<string[]> {
  const b = bound({ provider: 'gemini', connectTimeoutMs: timeoutMs, idleTimeoutMs: timeoutMs }, signal)
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
      { method: 'GET', headers: geminiHeaders(apiKey), signal: b.signal },
    )
    b.touch()
    if (!response.ok) throw await geminiError(response, 'the model list')
    const data = await response.json()
    const models: string[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: { name?: string }) => (m.name ?? '').replace(/^models\//, ''))
      .filter((id: string) => id.length > 0)
    return models
  } catch (err) {
    throw b.explain(err, 'Gemini')
  } finally {
    b.done()
  }
}

/** `gemini-2.5-flash-lite` → `{ major: 2, minor: 5 }`; unnumbered sorts oldest. */
function versionOf(id: string): number {
  const m = /gemini-(\d+)(?:\.(\d+))?/.exec(id)
  if (!m) return -1
  return Number(m[1]) * 1000 + Number(m[2] ?? 0)
}

/** Rank by SHAPE, never by name.
 *
 *  Gate 3 fixed the order: newest plain *flash, then *flash-lite, then
 *  everything else flash-ish, then *pro. Flash first because it is the tier
 *  with a real free quota and the one a phone at a table can afford to wait
 *  for; pro last because it is the one most likely to answer 429 on a free key.
 *
 *  Preview / experimental / thinking builds are pushed BELOW their stable
 *  siblings rather than dropped. Dropping them would mean a key that can only
 *  see preview models resolves to nothing — the open-world rule again: a
 *  ranking may prefer, it may not decide that something does not exist. */
export function rankGeminiModels(ids: string[]): string[] {
  const tierOf = (id: string): number => {
    if (/-flash$/.test(id)) return 0
    if (/flash-lite/.test(id)) return 1
    if (/flash/.test(id)) return 2
    if (/pro/.test(id)) return 3
    return 4
  }
  const unstable = (id: string) => (/preview|-exp|experimental|thinking/.test(id) ? 1 : 0)

  return ids
    .filter(id => /^gemini-/.test(id))
    .slice()
    .sort((a, b) =>
      unstable(a) - unstable(b) ||
      tierOf(a) - tierOf(b) ||
      versionOf(b) - versionOf(a) ||
      a.localeCompare(b))
}

/** A model id, described for a human, derived from the id itself.
 *
 *  Deliberately not read from the API's `displayName` / `description`: those are
 *  a second response shape to depend on, they are marketing copy rather than
 *  anything about quota, and a cached list of bare ids is all the resolver
 *  needs. The same id always describes the same way, and it is a pure function,
 *  so it is testable without a network. */
export function describeGeminiModel(id: string): GeminiModel {
  const words = id
    .replace(/^gemini-/, '')
    .split('-')
    .map(w => (/^\d+b$/i.test(w) ? w.toUpperCase() : /^[\d.]+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

  const description =
    /preview|-exp|experimental|thinking/.test(id) ? 'Preview build — may change or vanish'
    : /-flash$/.test(id) ? 'Fast, and the most generous free quota'
    : /flash-lite/.test(id) ? 'Lightest. Its own separate quota'
    : /flash/.test(id) ? 'A flash variant. Its own separate quota'
    : /pro/.test(id) ? 'Strongest, and the tightest free quota'
    : 'Its own separate quota'

  return { id, label: `Gemini ${words}`.trim(), description }
}

/** Google's 404 body names its own replacement. Read it.
 *
 *  Matched on "use … models/X" specifically, because the same sentence names
 *  the RETIRED model first ("This model models/… is no longer available") and a
 *  greedy match for `models/…` would helpfully retry the dead one forever. */
export function replacementFromError(body: string | undefined): string | null {
  if (!body) return null
  const explicit = /\buse\s+(?:the\s+)?(?:model\s+)?models\/([\w.-]+)/i.exec(body)
  if (explicit) return explicit[1]
  const loose = /\buse\s+(?:the\s+)?(gemini-[\w.-]+)/i.exec(body)
  return loose ? loose[1] : null
}

/** The last time the app changed model on its own, in one sentence for a person
 *  — or null. Read by Settings so a silent switch is never silent. */
let _lastModelNotice: string | null = null
export function getLastModelNotice(): string | null { return _lastModelNotice }
export function clearModelNotice(): void { _lastModelNotice = null }

/** The live list, cached. Returns null when it cannot be had at all — a stale
 *  cache beats no cache, and no cache beats a guess. */
async function knownModels(apiKey: string, signal?: AbortSignal): Promise<string[] | null> {
  const cached = readModelCache()
  if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS && cached.models.length > 0) {
    return cached.models
  }
  try {
    const live = await listGeminiModels(apiKey, signal)
    if (live.length > 0) writeModelCache(live)
    return live.length > 0 ? live : (cached?.models ?? null)
  } catch {
    return cached?.models ?? null
  }
}

/** Which model this request should use.
 *
 *  Precedence: a chosen model that the key can still reach → the best match by
 *  pattern → a chosen model we could not verify (offline, say) → an error that
 *  says so. There is no branch that invents an id. */
export async function resolveGeminiModel(cfg: AIConfig, signal?: AbortSignal): Promise<string> {
  if (!cfg.geminiApiKey) {
    throw new AIError('config', 'No Gemini API key set. Add one in Settings, or switch to Ollama.')
  }
  const chosen = cfg.geminiModel?.trim() || ''
  const live = await knownModels(cfg.geminiApiKey, signal)

  if (live && live.length > 0) {
    if (chosen && live.includes(chosen)) return chosen
    const best = rankGeminiModels(live)[0] ?? live[0]
    if (best) {
      if (chosen) {
        _lastModelNotice = `${chosen} is not available on this key any more. Now using ${best}.`
      }
      return best
    }
  }

  // Could not ask. An id he chose himself is still the best information here —
  // it is his assertion, exactly like a typed Ollama address.
  if (chosen) return chosen
  throw new AIError(
    'api',
    'Could not ask Google which models this key can use, and no model has been chosen in Settings. Check the key and your connection.',
  )
}

/** A 404 that names its successor, turned into that successor — or null when
 *  this failure is not that, which is most of the time.
 *
 *  Persists the winner so the next session starts on it. Returns null if the
 *  replacement is the model that just failed: that is the loop, and it is
 *  closed here rather than bounded by a counter somewhere else. */
async function retiredModelReplacement(
  cfg: AIConfig,
  failed: string,
  err: unknown,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!(err instanceof AIError) || err.status !== 404) return null
  const body = err.body ?? err.message
  if (!/no longer available|not found|is not supported/i.test(body)) return null
  if (!cfg.geminiApiKey) return null

  const hint = replacementFromError(body)

  let live: string[] = []
  try {
    live = await listGeminiModels(cfg.geminiApiKey, signal)
    if (live.length > 0) writeModelCache(live)
  } catch {
    live = []
  }

  const next =
    hint && (live.length === 0 || live.includes(hint)) ? hint
    : rankGeminiModels(live)[0] ?? null

  if (!next || next === failed) return null

  _lastModelNotice = `Google retired ${failed}. Switched to ${next} and carried on.`
  try {
    saveAIConfig({ ...loadAIConfig(), geminiModel: next })
  } catch {
    /* Not being able to remember the new model is not a reason to fail the
       request that is already in flight. It will be re-resolved next time. */
  }
  return next
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

const ask = async (cfg: AIConfig, provider: AIProvider, systemPrompt: string, userMessage: string, signal?: AbortSignal): Promise<string> => {
  requireCredentials(cfg, provider)
  if (provider !== 'gemini') return queryOllama(cfg, systemPrompt, userMessage, signal)

  const model = await resolveGeminiModel(cfg, signal)
  try {
    return await queryGemini(cfg, model, systemPrompt, userMessage, signal)
  } catch (err) {
    // ONCE. `retiredModelReplacement` returns null when the replacement is the
    // model that just failed, so a Google that keeps naming a dead id cannot
    // spin here — and a second 404 has no third attempt to reach for.
    const next = await retiredModelReplacement(cfg, model, err, signal)
    if (!next) throw err
    return await queryGemini(cfg, next, systemPrompt, userMessage, signal)
  }
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
    let result: string
    if (cfg.provider === 'gemini') {
      const model = await resolveGeminiModel(cfg, signal)
      try {
        result = await streamGemini(cfg, model, systemPrompt, userMessage, guardedOnText, signal)
      } catch (streamErr) {
        // Same one-shot contract as `ask`. A retirement 404 arrives before any
        // bytes do, so `received` is still false and retrying is honest.
        const next = await retiredModelReplacement(cfg, model, streamErr, signal)
        if (!next) throw streamErr
        result = await streamGemini(cfg, next, systemPrompt, userMessage, guardedOnText, signal)
      }
    } else {
      result = await streamOllama(cfg, systemPrompt, userMessage, guardedOnText, signal)
    }
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
