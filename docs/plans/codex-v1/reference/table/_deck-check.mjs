/* Cheap pre-flight before spending 16 minutes on the full harness.
   Three questions the labelled deck has to answer:
     1. do the words F-1 looks for actually appear on play/Combat?
     2. does the taller deck still keep every spend control in the bottom 60%?
     3. does anything in the deck now overflow 390px? */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4299);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play-combat') ?? SCREENS[0]);
await settle(page);

const r = await page.evaluate(() => {
  const deck = document.querySelector('section[aria-label="Turn deck"]');
  const txt = document.body.innerText;
  const words = ['LAY ON HANDS', 'CHANNEL DIVINITY', 'SPELL SLOTS'];
  const dr = deck?.getBoundingClientRect();
  const ctrls = deck ? [...deck.querySelectorAll('button,input')].map(e => {
    const c = e.getBoundingClientRect();
    return { label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 26), y: Math.round(c.top), h: Math.round(c.height), r: Math.round(c.right) };
  }) : [];
  return {
    found: words.map(w => [w, new RegExp(w, 'i').test(txt)]),
    deck: dr ? { top: Math.round(dr.top), h: Math.round(dr.height) } : null,
    vh: window.innerHeight,
    deckVar: getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h').trim(),
    mainBottom: Math.round(document.querySelector('main').getBoundingClientRect().bottom),
    aboveThumb: ctrls.filter(c => c.y < window.innerHeight * 0.40),
    overflow: ctrls.filter(c => c.r > 390),
    short: ctrls.filter(c => c.h < 48),
    n: ctrls.length,
  };
});

for (const [w, ok] of r.found) console.log(`  ${ok ? '\x1b[32mfound\x1b[0m' : '\x1b[31mMISSING\x1b[0m'}  "${w}"`);
console.log(`\n  viewport ${r.vh} · deck top=${r.deck?.top} h=${r.deck?.h} · --turn-deck-h=${r.deckVar} · main bottom=${r.mainBottom}`);
console.log(`  deck controls: ${r.n}`);
console.log(`  above thumb zone (y < ${Math.round(r.vh * 0.4)}): ${r.aboveThumb.length ? JSON.stringify(r.aboveThumb) : 'none'}`);
console.log(`  overflowing 390px:                ${r.overflow.length ? JSON.stringify(r.overflow) : 'none'}`);
console.log(`  under 48px tall:                  ${r.short.length ? JSON.stringify(r.short) : 'none'}\n`);

await ctx.close(); await b.close(); await srv.close();
