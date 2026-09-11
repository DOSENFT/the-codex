import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';
import { readFileSync } from 'node:fs';

const env = await up();
const file = realCopy('full');
const disk = JSON.parse(readFileSync(file, 'utf8'));

const { ctx, page } = await newPage(env);
await importFile(page, file);
await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await settle(page);

const screen = await bodyText(page);
// (a) on-screen values vs disk
const onScreen = {
  level: /Paladin\s+7\b/.test(screen),
  levelText: (screen.match(/Changeling Paladin \d+/) || [])[0],
  hpText: (screen.match(/\d+ \/ \d+/) || [])[0],
  acText: (screen.match(/AC \d+/) || [])[0],
  lohText: (screen.match(/Lay on Hands \d+\/\d+/) || [])[0],
};
console.log('DISK  level=%d class=%s hpMax=%d ac=%d loh=%d/%d slot1=%d',
  disk.level, disk.class, disk.hitPoints.max, disk.armorClass,
  disk.paladinResources.layOnHands.current, disk.paladinResources.layOnHands.max,
  disk.spellSlots['1'].current);
console.log('SCREEN', JSON.stringify(onScreen));

// (b) a shortlisted control naming "Action" as the economy slot it costs
const acts = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
const namesAction = acts.filter(t => /Action/.test(t));
console.log('(b) controls naming Action:', namesAction.length, '| first:', JSON.stringify(namesAction[0] || null));

// (c) click a /Action · 1st-level slot/ control
const before = await charBlob(page);
const target = page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first();
const label = (await target.textContent()).replace(/\s+/g, ' ').trim();
console.log('(c) clicking:', JSON.stringify(label.slice(0, 80)));
await target.click();
await page.waitForTimeout(900);
await settle(page);
const afterText = await bodyText(page);
let after = await charBlob(page);

// If a confirm step appeared, report it, then look for anything to press
const newButtons = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)));
console.log('post-click slot1 =', after?.val?.spellSlots?.['1']?.current,
  '(before', before?.val?.spellSlots?.['1']?.current + ')');
console.log('post-click screen slot line:', (afterText.match(/Level 1 \d+\/\d+ Level 2 \d+\/\d+ Level 3 \d+\/\d+/) || [])[0]);
console.log('post-click buttons:', JSON.stringify(newButtons));

// wait longer in case the write is debounced
await page.waitForTimeout(2500);
after = await charBlob(page);
console.log('after +2.5s slot1 =', after?.val?.spellSlots?.['1']?.current);
console.log('delta =', (before?.val?.spellSlots?.['1']?.current ?? NaN) - (after?.val?.spellSlots?.['1']?.current ?? NaN));

console.log('ERRORS', JSON.stringify(page.__all));
console.log('rejections', JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
