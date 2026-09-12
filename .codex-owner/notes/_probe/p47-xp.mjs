import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const prof = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');const v=localStorage.getItem('codex-training-'+id);if(!v)return 'NO PROFILE';const p=JSON.parse(v);return JSON.stringify({totalXP:p.totalXP,level:p.level,quizHistory:(p.quizHistory||[]).length,streak:p.currentStreak,sessions:p.totalSessions});});
const xpOnScreen = async()=>{const t=await body();const m=t.match(/(\d[\d,]*)\s*XP/i);return m&&m[0];};

await goTab(page,'prep','Academy'); await page.waitForTimeout(1200);
await page.getByRole('button',{name:/^Quizzes$/i}).first().click(); await page.waitForTimeout(900);
console.log('profile before:', await prof(), '| on screen:', await xpOnScreen());
const pre = await body();
await page.getByRole('button',{name:/^Generate Question$/i}).first().click();
for(let i=0;i<100;i++){await page.waitForTimeout(1500);const n=await body();if(n.length>pre.length+60){let l=n;for(let j=0;j<40;j++){await page.waitForTimeout(1200);const x=await body();if(x===l)break;l=x;}break;}}
await page.waitForTimeout(800);
await shot(page,'prep-academy-quiz-generated-390');
// find answer option buttons (A/B/C/D)
const opts = await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.top<innerHeight*3;}).map(b=>b.innerText.replace(/\s+/g,' ').slice(0,60)));
console.log('candidate buttons:', JSON.stringify(opts.filter(o=>/^[A-D][\.\)) ]/.test(o)||o.length>15).slice(0,12)));
const ans = page.locator('button').filter({hasText:/^[A-D][\.\)]/}).first();
console.log('lettered option found:', await ans.count());
if (await ans.count()) { await ans.scrollIntoViewIfNeeded(); await ans.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,50))); }
await page.waitForTimeout(2000);
await shot(page,'prep-academy-quiz-answered-390');
console.log('profile after answer:', await prof(), '| on screen:', await xpOnScreen());
const t = await body(); const i = t.search(/TRAINING PROGRESS|LEVEL \d|XP/i);
console.log('progress region:', t.slice(i, i+260).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
