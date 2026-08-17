/* ============================================================================
   REGISTERING THE WORKER — and, more importantly, being able to un-register it
   ----------------------------------------------------------------------------
   `sw.js` explains why a service worker is the most dangerous file in the repo.
   This is the other half of that argument: the code that decides whether one
   runs at all, and the escape hatch for when the answer turns out to be no.

   THE OFF SWITCH.  Open the app with `?sw=off` and it unregisters every worker
   in this scope, empties every cache, and remembers the choice — so a device
   that has ended up with a bad worker can be rescued with a URL Marcus can type
   at the table, without a laptop and without a Clear-Site-Data walkthrough over
   the phone. `?sw=on` puts it back. The Slice 10 proof pulls both, because a
   kill switch nobody has pulled is a kill switch nobody knows is broken.

   The flag is persisted in localStorage, which is also where Nix lives. That is
   deliberate, and it is the reason for the `codex-` prefix and the single key:
   the storage this app owns is small, named and greppable, and a PWA flag
   hiding under some other name is how a future migration eats a character.

   `__CODEX_BASE__` and `__CODEX_PROD__` are build constants defined in
   vite.config.ts — see the note there about why this module reads two named
   values instead of the ambient build environment.
   ========================================================================== */

/** One key, named like the rest of them. Absent means "yes, run the worker". */
const OFF_KEY = 'codex-sw-off'

/** Vite serves `sw.js` from the app's own base path, and the base path IS the
 *  scope. Resolved against the origin so it survives the base changing from
 *  `/the-codex/` (GitHub Pages) to `/` (a bare preview) with no second source
 *  of truth, and so a deep link never registers a worker scoped to a subpage. */
const SW_URL = new URL(`${__CODEX_BASE__}sw.js`, window.location.origin)

/** Every cache this app has ever opened, gone. Used by the off switch and by
 *  nothing else — a "clear the cache" button on a screen is a support script,
 *  not a feature, and it would sit there inviting the tap that loses the fonts
 *  on the one night there is no Wi-Fi. */
async function purge(): Promise<void> {
  if (!('caches' in window)) return
  const names = await caches.keys()
  await Promise.all(names.filter(n => n.startsWith('codex-')).map(n => caches.delete(n)))
}

/** Tell the controlling worker to stop serving and drop everything it holds —
 *  and WAIT for it to say it has.
 *
 *  A worker that is still controlling a page keeps handling that page's fetches
 *  until the page goes away, so "unregister and purge" on its own loses a race
 *  it cannot see: the worker re-caches the very document that carries `?sw=off`
 *  while this function is deleting caches. The Slice 10 proof pulled the switch
 *  and found one cache still standing, which is how this ack exists.
 *
 *  The timeout is not optional. This is the rescue path; a worker that never
 *  answers — because it is the broken worker being rescued from — must not be
 *  able to wedge the thing that removes it. */
function releaseController(): Promise<void> {
  const worker = navigator.serviceWorker.controller
  if (!worker) return Promise.resolve()
  return new Promise(resolve => {
    const finish = () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve()
    }
    const onMessage = (e: MessageEvent) => { if (e.data === 'codex-sw-purged') finish() }
    navigator.serviceWorker.addEventListener('message', onMessage)
    const timer = setTimeout(finish, 1500)
    worker.postMessage('codex-sw-purge')
  })
}

async function unregisterAll(): Promise<void> {
  await releaseController()
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map(r => r.unregister()))
  await purge()
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  // `?sw=off` / `?sw=on`, read before anything else can act on the flag.
  const flag = new URLSearchParams(window.location.search).get('sw')
  if (flag === 'off') localStorage.setItem(OFF_KEY, '1')
  if (flag === 'on') localStorage.removeItem(OFF_KEY)

  if (localStorage.getItem(OFF_KEY) === '1') {
    void unregisterAll()
    return
  }

  // NOT IN DEV. A worker sitting in front of the Vite dev server serves
  // yesterday's module graph over HMR, which presents as "my edit did nothing"
  // — an afternoon lost to a bug that is not in the code being edited. And if
  // one is somehow already installed on localhost from a preview build, remove
  // it, because that is exactly the trap.
  if (!__CODEX_PROD__) {
    void unregisterAll()
    return
  }

  // On `load`, not immediately: during a cold open the browser is already
  // fetching the bundle, and an install started now competes with the first
  // paint for the same connection. The offline copy is for the NEXT visit;
  // there is no reason for it to slow down this one.
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(SW_URL.href, { scope: __CODEX_BASE__ })
      .catch(() => {
        // Registration fails on `file://`, in some private modes, and behind
        // proxies that rewrite the script's MIME type. All three mean "no
        // offline support today"; none means the app is broken, and none is
        // worth a console error at a table.
      })
  })
}

/** Exported for the proof, and for a Settings row if one is ever justified.
 *  Called from no component today, deliberately. */
export const __pwaInternals = { OFF_KEY, purge, unregisterAll }
