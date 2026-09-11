// Throwaway: capture the one VISIBLE change Slice 15 made — the About block in
// Settings, which now carries the SRD credit, the CC BY 4.0 link, the homebrew
// exclusion and the corrected version label. Everything else Slice 15 changed
// (Escape, focus containment, 68 tabbable controls) is invisible by nature.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(([id, seed]) => {
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
  }
  localStorage.setItem('codex-sw-off', '1');
}, [NIX.id, JSON.stringify(NIX)]);
const p = await ctx.newPage();
await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Open settings' }).click();
await p.waitForTimeout(500);
// Settings is one scrolling page; About is at the bottom.
const about = p.getByText('System Reference Document 5.2.1').first();
await about.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice15-about-phone.png' });
await b.close();
console.log('shot written');
