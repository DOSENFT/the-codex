/* _s1 — throwaway: where do the 2.9 seconds of S-1 actually go? */
import { chromium, freshCtx, importFile, deadOrigin, PHONE } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page, kill } = await deadOrigin(b, { viewport: PHONE, dpr: 3 }, realCopy('full'));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
await page.reload({ waitUntil: 'commit' });
while (Date.now() - t0 < 15000) {
  const t = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (/Nix/.test(t)) break;
  await page.waitForTimeout(16);
}
const painted = Date.now() - t0;
const m = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0] || {};
  const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
  const res = performance.getEntriesByType('resource').map(r => ({
    n: r.name.split('/').pop().slice(0, 34), t: Math.round(r.responseEnd - r.startTime), s: Math.round(r.startTime), type: r.initiatorType,
  })).sort((a, c) => c.t - a.t).slice(0, 12);
  return {
    ttfb: Math.round(n.responseStart || 0), domInteractive: Math.round(n.domInteractive || 0),
    domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0), loadEnd: Math.round(n.loadEventEnd || 0),
    paints, res,
    fonts: document.fonts ? document.fonts.size : -1,
    fontsReadyAt: null,
  };
});
const fr = await page.evaluate(() => document.fonts.ready.then(() => Math.round(performance.now())));
console.log(`painted "Nix" at ~${painted}ms (harness poll)`);
console.log(`  ttfb ${m.ttfb}  domInteractive ${m.domInteractive}  DCL ${m.domContentLoaded}  load ${m.loadEnd}`);
console.log(`  paints ${JSON.stringify(m.paints)}   fonts.ready at ${fr}ms  (${m.fonts} faces)`);
console.log('  slowest resources:');
for (const r of m.res) console.log(`    ${String(r.t).padStart(5)}ms  start=${String(r.s).padStart(5)}  ${r.type.padEnd(6)} ${r.n}`);
await kill(); await ctx.close(); await b.close();
