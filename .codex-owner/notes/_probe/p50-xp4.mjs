import { chromium, shot } from './_pw.mjs';
import { boot, goTab } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(()=>document.body.innerText);
const prof = () => page.evaluate(()=>{const id=localStorage.getItem('codex-active-id');const v=localStorage.getItem('codex-training-'+id);if(!v)return null;const p=JSON.parse(v);return {xp:p.totalXP,lvl:p.level,n:(p.quizHistory||[]).length,streak:p.quizStreaks};});
await goTab(page,'prep','Academy'); await page.waitForTimeout(1200);
await page.getByRole('button',{name:/^Quizzes$/i}).first().click(); await page.waitForTimeout(900);
for (let round=0; round<4; round++) {
  const pre = await body();
  await page.getByRole('button',{name:/Generate (New )?Question/i}).first().click().catch(()=>{});
  for(let i=0;i<100;i++){await page.waitForTimeout(1500);const n=await body();if(n.length>pre.length+60){let l=n;for(let j=0;j<40;j++){await page.waitForTimeout(1200);const x=await body();if(x===l)break;l=x;}break;}}
  await page.waitForTimeout(700);
  const r = await page.evaluate((idx)=>{
    const bs=[...document.querySelectorAll('button')].filter(b=>/^[A-D]\s+\S/.test(b.innerText.replace(/\s+/g,' ').trim()));
    if(!bs.length) return null;
    const b = bs[Math.min(idx, bs.length-1)];
    const t=b.innerText.replace(/\s+/g,' ').slice(0,50); b.click(); return t;
  }, round);
  await page.waitForTimeout(2200);
  const t = await body();
  const verdict = /\bCorrect\b(?!\s*answer)/i.test(t.slice(t.search(/Incorrect|Correct/i), t.search(/Incorrect|Correct/i)+12)) ? 'CORRECT' : (/Incorrect/i.test(t)?'INCORRECT':'?');
  console.log(`round ${round}: clicked "${r}" -> ${verdict} | profile=`, JSON.stringify(await prof()));
  const p = await prof();
  if (p && p.xp > 0) { await shot(page,'prep-academy-quiz-xp-awarded-390'); console.log('*** XP AWARDED ***'); break; }
}
const t = await body(); const i = t.indexOf('XP');
console.log('progress bar:', t.slice(Math.max(0,i-40), i+80).replace(/\n/g,' | '));
await ctx.close(); await browser.close();
