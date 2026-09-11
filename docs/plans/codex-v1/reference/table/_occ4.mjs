/* _occ4 — throwaway: is that region actually empty? screenshot + clip test. */
import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Roleplay'));
for (let k = 0; k < 3; k++) { await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await settle(page); }
await page.screenshot({ path: 'docs/plans/codex-v1/_shots-app/_occ-roleplay-bottom.png' });
// how many controls on each screen are clipped to nothing by an ancestor?
const CLIP = () => {
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  let total = 0, clipped = [];
  for (const el of document.querySelectorAll(SEL)) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue;
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('[aria-hidden="true"],[inert]')) continue;
    total++;
    let gone = '';
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue;
      const cr = n.getBoundingClientRect();
      const iw = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const ih = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      if (iw <= 0 || ih <= 0) { gone = `${n.tagName.toLowerCase()}.${String(n.className||'').split(/\s+/).slice(0,2).join('.')} h=${Math.round(cr.height)}`; break; }
    }
    if (gone) clipped.push(`«${(el.getAttribute('aria-label')||el.textContent||el.tagName).trim().replace(/\s+/g,' ').slice(0,34)}» clipped by ${gone}`);
  }
  return { total, n: clipped.length, sample: clipped.slice(0, 8) };
};
for (const s of SCREENS) {
  await goScreen(page, s); await page.evaluate(() => scrollTo(0,0)); await settle(page);
  const c = await page.evaluate(CLIP);
  console.log(`${s.id.padEnd(18)} ${String(c.n).padStart(3)} of ${c.total} controls clipped to nothing`);
  for (const x of c.sample) console.log('      ' + x);
}
await ctx.close(); await b.close();
