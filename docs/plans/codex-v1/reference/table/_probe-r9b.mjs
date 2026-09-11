/* throwaway: drive the SECOND import through Settings and watch what it does
   to a spend that happened after the first import. */
import { chromium, LOCAL, PHONE, importFile, storedChars } from './rig.mjs';
import { realCopy } from './families.mjs';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

const pool = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  if (!k) return null;
  try { return JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current; } catch { return null; }
});
const roster = () => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('codex-roster') || '[]').length; } catch { return -1; }
});

console.log('roster key candidates:', await page.evaluate(() => Object.keys(localStorage)));
console.log('pool after import 1 :', await pool());
await page.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(e => console.log('heal click:', e.message));
await page.waitForTimeout(700);
console.log('pool after a spend  :', await pool());
const n1 = await storedChars(page);

await page.getByRole('button', { name: /Open settings/i }).first().click();
await page.waitForTimeout(600);
const imp = page.getByRole('button', { name: /^Import$/ }).first();
console.log('settings Import found:', await imp.count());
const chooser = page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
await imp.click();
const c = await chooser;
console.log('chooser opened:', !!c);
if (c) await c.setFiles(realCopy('full'));
await page.waitForTimeout(1000);
const screen1 = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
console.log('after choosing file  :', screen1.slice(0, 600));
const gate = page.getByRole('button', { name: /^Import anyway$/ });
console.log('gated:', await gate.count());
if (await gate.count()) { await gate.click(); await page.waitForTimeout(900); }
console.log('pool after import 2 :', await pool());
console.log('stored chars', n1, '->', await storedChars(page), ' roster', await roster());
const screen2 = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
console.log('screen after:', screen2.slice(0, 500));
await ctx.close(); await b.close();
