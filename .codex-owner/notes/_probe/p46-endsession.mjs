import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=1400)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const idle = async(ms=240000)=>{const t0=Date.now();const b=page.getByRole('button',{name:/^Give me a beat$/}).first();while(Date.now()-t0<ms){if(await b.isEnabled().catch(()=>false))return 1;await page.waitForTimeout(1000);}return -1;};
await goTab(page,'session','Roleplay'); await page.waitForTimeout(1500);
await page.getByRole('button',{name:/Start the scene/i}).first().click(); await page.waitForTimeout(800);
await page.getByPlaceholder(/Around the campfire/i).fill('A crowded riverside tavern, rain outside');
await page.getByPlaceholder(/still being polite/i).fill('Tense. Scar is watching the door.');
await page.getByRole('button',{name:/That.{0,3}s the scene/i}).first().click();
await idle();
// play two beats
for (let i=0;i<2;i++){
  const p = page.getByRole('button',{name:/^I played it$/i}).first();
  if (await p.count()) { await p.scrollIntoViewIfNeeded(); await p.click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(1200); }
  const g = page.getByRole('button',{name:/^Give me a beat$/}).first();
  if (await g.count()) { await g.scrollIntoViewIfNeeded(); await g.click({timeout:8000}).catch(()=>{}); await idle(); await page.waitForTimeout(900); }
}
const p2 = page.getByRole('button',{name:/^I played it$/i}).first();
if (await p2.count()) { await p2.click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(1200); }
const t0 = await body();
console.log('moments now:', (t0.match(/(\d+)\s+moments?/i)||[])[0]);
console.log('\n=== End Session ===');
const es = page.getByRole('button',{name:/^End Session$/i}).first();
console.log('End Session present:', await es.count());
await es.scrollIntoViewIfNeeded();
await es.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,60)));
await page.waitForTimeout(2500);
await shot(page,'play-roleplay-end-session-result-390');
console.log('after End Session:', diff(t0, await body()));
const after = await body();
console.log('moments after end:', (after.match(/(\d+)\s+moments?/i)||[])[0]);
console.log('storage rp keys:', await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>/rp|session|recap/i.test(k)))));
await ctx.close(); await browser.close();
