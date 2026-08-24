/* CONTROL for A-22 — the two study surfaces, measured at arm's length.
   ---------------------------------------------------------------------------
   Scope: prep/Character and prep/Academy ONLY. The other five screens belong to
   a different pass and are deliberately not measured here, so that a failure
   printed by this file is always a failure someone in this pass can fix.

   Four floors, all of them the house's own, none of them invented here:

     V-2  every visible text node            >= 4.5:1   (WCAG AA)
     V-3  every NUMERAL                      >= 7.0:1   (a numeral has no
          (a counter, a modifier, a tally)              word-shape redundancy —
                                                        you cannot infer a 3)
     V-4  nothing set in Cinzel below        20px       (--d-fs-title; a display
                                                        face below that is
                                                        decoration, not text)
     V-5  every control's own border box     >= 44px    on BOTH axes
          and the 48px goal is printed as a separate band, not enforced, because
          tokens.css settles that argument: 44 is the floor the audit enforces,
          48 is what a control pressed mid-turn reaches for. Neither of these two
          surfaces is pressed mid-turn.

   WHY THE CONTRAST NUMBER IS MEASURED TWICE. Climbing the ancestor chain adding
   background COLOURS is exact right up until something paints a background
   IMAGE — and .glass-card, .parchment-card, .stat-frame and .atmospheric-bg-*
   all do, with washes at 3-6% alpha that read as flat panels. So every node is
   measured both ways:
     computed  the alpha-composited colour stack (rig.mjs bgOf)
     pixel     the modal colour of the node's painted box, read off a real
               screenshot at DPR 3 — what his eye actually receives
   `pixel` wins where it exists, because it is the one that cannot be argued
   with. Nodes never brought into the viewport by the scroll pass, or sitting
   under the fixed header or tab bar where the screenshot would read the chrome
   instead of the page, fall back to `computed` and are marked so.

   The surfaces are opened the way he opens them: every collapsible section on
   Character expanded, all three segments of Academy visited. A floor that is
   only checked on the part of the screen that happens to be open is not a floor.

   Usage:  node docs/plans/codex-v1/reference/table/control-a22.mjs
           --json <path>   also write the raw findings
           --port <n>      (default 4322)
   Exit code is 0 on PASS and 1 on FAIL. It has been watched failing. */

import { writeFileSync } from 'node:fs';
import { chromium, serveDist, DIST, PHONE, watch, importFile, goScreen, SCREENS, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const FLOOR = { text: 4.5, numeral: 7.0, cinzel: 20, touch: 44, touchGoal: 48 };

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const PORT = Number(arg('--port', 4322));
const JSON_OUT = arg('--json', '');

/* ── in-page: index every text node and every control, once ──────────────────
   Elements are stamped with data-a22 so the scroll pass can find the same node
   again after the page has moved under it. */
const INDEX = () => {
  const px = v => parseFloat(v) || 0;
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  /* Tailwind 4 emits oklch(), and getComputedStyle hands it straight back —
     `rgba?\(` misses it and the node comes back with no ink at all, which is
     how a contrast checker reports 31 nodes as "unmeasurable" while they are
     sitting there perfectly measurable on the screen. So: regex for the common
     case, and a 1x1 canvas for everything else, which is the browser's own
     colour parser and cannot disagree with what it painted. */
  const cc = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  cc.canvas.width = cc.canvas.height = 1;
  const parse = s => {
    const str = String(s);
    if (!str || str === 'none' || str === 'transparent') return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
    }
    cc.clearRect(0, 0, 1, 1);
    cc.fillStyle = '#000';
    cc.fillStyle = str;
    if (cc.fillStyle === '#000' && !/^(#000|black|rgb\(0, 0, 0\))/.test(str)) return null;
    cc.fillRect(0, 0, 1, 1);
    const d = cc.getImageData(0, 0, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
  };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

  const visible = el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || px(s.opacity) < 0.05) return false;
    if (r.width < 1 || r.height < 1) return false;
    return true;
  };
  /* effective opacity: an ancestor at 0.4 dims its children even though their
     own computed opacity reads 1. */
  const chainOpacity = el => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= px(getComputedStyle(n).opacity || 1);
    return o;
  };
  const bgOf = el => {
    let node = el, acc = null, img = false;
    while (node && node !== document.documentElement.parentNode) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none') img = true;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        acc = acc === null ? { rgb: c.rgb, a: c.a }
          : { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) };
        if (acc.a >= 0.995) return { rgb: acc.rgb.map(Math.round), img };
      }
      node = node.parentElement;
    }
    const root = parse(getComputedStyle(document.body).backgroundColor);
    const base = root && root.a > 0 ? root.rgb : [0, 0, 0];
    return { rgb: acc ? over(acc.rgb, base, acc.a).map(Math.round) : base, img };
  };

  /* A stranger has to be able to find this node. Tag + the classes that are
     actually distinctive + the ancestor trail, plus the text itself. */
  const nameOf = el => {
    const bit = n => {
      const cls = String(n.className || '').split(/\s+/)
        .filter(c => c && !/^(flex|grid|block|inline.*|relative|absolute|w-full|items-|justify-|gap-|mt-|mb-|ml-|mr-|px-|py-|p-\d)/.test(c))
        .slice(0, 3).join('.');
      return n.tagName.toLowerCase() + (cls ? '.' + cls : '');
    };
    const trail = [];
    for (let n = el, i = 0; n && n !== document.body && i < 3; n = n.parentElement, i++) trail.unshift(bit(n));
    return trail.join(' > ');
  };

  let seq = 0;
  const text = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || /^(script|style|noscript|option)$/i.test(el.tagName)) continue;
    if (!visible(el)) continue;
    /* A closed bottom sheet is still in the DOM, still `display:block`, still
       reporting a rect — it is parked off the bottom of the viewport with the
       app's own `inert` on it. Measuring it reports the dice roller's buttons
       as 1.04:1 against the panel they are hidden behind, which is true and
       means nothing. `inert` is the app SAYING this is not on screen, so it is
       the honest thing to trust rather than a guess about geometry. */
    if (el.closest('[aria-hidden="true"],[inert]')) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    const bg = bgOf(el);
    const alpha = (fg ? fg.a : 1) * chainOpacity(el);
    const ink = fg ? over(fg.rgb, bg.rgb, alpha).map(Math.round) : null;
    const id = 'a22-' + (seq++);
    el.setAttribute('data-a22', el.getAttribute('data-a22') ? el.getAttribute('data-a22') + ' ' + id : id);
    text.push({
      id, t: t.slice(0, 52),
      size: Math.round(px(s.fontSize) * 10) / 10,
      weight: s.fontWeight,
      family: (s.fontFamily || '').split(',')[0].replace(/["']/g, ''),
      computed: ink ? Math.round(ratio(ink, bg.rgb) * 100) / 100 : null,
      onImage: bg.img,
      /* A NUMERAL: a run that is nothing but digits and the punctuation a
         number wears — sign, slash, decimal, dice x. "+3", "18", "67/67",
         "2/4". Not "AC 18", which has a word to lean on. */
      numeral: /^[\s0-9./+−\-x×%]*[0-9][\s0-9./+−\-x×%]*$/.test(t),
      ink, where: nameOf(el),
    });
  }

  const SEL = 'button,a[href],[role="button"],[role="tab"],input:not([type="hidden"]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const touch = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"],[inert]')) continue;
    if (el.disabled) continue;
    const r = el.getBoundingClientRect();
    touch.push({
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 52) || el.tagName.toLowerCase(),
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      where: nameOf(el),
    });
  }
  /* `main` carries `overflow-y-auto` and looks like the scroller, but it sits
     in a flex column that is free to grow, so on a phone it is exactly as tall
     as its content and never scrolls: measured scrollHeight === clientHeight
     === 2500 on prep/Academy. The DOCUMENT scrolls. Driving `main` instead
     leaves scrollTop pinned at 0 for every stop, so every node below the fold
     is never photographed and silently falls back to the computed number —
     that is how a gradient-filled primary button reports 1.04:1 and is
     believed. Watched happening; the docH below is the document's. */
  return { text, touch, docH: document.documentElement.scrollHeight };
};

/* ── in-page: the painted background behind the nodes currently on screen ─── */
const PIXELS = shot => {
  const HEADER = 60, TABBAR = 70;
  return new Promise(async resolve => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + shot;
    await img.decode();
    const dpr = img.width / window.innerWidth;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const out = [];
    for (const el of document.querySelectorAll('[data-a22]')) {
      const r = el.getBoundingClientRect();
      // must be wholly inside the page's own band — not under the fixed header
      // or the fixed tab bar, where the screenshot would report the chrome.
      if (r.top < HEADER || r.bottom > window.innerHeight - TABBAR) continue;
      if (r.left < 0 || r.right > window.innerWidth) continue;
      if (r.width < 2 || r.height < 2) continue;
      const x = Math.round(r.left * dpr), y = Math.round(r.top * dpr);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (x < 0 || y < 0 || x + w > cv.width || y + h > cv.height) continue;
      const d = cx.getImageData(x, y, w, h).data;
      const bins = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const b = bins.get(k);
        if (b) { b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
        else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
      let top = null;
      for (const b of bins.values()) if (!top || b.n > top.n) top = b;
      const bg = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
      for (const id of el.getAttribute('data-a22').split(/\s+/)) out.push({ id, bg });
    }
    resolve(out);
  });
};

const contrast = (a, b) => {
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

/* ── driving the two surfaces into the state he uses them in ─────────────── */

const openEveryCharacterSection = async page => {
  for (let pass = 0; pass < 4; pass++) {
    const clicked = await page.evaluate(() => {
      let n = 0;
      for (const b of document.querySelectorAll('section[aria-label="Character"] > div > button')) {
        if (!String(b.className).includes('min-h-[52px]')) continue;   // a Section header, not Export
        if (b.parentElement.children.length < 2) { b.click(); n++; }   // closed: header only
      }
      return n;
    });
    await page.waitForTimeout(350);
    if (!clicked) break;
  }
};

const academySegment = async (page, label) => {
  /* NOT /^Quizzes$/ — the segment carries a due-count badge inside the button,
     so its textContent is "Quizzes21" and an anchored match silently never
     clicks. The run then measures the Training segment three times and prints
     three identical passes. Watched happening. */
  const btn = page.locator('section[aria-label="Academy"] > div > button', { hasText: new RegExp('^' + label) }).first();
  if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(500); }
};

/** Walk the page top to bottom, reading the painted pixels at each stop. */
async function measure(page, id) {
  await settle(page);
  /* The app sets `scroll-behavior: smooth`. Left on, a scrollTop assignment
     returns the OLD offset, the loop reads `top === lastTop` at the second
     stop and breaks — so the whole walk is two screenshots of the top of the
     page. Measured: prep/Character graded 50 of 275 nodes off pixels that way
     and reported a gradient-filled button at 1.04:1 with a straight face.
     Turning the animation off is a property of the instrument, not of the
     design: it changes when a pixel is painted, never what colour. */
  await page.addStyleTag({ content: 'html,body,*{scroll-behavior:auto !important}' });
  const { text, touch, docH } = await page.evaluate(INDEX);
  const vh = await page.evaluate(() => window.innerHeight);
  const painted = new Map();
  const steps = Math.max(1, Math.ceil(docH / (vh * 0.5)) + 1);
  let lastTop = -1;
  for (let i = 0; i < steps; i++) {
    await page.evaluate(y => { document.documentElement.scrollTop = y; }, i * vh * 0.5);
    await page.waitForTimeout(140);
    const top = await page.evaluate(() => document.documentElement.scrollTop);
    if (top === lastTop && i > 0) break;   // hit the bottom; further stops repeat
    lastTop = top;
    await settle(page, 900);
    const shot = (await page.screenshot({ type: 'png' })).toString('base64');
    const rows = await page.evaluate(PIXELS, shot);
    for (const r of rows) if (!painted.has(r.id)) painted.set(r.id, r.bg);
  }
  await page.evaluate(() => { document.documentElement.scrollTop = 0; });

  for (const n of text) {
    const bg = painted.get(n.id);
    n.pixel = bg && n.ink ? contrast(n.ink, bg) : null;
    n.measured = n.pixel ?? n.computed;
    n.source = n.pixel !== null ? 'pixel' : 'computed';
  }
  /* Printed in the header so that "the click never landed and I measured the
     same segment three times" is visible in the log instead of inferred. */
  const fingerprint = await page.evaluate(() => {
    const s = document.querySelector('main section');
    return (s ? s.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 72);
  });
  return { id, text, touch, fingerprint };
}

/* ── report ──────────────────────────────────────────────────────────────── */

const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`,
      Y = s => `\x1b[33m${s}\x1b[0m`, B = s => `\x1b[1m${s}\x1b[0m`;

const srv = await serveDist(DIST, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

console.log(`\n${B('A-22  prep/Character and prep/Academy at 390x844 DPR3')}   ${DIST}`);
console.log(`      floors: text ${FLOOR.text}:1 · numeral ${FLOOR.numeral}:1 · Cinzel ${FLOOR.cinzel}px · control ${FLOOR.touch}px (goal ${FLOOR.touchGoal}px)\n`);

const results = [];

await goScreen(page, SCREENS.find(s => s.id === 'prep/Character'));
await openEveryCharacterSection(page);
results.push(await measure(page, 'prep/Character  (all sections open)'));

await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
for (const seg of ['Training', 'Quizzes', 'Accent']) {
  await academySegment(page, seg);
  results.push(await measure(page, `prep/Academy    (${seg})`));
}

let fails = 0, advisories = 0;
const dump = [];

for (const r of results) {
  console.log(B(`── ${r.id} ${'─'.repeat(Math.max(0, 52 - r.id.length))}`));
  console.log(`     showing: ${r.fingerprint}`);

  const lowText = r.text.filter(n => n.measured !== null && !n.numeral && n.measured < FLOOR.text)
    .sort((a, b) => a.measured - b.measured);
  const lowNum = r.text.filter(n => n.measured !== null && n.numeral && n.measured < FLOOR.numeral)
    .sort((a, b) => a.measured - b.measured);
  const cinzel = r.text.filter(n => /cinzel/i.test(n.family) && n.size < FLOOR.cinzel)
    .sort((a, b) => a.size - b.size);
  const unmeasured = r.text.filter(n => n.measured === null);

  const small = r.touch.filter(c => Math.min(c.w, c.h) < FLOOR.touchGoal)
    .sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h));
  const under = small.filter(c => Math.min(c.w, c.h) < FLOOR.touch);
  const band = small.filter(c => Math.min(c.w, c.h) >= FLOOR.touch);

  const line = (tag, s) => console.log(`     ${tag} ${s}`);

  console.log(`  V-2  text < ${FLOOR.text}:1  ${lowText.length ? R(lowText.length + ' found') : G('none')}   (${r.text.length} text nodes)`);
  for (const n of lowText) line(R(String(n.measured).padStart(5) + ':1'), `${String(n.size).padStart(4)}px  «${n.t}»  ${n.where}  [${n.source}]`);

  console.log(`  V-3  numeral < ${FLOOR.numeral}:1  ${lowNum.length ? R(lowNum.length + ' found') : G('none')}`);
  for (const n of lowNum) line(R(String(n.measured).padStart(5) + ':1'), `${String(n.size).padStart(4)}px  «${n.t}»  ${n.where}  [${n.source}]`);

  console.log(`  V-4  Cinzel < ${FLOOR.cinzel}px  ${cinzel.length ? R(cinzel.length + ' found') : G('none')}`);
  for (const n of cinzel) line(R(String(n.size).padStart(5) + 'px'), `«${n.t}»  ${n.where}`);

  console.log(`  V-5  control < ${FLOOR.touch}px  ${under.length ? R(under.length + ' found') : G('none')}   (${r.touch.length} controls)`);
  for (const c of under) line(R(`${c.w}x${c.h}`.padStart(10)), `«${c.label}»  ${c.where}`);
  if (band.length) {
    console.log(`       ${Y('band')} ${band.length} control(s) at ${FLOOR.touch}-${FLOOR.touchGoal - 1}px — the enforced floor, under the goal:`);
    for (const c of band.slice(0, 12)) line(Y(`${c.w}x${c.h}`.padStart(10)), `«${c.label}»`);
    if (band.length > 12) line('    ', `… and ${band.length - 12} more`);
  }
  /* Printed always, passing or failing. A run whose pixel coverage collapses
     is a run that quietly graded gradient-painted nodes off a transparent
     ancestor climb, and it will look calmer than it is. */
  const shot = r.text.filter(n => n.source === 'pixel').length;
  console.log(`       ${Y('read')} ${shot}/${r.text.length} nodes graded off painted pixels, ${r.text.length - shot} off the computed climb`);
  if (unmeasured.length) console.log(`       ${Y('note')} ${unmeasured.length} text node(s) had no measurable ink colour`);
  console.log('');

  fails += lowText.length + lowNum.length + cinzel.length + under.length;
  advisories += band.length;
  dump.push({
    surface: r.id, fingerprint: r.fingerprint, lowText, lowNum, cinzel, under, band,
    counts: { text: r.text.length, touch: r.touch.length },
    ...(argv.includes('--full') ? { allText: r.text, allTouch: r.touch } : {}),
  });
}

if (page.errs.length) {
  console.log(R(`  ${page.errs.length} console/page error(s) during the run:`));
  for (const e of page.errs.slice(0, 10)) console.log('     ' + e);
  fails += page.errs.length;
}

const ok = fails === 0;
console.log(`  ${ok ? G('A-22 PASSES') : R('A-22 FAILS')} — ${fails} finding(s) at the enforced floors, ${advisories} in the 44-47px advisory band\n`);
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify(dump, null, 2)); console.log(`  raw → ${JSON_OUT}\n`); }

await ctx.close(); await browser.close(); await srv.close();
process.exit(ok ? 0 : 1);
