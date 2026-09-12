import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = (s) => console.log('\n===== ' + s + ' =====');
const st = () => page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = JSON.parse(localStorage.getItem('codex-character-' + id));
  return JSON.stringify({ hp: c.hitPoints, tempHP: c.tempHP, slots: c.spellSlots, conds: c.conditions });
});
const bands = () => page.evaluate(() => {
  const out = [];
  document.querySelectorAll('button').forEach(b => {
    const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
    if (/^(ACTION|BONUS|REACTION|MOVEMENT) \d/.test(t)) out.push(t.slice(0, 46));
  });
  return out.join(' | ');
});

await tap(page, '^Start Combat$');
say('A. Cast Bless — 1st-level slot, Action');
console.log('before:', await st(), '|', await bands());
await tap(page, '^Bless');
await tap(page, '^Spend ');
console.log('after: ', await st(), '|', await bands());
await shot(page, 'play-slot-spent-390');
console.log(await txt(page, 1100));

say('B. Bonus action — Shield of Faith (2nd slot? 1st-level slot)');
await tap(page, '^Divine Smite');
await tap(page, '^Spend ');
console.log('after: ', await st(), '|', await bands());
await shot(page, 'play-bonus-spent-390');

say('C. Undo once');
await tap(page, 'Undo');
console.log('after undo:', await st(), '|', await bands());
await shot(page, 'play-undo-390');

say('D. Movement band');
await tap(page, '^MOVEMENT');
await shot(page, 'play-movement-band-390');
console.log(await txt(page, 900));

say('E. End turn -> off-turn reaction window');
await tap(page, 'End turn');
await shot(page, 'play-off-turn-390');
console.log('bands:', await bands());
console.log(await txt(page, 900));

say('F. End combat');
await tap(page, 'End combat');
await page.waitForTimeout(500);
await shot(page, 'play-end-combat-confirm-390');
console.log(await txt(page, 1400));
await btns(page, 'end-combat dialog');

await ctx.close();
await browser.close();
