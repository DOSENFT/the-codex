// Boot the DEPLOYED app — not localhost — and check it is actually usable.
//
// This exists because `vite preview` and GitHub Pages disagree about the one
// thing that matters here: preview answers ANY unknown path with index.html and
// a 200, Pages 404s properly. A build that passes every local check can still
// ship a blank home-screen tile or a dead service worker. So the release is not
// proven until it is proven where it lives.
//
// No leading underscore, deliberately: the `_probe*` files beside it are scratch
// that must never be committed, and this is the opposite — it is the only check
// that looks at what Marcus's phone will actually load. Re-run after every deploy.
//
//   node docs/plans/codex-v1/reference/live-check.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const LIVE = 'https://dosenft.github.io/the-codex/';
let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

const b = await chromium.launch();

// -- a real first visit: no storage, no character, nothing seeded -------------
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(LIVE, { waitUntil: 'networkidle' });

console.log('\n-- 1. it boots, cold, for someone who has never opened it ------');
const text = await p.evaluate(() => document.body.innerText);
check('the page rendered something real', text.length > 100, true);
check('it is not the 404 page', /404|not found/i.test(text.slice(0, 200)), false);
// The tab title is the short name; the long "Illuminated Tactical Grimoire"
// lives in the manifest, which is where the install prompt reads from. Two
// different names on purpose — this check asserted the manifest's and was
// wrong, not the app.
check('the title is the app\'s', await p.title(), 'The Codex');
console.log('   first words:', JSON.stringify(text.slice(0, 90).replace(/\s+/g, ' ')));

console.log('\n-- 2. the service worker took ---------------------------------');
// Registration is async and deliberately not blocking, so give it a moment.
await p.waitForTimeout(3000);
const sw = await p.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.map(r => r.scope);
});
check('a worker is registered, at the app\'s scope', sw, ['https://dosenft.github.io/the-codex/']);

console.log('\n-- 3. it can be installed ------------------------------------');
const man = await p.evaluate(async () => {
  const href = document.querySelector('link[rel=manifest]')?.href;
  if (!href) return null;
  const r = await fetch(href);
  return { ok: r.ok, type: r.headers.get('content-type'), body: await r.json() };
});
check('the manifest is linked and served', man?.ok, true);
check('scope matches where it is actually deployed', man?.body?.scope, '/the-codex/');
check('start_url too', man?.body?.start_url, '/the-codex/');
check('it asks to be a standalone app', man?.body?.display, 'standalone');
const icons = await p.evaluate(async icons => {
  const out = [];
  for (const i of icons) {
    const r = await fetch(new URL(i.src, location.href).href);
    out.push([i.src, r.status, (r.headers.get('content-type') ?? '').split(';')[0]]);
  }
  const apple = document.querySelector('link[rel=apple-touch-icon]')?.href;
  if (apple) {
    const r = await fetch(apple);
    out.push(['apple-touch-icon', r.status, (r.headers.get('content-type') ?? '').split(';')[0]]);
  }
  return out;
}, man.body.icons);
// Status alone is not enough anywhere, and on Pages a miss is a 404 page with
// content-type text/html — which is exactly what a blank tile looks like.
check('every icon is served AS AN IMAGE', icons.filter(i => i[1] !== 200 || !i[2].startsWith('image/')), []);
console.log('   icons:', icons.map(i => `${i[0]} ${i[1]} ${i[2]}`).join(' | '));

console.log('\n-- 4. the second visit works offline --------------------------');
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await ctx.setOffline(true);
const offline = await p.goto(LIVE, { waitUntil: 'domcontentloaded' }).then(
  async () => (await p.evaluate(() => document.body.innerText)).length > 100,
  e => `navigation threw: ${e.message.split('\n')[0]}`,
);
check('it still opens with the network cut', offline, true);
await ctx.setOffline(false);

console.log('\n-- 5. nothing threw ------------------------------------------');
// The service worker logs its own lifecycle; only real errors count.
const real = errors.filter(e => !/favicon|Failed to load resource.*404/i.test(e));
check('clean console', real, []);

await p.goto(LIVE, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/live-phone.png' });
await p.setViewportSize({ width: 1024, height: 1366 });
await p.waitForTimeout(600);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/live-ipad.png' });

await b.close();
console.log(`\n==== ${failures === 0 ? 'THE LIVE SITE IS GOOD' : failures + ' FAILURES'} ====`);
process.exit(failures ? 1 : 0);
