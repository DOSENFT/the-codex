import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const prof = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');const v=localStorage.getItem('codex-training-'+id);if(!v)return 'NO PROFILE';const p=JSON.parse(v);return JSON.stringify({totalXP:p.totalXP,level:p.level,quiz:(p.quizHistory||[]).length,streak:p.currentStreak});});
const xpLine = async()=>{const t=await body();const i=t.indexOf('XP');return t.slice(Math.max(0,i-25),i+55).replace(/\n/g,' | ');};
await goTab(page,'prep','Academy'); await page.waitForTimeout(1200);
await page.getByRole('button',{name:/^Quizzes$/i}).first().click(); await page.waitForTimeout(900);
console.log('before:', await prof(), '||', await xpLine());
const pre = await body();
await page.getByRole('button',{name:/Generate (New )?Question/i}).first().click();
for(let i=0;i<100;i++){await page.waitForTimeout(1500);const n=await body();if(n.length>pre.length+60){let l=n;for(let j=0;j<40;j++){await page.waitForTimeout(1200);const x=await body();if(x===l)break;l=x;}break;}}
await page.waitForTimeout(900);
const clicked = await page.evaluate(()=>{
  const bs=[...document.querySelectorAll('button')].filter(b=>/^[A-D]\s+\S/.test(b.innerText.replace(/\s+/g,' ').trim()));
  if(!bs.length) return null;
  const t=bs[bs.length-1].innerText.replace(/\s+/g,' ').slice(0,60);
  bs[bs.length-1].click(); return t;
});
console.log('clicked option:', clicked);
await page.waitForTimeout(2500);
await shot(page,'prep-academy-quiz-answered-390');
console.log('after:', await prof(), '||', await xpLine());
const t = await body(); const i = t.search(/Correct|Incorrect|Not quite/i);
console.log('feedback:', i>=0 ? t.slice(i-10,i+220).replace(/\n/g,' | ') : 'none');
await ctx.close(); await browser.close();
