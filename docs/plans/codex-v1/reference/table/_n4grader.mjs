/* _n4grader.mjs — is the N-4 grader in families.mjs measuring the app, or the
 * harness? Replays its EXACT sequence against a preview origin and instruments
 * the two things it never looks at:
 *
 *   - was the service worker consulted at all during the offline reload?
 *   - is the app still bricked at the moment the grader declares "recovered"?
 *
 * The grader currently records `bricked` as a note and asserts nothing on it,
 * then calls setOffline(false) BEFORE loading ?sw=off — so its one assertion is
 * made with the network up.
 */
import { chromium, LOCAL, watch, settle, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const base = LOCAL;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
watch(page);

await page.goto(base, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await settle(page);
await page.waitForTimeout(3000);

console.log('  caches before poison:', JSON.stringify(await page.evaluate(() => caches.keys())));
const shell = await page.evaluate(async b => {
  const name = (await caches.keys()).find(n => n.startsWith('codex-shell') && n !== 'codex-shell-lkg');
  await (await caches.open(name)).put(b, new Response(
    '<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>',
    { headers: { 'content-type': 'text/html' } }));
  return name;
}, base);
console.log('  poisoned:', shell);

/* ── exactly what the grader does ──────────────────────────────────────────── */
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(1500);

const probe = await page.evaluate(() => ({
  chars: document.body.innerText.trim().length,
  controlling: !!navigator.serviceWorker.controller,
  resources: performance.getEntriesByType('resource').length,
  workerServed: performance.getEntriesByType('resource').filter(r => r.workerStart > 0).length,
  nav: (() => { const n = performance.getEntriesByType('navigation')[0];
    return n ? { workerStart: n.workerStart, transferSize: n.transferSize, type: n.type } : null; })(),
  caches: null,
}));
probe.caches = await page.evaluate(() => caches.keys());
console.log('\n  --- under ctx.setOffline(true), the grader\'s "bricked" moment ---');
console.log('  body chars        :', probe.chars, probe.chars < 40 ? '  ← the grader calls this BRICKED' : '');
console.log('  SW controlling    :', probe.controlling);
console.log('  navigation entry  :', JSON.stringify(probe.nav));
console.log('  subresources      :', probe.resources, 'of which worker-served:', probe.workerServed);
console.log('  caches on disk    :', JSON.stringify(probe.caches));

// Can page context still reach the caches the worker apparently could not?
const reachable = await page.evaluate(async b => {
  const lkg = await caches.open('codex-shell-lkg').catch(() => null);
  const r = lkg && await lkg.match(b);
  return r ? (await r.text()).length : null;
}, base);
console.log('  LKG readable from page context:', reachable === null ? 'no' : reachable + ' bytes');
console.log('    → if the LKG is right there and the worker was never asked,');
console.log('      "bricked" is a statement about setOffline, not about the app.');

/* ── the grader then restores the network before testing the repair ───────── */
await ctx.setOffline(false);
await page.goto(base + '?sw=off', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const recovered = /Nix|Import Character/.test(await page.evaluate(() => document.body.innerText));
console.log('\n  --- the grader\'s only assertion, made ONLINE ---');
console.log('  recovered:', recovered, ' (network was restored before this line)');

await ctx.close();
await browser.close();
