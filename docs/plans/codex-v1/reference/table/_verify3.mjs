// VERIFIER probe 3 — exhaustive PIXEL-TRUTH V-1..V-4 sweep over all 7 screens.
// Every text node the builder's audit skipped because an ancestor had a
// background-image is measured here against the pixels actually painted.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile } from './rig.mjs';
const PORT = 5413;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e).split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR ' + m.text().slice(0,200)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
const scratch = await ctx.newPage();
await scratch.goto('data:text/html,<canvas id=c></canvas>');

const srgb = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const lum = ([r,g,bb]) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(bb);
const ratio = (a,z) => { const [x,y] = [lum(a), lum(z)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

async function paintedBg(clip) {
  const buf = await page.screenshot({ clip });
  return scratch.evaluate(async b64 => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin], { type: 'image/png' }));
    const cv = document.getElementById('c'); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0,0,cv.width,cv.height).data;
    const h = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i+1]},${d[i+2]}`; h.set(k,(h.get(k)||0)+1); }
    const s = [...h.entries()].sort((a,b)=>b[1]-a[1]);
    return { modal: s[0][0].split(',').map(Number), share: s[0][1]/(d.length/4) };
  }, buf.toString('base64'));
}

const V1 = 12, V2 = 4.5, V3 = 7, V4 = 20;
const failV1 = [], failV2 = [], failV3 = [], failV4 = [], unmeasurable = [];
let considered = 0, pixelChecked = 0;

for (const s of SCREENS) {
  await goScreen(page, s); await settle(page);
  const folds = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / innerHeight));
  for (let f = 0; f < Math.min(folds, 6); f++) {
    await page.evaluate(n => scrollTo(0, n*innerHeight), f);
    await settle(page); await page.waitForTimeout(200);
    // collect every visible text node IN THE VIEWPORT with its geometry
    const nodes = await page.evaluate(() => {
      const px = v => parseFloat(v) || 0;
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let idx = 0;
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.nodeValue.trim(); if (!t) continue;
        const el = n.parentElement; if (!el) continue;
        if (/^(script|style|noscript)$/i.test(el.tagName)) continue;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || px(cs.opacity) < 0.05) continue;
        if (r.width < 1 || r.height < 1) continue;
        // must be fully inside the viewport so the screenshot is of the real thing
        if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) continue;
        out.push({ i: idx++, t: t.slice(0,40), x: r.left, y: r.top, w: r.width, h: r.height,
          size: Math.round(px(cs.fontSize)*10)/10, color: cs.color, opacity: px(cs.opacity)||1,
          family: (cs.fontFamily||'').split(',')[0].replace(/["']/g,''),
          numeric: /^[\s0-9./+\-x×]*[0-9][\s0-9./+\-x×]*$/.test(t) });
      }
      return out;
    });
    for (const n of nodes) {
      considered++;
      if (n.size < V1) failV1.push(`${s.id} «${n.t}» ${n.size}px`);
      if (/cinzel/i.test(n.family) && n.size < V4) failV4.push(`${s.id} «${n.t}» Cinzel ${n.size}px`);
      // pixel-truth contrast: only worth the screenshot cost for real text
      if (n.w < 2 || n.h < 2) continue;
      const bgp = await paintedBg({ x: n.x, y: n.y, width: Math.min(n.w, 390-n.x), height: Math.min(n.h, 844-n.y) });
      pixelChecked++;
      const fg = (n.color.match(/[\d.]+/g)||['255','255','255']).slice(0,3).map(Number);
      // account for element opacity by compositing fg over the painted bg
      const eff = fg.map((c,i) => c*n.opacity + bgp.modal[i]*(1-n.opacity));
      const cr = ratio(eff, bgp.modal);
      if (bgp.share < 0.25) { unmeasurable.push(`${s.id} «${n.t}» modal pixel only ${(bgp.share*100).toFixed(0)}% of box`); continue; }
      if (cr < V2) failV2.push(`${s.id} «${n.t}» ${n.size}px ${cr.toFixed(2)}:1 painted-bg rgb(${bgp.modal})`);
      else if (n.numeric && cr < V3) failV3.push(`${s.id} «${n.t}» ${n.size}px ${cr.toFixed(2)}:1 painted-bg rgb(${bgp.modal})`);
    }
  }
}
const u = a => [...new Set(a)];
console.log(`\n=== PIXEL-TRUTH V sweep — ${considered} visible text nodes considered, ${pixelChecked} screenshotted ===\n`);
console.log(`V-1  <12px            : ${u(failV1).length}`); u(failV1).slice(0,25).forEach(x=>console.log('   '+x));
console.log(`\nV-2  <4.5:1           : ${u(failV2).length}`); u(failV2).slice(0,40).forEach(x=>console.log('   '+x));
console.log(`\nV-3  numeric <7:1     : ${u(failV3).length}`); u(failV3).slice(0,40).forEach(x=>console.log('   '+x));
console.log(`\nV-4  Cinzel <20px     : ${u(failV4).length}`); u(failV4).slice(0,25).forEach(x=>console.log('   '+x));
console.log(`\n(unmeasurable, textured box: ${u(unmeasurable).length})`);
console.log('\n=== errors ==='); console.log(errs.length ? errs.join('\n') : '  (none)');
await b.close(); await srv.close();
