import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt } from './_boot.mjs';
const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body=()=>page.evaluate(()=>document.body.innerText);
const diff=(a,b,n=900)=>{const p=a.split('\n');return b.split('\n').filter(l=>l.trim()&&!p.includes(l)).join(' | ').slice(0,n)};
async function hard(re){const b=page.getByRole('button',{name:re}).first();if(!(await b.count())){console.log('  MISSING',re);return false}await b.scrollIntoViewIfNeeded().catch(()=>{});if(!(await b.isEnabled())){console.log('  DISABLED',re);return false}await b.click({timeout:8000,force:true}).catch(e=>console.log('  CF',String(e).slice(0,40)));console.log('  tapped',re);return true}

console.log('=== CampaignEditor (bottom of PREP/Character) ===');
await goTab(page,'prep','Character');
await page.waitForTimeout(700);
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
await page.waitForTimeout(800);
await shot(page,'prep-character-campaign-editor-390');
const t=await body();
const i=t.search(/CAMPAIGN|The Party|Party Members|Allies/i);
console.log(i<0?'(no campaign section string found)':t.slice(i,i+900).replace(/\n/g,' | '));

console.log('\n=== Scene Responses: add one ===');
await goTab(page,'prep','Persona');
await page.waitForTimeout(800);
let pre=await body();
await hard(/^Betrayal$/i);
await page.waitForTimeout(900);
console.log(diff(pre,await body()));
await shot(page,'prep-persona-scene-responses-390');

console.log('\n=== Academy: spaced flashcards empty state ===');
await goTab(page,'prep','Academy');
await page.waitForTimeout(700);
await hard(/^Quizzes$/);
await page.waitForTimeout(700);
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
await page.waitForTimeout(600);
await shot(page,'prep-academy-flashcards-390');
const t2=await body(); const j=t2.indexOf('Add persona traits');
console.log(j<0?'(flashcard empty-state string gone)':t2.slice(j-200,j+300).replace(/\n/g,' | '));

console.log('\n=== Accent Forge: Forge / Train tabs (mic) ===');
await hard(/^Accent$/); await page.waitForTimeout(800);
for(const t of ['Rapid','Forge','Train']){ const p=await body(); if(await hard(new RegExp('^'+t+'$'))){ await page.waitForTimeout(1100); console.log('\n-- '+t+' --\n  '+diff(p,await body())); await shot(page,'prep-academy-accent-'+t.toLowerCase()+'-390'); } }
await ctx.close(); await browser.close();
