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

export async function loadNix() {
  const { transform } = req('esbuild');
  const source = readFileSync(FIXTURE, 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  if (!mod.NIX) throw new Error('nix.ts no longer exports NIX');
  return mod.NIX;
}
