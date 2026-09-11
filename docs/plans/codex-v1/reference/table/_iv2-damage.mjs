/* IV2 — the damage flow with the disk full.
   D-5 grades ONE spend: "Heal 5". The first thing that happens at a real table
   is taking damage. Same storage break D-5 uses, applied to the actual HP card
   flow: tap Damage, enter a number, tap Apply damage.                        */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5916);
const browser = await chromium.launch();

const BREAK = () => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = proto.setItem;
  proto.setItem = function (k, v) {
    if (String(k).startsWith('codex-')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    return real.call(this, k, v);
  };
};

async function run(label, breakFirst) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 130)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 130)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);
  await goScreen(page, SCREENS[0]); await settle(page);
  console.log(`\n########## ${label} ##########`);
  const hp0 = await page.evaluate(() => (document.body.innerText.match(/(\d+)\/(\d+)/) || [])[0]);
  console.log('  HP before:', hp0);
  if (breakFirst) await page.evaluate(BREAK);

  // 1. the Damage tab in the HP card
  await page.getByRole('button', { name: /^Damage$/ }).first().click().catch(e => console.log('  no Damage tab:', e.message.slice(0, 60)));
  await page.waitForTimeout(400);
  // 2. type a number
  const filled = await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (x.type === 'number' || x.inputMode === 'numeric'); });
    if (!i) return null;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, '7'); i.dispatchEvent(new Event('input', { bubbles: true }));
    return i.getAttribute('aria-label') || i.placeholder || i.type;
  });
  console.log('  typed 7 into:', filled);
  await page.waitForTimeout(300);
  // 3. apply
  const applied = await page.getByRole('button', { name: /Apply damage/i }).first().click().then(() => true).catch(() => false);
  console.log('  Apply damage clicked:', applied);
  await page.waitForTimeout(1400);

  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  HP after :', (text.match(/(\d+)\/(\d+)/) || [])[0]);
  console.log('  error-boundary on screen:', BOUNDARY_RE.test(text));
  console.log('  role=alert:', JSON.stringify(await page.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : ''; })));
  console.log(`  ERROR FLOOR: ${errs.length}`);
  errs.slice(0, 8).forEach(e => console.log('      ' + e));
  await page.screenshot({ path: `docs/plans/codex-v1/reference/table/_iv2-damage-${breakFirst ? 'full' : 'ok'}.png` });
  await ctx.close();
}

await run('control: damage applied with storage WORKING', false);
await run('damage applied with the disk FULL (same break D-5 uses)', true);
await browser.close(); await srv.close();
