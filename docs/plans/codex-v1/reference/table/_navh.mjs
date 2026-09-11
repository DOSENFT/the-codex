import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s=>s.id==='play/Roleplay'));
await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await settle(page);
console.log(await page.evaluate(() => {
  const nav = document.querySelector('nav.fixed');
  const main = document.querySelector('main');
  return { navH: nav && Math.round(nav.getBoundingClientRect().height),
           mainPB: getComputedStyle(main).paddingBottom, vh: innerHeight };
}));
await ctx.close(); await b.close();
