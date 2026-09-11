/* IV2 — A-30 under attack.
   Claim: "removing disabled:pointer-events-none changed no behaviour and
   disabled buttons still refuse to act", and the transparent-to-touch defect
   is fixed.

   My test, on EVERY disabled control reachable on all seven screens at every
   scroll position: perform a REAL tap (touchscreen.tap, i.e. a finger) at the
   control's centre, and record
     (1) what document.elementFromPoint says is there,
     (2) what element actually RECEIVED the pointerdown/click, captured at
         window in the capture phase (so nothing can stopPropagation past me),
     (3) whether any interactive ancestor other than the disabled button is in
         the event's composed path — i.e. did the tap fall THROUGH,
     (4) whether localStorage changed as a result.                            */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5912);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 160)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

await page.addInitScript(() => {
  window.__hits = [];
  const desc = n => !n || !n.tagName ? String(n)
    : n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 2).join('.') : '');
  for (const t of ['pointerdown', 'click']) {
    addEventListener(t, e => {
      const path = (e.composedPath ? e.composedPath() : []).filter(n => n && n.tagName);
      window.__hits.push({
        type: t,
        target: desc(e.target),
        targetDisabled: !!(e.target && e.target.disabled),
        // every interactive node the event would activate on its way up
        interactive: path.filter(n => /^(button|a|input|select|textarea)$/i.test(n.tagName)
          || n.getAttribute?.('role') === 'button' || n.getAttribute?.('role') === 'tab')
          .map(n => desc(n) + (n.disabled ? '[disabled]' : '')),
      });
    }, true);
  }
});

await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const VIS = `(el)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0.05&&r.width>0&&r.height>0;}`;

const scroller = () => page.evaluate(() => {
  const on = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; };
  const b = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4
    && /auto|scroll/.test(getComputedStyle(e).overflowY) && on(e));
  const el = b.sort((x, y) => (y.scrollHeight - y.clientHeight) - (x.scrollHeight - x.clientHeight))[0];
  if (!el) return null;
  el.dataset.iv2 = '1';
  return { room: el.scrollHeight - el.clientHeight, client: el.clientHeight };
});
const scrollTo = y => page.evaluate(v => { const e = document.querySelector('[data-iv2="1"]'); if (e) e.scrollTop = v; }, y);

let total = 0, fellThrough = [], refused = [], acted = [];
for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const sc = await scroller();
  const room = sc ? sc.room : 0;
  const steps = [];
  for (let y = 0; y <= room; y += 300) steps.push(y);
  steps.push(room);
  const seen = new Set();

  for (const y of [...new Set(steps)]) {
    await scrollTo(y);
    await page.waitForTimeout(160);
    await settle(page, 800);
    const cands = await page.evaluate((VISSRC) => {
      const vis = eval(VISSRC);
      const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea';
      return [...document.querySelectorAll(SEL)]
        .filter(e => vis(e) && (e.disabled || e.getAttribute('aria-disabled') === 'true'))
        .map(e => { const r = e.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx < 2 || cy < 2 || cx > innerWidth - 2 || cy > innerHeight - 2) return null;
          const top = document.elementFromPoint(cx, cy);
          const d = n => !n ? 'null' : n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 2).join('.') : '');
          return {
            label: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 42),
            pe: getComputedStyle(e).pointerEvents,
            cx: Math.round(cx), cy: Math.round(cy),
            w: Math.round(r.width), h: Math.round(r.height),
            efp: d(top), efpIsSelf: top === e || e.contains(top),
          }; })
        .filter(Boolean);
    }, VIS);

    for (const c of cands) {
      const key = s.id + '|' + c.label + '|' + c.pe;
      if (seen.has(key)) continue;
      seen.add(key);
      total++;
      const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
      await page.evaluate(() => { window.__hits = []; });
      await page.touchscreen.tap(c.cx, c.cy);
      await page.waitForTimeout(320);
      const hits = await page.evaluate(() => window.__hits);
      const after = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
      const clicks = hits.filter(h => h.type === 'click');
      const other = clicks.flatMap(h => h.interactive).filter(n => !/\[disabled\]/.test(n));
      const rec = { screen: s.id, y, ...c, storageChanged: before !== after, clickTargets: clicks.map(h => h.target), other };
      if (!c.efpIsSelf) fellThrough.push(rec);
      else if (other.length || rec.storageChanged) acted.push(rec);
      else refused.push(rec);
    }
  }
}

const P = o => console.log(`  ${o.screen} @${o.y}  "${o.label}"  ${o.w}x${o.h} pe=${o.pe}\n      elementFromPoint -> ${o.efp}  (self? ${o.efpIsSelf})\n      click target(s)  -> ${JSON.stringify(o.clickTargets)}\n      other interactive in path -> ${JSON.stringify(o.other)}   storage changed: ${o.storageChanged}`);

console.log(`\n===== ${total} disabled controls tapped for real across 7 screens =====`);
console.log(`\n--- ${fellThrough.length} where the tap did NOT land on the control (fell through / covered) ---`);
fellThrough.forEach(P);
console.log(`\n--- ${acted.length} where the tap reached ANOTHER control or changed storage ---`);
acted.forEach(P);
console.log(`\n--- ${refused.length} inert as claimed ---`);
refused.forEach(o => console.log(`  ${o.screen} @${o.y} "${o.label}" pe=${o.pe} — refused`));
console.log('\nERROR FLOOR:', errs.length ? errs : 'clean');
await browser.close(); await srv.close();
