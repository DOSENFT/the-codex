/* Two questions the run of record asks but does not answer:
   (1) V-6 says one turn control sits at y=272 — WHICH SCREEN, and what is it?
   (2) V-6b/V-6c name 8 and 9 occlusions — for each, how much scroll room is
       there in the direction that would free it, and is the coverer real?

   A-27's rule applies to my own reading of a result as much as to the app:
   a number I have not located is not a finding, it is a rumour. */
import { chromium, serveDist, DIST, PHONE, TABLET, importFile, settle, goScreen,
         SCREENS, freshCtx, audit, scrollOrThrow } from './rig.mjs';
import { realCopy, THRESH } from './families.mjs';

const srv = await serveDist(DIST, 4307);
const b = await chromium.launch();

const SCROLLER = `(() => { const on = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05
      && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < window.innerHeight; };
  const b = [...document.querySelectorAll('*')].filter(e =>
    e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && on(e));
  return b.sort((x, y) => (y.scrollHeight - y.clientHeight) - (x.scrollHeight - x.clientHeight))[0]
    || document.scrollingElement || document.documentElement; })()`;

const ROOM = `(() => { const el = ${SCROLLER};
  return { top: Math.round(el.scrollTop), max: Math.round(el.scrollHeight - el.clientHeight),
           ch: el.clientHeight, sh: el.scrollHeight }; })()`;

const TURN = /heal|expend|restore|slot|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i;

for (const [vpName, vp] of [['PHONE', PHONE], ['TABLET', TABLET]]) {
  const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: vp });
  await importFile(page, realCopy('full'));
  console.log(`\n████ ${vpName} ${vp.width}×${vp.height} ████`);

  for (const s of SCREENS) {
    await goScreen(page, s);
    await settle(page);

    if (vpName === 'PHONE') {
      const a = await audit(page);
      for (const c of a.touch) {
        if (!TURN.test(c.label) || c.clipped) continue;
        if (c.y < a.vh * (1 - THRESH.V6_thumb) || c.y > a.vh)
          console.log(`  V-6  ${s.id}  «${c.label}»  y=${c.y}/${a.vh}  ${c.hitW}×${c.hitH}`);
      }
    }

    for (const at of ['top', 'bottom']) {
      for (let k = 0; k < 3; k++) { await scrollOrThrow(page, at, `${s.id} @${at}`); await settle(page); }
      const room = await page.evaluate(ROOM);
      const a = await audit(page);
      for (const c of a.touch) {
        if (!c.occludedBy) continue;
        // How far could you scroll the way that would uncover it?
        const roomDown = room.max - room.top, roomUp = room.top;
        const frees = c.occludedEdge === 'bottom' ? roomDown : roomUp;
        console.log(`  OCC  ${s.id} @${at}  «${String(c.label).slice(0, 44)}»`);
        console.log(`         by ${c.occludedBy}  edge=${c.occludedEdge}`);
        console.log(`         rect y=${c.y} h=${c.hitH}  scrollTop=${room.top}/${room.max}  room-that-frees-it=${frees}px`);
      }
    }
  }
  await ctx.close();
}

await b.close(); await srv.close();
console.log('');
