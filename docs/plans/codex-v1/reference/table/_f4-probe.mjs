/* Throwaway: what does the ?d=1 turn screen actually put on screen?
   F-4's criterion is three clauses — renders Nix's real sheet, shows a RANKED
   SHORTLIST with at least one action in it, and SPENDS A REAL RESOURCE. The
   grader asserts `faults.length === 0 && buttons > 2`. The dice roller alone
   is ten buttons, so clause two and clause three are asserted by nothing.
   This finds what the shortlist and the spend are actually called. */
import { chromium, serveDist, DIST, PHONE, importFile, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4299);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await page.goto(srv.url + '?d=1', { waitUntil: 'networkidle' });
await settle(page);

console.log('\n\x1b[1m?d=1 turn screen\x1b[0m\n');
console.log('  total buttons:', await page.locator('button').count());
console.log('\n  visible text:\n');
console.log((await page.evaluate(() => document.body.innerText)).split('\n').filter(Boolean).map(l => '    ' + l).join('\n'));
console.log('\n  buttons:');
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')]
  .map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean)), null, 1));

const pools = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  const c = JSON.parse(localStorage.getItem(k));
  return { loh: c.paladinResources?.layOnHands?.current, slots: JSON.stringify(c.spellSlots), hp: c.hp?.current };
});
console.log('\n  pools before:', JSON.stringify(await pools()));
console.log('');
await ctx.close(); await b.close(); await srv.close();
