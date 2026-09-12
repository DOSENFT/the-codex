import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=900)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const keys = () => page.evaluate(()=>JSON.stringify(Object.keys(localStorage)));

await goTab(page,'session','Roleplay');
await page.waitForTimeout(1500);
const start = page.getByRole('button',{name:/Start the scene/i}).first();
if (await start.count()) {
  await start.click(); await page.waitForTimeout(800);
  await page.getByPlaceholder(/Around the campfire/i).fill('A crowded riverside tavern, rain outside');
  await page.getByPlaceholder(/still being polite/i).fill('Tense. Scar is watching the door.');
  await page.getByRole('button',{name:/That.{0,3}s the scene/i}).first().click();
  console.log('scene started, waiting for opening beat...');
  for(let i=0;i<80;i++){await page.waitForTimeout(1500);if(await page.getByRole('button',{name:/^Give me a beat$/}).first().isEnabled().catch(()=>false))break;}
}
await page.waitForTimeout(800);
console.log('storage keys after scene:', await keys());

// find the table card
const pre = await body();
const addBtn = page.getByRole('button',{name:/^Add player$/i}).first();
console.log('Add player present:', await addBtn.count());
const ins = await page.evaluate(()=>[...document.querySelectorAll('input')].map(i=>i.placeholder||i.ariaLabel||i.type).join(' ~ '));
console.log('all inputs:', ins);
const nameIn = page.getByPlaceholder(/who else is at the table|name|player/i).first();
console.log('name input:', await nameIn.count(), await nameIn.getAttribute('placeholder').catch(()=>''));
if (await nameIn.count()) { await nameIn.scrollIntoViewIfNeeded(); await nameIn.fill('Brenna'); await page.waitForTimeout(400); }
if (await addBtn.count()) { await addBtn.scrollIntoViewIfNeeded(); await addBtn.click({timeout:8000,force:true}).catch(e=>console.log('addfail',String(e).slice(0,60))); }
await page.waitForTimeout(1200);
await shot(page,'play-roleplay-table-add-player-390');
console.log('after add:', diff(pre, await body()));
console.log('storage keys after add:', await keys());
const t = await body();
const i = t.indexOf('THE TABLE');
console.log('THE TABLE region:', t.slice(i, i+400).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
