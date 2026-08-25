/* A-27 negative control — can the new scroll instrument actually fail?
   ---------------------------------------------------------------------------
   The whole point of A-27 is that the OLD scroll silently did nothing and the
   harness carried on reporting numbers. A fix that also fails silently is the
   same bug wearing a new helper's name. So: take the real page, break scrolling
   the exact way the layout broke it — make every scroller refuse to move —
   and require scrollOrThrow to throw.

   Two cases, because a control that only fires on a rigged page proves nothing
   about the real one:
     RIGGED  — scrollTop is a no-op. MUST throw.
     REAL    — untouched play/Combat. MUST NOT throw, and MUST move. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, scrollOrThrow, scrollPage } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4297);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play-combat') ?? SCREENS[0]);
await settle(page);

let pass = 0, fail = 0;
const row = (ok, name, detail) => {
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name.padEnd(34)} ${detail}`);
  ok ? pass++ : fail++;
};

// ── REAL: the untouched page must scroll, and must not throw ──
const real = await scrollOrThrow(page, 'bottom', 'real');
row(real.after > 0 && real.room > 4,
  'real page scrolls',
  `<${real.tag}> room=${real.room}px  ${real.before} -> ${real.after}`);
await scrollPage(page, 'top');

// ── RIGGED: freeze scrollTop on every element, exactly the old failure ──
await page.evaluate(() => {
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get() { return d.get.call(this); },
    set() { /* refuse, silently — this is what window.scrollTo was doing */ },
  });
});
let threw = null;
try {
  await scrollOrThrow(page, 'bottom', 'rigged');
} catch (e) {
  threw = e.message;
}
row(threw !== null, 'frozen scroller is caught', threw ? threw.slice(0, 74) : 'NOTHING THREW — the control is dead');

console.log(`\n  ${fail === 0 ? '\x1b[32mA-27 control is load-bearing\x1b[0m' : '\x1b[31mA-27 control is NOT load-bearing\x1b[0m'}  ${pass} pass · ${fail} fail\n`);
await ctx.close(); await b.close(); await srv.close();
process.exit(fail === 0 ? 0 : 1);
