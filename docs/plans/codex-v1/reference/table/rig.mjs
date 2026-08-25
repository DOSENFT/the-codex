// The rig. Everything in TABLE-READY.md is measured through this file.
//
// It exists because the app was never the weak part — the instrument was. Three
// times an import bug shipped with every check green, because the checks asked
// "is the screen blank?" and a React error boundary answers "no". So the error
// floor lives HERE, in one place, applied to every family, and is itself graded
// by P-0 before any other criterion is allowed to count.
//
// Five detectors, all load-bearing (P-0.6 proves each one by deletion):
//   1. pageerror        — an uncaught throw
//   2. console.error    — where a CAUGHT React error goes, and nowhere else
//   3. unhandledrejection — an async death that never reaches either
//   4. blank body       — the old, weakest question
//   5. boundary text    — "Combat stopped. The rest of the app is still running"
//   6. hollow screen    — renders, throws nothing, and is empty of its own reason
//                         to exist. A combat screen with no actions on it.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
export const chromium = pw.chromium ?? pw.default?.chromium;

export const LOCAL = 'http://localhost:4173/the-codex/';
export const LIVE = 'https://dosenft.github.io/the-codex/';

export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 834, height: 1112 };

/* ── the seven screens, and the artefact each one exists to show ─────────────
   "not blank" is not a standard. A screen passes only if its OWN content is on
   it. These markers were read off the real app running Nix's real sheet, not
   invented — see probe-screens.mjs. */
export const SCREENS = [
  { mode: 'session', tab: 'Combat',    id: 'play/Combat' },
  { mode: 'session', tab: 'Grimoire',  id: 'play/Grimoire' },
  { mode: 'session', tab: 'Roleplay',  id: 'play/Roleplay' },
  { mode: 'prep',    tab: 'Character', id: 'prep/Character' },
  { mode: 'prep',    tab: 'Grimoire',  id: 'prep/Grimoire' },
  { mode: 'prep',    tab: 'Persona',   id: 'prep/Persona' },
  { mode: 'prep',    tab: 'Academy',   id: 'prep/Academy' },
];

/* ── the error floor ─────────────────────────────────────────────────────── */

export const BOUNDARY_RE = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;

/** Attach the listener-based detectors. Never remove one to get to green. */
export function watch(page, { detectors = ALL_DETECTORS } = {}) {
  page.errs = [];
  const on = d => detectors.includes(d);
  if (on('pageerror')) page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 200)));
  if (on('console')) {
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // A failed fetch to a black-holed AI endpoint is the CONDITION of N-2,
      // not a defect — the criterion is that it does not block. Nothing else
      // is filtered, ever.
      if (/net::ERR_|Failed to load resource/.test(t) && /11434|ollama|generativelanguage/i.test(t)) return;
      page.errs.push('console: ' + t.slice(0, 200));
    });
  }
  if (on('rejection')) {
    page.addInitScript(() => {
      window.addEventListener('unhandledrejection', e => {
        (window.__rejections ||= []).push(String(e.reason).slice(0, 200));
      });
    });
  }
  return page;
}
/* The three that need a listener attached before the page loads, and the three
   that are read off the rendered page. ALL_DETECTORS is every one of them —
   it was briefly the listeners only, which silently left blank/boundary/hollow
   switched off in every family. P-0 caught that; it is why the default is
   spelled out here rather than left implicit. */
export const LISTENERS = ['pageerror', 'console', 'rejection'];
export const READERS = ['blank', 'boundary', 'hollow'];
export const ALL_DETECTORS = [...LISTENERS, ...READERS];

/** Drain async rejections that no listener above can see. */
export async function drain(page) {
  const r = await page.evaluate(() => {
    const out = window.__rejections || [];
    window.__rejections = [];
    return out;
  }).catch(() => []);
  page.errs.push(...r.map(x => 'rejection: ' + x));
  return page.errs;
}

/** The state of one screen, judged by all six detectors. */
export async function judge(page, { needs = [], detectors = ALL_DETECTORS } = {}) {
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  await drain(page);
  const faults = [];
  if (detectors.includes('blank') && text.length < 40) faults.push('BLANK');
  if (detectors.includes('boundary') && BOUNDARY_RE.test(text)) faults.push('BOUNDARIED');
  if (detectors.includes('hollow')) {
    const missing = needs.filter(n => !(n instanceof RegExp ? n : new RegExp(n, 'i')).test(text));
    if (missing.length) faults.push('HOLLOW(' + missing.map(String).join(',') + ')');
  }
  if (page.errs.length) faults.push(...page.errs);
  return { text, faults };
}

/* ── navigation ──────────────────────────────────────────────────────────── */

export async function goScreen(page, screen) {
  const wantPrep = screen.mode === 'prep';
  const toPrep = page.getByRole('button', { name: /Switch to prep mode/i });
  const toPlay = page.getByRole('button', { name: /Switch to (play|session) mode/i });
  if (wantPrep && await toPrep.count()) await toPrep.click().catch(() => {});
  if (!wantPrep && await toPlay.count()) await toPlay.click().catch(() => {});
  await page.waitForTimeout(240);
  await page.getByRole('tab', { name: screen.tab, exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(340);
}

/* Scroll whatever actually scrolls, and prove it moved. — A-27
   ---------------------------------------------------------------------------
   Every scroll in this harness was `window.scrollTo(0, …)`. That is right only
   while the document is the scrolling box. When the app's layout became a
   bounded region — fixed header, fixed tab bar, fixed turn deck, and a `main`
   that owns the space between them — the document stopped scrolling:
   `document.scrollHeight === innerHeight === 844`, `window.scrollY` stays 0 no
   matter what you ask for, and `main` holds 1554px of content in a 480px box.

   Nothing threw. Every "@bottom" measurement silently re-measured the top, the
   V family got quieter, and it got quieter in the direction that looks like
   progress. That is the most dangerous failure mode this document has, so this
   helper does two things the old line could not: it scrolls the element that
   really scrolls, and it reports whether the position actually changed so a
   refusal can be treated as an error instead of as an empty screen. */
export async function scrollPage(page, where = 'top') {
  return page.evaluate(w => {
    /* ON SCREEN, then largest. Picking the largest scroller outright chose a
       CLOSED Mechanics drawer — 3769px of scroll height parked off-viewport —
       over the 1554px `main` the user is actually looking at, so every screen
       reported the same panel's rows as its own bottom. A scroller nobody can
       see is not the page. */
    const onScreen = e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05
        && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < window.innerHeight;
    };
    const boxes = [...document.querySelectorAll('*')].filter(e =>
      e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && onScreen(e));
    const el = boxes.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
      || document.scrollingElement || document.documentElement;
    const before = el.scrollTop;
    el.scrollTop = w === 'top' ? 0 : el.scrollHeight;
    // the document may also scroll on some screens; asking both costs nothing
    window.scrollTo(0, w === 'top' ? 0 : document.documentElement.scrollHeight);
    return { before, after: el.scrollTop, room: el.scrollHeight - el.clientHeight, tag: el.tagName.toLowerCase() };
  }, where);
}

/** Scroll, and fail loudly if the bottom was asked for and the page refused. */
export async function scrollOrThrow(page, where, label = '') {
  const m = await scrollPage(page, where);
  if (where !== 'top' && m.room > 4 && m.after === 0 && m.before === 0)
    throw new Error(`scroll to bottom did not move ${label}: <${m.tag}> had ${m.room}px of room and stayed at 0`);
  return m;
}

/* Hit-testing a page that is still moving is not a measurement. During a route
   crossfade both screens are in the DOM stacked on each other, and during a
   spring the painted position is not the settled one — either will report a
   control as "covered" by something that will not be there in a quarter second.
   Waits for every running animation to finish, capped so a looping decorative
   animation cannot hang the run. */
export async function settle(page, cap = 2500) {
  await page.evaluate(async (ms) => {
    const done = Promise.all(
      document.getAnimations().map(a => a.finished.catch(() => {})),
    );
    await Promise.race([done, new Promise(r => setTimeout(r, ms))]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, cap);
}

/* ── a device that has never seen the app ────────────────────────────────── */

export async function freshCtx(browser, {
  base = LOCAL, viewport = PHONE, dpr = 3, sw = false, detectors = ALL_DETECTORS,
} = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr });
  if (!sw) await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  watch(page, { detectors });
  await page.goto(base, { waitUntil: 'networkidle' });
  return { ctx, page };
}

/** Put a character in through the front door — the import path, the only door
 *  onto a phone that has never seen this app. Never via localStorage: seeding
 *  storage walks straight past the code that has broken three times. */
export async function importFile(page, file, { anyway = true, via = /Import Character/i } = {}) {
  /* Amendment A-24 — `via` exists because the import control is not always
     called "Import Character". That is the EMPTY-STATE label; once a character
     is loaded the re-import control lives in Settings and is labelled just
     "Import". R-9's entire scenario is the SECOND import, and it was written
     `if (await again.count()) { … }` against the empty-state name — which after
     a load matches zero elements. So the second import never ran, the roster
     count never moved, and `n2 <= n1 + 1` passed on a scenario that had not
     happened. Callers that need the other door now pass it. */
  /* Amendment A-15 — this used to read
     //   const chooser = page.waitForEvent('filechooser');
     //   await page.getByRole('button', …).first().click();
     //   await (await chooser).setFiles(file);
     with no wait for the control and no retry. The button is in the DOM before
     React has attached its handler, so a click can land on a live, visible,
     enabled element and do nothing at all. F-3b opens seventeen contexts back
     to back; under that load the race lost, and the harness reported a 30s
     Playwright timeout — a harness flake wearing the costume of a product
     failure, which is this project's oldest problem in the other direction.
     Wait for the control, and allow exactly one retry. If neither click opens a
     chooser, that is a real failure and it is thrown, not swallowed. */
  const btn = page.getByRole('button', { name: via }).first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  let opened = false;
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    const chooser = page.waitForEvent('filechooser', { timeout: 12000 }).catch(() => null);
    await btn.click();
    const c = await chooser;
    if (c) { await c.setFiles(file); opened = true; }
  }
  if (!opened) throw new Error(`the import control ${via} never opened a file chooser after two clicks`);
  await page.waitForTimeout(900);
  if (anyway) {
    const gate = page.getByRole('button', { name: /^Import anyway$/ });
    if (await gate.count()) { await gate.click(); await page.waitForTimeout(800); }
  }
}

export const storedChars = page =>
  page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length);

export const storedChar = page =>
  page.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return k ? localStorage.getItem(k) : null;
  });

/* ── a basement with no wifi ─────────────────────────────────────────────────
   Playwright's `context.setOffline(true)` is a CDP flag, and it does NOT behave
   the way a dead network does: on a reload it leaves the controlling service
   worker out of the loop entirely (every subresource comes back
   `workerStart = 0`, `status = 0`) and the app appears to die offline when it
   does not. That artefact failed N-1 for a whole run before it was caught.

   So "offline" here means the origin is genuinely unreachable: the build is
   served from a server this file owns, and then that server is killed. Nothing
   in the browser has been told to pretend. */

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg',
};

export const DIST = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/dist';

/** Serve a dist/ under /the-codex/, exactly the way the real one is served. */
export function serveDist(dir, port) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/the-codex\/?/, '');
    let file = join(dir, p || 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(readFileSync(file));
  });
  return new Promise(r => srv.listen(port, () => r({
    url: `http://localhost:${port}/the-codex/`,
    close: () => new Promise(rr => srv.close(rr)),
  })));
}

let nextPort = 5400;
/** A page with the app installed, precached, and its origin then killed. The
 *  service worker is real, the cache is real, and the network is really gone. */
export async function deadOrigin(browser, {
  dir = DIST, viewport = PHONE, dpr = 3, detectors = ALL_DETECTORS, precacheMs = 4000, before,
} = {}) {
  const srv = await serveDist(dir, nextPort++);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  watch(page, { detectors });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  if (before) await before(page);
  await page.waitForTimeout(precacheMs);
  const cached = await page.evaluate(async () => {
    const k = (await caches.keys()).find(n => n.startsWith('codex-shell'));
    return k ? (await (await caches.open(k)).keys()).length : 0;
  });
  await srv.close();               // ← the wifi is now gone. Truly.
  await page.waitForTimeout(300);
  page.errs.length = 0;            // errors from before the kill are not the test
  return { ctx, page, base: srv.url, cached };
}

/* ── measurement: contrast, size, reach ──────────────────────────────────── */

/** Walk every VISIBLE text node and interactive element, in the page, and
 *  report the real computed numbers. Contrast is computed against the actually
 *  painted background — walking ancestors through transparency — not against
 *  what the stylesheet claims. Anything sitting on an image or gradient is
 *  returned as UNMEASURABLE rather than quietly passed. */
export const AUDIT_DOM = () => {
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
    if (r.width < 1 || r.height < 1) return false;
    /* A-27: the lower bound is "how far the content actually extends", and on
       a bounded layout that is NOT `document.scrollHeight` — the document is
       exactly one viewport tall and everything below the fold lives inside an
       inner scroller. Read off the document this line dropped every node past
       y≈894 as "not on the page at all". Take the furthest extent of the
       document and any real scroller. */
    const extent = Math.max(
      document.documentElement.scrollHeight,
      ...[...document.querySelectorAll('*')]
        .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
        .map(e => e.scrollHeight),
    );
    if (r.bottom < -50 || r.top > (extent + 50)) return false;
    return true;
  };
  // effective background behind an element: climb until something opaque paints
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

  const text = [], touch = [];
  const NUMERIC = /^[\s0-9./+\-x×]*[0-9][\s0-9./+\-x×]*$/;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || !visible(el)) continue;
    if (/^(script|style|noscript)$/i.test(el.tagName)) continue;
    const s = getComputedStyle(el);
    const size = px(s.fontSize);
    const fg = parse(s.color);
    const bg = bgOf(el);
    const alpha = fg ? fg.a * px(s.opacity || 1) : 1;
    const eff = fg ? over(fg.rgb, bg.rgb, alpha).map(Math.round) : null;
    const r = el.getBoundingClientRect();
    text.push({
      t: t.slice(0, 44), tag: el.tagName.toLowerCase(),
      cls: (el.className && String(el.className).slice(0, 40)) || '',
      size: Math.round(size * 10) / 10,
      weight: s.fontWeight,
      family: (s.fontFamily || '').split(',')[0].replace(/["']/g, ''),
      contrast: eff ? Math.round(ratio(eff, bg.rgb) * 100) / 100 : null,
      onImage: bg.img,
      numeric: NUMERIC.test(t),
      y: Math.round(r.top), h: Math.round(r.height),
      // Amendment A-14 — the ink colour (already alpha-composited) and the full
      // rect, so V-2b/V-3b can go back to the painted pixels for the nodes whose
      // background is a gradient and divide by what is actually behind the glyph
      // instead of dropping them.
      ink: eff, x: Math.round(r.left), w: Math.round(r.width),
    });
  }

  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"]),[onclick]';
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    // Amendment A-12 — this used to read
    //
    //   const p = el.parentElement.getBoundingClientRect();
    //   hit = { w: Math.max(r.width, Math.min(p.width, r.width + 12)), h: … }
    //
    // under the comment "a control may reach the floor via padding on a wrapper
    // it fills". It does not. Padding belongs to the wrapper; a thumb that lands
    // on it hits a div, and the button does not fire. That flat +12 was a credit
    // the instrument handed every control on the way to comparing it against the
    // 44px and 48px floors, and it is how six 170×40 buttons on play/Roleplay and
    // three 44-tall turn controls on play/Combat were reported as passing. An
    // independent verifier found it; I wrote it. It is the exact thing this
    // document forbids — a check softened until the thing under it passed.
    //
    // The tappable area is the control's own border box. Nothing else.
    const hit = { w: r.width, h: r.height };
    // CLIPPED — the third thing getBoundingClientRect() lies about. A collapsed
    // accordion is `grid-rows-[0fr]` over an `overflow-hidden` wrapper measuring
    // h=0; its children keep reporting their full unclipped boxes, so 60 of the
    // 102 controls on play/Roleplay have coordinates for a place they are not
    // being drawn. `visible()` cannot catch it — nothing on the element itself
    // is display:none, hidden, transparent or zero-sized; the erasure happens
    // two ancestors up. So: intersect the rect against every clipping ancestor,
    // and if the intersection is empty, the control is not painted right now.
    // This flag gates POSITION only (see families.mjs V-6 / V-6b). Size, type
    // and contrast are intrinsic — a 26px pip inside a closed disclosure is
    // still a 26px pip the moment you open it — and stay graded regardless.
    let clipped = '';
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue;
      const cr = n.getBoundingClientRect();
      if (Math.min(r.right, cr.right) - Math.max(r.left, cr.left) <= 0 ||
          Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top) <= 0) {
        clipped = n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 2).join('.') : '');
        break;
      }
    }
    // V-6b — geometry says reachable; the hit test says pressable. Every number
    // above comes from getBoundingClientRect, which knows nothing about what is
    // painted on top: a control under the fixed tab bar measures 48x48 and cannot
    // be pressed. Only asked where the centre is actually on screen, because
    // elementFromPoint outside the viewport is meaningless, not false.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let occludedBy = '', occludedEdge = '';
    if (cx >= 0 && cy >= 0 && cx < window.innerWidth && cy < window.innerHeight) {
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== el && !el.contains(top)) {
        // Two very different things make elementFromPoint miss: something is
        // PAINTED OVER the control, or the control is CLIPPED AWAY by an
        // overflow:hidden ancestor — a collapsed accordion, a card that scrolls
        // its own contents. Clipping is not occlusion and it is not a defect, so
        // only a fixed or sticky coverer counts. Those are the ones that follow
        // the viewport and cannot be scrolled off: the header and the tab bar.
        let anchored = null;
        for (let n = top; n && n !== document.documentElement; n = n.parentElement) {
          const pos = getComputedStyle(n).position;
          if (pos === 'fixed' || pos === 'sticky') { anchored = n; break; }
        }
        if (anchored) {
          const ar = anchored.getBoundingClientRect();
          // Name the lineage, not just the tag: the useful question is never
          // "what is on top" but "what does it belong to".
          const parts = [];
          for (let n = top, i = 0; n && i < 3; n = n.parentElement, i++)
            parts.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 2).join('.') : ''));
          occludedBy = parts.join(' < ');
          // Which edge it is pinned to decides which scroll extreme it traps you at.
          occludedEdge = ar.top + ar.height / 2 < window.innerHeight / 2 ? 'top' : 'bottom';
        }
      }
    }
    touch.push({
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 44),
      tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '',
      w: Math.round(r.width), h: Math.round(r.height),
      hitW: Math.round(hit.w), hitH: Math.round(hit.h),
      y: Math.round(r.top + r.height / 2),
      occludedBy, occludedEdge, clipped,
    });
  }
  return {
    text, touch,
    vh: window.innerHeight, vw: window.innerWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

export const audit = page => page.evaluate(AUDIT_DOM);

/* ── pixel contrast (amendment A-14) ──────────────────────────────────────────
   bgOf() climbs the tree adding background COLOURS. When it meets a
   background-IMAGE it cannot divide by anything, so it sets `img` and the node's
   contrast comes back null. That was a reasonable admission of ignorance and a
   catastrophic default: this app tints its cards with

     linear-gradient(rgba(240,230,211,0.035), rgba(0,0,0,0.02))

   — a 3.5%-alpha wash that reads as a flat panel — and the flag caught 3140 of
   4804 text nodes. Two thirds of the app's contrast was never graded, and the
   log line said so out loud while the criterion printed PASS.

   The screen knows the answer. Screenshot the viewport, and for each node read
   the pixels inside its box: the glyphs are a minority of a text line box, so
   the modal colour IS the background, whatever painted it. The ink is already
   known exactly — `eff`, the composited colour — so there is nothing to guess.
   Colours are binned at 5 bits per channel so antialiasing does not split the
   background across a thousand buckets, then averaged back to full precision
   inside the winning bin.

   This measures what his eye receives in a dim room, which is what V-2 and V-3
   were always about. Costs one screenshot per scroll position. */
export async function pixelContrast(page, nodes) {
  const want = nodes.filter(n => n.ink && n.w >= 2 && n.h >= 2);
  if (!want.length) return [];
  const shot = (await page.screenshot({ type: 'png' })).toString('base64');
  return page.evaluate(async ({ shot, want }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + shot;
    await img.decode();
    const dpr = img.width / window.innerWidth;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const lum = c => {
      const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    const ratio = (a, b) => {
      const l1 = lum(a), l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const out = [];
    for (const n of want) {
      const x = Math.round(n.x * dpr), y = Math.round(n.y * dpr);
      const w = Math.round(n.w * dpr), h = Math.round(n.h * dpr);
      // off-screen, or clipped by the viewport edge — no painted pixels to read
      if (x < 0 || y < 0 || w < 2 || h < 2 || x + w > cv.width || y + h > cv.height) continue;
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
      out.push({ t: n.t, size: n.size, numeric: n.numeric,
        pixel: Math.round(ratio(n.ink, bg) * 100) / 100 });
    }
    return out;
  }, { shot, want });
}

/* ── reporting ───────────────────────────────────────────────────────────── */

export function makeReport() {
  const rows = [];
  let pass = 0, fail = 0;
  const ok = (id, what, detail = '') => { rows.push({ id, what, verdict: 'PASS', detail }); pass++; console.log(`  \x1b[32mPASS\x1b[0m ${id.padEnd(6)} ${what}${detail ? '  — ' + detail : ''}`); };
  const no = (id, what, detail = '') => { rows.push({ id, what, verdict: 'FAIL', detail }); fail++; console.log(`  \x1b[31mFAIL\x1b[0m ${id.padEnd(6)} ${what}${detail ? '\n         ' + String(detail).slice(0, 900) : ''}`); };
  const unproven = (id, what, why) => { rows.push({ id, what, verdict: 'UNPROVEN', detail: why }); console.log(`  \x1b[33m????\x1b[0m ${id.padEnd(6)} ${what}  — UNPROVEN: ${why}`); };
  const check = (id, what, cond, detail = '') => (cond ? ok(id, what, typeof detail === 'string' ? detail : '') : no(id, what, detail));
  return {
    rows, ok, no, unproven, check,
    get pass() { return pass; }, get fail() { return fail; },
    section: t => console.log(`\n\x1b[1m── ${t} ${'─'.repeat(Math.max(0, 66 - t.length))}\x1b[0m`),
  };
}
