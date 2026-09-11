/* _occ3 — throwaway: who scrolls play/Roleplay, and what exactly sits under the bar. */
import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Roleplay'));
for (let k = 0; k < 3; k++) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);
}
const info = await page.evaluate(() => {
  const de = document.documentElement, m = document.querySelector('main');
  const nav = document.querySelector('nav.fixed');
  const mr = m.getBoundingClientRect(), ms = getComputedStyle(m);
  const out = {
    docScroll: de.scrollTop, docMax: de.scrollHeight - de.clientHeight,
    mainScroll: m.scrollTop, mainMax: m.scrollHeight - m.clientHeight,
    mainPadBottom: ms.paddingBottom, mainRectBottom: Math.round(mr.bottom),
    mainH: Math.round(mr.height), mainScrollH: m.scrollHeight,
    navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
    navH: nav ? Math.round(nav.getBoundingClientRect().height) : null,
    vh: window.innerHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    rootChain: [],
    hits: [],
  };
  // ancestor chain of main with heights/overflow
  for (let n = m; n && n !== de.parentElement; n = n.parentElement) {
    const s = getComputedStyle(n), r = n.getBoundingClientRect();
    out.rootChain.push(`${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}.${String(n.className || '').split(/\s+/).slice(0, 3).join('.')} h=${Math.round(r.height)} sh=${n.scrollHeight} ovf=${s.overflowY} pos=${s.position}`);
  }
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(SEL)) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue;
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('[aria-hidden="true"],[inert]')) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== el && !el.contains(top)) {
      let anchored = null;
      for (let n = top; n && n !== de; n = n.parentElement) {
        const p = getComputedStyle(n).position;
        if (p === 'fixed' || p === 'sticky') { anchored = n; break; }
      }
      if (!anchored) continue;
      const chain = [];
      for (let n = el, i = 0; n && i < 6; n = n.parentElement, i++) {
        const cs = getComputedStyle(n), cr = n.getBoundingClientRect();
        chain.push(`${n.tagName.toLowerCase()}.${String(n.className || '').split(/\s+/).slice(0, 3).join('.')} top=${Math.round(cr.top)} h=${Math.round(cr.height)} ovf=${cs.overflowY} pos=${cs.position}`);
      }
      out.hits.push({
        label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 46),
        rect: `top=${Math.round(r.top)} h=${Math.round(r.height)} cy=${Math.round(cy)}`,
        chain,
      });
    }
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await ctx.close(); await b.close();
