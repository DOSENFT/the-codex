/* G-3b — separate the real occlusions from the scrolled-off ones.
   -----------------------------------------------------------------------------
   G-3 reported 25 unreachable and 17 grazed controls. That number is not
   trustworthy on its own, and _a20-what.mjs already showed why: a control that
   is half-scrolled under the fixed header reads exactly like a control that is
   covered, and it is not covered — it is one flick away. Reporting those as
   defects is how V-9 came to have 22 findings and 0 real ones.

   So each finding is classified the way A-20 classified its own:

     CHROME   the coverer is position:fixed and NOT the control's own ancestor.
              It does not move when you scroll, so it covers this spot always.
              This is the only class that is a defect on its face.
     SCROLL   the control's rect is outside the scroller's visible band. There
              is room to bring it in. Ordinary page content; not a defect.
     SELF     the coverer is the control's own ancestor or descendant — a
              hit-test artifact, not an occlusion.

   For CHROME findings it also reports whether ANY part of the control is left
   clear, because a 48px target reduced to a 12px strip is still tappable and a
   fully-buried one is not.                                                   */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, scrollPage } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5923);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

const SCAN = () => {
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const fixedAncestor = n => { for (let p = n; p && p !== document.body; p = p.parentElement)
    if (getComputedStyle(p).position === 'fixed') return p; return null; };

  // the scroller the user is actually looking at — same rule as rig's scrollPage
  const onScreen = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1
      && r.bottom > 0 && r.top < innerHeight; };
  const scroller = [...document.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && onScreen(e))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
    || document.scrollingElement;
  const band = scroller.getBoundingClientRect();
  const room = scroller.scrollHeight - scroller.clientHeight;

  const out = [];
  for (const el of document.querySelectorAll('button,[role="button"],a[href],input,select,textarea')) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (r.width < 2 || r.height < 2) continue;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') < 0.05) continue;
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;

    const i = 4;
    const pts = [[r.left + r.width / 2, r.top + r.height / 2],
      [r.left + i, r.top + i], [r.right - i, r.top + i], [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]]
      .filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight);
    let clear = 0; const blockers = [];
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) clear++; else if (hit) blockers.push(hit);
    }
    if (clear === pts.length) continue;

    // classify the worst blocker
    const myFixed = fixedAncestor(el);
    let cls = 'SELF';
    let by = '';
    for (const b of blockers) {
      if (el.contains(b) || b.contains(el)) continue;
      const bf = fixedAncestor(b);
      if (bf && bf !== myFixed) { cls = 'CHROME'; by = desc(bf === b ? b : bf); break; }
      cls = cls === 'SELF' ? 'OTHER' : cls; by = by || desc(b);
    }
    // is it simply outside the visible band of the scroller?
    const outsideBand = r.top < band.top - 1 || r.bottom > band.bottom + 1;
    if (cls !== 'CHROME' && outsideBand && room > 8) cls = 'SCROLL';

    out.push({
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34) || '(unlabelled)',
      cls, by, clear, of: pts.length, disabled: !!el.disabled,
      rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      band: `${Math.round(band.top)}..${Math.round(band.bottom)}`, room: Math.round(room),
    });
  }
  return out;
};

const tally = { CHROME: 0, SCROLL: 0, SELF: 0, OTHER: 0 };
const chromeHits = [];
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  for (const where of ['top', 'bottom']) {
    await scrollPage(page, where); await page.waitForTimeout(320); await settle(page);
    for (const f of await page.evaluate(SCAN)) {
      tally[f.cls]++;
      if (f.cls === 'CHROME') chromeHits.push({ ...f, screen: sc.id, where });
    }
  }
}
console.log('\n===== classification across 7 screens x 2 scroll positions =====');
for (const k of ['CHROME', 'SCROLL', 'SELF', 'OTHER']) console.log(`  ${k.padEnd(7)} ${tally[k]}`);
console.log('\n----- CHROME: covered by fixed chrome, at every scroll position -----');
if (!chromeHits.length) console.log('  none');
for (const h of chromeHits)
  console.log(`  ${h.screen}@${h.where}  "${h.label}"${h.disabled ? ' [disabled]' : ''}\n     ${h.rect}  ${h.clear}/${h.of} points clear  ${h.clear === 0 ? '<< NO PART TAPPABLE' : '(partly tappable)'}\n     covered by ${h.by}`);
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
