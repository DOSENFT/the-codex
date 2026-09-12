import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(()=>document.body.innerText);
const rulings = () => page.evaluate(()=>{const ks=Object.keys(localStorage).filter(k=>/ruling|errata/i.test(k));return JSON.stringify(ks.map(k=>[k,localStorage.getItem(k)]));});
// find and open the errata band header
const hdr = page.getByRole('button',{name:/Your sheet and the 2024 rules disagree/i}).first();
console.log('errata header found:', await hdr.count());
await hdr.scrollIntoViewIfNeeded(); await hdr.click(); await page.waitForTimeout(800);
// the "N · N unanswered" band
const eb = page.getByRole('button',{name:/unanswered|all answered/i}).first();
console.log('errata band found:', await eb.count(), await eb.innerText().catch(()=>''));
if (await eb.count()) { await eb.scrollIntoViewIfNeeded(); await eb.click(); await page.waitForTimeout(900); }
await shot(page,'play-errata-band-open-390');
const groups = page.locator('[role=group][aria-label^="Ruling for"]');
console.log('RulingControl groups:', await groups.count());
if (await groups.count()) {
  const g = groups.first();
  console.log('group label:', await g.getAttribute('aria-label'));
  console.log('choices:', await g.evaluate(el=>[...el.querySelectorAll('button')].map(b=>b.innerText.trim()).join(' | ')));
  console.log('rulings before:', await rulings());
  const first = g.locator('button').first();
  await first.scrollIntoViewIfNeeded();
  await first.click({timeout:8000}).catch(e=>console.log('CLICKFAIL',String(e).slice(0,60)));
  await page.waitForTimeout(1200);
  console.log('aria-pressed after:', await first.getAttribute('aria-pressed'));
  console.log('rulings after:', await rulings());
  const t = await body();
  const m = t.match(/\d+ · (\d+ unanswered|all answered)/);
  console.log('counter now:', m && m[0]);
  await shot(page,'play-errata-ruling-recorded-390');
}
await ctx.close(); await browser.close();
