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

   4.  THERE IS ALWAYS A WAY BACK, AND IT DOES NOT NEED THE NETWORK.  See the
       LAST-KNOWN-GOOD block below. Rule 3 on its own is a bypass, not a
       rollback: it hands the page to a network that, in a basement, is not
       there. This rule is the one that was missing.

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

/* ============================================================================
   THE LAST-KNOWN-GOOD SHELL — the parachute
   ----------------------------------------------------------------------------
   THE INCIDENT.  Criterion N-4, reproduced honestly: kill the origin for real
   (not `context.setOffline`, which leaves the worker out of the loop and lies
   about it — see the note in reference/table/rig.mjs), poison the one entry in
   the shell cache that is NOT content-hashed, and reload. The app is a white
   screen. `document.body.innerText.length === 0`. Then pull the documented kill
   switch — `?sw=off`, the URL he can type at the table — and it recovers
   NOTHING, because the kill switch works by getting out of the way so the
   browser can fetch the app fresh, and in a basement there is nothing to fetch.
   The app only came back when the wifi did. At a table that is: the sheet is
   gone for the night, and the printed instructions for saving it do not work.

   Rule 1 is why the hole exists and rule 1 is still right. index.html is the
   only file in the precache whose name is not its hash, so it is the only one
   that can be replaced by something wrong and still be found. A half-written
   install, an eviction that lands mid-write, a corrupt disk sector, a proxy
   that returns its own captive-portal page with a 200 — all of them end at the
   same place: one bad document in the cache, pinned, with no network to correct
   it and no second copy to fall back to.

   So there is a second copy. `codex-shell-lkg` holds the last set of bytes this
   worker watched boot: the document plus every hashed asset that document
   names. It is written ONLY by `promote()` below, ONLY after that exact set has
   been checked end to end, and NEVER by an install — an install writes to the
   versioned SHELL and nowhere else, which is what makes this a rollback target
   rather than a second thing to corrupt in the same breath.

   WHY THE NAME IS NOT VERSIONED, and the trap in that. A parachute that is
   thrown away by the deploy it exists to survive is not a parachute. But the
   activate handler below deletes every `codex-shell-` cache that is not the
   current one, so an unversioned name in that family would be swept on the
   first activation — the fix would delete itself, silently, and the proof would
   still be green because the poison comes later. Hence the explicit exemption
   there. Do not remove it.

   WHY THIS IS NOT "STALE FOREVER", which is the other half of the argument.
   The LKG is read on exactly one path: a navigation whose network fetch has
   already failed. Online, nothing changes — navigations are still network
   first, a new deploy still lands, and promote() replaces the LKG with the new
   build the moment that build is shown to boot. What the LKG buys is the case
   where the new build is NOT shown to boot: promote() declines, the old set
   stays, and the basement gets yesterday's working app instead of a white
   screen. Old and readable beats current and blank. That is the whole trade.
   ========================================================================== */
const LKG = 'codex-shell-lkg'
/** Written LAST by promote(), so a promotion interrupted halfway leaves a stamp
 *  that does not match and is therefore retried, rather than a half-copied
 *  shell wearing a badge that says it is complete. */
const LKG_STAMP = () => new Request(`${SCOPE.href}__lkg-build`)

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
          // `n !== LKG` is load-bearing, not defensive. The parachute lives in
          // the `codex-shell-` family so it is obvious in DevTools next to the
          // thing it backs up, and this sweep would otherwise delete it on the
          // first activation after every deploy — leaving the fix in the source
          // and nothing on the disk.
          .filter(n => n.startsWith('codex-shell-') && n !== SHELL && n !== LKG)
          .map(n => caches.delete(n)),
      )
      await self.clients.claim()
      // The new shell has just finished installing and the old ones are gone.
      // If it can stand on its own — see promote() — this is the moment it
      // becomes the thing we fall back TO. If it cannot, the previous build
      // stays the parachute and this deploy simply does not get one yet.
      await promote().catch(() => {})
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

  // -- navigations: network first, cache second, parachute last --------------
  if (request.mode === 'navigate') {
    // The rescue URL. He typed `?sw=off` because the app on this device is
    // wrong, so on this one path the ACTIVE cache is the prime suspect and the
    // parachute is asked first. register.ts will unregister and purge a moment
    // after this document loads; the only job here is to make sure there IS a
    // document for it to load, which before this change there was not.
    const rescuing = url.searchParams.get('sw') === 'off'
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          // `RELEASED` is re-read after the await, here and at every other put
          // below: a request that was in flight when the switch was pulled
          // would otherwise re-open the cache it was pulled to delete.
          if (!RELEASED) {
            ;(await caches.open(SHELL)).put(indexRequest(), fresh.clone())
            // The network is up and this worker just answered a navigation with
            // it. Second of the two moments a shell can earn the parachute.
            // Nothing downstream may reject: an unhandled rejection in here is
            // a console error at a table, and the response is already decided.
            const promotion = promote().catch(() => false)
            try { event.waitUntil(promotion) } catch { /* lifetime already settled */ }
          }
          return fresh
        } catch {
          // Offline. Any route in this app is the same index.html — it is a
          // single-page app — so the shell copy answers a deep link too.
          try { return await lastGoodDocument(request, rescuing) }
          catch { return offlineNotice() }
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

/* ── can this document actually boot, offline, right now? ──────────────────── */

/** Every same-origin hashed asset the document NAMES: the entry module, the
 *  modulepreloads, the stylesheet. Read off the bytes rather than off
 *  PRECACHE_URLS, because the question being asked is "can THIS document boot",
 *  and a poisoned or half-written document names a different set than the build
 *  does — which is exactly how you tell them apart.
 *
 *  A regex over HTML is normally a bad idea. Here the input is a Vite-emitted
 *  index.html whose asset references are machine-written `src=` / `href=`
 *  attributes, and the cost of a false positive is one extra cache lookup that
 *  misses. There is no HTML parser in a service worker and pulling one in would
 *  be several hundred lines of trunk to answer a question this settles.
 *  Fonts are skipped: they are referenced from the CSS, never from the
 *  document, and the build deliberately leaves legacy .woff out of the
 *  precache — a missing typeface is not a white screen. */
async function namedAssets(doc) {
  const html = await doc.clone().text()
  const out = new Set()
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    let u
    try { u = new URL(m[1], SCOPE.href) } catch { continue }
    if (u.origin !== self.location.origin) continue
    if (!isHashedAsset(u)) continue
    if (/\.woff2?$/i.test(u.pathname)) continue
    out.add(u.href)
  }
  return [...out]
}

/** The whole test, and the reason `?sw=off` used to be the only answer: a
 *  cached index.html that is WRONG is still a perfectly valid 200 with a
 *  content-type of text/html and a `<div id="root">` in it. Status tells you
 *  nothing. What tells you something is whether the bundles it names are on
 *  this disk — because with the origin dead, a script tag pointing at a file
 *  nobody holds is a white screen and nothing else.
 *
 *  Zero named assets is also a failure, not a pass. That is the truncated
 *  write, the captive-portal page and the empty-string put; a document that
 *  asks for no JavaScript renders no app. */
async function bootable(doc) {
  if (!doc) return false
  let urls
  try { urls = await namedAssets(doc) } catch { return false }
  if (!urls.length) return false
  for (const u of urls) if (!(await caches.match(u))) return false
  return true
}

/* ── writing the parachute ─────────────────────────────────────────────────── */

/** Copy the current shell into the LKG cache — but only if the current shell
 *  passes the same test the offline path will later apply to it. Promoting a
 *  shell we have not checked would just be corrupting two caches instead of
 *  one, on a schedule.
 *
 *  Cheap to call repeatedly: after the first successful promotion for a build
 *  the stamp short-circuits it, so the per-navigation call is one cache hit.
 *
 *  The write order is deliberate — assets, then the document, then the stamp,
 *  then the prune. At every instant in that sequence the LKG cache is either
 *  the old complete set or the new complete set; there is no window in which it
 *  holds a document whose assets have not landed yet. A parachute that can be
 *  interrupted into an unopenable state is not one. */
async function promote() {
  if (RELEASED) return false
  const shell = await caches.open(SHELL)
  const doc = await shell.match(indexRequest())
  if (!(await bootable(doc))) return false

  const lkg = await caches.open(LKG)
  const stamp = await lkg.match(LKG_STAMP())
  if (stamp && (await stamp.text()) === BUILD_ID) return true

  const index = indexRequest()
  const assets = [...new Set([
    ...PRECACHE_URLS.map(u => new URL(u, SCOPE.href).href),
    ...(await namedAssets(doc)),
  ])].filter(u => u !== index.url)

  for (const u of assets) {
    const hit = (await shell.match(u)) || (await caches.match(u))
    if (!hit) continue          // not fatal: bootable() already vouched for the
    if (RELEASED) return false  // set that matters, the rest is belt and braces
    await lkg.put(u, hit.clone())
  }
  if (RELEASED) return false
  await lkg.put(index, doc.clone())
  await lkg.put(LKG_STAMP(), new Response(BUILD_ID, { headers: { 'content-type': 'text/plain' } }))

  // Only now, with the new set complete and stamped, is it safe to drop what
  // the previous build left behind.
  const keep = new Set([...assets, index.url, LKG_STAMP().url])
  for (const k of await lkg.keys()) if (!keep.has(k.url)) await lkg.delete(k)
  return true
}

/* ── reading it ────────────────────────────────────────────────────────────── */

/** The offline answer to a navigation, in order of preference, with every
 *  candidate held to the same bar: it has to be able to boot.
 *
 *  Before this existed the line here was `caches.match(indexRequest())`, and
 *  CacheStorage.match searches caches in creation order — so the poisoned shell
 *  won, every time, and won again on the reload, and the parachute (had there
 *  been one) would never have been reached. The caches are named explicitly
 *  below for that reason. */
async function lastGoodDocument(request, rescuing) {
  const shell = await caches.open(SHELL)
  const lkg = await caches.open(LKG)
  const active = await shell.match(indexRequest())
  const parachute = await lkg.match(indexRequest())

  for (const doc of rescuing ? [parachute, active] : [active, parachute]) {
    if (await bootable(doc)) return doc
  }
  // A deep link stored under its own URL, from an older shape of this file.
  const deep = await caches.match(request)
  if (await bootable(deep)) return deep

  return offlineNotice()
}

/** Rule 4: never hand the client zero bytes. A blank body is indistinguishable
 *  from a dead device — he cannot tell whether the app is broken, the phone is
 *  broken, or his character is gone — and it is the state that made N-4 the
 *  worst failure this product has. A page that says what happened and confirms
 *  the sheet is safe is not a fix, but it is not nothing, and "not nothing" is
 *  the entire bar here.
 *
 *  Served 200 on purpose. A 5xx invites the browser to substitute its own error
 *  page, which would put us straight back to a blank body — the one outcome
 *  this function exists to make impossible. The status code has no reader; the
 *  man at the table does. */
const offlineNotice = () => new Response(
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>The Codex — offline</title>
<style>
 html,body{margin:0;height:100%;background:#0a0a08;color:#e8e2d4;
   font:16px/1.6 ui-sans-serif,system-ui,sans-serif}
 main{max-width:34rem;margin:0 auto;padding:18vh 1.5rem 2rem}
 h1{font-size:1.25rem;letter-spacing:.08em;text-transform:uppercase;color:#c9a227;margin:0 0 1rem}
 p{margin:0 0 1rem}
</style></head><body><main>
<h1>The Codex &mdash; offline</h1>
<p>There is no network, and there is no usable copy of the app saved on this
   device, so there is nothing here to start from yet.</p>
<p><strong>Your character is safe.</strong> Sheets are stored separately from the
   app itself and nothing above has touched them.</p>
<p>Reconnect to any network and reload. The app repairs itself on the first
   successful load, and your sheet will be exactly where you left it.</p>
</main></body></html>`,
  { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
)

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
  /* "Can this device actually re-download the app right now?", asked by
     register.ts before it tears the worker down.
     The page cannot answer this itself. A fetch that fails in a document logs
     `net::ERR_CONNECTION_REFUSED` to the console, and by this project's own
     rules a console error is a failure — so the honest probe was itself a
     defect, measured as two errors on the ?sw=off path. The identical fetch
     failing in HERE logs nothing to the page, which is why this worker has
     always been free to try the network first on every navigation. So the
     worker takes the hit and reports the answer back. */
  if (event.data === 'codex-sw-reachable') {
    const client = event.source
    event.waitUntil((async () => {
      let ok = false
      try {
        // A unique query so nothing — HTTP cache, Cache Storage, a proxy — can
        // answer this from a copy. Reachability is the only question.
        const probe = new URL(SCOPE.pathname, self.location.origin)
        probe.searchParams.set('codex-reachable', String(Date.now()))
        ok = (await fetch(probe.href, { cache: 'no-store' })).ok
      } catch { ok = false }
      if (client) client.postMessage(`codex-sw-reachable:${ok ? 'yes' : 'no'}`)
    })())
    return
  }
  if (event.data !== 'codex-sw-purge') return
  RELEASED = true
  // The parachute goes too. It is not exempt and must not be: the off switch
  // means "let go of everything", and register.ts's own purge() sweeps every
  // `codex-` cache from page context a moment later regardless, so exempting it
  // here would buy nothing and would leave two files disagreeing about what the
  // kill switch does. The parachute's job is finished by this point — it is
  // what served the `?sw=off` document that is running this line.
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
