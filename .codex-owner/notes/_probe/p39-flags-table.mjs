import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
const diff=(a,b,n=1200)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};

console.log('===== RULE FLAGS =====');
const sec = page.locator('section.ruleflag');
console.log('ruleflag sections:', await sec.count());
for (let i=0;i<await sec.count();i++){
  const s = sec.nth(i);
  await s.locator('button').first().scrollIntoViewIfNeeded();
  await s.locator('button').first().click({timeout:6000}).catch(e=>console.log('open fail',String(e).slice(0,50)));
  await page.waitForTimeout(600);
  const inner = await s.innerText().catch(()=> '');
  const nb = await s.locator('button').count();
  console.log(`[flag ${i}] buttons=${nb} :: ${inner.replace(/\n/g,' | ').slice(0,300)}`);
}
await shot(page,'play-rules-flags-open-390');

console.log('\n===== THE TABLE (party) =====');
await goTab(page,'session','Roleplay');
await page.waitForTimeout(1500);
let pre = await body();
// open the table card
for (const n of [/The table/i, /^Table$/i]) {
  const b = page.getByRole('button',{name:n}).first();
  if (await b.count()) { await b.scrollIntoViewIfNeeded().catch(()=>{}); await b.click({timeout:6000}).catch(()=>{}); await page.waitForTimeout(800); break; }
}
const addBtn = page.getByRole('button',{name:/^Add player$/i}).first();
console.log('Add player button:', await addBtn.count());
const inputs = await page.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.top<innerHeight&&r.bottom>0;}).map(i=>i.placeholder||i.ariaLabel||i.type).join(' ~ '));
console.log('visible inputs:', inputs);
const nameIn = page.getByPlaceholder(/name/i).first();
if (await nameIn.count()) { await nameIn.fill('Brenna'); await page.waitForTimeout(300); }
if (await addBtn.count()) { await addBtn.scrollIntoViewIfNeeded(); await addBtn.click({timeout:8000}).catch(e=>console.log('addfail',String(e).slice(0,60))); }
await page.waitForTimeout(1200);
await shot(page,'play-roleplay-table-add-player-390');
console.log('after add:', diff(pre, await body(), 700));
console.log('toybox/table storage:', await page.evaluate(()=>{const ks=Object.keys(localStorage).filter(k=>/table|party|rp/i.test(k));return JSON.stringify(ks.map(k=>[k,(localStorage.getItem(k)||'').slice(0,200)]));}));
await ctx.close(); await browser.close();
