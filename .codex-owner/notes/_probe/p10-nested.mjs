import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = (s) => console.log('\n\n===== ' + s + ' =====');
const dump = async () => {
  const t = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 50 && e.clientHeight > 300);
    return (el?.innerText || document.body.innerText).replace(/\s*\n\s*/g, '\n');
  });
  console.log(t.slice(0, 2600));
};

say('DAMAGE LOG > DAMAGE TRACKER');
await tap(page, '^DAMAGE LOG');
await tap(page, 'DAMAGE TRACKER');
await page.waitForTimeout(600);
await shot(page, 'play-damage-tracker-390');
await dump();
await btns(page, 'damage tracker');
await tap(page, 'DAMAGE TRACKER');
await tap(page, '^DAMAGE LOG');

say('COMBAT ADVISOR (nested)');
await tap(page, '^COMBAT ADVISOR');
await page.waitForTimeout(400);
await btns(page, 'advisor-level1');
await tap(page, 'COMBAT ADVISOR');
await page.waitForTimeout(800);
await shot(page, 'play-combat-advisor-390');
await dump();
await btns(page, 'advisor-open');

await ctx.close();
await browser.close();
