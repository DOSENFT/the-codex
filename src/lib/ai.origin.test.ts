/* ============================================================================
   ai.origin.test.ts — the app may not invent an address and then report its
   own fiction as an error.
   ----------------------------------------------------------------------------
   THE DEFECT, measured on the live site on 2026-08-22. Opening Settings on
   https://dosenft.github.io/the-codex/ fired

       GET https://dosenft.github.io/ollama/api/tags   →  404

   and a 404 on a subresource is a console error, on every visit, forever.
   `getDefaultOllamaUrl()` returned `${window.location.origin}/ollama` for any
   host that was not localhost, on the assumption that something upstream would
   proxy it. GitHub Pages is static file hosting. It proxies nothing. The app
   was probing a URL it had made up about itself.

   And there was no URL that would have worked instead. Ollama is running on
   the desktop and answers 200 — it was never deleted — but the deployed page
   is https, and a browser will not let an https page open
   `http://<anything>:11434`. So on that origin Ollama is not misconfigured, it
   is impossible, and the only honest behaviours are: default to Gemini, say
   why in a sentence, and send no request at all.

   WHAT IS RED HERE AND WHAT IS NOT — stated up front, because this repo has a
   permanent correction in its record from a commit that claimed eight red
   tests and had three.

     · The `getDefaultOllamaUrl` and `loadAIConfig` blocks below are red
       against the pre-change code for BEHAVIOURAL reasons: those functions
       existed and returned something different. `sends no request at all` is
       the strongest of them — it drives the real `queryAI` through a counting
       fetch stub and pre-change that counter reads 1.
     · The `ollamaBlockedReason` / `getDefaultProvider` block is red only
       because those exports are NEW. That is a compile error wearing the
       costume of a regression test, which A-19 in character.save.test.ts
       already caught this project doing once. They are here because the copy
       is load-bearing and must not rot, not because they prove a fix.
     · Four tests are marked GUARD. They pass against the pre-change code on
       purpose: they pin the desktop behaviour that must NOT change, and the
       narrowness of the migration. A guard that is green before is doing its
       job; claiming it as evidence of a fix would not be.

   Vitest runs in node here, so there is no `window` unless a test makes one.
   `servedFrom` builds a real one out of a real URL — no hand-typed hostname
   that could disagree with the origin it is supposed to belong to.
   ========================================================================== */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDefaultOllamaUrl,
  getDefaultProvider,
  isLocallyServed,
  ollamaBlockedReason,
  loadAIConfig,
  queryAI,
  AIError,
} from './ai'

/** The one fact every test here turns on: where the page came from. */
function servedFrom(href: string) {
  const u = new URL(href)
  vi.stubGlobal('window', {
    location: { hostname: u.hostname, protocol: u.protocol, origin: u.origin, href: u.href },
  })
}

/** A localStorage that starts empty, so "what a fresh device gets" is testable
 *  separately from "what a device that has already visited gets" — which is
 *  the distinction the live defect actually lives in. */
const store = new Map<string, string>()
function withStorage(seed?: Record<string, unknown>) {
  store.clear()
  if (seed) store.set('codex-ai-config', JSON.stringify(seed))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
}

const DEPLOYED = 'https://dosenft.github.io/the-codex/'
const DESKTOP = 'http://localhost:5173/the-codex/'

beforeEach(() => { store.clear() })
afterEach(() => { vi.unstubAllGlobals() })

/* ─── the address the app is allowed to invent ───────────────────────────── */

describe('getDefaultOllamaUrl — no address is invented off the local machine', () => {
  it('offers NOTHING on the deployed site, where it used to offer a 404', () => {
    // Pre-change this returned 'https://dosenft.github.io/ollama', and Settings
    // then appended '/api/tags' and fetched it. The empty string is what every
    // caller in the app already reads as "not configured", so it is not merely
    // a different address — it is the absence of one, which is the truth.
    servedFrom(DEPLOYED)
    expect(getDefaultOllamaUrl()).toBe('')
  })

  it('never hands back a path under the page it is being served from', () => {
    // Stated as the general rule rather than the one string, because the shape
    // of the bug was "same-origin path", not that particular host. Any origin
    // the app is ever deployed to must fail this the same way.
    servedFrom('https://example.test/some/app/')
    const url = getDefaultOllamaUrl()
    expect(url).not.toContain('example.test')
    expect(url).not.toMatch(/\/ollama$/)
  })

  it('GUARD: the desktop is untouched — localhost still gets the real server', () => {
    // Green before and after, deliberately. Ollama IS installed and running on
    // this machine at 11434; the whole point of the change is that the desk
    // does not pay for what the phone cannot do.
    servedFrom(DESKTOP)
    expect(getDefaultOllamaUrl()).toBe('http://localhost:11434')
    servedFrom('http://127.0.0.1:4173/the-codex/')
    expect(getDefaultOllamaUrl()).toBe('http://localhost:11434')
  })

  it('GUARD: with no window at all — node, the build — it still answers localhost', () => {
    expect(getDefaultOllamaUrl()).toBe('http://localhost:11434')
    expect(isLocallyServed()).toBe(true)
  })
})

/* ─── what a device gets before anyone has chosen ────────────────────────── */

describe('loadAIConfig on a device that has never been configured', () => {
  it('defaults to Gemini on the deployed site', () => {
    // Pre-change: 'ollama', unconditionally, on every device in the world.
    servedFrom(DEPLOYED)
    withStorage()
    expect(loadAIConfig().provider).toBe('gemini')
  })

  it('carries no Ollama address there, so nothing can be probed', () => {
    // The provider default alone would not have been enough. `fetchOllamaModels`
    // is called from Settings off the URL, not off the provider, so an address
    // sitting in the config is a request waiting to happen.
    servedFrom(DEPLOYED)
    withStorage()
    expect(loadAIConfig().ollamaUrl).toBeFalsy()
  })

  it('GUARD: still defaults to Ollama on the desktop, with the real address', () => {
    servedFrom(DESKTOP)
    withStorage()
    const cfg = loadAIConfig()
    expect(cfg.provider).toBe('ollama')
    expect(cfg.ollamaUrl).toBe('http://localhost:11434')
  })
})

/* ─── the device that already has the defect saved to disk ───────────────── */

describe('loadAIConfig on a phone that has already opened the live site', () => {
  /* This is the case that decides whether the fix reaches Marcus at all.
     Fixing the default fixes nobody: every device that has visited the live
     site has the fabricated URL sitting in localStorage, and a saved value
     beats a default forever. The 404 would have outlived the fix. */

  it('forgets the fabricated same-origin address', () => {
    servedFrom(DEPLOYED)
    withStorage({ provider: 'ollama', ollamaUrl: 'https://dosenft.github.io/ollama', ollamaModel: 'gemma3' })
    expect(loadAIConfig().ollamaUrl).toBeFalsy()
  })

  it('moves that device to the provider that can actually answer it', () => {
    // Leaving it on Ollama with no address would swap a 404 for "No Ollama
    // address or model set" — true, but not something he can act on from a
    // phone. "Add a Gemini key" is.
    servedFrom(DEPLOYED)
    withStorage({ provider: 'ollama', ollamaUrl: 'https://dosenft.github.io/ollama', ollamaModel: 'gemma3' })
    expect(loadAIConfig().provider).toBe('gemini')
  })

  it('forgets a saved LAN address instead of rewriting it into the 404', () => {
    // The migration that used to live here did the OPPOSITE: it took a saved
    // 192.168 address and rewrote it INTO `${origin}/ollama`, manufacturing
    // the exact URL that 404s. Pre-change this expectation reads
    // 'https://dosenft.github.io/ollama'.
    servedFrom(DEPLOYED)
    withStorage({ provider: 'ollama', ollamaUrl: 'http://192.168.1.174:11434', ollamaModel: 'gemma3' })
    expect(loadAIConfig().ollamaUrl).toBeFalsy()
  })

  it('forgets a saved loopback address, which https may not open either', () => {
    servedFrom(DEPLOYED)
    withStorage({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3' })
    expect(loadAIConfig().ollamaUrl).toBeFalsy()
    expect(loadAIConfig().provider).toBe('gemini')
  })

  it('GUARD: leaves an address Marcus typed himself exactly as he typed it', () => {
    // The narrowness matters. If he stands up a tunnel that really does proxy
    // Ollama over https, that is his assertion and this function does not get
    // to overrule it. Only two things are dropped: the string the old code
    // fabricated, and a private address a browser will refuse outright.
    servedFrom(DEPLOYED)
    withStorage({ provider: 'ollama', ollamaUrl: 'https://ollama.marcus.example/', ollamaModel: 'gemma3' })
    const cfg = loadAIConfig()
    expect(cfg.ollamaUrl).toBe('https://ollama.marcus.example/')
    expect(cfg.provider).toBe('ollama')
  })

  it('GUARD: on the desktop, a saved localhost address survives untouched', () => {
    // The migration is scoped to origins that cannot reach Ollama. Running it
    // on the desk would have deleted the working setup to fix the broken one.
    servedFrom(DESKTOP)
    withStorage({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3' })
    const cfg = loadAIConfig()
    expect(cfg.ollamaUrl).toBe('http://localhost:11434')
    expect(cfg.provider).toBe('ollama')
  })
})

/* ─── the measurement that IS the defect ─────────────────────────────────── */

describe('the deployed site sends no request to an address it made up', () => {
  it('makes ZERO network calls when nothing is configured, and says why', async () => {
    /* The whole defect in one assertion. Pre-change, an unconfigured device on
       the deployed origin had provider 'ollama' and ollamaUrl
       'https://dosenft.github.io/ollama' — a fully "configured" provider as
       far as `requireCredentials` was concerned — so this drove a real fetch
       at a URL that cannot exist and `calls` read 1. It now reads 0, and the
       failure is a config error naming the thing he can actually do. */
    servedFrom(DEPLOYED)
    withStorage()
    const calls: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const err = await queryAI('sys', 'msg').catch(e => e) as AIError

    expect(calls).toEqual([])
    expect(calls.some(u => u.includes('/ollama'))).toBe(false)
    expect(err).toBeInstanceOf(AIError)
    expect(err.kind).toBe('config')
    expect(err.message).toMatch(/Gemini API key/i)
  })
})

/* ─── the sentence a non-engineer reads ──────────────────────────────────── */

describe('ollamaBlockedReason — honest rather than silently broken', () => {
  /* NOTE: red against the pre-change code only because the export is new.
     These pin the copy, not the fix. */

  it('says nothing at all on the machine that runs the model', () => {
    servedFrom(DESKTOP)
    expect(ollamaBlockedReason()).toBeNull()
    expect(getDefaultProvider()).toBe('ollama')
  })

  it('names https as the reason on the deployed site, in plain words', () => {
    servedFrom(DEPLOYED)
    const reason = ollamaBlockedReason()
    expect(reason).toBeTruthy()
    expect(reason).toMatch(/https/i)
    expect(reason).toMatch(/your own machine/i)
    expect(reason).toMatch(/gemini/i)          // it tells him what to do instead
  })

  it('never says "mixed content" — that is a browser term, not a sentence', () => {
    servedFrom(DEPLOYED)
    expect(ollamaBlockedReason()).not.toMatch(/mixed content/i)
    expect(ollamaBlockedReason()).not.toMatch(/CORS|protocol scheme|net::/i)
  })

  it('does NOT claim https to a laptop reading the dev server over the LAN', () => {
    // http://192.168.x.x:5173 is not https and is not blocked by the browser at
    // all — that page can reach Ollama given the address. Telling him "this
    // page is served over https" there would be a plain lie, so it is a
    // different sentence, and it points at the field he can fill in.
    servedFrom('http://192.168.1.50:5173/the-codex/')
    const reason = ollamaBlockedReason()
    expect(reason).toBeTruthy()
    expect(reason).not.toMatch(/https/i)
    expect(reason).toMatch(/type the address/i)
  })

  it('treats the IPv6 loopback as local, because it is', () => {
    servedFrom('http://[::1]:4173/the-codex/')
    expect(isLocallyServed()).toBe(true)
    expect(ollamaBlockedReason()).toBeNull()
    expect(getDefaultProvider()).toBe('ollama')
  })
})
