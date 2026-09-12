import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const prof = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');const v=localStorage.getItem('codex-training-'+id);if(!v)return 'NO PROFILE';const p=JSON.parse(v);return JSON.stringify({totalXP:p.totalXP,level:p.level,quiz:(p.quizHistory||[]).length,streak:p.currentStreak});});
const xpLine = async()=>{const t=await body();const i=t.indexOf('XP');return t.slice(Math.max(0,i-30),i+60).replace(/\n/g,' | ');};
await goTab(page,'prep','Academy'); await page.waitForTimeout(1200);
await page.getByRole('button',{name:/^Quizzes$/i}).first().click(); await page.waitForTimeout(900);
console.log('before:', await prof(), '||', await xpLine());
const pre = await body();
await page.getByRole('button',{name:/Generate (New )?Question/i}).first().click();
for(let i=0;i<100;i++){await page.waitForTimeout(1500);const n=await body();if(n.length>pre.length+60){let l=n;for(let j=0;j<40;j++){await page.waitForTimeout(1200);const x=await body();if(x===l)break;l=x;}break;}}
await page.waitForTimeout(900);
const opts = page.locator('button').filter({hasText:/^[A-D]\s/});
console.log('options:', await opts.count());
if (await opts.count()) {
  const o = opts.first();
  console.log('clicking:', (await o.innerText()).replace(/\s+/g,' ').slice(0,60));
  await o.scrollIntoViewIfNeeded(); await o.click({timeout:8000}).catch(e=>console.log('fail',String(e).slice(0,60)));
}
await page.waitForTimeout(2200);
await shot(page,'prep-academy-quiz-answered-390');
console.log('after:', await prof(), '||', await xpLine());
const t = await body();
console.log('feedback:', t.slice(t.search(/CORRECT|INCORRECT|Not quite|Nice/i)-20, t.search(/CORRECT|INCORRECT|Not quite|Nice/i)+200).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
