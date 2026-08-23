/* V-6c said 0 occluded. tablet-play-Combat.png shows the Veil pill sitting on a
   Channel Divinity pip. One of those is wrong, and a criterion that reports
   green while the evidence says red is worth less than no criterion at all.
   So: go to the same screen at the same size and print, for every Channel
   Divinity control, its rect, what elementFromPoint returns at its centre, and
   where the Veil actually is. */
import { chromium, freshCtx, importFile, goScreen, settle, serveDist, DIST, TABLET } from './rig.mjs';
import { realCopy } from './families.mjs';

const s = await serveDist(DIST, 5398);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: s.url, viewport: TABLET, dpr: 2 });
await importFile(page, realCopy('full'));
await goScreen(page, { id: 'play/Combat', mode: 'session', tab: 'combat' });
await page.evaluate(() => window.scrollTo(0, 0));
await settle(page);
await page.screenshot({ path: 'docs/plans/codex-v1/_shots-app/_v6c-tablet-combat.png' });

const out = await page.evaluate(() => {
  const desc = e => !e ? 'null'
    : e.tagName.toLowerCase() + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '')
      + (e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).slice(0, 2).join('.') : '');
  const rows = [];
  for (const el of document.querySelectorAll('button,[role=button],a,input,select')) {
    const lab = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40);
    if (!/Divinity|Veil/i.test(lab)) continue;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    rows.push({
      lab, rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      at: `${cx},${cy}`, hits: desc(hit), isSelf: !!hit && (hit === el || el.contains(hit)),
      inViewport: r.top >= 0 && r.bottom <= innerHeight,
    });
  }
  return rows;
});
for (const r of out) console.log(JSON.stringify(r));
await ctx.close(); await b.close(); await s.close();
