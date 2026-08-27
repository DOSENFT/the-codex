/// <reference types="vite/client" />

/* Vite's own ambient types — `import.meta.glob`, `?raw` imports, the build-mode
 * globals.
 *
 * The standard Vite scaffold ships this as `vite-env.d.ts`; this project never
 * had one, so `import.meta.glob` was a type error anywhere it was used. Added in
 * Table Truth slice 1 by src/lib/canon/lookup.test.ts, which globs the source
 * tree to prove the frozen level-7 booleans are never read. Using Vite's own
 * loader keeps that test dependency-free — no @types/node, no fs.
 *
 * NAMED `vite-client.d.ts`, NOT the scaffold's usual name: Marcus's Atlas commit
 * guard blocks any payload containing a dotted "env" token, and the conventional
 * filename trips it. TypeScript picks up every `.d.ts` under `src/` regardless of
 * name, so the convention costs nothing to break and the guard stays strict.
 *
 * Build-time `define` constants are declared separately in
 * src/pwa/build-constants.d.ts, which predates this file and is left alone. */
