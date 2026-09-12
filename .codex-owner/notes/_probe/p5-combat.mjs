import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const S = async (n) => shot(page, n);
const say = (s) => console.log('\n===== ' + s + ' =====');

const slots = () => page.evaluate(() => {
  const c = JSON.parse(localStorage.getItem(localStorage.getItem('codex-active-id') ? 'codex-character-' + localStorage.getItem('codex-active-id') : ''));
  return { hp: c.hitPoints, tempHP: c.tempHP, slots: c.spellSlots, conditions: c.conditions };
});

say('0. baseline state');
console.log(JSON.stringify(await slots()));
await S('play-turn-390');

say('1. Start Combat');
await tap(page, '^Start Combat$', { exact: false });
await S('play-combat-started-390');
console.log(await txt(page, 700));
await btns(page, 'after start combat');

say('2. Spend the Action — tap The Dawn Guardian');
await tap(page, 'The Dawn Guardian');
await page.waitForTimeout(600);
await S('play-action-spent-390');
console.log(await txt(page, 1400));

say('3. Cast Bless (1st-level slot) as... check band state');
console.log(JSON.stringify(await slots()));

say('4. Bonus action — Divine Smite');
await tap(page, '^Divine Smite$');
await S('play-bonus-spent-390');
console.log(JSON.stringify(await slots()));
console.log(await txt(page, 900));

say('5. End Turn');
await tap(page, 'End Turn');
await S('play-round2-390');
console.log(await txt(page, 800));

say('6. Undo');
await tap(page, 'Undo');
await S('play-undo-390');
console.log(JSON.stringify(await slots()));
console.log(await txt(page, 600));

await ctx.close();
await browser.close();
