/* throwaway: WHY did the second import appear to do nothing? */
import { chromium, LOCAL, PHONE, importFile, watch, drain } from './rig.mjs';
import { realCopy } from './families.mjs';
import { readFileSync } from 'node:fs';

const FILE = realCopy('full');
const src = JSON.parse(readFileSync(FILE, 'utf8'));
console.log('file id            :', src.id);
console.log('file layOnHands    :', JSON.stringify(src.paladinResources?.layOnHands));
console.log('file updatedAt     :', src.updatedAt);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, FILE);

const snap = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  const c = k ? JSON.parse(localStorage.getItem(k)) : null;
  return { key: k, pool: c?.paladinResources?.layOnHands?.current, at: c?.updatedAt, name: c?.name };
});
console.log('after import 1     :', JSON.stringify(await snap()));
await page.getByRole('button', { name: /^Heal 5$/i }).first().click();
await page.waitForTimeout(700);
console.log('after spend        :', JSON.stringify(await snap()));

await page.getByRole('button', { name: /Open settings/i }).first().click();
await page.waitForTimeout(600);
const imp = page.getByRole('button', { name: /^Import$/ }).first();
const chooser = page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
await imp.click();
const c = await chooser;
if (c) await c.setFiles(FILE);
await page.waitForTimeout(1500);
console.log('after import 2     :', JSON.stringify(await snap()));
const alert = await page.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '(none)';
});
console.log('role=alert         :', alert.slice(0, 200));
const settingsOpen = await page.evaluate(() => /Export\s+Import/.test(document.body.innerText.replace(/\s+/g, ' ')));
console.log('settings still open:', settingsOpen);
console.log('errs               :', JSON.stringify(await drain(page)));
await ctx.close(); await b.close();
