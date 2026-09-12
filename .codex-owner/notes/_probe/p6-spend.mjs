import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = (s) => console.log('\n===== ' + s + ' =====');
const st = () => page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = JSON.parse(localStorage.getItem('codex-character-' + id));
  const ck = Object.keys(localStorage).filter(k => k.startsWith('codex-combat'));
  return { hp: c.hitPoints, tempHP: c.tempHP, slots: c.spellSlots, conds: c.conditions, combatKeys: ck };
});
// band header text
const bands = () => page.evaluate(() => {
  const out = [];
  document.querySelectorAll('button').forEach(b => {
    const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
    if (/^(ACTION|BONUS|REACTION|MOVEMENT) \d/.test(t)) out.push(t.slice(0, 60));
  });
  return out;
});

say('baseline'); console.log(JSON.stringify(await st()), await bands());
await tap(page, '^Start Combat$');

say('A. Attack: open Dawn Guardian card, tap Spend');
await tap(page, 'The Dawn Guardian');
await shot(page, 'play-option-card-390');
await btns(page, 'card buttons');
await tap(page, "^Spend ");
console.log('bands:', await bands());
console.log(JSON.stringify(await st()));
await shot(page, 'play-action-1of2-390');
console.log(await txt(page, 600));

say('B. Second attack (Extra Attack, 2 uses)');
await tap(page, 'The Dawn Guardian');
await tap(page, "^Spend ");
console.log('bands:', await bands());
await shot(page, 'play-action-2of2-390');

say('C. Cast Bless — slot spend');
await tap(page, '^Bless');
await btns(page, 'bless card');
await tap(page, "^Spend ");
console.log('bands:', await bands());
console.log(JSON.stringify(await st()));
await shot(page, 'play-slot-spent-390');
console.log(await txt(page, 900));

say('D. End turn -> reaction window');
await tap(page, 'End turn');
await shot(page, 'play-off-turn-390');
console.log(await txt(page, 700));
console.log('bands:', await bands());

say('E. End combat');
await tap(page, 'End combat');
await page.waitForTimeout(400);
await shot(page, 'play-end-combat-confirm-390');
console.log(await txt(page, 1200));
await btns(page, 'end combat');

await ctx.close();
await browser.close();
