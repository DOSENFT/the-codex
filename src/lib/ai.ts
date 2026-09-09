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

export type AIProvider = 'gemini' | 'ollama' | 'openrouter'

/* WHY THERE IS A THIRD PROVIDER, added 2026-09-09 at Marcus's request.
   ----------------------------------------------------------------------------
   Three separate failures inside one week, all from the same free tier, all at
   a table mid-session: a 429 (quota exhausted), a 503 (model overloaded) and a
   503 (high demand). Slice 11's retry and slice 12's overload handling made
   each of those survivable; none of them made it survivABLE TWICE, because the
   only place to fall back to was Ollama, and Ollama is unreachable from an
   https page on a phone (see the origin block below). So on the device he
   actually plays on, "fallback" meant one provider with a retry.

   One free tier was a single point of failure. OpenRouter is a second one, and
   critically a second one that is reachable from where the app is served.

   IT HAD TO BE CORS-CLEAN OR IT WAS NOT AN OPTION. This app is a static
   GitHub Pages site with no backend at all: every request in this file goes
   browser → provider, directly. Verified against the live endpoint on
   2026-09-09 before a line of this was written —

       OPTIONS https://openrouter.ai/api/v1/chat/completions
         Origin: https://dosenft.github.io
       → 204, Access-Control-Allow-Origin: *
         Access-Control-Allow-Headers: Authorization, …, HTTP-Referer, X-Title

   — which is the whole reason this is possible and Anthropic's or OpenAI's
   direct API would not have been. Do not "simplify" the header set below
   without re-checking that list; `Authorization`, `HTTP-Referer` and `X-Title`
   are on it by name, and a header that is not on it turns every request into a
   preflight failure that looks like a network outage. */

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

/** How much EXTRA wall-clock the fallback chain is allowed to spend after the
 *  provider he chose has already failed.
 *
 *  THE NUMBER IS ABOUT A PERSON, NOT ABOUT A NETWORK. With three providers the
 *  naive chain is unbounded in the way that matters: connect 8s, then up to two
 *  retries whose waits are capped at 20s each, then the next provider, then the
 *  one after that. Worst case is well over a minute of a disabled panel — which
 *  is the exact defect slice 11 is named for, wearing the costume of
 *  resilience. Twenty seconds is roughly the longest anyone holds a phone
 *  mid-combat before they just roll and narrate it themselves; past that the
 *  honest thing is to fail and give the table back its turn.
 *
 *  IT GATES STARTING AN ATTEMPT, IT DOES NOT INTERRUPT ONE. Checked before each
 *  provider, and it clamps that provider's CONNECT clock to whatever is left —
 *  but never its IDLE clock. That is deliberate and it is this file's oldest
 *  rule: silence is the failure, slowness is not. A fallback that has started
 *  producing words has earned the same patience as the primary, so the true
 *  worst case is this budget plus one idle clock, and not one attempt more. */
export const AI_FALLBACK_BUDGET_MS = 20_000

/** Temperature is a function of what is being asked for, not a global.
 *
 *  Every call in this file used to send 0.3 — Gemini's, Ollama's, all of them.
 *  0.3 is an EXTRACTION setting. It is the right number for "read this sheet
 *  and give me the JSON", and it is why the roleplay hooks all sounded like the
 *  same NPC: at 0.3 a model reaches for its single most probable next word
 *  every time, so the prose comes out sanded flat. Marcus's stated ask was
 *  "really good rp hooks, context, understanding, creativity."
 *
 *  `structured` stays at 0.3 on purpose. Most of the 22 call sites in this app
 *  go through `queryAIStructured`, which parses the answer; a creative model
 *  breaks JSON by garnishing it, and a parse failure is a dead panel rather
 *  than a duller sentence. Reliability beats flair everywhere a machine reads
 *  the output.
 *
 *  `prose` is 0.9. The creative band for roleplay generation sits around
 *  0.8–1.0; 0.9 is chosen inside it rather than at either edge for two specific
 *  reasons. Below ~0.8 the flattening above is still visible — it reads like a
 *  summary of a scene instead of the scene. At 1.0 and up, the quantized local
 *  models this app is actually pointed at (a 27B on his 3090) start dropping
 *  proper nouns and drifting off the character sheet, which at a table is worse
 *  than dull: it is confidently wrong about his own paladin. 0.9 buys the
 *  variety and keeps the sheet. */
export const AI_TEMPERATURE = {
  /** Anything a parser reads. Do not raise this. */
  structured: 0.3,
  /** Anything a person reads. */
  prose: 0.9,
} as const

export interface AIConfig {
  provider: AIProvider
  geminiApiKey?: string
  geminiModel?: string
  ollamaUrl?: string
  ollamaModel?: string
  /* NOTHING ABOVE THIS LINE MAY BE RENAMED. There is a real saved config in a
     real browser's localStorage, written by a build that never heard of
     OpenRouter, and `loadAIConfig` merges it over the defaults key by key. A
     rename is not a rename, it is a silent wipe of his Gemini key at a table. */
  openrouterApiKey?: string
  /** '' / absent means automatic — resolve the best free model every request,
   *  exactly as an absent `geminiModel` does. */
  openrouterModel?: string
  /** When true, if the primary provider fails, walk the others. */
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
export type AIFailure = 'timeout' | 'cancelled' | 'config' | 'auth' | 'network' | 'api'

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

/** Write the WHOLE config. Everything not in `config` is gone.
 *
 *  Read that sentence again before calling this. The object you hand it is not
 *  a set of changes, it is the entire remembered state of every provider, and
 *  a field you simply did not mention is a field you just deleted. Reach for
 *  `updateAIConfig` instead unless you genuinely mean "replace all of it" —
 *  a reset, or a caller that has already merged (see `resolveGeminiModel`'s
 *  `{ ...loadAIConfig(), geminiModel: next }`). */
export function saveAIConfig(config: AIConfig): void {
  saveOrAnnounce(CONFIG_KEY, JSON.stringify(config))
}

/* WHY A PATCH FUNCTION EXISTS, added 2026-09-09.
   ----------------------------------------------------------------------------
   `saveAIConfig` is a whole-config write, and every form in the app was handing
   it an object built from ONE provider's fields:

       saveAIConfig({ provider, geminiApiKey: p === 'gemini' ? key : undefined,
                                ollamaUrl:    p === 'ollama' ? url : undefined })

   Read as a form submission that looks right. Read as what it is — a full
   overwrite — it says "and delete the OpenRouter key". So finishing first-run
   setup on Gemini silently erased the OpenRouter key that had been pasted in
   the day before, with nothing on screen saying so. The failure only surfaces
   later, at a table, as "fallback didn't work": the chain Marcus built out of
   three providers to survive a 429 had quietly collapsed back to one, which is
   the exact single point of failure the third provider was added to remove.

   TWO SPELLINGS OF NOTHING, AND THEY MEAN OPPOSITE THINGS. That is the whole
   design of this function:

     • `undefined` / key absent — "I am not editing this field." Left alone.
       This is what a form for one provider says about the other two.
     • `''` — "I am editing this field and I blanked it." Deleted, so a key
       really can be removed and an emptied model box really does go back to
       Automatic.

   Deleted, not stored as `''`, because ABSENT is the spelling the rest of this
   module reads: `resolveGeminiModel` treats absent as "ask Google", and a
   config that has never been touched has no key at all. Two spellings for one
   meaning is how the old hard-coded default leaked. */

/** Change only the fields you name, and keep every other provider's
 *  credentials. Returns the config as it now stands on disk.
 *
 *  `provider` is a field like any other: naming it DOES switch the active
 *  provider, which is the one thing these forms are supposed to change. */
export function updateAIConfig(patch: Partial<AIConfig>): AIConfig {
  // Index-signature view of a closed interface: the loop below is generic over
  // keys, and `Partial<AIConfig>`'s value union cannot be narrowed per-key
  // without writing all eleven fields out by hand — which is precisely the
  // enumerate-every-field pattern that caused the bug.
  const merged = { ...loadAIConfig() } as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue        // not named = not edited = not touched
    if (value === '') { delete merged[key]; continue }   // named and blanked = removed
    merged[key] = value
  }
  const next = merged as unknown as AIConfig
  saveAIConfig(next)
  return next
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

/** Was this failure worth trying another provider for?
 *
 *  A cancel is the user's decision and is final. A missing credential is a
 *  fact about configuration that a second attempt cannot change. Everything
 *  else — dead host, timeout, exhausted quota, a 500 from Google — is exactly
 *  the case the other providers exist for.
 *
 *  `auth` JOINED THAT LIST ON 2026-09-09, and it is a real change of behaviour:
 *  a key the provider has actively REJECTED used to be kind `api`, and so used
 *  to fall back. It no longer does, for the same reason a missing key does not.
 *  A rejected key is a broken credential wearing an HTTP status, the second
 *  provider cannot repair it, and routing silently around it is how a dead key
 *  stays dead for a month — every session quietly costing him the provider he
 *  actually chose while nothing on screen ever says the word "key". The one
 *  thing the app owes him here is the sentence naming what to fix. */
function isWorthFallingBackFrom(err: unknown): boolean {
  if (err instanceof AIError) {
    return err.kind !== 'cancelled' && err.kind !== 'config' && err.kind !== 'auth'
  }
  return true
}

/** Does this provider have what it needs to be worth ATTEMPTING?
 *
 *  The chain below is built out of this rather than out of hope. A provider
 *  with no key is not a provider that failed, it is a provider that was never
 *  there — attempting it would spend one of the three clocks in the budget to
 *  rediscover a fact already sitting in the config, and would then report a
 *  `config` error naming a provider Marcus never chose. */
export function isProviderConfigured(cfg: AIConfig, provider: AIProvider): boolean {
  if (provider === 'gemini') return !!cfg.geminiApiKey
  if (provider === 'openrouter') return !!cfg.openrouterApiKey
  return !!cfg.ollamaUrl && !!cfg.ollamaModel
}

/** The order the chain is walked, before the primary and the unconfigured are
 *  removed from it.
 *
 *  Both cloud providers come before Ollama, and that ordering is a fact about
 *  the room rather than about the models. Gemini and OpenRouter are reachable
 *  from wherever the phone is; Ollama is reachable from one house, on one
 *  network, when one desktop happens to be awake — and from the deployed https
 *  page it is not reachable at all (see the origin block above). Putting the
 *  address most likely to be dead first would spend the budget on it.
 *
 *  Gemini before OpenRouter because Gemini is the tier Marcus already has a key
 *  for and has been using; when it is the primary it is removed anyway, so this
 *  only decides the order for an Ollama-primary desktop. */
const FALLBACK_ORDER: readonly AIProvider[] = ['gemini', 'openrouter', 'ollama'] as const

/** Every provider worth trying after `err`, in the order to try them.
 *
 *  Empty means stop and surface the failure — either because the switch is off,
 *  because the failure is terminal, or because there is genuinely nowhere else
 *  to go. All three of those are different situations and none of them is
 *  "try harder".
 *
 *  Exported and pure so the ORDER is testable without a network. The pair-wise
 *  version of this ("the other one") could be checked by eye; a chain cannot,
 *  which is the same argument that made `canFallBack` a named function after
 *  the precedence bug. */
export function fallbackChain(cfg: AIConfig, err: unknown): AIProvider[] {
  if (cfg.fallbackEnabled === false) return []
  if (!isWorthFallingBackFrom(err)) return []
  return FALLBACK_ORDER.filter(p => p !== cfg.provider && isProviderConfigured(cfg, p))
}

/** Is there anywhere at all to fall back to?
 *
 *  Kept as its own exported name because the expression it originally replaced
 *  was a precedence bug that no amount of reading caught and one unit test did.
 *  It is now one question about the chain rather than a second copy of the
 *  chain's reasoning — two places that both decide "may we fall back?" is how
 *  the first version of this got it wrong. Do not inline it. */
export function canFallBack(cfg: AIConfig, err: unknown): boolean {
  return fallbackChain(cfg, err).length > 0
}

/** The credentials each provider cannot work without, checked BEFORE any
 *  request. The old code passed `cfg.geminiApiKey!` straight into a URL, so a
 *  missing key produced `?key=undefined` and a 400 from Google that read like a
 *  Google problem. It is not a Google problem. */
function requireCredentials(cfg: AIConfig, provider: AIProvider): void {
  if (provider === 'gemini' && !cfg.geminiApiKey) {
    throw new AIError('config', 'No Gemini API key set. Add one in Settings, or switch to Ollama.')
  }
  if (provider === 'openrouter' && !cfg.openrouterApiKey) {
    throw new AIError('config', 'No OpenRouter API key set. Add one in Settings — a free key at openrouter.ai/keys reaches the free models.')
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

/* ─── `num_ctx`, and the truncation nobody can see ────────────────────────────

   OLLAMA'S DEFAULT CONTEXT IS 4096 TOKENS AND IT TRUNCATES SILENTLY. Not an
   error, not a warning, not a field in the response — the server simply drops
   the front of the conversation off the edge and answers confidently with what
   is left. Every request this app makes carries a full character sheet plus
   scene history plus the system prompt, which is comfortably past 4096, so the
   part that fell off the front was the BACKSTORY: the model would answer in
   fluent, plausible, entirely generic D&D, having never seen who Nix is.

   That is the worst shape a bug can have here. A dead provider is obvious and
   the fallback catches it. This looked like the AI working — it just quietly
   stopped knowing anything about his character, and there is no output you
   could inspect to tell the two apart.

   32768 because it must hold sheet + history + answer with room to spare, and
   because it is what a 3090 can actually keep resident alongside a 27B model.

   IT IS IN THE REQUEST BODY ON PURPOSE, not in OLLAMA_NUM_CTX or a Modelfile.
   An env var on the server is a setting that lives on one desktop and is absent
   the moment he points this at any other host — which is precisely how the app
   ended up with a hard-coded LAN address once already. The request is the only
   place the app controls.

   DO NOT DELETE THIS AS DEAD CONFIG. It looks like a tunable and it is a
   correctness fix; removing it restores a silent failure that reports success. */
const OLLAMA_NUM_CTX = 32768

const ollamaOptions = (temperature: number) => ({ temperature, num_ctx: OLLAMA_NUM_CTX })

async function queryOllama(cfg: AIConfig, systemPrompt: string, userMessage: string, temperature: number, signal?: AbortSignal): Promise<string> {
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
        options: ollamaOptions(temperature),
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

const geminiBody = (systemPrompt: string, userMessage: string, temperature: number) => JSON.stringify({
  system_instruction: { parts: [{ text: systemPrompt }] },
  contents: [{ parts: [{ text: userMessage }] }],
  generationConfig: { temperature, maxOutputTokens: 2048 },
})

/* ─── Transient failures, and the one that was never handled ──────────────────

   REPORTED BY MARCUS ON 2026-09-07, with the screenshot, mid-session:

       Gemini error (503): { "error": { "code": 503, "message": "This model is
       currently experiencing high demand. Spikes in demand are usually
       temporary. Please try again later.", "status": "UNAVAILABLE" } }

   Read what the app did with that. Google said *temporary* and *try again*, and
   the app did neither — it pasted the raw JSON into the middle of a roleplay
   card and stopped. Only 429 was ever retried, so a quota problem recovered
   silently while an overloaded-model problem died in his face. From the table
   that reads as "the AI works randomly", which is exactly how he described it.

   A 503 is the single most common Gemini failure on a free tier at peak hours,
   and it is the most retryable thing the API can say. */

/** Statuses worth trying again. 429 is quota, the 5xx family is Google having a
 *  bad minute; both are about WHEN you asked, not WHAT you asked. Everything
 *  else — a bad key, a retired model, a malformed request — will fail exactly
 *  the same way the second time, and retrying it just makes the user wait. */
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504])

const MAX_RETRIES = 2

/** How long to wait before attempt N+1, or null to stop trying.
 *
 *  Pure and exported so it can be tested without a network: the retry policy is
 *  the part most likely to be wrong, and the part hardest to observe in a
 *  browser at a D&D table.
 *
 *  `retryAfterSeconds` is Google's own advice, which arrives over the network
 *  and is therefore clamped before it is obeyed — an upstream that says "retry
 *  in 3600 seconds" must not be able to park the app for an hour. When there is
 *  no advice (a 503 rarely carries any) the wait backs off 1s then 3s, which is
 *  long enough for a demand spike to pass and short enough that he does not put
 *  the phone down. */
export function retryDelayMs(
  status: number,
  attempt: number,
  retryAfterSeconds: number | null,
  capMs: number = AI_TIMEOUTS.retryCapMs,
): number | null {
  if (!TRANSIENT_STATUSES.has(status)) return null
  if (attempt >= MAX_RETRIES) return null

  const advised = retryAfterSeconds !== null && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null
  // 429 without advice means quota, where a long wait is the honest one. A 5xx
  // is a spike, where a short one usually clears it.
  const base = advised ?? (status === 429 ? 15_000 : attempt === 0 ? 1_000 : 3_000)
  return Math.min(base, capMs)
}

/** Google's `RetryInfo.retryDelay`, if the body carries one. Never throws: an
 *  error body that is not JSON is normal and must not become a second error. */
export function retryAfterSecondsFrom(errText: string): number | null {
  try {
    const data = JSON.parse(errText)
    const info = data.error?.details?.find((d: { '@type'?: string }) => d['@type']?.includes('RetryInfo'))
    if (!info?.retryDelay) return null
    const seconds = parseInt(info.retryDelay, 10)
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null
  } catch {
    return null
  }
}

/** Turn a non-OK Gemini response into something a person can act on.
 *
 *  NOTHING HERE PASTES A RESPONSE BODY INTO THE UI ANY MORE, except the 404
 *  case, whose body names the model that replaced the retired one and is the
 *  only body that has ever helped anybody. The full text still rides along in
 *  `AIError.body` for the console and for the model-retirement parser; it just
 *  no longer lands in the middle of a scene. */
export function geminiErrorFrom(status: number, errText: string, model: string): AIError {
  if (status === 429) {
    return new AIError('api',
      `Rate limited on ${model}. Your free-tier quota is exhausted. Try switching to a different model in Settings — each model has its own quota.`,
      429, errText)
  }
  if (status === 400 && errText.includes('API_KEY_INVALID')) {
    // `auth`, not `api` — see `isWorthFallingBackFrom`. A key Google has looked
    // at and refused is not a bad minute, it is a broken credential, and no
    // other provider in the chain can mend it.
    return new AIError('auth', 'Invalid API key. Check your key at aistudio.google.com/apikey', 400)
  }
  if (status === 403) {
    return new AIError('api', 'API key does not have permission. Make sure the Generative Language API is enabled.', 403, errText)
  }
  if (status === 404) {
    // The body is the fix. `recoverRetiredModel` reads it; the message keeps it.
    return new AIError('api', `Gemini error (404): ${errText.slice(0, 200)}`, 404, errText)
  }
  if (TRANSIENT_STATUSES.has(status)) {
    // We already retried and it still failed. Say so as a fact about Google's
    // afternoon, not as a stack trace — and say what is still true, because at
    // a table the useful half of a failure is what still works without it.
    return new AIError('api',
      `${model} is overloaded right now — Google's side, not yours (HTTP ${status}). ` +
      `Tried ${MAX_RETRIES + 1} times. Your sheet, dice and everything already on screen still work.`,
      status, errText)
  }
  return new AIError('api',
    `Gemini refused that request (${status}). Check the model and key in Settings.`,
    status, errText)
}

async function geminiError(response: Response, model: string): Promise<AIError> {
  return geminiErrorFrom(response.status, await response.text().catch(() => ''), model)
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
/** OpenRouter's list gets its OWN key rather than sharing Gemini's.
 *
 *  One key holding two providers' lists would mean opening Settings on the
 *  OpenRouter tab evicts the Gemini list and vice versa, so the "asked once a
 *  day" bound below quietly becomes "asked every time he switches tabs" — and
 *  worse, a cache read by the wrong resolver hands Gemini ids to OpenRouter.
 *  Separate keys also mean this whole feature is additive in storage: a browser
 *  that has never seen this build has no `codex-openrouter-models` and reads it
 *  as a miss, which is exactly right. */
const OPENROUTER_MODEL_CACHE_KEY = 'codex-openrouter-models'
/** A day. Google retires models on the scale of months; asking more often than
 *  this spends a request on a question whose answer almost never changes, and
 *  asking less often is a day of 404s. The 404 path refreshes it immediately
 *  regardless, so this bound is about the quiet case only.
 *
 *  It governs OpenRouter's list too. That list churns considerably faster —
 *  free models appear and are withdrawn weekly — but the failure mode is
 *  identical and so is the fix: a model that has gone away answers 404, and the
 *  resolver re-asks rather than trusting the day-old answer. */
export const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface ModelCache<T> { fetchedAt: number; models: T[] }

/** The 24h cache, over any model record.
 *
 *  Generic because OpenRouter needs to remember more than an id: the ranking
 *  below is free-models-first, and whether a model is free is not derivable
 *  from its id (verified against the live list on 2026-09-09 — 21 models price
 *  at zero, only 18 of them carry the `:free` suffix). A cache of bare ids
 *  would force a second network call to re-learn the prices, which is the
 *  opposite of what a cache is for. `keep` is passed in so a cache written by a
 *  different build cannot be read back as the wrong shape. */
function readCache<T>(key: string, keep: (v: unknown) => v is T): ModelCache<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const c = parsed as Partial<ModelCache<unknown>>
    if (!Array.isArray(c.models) || typeof c.fetchedAt !== 'number') return null
    return { fetchedAt: c.fetchedAt, models: c.models.filter(keep) }
  } catch {
    return null
  }
}

function writeCache<T>(key: string, models: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), models }))
  } catch {
    /* A cache that cannot be written is a cache miss, not a failure. Private
       browsing and a full quota both land here and neither is worth an error. */
  }
}

const isString = (v: unknown): v is string => typeof v === 'string'

const readModelCache = () => readCache(MODEL_CACHE_KEY, isString)
const writeModelCache = (models: string[]) => writeCache(MODEL_CACHE_KEY, models)

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
  temperature: number,
  signal?: AbortSignal,
  attempt = 0,
): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers: geminiHeaders(cfg.geminiApiKey!), signal: b.signal, body: geminiBody(systemPrompt, userMessage, temperature) },
    )
    b.touch()

    if (!response.ok) {
      /* The body is read ONCE and then reasoned about, rather than read for the
         retry and read again for the message — a Response body can only be
         consumed once, and the old shape got away with it only because the 429
         branch returned before the error branch could try. */
      const errText = await response.text().catch(() => '')
      const waitMs = retryDelayMs(response.status, attempt, retryAfterSecondsFrom(errText))

      if (waitMs !== null) {
        // The wait itself is interruptible. A sleep that ignores the signal is
        // the same bug as a fetch that ignores it, wearing a different hat.
        await sleep(waitMs, signal)
        return queryGemini(cfg, model, systemPrompt, userMessage, temperature, signal, attempt + 1)
      }

      throw geminiErrorFrom(response.status, errText, model)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
  } catch (err) {
    throw b.explain(err, 'Gemini')
  } finally {
    b.done()
  }
}

/* ─── OpenRouter ──────────────────────────────────────────────────────────────

   The second free tier, added 2026-09-09. See the note under `AIProvider` for
   why it exists and for the CORS preflight that made it possible at all.

   Everything below is deliberately shaped like the Gemini block above it: the
   key rides in a header, no model id is compiled in, the list is asked for and
   ranked by pattern, the errors go through `retryDelayMs` and come out as
   sentences rather than response bodies. That is not tidiness. It is so that
   the next failure at a table behaves the same way whichever provider is
   serving, and so that a fix to one of them is obviously a fix to all three.
   ------------------------------------------------------------------------- */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/** Verified against the live preflight on 2026-09-09; all three of these are
 *  named in OpenRouter's `Access-Control-Allow-Headers`.
 *
 *  `HTTP-Referer` and `X-Title` are OPTIONAL — they only decide how the app is
 *  labelled on openrouter.ai's own leaderboards, and nothing about whether the
 *  request works. They are sent anyway because a request that arrives
 *  anonymous is one Marcus cannot recognise in his own usage dashboard when he
 *  is trying to work out which of his devices burned the day's free quota.
 *
 *  The referer is read from the live origin rather than hard-coded, because a
 *  compiled-in address is the exact defect this file already has a 200-line
 *  comment about. Under node (tests, build) there is no window and the two
 *  optional headers are simply absent, which is what "optional" means. */
const openrouterHeaders = (apiKey: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
  ...(typeof window === 'undefined' ? {} : {
    'HTTP-Referer': window.location.origin,
    'X-Title': 'The Codex',
  }),
})

/** OpenAI-shaped, because OpenRouter is an OpenAI-compatible endpoint. Same two
 *  messages and the same 2048-token ceiling the Gemini body uses, so a switch
 *  between providers is not also a silent switch of answer length. */
const openrouterBody = (
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  stream: boolean,
) => JSON.stringify({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
  temperature,
  max_tokens: 2048,
  stream,
})

/** OpenRouter answers 429 and 503 with a `Retry-After` header rather than
 *  Google's `RetryInfo` inside the body, so the advice arrives somewhere else
 *  and is read somewhere else — but it is clamped by the same `retryDelayMs`,
 *  for the same reason. Advice from the network does not get to decide how long
 *  the app is allowed to be unresponsive. */
export function retryAfterHeaderSeconds(response: Pick<Response, 'headers'>): number | null {
  const raw = response.headers?.get?.('Retry-After')
  if (!raw) return null
  const seconds = parseInt(raw, 10)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

/** Turn a non-OK OpenRouter response into something a person can act on.
 *
 *  The statuses and their meanings are OpenRouter's own, read from
 *  https://openrouter.ai/docs/api-reference/errors on 2026-09-09 rather than
 *  guessed from the OpenAI shape — 402 and 503 in particular mean things no
 *  other provider in this file means.
 *
 *  SAME RULE AS `geminiErrorFrom`: the body never lands in the middle of a
 *  scene. It rides in `AIError.body` for the console, and the sentence names
 *  what broke, whose fault it is, and what still works without it. */
export function openrouterErrorFrom(status: number, errText: string, model: string): AIError {
  if (status === 401) {
    // `auth`: terminal, and it stops the chain. See `isWorthFallingBackFrom`.
    return new AIError('auth',
      'OpenRouter rejected that key. Check it at openrouter.ai/keys — a key that worked yesterday can be disabled or rotated from that page.',
      401)
  }
  if (status === 402) {
    /* The one status that is genuinely surprising on a free tier, and the
       reason it gets its own sentence instead of the generic one: it does not
       mean "you owe money", it almost always means the model that got picked
       was not actually a free one. */
    return new AIError('api',
      `OpenRouter wants credits for ${model}. The free models cost nothing, so this means that one is not free — pick a model marked Free in Settings, or set the model to Automatic and it will only ever choose free ones.`,
      402, errText)
  }
  if (status === 403) {
    return new AIError('api',
      `OpenRouter's moderation refused that request on ${model} — not your key, and not your quota (HTTP 403). Free models filter differently from each other, so another one in Settings will often take it. Your sheet, dice and everything already on screen still work.`,
      403, errText)
  }
  if (status === 404) {
    /* Free models on OpenRouter appear and are withdrawn on the scale of
       WEEKS, not months — a much faster clock than Google's retirements. So a
       404 here is the ordinary case rather than an emergency, and the sentence
       points at the setting that makes it stop happening. */
    return new AIError('api',
      `OpenRouter no longer offers ${model}. Its free models come and go weekly — pick another in Settings, or set the model to Automatic and it will choose a live free one every request.`,
      404, errText)
  }
  if (status === 429) {
    return new AIError('api',
      `Rate limited on ${model}. OpenRouter's free allowance is counted per model and per day, so switching to a different free model in Settings usually works immediately. Your sheet, dice and everything already on screen still work.`,
      429, errText)
  }
  if (TRANSIENT_STATUSES.has(status)) {
    // 502 is "the model provider behind OpenRouter is down"; 503 is "no
    // provider could be routed to at all". Both are somebody else's afternoon.
    return new AIError('api',
      `${model} is unavailable right now — OpenRouter's side, not yours (HTTP ${status}). ` +
      `Tried ${MAX_RETRIES + 1} times. Your sheet, dice and everything already on screen still work.`,
      status, errText)
  }
  return new AIError('api',
    `OpenRouter refused that request (${status}). Check the model and key in Settings.`,
    status, errText)
}

/** One OpenRouter model as a picker and a ranker want it.
 *
 *  `free` and `contextLength` are carried rather than re-derived because
 *  neither is recoverable from the id. Verified against the live list on
 *  2026-09-09: 21 models price at zero and only 18 of those carry the `:free`
 *  suffix, so a ranking that trusted the suffix alone would hide three free
 *  models from a man who is not paying for any of this. */
export interface OpenRouterModel {
  id: string
  label: string
  description: string
  free: boolean
  contextLength: number
}

/** A model id, described for a human, derived from the id and the price.
 *
 *  Same doctrine as `describeGeminiModel`: NOT read from the API's `name` and
 *  `description` fields, even though OpenRouter has both. Those are a second
 *  response shape to depend on and they are marketing copy; what actually
 *  decides whether Marcus can use a model is the price and the context window,
 *  and both of those are said here in his own terms. */
export function describeOpenRouterModel(id: string, free: boolean, contextLength: number): OpenRouterModel {
  const [vendor, rest] = id.includes('/') ? [id.slice(0, id.indexOf('/')), id.slice(id.indexOf('/') + 1)] : ['', id]
  const title = (s: string) => s
    .replace(/:free$/, '')
    .split(/[-_]/)
    .map(w => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

  const label = [vendor && title(vendor), title(rest)].filter(Boolean).join(' · ')

  // Context in thousands, because "262144" is a number nobody reads and "262K"
  // is the one fact that decides whether a full character sheet fits.
  const ctx = contextLength >= 1000 ? `${Math.round(contextLength / 1000)}K context` : `${contextLength} context`
  const description = free ? `Free · ${ctx}` : `Paid · ${ctx}`

  return { id, label, description, free, contextLength }
}

/** Ask OpenRouter what it currently has.
 *
 *  The key is OPTIONAL here and that is not an oversight: `GET /models` is a
 *  public endpoint, so Settings can fill its picker with real free models
 *  before he has typed a key — which is the order a person actually does it in
 *  ("what can this thing even do?" comes before "here is my credential").
 *  The key is still sent when there is one, so the request is attributable in
 *  his own dashboard.
 *
 *  THE FILTER IS THE ANALOGUE OF GEMINI'S `generateContent` CHECK. The same
 *  list carries music and image models — `google/lyria-3-pro-preview` is free,
 *  and asking it for a roleplay hook returns audio. Anything that emits
 *  something other than text is dropped. A model that declares no modality at
 *  all is KEPT: the open-world rule again — a filter may prefer, it may not
 *  decide that an unfamiliar thing does not exist. */
export async function listOpenRouterModels(
  apiKey?: string,
  signal?: AbortSignal,
  timeoutMs: number = AI_TIMEOUTS.connectMs,
): Promise<OpenRouterModel[]> {
  const b = bound({ provider: 'openrouter', connectTimeoutMs: timeoutMs, idleTimeoutMs: timeoutMs }, signal)
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      method: 'GET',
      headers: apiKey ? openrouterHeaders(apiKey) : { 'Content-Type': 'application/json' },
      signal: b.signal,
    })
    b.touch()
    if (!response.ok) {
      throw openrouterErrorFrom(response.status, await response.text().catch(() => ''), 'the model list')
    }
    const data = await response.json()
    const raw: Array<{
      id?: string
      context_length?: number
      pricing?: { prompt?: string; completion?: string }
      architecture?: { output_modalities?: string[] }
    }> = data.data ?? []

    return raw
      .filter(m => typeof m.id === 'string' && m.id.length > 0)
      .filter(m => {
        const out = m.architecture?.output_modalities
        return !Array.isArray(out) || (out.includes('text') && out.length === 1)
      })
      .map(m => {
        /* Prices arrive as STRINGS ("0.00000004", "0"), confirmed against the
           live endpoint. `Number()` rather than `=== '0'`, because a provider
           that starts writing "0.0" or "0e0" would otherwise turn every free
           model paid overnight and Marcus would be looking at a 402. */
        const prompt = Number(m.pricing?.prompt ?? NaN)
        const completion = Number(m.pricing?.completion ?? NaN)
        const free = prompt === 0 && completion === 0
        return describeOpenRouterModel(m.id!, free, m.context_length ?? 0)
      })
  } catch (err) {
    throw b.explain(err, 'OpenRouter')
  } finally {
    b.done()
  }
}

/** Rank by SHAPE, never by name — and free before everything.
 *
 *  FREE FIRST IS THE WHOLE POINT. Marcus is not paying for any of this, and an
 *  automatic pick that lands on a paid model does not fail politely: it answers
 *  402 mid-scene, or worse, it works and quietly spends money. Free is the hard
 *  first key and there is no tie-break that can jump it.
 *
 *  Then LARGEST CONTEXT, which is the same argument as `num_ctx` above. The
 *  thing this app sends is a full character sheet plus scene history, and a
 *  model that cannot hold it does not say so — it truncates and answers about
 *  a paladin it has never met. Between two free models the one that fits the
 *  sheet is strictly the better one, and the API states the number.
 *
 *  Then the id, alphabetically, purely so the answer is stable. A ranking that
 *  reshuffles on every fetch means "Automatic" silently changes model between
 *  turns, and two answers in one scene disagree about who Nix is. */
export function rankOpenRouterModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models
    .slice()
    .sort((a, b) =>
      Number(b.free) - Number(a.free) ||
      b.contextLength - a.contextLength ||
      a.id.localeCompare(b.id))
}

const isOpenRouterModel = (v: unknown): v is OpenRouterModel =>
  !!v && typeof v === 'object' &&
  typeof (v as OpenRouterModel).id === 'string' &&
  typeof (v as OpenRouterModel).free === 'boolean'

/** The live list, cached for the same day Gemini's is. Null when it cannot be
 *  had at all — a stale cache beats no cache, and no cache beats a guess. */
async function knownOpenRouterModels(apiKey: string, signal?: AbortSignal): Promise<OpenRouterModel[] | null> {
  const cached = readCache(OPENROUTER_MODEL_CACHE_KEY, isOpenRouterModel)
  if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS && cached.models.length > 0) {
    return cached.models
  }
  try {
    const live = await listOpenRouterModels(apiKey, signal)
    if (live.length > 0) writeCache(OPENROUTER_MODEL_CACHE_KEY, live)
    return live.length > 0 ? live : (cached?.models ?? null)
  } catch {
    return cached?.models ?? null
  }
}

/** Which OpenRouter model this request should use.
 *
 *  Same precedence as `resolveGeminiModel`, and for the same reasons: a chosen
 *  model the service still has → the best free one by ranking → a chosen model
 *  we could not verify (offline) → an error that says so. No branch invents an
 *  id, because OpenRouter withdraws free models weekly and a compiled-in
 *  default would be a shipped expiry date measured in days rather than months. */
export async function resolveOpenRouterModel(cfg: AIConfig, signal?: AbortSignal): Promise<string> {
  if (!cfg.openrouterApiKey) {
    throw new AIError('config', 'No OpenRouter API key set. Add one in Settings — a free key at openrouter.ai/keys reaches the free models.')
  }
  const chosen = cfg.openrouterModel?.trim() || ''
  const live = await knownOpenRouterModels(cfg.openrouterApiKey, signal)

  if (live && live.length > 0) {
    if (chosen && live.some(m => m.id === chosen)) return chosen
    const best = rankOpenRouterModels(live)[0]
    if (best) {
      if (chosen) {
        _lastModelNotice = `${chosen} is not on OpenRouter any more. Now using ${best.id}.`
      }
      return best.id
    }
  }

  // Could not ask. An id he chose himself is still the best information here.
  if (chosen) return chosen
  throw new AIError(
    'api',
    'Could not ask OpenRouter which models it has, and no model has been chosen in Settings. Check the key and your connection.',
  )
}

async function queryOpenRouter(
  cfg: AIConfig,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  signal?: AbortSignal,
  attempt = 0,
): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: openrouterHeaders(cfg.openrouterApiKey!),
      signal: b.signal,
      body: openrouterBody(model, systemPrompt, userMessage, temperature, false),
    })
    b.touch()

    if (!response.ok) {
      // Body read ONCE, then reasoned about — a Response body can only be
      // consumed once, and the Gemini path learned that the hard way.
      const errText = await response.text().catch(() => '')
      const waitMs = retryDelayMs(response.status, attempt, retryAfterHeaderSeconds(response))
      if (waitMs !== null) {
        await sleep(waitMs, signal)
        return queryOpenRouter(cfg, model, systemPrompt, userMessage, temperature, signal, attempt + 1)
      }
      throw openrouterErrorFrom(response.status, errText, model)
    }

    const data = await response.json()
    /* An OpenAI-shaped 200 can still carry an error object instead of a
       choice — OpenRouter returns one when the upstream provider fails after
       the response has already been committed. Reading `content` off that
       yields undefined and the old-style `|| 'No response generated'` would
       report a working request that said nothing. Name it instead. */
    if (data.error && !data.choices?.length) {
      throw openrouterErrorFrom(Number(data.error.code) || 502, JSON.stringify(data.error), model)
    }
    return data.choices?.[0]?.message?.content || 'No response generated'
  } catch (err) {
    throw b.explain(err, 'OpenRouter')
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

const ask = async (cfg: AIConfig, provider: AIProvider, systemPrompt: string, userMessage: string, temperature: number, signal?: AbortSignal): Promise<string> => {
  requireCredentials(cfg, provider)
  if (provider === 'ollama') return queryOllama(cfg, systemPrompt, userMessage, temperature, signal)

  if (provider === 'openrouter') {
    const model = await resolveOpenRouterModel(cfg, signal)
    return queryOpenRouter(cfg, model, systemPrompt, userMessage, temperature, signal)
  }

  const model = await resolveGeminiModel(cfg, signal)
  try {
    return await queryGemini(cfg, model, systemPrompt, userMessage, temperature, signal)
  } catch (err) {
    // ONCE. `retiredModelReplacement` returns null when the replacement is the
    // model that just failed, so a Google that keeps naming a dead id cannot
    // spin here — and a second 404 has no third attempt to reach for.
    const next = await retiredModelReplacement(cfg, model, err, signal)
    if (!next) throw err
    return await queryGemini(cfg, next, systemPrompt, userMessage, temperature, signal)
  }
}

/** Clamp a config's CONNECT clock to what is left of the chain's budget.
 *
 *  Only the connect clock. The idle clock is deliberately untouched — see
 *  `AI_FALLBACK_BUDGET_MS`. Shrinking it would cut off a fallback provider that
 *  is genuinely mid-sentence, which is the failure this file has spent eleven
 *  slices refusing to commit: silence is the failure, slowness is not. */
function withinBudget(cfg: AIConfig, remainingMs: number): AIConfig {
  return { ...cfg, connectTimeoutMs: Math.min(cfg.connectTimeoutMs ?? AI_TIMEOUTS.connectMs, remainingMs) }
}

/** Walk the fallback chain. Returns the answer, or null when nothing answered.
 *
 *  THE CHAIN IS WALKED, NOT PAIRED. Until 2026-09-09 this was "try the other
 *  one", which was correct when there were two providers and quietly wrong the
 *  moment there were three: with Gemini primary, an exhausted Gemini quota fell
 *  through to an Ollama that an https page cannot reach, and stopped — while a
 *  perfectly good OpenRouter key sat in the same config, never tried. The
 *  second provider being unreachable is exactly why there is now a third.
 *
 *  A CANCEL MID-CHAIN IS TERMINAL AND RETHROWS. He pressed Stop; continuing to
 *  the next provider would restart, on his data allowance, the precise thing he
 *  just stopped. Everything else is swallowed so the loop can continue, because
 *  the error the caller surfaces is the FIRST one — see `queryAI`. */
async function walkChain(
  cfg: AIConfig,
  chain: AIProvider[],
  attempt: (cfg: AIConfig, provider: AIProvider) => Promise<string>,
): Promise<{ provider: AIProvider; text: string } | null> {
  const deadline = Date.now() + AI_FALLBACK_BUDGET_MS
  for (const provider of chain) {
    const remaining = deadline - Date.now()
    // Out of budget. Stopping here is the feature: a fourth clock spent on a
    // fourth dead address is a minute of frozen panel, not resilience.
    if (remaining <= 0) break
    try {
      const text = await attempt(withinBudget(cfg, remaining), provider)
      return { provider, text }
    } catch (err) {
      if (err instanceof AIError && err.kind === 'cancelled') throw err
    }
  }
  return null
}

/** Main query function — with the automatic fallback chain.
 *
 *  `temperature` is an explicit parameter with a prose default rather than
 *  something read from config or flipped by a boolean, because the right value
 *  is a fact about the CALL and not about the user or the provider. The one
 *  caller that needs the other value is `queryAIStructured`, and it says so. */
export async function queryAI(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig,
  signal?: AbortSignal,
  temperature: number = AI_TEMPERATURE.prose,
): Promise<string> {
  const cfg = config || loadAIConfig()
  let primaryErr: unknown
  try {
    const result = await ask(cfg, cfg.provider, systemPrompt, userMessage, temperature, signal)
    _lastUsedProvider = cfg.provider
    return result
  } catch (err) {
    primaryErr = err
  }

  const won = await walkChain(cfg, fallbackChain(cfg, primaryErr), (c, p) =>
    ask(c, p, systemPrompt, userMessage, temperature, signal))
  if (won) {
    _lastUsedProvider = won.provider
    return won.text
  }

  /* THE FIRST ERROR, NEVER THE LAST. He picked a provider; if the whole chain
     is dead the sentence he reads has to be about the one he picked. The
     alternative was tried and is baffling in practice — "OpenRouter no longer
     offers …" is an incomprehensible thing to be told by an app you had set to
     Gemini, and it sends him to fix a setting that was never wrong. */
  throw primaryErr
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

/** OpenAI-style SSE: `data:` lines, a `[DONE]` sentinel, the token in
 *  `choices[0].delta.content`.
 *
 *  OpenRouter also emits SSE COMMENT lines — `: OPENROUTER PROCESSING` — as a
 *  keepalive while it waits for an upstream provider to start. They are
 *  ignored here for free, because they do not begin with `data:`, and that is
 *  worth knowing rather than rediscovering: they are the reason a slow
 *  OpenRouter request does not trip the idle clock. `pump` calls `touch()` on
 *  every byte that arrives, so a keepalive counts as the sign of life it is
 *  meant to be, even though it yields no text. */
const openrouterDelta = (line: string): string | undefined => {
  if (!line.startsWith('data:')) return undefined
  const payload = line.slice(5).trim()
  if (!payload || payload === '[DONE]') return undefined
  try { return JSON.parse(payload).choices?.[0]?.delta?.content } catch { return undefined }
}

async function streamOllama(cfg: AIConfig, systemPrompt: string, userMessage: string, temperature: number, onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
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
        /* Same `num_ctx` as the blocking path, and it must stay that way. The
           streaming path is the one the roleplay card uses, so a fix applied to
           only one of these is a fix he gets on some screens — the exact split
           that let the 503 die in his face while the retry worked elsewhere. */
        options: ollamaOptions(temperature),
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

async function streamGemini(cfg: AIConfig, model: string, systemPrompt: string, userMessage: string, temperature: number, onText: (t: string) => void, signal?: AbortSignal, attempt = 0): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      { method: 'POST', headers: geminiHeaders(cfg.geminiApiKey!), signal: b.signal, body: geminiBody(systemPrompt, userMessage, temperature) },
    )
    b.touch()
    /* The streaming path retries the same overload the blocking path does. It
       is safe here for the same reason it is safe there: nothing has been
       emitted yet, so a retry cannot double up text on screen. Once `pump`
       starts delivering, this branch is behind us and a mid-stream failure
       stays a failure. */
    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '')
      const waitMs = retryDelayMs(response.status, attempt, retryAfterSecondsFrom(errText))
      if (waitMs !== null) {
        await sleep(waitMs, signal)
        b.done()
        return streamGemini(cfg, model, systemPrompt, userMessage, temperature, onText, signal, attempt + 1)
      }
      throw geminiErrorFrom(response.status, errText, model)
    }
    return await pump(response, b, geminiDelta, onText)
  } catch (err) {
    throw b.explain(err, 'Gemini')
  } finally {
    b.done()
  }
}

async function streamOpenRouter(
  cfg: AIConfig,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  onText: (t: string) => void,
  signal?: AbortSignal,
  attempt = 0,
): Promise<string> {
  const b = bound(cfg, signal)
  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: openrouterHeaders(cfg.openrouterApiKey!),
      signal: b.signal,
      body: openrouterBody(model, systemPrompt, userMessage, temperature, true),
    })
    b.touch()
    /* Retries the same overload the blocking path does, and it is safe here for
       the same reason it is safe there: the response was never OK, so `pump`
       never ran and nothing has been painted. Once tokens start arriving this
       branch is behind us and a mid-stream failure stays a failure. */
    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '')
      const waitMs = retryDelayMs(response.status, attempt, retryAfterHeaderSeconds(response))
      if (waitMs !== null) {
        await sleep(waitMs, signal)
        b.done()
        return streamOpenRouter(cfg, model, systemPrompt, userMessage, temperature, onText, signal, attempt + 1)
      }
      throw openrouterErrorFrom(response.status, errText, model)
    }
    return await pump(response, b, openrouterDelta, onText)
  } catch (err) {
    throw b.explain(err, 'OpenRouter')
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
  temperature: number = AI_TEMPERATURE.prose,
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
        result = await streamGemini(cfg, model, systemPrompt, userMessage, temperature, guardedOnText, signal)
      } catch (streamErr) {
        // Same one-shot contract as `ask`. A retirement 404 arrives before any
        // bytes do, so `received` is still false and retrying is honest.
        const next = await retiredModelReplacement(cfg, model, streamErr, signal)
        if (!next) throw streamErr
        result = await streamGemini(cfg, next, systemPrompt, userMessage, temperature, guardedOnText, signal)
      }
    } else if (cfg.provider === 'openrouter') {
      const model = await resolveOpenRouterModel(cfg, signal)
      result = await streamOpenRouter(cfg, model, systemPrompt, userMessage, temperature, guardedOnText, signal)
    } else {
      result = await streamOllama(cfg, systemPrompt, userMessage, temperature, guardedOnText, signal)
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
      // The CHAIN, not "the other one" — same correction as `queryAI`. A dead
      // Ollama on a laptop away from home now reaches Gemini AND OpenRouter,
      // where before it reached Gemini and gave up.
      const won = await walkChain(cfg, fallbackChain(cfg, err), (c, p) =>
        ask(c, p, systemPrompt, userMessage, temperature, signal))
      if (!won) throw err // the original failure is the useful one
      _lastUsedProvider = won.provider
      onText(won.text)
      return won.text
    }

    // Anything else — a gateway that 404s the SSE endpoint, a proxy that
    // strips a chunked body — is a fact about STREAMING, not about the host.
    // The non-streaming path is exactly the right thing to try, and it brings
    // the provider chain with it.
    const result = await queryAI(systemPrompt, userMessage, cfg, signal, temperature)
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
    /* THE LOW ONE, EXPLICITLY. This is the reason temperature is a parameter at
       all rather than a raised constant: most of this app's AI calls arrive
       here, a parser reads every one of them, and a model asked to be creative
       garnishes JSON with a sentence of preamble. That failure is not a duller
       answer, it is the `did not return JSON` error below and a dead panel.
       The prose default belongs to the two functions a PERSON reads. */
    AI_TEMPERATURE.structured,
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
