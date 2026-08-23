/* Why did D-7 stop passing? Reproduce the probe's exact sequence and then LOOK
   at the screen instead of guessing: import, go offline, tap prep, wait far
   longer than the probe does, and report what the surface actually is.

   freshCtx() sets codex-sw-off=1 — the D family deliberately runs with NO
   service worker, so ctx.setOffline(true) means the network is really gone and
   nothing is serving from cache. That is the honest phone-in-a-basement case. */
import { chromium, freshCtx, importFile, serveDist, DIST } from './rig.mjs';
import { realCopy } from './families.mjs';

const s = await serveDist(DIST, 5399);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: s.url, viewport: { width: 390, height: 844 }, dpr: 3 });
const fails = [];
page.on('requestfailed', r => fails.push(r.url().split('/').pop()));
await importFile(page, realCopy('full'));
await ctx.setOffline(true);
await page.getByRole('button', { name: /Switch to prep mode/i }).click().catch(() => {});
let waited = 0;
for (const ms of [400, 1500, 6000]) {
  await page.waitForTimeout(ms - waited); waited = ms;
  const n = await page.getByRole('button', { name: /Export Character/i }).count();
  const body = (await page.evaluate(() => document.body.innerText)).slice(0, 140).replace(/\s+/g, ' ');
  console.log(`t=${ms}ms  ExportCharacter=${n}  body="${body}"`);
}
console.log('failed requests:', fails.length ? fails.join(', ') : '(none)');
await ctx.close(); await b.close(); await s.close();
