/* Ground truth for "which controls have no accessible name", on the seven
   graded screens only.

   I tried to answer this by regex over the source first and it lied: the
   pattern `<(Button|button)\b([^>]*?)>` cannot cross the `>` inside an
   `onClick={() => ...}`, so every control with an arrow-function prop was
   skipped — including the exact SceneResponseBank Add button I already knew
   was unnamed. A scan that misses the case you can see is worth nothing on
   the cases you can't. Ask the rendered page instead. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4302);
const b = await chromium.launch();

const UNNAMED = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || r.width < 2 || r.height < 2) continue;
    if (el.closest('.print-record')) continue;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (name) continue;
    const path = [];
    for (let n = el.parentElement, i = 0; n && i < 7 && n !== document.body; n = n.parentElement, i++)
      path.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\\s+/).slice(0,2).join('.') : ''));
    // What is the nearest text ABOVE it? That is what a human would call it.
    const card = el.closest('.glass-card, section, article') || el.parentElement;
    out.push({
      icon: (el.querySelector('svg')?.getAttribute('class') || 'no-svg').slice(0, 60),
      wh: Math.round(r.width) + 'x' + Math.round(r.height),
      dis: el.disabled ? ' [disabled]' : '',
      path: path.join(' < '),
      near: (card?.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 90),
    });
  }
  return out; })()`;

const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));

for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const hits = await page.evaluate(UNNAMED);
  if (!hits.length) continue;
  console.log(`\n══ ${s.id} — ${hits.length} unnamed ══`);
  for (const h of hits) {
    console.log(`   ${h.wh}${h.dis}  svg=${h.icon}`);
    console.log(`      path ${h.path}`);
    console.log(`      near «${h.near}»`);
  }
}

await ctx.close();
await b.close(); await srv.close();
console.log('');
