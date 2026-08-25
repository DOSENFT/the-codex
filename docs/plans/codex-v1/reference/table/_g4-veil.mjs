/* G-4 veil — a control covering another control, found by accident.
   -----------------------------------------------------------------------------
   The swept grader left 18 nodes ungraded. Six of them were the Dice Roller's
   Roll Mode «Normal» button, and the reason was not clipping: the hit test at
   its centre returned `button.veil-btn`. The veil control is

       position: fixed; z-index: 90; left: 16px;
       bottom: calc(5rem + var(--turn-deck-h) + safe-area)

   and every bottom sheet in this app is `z-50`. 90 is over 50, so whenever a
   sheet is open the veil button is painted ON TOP of it, at the bottom left —
   which is where the sheets put their controls.

   safety-d.css says of this button, in its own comment:

     «It mirrors the dice button across the screen — same height, opposite side
      — so the two can never be confused and can never overlap on any width.»

   That reasoning is about the dice FAB. It is silent about the sheets, and the
   sheets are what it lands on.

   BEFORE believing any of that, measure it. V-9 is the standing warning in this
   document: a probe that infers occlusion from stacking rules rather than from
   the hit test inflates its finding, and it did. So this opens each sheet on
   each screen and asks the page directly — for every control INSIDE the open
   sheet, does the centre of it hit itself, or something else? Whatever it hits
   is named. A finding here is a control Marcus taps and does not get.        */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const OVERLAYS = [
  { name: 'dice', sel: '[aria-label="Open dice roller"]' },
  { name: 'mechanics', sel: '[aria-label="Open mechanics reference"]' },
];
const srv = await serveDist(DIST, 5930);
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

/* Sweep the open sheet's own scroller and, at every stop, record any control of
   the sheet whose centre is inside the viewport but hits a different element.
   A control that is clear at ANY stop is not stolen — same FREE/TRAPPED rule
   _g3c-trapped.mjs uses, so this cannot report a merely-scrolled-past control. */
const STOLEN = () => {
  const desc = e => !e?.tagName ? String(e) : e.tagName.toLowerCase()
    + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '');
  const sheet = document.querySelector('div.fixed.inset-x-0.bottom-0:not([inert])');
  if (!sheet) return { sheet: null, stolen: [] };
  const scroller = [sheet, ...sheet.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
  const room = scroller ? scroller.scrollHeight - scroller.clientHeight : 0;
  const STEP = 120;
  const ctrls = [...sheet.querySelectorAll('button,[role="button"],a[href],input,select,textarea')]
    .filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden'; });
  const worst = new Map();
  for (let t = 0; t <= room + STEP; t += STEP) {
    if (scroller) { scroller.scrollTop = Math.min(t, room); void scroller.offsetHeight; }
    for (const el of ctrls) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cx >= innerWidth || cy < 0 || cy >= innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      const mine = !!hit && (hit === el || el.contains(hit));
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) || '(unlabelled)';
      if (mine) { worst.set(label, null); continue; }          // clear somewhere: not stolen
      if (worst.get(label) === null) continue;
      if (!worst.has(label)) worst.set(label, { label, by: desc(hit), self: desc(el),
        rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` });
    }
    if (!scroller) break;
  }
  return { sheet: desc(sheet), stolen: [...worst.values()].filter(Boolean) };
};

/* THE RECIPROCAL CHECK, and it is the more important half.
   «0 stolen taps» is trivially purchasable by burying the veil under the chrome
   — the number would go green and the one control this app promises is always
   there would be gone. That is the exact shape of softening this document
   exists to catch, so the fix has to be watched from both sides at once: with
   NO sheet open, on every screen, the veil's own centre must hit the veil. */
let unreachable = 0;
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const r = await page.evaluate(() => {
    const b = document.querySelector('.veil-btn');
    if (!b) return { there: false };
    const q = b.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { there: true, mine: !!hit && (hit === b || b.contains(hit)),
      rect: `${Math.round(q.x)},${Math.round(q.y)} ${Math.round(q.width)}x${Math.round(q.height)}`,
      hit: hit ? hit.tagName.toLowerCase() + (typeof hit.className === 'string' && hit.className ? '.' + hit.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '') : '(none)' };
  });
  if (!r.there || !r.mine) { unreachable++; console.log(`   !! ${sc.id}: veil NOT reachable — ${r.there ? `tap lands on ${r.hit}` : 'button absent'}`); }
  else console.log(`   ok ${sc.id}: veil reachable at ${r.rect}`);
}
console.log(`\n===== veil unreachable on ${unreachable} of ${SCREENS.length} screens (must be 0) =====\n`);

let total = 0;
for (const sc of SCREENS) {
  for (const ov of OVERLAYS) {
    await goScreen(page, sc); await settle(page);
    const btn = page.locator(ov.sel).first();
    if (!(await btn.count())) continue;
    try { await btn.click({ timeout: 3000 }); } catch { continue; }
    await page.waitForTimeout(450); await settle(page);
    const r = await page.evaluate(STOLEN);
    if (!r.sheet) { console.log(`   ·· ${sc.id} ${ov.name}: sheet did not open`); continue; }
    total += r.stolen.length;
    console.log(`\n── ${sc.id} > ${ov.name}   ${r.stolen.length} control(s) whose tap goes elsewhere`);
    for (const s of r.stolen) console.log(`   XX "${s.label}"  ${s.rect}\n        is: ${s.self}\n        tap lands on: ${s.by}`);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
console.log(`\n===== ${total} stolen taps across the open sheets =====`);
console.log('ERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
