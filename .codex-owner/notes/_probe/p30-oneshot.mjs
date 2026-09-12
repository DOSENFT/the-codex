import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI='{"provider":"ollama","ollamaUrl":"http://localhost:11434","ollamaModel":"gemma3-27b-abliterated:latest","fallbackEnabled":false}';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI } });
const body=()=>page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=800)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n)};
async function hard(re){const b=page.getByRole('button',{name:re}).first();if(!(await b.count())){console.log('  MISSING',re);return false}await b.scrollIntoViewIfNeeded().catch(()=>{});await b.click({timeout:8000,force:true}).catch(e=>console.log('  CF',String(e).slice(0,40)));console.log('  tapped',re);return true}
async function ai(pre,ms=200000){const t0=Date.now();while(Date.now()-t0<ms){await page.waitForTimeout(1500);const n=await body();const e=n.match(/[^\n]*(could not reach|did not answer|failed to fetch)[^\n]*/i);if(e)return{k:'ERROR',ms:Date.now()-t0,s:e[0]};if(n.length>pre.length+50){let l=n;for(let i=0;i<80;i++){await page.waitForTimeout(1500);const x=await body();if(x===l)break;l=x}return{k:'ANSWER',ms:Date.now()-t0,s:diff(pre,l)}}}return{k:'TIMEOUT',ms:Date.now()-t0,s:''}}

await goTab(page,'prep','Academy'); await page.waitForTimeout(800);
console.log('=== Interactive One-Shot ===');
await hard(/Start One-Shot Adventure/i); await page.waitForTimeout(900);
let pre=await body();
await hard(/Begin One-Shot/i);
let r=await ai(pre); console.log(`[Begin One-Shot] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`);
await shot(page,'prep-academy-oneshot-390');

console.log('\n=== Conversation Drill ===');
await hard(/^Conversation$/); await page.waitForTimeout(900);
pre=await body();
for (const n of [/Start Conversation/i,/^Start$/i,/Begin/i]) if (await hard(n)) break;
r=await ai(pre); console.log(`[Conversation] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`);
await shot(page,'prep-academy-conversation-390');

console.log('\n=== Condition Drill ===');
await hard(/^Quizzes$/); await page.waitForTimeout(700);
pre=await body();
await hard(/^Start Drill$/);
r=await ai(pre); console.log(`[Condition Drill] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`);
await shot(page,'prep-academy-condition-drill-390');
await ctx.close(); await browser.close();
