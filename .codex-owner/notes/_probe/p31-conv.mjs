import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI='{"provider":"ollama","ollamaUrl":"http://localhost:11434","ollamaModel":"gemma3-27b-abliterated:latest","fallbackEnabled":false}';
const browser=await chromium.launch();
const {ctx,page}=await boot(browser,{extra:{'codex-ai-config':AI}});
const body=()=>page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=800)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n)};
async function hard(re){const b=page.getByRole('button',{name:re}).first();if(!(await b.count())){console.log('  MISSING',re);return false}await b.scrollIntoViewIfNeeded().catch(()=>{});await b.click({timeout:8000,force:true}).catch(e=>console.log('  CF',String(e).slice(0,40)));console.log('  tapped',re);return true}
await goTab(page,'prep','Academy'); await page.waitForTimeout(800);
await hard(/^Conversation$/); await page.waitForTimeout(900);
await hard(/^Tavern Keeper$/); await page.waitForTimeout(600);
const pre=await body();
await hard(/Start Conversation/i);
const t0=Date.now(); let out='TIMEOUT';
while(Date.now()-t0<200000){await page.waitForTimeout(1500);const n=await body();if(n.length>pre.length+40){let l=n;for(let i=0;i<60;i++){await page.waitForTimeout(1500);const x=await body();if(x===l)break;l=x}out=diff(pre,l);break}}
console.log(`[Conversation] ${Date.now()-t0}ms :: ${JSON.stringify(out)}`);
await shot(page,'prep-academy-conversation-390');
await ctx.close(); await browser.close();
