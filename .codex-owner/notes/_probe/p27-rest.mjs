import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const st = () => page.evaluate(() => { const id = localStorage.getItem('codex-active-id'); const c = JSON.parse(localStorage.getItem('codex-character-'+id)||'{}'); return JSON.stringify({level:c.level, hp:c.hitPoints, slots:c.spellSlots, res:c.resourcePools?.map(p=>p.name+':'+p.current+'/'+p.max)}); });
console.log('baseline:', await st());
await page.getByRole('button', { name: /Open settings/i }).click();
await page.waitForTimeout(800);
async function go(btn, confirm, cap) {
  const b = page.getByRole('button', { name: btn }).first();
  await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(800);
  if (cap) await shot(page, cap);
  const c = page.getByRole('button', { name: confirm }).first();
  if (await c.count()) { await c.scrollIntoViewIfNeeded(); await c.click(); console.log('  confirmed', confirm); }
  else console.log('  NO CONFIRM for', btn);
  await page.waitForTimeout(1500);
  console.log('after', btn, ':', await st());
}
await go(/^Short Rest$/i, /Confirm Short Rest/i, 'chrome-settings-short-rest-confirm-390');
await go(/^Long Rest$/i, /Confirm Long Rest/i, 'chrome-settings-long-rest-390');
await shot(page, 'chrome-settings-after-long-rest-390');
await go(/Level Up to /i, /Confirm Level Up|Level Up/i, 'chrome-settings-level-up-390');
await ctx.close(); await browser.close();
