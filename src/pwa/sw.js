/* ============================================================================
   THE SERVICE WORKER — Slice 10
   ----------------------------------------------------------------------------
   READ THIS BEFORE CHANGING ANYTHING IN HERE.

   A service worker is the only code in this repo that can survive a deploy. Ship
   a bad one and it keeps serving the bad one, from the user's disk, on every
   future visit, with no build you can push to dislodge it — the app is bricked
   on that device and the only fix is a human clearing site data. `main` is a
   live public deploy. So this file is hand-written rather than generated, is
   deliberately short enough to read in one sitting, and every strategy below is
   chosen for what it does WHEN IT IS WRONG, not when it is right.

   Three rules it exists to obey:

   1.  NEVER CACHE-FIRST A NAVIGATION.  index.html names the hashed bundles, so
       a stale index.html pins a stale app forever. Navigations are
       network-first; the cache is the fallback, which is the whole point of the
       feature and also its only safe direction.

   2.  NEVER TOUCH ANYTHING THAT IS NOT A SAME-ORIGIN GET.  Nix's sheet lives in
       localStorage, which a worker cannot reach and must never be given a
       reason to. The local Ollama endpoint, and every POST anywhere, go
       straight to the network untouched — an AI call answered from a cache is
       worse than an AI call that fails.

   3.  THERE IS AN OFF SWITCH, AND IT IS TESTED.  `?sw=off` unregisters every
       worker and deletes every cache. See src/pwa/register.ts. A kill
       switch nobody has pulled is a kill switch nobody knows is broken, so the
       Slice 10 proof pulls it.

   The two placeholders below are substituted at build time by `precachePlugin`
   in vite.config.ts with the real content-hashed asset list and a build id
   derived from it — and the build FAILS if either substitution does not happen,
   because a worker that precaches nothing and reports success is the worst
   possible version of this file. In source they fall back to empty and 'dev',
   which degrades to "everything comes from the network": not offline, but not
   broken either.
   ========================================================================== */

/** Injected by `precachePlugin` in vite.config.ts. Content-hashed paths only. */
const PRECACHE_URLS = self.__CODEX_PRECACHE__ || []
/** Changes whenever the bundle changes, so a deploy gets a brand-new cache and
 *  the old one is deleted wholesale rather than merged into. */
const BUILD_ID = self.__CODEX_BUILD_ID__ || 'dev'

const SHELL = `codex-shell-${BUILD_ID}`
/** Deliberately NOT versioned by build. Backgrounds and the brass art are 88MB
 *  of content-addressed PNGs that do not change between deploys; re-downloading
 *  them because the JavaScript changed would turn every deploy into a 90MB
 *  event on a phone tethered at a kitchen table. */
const MEDIA = 'codex-media-v1'
/** An LRU would need bookkeeping this file does not deserve. A count cap
 *  trimmed oldest-first is enough: the failure mode of overshooting is a slow
 *  eviction, and the failure mode of no cap is the browser evicting the SHELL. */
const MEDIA_MAX = 120

/** Flipped by the off switch, and the reason the off switch works.
 *
 *  A worker told to let go must stop TAKING as well as stop holding. The page
 *  carrying `?sw=off` is still controlled while it loads, so its own document
 *  and every hashed chunk under it still come through the handler below — and
 *  a handler that keeps writing re-creates the shell cache microseconds after
 *  the purge deleted it. That is not a theory: the Slice 10 proof pulled the
 *  switch and found exactly one cache still standing, which is the difference
 *  between a rescue and a rescue that has to be performed twice. Once this is
 *  true the worker is a pass-through until the page goes away. */
let RELEASED = false

// ---------------------------------------------------------------------------

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      // `reload` so an install triggered while a stale HTTP cache is warm does
      // not precache the very bytes this deploy exists to replace.
      await cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
      // NO skipWaiting. A worker that activates mid-combat swaps the hashed
      // chunks under a running app, and the next lazy import — the dice stage,
      // say — 404s into a white screen on the one screen that must not fail.
      // The new build takes over on the next cold load, which on an iPad kept
      // on the home screen is the next time he opens it.
    })(),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter(n => n.startsWith('codex-shell-') && n !== SHELL)
          .map(n => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

/** The app's own scope, e.g. "/the-codex/". Derived, never hard-coded: this
 *  file is served from the scope root and `main` deploys under a project path
 *  while a preview server may not. */
const SCOPE = new URL('./', self.location.href)

const isMedia = url => /\.(png|jpe?g|gif|webp|avif|svg|mp3|ogg|wav)$/i.test(url.pathname)
/** Content-hashed by Vite, therefore immutable, therefore safe to serve from
 *  disk without asking. Anything else same-origin is not assumed immutable. */
const isHashedAsset = url => url.pathname.startsWith(`${SCOPE.pathname}assets/`)

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Rule 3, before anything else: a released worker is a wire.
  if (RELEASED) return
  // Rule 2, and it is the first thing checked for a reason.
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(SCOPE.pathname)) return
  // The dev proxy to the local model. Never cached, never delayed, and never
  // answered from disk — a stale answer from a character's own AI is a lie
  // told in Marcus's voice.
  if (url.pathname.includes('/ollama')) return

  // -- navigations: network first, cache second, shell last ------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          // `RELEASED` is re-read after the await, here and at every other put
          // below: a request that was in flight when the switch was pulled
          // would otherwise re-open the cache it was pulled to delete.
          if (!RELEASED) (await caches.open(SHELL)).put(indexRequest(), fresh.clone())
          return fresh
        } catch {
          // Offline. Any route in this app is the same index.html — it is a
          // single-page app — so the shell copy answers a deep link too.
          const cached = (await caches.match(indexRequest())) || (await caches.match(request))
          if (cached) return cached
          throw new Error('offline and no shell cached')
        }
      })(),
    )
    return
  }

  // -- hashed assets: cache first, because the hash IS the version -----------
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request)
        if (hit) return hit
        const fresh = await fetch(request)
        if (fresh.ok && !RELEASED) (await caches.open(SHELL)).put(request, fresh.clone())
        return fresh
      })(),
    )
    return
  }

  // -- art: stale-while-revalidate, capped -----------------------------------
  // 88MB of backgrounds and brass frames are NOT precached; they arrive as he
  // visits the screens that use them and then stay. A missing background is a
  // dark panel, which this design already is. A missing bundle is a white
  // screen. The two do not deserve the same treatment.
  if (isMedia(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(MEDIA)
        const hit = await cache.match(request)
        const network = fetch(request)
          .then(async fresh => {
            if (fresh.ok && !RELEASED) {
              await cache.put(request, fresh.clone())
              await trim(cache)
            }
            return fresh
          })
          .catch(() => null)
        if (hit) return hit
        const fresh = await network
        if (fresh) return fresh
        return new Response('', { status: 504, statusText: 'offline, not cached' })
      })(),
    )
  }

  // Everything else same-origin — public/*.html, the manifest, anything added
  // later — falls through to the network with no worker in the way. Not
  // caching something is always a recoverable mistake; caching it wrongly is
  // the one that survives the deploy.
})

/** The shell copy of index.html, keyed on the scope root rather than on
 *  whatever deep link happened to be open when it was stored. */
const indexRequest = () => new Request(SCOPE.href, { cache: 'reload' })

async function trim(cache) {
  const keys = await cache.keys()
  if (keys.length <= MEDIA_MAX) return
  // Oldest insertion first — Cache.keys() resolves in insertion order per spec.
  await Promise.all(keys.slice(0, keys.length - MEDIA_MAX).map(k => cache.delete(k)))
}

/** The other half of the off switch. `register.ts` unregisters the worker, but
 *  a worker already handling fetches will keep doing so until its clients are
 *  gone, so it is also told to let go of everything it is holding. */
self.addEventListener('message', event => {
  if (event.data !== 'codex-sw-purge') return
  RELEASED = true
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n)))
      // Answer, so the page can unregister AFTER the worker has finished
      // letting go rather than in parallel with it. Without the ack the two
      // purges race and the loser re-creates what the winner deleted.
      for (const client of await self.clients.matchAll()) client.postMessage('codex-sw-purged')
    })(),
  )
})
