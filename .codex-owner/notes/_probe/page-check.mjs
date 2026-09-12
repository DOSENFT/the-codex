import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const page = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';
const out = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/captures';
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const msgs = [], failed = [], pageErrors = [];
for (const [w, h, name] of [[1280, 800, 'owner-page-1280'], [390, 844, 'owner-page-390']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', m => msgs.push(`${name} ${m.type()}: ${m.text()}`));
  p.on('pageerror', e => pageErrors.push(`${name}: ${e.message}`));
  p.on('requestfailed', r => failed.push(`${name}: ${r.url()} ${r.failure()?.errorText}`));
  await p.goto(pathToFileURL(page).href, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  // broken images + font loading
  const imgs = await p.evaluate(() => Array.from(document.images).map(i => ({
    src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight
  })));
  const fonts = await p.evaluate(() => Array.from(document.fonts).map(f => `${f.family} ${f.weight} ${f.status}`));
  console.log(`--- ${name} ---`);
  for (const i of imgs) console.log(`  ${i.ok ? 'OK  ' : 'BROKEN'} ${i.src} ${i.w}x${i.h}`);
  console.log('  fonts:', fonts.join(' | '));
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
console.log('console messages:', msgs.length, msgs.join(' // '));
console.log('page errors:', pageErrors.length, pageErrors.join(' // '));
console.log('failed requests:', failed.length, failed.join(' // '));
