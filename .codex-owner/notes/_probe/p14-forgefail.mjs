import { chromium, newCtx, shot, wireLogs, URL_BASE } from './_pw.mjs';
import { txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
wireLogs(page);
const net = [];
page.on('request', r => { if (!r.url().startsWith(URL_BASE) && !r.url().includes('localhost:5191')) net.push(r.method() + ' ' + r.url().slice(0, 110)); });
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await tap(page, 'Create New Character');
await page.locator('input[placeholder*="Thalindra"]').fill('Probe Wizard');
for (let i = 0; i < 10; i++) {
  for (const s of await page.locator('select').all()) {
    const o = await s.locator('option').allTextContents();
    if (o.includes('Wizard')) await s.selectOption('Wizard');
  }
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.waitForTimeout(300);
}
console.log('=== Test Connection (no key configured) ===');
await tap(page, 'Test Connection');
await page.waitForTimeout(9000);
await shot(page, 'setup-ai-test-fail-390');
console.log(await txt(page, 1200));

console.log('\n=== Forge Character with no key ===');
const t0 = Date.now();
await page.getByRole('button', { name: /Forge Character/ }).click();
await page.waitForTimeout(40000);
console.log('waited', Date.now() - t0, 'ms');
await shot(page, 'setup-forge-fail-390');
console.log(await txt(page, 1400));
console.log('saved:', await page.evaluate(() => localStorage.getItem('codex-active-id') || 'NONE'));
console.log('\n=== off-origin requests attempted ===');
console.log(net.length ? [...new Set(net)].join('\n') : '(none)');
await ctx.close();
await browser.close();
