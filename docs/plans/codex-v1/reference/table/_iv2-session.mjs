/* IV2 — a real turn, on a phone, end to end, then a reload.
   Spend a slot, take damage, Lay on Hands, Channel Divinity, advance the round,
   reload, and check every number against disk. Error floor watched throughout. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5918);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 140)); });
await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 140))); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);
await goScreen(page, SCREENS[0]); await settle(page);

const DISK = () => page.evaluate(() => {
  const out = {};
  for (const k of Object.keys(localStorage).sort()) {
    if (!k.startsWith('codex-')) continue;
    const v = localStorage.getItem(k);
    if (k.startsWith('codex-character-')) {
      try { const c = JSON.parse(v);
        out.hp = c.currentHP ?? c.hp?.current ?? c.hitPoints?.current;
        out.maxHp = c.maxHP ?? c.hp?.max ?? c.hitPoints?.max;
        out.slots1 = JSON.stringify(c.spellSlots?.[0] ?? c.spellSlots?.['1'] ?? null);
        out.pools = JSON.stringify((c.resourcePools || c.pools || []).map(p => [p.name, p.current, p.max]));
      } catch { out.charParse = 'UNPARSEABLE'; }
    }
    if (k.startsWith('codex-combat-')) out.combat = v.slice(0, 260);
  }
  return out;
});
const SCREEN = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const tap = async (name, sel) => {
  const r = await page.evaluate(s => {
    const b = [...document.querySelectorAll('button,[role="button"]')].find(x => {
      const n = (x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ');
      return new RegExp(s).test(n) && !x.disabled;
    });
    if (!b) return 'NOT FOUND / disabled';
    const rc = b.getBoundingClientRect();
    if (rc.top < 0 || rc.bottom > innerHeight) b.scrollIntoView({ block: 'center' });
    return 'ok:' + Math.round(rc.y);
  }, sel);
  if (r.startsWith('ok')) {
    await page.waitForTimeout(150);
    await page.evaluate(s => {
      const b = [...document.querySelectorAll('button,[role="button"]')].find(x => new RegExp(s).test((x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')) && !x.disabled);
      b?.click();
    }, sel);
  }
  await page.waitForTimeout(650);
  console.log(`  tap ${name.padEnd(28)} ${r}`);
  return r.startsWith('ok');
};

const step = async (label) => {
  const d = await DISK(); const t = await SCREEN();
  console.log(`  [${label}] disk hp=${d.hp}/${d.maxHp} slots1=${d.slots1} pools=${d.pools}`);
  console.log(`           combat=${d.combat ? d.combat.slice(0, 150) : '(none)'}`);
  console.log(`           screen shows: ${(t.match(/HIT POINTS [^A-Z]*/) || [''])[0].slice(0, 40)} | LOH ${(t.match(/LAY ON HANDS \d+\/\d+/) || [''])[0]} | boundary=${BOUNDARY_RE.test(t)}`);
  return d;
};

console.log('\n===== TURN 1 =====');
await step('start');
await tap('Start Combat', '^Start Combat$');
await tap('Expend 1st level slot', '^Expend 1st level spell slot$');
await step('after slot');
await tap('Apply damage (open)', '^Apply damage$');
await tap('Set value to 10', '^Set value to 10$');
await tap('Apply', '^Apply$');
await step('after 10 damage');
await tap('Heal 5 (Lay on Hands)', '^Heal 5$');
await step('after Lay on Hands 5');
await tap('Channel Divinity', '^Expend Channel Divinity use$');
await tap('Action', '^Action$');
const d1 = await step('end of turn 1');

console.log('\n===== RELOAD (he locks the phone and picks it up again) =====');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await goScreen(page, SCREENS[0]); await settle(page);
const d2 = await step('after reload');
const t2 = await SCREEN();
console.log('\n  survived reload?');
for (const k of ['hp', 'slots1', 'pools', 'combat']) {
  const same = JSON.stringify(d1[k]) === JSON.stringify(d2[k]);
  console.log(`    ${k.padEnd(8)} ${same ? 'same' : 'CHANGED'}   before=${String(d1[k]).slice(0, 90)}\n                       after =${String(d2[k]).slice(0, 90)}`);
}
console.log('  screen after reload still shows Nix:', /Nix/.test(t2));
console.log('  HP on screen after reload:', (t2.match(/HIT POINTS [\d/]+/) || [''])[0]);
console.log('  LOH on screen after reload:', (t2.match(/LAY ON HANDS [\d/]+/) || [''])[0]);
console.log('  action economy on screen:', (t2.match(/Action Bonus Reaction Move/) || ['(not found)'])[0]);
console.log('  round/combat indicator:', (t2.match(/Round \d+|End Turn|Next Turn|End Combat/gi) || ['(none)']).join(','));

console.log('\nERROR FLOOR:', errs.length ? errs : 'clean', await page.evaluate(() => window.__rej));
await page.screenshot({ path: 'docs/plans/codex-v1/reference/table/_iv2-session-after-reload.png' });
await browser.close(); await srv.close();
