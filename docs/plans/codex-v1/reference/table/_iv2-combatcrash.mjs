/* IV2 — pin the crash.  With codex-* writes throwing (D-5's own break), the
   FIRST tap of a real encounter — "Start Combat" — unwinds play/Combat to its
   error boundary.  Which key is being written when it throws?  Does it recover?
   Is the character still safe afterwards?  Is "Next Turn" the same? */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5920);
const browser = await chromium.launch();

async function fresh() {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text().split('\n')[0].slice(0, 120)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);
  await goScreen(page, SCREENS[0]); await settle(page);
  return { ctx, page };
}
// break only AFTER recording which keys get written, so we know the culprit
const BREAK = () => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = proto.setItem;
  window.__realSet = real; window.__attempts = []; window.__threw = [];
  proto.setItem = function (k, v) {
    if (String(k).startsWith('codex-')) {
      window.__attempts.push(String(k));
      const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError';
      window.__threw.push(String(k));
      throw e;
    }
    return real.call(this, k, v);
  };
};
const click = (page, sel) => page.evaluate(s => {
  const b = [...document.querySelectorAll('button,[role="button"]')].find(x =>
    new RegExp(s).test((x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')) && !x.disabled);
  if (!b) return 'MISSING'; b.scrollIntoView({ block: 'center' }); b.click(); return 'ok';
}, sel);

console.log('========== A. Start Combat, disk full ==========');
{
  const { ctx, page } = await fresh();
  await page.evaluate(BREAK);
  console.log('  Start Combat ->', await click(page, '^Start Combat$'));
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ att: window.__attempts, threw: window.__threw }));
  console.log('  codex-* keys attempted while it crashed:', JSON.stringify(a.threw));
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  boundary on screen:', BOUNDARY_RE.test(t));
  console.log('  what the player sees:', JSON.stringify(t.slice(0, 320)));
  console.log('  is HP still on screen:', /HIT POINTS/.test(t), ' is the turn deck still there:', /Lay on Hands|Heal \d/i.test(t));
  console.log('  ERRORS:', page.errs.length); [...new Set(page.errs)].forEach(e => console.log('     ' + e));
  await page.screenshot({ path: 'docs/plans/codex-v1/reference/table/_iv2-combat-crashed.png' });
  // can he get out of it?
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30)));
  console.log('  buttons offered on the boundary:', JSON.stringify(btns.slice(0, 14)));
  // does switching tabs and back fix it?
  await goScreen(page, SCREENS[1]); await settle(page);
  await goScreen(page, SCREENS[0]); await settle(page);
  const t2 = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  after leaving to Grimoire and coming back, still boundaried:', BOUNDARY_RE.test(t2));
  // does the storage recovering fix it?
  await page.evaluate(() => { Object.getPrototypeOf(localStorage).setItem = window.__realSet; });
  await goScreen(page, SCREENS[1]); await settle(page); await goScreen(page, SCREENS[0]); await settle(page);
  const t3 = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  after storage is healthy again, still boundaried:', BOUNDARY_RE.test(t3));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
  await goScreen(page, SCREENS[0]); await settle(page);
  const t4 = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  after a full reload with healthy storage, boundaried:', BOUNDARY_RE.test(t4), '| HP:', (t4.match(/HIT POINTS [\d/]+/) || ['?'])[0]);
  await ctx.close();
}

console.log('\n========== B. in combat already, THEN the disk fills, then Next Turn ==========');
{
  const { ctx, page } = await fresh();
  console.log('  Start Combat (healthy) ->', await click(page, '^Start Combat$'));
  await page.waitForTimeout(900);
  await page.evaluate(BREAK);
  for (const s of ['^Action$', '^Next Turn$', '^End Turn$']) {
    const r = await click(page, s);
    await page.waitForTimeout(1100);
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    console.log(`  ${s.padEnd(14)} -> ${r}  boundary=${BOUNDARY_RE.test(t)}  errs=${page.errs.length}  keys=${JSON.stringify(await page.evaluate(() => window.__threw))}`);
    if (BOUNDARY_RE.test(t)) { console.log('     screen:', JSON.stringify(t.slice(0, 220))); break; }
  }
  console.log('  ERRORS:', [...new Set(page.errs)].slice(0, 6));
  await ctx.close();
}

console.log('\n========== C. which unguarded writer is it — Roleplay / session log ==========');
{
  const { ctx, page } = await fresh();
  await page.evaluate(BREAK);
  for (const sc of SCREENS) {
    await goScreen(page, sc); await settle(page);
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    console.log(`  ${sc.id.padEnd(16)} boundary=${BOUNDARY_RE.test(t)} errs=${page.errs.length} threw=${JSON.stringify(await page.evaluate(() => window.__threw))}`);
  }
  await ctx.close();
}
await browser.close(); await srv.close();
