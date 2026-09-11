/* Why did "text nodes sitting on a gradient" fall from 3018 to 109 when the
   scroll region became a bounded fixed box? A 30x drop in the size of the set
   that V-2b/V-3b grade is either a real change in what is painted, or it is my
   change quietly shrinking the audit's coverage — and the second one would
   turn every V improvement in this session into an artifact. Find out which by
   counting what the audit counts, per screen, and naming the ancestor that
   actually carries the background-image. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4292);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

let totalText = 0, totalImg = 0;
for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const r = await page.evaluate(() => {
    // the same shape the rig uses: visible text nodes, and whether any ancestor
    // paints a background-image behind them
    const vis = el => {
      const st = getComputedStyle(el), rc = el.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') >= 0.05
        && rc.width >= 1 && rc.height >= 1;
    };
    let text = 0, onImg = 0;
    const carriers = new Map();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      const el = n.parentElement;
      if (!el || !vis(el)) continue;
      text++;
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const bg = getComputedStyle(a).backgroundImage;
        if (bg && bg !== 'none') {
          onImg++;
          const key = a.tagName.toLowerCase() + '.' + String(a.className).split(' ').slice(0, 3).join('.');
          carriers.set(key, (carriers.get(key) || 0) + 1);
          break;
        }
      }
    }
    return { text, onImg, carriers: [...carriers.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4) };
  });
  totalText += r.text; totalImg += r.onImg;
  console.log(`  ${s.id.padEnd(16)} text=${String(r.text).padStart(5)}  onImage=${String(r.onImg).padStart(5)}`);
  for (const [k, n] of r.carriers) console.log(`        ${String(n).padStart(5)} under ${k.slice(0, 70)}`);
}
console.log(`\n  TOTAL text=${totalText}  onImage=${totalImg}`);
console.log('');
await ctx.close(); await b.close(); await srv.close();
