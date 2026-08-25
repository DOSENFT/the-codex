/* V-2b and V-3b name their offenders by TEXT, and the text is his data:
   «Desires mentorship from Talon…» and «abandonment» appear nowhere in the
   repo, so there is nothing to grep for. Worse, one of them measured 1.86:1
   while sitting in a component whose class list says `text-forge-0` — which is
   #f0e6d3 and cannot be 1.86:1 against anything dark. Either the ink is not
   what the class says, or the background bin is not what I think it is.

   So: for every node V-2b/V-3b would flag, print the DOM path, the COMPUTED
   ink, and the winning background bin that `pixelContrast` actually divided
   by. Guessing which class to brighten and rebuilding for 8 minutes to find
   out is the A-27 mistake with extra steps. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, freshCtx, AUDIT_DOM } from './rig.mjs';
import { realCopy } from './families.mjs';

const V2 = 4.5, V3 = 7;

const srv = await serveDist(DIST, 4298);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));

for (const id of ['play/Combat', 'play/Roleplay', 'prep/Persona', 'prep/Character']) {
  const s = SCREENS.find(x => x.id === id);
  if (!s) continue;
  await goScreen(page, s);
  await settle(page);
  console.log(`\n══ ${id} ══`);

  // Same paging rule the grader uses, so I look where it looked.
  const pages = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const inner = [...document.querySelectorAll('*')].find(e =>
      e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    const t = inner || el;
    return Math.ceil(t.scrollHeight / Math.max(1, t.clientHeight));
  });

  for (let i = 0; i < Math.min(pages, 6); i++) {
    await page.evaluate(n => {
      const inner = [...document.querySelectorAll('*')].find(e =>
        e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY));
      const t = inner || document.scrollingElement || document.documentElement;
      t.scrollTop = n * t.clientHeight;
      window.scrollTo(0, n * window.innerHeight);
    }, i);
    await page.waitForTimeout(240);

    const a = await page.evaluate(AUDIT_DOM);
    const want = a.text.filter(t => t.onImage && t.ink && t.w >= 2 && t.h >= 2);
    if (!want.length) continue;
    const shot = (await page.screenshot({ type: 'png' })).toString('base64');

    const rows = await page.evaluate(async ({ shot, want, V2, V3 }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + shot;
      await img.decode();
      const dpr = img.width / window.innerWidth;
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const lum = c => {
        const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
      };
      const ratio = (p, q) => {
        const l1 = lum(p), l2 = lum(q);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

      /* The DOM path is the whole point of this probe — it is the only thing
         here that maps a measured failure back to a line of source. */
      const path = el => {
        const bits = [];
        for (let e = el; e && e !== document.body && bits.length < 5; e = e.parentElement)
          bits.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string'
            ? '.' + e.className.trim().split(/\s+/).slice(0, 5).join('.') : ''));
        return bits.join('\n        < ');
      };

      // Re-walk to recover the element for each measured node: AUDIT_DOM
      // returns plain data, and I need the live element to print its path.
      const byKey = new Map();
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const t = (n.nodeValue || '').trim();
        if (!t || !n.parentElement) continue;
        const k = t.slice(0, 44) + '|' + Math.round(n.parentElement.getBoundingClientRect().left);
        if (!byKey.has(k)) byKey.set(k, n.parentElement);
      }

      const out = [];
      for (const n of want) {
        const x = Math.round(n.x * dpr), y = Math.round(n.y * dpr);
        const w = Math.round(n.w * dpr), h = Math.round(n.h * dpr);
        if (x < 0 || y < 0 || w < 2 || h < 2 || x + w > cv.width || y + h > cv.height) continue;
        const d = cx.getImageData(x, y, w, h).data;
        const bins = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
          const bb = bins.get(k);
          if (bb) { bb.n++; bb.r += d[i]; bb.g += d[i + 1]; bb.b += d[i + 2]; }
          else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
        }
        let top = null;
        for (const bb of bins.values()) if (!top || bb.n > top.n) top = bb;
        const bg = [top.r / top.n, top.g / top.n, top.b / top.n];
        const px = Math.round(ratio(n.ink, bg) * 100) / 100;
        const fails = px < V2 || (n.numeric && px < V3);
        if (!fails) continue;
        const el = byKey.get(n.t + '|' + n.x);
        out.push({
          t: n.t, size: n.size, numeric: n.numeric, px,
          which: px < V2 ? 'V-2b' : 'V-3b',
          ink: hex(n.ink), bg: hex(bg),
          share: Math.round((top.n * 4 / d.length) * 100),
          path: el ? path(el) : '(element not recovered)',
        });
      }
      return out;
    }, { shot, want, V2, V3 });

    for (const r of rows) {
      console.log(`  ${r.which}  ${r.px}:1  ${r.size}px${r.numeric ? ' numeral' : ''}  «${r.t}»`);
      console.log(`        ink ${r.ink}  on  bg ${r.bg} (${r.share}% of the rect)`);
      console.log(`        ${r.path}`);
    }
  }
}

await ctx.close(); await b.close(); await srv.close();
console.log('');
