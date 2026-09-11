/* _s1b — throwaway: cold launch TTFB with the origin ALIVE vs DEAD. */
import { chromium, freshCtx, importFile, deadOrigin, PHONE } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const measure = async (page, ctx, tag) => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.reload({ waitUntil: 'commit' });
  let painted = NaN;
  while (Date.now() - t0 < 12000) {
    const t = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (/Nix/.test(t)) { painted = Date.now() - t0; break; }
    await page.waitForTimeout(16);
  }
  const n = await page.evaluate(() => {
    const x = performance.getEntriesByType('navigation')[0] || {};
    return { ttfb: Math.round(x.responseStart || 0), fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0) };
  });
  console.log(`${tag.padEnd(14)} TTFB ${String(n.ttfb).padStart(5)}ms   FCP ${String(n.fcp).padStart(5)}ms   "Nix" ${painted}ms`);
};
{ // alive
  const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
  await importFile(page, realCopy('full'));
  await page.waitForTimeout(1500); // let the SW install + precache
  await measure(page, ctx, 'origin ALIVE');
  await ctx.close();
}
{ // dead
  const r = await deadOrigin(b, { viewport: PHONE, dpr: 3 }, realCopy('full'));
  await measure(r.page, r.ctx, 'origin DEAD');
  await r.ctx.close();
}
await b.close();
