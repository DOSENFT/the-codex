/* _n4diag.mjs — scratch: WHICH requests fail on the offline ?sw=off path. */
import { chromium, serveDist, DIST, watch, settle, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const PORT = 5422;
const browser = await chromium.launch();
const srv = await serveDist(DIST, PORT);
const base = srv.url;
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

const p1 = await ctx.newPage();
watch(p1);
await p1.goto(base, { waitUntil: 'networkidle' });
await importFile(p1, realCopy('full'));
await settle(p1);
await p1.waitForTimeout(4000);
await p1.reload({ waitUntil: 'networkidle' });
await p1.waitForTimeout(2500);
await p1.evaluate(async b => {
  const shell = (await caches.keys()).find(n => n.startsWith('codex-shell-') && n !== 'codex-shell-lkg');
  await (await caches.open(shell)).put(b, new Response(
    '<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>',
    { headers: { 'content-type': 'text/html' } }));
}, base);
await p1.close();
await srv.close();

for (const [label, suffix] of [['plain', ''], ['sw=off', '?sw=off']]) {
  const p = await ctx.newPage();
  watch(p);
  const failed = [];
  p.on('requestfailed', r => failed.push(`${r.failure()?.errorText}  ${r.resourceType()}  ${r.url()}`));
  const responses = [];
  p.on('response', r => { if (r.status() >= 400) responses.push(`${r.status()} ${r.url()}`); });
  await p.goto(base + suffix, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(4000);
  console.log(`\n=== ${label} ===`);
  console.log('  errs:', p.errs.length);
  p.errs.forEach(e => console.log('    ' + e));
  console.log('  requestfailed:');
  failed.forEach(f => console.log('    ' + f));
  console.log('  >=400 responses:');
  responses.forEach(f => console.log('    ' + f));
  console.log('  caches now:', JSON.stringify(await p.evaluate(() => caches.keys())));
  await p.close();
}
await ctx.close();
await browser.close();
