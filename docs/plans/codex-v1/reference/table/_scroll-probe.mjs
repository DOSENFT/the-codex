import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';
const srv = await serveDist(DIST, 4293);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await settle(page);
const r = await page.evaluate(() => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const m = document.querySelector('main');
  const scrollers = [...document.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
    .map(e => ({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 40), sh: e.scrollHeight, ch: e.clientHeight, top: e.scrollTop }));
  return {
    windowScrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    docClientHeight: document.documentElement.clientHeight,
    mainScrollTop: m?.scrollTop, mainScrollHeight: m?.scrollHeight, mainClient: m?.clientHeight,
    scrollers,
  };
});
console.log(JSON.stringify(r, null, 1));
await ctx.close(); await b.close(); await srv.close();
