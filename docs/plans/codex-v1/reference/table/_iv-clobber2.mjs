/* IV — the clobber, in full: what is on disk, what is on each screen, and what
   the notice claims, on HEAD. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';
const FULL = realCopy('full');
const b = await chromium.launch();
const say = (k, v) => console.log('    ' + String(k).padEnd(34) + v);
const disk = p => p.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  const c = JSON.parse(localStorage.getItem(k));
  return { pool: c.paladinResources.layOnHands.current, hooks: (c.customHooks || []).map(h => h.text), at: c.updatedAt };
});
const screenPool = async p => {
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const m = t.match(/(\d+)\s*\/\s*35/); return m ? Number(m[1]) : null;
};
const alertOf = p => p.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const heal5 = p => p.getByRole('button', { name: /^Heal 5$/i }).first();

const srv = await serveDist(DIST, 4315);
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p1 = await ctx.newPage(); watch(p1);
await p1.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p1, FULL);
const p2 = await ctx.newPage(); watch(p2);
await p2.goto(srv.url, { waitUntil: 'networkidle' });
await p2.waitForTimeout(1400);

await p1.bringToFront();
for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(650); }
say('disk after tab1 spends twice', JSON.stringify(await disk(p1)));
say('tab1 screen', await screenPool(p1));

await p2.bringToFront();
await p2.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
await p2.waitForTimeout(1100);
await p2.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Add Hook'); if (e) e.click(); });
await p2.waitForTimeout(700);
await p2.locator('input[placeholder="Type your hook..."]').first().fill('stale tab hook', { force: true }).catch(() => {});
await p2.waitForTimeout(300);
await p2.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Add' && !x.disabled); if (e) e.click(); });
await p2.waitForTimeout(1800);

const d = await disk(p2);
say('disk after stale tab2 adds hook', JSON.stringify(d));
say('  → the "not saved" change', d.hooks.includes('stale tab hook') ? 'IS ON DISK' : 'is not on disk');
say('  → tab1 two spends', d.pool === 35 ? 'ERASED (35, back to full)' : 'held (' + d.pool + ')');
say('tab2 notice', JSON.stringify((await alertOf(p2)).slice(0, 240)));

await p1.bringToFront(); await p1.waitForTimeout(600);
say('tab1 screen now', await screenPool(p1) + '   (disk says ' + d.pool + ')');
await heal5(p1).click().catch(() => {}); await p1.waitForTimeout(1400);
say('tab1 spends again → disk', (await disk(p1)).pool);
say('tab1 screen after that', await screenPool(p1));
say('tab1 notice', JSON.stringify((await alertOf(p1)).slice(0, 80)));
say('tab1 faults', (await judge(p1)).faults.join(' | ') || 'none');
say('tab2 faults', (await judge(p2)).faults.join(' | ') || 'none');

await ctx.close(); await srv.close(); await b.close();
console.log('');
