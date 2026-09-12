import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
const diff=(a,b,n=1400)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const style = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');const c=JSON.parse(localStorage.getItem('codex-character-'+id)||'{}');return JSON.stringify({fightingStyle:c.fightingStyle, featNames:(c.feats||[]).map(f=>f.name||f)});});

console.log('before:', await style());
const gap = page.locator('[data-fighting-style-gap]').first();
console.log('gap band present:', await gap.count());
const pre = await body();
await gap.scrollIntoViewIfNeeded();
await gap.click({timeout:8000});
await page.waitForTimeout(1200);
await shot(page,'play-fighting-style-picker-390');
console.log('SHEET OPENED, new content:', diff(pre, await body()));
const opts = await page.evaluate(()=>[...document.querySelectorAll('[role=dialog] button, .sheet button')].map(b=>b.innerText.replace(/\s+/g,' ').slice(0,45)).filter(Boolean).slice(0,20));
console.log('picker options:', JSON.stringify(opts));
const inter = page.getByRole('button',{name:/Interception/i}).first();
if (await inter.count()) { await inter.click({timeout:8000}).catch(e=>console.log('err',String(e).slice(0,60))); await page.waitForTimeout(1500); }
else { console.log('no Interception button; trying first option'); }
await shot(page,'play-fighting-style-picked-390');
console.log('after pick:', await style());
console.log('band still present:', await page.locator('[data-fighting-style-gap]').count());
const t = await body();
console.log('REACTION band now:', t.slice(t.indexOf('REACTION'), t.indexOf('REACTION')+300).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
