import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = '/the-codex/'

/* ============================================================================
   precachePlugin — Slice 10
   ----------------------------------------------------------------------------
   Emits `sw.js` from the hand-written source at `src/pwa/sw.js`, with two holes
   filled in from the bundle Rollup actually produced.

   WHY NOT vite-plugin-pwa.  It is the obvious answer and it was the first plan.
   The argument against it is the argument in sw.js: a service worker is the one
   file here that survives a bad deploy, and a generated Workbox runtime is
   several hundred lines nobody on this project has read. This does the only
   part that genuinely cannot be hand-written — knowing the content hashes — in
   about twenty lines, and leaves every caching decision in a file that can be
   reviewed in one sitting. It also keeps Workbox out of the trunk.

   WHAT GOES IN THE PRECACHE, and what deliberately does not: `dist/assets/*`
   only — the JavaScript, the CSS and the nine woff2 files, about 2.6MB. That is
   the set whose absence is a WHITE SCREEN. The 88MB of backgrounds and brass
   art in `public/` is not precached; sw.js caches it as he visits the screens
   that use it, because a missing background is a dark panel and this design is
   already dark panels. Precaching it would make the first launch a 90MB
   download on a tethered phone, and would be the kind of "offline support" that
   is worse than none.
   ========================================================================== */
function precachePlugin(): Plugin {
  return {
    name: 'codex-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter(f => f.startsWith('assets/'))
        // Fontsource's CSS lists woff2 first and legacy .woff second, so Vite
        // emits both and the naive precache carried nine dead files — 201KB of
        // a 2.6MB budget, for a format no browser that can run this app will
        // ever ask for (woff2 is Safari 10+, Chrome 36+, and this app needs
        // service workers and CSS nesting besides). The .woff files still SHIP
        // and the CSS still names them; they are merely not pre-downloaded, so
        // an impossible ancient browser would fetch one over the network and
        // everything else gets a precache that is 8% smaller.
        .filter(f => !f.endsWith('.woff'))
        .map(f => BASE + f)
        .sort()

      // The shell root itself. Not `index.html`: sw.js stores the navigation
      // response under the scope URL, and precaching the two spellings of the
      // same document would put two copies in the cache that can disagree.
      const urls = [BASE, ...assets]

      // The build id changes when, and only when, the asset list changes — so
      // a rebuild that produces identical output does not throw away a warm
      // cache on every device, and a real change invalidates it completely.
      const buildId = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12)

      const source = readFileSync(new URL('src/pwa/sw.js', import.meta.url), 'utf8')
        .replace('self.__CODEX_PRECACHE__', JSON.stringify(urls))
        .replace('self.__CODEX_BUILD_ID__', JSON.stringify(buildId))

      if (source.includes('self.__CODEX_')) {
        // A rename in sw.js that silently stopped being substituted would ship
        // a worker that precaches nothing and reports success. Fail the build.
        this.error('codex-precache: a __CODEX_ placeholder in src/pwa/sw.js was not substituted')
      }

      // At the scope root, because a worker's scope cannot be broader than the
      // path it is served from.
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig(({ command }) => ({
  base: BASE,
  plugins: [react(), tailwindcss(), precachePlugin()],
  /* Two named constants instead of the ambient build environment. `src/pwa/
     register.ts` needs exactly these two facts, and declaring them in
     `build-constants.d.ts` means a missing definition is a compile error at the
     use site rather than an `undefined` that quietly disables offline support
     while everything still builds. */
  define: {
    __CODEX_BASE__: JSON.stringify(BASE),
    __CODEX_PROD__: JSON.stringify(command === 'build'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
}))
