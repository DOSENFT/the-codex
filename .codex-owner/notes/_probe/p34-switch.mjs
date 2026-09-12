import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
const diff = (a,b,n=900)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const roster = () => page.evaluate(() => localStorage.getItem('codex-roster'));
async function tap(re){const b=page.getByRole('button',{name:re}).first();if(!(await b.count())){console.log('MISSING',re);return false;}await b.scrollIntoViewIfNeeded().catch(()=>{});await b.click({timeout:8000}).catch(e=>console.log('CLICKFAIL',re,String(e).slice(0,60)));return true;}

console.log('roster before:', (await roster() || '').slice(0,400));
await tap(/Open settings/i); await page.waitForTimeout(900);
let pre = await body();
console.log('\n== Switch Character ==');
await tap(/^Switch Character$/i); await page.waitForTimeout(1200);
await shot(page,'chrome-switch-character-390');
console.log(diff(pre, await body()));

console.log('\n== back to settings, New Character ==');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await tap(/Open settings/i); await page.waitForTimeout(800);
pre = await body();
await tap(/^New Character$/i); await page.waitForTimeout(1500);
await shot(page,'chrome-new-character-390');
console.log(diff(pre, await body()));
console.log('roster after New Character:', (await roster() || '').slice(0,400));
console.log('active id:', await page.evaluate(()=>localStorage.getItem('codex-active-id')));
await ctx.close(); await browser.close();
