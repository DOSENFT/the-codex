import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = s => console.log('\n\n===== ' + s + ' =====');
const body = () => page.evaluate(() => document.body.innerText);
const diff = (pre, post, n = 1200) => { const p = pre.split('\n'); return post.split('\n').filter(l => l.trim() && !p.includes(l)).join(' | ').slice(0, n); };
async function hardTap(re) {
  const b = page.getByRole('button', { name: re }).first();
  if (!(await b.count())) { console.log('  MISSING', re); return false; }
  await b.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await b.isEnabled())) { console.log('  DISABLED', re); return false; }
  await b.click({ timeout: 8000 }).catch(e => console.log('  CLICKFAIL', String(e).slice(0, 50)));
  console.log('  tapped', re);
  return true;
}

say('Dice roller');
let pre = await body();
await hardTap(/Open dice roller/i);
await page.waitForTimeout(700);
await shot(page, 'chrome-dice-roller-390');
console.log(diff(pre, await body()));
pre = await body();
await hardTap(/^d20$/); await page.waitForTimeout(300);
await hardTap(/^Advantage$/); await page.waitForTimeout(300);
const num = page.getByRole('textbox', { name: /The number your 1d20 showed/i }).or(page.getByPlaceholder(/The number your 1d20 showed/i)).first();
await num.fill('17').catch(e => console.log('fill err', String(e).slice(0, 60)));
await page.waitForTimeout(300);
await shot(page, 'chrome-dice-roller-filled-390');
await hardTap(/^Log it$/);
await page.waitForTimeout(900);
await shot(page, 'chrome-dice-logged-390');
console.log('after log it:', diff(pre, await body(), 600));
await hardTap(/Close roll capture/i);

say('Mechanics reference search');
await hardTap(/Open mechanics reference/i);
await page.waitForTimeout(600);
await page.getByPlaceholder(/Search mechanics/i).fill('concentration');
await page.waitForTimeout(700);
await shot(page, 'chrome-mechanics-search-390');
const t = await body();
console.log(t.slice(t.indexOf('MECHANICS REFERENCE'), t.indexOf('MECHANICS REFERENCE') + 600));
await hardTap(/Close mechanics reference/i);

say('Toybox');
pre = await body();
await hardTap(/Open The Toybox/i);
await page.waitForTimeout(900);
await shot(page, 'chrome-toybox-390');
console.log(diff(pre, await body(), 1500));
await btns(page, 'toybox');
await page.keyboard.press('Escape');

say('Settings drawer');
pre = await body();
await hardTap(/Open settings/i);
await page.waitForTimeout(900);
await shot(page, 'chrome-settings-390');
console.log(diff(pre, await body(), 2000));
await page.keyboard.press('Escape');

say('Character switcher / roster');
pre = await body();
await hardTap(/^Nix$/);
await page.waitForTimeout(800);
await shot(page, 'chrome-character-switcher-390');
console.log(diff(pre, await body(), 1200));
await btns(page, 'switcher');
await page.keyboard.press('Escape');

say('Reopen: reload and confirm persistence');
await goTab(page, 'session', 'Combat');
await page.waitForTimeout(600);
const before = (await body()).slice(0, 300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await shot(page, 'reopen-after-reload-390');
const after = (await body()).slice(0, 300);
console.log('same top after reload:', before === after);
console.log(await txt(page, 900));
console.log('active id:', await page.evaluate(() => localStorage.getItem('codex-active-id')));

await ctx.close();
await browser.close();
