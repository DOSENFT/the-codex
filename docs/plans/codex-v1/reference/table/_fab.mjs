import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await settle(page);
console.log(JSON.stringify(await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className||'').slice(0,110),
      label: (el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),
      rect: [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
      z: s.zIndex, bg: s.backgroundColor });
  }
  return out;
}), null, 1));
await ctx.close(); await b.close();
