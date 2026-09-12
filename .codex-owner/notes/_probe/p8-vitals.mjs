import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = (s) => console.log('\n===== ' + s + ' =====');
const st = () => page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = JSON.parse(localStorage.getItem('codex-character-' + id));
  return JSON.stringify({ hp: c.hitPoints, tempHP: c.tempHP, ds: c.deathSaves, conds: c.conditions, src: c.tempHPSource });
});

say('A. Damage 2 -> HP 3 to 1'); console.log('before:', await st());
await tap(page, 'Apply damage');
await shot(page, 'play-damage-pad-390');
console.log(await txt(page, 800));
await page.getByRole('textbox', { name: /damage amount/i }).or(page.locator('input[aria-label="damage amount"]')).fill('2');
await page.waitForTimeout(200);
await btns(page, 'damage pad');
await tap(page, '^Apply$');
console.log('after damage:', await st());
await shot(page, 'play-damage-applied-390');
console.log(await txt(page, 600));

say('B. Damage 5 more -> 0 HP / death saves');
await tap(page, 'Apply damage');
await page.locator('input[aria-label="damage amount"]').fill('5');
await tap(page, '^Apply$');
console.log('after:', await st());
await shot(page, 'play-death-saves-390');
console.log(await txt(page, 1400));
await btns(page, 'at 0 hp');

say('C. Heal 20');
await tap(page, 'Apply healing');
await page.locator('input[aria-label="heal amount"]').fill('20');
await tap(page, '^Apply$');
console.log('after heal:', await st());
await shot(page, 'play-heal-applied-390');

say('D. Temp HP 10 + source');
await tap(page, 'Set temporary hit points');
await shot(page, 'play-temphp-pad-390');
console.log(await txt(page, 1000));
await page.locator('input[aria-label="temp amount"]').fill('10');
await page.waitForTimeout(200);
await shot(page, 'play-temphp-source-390');
await btns(page, 'temp pad');
await tap(page, '^Apply$');
console.log('after temp:', await st());

say('E. Conditions drawer');
await tap(page, 'ACTIVE CONDITIONS');
await shot(page, 'play-conditions-390');
console.log(await txt(page, 1500));
await btns(page, 'conditions');

await ctx.close();
await browser.close();
