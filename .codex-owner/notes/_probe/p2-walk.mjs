import { chromium, newCtx, shot, wireLogs, URL_BASE, ROOT } from './_pw.mjs';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
const page = await ctx.newPage();
wireLogs(page);
await page.goto(URL_BASE, { waitUntil: 'networkidle' });

const [fc] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: /import character/i }).first().click(),
]);
await fc.setFiles(ROOT + '/.codex-owner/notes/_probe/seed-copy.json');
await page.waitForTimeout(800);
await page.getByRole('button', { name: /import anyway/i }).click();
await page.waitForTimeout(1500);
await shot(page, 'play-combat-after-import-390');

const dump = await page.evaluate(() => {
  const o = {};
  for (const k of Object.keys(localStorage)) o[k] = localStorage.getItem(k);
  return o;
});
writeFileSync(ROOT + '/.codex-owner/notes/_probe/ls-dump.json', JSON.stringify(dump, null, 1));
console.log('localStorage keys:', Object.keys(dump).join(', '));
console.log('--- body ---');
console.log((await page.locator('body').innerText()).replace(/\n{2,}/g, '\n').slice(0, 2500));
console.log('--- buttons ---');
for (const b of await page.locator('button').all()) {
  if (!(await b.isVisible())) continue;
  const t = ((await b.innerText().catch(() => '')) || (await b.getAttribute('aria-label')) || '').replace(/\s+/g, ' ').trim();
  if (t) console.log('  btn:', JSON.stringify(t.slice(0, 70)));
}
await browser.close();
