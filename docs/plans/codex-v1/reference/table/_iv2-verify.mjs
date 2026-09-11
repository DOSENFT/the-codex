/* IV2 — do the low readings from my broad sweep survive a careful re-measure?
   My sweep is the accuser; it must be cross-examined before I report it.
   For every text node I take: CSS colour, the painted modal bg inside the box,
   AND the painted modal bg of a 3px band immediately BELOW the box (which
   contains no glyphs at all and is therefore the ground truth for background).
   If the two backgrounds agree, the reading stands.                          */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5924);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('E ' + String(e).slice(0, 90)));
page.on('console', m => { if (m.type() === 'error') errs.push('C ' + m.text().slice(0, 90)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const COLLECT = () => {
  window.__n = []; const out = [];
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > .05; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    if (/^(script|style|title)$/i.test(p.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect(); if (r.width < 3 || r.height < 3) continue;
    const cs = getComputedStyle(p);
    out.push({ k: window.__n.length, t: t.slice(0, 30), size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      css: cs.color, num: /^[\d\s/+\-.,%]+$/.test(t) && /\d/.test(t) });
    window.__n.push(n);
  }
  return out;
};
const modal = `(cx, cv, x, y, w, h) => {
  if (w < 2 || h < 2) return null;
  const d = cx.getImageData(x, y, w, h).data; const bins = new Map();
  for (let i = 0; i < d.length; i += 4) { const k = ((d[i]>>3)<<10)|((d[i+1]>>3)<<5)|(d[i+2]>>3);
    const b = bins.get(k); if (b) { b.n++; b.r+=d[i]; b.g+=d[i+1]; b.b+=d[i+2]; } else bins.set(k,{n:1,r:d[i],g:d[i+1],b:d[i+2]}); }
  let top=null; for (const b of bins.values()) if (!top||b.n>top.n) top=b;
  return [Math.round(top.r/top.n),Math.round(top.g/top.n),Math.round(top.b/top.n)];
}`;

const found = [];
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const items = await page.evaluate(COLLECT);
  // scroll through the screen in steps; at each step measure whatever is fully visible and unmeasured
  const done = new Set();
  for (let step = 0; step < 24; step++) {
    const moved = await page.evaluate(s => {
      const m = document.querySelector('main'); const e = m && m.scrollHeight > m.clientHeight ? m : document.scrollingElement;
      const before = e.scrollTop; e.scrollTop = s * 300; return e.scrollTop !== before || s === 0;
    }, step);
    await page.waitForTimeout(110);
    const todo = items.filter(i => !done.has(i.k)).map(i => i.k);
    if (!todo.length) break;
    const shot = (await page.screenshot({ type: 'png' })).toString('base64');
    const res = await page.evaluate(async ({ shot, todo, modalSrc }) => {
      const modalFn = eval('(' + modalSrc + ')');
      const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
      const d3 = img.width / innerWidth;
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const out = [];
      for (const k of todo) {
        const n = window.__n[k]; if (!n || !n.parentElement) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const r = rg.getBoundingClientRect();
        const x = Math.round(r.x * d3), y = Math.round(r.y * d3), w = Math.round(r.width * d3), h = Math.round(r.height * d3);
        if (x < 0 || y < 0 || w < 3 || h < 3 || x + w > cv.width || y + h + 12 > cv.height) continue;
        const inBox = modalFn(cx, cv, x, y, w, h);
        const below = modalFn(cx, cv, x, y + h + 2, w, 6);   // no glyphs live here
        out.push({ k, inBox, below });
      }
      return out;
    }, { shot, todo, modalSrc: modal });
    const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
    const rat = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)) * 100) / 100; };
    for (const m of res) {
      done.add(m.k);
      const it = items.find(i => i.k === m.k);
      const ink = (it.css.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      if (ink.length < 3) continue;
      const rIn = rat(ink, m.inBox), rBelow = m.below ? rat(ink, m.below) : null;
      const agree = m.below && m.inBox.every((v, i) => Math.abs(v - m.below[i]) <= 12);
      const floor = it.num ? 7 : 4.5;
      if (rIn < floor || (rBelow !== null && rBelow < floor)) {
        found.push({ sc: sc.id, t: it.t, size: it.size, num: it.num, css: it.css,
          bgInBox: m.inBox, bgBelow: m.below, rIn, rBelow, agree, floor });
      }
    }
  }
  console.log(`  swept ${sc.id.padEnd(16)} ${done.size}/${items.length} text runs measured`);
}
console.log(`\n=== nodes under their floor, with the background confirmed twice ===`);
const solid = found.filter(f => f.agree);
const shaky = found.filter(f => !f.agree);
console.log(`  ${solid.length} SOLID (in-box bg and the clean band below it agree within 12/255)`);
for (const f of solid.slice(0, 40)) console.log(`    ${f.sc.padEnd(15)} ${f.num ? 'NUM' : 'txt'} ${f.size}px "${f.t}" css=${f.css} bg=${JSON.stringify(f.bgBelow)} => ${f.rBelow}:1  (floor ${f.floor})`);
console.log(`\n  ${shaky.length} NOT CONFIRMED (the two background reads disagree — my instrument, not the app)`);
for (const f of shaky.slice(0, 12)) console.log(`    ${f.sc.padEnd(15)} "${f.t}" inBox=${JSON.stringify(f.bgInBox)} below=${JSON.stringify(f.bgBelow)} ${f.rIn}/${f.rBelow}`);
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await browser.close(); await srv.close();
