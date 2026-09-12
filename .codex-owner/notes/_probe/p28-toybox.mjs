import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
const diff=(a,b,n=800)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n)};
await page.getByRole('button', { name: /Open The Toybox/i }).click();
await page.waitForTimeout(900);
for (const t of ['Suggest','Combos','Tactics','Persona']) {
  const pre = await body();
  const b = page.getByRole('button', { name: new RegExp('^'+t+'$') }).first();
  if (!(await b.count())) { console.log('MISSING', t); continue; }
  await b.click(); await page.waitForTimeout(1200);
  console.log('\n-- Toybox/'+t+' --\n  '+diff(pre, await body()));
  await shot(page, 'chrome-toybox-'+t.toLowerCase()+'-390');
}
console.log('\n-- open a combo --');
const pre = await body();
await page.getByRole('button', { name: /^Combos$/ }).first().click(); await page.waitForTimeout(800);
const c = page.getByRole('button', { name: /Hearth Wall/i }).first();
if (await c.count()) { await c.click(); await page.waitForTimeout(1000); console.log(diff(pre, await body(), 1200)); await shot(page,'chrome-toybox-combo-open-390'); }
await ctx.close(); await browser.close();
