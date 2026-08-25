/* G-4 why — 517 nodes are never painted at any scroll position, ~70 on every
   one of the seven screens. That uniformity says they are globally-mounted
   overlays, not page content, but "says" is not "is". Before writing 517 down
   as UNPROVEN I want the reason each one is not painted, from the DOM, named.

   For every text node on play/Combat that the sweep could not paint, walk up
   and report the FIRST ancestor that explains it — display:none, visibility,
   zero opacity, a transform that parks it off-screen, aria-hidden, inert, or
   [hidden]. If they all resolve to one or two containers, those containers are
   the answer, and the question becomes whether the harness can open them. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5927);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

for (const id of ['play/Combat', 'prep/Character']) {
  await goScreen(page, SCREENS.find(s => s.id === id)); await settle(page);
  const rows = await page.evaluate(() => {
    const desc = e => e.tagName.toLowerCase()
      + (e.id ? '#' + e.id : '')
      + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '');
    const reasons = new Map();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.nodeValue.trim(); if (!t) continue;
      const el = n.parentElement; if (!el) continue;
      const r0 = el.getBoundingClientRect();
      const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      const inView = cx >= 0 && cx < innerWidth && cy >= 0 && cy < innerHeight;
      const hit = inView ? document.elementFromPoint(cx, cy) : null;
      if (hit && (hit === el || el.contains(hit))) continue;   // painted right now
      let why = null;
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.display === 'none') { why = `display:none @ ${desc(p)}`; break; }
        if (s.visibility === 'hidden') { why = `visibility:hidden @ ${desc(p)}`; break; }
        if (parseFloat(s.opacity || '1') < 0.05) { why = `opacity:${s.opacity} @ ${desc(p)}`; break; }
        if (p.hasAttribute('hidden')) { why = `[hidden] @ ${desc(p)}`; break; }
        if (p.getAttribute('aria-hidden') === 'true') { why = `aria-hidden @ ${desc(p)}`; break; }
        if (p.hasAttribute('inert')) { why = `inert @ ${desc(p)}`; break; }
        const tr = s.transform;
        if (tr && tr !== 'none') {
          const rp = p.getBoundingClientRect();
          if (rp.bottom <= 0 || rp.top >= innerHeight) { why = `transform parks off-screen @ ${desc(p)}`; break; }
        }
      }
      if (!why) why = inView ? `covered/clipped in place (no hidden ancestor)` : `off-viewport, no hidden ancestor`;
      reasons.set(why, (reasons.get(why) || 0) + 1);
    }
    return [...reasons.entries()].sort((a, b) => b[1] - a[1]);
  });
  console.log(`\n── ${id}: reasons a text node is not painted, at scrollTop 0`);
  for (const [why, n] of rows.slice(0, 14)) console.log(`   ${String(n).padStart(4)}  ${why}`);
}
await ctx.close(); await browser.close(); await srv.close();
