import { chromium, LOCAL, PHONE, importFile, watch, drain } from './rig.mjs';
import { realCopy } from './families.mjs';
const FILE = realCopy('full');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, FILE);
const snap = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  const c = k ? JSON.parse(localStorage.getItem(k)) : null;
  return { id: c?.id, pool: c?.paladinResources?.layOnHands?.current, at: c?.updatedAt,
           weapons: Array.isArray(c?.weapons) ? c.weapons.length : typeof c?.weapons,
           notes: typeof c?.notes };
});
console.log('import 1 :', JSON.stringify(await snap()));
// mutate something the FILE cannot contain, so we can see whether import 2 replaced the record
await page.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  const c = JSON.parse(localStorage.getItem(k)); c.__marker = 'PRE-IMPORT-2';
  localStorage.setItem(k, JSON.stringify(c));
});
await page.getByRole('button', { name: /^Heal 5$/i }).first().click();
await page.waitForTimeout(700);
console.log('spend    :', JSON.stringify(await snap()));
await page.getByRole('button', { name: /Open settings/i }).first().click();
await page.waitForTimeout(600);
const ch = page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
await page.getByRole('button', { name: /^Import$/ }).first().click();
const c = await ch; if (c) await c.setFiles(FILE);
await page.waitForTimeout(1600);
const after = await page.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  const c = k ? JSON.parse(localStorage.getItem(k)) : null;
  return { id: c?.id, pool: c?.paladinResources?.layOnHands?.current, at: c?.updatedAt,
           marker: c?.__marker ?? '(gone)', keys: Object.keys(localStorage).filter(x=>x.startsWith('codex-character-')).length };
});
console.log('import 2 :', JSON.stringify(after));
console.log('errs     :', JSON.stringify(await drain(page)));
await ctx.close(); await b.close();
