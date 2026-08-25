/* A-22 reported «Generate Scene» and «Start Drill» at 1.04:1, graded [computed].
   ---------------------------------------------------------------------------
   1.04:1 is the number you get for text painted on its own colour. Both are
   `<Button variant="primary">` — `bg-gradient-to-r from-gold to-arcane` with
   `text-void-0`. A gradient sets `background-image`, and leaves
   `background-color` at `rgba(0,0,0,0)`; a contrast climb that looks only at
   `background-color` walks straight past the gold and lands on the dark
   glass-card behind it. Near-black ink on a near-black card is 1.04:1 — which
   is exactly what it reported, and is not what is on the screen.

   So: don't argue, look. This screenshots the button's own rectangle and reads
   the real pixels — darkest ink, the surrounding fill, and the ratio between
   them — with no stylesheet in the path. If the painted ratio is high, the
   finding is an artifact of the climb. If it is low, the button really is
   invisible and it is a defect. The probe does not know which answer it wants.

   It changes nothing and grades nothing. control-a22.mjs is untouched. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen,
         SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

/* Read the button's own painted pixels the same way `rig.mjs`'s pixelContrast
   does — screenshot, decode in the page, histogram the box — rather than
   pulling in a PNG decoder this repo does not have. Same method, one element.

   Note the line that matters in rig.mjs (547): a node whose box falls outside
   the viewport is SKIPPED by the painted path and silently falls back to the
   computed climb. That is the suspected mechanism here, so this probe scrolls
   the button fully into view first — if it then reads high, the 1.04:1 came
   from grading a node the camera could not see. */
const PAINTED = async (page, sel) => page.evaluate(async ({ shot }) => {
  const el = window.__probeEl;
  const r = el.getBoundingClientRect();
  const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
  const dpr = img.width / window.innerWidth;
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const lum = c => { const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const x = Math.round(r.left * dpr), y = Math.round(r.top * dpr);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  const clipped = x < 0 || y < 0 || x + w > cv.width || y + h > cv.height;
  if (clipped) return { clipped: true };
  const d = cx.getImageData(x, y, w, h).data;
  const bins = new Map();
  let darkest = null, dl = 2;
  for (let i = 0; i < d.length; i += 4) {
    const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    const b = bins.get(k);
    if (b) { b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
    else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
    const L = lum([d[i], d[i + 1], d[i + 2]]);
    if (L < dl) { dl = L; darkest = [d[i], d[i + 1], d[i + 2]]; }
  }
  let top = null; for (const b of bins.values()) if (!top || b.n > top.n) top = b;
  const bg = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
  const cs = getComputedStyle(el);
  const ink = cs.color.match(/[\d.]+/g).slice(0, 3).map(Number);
  return { clipped: false, bg, darkest, ink,
    inkVsFill: Math.round(ratio(ink, bg) * 100) / 100,
    darkVsFill: Math.round(ratio(darkest, bg) * 100) / 100 };
}, { shot: (await page.screenshot({ type: 'png' })).toString('base64') });

const srv = await serveDist(DIST, 4312);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE, dsf: 3 });
await importFile(page, realCopy('full'));

/* Both live under prep/Academy — «Generate Scene» in the Training sub-tab
   (RoleplayCoach), «Start Drill» in Quizzes (ConditionDrill). Reach them the
   way a finger does, then measure. */
await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
await settle(page);

for (const [subTab, label] of [['Training', 'Generate Scene'], ['Quizzes', 'Start Drill']]) {
  const tab = page.getByRole('button', { name: new RegExp('^' + subTab, 'i') }).first();
  if (await tab.count()) { await tab.click({ timeout: 3000 }).catch(() => {}); await settle(page); }

  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (!(await btn.count())) { console.log(`\n«${label}» not present on this screen — NOT MEASURED`); continue; }
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);

  const meta = await btn.evaluate(el => {
    window.__probeEl = el;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { bgColor: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 90),
             color: cs.color, fontSize: cs.fontSize,
             box: `${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.top)}`,
             offscreen: r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth };
  });

  console.log(`\n«${label}»  ${meta.box}`);
  console.log(`   computed  background-color: ${meta.bgColor}   color: ${meta.color}   ${meta.fontSize}`);
  console.log(`   computed  background-image: ${meta.bgImage}`);
  console.log(`   box outside the viewport (would fall back to the computed climb): ${meta.offscreen}`);

  const p = await PAINTED(page);
  if (p.clipped) { console.log('   PAINTED   box clipped by the viewport — no pixels to read'); continue; }
  console.log(`   PAINTED   dominant fill rgb(${p.bg.join(',')})   darkest pixel rgb(${p.darkest.join(',')})`);
  console.log(`   PAINTED   declared ink vs painted fill = \x1b[1m${p.inkVsFill}:1\x1b[0m`);
  console.log(`   PAINTED   darkest pixel vs fill        = \x1b[1m${p.darkVsFill}:1\x1b[0m   (A-22 computed said 1.04:1)`);
}

await ctx.close(); await b.close(); await srv.close();
