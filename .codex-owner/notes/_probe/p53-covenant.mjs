import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=800)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const ks = () => page.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>/covenant|safety|lines|veil/i.test(k)).map(k=>[k,(localStorage.getItem(k)||'').slice(0,250)])));
await page.getByRole('button',{name:/Open settings/i}).click(); await page.waitForTimeout(900);
const t0 = await body(); const i = t0.search(/COVENANT|LINES|VEIL/i);
console.log('covenant region:', i>=0?t0.slice(i,i+400).replace(/\n/g,' | '):'not found');
const inp = page.getByPlaceholder(/A new line or veil/i).or(page.getByRole('textbox',{name:/A new line or veil/i})).first();
console.log('input present:', await inp.count());
const pre = await body();
if (await inp.count()) {
  await inp.scrollIntoViewIfNeeded();
  await inp.fill('No harm to animals on screen');
  await page.waitForTimeout(400);
  const vis = await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.top<innerHeight&&r.bottom>0;}).map(b=>b.getAttribute('aria-label')||b.innerText.replace(/\s+/g,' ').slice(0,30)).join(' ~ '));
  console.log('visible buttons:', vis.slice(0,600));
  for (const n of [/^Add$/i, /Add line/i, /^Line$/i, /^Veil$/i]) {
    const b = page.getByRole('button',{name:n}).first();
    if (await b.count()) { await b.scrollIntoViewIfNeeded(); await b.click({timeout:6000}).catch(e=>console.log('fail',String(e).slice(0,40))); console.log('clicked', n); break; }
  }
  await page.waitForTimeout(1200);
}
await shot(page,'chrome-table-covenant-added-390');
console.log('after:', diff(pre, await body()));
console.log('storage:', await ks());
await ctx.close(); await browser.close();
