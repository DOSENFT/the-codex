/* probe-v — the V-family failures, with enough DOM identity to find the source.
   The graded check (families.mjs familyV) reports the text and the number. That
   is right for a verdict and useless for a repair: «STR» 12px 2.62:1 appears in
   four components. This prints the tag, the full class list and the ancestor
   chain so the fix lands on the element that actually failed. */
import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE } from './rig.mjs';
import { realCopy, THRESH } from './families.mjs';

const DUMP = () => {
  const px = v => parseFloat(v) || 0;
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = s => {
    const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const visible = el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || px(s.opacity) < 0.05) return false;
    return r.width >= 1 && r.height >= 1;
  };
  const bgOf = el => {
    let node = el, acc = null, img = false;
    while (node && node !== document.documentElement.parentNode) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none') img = true;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        acc = acc === null ? { rgb: c.rgb, a: c.a } : { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) };
        if (acc.a >= 0.995) return { rgb: acc.rgb.map(Math.round), img };
      }
      node = node.parentElement;
    }
    const root = parse(getComputedStyle(document.body).backgroundColor);
    const base = root && root.a > 0 ? root.rgb : [0, 0, 0];
    return { rgb: acc ? over(acc.rgb, base, acc.a).map(Math.round) : base, img };
  };
  const chain = el => {
    const out = [];
    for (let n = el, i = 0; n && i < 4; n = n.parentElement, i++)
      out.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 4).join('.') : ''));
    return out.join(' < ');
  };

  const NUMERIC = /^[\s0-9./+\-x×]*[0-9][\s0-9./+\-x×]*$/;
  const text = [], touch = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || !visible(el)) continue;
    if (/^(script|style|noscript)$/i.test(el.tagName)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color), bg = bgOf(el);
    const alpha = fg ? fg.a * px(s.opacity || 1) : 1;
    const eff = fg ? over(fg.rgb, bg.rgb, alpha).map(Math.round) : null;
    text.push({
      t: t.slice(0, 30), size: Math.round(px(s.fontSize) * 10) / 10,
      family: (s.fontFamily || '').split(',')[0].replace(/["']/g, ''),
      color: s.color, opacity: s.opacity, bg: 'rgb(' + bg.rgb.join(',') + ')',
      contrast: eff ? Math.round(ratio(eff, bg.rgb) * 100) / 100 : null,
      onImage: bg.img, numeric: NUMERIC.test(t),
      cls: String(el.className || ''), chain: chain(el),
    });
  }
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"]),[onclick]';
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    const p = el.parentElement ? el.parentElement.getBoundingClientRect() : r;
    const hit = { w: Math.max(r.width, Math.min(p.width, r.width + 12)), h: Math.max(r.height, Math.min(p.height, r.height + 12)) };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let occludedBy = '';
    if (cx >= 0 && cy >= 0 && cx < window.innerWidth && cy < window.innerHeight) {
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== el && !el.contains(top))
        occludedBy = top.tagName.toLowerCase() + (top.className ? '.' + String(top.className).split(/\s+/).slice(0, 3).join('.') : '');
    }
    touch.push({
      occludedBy,
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height),
      hitW: Math.round(hit.w), hitH: Math.round(hit.h),
      y: Math.round(r.top + r.height / 2 + window.scrollY),
      cls: String(el.className || ''), chain: chain(el),
    });
  }
  return { text, touch, vh: window.innerHeight };
};

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));

const seen = new Set();
const say = k => { if (seen.has(k)) return false; seen.add(k); return true; };

for (const s of SCREENS) {
  if (only.length && !only.some(o => s.id.includes(o))) continue;
  await goScreen(page, s);
  const pages = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / window.innerHeight));
  for (let i = 0; i < Math.min(pages, 6); i++) {
    await page.evaluate(n => window.scrollTo(0, n * window.innerHeight), i);
    await page.waitForTimeout(200);
    const a = await page.evaluate(DUMP);
    for (const t of a.text) {
      if (t.onImage) continue;
      const bad = [];
      if (t.contrast !== null && t.contrast < THRESH.V2_contrast) bad.push(`V-2 ${t.contrast}:1`);
      else if (t.numeric && t.contrast !== null && t.contrast < THRESH.V3_contrast) bad.push(`V-3 ${t.contrast}:1`);
      if (/cinzel/i.test(t.family) && t.size < THRESH.V4_cinzel) bad.push(`V-4 ${t.size}px Cinzel`);
      if (!bad.length) continue;
      const k = `${s.id}|${t.cls}|${bad[0].split(' ')[0]}|${t.size}`;
      if (!say(k)) continue;
      console.log(`${bad.join(' ')}  ${s.id}  «${t.t}»  ${t.size}px  ${t.color} @${t.opacity} on ${t.bg}`);
      console.log(`      class: ${t.cls}`);
      console.log(`      chain: ${t.chain}\n`);
    }
    for (const c of a.touch) {
      const small = c.hitW < THRESH.V5_touch || c.hitH < THRESH.V5_touch;
      if (!small && !c.occludedBy) continue;
      const k = `${s.id}|${c.cls}|touch`;
      if (!say(k)) continue;
      if (c.occludedBy) console.log(`V-6b OCCLUDED by ${c.occludedBy}  ${s.id}  «${c.label}»`);
      if (!small) { console.log(`      class: ${c.cls}`); console.log(`      chain: ${c.chain}\n`); continue; }
      console.log(`V-5 ${c.hitW}×${c.hitH}  ${s.id}  «${c.label}»`);
      console.log(`      class: ${c.cls}`);
      console.log(`      chain: ${c.chain}\n`);
    }
  }
  if (s.id === 'play/Combat') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const a = await page.evaluate(DUMP);
    for (const c of a.touch) {
      if (!/heal|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i.test(c.label)) continue;
      const flags = [];
      if (c.hitW < THRESH.V5_turn || c.hitH < THRESH.V5_turn) flags.push(`V-5b ${c.hitW}×${c.hitH}`);
      // A-7: bottom 60% == y in [vh*0.40, vh]. Measured at scrollTop 0.
      if (c.y < a.vh * (1 - THRESH.V6_thumb)) flags.push(`V-6 y=${c.y}/${a.vh} above-zone`);
      else if (c.y > a.vh) flags.push(`V-6 y=${c.y}/${a.vh} off-screen`);
      if (!flags.length) continue;
      console.log(`${flags.join(' ')}  «${c.label}»`);
      console.log(`      class: ${c.cls}`);
      console.log(`      chain: ${c.chain}\n`);
    }
  }
}
await ctx.close(); await b.close();
