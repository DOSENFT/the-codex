// One Nix, not two.
//
// shoot-app.mjs needs Nix as a JSON blob to drop into a throwaway browser
// profile; the unit tests need him as a typed `Character`. Until Slice 4 those
// were two hand-written copies with a comment begging whoever edited one to
// remember the other — and the comment was already wrong, because the shoot
// seed had drifted to about half the fixture's kit.
//
// This module deletes the second copy. It transpiles the TypeScript fixture
// with esbuild (already present as a Vite dependency, so nothing new is added
// to the trunk) and hands back the same object the tests use. If the fixture
// changes, the screenshots change with it, with no one having to remember.
//
// Not imported by src/. Reference tooling only.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const FIXTURE = new URL('../../../../src/lib/turn/fixtures/nix.ts', import.meta.url);
const OPENWORLD = new URL('../../../../src/lib/turn/fixtures/openworld.ts', import.meta.url);

/** Transpile a pure-data fixture module and hand back one of its exports.
 *  Slice 6c generalised this out of `loadNix` rather than writing a second
 *  copy of it — the whole reason this file exists is that a second copy drifts. */
async function loadExport(url, name) {
  const { transform } = req('esbuild');
  const source = readFileSync(url, 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  if (!mod[name]) throw new Error(`${url.pathname} no longer exports ${name}`);
  return mod[name];
}

export const loadNix = () => loadExport(FIXTURE, 'NIX');

/** The Slice 6c open-world fixture: a character built entirely of content the
 *  app has never seen. The same object the unit tests drive. */
export const loadTidewright = () => loadExport(OPENWORLD, 'TIDEWRIGHT');
