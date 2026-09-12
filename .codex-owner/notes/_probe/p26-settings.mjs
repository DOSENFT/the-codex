import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const body = () => page.evaluate(() => document.body.innerText);
const say = s => console.log('\n\n===== ' + s + ' =====');
const slots = () => page.evaluate(() => { const id = localStorage.getItem('codex-active-id'); const c = JSON.parse(localStorage.getItem('codex-character-' + id) || '{}'); return JSON.stringify({ hp: c.hitPoints, slots: c.spellSlots }); });

say('baseline');
console.log(await slots());

say('Settings > Long Rest');
await page.getByRole('button', { name: /Open settings/i }).click();
await page.waitForTimeout(800);
const lr = page.getByRole('button', { name: /^Long Rest$/i }).first();
await lr.scrollIntoViewIfNeeded();
await lr.click();
await page.waitForTimeout(1500);
await shot(page, 'chrome-settings-long-rest-390');
console.log('after Long Rest:', await slots());

say('Settings > Short Rest');
const sr = page.getByRole('button', { name: /^Short Rest$/i }).first();
await sr.scrollIntoViewIfNeeded(); await sr.click();
await page.waitForTimeout(1200);
console.log('after Short Rest:', await slots());

say('Settings > Level Up to 8');
const lu = page.getByRole('button', { name: /Level Up to 8/i }).first();
if (await lu.count()) { await lu.scrollIntoViewIfNeeded(); await lu.click(); await page.waitForTimeout(1500); await shot(page, 'chrome-settings-level-up-390'); console.log('after Level Up:', await page.evaluate(() => { const id = localStorage.getItem('codex-active-id'); const c = JSON.parse(localStorage.getItem('codex-character-' + id) || '{}'); return JSON.stringify({ level: c.level, prof: c.proficiencyBonus, hp: c.hitPoints, slots: c.spellSlots }); })); }

say('Settings > Copy/Paste Backstory + Export/Import present');
const t = await body();
console.log(t.slice(t.indexOf('BACKSTORY TRANSFER'), t.indexOf('BACKSTORY TRANSFER') + 350).replace(/\n/g, ' | '));

say('Close settings, open character sheet (print record)');
await page.getByRole('button', { name: /^Close settings$|^×$/i }).first().click().catch(() => page.keyboard.press('Escape'));
await page.waitForTimeout(700);
const cs = page.getByRole('button', { name: /Open character sheet for/i }).first();
await cs.click({ force: true });
await page.waitForTimeout(1200);
await shot(page, 'chrome-character-sheet-390');
console.log(await txt(page, 1500));

await ctx.close();
await browser.close();
