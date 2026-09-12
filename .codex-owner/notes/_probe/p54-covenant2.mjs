import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=700)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const ks = () => page.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>/covenant|safety/i.test(k)).map(k=>[k,(localStorage.getItem(k)||'').slice(0,250)])));
await page.getByRole('button',{name:/Open settings/i}).click(); await page.waitForTimeout(1000);
const inp = page.getByRole("textbox",{name:/A new line or veil/i}).first();
await inp.scrollIntoViewIfNeeded();
await inp.fill('No harm to animals on screen');
await page.waitForTimeout(400);
let pre = await body();
const lineBtn = page.getByRole('button',{name:/Line\s*[—-]\s*never happens/i}).first();
console.log('Line button:', await lineBtn.count());
await lineBtn.scrollIntoViewIfNeeded();
await lineBtn.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,60)));
await page.waitForTimeout(1200);
console.log('after Line:', diff(pre, await body()));
console.log('storage:', await ks());
// add a veil
await inp.fill('Torture');
await page.waitForTimeout(300);
pre = await body();
const veilBtn = page.getByRole('button',{name:/Veil\s*[—-]\s*happens off-screen/i}).first();
await veilBtn.scrollIntoViewIfNeeded();
await veilBtn.click({timeout:8000}).catch(e=>console.log('fail2',String(e).slice(0,60)));
await page.waitForTimeout(1200);
await shot(page,'chrome-table-covenant-added-390');
console.log('after Veil:', diff(pre, await body()));
console.log('storage:', await ks());
// the global Veil button
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
const gv = page.getByRole('button',{name:/^Veil$|Veil this|Call for a veil/i}).first();
console.log('global Veil button:', await gv.count(), await gv.getAttribute('aria-label').catch(()=>''));
if (await gv.count()) { pre = await body(); await gv.click({timeout:6000}).catch(()=>{}); await page.waitForTimeout(1200); await shot(page,'chrome-veil-invoked-390'); console.log('after global Veil:', diff(pre, await body())); }
await ctx.close(); await browser.close();
