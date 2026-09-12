import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const f = pathToFileURL('C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html').href;
const b = await chromium.launch();
for (const w of [1203, 1204, 1280, 1440, 1920, 1079, 1080, 768, 620, 619, 390, 360, 320]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(f, { waitUntil: 'load' });
  await p.waitForTimeout(250);
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const img = document.querySelector('figure.shots img');
    const toc = document.querySelector('nav.toc a').getBoundingClientRect();
    const wide = [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > de.clientWidth + 1).map(e => `${e.tagName}.${e.className}`.slice(0, 40));
    const hid = [...document.querySelectorAll('.scroll, .sums')].map(e => e.scrollWidth - e.clientWidth).filter(n => n > 0);
    return { sw: de.scrollWidth, cw: de.clientWidth, shot: Math.round(img.getBoundingClientRect().width), scale: +(img.getBoundingClientRect().width / 780).toFixed(3), toc: Math.round(toc.height), wide: [...new Set(wide)].slice(0, 4), hid };
  });
  console.log(String(w).padStart(4), JSON.stringify(r));
  await ctx.close();
}
await b.close();
