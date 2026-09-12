import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=700)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
await goTab(page,'prep','Persona'); await page.waitForTimeout(1500);
const t0 = await body();
const i = t0.search(/SCENE RESPONSE/i);
console.log('scene bank region:', i>=0 ? t0.slice(i,i+400).replace(/\n/g,' | ') : 'NOT FOUND on Persona tab');
const adds = page.getByRole('button',{name:/^Add a .* response$/i});
console.log('add buttons:', await adds.count());
if (await adds.count()) {
  const a = adds.first();
  console.log('label:', await a.getAttribute('aria-label'));
  await a.scrollIntoViewIfNeeded();
  const pre = await body();
  await a.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,50)));
  await page.waitForTimeout(900);
  console.log('after add click:', diff(pre, await body()));
  const ta = page.locator('textarea:visible, input[type=text]:visible').last();
  if (await ta.count()) { await ta.fill('I plant my feet between them and the door.'); await page.waitForTimeout(400); }
  const save = page.getByRole('button',{name:/Save edit|^Save$/i}).first();
  if (await save.count()) { await save.click({timeout:6000}).catch(()=>{}); await page.waitForTimeout(900); }
  await shot(page,'prep-persona-scene-response-added-390');
  console.log('final:', diff(pre, await body()));
}
await ctx.close(); await browser.close();
