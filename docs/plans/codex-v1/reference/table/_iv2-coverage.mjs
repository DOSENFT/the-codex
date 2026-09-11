/* IV2 — two questions.
   (1) COVERAGE. rig.mjs:547 drops any node not wholly inside the viewport, and
       the harness never scrolls to bring one in. So how much of each screen has
       V-2b / V-3b ever actually looked at?  Count it.
   (2) CROSS-CHECK. My pixel sweep found text under 4.5:1. My ink came from the
       screenshot; rig's comes from the computed style. If the two agree the
       finding stands on both instruments. Composite the CSS colour down the
       ancestor chain the way AUDIT_DOM does and compare.                     */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5922);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('E ' + String(e).slice(0, 100)));
page.on('console', m => { if (m.type() === 'error') errs.push('C ' + m.text().slice(0, 100)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const PROBE = (wanted) => {
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05; };
  const px = v => { const m = String(v).match(/[\d.]+/g) || []; return m.map(Number); };
  const comp = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map(i => Math.round(fg[i] * a + bg[i] * (1 - a))); };
  const bgOf = el => { // climb for the first opaque-ish background colour
    for (let n = el; n; n = n.parentElement) {
      const c = px(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return [c[0], c[1], c[2]];
    }
    return [0, 0, 0];
  };
  const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };

  let total = 0, insideViewport = 0;
  const hits = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    if (/^(script|style|title)$/i.test(p.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    total++;
    // rig.mjs:547's exact gate, at dpr 3
    const d = 3, x = Math.round(r.x * d), y = Math.round(r.y * d), ww = Math.round(r.width * d), hh = Math.round(r.height * d);
    const kept = !(x < 0 || y < 0 || ww < 2 || hh < 2 || x + ww > innerWidth * d || y + hh > innerHeight * d);
    if (kept) insideViewport++;
    if (wanted.some(s => t.trim().startsWith(s))) {
      const cs = getComputedStyle(p);
      const fg = px(cs.color); const bg = bgOf(p);
      const ink = comp(fg, bg);
      hits.push({ t: t.slice(0, 26), size: parseFloat(cs.fontSize), cssColor: cs.color,
        inkComputed: ink, bgClimb: bg, computedRatio: Math.round(ratio(ink, bg) * 100) / 100, kept });
    }
  }
  return { total, insideViewport, hits };
};

const WANT = ['Combat Advisor', 'Charmed', 'Blinded', 'Conc', '60 feet', 'Slots:', 'Readiness', 'checks passed'];
let T = 0, I = 0;
console.log('COVERAGE — text runs rig.mjs:547 can read at the default scroll position\n');
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const r = await page.evaluate(PROBE, WANT);
  T += r.total; I += r.insideViewport;
  console.log(`  ${sc.id.padEnd(16)} ${String(r.insideViewport).padStart(4)} / ${String(r.total).padStart(4)} text runs inside the viewport = ${(100 * r.insideViewport / r.total).toFixed(1)}%`);
  for (const h of r.hits) console.log(`      cross-check "${h.t}" ${h.size}px css=${h.cssColor} ink=${JSON.stringify(h.inkComputed)} bgClimb=${JSON.stringify(h.bgClimb)} computedRatio=${h.computedRatio}:1  rigWouldRead=${h.kept}`);
}
console.log(`\n  TOTAL ${I}/${T} = ${(100 * I / T).toFixed(1)}% of the app's text has painted pixels read; ${(100 - 100 * I / T).toFixed(1)}% is dropped by the \`continue\` at rig.mjs:547.`);
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await browser.close(); await srv.close();
