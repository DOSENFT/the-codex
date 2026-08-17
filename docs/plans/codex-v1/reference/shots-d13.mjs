// Slice 13 before/after shots — the surfaces the audit says will move most.
//
// The type floor raises 205 sites from 10px to 12px. That is a 20% growth on
// text that was chosen small because it had to fit, so it will find every tight
// layout in the app. The only way to know whether it broke one is to look.
//
//   node docs/plans/codex-v1/reference/shots-d13.mjs before
//   node docs/plans/codex-v1/reference/shots-d13.mjs after
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const label = process.argv[2];
if (!label) { console.error('usage: shots-d13.mjs <before|after>'); process.exit(1); }

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const NIX = await loadNix();

const DIR = new URL(`./_shots-d13/`, import.meta.url).pathname.slice(1);
mkdirSync(DIR, { recursive: true });

// Ranked by how much sub-12px text the audit found on each: prep Character 61,
// prep Grimoire 37, character sheet 26, session Grimoire 25.
const SURFACES = [
  ['prep-character', p => p.getByRole('button', { name: 'Switch to prep mode' }).click()
    .then(() => p.getByRole('tab', { name: 'Character' }).click())],
  ['prep-grimoire', p => p.getByRole('button', { name: 'Switch to prep mode' }).click()
    .then(() => p.getByRole('tab', { name: 'Grimoire' }).click())],
  ['session-grimoire', p => p.getByRole('tab', { name: 'Grimoire' }).click()],
  ['session-combat', p => p.getByRole('tab', { name: 'Combat' }).click()],
  ['character-sheet', p => p.getByRole('button', { name: 'Open character sheet' }).click()],
  ['dice-roller', p => p.getByRole('button', { name: 'Open dice roller' }).click()],
  ['settings', p => p.getByRole('button', { name: 'Open settings' }).click()],
];

const b = await chromium.launch();
for (const [vpName, viewport] of [['phone', { width: 390, height: 844 }], ['iPad', { width: 1024, height: 1366 }]]) {
  for (const [name, prepare] of SURFACES) {
    const ctx = await b.newContext({ viewport });
    await ctx.addInitScript(([id, seed]) => {
      localStorage.setItem('codex-character-' + id, seed);
      localStorage.setItem('codex-active-id', id);
      localStorage.setItem('codex-sw-off', '1');
    }, [NIX.id, JSON.stringify(NIX)]);
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
    try {
      await prepare(p);
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${DIR}${vpName}-${name}-${label}.png`, fullPage: true });
      console.log(`  shot  ${vpName}-${name}-${label}`);
    } catch (e) {
      console.log(`  SKIP  ${vpName}-${name} — ${e.message.split('\n')[0].slice(0, 50)}`);
    }
    await ctx.close();
  }
}
await b.close();
console.log(`\n  → ${DIR}`);
