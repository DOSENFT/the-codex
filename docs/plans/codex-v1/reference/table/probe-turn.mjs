/* probe-turn — V-6 measured in the state the criterion is actually about.
   V-6 says "every control that spends a resource ... lies within the bottom 60%
   of the viewport" and the whole document says that is about a six-second turn.
   familyV measures play/Combat in its default state, which is NOT IN COMBAT:
   the Start Combat card is up, TurnSummary is absent, and the standalone Action
   Economy section is rendered instead. That is a real screen and worth measuring,
   but it is not the turn. This prints both states side by side so the difference
   is a number rather than an argument. */
import { chromium, freshCtx, importFile, goScreen, SCREENS, PHONE } from './rig.mjs';
import { realCopy, THRESH } from './families.mjs';

const SPEND = /heal|spend|expend|restore|slot|smite|channel|lay on hands|action|bonus|reaction|move|next turn|end combat/i;

const SNAP = () => {
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue;
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('[aria-hidden="true"],[inert]')) continue;
    out.push({
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height),
    });
  }
  return { out, vh: window.innerHeight };
};

const report = (title, a) => {
  const lo = a.vh * (1 - THRESH.V6_thumb);
  const spend = a.out.filter(c => SPEND.test(c.label));
  const above = spend.filter(c => c.y < lo);
  const off = spend.filter(c => c.y > a.vh);
  console.log(`\n=== ${title} ===  vh=${a.vh}  thumb zone y∈[${Math.round(lo)}, ${a.vh}]`);
  console.log(`    ${spend.length} spend-ish controls · ${above.length} above the zone · ${off.length} off the first screen`);
  for (const c of above) console.log(`    ABOVE  y=${c.y}  «${c.label}»`);
  for (const c of off) console.log(`    OFF    y=${c.y}  «${c.label}»`);
};

const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { viewport: PHONE, dpr: 3 });
await importFile(page, realCopy('full'));
const combat = SCREENS.find(s => s.id === 'play/Combat');
await goScreen(page, combat);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
report('OUT OF COMBAT (what familyV measures today)', await page.evaluate(SNAP));

const start = page.getByRole('button', { name: /start combat/i }).first();
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  report('IN COMBAT (the six seconds the criterion is about)', await page.evaluate(SNAP));
} else {
  console.log('\n!! no Start Combat button found — cannot enter the turn state');
}
await ctx.close(); await b.close();
