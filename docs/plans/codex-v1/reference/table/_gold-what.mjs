/* Two V-2b failures — the worst two in the whole run — report a background of
   #cba654, a bright gold, under cream and under forge-2. Nothing in either
   component's class list paints gold. Before I "fix" the ink I need to know
   whether the gold is (a) the element's own background, in which case the
   design really is light-on-light and the ink is the wrong lever, or (b)
   something painted OVER it, in which case the contrast number is a symptom of
   an occlusion and recolouring the text would be treating a bruise.

   So: for the two rects, dump the ancestor chain's real background paint, and
   ask the page what element is actually on top at the centre of the rect. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4299);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Roleplay'));
await settle(page);

const out = await page.evaluate(() => {
  const desc = el => el.tagName.toLowerCase() +
    (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 6).join('.') : '');
  const hits = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = (n.nodeValue || '').trim();
    if (!/^Add Hook$|^Desires mentorship/.test(t)) continue;
    const el = n.parentElement;
    const r = el.getBoundingClientRect();
    const chain = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      chain.push({
        el: desc(e),
        bg: s.backgroundColor,
        img: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 90),
        pos: s.position, z: s.zIndex, op: s.opacity,
      });
      if (chain.length > 7) break;
    }
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const stack = (document.elementsFromPoint(cx, cy) || []).slice(0, 6).map(e => {
      const s = getComputedStyle(e);
      return `${desc(e)}  bg=${s.backgroundColor} img=${s.backgroundImage === 'none' ? '-' : 'yes'} pos=${s.position} z=${s.zIndex}`;
    });
    hits.push({ t: t.slice(0, 44), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], chain, stack, cx, cy });
  }
  return hits;
});

for (const h of out) {
  console.log(`\n══ «${h.t}»  rect=[${h.rect.join(', ')}]  centre=(${h.cx},${h.cy}) ══`);
  console.log('  own ancestor paint:');
  for (const c of h.chain) console.log(`    ${c.el}\n       bg=${c.bg} img=${c.img || '-'} pos=${c.pos} z=${c.z} op=${c.op}`);
  console.log('  what is actually on top at the centre:');
  for (const s of h.stack) console.log(`    ${s}`);
}

await page.screenshot({ path: '_gold-roleplay.png' });
console.log('\n  screenshot → _gold-roleplay.png');

await ctx.close(); await b.close(); await srv.close();
