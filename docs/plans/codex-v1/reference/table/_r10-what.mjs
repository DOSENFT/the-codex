/* Throwaway: R-10 passes — but by which branch? Either the re-import leaves
   session state alone, or it overwrites and says so. Those are very different
   things to tell Marcus, and §12 should say which one is true. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4294);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
const pool = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  return k ? JSON.parse(localStorage.getItem(k))?.paladinResources?.layOnHands?.current : null;
});
await importFile(page, realCopy('full'));
const before = await pool();
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await page.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
await page.waitForTimeout(900);
const spent = await pool();

await page.getByRole('button', { name: /Open settings/i }).first().click();
await page.waitForTimeout(700);
const textBefore = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
await importFile(page, realCopy('full'), { via: /^Import$/ });
await settle(page);
const after = await pool();
const textAfter = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

console.log(`\n  file says ${before} · session spent to ${spent} · after re-import: ${after}`);
console.log(`  → ${after === spent ? 'SESSION STATE HELD' : after === before ? 'OVERWRITTEN BY THE FILE' : 'neither — ' + after}`);
const bw = new Set(textBefore.split(' '));
console.log('\n  new words on screen:', JSON.stringify(textAfter.split(' ').filter(w => !bw.has(w)).join(' ').slice(0, 300)));
console.log('');
await ctx.close(); await b.close(); await srv.close();
