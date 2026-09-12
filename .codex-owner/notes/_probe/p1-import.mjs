import { chromium, newCtx, shot, wireLogs, URL_BASE, ROOT } from './_pw.mjs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
const page = await ctx.newPage();
wireLogs(page);
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await shot(page, 'setup-welcome-390');

console.log('--- visible buttons on welcome ---');
for (const b of await page.locator('button').all()) {
  const t = (await b.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (t) console.log('  btn:', JSON.stringify(t.slice(0, 80)));
}
console.log('--- body text (first 1200) ---');
console.log((await page.locator('body').innerText()).replace(/\n{2,}/g, '\n').slice(0, 1200));

// Import via file chooser
const importBtn = page.getByRole('button', { name: /import/i }).first();
if (await importBtn.count()) {
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    importBtn.click(),
  ]);
  await fc.setFiles(ROOT + '/.codex-owner/notes/_probe/seed-copy.json');
  await page.waitForTimeout(1200);
  await shot(page, 'setup-import-result-390');
  console.log('--- after import ---');
  console.log((await page.locator('body').innerText()).replace(/\n{2,}/g, '\n').slice(0, 1500));
  const ls = await page.evaluate(() => Object.keys(localStorage));
  console.log('localStorage keys:', ls.join(', '));
} else {
  console.log('NO IMPORT BUTTON FOUND');
}
await ctx.storageState({ path: ROOT + '/.codex-owner/notes/_probe/state.json' });
await browser.close();
