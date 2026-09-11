/* IV2 — the disk-full break applied to every spend a real turn performs,
   using the locators verified by _iv2-hp.mjs.  D-5 grades exactly ONE spend
   ("Heal 5") and throws the error floor away (families.mjs:480).  I run the
   SAME break against the other spends and keep the floor. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5919);
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

const seq = {
  'D-5 verbatim: Heal 5 (Lay on Hands)': ['^Heal 5$'],
  'take 10 damage (the first thing that happens at a table)': ['^Apply damage$', '^Set value to 10$', '^Apply$'],
  'apply healing': ['^Apply healing$', '^Set value to 5$', '^Apply$'],
  'temp HP': ['^Set temporary hit points$', '^Set value to 5$', '^Apply$'],
  'spend a 1st level spell slot': ['^Expend 1st level spell slot$'],
  'spend a Channel Divinity use': ['^Expend Channel Divinity use$'],
  'take the Action (end-of-turn economy)': ['^Start Combat$', '^Action$'],
};

for (const [name, steps] of Object.entries(seq)) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 110)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 110)); });
  await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 110))); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);
  await goScreen(page, SCREENS[0]); await settle(page);
  const before = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-')); return k ? localStorage.getItem(k) : null; });
  await page.evaluate(BREAK);

  const trace = [];
  for (const s of steps) {
    const r = await page.evaluate(sel => {
      const b = [...document.querySelectorAll('button,[role="button"]')].find(x =>
        new RegExp(sel).test((x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')) && !x.disabled);
      if (!b) return 'MISSING';
      const rc = b.getBoundingClientRect();
      if (rc.top < 0 || rc.bottom > innerHeight) b.scrollIntoView({ block: 'center' });
      return 'ok';
    }, s);
    if (r === 'ok') { await page.waitForTimeout(120); await page.evaluate(sel => { const b = [...document.querySelectorAll('button,[role="button"]')].find(x => new RegExp(sel).test((x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')) && !x.disabled); b?.click(); }, s); }
    trace.push(s + '=' + r);
    await page.waitForTimeout(550);
  }
  await page.waitForTimeout(900);
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  const rej = await page.evaluate(() => window.__rej);
  const after = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-')); return k ? localStorage.getItem(k) : null; });
  const told = /could not save|save failed|storage|full|out of space/i.test(text);
  const intact = after === before;
  const alarm = await page.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : ''; });
  console.log(`\n### ${name}`);
  console.log(`    steps: ${trace.join(' -> ')}`);
  console.log(`    D-5's condition: intact=${intact} told=${told}  => D-5 would print ${intact && told ? 'PASS' : 'FAIL'}`);
  console.log(`    ERROR FLOOR: ${errs.length} errors, ${rej.length} rejections, boundary-on-screen=${BOUNDARY_RE.test(text)}`);
  [...new Set(errs)].slice(0, 5).forEach(e => console.log('         ' + e));
  console.log(`    alarm: ${JSON.stringify(alarm.slice(0, 90))}`);
  console.log(`    HP on screen: ${(text.match(/HIT POINTS [\d/]+/) || ['(gone)'])[0]}`);
  await page.screenshot({ path: `docs/plans/codex-v1/reference/table/_iv2-full-${name.slice(0, 14).replace(/\W+/g, '_')}.png` });
  await ctx.close();
}
await browser.close(); await srv.close();
