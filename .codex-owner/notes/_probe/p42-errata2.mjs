import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(()=>document.body.innerText);
const st = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');return localStorage.getItem('codex-errata-'+id);});
const counter = async () => { const t = await body(); const m = t.match(/\d+ · (\d+ unanswered|all answered)/); return m && m[0]; };
await page.getByRole('button',{name:/Your sheet and the 2024 rules disagree/i}).first().click();
await page.waitForTimeout(700);
await page.getByRole('button',{name:/unanswered|all answered/i}).first().click();
await page.waitForTimeout(900);
console.log('counter start:', await counter());
const groups = page.locator('[role=group][aria-label^="Ruling for"]');
const n = await groups.count();
for (let i=0;i<n;i++){
  const g = groups.nth(i);
  const label = await g.getAttribute('aria-label');
  const canon = g.locator('button').nth(1); // CANON'S FIX
  await canon.scrollIntoViewIfNeeded();
  await canon.click({timeout:8000}).catch(e=>console.log('fail',label,String(e).slice(0,40)));
  await page.waitForTimeout(500);
  console.log(`${label} -> pressed=${await canon.getAttribute('aria-pressed')}  counter=${await counter()}`);
}
await shot(page,'play-errata-all-answered-390');
console.log('stored rulings:', (await st() || '').slice(0,400));
// reload and confirm persistence
await page.reload({waitUntil:'networkidle'});
await page.waitForTimeout(1800);
await page.getByRole('button',{name:/Your sheet and the 2024 rules disagree/i}).first().click().catch(()=>{});
await page.waitForTimeout(700);
console.log('counter after reload:', await counter());
await ctx.close(); await browser.close();
