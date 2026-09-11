/* IV2 — (a) the exact numerals V-3 names, measured on BOTH instruments;
          (b) F-2, the thin export, across all seven screens.
   For (a) I scroll each node into view first, so rig.mjs:547's `continue`
   cannot excuse a miss, and I report the CSS colour beside the painted one. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const THIN = 'C:/Users/marcu/Downloads/codex-nix-lvl7.json';
const srv = await serveDist(DIST, 5923);
const browser = await chromium.launch();

async function open(file) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); page.errs = [];
  page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 110)));
  page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text().split('\n')[0].slice(0, 110)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, file);
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const TAG = (needles) => {
  const out = []; let i = 0; window.__iv2 = [];
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > .05; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    if (!needles.some(x => t === x)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(p);
    const key = i++; window.__iv2.push(n);
    // nearest visible label above, so we know WHICH number this is
    let ctxLabel = (p.closest('div,section,li')?.innerText || '').replace(/\s+/g, ' ').slice(0, 46);
    out.push({ key, t, size: parseFloat(cs.fontSize), css: cs.color, font: cs.fontFamily.split(',')[0], ctxLabel });
  }
  return out;
};

console.log('===== (a) the numerals V-3 names, on the CURRENT dist =====\n');
{
  const { ctx, page } = await open(FULL);
  const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
  for (const sc of SCREENS.slice(0, 1).concat(SCREENS.filter(s => s.id === 'prep/Character'))) {
    await goScreen(page, sc); await settle(page);
    const tagged = await page.evaluate(TAG, ['35', '35/35', '30', '67', '67/67', '18', '3', '2', '21', '4']);
    for (const it of tagged) {
      const ok = await page.evaluate(k => { const n = window.__iv2[k]; if (!n || !n.parentElement) return false; const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight - 8) n.parentElement.scrollIntoView({ block: 'center' }); return true; }, it.key);
      if (!ok) { console.log(`  ${sc.id} "${it.t}" — node gone`); continue; }
      await page.waitForTimeout(80);
      const shot = (await page.screenshot({ type: 'png' })).toString('base64');
      const m = await page.evaluate(async ({ shot, key }) => {
        const n2 = window.__iv2[key]; if (!n2 || !n2.parentElement) return null;
        const rg2 = document.createRange(); rg2.selectNodeContents(n2);
        const r = rg2.getBoundingClientRect();
        const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
        const d3 = img.width / innerWidth;
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
        const x = Math.max(0, Math.round(r.x * d3)), y = Math.max(0, Math.round(r.y * d3));
        const w = Math.min(cv.width - x, Math.round(r.width * d3)), h = Math.min(cv.height - y, Math.round(r.height * d3));
        if (w < 2 || h < 2) return { off: true };
        const d = cx.getImageData(x, y, w, h).data;
        const bins = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const k2 = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
          const b = bins.get(k2); if (b) { b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; } else bins.set(k2, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
        }
        let top = null; for (const b of bins.values()) if (!top || b.n > top.n) top = b;
        return { bg: [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)], rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
      }, { shot, key: it.key });
      if (!m || m.off) { console.log(`  ${sc.id} "${it.t}" — could not be brought fully on screen`); continue; }
      const ink = (it.css.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const l1 = lum(ink), l2 = lum(m.bg);
      const ratio = Math.round(((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)) * 100) / 100;
      const flag = ratio < 7 ? '   <<< BELOW V-3\'s 7:1' : '';
      console.log(`  ${sc.id.padEnd(15)} "${it.t}" ${it.size}px ${it.font.replace(/"/g, '')}  css ink ${JSON.stringify(ink)} / PAINTED bg ${JSON.stringify(m.bg)} = ${ratio}:1${flag}`);
      console.log(`        context: ${JSON.stringify(it.ctxLabel)}`);
    }
  }
  console.log('\n  ERROR FLOOR:', page.errs.length ? [...new Set(page.errs)] : 'clean');
  await ctx.close();
}

console.log('\n===== (b) F-2 — the thin export, the shape that shipped broken three times =====\n');
{
  const { ctx, page } = await open(THIN);
  for (const sc of SCREENS) {
    await goScreen(page, sc); await settle(page);
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const ctlCount = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"]')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
    console.log(`  ${sc.id.padEnd(16)} chars=${String(t.length).padStart(5)} ctls=${String(ctlCount).padStart(3)} boundary=${BOUNDARY_RE.test(t)} hasNix=${/Nix/.test(t)} errs=${page.errs.length}`);
    console.log(`        ${JSON.stringify(t.slice(0, 150))}`);
  }
  console.log('\n  ERROR FLOOR:', page.errs.length ? [...new Set(page.errs)] : 'clean');
  await ctx.close();
}
await browser.close(); await srv.close();
