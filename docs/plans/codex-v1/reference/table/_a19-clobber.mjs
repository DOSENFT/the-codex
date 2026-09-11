/* The verifier's §1 contradiction: stale tab two acts through a BYPASSING call
   site (add a custom roleplay hook / open Settings), which on e4a8035 wrote
   unconditionally and erased tab one's two spends. Two tabs, one context. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';
const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-a19/dist';
const prev = process.argv.includes('--prev');
const dir = prev ? PREV : DIST, port = prev ? 4282 : 4283;
const label = prev ? 'PREV e4a8035' : 'HEAD (A-19)';
const FULL = realCopy('full');
const disk = page => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  if (!k) return null; const c = JSON.parse(localStorage.getItem(k));
  return { pool: c.paladinResources?.layOnHands?.current, at: c.updatedAt };
});
const srv = await serveDist(dir, port);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p1 = await ctx.newPage(); watch(p1);
await p1.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p1, FULL);
const p2 = await ctx.newPage(); watch(p2);            // opens BEFORE tab 1 writes
await p2.goto(srv.url, { waitUntil: 'networkidle' });
await p2.waitForTimeout(1200);
await p1.bringToFront();
for (let i = 0; i < 2; i++) { await p1.getByRole('button', { name: /^Heal 5$/i }).first().click(); await p1.waitForTimeout(650); }
const after1 = await disk(p1);
await p2.bringToFront();                              // stale tab acts via a BYPASS path
await p2.getByRole('button', { name: /Open settings/i }).first().click();
await p2.waitForTimeout(1400);
const after2 = await disk(p2);
const told = await p2.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g,' ').trim() : ''; });
const faults = [...(await judge(p1)).faults, ...(await judge(p2)).faults];
console.log(`\n\x1b[1mstale tab acts through a bypassing call site — ${label}\x1b[0m`);
console.log(`  disk after tab 1 spends x2   ${JSON.stringify(after1)}`);
console.log(`  disk after stale tab 2 acts  ${JSON.stringify(after2)}  ${after2.pool === after1.pool ? '\x1b[32mheld\x1b[0m' : '\x1b[31mCLOBBERED\x1b[0m'}`);
console.log(`  stale tab notice             ${told ? JSON.stringify(told.slice(0,70)) : 'none'}`);
console.log(`  faults                       ${faults.length ? faults.join(' | ') : 'none'}\n`);
await ctx.close(); await b.close(); await srv.close();
