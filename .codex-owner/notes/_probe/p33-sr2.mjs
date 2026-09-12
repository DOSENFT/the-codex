import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
await page.getByRole('button', { name: /Open settings/i }).click();
await page.waitForTimeout(900);
const pre = await body();
const sr = page.getByRole('button', { name: /^Short Rest$/i }).first();
await sr.scrollIntoViewIfNeeded();
await sr.click();
await page.waitForTimeout(1200);
const post = await body();
const p = pre.split('\n');
console.log('NEW LINES:', post.split('\n').filter(l => l.trim() && !p.includes(l)).join(' | ').slice(0,600));
await shot(page, 'chrome-settings-short-rest-feedback-390');
console.log('seed short-rest resources:', await page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = JSON.parse(localStorage.getItem('codex-character-'+id)||'{}');
  return JSON.stringify({ featuresTotal: (c.features||[]).length,
    featuresWithUses: (c.features||[]).filter(f=>f.usesPerRest).length,
    paladinResources: !!c.paladinResources,
    pools: (c.resourcePools||[]).length });
}));
await ctx.close(); await browser.close();
