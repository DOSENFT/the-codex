import { chromium, serveDist, DIST, PHONE, importFile, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const srv = await serveDist(DIST, 4322);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off','1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full')); await settle(page);
console.log(await page.evaluate(() => {
  const h = [...document.querySelectorAll('header')].find(e => getComputedStyle(e).position === 'fixed');
  if (!h) return 'no fixed header';
  const out = [];
  const walk = (el, d) => { for (const c of el.children) {
    const r = c.getBoundingClientRect();
    out.push(`${'  '.repeat(d)}${c.tagName.toLowerCase()} «${(c.getAttribute('aria-label')||c.textContent||'').trim().replace(/\s+/g,' ').slice(0,22)}» x=${Math.round(r.left)}..${Math.round(r.right)} w=${Math.round(r.width)}${r.right > innerWidth + 0.5 ? '   <<< OFF-SCREEN by ' + Math.round(r.right - innerWidth) : ''}`);
    if (c.children.length && d < 2) walk(c, d+1);
  }};
  walk(h, 0);
  return `viewport ${innerWidth}  header w=${Math.round(h.getBoundingClientRect().width)} scrollW=${h.scrollWidth}\n` + out.join('\n');
}));
await ctx.close(); await b.close(); await srv.close();
