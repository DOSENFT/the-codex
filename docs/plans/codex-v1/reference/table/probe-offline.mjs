// N-1 is the worst finding so far: SW active, 16 files precached, and an
// offline reload loads none of the app. The precache list is correct and
// contains every asset that failed. So: is the cache actually holding them, and
// is the worker actually being consulted?
import { chromium, freshCtx, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const LOCAL = 'http://localhost:4173/the-codex/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('   console:', m.text().slice(0, 120)); });
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await page.waitForTimeout(4000);

const dump = async label => {
  const s = await page.evaluate(async () => {
    const out = { caches: {}, controller: !!navigator.serviceWorker.controller };
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      out.caches[k] = (await c.keys()).map(r => ({ url: new URL(r.url).pathname, mode: r.mode, dest: r.destination }));
    }
    const probe = ['/the-codex/', '/the-codex/assets/index-Da04sU1l.js'];
    out.match = {};
    for (const p of probe) {
      out.match[p] = {
        plain: !!(await caches.match(p)),
        req: !!(await caches.match(new Request(p))),
        cors: !!(await caches.match(new Request(p, { mode: 'cors' }))),
        ignoreVary: !!(await caches.match(p, { ignoreVary: true })),
      };
    }
    return out;
  });
  console.log(`\n== ${label} ==`);
  console.log('controller:', s.controller);
  for (const [k, v] of Object.entries(s.caches)) {
    console.log(` cache ${k}: ${v.length}`);
    v.slice(0, 20).forEach(r => console.log('   ', r.url, `mode=${r.mode} dest=${r.dest}`));
  }
  console.log(' match:', JSON.stringify(s.match, null, 2).replace(/\n\s*/g, ' '));
};

await dump('online, after precache');

await ctx.setOffline(true);
console.log('\n--- offline; fetching an asset from page context ---');
const r = await page.evaluate(async () => {
  try {
    const res = await fetch('/the-codex/assets/index-Da04sU1l.js');
    return { ok: res.ok, status: res.status, len: (await res.text()).length };
  } catch (e) { return { threw: String(e) }; }
});
console.log(' fetch result:', JSON.stringify(r));
await dump('offline, before reload');

await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => console.log(' reload threw:', String(e).slice(0, 140)));
await page.waitForTimeout(2500);
console.log('\n body after offline reload:', (await page.evaluate(() => document.body.innerText)).trim().length, 'chars');
console.log(' html len:', (await page.content()).length);
console.log(' url:', page.url());
const perf = await page.evaluate(() => performance.getEntriesByType('resource')
  .map(r => `${r.name.split('/').pop()} status=${r.responseStatus} transfer=${r.transferSize} decoded=${r.decodedBodySize} worker=${r.workerStart > 0}`));
perf.forEach(p => console.log('  ', p));
await dump('offline, after reload');

await ctx.close(); await b.close();
