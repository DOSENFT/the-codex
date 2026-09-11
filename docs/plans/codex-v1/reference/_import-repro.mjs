// Reproduce the import failure with MARCUS'S OWN FILES.
//
// Every proof written so far seeded a character straight into localStorage,
// which walks past the import path entirely. So the import has never once been
// exercised by any check in this repo — and it is the only door onto a new
// device. This drives the real button with the three real files off his disk.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const DL = 'C:/Users/marcu/Downloads/';
const FILES = [
  ['codex-character-data.json', 'the 2-byte file — his failed export'],
  ['codex-nix-lvl7.json', 'the THIN export, 9KB, no ability scores or weapons'],
  ['codex-nix-lvl7 (1).json', 'the FULL export, 17KB, 36 fields'],
];

const b = await chromium.launch();
for (const [f, why] of FILES) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('THREW: ' + String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });

  console.log(`\n=== ${f}`);
  console.log(`    (${why})`);
  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import Character/i }).click();
  await (await chooser).setFiles(DL + f);
  await p.waitForTimeout(1800);

  const body = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  const stored = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length);
  // A white screen is the failure mode loadCharacter's comment warns about, and
  // it looks like nothing at all — so measure it rather than eyeball it.
  const verdict = body.length < 40 ? 'WHITE SCREEN' :
    /Invalid character file|Could not read file/.test(body) ? 'REFUSED' :
    stored > 0 ? 'IMPORTED' : 'no error, but nothing was stored';
  console.log(`    verdict: ${verdict}   (characters in storage: ${stored})`);
  console.log(`    screen : ${body.slice(0, 150) || '(empty)'}`);
  if (errors.length) console.log(`    console: ${errors.slice(0, 3).join(' | ')}`);
  await p.screenshot({ path: `docs/plans/codex-v1/_shots-app/_import-${f.replace(/[^a-z0-9]/gi, '-')}.png` });
  await ctx.close();
}
await b.close();
