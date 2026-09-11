/* IV2 — 9.16(a) / V-9 under attack.
   Claim: "the alarm covers nothing it was written to protect ... the tab bar,
   the Veil and the dice roller are all bottom-anchored and all clear", and
   "that band holds no fixed control on any of the seven screens".

   I raise the alarm for real (localStorage.setItem throws QuotaExceededError
   for codex-* keys, then I spend a resource), then on all seven screens I
   measure the alarm rect against EVERY fixed element, and separately against
   the named three.  I also open the header menu while the alarm is up, because
   that menu is `fixed top-14 right-4` — the same band the alarm was moved into. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5914);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 160)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

/* break the disk, exactly the way a full phone breaks it */
await page.evaluate(() => {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (String(k).startsWith('codex-') && k !== 'codex-sw-off') {
      const e = new DOMException('QuotaExceededError', 'QuotaExceededError');
      throw e;
    }
    return real.call(this, k, v);
  };
});

await goScreen(page, SCREENS[0]);
await settle(page);
/* spend something real: tap a spell-slot pip / any resource control */
const spent = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => !b.disabled);
  const pick = btns.find(b => /^(Damage|Heal)$/i.test(b.textContent.trim()))
    || btns.find(b => /expend|spend|slot/i.test(b.getAttribute('aria-label') || ''));
  if (pick) { pick.click(); return (pick.getAttribute('aria-label') || pick.textContent).trim().slice(0, 40); }
  return null;
});
await page.waitForTimeout(600);
// the HP card path: open Damage then apply, to force a write
await page.evaluate(() => {
  const n = [...document.querySelectorAll('button')].find(b => /Apply damage/i.test(b.getAttribute('aria-label') || b.textContent));
  if (n) n.click();
});
await page.waitForTimeout(900);

const alarmUp = await page.evaluate(() => !!document.querySelector('[role="alert"]')
  && document.querySelector('[role="alert"]').innerText.trim().length > 0);
console.log(`spend attempted via: ${spent}`);
console.log(`alarm raised: ${alarmUp}`);
if (alarmUp) console.log('alarm text:', await page.evaluate(() => document.querySelector('[role="alert"]').innerText.replace(/\s+/g, ' ')));

const MEASURE = () => {
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05 && r.width > 1 && r.height > 1; };
  const alerts = [...document.querySelectorAll('[role="alert"]')].filter(e => vis(e) && e.innerText.trim());
  const a = alerts.map(e => e.getBoundingClientRect())[0];
  if (!a) return { alarm: null };
  const onScreen = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const fixedEls = [...document.querySelectorAll('*')].filter(e =>
    getComputedStyle(e).position === 'fixed' && vis(e) && !e.contains(alerts[0]) && !alerts[0].contains(e) && e !== alerts[0]);
  const rows = [];
  for (const e of fixedEls) {
    const r = e.getBoundingClientRect();
    if (!onScreen(r)) continue;
    const ox = Math.min(a.right, r.right) - Math.max(a.left, r.left);
    const oy = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
    rows.push({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60),
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      overlap: ox > 0 && oy > 0 ? Math.round(ox) + 'x' + Math.round(oy) : null,
      // is this fixed thing, or a control inside it, actually hidden by the alarm?
      ctlsCovered: [...e.querySelectorAll('button,a[href],[role="button"],[role="tab"],input')].filter(c => {
        if (!vis(c)) return false;
        const cr = c.getBoundingClientRect();
        const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
        if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return false;
        const t = document.elementFromPoint(cx, cy);
        return t && t !== c && !c.contains(t) && (alerts[0] === t || alerts[0].contains(t));
      }).map(c => (c.getAttribute('aria-label') || c.textContent).trim().slice(0, 30)) });
  }
  return { alarm: [Math.round(a.x), Math.round(a.y), Math.round(a.width), Math.round(a.height)], rows };
};

for (const s of SCREENS) {
  await goScreen(page, s); await settle(page);
  const m = await page.evaluate(MEASURE);
  if (!m.alarm) { console.log(`\n### ${s.id}: ALARM GONE — the notice did not survive to this screen`); continue; }
  console.log(`\n### ${s.id}  alarm rect ${m.alarm.join(',')}`);
  for (const r of m.rows) {
    const flag = r.ctlsCovered.length ? '  <<< COVERS CONTROLS: ' + JSON.stringify(r.ctlsCovered) : (r.overlap ? '  (geometric overlap ' + r.overlap + ')' : '');
    console.log(`   fixed <${r.tag}> ${r.r.join(',')}  ${r.cls}${flag}`);
  }
}

/* the one fixed thing that lives in the alarm's own band */
await goScreen(page, SCREENS[0]); await settle(page);
const menu = await page.evaluate(() => {
  const b = [...document.querySelectorAll('header button')].map(x => (x.getAttribute('aria-label') || x.textContent).trim());
  return b;
});
console.log('\nheader controls:', JSON.stringify(menu));
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll('header button')].find(x => /menu|more|settings|options/i.test(x.getAttribute('aria-label') || x.textContent));
  if (!b) return null; b.click(); return (b.getAttribute('aria-label') || b.textContent).trim();
});
await page.waitForTimeout(700); await settle(page);
if (opened) {
  console.log(`opened header control: "${opened}"`);
  const m = await page.evaluate(MEASURE);
  console.log('with the alarm up, alarm rect', m.alarm);
  for (const r of (m.rows || [])) if (r.overlap || r.ctlsCovered.length)
    console.log(`   fixed <${r.tag}> ${r.r.join(',')} ${r.cls}  overlap=${r.overlap}  covers=${JSON.stringify(r.ctlsCovered)}`);
  await page.screenshot({ path: 'docs/plans/codex-v1/reference/table/_iv2-alarm-menu.png' });
}
console.log('\nERROR FLOOR:', errs.length ? errs : 'clean');
await browser.close(); await srv.close();
