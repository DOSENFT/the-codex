import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';
const AI_CFG = JSON.stringify({ provider:'ollama', ollamaUrl:'http://localhost:11434', ollamaModel:'gemma3-27b-abliterated:latest', fallbackEnabled:false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(() => document.body.innerText);
const diff=(a,b,n=1200)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n);};
await page.getByRole('button',{name:/Open The Toybox/i}).click();
await page.waitForTimeout(1000);
for (const tab of ['Combos','Tactics','Persona']) {
  const t = page.getByRole('button',{name:new RegExp('^'+tab+'$','i')}).first();
  if (await t.count()) { await t.click().catch(()=>{}); await page.waitForTimeout(700); }
  const pre = await body();
  const s = page.getByRole('button',{name:/^AI Suggest$/i}).first();
  console.log(`\n[${tab}] Suggest button found:`, await s.count(), 'enabled:', await s.isEnabled().catch(()=>'n/a'));
  if (!(await s.count())) continue;
  await s.click({timeout:8000}).catch(e=>console.log('clickfail',String(e).slice(0,60)));
  const t0=Date.now(); let res='TIMEOUT';
  while (Date.now()-t0 < 200000) {
    await page.waitForTimeout(1500);
    const now = await body();
    if (/could not reach|did not answer|failed to fetch|unreachable/i.test(now)) { res='ERROR'; break; }
    if (now !== pre && now.length > pre.length + 40) {
      let last=now; for(let i=0;i<60;i++){await page.waitForTimeout(1500);const n=await body();if(n===last)break;last=n;}
      res='ANSWER'; console.log(`  ${res} in ${Date.now()-t0}ms ::`, diff(pre,last)); break;
    }
  }
  if (res==='TIMEOUT'||res==='ERROR') console.log(`  ${res} in ${Date.now()-t0}ms ::`, diff(pre, await body(), 400));
  await shot(page, 'chrome-toybox-ai-suggest-'+tab.toLowerCase()+'-390');
}
await ctx.close(); await browser.close();
