/* IV2 — the colour-space blind spot.

   rig.mjs:325   const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
   rig.mjs:384   const eff = fg ? over(fg.rgb, bg.rgb, alpha).map(Math.round) : null;
   rig.mjs:392   contrast: eff ? ... : null
   rig.mjs:522   const want = nodes.filter(n => n.ink && n.w >= 2 && n.h >= 2);

   Tailwind v4 emits oklch(). Chrome's getComputedStyle returns `color` in the
   author's colour space for oklch/oklab/color-mix. Any such node returns null
   from parse(), so `ink` is null, so pixelContrast SKIPS it and V-2/V-3 get
   null. Four criteria, blind, silently — the exact failure mode A-14 exists
   to have fixed.

   Count them. Then resolve each colour to sRGB the only way that cannot be
   argued with — hand the string to a canvas, which is the same rasteriser that
   paints the screen — and compute the contrast that was never computed.      */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5925);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const SCAN = () => {
  const RIG = /rgba?\(([^)]+)\)/;                  // rig.mjs:325, verbatim
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const toRGB = css => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillRect(0, 0, 1, 1); cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > .05; };
  let total = 0, blind = 0; const kinds = {}; const samples = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    if (/^(script|style|title)$/i.test(p.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    total++;
    const c = getComputedStyle(p).color;
    if (!RIG.test(c)) {
      blind++;
      const fn = (String(c).match(/^([a-z-]+)\(/) || [, 'other'])[1];
      kinds[fn] = (kinds[fn] || 0) + 1;
      if (samples.length < 400) samples.push({ t: t.slice(0, 28), css: c, rgb: toRGB(c),
        size: Math.round(parseFloat(getComputedStyle(p).fontSize) * 10) / 10,
        num: /^[\d\s/+\-.,%]+$/.test(t) && /\d/.test(t),
        x: r.x, y: r.y, w: r.width, h: r.height });
    }
  }
  return { total, blind, kinds, samples };
};

const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
const rat = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)) * 100) / 100; };

let T = 0, B = 0; const allKinds = {}; const under = [];
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const r = await page.evaluate(SCAN);
  T += r.total; B += r.blind;
  for (const [k, v] of Object.entries(r.kinds)) allKinds[k] = (allKinds[k] || 0) + v;
  console.log(`  ${sc.id.padEnd(16)} ${String(r.blind).padStart(4)} / ${String(r.total).padStart(4)} text runs have a colour rig.mjs:325 cannot parse = ${(100 * r.blind / r.total).toFixed(1)}%   ${JSON.stringify(r.kinds)}`);
  // measure the painted background under the ones that are on screen right now
  const shot = (await page.screenshot({ type: 'png' })).toString('base64');
  const bgs = await page.evaluate(async ({ shot, boxes }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
    const d3 = img.width / innerWidth;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    return boxes.map(b => {
      const x = Math.round(b.x * d3), y = Math.round(b.y * d3), w = Math.round(b.w * d3), h = Math.round(b.h * d3);
      if (x < 0 || y < 0 || w < 3 || h < 3 || x + w > cv.width || y + h > cv.height) return null;
      const d = cx.getImageData(x, y, w, h).data; const bins = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const bb = bins.get(k); if (bb) { bb.n++; bb.r += d[i]; bb.g += d[i + 1]; bb.b += d[i + 2]; } else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] }); }
      let top = null; for (const bb of bins.values()) if (!top || bb.n > top.n) top = bb;
      return [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
    });
  }, { shot, boxes: r.samples });
  r.samples.forEach((s, i) => {
    const bg = bgs[i]; if (!bg) return;
    const v = rat(s.rgb, bg);
    const floor = s.num ? 7 : 4.5;
    if (v < floor) under.push(`${sc.id.padEnd(15)} ${s.num ? 'NUM' : 'txt'} ${s.size}px "${s.t}"  ${s.css}  -> sRGB ${JSON.stringify(s.rgb)} on painted ${JSON.stringify(bg)} = ${v}:1 (floor ${floor})`);
  });
}
console.log(`\n  TOTAL ${B}/${T} = ${(100 * B / T).toFixed(1)}% of visible text has a computed colour rig.mjs:325 returns null for.`);
console.log(`  colour functions seen: ${JSON.stringify(allKinds)}`);
console.log(`\n=== of the blind set, nodes actually below their floor (first screenful of each screen only) ===`);
[...new Set(under)].slice(0, 40).forEach(u => console.log('   ' + u));
console.log(`   ${new Set(under).size} total`);
await browser.close(); await srv.close();
