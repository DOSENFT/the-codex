// Is N-1 a real bug or an artefact of Playwright's setOffline?
//
// setOffline is a CDP flag. The evidence says the worker was never consulted for
// the reload's subresources (workerStart = 0) even though it was controlling and
// served a page-initiated fetch from cache in the same breath. That is not how a
// browser behaves; it is how a test harness behaves.
//
// So do it the honest way: serve the build from a server we own, precache, then
// KILL THE SERVER. That is what a basement with no wifi actually is — the origin
// is unreachable, and nothing in the browser has been told to pretend.
import { chromium, freshCtx, goScreen, SCREENS, importFile, judge } from './rig.mjs';
import { serveDist } from './selftest.mjs';
import { realCopy } from './families.mjs';

const DIST = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/dist';
const srv = await serveDist(DIST, 5321);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.errs = [];
page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text().slice(0, 120)); });
page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).slice(0, 120)));

await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await page.waitForTimeout(4000);
console.log('precached:', await page.evaluate(async () =>
  (await (await caches.open((await caches.keys()).find(k => k.startsWith('codex-shell')))).keys()).length));

console.log('\n>>> killing the server — the origin is now unreachable <<<');
await srv.close();
await page.waitForTimeout(500);

page.errs.length = 0;
await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => console.log('reload threw:', String(e).slice(0, 120)));
await page.waitForTimeout(3000);

const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
console.log('body:', t.length, 'chars |', t.slice(0, 160));
const perf = await page.evaluate(() => performance.getEntriesByType('resource')
  .map(r => `${r.name.split('/').pop().padEnd(34)} status=${r.responseStatus} worker=${r.workerStart > 0} decoded=${r.decodedBodySize}`));
perf.slice(0, 10).forEach(p => console.log('  ', p));

if (t.length > 40) {
  console.log('\n--- walking all seven screens with the origin dead ---');
  const CHROME = {
    'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i], 'play/Grimoire': [/Grimoire/i],
    'play/Roleplay': [/Perform|Catchphrase|Dialogue/i], 'prep/Character': [/Ability Scores/i],
    'prep/Grimoire': [/Session Status|Lock & Load/i], 'prep/Persona': [/Persona Engine|Identity/i],
    'prep/Academy': [/ROLEPLAY COACH|Training/i],
  };
  for (const s of SCREENS) {
    await goScreen(page, s);
    const j = await judge(page, { needs: CHROME[s.id] });
    console.log(`  ${s.id.padEnd(16)} ${j.text.length}ch ${j.faults.length ? '\x1b[31m' + j.faults.join(' | ').slice(0, 120) + '\x1b[0m' : 'ok'}`);
  }
  const spend = page.getByRole('button', { name: /Heal 5/i }).first();
  if (await spend.count()) {
    const before = await page.evaluate(() => { const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-')); return localStorage.getItem(k); });
    await spend.click(); await page.waitForTimeout(700);
    const after = await page.evaluate(() => { const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-')); return localStorage.getItem(k); });
    console.log('  spend persisted with the origin dead:', before !== after);
  }
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2500);
  console.log('  second reload still has Nix:', /Nix/.test(await page.evaluate(() => document.body.innerText)));
}
console.log('errors:', page.errs.slice(0, 6));
await ctx.close(); await b.close();
