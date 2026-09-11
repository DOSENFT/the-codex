import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE, settle, audit } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s=>s.id==='play/Roleplay'));
await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await settle(page);
const a = await audit(page);
for (const c of a.touch) if (c.occludedBy) console.log(JSON.stringify(c));
console.log(await page.evaluate(() => {
  const m = document.querySelector('main');
  return { mainScrollable: m.scrollHeight > m.clientHeight + 1, docScroll: document.documentElement.scrollHeight - innerHeight,
           mainPB: getComputedStyle(m).paddingBottom, mScrollTop: m.scrollTop, mMax: m.scrollHeight - m.clientHeight };
}));
await ctx.close(); await b.close();
