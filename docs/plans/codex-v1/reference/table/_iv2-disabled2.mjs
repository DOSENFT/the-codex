/* IV2 — A-30 under attack, take 2: isolated, non-derailing.
   One control per page-load, geometry read immediately before the tap, and the
   coverer classified as ANCESTOR (= fell through because of pointer-events)
   vs OVERLAY (= something genuinely painted on top).  A-30's defect is the
   ancestor case; it is the one A-30 says was fixed.                          */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5913);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 160)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
await page.addInitScript(() => {
  window.__hits = [];
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 3).join('.') : '');
  addEventListener('click', e => {
    const path = (e.composedPath?.() || []).filter(n => n?.tagName);
    window.__hits.push({ target: desc(e.target),
      interactive: path.filter(n => /^(button|a|input|select|textarea)$/i.test(n.tagName) || ['button', 'tab'].includes(n.getAttribute?.('role')))
        .map(n => desc(n) + (n.disabled ? '[disabled]' : '')) });
  }, true);
});
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const mark = () => page.evaluate(() => {
  const on = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; };
  const b = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4
    && /auto|scroll/.test(getComputedStyle(e).overflowY) && on(e));
  const el = b.sort((x, y) => (y.scrollHeight - y.clientHeight) - (x.scrollHeight - x.clientHeight))[0];
  document.querySelectorAll('[data-iv2]').forEach(n => delete n.dataset.iv2);
  if (!el) return 0; el.dataset.iv2 = '1'; return el.scrollHeight - el.clientHeight;
});

// pass 1: inventory every disabled control, per screen, per scroll step — no tapping
const inv = [];
for (const s of SCREENS) {
  await goScreen(page, s); await settle(page);
  const room = await mark();
  for (const y of [...new Set([...Array(Math.ceil(room / 250) + 1).keys()].map(i => i * 250).concat(room))]) {
    if (y > room) continue;
    await page.evaluate(v => { const e = document.querySelector('[data-iv2="1"]'); if (e) e.scrollTop = v; }, y);
    await page.waitForTimeout(140); await settle(page, 700);
    const got = await page.evaluate(() => {
      const d = n => !n ? 'null' : n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 3).join('.') : '');
      const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea';
      return [...document.querySelectorAll(SEL)].filter(e => {
        const st = getComputedStyle(e), r = e.getBoundingClientRect();
        return (e.disabled || e.getAttribute('aria-disabled') === 'true')
          && st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') > 0.05
          && r.width > 0 && r.height > 0;
      }).map(e => {
        const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 2 || cy < 2 || cx > innerWidth - 2 || cy > innerHeight - 2) return null;
        const top = document.elementFromPoint(cx, cy);
        let rel = 'self';
        if (top !== e && !e.contains(top)) rel = top && top.contains(e) ? 'ANCESTOR' : 'OVERLAY';
        return { label: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 42),
          pe: getComputedStyle(e).pointerEvents, cx: Math.round(cx), cy: Math.round(cy),
          w: Math.round(r.width), h: Math.round(r.height), efp: d(top), rel };
      }).filter(Boolean);
    });
    for (const g of got) if (!inv.some(i => i.screen === s.id && i.label === g.label)) inv.push({ screen: s.id, y, ...g });
  }
}

console.log(`\n===== ${inv.length} distinct disabled controls found across the seven screens =====`);
for (const i of inv) console.log(`  ${i.screen} @scroll ${i.y}  "${i.label}"  ${i.w}x${i.h}  pointer-events=${i.pe}  -> elementFromPoint = ${i.efp}  [${i.rel}]`);

// pass 2: tap each one for real, one per fresh page load
console.log(`\n===== real taps, one per fresh load =====`);
for (const i of inv) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const s = SCREENS.find(x => x.id === i.screen);
  await goScreen(page, s); await settle(page);
  await mark();
  await page.evaluate(v => { const e = document.querySelector('[data-iv2="1"]'); if (e) e.scrollTop = v; }, i.y);
  await page.waitForTimeout(200); await settle(page, 700);
  const now = await page.evaluate(lbl => {
    const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea';
    const e = [...document.querySelectorAll(SEL)].find(n =>
      (n.getAttribute('aria-label') || n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 42) === lbl && (n.disabled || n.getAttribute('aria-disabled') === 'true'));
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  }, i.label);
  if (!now || now.cx < 2 || now.cy < 2 || now.cx > 388 || now.cy > 842) { console.log(`  ${i.screen} "${i.label}" — not re-locatable on screen, skipped`); continue; }
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const txtBefore = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  await page.evaluate(() => { window.__hits = []; });
  await page.touchscreen.tap(now.cx, now.cy);
  await page.waitForTimeout(400);
  const hits = await page.evaluate(() => window.__hits);
  const after = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const txtAfter = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const other = hits.flatMap(h => h.interactive).filter(n => !/\[disabled\]/.test(n));
  console.log(`  ${i.screen} "${i.label}" pe=${i.pe} [${i.rel}] @${now.cx},${now.cy}`);
  console.log(`      click target : ${JSON.stringify(hits.map(h => h.target))}`);
  console.log(`      live control reached by the tap : ${other.length ? JSON.stringify(other) : 'NONE'}`);
  console.log(`      storage changed: ${before !== after}   screen text changed: ${txtBefore !== txtAfter}`);
}
console.log('\nERROR FLOOR:', errs.length ? errs : 'clean');
await browser.close(); await srv.close();
