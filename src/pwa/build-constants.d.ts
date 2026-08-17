/** Build constants defined by `define` in vite.config.ts — see the note there.
 *  Declared rather than imported so that a missing `define` is a compile error
 *  at the use site, not an `undefined` that quietly disables offline support. */

/** The app's base path, always with a trailing slash: "/the-codex/". */
declare const __CODEX_BASE__: string
/** True only for `vite build`. The worker must never run in front of dev. */
declare const __CODEX_PROD__: boolean
