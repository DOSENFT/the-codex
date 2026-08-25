// INDEPENDENT VERIFIER probe 1 — error floor + F-family + raw V measurements.
import { chromium, serveDist, DIST, PHONE, TABLET, goScreen, settle, SCREENS, importFile } from './rig.mjs';

const PORT = 5411;
const REAL = {
  full: 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json',
  thin: 'C:/Users/marcu/Downloads/codex-nix-lvl7.json',
};

// ---- my own error floor. Nothing filtered. Ever. ----
function armor(page, tag) {
  page.__e = [];
  page.on('pageerror', e => page.__e.push(`[${tag}] PAGEERROR: ` + String(e).split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') page.__e.push(`[${tag}] CONSOLE.ERROR: ` + m.text().slice(0, 300)); });
  page.on('requestfailed', r => page.__e.push(`[${tag}] REQFAIL: ${r.url().slice(0,120)} ${r.failure()?.errorText}`));
  page.addInitScript(() => {
    window.__rej = [];
    window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 300)));
    // also trap console.error before React can be polite about it
    const ce = console.error.bind(console);
    window.__ce = [];
    console.error = (...a) => { try { window.__ce.push(a.map(String).join(' ').slice(0,400)); } catch {} ce(...a); };
  });
  return page;
}
async function drainAll(page, tag) {
  const r = await page.evaluate(() => {
    const o = { rej: window.__rej || [], ce: window.__ce || [] };
    window.__rej = []; window.__ce = [];
    return o;
  }).catch(() => ({ rej: [], ce: [] }));
  page.__e.push(...r.rej.map(x => `[${tag}] REJECTION: ` + x));
  page.__e.push(...r.ce.map(x => `[${tag}] console.error(): ` + x));
  return page.__e;
}

const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;

// RAW audit: no hit-area inflation, no onImage skipping. Report everything.
const RAW = () => {
  const px = v => parseFloat(v) || 0;
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0,3), a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const visible = el => { const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || px(s.opacity) < 0.05) return false;
    if (r.width < 1 || r.height < 1) return false;
    if (r.bottom < -50 || r.top > (document.documentElement.scrollHeight + 50)) return false; return true; };
  const bgOf = el => { let node = el, acc = null, img = false, imgSrc = '';
    while (node && node !== document.documentElement.parentNode) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none') { if (!img) imgSrc = node.tagName.toLowerCase()+':'+s.backgroundImage.slice(0,60); img = true; }
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { acc = acc === null ? { rgb: c.rgb, a: c.a } : { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) };
        if (acc.a >= 0.995) return { rgb: acc.rgb.map(Math.round), img, imgSrc }; }
      node = node.parentElement; }
    const root = parse(getComputedStyle(document.body).backgroundColor);
    const base = root && root.a > 0 ? root.rgb : [0,0,0];
    return { rgb: acc ? over(acc.rgb, base, acc.a).map(Math.round) : base, img, imgSrc }; };

  const text = [], touch = [];
  const NUMERIC = /^[\s0-9./+\-x×]*[0-9][\s0-9./+\-x×]*$/;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || !visible(el)) continue;
    if (/^(script|style|noscript)$/i.test(el.tagName)) continue;
    const s = getComputedStyle(el), size = px(s.fontSize), fg = parse(s.color), bg = bgOf(el);
    const alpha = fg ? fg.a * px(s.opacity || 1) : 1;
    const eff = fg ? over(fg.rgb, bg.rgb, alpha).map(Math.round) : null;
    text.push({ t: t.slice(0,44), size: Math.round(size*10)/10,
      family: (s.fontFamily||'').split(',')[0].replace(/["']/g,''),
      contrast: eff ? Math.round(ratio(eff, bg.rgb)*100)/100 : null,
      onImage: bg.img, imgSrc: bg.imgSrc, numeric: NUMERIC.test(t) });
  }
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"]),[onclick]';
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue; if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    const p = el.parentElement ? el.parentElement.getBoundingClientRect() : r;
    // report BOTH: raw box, and the builder's inflated "hit area"
    const inflW = Math.max(r.width, Math.min(p.width, r.width + 12));
    const inflH = Math.max(r.height, Math.min(p.height, r.height + 12));
    const cs = getComputedStyle(el);
    touch.push({ label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g,' ').slice(0,44),
      w: Math.round(r.width), h: Math.round(r.height),
      inflW: Math.round(inflW), inflH: Math.round(inflH),
      pad: `${cs.paddingTop}/${cs.paddingBottom}`,
      y: Math.round(r.top + r.height/2) });
  }
  return { text, touch, vh: innerHeight, vw: innerWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight };
};

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const out = { errors: [], notes: [] };

async function fresh(viewport = PHONE, dpr = 3, tag = 'x') {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dpr });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); armor(page, tag);
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  return { ctx, page };
}

// ══ F-1 / F-6 / V raw, phone ══
{
  const { ctx, page } = await fresh(PHONE, 3, 'F1');
  await importFile(page, REAL.full);
  console.log('\n=== F-1: full real export, 7 screens, phone 390x844 ===');
  const agg = { total: 0, onImage: 0, under12: [], low45: [], lowNum7: [], cinzelSmall: [], imgSrcs: new Set() };
  const ctrl = { rawUnder44: new Map(), inflUnder44: new Map(), total: 0 };
  for (const s of SCREENS) {
    await goScreen(page, s); await settle(page);
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim());
    const boundaried = BOUNDARY.test(body);
    const pages = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / innerHeight));
    let a;
    for (let i = 0; i < Math.min(pages, 6); i++) {
      await page.evaluate(n => scrollTo(0, n*innerHeight), i);
      await page.waitForTimeout(220);
      a = await page.evaluate(RAW);
      for (const t of a.text) {
        agg.total++;
        if (t.onImage) { agg.onImage++; if (t.imgSrc) agg.imgSrcs.add(t.imgSrc); }
        if (t.size < 12) agg.under12.push(`${s.id} «${t.t}» ${t.size}px onImage=${t.onImage}`);
        if (t.contrast !== null && t.contrast < 4.5) agg.low45.push(`${s.id} «${t.t}» ${t.size}px ${t.contrast}:1 onImage=${t.onImage}`);
        else if (t.numeric && t.contrast !== null && t.contrast < 7) agg.lowNum7.push(`${s.id} «${t.t}» ${t.contrast}:1 onImage=${t.onImage}`);
        if (/cinzel/i.test(t.family) && t.size < 20) agg.cinzelSmall.push(`${s.id} «${t.t}» ${t.size}px onImage=${t.onImage}`);
      }
      for (const c of a.touch) {
        ctrl.total++;
        if (c.w < 44 || c.h < 44) ctrl.rawUnder44.set(`${s.id} «${c.label}» raw ${c.w}x${c.h} → inflated ${c.inflW}x${c.inflH}`, 1);
        if (c.inflW < 44 || c.inflH < 44) ctrl.inflUnder44.set(`${s.id} «${c.label}» ${c.inflW}x${c.inflH}`, 1);
      }
    }
    await page.evaluate(() => scrollTo(0,0)); await page.waitForTimeout(150);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`  ${s.id.padEnd(16)} len=${String(body.length).padStart(5)} boundaried=${boundaried} hoverflow=${o}`);
    if (boundaried) out.errors.push(`BOUNDARY TEXT on ${s.id}: ${body.slice(0,200)}`);
  }
  await drainAll(page, 'F1');
  out.errors.push(...page.__e);
  console.log(`\n  text nodes seen: ${agg.total}   of which onImage(skipped by builder): ${agg.onImage} (${(100*agg.onImage/agg.total).toFixed(1)}%)`);
  console.log(`  background-image sources causing the skip:\n    ` + [...agg.imgSrcs].slice(0,10).join('\n    '));
  const uniq = a => [...new Set(a)];
  console.log(`\n  V-1 <12px           : ${uniq(agg.under12).length}`); uniq(agg.under12).slice(0,20).forEach(x=>console.log('     '+x));
  console.log(`  V-2 <4.5:1          : ${uniq(agg.low45).length}`); uniq(agg.low45).slice(0,25).forEach(x=>console.log('     '+x));
  console.log(`  V-3 numeric <7:1    : ${uniq(agg.lowNum7).length}`); uniq(agg.lowNum7).slice(0,25).forEach(x=>console.log('     '+x));
  console.log(`  V-4 Cinzel <20px    : ${uniq(agg.cinzelSmall).length}`); uniq(agg.cinzelSmall).slice(0,20).forEach(x=>console.log('     '+x));
  console.log(`\n  V-5 controls total ${ctrl.total}; RAW box <44: ${ctrl.rawUnder44.size}; after builder's +12 inflation: ${ctrl.inflUnder44.size}`);
  [...ctrl.rawUnder44.keys()].slice(0,30).forEach(x=>console.log('     '+x));
  await ctx.close();
}

console.log('\n\n########## ERRORS SEEN (probe 1) ##########');
if (!out.errors.length) console.log('  (none)');
out.errors.forEach(e => console.log('  ' + e));

await b.close(); await srv.close();
