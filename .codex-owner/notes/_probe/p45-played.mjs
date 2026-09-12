import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=900)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
const tbl = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');return localStorage.getItem('codex-rp-table-'+id);});
const idle = async(ms=240000)=>{const t0=Date.now();const b=page.getByRole('button',{name:/^Give me a beat$/}).first();while(Date.now()-t0<ms){if(await b.isEnabled().catch(()=>false))return 1;await page.waitForTimeout(1000);}return -1;};
const moments = async()=>{const t=await body();const m=t.match(/(\d+)\s+moments?/i);return m&&m[0];};

await goTab(page,'session','Roleplay'); await page.waitForTimeout(1500);
await page.getByRole('button',{name:/Start the scene/i}).first().click(); await page.waitForTimeout(800);
await page.getByPlaceholder(/Around the campfire/i).fill('A crowded riverside tavern, rain outside');
await page.getByPlaceholder(/still being polite/i).fill('Tense. Scar is watching the door.');
await page.getByRole('button',{name:/That.{0,3}s the scene/i}).first().click();
await idle();
await page.getByPlaceholder(/Add a player/i).first().fill('Brenna');
await page.getByRole('button',{name:/^Add player$/i}).first().click();
await page.waitForTimeout(900);
console.log('moments before:', await moments());
await page.getByRole('button',{name:/Aim a beat/i}).first().click();
await idle(); await page.waitForTimeout(1200);
console.log('table before played:', await tbl());
const pre = await body();
const played = page.getByRole('button',{name:/^I played it$/i}).first();
console.log('"I played it" present:', await played.count());
await played.scrollIntoViewIfNeeded();
await played.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,60)));
await page.waitForTimeout(1800);
await shot(page,'play-roleplay-i-played-it-390');
console.log('after played:', diff(pre, await body()));
console.log('moments after:', await moments());
console.log('table after played:', await tbl());
// open the timeline
for (const n of [/Timeline/i, /Session Timeline/i, /moments/i]) {
  const b = page.getByRole('button',{name:n}).first();
  if (await b.count()) { await b.scrollIntoViewIfNeeded().catch(()=>{}); await b.click({timeout:6000}).catch(()=>{}); await page.waitForTimeout(900); break; }
}
await shot(page,'play-roleplay-timeline-1-moment-390');
const t = await body(); const i = t.search(/TIMELINE/i);
console.log('timeline region:', t.slice(i, i+400).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
