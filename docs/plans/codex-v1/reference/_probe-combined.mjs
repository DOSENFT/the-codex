// The live run showed "Combat stopped" — an error boundary CAUGHT something.
// prove-import.mjs missed it because it only asks "is the screen blank?", and a
// caught error is not a blank screen: it is a dead panel with a polite notice.
// That is arguably worse, because it looks handled.
//
// Difference from the passing local cases: those imported ONE bare item at a
// time. This imports several together, which is what a real thin export is.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const dir = mkdtempSync(join(tmpdir(), 'codex-comb-'));
const base = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};
const CASES = {
  'all-bare (the live case)': { weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }], equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }] },
  'bare weapon only': { weapons: [{ name: 'Longsword' }] },
  'bare spell only': { spells: [{ name: 'Bless', level: 1 }] },
  'spell with no level': { spells: [{ name: 'Bless' }] },
  'bare feature only': { features: [{ name: 'Lay on Hands' }] },
  'nothing at all': {},
};

const b = await chromium.launch();
for (const [label, extra] of Object.entries(CASES)) {
  const file = join(dir, `${label.replace(/\W/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ ...base, ...extra }));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  // React reports a caught render error through console.error, not pageerror.
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import Character/i }).click();
  await (await chooser).setFiles(file);
  await p.waitForTimeout(1000);
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) { await gate.click(); await p.waitForTimeout(700); }
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const body = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  // The boundary's own words are the tell.
  const caught = /stopped|still running|something went wrong/i.test(body);
  console.log(`${caught ? 'BOUNDARY' : 'ok      '}  ${label.padEnd(26)} ${caught ? body.slice(0, 130) : ''}`);
  if (caught && errs.length) console.log(`            ${errs.slice(0, 2).join('\n            ')}`);
  await ctx.close();
}
await b.close();
