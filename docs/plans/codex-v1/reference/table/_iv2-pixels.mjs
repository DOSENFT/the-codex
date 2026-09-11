/* IV2 — my own pixel instrument, independent of rig.pixelContrast.
   Differences that matter:
     * rig.mjs:547 does `continue` on any node whose box is not wholly inside
       the viewport. Those nodes vanish from the pixel pass without a trace.
       I SCROLL each one into view and read it, so nothing is skipped.
     * rig derives the ink from the computed style (`eff`). I derive BOTH
       colours from the screenshot: bg = modal 5-bit bin, ink = the bin
       farthest from bg in luminance carrying >= 0.4% of the box's pixels.
       Nothing is taken on the DOM's word.
   Reports: V-1 (>=12px), V-2/V-3 (>=4.5 / >=7 numerals), V-5 (>=44px),
   V-5b (turn controls >=48px), and the two buttons 9.16(b) names.        */
import { chromium, serveDist, DIST, PHONE, TABLET, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const PORT = Number(process.argv[3] || 5921);
const TAB = process.argv[2] === 'tablet';
const VP = TAB ? TABLET : PHONE;
const srv = await serveDist(DIST, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext(TAB
  ? { viewport: TABLET, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
  : { viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 110)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 110)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

/* enumerate every visible text run + every interactive control, with a stable key */
const HARVEST = () => {
  const out = [];
  const seen = new Set();
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, i = 0;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    if (/^(script|style|title)$/i.test(p.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(p);
    const key = 'T' + (i++);
    p.setAttribute('data-iv2', (p.getAttribute('data-iv2') || '') + ' ' + key);
    out.push({ key, kind: 'text', t: t.slice(0, 40), size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      weight: cs.fontWeight, numeric: /^[\d\s/+\-.,%]+$/.test(t) && /\d/.test(t),
      color: cs.color });
  }
  for (const c of document.querySelectorAll('button,a[href],[role="button"],[role="tab"],input,select,textarea')) {
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const key = 'C' + (i++);
    c.setAttribute('data-iv2key', key);
    let deck = false; for (let e = c; e; e = e.parentElement) if (/turn-deck|TurnDeck/i.test(e.className || '') || e.hasAttribute?.('data-turn-deck')) { deck = true; break; }
    out.push({ key, kind: 'ctl', t: (c.getAttribute('aria-label') || c.textContent || c.type || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, deck, dis: !!c.disabled,
      tag: c.tagName.toLowerCase() });
  }
  return out;
};

const rectOf = (page, key, kind) => page.evaluate(({ key, kind }) => {
  if (kind === 'ctl') {
    const c = document.querySelector(`[data-iv2key="${key}"]`);
    if (!c) return null; const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }
  const p = [...document.querySelectorAll('[data-iv2]')].find(e => (' ' + e.getAttribute('data-iv2') + ' ').includes(' ' + key + ' '));
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}, { key, kind });

const scrollInto = (page, key, kind) => page.evaluate(({ key, kind }) => {
  const e = kind === 'ctl' ? document.querySelector(`[data-iv2key="${key}"]`)
    : [...document.querySelectorAll('[data-iv2]')].find(x => (' ' + x.getAttribute('data-iv2') + ' ').includes(' ' + key + ' '));
  if (!e) return false;
  const r = e.getBoundingClientRect();
  if (r.top < 60 || r.bottom > innerHeight - 10) e.scrollIntoView({ block: 'center' });
  return true;
}, { key, kind });

/* measure a batch of rects against ONE screenshot */
async function measure(page, batch) {
  const shot = (await page.screenshot({ type: 'png' })).toString('base64');
  return page.evaluate(async ({ shot, batch }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
    const dpr = img.width / innerWidth;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    const lum = c => { const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
    const out = [];
    for (const n of batch) {
      const x = Math.round(n.r.x * dpr), y = Math.round(n.r.y * dpr), w = Math.round(n.r.w * dpr), h = Math.round(n.r.h * dpr);
      if (w < 2 || h < 2) { out.push({ key: n.key, why: 'degenerate' }); continue; }
      const cx0 = Math.max(0, x), cy0 = Math.max(0, y);
      const cw = Math.min(cv.width, x + w) - cx0, ch = Math.min(cv.height, y + h) - cy0;
      if (cw < 2 || ch < 2) { out.push({ key: n.key, why: 'offscreen even after scroll' }); continue; }
      const d = cx.getImageData(cx0, cy0, cw, ch).data;
      const bins = new Map(); let tot = 0;
      for (let i = 0; i < d.length; i += 4) {
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const b = bins.get(k);
        if (b) { b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; } else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
        tot++;
      }
      let top = null; for (const b of bins.values()) if (!top || b.n > top.n) top = b;
      const bg = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
      const lbg = lum(bg);
      let ink = null, best = 0;
      for (const b of bins.values()) {
        if (b.n / tot < 0.004 || b.n < 6) continue;
        const c = [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)];
        const dl = Math.abs(lum(c) - lbg);
        if (dl > best) { best = dl; ink = c; }
      }
      out.push({ key: n.key, bg, ink, pixel: ink ? Math.round(ratio(ink, bg) * 100) / 100 : null,
        clipped: (x < 0 || y < 0 || x + w > cv.width || y + h > cv.height) });
    }
    return out;
  }, { shot, batch });
}

const BAD = { v1: [], v2: [], v3: [], v5: [], v5b: [], skipped: [] };
const named = {};
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const items = await page.evaluate(HARVEST);
  // group by scroll position: scroll each into view, batch by 1 screenshot per item group of 1
  // cheaper: process in passes — try current viewport first, then scroll stragglers
  let pending = items.slice();
  let pass = 0, results = new Map();
  while (pending.length && pass < 40) {
    // scroll the first pending item into view, then measure everything now fully visible
    await scrollInto(page, pending[0].key, pending[0].kind);
    await page.waitForTimeout(90);
    const batch = [];
    for (const it of pending) {
      const r = await rectOf(page, it.key, it.kind);
      if (!r) { results.set(it.key, { key: it.key, why: 'gone' }); continue; }
      if (r.y >= 0 && r.x >= 0 && r.y + r.h <= VP.height && r.x + r.w <= VP.width) batch.push({ key: it.key, r });
    }
    if (batch.length) for (const m of await measure(page, batch)) results.set(m.key, m);
    pending = pending.filter(it => !results.has(it.key));
    pass++;
    if (!batch.length) { results.set(pending[0].key, { key: pending[0].key, why: 'never fits viewport' }); pending = pending.slice(1); }
  }
  for (const it of items) {
    const m = results.get(it.key) || { why: 'unmeasured' };
    if (it.kind === 'text') {
      if (it.size < 12) BAD.v1.push(`${sc.id} ${it.size}px "${it.t}"`);
      if (m.pixel == null) { BAD.skipped.push(`${sc.id} "${it.t}" ${m.why || '?'}`); continue; }
      if (it.numeric) { if (m.pixel < 7) BAD.v3.push(`${sc.id} ${m.pixel}:1 ${it.size}px num "${it.t}" ink=${m.ink} bg=${m.bg}`); }
      else if (m.pixel < 4.5) BAD.v2.push(`${sc.id} ${m.pixel}:1 ${it.size}px "${it.t}" ink=${m.ink} bg=${m.bg}`);
      if (/generate scene|start drill/i.test(it.t)) named[sc.id + ' | ' + it.t] = m;
    } else {
      if (!it.dis && (it.w < 44 || it.h < 44)) BAD.v5.push(`${sc.id} ${it.w}x${it.h} <${it.tag}> "${it.t}"`);
      if (it.deck && (it.w < 48 || it.h < 48)) BAD.v5b.push(`${sc.id} ${it.w}x${it.h} "${it.t}"`);
      if (/generate scene|start drill/i.test(it.t) && m.pixel != null) named[sc.id + ' | CTL ' + it.t] = m;
    }
  }
  console.log(`  swept ${sc.id.padEnd(16)} ${items.length} nodes, ${[...results.values()].filter(r => r.pixel != null).length} measured`);
}
const show = (n, a) => { console.log(`\n== ${n}: ${a.length} ==`); [...new Set(a)].slice(0, 30).forEach(x => console.log('   ' + x)); };
show('V-1 text under 12px', BAD.v1);
show('V-2 non-numeric under 4.5:1 (painted pixels)', BAD.v2);
show('V-3 numerals under 7:1 (painted pixels)', BAD.v3);
show('V-5 enabled controls under 44px', BAD.v5);
show('V-5b turn-deck controls under 48px', BAD.v5b);
show('NOT MEASURABLE (what rig.mjs:547 would silently drop)', BAD.skipped);
console.log('\n== 9.16(b) named buttons ==');
for (const [k, v] of Object.entries(named)) console.log(`   ${k}: pixel=${v.pixel}:1 ink=${JSON.stringify(v.ink)} bg=${JSON.stringify(v.bg)}`);
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await browser.close(); await srv.close();
