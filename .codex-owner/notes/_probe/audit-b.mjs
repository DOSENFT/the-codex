import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const target = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';
const out = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/.codex-owner/notes/_probe/out-b';
mkdirSync(out, { recursive: true });

const COLLECT = () => {
  // ---------- colour maths ----------
  const parse = (s) => {
    if (!s) return null;
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

  // resolve the painted backdrop behind an element
  const backdrop = (el) => {
    let layers = [];
    let n = el;
    let gradientNote = null;
    while (n) {
      const cs = getComputedStyle(n);
      const bc = parse(cs.backgroundColor);
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none' && !gradientNote) gradientNote = n.tagName.toLowerCase() + ':' + bi.slice(0, 60);
      if (bc && bc.a > 0) {
        layers.push(bc);
        if (bc.a === 1) break;
      }
      n = n.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { color: base, gradientNote };
  };

  // ---------- text contrast ----------
  const combos = new Map();
  const all = document.querySelectorAll('*');
  const sizeBelow12 = [];
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'head') continue;
    // direct text nodes only
    let txt = '';
    for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
    // pseudo-element content also renders text
    const pseudos = [];
    for (const which of ['::before', '::after']) {
      const ps = getComputedStyle(el, which);
      const c = ps.content;
      if (c && c !== 'none' && c !== 'normal' && c !== '""') {
        pseudos.push({ which, content: c, color: ps.color, fontSize: ps.fontSize, fontWeight: ps.fontWeight, family: ps.fontFamily });
      }
    }
    const hasText = txt.trim().length > 0;
    if (!hasText && pseudos.length === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    const bd = backdrop(el);

    const record = (color, fontSize, fontWeight, sample, label, family) => {
      const fg0 = parse(color);
      if (!fg0) return;
      const fg = fg0.a < 1 ? over(fg0, bd.color) : fg0;
      const px = parseFloat(fontSize);
      const w = parseInt(fontWeight, 10) || 400;
      const large = px >= 24 || (px >= 18.66 && w >= 700);
      const need = large ? 3 : 4.5;
      const ra = ratio(fg, bd.color);
      const key = [hex(fg), hex(bd.color), px, w, label].join('|');
      const prev = combos.get(key);
      if (prev) { prev.count++; if (prev.samples.length < 2 && sample) prev.samples.push(sample); return; }
      combos.set(key, {
        fg: hex(fg), bg: hex(bd.color), px, weight: w, label,
        family: (family || cs.fontFamily).split(',')[0].replace(/"/g, ''),
        ratio: Math.round(ra * 100) / 100,
        large, need, pass: ra >= need,
        count: 1,
        selector: tag + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        samples: sample ? [sample] : [],
        gradientNote: bd.gradientNote,
      });
      if (px < 12) sizeBelow12.push({ px, tag, sel: tag + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''), text: (sample || '').slice(0, 160), label });
    };

    if (hasText) record(cs.color, cs.fontSize, cs.fontWeight, txt.trim().replace(/\s+/g, ' ').slice(0, 90), 'text', cs.fontFamily);
    for (const p of pseudos) record(p.color, p.fontSize, p.fontWeight, p.content, p.which, p.family);
  }

  // ---------- overflow ----------
  const de = document.documentElement;
  const vw = de.clientWidth;
  const pageScrolls = { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScrollWidth: document.body.scrollWidth, overflows: de.scrollWidth > de.clientWidth };
  const pastRight = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 0.5) {
      pastRight.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        right: Math.round(r.right * 10) / 10, overBy: Math.round((r.right - vw) * 10) / 10,
        width: Math.round(r.width), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      });
    }
  }

  const scrollers = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowX)) {
      scrollers.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        overflowX: cs.overflowX,
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        hidden: el.scrollWidth - el.clientWidth,
        pctHidden: el.scrollWidth ? Math.round((1 - el.clientWidth / el.scrollWidth) * 100) : 0,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      });
    }
  }

  // ---------- images ----------
  const imgs = Array.from(document.images).map(i => {
    const r = i.getBoundingClientRect();
    const cap = i.closest('figure')?.querySelector('figcaption')?.textContent?.trim().replace(/\s+/g, ' ') || null;
    return {
      src: i.getAttribute('src'),
      hasAltAttr: i.hasAttribute('alt'),
      alt: i.getAttribute('alt'),
      altEmpty: i.hasAttribute('alt') && i.getAttribute('alt').trim() === '',
      altDupCaption: !!(cap && i.getAttribute('alt') && cap.toLowerCase().includes(i.getAttribute('alt').trim().toLowerCase())),
      loadingAttr: i.getAttribute('loading'),
      decodingAttr: i.getAttribute('decoding'),
      widthAttr: i.getAttribute('width'), heightAttr: i.getAttribute('height'),
      natural: [i.naturalWidth, i.naturalHeight],
      rendered: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
      scale: i.naturalWidth ? Math.round((r.width / i.naturalWidth) * 1000) / 1000 : null,
      ok: i.complete && i.naturalWidth > 0,
      caption: cap,
    };
  });

  // ---------- headings ----------
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
    level: +h.tagName[1],
    text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 70),
  }));

  // ---------- links ----------
  const links = Array.from(document.querySelectorAll('a')).map(a => {
    const r = a.getBoundingClientRect();
    const rects = a.getClientRects().length;
    const inProse = !!a.closest('p, li, td, figcaption, blockquote');
    const isBlockNav = !!a.closest('nav');
    return {
      text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
      href: (a.getAttribute('href') || '').slice(0, 60),
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      lineBoxes: rects,
      inProse, isBlockNav,
      container: a.parentElement ? a.parentElement.tagName.toLowerCase() : null,
      small: r.width < 44 || r.height < 44,
    };
  });

  // ---------- misc structural ----------
  const misc = {
    lang: document.documentElement.getAttribute('lang'),
    title: document.title,
    hasMain: !!document.querySelector('main'),
    landmarkCount: document.querySelectorAll('header,nav,main,footer,section,aside').length,
    metaDescription: document.querySelector('meta[name=description]')?.content || null,
    tables: Array.from(document.querySelectorAll('table')).map(t => ({
      rows: t.rows.length,
      hasThead: !!t.tHead,
      hasCaption: !!t.caption,
      thCount: t.querySelectorAll('th').length,
      thScope: Array.from(t.querySelectorAll('th')).map(th => th.getAttribute('scope')),
      firstRowIsTh: t.rows[0] ? Array.from(t.rows[0].cells).every(c => c.tagName === 'TH') : null,
    })),
    focusVisibleRule: null,
    skipLink: !!document.querySelector('a[href^="#"]:first-of-type'),
    externalLinksNoRel: Array.from(document.querySelectorAll('a[href^="http"]')).filter(a => !a.getAttribute('rel')).length,
    externalLinksTotal: document.querySelectorAll('a[href^="http"]').length,
    prefersReducedMotionRules: 0,
    fonts: Array.from(document.fonts).map(f => `${f.family} ${f.weight} ${f.status}`),
    docScrollHeight: document.documentElement.scrollHeight,
  };

  return {
    combos: Array.from(combos.values()).sort((a, b) => a.ratio - b.ratio),
    sizeBelow12, pageScrolls, pastRight, scrollers, imgs, headings, links, misc,
  };
};

const b = await chromium.launch();
const msgs = [], failed = [], pageErrors = [], results = {};

for (const [w, h, name] of [[1280, 800, 'vp1280x800'], [390, 844, 'vp390x844']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', m => msgs.push(`${name} ${m.type()}: ${m.text()}`));
  p.on('pageerror', e => pageErrors.push(`${name}: ${e.message}`));
  p.on('requestfailed', r => failed.push(`${name}: ${r.url()} ${r.failure()?.errorText}`));
  await p.goto(pathToFileURL(target).href, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  results[name] = await p.evaluate(COLLECT);

  // print emulation
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(300);
  results[name + '_print'] = await p.evaluate(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const vanished = [], overflowing = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const sel = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') vanished.push({ sel, display: cs.display, visibility: cs.visibility });
      if (r.right > vw + 0.5 && r.width > 0) overflowing.push({ sel, right: Math.round(r.right), overBy: Math.round(r.right - vw) });
    }
    // contrast spot check in print
    const bodyCs = getComputedStyle(document.body);
    const samples = [];
    for (const s of ['body', 'h1', 'h2', '.eyebrow', 'figcaption', '.meta', 'a', 'code', '.sums', '.tally .k', '.tally .v', 'th', 'footer', '.empty', 'ol.q span', '.tag']) {
      const el = document.querySelector(s);
      if (!el) continue;
      const cs = getComputedStyle(el);
      samples.push({ sel: s, color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize });
    }
    return {
      bodyBg: bodyCs.backgroundColor, bodyBgImage: bodyCs.backgroundImage.slice(0, 70), bodyColor: bodyCs.color,
      docScrollWidth: de.scrollWidth, docClientWidth: de.clientWidth, docScrollHeight: de.scrollHeight,
      vanished, overflowing: overflowing.slice(0, 40), samples,
    };
  });
  await p.screenshot({ path: `${out}/${name}-print.png`, fullPage: true });
  await p.emulateMedia({ media: 'screen' });
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await ctx.close();
}

await b.close();
results._console = { msgs, pageErrors, failed };
console.log(JSON.stringify(results, null, 1));
