import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s=>s.id==='play/Roleplay'));
await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await settle(page);
console.log(await page.evaluate(() => {
  const out=[];
  for (const el of document.querySelectorAll('button')) {
    const r = el.getBoundingClientRect();
    if (r.top + r.height/2 < 780 || r.width < 1) continue;
    const chain=[]; for(let n=el,i=0;n&&i<7;n=n.parentElement,i++)
      chain.push(n.tagName.toLowerCase()+(n.className?'.'+String(n.className).split(/\s+/).slice(0,3).join('.'):'')+`[${getComputedStyle(n).position}]`);
    out.push({label:(el.textContent||'').trim().slice(0,30), top:Math.round(r.top), chain:chain.join(' < ')});
  }
  return out.slice(0,6);
}));
await ctx.close(); await b.close();
