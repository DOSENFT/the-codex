import { chromium, serveDist, DIST, PHONE, watch, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';
const srv = await serveDist(DIST, 4295);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p = await ctx.newPage(); watch(p);
await p.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p, realCopy('full'));
await p.getByRole('button', { name: /Open settings/i }).first().click().catch(e => console.log('click err', e.message));
await p.waitForTimeout(1500);
console.log('--- settings body text ---');
console.log((await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(-4000));
console.log('\n--- buttons in the topmost dialog/overlay ---');
console.log((await p.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]') || document.body;
  return [...dlg.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0)
    .map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60));
})).join('\n'));
console.log('\n--- storage keys ---\n' + (await p.evaluate(() => Object.keys(localStorage).join('\n'))));
await b.close(); await srv.close();
