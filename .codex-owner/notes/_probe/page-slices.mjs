import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const page = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';
const out = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/.codex-owner/notes/_probe/slices';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(pathToFileURL(page).href, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/hero.png` });
for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's8', 'appendix']) {
  const el = await p.$(`#${id}`);
  if (!el) { console.log('missing', id); continue; }
  const box = await el.boundingBox();
  console.log(id, JSON.stringify(box));
  await el.screenshot({ path: `${out}/${id}.png` }).catch(e => console.log(id, 'shot fail', e.message));
}
// mobile
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const p2 = await ctx2.newPage();
await p2.goto(pathToFileURL(page).href, { waitUntil: 'load' });
await p2.waitForTimeout(600);
await p2.screenshot({ path: `${out}/m-hero.png` });
const s4 = await p2.$('#s4'); await s4.screenshot({ path: `${out}/m-s4.png` });
// overflow check
for (const [name, pg] of [['1280', p], ['390', p2]]) {
  const o = await pg.evaluate(() => {
    const de = document.documentElement;
    const wide = [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > de.clientWidth + 1)
      .map(e => `${e.tagName}.${e.className}`.slice(0, 60));
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, wide: [...new Set(wide)].slice(0, 10) };
  });
  console.log(name, JSON.stringify(o));
}
await b.close();
