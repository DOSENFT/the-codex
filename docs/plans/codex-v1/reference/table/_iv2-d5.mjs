/* IV2 — D-5 and 9.16(a) under attack.
   families.mjs:480 computes `judge(page)` and keeps only `.text`, so D-5's
   verdict never sees the error floor § 5 declares to be "a floor under all of
   them". I reproduce D-5's EXACT storage break and its exact spend, then
   report what it threw away — and then do the same for the spends a player
   actually performs first on play/Combat.
   If the alarm does come up, I then walk all seven screens and measure it
   against the tab bar, the Veil and the dice roller.                          */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5915);
const browser = await chromium.launch();

const BREAK = () => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = proto.setItem;
  window.__realSet = real;
  proto.setItem = function (k, v) {
    if (String(k).startsWith('codex-')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    return real.call(this, k, v);
  };
};

async function scenario(name, act) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 120)); });
  await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 120))); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);
  await goScreen(page, SCREENS[0]); await settle(page);
  const before = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-')); return k ? localStorage.getItem(k) : null; });
  await page.evaluate(BREAK);
  const did = await act(page);
  await page.waitForTimeout(1100);
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  const rej = await page.evaluate(() => window.__rej);
  const after = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-')); return k ? localStorage.getItem(k) : null; });
  const told = /could not save|save failed|storage|full|out of space/i.test(text);
  const boundaried = BOUNDARY_RE.test(text);
  const alarm = await page.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : ''; });
  console.log(`\n### ${name}   (acted: ${did})`);
  console.log(`   D-5's own pass condition : intact=${after === before}  userWasTold=${told}   => D-5 would print ${(after === before && told) ? 'PASS' : 'FAIL'}`);
  console.log(`   ERROR FLOOR (discarded by families.mjs:480): ${errs.length} console/page errors, ${rej.length} rejections`);
  errs.slice(0, 6).forEach(e => console.log('        ' + e));
  console.log(`   error-boundary text on screen: ${boundaried}`);
  console.log(`   role=alert says: ${JSON.stringify(alarm.slice(0, 140))}`);
  return { page, ctx, alarm: !!alarm };
}

const clickByName = re => async page => {
  const b = page.getByRole('button', { name: re }).first();
  if (!(await b.count())) return 'control not found';
  await b.click().catch(() => {});
  return 're: ' + re;
};

// 1. D-5's exact scenario
let s = await scenario("D-5 verbatim — spend 'Heal 5' with codex-* writes throwing", clickByName(/Heal 5/i));
// if the alarm is up, measure it against the chrome on all seven screens
if (s.alarm) {
  console.log('\n===== alarm geometry vs the three things V-9 protects =====');
  for (const sc of SCREENS) {
    await goScreen(s.page, sc); await settle(s.page);
    const m = await s.page.evaluate(() => {
      const a = document.querySelector('[role="alert"]');
      if (!a || !a.innerText.trim()) return null;
      const ar = a.getBoundingClientRect();
      const named = {
        'tab bar': document.querySelector('nav.fixed'),
        'Veil': document.querySelector('.veil-btn') || [...document.querySelectorAll('button')].find(b => /veil/i.test(b.className + ' ' + (b.getAttribute('aria-label') || ''))),
        'dice roller': [...document.querySelectorAll('button')].find(b => /dice/i.test(b.getAttribute('aria-label') || '')),
        'header': document.querySelector('header.fixed'),
      };
      const out = {};
      for (const [k, e] of Object.entries(named)) {
        if (!e) { out[k] = 'NOT FOUND'; continue; }
        const r = e.getBoundingClientRect();
        const ox = Math.min(ar.right, r.right) - Math.max(ar.left, r.left);
        const oy = Math.min(ar.bottom, r.bottom) - Math.max(ar.top, r.top);
        out[k] = `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` +
          (ox > 0 && oy > 0 ? `  *** OVERLAP ${Math.round(ox)}x${Math.round(oy)} ***` : '  clear');
      }
      // anything fixed whose centre-point hit test now returns the alarm
      const covered = [...document.querySelectorAll('button,a[href],[role="button"],[role="tab"],input')].filter(c => {
        const s2 = getComputedStyle(c); if (s2.display === 'none' || s2.visibility === 'hidden') return false;
        let fx = false; for (let n = c; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') { fx = n; break; } }
        if (!fx || fx === document.body) return false;
        if (a.contains(c)) return false;
        const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return false;
        const t = document.elementFromPoint(cx, cy);
        return t && (t === a || a.contains(t));
      }).map(c => (c.getAttribute('aria-label') || c.textContent).trim().slice(0, 34));
      return { alarm: [Math.round(ar.x), Math.round(ar.y), Math.round(ar.width), Math.round(ar.height)], named: out, covered };
    });
    if (!m) { console.log(`  ${sc.id}: alarm gone — NOT TESTED`); continue; }
    console.log(`  ${sc.id}  alarm ${m.alarm.join(',')}`);
    for (const [k, v] of Object.entries(m.named)) console.log(`      ${k.padEnd(12)} ${v}`);
    console.log(`      controls whose centre now hit-tests to the alarm: ${m.covered.length ? JSON.stringify(m.covered) : 'none'}`);
  }
  await s.page.screenshot({ path: 'docs/plans/codex-v1/reference/table/_iv2-alarm.png' });
}
await s.ctx.close();

// 2. the spends a player actually reaches for first
for (const [n, re] of [['Apply damage (HP card)', /^Damage$/i], ['Apply healing (HP card)', /^Heal$/i], ['a spell slot pip', /expend|slot/i]]) {
  const r = await scenario(n, clickByName(re));
  await r.ctx.close();
}
await browser.close(); await srv.close();
