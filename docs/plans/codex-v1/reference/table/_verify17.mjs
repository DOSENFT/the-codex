// VERIFIER probe 17 — the twelve hostile shapes against the LIVE deployed build
// (headSha 73c45d8, the harness's own BROKEN_SHA), then the same shapes against HEAD's dist.
import { chromium, serveDist, DIST, PHONE, goScreen, SCREENS, importFile } from './rig.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const tmp = mkdtempSync(join(tmpdir(), 'vfy17-'));
const wr = (n, o) => { const p = join(tmp, n + '.json'); writeFileSync(p, JSON.stringify(o)); return p; };
const SKELETON = { name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar', level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18, abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 } };
const SHAPES = {
  'bare weapon': { weapons: [{ name: 'Longsword' }] }, 'bare spell': { spells: [{ name: 'Bless' }] },
  'bare feature': { features: [{ name: 'Lay on Hands' }] }, 'object in equipment': { equipment: [{ name: 'Rope' }] },
  'bare feat': { feats: [{ name: 'Sentinel' }] }, 'bare pool': { resourcePools: [{ name: 'Hearth Embers' }] },
  'bare identity': { identities: [{ name: 'The Ashen Knight' }] }, 'bare condition': { customConditions: [{ name: 'Emberburn' }] },
  'bare hook': { customHooks: [{ name: 'A debt unpaid' }] }, 'bare supply': { supplies: [{ name: 'Rations' }] },
  'persona: {}': { persona: {} },
  'one of everything': { weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }], equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }], features: [{ name: 'Lay on Hands' }], identities: [{ name: 'Ash' }], persona: {} },
  'MY null-in-spells': { spells: [null] }, 'MY null-in-features': { features: [null] },
};
const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;
const CHROME = { 'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i], 'play/Grimoire': [/Grimoire/i], 'play/Roleplay': [/Perform|Catchphrase|Dialogue/i], 'prep/Character': [/Ability Scores/i], 'prep/Grimoire': [/Session Status|Lock & Load/i], 'prep/Persona': [/Persona Engine|Identity/i], 'prep/Academy': [/ROLEPLAY COACH|Training/i] };
const b = await chromium.launch();

async function run(base, label, obj) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).split('\n')[0].slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text().slice(0, 160)); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  try { await importFile(page, wr(label.replace(/\W/g, '_'), { ...SKELETON, ...obj })); } catch { }
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const bad = [];
  for (const s of SCREENS) {
    await goScreen(page, s);
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
    if (t.length < 40) bad.push(`${s.id}:BLANK`);
    if (BOUNDARY.test(t)) bad.push(`${s.id}:BOUNDARIED`);
    const miss = (CHROME[s.id] || []).filter(re => !re.test(t));
    if (miss.length) bad.push(`${s.id}:HOLLOW`);
  }
  await ctx.close();
  return { bad, errs: [...new Set(errs)] };
}

for (const [name, base, close] of [
  ['LIVE  https://dosenft.github.io/the-codex/  (deployed headSha 73c45d8)', 'https://dosenft.github.io/the-codex/', null],
  ['LOCAL dist at HEAD', (await serveDist(DIST, 5431)).url, true],
]) {
  console.log(`\n======== ${name} ========`);
  let faults = 0;
  for (const [k, v] of Object.entries(SHAPES)) {
    const { bad, errs } = await run(base, k, v);
    const f = bad.length || errs.length;
    if (f) faults++;
    console.log(`  ${f ? 'FAULT' : '  ok '}  ${k.padEnd(20)} ${bad.length ? bad.length + ' dead screen(s)' : ''} ${errs.length ? '· ' + errs[0] : ''}`);
  }
  console.log(`  >>> ${faults}/${Object.keys(SHAPES).length} shapes faulted`);
}
await b.close();
process.exit(0);
