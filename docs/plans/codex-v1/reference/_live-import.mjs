// The import fix, against the DEPLOYED site — not the local preview.
// A green local proof and a green deploy log are two different claims from the
// one Marcus cares about: the app on his phone takes his file.
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

const dir = mkdtempSync(join(tmpdir(), 'codex-live-'));
const file = join(dir, 'codex-hearthwright.json');
writeFileSync(file, JSON.stringify({
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
  weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }],
  equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }],
}));

const b = await chromium.launch();
// A phone that has never opened this app before.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await p.goto('https://dosenft.github.io/the-codex/', { waitUntil: 'networkidle' });

const chooser = p.waitForEvent('filechooser');
await p.getByRole('button', { name: /Import Character/i }).click();
await (await chooser).setFiles(file);
await p.waitForTimeout(1500);
const gate = p.getByRole('button', { name: /^Import anyway$/ });
const gated = await gate.count();
if (gated) { await gate.click(); await p.waitForTimeout(1000); }
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const body = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();

console.log(`gate shown          : ${gated ? 'yes' : 'no (file was complete)'}`);
console.log(`character on screen : ${/Hearthwright/.test(body) ? 'YES' : 'NO'}`);
console.log(`hit points          : ${/67\/67/.test(body) ? 'YES' : 'NO'}`);
console.log(`survives reload     : ${body.length > 40 ? 'YES' : 'NO — WHITE SCREEN'}`);
console.log(`errors              : ${errs.length ? errs.join(' | ') : 'none'}`);
console.log(`screen              : ${body.slice(0, 120)}`);
await b.close();
process.exit(/Hearthwright/.test(body) && !errs.length ? 0 : 1);
