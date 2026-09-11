/* V-6b/V-6c say eight and seven controls are covered by fixed chrome, and the
   grader names the COVERER but not the cure. Before touching a padding value I
   need to know which of two very different things is happening:

     TRAPPED  — the scroller is already at the end this control needs, so no
                amount of scrolling frees it. That is the defect: the page does
                not reserve room for its own chrome.
     PASSING  — the control is merely in the chrome's band at this scroll
                extreme and would come clear with a flick. The criterion still
                grades it, and the honest fix is still to reserve the band.

   So: for each flagged control, print the rect, the scroller's exact position,
   and how far it CAN still scroll in the direction that would free it. A
   number that says "0 left to scroll" is a padding bug; a number that says
   "1200px left" means the layout puts turn-relevant controls in the chrome's
   lane and the fix is composition, not padding. */
import { chromium, serveDist, DIST, PHONE, TABLET, importFile, settle, goScreen, SCREENS, freshCtx, scrollOrThrow, AUDIT_DOM } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4300);
const b = await chromium.launch();

const SCROLLER_SRC = `(() => {
  const on = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05
      && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < window.innerHeight; };
  const b = [...document.querySelectorAll('*')].filter(e =>
    e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && on(e));
  return b.sort((x, y) => (y.scrollHeight - y.clientHeight) - (x.scrollHeight - x.clientHeight))[0]
    || document.scrollingElement || document.documentElement; })()`;

async function sweep(viewport, label) {
  console.log(`\n████ ${label} ████`);
  const { ctx, page } = await freshCtx(b, { base: srv.url, viewport });
  await importFile(page, realCopy('full'));

  for (const s of SCREENS) {
    await goScreen(page, s);
    for (const at of ['top', 'bottom']) {
      for (let k = 0; k < 3; k++) { await scrollOrThrow(page, at, `${s.id} @${at}`); await settle(page); }
      const a = await page.evaluate(AUDIT_DOM);
      const hits = a.touch.filter(c => c.occludedBy);
      if (!hits.length) continue;

      const geo = await page.evaluate(`(() => { const el = ${SCROLLER_SRC};
        return { top: Math.round(el.scrollTop), h: Math.round(el.scrollHeight),
                 c: Math.round(el.clientHeight), vh: window.innerHeight,
                 padB: getComputedStyle(el).paddingBottom, padT: getComputedStyle(el).paddingTop,
                 tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\\s+/).slice(0,3).join('.') : '') }; })()`);
      const room = { up: geo.top, down: Math.max(0, geo.h - geo.c - geo.top) };

      console.log(`\n══ ${s.id} @${at} ══`);
      console.log(`   scroller ${geo.tag}`);
      console.log(`   scrollTop=${geo.top}  scrollHeight=${geo.h}  clientHeight=${geo.c}  vh=${geo.vh}`);
      console.log(`   padding-top=${geo.padT}  padding-bottom=${geo.padB}`);
      console.log(`   room to scroll: up ${room.up}px · down ${room.down}px`);
      for (const c of hits) {
        // Which way would free it, and is there any room that way?
        const bottomPinned = /bottom-0|nav\./.test(c.occludedBy);
        const need = bottomPinned ? 'down' : 'up';
        const verdict = room[need] === 0 ? 'TRAPPED — no scroll left this way' : `escapable (${room[need]}px ${need})`;
        console.log(`   • «${String(c.label).slice(0, 44)}»  y=${c.y ?? '?'} h=${c.hitH}`);
        console.log(`       covered by ${c.occludedBy}`);
        console.log(`       ${verdict}`);
      }
    }
  }
  await ctx.close();
}

await sweep(PHONE, 'PHONE 390×844 — V-6b');
await sweep(TABLET, 'TABLET 834×1112 — V-6c');

await b.close(); await srv.close();
console.log('');
