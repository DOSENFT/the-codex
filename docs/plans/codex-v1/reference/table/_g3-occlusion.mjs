/* G-3 — what is actually painted on top of a control, now that A-30 is finished
   everywhere and disabled buttons are hit-testable again.
   -----------------------------------------------------------------------------
   `_iv2-disabled2.mjs` found two taps that still do not reach their button, and
   neither is the pointer-events defect: something is genuinely painted over
   them. One is the dice FAB, one is the bottom tab bar. Both are FIXED chrome,
   so whatever they cover, they cover on every screen and at every scroll
   position — which makes "two controls" a suspiciously small number.

   So: every screen, both scroll positions, every control a thumb can reach.
   For each, hit-test its centre and its four inset corners. A control is only
   reported when the centre AND all four corners land on something that is not
   the control or its own descendant — i.e. there is no part of it left to tap.
   Anything that is partly clear is reported separately as GRAZED, because a
   48px target reduced to a 12px strip is a different, quieter problem.        */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, scrollPage } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5922);
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
  const label = e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34) || '(unlabelled)';
  const out = { blocked: [], grazed: [] };
  const controls = [...document.querySelectorAll('button,[role="button"],a[href],input,select,textarea')];
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width < 2 || r.height < 2) continue;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') < 0.05) continue;
    // must be inside the viewport to be tappable at all
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
    const inset = 4;
    const pts = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + inset, r.top + inset], [r.right - inset, r.top + inset],
      [r.left + inset, r.bottom - inset], [r.right - inset, r.bottom - inset],
    ].filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight);
    if (!pts.length) { out.blocked.push({ label: label(el), self: desc(el), by: '(entirely off-viewport)', rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` }); continue; }
    let clear = 0; const blockers = new Set();
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) clear++;
      else blockers.add(desc(hit));
    }
    const rect = `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    const rec = { label: label(el), self: desc(el), by: [...blockers].join(' | '), rect, clear, of: pts.length, disabled: !!el.disabled };
    if (clear === 0) out.blocked.push(rec);
    else if (clear < pts.length) out.grazed.push(rec);
  }
  return out;
};

let totalBlocked = 0, totalGrazed = 0;
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  for (const where of ['top', 'bottom']) {
    await scrollPage(page, where); await page.waitForTimeout(320); await settle(page);
    const r = await page.evaluate(SCAN);
    totalBlocked += r.blocked.length; totalGrazed += r.grazed.length;
    console.log(`\n── ${sc.id} @${where} — ${r.blocked.length} unreachable, ${r.grazed.length} grazed`);
    for (const b of r.blocked) console.log(`   XX "${b.label}"${b.disabled ? ' [disabled]' : ''}  ${b.rect}\n        covered by: ${b.by}`);
    for (const g of r.grazed) console.log(`   ~~ "${g.label}"${g.disabled ? ' [disabled]' : ''}  ${g.rect}  ${g.clear}/${g.of} corners clear\n        covered by: ${g.by}`);
  }
}
console.log(`\n===== ${totalBlocked} unreachable, ${totalGrazed} grazed, across 7 screens x 2 scroll positions =====`);
console.log('ERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
